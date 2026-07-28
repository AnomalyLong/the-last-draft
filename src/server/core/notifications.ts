import { notifications } from '@devvit/notifications';
import { context, redis } from '@devvit/web/server';
import { userKey } from './user';

// ── Push notifications ─────────────────────────────────────────────────────
// The plugin (@devvit/notifications) owns the real opt-in list, keyed by t2_
// user id. We mirror it in Redis keyed by USERNAME, because everything else in
// this codebase — the user hash, missions, the admin tools — is username-keyed,
// and because the plugin's list gives us no way to resolve an id back to a name
// (needed for {{name}} templating and for the admin audience table).
//
// Redis:
//   notif:optins    zset  member=username       score=optInAt
//   notif:uid2name  hash  field=t2_id           value=username
//   notif:log       zset  member=JSON(entry)    score=sentAt   (capped)
//   user:{name}     hash  notifOptIn / notifOptInAt / notifEverOptIn
//
// Every plugin call is wrapped. @devvit/notifications ships flagged
// "experimental" and is not guaranteed to be present in the local playtest
// emulator, so a failure must never break the lobby: reads degrade to the
// Redis mirror and report supported:false, writes surface the plugin message.

export const OPTIN_KEY = 'notif:optins';
const UID_MAP_KEY = 'notif:uid2name';
const SEND_LOG_KEY = 'notif:log';

// Reddit caps a single enqueue at 1000 recipients — larger audiences are
// chunked. Rate limits (2/user/day, 25K/app/day) are enforced server-side by
// Reddit; we only surface the resulting per-recipient errors.
const MAX_RECIPIENTS = 1000;
const MAX_LOG = 25;

type EnqueueOptions = Parameters<typeof notifications.enqueue>[0];

export type NotifAudience = 'all' | 'usernames' | 'self';

export type NotifStatus = {
  optedIn: boolean;
  optedInAt: number;
  // Sticky: set on the first successful opt-in and never cleared, including
  // by opt-out. The bell dropdown uses it to decide whether to show the
  // on/off toggle at all — a user who has never enabled push sees a clean
  // notification list, and the toggle appears (and stays) once they have.
  everOptedIn: boolean;
  supported: boolean;
  error?: string;
};

export type SendLogEntry = {
  id: string;
  sentAt: number;
  by: string;
  audience: NotifAudience;
  title: string;
  body: string;
  link: string;
  requested: number;
  successCount: number;
  failureCount: number;
  error?: string;
};

const isT2 = (id: string): boolean => /^t2_[a-z0-9]+$/i.test(id);
// enqueue's `link` is where the notification clicks through to: a post (t3_)
// or a comment (t1_).
const isLink = (id: string): boolean => /^t[13]_[a-z0-9]+$/i.test(id);

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// ── Opt-in / opt-out ───────────────────────────────────────────────────────
// The plugin only exposes setters for the CURRENT user — there is deliberately
// no admin "opt this person in" call, so the admin panel can only read.

export const optInCurrentUser = async (
  username: string,
  userId: string,
): Promise<NotifStatus> => {
  const res = await notifications.optInCurrentUser();
  if (!res.success) throw new Error(res.message ?? 'Reddit declined the opt-in');
  const now = Date.now();
  await Promise.all([
    redis.hSet(userKey(username), {
      notifOptIn: '1',
      notifOptInAt: String(now),
      notifEverOptIn: '1',
    }),
    redis.zAdd(OPTIN_KEY, { score: now, member: username }),
    isT2(userId) ? redis.hSet(UID_MAP_KEY, { [userId]: username }) : Promise.resolve(),
  ]);
  return { optedIn: true, optedInAt: now, everOptedIn: true, supported: true };
};

export const optOutCurrentUser = async (username: string): Promise<NotifStatus> => {
  const res = await notifications.optOutCurrentUser();
  if (!res.success) throw new Error(res.message ?? 'Reddit declined the opt-out');
  await Promise.all([
    redis.hSet(userKey(username), {
      notifOptIn: '0',
      notifOptInAt: '0',
      notifEverOptIn: '1',
    }),
    redis.zRem(OPTIN_KEY, [username]),
  ]);
  return { optedIn: false, optedInAt: 0, everOptedIn: true, supported: true };
};

// Plugin-first read with mirror healing: a user can opt out from Reddit's own
// settings without touching our UI, so the plugin answer wins and we rewrite
// the mirror when they disagree. If the plugin throws we fall back to the
// mirror and mark supported:false.
export const getStatus = async (
  username: string,
  userId: string,
): Promise<NotifStatus> => {
  const raw = await redis.hGetAll(userKey(username));
  const mirrored = (raw?.notifOptIn ?? '') === '1';
  let everOptedIn = (raw?.notifEverOptIn ?? '') === '1';
  let optedIn = mirrored;
  let supported = true;
  let error: string | undefined;

  if (isT2(userId)) {
    try {
      optedIn = await notifications.isOptedIn(userId as never);
      if (optedIn !== mirrored) {
        const now = Date.now();
        await (optedIn
          ? Promise.all([
              redis.hSet(userKey(username), {
                notifOptIn: '1',
                notifOptInAt: String(now),
                notifEverOptIn: '1',
              }),
              redis.zAdd(OPTIN_KEY, { score: now, member: username }),
              redis.hSet(UID_MAP_KEY, { [userId]: username }),
            ])
          : Promise.all([
              redis.hSet(userKey(username), { notifOptIn: '0', notifOptInAt: '0' }),
              redis.zRem(OPTIN_KEY, [username]),
            ]));
      }
    } catch (e) {
      supported = false;
      error = errText(e);
    }
  }

  // Backfill for users who opted in before this flag existed, and for anyone
  // who enabled push from Reddit's own settings rather than through our UI.
  if (optedIn && !everOptedIn) {
    everOptedIn = true;
    await redis.hSet(userKey(username), { notifEverOptIn: '1' });
  }

  return {
    optedIn,
    optedInAt: optedIn ? Number(raw?.notifOptInAt ?? 0) : 0,
    everOptedIn,
    supported,
    error,
  };
};

// ── Audience ───────────────────────────────────────────────────────────────
// Our mirrored opt-ins, newest first, each with the t2 id needed to send.
// `pluginCount` is the plugin's own first-page count — shown next to ours in
// the admin panel so drift between the two is visible instead of silent.
export const listOptedIn = async (
  limit = 200,
): Promise<{
  users: { username: string; userId: string; optedInAt: number }[];
  total: number;
  pluginCount: number | null;
  error?: string;
}> => {
  const [total, raw] = await Promise.all([
    redis.zCard(OPTIN_KEY),
    redis.zRange(OPTIN_KEY, 0, -1) as Promise<any[]>,
  ]);

  const rows = raw
    .map((m: any) =>
      typeof m === 'object'
        ? { username: String(m.member), optedInAt: Number(m.score ?? 0) }
        : { username: String(m), optedInAt: 0 },
    )
    .reverse()
    .slice(0, limit);

  const users = await Promise.all(
    rows.map(async r => ({
      ...r,
      userId: (await redis.hGet(userKey(r.username), 'redditId')) ?? '',
    })),
  );

  let pluginCount: number | null = null;
  let error: string | undefined;
  try {
    const res = await notifications.listOptedInUsers({ limit: 1000 });
    pluginCount = res.userIds.length;
  } catch (e) {
    error = errText(e);
  }

  return { users, total, pluginCount, error };
};

// Resolve usernames → recipients using the redditId already stored on each
// user hash by getOrCreateUser. Unknown names are reported, not thrown, so a
// typo in a 50-name list doesn't kill the whole send.
export const resolveUsernames = async (
  usernames: string[],
): Promise<{ recipients: { username: string; userId: string }[]; unknown: string[] }> => {
  const recipients: { username: string; userId: string }[] = [];
  const unknown: string[] = [];
  await Promise.all(
    usernames.map(async name => {
      const userId = await redis.hGet(userKey(name), 'redditId');
      if (userId && isT2(userId)) recipients.push({ username: name, userId });
      else unknown.push(name);
    }),
  );
  return { recipients, unknown };
};

// ── Send ───────────────────────────────────────────────────────────────────
// title/body support Mustache ({{name}}) — we always pass the recipient's
// username as `name` so templates work without the caller doing per-user data.

export type SendInput = {
  title: string;
  body: string;
  link?: string;
  recipients: { username: string; userId: string }[];
  audience: NotifAudience;
  by: string;
};

export const send = async (input: SendInput): Promise<SendLogEntry> => {
  // Default the click-through to the post the admin panel is open in.
  const link = (input.link || context.postId || '').trim();
  if (!isLink(link)) {
    throw new Error('Link must be a post (t3_…) or comment (t1_…) id — no current post to fall back to');
  }

  const valid = input.recipients.filter(r => isT2(r.userId));
  if (!valid.length) throw new Error('No recipients with a known Reddit user id (t2_…)');

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < valid.length; i += MAX_RECIPIENTS) {
    const batch = valid.slice(i, i + MAX_RECIPIENTS);
    const res = await notifications.enqueue({
      title: input.title,
      body: input.body,
      recipients: batch.map(r => ({
        userId: r.userId,
        link,
        data: { name: r.username },
      })),
    } as unknown as EnqueueOptions);
    successCount += res.successCount ?? 0;
    failureCount += res.failureCount ?? 0;
    for (const err of res.errors ?? []) {
      errors.push(`${err.userId ?? '?'}: ${err.message}`);
    }
  }

  return await logSend({
    by: input.by,
    audience: input.audience,
    title: input.title,
    body: input.body,
    link,
    requested: valid.length,
    successCount,
    failureCount,
    // Keep the log row small — first three failures are enough to diagnose.
    error: errors.length ? errors.slice(0, 3).join(' · ') : undefined,
  });
};

// ── Send log ───────────────────────────────────────────────────────────────
// Same capped-zset pattern as announcements: member = JSON, score = sentAt.
const logSend = async (
  entry: Omit<SendLogEntry, 'id' | 'sentAt'>,
): Promise<SendLogEntry> => {
  const sentAt = Date.now();
  const full: SendLogEntry = { ...entry, id: `n${sentAt}`, sentAt };
  await redis.zAdd(SEND_LOG_KEY, { score: sentAt, member: JSON.stringify(full) });

  const count = await redis.zCard(SEND_LOG_KEY);
  if (count > MAX_LOG) {
    const oldest: any[] = (await redis.zRange(SEND_LOG_KEY, 0, count - MAX_LOG - 1)) as any;
    const members = oldest.map((m: any) => (typeof m === 'object' ? m.member : m));
    if (members.length) await redis.zRem(SEND_LOG_KEY, members);
  }
  return full;
};

export const listSendLog = async (limit = 10): Promise<SendLogEntry[]> => {
  const raw: any[] = (await redis.zRange(SEND_LOG_KEY, 0, -1)) as any;
  return raw
    .map((m: any) => {
      try {
        return JSON.parse(typeof m === 'object' ? m.member : m) as SendLogEntry;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .reverse()
    .slice(0, limit) as SendLogEntry[];
};

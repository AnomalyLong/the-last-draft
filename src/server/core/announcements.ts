import { redis } from '@devvit/web/server';
import { userKey } from './user';

// ── Announcements ────────────────────────────────────────────────────────────
// Admin-authored announcements surface in two places client-side:
//   1. The notification bell dropdown (TitleStrip) — tag/title/sub row.
//   2. The Featured Events page — fuller card under the NEON CUP hero,
//      including the optional `body` details.
// Stored as a single zset (member = JSON, score = createdAt) capped to the
// most-recent MAX_ANNOUNCEMENTS, same pattern as the challenge log.

export type AnnouncementAccent = 'cyan' | 'magenta' | 'gold';

export type Announcement = {
  id: string;
  tag: string;              // chip label, e.g. NEWS / PATCH / EVENT
  accent: AnnouncementAccent;
  title: string;
  sub: string;              // one-liner shown in the bell dropdown
  body?: string;            // longer details for the events page
  createdAt: number;
};

const KEY = 'announcements';
const MAX_ANNOUNCEMENTS = 20;

export const createAnnouncement = async (
  input: Omit<Announcement, 'id' | 'createdAt'>,
): Promise<Announcement> => {
  const createdAt = Date.now();
  const ann: Announcement = { ...input, id: `a${createdAt}`, createdAt };
  await redis.zAdd(KEY, { score: createdAt, member: JSON.stringify(ann) });

  // Cap to the most recent MAX_ANNOUNCEMENTS (zCard + zRange + zRem — this
  // codebase doesn't use zRemRangeByRank).
  const count = await redis.zCard(KEY);
  if (count > MAX_ANNOUNCEMENTS) {
    const oldest: any[] = (await redis.zRange(KEY, 0, count - MAX_ANNOUNCEMENTS - 1)) as any;
    const members = oldest.map((m: any) => (typeof m === 'object' ? m.member : m));
    if (members.length) await redis.zRem(KEY, members);
  }
  return ann;
};

// Newest first.
export const listAnnouncements = async (limit = 10): Promise<Announcement[]> => {
  const raw: any[] = (await redis.zRange(KEY, 0, -1)) as any;
  const all = raw
    .map((m: any) => {
      try { return JSON.parse(typeof m === 'object' ? m.member : m) as Announcement; }
      catch { return null; }
    })
    .filter(Boolean) as Announcement[];
  return all.reverse().slice(0, limit);
};

// ── Unread tracking ──────────────────────────────────────────────────────────
// Per-user "seen up to" timestamp stored on the user hash (`notifSeenAt`).
// The bell dot lights when the newest announcement is newer than it; opening
// the dropdown marks everything seen. (No browser storage in the Devvit
// iframe, so this lives server-side.)

const latestAnnouncementAt = async (): Promise<number> => {
  const raw: any[] = (await redis.zRange(KEY, 0, -1)) as any;
  if (!raw.length) return 0;
  const last = raw[raw.length - 1]; // ascending by score → last = newest
  try {
    return (JSON.parse(typeof last === 'object' ? last.member : last) as Announcement).createdAt;
  } catch {
    return 0;
  }
};

export const hasUnreadAnnouncements = async (username: string): Promise<boolean> => {
  const [latest, seenRaw] = await Promise.all([
    latestAnnouncementAt(),
    redis.hGet(userKey(username), 'notifSeenAt'),
  ]);
  return latest > Number(seenRaw ?? 0);
};

export const markAnnouncementsSeen = async (username: string): Promise<void> => {
  await redis.hSet(userKey(username), { notifSeenAt: String(Date.now()) });
};

export const deleteAnnouncement = async (id: string): Promise<boolean> => {
  const raw: any[] = (await redis.zRange(KEY, 0, -1)) as any;
  for (const m of raw) {
    const member = typeof m === 'object' ? m.member : m;
    try {
      if ((JSON.parse(member) as Announcement).id === id) {
        await redis.zRem(KEY, [member]);
        return true;
      }
    } catch { /* skip malformed */ }
  }
  return false;
};

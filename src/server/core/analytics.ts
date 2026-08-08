import { redis } from '@devvit/web/server';
import { USERS_INDEX_KEY, userKey, gamesKey, computeEnergy, MAX_ENERGY } from './user';
import { rosterKey } from './player';
import {
  USERS_BY_FIRST_SEEN_KEY,
  GAMES_LOG_KEY,
  indexUserFirstSeen,
  recordGamePlayed,
} from './analyticsIndex';

// Re-exported so read-side callers only ever import from core/analytics.
export { USERS_BY_FIRST_SEEN_KEY, GAMES_LOG_KEY, indexUserFirstSeen, recordGamePlayed };

// ── Analytics ───────────────────────────────────────────────────────────────
//
// Two mechanisms live here, deliberately:
//
// 1. FAN-OUT SCAN (`getAnalytics`) — walks `users:all` and reads each user's
//    hash + roster + game log. O(users) reads, but it works RETROACTIVELY:
//    every figure it reports is derivable from data we already store, so the
//    panel is correct on day one for the full user history.
//
// 2. FORWARD INDICES (`users:byFirstSeen`, `games:log`) — written on signup
//    and on game end. These make the same queries O(range) instead of
//    O(users), but only cover events from the day they shipped. Backfillable
//    from the same source data via `backfillIndices()`.
//
// The panel reads (1) today. Once the indices are populated + verified, the
// daily series can switch to (2) without changing the response shape.
//
// NOTE ON `users:all`: it is scored by lastSeen (see getOrCreateUser), NOT
// firstSeen — so it can never answer "who signed up on day X". That is the
// entire reason `users:byFirstSeen` exists as a separate key.

const DAY_MS = 86_400_000;

// Ceiling on a single fan-out scan. Above this we sample and extrapolate
// rather than issuing an unbounded number of Redis reads from a panel load.
export const SCAN_CAP = 2_000;

// Users processed per Promise.all wave. Keeps in-flight Redis calls bounded
// (~3 reads per user, so ~75 concurrent) instead of firing thousands at once.
const BATCH_SIZE = 25;

/** UTC day bucket, e.g. "2025-08-07". UTC (not local) so buckets are stable. */
export const dayKey = (ts: number): string => new Date(ts).toISOString().slice(0, 10);

type ZEntry = { member: string; score: number };

// Devvit's zRange returns either bare members or {member, score} objects
// depending on the call. Normalize both, defaulting an absent score to 0.
const zEntries = async (key: string): Promise<ZEntry[]> => {
  const raw: any[] = ((await redis.zRange(key, 0, -1)) as any) ?? [];
  return raw.map((m: any) =>
    typeof m === 'object' && m !== null
      ? { member: String(m.member), score: Number(m.score ?? 0) }
      : { member: String(m), score: 0 },
  );
};

const mapInBatches = async <T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
};

// ── Backfill ────────────────────────────────────────────────────────────────

// Populates both forward indices from existing per-user data. Safe to re-run:
// every write is a fixed-score zAdd.
export const backfillIndices = async (): Promise<{
  usersIndexed: number;
  gamesIndexed: number;
  scanned: number;
}> => {
  const usernames = (await zEntries(USERS_INDEX_KEY)).map((e) => e.member);
  let usersIndexed = 0;
  let gamesIndexed = 0;

  await mapInBatches(usernames, BATCH_SIZE, async (username) => {
    const [raw, games] = await Promise.all([
      redis.hGetAll(userKey(username)),
      zEntries(gamesKey(username)),
    ]);

    const firstSeen = Number(raw?.firstSeen ?? 0);
    if (firstSeen > 0) {
      await indexUserFirstSeen(username, firstSeen);
      usersIndexed++;
    }

    for (const g of games) {
      // Skip the synthetic 'ftue-fallback' marker and any entry with no
      // usable timestamp — neither represents a dated, played game.
      if (!/^\d+$/.test(g.member) || g.score <= 0) continue;
      await redis.zAdd(GAMES_LOG_KEY, { score: g.score, member: g.member });
      gamesIndexed++;
    }
  });

  return { usersIndexed, gamesIndexed, scanned: usernames.length };
};

// ── Fan-out scan ────────────────────────────────────────────────────────────

export type DailyPoint = {
  day: string;
  newUsers: number;
  /**
   * Of the users who FIRST SIGNED UP on this day, how many have since drafted
   * a team. This is a signup-cohort conversion figure, not "drafts that day":
   * a user who joined Mon and drafted Wed counts on Mon. That keeps
   * `drafted <= newUsers` always true, so the two series are directly
   * comparable. (Draft timestamps do exist -- rosterKey is scored by draft
   * time -- so a by-draft-date series is possible if that's wanted instead.)
   */
  drafted: number;
  games: number;
  activeUsers: number;
};

export type AnalyticsSnapshot = {
  generatedAt: number;
  windowDays: number;
  total: number;
  scanned: number;
  truncated: boolean;
  users: {
    total: number;
    drafted: number;
    notDrafted: number;
    energyBelowMax: number;
    energyEmpty: number;
    played: number;
    named: number;
    founders: number;
    muted: number;
    newToday: number;
    new7d: number;
    new30d: number;
    active7d: number;
  };
  credits: { held: number; earned: number; spent: number };
  games: { total: number; wins: number; losses: number; avgPerPlayer: number };
  daily: DailyPoint[];
};

export const getAnalytics = async (windowDays = 14): Promise<AnalyticsSnapshot> => {
  const now = Date.now();
  const days = Math.min(90, Math.max(1, windowDays));

  const all = (await zEntries(USERS_INDEX_KEY)).map((e) => e.member);
  const total = all.length;

  // `users:all` is lastSeen-ordered ascending, so the tail is the most
  // recently active — the useful slice to keep when we have to truncate.
  const truncated = total > SCAN_CAP;
  const usernames = truncated ? all.slice(total - SCAN_CAP) : all;

  // Pre-seed every bucket in the window so the chart has no holes.
  const daily = new Map<
    string,
    { newUsers: number; drafted: number; games: number; active: Set<string> }
  >();
  for (let i = days - 1; i >= 0; i--) {
    daily.set(dayKey(now - i * DAY_MS), {
      newUsers: 0,
      drafted: 0,
      games: 0,
      active: new Set(),
    });
  }
  const bucket = (ts: number) => daily.get(dayKey(ts));

  const acc = {
    drafted: 0,
    energyBelowMax: 0,
    energyEmpty: 0,
    played: 0,
    named: 0,
    founders: 0,
    muted: 0,
    newToday: 0,
    new7d: 0,
    new30d: 0,
    active7d: 0,
    held: 0,
    earned: 0,
    spent: 0,
    games: 0,
    wins: 0,
    losses: 0,
  };

  await mapInBatches(usernames, BATCH_SIZE, async (username) => {
    const [raw, rosterSize, gameEntries] = await Promise.all([
      redis.hGetAll(userKey(username)),
      redis.zCard(rosterKey(username)),
      zEntries(gamesKey(username)),
    ]);
    if (!raw?.redditId) return;

    // Energy MUST go through computeEnergy — the stored field is only
    // accurate as of the last write, and energy regenerates 1/hour. Reading
    // the raw field would badly overcount "low energy" users.
    const energy = computeEnergy(Number(raw.energy ?? 0), Number(raw.energyUpdatedAt ?? 0));
    if (energy < MAX_ENERGY) acc.energyBelowMax++;
    if (energy <= 0) acc.energyEmpty++;

    if (rosterSize > 0) acc.drafted++;
    if ((raw.teamName ?? '').trim()) acc.named++;
    if (raw.founder === '1') acc.founders++;
    if (raw.muted === '1') acc.muted++;

    acc.held += Number(raw.credits ?? 0);
    acc.earned += Number(raw.creditsEarned ?? 0);
    acc.spent += Number(raw.creditsSpent ?? 0);
    acc.wins += Number(raw.wins ?? 0);
    acc.losses += Number(raw.losses ?? 0);

    const firstSeen = Number(raw.firstSeen ?? 0);
    if (firstSeen > 0) {
      const age = now - firstSeen;
      if (dayKey(firstSeen) === dayKey(now)) acc.newToday++;
      if (age <= 7 * DAY_MS) acc.new7d++;
      if (age <= 30 * DAY_MS) acc.new30d++;
      const b = bucket(firstSeen);
      if (b) {
        b.newUsers++;
        if (rosterSize > 0) b.drafted++;
      }
    }

    const lastSeen = Number(raw.lastSeen ?? 0);
    if (lastSeen > 0 && now - lastSeen <= 7 * DAY_MS) acc.active7d++;

    // Only numeric members are real games — 'ftue-fallback' is a marker
    // written by markFtuePlayed, not a played game.
    const realGames = gameEntries.filter((g) => /^\d+$/.test(g.member));
    if (realGames.length > 0) acc.played++;
    acc.games += realGames.length;

    for (const g of realGames) {
      if (g.score <= 0) continue;
      const b = bucket(g.score);
      if (!b) continue;
      b.games++;
      b.active.add(username);
    }
  });

  return {
    generatedAt: now,
    windowDays: days,
    total,
    scanned: usernames.length,
    truncated,
    users: {
      total,
      drafted: acc.drafted,
      notDrafted: usernames.length - acc.drafted,
      energyBelowMax: acc.energyBelowMax,
      energyEmpty: acc.energyEmpty,
      played: acc.played,
      named: acc.named,
      founders: acc.founders,
      muted: acc.muted,
      newToday: acc.newToday,
      new7d: acc.new7d,
      new30d: acc.new30d,
      active7d: acc.active7d,
    },
    credits: { held: acc.held, earned: acc.earned, spent: acc.spent },
    games: {
      total: acc.games,
      wins: acc.wins,
      losses: acc.losses,
      avgPerPlayer: acc.played > 0 ? Math.round((acc.games / acc.played) * 10) / 10 : 0,
    },
    daily: [...daily.entries()].map(([day, v]) => ({
      day,
      newUsers: v.newUsers,
      drafted: v.drafted,
      games: v.games,
      activeUsers: v.active.size,
    })),
  };
};

import { redis } from '@devvit/web/server';
import { userKey, ledgerKey } from './user';
import { CURRENT_SEASON, passKey } from './battlePass';

// ── Catalog ────────────────────────────────────────────────────────────────
// Single source of truth for both server logic and the client UI. Daily
// resets at UTC midnight, weekly at UTC Monday 00:00.

export type MissionType = 'daily' | 'weekly';
export type MissionAccent = 'cyan' | 'magenta' | 'gold' | 'ink';

export type MissionDef = {
  id: string;
  label: string;
  sub: string;
  reward: number;
  total: number;
  accent: MissionAccent;
  // Featured missions are surfaced in BOTH the daily and weekly tabs of the
  // lobby (the client merges them in), but they live in — and credit as —
  // whichever list holds them here (weekly). Used by the "Create A Challenge
  // Me" CTA mission.
  featured?: boolean;
};

export type MissionView = MissionDef & {
  progress: number;
  // completed: progress reached the target — mission is claimable.
  // claimed:   user explicitly claimed the reward — credits deposited.
  // A legacy `{id}:awarded` flag (written before this split) is treated as
  // both completed and claimed so old period hashes remain correct until
  // they TTL out (max 21 days).
  completed: boolean;
  claimed: boolean;
};

export type MissionCatalog = Record<MissionType, MissionDef[]>;

// Built-in defaults — what the catalog falls back to when Redis has no
// override. Admins can edit the live catalog via `setMissionCatalog`; the
// defaults stay readable here for "reset to defaults" and for reference.
export const DEFAULT_MISSION_CATALOG: MissionCatalog = {
  daily: [
    { id: 'win1',   label: 'WIN A GAME',     sub: 'Complete any match',         reward: 50,  total: 1, accent: 'cyan' },
    { id: 'draft1', label: 'DRAFT A PLAYER', sub: 'Use a free or credit draft', reward: 25,  total: 1, accent: 'magenta' },
    { id: 'play3',  label: 'PLAY 3 GAMES',   sub: 'Any mode counts',            reward: 100, total: 3, accent: 'gold' },
  ],
  weekly: [
    { id: 'wchallenge', label: 'CREATE A CHALLENGE ME', sub: 'Post your roster on r/LastDraftGame', reward: 200, total: 1, accent: 'gold', featured: true },
    { id: 'wwin5',   label: 'WIN 5 GAMES',     sub: 'Any mode',                reward: 300, total: 5, accent: 'cyan' },
    { id: 'wdraft',  label: 'DRAFT 3 PLAYERS', sub: 'Free or credit drafts',   reward: 150, total: 3, accent: 'magenta' },
    // wranked: PLAY RANKED — disabled until ranked mode ships. Re-add when
    // the ranked queue + hook in game.end (or wherever ranked completion
    // fires) are in place.
  ],
};

const CATALOG_KEY = 'missions:catalog';

// Guarantees that "featured" system missions from the defaults are present in a
// stored override, even if that override was saved before the mission shipped.
//
// Scope is deliberately narrow: ONLY missions flagged `featured` self-heal.
// Featured entries are core CTAs wired to product features (e.g. CREATE A
// CHALLENGE ME), not tunable content — so shipping a new one shouldn't require
// every environment to manually reset its catalog. Regular (non-featured)
// missions are left entirely to the override: admins can add/remove/edit them
// and a deletion sticks. (Trade-off: a featured mission can't be permanently
// removed via the editor — to retire one, drop its `featured` flag in the
// defaults. That's intentional for system CTAs.)
//
// Read-time and non-destructive — it never writes back. Missing featured
// missions are prepended to their default list, matching how the client
// surfaces them (featured-first, in both tabs).
const withFeaturedDefaults = (catalog: MissionCatalog): MissionCatalog => {
  const ids = new Set([...catalog.daily, ...catalog.weekly].map(m => m.id));
  const out: MissionCatalog = { daily: [...catalog.daily], weekly: [...catalog.weekly] };
  let changed = false;
  for (const type of ['daily', 'weekly'] as const) {
    const missing = DEFAULT_MISSION_CATALOG[type].filter(m => m.featured && !ids.has(m.id));
    if (missing.length) {
      out[type] = [...missing, ...out[type]];
      changed = true;
    }
  }
  return changed ? out : catalog;
};

// Reads the live catalog from Redis, falling back to defaults when no
// override exists. Hooks call this on every event tick — it's cheap (a
// single string read), and the simplicity beats trying to maintain an
// in-process cache invalidated by writes.
export const getMissionCatalog = async (): Promise<MissionCatalog> => {
  const raw = await redis.get(CATALOG_KEY);
  if (!raw) return DEFAULT_MISSION_CATALOG;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.daily) && Array.isArray(parsed?.weekly)) {
      // Merge in any featured system missions the stored override predates.
      return withFeaturedDefaults(parsed as MissionCatalog);
    }
  } catch { /* fall through to defaults */ }
  return DEFAULT_MISSION_CATALOG;
};

export const setMissionCatalog = async (catalog: MissionCatalog): Promise<void> => {
  // Lightweight shape check: every entry must at least carry id / total /
  // reward. We don't enforce uniqueness here — that's the editor UI's job.
  for (const type of ['daily', 'weekly'] as const) {
    for (const m of catalog[type] ?? []) {
      if (typeof m.id !== 'string' || !m.id) throw new Error('Mission id required');
      if (typeof m.total !== 'number' || m.total < 1) throw new Error(`Mission ${m.id}: total must be ≥1`);
      if (typeof m.reward !== 'number' || m.reward < 0) throw new Error(`Mission ${m.id}: reward must be ≥0`);
    }
  }
  await redis.set(CATALOG_KEY, JSON.stringify(catalog));
};

export const resetMissionCatalog = async (): Promise<void> => {
  await redis.del(CATALOG_KEY);
};

// Locate a mission ID in the live catalog. Returns null if unknown — hooks
// use this to route ticks to whichever list the admin has the mission in.
const findMissionType = (
  catalog: MissionCatalog,
  id: string,
): MissionType | null => {
  if (catalog.daily.find(m => m.id === id)) return 'daily';
  if (catalog.weekly.find(m => m.id === id)) return 'weekly';
  return null;
};

// Apply a partial update to a single mission (looked up by id across both
// lists). Throws if the mission isn't found.
export const updateMissionDef = async (
  id: string,
  updates: Partial<Omit<MissionDef, 'id'>>,
): Promise<void> => {
  const catalog = await getMissionCatalog();
  for (const type of ['daily', 'weekly'] as const) {
    const idx = catalog[type].findIndex(m => m.id === id);
    if (idx >= 0) {
      catalog[type][idx] = { ...catalog[type][idx]!, ...updates, id };
      await setMissionCatalog(catalog);
      return;
    }
  }
  throw new Error(`Mission "${id}" not in catalog`);
};

// Move a mission between the daily and weekly lists. Any in-flight progress
// stays in its original period hash and TTLs out; new ticks land in the new
// list's current-period hash.
export const moveMissionType = async (
  id: string,
  toType: MissionType,
): Promise<void> => {
  const catalog = await getMissionCatalog();
  const fromType: MissionType = catalog.daily.find(m => m.id === id)
    ? 'daily'
    : catalog.weekly.find(m => m.id === id)
      ? 'weekly'
      : (() => { throw new Error(`Mission "${id}" not in catalog`); })();
  if (fromType === toType) return;
  const idx = catalog[fromType].findIndex(m => m.id === id);
  const [def] = catalog[fromType].splice(idx, 1);
  catalog[toType].push(def!);
  await setMissionCatalog(catalog);
};

// ── Period keys ────────────────────────────────────────────────────────────
// UTC day number (daily) and UTC week-since-Monday number (weekly).
const DAY_MS = 86400000;

export const dailyPeriodKey = (now = Date.now()): number =>
  Math.floor(now / DAY_MS);

export const weeklyPeriodKey = (now = Date.now()): number =>
  // Epoch (1970-01-01) was a Thursday. Shifting -4 days aligns week boundaries
  // to Monday UTC.
  Math.floor((now - 4 * DAY_MS) / (7 * DAY_MS));

// ── Redis keys + TTLs ──────────────────────────────────────────────────────
const DAILY_TTL_SECS = 10 * 24 * 60 * 60;
const WEEKLY_TTL_SECS = 21 * 24 * 60 * 60;

const periodKey = (username: string, type: MissionType, period: number) =>
  `user:missions:${username}:${type}:${period}`;

const ttlForType = (type: MissionType) =>
  type === 'daily' ? DAILY_TTL_SECS : WEEKLY_TTL_SECS;

// ── Read ───────────────────────────────────────────────────────────────────
const buildViews = (
  defs: MissionDef[],
  raw: Record<string, string> | null,
): MissionView[] =>
  defs.map(def => {
    // Legacy support: old `{id}:awarded` flag (written before the
    // completed/claimed split) is treated as both completed and claimed so
    // existing period hashes remain correct until they TTL out.
    const legacy = (raw?.[`${def.id}:awarded`] ?? '') === '1';
    return {
      ...def,
      progress: Math.min(def.total, Number(raw?.[def.id] ?? 0)),
      completed: legacy || (raw?.[`${def.id}:completed`] ?? '') === '1',
      claimed:   legacy || (raw?.[`${def.id}:claimed`]   ?? '') === '1',
    };
  });

export const listMissions = async (
  username: string,
): Promise<{ daily: MissionView[]; weekly: MissionView[] }> => {
  const now = Date.now();
  const dailyKey = periodKey(username, 'daily', dailyPeriodKey(now));
  const weeklyKey = periodKey(username, 'weekly', weeklyPeriodKey(now));

  const [catalog, dailyRaw, weeklyRaw] = await Promise.all([
    getMissionCatalog(),
    redis.hGetAll(dailyKey),
    redis.hGetAll(weeklyKey),
  ]);

  return {
    daily: buildViews(catalog.daily, dailyRaw),
    weekly: buildViews(catalog.weekly, weeklyRaw),
  };
};

// ── Write ──────────────────────────────────────────────────────────────────
// Award credits + ledger entry. Inlined here (rather than reusing
// awardCredits in user.ts) so the ledger ref is mission-shaped:
// `earn|50|mission:win1` instead of `earn|50|game:mission:win1`.
const awardMissionCredits = async (
  username: string,
  amount: number,
  missionId: string,
): Promise<void> => {
  const key = userKey(username);
  await Promise.all([
    redis.hIncrBy(key, 'credits', amount),
    redis.hIncrBy(key, 'creditsEarned', amount),
    redis.zAdd(ledgerKey(username), {
      score: Date.now(),
      member: `earn|${amount}|mission:${missionId}`,
    }),
  ]);
};

// Increment a single mission's progress within its current period. When the
// increment carries the count to/past the target AND no completion flag has
// been set for this period, atomically set the `completed` flag so the client
// can surface a CLAIM button.
//
// Credits are NOT deposited here — that happens in claimMission() when the
// user explicitly claims the reward.
//
// Returns whether completion was triggered by *this* call so callers can
// decide whether to surface a "ready to claim" notification downstream.
export const incrementMission = async (
  username: string,
  type: MissionType,
  missionId: string,
  amount = 1,
  catalog?: MissionCatalog,
): Promise<{ progress: number; completed: boolean; claimed: boolean; justCompleted: boolean }> => {
  const cat = catalog ?? await getMissionCatalog();
  const def = cat[type].find(m => m.id === missionId);
  if (!def) return { progress: 0, completed: false, claimed: false, justCompleted: false };

  const now = Date.now();
  const period = type === 'daily' ? dailyPeriodKey(now) : weeklyPeriodKey(now);
  const key = periodKey(username, type, period);

  const progress = await redis.hIncrBy(key, missionId, amount);

  // First write to a fresh period hash — set its TTL so old periods cleanup
  // automatically. Idempotent on subsequent writes.
  if (progress === amount) {
    await redis.expire(key, ttlForType(type));
  }

  if (progress < def.total) {
    return { progress, completed: false, claimed: false, justCompleted: false };
  }

  // Race-safe completion guard: hSetNX returns true only for the writer that
  // actually set the flag.
  const completedField = `${missionId}:completed`;
  const justCompleted = (await redis.hSetNX(key, completedField, '1')) === 1;

  // Check if already claimed (e.g. from a prior session in the same period).
  const claimedVal = await redis.hGet(key, `${missionId}:claimed`);
  const claimed = (claimedVal ?? '') === '1';

  return { progress, completed: true, claimed, justCompleted };
};

// Claim a completed mission — deposits credits exactly once per period.
// Returns { claimed: true, reward } if credits were deposited by this call,
// or { claimed: false, reward: 0 } if already claimed (idempotent, no error).
// Throws if the mission is not yet completed.
export const claimMission = async (
  username: string,
  type: MissionType,
  missionId: string,
): Promise<{ claimed: boolean; reward: number }> => {
  const catalog = await getMissionCatalog();
  const def = catalog[type].find(m => m.id === missionId);
  if (!def) throw new Error(`Unknown mission: ${type}/${missionId}`);

  const now = Date.now();
  const period = type === 'daily' ? dailyPeriodKey(now) : weeklyPeriodKey(now);
  const key = periodKey(username, type, period);

  // Verify the mission is actually completed. Check both new flag and legacy.
  const raw = await redis.hGetAll(key);
  const isCompleted =
    (raw?.[`${missionId}:completed`] ?? '') === '1' ||
    (raw?.[`${missionId}:awarded`]   ?? '') === '1';
  if (!isCompleted) throw new Error(`Mission "${missionId}" is not yet completed`);

  // Race-safe claim guard: only the first caller deposits credits.
  const claimedField = `${missionId}:claimed`;
  const justClaimed = (await redis.hSetNX(key, claimedField, '1')) === 1;

  if (justClaimed) {
    await awardMissionCredits(username, def.reward, missionId);
    return { claimed: true, reward: def.reward };
  }

  return { claimed: false, reward: 0 };
};

// ── Event hooks ────────────────────────────────────────────────────────────
// Tick a mission by id, looking up its current list in the live catalog so
// admin re-categorisation (daily <-> weekly) takes effect on the next event
// without code changes.
const tickById = (
  catalog: MissionCatalog,
  username: string,
  id: string,
  amount = 1,
): Promise<unknown> | null => {
  const type = findMissionType(catalog, id);
  if (!type) return null;
  return incrementMission(username, type, id, amount, catalog);
};

// Game completion ticks `play3` always; on a win also `win1` and `wwin5`.
// BP missions: `bp_play50` always; on a win also `bp_win10` and `bp_win25`.
// Errors are swallowed — mission tracking must never break a game finalize.
export const recordGameCompletion = async (
  username: string,
  won: boolean,
): Promise<void> => {
  try {
    const catalog = await getMissionCatalog();
    const ops: Promise<unknown>[] = [];
    const play3 = tickById(catalog, username, 'play3', 1);
    if (play3) ops.push(play3);
    if (won) {
      const w1 = tickById(catalog, username, 'win1', 1);
      const w5 = tickById(catalog, username, 'wwin5', 1);
      if (w1) ops.push(w1);
      if (w5) ops.push(w5);
    }
    ops.push(incrementBpMission(username, 'bp_play50', 1));
    if (won) {
      ops.push(incrementBpMission(username, 'bp_win10', 1));
      ops.push(incrementBpMission(username, 'bp_win25', 1));
    }
    await Promise.all(ops);
  } catch {
    // Mission tracking must not break game finalization.
  }
};

// Each minted player adds one tick to `draft1` and `wdraft`. freeDraft is
// called once per player so a 5-player FTUE draft fires this 5x.
// BP missions: `bp_draft5` and `bp_draft10` track season-total drafts.
export const recordDraftCompletion = async (
  username: string,
  count = 1,
): Promise<void> => {
  if (count <= 0) return;
  try {
    const catalog = await getMissionCatalog();
    const ops: Promise<unknown>[] = [];
    const d1 = tickById(catalog, username, 'draft1', count);
    const wd = tickById(catalog, username, 'wdraft', count);
    if (d1) ops.push(d1);
    if (wd) ops.push(wd);
    ops.push(incrementBpMission(username, 'bp_draft5', count));
    ops.push(incrementBpMission(username, 'bp_draft10', count));
    await Promise.all(ops);
  } catch {
    // Mission tracking must not break draft.
  }
};

// Posting a "Challenge Me" card ticks the featured weekly `wchallenge`
// mission and the BP `bp_challenge` (3 posts per season for pass holders).
// Post creation is already gated to once-per-week; the hSetNX completion
// guard in incrementMission prevents a double-complete regardless.
export const recordChallengeCreated = async (
  username: string,
): Promise<void> => {
  try {
    const catalog = await getMissionCatalog();
    const op = tickById(catalog, username, 'wchallenge', 1);
    await Promise.all([
      op ?? Promise.resolve(),
      incrementBpMission(username, 'bp_challenge', 1),
    ]);
  } catch {
    // Mission tracking must not break post creation.
  }
};

// ── Battle Pass missions ───────────────────────────────────────────────────
// Season-scoped missions exclusive to pass holders. Progress is stored in a
// single hash per user per season (not daily/weekly period churn). Non-holders
// earn no progress — the pass ownership check lives inside incrementBpMission
// so call sites don't need to gate it themselves.

export const BP_MISSIONS: MissionDef[] = [
  { id: 'bp_win10',     label: 'WIN 10 GAMES',     sub: 'Any mode',                reward: 1000, total: 10, accent: 'cyan'    },
  { id: 'bp_win25',     label: 'WIN 25 GAMES',      sub: 'Dominate the season',     reward: 2500, total: 25, accent: 'cyan'    },
  { id: 'bp_draft5',    label: 'DRAFT 5 PLAYERS',   sub: 'Free or credit drafts',   reward: 500,  total: 5,  accent: 'magenta' },
  { id: 'bp_draft10',   label: 'DRAFT 10 PLAYERS',  sub: 'Build your empire',       reward: 1200, total: 10, accent: 'magenta' },
  { id: 'bp_challenge', label: 'POST 3 CHALLENGES', sub: 'Challenge the community', reward: 750,  total: 3,  accent: 'gold'    },
  { id: 'bp_play50',    label: 'PLAY 50 GAMES',     sub: 'The grind is real',       reward: 3000, total: 50, accent: 'gold'    },
];

const BP_TTL_SECS = 90 * 24 * 60 * 60; // 90 days — covers a full season

const bpMissionKey = (username: string) =>
  `user:missions:${username}:pass:${CURRENT_SEASON}`;

export const incrementBpMission = async (
  username: string,
  missionId: string,
  amount = 1,
): Promise<{ progress: number; completed: boolean; claimed: boolean; justCompleted: boolean }> => {
  // Cheap pass check: one hGet on the pass hash. Non-holders are skipped.
  const tier = await redis.hGet(passKey(CURRENT_SEASON, username), 'tier');
  if (!tier) return { progress: 0, completed: false, claimed: false, justCompleted: false };

  const def = BP_MISSIONS.find(m => m.id === missionId);
  if (!def) return { progress: 0, completed: false, claimed: false, justCompleted: false };

  const key = bpMissionKey(username);
  const progress = await redis.hIncrBy(key, missionId, amount);

  if (progress === amount) {
    await redis.expire(key, BP_TTL_SECS);
  }

  if (progress < def.total) {
    return { progress, completed: false, claimed: false, justCompleted: false };
  }

  const completedField = `${missionId}:completed`;
  const justCompleted = (await redis.hSetNX(key, completedField, '1')) === 1;

  const claimedVal = await redis.hGet(key, `${missionId}:claimed`);
  const claimed = (claimedVal ?? '') === '1';

  return { progress: Math.min(progress, def.total), completed: true, claimed, justCompleted };
};

export const listBpMissions = async (username: string): Promise<MissionView[]> => {
  const raw = await redis.hGetAll(bpMissionKey(username));
  return buildViews(BP_MISSIONS, raw);
};

export const claimBpMission = async (
  username: string,
  missionId: string,
): Promise<{ claimed: boolean; reward: number }> => {
  const def = BP_MISSIONS.find(m => m.id === missionId);
  if (!def) throw new Error(`Unknown BP mission: ${missionId}`);

  const key = bpMissionKey(username);
  const raw = await redis.hGetAll(key);
  const isCompleted = (raw?.[`${missionId}:completed`] ?? '') === '1';
  if (!isCompleted) throw new Error(`BP mission "${missionId}" is not yet completed`);

  const justClaimed = (await redis.hSetNX(key, `${missionId}:claimed`, '1')) === 1;
  if (justClaimed) {
    await awardMissionCredits(username, def.reward, missionId);
    return { claimed: true, reward: def.reward };
  }
  return { claimed: false, reward: 0 };
};

export const adminCompleteBpMission = async (
  username: string,
  missionId: string,
): Promise<{ completed: boolean; claimed: boolean }> => {
  const def = BP_MISSIONS.find(m => m.id === missionId);
  if (!def) throw new Error(`Unknown BP mission: ${missionId}`);
  const key = bpMissionKey(username);

  const raw = await redis.hGetAll(key);
  const current = Number(raw?.[missionId] ?? 0);
  if (current < def.total) {
    await redis.hSet(key, { [missionId]: String(def.total) });
    await redis.expire(key, BP_TTL_SECS);
  }
  await redis.hSetNX(key, `${missionId}:completed`, '1');

  const justClaimed = (await redis.hSetNX(key, `${missionId}:claimed`, '1')) === 1;
  if (justClaimed) {
    await awardMissionCredits(username, def.reward, missionId);
  }

  return { completed: true, claimed: true };
};

export const resetUserBpMissions = async (username: string): Promise<void> => {
  await redis.del(bpMissionKey(username));
};

// ── Admin operations ───────────────────────────────────────────────────────
// Reset the user's CURRENT daily + weekly period hashes — wipes progress and
// all flags so they can complete the missions again this period.
// (Past periods are left alone; they'll TTL out on their own.)
export const resetUserMissions = async (username: string): Promise<void> => {
  const now = Date.now();
  await Promise.all([
    redis.del(periodKey(username, 'daily', dailyPeriodKey(now))),
    redis.del(periodKey(username, 'weekly', weeklyPeriodKey(now))),
  ]);
};

// Directly set progress for a single mission. Does NOT touch completion or
// claim flags — use adminCompleteMission for that.
export const adminSetMissionProgress = async (
  username: string,
  type: MissionType,
  missionId: string,
  progress: number,
): Promise<void> => {
  const catalog = await getMissionCatalog();
  const def = catalog[type].find(m => m.id === missionId);
  if (!def) throw new Error(`Unknown mission: ${type}/${missionId}`);
  const period = type === 'daily' ? dailyPeriodKey() : weeklyPeriodKey();
  const key = periodKey(username, type, period);
  const clamped = Math.max(0, Math.floor(progress));
  await redis.hSet(key, { [missionId]: String(clamped) });
  await redis.expire(key, ttlForType(type));
};

// Force-complete AND auto-claim a mission for admin convenience. Sets both
// the `completed` and `claimed` flags and deposits credits immediately —
// skipping the user-facing claim step so admins don't need to simulate the
// full UI flow.
export const adminCompleteMission = async (
  username: string,
  type: MissionType,
  missionId: string,
): Promise<{ completed: boolean; claimed: boolean }> => {
  const catalog = await getMissionCatalog();
  const def = catalog[type].find(m => m.id === missionId);
  if (!def) throw new Error(`Unknown mission: ${type}/${missionId}`);
  const period = type === 'daily' ? dailyPeriodKey() : weeklyPeriodKey();
  const key = periodKey(username, type, period);

  // Jump progress to total, set completion flag.
  const raw = await redis.hGetAll(key);
  const current = Number(raw?.[missionId] ?? 0);
  const delta = Math.max(1, def.total - current);
  await incrementMission(username, type, missionId, delta, catalog);

  // Auto-claim — deposit credits immediately (admin convenience).
  const justClaimed = (await redis.hSetNX(key, `${missionId}:claimed`, '1')) === 1;
  if (justClaimed) {
    await awardMissionCredits(username, def.reward, missionId);
  }

  return { completed: true, claimed: true };
};

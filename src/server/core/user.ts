import { redis } from '@devvit/web/server';
import { indexUserFirstSeen } from './analyticsIndex';

export const MAX_ENERGY = 5;
const ENERGY_REGEN_SECS = 3600;

export type UserData = {
  redditId: string;
  firstSeen: number;
  lastSeen: number;
  credits: number;
  creditsEarned: number;
  creditsSpent: number;
  energy: number;
  energyUpdatedAt: number;
  freeDrafts: number;
  paidPicks: number;
  gamesPlayed: number;
  teamName: string;
  wins: number;
  losses: number;
  muted: boolean;
  // Lifetime flag set when a user buys ANY Founders Pass tier in Season 0.
  // Stays true forever — used to auto-grant free season passes when S1
  // ships. Distinct from the season-scoped pass record (see core/battlePass.ts).
  founder: 0 | 1;
};

export const userKey = (username: string) => `user:${username}`;
export const ledgerKey = (username: string) => `user:ledger:${username}`;
export const gamesKey = (username: string) => `user:games:${username}`;
export const USERS_INDEX_KEY = 'users:all';

const parseUser = (raw: Record<string, string>): UserData => ({
  redditId: raw.redditId ?? '',
  firstSeen: Number(raw.firstSeen ?? 0),
  lastSeen: Number(raw.lastSeen ?? 0),
  credits: Number(raw.credits ?? 0),
  creditsEarned: Number(raw.creditsEarned ?? 0),
  creditsSpent: Number(raw.creditsSpent ?? 0),
  energy: Number(raw.energy ?? 0),
  energyUpdatedAt: Number(raw.energyUpdatedAt ?? 0),
  freeDrafts: Number(raw.freeDrafts ?? 0),
  paidPicks: Number(raw.paidPicks ?? 0),
  gamesPlayed: Number(raw.gamesPlayed ?? 0),
  teamName: raw.teamName ?? '',
  wins: Number(raw.wins ?? 0),
  losses: Number(raw.losses ?? 0),
  muted: raw.muted === '1',
  // Defensive default: any pre-pass user reads as non-founder.
  founder: raw.founder === '1' ? 1 : 0,
});

export const computeEnergy = (energy: number, energyUpdatedAt: number): number => {
  const elapsed = Math.floor((Date.now() - energyUpdatedAt) / 1000);
  const regened = Math.floor(elapsed / ENERGY_REGEN_SECS);
  return Math.min(energy + regened, MAX_ENERGY);
};

export const getOrCreateUser = async (username: string, redditId: string): Promise<UserData> => {
  const key = userKey(username);
  const now = Date.now();

  // hSetNX only writes if field doesn't exist — safe to call on every visit
  await Promise.all([
    redis.hSetNX(key, 'redditId', redditId),
    redis.hSetNX(key, 'firstSeen', String(now)),
    redis.hSetNX(key, 'credits', '0'),
    redis.hSetNX(key, 'creditsEarned', '0'),
    redis.hSetNX(key, 'creditsSpent', '0'),
    redis.hSetNX(key, 'energy', String(MAX_ENERGY)),
    redis.hSetNX(key, 'energyUpdatedAt', String(now)),
    // New users get 5 free picks — exactly enough to draft a starting roster.
    // After the FTUE draft consumes all 5, users must earn more picks.
    redis.hSetNX(key, 'freeDrafts', '5'),
    redis.hSetNX(key, 'muted', '0'),
  ]);

  await Promise.all([
    redis.hSet(key, { lastSeen: String(now) }),
    redis.zAdd(USERS_INDEX_KEY, { score: now, member: username }),
  ]);

  const [raw, gamesPlayed] = await Promise.all([
    redis.hGetAll(key),
    redis.zCard(gamesKey(username)),
  ]);

  // Mirror firstSeen into the signup index. `users:all` is scored by lastSeen,
  // so it can't answer "who joined on day X" — this index can. The write is a
  // fixed-score zAdd, so calling it on every visit is idempotent. Never let an
  // analytics write break user init.
  const parsed = { ...parseUser(raw), gamesPlayed };
  try {
    await indexUserFirstSeen(username, parsed.firstSeen);
  } catch {
    /* analytics index is best-effort */
  }

  return parsed;
};

export const getUser = async (username: string): Promise<UserData | null> => {
  const [raw, gamesPlayed] = await Promise.all([
    redis.hGetAll(userKey(username)),
    redis.zCard(gamesKey(username)),
  ]);
  if (!raw?.redditId) return null;
  return { ...parseUser(raw), gamesPlayed };
};

// Records are keyed by the EXACT username string that created them (userKey is
// `user:${username}` with no normalization). The Devvit emulator reports the
// current user WITH a "u/" prefix, production Reddit reports the bare handle —
// so the same person is `user:u/carol` locally and `user:carol` in prod.
//
// Admin tools are typed by hand, so accept either form: probe the string as
// given, then the toggled form, and return whichever key actually exists. This
// deliberately does NOT rewrite the stored key (that would orphan live data) —
// it only tells callers the canonical name to address.
const toggleUserPrefix = (username: string): string =>
  /^u\//i.test(username) ? username.replace(/^u\//i, '') : `u/${username}`;

export const resolveUsername = async (username: string): Promise<string | null> => {
  const typed = username.trim();
  if (!typed) return null;
  for (const candidate of [typed, toggleUserPrefix(typed)]) {
    const raw = await redis.hGetAll(userKey(candidate));
    if (raw?.redditId) return candidate;
  }
  return null;
};

// Computes current energy (with regen), deducts 1, returns false if empty.
// hIncrBy is atomic, so concurrent requests can't both win when energy=1.
export const deductEnergy = async (username: string): Promise<{ success: boolean; energy: number }> => {
  const key = userKey(username);
  const raw = await redis.hGetAll(key);
  const currentEnergy = computeEnergy(
    Number(raw?.energy ?? 0),
    Number(raw?.energyUpdatedAt ?? 0),
  );

  if (currentEnergy <= 0) return { success: false, energy: 0 };

  // Normalize regen back to Redis so hIncrBy operates on the correct baseline.
  await redis.hSet(key, { energy: String(currentEnergy), energyUpdatedAt: String(Date.now()) });

  // Atomic decrement — if two tabs race here, one will go negative and undo.
  const after = await redis.hIncrBy(key, 'energy', -1);
  if (after < 0) {
    await redis.hIncrBy(key, 'energy', 1);
    return { success: false, energy: 0 };
  }

  return { success: true, energy: after };
};

// Persist the user's team name. One team per user.
export const setTeamName = async (username: string, teamName: string): Promise<void> => {
  await redis.hSet(userKey(username), { teamName: teamName.slice(0, 24) });
};

// Persist the user's global sound preference across devices and sessions.
export const setMutedPreference = async (username: string, muted: boolean): Promise<void> => {
  await redis.hSet(userKey(username), { muted: muted ? '1' : '0' });
};

export const awardCredits = async (
  username: string,
  amount: number,
  gameId: string,
): Promise<void> => {
  const key = userKey(username);
  const now = Date.now();

  await Promise.all([
    redis.hIncrBy(key, 'credits', amount),
    redis.hIncrBy(key, 'creditsEarned', amount),
    redis.zAdd(ledgerKey(username), {
      score: now,
      member: `earn|${amount}|game:${gameId}`,
    }),
  ]);
};

// Deducts credits. ref format: 'trade:{tradeId}' or 'player:{playerId}'
// hIncrBy is atomic — if two tabs race, one will go negative and undo.
export const spendCredits = async (
  username: string,
  amount: number,
  ref: string,
): Promise<{ success: boolean }> => {
  const key = userKey(username);
  const credits = Number((await redis.hGet(key, 'credits')) ?? 0);
  if (credits < amount) return { success: false };

  const after = await redis.hIncrBy(key, 'credits', -amount);
  if (after < 0) {
    await redis.hIncrBy(key, 'credits', amount);
    return { success: false };
  }

  const now = Date.now();
  await Promise.all([
    redis.hIncrBy(key, 'creditsSpent', amount),
    redis.zAdd(ledgerKey(username), { score: now, member: `spend|${amount}|${ref}` }),
  ]);

  return { success: true };
};

export const grantFreeDrafts = async (username: string, amount: number): Promise<void> => {
  await redis.hIncrBy(userKey(username), 'freeDrafts', amount);
};

// Increments the user's win or loss tally. Shown as the W-L record on their
// Challenge Me card. Called from endGame for clean (non-flagged) games only.
export const recordGameOutcome = async (username: string, won: boolean): Promise<void> => {
  await redis.hIncrBy(userKey(username), won ? 'wins' : 'losses', 1);
};

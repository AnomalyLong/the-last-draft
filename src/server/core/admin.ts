import { redis } from '@devvit/web/server';
import { gameKey, playsKey } from './game';
import { userKey, ledgerKey } from './user';

const ADMINS_KEY = 'admins';
const GAME_REVIEWS_KEY = 'game:reviews';

// Hardcoded creator admin(s) — always treated as admin regardless of the
// Redis admins hash. Reddit usernames are case-insensitive; normalize on match.
const CREATOR_ADMINS = new Set(['afternoonno3552']);

export const isCreatorAdmin = (username: string): boolean =>
  CREATOR_ADMINS.has(username.toLowerCase());

export const isAdmin = async (username: string): Promise<boolean> => {
  if (isCreatorAdmin(username)) return true;
  const val = await redis.hGet(ADMINS_KEY, username);
  return typeof val === 'string' && val.length > 0;
};

export const addAdmin = async (username: string): Promise<void> => {
  await redis.hSet(ADMINS_KEY, { [username]: String(Date.now()) });
};

export const removeAdmin = async (username: string): Promise<void> => {
  if (isCreatorAdmin(username)) return; // creator admin is permanent
  await redis.hDel(ADMINS_KEY, [username]);
};

export const getAdmins = async (): Promise<{ username: string; grantedAt: number }[]> => {
  const raw = await redis.hGetAll(ADMINS_KEY);
  return Object.entries(raw ?? {}).map(([username, grantedAt]) => ({
    username,
    grantedAt: Number(grantedAt),
  }));
};

const zRangeStrings = async (key: string, start: number, stop: number): Promise<string[]> => {
  const raw: any[] = (await redis.zRange(key, start, stop)) as any;
  return raw.map((m: any) => typeof m === 'object' ? m.member : m);
};

export const getPendingGames = async (limit = 50): Promise<number[]> => {
  return (await zRangeStrings('games:pending', 0, limit - 1)).map(Number);
};

export const getFlaggedGames = async (limit = 50): Promise<number[]> => {
  return (await zRangeStrings('games:flagged', 0, limit - 1)).map(Number);
};

// Approve: write review record, collapse game hash to minimal fields,
// delete play log, remove from queues.
export const approveGame = async (gameId: number, adminUsername: string): Promise<void> => {
  const now = Date.now();
  const key = gameKey(gameId);
  const raw = await redis.hGetAll(key);
  if (!raw?.username) throw new Error('Game not found');

  // Collapse hash — discard fields only needed for review
  await redis.del(key);
  await redis.hSet(key, {
    username: raw.username,
    score: raw.verifiedScore ?? '0',
    creditsEarned: raw.creditsEarned ?? '0',
    status: 'approved',
    reviewedBy: adminUsername,
    reviewedAt: String(now),
  });

  await Promise.all([
    redis.del(playsKey(gameId)),
    redis.zRem('games:pending', [String(gameId)]),
    redis.zRem('games:flagged', [String(gameId)]),
    redis.hSet(GAME_REVIEWS_KEY, {
      [String(gameId)]: `${adminUsername}|approved|${now}`,
    }),
  ]);
};

// Reject: revoke any credits awarded, delete play log, record review.
export const rejectGame = async (gameId: number, adminUsername: string): Promise<void> => {
  const now = Date.now();
  const key = gameKey(gameId);
  const raw = await redis.hGetAll(key);
  if (!raw?.username) throw new Error('Game not found');

  const username = raw.username;
  const creditsEarned = Number(raw.creditsEarned ?? 0);

  if (creditsEarned > 0) {
    await Promise.all([
      redis.hIncrBy(userKey(username), 'credits', -creditsEarned),
      redis.hIncrBy(userKey(username), 'creditsEarned', -creditsEarned),
      redis.zAdd(ledgerKey(username), {
        score: now,
        member: `revoke|${creditsEarned}|game:${gameId}`,
      }),
    ]);
  }

  await Promise.all([
    redis.hSet(key, {
      status: 'rejected',
      reviewedBy: adminUsername,
      reviewedAt: String(now),
    }),
    redis.del(playsKey(gameId)),
    redis.zRem('games:pending', [String(gameId)]),
    redis.zRem('games:flagged', [String(gameId)]),
    redis.hSet(GAME_REVIEWS_KEY, {
      [String(gameId)]: `${adminUsername}|rejected|${now}`,
    }),
  ]);
};

// Grant or revoke credits manually — admin dispute resolution.
export const adjustCredits = async (
  targetUsername: string,
  amount: number,
  adminUsername: string,
  reason: string,
): Promise<void> => {
  const now = Date.now();
  const type = amount >= 0 ? 'admin:grant' : 'admin:revoke';
  await Promise.all([
    redis.hIncrBy(userKey(targetUsername), 'credits', amount),
    amount > 0
      ? redis.hIncrBy(userKey(targetUsername), 'creditsEarned', amount)
      : redis.hIncrBy(userKey(targetUsername), 'creditsSpent', -amount),
    redis.zAdd(ledgerKey(targetUsername), {
      score: now,
      member: `${type}|${Math.abs(amount)}|${adminUsername}:${reason}`,
    }),
  ]);
};

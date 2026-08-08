import { redis } from '@devvit/web/server';

// Leaf module: the forward-index KEYS and WRITES only.
//
// This exists separately from core/analytics.ts purely to break an import
// cycle. analytics.ts needs userKey/computeEnergy from core/user.ts, while
// core/user.ts and core/game.ts need to WRITE these indices — importing
// analytics.ts from user.ts would form user → analytics → user. This file
// imports nothing from the codebase, so both sides can depend on it safely.
//
// analytics.ts re-exports everything here; prefer importing from there for
// reads so callers only need one module.
//
// SAFETY CONTRACT: every write here is best-effort and NEVER rejects.
// These functions are called from the signup path (getOrCreateUser) and the
// game-finalization path (endGame), where endGame in particular fires them
// inside a Promise.all that runs BEFORE awardCredits. A rejection there would
// throw out of endGame and cost a real player their credits for a game they
// already finished. Analytics is not worth that, so failures are swallowed
// here at the source — that way no future call site can reintroduce the bug
// by forgetting a .catch(). This matches the existing convention in game.ts
// ("W-L / challenge-log tracking must not break game finalization").

export const USERS_BY_FIRST_SEEN_KEY = 'users:byFirstSeen';
export const GAMES_LOG_KEY = 'games:log';

// Idempotent: zAdd with the SAME score on every call, so re-running on each
// visit is a no-op rather than a drifting timestamp. That's what lets
// getOrCreateUser call this unconditionally without detecting "is new user".
export const indexUserFirstSeen = async (username: string, firstSeen: number): Promise<void> => {
  if (!Number.isFinite(firstSeen) || firstSeen <= 0) return;
  try {
    await redis.zAdd(USERS_BY_FIRST_SEEN_KEY, { score: firstSeen, member: username });
  } catch {
    /* best-effort: must never break user init */
  }
};

// Global append-only game log. Unlike `games:pending`, entries are NEVER
// removed on approve/reject and are not wiped by the dev-admin reset — so
// this is a trustworthy denominator for "games played per day".
export const recordGamePlayed = async (gameId: number, at: number = Date.now()): Promise<void> => {
  try {
    await redis.zAdd(GAMES_LOG_KEY, { score: at, member: String(gameId) });
  } catch {
    /* best-effort: must never break game finalization / credit award */
  }
};

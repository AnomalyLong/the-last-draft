import { redis } from '@devvit/web/server';
import { mintPlayer, type PlayerRarity, type PlayerAbility } from './player';
import { spendCredits } from './user';
import { recordDraftCompletion } from './missions';

const userKey = (username: string) => `user:${username}`;

// ── Credit-draft pricing ─────────────────────────────────────────────────────
// Paid drafts cost credits on a per-month doubling schedule: the FIRST draft of
// the calendar month is 2,500, then each subsequent draft doubles (5,000 →
// 10,000 → …). The counter resets at the start of each UTC month. Cost is
// computed server-side from the stored count — the client never supplies it.
const FIRST_DRAFT_COST = 2500;
const draftCountKey = (username: string) => `user:draftCounts:${username}`;
const DRAFT_COUNT_TTL = 70 * 24 * 60 * 60; // ~2 months — old month fields are harmless, this just caps growth

// Calendar-month bucket key, e.g. "2026-06" (UTC).
const monthKey = (now = Date.now()): string => {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Cost of the (idx)-th paid draft this month, 0-indexed: idx 0 → 2,500, 1 → 5,000, 2 → 10,000…
export const draftCostForIndex = (idx: number): number =>
  FIRST_DRAFT_COST * Math.pow(2, Math.max(0, idx));

// How many paid drafts the user has done THIS month.
export const getMonthlyDraftCount = async (username: string): Promise<number> => {
  const raw = await redis.hGet(draftCountKey(username), monthKey());
  return Number(raw ?? 0);
};

// Cost + count for the user's NEXT paid draft (drives the Draft Hub display).
export const getNextDraftCost = async (
  username: string,
): Promise<{ cost: number; draftsThisMonth: number }> => {
  const count = await getMonthlyDraftCount(username);
  return { cost: draftCostForIndex(count), draftsThisMonth: count };
};

type DraftPlayerParams = {
  name: string;
  rarity: PlayerRarity;
  spd?: number;
  dex?: number;
  jmp?: number;
  acc?: number;
  ability?: PlayerAbility | null;
};

// Mints a player using one free draft pick. Each call atomically decrements
// the counter — a 5-player draft consumes exactly 5 picks. New users start
// with 5 picks (enough for the FTUE roster).
export const freeDraft = async (
  username: string,
  params: DraftPlayerParams,
) => {
  const key = userKey(username);
  const remaining = await redis.hIncrBy(key, 'freeDrafts', -1);
  if (remaining < 0) {
    await redis.hIncrBy(key, 'freeDrafts', 1); // rollback
    throw new Error('No free drafts available');
  }
  const player = await mintPlayer({ owner: username, source: 'draft', ...params });
  await recordDraftCompletion(username, 1);
  return player;
};

// Buys a draft pick: charges the monthly doubling cost NOW (server-computed —
// never trusted from the client) and banks one reusable pick on the user. The
// banked pick PERSISTS until consumed (so a user can buy and walk away, then
// draft later). The monthly counter is incremented here — pricing happens at
// purchase. Reserved-first so two rapid buys can't both bill the cheaper tier;
// the reservation is rolled back if the user can't afford it.
export const buyDraftPick = async (
  username: string,
): Promise<{ cost: number; paidPicks: number; nextCost: number }> => {
  const mk = monthKey();
  const idx = (await redis.hIncrBy(draftCountKey(username), mk, 1)) - 1;
  if (idx === 0) await redis.expire(draftCountKey(username), DRAFT_COUNT_TTL);
  const cost = draftCostForIndex(idx);

  const spent = await spendCredits(username, cost, `draftpick:${mk}:${idx}`);
  if (!spent.success) {
    await redis.hIncrBy(draftCountKey(username), mk, -1); // release the reservation
    throw new Error('Insufficient credits');
  }

  const paidPicks = await redis.hIncrBy(userKey(username), 'paidPicks', 1);
  return { cost, paidPicks, nextCost: draftCostForIndex(idx + 1) };
};

// Consumes one banked paid pick to mint a player — NO charge here (payment
// happened at buy time). Decrement-first with rollback if none are available,
// mirroring freeDraft.
export const creditDraft = async (
  username: string,
  params: DraftPlayerParams,
) => {
  const remaining = await redis.hIncrBy(userKey(username), 'paidPicks', -1);
  if (remaining < 0) {
    await redis.hIncrBy(userKey(username), 'paidPicks', 1); // rollback
    throw new Error('No draft picks available');
  }
  const player = await mintPlayer({ owner: username, source: 'credit', ...params });
  await recordDraftCompletion(username, 1);
  return { player, paidPicks: remaining };
};

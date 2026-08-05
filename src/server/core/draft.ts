import { redis } from '@devvit/web/server';
import { mintPlayer, type PlayerRarity, type PlayerAbility } from './player';
import { spendCredits } from './user';
import { recordDraftCompletion } from './missions';

const userKey = (username: string) => `user:${username}`;

// ── Credit-draft pricing ─────────────────────────────────────────────────────
// Paid drafts get 25% more expensive each time, and the counter resets WEEKLY.
// The FIRST draft of the week is 2,500, then each subsequent draft costs 25%
// more than the previous tier (3,125 → 3,900 → 4,875 → …), rounded to the
// nearest 25 CR so the prices stay readable. The counter resets at 00:00 UTC
// Monday. Cost is computed server-side from the stored count — the client never
// supplies it.
const FIRST_DRAFT_COST = 2500;
const DRAFT_COST_STEP = 1.25;   // +25% per buy (was 2.0 — doubling)
const COST_ROUND_TO = 25;       // round each tier to the nearest 25 CR
const draftCountKey = (username: string) => `user:draftCounts:${username}`;
const DRAFT_COUNT_TTL = 21 * 24 * 60 * 60; // ~3 weeks — old week fields are harmless, this just caps growth

// Week bucket key: the UTC date of that week's Monday, e.g. "w2026-06-08".
// Using the Monday's date rather than an ISO week number avoids the
// year-boundary edge cases of week numbering (W52/W53 → W01) entirely, and it
// can never collide with the old monthly fields ("2026-06") left in the hash.
const weekKey = (now = Date.now()): string => {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const dow = (d.getUTCDay() + 6) % 7;   // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dow);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `w${y}-${m}-${day}`;
};

// Cost of the (idx)-th paid draft this week, 0-indexed:
//   idx 0 → 2,500   1 → 3,125   2 → 3,900   3 → 4,875   4 → 6,100 …
// Rounding is applied to the exact compounded value each time (not carried
// forward), so tiers never drift from the true 1.25^n curve.
export const draftCostForIndex = (idx: number): number => {
  const raw = FIRST_DRAFT_COST * Math.pow(DRAFT_COST_STEP, Math.max(0, idx));
  return Math.round(raw / COST_ROUND_TO) * COST_ROUND_TO;
};

// How many paid drafts the user has done THIS week.
export const getWeeklyDraftCount = async (username: string): Promise<number> => {
  const raw = await redis.hGet(draftCountKey(username), weekKey());
  return Number(raw ?? 0);
};

// Cost + count for the user's NEXT paid draft (drives the Draft Hub display).
export const getNextDraftCost = async (
  username: string,
): Promise<{ cost: number; draftsThisWeek: number }> => {
  const count = await getWeeklyDraftCount(username);
  return { cost: draftCostForIndex(count), draftsThisWeek: count };
};

type DraftPlayerParams = {
  name: string;
  rarity: PlayerRarity;
  spd?: number;
  dex?: number;
  jmp?: number;
  acc?: number;
  ability?: PlayerAbility | null;
  palette?: number;
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

// Buys a draft pick: charges the weekly +25% cost NOW (server-computed — never
// trusted from the client) and banks one reusable pick on the user. The banked
// pick PERSISTS until consumed (so a user can buy and walk away, then draft
// later). The weekly counter is incremented here — pricing happens at
// purchase. Reserved-first so two rapid buys can't both bill the cheaper tier;
// the reservation is rolled back if the user can't afford it.
export const buyDraftPick = async (
  username: string,
): Promise<{ cost: number; paidPicks: number; nextCost: number }> => {
  const wk = weekKey();
  const idx = (await redis.hIncrBy(draftCountKey(username), wk, 1)) - 1;
  if (idx === 0) await redis.expire(draftCountKey(username), DRAFT_COUNT_TTL);
  const cost = draftCostForIndex(idx);

  const spent = await spendCredits(username, cost, `draftpick:${wk}:${idx}`);
  if (!spent.success) {
    await redis.hIncrBy(draftCountKey(username), wk, -1); // release the reservation
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

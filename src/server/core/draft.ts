import { redis } from '@devvit/web/server';
import { mintPlayer, type PlayerRarity, type PlayerAbility } from './player';
import { spendCredits } from './user';
import { recordDraftCompletion } from './missions';
import {
  costForIndex,
  getDraftPricing,
  type DraftPricing,
} from './draftPricing';

const userKey = (username: string) => `user:${username}`;

// ── Credit-draft pricing ─────────────────────────────────────────────────────
// Paid drafts get progressively more expensive, and the counter resets WEEKLY.
// The first draft of the week is the cheapest; each subsequent draft costs a
// fixed percentage more than the previous tier, rounded to keep prices
// readable. The counter resets at 00:00 UTC Monday.
//
// The NUMBERS live in core/draftPricing.ts — a redis-backed config an admin can
// retune live (AdminOverlay → Config), falling back to shipped defaults. Nothing
// here hardcodes a price or a rate, and neither does the client: the escalation
// rate and first-draft price are returned alongside the cost so Draft Hub copy
// can never claim a percentage the server isn't charging.
//
// Cost is always computed server-side from the stored count — the client never
// supplies it.
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

/**
 * Cost of the (idx)-th paid draft this week, 0-indexed.
 *
 * Pass `pricing` when you already hold a config read — pricing a ladder from a
 * single snapshot is how callers avoid tearing if an admin edits the config
 * mid-transaction.
 */
export const draftCostForIndex = async (
  idx: number,
  pricing?: DraftPricing,
): Promise<number> => costForIndex(idx, pricing ?? (await getDraftPricing()));

// How many paid drafts the user has done THIS week.
export const getWeeklyDraftCount = async (username: string): Promise<number> => {
  const raw = await redis.hGet(draftCountKey(username), weekKey());
  return Number(raw ?? 0);
};

// Cost + count for the user's NEXT paid draft (drives the Draft Hub display).
// The pricing FACTS ride along so client copy renders the real configured
// numbers instead of a hardcoded "+25%" / "2,500".
export const getNextDraftCost = async (
  username: string,
): Promise<{
  cost: number;
  draftsThisWeek: number;
  stepPct: number;
  firstCost: number;
  roundTo: number;
}> => {
  const [count, pricing] = await Promise.all([
    getWeeklyDraftCount(username),
    getDraftPricing(),
  ]);
  return {
    cost: costForIndex(count, pricing),
    draftsThisWeek: count,
    stepPct: pricing.stepPct,
    firstCost: pricing.firstCost,
    roundTo: pricing.roundTo,
  };
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

// Buys a draft pick: charges the escalating weekly cost NOW (server-computed
// from the live pricing config — never trusted from the client) and banks one
// reusable pick on the user. The banked pick PERSISTS until consumed (so a user
// can buy and walk away, then draft later). The weekly counter is incremented
// here — pricing happens at purchase. Reserved-first so two rapid buys can't
// both bill the cheaper tier; the reservation is rolled back if the user can't
// afford it.
//
// Pricing is read ONCE and used for both the charge and the quoted next cost, so
// an admin retuning prices mid-purchase can't bill tier N at the old rate while
// quoting tier N+1 at the new one.
export const buyDraftPick = async (
  username: string,
): Promise<{ cost: number; paidPicks: number; nextCost: number }> => {
  const wk = weekKey();
  const pricing = await getDraftPricing();
  const idx = (await redis.hIncrBy(draftCountKey(username), wk, 1)) - 1;
  if (idx === 0) await redis.expire(draftCountKey(username), DRAFT_COUNT_TTL);
  const cost = costForIndex(idx, pricing);

  const spent = await spendCredits(username, cost, `draftpick:${wk}:${idx}`);
  if (!spent.success) {
    await redis.hIncrBy(draftCountKey(username), wk, -1); // release the reservation
    throw new Error('Insufficient credits');
  }

  const paidPicks = await redis.hIncrBy(userKey(username), 'paidPicks', 1);
  return { cost, paidPicks, nextCost: costForIndex(idx + 1, pricing) };
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

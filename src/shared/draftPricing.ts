// ── Paid-draft price ladder: shape, defaults, and maths ──────────────────────
// SHARED because two places need the same answer and must never disagree:
//   server  core/draftPricing.ts  — stores the config, charges the real price
//   client  AdminOverlay          — previews the ladder while an admin types
// If the formula lived in both, the preview could quietly promise a price the
// server wouldn't charge. It lives here once.
//
// NOTE: the player-facing Draft Hub does NOT import the defaults from here. It
// renders only what the server sent it, so its copy can't name a price that is
// locally stale. See DraftHubScreen.jsx.

export type DraftPricing = {
  /** Price of the week's FIRST paid draft, in CR. */
  firstCost: number;
  /** How much MORE each subsequent draft costs, in percent. 0 = flat pricing. */
  stepPct: number;
  /** Each tier is rounded to the nearest multiple of this, in CR. */
  roundTo: number;
};

/**
 * Shipped defaults — FLAT pricing: every paid draft costs 2,500 CR.
 *
 * Was +25% per buy (2500 / 3125 / 3900 / 4875 ...) until the rate was set to 0.
 * The escalation MACHINERY is deliberately still here: stepPct is a live admin
 * dial, so re-introducing a rise is a config edit, not a code change.
 */
export const DRAFT_PRICING_DEFAULTS: DraftPricing = {
  firstCost: 2500,
  stepPct: 0,
  roundTo: 25,
};

export const DRAFT_PRICING_FIELDS = ['firstCost', 'stepPct', 'roundTo'] as const;
export type DraftPricingField = (typeof DRAFT_PRICING_FIELDS)[number];

// Bounds are deliberately generous — this is an operator dial, not a public
// form. They exist to stop input that breaks the maths or the UI: a roundTo of 0
// divides by zero, a negative step makes drafts get cheaper forever, and a
// 9-digit price overflows the button label.
export const DRAFT_PRICING_BOUNDS: Record<DraftPricingField, { min: number; max: number }> = {
  firstCost: { min: 0, max: 1_000_000 },
  stepPct: { min: 0, max: 1_000 },
  roundTo: { min: 1, max: 10_000 },
};

/** How many tiers the admin preview / API surfaces. Display only. */
export const TIER_PREVIEW_COUNT = 6;

/**
 * Cost of the (idx)-th paid draft of the week, 0-indexed, under `p`.
 *
 * Pure — takes the pricing rather than reading redis, so callers can price a
 * whole ladder from ONE config read and can't tear if an admin edits the config
 * mid-transaction.
 *
 * Rounding is applied to the exact compounded value each time (never carried
 * forward), so tiers can't drift off the true (1 + stepPct/100)^n curve.
 */
export const costForIndex = (idx: number, p: DraftPricing): number => {
  const step = 1 + p.stepPct / 100;
  const raw = p.firstCost * Math.pow(step, Math.max(0, idx));
  const unit = Math.max(1, Math.round(p.roundTo));
  return Math.round(raw / unit) * unit;
};

/** First N tiers under `p` — drives the admin preview table. */
export const tiersFor = (p: DraftPricing, count = TIER_PREVIEW_COUNT): number[] =>
  Array.from({ length: count }, (_, i) => costForIndex(i, p));

/** True when `n` is an in-bounds value for field `f`. */
export const inBounds = (f: DraftPricingField, n: number): boolean => {
  const b = DRAFT_PRICING_BOUNDS[f];
  return Number.isFinite(n) && n >= b.min && n <= b.max;
};

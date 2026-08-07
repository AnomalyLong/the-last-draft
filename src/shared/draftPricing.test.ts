import { describe, it, expect } from 'vitest';
import {
  DRAFT_PRICING_DEFAULTS,
  DRAFT_PRICING_BOUNDS,
  costForIndex,
  tiersFor,
  inBounds,
  type DraftPricing,
} from './draftPricing';

const P = (over: Partial<DraftPricing> = {}): DraftPricing => ({
  ...DRAFT_PRICING_DEFAULTS,
  ...over,
});

describe('costForIndex', () => {
  it('prices the shipped default ladder as FLAT', () => {
    // The shipped default is now 0% — every paid draft costs the same.
    expect(tiersFor(P(), 5)).toEqual([2500, 2500, 2500, 2500, 2500]);
    expect(DRAFT_PRICING_DEFAULTS.stepPct).toBe(0);
  });

  it('still prices the +25% ladder when an admin sets that rate', () => {
    // Not the default any more, but the escalation maths must keep working --
    // stepPct is a live admin dial, so this is a supported configuration.
    expect(tiersFor(P({ stepPct: 25 }), 5)).toEqual([2500, 3125, 3900, 4875, 6100]);
  });

  it('treats index 0 as the first (cheapest) draft', () => {
    expect(costForIndex(0, P())).toBe(DRAFT_PRICING_DEFAULTS.firstCost);
  });

  it('clamps negative indexes to the first tier rather than going cheaper', () => {
    expect(costForIndex(-3, P())).toBe(costForIndex(0, P()));
  });

  it('rounds each tier off the exact curve, never off the previous tier', () => {
    // Carrying rounding forward would compound the error. Tier 4 must match
    // 2500 * 1.25^4 = 6103.51... rounded to 6100, NOT 4875 * 1.25 = 6093.75
    // rounded to 6100 by luck at 25 — use roundTo 100 where they differ:
    //   exact:   2500 * 1.25^4 = 6103.5 -> 6100
    //   carried: round(4900*1.25=6125) -> 6100 ... still equal, so go further.
    // Tier 6 separates them cleanly at roundTo 500.
    const p = P({ stepPct: 25, roundTo: 500 });
    expect(costForIndex(6, p)).toBe(Math.round((2500 * 1.25 ** 6) / 500) * 500);
  });

  it('supports flat pricing at stepPct 0', () => {
    expect(tiersFor(P({ stepPct: 0 }), 4)).toEqual([2500, 2500, 2500, 2500]);
  });

  it('honours a retuned step', () => {
    // The regression this whole config exists to prevent: change the rate and
    // every derived number must move with it.
    expect(tiersFor(P({ stepPct: 100 }), 4)).toEqual([2500, 5000, 10000, 20000]);
  });

  it('honours a retuned first cost', () => {
    // stepPct is pinned explicitly: this test is about firstCost, and it must
    // not silently change meaning when the DEFAULT rate is retuned.
    expect(costForIndex(0, P({ firstCost: 400, stepPct: 25 }))).toBe(400);
    expect(costForIndex(1, P({ firstCost: 400, stepPct: 25, roundTo: 1 }))).toBe(500);
  });

  it('never divides by zero if roundTo is somehow 0', () => {
    // Storage rejects roundTo < 1, but the maths must not explode if it slips
    // through from an older write.
    const c = costForIndex(2, P({ stepPct: 25, roundTo: 0 }));
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBe(Math.round(2500 * 1.25 ** 2));
  });

  it('produces whole numbers of credits at every tier', () => {
    for (const step of [7, 13, 25, 33]) {
      for (const t of tiersFor(P({ stepPct: step }), 8)) {
        expect(Number.isInteger(t)).toBe(true);
      }
    }
  });

  it('is monotonically non-decreasing for any valid step', () => {
    for (const step of [0, 1, 25, 100, 1000]) {
      const t = tiersFor(P({ stepPct: step }), 8);
      for (let i = 1; i < t.length; i++) {
        expect(t[i]!).toBeGreaterThanOrEqual(t[i - 1]!);
      }
    }
  });
});

describe('inBounds', () => {
  it('accepts the shipped defaults', () => {
    expect(inBounds('firstCost', DRAFT_PRICING_DEFAULTS.firstCost)).toBe(true);
    expect(inBounds('stepPct', DRAFT_PRICING_DEFAULTS.stepPct)).toBe(true);
    expect(inBounds('roundTo', DRAFT_PRICING_DEFAULTS.roundTo)).toBe(true);
  });

  it('rejects a roundTo of 0 — the divide-by-zero case', () => {
    expect(inBounds('roundTo', 0)).toBe(false);
    expect(inBounds('roundTo', DRAFT_PRICING_BOUNDS.roundTo.min)).toBe(true);
  });

  it('rejects negative steps that would make drafts get cheaper', () => {
    expect(inBounds('stepPct', -1)).toBe(false);
  });

  it('rejects NaN and Infinity', () => {
    expect(inBounds('firstCost', NaN)).toBe(false);
    expect(inBounds('firstCost', Infinity)).toBe(false);
  });

  it('accepts a free first draft but rejects a negative one', () => {
    expect(inBounds('firstCost', 0)).toBe(true);
    expect(inBounds('firstCost', -25)).toBe(false);
  });
});

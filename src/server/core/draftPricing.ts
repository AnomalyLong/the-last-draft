import { redis } from '@devvit/web/server';
import {
  DRAFT_PRICING_DEFAULTS,
  DRAFT_PRICING_FIELDS,
  DRAFT_PRICING_BOUNDS,
  costForIndex,
  tiersFor,
  type DraftPricing,
  type DraftPricingField,
} from '../../shared/draftPricing';

// ── Draft pricing config: storage ────────────────────────────────────────────
// The escalating cost of paid draft picks, tunable live from the admin panel
// (AdminOverlay -> Config tab) with no redeploy. The SHAPE and the MATHS live in
// shared/draftPricing.ts so the admin preview and the real charge use one
// formula; this file only stores and audits. One redis hash:
//
//   firstCost : price of the week's FIRST paid draft, in CR
//   stepPct   : how much MORE each subsequent draft costs, in percent
//   roundTo   : each tier is rounded to the nearest multiple of this
//   admin     : who changed it last
//   at        : when, epoch ms
//
// Every field is INDEPENDENTLY overridable: an absent field means "never
// touched" and falls back to the shipped default, so a redis wipe comes up
// priced exactly like a fresh deploy rather than free. Same philosophy as
// core/featureFlags.ts and core/inlineSplash.ts.
//
// A stored value that is out of bounds (corrupt write, hand-edited redis) is
// IGNORED rather than clamped -- it falls back to the default and the admin
// panel reports the field as unset. Pricing is money-adjacent, so "obviously
// shipped default" is a safer failure than "silently 8% off".

// Re-exported so server callers have one import site for pricing.
export {
  DRAFT_PRICING_DEFAULTS,
  DRAFT_PRICING_FIELDS,
  DRAFT_PRICING_BOUNDS,
  costForIndex,
  tiersFor,
};
export type { DraftPricing, DraftPricingField };

const KEY = 'config:draftPricing';
const LOG_KEY = 'config:draftPricing:log';
const MAX_LOG = 50;

const readField = (
  raw: Record<string, string>,
  f: DraftPricingField,
): number | null => {
  const v = raw[f];
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const { min, max } = DRAFT_PRICING_BOUNDS[f];
  const r = Math.round(n);
  if (r < min || r > max) return null;   // out of bounds → follow the default
  return r;
};

export type DraftPricingSetting = {
  /** What every player is charged right now (defaults + any overrides). */
  applied: DraftPricing;
  /** Only the fields an admin has actually set. Empty = fully default. */
  override: Partial<DraftPricing>;
  /** The shipped defaults. */
  default: DraftPricing;
  /** First few tiers under `applied`, for display. */
  tiers: number[];
  admin: string | null;
  at: number | null;
};

export const getDraftPricingSetting = async (): Promise<DraftPricingSetting> => {
  const raw = ((await redis.hGetAll(KEY)) ?? {}) as Record<string, string>;
  const override: Partial<DraftPricing> = {};
  const applied: DraftPricing = { ...DRAFT_PRICING_DEFAULTS };
  for (const f of DRAFT_PRICING_FIELDS) {
    const v = readField(raw, f);
    if (v != null) {
      override[f] = v;
      applied[f] = v;
    }
  }
  const touched = Object.keys(override).length > 0;
  const at = raw['at'] ? Number(raw['at']) : null;
  return {
    applied,
    override,
    default: { ...DRAFT_PRICING_DEFAULTS },
    tiers: tiersFor(applied),
    admin: touched ? (raw['admin'] ?? null) : null,
    at: touched && Number.isFinite(at) ? at : null,
  };
};

/** Just the numbers the pricing maths needs — one redis read. */
export const getDraftPricing = async (): Promise<DraftPricing> =>
  (await getDraftPricingSetting()).applied;

export type DraftPricingLogEntry = {
  /** The fields changed in this edit; null value = cleared to default. */
  patch: Partial<Record<DraftPricingField, number | null>>;
  /** Full effective pricing after the edit, so the log reads standalone. */
  applied: DraftPricing;
  admin: string;
  at: number;
};

/**
 * Update one or more pricing fields. A field set to null CLEARS the override
 * and follows the shipped default; a field left out of `patch` is untouched.
 *
 * Out-of-bounds input THROWS rather than clamping — an operator who typed 5000%
 * should see an error, not silently get 1000%.
 *
 * Appends an audit entry: this changes what every player pays, so
 * who-changed-what-when is worth the extra write. Same capped-zset pattern as
 * featureFlags / inlineSplash (zCard + zRange + zRem — this codebase does not
 * use zRemRangeByRank).
 */
export const setDraftPricing = async (
  patch: Partial<Record<DraftPricingField, number | null>>,
  adminUsername: string,
): Promise<DraftPricingSetting> => {
  const at = Date.now();
  const sets: Record<string, string> = {};
  const clears: string[] = [];
  const clean: Partial<Record<DraftPricingField, number | null>> = {};

  for (const f of DRAFT_PRICING_FIELDS) {
    if (!(f in patch)) continue;
    const v = patch[f];
    if (v == null) {
      clears.push(f);
      clean[f] = null;
      continue;
    }
    if (!Number.isFinite(v)) {
      throw new Error(`${f} must be a number`);
    }
    const r = Math.round(v);
    const { min, max } = DRAFT_PRICING_BOUNDS[f];
    if (r < min || r > max) {
      throw new Error(`${f} must be between ${min} and ${max} (got ${r})`);
    }
    sets[f] = String(r);
    clean[f] = r;
  }

  if (Object.keys(clean).length === 0) {
    throw new Error('No pricing fields supplied');
  }

  if (clears.length) await redis.hDel(KEY, clears);
  if (Object.keys(sets).length) await redis.hSet(KEY, sets);

  // Stamp authorship whenever anything is still overridden; drop it when the
  // last override is cleared so the panel reads "following shipped default".
  const after = await getDraftPricingSetting();
  if (Object.keys(after.override).length > 0) {
    await redis.hSet(KEY, { admin: adminUsername, at: String(at) });
  } else {
    await redis.hDel(KEY, ['admin', 'at']);
  }

  const entry: DraftPricingLogEntry = {
    patch: clean,
    applied: after.applied,
    admin: adminUsername,
    at,
  };
  await redis.zAdd(LOG_KEY, { score: at, member: JSON.stringify(entry) });
  const count = await redis.zCard(LOG_KEY);
  if (count > MAX_LOG) {
    const oldest: any[] = (await redis.zRange(LOG_KEY, 0, count - MAX_LOG - 1)) as any;
    const members = oldest.map((o) => (typeof o === 'string' ? o : o.member));
    if (members.length) await redis.zRem(LOG_KEY, members);
  }

  return await getDraftPricingSetting();
};

/** Clear every override — back to the shipped price ladder. */
export const resetDraftPricing = async (
  adminUsername: string,
): Promise<DraftPricingSetting> =>
  await setDraftPricing(
    { firstCost: null, stepPct: null, roundTo: null },
    adminUsername,
  );

export const getDraftPricingLog = async (limit = 20): Promise<DraftPricingLogEntry[]> => {
  const raw: any[] = (await redis.zRange(LOG_KEY, 0, -1)) as any;
  return raw
    .map((r) => {
      try {
        return JSON.parse(typeof r === 'string' ? r : r.member) as DraftPricingLogEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is DraftPricingLogEntry => e !== null)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
};

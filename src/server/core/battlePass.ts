import { redis, reddit, context } from '@devvit/web/server';
import type { Order } from '@devvit/web/shared';
import { userKey, awardCredits, getUser } from './user';
import { getFlag } from './featureFlags';

// ── Founder flair ────────────────────────────────────────────
// Shared flair for both tiers — matches the binary `founder` flag.
// Teal accent (#19e6c4) matches the game's primary brand color; dark
// text reads well against it on both light and dark Reddit themes.
const FOUNDER_FLAIR = {
  text: 'Founder Pass Contributor',
  backgroundColor: '#19e6c4',
  textColor: 'dark' as const,
};

// Writes the FOUNDER flair on whichever subreddit the request is
// currently scoped to. Devvit only permits flair writes inside the
// app's installed subreddit (`context.subredditName`), so we read that
// at call time rather than hardcoding — works correctly in both the
// dev install (the_last_draft_dev) and the prod install
// (lastdraftgame, or any future relocation).
//
// Wrapped in try/catch — flair failures are visible-only side effects
// and must never block a Founders Pass purchase (Reddit already took
// the money, Redis already has the record).
async function applyFounderFlair(username: string): Promise<boolean> {
  const subredditName = context.subredditName;
  if (!subredditName) {
    console.error(`Founder flair skipped for ${username}: no subreddit in context`);
    return false;
  }
  try {
    await reddit.setUserFlair({
      subredditName,
      username,
      text: FOUNDER_FLAIR.text,
      backgroundColor: FOUNDER_FLAIR.backgroundColor,
      textColor: FOUNDER_FLAIR.textColor,
    });
    return true;
  } catch (err) {
    console.error(`Founder flair write failed for ${username} in r/${subredditName}:`, err);
    return false;
  }
}

// Bump this when a new season ships. Past-season records stay on disk
// (under their season-scoped keys) for history; the active season is
// whatever this constant points at.
export const CURRENT_SEASON = 0;

// Lifetime credit grants per tier. Both tiers deposit on every paid
// fulfillment — an upgrade Basic → Premium grants the Premium amount on
// top of the Basic the user already received (they paid for both, they
// keep both).
export const BASIC_CREDIT_GRANT = 25_000;
export const PREMIUM_CREDIT_GRANT = 150_000;

export type PassTier = 'basic' | 'premium';

// Maps a Devvit product SKU → tier. Unknown SKUs return null so the
// fulfill handler can reject cleanly.
const SKU_TO_TIER: Record<string, PassTier> = {
  founders_pass_basic: 'basic',
  founders_pass_premium: 'premium',
};

// Reverse mapping — used by adminGrantPass to stamp a recognisable SKU
// on the synthetic pass record (we'd rather not write 'admin-grant' as
// the sku since it'd never match the live Devvit catalog).
const TIER_TO_SKU: Record<PassTier, string> = {
  basic: 'founders_pass_basic',
  premium: 'founders_pass_premium',
};

const CREDIT_GRANT_BY_TIER: Record<PassTier, number> = {
  basic: BASIC_CREDIT_GRANT,
  premium: PREMIUM_CREDIT_GRANT,
};

export const passKey = (season: number, username: string) =>
  `season:${season}:pass:${username}`;
export const passLedgerKey = (username: string) =>
  `user:passLedger:${username}`;

export type PassRecord = {
  tier: PassTier;
  sku: string;
  purchasedAt: number;
  orderId: string;
  flairGranted: boolean;     // whether the FOUNDER Reddit flair stuck
};

export type MyPassState = {
  tier: PassTier | null;
  purchasedAt: number;       // 0 when no pass owned this season
  founder: boolean;          // lifetime flag — survives season turnover
  flairGranted: boolean;     // false when the flair write failed and needs retry
};

// Result returned from fulfillPass / adminGrantPass — the BattlePassScreen
// uses `tier` + `creditsGranted` to show the right copy in its success
// modal ("Basic Pass — 25,000 credits added").
export type FulfillSuccess = {
  success: true;
  tier: PassTier;
  creditsGranted: number;
};

const parsePassRecord = (raw: Record<string, string>): PassRecord | null => {
  const tier = raw.tier;
  if (tier !== 'basic' && tier !== 'premium') return null;
  return {
    tier: tier as PassTier,
    sku: raw.sku ?? '',
    purchasedAt: Number(raw.purchasedAt ?? 0),
    orderId: raw.orderId ?? '',
    // Defensive default: missing field reads as false, prompting a
    // retry. This is correct for rows written before the flair feature
    // shipped — they should be backfilled with a flair on next admin
    // load.
    flairGranted: raw.flairGranted === '1',
  };
};

// Read the caller's pass state — tier (or null) for the active season
// plus the lifetime founder flag. Used by the BattlePassScreen to gate
// UI states and disable already-owned CTAs.
export const getMyPass = async (username: string): Promise<MyPassState> => {
  const [raw, user] = await Promise.all([
    redis.hGetAll(passKey(CURRENT_SEASON, username)),
    getUser(username),
  ]);
  const record = parsePassRecord(raw ?? {});
  return {
    tier: record?.tier ?? null,
    purchasedAt: record?.purchasedAt ?? 0,
    founder: user?.founder === 1,
    // Default true when there's no record at all — no pending action.
    // When a record exists, mirror its stored flairGranted bit so admin
    // panels can show a "Retry flair" button for failed writes.
    flairGranted: record ? record.flairGranted : true,
  };
};

// Status string Devvit sends in the fulfill body. Per docs the JSON
// strips the ORDER_STATUS_ prefix, leaving e.g. "PAID".
const isPaid = (status: unknown): boolean =>
  status === 'PAID' || status === 'ORDER_STATUS_PAID' || status === 3;

// Internal: writes the pass record + ledger entry + founder flag + credit
// grant. Shared by fulfillPass (real Devvit purchases) and adminGrantPass
// (manual moderator grants). `ref` is used as the ledger member suffix and
// the awardCredits ref — for real purchases it's the Devvit orderId; for
// admin grants it's `admin:{moderatorUsername}:{timestamp}`.
const writePassGrant = async (
  username: string,
  tier: PassTier,
  ref: string,
): Promise<FulfillSuccess> => {
  const now = Date.now();
  const key = passKey(CURRENT_SEASON, username);

  await redis.hSet(key, {
    tier,
    sku: TIER_TO_SKU[tier],
    purchasedAt: String(now),
    orderId: ref,
  });

  await redis.zAdd(passLedgerKey(username), {
    score: now,
    member: `purchase|${CURRENT_SEASON}|${tier}|${ref}`,
  });

  await redis.hSetNX(userKey(username), 'founder', '1');

  const creditsGranted = CREDIT_GRANT_BY_TIER[tier];
  if (creditsGranted > 0) {
    await awardCredits(username, creditsGranted, `founders_${tier}:${ref}`);
  }

  // Visible FOUNDER flair on r/lastdraftgame. The outcome is stamped
  // back onto the season pass hash so admin panels can show a retry
  // button when the write didn't land (network blip, missing perms,
  // user not in the sub, etc.). Failure does NOT block the grant.
  const flairGranted = await applyFounderFlair(username);
  await redis.hSet(key, { flairGranted: flairGranted ? '1' : '0' });

  return { success: true, tier, creditsGranted };
};

// Re-attempts the FOUNDER flair write for a user who has a pass
// already. Used by the admin retry button after a flair-write failure.
// Returns the post-retry flair state so the caller can update its UI.
export const retryFounderFlair = async (
  username: string,
): Promise<{ ok: true; flairGranted: boolean }> => {
  const flairGranted = await applyFounderFlair(username);
  await redis.hSet(passKey(CURRENT_SEASON, username), {
    flairGranted: flairGranted ? '1' : '0',
  });
  return { ok: true, flairGranted };
};

// Devvit-payments fulfill handler. Called server-to-server after a
// successful purchase. Returns { success: true } to release the order
// to the user; { success: false, reason } to reject + refund.
export const fulfillPass = async (
  order: Order,
  username: string,
): Promise<FulfillSuccess | { success: false; reason: string }> => {
  // Admin kill switch. Checked FIRST, before any redis writes or credit
  // grants: returning success:false makes Devvit reject the order and
  // refund the user, so a purchase attempted while sales are paused
  // costs them nothing. adminGrantPass deliberately skips this check —
  // moderators can still hand out passes while sales are off.
  if (!(await getFlag('passPurchases'))) {
    return { success: false, reason: 'Founders Pass sales are temporarily unavailable' };
  }

  if (!isPaid(order.status)) {
    return { success: false, reason: 'Order not in PAID state' };
  }

  const sku = order.products?.[0]?.sku;
  if (!sku) return { success: false, reason: 'No product on order' };
  const tier = SKU_TO_TIER[sku];
  if (!tier) return { success: false, reason: `Unknown SKU: ${sku}` };

  const key = passKey(CURRENT_SEASON, username);
  const existing = parsePassRecord(await redis.hGetAll(key) ?? {});

  // Idempotency: if Devvit retries fulfill for an order we already
  // processed, succeed without re-applying credits / re-writing rows.
  // Return tier+credits=0 so the client doesn't double-show the modal.
  if (existing && existing.orderId === order.id) {
    return { success: true, tier: existing.tier, creditsGranted: 0 };
  }

  // Tier-upgrade rules:
  //   none    → basic    ✓
  //   none    → premium  ✓
  //   basic   → premium  ✓ (upgrade — pays full premium price, grants premium credits)
  //   basic   → basic    ✗ (double-buy)
  //   premium → anything ✗ (already at top tier)
  if (existing) {
    if (existing.tier === 'premium') {
      return { success: false, reason: 'Premium pass already owned' };
    }
    if (existing.tier === 'basic' && tier === 'basic') {
      return { success: false, reason: 'Basic pass already owned' };
    }
  }

  return await writePassGrant(username, tier, order.id);
};

// Admin / moderator override — drops a pass into a user's account
// without going through Devvit Payments. Behaves like a real purchase
// (writes the season record, sets the founder flag, deposits credits,
// appends a ledger entry tagged with the admin's username for audit).
// Unlike fulfillPass, this CAN downgrade premium → basic; admins are
// trusted to know what they're doing.
export const adminGrantPass = async (
  username: string,
  tier: PassTier,
  adminUsername: string,
): Promise<FulfillSuccess> => {
  const ref = `admin:${adminUsername}:${Date.now()}`;
  return await writePassGrant(username, tier, ref);
};

// Admin revoke — clears the season's pass record for a user. Does NOT
// claw back credits granted by previous purchases (those still belong
// to the user) and does NOT clear the lifetime founder flag.
export const adminRevokePass = async (
  username: string,
  adminUsername: string,
): Promise<{ ok: true; revokedTier: PassTier | null }> => {
  const key = passKey(CURRENT_SEASON, username);
  const existing = parsePassRecord(await redis.hGetAll(key) ?? {});

  if (existing) {
    await redis.del(key);
  }

  await redis.zAdd(passLedgerKey(username), {
    score: Date.now(),
    member: `admin_revoke|${CURRENT_SEASON}|${existing?.tier ?? 'unknown'}|admin:${adminUsername}`,
  });

  return { ok: true, revokedTier: existing?.tier ?? null };
};

// Refund handler — Devvit calls this when a purchase is reverted.
// Policy: clear the season's pass record (user loses tier-gated UI),
// but keep the founder flag and any credits we already deposited.
// Refunds are rare enough that we'd rather over-deliver than risk
// clawing back content the user might already be using.
export const refundPass = async (
  order: Order,
  username: string,
): Promise<{ success: true }> => {
  const key = passKey(CURRENT_SEASON, username);
  const existing = parsePassRecord(await redis.hGetAll(key) ?? {});

  // Only clear if the refund matches the current record's orderId. If
  // the user already upgraded past this refund (e.g. basic → premium
  // and we're refunding the basic), leave the premium record alone.
  if (existing && existing.orderId === order.id) {
    await redis.del(key);
  }

  await redis.zAdd(passLedgerKey(username), {
    score: Date.now(),
    member: `refund|${CURRENT_SEASON}|${existing?.tier ?? 'unknown'}|${order.id}`,
  });

  return { success: true };
};

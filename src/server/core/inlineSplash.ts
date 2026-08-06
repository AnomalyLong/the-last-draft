import { redis } from '@devvit/web/server';
import { DEFAULT_SPLASH, isSplashVariant, type SplashVariant } from '../../shared/splash';

// ── Global inline-splash setting ──────────────────────────────────────
// Which splash EVERY player sees in the post/feed view, toggled live from
// the admin panel (AdminOverlay → Config tab). One redis hash:
//
//   variant : 'classic' | 'court'   (field absent = follow DEFAULT_SPLASH)
//   admin   : who set it last
//   at      : when, epoch ms
//
// This is not a boolean, so it does not live in core/featureFlags.ts —
// but it follows the same shape: missing field means "never touched" and
// falls back to the build default, so a redis wipe comes up shipping the
// default splash rather than nothing.
//
// The client does NOT block first paint on this value: it paints its
// locally cached copy immediately and reconciles when the query lands.
// See src/splashConfig.js for that flow and why it is safe.
const KEY = 'config:inlineSplash';
const LOG_KEY = 'config:inlineSplash:log';
const MAX_LOG = 50;

export type InlineSplashSetting = {
  /** The variant every player's post view should render right now. */
  applied: SplashVariant;
  /** The admin-set value, or null when following the build default. */
  override: SplashVariant | null;
  /** The build default (shared/splash.ts). */
  default: SplashVariant;
  /** Who set the override, and when. Null when never set. */
  admin: string | null;
  at: number | null;
};

export const getInlineSplashSetting = async (): Promise<InlineSplashSetting> => {
  const raw = (await redis.hGetAll(KEY)) ?? {};
  const stored = raw['variant'];
  const override = isSplashVariant(stored) ? stored : null;
  const at = raw['at'] ? Number(raw['at']) : null;
  return {
    applied: override ?? DEFAULT_SPLASH,
    override,
    default: DEFAULT_SPLASH,
    admin: override ? (raw['admin'] ?? null) : null,
    at: override && Number.isFinite(at) ? at : null,
  };
};

export type InlineSplashLogEntry = {
  variant: SplashVariant | null;
  admin: string;
  at: number;
};

/**
 * Set the global splash. Pass null to clear the override and follow the
 * build default. Appends an audit entry — this changes what every player
 * sees, so who-flipped-what-when is worth the extra write.
 *
 * Same capped-zset pattern as featureFlags / announcements (zCard +
 * zRange + zRem — this codebase does not use zRemRangeByRank).
 */
export const setInlineSplashSetting = async (
  variant: SplashVariant | null,
  adminUsername: string,
): Promise<InlineSplashSetting> => {
  const at = Date.now();
  if (variant == null) {
    await redis.hDel(KEY, ['variant', 'admin', 'at']);
  } else {
    await redis.hSet(KEY, { variant, admin: adminUsername, at: String(at) });
  }

  const entry: InlineSplashLogEntry = { variant, admin: adminUsername, at };
  await redis.zAdd(LOG_KEY, { score: at, member: JSON.stringify(entry) });
  const count = await redis.zCard(LOG_KEY);
  if (count > MAX_LOG) {
    const oldest: any[] = (await redis.zRange(LOG_KEY, 0, count - MAX_LOG - 1)) as any;
    const members = oldest.map((o) => (typeof o === 'string' ? o : o.member));
    if (members.length) await redis.zRem(LOG_KEY, members);
  }

  return await getInlineSplashSetting();
};

export const getInlineSplashLog = async (limit = 20): Promise<InlineSplashLogEntry[]> => {
  const raw: any[] = (await redis.zRange(LOG_KEY, 0, -1)) as any;
  return raw
    .map((r) => {
      try {
        return JSON.parse(typeof r === 'string' ? r : r.member) as InlineSplashLogEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is InlineSplashLogEntry => e !== null)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
};

import { redis } from '@devvit/web/server';

// ── Feature flags ─────────────────────────────────────────────────────
// Operator-controlled kill switches, toggled live from the admin panel
// (AdminOverlay → Config tab). Stored as one redis hash so a single
// hGetAll serves the whole set — the client fetches them on boot and the
// server re-reads them at each enforcement point.
//
// Values are stored as '1' / '0' strings. A MISSING field means "never
// touched" and falls back to the default below, so shipping a new flag
// needs no migration: add it to FLAG_DEFAULTS and it's live-on by
// default until an admin flips it.
const KEY = 'config:flags';
const LOG_KEY = 'config:flags:log';
const MAX_LOG = 200;

// The registry. Defaults are the "normal operation" position — every
// flag should default to `true` (feature available) so that a redis wipe
// or a fresh install comes up fully functional rather than locked down.
export const FLAG_DEFAULTS = {
  // Gates Founders Pass purchases: the Devvit-payments fulfill handler
  // and the client-side battle pass screen. See core/battlePass.ts.
  passPurchases: true,
} as const;

export type FlagName = keyof typeof FLAG_DEFAULTS;
export type Flags = { [K in FlagName]: boolean };

const FLAG_NAMES = Object.keys(FLAG_DEFAULTS) as FlagName[];

export const isFlagName = (name: string): name is FlagName =>
  (FLAG_NAMES as string[]).includes(name);

// Reads every flag, applying defaults for unset fields.
export const getFlags = async (): Promise<Flags> => {
  const raw = (await redis.hGetAll(KEY)) ?? {};
  const out = {} as Flags;
  for (const name of FLAG_NAMES) {
    const val = raw[name];
    out[name] = val === undefined || val === '' ? FLAG_DEFAULTS[name] : val === '1';
  }
  return out;
};

// Single-flag read for enforcement points that only care about one.
// Deliberately re-reads redis rather than caching: an admin flipping a
// kill switch expects it to take effect on the very next request, and
// these are cheap hash reads.
export const getFlag = async (name: FlagName): Promise<boolean> => {
  const val = await redis.hGet(KEY, name);
  if (val === undefined || val === null || val === '') return FLAG_DEFAULTS[name];
  return val === '1';
};

export type FlagLogEntry = {
  flag: FlagName;
  enabled: boolean;
  admin: string;
  at: number;
};

// Writes a flag and appends an audit entry. Kill switches have real
// revenue consequences, so who-flipped-what-when is worth recording.
// Same capped-zset pattern as announcements / the notification send log
// (zCard + zRange + zRem — this codebase doesn't use zRemRangeByRank).
export const setFlag = async (
  name: FlagName,
  enabled: boolean,
  adminUsername: string,
): Promise<{ ok: true; flag: FlagName; enabled: boolean }> => {
  const at = Date.now();
  await redis.hSet(KEY, { [name]: enabled ? '1' : '0' });

  const entry: FlagLogEntry = { flag: name, enabled, admin: adminUsername, at };
  await redis.zAdd(LOG_KEY, { score: at, member: JSON.stringify(entry) });
  const count = await redis.zCard(LOG_KEY);
  if (count > MAX_LOG) {
    const oldest: any[] = (await redis.zRange(LOG_KEY, 0, count - MAX_LOG - 1)) as any;
    const members = oldest.map((o) => (typeof o === 'string' ? o : o.member));
    if (members.length) await redis.zRem(LOG_KEY, members);
  }

  return { ok: true, flag: name, enabled };
};

// Most-recent-first audit trail for the admin panel.
export const getFlagLog = async (limit = 20): Promise<FlagLogEntry[]> => {
  const raw: any[] = (await redis.zRange(LOG_KEY, 0, -1)) as any;
  return raw
    .map((r) => {
      try {
        return JSON.parse(typeof r === 'string' ? r : r.member) as FlagLogEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is FlagLogEntry => e !== null)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
};

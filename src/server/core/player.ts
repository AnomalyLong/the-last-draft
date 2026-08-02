import { redis } from '@devvit/web/server';
import { SKIN_PALETTES } from '../../shared/palettes';

export type PlayerSource = 'draft' | 'credit' | 'purchase';
export type PlayerRarity = 'common' | 'rare' | 'super_rare' | 'ultra_rare';
export const ROLES = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
export type Role = (typeof ROLES)[number];

export type PlayerAbility = { name: string; rarity: number; [key: string]: unknown };
export type PlayerStatBonuses = { spd: number; dex: number; jmp: number; acc: number };

export type PlayerData = {
  id: number;
  owner: string;
  name: string;
  level: number;
  xp: number;
  source: PlayerSource;
  rarity: PlayerRarity;
  // Base stats set at mint
  spd: number;
  dex: number;
  jmp: number;
  acc: number;
  // Initial ability (may be null)
  ability: PlayerAbility | null;
  // Level-up rewards accumulated in-game
  abilities: PlayerAbility[];
  statBonuses: PlayerStatBonuses;
  // Index into SKIN_PALETTES (constants.js) — APPEND-ONLY list, so this
  // index is stable for the lifetime of the player record. 0 = person1
  // (sprite atlas default), used for any player record minted before this
  // field existed.
  palette: number;
};

// Server-side guard: clamp client-supplied palette to a valid index, falling
// back to a uniformly random pick when missing/invalid. Used by mintPlayer
// so a buggy client can't mint colorless players.
const validPaletteIndex = (idx: number | undefined): number => {
  if (typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 && idx < SKIN_PALETTES.length) {
    return idx;
  }
  return Math.floor(Math.random() * SKIN_PALETTES.length);
};

const PLAYER_COUNTER_KEY = 'player:id:counter';

export const playerKey = (id: number) => `player:${id}`;
export const rosterKey = (username: string) => `user:roster:${username}`;
export const lineupKey = (username: string) => `user:lineup:${username}`;

// Pre-allocates a player ID. Used by draft.ts so the ID can be referenced
// in the ledger entry before the player hash is written.
export const allocatePlayerId = async (): Promise<number> => {
  return await redis.incrBy(PLAYER_COUNTER_KEY, 1);
};

export const mintPlayer = async (params: {
  id?: number;
  owner: string;
  name: string;
  source: PlayerSource;
  rarity: PlayerRarity;
  spd?: number;
  dex?: number;
  jmp?: number;
  acc?: number;
  ability?: PlayerAbility | null;
  palette?: number;
}): Promise<PlayerData> => {
  const id = params.id ?? (await redis.incrBy(PLAYER_COUNTER_KEY, 1));
  const now = Date.now();
  const palette = validPaletteIndex(params.palette);

  await Promise.all([
    redis.hSet(playerKey(id), {
      owner: params.owner,
      name: params.name,
      level: '1',
      xp: '0',
      source: params.source,
      rarity: params.rarity,
      spd: String(params.spd ?? 0),
      dex: String(params.dex ?? 0),
      jmp: String(params.jmp ?? 0),
      acc: String(params.acc ?? 0),
      ability: params.ability ? JSON.stringify(params.ability) : '',
      palette: String(palette),
    }),
    redis.zAdd(rosterKey(params.owner), { score: now, member: String(id) }),
  ]);

  return {
    id,
    owner: params.owner,
    name: params.name,
    level: 1,
    xp: 0,
    source: params.source,
    rarity: params.rarity,
    spd: params.spd ?? 0,
    dex: params.dex ?? 0,
    jmp: params.jmp ?? 0,
    acc: params.acc ?? 0,
    ability: params.ability ?? null,
    abilities: [],
    statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 },
    palette,
  };
};

export const getPlayer = async (id: number): Promise<PlayerData | null> => {
  const raw = await redis.hGetAll(playerKey(id));
  if (!raw?.owner) return null;

  let ability: PlayerAbility | null = null;
  try { ability = raw.ability ? JSON.parse(raw.ability) : null; } catch {}

  let abilities: PlayerAbility[] = [];
  try { abilities = raw.abilities ? JSON.parse(raw.abilities) : []; } catch {}

  let statBonuses: PlayerStatBonuses = { spd: 0, dex: 0, jmp: 0, acc: 0 };
  try { statBonuses = raw.statBonuses ? JSON.parse(raw.statBonuses) : statBonuses; } catch {}

  // Defensive default: any pre-migration row (or one with a corrupted value)
  // resolves to palette 0 (person1) so the renderer never blows up. The
  // renderer also clamps via resolvePalette(), so 999 etc. would still work.
  const paletteRaw = Number(raw.palette);
  const palette = Number.isInteger(paletteRaw) && paletteRaw >= 0 && paletteRaw < SKIN_PALETTES.length
    ? paletteRaw
    : 0;

  return {
    id,
    owner: raw.owner,
    name: raw.name ?? '',
    level: Number(raw.level ?? 1),
    xp: Number(raw.xp ?? 0),
    source: (raw.source as PlayerSource) ?? 'draft',
    rarity: (raw.rarity as PlayerRarity) ?? 'common',
    spd: Number(raw.spd ?? 0),
    dex: Number(raw.dex ?? 0),
    jmp: Number(raw.jmp ?? 0),
    acc: Number(raw.acc ?? 0),
    ability,
    abilities,
    statBonuses,
    palette,
  };
};

// Position-weighted OVR — mirrors calcOvr / OVR_WEIGHTS in lobby/collection.jsx
// so a player's overall reads the same on the Challenge card as in the
// collection screen. Operates on already-bonused stats (no statBonuses here).
const OVR_WEIGHTS: Record<Role, { spd: number; dex: number; jmp: number; acc: number }> = {
  PG: { spd: 0.35, dex: 0.30, jmp: 0.10, acc: 0.25 },
  SG: { spd: 0.20, dex: 0.30, jmp: 0.15, acc: 0.35 },
  SF: { spd: 0.25, dex: 0.25, jmp: 0.25, acc: 0.25 },
  PF: { spd: 0.15, dex: 0.25, jmp: 0.35, acc: 0.25 },
  C:  { spd: 0.10, dex: 0.20, jmp: 0.45, acc: 0.25 },
};
const calcOvr = (pos: Role, s: { spd: number; dex: number; jmp: number; acc: number }): number => {
  const w = OVR_WEIGHTS[pos];
  return Math.round(s.spd * w.spd + s.dex * w.dex + s.jmp * w.jmp + s.acc * w.acc);
};

export type BuiltPlayer = {
  pos: Role;
  name: string;
  spd: number; dex: number; jmp: number; acc: number;
  overall: number;
  rarity: PlayerRarity;
  ability: PlayerAbility | null;
  abilities: PlayerAbility[];
  level: number;
  xp: number;
  palette: number;
  serverId?: number;
};

// Joins a user's roster + lineup into the ordered 5-player team shape the game
// and cards consume (PG→C), applying stat bonuses. Mirrors the client-side
// join in App.jsx. `includeServerId` MUST be false for opponent payloads
// (Challenge Me) so the away team is structurally un-persistable — see
// TODO.md "Challenge Me — Symmetric Progression Refactor".
export const buildRosterForUser = async (
  username: string,
  opts: { includeServerId?: boolean } = {},
): Promise<BuiltPlayer[]> => {
  const [ids, lineup] = await Promise.all([
    getUserRoster(username),
    getUserLineup(username),
  ]);
  const players = (await Promise.all(ids.map(getPlayer))).filter(Boolean) as PlayerData[];
  const byId = new Map(players.map(p => [p.id, p]));

  const built: BuiltPlayer[] = [];
  for (const pos of ROLES) {
    const pid = lineup[pos];
    if (!pid) continue;
    const p = byId.get(Number(pid));
    if (!p) continue;
    const sb = p.statBonuses ?? { spd: 0, dex: 0, jmp: 0, acc: 0 };
    const stats = {
      spd: p.spd + (sb.spd ?? 0),
      dex: p.dex + (sb.dex ?? 0),
      jmp: p.jmp + (sb.jmp ?? 0),
      acc: p.acc + (sb.acc ?? 0),
    };
    built.push({
      pos,
      name: p.name,
      ...stats,
      overall: calcOvr(pos, stats),
      rarity: p.rarity,
      ability: p.ability,
      abilities: p.abilities ?? [],
      level: p.level,
      xp: p.xp,
      palette: p.palette ?? 0,
      ...(opts.includeServerId ? { serverId: p.id } : {}),
    });
  }
  return built;
};

export const getUserRoster = async (username: string): Promise<number[]> => {
  const raw: any[] = (await redis.zRange(rosterKey(username), 0, -1)) as any;
  return raw.map((m: any) => Number(typeof m === 'object' ? m.member : m)).filter(n => !isNaN(n));
};

export const getUserLineup = async (username: string): Promise<Partial<Record<Role, number>>> => {
  const raw = await redis.hGetAll(lineupKey(username));
  const lineup: Partial<Record<Role, number>> = {};
  for (const role of ROLES) {
    if (raw?.[role]) lineup[role] = Number(raw[role]);
  }
  return lineup;
};

// Assigns a player to a lineup slot. Verifies ownership, clears any existing
// slot the player occupies, then sets the new slot atomically.
export const setLineupSlot = async (
  username: string,
  role: Role,
  playerId: number,
): Promise<{ success: boolean }> => {
  const inRoster = await redis.zScore(rosterKey(username), String(playerId));
  if (inRoster === null) return { success: false };

  const key = lineupKey(username);
  const currentLineup = await redis.hGetAll(key);
  const existingRole = Object.entries(currentLineup ?? {}).find(
    ([, v]) => v === String(playerId),
  )?.[0];

  if (existingRole) await redis.hDel(key, [existingRole]);
  await redis.hSet(key, { [role]: String(playerId) });

  return { success: true };
};

// Replaces the entire lineup hash atomically from a full {role: playerId} map.
// Used by the collection screen's assign/swap UI, which computes the complete
// 5-slot lineup client-side. Validates ownership of every assigned player and
// rejects duplicate player IDs across slots before writing.
export const setLineup = async (
  username: string,
  lineup: Partial<Record<Role, number>>,
): Promise<{ success: boolean }> => {
  // Collect the assigned (role, playerId) pairs in canonical order.
  const entries: Array<[Role, number]> = [];
  const seen = new Set<number>();
  for (const role of ROLES) {
    const pid = lineup[role];
    if (pid == null) continue;
    if (seen.has(pid)) return { success: false }; // same player in two slots
    seen.add(pid);
    entries.push([role, pid]);
  }

  // Every assigned player must be owned by this user.
  for (const [, pid] of entries) {
    const inRoster = await redis.zScore(rosterKey(username), String(pid));
    if (inRoster === null) return { success: false };
  }

  const key = lineupKey(username);
  await redis.del(key);
  if (entries.length) {
    const hash: Record<string, string> = {};
    for (const [role, pid] of entries) hash[role] = String(pid);
    await redis.hSet(key, hash);
  }
  return { success: true };
};

// Transfer a player from one user to another. Caller must own the player,
// must have a full 5-slot lineup, and must have at least one bench player
// (roster > 5). The transferred player must NOT be in the sender's lineup.
// On success: removes from sender's roster + lineup (defensive), adds to
// recipient's roster, and updates the player hash's owner field.
export const transferPlayer = async (
  fromUsername: string,
  toUsername: string,
  playerId: number,
): Promise<{ success: boolean; reason?: string }> => {
  if (fromUsername.toLowerCase() === toUsername.toLowerCase()) {
    return { success: false, reason: 'Cannot send to yourself' };
  }

  // Player must belong to sender.
  const player = await getPlayer(playerId);
  if (!player) return { success: false, reason: 'Player not found' };
  if (player.owner !== fromUsername) return { success: false, reason: 'You do not own this player' };

  // Sender must have a full 5-slot lineup AND a bench (roster.length > 5).
  const [senderRoster, senderLineup] = await Promise.all([
    getUserRoster(fromUsername),
    getUserLineup(fromUsername),
  ]);
  if (senderRoster.length <= 5) {
    return { success: false, reason: 'You need more than 5 players to send one away' };
  }
  const lineupFilled = ROLES.every(r => senderLineup[r] != null);
  if (!lineupFilled) {
    return { success: false, reason: 'Assign all 5 lineup positions first' };
  }

  // The player being sent must be a bench player (not assigned to a slot).
  const isInLineup = ROLES.some(r => Number(senderLineup[r]) === playerId);
  if (isInLineup) {
    return { success: false, reason: 'Cannot send a player who is in your starting lineup' };
  }

  // Atomic-ish transfer: update player owner, swap roster sets.
  const now = Date.now();
  await Promise.all([
    redis.hSet(playerKey(playerId), { owner: toUsername }),
    redis.zRem(rosterKey(fromUsername), [String(playerId)]),
    redis.zAdd(rosterKey(toUsername), { score: now, member: String(playerId) }),
    // Defensive: if somehow the player was in the lineup, clear it.
    clearPlayerFromLineup(fromUsername, playerId),
  ]);

  return { success: true };
};

// Removes a player from the lineup (e.g. after a trade sends them away).
export const clearPlayerFromLineup = async (username: string, playerId: number): Promise<void> => {
  const key = lineupKey(username);
  const raw = await redis.hGetAll(key);
  const slot = Object.entries(raw ?? {}).find(([, v]) => v === String(playerId))?.[0];
  if (slot) await redis.hDel(key, [slot]);
};

// ── Ability de-duplication ───────────────────────────────────────────────────
// A player may hold at most one copy of a given ability (the client's level-up
// picker filters names it already owns). Duplicates only ever entered the store
// through updatePlayerProgress, which used to blindly `push` whatever the client
// sent at game-over — and the client's in-memory ref was never cleared between
// games, so every previously earned ability was re-sent each time.
//
// Merging through this helper is idempotent: it both blocks new duplicates and
// repairs an already-duplicated stored list on the next write.
const readStoredAbilities = async (key: string): Promise<PlayerAbility[]> => {
  try {
    const cur = await redis.hGet(key, 'abilities');
    const parsed = cur ? JSON.parse(cur) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mergeAbilities = (
  existing: PlayerAbility[],
  incoming: PlayerAbility[] = [],
): PlayerAbility[] => {
  const seen = new Set<string>();
  const out: PlayerAbility[] = [];
  for (const a of [...existing, ...incoming]) {
    if (!a || typeof a.name !== 'string' || seen.has(a.name)) continue;
    seen.add(a.name);
    out.push(a);
  }
  return out;
};

// Persists level-up results: new level/xp, optional earned abilities, and optional stat deltas.
export const updatePlayerProgress = async (
  id: number,
  params: {
    level: number;
    xp: number;
    addAbilities?: PlayerAbility[];
    statDelta?: Partial<PlayerStatBonuses>;
  },
): Promise<void> => {
  const key = playerKey(id);
  const updates: Record<string, string> = {};

  // Level is monotonic: never write a level BELOW what's already stored.
  //
  // The client used to start every match from INITIAL_PLAYERS (level 1), so a
  // level-5 player's first XP gain of the game "levelled up" to 2 and saved
  // that, silently demoting them and re-issuing a level-up reward every match.
  // The client bug is fixed, but this stays as a cheap backstop: player.progress
  // is client-supplied and any future regression would corrupt real progression.
  // A stale level implies stale xp, so we reject both together.
  const storedLevel = Number(await redis.hGet(key, 'level')) || 0;
  if (params.level >= storedLevel) {
    updates.level = String(params.level);
    updates.xp = String(params.xp);
  }

  if (params.addAbilities?.length) {
    const existing = await readStoredAbilities(key);
    updates.abilities = JSON.stringify(mergeAbilities(existing, params.addAbilities));
  }

  if (params.statDelta) {
    let bonuses: PlayerStatBonuses = { spd: 0, dex: 0, jmp: 0, acc: 0 };
    try {
      const cur = await redis.hGet(key, 'statBonuses');
      if (cur) bonuses = JSON.parse(cur);
    } catch {}
    for (const stat of ['spd', 'dex', 'jmp', 'acc'] as const) {
      const delta = params.statDelta[stat];
      if (delta) bonuses[stat] = (bonuses[stat] ?? 0) + delta;
    }
    updates.statBonuses = JSON.stringify(bonuses);
  }

  if (Object.keys(updates).length) await redis.hSet(key, updates);
};

// ── Admin repair ─────────────────────────────────────────────────────────────
// Every level-up grants EITHER one ability OR one stat package, and the richest
// package in STAT_POOL (useGame.js) is worth 5 points. A player at level L has
// had at most (L - 1) level-ups, so a total stat bonus above (L - 1) * 5 is
// provably corrupt — it can only have come from the same re-send bug that
// duplicated abilities. Anything at or below that bound is indistinguishable
// from legitimate progression, so we never touch it.
const MAX_STAT_POINTS_PER_LEVELUP = 5;

export type PlayerRepairReport = {
  id: number;
  name: string;
  owner: string;
  level: number;
  duplicatesRemoved: string[];
  abilitiesBefore: number;
  abilitiesAfter: number;
  statPoints: number;
  statPointsMax: number;
  statsInflated: boolean;
  statsClamped: boolean;
  statBonusesBefore: PlayerStatBonuses;
  statBonusesAfter: PlayerStatBonuses;
  changed: boolean;
};

const STAT_KEYS = ['spd', 'dex', 'jmp', 'acc'] as const;

// Repairs one stored player record. Ability de-duplication is always applied.
// Stat clamping is opt-in (`clampStats`) because it is lossy — it scales the
// bonuses down proportionally to the provable ceiling rather than reconstructing
// the true history, which is not recoverable from what we store.
export const repairPlayerRecord = async (
  id: number,
  opts: { clampStats?: boolean; dryRun?: boolean } = {},
): Promise<PlayerRepairReport | null> => {
  const key = playerKey(id);
  const raw = await redis.hGetAll(key);
  // Guard on `owner`, NOT `id`: mintPlayer never writes an `id` field — the id
  // lives in the redis key and getPlayer derives it from its argument. Keying
  // this check on `id` made the repair a silent no-op on every real player.
  if (!raw || !raw.owner) return null;

  const level = Number(raw.level ?? 1) || 1;

  const before = await readStoredAbilities(key);
  const after = mergeAbilities(before);
  const seen = new Set<string>();
  const duplicatesRemoved: string[] = [];
  for (const a of before) {
    if (!a || typeof a.name !== 'string') continue;
    if (seen.has(a.name)) duplicatesRemoved.push(a.name);
    else seen.add(a.name);
  }

  let bonusesBefore: PlayerStatBonuses = { spd: 0, dex: 0, jmp: 0, acc: 0 };
  try {
    if (raw.statBonuses) {
      const parsed = JSON.parse(raw.statBonuses);
      if (parsed && typeof parsed === 'object') bonusesBefore = { ...bonusesBefore, ...parsed };
    }
  } catch {}

  const statPoints = STAT_KEYS.reduce((n, k) => n + (Number(bonusesBefore[k]) || 0), 0);
  const statPointsMax = Math.max(0, level - 1) * MAX_STAT_POINTS_PER_LEVELUP;
  const statsInflated = statPoints > statPointsMax;

  let bonusesAfter = bonusesBefore;
  let statsClamped = false;
  if (statsInflated && opts.clampStats) {
    const scale = statPointsMax / statPoints;
    bonusesAfter = { spd: 0, dex: 0, jmp: 0, acc: 0 };
    for (const k of STAT_KEYS) {
      bonusesAfter[k] = Math.max(0, Math.floor((Number(bonusesBefore[k]) || 0) * scale));
    }
    statsClamped = true;
  }

  const abilitiesChanged = after.length !== before.length;
  const changed = abilitiesChanged || statsClamped;

  if (changed && !opts.dryRun) {
    const updates: Record<string, string> = {};
    if (abilitiesChanged) updates.abilities = JSON.stringify(after);
    if (statsClamped) updates.statBonuses = JSON.stringify(bonusesAfter);
    await redis.hSet(key, updates);
  }

  return {
    id,
    name: raw.name ?? `#${id}`,
    owner: raw.owner ?? '',
    level,
    duplicatesRemoved,
    abilitiesBefore: before.length,
    abilitiesAfter: after.length,
    statPoints,
    statPointsMax,
    statsInflated,
    statsClamped,
    statBonusesBefore: bonusesBefore,
    statBonusesAfter: bonusesAfter,
    changed,
  };
};

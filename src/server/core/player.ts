import { redis } from '@devvit/web/server';

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
}): Promise<PlayerData> => {
  const id = params.id ?? (await redis.incrBy(PLAYER_COUNTER_KEY, 1));
  const now = Date.now();

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

// Removes a player from the lineup (e.g. after a trade sends them away).
export const clearPlayerFromLineup = async (username: string, playerId: number): Promise<void> => {
  const key = lineupKey(username);
  const raw = await redis.hGetAll(key);
  const slot = Object.entries(raw ?? {}).find(([, v]) => v === String(playerId))?.[0];
  if (slot) await redis.hDel(key, [slot]);
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
  const updates: Record<string, string> = {
    level: String(params.level),
    xp: String(params.xp),
  };

  if (params.addAbilities?.length) {
    let abilities: PlayerAbility[] = [];
    try {
      const cur = await redis.hGet(key, 'abilities');
      abilities = cur ? JSON.parse(cur) : [];
    } catch {}
    abilities.push(...params.addAbilities);
    updates.abilities = JSON.stringify(abilities);
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

  await redis.hSet(key, updates);
};

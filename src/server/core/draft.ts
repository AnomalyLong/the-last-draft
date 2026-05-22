import { redis } from '@devvit/web/server';
import { allocatePlayerId, mintPlayer, type PlayerRarity, type PlayerAbility } from './player';
import { spendCredits } from './user';

const userKey = (username: string) => `user:${username}`;

type DraftPlayerParams = {
  name: string;
  rarity: PlayerRarity;
  spd?: number;
  dex?: number;
  jmp?: number;
  acc?: number;
  ability?: PlayerAbility | null;
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
  return await mintPlayer({ owner: username, source: 'draft', ...params });
};

// Pre-allocates the player ID so it can be used as the ledger ref before
// the player hash exists. If credit deduction fails the ID is abandoned
// (gap in counter is acceptable). If minting fails after deduction, the
// player ID is recorded in the ledger and can be investigated by an admin.
export const creditDraft = async (
  username: string,
  cost: number,
  params: DraftPlayerParams,
) => {
  const playerId = await allocatePlayerId();
  const spent = await spendCredits(username, cost, `player:${playerId}`);

  if (!spent.success) throw new Error('Insufficient credits');

  return await mintPlayer({ id: playerId, owner: username, source: 'credit', ...params });
};

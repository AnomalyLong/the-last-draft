import { redis } from '@devvit/web/server';
import { playerKey, rosterKey, clearPlayerFromLineup } from './player';
import { spendCredits, awardCredits } from './user';

const AUCTION_COUNTER_KEY = 'auction:id:counter';
const AUCTION_CURRENT_KEY = 'auction:current';

export const auctionKey = (id: number) => `auction:${id}`;
export const auctionPlayersKey = (id: number) => `auction:${id}:players`;
export const auctionPlayerKey = (id: number, playerId: number) => `auction:${id}:player:${playerId}`;
export const auctionBidsKey = (id: number, playerId: number) => `auction:${id}:bids:${playerId}`;
export const userAuctionsKey = (username: string) => `user:auctions:${username}`;

export type AuctionStatus = 'active' | 'ended' | 'settled';
export type AuctionPlayerStatus = 'active' | 'sold' | 'unsold';

export type AuctionData = {
  id: number;
  startsAt: number;
  endsAt: number;
  status: AuctionStatus;
  createdBy: string;
};

export type AuctionPlayerEntry = {
  playerId: number;
  seller: string;
  startingBid: number;
  status: AuctionPlayerStatus;
  winner?: string;
  finalBid?: number;
};

export type BidData = {
  username: string;
  amount: number;
};

// Admin: create a new weekly auction and set it as current.
export const createAuction = async (
  createdBy: string,
  durationDays = 7,
): Promise<AuctionData> => {
  const id = await redis.incrBy(AUCTION_COUNTER_KEY, 1);
  const now = Date.now();
  const endsAt = now + durationDays * 24 * 60 * 60 * 1000;

  await Promise.all([
    redis.hSet(auctionKey(id), {
      startsAt: String(now),
      endsAt: String(endsAt),
      status: 'active',
      createdBy,
    }),
    redis.set(AUCTION_CURRENT_KEY, String(id)),
  ]);

  return { id, startsAt: now, endsAt, status: 'active', createdBy };
};

// List a player in an auction. seller = 'system' for system-generated players.
export const listPlayerInAuction = async (
  auctionId: number,
  playerId: number,
  seller: string,
  startingBid: number,
): Promise<void> => {
  await Promise.all([
    redis.zAdd(auctionPlayersKey(auctionId), { score: startingBid, member: String(playerId) }),
    redis.hSet(auctionPlayerKey(auctionId, playerId), {
      seller,
      startingBid: String(startingBid),
      status: 'active',
    }),
  ]);
};

export const getCurrentAuctionId = async (): Promise<number | null> => {
  const id = await redis.get(AUCTION_CURRENT_KEY);
  return id ? Number(id) : null;
};

export const getAuction = async (auctionId: number): Promise<AuctionData | null> => {
  const raw = await redis.hGetAll(auctionKey(auctionId));
  if (!raw?.status) return null;
  return {
    id: auctionId,
    startsAt: Number(raw.startsAt),
    endsAt: Number(raw.endsAt),
    status: raw.status as AuctionStatus,
    createdBy: raw.createdBy ?? 'system',
  };
};

export const getAuctionPlayers = async (auctionId: number): Promise<number[]> => {
  const members = await redis.zRange(auctionPlayersKey(auctionId), 0, -1);
  return members.map(Number);
};

export const getAuctionPlayerEntry = async (
  auctionId: number,
  playerId: number,
): Promise<AuctionPlayerEntry | null> => {
  const raw = await redis.hGetAll(auctionPlayerKey(auctionId, playerId));
  if (!raw?.seller) return null;
  return {
    playerId,
    seller: raw.seller,
    startingBid: Number(raw.startingBid ?? 0),
    status: raw.status as AuctionPlayerStatus,
    winner: raw.winner,
    finalBid: raw.finalBid ? Number(raw.finalBid) : undefined,
  };
};

// Returns the current top bidder and amount. null if no bids yet.
export const getTopBid = async (
  auctionId: number,
  playerId: number,
): Promise<BidData | null> => {
  const bidsKey = auctionBidsKey(auctionId, playerId);
  // zRange ascending — last element has the highest score (bid)
  const raw: any[] = (await redis.zRange(bidsKey, 0, -1)) as any;
  const members = raw.map((m: any) => typeof m === 'object' ? m.member as string : m as string);
  if (!members.length) return null;
  const topUsername = members[members.length - 1]!;
  const amount = await redis.zScore(bidsKey, topUsername);
  return { username: topUsername, amount: amount ?? 0 };
};

// Returns all bids for a player, highest first.
export const getAllBids = async (auctionId: number, playerId: number): Promise<BidData[]> => {
  const bidsKey = auctionBidsKey(auctionId, playerId);
  const raw: any[] = (await redis.zRange(bidsKey, 0, -1)) as any;
  const members = raw.map((m: any) => typeof m === 'object' ? m.member as string : m as string);
  const bids = await Promise.all(
    members.map(async (username) => ({
      username,
      amount: (await redis.zScore(bidsKey, username)) ?? 0,
    })),
  );
  return bids.reverse(); // highest first
};

// Place or raise a bid. Each user has at most one bid per player (zAdd overwrites).
export const placeBid = async (
  auctionId: number,
  playerId: number,
  username: string,
  amount: number,
): Promise<{ success: boolean; reason?: string }> => {
  const entryKey = auctionPlayerKey(auctionId, playerId);

  const [auctionStatus, playerStatus, seller, startingBidStr] = await Promise.all([
    redis.hGet(auctionKey(auctionId), 'status'),
    redis.hGet(entryKey, 'status'),
    redis.hGet(entryKey, 'seller'),
    redis.hGet(entryKey, 'startingBid'),
  ]);

  if (auctionStatus !== 'active') return { success: false, reason: 'Auction is not active' };
  if (playerStatus !== 'active') return { success: false, reason: 'Player is not available' };
  if (seller === username) return { success: false, reason: 'Cannot bid on your own player' };

  const startingBid = Number(startingBidStr ?? 0);
  const topBid = await getTopBid(auctionId, playerId);
  const currentHighest = topBid?.amount ?? startingBid - 1;

  if (amount < startingBid) {
    return { success: false, reason: `Bid must be at least ${startingBid}` };
  }
  if (amount <= currentHighest) {
    return { success: false, reason: `Bid must exceed current highest of ${currentHighest}` };
  }

  // zAdd overwrites — each user has exactly one bid per player
  await Promise.all([
    redis.zAdd(auctionBidsKey(auctionId, playerId), { score: amount, member: username }),
    redis.zAdd(userAuctionsKey(username), { score: amount, member: `${auctionId}:${playerId}` }),
  ]);

  return { success: true };
};

// Admin: settle all players in an auction, highest bidder first.
// If top bidder can't pay, falls through to the next highest.
export const settleAuction = async (auctionId: number): Promise<void> => {
  const auction = await getAuction(auctionId);
  if (!auction || auction.status === 'settled') return;

  await redis.hSet(auctionKey(auctionId), { status: 'ended' });

  const playerIds = await getAuctionPlayers(auctionId);

  for (const playerId of playerIds) {
    const entryKey = auctionPlayerKey(auctionId, playerId);
    const seller = (await redis.hGet(entryKey, 'seller')) ?? 'system';
    const ref = `auction:${auctionId}:player:${playerId}`;

    const bids = await getAllBids(auctionId, playerId); // highest first
    let settled = false;

    for (const { username: bidder, amount } of bids) {
      const deducted = await spendCredits(bidder, amount, ref);
      if (!deducted.success) continue;

      if (seller !== 'system') {
        await awardCredits(seller, amount, ref);
      }

      // Transfer player: remove from seller roster/lineup, add to winner roster
      if (seller !== 'system') {
        await Promise.all([
          redis.zRem(rosterKey(seller), [String(playerId)]),
          clearPlayerFromLineup(seller, playerId),
        ]);
      }

      await Promise.all([
        redis.hSet(playerKey(playerId), { owner: bidder }),
        redis.zAdd(rosterKey(bidder), { score: Date.now(), member: String(playerId) }),
        redis.hSet(entryKey, {
          winner: bidder,
          finalBid: String(amount),
          status: 'sold',
        }),
      ]);

      settled = true;
      break;
    }

    if (!settled) {
      await redis.hSet(entryKey, { status: 'unsold' });
    }
  }

  await redis.hSet(auctionKey(auctionId), { status: 'settled' });
};

import { initTRPC, TRPCError } from '@trpc/server';
import { transformer } from '../shared/transformer';
import { Context } from './context';
import { context, reddit, redis } from '@devvit/web/server';
import { z } from 'zod';

import { getOrCreateUser, getUser, grantFreeDrafts, setTeamName, userKey, ledgerKey, gamesKey, MAX_ENERGY, USERS_INDEX_KEY } from './core/user';
import { getPlayer, getUserRoster, getUserLineup, setLineupSlot, updatePlayerProgress, ROLES, type Role, rosterKey, lineupKey } from './core/player';
import { freeDraft, creditDraft } from './core/draft';
import { startGame, recordPlay, endGame, getGame, type PlayEvent } from './core/game';
import {
  isAdmin,
  addAdmin,
  removeAdmin,
  getAdmins,
  getPendingGames,
  getFlaggedGames,
  approveGame,
  rejectGame,
  adjustCredits,
} from './core/admin';
import {
  createAuction,
  listPlayerInAuction,
  getCurrentAuctionId,
  getAuction,
  getAuctionPlayers,
  getAuctionPlayerEntry,
  getTopBid,
  getAllBids,
  placeBid,
  settleAuction,
} from './core/auction';
import { countDecrement, countGet, countIncrement } from './core/count';

const t = initTRPC.context<Context>().create({ transformer });
export const router = t.router;
export const publicProcedure = t.procedure;

const requireUsername = async (): Promise<string> => {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return username;
};

// Middleware that verifies the caller is in the admins hash.
const adminProcedure = t.procedure.use(async ({ next }) => {
  const username = await requireUsername();
  const admin = await isAdmin(username);
  if (!admin) throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  return next({ ctx: { adminUsername: username } });
});

export const appRouter = t.router({
  // ── User ────────────────────────────────────────────────────────────────
  user: t.router({
    init: publicProcedure.query(async () => {
      const username = await requireUsername();
      const currentUser = await reddit.getCurrentUser();
      return await getOrCreateUser(username, currentUser?.id ?? username);
    }),

    get: publicProcedure.query(async () => {
      const username = await requireUsername();
      const user = await getUser(username);
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      return user;
    }),

    roster: publicProcedure.query(async () => {
      const username = await requireUsername();
      const ids = await getUserRoster(username);
      const players = await Promise.all(ids.map(id => getPlayer(id)));
      return players.filter(Boolean);
    }),

    lineup: publicProcedure.query(async () => {
      const username = await requireUsername();
      return await getUserLineup(username);
    }),

    setLineupSlot: publicProcedure
      .input(z.object({ role: z.enum(ROLES), playerId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        const result = await setLineupSlot(username, input.role as Role, input.playerId);
        if (!result.success) throw new TRPCError({ code: 'FORBIDDEN', message: 'Player not in roster' });
        return result;
      }),

    setTeamName: publicProcedure
      .input(z.object({ teamName: z.string().min(1).max(24) }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        await setTeamName(username, input.teamName);
        return { success: true };
      }),
  }),

  // ── Player ──────────────────────────────────────────────────────────────
  player: t.router({
    get: publicProcedure
      .input(z.number().int().positive())
      .query(async ({ input }) => {
        const player = await getPlayer(input);
        if (!player) throw new TRPCError({ code: 'NOT_FOUND' });
        return player;
      }),

    progress: publicProcedure
      .input(z.object({
        playerId: z.number().int().positive(),
        level: z.number().int().positive(),
        xp: z.number().int().min(0),
        addAbilities: z.array(z.object({ name: z.string(), rarity: z.number().int() }).catchall(z.unknown())).optional(),
        statDelta: z.object({
          spd: z.number().int().optional(),
          dex: z.number().int().optional(),
          jmp: z.number().int().optional(),
          acc: z.number().int().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        const player = await getPlayer(input.playerId);
        if (!player || player.owner !== username) throw new TRPCError({ code: 'FORBIDDEN' });
        await updatePlayerProgress(input.playerId, {
          level: input.level,
          xp: input.xp,
          addAbilities: input.addAbilities as any,
          statDelta: input.statDelta,
        });
        return { success: true };
      }),
  }),

  // ── Draft ───────────────────────────────────────────────────────────────
  draft: t.router({
    free: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(32),
        rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
        spd: z.number().int().min(0).max(99).optional(),
        dex: z.number().int().min(0).max(99).optional(),
        jmp: z.number().int().min(0).max(99).optional(),
        acc: z.number().int().min(0).max(99).optional(),
        ability: z.object({ name: z.string(), rarity: z.number().int() }).catchall(z.unknown()).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        try {
          return await freeDraft(username, input);
        } catch (e: any) {
          throw new TRPCError({ code: 'FORBIDDEN', message: e?.message ?? 'Draft failed' });
        }
      }),

    credit: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(32),
        rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
        cost: z.number().int().positive(),
        spd: z.number().int().min(0).max(99).optional(),
        dex: z.number().int().min(0).max(99).optional(),
        jmp: z.number().int().min(0).max(99).optional(),
        acc: z.number().int().min(0).max(99).optional(),
        ability: z.object({ name: z.string(), rarity: z.number().int() }).catchall(z.unknown()).nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        return await creditDraft(username, input.cost, { name: input.name, rarity: input.rarity, spd: input.spd, dex: input.dex, jmp: input.jmp, acc: input.acc, ability: input.ability as any });
      }),
  }),

  // ── Game ────────────────────────────────────────────────────────────────
  game: t.router({
    start: publicProcedure.mutation(async () => {
      const username = await requireUsername();
      const postId = context.postId ?? '';
      return await startGame(username, postId);
    }),

    recordPlay: publicProcedure
      .input(z.object({
        gameId: z.number().int().positive(),
        token: z.string(),
        sequence: z.number().int().min(0),
        play: z.object({
          type: z.enum(['shoot', 'dunk', 'block', 'steal', 'quarter_end', 'move', 'score']),
          playerId: z.number().int().optional(),
          result: z.enum(['made', 'missed']).optional(),
          points: z.number().int().optional(),
          to: z.tuple([z.number(), z.number()]).optional(),
          team: z.enum(['home', 'away']).optional(),
          total: z.number().int().optional(),
          homePoints: z.number().int().optional(),
          awayPoints: z.number().int().optional(),
          quarter: z.number().int().optional(),
          t: z.number(),
        }),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        const result = await recordPlay(
          username,
          input.gameId,
          input.token,
          input.play as PlayEvent,
          input.sequence,
        );
        if (!result.success) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid game session' });
        return result;
      }),

    end: publicProcedure
      .input(z.object({
        gameId: z.number().int().positive(),
        token: z.string(),
        score: z.number().int().min(0),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        return await endGame(username, input.gameId, input.token, input.score);
      }),

    get: publicProcedure
      .input(z.number().int().positive())
      .query(async ({ input }) => {
        const game = await getGame(input);
        if (!game) throw new TRPCError({ code: 'NOT_FOUND' });
        return game;
      }),
  }),

  // ── Auction ─────────────────────────────────────────────────────────────
  auction: t.router({
    getCurrent: publicProcedure.query(async () => {
      const id = await getCurrentAuctionId();
      if (id === null) return null;
      return await getAuction(id);
    }),

    getPlayers: publicProcedure
      .input(z.number().int().positive())
      .query(async ({ input: auctionId }) => {
        const playerIds = await getAuctionPlayers(auctionId);
        const entries = await Promise.all(playerIds.map((id) => getAuctionPlayerEntry(auctionId, id)));
        return entries.filter(Boolean);
      }),

    getTopBid: publicProcedure
      .input(z.object({ auctionId: z.number().int().positive(), playerId: z.number().int().positive() }))
      .query(async ({ input }) => getTopBid(input.auctionId, input.playerId)),

    getAllBids: publicProcedure
      .input(z.object({ auctionId: z.number().int().positive(), playerId: z.number().int().positive() }))
      .query(async ({ input }) => getAllBids(input.auctionId, input.playerId)),

    bid: publicProcedure
      .input(z.object({
        auctionId: z.number().int().positive(),
        playerId: z.number().int().positive(),
        amount: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        const result = await placeBid(input.auctionId, input.playerId, username, input.amount);
        if (!result.success) throw new TRPCError({ code: 'BAD_REQUEST', message: result.reason });
        return result;
      }),
  }),

  // ── Admin ────────────────────────────────────────────────────────────────
  admin: t.router({
    isAdmin: publicProcedure.query(async () => {
      const username = await requireUsername();
      const admin = await isAdmin(username);
      return { isAdmin: admin };
    }),

    getUser: adminProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const user = await getUser(input);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input}" not found` });
        return user;
      }),

    getUserRoster: adminProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const ids = await getUserRoster(input);
        const lineup = await getUserLineup(input);
        const idToRole = new Map(Object.entries(lineup).map(([role, id]) => [id, role]));
        const players = await Promise.all(ids.map(id => getPlayer(id)));
        return players.filter(Boolean).map(p => ({ ...p, lineupRole: idToRole.get(p!.id) ?? null }));
      }),

    restoreEnergy: adminProcedure
      .input(z.string())
      .mutation(async ({ input }) => {
        await redis.hSet(userKey(input), { energy: String(MAX_ENERGY), energyUpdatedAt: String(Date.now()) });
        return { success: true };
      }),

    resetUser: adminProcedure
      .input(z.string())
      .mutation(async ({ input }) => {
        await Promise.all([
          redis.del(userKey(input)),
          redis.del(gamesKey(input)),
          redis.del(ledgerKey(input)),
          redis.del(rosterKey(input)),
          redis.del(lineupKey(input)),
        ]);
        return { success: true };
      }),

    listUsers: adminProcedure
      .input(z.object({ offset: z.number().int().min(0).default(0), limit: z.number().int().positive().max(100).default(30) }))
      .query(async ({ input }) => {
        const total = await redis.zCard(USERS_INDEX_KEY);
        if (total === 0) return { users: [] as string[], total: 0 };
        // sorted set is oldest→newest; slice from the end for newest-first pages
        const start = Math.max(0, total - input.offset - input.limit);
        const stop = Math.max(0, total - input.offset - 1);
        const raw: any[] = (await redis.zRange(USERS_INDEX_KEY, start, stop)) as any;
        const users = raw.map((m: any) => typeof m === 'object' ? m.member : m).reverse() as string[];
        return { users, total };
      }),

    // User management
    getAdmins: adminProcedure.query(async () => getAdmins()),

    addAdmin: adminProcedure
      .input(z.string())
      .mutation(async ({ input }) => { await addAdmin(input); return { success: true }; }),

    removeAdmin: adminProcedure
      .input(z.string())
      .mutation(async ({ input }) => { await removeAdmin(input); return { success: true }; }),

    grantFreeDrafts: adminProcedure
      .input(z.object({ username: z.string(), amount: z.number().int().positive() }))
      .mutation(async ({ input }) => { await grantFreeDrafts(input.username, input.amount); return { success: true }; }),

    adjustCredits: adminProcedure
      .input(z.object({ username: z.string(), amount: z.number().int(), reason: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await adjustCredits(input.username, input.amount, ctx.adminUsername, input.reason);
        return { success: true };
      }),

    // Game review
    getPendingGames: adminProcedure
      .input(z.number().int().positive().default(50))
      .query(async ({ input }) => getPendingGames(input)),

    getFlaggedGames: adminProcedure
      .input(z.number().int().positive().default(50))
      .query(async ({ input }) => getFlaggedGames(input)),

    approveGame: adminProcedure
      .input(z.number().int().positive())
      .mutation(async ({ input, ctx }) => {
        await approveGame(input, ctx.adminUsername);
        return { success: true };
      }),

    rejectGame: adminProcedure
      .input(z.number().int().positive())
      .mutation(async ({ input, ctx }) => {
        await rejectGame(input, ctx.adminUsername);
        return { success: true };
      }),

    // Auction management
    createAuction: adminProcedure
      .input(z.object({ durationDays: z.number().int().positive().default(7) }))
      .mutation(async ({ input, ctx }) => createAuction(ctx.adminUsername, input.durationDays)),

    listPlayerInAuction: adminProcedure
      .input(z.object({
        auctionId: z.number().int().positive(),
        playerId: z.number().int().positive(),
        seller: z.string(),
        startingBid: z.number().int().min(0),
      }))
      .mutation(async ({ input }) => {
        await listPlayerInAuction(input.auctionId, input.playerId, input.seller, input.startingBid);
        return { success: true };
      }),

    settleAuction: adminProcedure
      .input(z.number().int().positive())
      .mutation(async ({ input }) => { await settleAuction(input); return { success: true }; }),
  }),

  // ── Legacy counter ───────────────────────────────────────────────────────
  init: t.router({
    get: publicProcedure.query(async () => {
      const [count, username] = await Promise.all([countGet(), reddit.getCurrentUsername()]);
      return { count, postId: context.postId, username };
    }),
  }),
  counter: t.router({
    increment: publicProcedure
      .input(z.number().optional())
      .mutation(async ({ input }) => ({ count: await countIncrement(input), postId: context.postId, type: 'increment' })),
    decrement: publicProcedure
      .input(z.number().optional())
      .mutation(async ({ input }) => ({ count: await countDecrement(input), postId: context.postId, type: 'decrement' })),
    get: publicProcedure.query(async () => countGet()),
  }),
});

export type AppRouter = typeof appRouter;

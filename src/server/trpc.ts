import { initTRPC, TRPCError } from '@trpc/server';
import { transformer } from '../shared/transformer';
import { Context } from './context';
import { context, reddit, redis } from '@devvit/web/server';
import { z } from 'zod';

import { getOrCreateUser, getUser, resolveUsername, grantFreeDrafts, setTeamName, setMutedPreference, userKey, ledgerKey, gamesKey, MAX_ENERGY, computeEnergy, USERS_INDEX_KEY } from './core/user';
import { getPlayer, getUserRoster, getUserLineup, setLineupSlot, setLineup, updatePlayerProgress, buildRosterForUser, transferPlayer, repairPlayerRecord, ROLES, type Role, rosterKey, lineupKey } from './core/player';
import { SKIN_PALETTES } from '../shared/palettes';
import { createChallengePost, canCreateChallengePost, getChallengePost, listChallengeResults, getMyChallenge, challengePostKey } from './core/post';
import { freeDraft, creditDraft, buyDraftPick, getNextDraftCost } from './core/draft';
import { createAnnouncement, listAnnouncements, deleteAnnouncement, hasUnreadAnnouncements, markAnnouncementsSeen } from './core/announcements';
import {
  optInCurrentUser as notifOptIn,
  optOutCurrentUser as notifOptOut,
  getStatus as getNotifStatus,
  listOptedIn as listNotifOptedIn,
  resolveUsernames as resolveNotifUsernames,
  send as sendNotifications,
  listSendLog as listNotifSendLog,
} from './core/notifications';
import { startGame, recordPlay, endGame, getGame, type PlayEvent } from './core/game';
import {
  listMissions,
  claimMission,
  resetUserMissions,
  adminSetMissionProgress,
  adminCompleteMission,
  getMissionCatalog,
  setMissionCatalog,
  resetMissionCatalog,
  updateMissionDef,
  moveMissionType,
  DEFAULT_MISSION_CATALOG,
  listBpMissions,
  claimBpMission,
  adminCompleteBpMission,
  BP_MISSIONS,
  recordNotificationsEnabled,
  type MissionDef,
} from './core/missions';
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
import { getMyPass, adminGrantPass, adminRevokePass, retryFounderFlair } from './core/battlePass';
import { getFlags, setFlag, getFlagLog, isFlagName, FLAG_DEFAULTS } from './core/featureFlags';
import { getInlineSplashSetting, setInlineSplashSetting, getInlineSplashLog } from './core/inlineSplash';
import {
  getDraftPricingSetting,
  setDraftPricing,
  resetDraftPricing,
  getDraftPricingLog,
  DRAFT_PRICING_BOUNDS,
} from './core/draftPricing';
import { SPLASH_VARIANTS } from '../shared/splash';

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
      const user = await getOrCreateUser(username, currentUser?.id ?? username);
      // Stored energy is only accurate as of energyUpdatedAt — apply the
      // regen curve here so the client never renders a stale value.
      return {
        ...user,
        energy: computeEnergy(user.energy, user.energyUpdatedAt),
        maxEnergy: MAX_ENERGY,
      };
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

    // Full-lineup replace — client sends the complete {role: playerId} map.
    setLineup: publicProcedure
      .input(z.object({
        lineup: z.object({
          PG: z.number().int().positive().optional(),
          SG: z.number().int().positive().optional(),
          SF: z.number().int().positive().optional(),
          PF: z.number().int().positive().optional(),
          C:  z.number().int().positive().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        const result = await setLineup(username, input.lineup as Partial<Record<Role, number>>);
        if (!result.success) throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid lineup (unowned or duplicate player)' });
        return result;
      }),

    checkSubActivity: publicProcedure
      .input(z.object({ subredditName: z.string().min(1) }))
      .query(async ({ input }) => {
        const currentUser = await reddit.getCurrentUser();
        if (!currentUser) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const target = input.subredditName.toLowerCase();
        const username = currentUser.username;
        const [comments, posts] = await Promise.all([
          reddit.getCommentsByUser({ username, limit: 100, sort: 'new' }).all().catch((e: any) => { console.error('getCommentsByUser', e); return []; }),
          reddit.getPostsByUser({ username, limit: 100, sort: 'new' }).all().catch((e: any) => { console.error('getPostsByUser', e); return []; }),
        ]);
        const subComments = comments.filter((c: any) => (c.subredditName ?? '').toLowerCase() === target);
        const subPosts = posts.filter((p: any) => (p.subredditName ?? '').toLowerCase() === target);
        const allTimes = [...subComments, ...subPosts]
          .map((x: any) => x.createdAt instanceof Date ? x.createdAt.getTime() : new Date(x.createdAt).getTime())
          .filter(n => Number.isFinite(n));
        const firstSeen = allTimes.length ? new Date(Math.min(...allTimes)).toISOString() : null;
        const lastSeen = allTimes.length ? new Date(Math.max(...allTimes)).toISOString() : null;
        const toTime = (x: any) => x.createdAt instanceof Date ? x.createdAt.getTime() : new Date(x.createdAt).getTime();
        const recentComments = [...comments]
          .sort((a: any, b: any) => toTime(b) - toTime(a))
          .slice(0, 10)
          .map((c: any) => ({
            sub: c.subredditName ?? '',
            date: new Date(toTime(c)).toISOString().slice(0, 10),
            snippet: String(c.body ?? '').replace(/\s+/g, ' ').slice(0, 80),
          }));
        const recentPosts = [...posts]
          .sort((a: any, b: any) => toTime(b) - toTime(a))
          .slice(0, 10)
          .map((p: any) => ({
            sub: p.subredditName ?? '',
            date: new Date(toTime(p)).toISOString().slice(0, 10),
            title: String(p.title ?? '').slice(0, 80),
          }));
        return {
          subreddit: input.subredditName,
          commentCount: subComments.length,
          postCount: subPosts.length,
          firstSeen,
          lastSeen,
          scanned: { comments: comments.length, posts: posts.length },
          recentComments,
          recentPosts,
        };
      }),

    getFlairBySubreddit: publicProcedure
      .input(z.object({ subredditName: z.string().min(1) }))
      .query(async ({ input }) => {
        const currentUser = await reddit.getCurrentUser();
        if (!currentUser) throw new TRPCError({ code: 'UNAUTHORIZED' });
        const flair = await currentUser.getUserFlairBySubreddit(input.subredditName);
        return { flair: flair ?? null };
      }),

    setTeamName: publicProcedure
      .input(z.object({ teamName: z.string().min(1).max(24) }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        await setTeamName(username, input.teamName);
        return { success: true };
      }),

    setMuted: publicProcedure
      .input(z.object({ muted: z.boolean() }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        await setMutedPreference(username, input.muted);
        return { success: true, muted: input.muted };
      }),

    // Look up whether a username is registered (has played the app before).
    // Used by the Send Player modal to confirm the recipient exists before
    // showing the confirmation prompt. Strips a leading "u/" if the user typed it.
    exists: publicProcedure
      .input(z.object({ username: z.string().min(1).max(40) }))
      .query(async ({ input }) => {
        const cleaned = input.username.trim().replace(/^u\//i, '');
        if (!cleaned) return { exists: false, username: '' };
        const user = await getUser(cleaned);
        return { exists: !!user, username: cleaned };
      }),

    // Idempotent fallback: ensures user:games:{username} has >= 1 entry so the
    // client computes isFtue=false on next user.init. Used when a GameOverScreen
    // is dismissed without an active session (e.g. trpc.game.start failed at
    // game-start time). Does nothing if the user already has any completed game.
    markFtuePlayed: publicProcedure
      .mutation(async () => {
        const username = await requireUsername();
        const existing = await redis.zCard(gamesKey(username));
        if (existing > 0) return { marked: false };
        await redis.zAdd(gamesKey(username), {
          score: Date.now(),
          member: 'ftue-fallback',
        });
        return { marked: true };
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

    // Send (gift) a player from the caller's roster to another user. Server
     // re-validates: caller owns the player, has > 5 players, has a full
     // 5-slot lineup, and the player is on the bench (not in a slot).
    send: publicProcedure
      .input(z.object({
        playerId: z.number().int().positive(),
        toUsername: z.string().min(1).max(40),
      }))
      .mutation(async ({ input }) => {
        const fromUsername = await requireUsername();
        const cleanedTo = input.toUsername.trim().replace(/^u\//i, '');
        if (!cleanedTo) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Recipient username is required' });
        }
        // Recipient must be a registered user.
        const recipient = await getUser(cleanedTo);
        if (!recipient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `User u/${cleanedTo} not found` });
        }
        const result = await transferPlayer(fromUsername, cleanedTo, input.playerId);
        if (!result.success) {
          throw new TRPCError({ code: 'FORBIDDEN', message: result.reason ?? 'Send failed' });
        }
        return { success: true, recipient: cleanedTo };
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
    // Cost + count for the user's NEXT paid draft this week (escalating per
    // buy, server-authoritative). Returns the live pricing facts (stepPct,
    // firstCost) too, so Draft Hub copy renders the configured rate rather
    // than a hardcoded one. Drives the Draft Hub display.
    cost: publicProcedure.query(async () => {
      const username = await requireUsername();
      return await getNextDraftCost(username);
    }),

    // Buy a draft pick: charges the escalating weekly cost NOW (priced from
    // the live config) and banks a reusable pick on the user (persists until
    // consumed via draft.credit).
    buy: publicProcedure.mutation(async () => {
      const username = await requireUsername();
      try {
        return await buyDraftPick(username);
      } catch (e: any) {
        throw new TRPCError({ code: 'FORBIDDEN', message: e?.message ?? 'Purchase failed' });
      }
    }),

    free: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(32),
        rarity: z.enum(['common', 'rare', 'super_rare', 'ultra_rare']),
        spd: z.number().int().min(0).max(99).optional(),
        dex: z.number().int().min(0).max(99).optional(),
        jmp: z.number().int().min(0).max(99).optional(),
        acc: z.number().int().min(0).max(99).optional(),
        ability: z.object({ name: z.string(), rarity: z.number().int() }).catchall(z.unknown()).nullable().optional(),
        palette: z.number().int().min(0).max(SKIN_PALETTES.length - 1).optional(),
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
        rarity: z.enum(['common', 'rare', 'super_rare', 'ultra_rare']),
        spd: z.number().int().min(0).max(99).optional(),
        dex: z.number().int().min(0).max(99).optional(),
        jmp: z.number().int().min(0).max(99).optional(),
        acc: z.number().int().min(0).max(99).optional(),
        ability: z.object({ name: z.string(), rarity: z.number().int() }).catchall(z.unknown()).nullable().optional(),
        palette: z.number().int().min(0).max(SKIN_PALETTES.length - 1).optional(),
      }))
      .mutation(async ({ input }) => {
        // Consumes one banked paid pick (bought earlier via draft.buy) — no
        // charge here. Throws if the user has no pick to spend.
        const username = await requireUsername();
        try {
          return await creditDraft(username, { name: input.name, rarity: input.rarity, spd: input.spd, dex: input.dex, jmp: input.jmp, acc: input.acc, ability: input.ability as any, palette: input.palette });
        } catch (e: any) {
          throw new TRPCError({ code: 'FORBIDDEN', message: e?.message ?? 'Draft failed' });
        }
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
          type: z.enum(['shoot', 'dunk', 'block', 'steal', 'defense', 'quarter_end', 'move', 'score']),
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

  // ── Challenge Me posts ────────────────────────────────────────────────────
  post: t.router({
    // Whether the current user may create a challenge post this week.
    canCreateChallenge: publicProcedure.query(async () => {
      const username = await requireUsername();
      return await canCreateChallengePost(username);
    }),

    // Create a Challenge Me post advertising the user's roster. Throws CONFLICT
    // if they already posted this week. Returns a navigate target for the client
    // to redirect to the new Reddit post.
    createChallenge: publicProcedure.mutation(async () => {
      const username = await requireUsername();
      try {
        return await createChallengePost(username);
      } catch (e) {
        throw new TRPCError({ code: 'CONFLICT', message: (e as Error).message });
      }
    }),

    // The current user's own active challenge post (this week), for the lobby
    // "My Challenge" view. Null when there's no live post (none this week, or it
    // was deleted on Reddit — verify-on-check self-heals the gate).
    getMyChallenge: publicProcedure.query(async () => {
      const username = await requireUsername();
      return await getMyChallenge(username);
    }),

    // Hydrate the challenge for the CURRENT post context (context.postId).
    // Returns null when this post isn't a challenge post (e.g. the default
    // post), so the client falls back to the splash screen. Roster is a LIVE
    // read of the owner's lineup with serverId stripped — see the asymmetric
    // progression note in TODO.md.
    getChallenge: publicProcedure.query(async () => {
      const postId = context.postId ?? '';
      const challenge = await getChallengePost(postId);
      if (!challenge) return null;

      const [roster, owner, results] = await Promise.all([
        buildRosterForUser(challenge.owner, { includeServerId: false }),
        getUser(challenge.owner),
        listChallengeResults(postId, 3),
      ]);

      return {
        username: challenge.owner,
        owner: `u/${challenge.owner}`,
        team: owner?.teamName || challenge.owner.toUpperCase(),
        // This team's challenge-defense record (W = roster held, L = beaten),
        // NOT the owner's overall game record.
        record: { wins: challenge.wins, losses: challenge.losses },
        roster,
        challenges: results.map(r => ({
          opponent: `u/${r.opponent}`,
          result: r.result,
          score: r.score,
        })),
      };
    }),
  }),

  // ── Missions ────────────────────────────────────────────────────────────
  missions: t.router({
    list: publicProcedure.query(async () => {
      const username = await requireUsername();
      return await listMissions(username);
    }),

    claim: publicProcedure
      .input(z.object({
        type: z.enum(['daily', 'weekly']),
        missionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        return await claimMission(username, input.type, input.missionId);
      }),

    listPass: publicProcedure.query(async () => {
      const username = await requireUsername();
      return await listBpMissions(username);
    }),

    claimPass: publicProcedure
      .input(z.object({ missionId: z.string() }))
      .mutation(async ({ input }) => {
        const username = await requireUsername();
        return await claimBpMission(username, input.missionId);
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

  // ── Announcements ────────────────────────────────────────────────────────
  // Public read — surfaces in the notification bell and the events page.
  announcements: t.router({
    list: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(20).optional() }).optional())
      .query(async ({ input }) => {
        return await listAnnouncements(input?.limit ?? 10);
      }),

    // Whether the newest announcement postdates the user's last bell-open.
    unread: publicProcedure.query(async () => {
      const username = await requireUsername();
      return { hasUnread: await hasUnreadAnnouncements(username) };
    }),

    // Called when the user opens the bell dropdown — clears the dot.
    markSeen: publicProcedure.mutation(async () => {
      const username = await requireUsername();
      await markAnnouncementsSeen(username);
      return { ok: true };
    }),
  }),

  // ── Push notifications ───────────────────────────────────────────────────
  // Opt-in/out is per-current-user (the plugin has no admin setter). Sends are
  // admin-only and live under `admin.*` below.
  notifications: t.router({
    status: publicProcedure.query(async () => {
      const username = await requireUsername();
      const currentUser = await reddit.getCurrentUser();
      const status = await getNotifStatus(username, currentUser?.id ?? '');
      // Re-tick the weekly "keep notifications on" mission — see
      // recordNotificationsEnabled for why this lives on the read path.
      if (status.optedIn) await recordNotificationsEnabled(username);
      return status;
    }),

    optIn: publicProcedure.mutation(async () => {
      const username = await requireUsername();
      const currentUser = await reddit.getCurrentUser();
      const status = await notifOptIn(username, currentUser?.id ?? '');
      await recordNotificationsEnabled(username);
      return status;
    }),

    optOut: publicProcedure.mutation(async () => {
      const username = await requireUsername();
      return await notifOptOut(username);
    }),
  }),

  // ── Founders Pass ────────────────────────────────────────────────────────
  // The actual purchase flow is server-to-server via Devvit Payments
  // (handlers in src/server/index.ts → src/server/core/battlePass.ts). This
  // tRPC branch is read-only — the BattlePassScreen calls getMine to
  // know which tier the user owns and whether they've earned the
  // lifetime founder flag.
  pass: t.router({
    getMine: publicProcedure.query(async () => {
      const username = await requireUsername();
      return await getMyPass(username);
    }),
  }),

  // ── Runtime config ───────────────────────────────────────────────────────
  // Public read of the admin kill switches. The client fetches this on
  // boot (and on entering a gated screen) to hide/disable features that
  // an operator has switched off. Purely advisory for the UI — every
  // flag is independently enforced server-side at its mutation point.
  config: t.router({
    getFlags: publicProcedure.query(async () => {
      return await getFlags();
    }),

    // Which splash the post/feed view should render, for everyone. The
    // client paints its cached copy first and reconciles with this, so
    // this query is never on the critical path of a feed impression.
    // See src/splashConfig.js.
    getInlineSplash: publicProcedure.query(async () => {
      const s = await getInlineSplashSetting();
      return { applied: s.applied, override: s.override, default: s.default };
    }),
  }),

  // ── Admin ────────────────────────────────────────────────────────────────
  admin: t.router({
    isAdmin: publicProcedure.query(async () => {
      const username = await requireUsername();
      const admin = await isAdmin(username);
      return { isAdmin: admin };
    }),

    // ── Feature flags ──────────────────────────────────────────────────
    getFlags: adminProcedure.query(async () => {
      const [flags, log] = await Promise.all([getFlags(), getFlagLog(20)]);
      return { flags, log, defaults: FLAG_DEFAULTS };
    }),

    setFlag: adminProcedure
      .input(z.object({
        flag: z.string().min(1).max(40),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isFlagName(input.flag)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown flag: ${input.flag}` });
        }
        return await setFlag(input.flag, input.enabled, ctx.adminUsername);
      }),

    // ── Global inline splash ───────────────────────────────────────────
    getInlineSplash: adminProcedure.query(async () => {
      const [setting, log] = await Promise.all([getInlineSplashSetting(), getInlineSplashLog(20)]);
      return { ...setting, log };
    }),

    // variant: null clears the override and follows the build default.
    setInlineSplash: adminProcedure
      .input(z.object({
        variant: z.enum(SPLASH_VARIANTS).nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await setInlineSplashSetting(input.variant, ctx.adminUsername);
      }),

    // ── Draft pricing ──────────────────────────────────────────────────
    // The escalating paid-draft price ladder. Live-tunable; every field
    // independently falls back to the shipped default. See
    // core/draftPricing.ts for why out-of-bounds stored values are ignored
    // rather than clamped.
    getDraftPricing: adminProcedure.query(async () => {
      const [setting, log] = await Promise.all([
        getDraftPricingSetting(),
        getDraftPricingLog(20),
      ]);
      return { ...setting, log, bounds: DRAFT_PRICING_BOUNDS };
    }),

    // Each field is optional; null CLEARS that field back to the shipped
    // default. Bounds are enforced in core (throws) as well as here, so a
    // direct call can't sneak a nonsense price past the UI.
    setDraftPricing: adminProcedure
      .input(z.object({
        firstCost: z.number().int()
          .min(DRAFT_PRICING_BOUNDS.firstCost.min)
          .max(DRAFT_PRICING_BOUNDS.firstCost.max)
          .nullable().optional(),
        stepPct: z.number().int()
          .min(DRAFT_PRICING_BOUNDS.stepPct.min)
          .max(DRAFT_PRICING_BOUNDS.stepPct.max)
          .nullable().optional(),
        roundTo: z.number().int()
          .min(DRAFT_PRICING_BOUNDS.roundTo.min)
          .max(DRAFT_PRICING_BOUNDS.roundTo.max)
          .nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await setDraftPricing(input, ctx.adminUsername);
        } catch (e: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: e?.message ?? 'Invalid pricing',
          });
        }
      }),

    resetDraftPricing: adminProcedure.mutation(async ({ ctx }) => {
      return await resetDraftPricing(ctx.adminUsername);
    }),

    createAnnouncement: adminProcedure
      .input(z.object({
        tag: z.string().min(1).max(12),
        accent: z.enum(['cyan', 'magenta', 'gold']),
        title: z.string().min(1).max(64),
        sub: z.string().min(1).max(120),
        body: z.string().max(600).optional(),
      }))
      .mutation(async ({ input }) => {
        return await createAnnouncement({
          tag: input.tag.toUpperCase(),
          accent: input.accent,
          title: input.title,
          sub: input.sub,
          body: input.body || undefined,
        });
      }),

    deleteAnnouncement: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const removed = await deleteAnnouncement(input.id);
        if (!removed) throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
        return { ok: true };
      }),

    // ── Push notifications (admin) ─────────────────────────────────────────
    // Audience table + send. Note the platform rules this UI has to respect:
    // an UNPUBLISHED app may only notify the developer themselves, published
    // apps are capped at 2/user/day and 25K/app/day.
    notifyAudience: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        return await listNotifOptedIn(input?.limit ?? 200);
      }),

    notifySend: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(300),
        // Blank → core/notifications falls back to context.postId.
        link: z.string().max(32).optional(),
        audience: z.enum(['all', 'usernames', 'self']),
        usernames: z.array(z.string().min(1)).max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const by = ctx.adminUsername;
        let recipients: { username: string; userId: string }[] = [];
        let unknown: string[] = [];

        if (input.audience === 'self') {
          const currentUser = await reddit.getCurrentUser();
          const userId = currentUser?.id ?? '';
          if (!userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Could not resolve your Reddit user id' });
          recipients = [{ username: by, userId }];
        } else if (input.audience === 'usernames') {
          const names = (input.usernames ?? []).map(n => n.trim()).filter(Boolean);
          if (!names.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No usernames given' });
          const resolved = await resolveNotifUsernames(names);
          recipients = resolved.recipients;
          unknown = resolved.unknown;
        } else {
          const { users } = await listNotifOptedIn(500);
          recipients = users.filter(u => u.userId).map(u => ({ username: u.username, userId: u.userId }));
        }

        if (!recipients.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: unknown.length
              ? `No known users among: ${unknown.join(', ')}`
              : 'No recipients — nobody has opted in yet',
          });
        }

        try {
          const entry = await sendNotifications({
            title: input.title,
            body: input.body,
            link: input.link?.trim() || undefined,
            recipients,
            audience: input.audience,
            by,
          });
          return { ...entry, unknown };
        } catch (e: any) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: e?.message ?? 'Send failed' });
        }
      }),

    notifySendLog: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(25).optional() }).optional())
      .query(async ({ input }) => {
        return await listNotifSendLog(input?.limit ?? 10);
      }),

    getUser: adminProcedure
      .input(z.string())
      .query(async ({ input }) => {
        // Accepts "carol" or "u/carol" — see resolveUsername. `username` is
        // echoed back as the canonical stored key so the caller can retarget
        // subsequent writes (setCredits, reset, ...) at the record it just read.
        const resolved = await resolveUsername(input);
        if (!resolved) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input}" not found` });
        const user = await getUser(resolved);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input}" not found` });
        return { ...user, username: resolved };
      }),

    getUserRoster: adminProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const target = (await resolveUsername(input)) ?? input;
        const ids = await getUserRoster(target);
        const lineup = await getUserLineup(target);
        const idToRole = new Map(Object.entries(lineup).map(([role, id]) => [id, role]));
        const players = await Promise.all(ids.map(id => getPlayer(id)));
        return players.filter(Boolean).map(p => ({ ...p, lineupRole: idToRole.get(p!.id) ?? null }));
      }),

    // Repairs players corrupted by the game-over re-send bug: strips duplicate
    // abilities and (opt-in) clamps provably impossible stat bonuses. Pass a
    // username to sweep that user's whole roster, or a playerId for one record.
    // `dryRun` reports what would change without writing.
    repairPlayers: adminProcedure
      .input(z.object({
        username: z.string().optional(),
        playerId: z.number().int().positive().optional(),
        clampStats: z.boolean().default(false),
        dryRun: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        if (!input.username && !input.playerId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Provide a username or a playerId' });
        }
        const ids = input.playerId
          ? [input.playerId]
          : await getUserRoster(input.username!);
        const opts = { clampStats: input.clampStats, dryRun: input.dryRun };
        const reports = (await Promise.all(ids.map(id => repairPlayerRecord(id, opts)))).filter(Boolean);
        const affected = reports.filter(r => r!.changed);
        return {
          dryRun: input.dryRun,
          scanned: reports.length,
          affected: affected.length,
          duplicatesRemoved: affected.reduce((n, r) => n + r!.duplicatesRemoved.length, 0),
          statsInflated: reports.filter(r => r!.statsInflated).length,
          players: affected,
        };
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
          // Clear the weekly Challenge Me gate so the reset user can post again.
          redis.del(challengePostKey(input)),
          // Wipe current-period mission progress + awards so the reset
          // user starts truly fresh. Past-period hashes (if any) TTL out
          // on their own within 10–21 days.
          resetUserMissions(input),
        ]);
        return { success: true };
      }),

    listUsers: adminProcedure
      .input(z.object({ offset: z.number().int().min(0).default(0), limit: z.number().int().positive().max(500).default(100) }))
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

    // Build stamp of the SERVER bundle. Compared against the client stamp by
    // the `version` debug command to catch stale/partial deploys.
    version: adminProcedure.query(async () => ({
      version: typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "unknown",
      builtAt: typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "unknown",
      nodeEnv: typeof process !== "undefined" ? (process.env.NODE_ENV ?? "unknown") : "unknown",
    })),

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

    // Battle-pass management — fetch / grant / revoke for any user.
    // Grant behaves like a real purchase (credit grant, founder flag,
    // ledger entry tagged with admin's username). Revoke clears the
    // season record but leaves credits and the founder flag alone.
    getUserPass: adminProcedure
      .input(z.string())
      .query(async ({ input }) => await getMyPass((await resolveUsername(input)) ?? input)),

    grantPass: adminProcedure
      .input(z.object({ username: z.string(), tier: z.enum(['basic', 'premium']) }))
      .mutation(async ({ input, ctx }) => {
        return await adminGrantPass(input.username, input.tier, ctx.adminUsername);
      }),

    revokePass: adminProcedure
      .input(z.string())
      .mutation(async ({ input, ctx }) => {
        return await adminRevokePass(input, ctx.adminUsername);
      }),

    // Re-issues the FOUNDER Reddit flair for a user whose original
    // grant didn't land. Safe to call even when flairGranted is already
    // true — Reddit just re-sets the same flair.
    retryFlair: adminProcedure
      .input(z.string())
      .mutation(async ({ input }) => await retryFounderFlair(input)),

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

    // Missions — catalog (global)
    getMissionCatalog: adminProcedure.query(async () => ({
      catalog: await getMissionCatalog(),
      defaults: DEFAULT_MISSION_CATALOG,
    })),

    setMissionCatalog: adminProcedure
      .input(z.object({
        daily: z.array(z.any()),
        weekly: z.array(z.any()),
      }))
      .mutation(async ({ input }) => {
        await setMissionCatalog(input as { daily: MissionDef[]; weekly: MissionDef[] });
        return { success: true };
      }),

    updateMissionDef: adminProcedure
      .input(z.object({
        id: z.string(),
        label: z.string().optional(),
        sub: z.string().optional(),
        reward: z.number().int().min(0).optional(),
        total: z.number().int().min(1).optional(),
        accent: z.enum(['cyan', 'magenta', 'gold', 'ink']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updateMissionDef(id, updates);
        return { success: true };
      }),

    moveMissionType: adminProcedure
      .input(z.object({ id: z.string(), toType: z.enum(['daily', 'weekly']) }))
      .mutation(async ({ input }) => {
        await moveMissionType(input.id, input.toType);
        return { success: true };
      }),

    resetMissionCatalog: adminProcedure
      .mutation(async () => { await resetMissionCatalog(); return { success: true }; }),

    // Missions — per-user
    getUserMissions: adminProcedure
      .input(z.string())
      .query(async ({ input }) => {
        // Accepts "carol" or "u/carol" - see resolveUsername. Read and write
        // must use the SAME resolved key or progress lands on a phantom user.
        const target = (await resolveUsername(input)) ?? input;
        const user = await getUser(target);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input}" not found` });
        return listMissions(target);
      }),

    resetUserMissions: adminProcedure
      .input(z.string())
      .mutation(async ({ input }) => {
        const target = (await resolveUsername(input)) ?? input;
        const user = await getUser(target);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input}" not found` });
        await resetUserMissions(target);
        return { success: true };
      }),

    setMissionProgress: adminProcedure
      .input(z.object({
        username: z.string(),
        type: z.enum(['daily', 'weekly']),
        missionId: z.string(),
        progress: z.number().int().min(0),
      }))
      .mutation(async ({ input }) => {
        const target = (await resolveUsername(input.username)) ?? input.username;
        const user = await getUser(target);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input.username}" not found` });
        await adminSetMissionProgress(target, input.type, input.missionId, input.progress);
        return { success: true };
      }),

    completeMission: adminProcedure
      .input(z.object({
        username: z.string(),
        type: z.enum(['daily', 'weekly']),
        missionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const target = (await resolveUsername(input.username)) ?? input.username;
        const user = await getUser(target);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input.username}" not found` });
        return await adminCompleteMission(target, input.type, input.missionId);
      }),

    completeBpMission: adminProcedure
      .input(z.object({ username: z.string(), missionId: z.string() }))
      .mutation(async ({ input }) => {
        const target = (await resolveUsername(input.username)) ?? input.username;
        const user = await getUser(target);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${input.username}" not found` });
        return await adminCompleteBpMission(target, input.missionId);
      }),

    getBpMissions: adminProcedure
      .input(z.string())
      .query(async ({ input: username }) => {
        const target = (await resolveUsername(username)) ?? username;
        const user = await getUser(target);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: `User "${username}" not found` });
        return { missions: await listBpMissions(target), catalog: BP_MISSIONS };
      }),
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

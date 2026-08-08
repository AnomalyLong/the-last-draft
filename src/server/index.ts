import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';

import { createServer, getServerPort, redis, reddit } from '@devvit/web/server';
import type { PaymentHandlerResponse } from '@devvit/web/server';
import type { Order } from '@devvit/web/shared';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';
import { appRouter } from './trpc';
import { createContext } from './context';
import { userKey, ledgerKey, gamesKey, getUser, computeEnergy, MAX_ENERGY, USERS_INDEX_KEY } from './core/user';
import { fulfillPass, refundPass, getMyPass, adminGrantPass, adminRevokePass, retryFounderFlair, type PassTier } from './core/battlePass';
import { rosterKey, lineupKey, getUserRoster, getPlayer, playerKey } from './core/player';
import { challengePostKey } from './core/post';
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
} from './core/missions';

const app = new Hono();

const api = new Hono();
api.use(
  '/trpc/*',
  trpcServer({
    endpoint: '/api/trpc',
    router: appRouter,
    createContext,
  })
);

const internal = new Hono();
internal.route('/menu', menu);
internal.route('/triggers', triggers);

// ── Devvit Payments handlers ────────────────────────────────────────────
// Devvit calls these by URL (configured in devvit.json) after the user
// completes a purchase. The Order body does NOT carry a userId field —
// we identify the buyer via reddit.getCurrentUsername() inside the
// request scope, same as our tRPC procedures.
internal.post('/payments/fulfill', async (c) => {
  const order = await c.req.json<Order>();
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json<PaymentHandlerResponse>({
      success: false,
      reason: 'Unable to identify purchaser',
    });
  }
  const result = await fulfillPass(order, username);
  return c.json<PaymentHandlerResponse>(result);
});

internal.post('/payments/refund', async (c) => {
  const order = await c.req.json<Order>();
  const username = await reddit.getCurrentUsername();
  if (!username) {
    // Don't fail the refund flow if we can't resolve the user — just
    // return success so Devvit moves on. The user already got their
    // money back via Reddit; the pass record will be cleared next time
    // the user touches the app.
    return c.json<PaymentHandlerResponse>({ success: true });
  }
  const result = await refundPass(order, username);
  return c.json<PaymentHandlerResponse>(result);
});

app.route('/api', api);
app.route('/internal', internal);

// Dev-only admin REST API — not registered in production
if (process.env.NODE_ENV !== 'production') {
  const devAdmin = new Hono();

  // TEMPORARY: one-shot migration trigger. Remove from this file once the
  // backfill has been run in dev — the migration file at
  // src/server/migrations/0001-add-player-skin-colors.ts remains as the
  // permanent record. See migrations/README.md for the convention.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  devAdmin.post('/migrate/0001', async (c) => {
    const { up } = await import('./migrations/0001-add-player-skin-colors');
    const result = await up();
    return c.json(result);
  });

  // Returns up to 500 most-recently-seen usernames (newest first). Powers
  // the dev-tools admin autocomplete + browse list.
  devAdmin.get('/users', async (c) => {
    const limit = Math.min(500, Math.max(1, Number(c.req.query('limit')) || 200));
    const total = await redis.zCard(USERS_INDEX_KEY);
    if (total === 0) return c.json({ users: [], total: 0 });
    const start = Math.max(0, total - limit);
    const stop = total - 1;
    const raw: any[] = (await redis.zRange(USERS_INDEX_KEY, start, stop)) as any;
    const users = (raw.map((m: any) => typeof m === 'object' ? m.member : m) as string[]).reverse();
    return c.json({ users, total });
  });

  devAdmin.get('/user/:username', async (c) => {
    const user = await getUser(c.req.param('username'));
    if (!user) return c.json({ error: 'User not found' }, 404);
    // The stored `energy` field is only accurate as of the last write —
    // energy regens 1/hour and is normalized lazily in deductEnergy. Surface
    // the regen-adjusted value so the panel matches what the player actually
    // has (and matches the analytics low-energy count). `energyStored` is
    // kept for debugging the raw hash value.
    return c.json({
      ...user,
      energy: computeEnergy(user.energy, user.energyUpdatedAt),
      energyStored: user.energy,
    });
  });

  devAdmin.post('/user/:username/reset', async (c) => {
    const u = c.req.param('username');
    await Promise.all([
      redis.del(userKey(u)),
      redis.del(gamesKey(u)),
      redis.del(ledgerKey(u)),
      redis.del(rosterKey(u)),
      redis.del(lineupKey(u)),
      redis.del(challengePostKey(u)),
      // Wipe current-period mission progress + awards too.
      resetUserMissions(u),
    ]);
    return c.json({ success: true });
  });

  devAdmin.post('/user/:username/energy', async (c) => {
    await redis.hSet(userKey(c.req.param('username')), {
      energy: String(MAX_ENERGY),
      energyUpdatedAt: String(Date.now()),
    });
    return c.json({ success: true });
  });

  devAdmin.post('/user/:username/credits', async (c) => {
    const { credits } = await c.req.json<{ credits: number }>();
    await redis.hSet(userKey(c.req.param('username')), { credits: String(credits) });
    return c.json({ success: true });
  });

  // ── Founders Pass (admin) ─────────────────────────────────
  // Same operations as the tRPC admin.{getUserPass,grantPass,revokePass}
  // procedures, exposed as REST for the dev-tools AdminStory panel.
  devAdmin.get('/user/:username/pass', async (c) => {
    const pass = await getMyPass(c.req.param('username'));
    return c.json(pass);
  });

  devAdmin.post('/user/:username/pass/grant', async (c) => {
    const { tier } = await c.req.json<{ tier: PassTier }>();
    if (tier !== 'basic' && tier !== 'premium') {
      return c.json({ error: 'tier must be "basic" or "premium"' }, 400);
    }
    const result = await adminGrantPass(c.req.param('username'), tier, 'dev-admin');
    return c.json(result);
  });

  devAdmin.post('/user/:username/pass/revoke', async (c) => {
    const result = await adminRevokePass(c.req.param('username'), 'dev-admin');
    return c.json(result);
  });

  // Re-attempts the FOUNDER flair write for a user whose original grant
  // had `flairGranted: '0'` (network blip, missing perms, user not in
  // r/lastdraftgame at time of purchase, etc.).
  devAdmin.post('/user/:username/pass/retry-flair', async (c) => {
    const result = await retryFounderFlair(c.req.param('username'));
    return c.json(result);
  });

  // Roster inspection — returns each owned player's id, name, position-less
  // record, draft ability, and the persisted `abilities` array (level-up extras).
  devAdmin.get('/user/:username/roster', async (c) => {
    const ids = await getUserRoster(c.req.param('username'));
    const players = (await Promise.all(ids.map(getPlayer))).filter(Boolean);
    return c.json({ players });
  });

  // Overwrites a player's persisted `abilities` array (the level-up extras
  // stored on the player hash). Body: { abilities: PlayerAbility[] }.
  // Pass an empty array to clear everything, or a deduped list to fix
  // accidental duplicates from the old pickLevelUpChoices bug.
  devAdmin.post('/player/:id/abilities', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isFinite(id)) return c.json({ error: 'Bad player id' }, 400);
    const { abilities } = await c.req.json<{ abilities: unknown[] }>();
    if (!Array.isArray(abilities)) return c.json({ error: 'abilities must be an array' }, 400);
    await redis.hSet(playerKey(id), { abilities: JSON.stringify(abilities) });
    return c.json({ success: true });
  });

  devAdmin.get('/games/pending', async (c) => {
    const games = await redis.zRange('games:pending', -50, -1);
    return c.json({ games: games.reverse() });
  });

  devAdmin.get('/games/flagged', async (c) => {
    const games = await redis.zRange('games:flagged', -50, -1);
    return c.json({ games: games.reverse() });
  });

  devAdmin.delete('/games/pending', async (c) => {
    await redis.del('games:pending');
    return c.json({ success: true });
  });

  devAdmin.delete('/games/flagged', async (c) => {
    await redis.del('games:flagged');
    return c.json({ success: true });
  });

  // ── Missions ──────────────────────────────────────────────
  devAdmin.get('/missions/catalog', async (c) => {
    return c.json({ catalog: await getMissionCatalog(), defaults: DEFAULT_MISSION_CATALOG });
  });

  devAdmin.post('/missions/catalog', async (c) => {
    const body = await c.req.json();
    await setMissionCatalog(body);
    return c.json({ success: true });
  });

  devAdmin.post('/missions/catalog/update', async (c) => {
    const body = await c.req.json<{ id: string } & Partial<Record<string, unknown>>>();
    const { id, ...updates } = body;
    await updateMissionDef(id, updates as any);
    return c.json({ success: true });
  });

  devAdmin.post('/missions/catalog/move', async (c) => {
    const body = await c.req.json<{ id: string; toType: 'daily' | 'weekly' }>();
    await moveMissionType(body.id, body.toType);
    return c.json({ success: true });
  });

  devAdmin.post('/missions/catalog/reset', async (c) => {
    await resetMissionCatalog();
    return c.json({ success: true });
  });

  // Helper — REST mission routes operate on per-user state; reject names
  // with no user record so admins don't get phantom data back.
  const requireExistingUser = async (username: string) => {
    const user = await getUser(username);
    if (!user) throw new Error(`User "${username}" not found`);
  };

  devAdmin.get('/user/:username/missions', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    const data = await listMissions(username);
    return c.json(data);
  });

  devAdmin.post('/user/:username/missions/reset', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    await resetUserMissions(username);
    return c.json({ success: true });
  });

  devAdmin.post('/user/:username/missions/set', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    const body = await c.req.json<{ type: 'daily' | 'weekly'; missionId: string; progress: number }>();
    await adminSetMissionProgress(username, body.type, body.missionId, body.progress);
    return c.json({ success: true });
  });

  devAdmin.post('/user/:username/missions/complete', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    const body = await c.req.json<{ type: 'daily' | 'weekly'; missionId: string }>();
    const result = await adminCompleteMission(username, body.type, body.missionId);
    return c.json(result);
  });

  devAdmin.post('/user/:username/missions/claim', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    const body = await c.req.json<{ type: 'daily' | 'weekly'; missionId: string }>();
    try {
      const result = await claimMission(username, body.type, body.missionId);
      return c.json(result);
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  // ── BP Missions (dev-admin) ────────────────────────────────────────────────
  devAdmin.get('/user/:username/missions/pass', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    return c.json(await listBpMissions(username));
  });

  devAdmin.post('/user/:username/missions/pass/complete', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    const body = await c.req.json<{ missionId: string }>();
    try {
      return c.json(await adminCompleteBpMission(username, body.missionId));
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  devAdmin.post('/user/:username/missions/pass/claim', async (c) => {
    const username = c.req.param('username');
    try { await requireExistingUser(username); }
    catch (e: any) { return c.json({ error: e.message }, 404); }
    const body = await c.req.json<{ missionId: string }>();
    try {
      return c.json(await claimBpMission(username, body.missionId));
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  });

  app.route('/dev-admin', devAdmin);
}

serve({
  fetch: app.fetch,
  createServer: createServer,
  port: getServerPort(),
});

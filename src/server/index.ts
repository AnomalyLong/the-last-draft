import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';

import { createServer, getServerPort, redis } from '@devvit/web/server';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';
import { appRouter } from './trpc';
import { createContext } from './context';
import { userKey, ledgerKey, gamesKey, getUser, MAX_ENERGY } from './core/user';
import { rosterKey, lineupKey } from './core/player';

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

app.route('/api', api);
app.route('/internal', internal);

// Dev-only admin REST API — not registered in production
if (process.env.NODE_ENV !== 'production') {
  const devAdmin = new Hono();

  devAdmin.get('/user/:username', async (c) => {
    const user = await getUser(c.req.param('username'));
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
  });

  devAdmin.post('/user/:username/reset', async (c) => {
    const u = c.req.param('username');
    await Promise.all([
      redis.del(userKey(u)),
      redis.del(gamesKey(u)),
      redis.del(ledgerKey(u)),
      redis.del(rosterKey(u)),
      redis.del(lineupKey(u)),
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

  app.route('/dev-admin', devAdmin);
}

serve({
  fetch: app.fetch,
  createServer: createServer,
  port: getServerPort(),
});

// Migration 0001 — add `palette` field to every existing player hash.
//
// Adds visual variety to player sprites (skin / hair / beard combos) for
// rows that were minted before SKIN_PALETTES existed. New mints already get
// a palette assigned at draft time; this only touches legacy data.
//
// Idempotent: skips any player that already has a palette set.
//
// HOW TO RUN (dev):
//   1. Temporarily expose `up()` in src/server/index.ts inside the
//      `NODE_ENV !== 'production'` block:
//
//        import { up as up0001 } from './migrations/0001-add-player-skin-colors';
//        devAdmin.post('/migrate/0001', async (c) => c.json(await up0001()));
//
//   2. `devvit playtest`, hit `/dev-admin/migrate/0001` via the admin panel.
//   3. Remove the temporary route in the same PR. This file stays as the
//      historical record.

import { redis } from '@devvit/web/server';
import { USERS_INDEX_KEY } from '../core/user';
import { getUserRoster, playerKey } from '../core/player';
import { SKIN_PALETTES } from '../../shared/palettes';

export const meta = {
  id: '0001-add-player-skin-colors',
  date: '2026-06-15',
  author: 'AfternoonNo3552',
  description:
    'Backfill the `palette` field on every existing player hash. ' +
    'New field added in the same PR; new mints set it at draft time. ' +
    'Without this backfill, every pre-existing player would render as ' +
    'person1 (palette 0) instead of the intended random variety.',
  keys: ['player:{id}'],
};

export async function up(): Promise<{ scanned: number; migrated: number }> {
  // zRange returns either {member, score}[] (Devvit 0.13+) or string[].
  const raw: any[] = (await redis.zRange(USERS_INDEX_KEY, 0, -1)) as any;
  const usernames: string[] = raw.map((m: any) => typeof m === 'object' ? m.member : m);

  let scanned = 0;
  let migrated = 0;

  for (const username of usernames) {
    const ids = await getUserRoster(username);
    let userMigrated = 0;
    for (const id of ids) {
      scanned++;
      const existing = await redis.hGet(playerKey(id), 'palette');
      // Idempotent: skip rows that already have a palette.
      if (typeof existing === 'string' && existing.length > 0) continue;
      const idx = Math.floor(Math.random() * SKIN_PALETTES.length);
      await redis.hSet(playerKey(id), { palette: String(idx) });
      userMigrated++;
      migrated++;
    }
    console.log(`[migrate 0001] ${username}: migrated ${userMigrated}/${ids.length} players`);
  }

  console.log(`[migrate 0001] done — scanned ${scanned}, migrated ${migrated}`);
  return { scanned, migrated };
}

// Migration 0002 — add `founder` field to every user hash.
//
// Documentation-only. The reader (parseUser in core/user.ts) defensively
// defaults `founder` to 0 for any row that lacks the field, so no
// backfill is strictly required — existing users automatically read as
// non-founders, which is the correct semantic. This file exists to
// keep the migrations log chronological per the convention in
// src/server/migrations/README.md.
//
// The field is only ever written to '1' (never '0') — see
// `redis.hSetNX(userKey, 'founder', '1')` inside fulfillPass() in
// src/server/core/battlePass.ts. New users mint with the field absent;
// existing users gain it the first time they buy any Founders Pass.
//
// HOW TO RUN (dev): N/A. The optional `up()` below pre-writes '0' on
// every existing user for cleanliness, but skipping it is safe.
//   import { up as up0002 } from './migrations/0002-add-user-founder-field';
//   devAdmin.post('/migrate/0002', async (c) => c.json(await up0002()));

import { redis } from '@devvit/web/server';
import { USERS_INDEX_KEY, userKey } from '../core/user';

export const meta = {
  id: '0002-add-user-founder-field',
  date: '2026-06-19',
  author: 'AfternoonNo3552',
  description:
    'Add `founder` flag (0|1) to user:{username} hash. Set to "1" by ' +
    'fulfillPass() when a user buys any Founders Pass tier. Reader ' +
    'defaults to 0, so no backfill is required — this file is a paper ' +
    'trail entry only.',
  keys: ['user:{username}'],
};

export async function up(): Promise<{ scanned: number; migrated: number }> {
  const raw: any[] = (await redis.zRange(USERS_INDEX_KEY, 0, -1)) as any;
  const usernames: string[] = raw.map((m: any) => typeof m === 'object' ? m.member : m);

  let scanned = 0;
  let migrated = 0;

  for (const username of usernames) {
    scanned++;
    const existing = await redis.hGet(userKey(username), 'founder');
    if (typeof existing === 'string' && existing.length > 0) continue;
    await redis.hSet(userKey(username), { founder: '0' });
    migrated++;
  }

  return { scanned, migrated };
}

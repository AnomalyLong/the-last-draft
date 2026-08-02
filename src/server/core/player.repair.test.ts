import { expect } from 'vitest';
import { redis } from '@devvit/web/server';
import { test } from '../test';
import { playerKey, repairPlayerRecord, updatePlayerProgress } from './player';

const DUNK = { name: 'DUNK MASTER', rarity: 3 };
const SNIPER = { name: 'SNIPER', rarity: 2 };

// Writes a minimal player hash directly, bypassing mintPlayer so each test can
// set up the exact corrupt state it wants to repair. Deliberately writes NO
// `id` field, because mintPlayer doesn't either — the id lives in the redis
// key. An earlier version of this helper set `id`, which hid a guard bug that
// made repairPlayerRecord a no-op on every real player.
const seedPlayer = async (
  id: number,
  fields: { level?: number; abilities?: unknown[]; statBonuses?: Record<string, number> } = {},
) => {
  await redis.hSet(playerKey(id), {
    owner: 'tester',
    name: `Player ${id}`,
    level: String(fields.level ?? 1),
    xp: '0',
    abilities: JSON.stringify(fields.abilities ?? []),
    statBonuses: JSON.stringify(fields.statBonuses ?? { spd: 0, dex: 0, jmp: 0, acc: 0 }),
  });
};

const storedAbilities = async (id: number) =>
  JSON.parse((await redis.hGet(playerKey(id), 'abilities')) ?? '[]');

test('updatePlayerProgress does not duplicate a re-sent ability', async () => {
  await seedPlayer(1);

  // Simulates the bug: the client re-sends the same earned ability at the end
  // of every subsequent game because its ref was never cleared.
  for (let i = 0; i < 5; i++) {
    await updatePlayerProgress(1, { level: 2, xp: 0, addAbilities: [DUNK] });
  }

  expect(await storedAbilities(1)).toEqual([DUNK]);
});

test('updatePlayerProgress still appends genuinely new abilities', async () => {
  await seedPlayer(2);
  await updatePlayerProgress(2, { level: 2, xp: 0, addAbilities: [DUNK] });
  await updatePlayerProgress(2, { level: 3, xp: 0, addAbilities: [DUNK, SNIPER] });

  expect(await storedAbilities(2)).toEqual([DUNK, SNIPER]);
});

test('updatePlayerProgress heals an already-duplicated stored list', async () => {
  await seedPlayer(3, { abilities: [DUNK, DUNK, DUNK] });
  await updatePlayerProgress(3, { level: 4, xp: 0, addAbilities: [SNIPER] });

  expect(await storedAbilities(3)).toEqual([DUNK, SNIPER]);
});

test('repairPlayerRecord strips duplicates and reports them', async () => {
  await seedPlayer(4, { level: 5, abilities: [DUNK, DUNK, SNIPER, DUNK, DUNK] });

  const report = await repairPlayerRecord(4);

  expect(report?.changed).toBe(true);
  expect(report?.abilitiesBefore).toBe(5);
  expect(report?.abilitiesAfter).toBe(2);
  expect(report?.duplicatesRemoved).toEqual(['DUNK MASTER', 'DUNK MASTER', 'DUNK MASTER']);
  expect(await storedAbilities(4)).toEqual([DUNK, SNIPER]);
});

test('repairPlayerRecord dryRun reports without writing', async () => {
  await seedPlayer(5, { level: 5, abilities: [DUNK, DUNK] });

  const report = await repairPlayerRecord(5, { dryRun: true });

  expect(report?.changed).toBe(true);
  expect(report?.abilitiesAfter).toBe(1);
  // Store must be untouched.
  expect(await storedAbilities(5)).toEqual([DUNK, DUNK]);
});

test('repairPlayerRecord leaves a clean record alone', async () => {
  await seedPlayer(6, { level: 3, abilities: [DUNK, SNIPER], statBonuses: { spd: 4, dex: 0, jmp: 0, acc: 2 } });

  const report = await repairPlayerRecord(6, { clampStats: true });

  expect(report?.changed).toBe(false);
  expect(report?.statsInflated).toBe(false);
  expect(await storedAbilities(6)).toEqual([DUNK, SNIPER]);
});

test('repairPlayerRecord flags stat bonuses above the provable ceiling', async () => {
  // Level 3 → at most 2 level-ups → at most 10 points. 40 is impossible.
  await seedPlayer(7, { level: 3, statBonuses: { spd: 20, dex: 10, jmp: 5, acc: 5 } });

  const report = await repairPlayerRecord(7);

  expect(report?.statPoints).toBe(40);
  expect(report?.statPointsMax).toBe(10);
  expect(report?.statsInflated).toBe(true);
  // Not clamped unless explicitly asked — clamping is lossy.
  expect(report?.statsClamped).toBe(false);
  expect(report?.statBonusesAfter).toEqual({ spd: 20, dex: 10, jmp: 5, acc: 5 });
});

test('repairPlayerRecord clamps inflated stats proportionally when asked', async () => {
  await seedPlayer(8, { level: 3, statBonuses: { spd: 20, dex: 10, jmp: 5, acc: 5 } });

  const report = await repairPlayerRecord(8, { clampStats: true });

  expect(report?.statsClamped).toBe(true);
  const after = report!.statBonusesAfter;
  const total = after.spd + after.dex + after.jmp + after.acc;
  expect(total).toBeLessThanOrEqual(10);
  // Proportions preserved: spd was half the total, so it stays the largest.
  expect(after.spd).toBe(5);
  expect(JSON.parse((await redis.hGet(playerKey(8), 'statBonuses')) ?? '{}')).toEqual(after);
});

// Regression: player hashes written by mintPlayer have no `id` field. The
// repair must key off `owner` (as getPlayer does) or it silently skips
// every real player and reports "scanned 0".
test('repairPlayerRecord repairs a hash with no id field (mintPlayer shape)', async () => {
  await redis.hSet(playerKey(42), {
    owner: 'tester',
    name: 'VOSS WARD',
    level: '2',
    xp: '0',
    abilities: JSON.stringify([DUNK, DUNK, DUNK, DUNK, DUNK]),
  });

  const report = await repairPlayerRecord(42);

  expect(report).not.toBeNull();
  expect(report?.abilitiesBefore).toBe(5);
  expect(report?.abilitiesAfter).toBe(1);
  expect(await storedAbilities(42)).toEqual([DUNK]);
});

test('repairPlayerRecord returns null for a player that does not exist', async () => {
  expect(await repairPlayerRecord(999_999)).toBeNull();
});

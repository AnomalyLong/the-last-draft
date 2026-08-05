import { describe, it, expect } from 'vitest';
// @ts-expect-error — JS module, no d.ts (same pattern as the rest of the client)
import { rollAbilities, rollAbilityForPlayer, abilityWeight } from './abilityRoll.js';
// @ts-expect-error — JS module
import { ABILITIES } from './abilities.js';
import { MAX_ABILITIES, countOwnedAbilities } from './shared/abilities';

const names = (as: { name: string }[]) => as.map(a => a.name);

describe('rollAbilities', () => {
  it('returns the requested count, all distinct, over many rolls', () => {
    for (let i = 0; i < 500; i += 1) {
      const got = rollAbilities(2, 68);
      expect(got).toHaveLength(2);
      expect(new Set(names(got)).size).toBe(2);
    }
  });

  it('never exceeds MAX_ABILITIES even when asked for more', () => {
    const got = rollAbilities(99, 80);
    expect(got).toHaveLength(MAX_ABILITIES);
    // The whole point of the clamp: a roster row built from this must not read
    // as over-cap, or useGame's level-up path mis-branches.
    expect(countOwnedAbilities({ abilities: got }, [])).toBe(MAX_ABILITIES);
  });

  it('returns real ABILITIES entries, not fabricated ones', () => {
    const pool = new Set(names(ABILITIES));
    for (const a of rollAbilities(3, 70)) expect(pool.has(a.name)).toBe(true);
  });

  it('handles 0 and negative counts', () => {
    expect(rollAbilities(0, 70)).toEqual([]);
    expect(rollAbilities(-1, 70)).toEqual([]);
  });

  it('can draw every ability at least once (no dead entries in the table)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i += 1) for (const a of rollAbilities(3, 72)) seen.add(a.name);
    expect(seen.size).toBe(ABILITIES.length);
  });
});

describe('abilityWeight', () => {
  it('makes legendaries scarcer than commons at every OVR tier', () => {
    const legendary = ABILITIES.find((a: { rarity: number }) => a.rarity === 3)!;
    const common    = ABILITIES.find((a: { rarity: number }) => a.rarity === 1)!;
    for (const ovr of [60, 70, 75, 90]) {
      expect(abilityWeight(legendary, ovr)).toBeLessThan(abilityWeight(common, ovr));
    }
  });

  it('rewards higher OVR with better legendary odds', () => {
    const legendary = ABILITIES.find((a: { rarity: number }) => a.rarity === 3)!;
    expect(abilityWeight(legendary, 69)).toBeLessThan(abilityWeight(legendary, 70));
    expect(abilityWeight(legendary, 70)).toBeLessThan(abilityWeight(legendary, 75));
  });
});

describe('rollAbilityForPlayer (draft behaviour, unchanged)', () => {
  it('always rolls something at OVR 76+ (chance gate is skipped)', () => {
    for (let i = 0; i < 200; i += 1) expect(rollAbilityForPlayer(76)).not.toBeNull();
  });

  it('sometimes rolls nothing for low-OVR players', () => {
    const results = Array.from({ length: 400 }, () => rollAbilityForPlayer(60));
    expect(results.some(r => r === null)).toBe(true);
    expect(results.some(r => r !== null)).toBe(true);
  });
});

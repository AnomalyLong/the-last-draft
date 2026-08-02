import { describe, expect, it } from 'vitest';
import {
  MAX_ABILITIES,
  abilitiesAreMaxed,
  countOwnedAbilities,
  ownedAbilityNames,
} from './abilities';

const DUNK = { name: 'DUNK MASTER' };
const SNIPER = { name: 'SNIPER' };
const ANKLE = { name: 'ANKLE BREAKER' };
const WALL = { name: 'BRICK WALL' };

describe('countOwnedAbilities', () => {
  it('counts abilities earned in previous games, not just this session', () => {
    // The bug: a player who earned 3 abilities across earlier games looked
    // "empty" because only the session ref was consulted, so they kept being
    // offered — and granted — more every match.
    const roster = { role: 'PG', ability: null, abilities: [DUNK, SNIPER, ANKLE] };
    expect(countOwnedAbilities(roster, [])).toBe(3);
    expect(abilitiesAreMaxed(roster, [])).toBe(true);
  });

  it('combines the drafted ability with persisted and session grants', () => {
    const roster = { role: 'SG', ability: DUNK, abilities: [SNIPER] };
    expect(countOwnedAbilities(roster, [ANKLE])).toBe(3);
  });

  it('does not double-count a drafted ability that is also in abilities', () => {
    // mintPlayer writes the drafted ability into `ability`, and level-up saves
    // can land the same name in `abilities`. Counting both would cap a player
    // who actually still has slots free.
    const roster = { role: 'C', ability: DUNK, abilities: [DUNK] };
    expect(countOwnedAbilities(roster, [])).toBe(1);
    expect(abilitiesAreMaxed(roster, [])).toBe(false);
  });

  it('does not double-count a session grant already persisted', () => {
    const roster = { role: 'SF', ability: null, abilities: [DUNK] };
    expect(countOwnedAbilities(roster, [DUNK])).toBe(1);
  });

  it('treats a missing roster entry as zero rather than throwing', () => {
    expect(countOwnedAbilities(null, [])).toBe(0);
    expect(countOwnedAbilities(undefined, [DUNK])).toBe(1);
  });

  it('ignores malformed entries without a name', () => {
    const roster = { role: 'PF', abilities: [DUNK, {} as { name: string }] };
    expect(countOwnedAbilities(roster, [])).toBe(1);
  });

  it('reports maxed only at the cap', () => {
    const roster = { role: 'PG', abilities: [DUNK, SNIPER] };
    expect(abilitiesAreMaxed(roster, [])).toBe(false);
    expect(abilitiesAreMaxed(roster, [ANKLE])).toBe(true);
    expect(MAX_ABILITIES).toBe(3);
  });
});

describe('ownedAbilityNames', () => {
  it('feeds the offer filter so owned abilities are never offered again', () => {
    const roster = { role: 'PG', ability: DUNK, abilities: [SNIPER] };
    const owned = ownedAbilityNames(roster, [ANKLE]);
    expect([...owned].sort()).toEqual(['ANKLE BREAKER', 'DUNK MASTER', 'SNIPER']);
    expect(owned.has(WALL.name)).toBe(false);
  });
});

describe('cap holds across a multi-game career', () => {
  it('stops granting after 3 abilities even with one level-up per game', () => {
    // Reproduces the reported account: 6 games, one ability offered per game.
    // Before the fix this produced 6 distinct abilities on a single player.
    const roster: { role: string; ability: null; abilities: { name: string }[] } = {
      role: 'PG',
      ability: null,
      abilities: [],
    };
    const pool = [DUNK, SNIPER, ANKLE, WALL, { name: 'IRON GRIP' }, { name: 'FAST BREAK' }];

    for (const ability of pool) {
      // Each game starts fresh: no session grants carried over.
      if (!abilitiesAreMaxed(roster, [])) roster.abilities.push(ability);
    }

    expect(roster.abilities).toHaveLength(MAX_ABILITIES);
    expect(roster.abilities.map(a => a.name)).toEqual(['DUNK MASTER', 'SNIPER', 'ANKLE BREAKER']);
  });
});

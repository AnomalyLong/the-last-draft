// Ability ownership rules, kept free of React/audio imports so they can be
// unit-tested in isolation (useGame.js pulls in the whole game engine).

export const MAX_ABILITIES = 3;

export type Ability = { name: string; [k: string]: unknown };

/** A roster row as the client holds it (server record + lineup metadata). */
export type RosterEntry = {
  role?: string;
  pos?: string;
  /** The ability the player was drafted with, if any. */
  ability?: Ability | null;
  /** Abilities earned through level-ups in previous games. */
  abilities?: Ability[];
};

/**
 * Every ability name a player owns, combining:
 *   - the drafted ability on their roster record,
 *   - abilities persisted from PREVIOUS games,
 *   - abilities granted earlier in the CURRENT session.
 *
 * Deduped by name, which matters twice over: the drafted ability is frequently
 * also present in `abilities`, and a session grant can repeat a persisted one.
 */
export const ownedAbilityNames = (
  rosterEntry: RosterEntry | null | undefined,
  sessionGrants: Ability[] = [],
): Set<string> => {
  const owned = new Set<string>();
  if (rosterEntry?.ability?.name) owned.add(rosterEntry.ability.name);
  if (Array.isArray(rosterEntry?.abilities)) {
    for (const a of rosterEntry.abilities) if (a?.name) owned.add(a.name);
  }
  for (const a of sessionGrants) if (a?.name) owned.add(a.name);
  return owned;
};

/**
 * How many of the 3 ability slots are used.
 *
 * This is the single source of truth for the cap. It previously counted only
 * session grants, which ignored every ability earned in a PREVIOUS game — so a
 * player could exceed the cap by earning one ability per game across games.
 */
export const countOwnedAbilities = (
  rosterEntry: RosterEntry | null | undefined,
  sessionGrants: Ability[] = [],
): number => ownedAbilityNames(rosterEntry, sessionGrants).size;

/** True when the player has no ability slots left. */
export const abilitiesAreMaxed = (
  rosterEntry: RosterEntry | null | undefined,
  sessionGrants: Ability[] = [],
): boolean => countOwnedAbilities(rosterEntry, sessionGrants) >= MAX_ABILITIES;

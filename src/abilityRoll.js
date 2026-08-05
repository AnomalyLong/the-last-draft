// ── Ability rolling — the one place the rarity weights live ───────────────────
//
// The weight table used to be inline in DraftScreen.jsx's rollAbilityForPlayer.
// SplashCourt needs the same distribution, and a second copy of a table like
// this is exactly how the two drift (see teamPalette.js for the last time a
// duplicated derivation bit us). Both callers now import from here.
//
// Weights are a function of OVR: better players are likelier to roll the scarce
// stuff. rarity 3 = legendary (DUNK MASTER), 2 = epic, 1 = common.

import { ABILITIES } from './abilities.js';
import { MAX_ABILITIES } from './shared/abilities';

/** Selection weight for one ability at a given OVR. Verbatim from DraftScreen. */
export function abilityWeight(ability, ovr) {
  const lw = ovr >= 75 ? 15 : ovr >= 70 ? 8 : 3;   // legendary
  const ew = ovr >= 70 ? 25 : 18;                  // epic
  return ability.rarity === 3 ? lw : ability.rarity === 2 ? ew : 40;
}

function pickWeighted(entries) {
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of entries) { r -= e.w; if (r <= 0) return e; }
  return entries[entries.length - 1];
}

/**
 * The draft roll: a chance-gated single ability, or null. Unchanged behaviour —
 * sub-76 OVR players fail the chance check most of the time, which is why most
 * drafted players have no ability at all.
 */
export function rollAbilityForPlayer(ovr) {
  const bonus  = Math.max(0, Math.floor((ovr - 65) / 5)) * 0.05;
  const chance = Math.min(0.55, 0.25 + bonus);
  if (ovr < 76 && Math.random() >= chance) return null;
  const entries = ABILITIES.map(a => ({ a, w: abilityWeight(a, ovr) }));
  return pickWeighted(entries).a;
}

/**
 * `count` DISTINCT abilities, weighted by rarity, with no chance gate — for
 * cases that want a guaranteed loadout rather than a draft outcome.
 *
 * Sampling is without replacement (the chosen entry is removed before the next
 * draw) rather than reroll-until-unique, so it cannot spin even if the weight
 * table or MAX_ABILITIES changes. Clamped to MAX_ABILITIES so a caller can
 * never build a roster row that countOwnedAbilities() considers over the cap.
 */
export function rollAbilities(count, ovr = 70) {
  const n = Math.max(0, Math.min(count, MAX_ABILITIES, ABILITIES.length));
  const entries = ABILITIES.map(a => ({ a, w: abilityWeight(a, ovr) }));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const chosen = pickWeighted(entries);
    out.push(chosen.a);
    entries.splice(entries.indexOf(chosen), 1);
  }
  return out;
}

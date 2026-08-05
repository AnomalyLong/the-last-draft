// Deterministic palettes for non-persisted rosters (opponents.json bots,
// challenge teams, the debug-court fixtures, the inline splash).
//
// Extracted from App.jsx so SplashCourt can derive the SAME look for the same
// fixture roster. If these diverge, the feed splash and the sandbox court show
// different-looking players for identical data, which is exactly the kind of
// mismatch nobody notices until a screenshot comparison.

import { SKIN_PALETTES } from './constants.js';

// Same name always renders the same look. FNV-ish loop, matching the hashing
// used elsewhere for stable per-name selection.
export function paletteFromName(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h) % SKIN_PALETTES.length;
}

// Assigns a deterministic palette to each player in an opponents-style roster.
// Skips entries that already carry one (persisted rosters own their palette).
export function withDerivedPalette(players = []) {
  return players.map(p => p.palette != null ? p : { ...p, palette: paletteFromName(p.name) });
}

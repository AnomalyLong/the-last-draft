// Skin / hair / beard palette table — shared between client (sprite
// renderers) and server (mintPlayer validation, migrations).
//
// APPEND-ONLY: never reorder or remove entries. Player records store only
// the index into this list (PlayerData.palette), so reordering would
// silently change every existing player's appearance. Add new palettes to
// the end. See `src/server/migrations/README.md`.

export type SkinPalette = {
  /** Replacement for #D9A066 pixels (default skin tone) */
  skin: string;
  /** Replacement for #3E2525 pixels (default hair tone) */
  hair: string;
  /** Replacement for #B17F4C pixels (default beard tone) */
  beard: string;
};

export const SKIN_PALETTES: SkinPalette[] = [
  { skin: '#d9a066', hair: '#3e2525', beard: '#b17f4c' }, // 0 person1 (sprite atlas default)
  { skin: '#db8a5d', hair: '#e3e5a1', beard: '#c1784f' }, // 1 person2
  { skin: '#906e57', hair: '#2a1717', beard: '#725643' }, // 2 person3
  { skin: '#deb58b', hair: '#dbc12f', beard: '#c49c74' }, // 3 person4
  { skin: '#ceac8a', hair: '#2b0404', beard: '#b1906f' }, // 4 person5
];

/**
 * Resolves an index (or out-of-range / undefined) to a palette, defaulting
 * to person1. Used by every sprite renderer so old/missing palette indices
 * are safe.
 */
export const resolvePalette = (idx: number | undefined | null): SkinPalette => {
  if (idx == null) return SKIN_PALETTES[0]!;
  return SKIN_PALETTES[idx] ?? SKIN_PALETTES[0]!;
};

// Hex values used in the sprite atlases that should be remapped to a
// player's chosen palette. Anything else passes through unchanged.
export const SKIN_PIXEL  = '#D9A066';
export const HAIR_PIXEL  = '#3E2525';
export const BEARD_PIXEL = '#B17F4C';

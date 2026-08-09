// ── Card selection feedback ──────────────────────────────────────────────────
// Shared by PlayPickerOverlay and DefensePickerOverlay so "I picked that one"
// looks identical on both panels.
//
// Two signals, because either alone is ambiguous on a 300px panel:
//   1. LIFT  — the chosen card pops up out of the row. Reads at a glance even
//              in a muted feed tile, and survives being scaled down.
//   2. BLINK — a white wash + fattened border strobing ~7Hz. Reads on a still
//              frame (a screenshot / a paused GIF), where a lift alone just
//              looks like the card was always higher.
// Non-chosen cards also DIM, which is what actually makes the choice legible —
// without it all three still read as equally active.
//
// `st` is ticks since selection (useRafTick units, ~16.67ms each), NOT ticks
// since mount — the lift has an onset and must not depend on when the panel
// opened.

export const SEL_LIFT      = 8;  // px the chosen card rises
export const SEL_LIFT_TICKS = 6; // ~100ms to reach full lift
export const SEL_BLINK_TICKS = 4; // half-period → ~7.5Hz strobe
export const SEL_DIM        = 0.42; // opacity of the cards NOT chosen

// Ease-out so the pop decelerates into place instead of snapping.
export function selLift(st) {
  const t = Math.min(1, Math.max(0, st / SEL_LIFT_TICKS));
  const eased = 1 - (1 - t) * (1 - t);
  return Math.round(eased * SEL_LIFT);
}

export function selBlinkOn(st) {
  return Math.floor(st / SEL_BLINK_TICKS) % 2 === 0;
}

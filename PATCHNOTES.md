# Patch Notes

## Aug 2 – Aug 3, 2026

Covers commits `60722b6` → `68c9f03` (8 commits).

---

### Gameplay

**Stats now affect more than shooting.** Previously only ACC mattered (shot
accuracy). Three more stats now feed into outcomes:

- **JMP** tilts the opening **jump ball**. Centers with a higher JMP win the tip
  slightly more often. Equal JMP is still an exact coin flip; the effect is
  clamped so no stat gap can push it past a modest edge.
- **JMP** also tilts **block chance**, centered on a league-average of 50 — an
  average defender is unaffected, a high flyer gains a little, a low one loses a
  little.
- **SPD** and **DEX** (averaged) tilt **steal chance** the same way.

**Calling the right defense now helps you block.** When your defensive call
counters the offense's play, defenders get an additional **+5% block chance** on
that possession, on top of the existing counter effect.

Full formulas, constants, and worked examples are documented in `stats.md`.

**Away-side spin dunks fixed.** Away players were overshooting the left rim by
42px on spin dunks — the rim offset wasn't mirrored by attack direction. Net
shadow positions were also nudged inward 5px per side.

---

### Bug fixes

**Duplicate abilities (e.g. five copies of DUNK MASTER on one player).**
Two causes, both fixed:

- The client held earned abilities in a ref that was never cleared, so the same
  ability was re-sent to the server after *every* subsequent game, and the server
  appended without deduping. The client now clears those refs after a successful
  save, and the server merges by ability name instead of appending — making the
  save idempotent and self-healing on the next level-up.
- The same re-send inflated **stats**, since the server *adds* stat deltas. That
  path is closed, though already-inflated values are not retroactively corrected
  (see Known Issues).

**Six abilities on a level 2 player.** Also two causes:

- Player level was being reset to 1 at the start of every game — the real level
  was seeded into one ref but not into the state that the XP code actually read,
  so every game granted a fresh "level 2" level-up.
- The 3-ability cap only counted abilities earned *in the current session*,
  ignoring persisted ones. The offer list deduped correctly (which is why the
  abilities were all distinct rather than duplicates), but the cap did not.

Fixes: level state is now built from one shared helper at game start, the cap and
the offer filter share a single implementation (`src/shared/abilities.ts`) so they
can't drift apart again, the roster refetches after progress saves instead of only
on the Collection screen, and the server refuses to ever *lower* a stored level.

**Bottom nav clipped on mobile browsers.** Inside Reddit's iframe the game's
bottom nav sat behind the phone's gesture bar. The child iframe can't detect this
— `env(safe-area-inset-bottom)` reads 0 cross-origin, and Android Chrome reports
no OS chrome via `screen.availHeight`. The app now measures what it can and falls
back to a 72px bottom gutter when it detects an iframed touch phone. Desktop and
Farnsworth preview are unaffected (they compute 0 and render identically).

**Title strip overlapping when wrapped.** The app root sets `line-height: 0` for
sprite layout; the title strip inherited it on pages that didn't reset it, so any
wrap stacked both lines on the same baseline. Now set explicitly.

**Debug panel overflowing on mobile.** The DBG console overflowed a 390px
viewport by 18px; it now fits with long lines wrapping.

---

### Admin tools

- **Roster repair in the admin panel.** Selecting a player now shows *Scan
  Roster* / *Repair Roster* under Grant Free Drafts, with an opt-in `clamp stats`
  checkbox. Scan is read-only; Repair requires a second confirm click. Reports
  per-player, e.g. `VOSS WARD #4 — 3→1 abilities (DUNK MASTER, DUNK MASTER) ·
  stats 32/5`.
- **Abilities visible on the roster.** Each player shows an ability chip row;
  duplicates render with a red `×N` badge and a `⚠ duplicates` marker.
- **`version`** — prints client and server build stamps, flags a genuine
  mismatch, and dumps viewport/iframe diagnostics.
- **`gutter`** — shows the applied bottom gutter and every input that produced
  it (`measured` / `fallback` / `override`). `gutter 48` forces a value on that
  device instantly (no redeploy) and persists it; `gutter auto` reverts.
- **`court`** — enters a WOLVES vs HAWKS sandbox court with no game session, no
  server writes, and no energy cost.
- **`ability` / `abilities` / `clearAbilities`** — grant, list, or clear
  abilities for the current session (bypasses the 3-ability cap; draft abilities
  are preserved by `clearAbilities`).

---

### Build & tooling

- The build stamp was recomputed separately for the client and server halves of
  the build, so `version` reported a MISMATCH on every build even when both
  bundles came from the same run milliseconds apart. The stamp is now shared, and
  the comparison tolerates a small delta.
- ESLint now knows about the injected build globals (2 real `no-undef` errors
  fixed).
- New tests: ability cap/dedupe unit tests, player-repair tests using the real
  stored player shape, and Devvit test scripts —
  `carol-draft-and-play`, `bob-reset-carol`, `zz-carol-roster-state`,
  `zz-admin-roster-abilities`, `zz-admin-dupe-repair`, plus court/ability debug
  command tests. `carol-play-full-match` now rotates through play choices
  (1st → 2nd → 3rd, repeating) instead of always picking the first, and reads the
  post-game credit total from the correct element.

---

### Known issues

- **Stat inflation is not retroactively fixed.** Abilities repair cleanly
  (dedupe by name), but level-up history isn't stored, so inflated stats can only
  be proportionally clamped — which is lossy, hence the opt-in checkbox. Anything
  above `(level − 1) × 5` is provably corrupt.
- **The 72px mobile gutter is calibrated, not measured.** It's the smallest
  tested value that cleared the gesture bar; the true occlusion is somewhere in
  (48, 72]. On devices needing less, the nav floats slightly higher than
  necessary. `gutter <px>` narrows it per-device without a redeploy.
- **`player.progress` still trusts the client** for `addAbilities`. Dedupe caps
  the blast radius but doesn't close the hole; server-side validation of earned
  abilities is still outstanding.

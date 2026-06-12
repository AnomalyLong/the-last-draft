# The Last Draft — Backend Wiring TODOs

## Collection Screen Replacement ← DO THIS NEXT

Replace `CollectionScreen2` (SVG) with the new HTML/CSS collection design from `lobby/collection.jsx`.

### Context
- `src/App.jsx:222-229` renders `<CollectionScreen2>` when `scene === 'collection'`
- `lobby/collection.jsx` is the new design — HTML/CSS prototype, **not** SVG
- `LobbyScreen.jsx` and other game screens are HTML/CSS, so this is fine

### What the new design does differently
- **No `pos` on players** — position comes from a separate lineup map `{ PG: id, SG: id, … }`
- **`rarity` is a string** — `'common' | 'rare' | 'epic' | 'legendary'` (not a number)
- **OVR is computed** via `calcOvr(player, pos)` using `OVR_WEIGHTS` per slot, never stored
- **Squad bar shows lineup slots** (PG/SG/SF/PF/C) — clicking a slot selects the player in it
- **Detail panel** shows: level, XP, rarity badge, 4 stats with `+N` bonuses, all abilities
- **Actions** in detail panel: 5 position buttons (SET / SWAP / REMOVE) + AUCTION button
- **Abilities**: `ability` (initial) + `abilities[]` (from level-ups), each with name/desc/rarity color

### Steps to complete

1. **Create `src/components/CollectionScreenNew.jsx`** — port `lobby/collection.jsx` from
   `window.CollectionView` globals to a proper ES module export. Key changes:
   - Replace `const { useState } = React` globals → `import React from 'react'`
   - Replace `window.ROSTER` / `window.DEFAULT_LINEUP` mock data with props:
     `export function CollectionScreenNew({ roster = [], lineup = {}, username = '', credits = 0, onBack, onAuction })`
   - Import `ABILITIES` from `src/abilities.js` for reference (ability data comes from player objects)
   - The `ROSTER` mock and `DEFAULT_LINEUP` const can stay as fallback/dev defaults at the top

2. **Wire up in `App.jsx`**:
   - Import `CollectionScreenNew` instead of `CollectionScreen2`
   - Pass `roster` and `lineup` separately — roster from `trpc.user.roster`, lineup from `trpc.user.lineup`
   - Both are already fetched in the init effect (line 64-89); store `rawRoster` and `rawLineup` as state
   - Pass `username={username}` and `credits={serverCredits}`

3. **Update `dev-tools/stories/Collection2Story.jsx`**:
   - Rename to `CollectionNewStory.jsx` (or update in-place)
   - Replace `SAMPLE_ROSTER` with real-shaped mock data (no `pos`/`ovr`/`round` on players):
     ```js
     { id, owner, name, level, xp, source, rarity, spd, dex, jmp, acc, ability, abilities, statBonuses }
     ```
   - Add a mock `LINEUP = { PG: id, SG: id, ... }` and pass both as props
   - Update `Shell.jsx` nav label if renamed

4. **CSS**: `lobby/collection.css`, `lobby/collection-grid.css`, `lobby/mobile-collection.css` need to be
   copied or symlinked into `src/` and imported by the new component (or import directly via relative path).

### Reference files
- New design: `lobby/collection.jsx` — source of truth for components + data model
- CSS: `lobby/collection.css`, `lobby/collection-grid.css`, `lobby/mobile-collection.css`
- Data shape: `src/server/core/player.ts` → `PlayerData` type
- Position/lineup: `src/server/core/player.ts` → `getUserLineup` returns `{ PG: id, SG: id, … }`
- App wiring: `src/App.jsx:64-89` (roster+lineup load) and `:222-229` (collection scene)
- Old component (delete after): `src/components/CollectionScreen2.jsx`, `src/components/CollectionScreen.jsx`

---

## Pending

- [ ] **Energy system UI** — `game.start` deducts energy server-side but the client has no energy display and doesn't handle the "not enough energy" error. Add energy display and block game start if energy is 0.

## Matchmaking Screen Polish

- [ ] **Rank badge — elaborate emblem style** — Replace the plain "PLAT / P" text-only badge with a proper multi-layer emblem. The badge should have: (1) "RANK" label text at the top of the circle, (2) a pixel-art crown/wings insignia graphic drawn in SVG polygons per tier (Iron=shield, Bronze=axe-wings, Silver=wings, Gold=crown, Plat=gem-crown, Diamond=diamond-shape, Master=flame, Challenger=star-burst), (3) Roman numeral division (I–IV) inside or below the emblem. Each tier has its own color scheme. Reference: LoL rank badge visual, League of Legends VS arcade rank circle.

---

## Challenge Me — Symmetric Progression Refactor ← AFTER challenge feature ships

The "Create A Challenge Me" feature (mission → Reddit post → opponent's roster as the
away team) ships **asymmetric** in v1:

- Only the **challenger** plays. Only the challenger's home roster gains and **persists** XP.
- The post **owner's** roster is a *live-read, immutable* opponent snapshot. It visibly
  levels up mid-game (`useGame.js` `awardXp` away branch, ~`src/useGame.js:211`) but that
  progress is **never saved** — the game-over persistence loop is home-only
  (`src/App.jsx:448-462`) and `player.progress` rejects writes to players you don't own
  (`src/server/trpc.ts:227-229`).
- Safety is made explicit by stripping `serverId` from the away roster returned by
  `post.getChallenge`, so the opponent is structurally synthetic (like `opponents.json`),
  not merely blocked by the ownership guard.

### The refactor (symmetric)
Make challenge games progress **both** rosters — the owner's team should earn XP / W-L from
being challenged, not just the challenger's. This is a non-trivial change because the game is
currently **100% client-simulated** and only replay-verified for credits:

- [ ] Decide the authority model: server-authoritative sim, or trust the challenger's replay
      to also mutate the owner's roster (needs anti-cheat — a challenger must not be able to
      tank or inflate the owner's players).
- [ ] Generalize the persistence loop in `src/App.jsx` (currently `homeRoster.forEach`) and/or
      move progression server-side into `endGame` so the owner's `serverId`s get updated under
      the owner's identity, not the challenger's.
- [ ] Relax/rework the `player.progress` ownership guard (`src/server/trpc.ts:227-229`) for the
      challenge path, or add a dedicated server-side progression write that doesn't depend on
      the caller owning the players.
- [ ] Re-introduce `serverId` on the away challenge roster once writes are safe and intended.
- [ ] Define how owner-side level-up *choices* (ability vs stat) resolve when the owner isn't
      present — auto-pick, queue for next owner login, or deterministic server rule.

### Key files
- `src/useGame.js` — `awardXp`, home vs away level-up branches (~`:160-211`)
- `src/App.jsx` — game-over persistence loop (`:448-462`), away-team wiring (`:155-196`)
- `src/server/trpc.ts` — `player.progress` ownership guard (`:227-237`)
- `src/server/core/game.ts` — `endGame` (where server-side progression would live)
- `src/server/core/post.ts` — `getChallenge` away-roster shape (serverId stripping)

---

## Done

- [x] **Player persistence** — `draft.free` / `draft.credit` now accept stats + ability; `mintPlayer` stores them in Redis. `DraftScreen` calls `draft.free` for each of the 5 drafted players on START GAME, then calls `user.setLineupSlot` for each position. Roster returned to `App.jsx` includes `serverId`. New users start with 5 free drafts.

- [x] **Level-up saves** — Added `player.progress` tRPC mutation and `updatePlayerProgress` in `player.ts`. `App.jsx` wraps `onPickLevelUp` and `onDismissStatUpgrade` to call `player.progress` with the new level/xp and either the chosen ability or stat delta, keyed by `serverId` from the home roster.

- [x] **Load roster from server on startup** — `App.jsx` init effect now calls `trpc.user.roster` + `trpc.user.lineup` in parallel and reconstructs `homeRoster` with pos/stats/serverId. If all 5 positions are filled, returning players skip the draft and go straight to the new matchmaking screen.

- [x] **Admin: view user roster** — In the User tab of `AdminOverlay`, after loading a user, add a "Roster" section that lists all players owned by that user. Call `trpc.user.roster` (or a new `trpc.admin.getUserRoster` that accepts a username param) to fetch the full `PlayerData[]` for the selected user. Display each player's name, role/pos, rarity, level, and key stats (spd/dex/jmp/acc + bonuses). Useful for debugging draft issues and verifying level-up persistence.

- [x] **Add debug console to title/menu screen** — The debug console (`<input>` + log output) currently only exists inside `GameScene`. Add the same command input to `TitleScreen` (or as a global overlay in `App.jsx`) so it's accessible without starting a game. Typing `admin` is the entry point.

- [x] **Wire `admin` command to admin check** — When `admin` is typed in the console, call `trpc.admin.isAdmin` (or derive from `trpc.admin.getAdmins` matching against `username` from `devvitContext`). If the server confirms the caller is an admin, open the admin overlay. If not, silently ignore or show a generic error — don't reveal that an admin panel exists.

- [x] **Build production admin SVG overlay** — An in-game overlay (similar to `LevelUpOverlay` — full-screen semi-transparent panel over the SVG) with tabbed or scrollable sections:
  - **User** — username input, load user data (credits, energy, gamesPlayed, freeDrafts), buttons: Restore Energy, Set Credits, Reset User, Grant Free Drafts
  - **Games** — load pending/flagged queues (show gameId + score + verifiedScore + status), Approve / Reject buttons per game
  - **Admins** — list current admins, Add Admin / Remove Admin inputs
  - Close button (ESC or ✕)

- [x] **Add `trpc.admin.isAdmin` query** — Currently `isAdmin` is only used inside `adminProcedure` middleware. Expose it as a public query that returns `{ isAdmin: boolean }` for the current user. Used by the client to gate the admin overlay without leaking the admin list.

- [x] **Wire admin mutations to existing endpoints** — The `admin.*` tRPC procedures already exist (approveGame, rejectGame, adjustCredits, grantFreeDrafts, addAdmin, removeAdmin). The overlay just needs to call them via `trpc.admin.*` using the existing tRPC client.

- [x] **Game session + credits** — `trpc.game.start` called on tip dismiss (stores gameId+token in ref). Each home-team make calls `trpc.game.recordPlay`. `trpc.game.end` called on game-over dismiss; `creditsEarned` added to `serverCredits` immediately.

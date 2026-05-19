# The Last Draft — Backend Wiring TODOs

## Pending

- [x] **Player persistence** — `draft.free` / `draft.credit` now accept stats + ability; `mintPlayer` stores them in Redis. `DraftScreen` calls `draft.free` for each of the 5 drafted players on START GAME, then calls `user.setLineupSlot` for each position. Roster returned to `App.jsx` includes `serverId`. New users start with 5 free drafts.

- [x] **Level-up saves** — Added `player.progress` tRPC mutation and `updatePlayerProgress` in `player.ts`. `App.jsx` wraps `onPickLevelUp` and `onDismissStatUpgrade` to call `player.progress` with the new level/xp and either the chosen ability or stat delta, keyed by `serverId` from the home roster.


- [x] **Load roster from server on startup** — `App.jsx` init effect now calls `trpc.user.roster` + `trpc.user.lineup` in parallel and reconstructs `homeRoster` with pos/stats/serverId. If all 5 positions are filled, returning players skip the draft and go straight to the new matchmaking screen.

- [ ] **Energy system UI** — `game.start` deducts energy server-side but the client has no energy display and doesn't handle the "not enough energy" error. Add energy display and block game start if energy is 0.

## Matchmaking Screen Polish

- [ ] **Rank badge — elaborate emblem style** — Replace the plain "PLAT / P" text-only badge with a proper multi-layer emblem. The badge should have: (1) "RANK" label text at the top of the circle, (2) a pixel-art crown/wings insignia graphic drawn in SVG polygons per tier (Iron=shield, Bronze=axe-wings, Silver=wings, Gold=crown, Plat=gem-crown, Diamond=diamond-shape, Master=flame, Challenger=star-burst), (3) Roman numeral division (I–IV) inside or below the emblem. Each tier has its own color scheme. Reference: LoL rank badge visual, Gundam VS arcade rank circle.

- [ ] **Info panel — multi-row layout with dividers** — The current panel only shows 2 lines. Expand to 4 distinct horizontal rows separated by 1px teal/orange divider lines inside the parallelogram: (1) top row: small "TEAM" label left + team name right; (2) second row: "POWER" label left + computed team total OVR right; (3) third row: large bold team name centered (big display text); (4) bottom row: "RECORD" label left + placeholder "0W 0L" right. Each row should sit in a clearly delineated band.

- [ ] **Player cards — taller with grade letter** — Increase card height to fit two visual zones: upper zone = HEAD_PORTRAIT (keep current), lower stat bar = wider, showing a letter grade (S/A/B/C/D computed from OVR) on the left in a colored box, then OVR number on the right. Remove the rank initial letter from bottom-left (the grade letter replaces it). Cards should feel taller and more data-rich like the Gundam cards.

- [ ] **Panel parallelogram — shallower skew** — Reduce the skew offset (`INFO_SK`) from 8 to ~4–5px so the parallelogram angle is more subtle, closer to the Gundam reference which uses a very shallow slant.

- [ ] **Badge position — anchor to panel right edge** — Move home rank badge so it sits flush against (overlapping) the right edge of the home info panel rather than centered between both panels. Mirror: away badge overlaps left edge of away panel. This matches the Gundam reference where the badge is clearly "owned" by its panel, not floating in the gap.

- [x] **Admin: view user roster** — In the User tab of `AdminOverlay`, after loading a user, add a "Roster" section that lists all players owned by that user. Call `trpc.user.roster` (or a new `trpc.admin.getUserRoster` that accepts a username param) to fetch the full `PlayerData[]` for the selected user. Display each player's name, role/pos, rarity, level, and key stats (spd/dex/jmp/acc + bonuses). Useful for debugging draft issues and verifying level-up persistence.

## Production Admin

- [x] **Add debug console to title/menu screen** — The debug console (`<input>` + log output) currently only exists inside `GameScene`. Add the same command input to `TitleScreen` (or as a global overlay in `App.jsx`) so it's accessible without starting a game. Typing `admin` is the entry point.

- [x] **Wire `admin` command to admin check** — When `admin` is typed in the console, call `trpc.admin.isAdmin` (or derive from `trpc.admin.getAdmins` matching against `username` from `devvitContext`). If the server confirms the caller is an admin, open the admin overlay. If not, silently ignore or show a generic error — don't reveal that an admin panel exists.

- [x] **Build production admin SVG overlay** — An in-game overlay (similar to `LevelUpOverlay` — full-screen semi-transparent panel over the SVG) with tabbed or scrollable sections:
  - **User** — username input, load user data (credits, energy, gamesPlayed, freeDrafts), buttons: Restore Energy, Set Credits, Reset User, Grant Free Drafts
  - **Games** — load pending/flagged queues (show gameId + score + verifiedScore + status), Approve / Reject buttons per game
  - **Admins** — list current admins, Add Admin / Remove Admin inputs
  - Close button (ESC or ✕)

- [x] **Add `trpc.admin.isAdmin` query** — Currently `isAdmin` is only used inside `adminProcedure` middleware. Expose it as a public query that returns `{ isAdmin: boolean }` for the current user. Used by the client to gate the admin overlay without leaking the admin list.

- [x] **Wire admin mutations to existing endpoints** — The `admin.*` tRPC procedures already exist (approveGame, rejectGame, adjustCredits, grantFreeDrafts, addAdmin, removeAdmin). The overlay just needs to call them via `trpc.admin.*` using the existing tRPC client.

## Completed

- [x] **Game session + credits** — `trpc.game.start` called on tip dismiss (stores gameId+token in ref). Each home-team make calls `trpc.game.recordPlay`. `trpc.game.end` called on game-over dismiss; `creditsEarned` added to `serverCredits` immediately.

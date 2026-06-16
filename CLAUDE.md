# Basketball Game — Agent Instructions

This file is read by every Claude Code session and agent task. Follow all rules here
before writing any code. When in doubt, read existing files first.

---

## Project Overview

A retro pixel-art basketball game built for Reddit (Devvit Web platform).
Stack: React + Vite + SVG rendering. No canvas, no game engine, no CSS animations.
All animation is done via `requestAnimationFrame` and React state.

Target platform: Devvit Vite template (`npm create devvit@latest --template=vibe-coding`)

---

## File Map — Read Before Touching Anything

```
src/client/
  constants.js   — layout numbers, jersey colors, grid<->SVG converters, initial player positions
  sprites.js     — ALL pixel art data arrays (dribble, idle, run, shoot, ball frames)
  components.jsx — React components: Court, Ball, ShotBall, Player, HUD
  useGame.js     — ALL game state, movement logic, command handling (custom hook)
  App.jsx        — Root component. Thin render layer only. No logic here.
  main.jsx       — Entry point. Do not modify unless changing React root setup.
```

**Before adding anything new, search these files for existing solutions.**

---

## Strict Architecture Rules

### Constants (`constants.js`)
- ALL numeric layout values live here. No magic numbers elsewhere.
- Court SVG bounds: x=80..600, y=96..336
- Grid is 94ft wide × 50ft tall
- Conversion functions `gridToSvg` and `svgToGrid` are the only place grid math happens
- `INITIAL_PLAYERS` is the single source of truth for starting positions
- `SHOOT_TARGET` is the single source of truth for basket aim point
- Jersey color constants: `JERSEY_HOME`, `JERSEY_AWAY`, `JERSEY_BASE`, `JERSEY_DARK_BASE`

### Sprites (`sprites.js`)
- ALL pixel art data lives here. Never inline pixel arrays in components or elsewhere.
- Pixel format is always `[x, y, colorHex]` or `[x, y, JERSEY_BASE]`
- `JERSEY_BASE` is a placeholder replaced at render time with the player's actual jersey color
- Adding a new animation = add frames here, then wire up in `Player` component only
- Frame dimensions must be documented in a comment above each frame set
- Ball color in shoot frames = `#AC2C17` (not `#FF0000` — convert on import)

### Components (`components.jsx`)
- Components are **display only** — no game logic, no state beyond local animation frame index
- `Player` handles all sprite switching: `isShooting` > `hasBall` > `isMoving` > idle
- Flip logic: `facingRight=true` → parent `<g>` applies `scale(-1,1)` transform externally in App.jsx
- `data-testid` attributes are required on all interactive/queryable elements (see Testing section)
- Do not add new props to `Player` without updating all call sites in `App.jsx`

### Game Logic (`useGame.js`)
- ALL state lives here: `players`, `shot`, `logs`
- ALL commands live here: `handleCommand` switch
- `smoothMoveTo(gridX, gridY, playerId, restoreFacingRight)` is the only way to animate movement
- Player state shape (do not add fields without updating `INITIAL_PLAYERS` in constants.js):
  ```js
  { id, role, team, hasBall, isMoving, isShooting, facingRight, cx, cy }
  ```
- `playersRef` is kept in sync with `players` state for use inside animation closures
- Never call `setPlayers` from inside a `requestAnimationFrame` loop without checking `t < 1`

### App.jsx
- Render only. No useState, no useEffect, no logic.
- Imports from `constants.js`, `components.jsx`, and `useGame.js` only.
- Player flip (`scale(-1,1)`) is applied here, not inside `Player` component.

---

## Player State Reference

| Field         | Type    | Description |
|---------------|---------|-------------|
| `id`          | number  | 1-5 = home, 6-10 = away |
| `role`        | string  | "PG", "SG", "SF", "PF", "C" |
| `team`        | string  | "home" or "away" |
| `hasBall`     | boolean | Only one player true at a time |
| `isMoving`    | boolean | Set by smoothMoveTo, cleared on arrival |
| `isShooting`  | boolean | Set by shoot command, cleared after animation |
| `facingRight` | boolean | Controls horizontal flip in App.jsx |
| `cx`          | number  | SVG x coordinate |
| `cy`          | number  | SVG y coordinate |

---

## Court & Grid Reference

```
SVG viewport:   680 × 348px
Court area:     x=80..600, y=96..336
Grid:           94ft wide × 50ft tall
Left basket:    SVG x≈92, y=216
Right basket:   SVG x≈588, y=216 (backboard at x=590, y=188)
Half court:     x=340
3pt arc top:    y≈110
3pt arc bottom: y≈322

Key grid positions (gx, gy):
  Home PG offense:  (62, 25) — top of key, outside right 3pt arc
  Away PG offense:  (32, 25) — top of key, outside left 3pt arc (mirrored)
  Home defense PG:  (68, 25) — between ball and basket
```

---

## Animation System

All animations use `requestAnimationFrame`, never `setTimeout` for movement,
never CSS transitions.

| State       | Frames file     | Sprite size | Speed   |
|-------------|-----------------|-------------|---------|
| Dribbling   | SPRITE_PIXELS   | 13×17       | static  |
| Idle        | IDLE_FRAMES[5]  | 11×16       | 120ms/f |
| Running     | RUN_FRAMES[6]   | 14×18       | 80ms/f  |
| Shooting    | SHOOT_CHAR_FRAMES[7] | 32×34  | 80ms/f  |
| Ball bounce | BALL_FRAMES     | 7×7         | 500ms cycle |
| Shot arc    | SHOT_FRAMES[4]  | 7×7         | 80ms/f  |

**Player animation priority:** `isShooting` → `hasBall` → `isMoving` → idle

---

## Testing Requirements

### data-testid Attributes (required, do not remove)
```
data-testid="game-root"           — root div
data-testid="game-court"          — SVG element
data-testid="player-{id}"         — each player group (1-10)
data-testid="player-{id}-role"    — role label text
data-testid="dribble-ball"        — bouncing ball
data-testid="shot-ball"           — ball in flight
data-testid="debug-input"         — console input
data-testid="debug-log"           — log output container
data-testid="log-entry-{type}"    — individual log entries (out/cmd/err)
data-testid="score-home"          — home score value
data-testid="score-away"          — away score value
data-testid="timer"               — game clock
data-testid="quarter"             — quarter indicator
```

All new UI elements must have a `data-testid`. Use kebab-case, be descriptive.

### Playwright Test Location
`tests/game.spec.ts` — do not move or rename this file.
Tests run on every push via GitHub Actions (`.github/workflows/test.yml`).

---

## Commands Reference (debug console)

| Command           | Action |
|-------------------|--------|
| `move <dx> <dy>`  | Move ball carrier by SVG pixels |
| `moveTo <x> <y>`  | Smooth move ball carrier to grid position |
| `tp <x> <y>`      | Instant teleport PG to grid |
| `pos`             | Print PG grid position |
| `shoot`           | Play shoot animation + arc ball to basket |
| `reset`           | Return PG to (62, 25) |
| `testMoveAway`    | All players move to away-has-ball formation |
| `testMoveHome`    | All players return to home-has-ball formation |
| `help`            | List all commands |

Adding a new command = add it to `handleCommand` in `useGame.js` + add to `help` output + document it here.

---

## What NOT to Do

- ❌ Do not inline pixel arrays outside `sprites.js`
- ❌ Do not add game logic to `App.jsx` or `components.jsx`
- ❌ Do not add new constants (colors, dimensions, positions) outside `constants.js`
- ❌ Do not use `setTimeout` for movement animation — use `requestAnimationFrame`
- ❌ Do not use CSS transitions or keyframes for sprite animation
- ❌ Do not use `localStorage` or `sessionStorage` (not supported in Devvit iframe)
- ❌ Do not add a new animation state to `Player` without adding frames to `sprites.js` first
- ❌ Do not remove `data-testid` attributes — tests depend on them
- ❌ Do not hardcode SVG coordinates — use `gridToSvg()` from `constants.js`
- ❌ Do not add a second ball animation system — `Ball` (dribble) and `ShotBall` (arc) already exist

---

## PixelText — How to Use

Two components in `src/components/PixelText.jsx`:

### `PixelText` — left-aligned
```jsx
<PixelText text="HELLO" x={10} y={20} scale={1} fill="#fff" outline="#000" thick={false} />
```
- `x, y` — top-left of the first character
- `scale` — pixel size (1 = 1px per pixel, 2 = 2px, etc.)
- `outline` — pass `null` to disable; default is `'#000'`
- `thick` — `true` adds 8-direction outline (bolder), default is 4-direction

### `PixelTextC` — centered on `cx`
```jsx
<PixelTextC text="HELLO" cx={204} y={20} scale={1} fill="#fff" outline={null} />
```
- Same props as `PixelText` except `cx` (center x) instead of `x`
- Internally computes `x = cx - textWidth / 2`

### Glyph dimensions (important for layout math)
| Property | Value |
|----------|-------|
| Cell width per character | 6px × scale (5px glyph + 1px gap) |
| Glyph height | 9px × scale |
| Total text width | `text.length * 6 * scale` |

So at `scale=1`: a 5-char string is 30px wide, 9px tall.
At `scale=2`: a 5-char string is 60px wide, 18px tall.

### Common patterns
```jsx
// Label above a button (vertically centered in 26px button)
<PixelTextC text="START" cx={btnX + btnW/2} y={btnY + Math.floor((26 - 7) / 2)} scale={1} fill="#fff" outline={null} />
// (use glyph height 7 for scale=1 when centering in a box — 9px includes descenders)

// Two lines stacked (scale=1, 11px apart)
<PixelTextC text="LINE 1" cx={cx} y={baseY}      scale={1} fill="#1eb8d8" outline={null} />
<PixelTextC text="LINE 2" cx={cx} y={baseY + 11} scale={1} fill="#3a5878" outline={null} />
```

---

## Mobile Zoom & Coordinate Spaces

The game has two coordinate spaces that must not be confused.

### Game space
Full court: `W` wide (≈680) × `TOTAL_H` tall (348). All `player.cx`, `player.cy`, basket positions, etc. live here.

### Viewport space (`ZOOM_W = 408`)
What the game SVG's viewBox shows. On desktop the game SVG shows `ZOOM_W × TOTAL_H` = `408 × 348` game units. On mobile (`width < height`) a `mobileZoom = 1.25` is applied:

```
Game SVG viewBox = `${cameraX} 0 ${ZOOM_W / mobileZoom} ${TOTAL_H / mobileZoom}`
                 = `${cameraX} 0 326.4 278.4`  (on mobile)
```

This means 1 game unit = 1.25 visual pixels on mobile (zoomed in 25%).

### Overlay SVG space
Dialogs (LevelUpOverlay, QuarterSummary, etc.) render in a **separate** overlay SVG with:
```
viewBox = `0 0 ${ZOOM_W} ${TOTAL_H}` = `0 0 408 348`
preserveAspectRatio = "xMidYMid meet"
```
The overlay SVG is `inset:0` (covers the full container), but `xMidYMid` means the 408×348 content is vertically **centered** inside it. On a tall phone this adds a large y-offset (~213px for a 390×760 viewport) that must be subtracted out.

**Do not use `gameCy * mobileZoom` alone** — it ignores two offsets:
1. Portrait panel pushes the game SVG down by `panelH` pixels (mobile only)
2. `xMidYMid` centering shifts the overlay content down

The correct transforms are:
```
overlayX = (gameCx - cameraX) * mobileZoom        // x: no vertical shifts, still correct

// overlayYOffset is pre-computed in GameScene.measure() and stored as state:
// overlayScale = Math.min(containerW / ZOOM_W, containerH / TOTAL_H)  ← xMidYMid meet scale
// overlayOffsetY = (containerH - TOTAL_H * overlayScale) / 2           ← vertical centering gap
// gameSvgTop = panelH (mobile) or 0 (desktop)
overlayYOffset = (gameSvgTop - overlayOffsetY) / overlayScale

overlayY = gameCy * mobileZoom + overlayYOffset
```

On desktop the container is exactly the game aspect ratio → `overlayYOffset = 0`.

Example from `GameScene.jsx` — passing a player position to `LevelUpOverlay`:
```jsx
player={{
  ...levelUpState.player,
  cx: (levelUpState.player.cx - cameraX) * mobileZoom,
  cy: levelUpState.player.cy * mobileZoom + overlayYOffset,
}}
```

### DraftScreen / non-game screens
These render directly in the game's root SVG (no second overlay SVG, no camera). They use their own layout variables (`ZOOM_W`, `TOTAL_H`) directly. The `isMobile` flag (`width < height`) is used for layout changes; `mobileZoom` does not apply here because the DraftScreen SVG is not zoomed — scale transforms on individual elements are used instead.

---

## Local Dev Tools

A standalone Vite app at `dev-tools/` for debugging without Reddit/Devvit.

```
npm run dev:tools   # opens http://localhost:5174
```

Config: `vite.devtools.config.ts` — no `@devvit/start/vite` plugin, uses `@src` alias pointing to `src/`.

### Sprite Preview (`dev-tools/SpritePreview.jsx`)

Renders every sprite animation as an interactive card:
- Play/pause, frame step (◀▶), scrubber, zoom (2×–16×)
- Jersey color picker — swaps `JERSEY_BASE` live across all sprites
- Filter input to search by name

**Adding a new sprite to the preview:**
1. Import the export from `src/sprites/` using the `@src/` alias
2. Add an entry to the `SPRITES` array: `{ name: '...', raw: EXPORT, interval: <ms> }`

The `toFrames()` helper normalises all three sprite shapes automatically:
- Flat pixel array `[[x,y,c],...]` → single frame
- Array of frames `[[[x,y,c],...],...]` → multi-frame animation
- Object with named keys `{ up, mid, flat }` (e.g. `BALL_FRAMES`) → labelled frames

---

## Devvit-Specific Notes

- This game runs inside a Reddit post iframe — no browser storage APIs available
- Reddit user identity comes from `devvitContext.username` (client-side, via `@devvit/web/client`)
- `@devvit/web-view-scripts/fetch.js` patches global `fetch` to inject `Authorization: Bearer <token>` for same-origin `/api/` requests automatically — no manual auth headers needed in the client
- Keep the viewport responsive — `width="100%"` on the SVG, `viewBox` handles scaling
- The Devvit iframe size varies — do not hardcode pixel heights in CSS

---

## Backend Architecture

### Stack
- **Server:** Hono + `@hono/node-server`, entry at `src/server/index.ts`
- **API:** tRPC v11 via `@hono/trpc-server`, mounted at `/api/trpc`
- **DB:** Devvit Redis (accessed via `redis` from `@devvit/web/server`)
- **Client:** `src/trpc.ts` — `createTRPCClient` with `httpBatchLink` (not streaming — `fetchRequestHandler` doesn't support it)
- **Auth:** `requireUsername()` calls `reddit.getCurrentUsername()` — throws `UNAUTHORIZED` if not logged in

### Server port
`getServerPort()` reads `process.env.WEBBIT_PORT`, defaults to `3000`. Set by `devvit playtest` at runtime.

### Key Redis namespaces
| Key pattern | Contents |
|---|---|
| `user:{username}` | User hash: credits, energy, freeDrafts, firstSeen, lastSeen |
| `user:games:{username}` | Sorted set of completed game IDs (score = timestamp) |
| `user:ledger:{username}` | Credit earn/spend audit log |
| `user:roster:{username}` | Sorted set of owned player IDs |
| `user:lineup:{username}` | Hash of position → playerId assignments |
| `game:{id}` | Game hash: score, verifiedScore, creditsEarned, status |
| `game:{id}:plays` | Sorted set of play events (score = sequence number) |
| `game:session:{token}` | `{username}:{gameId}`, TTL 1 hour |
| `games:pending` / `games:flagged` | Sorted sets of game IDs awaiting admin review |

### Player Data Model

Each player is stored as a Redis hash at `player:{id}` with these fields:

| Field | Type | Notes |
|---|---|---|
| `owner` | string | Reddit username |
| `name` | string | e.g. `"KAEL THORNE"` — generated from `FIRST_NAMES` + `LAST_NAMES` in `DraftScreen.jsx` |
| `level` | number | Starts at 1; increases via `updatePlayerProgress` |
| `xp` | number | Starts at 0 |
| `source` | `'draft' \| 'credit' \| 'purchase'` | How the player was acquired |
| `rarity` | `'rare' \| 'super_rare' \| 'ultra_rare'` | Derived from OVR at draft time via `tierToRarity()` — OVR<64=rare, 64–70=super_rare, ≥71=ultra_rare |
| `spd` `dex` `jmp` `acc` | number (0–99) | Base stats set at mint; ranges depend on position archetype in `DraftScreen.jsx` |
| `ability` | JSON string or `''` | Single ability rolled at draft: `{ name, rarity, desc, id }` — see `src/abilities.js` |
| `abilities` | JSON string (array) | Abilities earned from level-ups; appended by `updatePlayerProgress` |
| `statBonuses` | JSON string | `{ spd, dex, jmp, acc }` — cumulative deltas from level-ups |
| `palette` | number (0..N) | Index into `SKIN_PALETTES` in `constants.js` — determines skin/hair/beard combo. **APPEND-ONLY** list: never reorder entries; existing players reference by index. Defaults to `0` (person1) if missing. |

**Position is NOT stored on the player.** It comes from the lineup hash:

```
user:lineup:{username}  →  { PG: playerId, SG: playerId, SF: playerId, PF: playerId, C: playerId }
```

At load time (`App.jsx`), position is reconstructed by joining roster + lineup:
```js
const ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];
const built = ORDER.map(pos => {
  const pid = lineup?.[pos];           // which player is slotted here
  const p   = byId.get(Number(pid));   // fetch their PlayerData
  return { pos, name: p.name, spd: p.spd + sb.spd, ... };
});
```

A player has no inherent position — they get one only when assigned via `setLineupSlot` (tRPC) or the drag-to-slot UI in `DraftScreen.jsx`.

**OVR is never persisted.** Compute it client-side with `calcOvr(pos, stats)` using the position-weighted formula in `DraftScreen.jsx` / `CollectionScreen2.jsx`.

**Available abilities** are defined in `src/abilities.js`: DUNK MASTER, IRON BLOCK, SPEEDY, PLAY MAKER, PICK POCKET, SHARPSHOOTER, ANKLE BREAKER.

---

### Game session flow (wired in `App.jsx` + `useGame.js`)
1. **`trpc.game.start`** — called on tip dismiss; deducts 1 energy, returns `{ gameId, token }` stored in `gameSessionRef`
2. **`trpc.game.recordPlay`** — called for every home-team made basket (shoot/dunk/fadeaway) with `{ gameId, token, sequence, play }`
3. **`trpc.game.end`** — called on game-over dismiss with `{ gameId, token, score: homeScore }`; server replays stored plays to compute `verifiedScore`, awards credits if they match and game lasted ≥ 60s
4. Credit formula: `min(floor(verifiedScore / 5), 500)` credits per game

### FTUE detection
`UserData.gamesPlayed` = `ZCARD user:games:{username}` — fetched on `user.init`. In `App.jsx`:
```js
setIsFtue(user.gamesPlayed === 0);  // true only on first session before any completed game
```
After the first `game.end` completes, `user:games:{username}` has 1 entry → next session `isFtue = false`.

### Core modules
| File | Responsibility |
|---|---|
| `src/server/core/user.ts` | User CRUD, energy deduction, credit award/spend |
| `src/server/core/game.ts` | Game session lifecycle, play recording, score verification |
| `src/server/core/player.ts` | Player minting, roster/lineup management |
| `src/server/core/draft.ts` | Free and credit draft flows |
| `src/server/core/admin.ts` | Admin checks, game approval/rejection, credit adjustments |

### Schema changes (Redis "migrations")

Redis has no schema, so there's no Prisma/SQL migration system. Instead,
schema changes that affect **existing rows** are recorded as numbered files
in `src/server/migrations/`. These files are *not* auto-executed by the
deploy pipeline — they exist as a history log so:

- A reviewer can scan one chronological list to see how data shapes evolved.
- When a backfill is needed, the script lives next to its record and can
  be invoked manually (temporary dev-admin route, then removed).

**Decision rule for whether a PR needs a migration file:**

| Change | Add a file? |
|---|---|
| Add an optional field with a default in `getX()` | No — reader handles missing values |
| Add a **required** field to existing rows | **Yes** |
| Rename a field | **Yes** |
| Change value encoding (JSON ↔ flat, comma-list ↔ set) | **Yes** |
| Add a brand-new key namespace | No (the helpers in `core/*.ts` are the record) |
| Drop a field | Optional — only if you want cleanup |

When in doubt: would old rows written before this PR behave wrong under
the new code? If yes, add a migration. If they'd default cleanly, don't.

See `src/server/migrations/README.md` for the file format and how to
run backfills manually.

**Reader defensiveness is the safety net.** Every `getX` parser in
`core/*.ts` defaults missing fields (`Number(raw.field ?? 0)`,
`try { JSON.parse } catch`). Keep doing this even when adding migrations —
it's what makes a forgotten migration a paper-trail problem instead of a
data-integrity problem.

### Dev admin panel
Available at `http://localhost:5174` → **🔧 Admin** nav item when running `npm run dev:tools` alongside `devvit playtest`.
- Proxies `/dev-admin/*` to the Hono server (`WEBBIT_PORT` || 3000)
- Routes only registered when `NODE_ENV !== 'production'`
- Operations: load user data, reset user (wipes all Redis keys for that user), restore energy, set credits, view/clear pending and flagged game queues

---

## Visual Verification with agent-browser

`agent-browser` is installed globally (`~/.nvm/.../bin/agent-browser`). Use it to take live screenshots of the dev tools for visual verification. Always save screenshots to `dev-tools/tmp/`.

### Typical workflow

```bash
# 1. Start the dev server if not running
npm run dev:tools   # http://localhost:5174

# 2. Open the page and get element refs
agent-browser open "http://localhost:5174" && agent-browser wait 2000 && agent-browser snapshot

# 3. Navigate — refs change each page load, always snapshot first
agent-browser click "e8"   # e.g. click "Court (Live)" sidebar item
agent-browser wait 1500

# 4. Get updated refs after navigation
agent-browser snapshot

# 5. Interact (e.g. toggle Mobile mode)
agent-browser click "e9"   # e.g. click "Mobile" button
agent-browser wait 2000

# 6. Screenshot — always save to dev-tools/tmp/
agent-browser screenshot --full dev-tools/tmp/my-check.png
```

### Key notes
- `snapshot` returns the accessibility tree with `[ref=eN]` handles — use these for clicks, not text selectors
- Refs are re-assigned on every page load/navigation — always `snapshot` before clicking
- Use `--full` for full-page screenshots (captures the phone frame + content below fold)
- Use `--annotate` to get numbered element overlays for debugging layout
- The dev tools server runs on **port 5175** (not 5174 — that port is for the main Devvit app)

---

## Agent Workflow

When an agent starts a task it should:
1. Read this file (`CLAUDE.md`) — done automatically by Claude Code
2. Read the relevant source file(s) before making changes
3. Search for existing functions/constants before creating new ones
4. Run `npx playwright test` after any UI change to verify no regressions
5. Update `CLAUDE.md` if a new architectural decision is made

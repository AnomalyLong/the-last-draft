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

## Devvit-Specific Notes

- This game runs inside a Reddit post iframe — no browser storage APIs available
- Reddit user identity and Redis persistence will be added via `src/server/` (not yet built)
- Keep the viewport responsive — `width="100%"` on the SVG, `viewBox` handles scaling
- The Devvit iframe size varies — do not hardcode pixel heights in CSS

---

## Agent Workflow

When an agent starts a task it should:
1. Read this file (`CLAUDE.md`) — done automatically by Claude Code
2. Read the relevant source file(s) before making changes
3. Search for existing functions/constants before creating new ones
4. Run `npx playwright test` after any UI change to verify no regressions
5. Update `CLAUDE.md` if a new architectural decision is made

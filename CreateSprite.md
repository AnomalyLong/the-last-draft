# CreateSprite — How to Add a New Animation

This document explains the full process of turning pixel-art SVG frames into a
sprite JS file that the game engine can use.

---

## Overview

Each animation is a JS file in `src/sprites/` that exports an array of frames.
Each frame is an array of `[x, y, color]` pixel tuples. The file is then
re-exported from `src/sprites/index.js`.

---

## Step 1 — Receive SVG Frames

SVG frames must use `shape-rendering="crispEdges"` and contain only `<rect>`
elements sized `1×1`. Each rect represents one pixel.

Example rect:
```xml
<rect x="19" y="23" width="1" height="1" fill="#3E2525" />
```

Name them sequentially: `movename1.svg`, `movename2.svg`, etc.

---

## Step 2 — Determine the Coordinate Offset

The SVG coordinates are absolute (often starting around x=12, y=21). The JS
frames use smaller relative coordinates so arrays stay readable.

**How to pick an offset:**

1. Scan all frames and find the minimum x and minimum y across every rect.
2. Round down to a clean number (multiple of 5 or 10).
3. That becomes your offset: `ox` and `oy`.

**Example (spinmove):**
- Min x across all frames ≈ 12 → chose `ox = 10`
- Min y across all frames ≈ 21 → chose `oy = 20`
- Result: coordinates fit in roughly x: 2–18, y: 1–18

**Rule of thumb:** aim for x range 0–20, y range 0–20.

**Document the offset** in a comment at the top of the JS file:
```js
// SVG origin offset applied: x-10, y-20
```

---

## Step 3 — Identify Color Roles

Before converting, decide what each color means:

| Color | Role |
|-------|------|
| `#3E2525` | Hair / head |
| `#D9A066` | Skin (light) |
| `#B17F4C` | Skin (shadow) |
| `#E8D110` | Shorts (yellow) |
| `#D9FFE2` | Jersey white / sneaker white |
| `#B5DBBE` | Jersey accent (light green) |
| `#14171C` | Sneaker dark / outline |
| `#AC3232` | **Jersey color → replace with `JERSEY_BASE`** |
| `#FF0000` | Context-dependent — see below |
| `#AC2C17` | Basketball (use this, never `#FF0000` for ball) |

### The `#AC3232` Rule
Any pixel that is part of the player's jersey torso should use `JERSEY_BASE`.
In the SVG source this is usually `#AC3232`. Replace it at import time.

### The `#FF0000` Rule
`#FF0000` is ambiguous — check the pixel's position in the frame:
- **Small cluster (~4–7 pixels), near the dribbling hand** → it's the ball.
  Convert to `#AC2C17` (the canonical basketball color per CLAUDE.md).
- **Large block covering legs/lower body** → it's the player's shorts or a
  second player's jersey. Keep as `#FF0000` or assign a named constant.
- **Scattered pixels on the far side of the frame** → defender contact detail.
  Keep as `#FF0000`.

---

## Step 4 — Convert Each Frame

For every rect in the SVG:

```
js_x = svg_x - ox
js_y = svg_y - oy
color = fill value (substitute JERSEY_BASE where needed)
```

Write as a tuple: `[js_x, js_y, color]`

Group tuples into a frame array, one frame per SVG file.

**Template:**
```js
[ // frame N — description
  [x, y, "#COLOR"], [x, y, JERSEY_BASE], ...
],
```

---

## Step 5 — Write the JS File

Create `src/sprites/movename.js`:

```js
import { JERSEY_BASE } from '../constants.js';

// Move name animation frames (~WIDTHxHEIGHT bounding box, N frames)
// SVG origin offset applied: x-OX, y-OY
// Frames 1–N: brief description of what each phase shows
// Render anchor: translate(cx - OX*scale, cy - OY*scale) to keep feet at cy
export const MOVE_NAME_FRAMES = [
  [ // frame 1 — description
    [x, y, "#COLOR"],
    ...
  ],
  [ // frame 2 — description
    ...
  ],
  // ... remaining frames
];
```

**Naming convention:** export name is `SCREAMING_SNAKE_FRAMES`.

---

## Step 6 — Register in the Index

Add one line to `src/sprites/index.js`:

```js
export { MOVE_NAME_FRAMES } from './movename.js';
```

---

## Step 7 — Wire Up in the Player Component

In `src/components/` (whichever component renders the player sprite):

1. Import the new frames:
   ```js
   import { MOVE_NAME_FRAMES } from '../sprites/index.js';
   ```

2. Add a new boolean prop to the player state (update `INITIAL_PLAYERS` in
   `constants.js` if it's a persistent state field):
   ```js
   isSpinning: false
   ```

3. Add the animation priority branch. The current priority order is:
   ```
   isJumpBall → isDunking → isShooting → isSpinning → isDashing → isStealing → isBlocking → hasBall+isMoving → hasBall → isMoving → idle
   ```
   Insert your new state at the appropriate priority level.

4. Add the animation frame cycling logic (same pattern as existing states —
   use `requestAnimationFrame`, never `setTimeout`).

5. Add a `data-testid` attribute on any new interactive element.

---

## Step 8 — Add a Debug Command (optional)

If you want to trigger the animation from the debug console:

1. Add an `else if` branch to `handleCommand` in `useGame.js`:
   ```js
   } else if (op === 'testMyMove') {
     const carrier = playersRef.current.find(p => p.hasBall);
     if (!carrier) { addLog('no ball carrier', 'err'); return; }
     setPlayers(prev => prev.map(p => p.id === carrier.id ? { ...p, isMyMove: true } : p));
     setTimeout(() => {
       setPlayers(prev => prev.map(p => p.id === carrier.id ? { ...p, isMyMove: false } : p));
     }, FRAME_COUNT * FRAME_DURATION_MS);
     addLog(`${carrier.role} my move!`);
   }
   ```
2. Add it to the `help` output in the same `else if (op === 'help')` block.
3. Document it in the Commands Reference table in `CLAUDE.md`.

**Note:** Use `testHomePG` first in the debug console to give the ball to a known player before testing.

---

## Quick Checklist

- [ ] SVG frames named sequentially (`move1.svg` … `moveN.svg`)
- [ ] Offset chosen so all coordinates are positive and ≤ 20
- [ ] `#AC3232` replaced with `JERSEY_BASE`
- [ ] `#FF0000` role identified (ball → `#AC2C17`, or keep as-is)
- [ ] JS file created in `src/sprites/movename.js`
- [ ] Export added to `src/sprites/index.js`
- [ ] Player component updated with new prop + animation branch
- [ ] `INITIAL_PLAYERS` updated in `constants.js` if new state field added
- [ ] `data-testid` added on any new UI element
- [ ] Debug command added and documented (optional)
- [ ] `npx playwright test` passes

### Additional checklist for shot-type animations (where `hasBall` drops to `false` mid-animation)

If your animation sets `hasBall: false` before it completes (i.e. the player releases the ball
during the animation), three extra wiring steps are required:

- [ ] **Hide dribble ball** — add `!p.isYourState` to the `Ball` visibility condition in `App.jsx`.
  Without this the ball sprite pops off the player the moment `hasBall` becomes `false`.
- [ ] **Camera tracking** — add `players.find(p => p.isYourState)` to the carrier fallback chain
  in `useGame.js` (the `const carrier = ...` line near the bottom). Without this the camera
  snaps away from the animating player as soon as they drop the ball.
- [ ] **Drift exclusion** — add `!p.isYourState` to the `.filter(...)` in `driftTowardBasket` in
  `useGame.js`. Without this the animating player slides mid-shot when other players drift.

---

## Reference: Existing Animations

| Export | File | Frames | Size | Speed |
|--------|------|--------|------|-------|
| `SPRITE_PIXELS` | dribble.js | 1 (static) | 13×17 | — |
| `IDLE_FRAMES` | idle.js | 5 | 11×16 | 120ms/f |
| `RUN_FRAMES` | run.js | 6 | 14×18 | 80ms/f |
| `RUN_BALL_FRAMES` | runball.js | 6 | 14×18 | 80ms/f |
| `SHOOT_CHAR_FRAMES` | shoot.js | 7 | 32×34 | 80ms/f |
| `DUNK_FRAMES` | dunk.js | varies | — | 80ms/f |
| `BLOCK_JUMP_FRAMES` | blockjump.js | varies | — | 80ms/f |
| `JUMP_BALL_FRAMES` | jumpball.js | 9 | — | 80ms/f |
| `STEAL_FRAMES` | steal.js | 9 | 19×28 | 20ms/f |
| `SPIN_MOVE_FRAMES` | spinmove.js | 11 | ~21×19 | 80ms/f |
| `DASH_FRAMES` | dash.js | 9 | 19×28 | 60ms/f |
| `BALL_FRAMES` | ball.js | varies | 7×7 | 500ms cycle |
| `SHOT_FRAMES` | shot.js | 4 | 7×7 | 80ms/f |

---

## SpecialMoveCard

For animations that should show a pop-up card (like spin move or speed burst), use the reusable `SpecialMoveCard` component instead of writing a new card from scratch.

```jsx
<SpecialMoveCard
  player={player}           // player object — used for key and jersey color
  frames={MY_FRAMES}        // the animation frames array
  label="MY MOVE!"          // text shown on the card banner
  jerseyColor={jerseyColor}
  cameraX={cameraX}
  frameDurationMs={80}      // ms per frame on the card (can differ from Player.jsx speed)
  accentColor="#F5C800"     // speed line + label color
  bgColor="#F5E6C8"         // card interior background
  anchorX={9}               // sprite anchor — matches the Player.jsx render translate X divisor
  anchorY={17}              // sprite anchor — matches the Player.jsx render translate Y divisor
/>
```

Render it in `App.jsx` alongside the existing spin move card:
```jsx
{(() => { const p = players.find(p => p.isMyMove); return p ? <SpecialMoveCard ... /> : null; })()}
```

Import `DASH_FRAMES` (or your new frames) directly in `App.jsx` since `SpecialMoveCard` is generic and doesn't know which frames to use.

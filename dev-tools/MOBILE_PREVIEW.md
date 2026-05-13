# Mobile Preview — How It Works

## How Devvit Renders on Mobile

Devvit games have **two completely separate rendering contexts**, both controlled by `devvit.json`:

### 1. Inline post card (`"inline": true`)

Shown directly in the Reddit feed before a user taps.

- **Fixed height**: 320px (REGULAR) or 512px (TALL) — set in `devvit.json`
- **Width**: varies by device (~288px on narrow mobile, up to ~880px on desktop)
- The game renders as a static/non-interactive preview
- In `App.jsx`, detected via `getWebViewMode() === 'inline'`
- Shows `TitleScreen` with a click-to-expand handler (`requestExpandedMode`)

### 2. Expanded game webview (`game.html`)

Opened when the user taps the post. Fills the **entire phone screen**.

- No Reddit chrome visible — the game is full-screen
- On iPhone 14-class devices: **390×844px** total screen
  - Status bar + dynamic island: **50px**
  - Home indicator area: **34px**
  - **Usable game area: 390×760px**
- `getWebViewMode()` returns `'expanded'`

These are not variations of the same view — they are completely different entry points with different HTML files.

---

## The Game SVG on Mobile

The game SVG has `viewBox="0 0 408 348"` with `width="100%" height="100%"`.

On a 390×760 expanded phone viewport with `preserveAspectRatio="xMidYMin meet"`:

| | Value |
|---|---|
| Scale factor | 390 / 408 = **0.956×** (width-constrained) |
| Rendered game | **390 × 333px** |
| Container height | 760px |
| Remaining black | **427px below** (filled partially by viewBox extension — see below) |

The game is anchored to the **top** of the container (`YMin`) so content starts immediately below the status bar.

---

## Portrait Panel Sizing

The TV cards (home/away player portrait panels) are absolutely-positioned SVG overlays on the game container corners.

They use **CSS container query units** (`cqw`/`cqh`) so they measure the game container itself — not the browser window. This matters in the devtools phone frame, where `vw`/`vh` would reference the full browser window width instead of the phone container.

```js
// GameScene.jsx
const panelH = `min(17.10cqh, 28.24cqw)`;
//              ↑ desktop (height-constrained)  ↑ mobile (width-constrained, 1.2× factor)
```

- **Desktop**: `cqh` wins — panels are 62% of the game's top-bar height
- **Mobile (390px)**: `cqw` wins — `28.24 × 3.90 = 110px` tall, `~172px` wide each, ~46px gap between them

The container div must have `containerType: 'size'` set for `cqw`/`cqh` to resolve.

---

## Reducing the Black Letterbox

Because the game's aspect ratio (408:348 ≈ 1.17:1) is much wider than a phone in portrait (390:760 ≈ 0.51:1), the game only fills 333 of the 760px available. A `ResizeObserver` in `GameScene.jsx` detects this and extends the SVG `viewBox` downward to fill ~65% of the slack:

```js
// GameScene.jsx
const naturalH = width / ZOOM_W * TOTAL_H;          // 333px on mobile
const slack    = height - naturalH;                  // 427px
const extraViewH = Math.round(slack * 0.65 / scale); // ~281 extra viewBox units
// viewBox becomes "0 0 408 629" → SVG renders ~601px tall → ~159px black
```

- Game content is **unchanged** — `extraViewH` only adds transparent space below `y=348`
- On desktop (height-constrained), `naturalH >= height` so `extraViewH = 0`

---

## Devtools Preview Components

### `PhoneFrameExpanded` (`dev-tools/PhoneFrame.jsx`)

Simulates the full-screen game webview. Wraps a `390×760px` content area in an iPhone 14-style shell.

```
PHONE_VIEWPORT_W = 390
PHONE_VIEWPORT_H = 844
STATUS_H         = 50   (status bar + dynamic island)
HOME_H           = 34   (home indicator)
MOBILE_EXPANDED_W = 390
MOBILE_EXPANDED_H = 760
```

Used by **`CourtStory`** — the live game preview in devtools.

### `PhoneFrameInline` (`dev-tools/PhoneFrame.jsx`)

Simulates the Reddit feed post card on narrow mobile. Renders an 320×288px card inside a fake Reddit post chrome.

```
MOBILE_INLINE_W = 288
MOBILE_INLINE_H = 320
```

Used by **`StoryFrame`** — all non-game scene stories (TitleScreen, DraftScreen, etc.).

### Mobile Toggle

Both `StoryFrame` and `CourtStory` expose a `Mobile` button (from `MobileToggle` in `StoryFrame.jsx`).

- In `StoryFrame`: toggles `PhoneFrameInline` (inline card mode)
- In `CourtStory`: toggles `PhoneFrameExpanded` (full-screen game mode)

These match the two actual Devvit rendering contexts.

---

## Key Constants

```js
// PhoneFrame.jsx
MOBILE_EXPANDED_W = 390           // usable game width
MOBILE_EXPANDED_H = 760           // usable game height (844 - 50 status - 34 home)
MOBILE_INLINE_W   = 288           // post card width (narrow mobile)
MOBILE_INLINE_H   = 320           // post card height (REGULAR post height)

// Letterbox info (for the label shown under the phone frame)
GAME_SCALE            = min(390/408, 760/348) = 0.956
MOBILE_GAME_RENDERED_W = 390px
MOBILE_GAME_RENDERED_H = 333px
```

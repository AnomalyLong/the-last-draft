# Matchmaking

How the matchmaking screen works today — the live `searching → found → vs` sequence that runs between the lobby and the in-game scene.

## Files

| File | Role |
|---|---|
| [src/components/MatchmakingScreen.jsx](src/components/MatchmakingScreen.jsx) | The component. Renders the HTML overlay, owns the phase state machine, fires `onReady` when the VS countdown ends. |
| [src/components/MatchmakingScreen.css](src/components/MatchmakingScreen.css) | All scoped styles under `.matchmaking-screen`. Includes desktop layout, mobile layout under `body.is-mobile`, all `@keyframes`. |
| [src/App.jsx](src/App.jsx) | Wires the screen in. Owns `scene === 'matchmaking'`, passes home/away data, handles the `onReady` callback. |
| [dev-tools/stories/MatchmakingStory.jsx](dev-tools/stories/MatchmakingStory.jsx) | The dev-tools preview with resolution presets, device frames, replay button. |

There is **no server module** for matchmaking — v1 uses a client-only random pick from [src/opponents.json](src/opponents.json).

## Entry / exit

- **Entry**: `setScene('matchmaking')` in [App.jsx](src/App.jsx). Happens after the lobby's Deploy button. The screen mounts as a sibling of the main SVG, NOT inside it, because it's a `<div>` not a `<g>`.
- **Exit**: the screen calls `onReady()` at the end of the `vs` countdown. App.jsx's `handleMatchmakingReady` fires `trpc.game.start.mutate()` (deducts 1 energy, returns `{ gameId, token }` for the play-recording session), runs `gameState.handleCommand('testGamePlay')`, and switches `setScene('game')`.

```
lobby ──Deploy──▶ matchmaking
                    │
                    ├── searching (5s)
                    ├── found (900ms)
                    └── vs (5s countdown) ──onReady──▶ game.start ──▶ game
```

## Phase state machine

`MatchmakingScreen` owns a single `phase` state with three values, plus `elapsed` (rAF-driven) and `countdown` (interval-driven):

| Phase | Duration | What shows | What triggers next phase |
|---|---|---|---|
| `searching` | 5s | Radar rings + sweep + pulses + scrolling log feed + progress bar | rAF loop sets `elapsed`; when `elapsed >= 5`, advance to `found` |
| `found` | 900ms | White flash + "OPPONENT LOCKED" banner | `setTimeout` |
| `vs` | 5s | Side panels + rosters slide in, VS mark, `TIP-OFF IN / READY UP` countdown | `setInterval` counts 5→0, then fires `onReady` |

The whole sequence is **~10.9s** from mount to `onReady`. `setCountdown(0)` schedules `onReady` via `setTimeout(0)` to defer it out of React's reconciler (otherwise the parent's `setLog` etc. inside the callback would warn about set-state-during-render).

## Component layout

The screen renders a single root div `<div className="matchmaking-screen" data-state={phase}>` covering its parent (`position: absolute; inset: 0`). The `data-state` attribute drives most of the CSS — e.g. `[data-state="searching"]` hides the player panels and rosters, `[data-state="vs"]` triggers the slide-in animations.

Inside the root:

```
.matchmaking-screen [data-state]
└── .stage-wrap                     (positioned + scaled wrapper)
    └── .stage                       (1920×1080 base; scaled to fit container)
        ├── .backplate              (left/right colored gradient halves)
        ├── .starfield, .planet     (background atmosphere)
        ├── .corner-bracket × 4     (HUD frame corners)
        ├── .side-slashes × 2       (diagonal speed lines)
        ├── .hud-corner × 2         (NET ping, CASUAL MATCH)
        ├── .center-pillar
        │   └── .vs-mark            (the big glowing V/S)
        ├── PlayerPanel left/right  (avatar + stats column)
        ├── Roster left/right       (5-card lineup strip)
        ├── SearchingView           (only in 'searching' phase)
        ├── .found-banner + .flash  (only in 'found' phase)
        ├── .launch-bar             (only in 'vs' phase)
        └── .scanlines + .crt-glow  (CRT effects)
```

### z-index ladder

| Element | z-index |
|---|---|
| `.launch-bar` (TIP-OFF) | 300 |
| `.center-pillar` (VS mark) | 200 |
| `.crt-glow` | 91 |
| `.scanlines` | 90 |
| `.hud-corner` | 80 |
| `.stats` | 30 |
| `.roster` | 20 |
| `.player-panel` (mobile) | 50 |
| `.backplate / starfield / planet` | 0–1 |

## Data props

```jsx
<MatchmakingScreen
  homeRoster={HomePlayer[]}      // 5 entries with pos/name/spd/dex/jmp/acc/ability/abilities
  homeTeamName={string}          // e.g. "u/dolong" or "BULLS"
  awayTeam={{
    name: string,                // "CELTICS"
    username?: string,           // optional — preferred for display
    players: AwayPlayer[],       // 5 entries; opponents.json only carries pos/name/ovr
  }}
  onReady={() => void}           // fired at countdown end
  isMobile={boolean?}            // optional override for the auto-detected layout
/>
```

- **Display handle** uses `formatHandle(team)` — prefers `team.username`, then `callsign`, then `name`. Auto-prefixes with `u/` unless already prefixed.
- **OVR** is computed client-side via position-weighted formula matching [CollectionScreen2.jsx](src/components/CollectionScreen2.jsx) (`OVR_WEIGHTS` constants). Falls back to `p.ovr` if present (opponents.json supplies it directly).
- **Abilities** prefer `p.abilities[]`, fall back to single `p.ability`. Each can be string or `{name, rarity}`. Rendered as colored chips by rarity (1=teal, 2=purple, 3=gold).
- **RP** is hardcoded `0` — no ranking system yet.

## Layout: desktop vs mobile

The component auto-detects portrait vs landscape from its **container** size (via `ResizeObserver` on the root), not `window`. The `isMobile` prop overrides detection (used by the story toggle).

### Desktop (`w/h ≥ 1`, default)

- Base stage is `1920×1080`. Scaled to fit the container with `transform: translate(-50%, -50%) scale(N)` where `N = min(w/1920, h/1080)`.
- Side panels left/right, rosters across the bottom, VS mark center.

### Mobile (`body.is-mobile` class on `<body>`)

- Stage is `width: 100%; height: 100%`. No transform-scale.
- Home panel = top 50%, away panel = bottom 50% (`flex-direction: column-reverse` on the right).
- Snoo avatars fill each half, `transform: scale(0.75)` to leave room for overlays.
- Rosters overlay the avatars at `top: 19%` (home) and `top: 69%` (away), `height: 22%`, `transform: scale(0.9)`.
- Run sprites scaled via CSS `transform: scale(0.85)`. Image band 100px tall.
- VS mark centered; launch-bar pinned to `bottom: 14px`.

The `body.is-mobile` class is also used by other screens ([CollectionScreenNew.jsx](src/components/CollectionScreenNew.jsx)) — `MatchmakingScreen` adds it on mount/prop-change and removes it on unmount.

## Rendering the run sprites

Roster cards each contain a small canvas-based `RunSprite` that cycles through `RUN_FRAMES` from [src/sprites/run.js](src/sprites/run.js) at 80ms per frame. Jersey color is passed as a prop (`JERSEY_HOME` for the home side, `JERSEY_AWAY` for the away side) — the sprite replaces any pixel whose source color is `JERSEY_BASE` with the jersey color at draw time.

The pattern matches [LobbyScreen.jsx](src/components/LobbyScreen.jsx)'s existing `RunSprite` — same `setInterval` + `requestAnimationFrame`-equivalent draw cadence, same pixel-iteration logic.

## Story preview

[MatchmakingStory.jsx](dev-tools/stories/MatchmakingStory.jsx) is the live preview during development. Controls on top of the preview box:

- **Home team** selector (BULLS / LAKERS / NETS with full stat+ability data)
- **Away team** selector (CELTICS / HEAT / SPURS)
- **Mobile toggle** — swaps the preview between a desktop sized box and `PhoneFrameExpanded`
- **Desktop preset dropdown** — 628×548 (Reddit, default), 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 540×700, 480×800
- **Manual W / H inputs** override the preset
- **Device selector** (mobile only) — iPhone 14, iPhone 14 Plus, iPhone SE 3, Android Small, Pixel 7, Reddit narrow
- **SL / VIG sliders** for scanlines and vignette via shared `CrtOverlay`
- **Replay button** — bumps a `runKey` to force-remount the component and restart the sequence

The story does NOT use the standard `StoryFrame` — that wraps children in `<svg>` for pixel-art screens and would break a div-based component. It renders the screen directly inside a sized preview box.

## Known limitations

- No real PvP — opponent is always a random entry from [src/opponents.json](src/opponents.json) (4 teams), looked up once at App mount.
- Opponent data is missing `spd/dex/jmp/acc` and abilities — only `ovr` is present, so opponent cards show `—` for individual stats and "NO ABILITY".
- Energy deducts at the moment we leave matchmaking (via `game.start` in `handleMatchmakingReady`). Backing out of matchmaking before the countdown ends does NOT cost energy.
- The 5s search delay is fixed (visual only) — there's no actual queue lookup.

## Adding a real opponent backend (when needed)

1. New server module `src/server/core/matchmaking.ts` exporting two procedures via tRPC:
   - `findOpponent()` → returns `{ opponentUsername, opponentTeam, opponentRoster, opponentLineup }`. Implementation: random pick from a queue sorted-set, or fall back to a bot if none queued.
   - `getOpponentRoster(username)` → joins `user:roster:{username}` + `user:lineup:{username}` + `player:{id}` hashes, returning the same shape App.jsx builds for the home roster (see [App.jsx](src/App.jsx) the `Promise.all([trpc.user.roster.query(), trpc.user.lineup.query()])` block).
2. Call `findOpponent` from `MatchmakingScreen` on mount during the 5s `searching` window, store the result, pass it forward via `onReady`.
3. App.jsx forwards the opponent roster into `gameState` so the actual basketball game plays against the real opponent's lineup instead of `OPPONENTS[Math.floor(Math.random()...)]`.

The screen's component contract already supports this — just supply a richer `awayTeam` prop with a `username` field and full per-player stats.

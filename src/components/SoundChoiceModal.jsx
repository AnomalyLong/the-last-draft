import React from 'react';
import { SPIN_MOVE_FRAMES, RUN_BALL_FRAMES } from '../sprites/index.js';
import { Ball } from './Ball.jsx';
import { JERSEY_BASE, JERSEY_HOME } from '../constants.js';

// First thing a brand-new (FTUE) user sees: pick an audio mode before the
// lobby music starts. Reddit autoplays nothing, and mobile browsers block
// unmuted audio until a real gesture — so this modal doubles as the gesture
// that unlocks the audio context. Whichever button is tapped, the tap itself
// is what lets titleMusic.start() actually produce sound on iOS Safari.

// ---------------------------------------------------------------------------
// Animation: ~3s of running-and-dribbling, then the spin move, then loop.
//
// Phase sequencing runs off one 80ms interval. 36 run frames (2880ms) is the
// closest whole number of 6-frame stride cycles to "3 seconds" — 38 would have
// cut the stride mid-step and snapped the legs on the handoff to the spin.
const FRAME_MS = 80;
const RUN_CYCLE = RUN_BALL_FRAMES.length;     // 6 frames = 480ms per stride
const DRIBBLE_FRAMES = RUN_CYCLE * 6;         // 36 frames = 2880ms of running
const SPIN_FRAMES = SPIN_MOVE_FRAMES.length;  // 12
const CYCLE_FRAMES = DRIBBLE_FRAMES + SPIN_FRAMES;

// ---------------------------------------------------------------------------
// Coordinate space — and the ball/player size ratio
//
// THE RULE: the court draws <Player scale={1.5}> but <Ball scale={1}>. The
// player's pixels are 1.5 units each; the ball's are 1. Any surface that draws
// both has to honour that asymmetry or the ball comes out the wrong size.
//
//   court:  ball 7 units : player 14*1.5 = 21 units   -> ratio 0.33
//
// This modal originally drew BOTH at scale 1 (ball 7 : player 14), a ratio of
// 0.50 — a ball exactly 1.5x too big, because the player's 1.5 was never
// applied. Fixed by scaling the SPRITES by 1.5 and leaving Ball at 1, which is
// the court's arrangement verbatim rather than an approximation of it. Scaling
// the ball DOWN by 1/1.5 would have matched the ratio too, but it would put the
// ball's pixels on a 0.667-unit grid under shapeRendering=crispEdges; keeping
// Ball at scale 1 leaves its rects on whole units exactly like the court.
const PLAYER_SCALE = 1.5;

// Sprite ink boxes, measured from the sprite data (not assumed):
//   SPIN_MOVE_FRAMES — raw coords x 14..30, y 22..38  (17x17, feet ink row 38)
//   RUN_BALL_FRAMES  — own box    x  0..13, y  0..17  (14x18, feet ink row 17)
//   BALL_FRAMES      — 7x7 box, ink x 1..5, y ..5 in all three phases
//
// A 1x1 rect at ink row 38 spans [38,39), so at PLAYER_SCALE the spin sprite's
// floor is its bottom EDGE: 38*1.5 + 1.5 = 58.5. Getting that edge-vs-row
// distinction wrong is what left the ball hovering before.
const FLOOR_EDGE_Y = 38 * PLAYER_SCALE + PLAYER_SCALE;   // 58.5
const RUN_H = 18 * PLAYER_SCALE;                         // 27
const RUN_W = 14 * PLAYER_SCALE;                         // 21
const SPIN_CX = ((14 + 30 + 1) * PLAYER_SCALE) / 2;      // 33.75 — spin box centre
// Run sprite: feet on the same floor edge, body centred under the spin sprite
// so the handoff between phases doesn't jump sideways.
const RUN_DY = FLOOR_EDGE_Y - RUN_H;                     // 31.5
const RUN_DX = SPIN_CX - RUN_W / 2;                      // 23.25

// ---------------------------------------------------------------------------
// Ball
//
// Run phase: the court's real <Ball>, in the same configuration GameScene and
// SplashCourt use for a *moving* ball-handler — scale 1, lift 3, syncToRun.
// syncToRun swaps the 500ms sine for the court's 6-entry per-stride lookup
// (yOff [10,4,-2,-3,-2,4]), which holds the ball near its apex across the
// middle of the stride and drops it hard to the floor. It reads as a real
// dribble rather than a hover, and it parks the ball ON the floor for a whole
// 80ms frame instead of kissing it for one instant at the sine peak.
//
// Both the Ball and Player derive their frame from ABSOLUTE time
// (floor(now/80) % 6), not mount time, so the bounce stays locked to the
// stride. The run frame below is computed the same way for that reason.
//
// Floor alignment. BALL_FRAMES ink does not fill its 7x7 box: up/mid/flat all
// bottom out at local row 5, not 6. Ball.jsx centres on the BOX (cy - 7/2), so
// the drawn underside sits at cy - 3.5 + 6 + yOff.
const BALL_YOFF_MAX = 10;             // deepest point of the syncToRun stride
const BALL_INK_BOTTOM = 6;            // bottom edge of ink row 5 within the 7x7 box
const BALL_CY = FLOOR_EDGE_Y - BALL_INK_BOTTOM + 3.5 - BALL_YOFF_MAX;  // 46
// Court leads the ball 10 units ahead of player centre while moving
// (GameScene: cx = p.cx - 10 facing left). Same number here, unscaled, because
// it is a ball-space offset in both places.
const BALL_CX = SPIN_CX - 10;                            // 23.75
//
// Spin phase: NO separate <Ball>. The ball is drawn into SPIN_MOVE_FRAMES
// itself as a compact 4x4 blob that arcs from low-right (f1) up through the
// mid-spin hold (f5-f7) and back across to the left as the player drives out
// (f10-f11). That is why GameScene.jsx and SplashCourt.jsx both gate <Ball>
// behind `!p.isSpinning` — during a spin the sprite already has one.

// viewBox spans the ball at its left extent through the spin sprite's right
// edge, and the spin sprite's crown down to the floor edge.
const VB_X = 20, VB_Y = 33, VB_W = 27, VB_H = 26;

// `lineHeight` is set explicitly on every text node below. App's root sets
// lineHeight: 0 (load-bearing for the pixel-art layout) and it inherits, so
// any container with real text has to opt back in or the lines overlap.

// Default size keeps the player's ON-SCREEN height where it was before the
// ratio fix: the viewBox grew ~1.5x with the sprites, so the rendered width
// comes down to compensate. It is the ball that shrinks, not the player that
// grows.
function SpinSprite({ jerseyColor = JERSEY_HOME, size = 124 }) {
  // Driven by rAF, not setInterval, and for the same reason Player.jsx does it:
  // <Ball syncToRun> updates its bounce every animation frame off ABSOLUTE time.
  // A setInterval here re-rendered the sprite on its own jittery schedule, so
  // under load the legs lagged the bounce by a frame and the ball hit the floor
  // on the wrong step. Both values below come from one rAF timestamp.
  //   cycleFrame — mount-relative, sequences run -> spin
  //   runFrame   — absolute, identical formula to Ball's, so the stride locks
  const [t, setT] = React.useState(() => ({ cycleFrame: 0, runFrame: 0 }));

  React.useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const next = {
        cycleFrame: Math.floor((now - start) / FRAME_MS) % CYCLE_FRAMES,
        runFrame: Math.floor(now / FRAME_MS) % RUN_CYCLE,
      };
      // Bail out of the re-render between visible frame changes.
      setT((p) =>
        p.cycleFrame === next.cycleFrame && p.runFrame === next.runFrame ? p : next,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const { cycleFrame, runFrame } = t;
  const isSpinning = cycleFrame >= DRIBBLE_FRAMES;
  const spinFrame = isSpinning ? cycleFrame - DRIBBLE_FRAMES : 0;

  // Same rect shape Player.jsx uses: coords and size both multiplied by scale.
  const paint = (pixels, keyPrefix) =>
    pixels.map(([x, y, fill], i) => (
      <rect
        key={`${keyPrefix}${i}`}
        x={x * PLAYER_SCALE}
        y={y * PLAYER_SCALE}
        width={PLAYER_SCALE}
        height={PLAYER_SCALE}
        fill={fill === JERSEY_BASE ? jerseyColor : fill}
      />
    ));

  return (
    <svg
      width={size}
      height={Math.round((size * VB_H) / VB_W)}
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
      data-testid="sound-choice-sprite"
      data-phase={isSpinning ? 'spin' : 'dribble'}
      data-frame={isSpinning ? spinFrame : cycleFrame}
      data-run-frame={isSpinning ? -1 : runFrame}
      aria-hidden="true"
    >
      {isSpinning ? (
        // Ball is part of the sprite data — render every pixel, unfiltered.
        <g data-testid="sound-choice-spin">
          {paint(SPIN_MOVE_FRAMES[spinFrame] || SPIN_MOVE_FRAMES[0], 's')}
        </g>
      ) : (
        <>
          <g data-testid="sound-choice-run" transform={`translate(${RUN_DX}, ${RUN_DY})`}>
            {paint(RUN_BALL_FRAMES[runFrame] || RUN_BALL_FRAMES[0], 'r')}
          </g>
          {/* Same props the court passes for a moving ball-handler, INCLUDING
              scale 1 while the sprite around it is at 1.5. That asymmetry is
              the whole point — see the ratio note at the top of this file.
              Remounting each cycle is harmless: syncToRun reads absolute time,
              so the bounce resumes in phase rather than restarting. */}
          <g data-testid="sound-choice-ball">
            <Ball cx={BALL_CX} cy={BALL_CY} scale={1} lift={3} syncToRun />
          </g>
        </>
      )}
    </svg>
  );
}

export function SoundChoiceModal({ onChoose }) {
  return (
    <div
      data-testid="sound-choice-modal"
      style={{
        position: 'absolute', inset: 0, zIndex: 400,
        background: 'rgba(4,7,12,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <style>{`
        @keyframes sc-pop   { from { transform: scale(0.86); opacity: 0; }
                              to   { transform: scale(1);    opacity: 1; } }
        @keyframes sc-bob   { 0%,100% { transform: translateY(0); }
                              50%     { transform: translateY(-5px); } }
        @keyframes sc-glow  { 0%,100% { box-shadow: 0 0 0 rgba(91,242,212,0); }
                              50%     { box-shadow: 0 0 22px rgba(91,242,212,0.35); } }
        .sc-btn { transition: transform .09s ease, filter .09s ease; }
        .sc-btn:hover  { transform: translateY(-2px); filter: brightness(1.08); }
        .sc-btn:active { transform: translateY(1px); }
      `}</style>

      <div
        style={{
          animation: 'sc-pop .18s ease-out both, sc-glow 2.6s ease-in-out infinite',
          background: '#0d1117',
          border: '2px solid #5bf2d4',
          borderRadius: 10,
          padding: '20px 20px 22px',
          width: '100%', maxWidth: 300,
          textAlign: 'center',
          fontFamily: 'monospace',
          lineHeight: 1.4,
        }}
      >
        {/* Sprite in a spotlight puck so the pixel art reads on the dark card */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              width: 148, height: 148, borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 62%, #16324a 0%, #0d1117 72%)',
              border: '1px solid #1d4f63',
            }}
          >
            <div style={{ animation: 'sc-bob 1.6s ease-in-out infinite', paddingBottom: 6 }}>
              <SpinSprite />
            </div>
          </div>
        </div>

        <div style={{
          color: '#5bf2d4', fontSize: 12, fontWeight: 900,
          letterSpacing: '0.14em', marginBottom: 6,
        }}>
          SOUND CHECK
        </div>
        <div style={{
          color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 16,
        }}>
          The Last Draft has crunchy retro SFX and a courtside soundtrack.
          You can change this any time from the lobby.
        </div>

        <button
          className="sc-btn"
          data-testid="sound-choice-on"
          onClick={() => onChoose(true)}
          style={{
            display: 'block', width: '100%', marginBottom: 9,
            background: '#5bf2d4', color: '#05231d', border: 'none', borderRadius: 6,
            padding: '11px 12px', fontFamily: 'monospace', fontSize: 11, fontWeight: 900,
            letterSpacing: '0.1em', cursor: 'pointer', lineHeight: 1.2,
          }}
        >
          &#9834; PLAY WITH SOUND
        </button>
        <button
          className="sc-btn"
          data-testid="sound-choice-off"
          onClick={() => onChoose(false)}
          style={{
            display: 'block', width: '100%',
            background: 'transparent', color: '#8899aa',
            border: '1px solid #2b3a4a', borderRadius: 6,
            padding: '11px 12px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', cursor: 'pointer', lineHeight: 1.2,
          }}
        >
          &#215; PLAY WITHOUT SOUND
        </button>
      </div>
    </div>
  );
}

export default SoundChoiceModal;

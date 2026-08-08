import React from 'react';
import { SPIN_MOVE_FRAMES, BALL_FRAMES } from '../sprites/index.js';
import { JERSEY_BASE, JERSEY_HOME } from '../constants.js';

// First thing a brand-new (FTUE) user sees: pick an audio mode before the
// lobby music starts. Reddit autoplays nothing, and mobile browsers block
// unmuted audio until a real gesture — so this modal doubles as the gesture
// that unlocks the audio context. Whichever button is tapped, the tap itself
// is what lets titleMusic.start() actually produce sound on iOS Safari.

// SPIN_MOVE_FRAMES live in raw sprite coordinates: x 14..30, y 22..38.
// Rendering with a viewBox on that box (rather than translating every pixel)
// keeps the sprite data untouched and lets CSS size the sprite responsively.
const VB_X = 14, VB_Y = 22, VB_W = 17, VB_H = 17;
const FRAME_MS = 80;

// spinmove.js documents #FF0000 as "opposing defender contact detail" — the
// bits of the DEFENDER the spin is blowing past, not part of the ball handler.
// In-game there's a defender there to hide them; here the player is solo, so
// they'd paint as a floating red blob by his feet. Drop them.
const DEFENDER_PX = '#FF0000';

// ---------------------------------------------------------------------------
// Ball
//
// The court view does NOT draw a ball during a spin move: GameScene.jsx and
// SplashCourt.jsx both gate <Ball> behind `!p.isSpinning`, and spinmove.js
// contains no ball-coloured pixels (its palette is skin/jersey/shoe/hair only).
// So there is no per-frame offset table to copy the way isDunking copies
// DUNK_BALL_OFFSETS — the path below is authored for this modal.
//
// What IS borrowed from the court is the ball's *behaviour*:
//   - the same BALL_FRAMES sprite data (up / mid / flat squash phases)
//   - the same three-phase selection by height that Ball.jsx does, so the ball
//     paints 'flat' as it meets the floor and 'up' at the top of the bounce
//   - the same 7×7 grid centring maths (translate by -3.5 * scale)
//
// Path: ball starts low-right, sweeps up and around the body as the player
// pivots, contacts the floor mid-spin (f6), then crosses back to the right and
// settles into a dribble on the drive-out (f11). Two floor contacts across the
// 12-frame / 960ms cycle ≈ the ~2 bounces/sec of the court's 500ms dribble.
const BALL_SCALE = 0.7;      // ≈ court's ball:player size ratio at this sprite height
const BALL_PATH = [
  [27.0, 34.0],  // f0  pivot start — ball low right
  [25.0, 32.0],  // f1  sweeping up
  [22.0, 30.2],  // f2  over the top, crossing body
  [18.5, 30.0],  // f3  apex, left side
  [16.2, 33.0],  // f4  dropping down the left
  [16.0, 35.4],  // f5  approaching floor
  [17.2, 36.2],  // f6  floor contact (mid-spin dribble)
  [20.0, 34.0],  // f7  rising off the bounce
  [22.5, 31.2],  // f8  crossing back to the right
  [26.0, 31.0],  // f9  apex, right side
  [28.0, 33.5],  // f10 dropping
  [28.8, 36.0],  // f11 floor contact — settles into the drive-out dribble
];

// Mirrors Ball.jsx's height→phase mapping, rebased onto sprite coords where
// the floor (the player's feet) sits at y = 38.
function ballPhase(y) {
  if (y >= 35.5) return 'flat';
  if (y >= 32.5) return 'mid';
  return 'up';
}

// `lineHeight` is set explicitly on every text node below. App's root sets
// lineHeight: 0 (load-bearing for the pixel-art layout) and it inherits, so
// any container with real text has to opt back in or the lines overlap.

function SpinSprite({ jerseyColor = JERSEY_HOME, size = 132 }) {
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(
      () => setFrame((f) => (f + 1) % SPIN_MOVE_FRAMES.length),
      FRAME_MS,
    );
    return () => clearInterval(id);
  }, []);

  const pixels = (SPIN_MOVE_FRAMES[frame] || SPIN_MOVE_FRAMES[0])
    .filter(([, , fill]) => fill !== DEFENDER_PX);

  const [bx, by] = BALL_PATH[frame] || BALL_PATH[0];
  const phase = ballPhase(by);
  const ballPixels = BALL_FRAMES[phase] || BALL_FRAMES.up;
  // Centre the nominal 7×7 ball grid on (bx, by), exactly as Ball.jsx does.
  const bx0 = bx - 3.5 * BALL_SCALE;
  const by0 = by - 3.5 * BALL_SCALE;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
      data-testid="sound-choice-sprite"
      data-frame={frame}
      aria-hidden="true"
    >
      {pixels.map(([x, y, fill], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={fill === JERSEY_BASE ? jerseyColor : fill}
        />
      ))}
      {/* Ball paints after the body so it reads as being in front of the
          handler — same draw order as the isDunking branch in Player.jsx. */}
      <g data-testid="sound-choice-ball" data-ball-phase={phase}>
        {ballPixels.map(([x, y, fill], i) => (
          <rect
            key={`b${i}`}
            x={bx0 + x * BALL_SCALE}
            y={by0 + y * BALL_SCALE}
            width={BALL_SCALE}
            height={BALL_SCALE}
            fill={fill}
          />
        ))}
      </g>
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

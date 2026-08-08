import React from 'react';
import { SPIN_MOVE_FRAMES } from '../sprites/index.js';
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

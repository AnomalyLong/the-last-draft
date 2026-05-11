import React, { useState, useEffect, useRef } from 'react';
import { JERSEY_BASE } from '@src/constants.js';
import { SPRITE_PIXELS } from '@src/sprites/dribble.js';
import { IDLE_FRAMES } from '@src/sprites/idle.js';
import { RUN_FRAMES } from '@src/sprites/run.js';
import { RUN_BALL_FRAMES } from '@src/sprites/runball.js';
import { SHOOT_CHAR_FRAMES } from '@src/sprites/shoot.js';
import { BALL_FRAMES } from '@src/sprites/ball.js';
import { SHOT_FRAMES } from '@src/sprites/shot.js';
import { DUNK_FRAMES } from '@src/sprites/dunk.js';
import { BLOCK_JUMP_FRAMES } from '@src/sprites/blockjump.js';
import { JUMP_BALL_FRAMES } from '@src/sprites/jumpball.js';
import { STEAL_FRAMES } from '@src/sprites/steal.js';
import { SPIN_MOVE_FRAMES } from '@src/sprites/spinmove.js';
import { DASH_FRAMES } from '@src/sprites/dash.js';
import { FADEAWAY_FRAMES } from '@src/sprites/fadeaway.js';

const JERSEY_COLOR = '#1a6fd4';
const PIXEL_SCALE = 6;
const ANIM_INTERVAL = 100; // ms per frame default

const JerseyColorContext = React.createContext(JERSEY_COLOR);

// Normalize a sprite export to an array of frames.
// A pixel is [x, y, color] where x is a number.
// A frame is an array of pixels.
// An animation is an array of frames.
function isPixel(v) { return Array.isArray(v) && typeof v[0] === 'number'; }

function toFrames(raw) {
  if (!raw) return [];
  // Object with named keys (e.g. BALL_FRAMES: { up, mid, flat })
  if (!Array.isArray(raw)) {
    return Object.entries(raw).map(([key, pixels]) => ({ key, pixels }));
  }
  // Single frame: raw is [[x,y,c], ...] — first element is a pixel tuple
  if (isPixel(raw[0])) return [raw];
  // Array of frames: raw is [[[x,y,c],...], ...]
  return raw;
}

function getPixels(frame) {
  if (frame && frame.pixels) return frame.pixels;
  return frame;
}

function getFrameLabel(frame, index) {
  if (frame && frame.key) return frame.key;
  return `frame ${index + 1}`;
}

function SpriteCanvas({ pixels, scale = PIXEL_SCALE }) {
  const jerseyColor = React.useContext(JerseyColorContext);
  if (!pixels || pixels.length === 0) return <div style={{ color: '#666', fontSize: 11 }}>empty</div>;

  function resolveColor(c) {
    return c === JERSEY_BASE ? jerseyColor : c;
  }

  const xs = pixels.map((p) => p[0]);
  const ys = pixels.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const w = (maxX - minX + 1) * scale;
  const h = (maxY - minY + 1) * scale;

  return (
    <svg width={w} height={h} style={{ imageRendering: 'pixelated', display: 'block' }}>
      {pixels.map(([x, y, c], i) => (
        <rect
          key={i}
          x={(x - minX) * scale}
          y={(y - minY) * scale}
          width={scale}
          height={scale}
          fill={resolveColor(c)}
        />
      ))}
    </svg>
  );
}

function SpriteCard({ name, raw, defaultInterval = ANIM_INTERVAL }) {
  const frames = toFrames(raw);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(PIXEL_SCALE);
  const intervalRef = useRef(null);

  const clearTimer = () => { if (intervalRef.current) clearInterval(intervalRef.current); };

  useEffect(() => {
    if (frames.length <= 1) return;
    if (playing) {
      intervalRef.current = setInterval(() => {
        setFrameIdx((i) => (i + 1) % frames.length);
      }, defaultInterval);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [playing, frames.length, defaultInterval]);

  const prev = () => { clearTimer(); setPlaying(false); setFrameIdx((i) => (i - 1 + frames.length) % frames.length); };
  const next = () => { clearTimer(); setPlaying(false); setFrameIdx((i) => (i + 1) % frames.length); };

  const currentFrame = frames[frameIdx] || [];
  const pixels = getPixels(currentFrame);
  const label = getFrameLabel(currentFrame, frameIdx);

  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: 6,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 'bold', fontSize: 12, color: '#aaa', letterSpacing: 1 }}>{name}</div>

      <div style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: 4,
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
        overflow: 'hidden',
      }}>
        <SpriteCanvas pixels={pixels} scale={scale} />
      </div>

      <div style={{ fontSize: 11, color: '#666' }}>
        {label} &nbsp;·&nbsp; {frameIdx + 1}/{frames.length}
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {frames.length > 1 && (
          <>
            <Btn onClick={prev}>◀</Btn>
            <Btn onClick={() => setPlaying((p) => !p)}>{playing ? '⏸' : '▶'}</Btn>
            <Btn onClick={next}>▶</Btn>
          </>
        )}
        <Btn onClick={() => setScale((s) => Math.max(2, s - 2))}>−</Btn>
        <span style={{ fontSize: 10, color: '#555' }}>{scale}×</span>
        <Btn onClick={() => setScale((s) => Math.min(16, s + 2))}>+</Btn>
      </div>

      {frames.length > 1 && (
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={frameIdx}
          onChange={(e) => { clearTimer(); setPlaying(false); setFrameIdx(Number(e.target.value)); }}
          style={{ width: '100%' }}
        />
      )}
    </div>
  );
}

function Btn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#2a2a2a',
        border: '1px solid #444',
        color: '#ccc',
        borderRadius: 3,
        padding: '2px 7px',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}

const SPRITES = [
  { name: 'DRIBBLE (static)', raw: SPRITE_PIXELS, interval: null },
  { name: 'IDLE', raw: IDLE_FRAMES, interval: 120 },
  { name: 'RUN', raw: RUN_FRAMES, interval: 80 },
  { name: 'RUN + BALL', raw: RUN_BALL_FRAMES, interval: 80 },
  { name: 'SHOOT', raw: SHOOT_CHAR_FRAMES, interval: 80 },
  { name: 'FADEAWAY', raw: FADEAWAY_FRAMES, interval: 80 },
  { name: 'DUNK', raw: DUNK_FRAMES, interval: 80 },
  { name: 'BLOCK JUMP', raw: BLOCK_JUMP_FRAMES, interval: 80 },
  { name: 'JUMP BALL', raw: JUMP_BALL_FRAMES, interval: 80 },
  { name: 'STEAL', raw: STEAL_FRAMES, interval: 80 },
  { name: 'SPIN MOVE', raw: SPIN_MOVE_FRAMES, interval: 80 },
  { name: 'DASH', raw: DASH_FRAMES, interval: 80 },
  { name: 'BALL (bounce)', raw: BALL_FRAMES, interval: 200 },
  { name: 'BALL (shot arc)', raw: SHOT_FRAMES, interval: 80 },
];

export default function SpritePreview() {
  const [jerseyColor, setJerseyColor] = useState(JERSEY_COLOR);
  const [filter, setFilter] = useState('');

  const visible = SPRITES.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: 24 }}>
      <div style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#e0e0e0', fontWeight: 'bold', fontSize: 18, letterSpacing: 2 }}>
          🏀 SPRITE PREVIEW
        </span>
        <input
          type="text"
          placeholder="filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: '#1a1a1a', border: '1px solid #444', color: '#ccc',
            borderRadius: 4, padding: '4px 10px', fontSize: 13,
          }}
        />
        <label style={{ color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          Jersey color
          <input
            type="color"
            value={jerseyColor}
            onChange={(e) => setJerseyColor(e.target.value)}
            style={{ cursor: 'pointer', width: 32, height: 24 }}
          />
        </label>
        <span style={{ color: '#555', fontSize: 11 }}>{visible.length} sprites</span>
      </div>

      {/* Re-render with patched JERSEY_BASE color */}
      <JerseyColorContext.Provider value={jerseyColor}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {visible.map((s) => (
            <SpriteCard key={s.name} name={s.name} raw={s.raw} defaultInterval={s.interval ?? ANIM_INTERVAL} />
          ))}
        </div>
      </JerseyColorContext.Provider>
    </div>
  );
}


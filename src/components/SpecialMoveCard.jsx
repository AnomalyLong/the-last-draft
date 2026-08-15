import React from 'react';
import { JERSEY_BASE, JERSEY_HOME, ZOOM_W, TOTAL_H } from '../constants.js';
import { SpriteOutline } from './SpriteOutline.jsx';

const CARD_W = 160;
const CARD_H = 130;
const CARD_CX = ZOOM_W / 2;
const CARD_CY = TOTAL_H / 2 - 100;
const DEFAULT_spriteScale = 5;
const ENTER_MS = 150;
const EXIT_MS = 100;

const NUM_LINES = 24;

// Exported so callers can position the card without re-deriving its box.
export const SPECIAL_CARD_W = CARD_W;
export const SPECIAL_CARD_H = CARD_H;
export const SPECIAL_CARD_CY = CARD_CY;

function SpeedLines({ cx, cy, r, accentColor }) {
  const lines = [];
  for (let i = 0; i < NUM_LINES; i++) {
    const angle = (i / NUM_LINES) * Math.PI * 2;
    const inner = r * 0.18;
    const outer = r;
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;
    lines.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={i % 3 === 0 ? accentColor : i % 3 === 1 ? '#1a1a1a' : '#ffffff'}
        strokeWidth={i % 3 === 0 ? 2.5 : 1.2} opacity={0.85} />
    );
  }
  return <>{lines}</>;
}

export function SpecialMoveCard({
  player,
  frames,
  label,
  jerseyColor = JERSEY_HOME,
  cameraX = 0,
  frameDurationMs = 80,
  accentColor = '#F5C800',
  bgColor = '#F5E6C8',
  anchorX = 20,
  anchorY = 28,
  spriteScale = DEFAULT_spriteScale,
  outline = true,
  outlineColor = '#000000',
  // Card centre. Defaults to the in-game position (y=74), which is deliberately
  // up in the HUD band because the HUD is chrome the card is meant to cover.
  // Surfaces with no HUD (the inline splash) pass a lower cy so the card doesn't
  // sit on top of their own title text.
  cx = CARD_CX,
  cy = CARD_CY,
  testId,
}) {
  const [cardScale, setCardScale] = React.useState(0);
  const [frameIdx, setFrameIdx] = React.useState(0);
  const rafRef = React.useRef(null);

  const animMs = frames.length * frameDurationMs;
  const totalMs = ENTER_MS + animMs + EXIT_MS;

  React.useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      if (elapsed < ENTER_MS) {
        setCardScale(elapsed / ENTER_MS);
      } else if (elapsed < ENTER_MS + animMs) {
        setCardScale(1);
        const f = Math.min(Math.floor((elapsed - ENTER_MS) / frameDurationMs), frames.length - 1);
        setFrameIdx(f);
      } else if (elapsed < totalMs) {
        const t = (elapsed - ENTER_MS - animMs) / EXIT_MS;
        setCardScale(1 - t);
        setFrameIdx(frames.length - 1);
      } else {
        setCardScale(0);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [player?.id]);

  if (!player) return null;

  const CX = cx;
  const CY = cy;

  const pixels = frames[frameIdx] || frames[0];
  const spritePixels = pixels.map(([x, y, fill], i) => {
    const c = fill === JERSEY_BASE ? jerseyColor : fill;
    return <rect key={i} x={x * spriteScale} y={y * spriteScale} width={spriteScale} height={spriteScale} fill={c} />;
  });

  const spriteX = CX - anchorX * spriteScale;
  const spriteY = CY - anchorY * spriteScale;
  // Both ids are per-player: two cards can be on screen at once (a spin move
  // into a dash), and duplicate SVG ids resolve to whichever is first in
  // document order, so a shared id would make one card borrow the other's clip
  // and break when that one unmounts.
  const uid = `${testId || 'special-card'}-${player.id}`;
  const clipId = `${uid}-clip`;
  const shadowId = `${uid}-shadow`;

  return (
    <g data-testid={testId} transform={`translate(${cameraX}, 0)`} style={{ pointerEvents: 'none' }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={CX - CARD_W / 2 + 6} y={CY - CARD_H / 2 + 6}
            width={CARD_W - 12} height={CARD_H - 12} rx={6} ry={6} />
        </clipPath>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="4" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <g transform={`translate(${CX}, ${CY}) scale(${cardScale}) translate(${-CX}, ${-CY}) rotate(-4, ${CX}, ${CY})`}
        filter={`url(#${shadowId})`}>

        <rect x={CX - CARD_W / 2} y={CY - CARD_H / 2}
          width={CARD_W} height={CARD_H} rx={10} ry={10} fill="white" />

        <rect x={CX - CARD_W / 2 + 6} y={CY - CARD_H / 2 + 6}
          width={CARD_W - 12} height={CARD_H - 12} rx={6} ry={6} fill={bgColor} />

        <g clipPath={`url(#${clipId})`}>
          <SpeedLines cx={CX} cy={CY} r={CARD_W * 0.75} accentColor={accentColor} />
        </g>

        <g clipPath={`url(#${clipId})`} shapeRendering="crispEdges">
          <g transform={`translate(${spriteX}, ${spriteY})`}>
            {outline && <SpriteOutline pixels={pixels} scale={spriteScale} color={outlineColor} />}
            {spritePixels}
          </g>
        </g>

        <rect x={CX - CARD_W / 2 + 6} y={CY + CARD_H / 2 - 22}
          width={CARD_W - 12} height={16} rx={4} ry={4} fill="#1a1a1a" opacity={0.82} />
        <text x={CX} y={CY + CARD_H / 2 - 10}
          textAnchor="middle" fontSize={9} fontFamily="monospace"
          fontWeight="bold" fill={accentColor} letterSpacing={2}>
          {label}
        </text>
      </g>
    </g>
  );
}

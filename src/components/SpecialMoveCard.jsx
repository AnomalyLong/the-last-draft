import React from 'react';
import { JERSEY_BASE, JERSEY_HOME, ZOOM_W, TOTAL_H } from '../constants.js';

const CARD_W = 160;
const CARD_H = 130;
const CARD_CX = ZOOM_W / 2;
const CARD_CY = TOTAL_H / 2 - 100;
const SPRITE_SCALE = 5;
const ENTER_MS = 150;
const EXIT_MS = 100;

const NUM_LINES = 24;

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

  const jerseyDark = jerseyColor + '99';
  const pixels = frames[frameIdx] || frames[0];
  const spritePixels = pixels.map(([x, y, fill], i) => {
    const c = fill === JERSEY_BASE ? jerseyColor : fill;
    return <rect key={i} x={x * SPRITE_SCALE} y={y * SPRITE_SCALE} width={SPRITE_SCALE} height={SPRITE_SCALE} fill={c} />;
  });

  const spriteX = CARD_CX - anchorX * SPRITE_SCALE;
  const spriteY = CARD_CY - anchorY * SPRITE_SCALE;
  const clipId = `special-card-clip-${player.id}`;

  return (
    <g transform={`translate(${cameraX}, 0)`} style={{ pointerEvents: 'none' }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={CARD_CX - CARD_W / 2 + 6} y={CARD_CY - CARD_H / 2 + 6}
            width={CARD_W - 12} height={CARD_H - 12} rx={6} ry={6} />
        </clipPath>
        <filter id="special-card-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="4" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <g transform={`translate(${CARD_CX}, ${CARD_CY}) scale(${cardScale}) translate(${-CARD_CX}, ${-CARD_CY}) rotate(-4, ${CARD_CX}, ${CARD_CY})`}
        filter="url(#special-card-shadow)">

        <rect x={CARD_CX - CARD_W / 2} y={CARD_CY - CARD_H / 2}
          width={CARD_W} height={CARD_H} rx={10} ry={10} fill="white" />

        <rect x={CARD_CX - CARD_W / 2 + 6} y={CARD_CY - CARD_H / 2 + 6}
          width={CARD_W - 12} height={CARD_H - 12} rx={6} ry={6} fill={bgColor} />

        <g clipPath={`url(#${clipId})`}>
          <SpeedLines cx={CARD_CX} cy={CARD_CY} r={CARD_W * 0.75} accentColor={accentColor} />
        </g>

        <g clipPath={`url(#${clipId})`} shapeRendering="crispEdges">
          <g transform={`translate(${spriteX}, ${spriteY})`}>
            {spritePixels}
          </g>
        </g>

        <rect x={CARD_CX - CARD_W / 2 + 6} y={CARD_CY + CARD_H / 2 - 22}
          width={CARD_W - 12} height={16} rx={4} ry={4} fill="#1a1a1a" opacity={0.82} />
        <text x={CARD_CX} y={CARD_CY + CARD_H / 2 - 10}
          textAnchor="middle" fontSize={9} fontFamily="monospace"
          fontWeight="bold" fill={accentColor} letterSpacing={2}>
          {label}
        </text>
      </g>
    </g>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

const PLAYS = [
  { id: 'standard', tag: 'MOTION',  name: 'Standard',    desc: 'Motion Offense', color: '#20c8a0', tint: 'rgba(32,200,160,0.13)' },
  { id: 'pickroll', tag: 'SCREEN',  name: 'Pick & Roll', desc: 'Screen & Drive',  color: '#c060e0', tint: 'rgba(192,96,224,0.16)'  },
  { id: 'iso',      tag: 'ISO',     name: 'Isolation',   desc: '1-on-1 Matchup', color: '#e8c060', tint: 'rgba(232,192,96,0.20)'  },
];

const DLG_W    = 280;
const CARD_W   = DLG_W - 28;   // 252 — 14px padding each side
const CARD_H   = 82;
const CARD_GAP = 8;
const DLG_H    = 42 + PLAYS.length * CARD_H + (PLAYS.length - 1) * CARD_GAP + 14; // 318
const DLG_Y    = Math.round((TOTAL_H - DLG_H) / 2);
const N_PARTS  = 10;

// ─── Play card ────────────────────────────────────────────────────────────────

function PlayCard({ play, x, y, onClick }) {
  const [hover, setHover] = React.useState(false);

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>

      {/* Shadow */}
      <rect x={x + 2} y={y + 3} width={CARD_W} height={CARD_H} rx={4}
        fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />

      {/* Body */}
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill={hover ? '#263c60' : '#192840'} shapeRendering="crispEdges" />
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill="none" stroke={play.color} strokeWidth={hover ? 2 : 1} />
      {hover && (
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
          fill="white" opacity={0.06} shapeRendering="crispEdges" />
      )}

      {/* Tag pill */}
      <rect x={x + 6} y={y + 5} width={CARD_W - 12} height={11} rx={2}
        fill={play.tint} shapeRendering="crispEdges" />
      <rect x={x + 6} y={y + 5} width={CARD_W - 12} height={11} rx={2}
        fill="none" stroke={play.color} strokeWidth={1} />
      <PixelTextC text={play.tag} cx={x + CARD_W / 2} y={y + 7}
        scale={1} fill={play.color} outline={null} />

      {/* Play name — scale=2, glyph 9px → 18px tall, top y+20 bottom y+38 */}
      <PixelTextC text={play.name} cx={x + CARD_W / 2} y={y + 20}
        scale={2} fill="#e8f0ff" outline="#0a1828" />

      {/* Divider — below name (y+38 + 3px gap) */}
      <rect x={x + 8} y={y + 41} width={CARD_W - 16} height={1}
        fill="#2a4070" shapeRendering="crispEdges" />

      {/* Description */}
      <PixelTextC text={play.desc} cx={x + CARD_W / 2} y={y + 47}
        scale={1} fill="#6090b8" outline={null} />

      {/* SELECT button */}
      <rect x={x + 10} y={y + CARD_H - 22} width={CARD_W - 20} height={18} rx={3}
        fill={hover ? play.color : '#1a3060'} shapeRendering="crispEdges" />
      <PixelTextC text="SELECT" cx={x + CARD_W / 2} y={y + CARD_H - 18}
        scale={1} fill={hover ? '#000' : play.color} outline={null} />
    </g>
  );
}

// ─── Picker dialog ────────────────────────────────────────────────────────────

export function PlayPickerOverlay({ cameraX, onPick }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let rafId;
    const loop = () => { setTick(t => t + 1); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const dlgX    = cameraX + Math.round((ZOOM_W - DLG_W) / 2);
  const cardX   = dlgX + 14;
  const panelCX = cameraX + ZOOM_W / 2;

  const fadeIn  = Math.min(tick / 12, 1);
  const bPulse  = (Math.sin(tick * 0.055) + 1) / 2;
  const bWidth  = 1 + bPulse * 2;
  const bOp     = 0.35 + bPulse * 0.55;
  const bgGlowOp = (0.04 + bPulse * 0.05) * fadeIn;

  const shimX   = dlgX + ((tick * 2.4) % (DLG_W + 60)) - 30;
  const hFlash  = Math.floor(tick / 16) % 2 === 0 ? '#ffe060' : '#ffffff';
  const hBob    = Math.round(Math.sin(tick * 0.07) * 1);

  const particles = Array.from({ length: N_PARTS }, (_, i) => {
    const cycle = ((tick * 0.013 + i / N_PARTS) % 1);
    const xBase = dlgX + 12 + (i / (N_PARTS - 1)) * (DLG_W - 24);
    const x     = xBase + Math.sin(tick * 0.06 + i * 1.9) * 7;
    const y     = DLG_Y + DLG_H - cycle * (DLG_H + 24);
    const pOp   = Math.min(1, cycle * 8) * (1 - cycle * 0.6) * fadeIn;
    const col   = cycle > 0.55 ? '#fffff0' : '#ffe060';
    return { x, y, pOp, col };
  });

  const cardAnim = (i) => {
    const start = 5 + i * 9;
    const t     = Math.min(1, Math.max(0, (tick - start) / 14));
    const eased = 1 - (1 - t) * (1 - t);
    return { yOff: Math.round((1 - eased) * 22), op: eased };
  };

  const cPulse = (Math.sin(tick * 0.09 + 0.5) + 1) / 2;
  const cSz    = 4 + cPulse * 3;
  const cOp    = (0.4 + cPulse * 0.5) * fadeIn;
  const pad    = 7;
  const corners = [
    { x: dlgX + pad,          y: DLG_Y + pad },
    { x: dlgX + DLG_W - pad,  y: DLG_Y + pad },
    { x: dlgX + pad,          y: DLG_Y + DLG_H - pad },
    { x: dlgX + DLG_W - pad,  y: DLG_Y + DLG_H - pad },
  ];

  return (
    <g opacity={fadeIn}>
      {/* Dim backdrop */}
      <rect x={cameraX} y={0} width={ZOOM_W} height={TOTAL_H} fill="#000" opacity={0.65} />

      {/* Outer golden aura */}
      <rect x={dlgX - 8} y={DLG_Y - 8} width={DLG_W + 16} height={DLG_H + 16} rx={8}
        fill="#ffe060" opacity={bgGlowOp} shapeRendering="crispEdges" />

      {/* Dialog shadow */}
      <rect x={dlgX + 4} y={DLG_Y + 4} width={DLG_W} height={DLG_H} rx={4}
        fill="#000" opacity={0.55} shapeRendering="crispEdges" />
      {/* Dialog body */}
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
        fill="#111e32" shapeRendering="crispEdges" />
      {/* Header bar */}
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={26} rx={4}
        fill="#1a2a3e" shapeRendering="crispEdges" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <rect key={i}
          x={Math.round(p.x - 1)} y={Math.round(p.y - 1)}
          width={2} height={2}
          fill={p.col} opacity={p.pOp}
          shapeRendering="crispEdges" />
      ))}

      {/* Pulsating border */}
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
        fill="none" stroke="#ffe060" strokeWidth={bWidth} opacity={bOp} />
      {/* Inner accent border */}
      <rect x={dlgX + 2} y={DLG_Y + 2} width={DLG_W - 4} height={DLG_H - 4} rx={3}
        fill="none" stroke="#ffd040" strokeWidth={0.5} opacity={0.18 + bPulse * 0.14} />

      {/* Corner ornaments */}
      {corners.map((c, i) => (
        <g key={i} opacity={cOp}>
          <rect x={Math.round(c.x - cSz / 2)} y={Math.round(c.y)} width={Math.round(cSz)} height={1}
            fill="#ffe060" shapeRendering="crispEdges" />
          <rect x={Math.round(c.x)} y={Math.round(c.y - cSz / 2)} width={1} height={Math.round(cSz)}
            fill="#ffe060" shapeRendering="crispEdges" />
        </g>
      ))}

      {/* Header shimmer */}
      <defs>
        <clipPath id="play-hdr-clip">
          <rect x={dlgX + 1} y={DLG_Y + 1} width={DLG_W - 2} height={24} />
        </clipPath>
      </defs>
      <g clipPath="url(#play-hdr-clip)">
        <g transform={`rotate(-14, ${shimX + 7}, ${DLG_Y + 13})`}>
          <rect x={shimX} y={DLG_Y - 4} width={12} height={34}
            fill="white" opacity={0.20} />
        </g>
      </g>

      {/* Header text */}
      <PixelTextC text="CALL A PLAY" cx={panelCX} y={DLG_Y + 9 + hBob}
        scale={1} fill={hFlash} outline={null} />

      {/* Cards with staggered entrance — stacked vertically */}
      {PLAYS.map((play, i) => {
        const { yOff, op } = cardAnim(i);
        const cardY = DLG_Y + 34 + i * (CARD_H + CARD_GAP);
        return (
          <g key={play.id} opacity={op} transform={`translate(0 ${yOff})`}>
            <PlayCard
              play={play}
              x={cardX}
              y={cardY}
              onClick={() => onPick(play)}
            />
          </g>
        );
      })}
    </g>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H, DEFENSE_PICK_COUNTDOWN_MS } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

const DEFENSES = [
  { id: 'motion',     tag: 'ZONE',   name: 'Motion',     desc: ['Zone',   'Defense'],   color: '#5099ff', tint: 'rgba(80,153,255,0.15)' },
  { id: 'guard',      tag: 'MAN',    name: 'Guard',      desc: ['Guard A', 'Player'],  color: '#20c8a0', tint: 'rgba(32,200,160,0.13)' },
  { id: 'aggressive', tag: 'PRESS',  name: 'Aggressive', desc: ['All-Out', 'Press'],   color: '#e85060', tint: 'rgba(232,80,96,0.18)'  },
];

const DLG_W    = 300;
const SIDE_PAD = 10;
const CARD_GAP = 8;
const CARD_W   = Math.floor((DLG_W - SIDE_PAD * 2 - CARD_GAP * (DEFENSES.length - 1)) / DEFENSES.length);
const CARD_H   = 78;
const DLG_H    = Math.round(TOTAL_H / 3);
const DLG_Y    = TOTAL_H - DLG_H;
const N_PARTS  = 10;
const AUTO_DISMISS_MS = DEFENSE_PICK_COUNTDOWN_MS;

function DefenseCard({ def, x, y, onClick }) {
  const [hover, setHover] = React.useState(false);

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>

      <rect x={x + 2} y={y + 3} width={CARD_W} height={CARD_H} rx={4}
        fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />

      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill={hover ? '#3c2630' : '#281828'} opacity={0.2} shapeRendering="crispEdges" />
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill="none" stroke={def.color} strokeWidth={hover ? 2 : 1} />
      {hover && (
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
          fill="white" opacity={0.06} shapeRendering="crispEdges" />
      )}

      <rect x={x + 4} y={y + 5} width={CARD_W - 8} height={11} rx={2}
        fill={def.tint} shapeRendering="crispEdges" />
      <rect x={x + 4} y={y + 5} width={CARD_W - 8} height={11} rx={2}
        fill="none" stroke={def.color} strokeWidth={1} />
      <PixelTextC text={def.tag} cx={x + CARD_W / 2} y={y + 7}
        scale={1} fill={def.color} outline={null} />

      <PixelTextC text={def.name} cx={x + CARD_W / 2} y={y + 22}
        scale={1} fill="#ffe8e8" outline="#1a0a0a" />

      <rect x={x + 6} y={y + 34} width={CARD_W - 12} height={1}
        fill="#703040" shapeRendering="crispEdges" />

      <PixelTextC text={def.desc[0]} cx={x + CARD_W / 2} y={y + 39}
        scale={1} fill="#b08090" outline={null} />
      <PixelTextC text={def.desc[1]} cx={x + CARD_W / 2} y={y + 50}
        scale={1} fill="#b08090" outline={null} />

      <rect x={x + 6} y={y + CARD_H - 18} width={CARD_W - 12} height={14} rx={3}
        fill={hover ? def.color : '#601a30'} opacity={0.2} shapeRendering="crispEdges" />
      <PixelTextC text="SELECT" cx={x + CARD_W / 2} y={y + CARD_H - 15}
        scale={1} fill={hover ? '#000' : def.color} outline={null} />
    </g>
  );
}

export function DefensePickerOverlay({ cameraX, onPick }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let rafId;
    const loop = () => { setTick(t => t + 1); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const dlgX    = cameraX + Math.round((ZOOM_W - DLG_W) / 2);
  const panelCX = cameraX + ZOOM_W / 2;

  const elapsedMs   = tick * 16.67;
  const remainingS  = Math.max(0, Math.ceil((AUTO_DISMISS_MS - elapsedMs) / 1000));

  const fadeIn  = Math.min(tick / 12, 1);
  const bPulse  = (Math.sin(tick * 0.055) + 1) / 2;
  const bWidth  = 1 + bPulse * 2;
  const bOp     = 0.35 + bPulse * 0.55;
  const bgGlowOp = (0.04 + bPulse * 0.05) * fadeIn;

  const shimX   = dlgX + ((tick * 2.4) % (DLG_W + 60)) - 30;
  const hFlash  = Math.floor(tick / 16) % 2 === 0 ? '#ff6080' : '#ffffff';
  const hBob    = Math.round(Math.sin(tick * 0.07) * 1);

  const particles = Array.from({ length: N_PARTS }, (_, i) => {
    const cycle = ((tick * 0.013 + i / N_PARTS) % 1);
    const xBase = dlgX + 12 + (i / (N_PARTS - 1)) * (DLG_W - 24);
    const x     = xBase + Math.sin(tick * 0.06 + i * 1.9) * 7;
    const y     = DLG_Y + DLG_H - cycle * (DLG_H + 24);
    const pOp   = Math.min(1, cycle * 8) * (1 - cycle * 0.6) * fadeIn;
    const col   = cycle > 0.55 ? '#fff0f0' : '#ff6080';
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
      <rect x={dlgX - 8} y={DLG_Y - 8} width={DLG_W + 16} height={DLG_H + 16} rx={8}
        fill="#ff6080" opacity={bgGlowOp} shapeRendering="crispEdges" />

      <rect x={dlgX + 4} y={DLG_Y + 4} width={DLG_W} height={DLG_H} rx={4}
        fill="#000" opacity={0.55} shapeRendering="crispEdges" />
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
        fill="#321020" opacity={0.2} shapeRendering="crispEdges" />
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={26} rx={4}
        fill="#3e1a2a" opacity={0.2} shapeRendering="crispEdges" />

      {particles.map((p, i) => (
        <rect key={i}
          x={Math.round(p.x - 1)} y={Math.round(p.y - 1)}
          width={2} height={2}
          fill={p.col} opacity={p.pOp}
          shapeRendering="crispEdges" />
      ))}

      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
        fill="none" stroke="#ff6080" strokeWidth={bWidth} opacity={bOp} />
      <rect x={dlgX + 2} y={DLG_Y + 2} width={DLG_W - 4} height={DLG_H - 4} rx={3}
        fill="none" stroke="#ff4060" strokeWidth={0.5} opacity={0.18 + bPulse * 0.14} />

      {corners.map((c, i) => (
        <g key={i} opacity={cOp}>
          <rect x={Math.round(c.x - cSz / 2)} y={Math.round(c.y)} width={Math.round(cSz)} height={1}
            fill="#ff6080" shapeRendering="crispEdges" />
          <rect x={Math.round(c.x)} y={Math.round(c.y - cSz / 2)} width={1} height={Math.round(cSz)}
            fill="#ff6080" shapeRendering="crispEdges" />
        </g>
      ))}

      <defs>
        <clipPath id="def-hdr-clip">
          <rect x={dlgX + 1} y={DLG_Y + 1} width={DLG_W - 2} height={24} />
        </clipPath>
      </defs>
      <g clipPath="url(#def-hdr-clip)">
        <g transform={`rotate(-14, ${shimX + 7}, ${DLG_Y + 13})`}>
          <rect x={shimX} y={DLG_Y - 4} width={12} height={34}
            fill="white" opacity={0.20} />
        </g>
      </g>

      <PixelTextC text="PICK DEFENSE" cx={panelCX - 14} y={DLG_Y + 9 + hBob}
        scale={1} fill={hFlash} outline={null} />

      {/* Countdown ring + spinner — right side of the header */}
      {(() => {
        const cx = dlgX + DLG_W - 16;
        const cy = DLG_Y + 13;
        const r  = 7;
        const C  = 2 * Math.PI * r;
        const remainingT = Math.max(0, 1 - elapsedMs / AUTO_DISMISS_MS);
        const dashEmpty  = C * (1 - remainingT);
        const spinAngle  = (tick * 6) % 360; // continuous spin
        return (
          <g>
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke="#5a2030" strokeWidth={2} opacity={0.6} />
            {/* Depleting progress ring */}
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke="#ff6080" strokeWidth={2}
              strokeDasharray={`${C - dashEmpty} ${dashEmpty}`}
              strokeDashoffset={C * 0.25} // start at top
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round" />
            {/* Spinner arc — orbits continuously */}
            <g transform={`rotate(${spinAngle} ${cx} ${cy})`}>
              <circle cx={cx + r} cy={cy} r={1.6} fill="#ffe060" />
            </g>
            {/* Countdown number */}
            <PixelTextC text={`${remainingS}`} cx={cx} y={cy - 4}
              scale={1} fill="#ffffff" outline={null} />
          </g>
        );
      })()}

      {DEFENSES.map((def, i) => {
        const { yOff, op } = cardAnim(i);
        const cardX = dlgX + SIDE_PAD + i * (CARD_W + CARD_GAP);
        const cardY = DLG_Y + 32;
        return (
          <g key={def.id} opacity={op} transform={`translate(0 ${yOff})`}>
            <DefenseCard
              def={def}
              x={cardX}
              y={cardY}
              onClick={() => onPick(def)}
            />
          </g>
        );
      })}
    </g>
  );
}

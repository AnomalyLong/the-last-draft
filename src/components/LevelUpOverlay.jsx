import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

const RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };
const RARITY_LABELS = { 1: 'UNCOMMON', 2: 'RARE', 3: 'LEGENDARY' };
const RARITY_TINTS  = {
  1: 'rgba(32,200,160,0.13)',
  2: 'rgba(192,96,224,0.16)',
  3: 'rgba(232,192,96,0.20)',
};

const SWIRL_N     = 14;
const SWIRL_H     = 46;  // vertical range of helix (px)
const SWIRL_TICKS = 105; // ~1.68 s at 16 ms/tick

const DLG_W   = 380;
const CARD_W  = 112;
const CARD_H  = 102;
const CARD_GAP = 8;
// cards+gaps total: 3*112 + 2*8 = 352; padding: (380-352)/2 = 14
const DLG_H   = 42 + CARD_H + 14; // header + cards + bottom padding = 158
const DLG_Y   = Math.round((TOTAL_H - DLG_H) / 2);

// ─── Swirl effect ─────────────────────────────────────────────────────────────

function SwirlEffect({ tick, px, py }) {
  const t01  = tick / SWIRL_TICKS;
  const fade = t01 < 0.14
    ? t01 / 0.14
    : t01 > 0.82
      ? (1 - t01) / 0.18
      : 1;

  // Beam: starts as a hairline and expands into a wide radiant pillar
  const growT    = Math.min(tick / 28, 1);
  const expand   = growT * growT;               // ease-in: 0→1
  const outerHW  = expand * 18;                 // half-width of outer glow: 0→18
  const midHW    = expand * 8;                  // half-width of mid layer:  0→8
  const coreHW   = 0.5 + expand * 1.5;          // core half-width: 0.5→2
  const beamOp   = Math.min(tick / 8, 1) * fade;
  const beamBotY = py + 10;

  // Helix particles: golden color palette
  const particles = Array.from({ length: SWIRL_N }, (_, i) => {
    const tOff  = ((tick * 0.020 + i / SWIRL_N) % 1);
    const angle = tOff * Math.PI * 2;
    const r     = 12 - tOff * 4;
    const x     = px + Math.cos(angle) * r;
    const y     = py + 14 - tOff * SWIRL_H;
    const pOp   = Math.min(1, tOff * 5) * (1 - tOff * 0.60) * fade;
    const col   = tOff > 0.70 ? '#fffff0' : tOff > 0.40 ? '#ffe060' : '#c09820';
    const sz    = tOff > 0.55 ? 2 : 3;
    return { x, y, sz, op: pOp, col };
  });

  // Top sparkles — golden/white
  const sparkles = tick > 30
    ? Array.from({ length: 6 }, (_, i) => {
        const sa  = (tick * 0.06 + i * Math.PI / 3);
        const sr  = 5 + Math.sin(tick * 0.12 + i * 1.4) * 2;
        const sx  = px + Math.cos(sa) * sr;
        const sy  = py - 28 + Math.sin(tick * 0.10 + i * 0.9) * 4;
        const sOp = Math.min(1, (tick - 30) / 20) * (0.5 + 0.5 * Math.sin(tick * 0.18 + i)) * fade;
        return { x: sx, y: sy, op: sOp };
      })
    : [];

  // Ground rings
  const ringR  = Math.min(1, tick / 20) * 13;
  const ring2R = Math.min(1, tick / 30) * 18;

  // Text: gold/white flash
  const textOp   = Math.min(tick / 22, 1) * fade;
  const textY    = py - 22 - Math.min(tick / 35, 1) * 8;
  const textFill = Math.floor(tick / 11) % 2 === 0 ? '#ffe060' : '#ffffff';

  return (
    <g>
      {/* Sky beam — hairline that widens into a radiant pillar */}
      <defs>
        <linearGradient id="lvlup-beam-outer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffd040" stopOpacity={0} />
          <stop offset="45%"  stopColor="#ffd040" stopOpacity={0.45} />
          <stop offset="85%"  stopColor="#ffe880" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#ffd040" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="lvlup-beam-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fffef0" stopOpacity={0} />
          <stop offset="50%"  stopColor="#fffef0" stopOpacity={0.70} />
          <stop offset="88%"  stopColor="#ffffff"  stopOpacity={1.0} />
          <stop offset="100%" stopColor="#fffef0" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g opacity={beamOp}>
        {outerHW > 0.5 && (
          <rect x={px - outerHW} y={0} width={outerHW * 2} height={beamBotY}
            fill="url(#lvlup-beam-outer)" opacity={0.55} />
        )}
        {midHW > 0.5 && (
          <rect x={px - midHW} y={0} width={midHW * 2} height={beamBotY}
            fill="url(#lvlup-beam-core)" opacity={0.45} />
        )}
        <rect x={px - coreHW} y={0} width={coreHW * 2} height={beamBotY}
          fill="url(#lvlup-beam-core)" opacity={0.95} />
      </g>

      {/* Ground rings — gold */}
      <ellipse cx={px} cy={py + 14} rx={ring2R} ry={ring2R * 0.30}
        fill="none" stroke="#c09000" strokeWidth={1} opacity={0.20 * fade} />
      <ellipse cx={px} cy={py + 14} rx={ringR} ry={ringR * 0.32}
        fill="none" stroke="#ffe060" strokeWidth={1.5} opacity={0.35 * fade} />

      {/* Helix */}
      {particles.map((p, i) => (
        <rect key={i}
          x={Math.round(p.x - p.sz / 2)} y={Math.round(p.y - p.sz / 2)}
          width={p.sz} height={p.sz}
          fill={p.col} opacity={p.op}
          shapeRendering="crispEdges" />
      ))}

      {/* Top sparkles */}
      {sparkles.map((s, i) => (
        <rect key={`s${i}`}
          x={Math.round(s.x - 1.5)} y={Math.round(s.y - 1.5)}
          width={3} height={3}
          fill="#fffff0" opacity={s.op}
          shapeRendering="crispEdges" />
      ))}

      {/* LEVEL UP */}
      <g opacity={textOp}>
        <PixelTextC
          text="LEVEL UP"
          cx={px} y={Math.round(textY)}
          scale={2} fill={textFill} outline="#302000" thick />
      </g>
    </g>
  );
}

// ─── Ability card ─────────────────────────────────────────────────────────────

function AbilityCard({ ability, x, y, onClick }) {
  const [hover, setHover] = React.useState(false);
  const [pulse, setPulse] = React.useState(0);

  const rc = RARITY_COLORS[ability.rarity];
  const rt = RARITY_TINTS[ability.rarity];
  const bg = hover ? '#263c60' : '#192840';

  React.useEffect(() => {
    if (ability.rarity < 3) return;
    const id = setInterval(() => setPulse(t => t + 1), 40);
    return () => clearInterval(id);
  }, [ability.rarity]);

  const glow = ability.rarity === 3 ? (Math.sin(pulse * 0.10) + 1) / 2 : 0;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>

      {/* Legendary glow */}
      {ability.rarity === 3 && (
        <>
          <rect x={x - 4} y={y - 4} width={CARD_W + 8} height={CARD_H + 8} rx={6}
            fill="none" stroke={rc} strokeWidth={2} opacity={glow * 0.40} />
          <rect x={x - 1} y={y - 1} width={CARD_W + 2} height={CARD_H + 2} rx={5}
            fill="none" stroke={rc} strokeWidth={1} opacity={0.30 + glow * 0.40} />
        </>
      )}

      {/* Shadow */}
      <rect x={x + 2} y={y + 3} width={CARD_W} height={CARD_H} rx={4}
        fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />

      {/* Body */}
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill={bg} shapeRendering="crispEdges" />
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill="none" stroke={rc} strokeWidth={hover ? 2 : 1} />
      {hover && (
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
          fill="white" opacity={0.06} shapeRendering="crispEdges" />
      )}

      {/* Rarity pill */}
      <rect x={x + 6} y={y + 6} width={CARD_W - 12} height={13} rx={2}
        fill={rt} shapeRendering="crispEdges" />
      <rect x={x + 6} y={y + 6} width={CARD_W - 12} height={13} rx={2}
        fill="none" stroke={rc} strokeWidth={1} />
      <PixelTextC text={RARITY_LABELS[ability.rarity]} cx={x + CARD_W / 2} y={y + 9}
        scale={1} fill={rc} outline={null} />

      {/* Ability name */}
      <PixelTextC text={ability.name} cx={x + CARD_W / 2} y={y + 28}
        scale={1} fill="#e8f0ff" outline={null} />

      {/* Divider */}
      <rect x={x + 8} y={y + 40} width={CARD_W - 16} height={1}
        fill="#2a4070" shapeRendering="crispEdges" />

      {/* Description */}
      <PixelTextC text={ability.desc} cx={x + CARD_W / 2} y={y + 46}
        scale={1} fill="#6090b8" outline={null} />

      {/* PICK button */}
      <rect x={x + 10} y={y + CARD_H - 26} width={CARD_W - 20} height={18} rx={3}
        fill={hover ? rc : '#1a3060'} shapeRendering="crispEdges" />
      <PixelTextC text="PICK" cx={x + CARD_W / 2} y={y + CARD_H - 22}
        scale={1} fill={hover ? '#000' : rc} outline={null} />
    </g>
  );
}

// ─── Ability picker dialog ────────────────────────────────────────────────────

const N_PARTS = 14;

function AbilityPickerDialog({ abilities, cameraX, onPick }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 16);
    return () => clearInterval(id);
  }, []);

  const dlgX    = cameraX + Math.round((ZOOM_W - DLG_W) / 2);
  const cardsX0 = dlgX + 14;
  const panelCX = cameraX + ZOOM_W / 2;

  // ── Fade-in ──────────────────────────────────────────────────────────────
  const fadeIn = Math.min(tick / 12, 1);

  // ── Pulsating border ─────────────────────────────────────────────────────
  const bPulse  = (Math.sin(tick * 0.055) + 1) / 2;
  const bWidth  = 1 + bPulse * 2;
  const bOp     = 0.35 + bPulse * 0.55;

  // ── Background glow behind dialog ────────────────────────────────────────
  const bgGlowOp = (0.04 + bPulse * 0.05) * fadeIn;

  // ── Header shimmer sweep ─────────────────────────────────────────────────
  const shimX = dlgX + ((tick * 2.4) % (DLG_W + 60)) - 30;

  // ── Header text flash ────────────────────────────────────────────────────
  const hFlash = Math.floor(tick / 16) % 2 === 0 ? '#ffe060' : '#ffffff';
  const hBob   = Math.round(Math.sin(tick * 0.07) * 1); // ±1 px gentle bob

  // ── Floating golden particles ─────────────────────────────────────────────
  const particles = Array.from({ length: N_PARTS }, (_, i) => {
    const cycle = ((tick * 0.013 + i / N_PARTS) % 1);
    const xBase = dlgX + 12 + (i / (N_PARTS - 1)) * (DLG_W - 24);
    const x     = xBase + Math.sin(tick * 0.06 + i * 1.9) * 7;
    const y     = DLG_Y + DLG_H - cycle * (DLG_H + 24);
    const pOp   = Math.min(1, cycle * 8) * (1 - cycle * 0.6) * fadeIn;
    const col   = cycle > 0.55 ? '#fffff0' : '#ffe060';
    return { x, y, pOp, col };
  });

  // ── Card entrance: staggered slide up ────────────────────────────────────
  const cardAnim = (i) => {
    const start = 5 + i * 9;
    const t     = Math.min(1, Math.max(0, (tick - start) / 14));
    const eased = 1 - (1 - t) * (1 - t);
    return { yOff: Math.round((1 - eased) * 22), op: eased };
  };

  // ── Corner ornaments ─────────────────────────────────────────────────────
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

  // ── Burst sparks on entry (first 30 ticks) ───────────────────────────────
  const bursts = tick < 32
    ? Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist  = Math.min(tick / 30, 1) * 28;
        const bx    = panelCX + Math.cos(angle) * dist;
        const by    = DLG_Y + DLG_H / 2 + Math.sin(angle) * dist * 0.45;
        const bOp2  = Math.max(0, 1 - tick / 28);
        return { x: bx, y: by, op: bOp2 * fadeIn };
      })
    : [];

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

      {/* Entry burst sparks */}
      {bursts.map((b, i) => (
        <rect key={i}
          x={Math.round(b.x - 1.5)} y={Math.round(b.y - 1.5)}
          width={3} height={3}
          fill="#ffe880" opacity={b.op}
          shapeRendering="crispEdges" />
      ))}

      {/* Pulsating border */}
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
        fill="none" stroke="#ffe060" strokeWidth={bWidth} opacity={bOp} />
      {/* Inner accent border */}
      <rect x={dlgX + 2} y={DLG_Y + 2} width={DLG_W - 4} height={DLG_H - 4} rx={3}
        fill="none" stroke="#ffd040" strokeWidth={0.5} opacity={0.18 + bPulse * 0.14} />

      {/* Corner ornaments (crosshairs) */}
      {corners.map((c, i) => (
        <g key={i} opacity={cOp}>
          <rect x={Math.round(c.x - cSz / 2)} y={Math.round(c.y) - 0} width={Math.round(cSz)} height={1}
            fill="#ffe060" shapeRendering="crispEdges" />
          <rect x={Math.round(c.x)} y={Math.round(c.y - cSz / 2)} width={1} height={Math.round(cSz)}
            fill="#ffe060" shapeRendering="crispEdges" />
        </g>
      ))}

      {/* Header shimmer clip */}
      <defs>
        <clipPath id="dlg-hdr-clip">
          <rect x={dlgX + 1} y={DLG_Y + 1} width={DLG_W - 2} height={24} />
        </clipPath>
      </defs>
      <g clipPath="url(#dlg-hdr-clip)">
        <g transform={`rotate(-14, ${shimX + 7}, ${DLG_Y + 13})`}>
          <rect x={shimX} y={DLG_Y - 4} width={12} height={34}
            fill="white" opacity={0.20} />
        </g>
      </g>

      {/* Header text */}
      <PixelTextC text="CHOOSE AN UPGRADE" cx={panelCX} y={DLG_Y + 9 + hBob}
        scale={1} fill={hFlash} outline={null} />

      {/* Cards with staggered entrance */}
      {abilities.map((ability, i) => {
        const { yOff, op } = cardAnim(i);
        return (
          <g key={ability.id} opacity={op} transform={`translate(0 ${yOff})`}>
            <AbilityCard
              ability={ability}
              x={cardsX0 + i * (CARD_W + CARD_GAP)}
              y={DLG_Y + 34}
              onClick={() => onPick(ability)}
            />
          </g>
        );
      })}
    </g>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LevelUpOverlay({ player, abilities, cameraX, onPick }) {
  const [phase, setPhase] = React.useState('swirl');
  const [tick,  setTick]  = React.useState(0);
  const iRef = React.useRef(null);

  React.useEffect(() => {
    setPhase('swirl');
    let t = 0;
    setTick(0);
    if (iRef.current) clearInterval(iRef.current);
    iRef.current = setInterval(() => {
      t += 1;
      setTick(t);
      if (t >= SWIRL_TICKS) {
        clearInterval(iRef.current);
        iRef.current = null;
        setPhase('pick');
      }
    }, 16);
    return () => { if (iRef.current) clearInterval(iRef.current); };
  }, [player.id]);

  if (phase === 'swirl') {
    return <SwirlEffect tick={tick} px={player.cx} py={player.cy - 10} />;
  }

  return (
    <AbilityPickerDialog
      abilities={abilities}
      cameraX={cameraX}
      onPick={onPick}
    />
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';
import { useRafTick } from './useRafTick.js';

const PLAYS = [
  { id: 'standard', tag: 'MOTION',  name: 'Standard',    desc: ['Motion', 'Offense'], color: '#20c8a0', tint: 'rgba(32,200,160,0.13)' },
  { id: 'pickroll', tag: 'SCREEN',  name: 'Pick & Roll', desc: ['Screen', '& Drive'], color: '#c060e0', tint: 'rgba(192,96,224,0.16)' },
  { id: 'iso',      tag: 'ISO',     name: 'Isolation',   desc: ['1-on-1', 'Matchup'], color: '#e8c060', tint: 'rgba(232,192,96,0.20)' },
];

// Isolation target picker — who the PG feeds for the 1-on-1.
// 'PG' keeps the ball (no pass); the rest receive a pass after the step-back.
const ISO_TARGETS = [
  { role: 'PG', label: 'PG', action: 'KEEP' },
  { role: 'SG', label: 'SG', action: 'PASS' },
  { role: 'SF', label: 'SF', action: 'PASS' },
  { role: 'PF', label: 'PF', action: 'PASS' },
  { role: 'C',  label: 'C',  action: 'PASS' },
];
const ISO_COLOR = '#e8c060';

const DLG_W    = 300;
const SIDE_PAD = 10;
const CARD_GAP = 8;
const CARD_W   = Math.floor((DLG_W - SIDE_PAD * 2 - CARD_GAP * (PLAYS.length - 1)) / PLAYS.length); // 88
const CARD_H   = 78;
const TGT_GAP  = 6;
const TGT_W    = Math.floor((DLG_W - SIDE_PAD * 2 - TGT_GAP * (ISO_TARGETS.length - 1)) / ISO_TARGETS.length); // 51
const TGT_H    = CARD_H;
const DLG_H    = Math.round(TOTAL_H / 3); // 116 — bottom third of screen
const DLG_Y    = TOTAL_H - DLG_H;
const N_PARTS  = 10;

// ─── Play card ────────────────────────────────────────────────────────────────

function PlayCard({ play, x, y, onClick, disabled }) {
  const [hover, setHover] = React.useState(false);

  return (
    <g data-testid={`play-${play.id}`} data-disabled={disabled ? '1' : '0'}
      onClick={disabled ? undefined : onClick} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseEnter={() => !disabled && setHover(true)} onMouseLeave={() => setHover(false)}>
    <g opacity={disabled ? 0.38 : 1}>

      {/* Shadow */}
      <rect x={x + 2} y={y + 3} width={CARD_W} height={CARD_H} rx={4}
        fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />

      {/* Body */}
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill={hover ? '#263c60' : '#192840'} opacity={0.2} shapeRendering="crispEdges" />
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill="none" stroke={play.color} strokeWidth={hover ? 2 : 1} />
      {hover && (
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
          fill="white" opacity={0.06} shapeRendering="crispEdges" />
      )}

      {/* Tag pill */}
      <rect x={x + 4} y={y + 5} width={CARD_W - 8} height={11} rx={2}
        fill={play.tint} shapeRendering="crispEdges" />
      <rect x={x + 4} y={y + 5} width={CARD_W - 8} height={11} rx={2}
        fill="none" stroke={play.color} strokeWidth={1} />
      <PixelTextC text={play.tag} cx={x + CARD_W / 2} y={y + 7}
        scale={1} fill={play.color} outline={null} />

      {/* Play name */}
      <PixelTextC text={play.name} cx={x + CARD_W / 2} y={y + 22}
        scale={1} fill="#e8f0ff" outline="#0a1828" />

      {/* Divider */}
      <rect x={x + 6} y={y + 34} width={CARD_W - 12} height={1}
        fill="#2a4070" shapeRendering="crispEdges" />

      {/* Description — two lines */}
      <PixelTextC text={play.desc[0]} cx={x + CARD_W / 2} y={y + 39}
        scale={1} fill="#6090b8" outline={null} />
      <PixelTextC text={play.desc[1]} cx={x + CARD_W / 2} y={y + 50}
        scale={1} fill="#6090b8" outline={null} />

      {/* SELECT / NO REPEAT button */}
      <rect x={x + 6} y={y + CARD_H - 18} width={CARD_W - 12} height={14} rx={3}
        fill={disabled ? '#1a1a2a' : hover ? play.color : '#1a3060'} opacity={0.2} shapeRendering="crispEdges" />
      <PixelTextC text={disabled ? 'NO RPT' : 'SELECT'} cx={x + CARD_W / 2} y={y + CARD_H - 15}
        scale={1} fill={disabled ? '#445' : hover ? '#000' : play.color} outline={null} />
    </g>

    {/* Cooldown badge — rendered at full opacity above the dimmed card */}
    {disabled && (
      <g>
        <rect x={x + 16} y={y - 6} width={56} height={11} rx={2}
          fill="#7a1c1c" shapeRendering="crispEdges" />
        <rect x={x + 16} y={y - 6} width={56} height={11} rx={2}
          fill="none" stroke="#e04040" strokeWidth={1} />
        <PixelTextC text="COOLDOWN" cx={x + CARD_W / 2} y={y - 4}
          scale={1} fill="#e04040" outline={null} />
      </g>
    )}
    </g>
  );
}

// ─── Isolation target button ────────────────────────────────────────────────

function IsoTargetButton({ tgt, x, y, onClick }) {
  const [hover, setHover] = React.useState(false);

  return (
    <g data-testid={`iso-target-${tgt.role}`}
      onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>

      {/* Shadow */}
      <rect x={x + 2} y={y + 3} width={TGT_W} height={TGT_H} rx={4}
        fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />

      {/* Body */}
      <rect x={x} y={y} width={TGT_W} height={TGT_H} rx={4}
        fill={hover ? '#263c60' : '#192840'} opacity={0.2} shapeRendering="crispEdges" />
      <rect x={x} y={y} width={TGT_W} height={TGT_H} rx={4}
        fill="none" stroke={ISO_COLOR} strokeWidth={hover ? 2 : 1} />
      {hover && (
        <rect x={x} y={y} width={TGT_W} height={TGT_H} rx={4}
          fill="white" opacity={0.06} shapeRendering="crispEdges" />
      )}

      {/* Position label (large) */}
      <PixelTextC text={tgt.label} cx={x + TGT_W / 2} y={y + 18}
        scale={2} fill="#e8f0ff" outline="#0a1828" />

      {/* Action button */}
      <rect x={x + 5} y={y + TGT_H - 18} width={TGT_W - 10} height={14} rx={3}
        fill={hover ? ISO_COLOR : '#1a3060'} opacity={0.2} shapeRendering="crispEdges" />
      <PixelTextC text={tgt.action} cx={x + TGT_W / 2} y={y + TGT_H - 15}
        scale={1} fill={hover ? '#000' : ISO_COLOR} outline={null} />
    </g>
  );
}

// ─── Picker dialog ────────────────────────────────────────────────────────────

export function PlayPickerOverlay({ cameraX, onPick, disabledPlayId }) {
  const tick = useRafTick();
  // When the ISO card is chosen we switch to a target picker instead of resolving.
  const [isoMode, setIsoMode] = React.useState(false);

  const dlgX    = cameraX + Math.round((ZOOM_W - DLG_W) / 2);
  const panelCX = cameraX + ZOOM_W / 2;
  const isoPlay = PLAYS.find(p => p.id === 'iso');

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
    <g opacity={fadeIn} data-testid="play-picker" data-iso-mode={isoMode ? '1' : '0'}>
      {/* Outer golden aura */}
      <rect x={dlgX - 8} y={DLG_Y - 8} width={DLG_W + 16} height={DLG_H + 16} rx={8}
        fill="#ffe060" opacity={bgGlowOp} shapeRendering="crispEdges" />

      {/* Dialog shadow */}
      <rect x={dlgX + 4} y={DLG_Y + 4} width={DLG_W} height={DLG_H} rx={4}
        fill="#000" opacity={0.55} shapeRendering="crispEdges" />
      {/* Dialog body */}
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
        fill="#111e32" opacity={0.2} shapeRendering="crispEdges" />
      {/* Header bar */}
      <rect x={dlgX} y={DLG_Y} width={DLG_W} height={26} rx={4}
        fill="#1a2a3e" opacity={0.2} shapeRendering="crispEdges" />

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
      <PixelTextC text={isoMode ? 'CHOOSE A PLAYER' : 'CALL A PLAY'} cx={panelCX} y={DLG_Y + 9 + hBob}
        scale={1} fill={hFlash} outline={null} />

      {/* Back button (target picker only) */}
      {isoMode && (
        <g data-testid="iso-back" onClick={() => setIsoMode(false)} style={{ cursor: 'pointer' }}>
          <rect x={dlgX + 5} y={DLG_Y + 6} width={30} height={13} rx={2}
            fill="#1a3060" opacity={0.5} shapeRendering="crispEdges" />
          <rect x={dlgX + 5} y={DLG_Y + 6} width={30} height={13} rx={2}
            fill="none" stroke={ISO_COLOR} strokeWidth={1} />
          <PixelTextC text="BACK" cx={dlgX + 20} y={DLG_Y + 9}
            scale={1} fill={ISO_COLOR} outline={null} />
        </g>
      )}

      {/* Play cards with staggered entrance — laid out horizontally.
          Clicking ISO opens the target picker instead of resolving immediately. */}
      {!isoMode && PLAYS.map((play, i) => {
        const { yOff, op } = cardAnim(i);
        const cardX = dlgX + SIDE_PAD + i * (CARD_W + CARD_GAP);
        const cardY = DLG_Y + 32;
        return (
          <g key={play.id} opacity={op} transform={`translate(0 ${yOff})`}>
            <PlayCard
              play={play}
              x={cardX}
              y={cardY}
              onClick={() => play.id === 'iso' ? setIsoMode(true) : onPick(play)}
              disabled={play.id === disabledPlayId}
            />
          </g>
        );
      })}

      {/* Isolation target buttons — pick which player the PG feeds. */}
      {isoMode && ISO_TARGETS.map((tgt, i) => {
        const btnX = dlgX + SIDE_PAD + i * (TGT_W + TGT_GAP);
        const btnY = DLG_Y + 32;
        return (
          <IsoTargetButton
            key={tgt.role}
            tgt={tgt}
            x={btnX}
            y={btnY}
            onClick={() => onPick({ ...isoPlay, isoTarget: tgt.role })}
          />
        );
      })}
    </g>
  );
}

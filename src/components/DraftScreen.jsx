import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_BASE } from '../constants.js';
import { PixelTextC, PixelText } from './PixelText.jsx';
import { IDLE_FRAMES, RUN_FRAMES } from '../sprites/index.js';
import { BballTip } from './BballTip.jsx';
import { LEVEL_UP_ABILITIES as ABILITIES } from '../abilities.js';
import { playSlide, playCursor, playSelect, playCancel, playFlip, playMenuMove3, playMenuSelect2 } from '../sound/ui.js';
import { playRare, playRare2, playRare3 } from '../sound/basketball.js';

// ─── Layout ───────────────────────────────────────────────────────────────────

const LP_X  = 2;
const LP_W  = 96;
const LP_H  = TOTAL_H - 4;
const CX_LP = LP_X + LP_W / 2;

const MP_X = LP_X + LP_W + 4;
const MP_Y = 6;
const MP_W = ZOOM_W - MP_X - 4;
const MP_H = TOTAL_H - MP_Y - 6;

const CARD_W   = 90;
const CARD_H   = 130;
const CARD_GAP = 8;
const GRID_X   = MP_X + 8;
const GRID_Y   = 66;

const ROSTER_SIZE = 5;
const POS_ORDER   = ['PG', 'SG', 'SF', 'PF', 'C'];

// ─── Animation ────────────────────────────────────────────────────────────────

const DEAL_STAGGER   = 8;                                         // ticks between each card starting
const DEAL_DUR       = 18;                                        // ticks to slide in
const ALL_DEALT_TICK = (3 - 1) * DEAL_STAGGER + DEAL_DUR;        // 34
const FLIP_GAP       = 6;
const FLIP_START     = ALL_DEALT_TICK + FLIP_GAP;                 // 40
const FLIP_STAGGER   = 12;                                        // ticks between each card's flip
const FLIP_DUR       = 24;
const ANIM_TOTAL     = FLIP_START + FLIP_STAGGER * 2 + FLIP_DUR; // 88

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function easeOut(t) { return 1 - (1 - t) * (1 - t); }

function getCardAnim(tick, i) {
  const dealStart = i * DEAL_STAGGER;
  const dealT     = clamp01((tick - dealStart) / DEAL_DUR);
  const dealY     = easeOut(dealT);

  const flipStart = FLIP_START + i * FLIP_STAGGER;
  const flipT     = clamp01((tick - flipStart) / FLIP_DUR);

  let scaleX;
  if (flipT < 0.5) {
    const t2 = flipT * 2;
    scaleX = Math.max(0, 1 - t2 * t2); // easeIn squeeze: 1→0
  } else {
    const t2 = (flipT - 0.5) * 2;
    scaleX = 1 - (1 - t2) * (1 - t2);  // easeOut expand: 0→1
  }

  return {
    visible:   tick >= dealStart,
    dealY,
    scaleX,
    showFront: flipT >= 0.5,
    flipDone:  flipT >= 1,
  };
}

// ─── Player data ──────────────────────────────────────────────────────────────

const POS_COLORS = {
  PG: '#2a7adf', SG: '#6a5ade', SF: '#28b050', PF: '#d07030', C: '#c03838',
};

const STAT_DEFS = [
  { key: 'spd', label: 'SPD', color: '#20c8e0' },
  { key: 'dex', label: 'DEX', color: '#9860e0' },
  { key: 'jmp', label: 'JMP', color: '#30d060' },
  { key: 'acc', label: 'ACC', color: '#e09030' },
];

const PLAYERS = [
  { id:  1, pos: 'PG', name: 'RIVERS', ovr: 72, spd: 78, dex: 75, jmp: 62, acc: 72, round: 1 },
  { id:  2, pos: 'SG', name: 'BANKS',  ovr: 69, spd: 69, dex: 67, jmp: 59, acc: 81, round: 1 },
  { id:  3, pos: 'SF', name: 'WELLS',  ovr: 70, spd: 74, dex: 71, jmp: 67, acc: 68, round: 1 },
  { id:  4, pos: 'PF', name: 'STONE',  ovr: 62, spd: 61, dex: 61, jmp: 69, acc: 58, round: 1 },
  { id:  5, pos: 'C',  name: 'GRANT',  ovr: 61, spd: 55, dex: 53, jmp: 75, acc: 62, round: 1 },
  { id:  6, pos: 'PG', name: 'HAYES',  ovr: 66, spd: 76, dex: 69, jmp: 55, acc: 64, round: 2 },
  { id:  7, pos: 'SG', name: 'CROSS',  ovr: 71, spd: 71, dex: 73, jmp: 61, acc: 78, round: 2 },
  { id:  8, pos: 'SF', name: 'FORD',   ovr: 66, spd: 67, dex: 67, jmp: 65, acc: 65, round: 2 },
  { id:  9, pos: 'PF', name: 'MASON',  ovr: 64, spd: 59, dex: 65, jmp: 71, acc: 60, round: 2 },
  { id: 10, pos: 'C',  name: 'KING',   ovr: 60, spd: 52, dex: 51, jmp: 78, acc: 58, round: 2 },
  { id: 11, pos: 'PG', name: 'SHAW',   ovr: 62, spd: 72, dex: 63, jmp: 51, acc: 61, round: 3 },
  { id: 12, pos: 'SG', name: 'BELL',   ovr: 66, spd: 66, dex: 71, jmp: 57, acc: 70, round: 3 },
  { id: 13, pos: 'SF', name: 'JAMES',  ovr: 66, spd: 70, dex: 68, jmp: 63, acc: 62, round: 3 },
  { id: 14, pos: 'PF', name: 'WADE',   ovr: 60, spd: 58, dex: 58, jmp: 67, acc: 56, round: 3 },
  { id: 15, pos: 'C',  name: 'HILL',   ovr: 56, spd: 50, dex: 48, jmp: 73, acc: 52, round: 3 },
];

const ROUND_COLORS = { 1: '#e8c060', 2: '#30c0e0', 3: '#b0b8c8' };

// ─── Ability data ─────────────────────────────────────────────────────────────

const RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };
const RARITY_TINTS  = {
  1: 'rgba(32,200,160,0.12)',
  2: 'rgba(192,96,224,0.14)',
  3: 'rgba(232,192,96,0.18)',
};

const ABILITY_POOL = ABILITIES.flatMap(a =>
  Array(a.rarity === 3 ? 5 : a.rarity === 2 ? 20 : 40).fill(a)
);

function rollAbility() {
  return ABILITY_POOL[Math.floor(Math.random() * ABILITY_POOL.length)];
}

// ─── Mini idle sprite ─────────────────────────────────────────────────────────

function MiniPlayer({ x, y, scale = 2, jerseyColor, phase = 0 }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 120);
    return () => clearInterval(id);
  }, []);
  const frame = IDLE_FRAMES[(tick + phase) % IDLE_FRAMES.length];
  return (
    <g shapeRendering="crispEdges">
      {frame.map(([px, py, col], i) => (
        <rect key={i}
          x={x + px * scale} y={y + py * scale}
          width={scale} height={scale}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
    </g>
  );
}

// ─── Running ghost (drag handle) ──────────────────────────────────────────────

function RunningGhost({ player, cx, cy }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const SCALE = 3;
  const frame = RUN_FRAMES[tick % RUN_FRAMES.length];
  const jerseyColor = POS_COLORS[player.pos];
  // cursor at chest level (jersey body rows ~8 of sprite, scale 3 = 24px from oy)
  const ox = cx - 7 * SCALE;
  const oy = cy - 24;
  const feetY = oy + 18 * SCALE;

  return (
    <g shapeRendering="crispEdges" style={{ pointerEvents: 'none' }}>
      {/* Sprite */}
      {frame.map(([px, py, col], i) => (
        <rect key={i}
          x={ox + px * SCALE} y={oy + py * SCALE}
          width={SCALE} height={SCALE}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
      {/* Ground shadow at feet */}
      <ellipse cx={cx} cy={feetY + 3} rx={20} ry={5} fill="rgba(0,0,0,0.30)" />
      {/* Name tag below feet */}
      <PixelTextC text={player.name} cx={cx} y={feetY + 10}
        scale={1} fill="#e8c060" outline="#000" />
    </g>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ x, y, label, value, color }) {
  const BAR_X  = x + 20;
  const BAR_W  = 38;
  const filled = Math.round((value / 99) * BAR_W);
  return (
    <g>
      <PixelText text={label} x={x} y={y} scale={1} fill="#4888b0" outline={null} />
      <rect x={BAR_X} y={y + 1} width={BAR_W} height={4} rx={1}
        fill="#162440" shapeRendering="crispEdges" />
      {filled > 0 && (
        <rect x={BAR_X} y={y + 1} width={filled} height={4} rx={1}
          fill={color} shapeRendering="crispEdges" />
      )}
      <PixelText text={String(value)} x={BAR_X + BAR_W + 4} y={y}
        scale={1} fill="#a0c8e0" outline={null} />
    </g>
  );
}

// ─── Card back ────────────────────────────────────────────────────────────────

function CardBack({ x, y, cardId }) {
  const clipId = `cb-${cardId}`;
  const cx = x + CARD_W / 2;
  const cy = y + CARD_H / 2;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x + 6} y={y + 6} width={CARD_W - 12} height={CARD_H - 12} rx={1} />
        </clipPath>
      </defs>

      {/* Shadow */}
      <rect x={x + 2} y={y + 3} width={CARD_W} height={CARD_H} rx={4}
        fill="rgba(0,0,0,0.45)" shapeRendering="crispEdges" />
      {/* Body */}
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill="#0d1a2c" shapeRendering="crispEdges" />

      {/* Diagonal stripes */}
      <g clipPath={`url(#${clipId})`}>
        {Array.from({ length: 24 }, (_, i) => {
          const sx = x - CARD_H + i * 10;
          return (
            <line key={i}
              x1={sx} y1={y} x2={sx + CARD_H} y2={y + CARD_H}
              stroke="#0f2038" strokeWidth={4} />
          );
        })}
      </g>

      {/* Outer border */}
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill="none" stroke="#1e3a60" strokeWidth={1.5} />
      {/* Inner frame */}
      <rect x={x + 5} y={y + 5} width={CARD_W - 10} height={CARD_H - 10} rx={2}
        fill="none" stroke="#162840" strokeWidth={1} />

      {/* Center badge */}
      <rect x={cx - 18} y={cy - 14} width={36} height={28} rx={3}
        fill="#0e1c30" shapeRendering="crispEdges" />
      <rect x={cx - 18} y={cy - 14} width={36} height={28} rx={3}
        fill="none" stroke="#1e3a60" strokeWidth={1} />
      <PixelTextC text="DRAFT" cx={cx} y={cy - 9} scale={1} fill="#2a5888" outline={null} />
      <PixelTextC text="PICK"  cx={cx} y={cy + 1} scale={1} fill="#1a3860" outline={null} />
    </g>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, x, y, phase, onClick, autoHighlight = false }) {
  const [hover, setHover] = React.useState(false);
  const [pulse, setPulse] = React.useState(0);

  const ability     = player.ability ?? null;
  const rarityColor = ability ? RARITY_COLORS[ability.rarity] : null;
  const rarityTint  = ability ? RARITY_TINTS[ability.rarity]  : null;

  React.useEffect(() => {
    if (!ability) return;
    const id = setInterval(() => setPulse(t => t + 1), 40);
    return () => clearInterval(id);
  }, [!!ability]); // eslint-disable-line react-hooks/exhaustive-deps

  const glow   = ability ? (Math.sin(pulse * 0.10) + 1) / 2 : 0;
  const shimX  = ability ? x + ((pulse * 1.6) % (CARD_W + 60)) - 30 : -9999;
  const clipId = `card-clip-${player.id}`;

  const posColor   = POS_COLORS[player.pos] || '#888';
  const roundColor = ROUND_COLORS[player.round] || '#888';
  const bg           = autoHighlight ? '#1a3820'
    : ability ? (hover ? '#1e3828' : '#172030') : (hover ? '#263c60' : '#1e3050');
  const borderStroke = autoHighlight ? '#40ff80'
    : ability ? rarityColor : (hover ? '#40a0e0' : '#2a4070');
  const borderW      = autoHighlight ? 2.5 : ability ? 1 + glow * 1.5 : 1;

  const spriteX  = x + Math.round((CARD_W - 11 * 2) / 2);
  const spriteY  = y + 16;
  const statsY   = y + 66;
  const abilityY = y + CARD_H - 19;

  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={() => { if (onClick) { setHover(true); playMenuMove3(); } }}
      onMouseLeave={() => setHover(false)}>

      {ability && (
        <defs>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4} />
          </clipPath>
        </defs>
      )}

      {ability && (
        <g>
          <rect x={x - 6} y={y - 6} width={CARD_W + 12} height={CARD_H + 12} rx={8}
            fill="none" stroke={rarityColor} strokeWidth={3}
            opacity={glow * 0.22} />
          <rect x={x - 3} y={y - 3} width={CARD_W + 6} height={CARD_H + 6} rx={6}
            fill="none" stroke={rarityColor} strokeWidth={2}
            opacity={0.15 + glow * 0.35} />
          <rect x={x - 1} y={y - 1} width={CARD_W + 2} height={CARD_H + 2} rx={5}
            fill="none" stroke={rarityColor} strokeWidth={1.5}
            opacity={0.3 + glow * 0.4} />
          <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
            fill={rarityColor} opacity={glow * 0.06} />
        </g>
      )}

      {/* Round badge */}
      <rect x={x + 9} y={y - 14} width={CARD_W - 18} height={11} rx={5}
        fill="#1e3460" shapeRendering="crispEdges" />
      <PixelTextC text={`R${player.round} PICK`} cx={x + CARD_W / 2} y={y - 12}
        scale={1} fill={roundColor} outline={null} />

      {/* Card shadow + body */}
      <rect x={x + 2} y={y + 3} width={CARD_W} height={CARD_H} rx={4}
        fill="rgba(0,0,0,0.45)" shapeRendering="crispEdges" />
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill={bg} shapeRendering="crispEdges" />
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
        fill="none" stroke={borderStroke} strokeWidth={borderW} />
      {hover && onClick && (
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
          fill="white" opacity={0.06} shapeRendering="crispEdges" />
      )}

      {ability && (
        <g clipPath={`url(#${clipId})`}>
          <g transform={`rotate(-18, ${shimX + 8}, ${y + CARD_H / 2})`}>
            <rect x={shimX} y={y - 10} width={14} height={CARD_H + 20}
              fill="white" opacity={0.13} />
          </g>
        </g>
      )}

      {/* Auto-pick highlight tint */}
      {autoHighlight && (
        <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4}
          fill="#20e060" opacity={0.09} shapeRendering="crispEdges" />
      )}

      {/* Pos + OVR */}
      <rect x={x + 4} y={y + 4} width={22} height={11} rx={2}
        fill={posColor} shapeRendering="crispEdges" />
      <PixelTextC text={player.pos} cx={x + 15} y={y + 6} scale={1} fill="#fff" outline={null} />
      <rect x={x + CARD_W - 26} y={y + 4} width={22} height={11} rx={2}
        fill="#243060" shapeRendering="crispEdges" />
      <PixelTextC text={String(player.ovr)} cx={x + CARD_W - 15} y={y + 6}
        scale={1} fill="#e8c060" outline={null} />

      {/* Idle sprite */}
      <MiniPlayer x={spriteX} y={spriteY} scale={2} jerseyColor={posColor} phase={phase} />

      {/* Name */}
      <PixelTextC text={player.name} cx={x + CARD_W / 2} y={y + 52}
        scale={1} fill="#40c0d8" outline={null} />
      <rect x={x + 6} y={y + 61} width={CARD_W - 12} height={1}
        fill="#2a4070" shapeRendering="crispEdges" />

      {/* Stat bars */}
      {STAT_DEFS.map((stat, si) => (
        <StatBar key={stat.key}
          x={x + 5} y={statsY + si * 11}
          label={stat.label} value={player[stat.key]} color={stat.color} />
      ))}

      {/* Ability strip */}
      <rect x={x + 6} y={abilityY - 3} width={CARD_W - 12} height={1}
        fill="#2a4070" shapeRendering="crispEdges" />
      {ability ? (
        <>
          <rect x={x + 5} y={abilityY} width={CARD_W - 10} height={14} rx={3}
            fill={rarityTint} shapeRendering="crispEdges" />
          <rect x={x + 5} y={abilityY} width={CARD_W - 10} height={14} rx={3}
            fill="none" stroke={rarityColor} strokeWidth={1} />
          <PixelTextC text={ability.name} cx={x + CARD_W / 2} y={abilityY + 3}
            scale={1} fill={rarityColor} outline={null} />
        </>
      ) : (
        <PixelTextC text="NO ABILITY" cx={x + CARD_W / 2} y={abilityY + 3}
          scale={1} fill="#3a5888" outline={null} />
      )}
    </g>
  );
}

// ─── Shared button ────────────────────────────────────────────────────────────

const SHADOW_DROP = 4;

function DraftButton({ x, y, w, h = 26, label, color, disabled = false, onClick }) {
  const [hover, setHover] = React.useState(false);
  const active = !disabled && hover;
  const by = y + (active ? SHADOW_DROP : 0);
  const textY = by + Math.floor((h - 7) / 2);
  const handleClick = disabled ? undefined : () => { playCursor(); onClick?.(); };
  return (
    <g onClick={handleClick}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}>
      {!disabled && (
        <rect x={x + 3} y={y + SHADOW_DROP} width={w - 6} height={h} rx={4}
          fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />
      )}
      <rect x={x} y={by} width={w} height={h} rx={6}
        fill={disabled ? '#182030' : color} shapeRendering="crispEdges" />
      {active && (
        <rect x={x} y={by} width={w} height={h} rx={6}
          fill="white" opacity={0.10} shapeRendering="crispEdges" />
      )}
      <PixelTextC text={label} cx={x + w / 2} y={textY + 1} scale={1} fill="rgba(0,0,0,0.40)" outline={null} />
      <PixelTextC text={label} cx={x + w / 2} y={textY}     scale={1}
        fill={disabled ? '#304870' : '#fff'} outline={null} />
    </g>
  );
}

// ─── Dialogue ─────────────────────────────────────────────────────────────────

const CHAR_SCALE = 0.30;
const CHAR_W     = Math.round(150 * CHAR_SCALE);  // 45
const CHAR_H     = Math.round(150 * CHAR_SCALE);  // 45
const CHAR_X     = MP_X + 8;                     // 110 — character x
const CHAR_Y     = TOTAL_H - CHAR_H - 4;         // 300 — feet near screen bottom

// Box: starts 15px into the character so the left edge is hidden behind it
const DLG_H  = 19;  // 9px glyph height + 5px padding each side
const DLG_X  = CHAR_X + 22;                      // 132 — tucked behind character
const DLG_W  = ZOOM_W - DLG_X - 4;              // 279
const DLG_Y  = CHAR_Y + 13;

const TEXT_X = CHAR_X + CHAR_W + 6;              // 149
const TEXT_Y = DLG_Y + Math.floor((DLG_H - 7) / 2);

const IDLE_LINES = [
  "Welcome! Roll picks to see your options.",
  "OVR ratings don't lie, kid.",
  "Ability cards are rare — snag them!",
  "Build around your best player.",
];

function getDlgLine(state, tick) {
  if (state === 'auto')    return "Grabbing the best available...";
  if (state === 'assign')  return "Assign each player to a position!";
  if (state === 'picking') return "Choose your player. Trust your gut!";
  if (state === 'done')    return "Squad locked in! Hit start, let's run it!";
  return IDLE_LINES[Math.floor(tick / 220) % IDLE_LINES.length];
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DraftScreen({ homeTeamName = 'HOME', onStart, onBack, onMenu }) {
  const [roster,   setRoster]   = React.useState([]);
  const [rolled,   setRolled]   = React.useState(null);
  const [animTick,    setAnimTick]    = React.useState(0);
  const [animDone,    setAnimDone]    = React.useState(true);
  const [autoDrafting, setAutoDrafting] = React.useState(false);
  const [autoPickId,  setAutoPickId]  = React.useState(null);
  const [bannerTick,  setBannerTick]  = React.useState(0);
  const [phase,        setPhase]        = React.useState('draft');
  const [assignments,  setAssignments]  = React.useState({});
  const [selectedId,   setSelectedId]   = React.useState(null);
  const [dragId,    setDragId]    = React.useState(null);
  const [dragPos,   setDragPos]   = React.useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = React.useState(null);
  const [hoverId,   setHoverId]   = React.useState(null);
  const animRef           = React.useRef(null);
  const bgRef             = React.useRef(null);
  const slotBoundsRef     = React.useRef([]);
  const assignRef         = React.useRef(null);
  const dropTargetRef     = React.useRef(null);
  const autoTimeoutsRef = React.useRef([]);

  React.useEffect(() => {
    const id = setInterval(() => setBannerTick(t => t + 1), 33);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    return () => {
      if (animRef.current) clearInterval(animRef.current);
      autoTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Mouse drag — coordinate-based hit testing (no handlers on slot elements)
  React.useEffect(() => {
    if (!dragId) return;
    const hitSlot = (svgPos) =>
      slotBoundsRef.current.find(s =>
        svgPos.x >= s.x && svgPos.x <= s.x + s.w &&
        svgPos.y >= s.y && svgPos.y <= s.y + s.h
      )?.pos ?? null;
    const onMouseMove = (e) => {
      const pos = toSvgCoords(e.clientX, e.clientY);
      setDragPos(pos);
      const hit = hitSlot(pos);
      dropTargetRef.current = hit;
      setDropTarget(hit);
    };
    const onMouseUp = () => {
      if (dropTargetRef.current) assignRef.current?.(dragId, dropTargetRef.current);
      dropTargetRef.current = null;
      setDragId(null);
      setDropTarget(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [dragId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool     = PLAYERS.filter(p => !roster.find(r => r.id === p.id));
  const canStart = phase === 'assign' && POS_ORDER.every(pos => assignments[pos]);

  const roll = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const enriched = shuffled.slice(0, 3).map(p => ({
      ...p,
      ability: Math.random() < 0.08 ? rollAbility() : null,
    }));
    setRolled(enriched);
    setAnimDone(false);
    playSlide();

    if (animRef.current) clearInterval(animRef.current);
    let tick = 0;
    setAnimTick(0);
    const flipSoundPlayed  = [false, false, false];
    const raritySoundPlayed = [false, false, false];
    animRef.current = setInterval(() => {
      tick += 1;
      setAnimTick(tick);
      for (let i = 0; i < 3; i++) {
        const flipMidTick   = FLIP_START + i * FLIP_STAGGER + FLIP_DUR / 2;
        const rareSoundTick = flipMidTick + 4; // 64ms after front face appears
        if (tick >= flipMidTick && !flipSoundPlayed[i]) {
          flipSoundPlayed[i] = true;
          playFlip();
        }
        if (tick >= rareSoundTick && !raritySoundPlayed[i]) {
          raritySoundPlayed[i] = true;
          const rarity = enriched[i]?.ability?.rarity;
          if (rarity === 3) playRare3();
          else if (rarity === 2) playRare2();
          else if (rarity === 1) playRare();
        }
      }
      if (tick >= ANIM_TOTAL) {
        clearInterval(animRef.current);
        animRef.current = null;
        setAnimDone(true);
      }
    }, 16);
  };

  const pick = (player) => {
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    playSelect();
    const next = [...roster, player];
    setRoster(next);
    setRolled(null);
    setAnimDone(true);
    if (next.length === ROSTER_SIZE) setPhase('assign');
  };

  const runNextAutoPick = (currentRoster) => {
    if (currentRoster.length >= ROSTER_SIZE) {
      setAutoDrafting(false);
      setRolled(null);
      setPhase('assign');
      return;
    }
    const currentPool = PLAYERS.filter(p => !currentRoster.find(r => r.id === p.id));
    const shuffled    = [...currentPool].sort(() => Math.random() - 0.5);
    const enriched    = shuffled.slice(0, 3).map(p => ({
      ...p,
      ability: Math.random() < 0.08 ? rollAbility() : null,
    }));
    const best = enriched.reduce((b, p) => p.ovr > b.ovr ? p : b, enriched[0]);

    setRolled(enriched);
    setAnimDone(true);   // skip flip animation
    setAutoPickId(best.id);

    const t1 = setTimeout(() => {
      const newRoster = [...currentRoster, best];
      setRoster(newRoster);
      setRolled(null);
      setAutoPickId(null);
      const t2 = setTimeout(() => runNextAutoPick(newRoster), 120);
      autoTimeoutsRef.current.push(t2);
    }, 480);
    autoTimeoutsRef.current.push(t1);
  };

  const startAutoDraft = () => {
    autoTimeoutsRef.current.forEach(clearTimeout);
    autoTimeoutsRef.current = [];
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    setRolled(null);
    setAutoDrafting(true);
    runNextAutoPick([...roster]);
  };

  const assignPlayerToSlot = (playerId, pos) => {
    if (!playerId || !pos) return;
    playMenuSelect2();
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k]?.id === playerId) delete next[k]; });
      next[pos] = roster.find(r => r.id === playerId);
      return next;
    });
  };
  assignRef.current = assignPlayerToSlot;

  const toSvgCoords = (clientX, clientY) => {
    const el = bgRef.current;
    if (!el) return { x: 0, y: 0 };
    const svg = el.ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const r = pt.matrixTransform(ctm.inverse());
    return { x: r.x, y: r.y };
  };

  const startDrag = (e, playerId) => {
    e.preventDefault();
    const src = 'touches' in e ? e.touches[0] : e;
    const pos = toSvgCoords(src.clientX, src.clientY);
    setDragId(playerId);
    setDragPos(pos);
    setHoverId(null);

    // Touch: attach move/end listeners immediately so we don't miss events
    // during the async gap between setState and useEffect.
    if ('touches' in e) {
      const hitSlot = (svgPos) =>
        slotBoundsRef.current.find(s =>
          svgPos.x >= s.x && svgPos.x <= s.x + s.w &&
          svgPos.y >= s.y && svgPos.y <= s.y + s.h
        )?.pos ?? null;

      const onTouchMove = (ev) => {
        ev.preventDefault();
        const t = ev.touches[0];
        const p = toSvgCoords(t.clientX, t.clientY);
        setDragPos(p);
        const hit = hitSlot(p);
        dropTargetRef.current = hit;
        setDropTarget(hit);
      };

      const cleanup = () => {
        window.removeEventListener('touchmove',   onTouchMove);
        window.removeEventListener('touchend',    onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
      };

      const onTouchEnd = (ev) => {
        const t = ev.changedTouches[0];
        const p = toSvgCoords(t.clientX, t.clientY);
        const slot = hitSlot(p);
        if (slot) assignRef.current?.(playerId, slot);
        dropTargetRef.current = null;
        setDragId(null);
        setDropTarget(null);
        cleanup();
      };

      window.addEventListener('touchmove',   onTouchMove, { passive: false });
      window.addEventListener('touchend',    onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
    }
  };

  const resetDraft = () => {
    playCancel();
    setRoster([]);
    setRolled(null);
    setAnimDone(true);
    setPhase('draft');
    setAssignments({});
    setSelectedId(null);
    setDragId(null);
    setDropTarget(null);
    setHoverId(null);
  };

  const panelCX = MP_X + MP_W / 2;
  const panelCY = MP_Y + MP_H / 2 - 50;

  const dlgState = autoDrafting ? 'auto'
    : phase === 'assign'    ? (canStart ? 'done' : 'assign')
    : (rolled && animDone)  ? 'picking'
    : 'idle';

  return (
    <g style={{ touchAction: 'none' }}>
      <rect ref={bgRef} x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#1c2e4a" />

      {/* ── LEFT PANEL ───────────────────────────────────── */}
      <rect x={LP_X} y={2} width={LP_W} height={LP_H} rx={3}
        fill="#243660" shapeRendering="crispEdges" />

      {/* DRAFT banner — animated */}
      {(() => {
        const shimX     = LP_X + ((bannerTick * 1.4) % (LP_W + 50)) - 25;
        return (
          <g>
            <defs>
              <clipPath id="banner-clip">
                <rect x={5} y={5} width={LP_W - 6} height={34} rx={2} />
              </clipPath>
              <linearGradient id="banner-shimmer" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%"   stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%"  stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Drop shadow */}
            <rect x={6} y={7} width={LP_W - 8} height={34} rx={2}
              fill="rgba(0,0,0,0.60)" shapeRendering="crispEdges" />
            {/* Body */}
            <rect x={5} y={5} width={LP_W - 6} height={34} rx={2}
              fill="#0e0805" shapeRendering="crispEdges" />
            {/* Shimmer sweep */}
            <g clipPath="url(#banner-clip)">
              <rect x={shimX} y={5} width={28} height={34}
                fill="url(#banner-shimmer)" opacity={0.20} />
            </g>
            {/* Outer glow border */}
            <rect x={3} y={3} width={LP_W} height={38} rx={4}
              fill="none" stroke="#e86010" strokeWidth={3} opacity={0.25} />
            {/* Main border */}
            <rect x={5} y={5} width={LP_W - 6} height={34} rx={2}
              fill="none" stroke="#ff8020" strokeWidth={1.5} opacity={0.65} />
            {/* Top shine line */}
            <rect x={7} y={6} width={LP_W - 10} height={2} rx={1}
              fill="#ffb060" opacity={0.55} shapeRendering="crispEdges" />
            {/* DRAFT — white main text */}
            <PixelTextC text="DRAFT" cx={CX_LP} y={16} scale={2}
              fill="#ffffff" outline={null} />
          </g>
        );
      })()}

      <PixelTextC text={homeTeamName.slice(0, 8)} cx={CX_LP} y={48} scale={1} fill="#40d0f0" outline={null} />
      <rect x={8} y={60} width={LP_W - 12} height={1} fill="#3a5080" shapeRendering="crispEdges" />
      <PixelTextC text={phase === 'assign' ? 'ROSTER' : 'PICKS'} cx={CX_LP} y={65} scale={1} fill="#1eb8d8" outline={null} />

      {/* Pick / roster slots */}
      {Array.from({ length: ROSTER_SIZE }, (_, i) => {
        const slotY      = 76 + i * 22;
        const slotPos    = POS_ORDER[i];
        const player     = phase === 'assign' ? (assignments[slotPos] ?? null) : (roster[i] ?? null);
        const badgeLabel = phase === 'assign' ? slotPos : String(i + 1);
        const badgeFill  = phase === 'assign'
          ? (player ? POS_COLORS[slotPos] : '#1e3a60')
          : (player ? '#243870' : '#1e3060');
        const badgeText  = phase === 'assign'
          ? (player ? '#fff' : POS_COLORS[slotPos])
          : (player ? '#a0c8e0' : '#2a4870');
        return (
          <g key={i}>
            <rect x={8} y={slotY} width={LP_W - 12} height={16} rx={2}
              fill={player ? '#1a3428' : '#1a2e50'} shapeRendering="crispEdges" />
            <rect x={10} y={slotY + 3} width={17} height={10} rx={1}
              fill={badgeFill} shapeRendering="crispEdges" />
            <PixelTextC text={badgeLabel} cx={18} y={slotY + 5}
              scale={1} fill={badgeText} outline={null} />
            {player ? (
              <PixelText text={player.name} x={30} y={slotY + 5} scale={1}
                fill={player.ability ? RARITY_COLORS[player.ability.rarity] : '#40c870'} outline={null} />
            ) : (
              <PixelText text="EMPTY" x={30} y={slotY + 5}
                scale={1} fill="#2a4060" outline={null} />
            )}
          </g>
        );
      })}

      <rect x={8} y={190} width={LP_W - 12} height={1} fill="#3a5080" shapeRendering="crispEdges" />
      <PixelTextC
        text={phase === 'assign'
          ? `${Object.keys(assignments).length}/${ROSTER_SIZE} PLACED`
          : `${roster.length}/${ROSTER_SIZE} PICKS`}
        cx={CX_LP} y={195} scale={1}
        fill={canStart ? '#40c870' : '#1eb8d8'} outline={null} />

      <DraftButton x={6} y={212} w={LP_W - 8} label="START GAME"
        color="#1a7a38" disabled={!canStart}
        onClick={() => canStart && onStart(POS_ORDER.map(pos => ({ ...assignments[pos], role: pos })))} />
      <DraftButton x={6} y={248} w={LP_W - 8}
        label={phase === 'assign' ? 'REDRAFT' : 'BACK'}
        color="#385090"
        onClick={() => { phase === 'assign' ? resetDraft() : (playCancel(), onBack()); }} />
      {canStart && (
        <DraftButton x={6} y={284} w={LP_W - 8} label="SAVE & MENU"
          color="#2a5070"
          onClick={() => { playCancel(); onMenu?.(POS_ORDER.map(pos => ({ ...assignments[pos], role: pos }))); }} />
      )}

      {/* ── MAIN PANEL ───────────────────────────────────── */}
      <rect x={MP_X} y={MP_Y} width={MP_W} height={MP_H} rx={4}
        fill="#1e3050" shapeRendering="crispEdges" />

      <PixelTextC
        text={phase === 'assign' ? 'ASSIGN POSITIONS' : 'AVAILABLE PLAYERS'}
        cx={panelCX} y={MP_Y + 10} scale={1} fill="#1eb8d8" outline={null} />
      <rect x={MP_X + 8} y={MP_Y + 22} width={MP_W - 16} height={1}
        fill="#2e4870" shapeRendering="crispEdges" />

      {/* Draft phase: roll prompt */}
      {phase === 'draft' && !rolled && !autoDrafting && (
        <g>
          <PixelTextC
            text={`PICK ${roster.length + 1} OF ${ROSTER_SIZE}`}
            cx={panelCX} y={panelCY - 24}
            scale={1} fill="#1eb8d8" outline={null} />
          <PixelTextC
            text={`${pool.length} PLAYERS IN POOL`}
            cx={panelCX} y={panelCY - 12}
            scale={1} fill="#3a5878" outline={null} />
          <DraftButton
            x={panelCX - 96} y={panelCY}
            w={92} h={32}
            label="ROLL PICKS"
            color="#1a7ac8"
            onClick={roll}
          />
          <DraftButton
            x={panelCX + 4} y={panelCY}
            w={92} h={32}
            label="AUTO DRAFT"
            color="#1a7050"
            onClick={startAutoDraft}
          />
        </g>
      )}

      {/* Assign phase UI */}
      {phase === 'assign' && (() => {
        const SLW = 54, SLH = 72, SLG = 5;
        const CSCALE = 0.6;
        const slotsY = MP_Y + 30;
        const cardsY = slotsY + SLH + 40;
        const draggedPlayer = roster.find(r => r.id === dragId) ?? null;
        slotBoundsRef.current = POS_ORDER.map((pos, i) => ({
          pos, x: GRID_X + i * (SLW + SLG), y: slotsY, w: SLW, h: SLH,
        }));
        return (
          <g>
            {/* Instruction */}
            <PixelTextC
              text={dragId ? `PLACING ${draggedPlayer?.name ?? ''}` : 'DRAG A PLAYER TO A POSITION'}
              cx={panelCX} y={slotsY + SLH + 12} scale={1}
              fill={dragId ? '#e8c060' : '#3a6080'} outline={null} />

            {/* Position drop slots */}
            {POS_ORDER.map((pos, i) => {
              const sx       = GRID_X + i * (SLW + SLG);
              const assigned = assignments[pos] ?? null;
              const posColor = POS_COLORS[pos];
              const isOver   = dropTarget === pos && !!dragId;
              return (
                <g key={pos}
                  style={{ cursor: dragId ? 'copy' : 'default', pointerEvents: 'none' }}>
                  {/* Shadow */}
                  <rect x={sx + 2} y={slotsY + 3} width={SLW} height={SLH} rx={3}
                    fill="rgba(0,0,0,0.45)" shapeRendering="crispEdges" />
                  {/* Body */}
                  <rect x={sx} y={slotsY} width={SLW} height={SLH} rx={3}
                    fill={isOver ? '#1a3a28' : (assigned ? '#1a3020' : '#162038')} shapeRendering="crispEdges" />
                  {/* Border — glows when dragging over */}
                  <rect x={sx} y={slotsY} width={SLW} height={SLH} rx={3}
                    fill="none"
                    stroke={isOver ? '#40ffaa' : (assigned ? posColor : '#2a4070')}
                    strokeWidth={isOver ? 2 : 1} />
                  {isOver && (
                    <rect x={sx} y={slotsY} width={SLW} height={SLH} rx={3}
                      fill="#40ffaa" opacity={0.07} shapeRendering="crispEdges" />
                  )}
                  {/* Pos header */}
                  <rect x={sx} y={slotsY} width={SLW} height={14} rx={3}
                    fill={posColor} shapeRendering="crispEdges" />
                  <rect x={sx} y={slotsY + 8} width={SLW} height={6}
                    fill={posColor} shapeRendering="crispEdges" />
                  <PixelTextC text={pos} cx={sx + SLW / 2} y={slotsY + 4}
                    scale={1} fill="#fff" outline={null} />
                  {assigned ? (
                    <>
                      <PixelTextC text={assigned.name} cx={sx + SLW / 2} y={slotsY + 23}
                        scale={1} fill="#40c870" outline={null} />
                      <PixelTextC text="OVR" cx={sx + SLW / 2} y={slotsY + 35}
                        scale={1} fill="#3a6080" outline={null} />
                      <PixelTextC text={String(assigned.ovr)} cx={sx + SLW / 2} y={slotsY + 47}
                        scale={1} fill="#e8c060" outline={null} />
                    </>
                  ) : (
                    isOver ? (
                      <>
                        <PixelTextC text="DROP" cx={sx + SLW / 2} y={slotsY + 30}
                          scale={1} fill="#40ffaa" outline={null} />
                        <PixelTextC text="HERE" cx={sx + SLW / 2} y={slotsY + 41}
                          scale={1} fill="#40ffaa" outline={null} />
                      </>
                    ) : (
                      <PixelTextC text="EMPTY" cx={sx + SLW / 2} y={slotsY + 37}
                        scale={1} fill="#2a4060" outline={null} />
                    )
                  )}
                </g>
              );
            })}

            {/* Player cards tray — full PlayerCard at 0.6 scale */}
            {roster.map((player, i) => {
              const sx          = GRID_X + i * (SLW + SLG);
              const assignedPos = POS_ORDER.find(pos => assignments[pos]?.id === player.id) ?? null;
              const isBeingDragged = dragId === player.id;
              const isHovered = hoverId === player.id && !isBeingDragged && !dragId;
              return (
                <g key={player.id}>
                  <g
                    transform={`translate(${sx}, ${cardsY}) scale(${CSCALE})`}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => startDrag(e, player.id)}
                    onTouchStart={(e) => startDrag(e, player.id)}
                    onMouseEnter={() => { setHoverId(player.id); playMenuMove3(); }}
                    onMouseLeave={() => setHoverId(null)}>
                    <PlayerCard
                      player={player}
                      x={0} y={0}
                      phase={i * 2}
                      onClick={undefined}
                    />
                  </g>
                  {/* Hover highlight */}
                  {isHovered && (
                    <rect
                      x={sx} y={cardsY}
                      width={CARD_W * CSCALE} height={CARD_H * CSCALE}
                      rx={3} fill="white" opacity={0.08}
                      shapeRendering="crispEdges"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {/* Dim overlay when this card is being dragged */}
                  {isBeingDragged && (
                    <rect
                      x={sx} y={cardsY}
                      width={CARD_W * CSCALE} height={CARD_H * CSCALE}
                      rx={3} fill="rgba(0,0,0,0.55)"
                      shapeRendering="crispEdges"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {/* Assigned position badge */}
                  {assignedPos && !isBeingDragged && (
                    <rect
                      x={sx} y={cardsY + CARD_H * CSCALE - 12}
                      width={CARD_W * CSCALE} height={12}
                      rx={3} fill={POS_COLORS[assignedPos]}
                      opacity={0.88} shapeRendering="crispEdges"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {assignedPos && !isBeingDragged && (
                    <g style={{ pointerEvents: 'none' }}>
                      <PixelTextC
                        text={assignedPos}
                        cx={sx + (CARD_W * CSCALE) / 2}
                        y={cardsY + CARD_H * CSCALE - 10}
                        scale={1} fill="#fff" outline={null}
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Bottom-center START GAME button */}
            {canStart && !dragId && (
              <DraftButton
                x={panelCX - 70} y={MP_Y + MP_H - 62}
                w={140} h={30}
                label="START GAME"
                color="#1a7a38"
                onClick={() => onStart(POS_ORDER.map(pos => ({ ...assignments[pos], role: pos })))}
              />
            )}

            {/* Drag ghost — animated running character */}
            {dragId && draggedPlayer && (
              <RunningGhost
                player={draggedPlayer}
                cx={dragPos.x}
                cy={dragPos.y}
              />
            )}
          </g>
        );
      })()}

      {/* Player cards (draft phase only) */}
      {phase === 'draft' && rolled && rolled.map((player, i) => {
        const cardX  = GRID_X + i * (CARD_W + CARD_GAP);
        const cardCX = cardX + CARD_W / 2;

        if (animDone) {
          return (
            <PlayerCard key={player.id}
              player={player} x={cardX} y={GRID_Y}
              phase={i * 2}
              autoHighlight={autoPickId === player.id}
              onClick={autoDrafting ? undefined : () => pick(player)} />
          );
        }

        const { visible, dealY, scaleX, showFront } = getCardAnim(animTick, i);
        if (!visible) return null;

        const cardY = GRID_Y - Math.round(60 * (1 - dealY));

        return (
          <g key={player.id}
            transform={`translate(${cardCX} 0) scale(${scaleX} 1) translate(${-cardCX} 0)`}>
            {showFront
              ? <PlayerCard player={player} x={cardX} y={cardY} phase={i * 2} onClick={undefined} />
              : <CardBack x={cardX} y={cardY} cardId={player.id} />
            }
          </g>
        );
      })}

      {/* ── DIALOGUE BAR ─────────────────────────────────── */}
      <BballTip
        text={getDlgLine(dlgState, bannerTick)}
        charX={CHAR_X} charY={CHAR_Y} scale={CHAR_SCALE}
        dlgX={DLG_X} dlgY={DLG_Y} dlgW={DLG_W} dlgH={DLG_H}
        textX={TEXT_X} textY={TEXT_Y}
      />
    </g>
  );
}

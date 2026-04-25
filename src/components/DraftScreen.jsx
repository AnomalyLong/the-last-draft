import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_BASE } from '../constants.js';
import { PixelTextC, PixelText } from './PixelText.jsx';
import { IDLE_FRAMES } from '../sprites/index.js';
import { BballChar } from './BballChar.jsx';
import typingSound from '../sound/typing1.ogg';

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
  { id:  1, pos: 'PG', name: 'RIVERS', ovr: 87, spd: 88, dex: 82, jmp: 75, acc: 82, round: 1 },
  { id:  2, pos: 'SG', name: 'BANKS',  ovr: 84, spd: 79, dex: 74, jmp: 72, acc: 91, round: 1 },
  { id:  3, pos: 'SF', name: 'WELLS',  ovr: 82, spd: 84, dex: 78, jmp: 80, acc: 78, round: 1 },
  { id:  4, pos: 'PF', name: 'STONE',  ovr: 79, spd: 71, dex: 68, jmp: 82, acc: 68, round: 1 },
  { id:  5, pos: 'C',  name: 'GRANT',  ovr: 91, spd: 65, dex: 60, jmp: 88, acc: 72, round: 1 },
  { id:  6, pos: 'PG', name: 'HAYES',  ovr: 76, spd: 86, dex: 76, jmp: 68, acc: 74, round: 2 },
  { id:  7, pos: 'SG', name: 'CROSS',  ovr: 83, spd: 81, dex: 80, jmp: 74, acc: 88, round: 2 },
  { id:  8, pos: 'SF', name: 'FORD',   ovr: 80, spd: 77, dex: 74, jmp: 78, acc: 75, round: 2 },
  { id:  9, pos: 'PF', name: 'MASON',  ovr: 77, spd: 69, dex: 72, jmp: 84, acc: 70, round: 2 },
  { id: 10, pos: 'C',  name: 'KING',   ovr: 82, spd: 62, dex: 58, jmp: 91, acc: 68, round: 2 },
  { id: 11, pos: 'PG', name: 'SHAW',   ovr: 73, spd: 82, dex: 70, jmp: 64, acc: 71, round: 3 },
  { id: 12, pos: 'SG', name: 'BELL',   ovr: 75, spd: 76, dex: 78, jmp: 70, acc: 80, round: 3 },
  { id: 13, pos: 'SF', name: 'JAMES',  ovr: 78, spd: 80, dex: 75, jmp: 76, acc: 72, round: 3 },
  { id: 14, pos: 'PF', name: 'WADE',   ovr: 74, spd: 68, dex: 65, jmp: 80, acc: 66, round: 3 },
  { id: 15, pos: 'C',  name: 'HILL',   ovr: 76, spd: 60, dex: 55, jmp: 86, acc: 62, round: 3 },
];

const ROUND_COLORS = { 1: '#e8c060', 2: '#30c0e0', 3: '#b0b8c8' };

// ─── Ability data ─────────────────────────────────────────────────────────────

const ABILITIES = [
  { id: 1, name: 'FIRE DUNK',   desc: '+2 ON DUNKS',   rarity: 3 },
  { id: 2, name: 'IRON BLOCK',  desc: 'BLOCK BONUS',   rarity: 2 },
  { id: 3, name: 'HOT HAND',    desc: 'STREAK BONUS',  rarity: 2 },
  { id: 4, name: 'ANKLE BREAK', desc: 'BREAK DEFENSE', rarity: 1 },
  { id: 5, name: 'CLUTCH GENE', desc: 'LATE GAME +',   rarity: 2 },
  { id: 6, name: 'SPEED BURST', desc: 'SPD BURST',     rarity: 1 },
  { id: 7, name: 'GLASS CLEAN', desc: 'REBND BONUS',   rarity: 1 },
  { id: 8, name: 'LOCKDOWN',    desc: 'DEF LOCKOUT',   rarity: 1 },
];

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
      onMouseEnter={() => onClick && setHover(true)}
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
          scale={1} fill="#1e3060" outline={null} />
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
  return (
    <g onClick={disabled ? undefined : onClick}
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

const CHAR_SCALE = 0.09;
const CHAR_W     = Math.round(512 * CHAR_SCALE);  // 46
const CHAR_H     = Math.round(512 * CHAR_SCALE);  // 46
const CHAR_X     = MP_X + 8;                     // 110 — character x
const CHAR_Y     = TOTAL_H - CHAR_H - 4;         // 300 — feet near screen bottom

// Box: starts 15px into the character so the left edge is hidden behind it
const DLG_H  = 19;  // 9px glyph height + 5px padding each side
const DLG_X  = CHAR_X + 15;                      // 125 — tucked behind character
const DLG_W  = ZOOM_W - DLG_X - 4;              // 279
const DLG_Y  = CHAR_Y + 18;

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
  if (state === 'picking') return "Choose your player — trust your gut!";
  if (state === 'done')    return "Squad locked in! Hit start, let's run it!";
  return IDLE_LINES[Math.floor(tick / 220) % IDLE_LINES.length];
}

const _ta = [new Audio(typingSound), new Audio(typingSound)];
_ta.forEach(a => { a.volume = 0.5; });
let _taActive = false;
let _taChainTimer = null;

function _chainPlay(idx) {
  if (!_taActive) return;
  const a = _ta[idx];
  a.currentTime = 0;
  a.play().catch(() => {});

  function schedule() {
    const delay = Math.max(0, (a.duration - 0.02) * 1000);
    _taChainTimer = setTimeout(() => _chainPlay(1 - idx), delay);
  }

  if (a.duration) { schedule(); }
  else { a.addEventListener('loadedmetadata', schedule, { once: true }); }
}

const _typingAudio = {
  play()  {
    _taActive = true;
    clearTimeout(_taChainTimer);
    _chainPlay(0);
    return Promise.resolve();
  },
  pause() {
    _taActive = false;
    clearTimeout(_taChainTimer);
    _ta.forEach(a => { a.pause(); a.currentTime = 0; });
  },
};

function DraftDialogue({ dlgState, bannerTick }) {
  const fullLine = getDlgLine(dlgState, bannerTick);
  const [displayed, setDisplayed] = React.useState('');
  const charIdxRef = React.useRef(0);

  // Stop audio on unmount
  React.useEffect(() => () => _typingAudio.pause(), []);

  // Reset typewriter when the line changes
  React.useEffect(() => {
    setDisplayed('');
    charIdxRef.current = 0;
    _typingAudio.play().catch(() => {});
  }, [fullLine]);

  // Advance one character at a time; stop sound when done
  React.useEffect(() => {
    if (charIdxRef.current >= fullLine.length) {
      _typingAudio.pause();
      return;
    }
    const t = setTimeout(() => {
      const idx = charIdxRef.current;
      charIdxRef.current = idx + 1;
      setDisplayed(fullLine.slice(0, idx + 1));
    }, 38);
    return () => clearTimeout(t);
  }, [displayed, fullLine]);

  const rx = 3;
  const x  = DLG_X, y = DLG_Y, w = DLG_W, h = DLG_H;
  // 3-sided border path: top → right → bottom (no left side)
  const borderPath = [
    `M ${x},${y}`,
    `L ${x + w - rx},${y}`,
    `Q ${x + w},${y} ${x + w},${y + rx}`,
    `L ${x + w},${y + h - rx}`,
    `Q ${x + w},${y + h} ${x + w - rx},${y + h}`,
    `L ${x},${y + h}`,
  ].join(' ');

  return (
    <g>
      {/* ── Box fill ── */}
      <rect x={DLG_X} y={DLG_Y} width={DLG_W} height={DLG_H} rx={rx}
        fill="#0c1018" shapeRendering="crispEdges" />
      {/* ── 3-sided border: top, right, bottom — no left ── */}
      <path d={borderPath} fill="none" stroke="#ffffff" strokeWidth={1.5} />

      {/* ── Typewriter text ── */}
      <PixelText text={displayed} x={TEXT_X} y={TEXT_Y}
        scale={1} fill="#ffffff" outline={null} />

      {/* ── BballChar rendered on top of box ── */}
      <BballChar x={CHAR_X} y={CHAR_Y} scale={CHAR_SCALE} />
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DraftScreen({ homeTeamName = 'HOME', onStart, onBack }) {
  const [roster,   setRoster]   = React.useState([]);
  const [rolled,   setRolled]   = React.useState(null);
  const [animTick,    setAnimTick]    = React.useState(0);
  const [animDone,    setAnimDone]    = React.useState(true);
  const [autoDrafting, setAutoDrafting] = React.useState(false);
  const [autoPickId,  setAutoPickId]  = React.useState(null);
  const [bannerTick,  setBannerTick]  = React.useState(0);
  const animRef         = React.useRef(null);
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

  const pool     = PLAYERS.filter(p => !roster.find(r => r.id === p.id));
  const canStart = roster.length === ROSTER_SIZE;

  const roll = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const enriched = shuffled.slice(0, 3).map(p => ({
      ...p,
      ability: Math.random() < 0.08 ? rollAbility() : null,
    }));
    setRolled(enriched);
    setAnimDone(false);

    if (animRef.current) clearInterval(animRef.current);
    let tick = 0;
    setAnimTick(0);
    animRef.current = setInterval(() => {
      tick += 1;
      setAnimTick(tick);
      if (tick >= ANIM_TOTAL) {
        clearInterval(animRef.current);
        animRef.current = null;
        setAnimDone(true);
      }
    }, 16);
  };

  const pick = (player) => {
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    setRoster(prev => [...prev, player]);
    setRolled(null);
    setAnimDone(true);
  };

  const runNextAutoPick = (currentRoster) => {
    if (currentRoster.length >= ROSTER_SIZE) {
      setAutoDrafting(false);
      setRolled(null);
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

  const panelCX = MP_X + MP_W / 2;
  const panelCY = MP_Y + MP_H / 2 - 50;

  const dlgState = autoDrafting ? 'auto'
    : (rolled && animDone)  ? 'picking'
    : canStart               ? 'done'
    : 'idle';

  return (
    <g>
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#1c2e4a" />

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
      <PixelTextC text="ROSTER" cx={CX_LP} y={65} scale={1} fill="#1eb8d8" outline={null} />

      {/* Roster slots */}
      {Array.from({ length: ROSTER_SIZE }, (_, i) => {
        const slotY   = 76 + i * 22;
        const player  = roster[i] ?? null;
        const slotPos = POS_ORDER[i];
        return (
          <g key={i}>
            <rect x={8} y={slotY} width={LP_W - 12} height={16} rx={2}
              fill={player ? '#1a3428' : '#1a2e50'} shapeRendering="crispEdges" />
            {player ? (
              <>
                <rect x={10} y={slotY + 3} width={16} height={10} rx={1}
                  fill={POS_COLORS[slotPos]} shapeRendering="crispEdges" />
                <PixelTextC text={slotPos}     cx={18}         y={slotY + 5} scale={1} fill="#fff"    outline={null} />
                <PixelTextC text={player.name} cx={CX_LP + 12} y={slotY + 5} scale={1}
                  fill={player.ability ? RARITY_COLORS[player.ability.rarity] : '#40c870'} outline={null} />
              </>
            ) : (
              <>
                <rect x={10} y={slotY + 3} width={16} height={10} rx={1}
                  fill="#1e3a60" shapeRendering="crispEdges" />
                <PixelTextC text={slotPos} cx={18}    y={slotY + 5} scale={1} fill={POS_COLORS[slotPos]} outline={null} />
                <PixelTextC text="EMPTY"   cx={CX_LP + 12} y={slotY + 5} scale={1} fill="#3a5878" outline={null} />
              </>
            )}
          </g>
        );
      })}

      <rect x={8} y={190} width={LP_W - 12} height={1} fill="#3a5080" shapeRendering="crispEdges" />
      <PixelTextC
        text={`${roster.length}/${ROSTER_SIZE} PICKS`}
        cx={CX_LP} y={195} scale={1}
        fill={canStart ? '#40c870' : '#1eb8d8'} outline={null} />

      <DraftButton x={6} y={204} w={LP_W - 8} label="START GAME"
        color="#1a7a38" disabled={!canStart} onClick={() => onStart(roster)} />
      <DraftButton x={6} y={240} w={LP_W - 8} label="BACK"
        color="#385090" onClick={onBack} />

      {/* ── MAIN PANEL ───────────────────────────────────── */}
      <rect x={MP_X} y={MP_Y} width={MP_W} height={MP_H} rx={4}
        fill="#1e3050" shapeRendering="crispEdges" />

      <PixelTextC text="AVAILABLE PLAYERS" cx={panelCX} y={MP_Y + 10}
        scale={1} fill="#1eb8d8" outline={null} />
      <rect x={MP_X + 8} y={MP_Y + 22} width={MP_W - 16} height={1}
        fill="#2e4870" shapeRendering="crispEdges" />

      {/* Roll prompt */}
      {!rolled && !canStart && !autoDrafting && (
        <g>
          <PixelTextC
            text={`DRAFTING ${POS_ORDER[roster.length]}`}
            cx={panelCX} y={panelCY - 24}
            scale={1} fill={POS_COLORS[POS_ORDER[roster.length]]} outline={null} />
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

      {canStart && (
        <PixelTextC text="ROSTER COMPLETE" cx={panelCX} y={panelCY}
          scale={1} fill="#40c870" outline={null} />
      )}

      {/* Player cards */}
      {rolled && rolled.map((player, i) => {
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
      <DraftDialogue dlgState={dlgState} bannerTick={bannerTick} />
    </g>
  );
}

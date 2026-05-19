import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_BASE } from '../constants.js';
import { PixelText, PixelTextC } from './PixelText.jsx';
import { IDLE_FRAMES, RUN_FRAMES, HEAD_PORTRAIT } from '../sprites/index.js';
import { playCursor, playSelect, playCancel } from '../sound/ui.js';
import COLLECTION_DATA from '../data/collection.json';

const POS_COLORS    = { PG: '#2a7adf', SG: '#6a5ade', SF: '#28b050', PF: '#d07030', C: '#c03838' };
const RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };

const OVR_WEIGHTS = {
  PG: { spd: 0.35, dex: 0.30, jmp: 0.10, acc: 0.25 },
  SG: { spd: 0.20, dex: 0.30, jmp: 0.15, acc: 0.35 },
  SF: { spd: 0.25, dex: 0.25, jmp: 0.25, acc: 0.25 },
  PF: { spd: 0.15, dex: 0.25, jmp: 0.35, acc: 0.25 },
  C:  { spd: 0.10, dex: 0.20, jmp: 0.45, acc: 0.25 },
};
const calcOvr = (pos, p) => {
  const w = OVR_WEIGHTS[pos] ?? { spd: 0.25, dex: 0.25, jmp: 0.25, acc: 0.25 };
  return Math.round((p.spd ?? 0) * w.spd + (p.dex ?? 0) * w.dex + (p.jmp ?? 0) * w.jmp + (p.acc ?? 0) * w.acc);
};

// ─── Layout (408 × 348) ───────────────────────────────────────────────────────
const HEADER_H  = 24;
const SIDEBAR_W = 72;
const CENTER_W  = 162;
const RIGHT_X   = SIDEBAR_W + CENTER_W;   // 234
const RIGHT_W   = ZOOM_W - RIGHT_X;        // 174
const CENTER_CX = SIDEBAR_W + Math.floor(CENTER_W / 2);  // 153

// Sidebar — compact parallelogram slots (supports up to 25 players via scroll)
const SLOT_H      = 26;
const THUMB_SCALE = 3;
const THUMB_W     = 5 * THUMB_SCALE;   // 15
const THUMB_H     = 6 * THUMB_SCALE;   // 18
const PARA_H      = 22;
const PARA_W      = 60;
const PARA_SKEW   = 4;
const SEL_SHIFT   = 8;

// Scroll: up to 12 fit with no arrows; 11 visible when arrows are shown
const SIDEBAR_AREA   = TOTAL_H - HEADER_H;                                // 324
const ARROW_H        = 14;
const MAX_NO_SCROLL  = Math.floor(SIDEBAR_AREA / SLOT_H);                  // 12
const VISIBLE_SCROLL = Math.floor((SIDEBAR_AREA - 2 * ARROW_H) / SLOT_H); // 11

// Center big sprite
const BIG_SCALE  = 8;
const BIG_RUN_W  = 14 * BIG_SCALE;
const BIG_IDLE_W = 11 * BIG_SCALE;
const BIG_RUN_H  = 18 * BIG_SCALE;
const BIG_IDLE_H = 16 * BIG_SCALE;
const FEET_Y     = TOTAL_H - 34;    // 314

// Right panel anchors
const RP_X  = RIGHT_X + 10;                       // 244
const RP_CX = RIGHT_X + Math.floor(RIGHT_W / 2);  // 321

// Right panel y positions — 25px equal gap between every section
const GAP        = 25;
const RP_NAME_Y  = HEADER_H + 14;
const RP_BADGE_Y = RP_NAME_Y  + 18 + GAP;
const RP_DESC_Y  = RP_BADGE_Y + 11 + GAP;
const RP_STATS_Y = RP_DESC_Y  +  9 + GAP;
const STAT_COL_W = 82;
const STAT_ROW_H = 16;
const RP_ABIL_Y  = RP_STATS_Y + 2 * STAT_ROW_H + GAP;
const RP_OVR_LBL = RP_ABIL_Y  + 12 + GAP; // fallback; dynamic positions used at runtime

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThumbnailPortrait({ x, y, jerseyColor }) {
  return (
    <g shapeRendering="crispEdges">
      {HEAD_PORTRAIT.map(([px, py, col], i) => (
        <rect key={i}
          x={x + px * THUMB_SCALE} y={y + py * THUMB_SCALE}
          width={THUMB_SCALE} height={THUMB_SCALE}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
    </g>
  );
}

function BigPlayer({ cx, feetY, jerseyColor, running = false }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), running ? 80 : 120);
    return () => clearInterval(id);
  }, [running]);
  const frames = running ? RUN_FRAMES : IDLE_FRAMES;
  const frame  = frames[tick % frames.length];
  const fw     = running ? BIG_RUN_W  : BIG_IDLE_W;
  const fh     = running ? BIG_RUN_H  : BIG_IDLE_H;
  return (
    <g shapeRendering="crispEdges">
      {frame.map(([px, py, col], i) => (
        <rect key={i}
          x={cx - Math.floor(fw / 2) + px * BIG_SCALE}
          y={feetY - fh + py * BIG_SCALE}
          width={BIG_SCALE} height={BIG_SCALE}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
    </g>
  );
}

// slotY is passed in so scrolling can reposition slots
function SidebarSlot({ player, slotY, selected, onClick }) {
  const [hover, setHover] = React.useState(false);
  const posColor = POS_COLORS[player.pos] || '#888';
  const shift    = selected ? SEL_SHIFT : 0;

  const PT  = slotY + 2;
  const PB  = slotY + 2 + PARA_H;
  const pts = `${shift+PARA_SKEW},${PT} ${shift+PARA_SKEW+PARA_W},${PT} ${shift+PARA_W},${PB} ${shift},${PB}`;

  const paraCX = shift + Math.floor((PARA_SKEW + PARA_W) / 2);
  const thumbX = paraCX - Math.floor(THUMB_W / 2);
  const thumbY = PT + Math.floor((PARA_H - THUMB_H) / 2);

  return (
    <g data-testid={`collection2-slot-${player.id}`}
      onClick={() => { playCursor(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}>

      <polygon points={pts}
        fill={selected ? '#0e2040' : hover ? `${posColor}28` : `${posColor}12`} />

      <defs>
        <clipPath id={`cs2-para-${player.id}`}>
          <polygon points={pts} />
        </clipPath>
      </defs>
      <g clipPath={`url(#cs2-para-${player.id})`}>
        <ThumbnailPortrait x={thumbX} y={thumbY} jerseyColor={posColor} />
      </g>

      <polygon points={pts} fill="none"
        stroke={selected ? '#12d8c0' : hover ? posColor : `${posColor}40`}
        strokeWidth={selected ? 2 : 1} />
    </g>
  );
}

function TradeOverlay2({ player, onClose }) {
  const cx = ZOOM_W / 2;
  return (
    <g data-testid="collection2-trade-overlay">
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="rgba(0,0,0,0.72)" />
      <rect x={56} y={118} width={ZOOM_W - 112} height={88} rx={4}
        fill="#0d1a2c" shapeRendering="crispEdges" />
      <rect x={56} y={118} width={ZOOM_W - 112} height={88} rx={4}
        fill="none" stroke="#2a4070" strokeWidth={1.5} />
      <PixelTextC text="TRADE PLAYER?" cx={cx} y={128} scale={2} fill="#e8c060" outline="#000" />
      <PixelTextC text={player.lastName ?? player.name} cx={cx} y={152} scale={1} fill="#e0e8ff" outline={null} />
      <PixelTextC text="TRADING COMING IN A FUTURE UPDATE" cx={cx} y={166}
        scale={1} fill="#4888b0" outline={null} />
      <g onClick={() => { playCancel(); onClose(); }} style={{ cursor: 'pointer' }}
        data-testid="collection2-trade-cancel">
        <rect x={cx - 32} y={182} width={64} height={16} rx={2}
          fill="#1a2a40" shapeRendering="crispEdges" />
        <rect x={cx - 32} y={182} width={64} height={16} rx={2}
          fill="none" stroke="#2a4070" strokeWidth={1} />
        <PixelTextC text="CANCEL" cx={cx} y={186} scale={1} fill="#4888b0" outline={null} />
      </g>
    </g>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function CollectionScreen2({ roster = [], username = '', credits = 0, onBack }) {
  const displayRoster = roster.length > 0 ? roster : COLLECTION_DATA;
  const [selectedIdx,  setSelectedIdx]  = React.useState(0);
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const [tradeOpen,    setTradeOpen]    = React.useState(false);

  const needsScroll  = displayRoster.length > MAX_NO_SCROLL;
  const visibleCount = needsScroll ? VISIBLE_SCROLL : displayRoster.length;
  const maxOffset    = Math.max(0, displayRoster.length - visibleCount);
  const slotStartY   = HEADER_H + (needsScroll ? ARROW_H : 0);

  React.useEffect(() => {
    setScrollOffset(0);
    setSelectedIdx(s => Math.min(s, Math.max(0, displayRoster.length - 1)));
  }, [displayRoster.length]);

  const visiblePlayers = displayRoster.slice(scrollOffset, scrollOffset + visibleCount);
  const downArrowY     = slotStartY + visibleCount * SLOT_H;

  const scrollUp   = () => setScrollOffset(o => Math.max(0, o - 1));
  const scrollDown = () => setScrollOffset(o => Math.min(maxOffset, o + 1));

  const selected     = displayRoster[selectedIdx] ?? null;
  const posColor     = selected ? (POS_COLORS[selected.pos] || '#888') : '#888';
  const allAbilities = selected ? (selected.abilities?.length > 0 ? selected.abilities : selected.ability ? [selected.ability] : []) : [];
  const ovrStr       = selected ? String(selected.ovr ?? calcOvr(selected.pos, selected)) : '00';
  const ABIL_ROW_H   = 14;
  const abilRows     = Math.max(1, Math.min(allAbilities.length, 4));
  const dynOvrLbl    = RP_ABIL_Y + abilRows * ABIL_ROW_H + 4;
  const dynOvrVal    = dynOvrLbl + 13;
  const dynBtnY      = dynOvrVal + 36 + 6;

  const countStr = `${displayRoster.length}P`;
  const crStr    = `CR ${credits}`;

  return (
    <g data-testid="collection2-screen">

      {/* ── Base background ── */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#07101c" />

      {/* ── Center diagonal spotlight (position-colored) ── */}
      <defs>
        <linearGradient id="cs2-diag" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={posColor} stopOpacity="0.32" />
          <stop offset="55%"  stopColor={posColor} stopOpacity="0.10" />
          <stop offset="100%" stopColor={posColor} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <rect x={SIDEBAR_W} y={HEADER_H} width={CENTER_W} height={TOTAL_H - HEADER_H}
        fill="url(#cs2-diag)" />

      {/* ── Header ── */}
      <g data-testid="collection2-back"
        onClick={() => { playCancel(); onBack(); }}
        style={{ cursor: 'pointer' }}>
        <rect x={4} y={4} width={36} height={16} rx={3}
          fill="#12c878" shapeRendering="crispEdges" />
        <PixelTextC text="BACK" cx={22} y={8} scale={1} fill="#fff" outline={null} />
      </g>

      <PixelTextC text={username ? `u/${username}` : 'ROSTER'}
        cx={ZOOM_W / 2} y={8} scale={2} fill="#e8c060" outline="#000" />

      {/* Player count + credits — right-aligned */}
      <PixelText text={countStr}
        x={ZOOM_W - 8 - countStr.length * 6} y={4}
        scale={1} fill="#1e3858" outline={null} />
      <PixelText text={crStr}
        x={ZOOM_W - 8 - crStr.length * 6} y={14}
        scale={1} fill="#e8c060" outline={null} />

      {/* ── Sidebar scroll arrows ── */}
      {needsScroll && (
        <>
          <g onClick={scrollOffset > 0 ? scrollUp : undefined}
            style={{ cursor: scrollOffset > 0 ? 'pointer' : 'default' }}
            data-testid="collection2-scroll-up">
            <rect x={0} y={HEADER_H} width={SIDEBAR_W} height={ARROW_H} fill="#07101c" />
            <polygon
              points={`${SIDEBAR_W/2},${HEADER_H+3} ${SIDEBAR_W/2-7},${HEADER_H+11} ${SIDEBAR_W/2+7},${HEADER_H+11}`}
              fill={scrollOffset > 0 ? '#2a5878' : '#0d1a24'} />
          </g>

          <g onClick={scrollOffset < maxOffset ? scrollDown : undefined}
            style={{ cursor: scrollOffset < maxOffset ? 'pointer' : 'default' }}
            data-testid="collection2-scroll-down">
            <rect x={0} y={downArrowY} width={SIDEBAR_W} height={ARROW_H} fill="#07101c" />
            <polygon
              points={`${SIDEBAR_W/2},${downArrowY+11} ${SIDEBAR_W/2-7},${downArrowY+3} ${SIDEBAR_W/2+7},${downArrowY+3}`}
              fill={scrollOffset < maxOffset ? '#2a5878' : '#0d1a24'} />
          </g>
        </>
      )}

      {/* ── Sidebar — parallelogram slots ── */}
      {visiblePlayers.map((player, relIdx) => {
        const absIdx = scrollOffset + relIdx;
        return (
          <SidebarSlot
            key={player.id}
            player={player}
            slotY={slotStartY + relIdx * SLOT_H}
            selected={selectedIdx === absIdx}
            onClick={() => setSelectedIdx(absIdx)}
          />
        );
      })}

      {/* ── Center — large animated sprite ── */}
      {selected && (
        <>
          <ellipse cx={CENTER_CX} cy={FEET_Y + 8}
            rx={52} ry={12} fill={posColor} opacity={0.38} />
          <ellipse cx={CENTER_CX} cy={FEET_Y + 8}
            rx={30} ry={6} fill="#ffffff" opacity={0.12} />

          <BigPlayer cx={CENTER_CX} feetY={FEET_Y} jerseyColor={posColor} />

          <PixelTextC text={selected.pos}
            cx={CENTER_CX} y={TOTAL_H - 15}
            scale={1} fill={posColor} outline={null} />
        </>
      )}

      {/* ── Right panel — no background, no dividers ── */}
      {selected && (
        <g data-testid="collection2-detail">

          <PixelText text={selected.name}
            x={RP_X} y={RP_NAME_Y}
            scale={2} fill="#e8c060" outline="#000" />

          <rect x={RP_X} y={RP_BADGE_Y} width={22} height={11} rx={1}
            fill={posColor} shapeRendering="crispEdges" />
          <PixelTextC text={selected.pos}
            cx={RP_X + 11} y={RP_BADGE_Y + 2}
            scale={1} fill="#fff" outline={null} />

          <PixelText text={`LVL ${selected.level ?? 1}  ${(selected.rarity ?? 'common').toUpperCase()}`}
            x={RP_X + 28} y={RP_BADGE_Y + 2}
            scale={1} fill="#2a4868" outline={null} />

          <PixelText
            text={allAbilities[0]?.desc?.toUpperCase() ?? 'NO SPECIAL ABILITY'}
            x={RP_X} y={RP_DESC_Y}
            scale={1}
            fill={allAbilities.length > 0 ? '#346888' : '#1e3050'}
            outline={null} />

          {[
            { key: 'spd', label: 'SPD', color: '#20c8e0', col: 0, row: 0 },
            { key: 'dex', label: 'DEX', color: '#9860e0', col: 1, row: 0 },
            { key: 'jmp', label: 'JMP', color: '#30d060', col: 0, row: 1 },
            { key: 'acc', label: 'ACC', color: '#e09030', col: 1, row: 1 },
          ].map(({ key, label, color, col, row }) => {
            const sx = RP_X + col * STAT_COL_W;
            const sy = RP_STATS_Y + row * STAT_ROW_H;
            return (
              <g key={key}>
                <PixelText text={label}
                  x={sx} y={sy} scale={1} fill="#2e5878" outline={null} />
                <PixelText text={String(selected[key])}
                  x={sx + 22} y={sy} scale={1} fill={color} outline={null} />
              </g>
            );
          })}

          {allAbilities.length > 0 ? allAbilities.slice(0, 4).map((ab, i) => {
            const rc = RARITY_COLORS[ab?.rarity] ?? '#4888b0';
            const ay = RP_ABIL_Y + i * ABIL_ROW_H;
            return (
              <g key={i}>
                <rect x={RP_X} y={ay} width={RIGHT_W - 20} height={12} rx={2}
                  fill="rgba(0,0,0,0.45)" shapeRendering="crispEdges" />
                <rect x={RP_X} y={ay} width={RIGHT_W - 20} height={12} rx={2}
                  fill="none" stroke={rc} strokeWidth={1} />
                <PixelText text={ab?.name ?? '???'}
                  x={RP_X + 4} y={ay + 2}
                  scale={1} fill={rc} outline={null} />
              </g>
            );
          }) : (
            <PixelText text="NO ABILITY"
              x={RP_X} y={RP_ABIL_Y + 2}
              scale={1} fill="#1a2e48" outline={null} />
          )}

          <PixelTextC text="OVR"
            cx={RP_CX} y={dynOvrLbl}
            scale={1} fill="#1e3858" outline={null} />
          <PixelTextC text={ovrStr}
            cx={RP_CX} y={dynOvrVal}
            scale={4} fill={posColor} outline="#000" />

          <g data-testid="collection2-trade-btn"
            onClick={() => { playSelect(); setTradeOpen(true); }}
            style={{ cursor: 'pointer' }}>
            <rect x={RP_X} y={dynBtnY} width={RIGHT_W - 20} height={16} rx={2}
              fill="#0c2818" shapeRendering="crispEdges" />
            <rect x={RP_X} y={dynBtnY} width={RIGHT_W - 20} height={16} rx={2}
              fill="none" stroke="#28a060" strokeWidth={1} />
            <PixelTextC text="OFFER TRADE"
              cx={RP_CX} y={dynBtnY + 4}
              scale={1} fill="#20d870" outline={null} />
          </g>
        </g>
      )}

      {/* ── Trade overlay ── */}
      {tradeOpen && selected && (
        <TradeOverlay2 player={selected} onClose={() => setTradeOpen(false)} />
      )}
    </g>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_BASE } from '../constants.js';
import { PixelText, PixelTextC } from './PixelText.jsx';
import { IDLE_FRAMES, RUN_FRAMES, HEAD_PORTRAIT } from '../sprites/index.js';
import { playCursor, playSelect, playCancel } from '../sound/ui.js';
import COLLECTION_DATA from '../data/collection.json';

const POS_COLORS = { PG: '#2a7adf', SG: '#6a5ade', SF: '#28b050', PF: '#d07030', C: '#c03838' };
const STAT_DEFS = [
  { key: 'spd', label: 'SPD', color: '#20c8e0' },
  { key: 'dex', label: 'DEX', color: '#9860e0' },
  { key: 'jmp', label: 'JMP', color: '#30d060' },
  { key: 'acc', label: 'ACC', color: '#e09030' },
];
const RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };

const MOCK_PLAYERS = COLLECTION_DATA;

// ─── Layout ──────────────────────────────────────────────────────────────────

const HEADER_H  = 24;
const GRID_COLS = 4;
const COL_W     = 78; // center-to-center spacing (~45px visual gap between sprites)
const SPRITE_SCALE = 3;
const SPRITE_W  = 11 * SPRITE_SCALE; // 33
const SPRITE_H  = 16 * SPRITE_SCALE; // 48
const ROW_H     = SPRITE_H + 30;     // sprite + label space
const GRID_Y    = HEADER_H + 24;

// Detail panel split
const DETAIL_SPLIT = Math.round(ZOOM_W * 2 / 3); // ~272 — left section width
const PORT_SCALE = 12;
const PORT_W    = 5 * PORT_SCALE; // 60
const PORT_H    = 6 * PORT_SCALE; // 72

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RUN_SPRITE_W = 14 * SPRITE_SCALE; // run frames are 14px wide vs idle's 11px

function MiniPlayer({ x, y, jerseyColor, phase = 0, running = false }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = running ? 80 : 120;
    const id = setInterval(() => setTick(t => t + 1), interval);
    return () => clearInterval(id);
  }, [running]);
  const frames = running ? RUN_FRAMES : IDLE_FRAMES;
  const frame = frames[(tick + phase) % frames.length];
  return (
    <g shapeRendering="crispEdges">
      {frame.map(([px, py, col], i) => (
        <rect key={i}
          x={x + px * SPRITE_SCALE} y={y + py * SPRITE_SCALE}
          width={SPRITE_SCALE} height={SPRITE_SCALE}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
    </g>
  );
}

function Portrait({ x, y, jerseyColor }) {
  return (
    <g shapeRendering="crispEdges">
      {HEAD_PORTRAIT.map(([px, py, col], i) => (
        <rect key={i}
          x={x + px * PORT_SCALE} y={y + py * PORT_SCALE}
          width={PORT_SCALE} height={PORT_SCALE}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
    </g>
  );
}

function StatRow({ x, y, label, value, color }) {
  const BAR_X  = x + 22;
  const BAR_W  = 80;
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
      <PixelText text={String(value)} x={BAR_X + BAR_W + 5} y={y}
        scale={1} fill="#a0c8e0" outline={null} />
    </g>
  );
}

// ─── Character slot ───────────────────────────────────────────────────────────

function CharSlot({ player, cx, y, number, selected, locked, onClick }) {
  const [hover, setHover] = React.useState(false);
  const active      = selected || hover;
  const posColor    = locked ? '#3a4a60' : (POS_COLORS[player.pos] || '#888');
  const effectiveW  = selected && !locked ? RUN_SPRITE_W : SPRITE_W;
  const spriteX     = cx - Math.floor(effectiveW / 2);
  const feetY       = y + SPRITE_H;

  return (
    <g data-testid={`collection-slot-${player.id}`}
      onClick={() => { playCursor(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}>

      {/* Ground glow — only when active */}
      {active && !locked && (
        <ellipse cx={cx} cy={feetY + 4} rx={22} ry={6}
          fill="#ffffff" opacity={0.35} />
      )}
      {selected && !locked && (
        <ellipse cx={cx} cy={feetY + 4} rx={16} ry={4}
          fill="#ffffff" opacity={0.18} />
      )}

      {/* Sprite — dimmed when not active */}
      <g opacity={locked ? 0.18 : active ? 1 : 0.32}>
        <MiniPlayer x={spriteX} y={y} jerseyColor={posColor} phase={player.id} running={selected && !locked} />
      </g>

      {/* Lock icon on locked slots */}
      {locked && (
        <>
          <rect x={cx - 5} y={y + SPRITE_H / 2 - 4} width={10} height={8} rx={1}
            fill="#1e2e48" shapeRendering="crispEdges" />
          <path d={`M${cx - 3} ${y + SPRITE_H / 2 - 4} a3 3 0 0 1 6 0`}
            fill="none" stroke="#2a4870" strokeWidth={1.5} />
        </>
      )}

      {/* Number label — bright when selected, dim otherwise */}
      <PixelTextC
        text={`NO. ${number}`}
        cx={cx} y={feetY + 10}
        scale={1}
        fill={selected && !locked ? '#ffffff' : '#2a4060'}
        outline={null}
      />
    </g>
  );
}

// ─── Trade confirm overlay ────────────────────────────────────────────────────

function TradeOverlay({ player, onClose }) {
  const cx = ZOOM_W / 2;
  return (
    <g data-testid="trade-overlay">
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="rgba(0,0,0,0.70)" />
      <rect x={56} y={118} width={ZOOM_W - 112} height={88} rx={4}
        fill="#0d1a2c" shapeRendering="crispEdges" />
      <rect x={56} y={118} width={ZOOM_W - 112} height={88} rx={4}
        fill="none" stroke="#2a4070" strokeWidth={1.5} />
      <PixelTextC text="TRADE PLAYER?" cx={cx} y={128} scale={2} fill="#e8c060" outline="#000" />
      <PixelTextC text={player.name} cx={cx} y={150} scale={1} fill="#e0e8ff" outline={null} />
      <PixelTextC text="TRADING COMING IN A FUTURE UPDATE" cx={cx} y={164} scale={1} fill="#4888b0" outline={null} />
      <g onClick={() => { playCancel(); onClose(); }} style={{ cursor: 'pointer' }}
        data-testid="trade-cancel">
        <rect x={cx - 32} y={180} width={64} height={16} rx={2} fill="#1a2a40" shapeRendering="crispEdges" />
        <rect x={cx - 32} y={180} width={64} height={16} rx={2}
          fill="none" stroke="#2a4070" strokeWidth={1} />
        <PixelTextC text="CANCEL" cx={cx} y={183} scale={1} fill="#4888b0" outline={null} />
      </g>
    </g>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function CollectionScreen({ roster = [], onBack }) {
  const displayRoster = roster.length > 0 ? roster : MOCK_PLAYERS;
  const isEmpty       = false;

  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [tradeOpen,   setTradeOpen]   = React.useState(false);

  const selected = displayRoster[selectedIdx] ?? null;

  const EVEN_START = Math.floor(COL_W / 2) + 60; // extra left margin on even rows
  const ODD_START  = Math.ceil(SPRITE_W / 2) + 50; // extra left margin on odd rows
  const charPositions = displayRoster.map((_, i) => {
    let remaining = i, row = 0;
    while (true) {
      if (remaining < GRID_COLS) break;
      remaining -= GRID_COLS;
      row++;
    }
    const col   = remaining;
    const isOdd = row % 2 === 1;
    const cx    = isOdd
      ? ODD_START + col * COL_W
      : EVEN_START + col * COL_W;
    return { cx, y: GRID_Y + row * ROW_H };
  });

  const rowCount = charPositions.length > 0
    ? Math.floor(charPositions[charPositions.length - 1].y / ROW_H) - Math.floor(GRID_Y / ROW_H) + 1
    : 1;
  const DETAIL_CONTENT_H = 84; // portrait (78px) + 3px top + 3px bottom
  const detailY  = TOTAL_H - DETAIL_CONTENT_H - 4;
  const detailH  = DETAIL_CONTENT_H;

  // Detail panel internals
  const leftW    = DETAIL_SPLIT - 4;
  const rightX   = DETAIL_SPLIT + 4;
  const rightW   = ZOOM_W - rightX - 4;

  const portX    = 9 + 2;  // 2px left margin
  const nameY    = detailY + 3 + 2;   // 2px top margin
  const portY    = nameY;
  const infoX    = portX + PORT_W + 10;
  const statsY   = nameY + 14;        // one line below name

  return (
    <g data-testid="collection-screen">
      {/* Background */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#0d1220" />

      {/* Subtle grid-area tint */}
      <rect x={0} y={HEADER_H} width={ZOOM_W} height={detailY - HEADER_H}
        fill="#0f1828" shapeRendering="crispEdges" />

      {/* Header */}
      <rect x={0} y={0} width={ZOOM_W} height={HEADER_H} fill="#111830" shapeRendering="crispEdges" />
      <PixelTextC text="COLLECTION" cx={ZOOM_W / 2} y={7} scale={2} fill="#e8c060" outline="#000" />

      {/* Back button */}
      <g data-testid="collection-back" onClick={() => { playCancel(); onBack(); }}
        style={{ cursor: 'pointer' }}>
        <rect x={4} y={5} width={30} height={14} rx={2} fill="#1a2a40" shapeRendering="crispEdges" />
        <PixelTextC text="MENU" cx={19} y={8} scale={1} fill="#4888b0" outline={null} />
      </g>

      {/* Player count in header */}
      <PixelText text={`${displayRoster.length} PLAYERS`}
        x={ZOOM_W - 56} y={8} scale={1} fill="#1eb8d8" outline={null} />

      {/* Character grid */}
      {displayRoster.map((player, i) => (
        <CharSlot
          key={player.id}
          player={player}
          cx={charPositions[i].cx}
          y={charPositions[i].y}
          number={i + 1}
          selected={selectedIdx === i}
          locked={isEmpty}
          onClick={() => setSelectedIdx(i)}
        />
      ))}

      {/* Reddit avatar — right-aligned, bottom flush with detail panel */}
      {(() => {
        const imgW      = 81;
        const imgH      = 111;
        const labelH    = 4; // text height
        const marginBot = 14; // gap between label and top of detail panel
        const labelY    = detailY - marginBot;
        const imgY      = labelY - labelH - imgH;
        return (
          <g>
            <image
              href="/jxts5wo9u41e1.png"
              x={ZOOM_W - imgW - 6}
              y={imgY}
              width={imgW}
              height={imgH}
              preserveAspectRatio="xMidYMid meet"
            />
            <PixelTextC text="u/TestUser"
              cx={ZOOM_W - imgW / 2 - 6} y={labelY}
              scale={1} fill="#4888b0" outline={null} />
          </g>
        );
      })()}

      {/* Detail panel */}
      {selected && detailH > 30 && (
        <g data-testid="collection-detail">
          {/* Panel background */}
          <rect x={4} y={detailY} width={ZOOM_W - 8} height={detailH} rx={3}
            fill="rgba(8,12,28,0.88)" shapeRendering="crispEdges" />
          <rect x={4} y={detailY} width={ZOOM_W - 8} height={detailH} rx={3}
            fill="none" stroke="#1e3a60" strokeWidth={1} />

          {/* Divider between left and right sections */}
          <rect x={DETAIL_SPLIT} y={detailY + 6} width={1} height={detailH - 12}
            fill="#1e3a60" shapeRendering="crispEdges" />

          {/* ── Left section: portrait + info ── */}

          {/* Portrait */}
          <Portrait x={portX} y={portY}
            jerseyColor={isEmpty ? '#2a3a50' : (POS_COLORS[selected.pos] || '#888')} />

          {/* Pos badge */}
          <rect x={infoX} y={nameY} width={22} height={10} rx={1}
            fill={isEmpty ? '#1e2e48' : (POS_COLORS[selected.pos] || '#888')} shapeRendering="crispEdges" />
          <PixelTextC text={selected.pos} cx={infoX + 11} y={nameY + 2}
            scale={1} fill={isEmpty ? '#2a4870' : '#fff'} outline={null} />

          {/* Name + OVR */}
          <PixelText text={selected.name}
            x={infoX + 28} y={nameY + 2}
            scale={1} fill={isEmpty ? '#2a4870' : '#e0e8ff'} outline={null} />
          <PixelText text={`OVR ${selected.ovr}`}
            x={infoX + 28 + selected.name.length * 6 + 6} y={nameY + 2}
            scale={1} fill={isEmpty ? '#1e3050' : '#e8c060'} outline={null} />

          {/* Vertical stat list */}
          {STAT_DEFS.map((s, si) => (
            <StatRow key={s.key}
              x={infoX}
              y={statsY + si * 11}
              label={s.label}
              value={selected[s.key]}
              color={isEmpty ? '#1e3050' : s.color}
            />
          ))}

          {/* Ability badge */}
          {!isEmpty && (() => {
            const abilityY = statsY + 4 * 11 + 4;
            return abilityY < detailY + detailH ? (
              <>
                <rect x={infoX} y={abilityY} width={leftW - infoX - 4} height={10} rx={1}
                  fill="rgba(0,0,0,0.40)" shapeRendering="crispEdges" />
                <PixelText
                  text={selected.ability ? selected.ability.name : 'NO ABILITY'}
                  x={infoX + 4} y={abilityY + 2}
                  scale={1}
                  fill={selected.ability ? RARITY_COLORS[selected.ability.rarity] : '#2a4060'}
                  outline={null} />
              </>
            ) : null;
          })()}

          {/* ── Right section: trade ── */}
          {!isEmpty && (
            <g data-testid="collection-trade-btn"
              onClick={() => { playSelect(); setTradeOpen(true); }}
              style={{ cursor: 'pointer' }}>
              <rect x={rightX + 8} y={detailY + detailH - 22} width={rightW - 16} height={14} rx={2}
                fill="#1a4028" shapeRendering="crispEdges" />
              <rect x={rightX + 8} y={detailY + detailH - 22} width={rightW - 16} height={14} rx={2}
                fill="none" stroke="#40a060" strokeWidth={1} />
              <PixelTextC text="OFFER TRADE" cx={rightX + rightW / 2} y={detailY + detailH - 19}
                scale={1} fill="#40d080" outline={null} />
            </g>
          )}
        </g>
      )}

      {/* Trade overlay */}
      {tradeOpen && selected && !isEmpty && (
        <TradeOverlay player={selected} onClose={() => setTradeOpen(false)} />
      )}
    </g>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_HOME, JERSEY_AWAY } from '../constants.js';
import { PixelText, PixelTextC } from './PixelText.jsx';

const CX = ZOOM_W / 2; // 204

const SHADOW_DROP = 4;

function MenuButton({ x, y, w, h = 26, label, color, scale = 1, onClick }) {
  const [hover, setHover] = React.useState(false);
  const pressY = hover ? SHADOW_DROP : 0;
  const by = y + pressY;
  const textY = by + Math.floor((h - 7 * scale) / 2);
  const darkText = 'rgba(0,0,0,0.45)';
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <rect x={x+3} y={y + SHADOW_DROP} width={w-6} height={h} rx={4} fill="rgba(0,0,0,0.55)" shapeRendering="crispEdges" />
      <rect x={x} y={by} width={w} height={h} rx={6} fill={color} shapeRendering="crispEdges" />
      {hover && <rect x={x} y={by} width={w} height={h} rx={6} fill="white" opacity={0.10} shapeRendering="crispEdges" />}
      <PixelTextC text={label} cx={x + w / 2} y={textY + scale} scale={scale} fill={darkText} outline={null} />
      <PixelTextC text={label} cx={x + w / 2} y={textY} scale={scale} fill="#fff" outline={null} />
    </g>
  );
}

export function TitleScreen({ onPlay, onOptions, onCollections }) {
  const ROW_W = 316;
  const bx = Math.round(CX - ROW_W / 2); // 46
  const btnY = 258;

  return (
    <g>
      {/* ── Background ── */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#121a2e" />

      {/* Faint court geometry */}
      <circle cx={CX} cy={TOTAL_H / 2} r={108} fill="none" stroke="#1e3050" strokeWidth={2} />
      <circle cx={CX} cy={TOTAL_H / 2} r={34}  fill="none" stroke="#1e3050" strokeWidth={1.5} />
      <line x1={0} y1={TOTAL_H / 2} x2={ZOOM_W} y2={TOTAL_H / 2} stroke="#1e3050" strokeWidth={1} />

      {/* Subtle team color arcs */}
      <path d={`M ${CX-108},${TOTAL_H/2} A 108 108 0 0 1 ${CX+108},${TOTAL_H/2}`}
        fill="none" stroke={JERSEY_HOME} strokeWidth={3} opacity={0.28} />
      <path d={`M ${CX-108},${TOTAL_H/2} A 108 108 0 0 0 ${CX+108},${TOTAL_H/2}`}
        fill="none" stroke={JERSEY_AWAY} strokeWidth={3} opacity={0.28} />

      {/* ── Title ── */}
      <PixelTextC text="THE LAST" cx={CX} y={68}  scale={4} fill="#e8c060" outline="#2a1800" thick />
      <PixelTextC text="DRAFT"    cx={CX} y={106} scale={6} fill="#e8c060" outline="#2a1800" thick />

      {/* Tagline */}
      <PixelTextC text="A BASKETBALL SIMULATION" cx={CX} y={168} scale={1} fill="#1eb8d8" outline={null} />

      {/* Divider */}
      <rect x={CX - 110} y={182} width={220} height={1} fill="#2a3a58" shapeRendering="crispEdges" />

      {/* ── Buttons ── */}
      <MenuButton x={bx}               y={btnY} w={90}  label="PLAY"    color="#1a7ac8" onClick={onPlay} />
      <MenuButton x={bx+100}           y={btnY} w={116} label="OPTIONS"  color="#2a3868" onClick={onOptions} />
      <MenuButton x={bx+100+116+10}    y={btnY} w={90}  label="COLLECT"  color="#2a3868" onClick={onCollections} />

      {/* ── Profile card ── */}
      <rect x={4} y={288} width={60} height={46} rx={2} fill="#1a2240" shapeRendering="crispEdges" />
      <rect x={4} y={288} width={60} height={13} rx={2} fill="#202a4a" shapeRendering="crispEdges" />
      <PixelTextC text="PROFILE" cx={34} y={291} scale={1} fill="#1eb8d8" outline={null} />
      <PixelTextC text="P1"      cx={34} y={308} scale={2} fill="#40d0f0" outline={null} />

      {/* Version */}
      <PixelTextC text="V0.1" cx={ZOOM_W - 20} y={338} scale={1} fill="#1e4060" outline={null} />
    </g>
  );
}

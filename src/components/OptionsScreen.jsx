import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelText, PixelTextC } from './PixelText.jsx';
import { playCursor, playCancel, playMenuMove3 } from '../sound/ui.js';

const CX  = ZOOM_W / 2;  // 204

const DX  = 64;
const DW  = 280;
const DY  = 22;
const DH  = 296;
const IX  = DX + 20;   // inner content x
const IW  = DW - 40;   // inner content width (240)

const SEGS    = 8;
const SEG_W   = 10;
const SEG_H   = 11;
const SEG_GAP = 2;
const BAR_W   = SEGS * SEG_W + (SEGS - 1) * SEG_GAP;  // 94

// Row element x offsets (relative to IX)
const MINUS_DX = 40;
const BAR_DX   = MINUS_DX + 14 + 4;   // 58
const PLUS_DX  = BAR_DX + BAR_W + 4;  // 156
const PCT_DX   = PLUS_DX + 14 + 6;    // 176

const SHADOW_DROP = 4;

function DialogButton({ y, h = 26, label, color, onClick }) {
  const [hover, setHover] = React.useState(false);
  const pressY = hover ? SHADOW_DROP : 0;
  const by = y + pressY;
  const textY = by + Math.floor((h - 7) / 2);
  return (
    <g onClick={() => { playCursor(); onClick?.(); }} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <rect x={IX + 3} y={y + SHADOW_DROP} width={IW - 6} height={h}
        rx={4} fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />
      <rect x={IX} y={by} width={IW} height={h}
        rx={6} fill={color} shapeRendering="crispEdges" />
      {hover && (
        <rect x={IX} y={by} width={IW} height={h}
          rx={6} fill="white" opacity={0.10} shapeRendering="crispEdges" />
      )}
      <PixelTextC text={label} cx={CX} y={textY + 1}
        scale={1} fill="rgba(0,0,0,0.45)" outline={null} />
      <PixelTextC text={label} cx={CX} y={textY}
        scale={1} fill="#fff" outline={null} />
    </g>
  );
}

function SmallBtn({ x, y, label, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <rect x={x} y={y} width={14} height={SEG_H} rx={2}
        fill={hover ? '#2a4880' : '#1a2840'}
        stroke={hover ? '#4080c0' : '#2a3a60'}
        strokeWidth={1} shapeRendering="crispEdges" />
      <PixelTextC text={label} cx={x + 7} y={y + 2}
        scale={1} fill={hover ? '#e0f0ff' : '#6090b8'} outline={null} />
    </g>
  );
}

// accent = two CSS color stops for the filled segment gradient
function SliderRow({ label, value, onChange, rowY, accent }) {
  const filled = Math.round(value * SEGS);
  const [lo, hi] = accent;

  const decrement = () => { playMenuMove3(); onChange(Math.max(0, (filled - 1) / SEGS)); };
  const increment = () => { playMenuMove3(); onChange(Math.min(1, (filled + 1) / SEGS)); };

  const segColor = (i) => {
    // lerp between lo and hi based on position
    const t = i / (SEGS - 1);
    return t < 0.5 ? lo : hi;
  };

  return (
    <g>
      <PixelText text={label} x={IX + 0} y={rowY + 2}
        scale={1} fill="#8ab0d0" outline={null} />

      <SmallBtn x={IX + MINUS_DX} y={rowY} label="-" onClick={decrement} />

      {Array.from({ length: SEGS }, (_, i) => {
        const on   = i < filled;
        const segX = IX + BAR_DX + i * (SEG_W + SEG_GAP);
        const col  = segColor(i);
        return (
          <rect
            key={i}
            x={segX} y={rowY} width={SEG_W} height={SEG_H}
            fill={on ? col : '#1a2840'}
            stroke={on ? col : '#2a3a60'}
            strokeWidth={1} shapeRendering="crispEdges"
            style={{ cursor: 'pointer' }}
            onClick={() => { playMenuMove3(); onChange((i + 1) / SEGS); }}
          />
        );
      })}

      <SmallBtn x={IX + PLUS_DX} y={rowY} label="+" onClick={increment} />

      <PixelText text={`${Math.round(value * 100)}%`} x={IX + PCT_DX} y={rowY + 2}
        scale={1} fill="#506080" outline={null} />
    </g>
  );
}

function SectionLabel({ label, y }) {
  return (
    <>
      <PixelTextC text={label} cx={CX} y={y}
        scale={1} fill="#1eb8d8" outline={null} />
      <rect x={IX} y={y + 10} width={IW} height={1}
        fill="#2a3a58" shapeRendering="crispEdges" />
    </>
  );
}

const AUDIO_ACCENT = ['#2090d8', '#e8b030'];   // blue → amber
const CRT_ACCENT   = ['#9040d8', '#d060e8'];   // purple → violet

export function OptionsScreen({
  musicVol, sfxVol, onMusicVol, onSfxVol,
  scanlines, vignette, onScanlines, onVignette,
  onBack,
}) {
  return (
    <g>
      {/* Background */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#0d1220" />
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#000" opacity={0.45} />

      {/* Dialog shadow */}
      <rect x={DX + 3} y={DY + 3} width={DW} height={DH}
        rx={3} fill="#000" opacity={0.5} shapeRendering="crispEdges" />

      {/* Dialog body */}
      <rect x={DX} y={DY} width={DW} height={DH}
        rx={3} fill="#1a2240" shapeRendering="crispEdges" />

      {/* Header bar */}
      <rect x={DX} y={DY} width={DW} height={22}
        rx={3} fill="#232e58" shapeRendering="crispEdges" />
      <PixelTextC text="OPTIONS" cx={CX} y={DY + 7}
        scale={2} fill="#40d0f0" outline={null} />

      {/* ── AUDIO ── */}
      <SectionLabel label="AUDIO" y={DY + 32} />
      <SliderRow label="MUSIC"    value={musicVol} onChange={onMusicVol} rowY={DY + 52}  accent={AUDIO_ACCENT} />
      <SliderRow label="SFX"      value={sfxVol}   onChange={onSfxVol}   rowY={DY + 74}  accent={AUDIO_ACCENT} />

      {/* ── DISPLAY ── */}
      <SectionLabel label="DISPLAY" y={DY + 100} />
      <SliderRow label="SCANLINES" value={scanlines} onChange={onScanlines} rowY={DY + 120} accent={CRT_ACCENT} />
      <SliderRow label="VIGNETTE"  value={vignette}  onChange={onVignette}  rowY={DY + 142} accent={CRT_ACCENT} />

      {/* Divider before back */}
      <rect x={IX} y={DY + 168} width={IW} height={1}
        fill="#2a3a58" shapeRendering="crispEdges" />

      {/* BACK button */}
      <DialogButton y={DY + 176} label="BACK" color="#2a3868"
        onClick={() => { playCancel(); onBack(); }} />
    </g>
  );
}

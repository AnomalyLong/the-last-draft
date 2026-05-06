import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelText, PixelTextC } from './PixelText.jsx';
import { playMenuMove3, playCancel } from '../sound/ui.js';

const DLG_W  = 232;
const DLG_H  = 196;
const DLG_X  = Math.round((ZOOM_W - DLG_W) / 2);  // 88
const DLG_Y  = Math.round((TOTAL_H - DLG_H) / 2); // 76

const SEGS    = 8;
const SEG_W   = 11;
const SEG_H   = 10;
const SEG_GAP = 2;

// Row x positions (relative to DLG_X)
const LABEL_DX = 12;
const MINUS_DX = 62;
const BAR_DX   = MINUS_DX + 14 + 4;  // 80
const PLUS_DX  = BAR_DX + (SEGS * SEG_W + (SEGS - 1) * SEG_GAP) + 4;  // 182
const PCT_DX   = PLUS_DX + 14 + 5;   // 201

const AUDIO_COLORS = ['#2090d8', '#20c060', '#e8b030'];
const CRT_COLORS   = ['#9040d8', '#b050e0', '#d060e8'];

function segColor(i, colors) {
  const t = i / (SEGS - 1);
  return t < 0.5 ? colors[0] : t < 0.75 ? colors[1] : colors[2];
}

function SmallBtn({ x, y, label, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <rect x={x} y={y - 1} width={14} height={SEG_H + 2} rx={2}
        fill={hover ? '#2a4880' : '#1a2840'}
        stroke={hover ? '#4080c0' : '#2a3a60'}
        strokeWidth={1} shapeRendering="crispEdges" />
      <PixelTextC text={label} cx={x + 7} y={y + 1}
        scale={1} fill={hover ? '#e0f0ff' : '#6090b8'} outline={null} />
    </g>
  );
}

function SliderRow({ label, value, onChange, rowDY, colors }) {
  const ty     = DLG_Y + rowDY;
  const labelX = DLG_X + LABEL_DX;
  const minusX = DLG_X + MINUS_DX;
  const barX   = DLG_X + BAR_DX;
  const plusX  = DLG_X + PLUS_DX;
  const pctX   = DLG_X + PCT_DX;
  const filled = Math.round(value * SEGS);

  return (
    <g>
      <PixelText text={label} x={labelX} y={ty}
        scale={1} fill="#8ab0d0" outline={null} />
      <SmallBtn x={minusX} y={ty} label="-"
        onClick={() => { playMenuMove3(); onChange(Math.max(0, (filled - 1) / SEGS)); }} />
      {Array.from({ length: SEGS }, (_, i) => {
        const on  = i < filled;
        const col = segColor(i, colors);
        const sx  = barX + i * (SEG_W + SEG_GAP);
        return (
          <rect key={i} x={sx} y={ty - 1} width={SEG_W} height={SEG_H}
            fill={on ? col : '#1a2840'} stroke={on ? col : '#2a3a60'}
            strokeWidth={1} shapeRendering="crispEdges" style={{ cursor: 'pointer' }}
            onClick={() => { playMenuMove3(); onChange((i + 1) / SEGS); }} />
        );
      })}
      <SmallBtn x={plusX} y={ty} label="+"
        onClick={() => { playMenuMove3(); onChange(Math.min(1, (filled + 1) / SEGS)); }} />
      <PixelText text={`${Math.round(value * 100)}%`} x={pctX} y={ty}
        scale={1} fill="#506080" outline={null} />
    </g>
  );
}

function SectionDivider({ label, dy }) {
  const CX = DLG_X + DLG_W / 2;
  return (
    <g>
      <PixelTextC text={label} cx={CX} y={DLG_Y + dy}
        scale={1} fill="#2a5078" outline={null} />
      <rect x={DLG_X + 10} y={DLG_Y + dy + 9} width={DLG_W - 20} height={1}
        fill="#1e3050" shapeRendering="crispEdges" />
    </g>
  );
}

export function OptionsOverlay({
  musicVol, sfxVol, onMusicVol, onSfxVol,
  scanlines, vignette, onScanlines, onVignette,
  onClose, cameraX = 0,
}) {
  const [hover, setHover] = React.useState(false);
  const CX = DLG_X + DLG_W / 2;
  const BTN_DY = 166;
  const BTN_H  = 22;

  const handleClose = () => { playCancel(); onClose(); };

  return (
    <g transform={`translate(${cameraX}, 0)`}>
      {/* Backdrop */}
      <rect data-testid="options-backdrop"
        x={0} y={0} width={ZOOM_W} height={TOTAL_H}
        fill="#000" opacity={0.72}
        onClick={handleClose} style={{ cursor: 'pointer' }} />

      <g onClick={e => e.stopPropagation()}>
        {/* Shadow */}
        <rect x={DLG_X + 4} y={DLG_Y + 4} width={DLG_W} height={DLG_H} rx={4}
          fill="#000" opacity={0.55} shapeRendering="crispEdges" />
        {/* Body */}
        <rect x={DLG_X} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
          fill="#111e32" shapeRendering="crispEdges" />
        {/* Header */}
        <rect x={DLG_X} y={DLG_Y} width={DLG_W} height={26} rx={4}
          fill="#1a2a3e" shapeRendering="crispEdges" />
        <rect x={DLG_X} y={DLG_Y} width={DLG_W} height={DLG_H} rx={4}
          fill="none" stroke="#2a4060" strokeWidth={1} />
        <PixelTextC text="OPTIONS" cx={CX} y={DLG_Y + 9}
          scale={1} fill="#e8f0ff" outline={null} />

        {/* ── AUDIO ── */}
        <SectionDivider label="AUDIO" dy={32} />
        <SliderRow label="MUSIC" value={musicVol} onChange={onMusicVol} rowDY={50}  colors={AUDIO_COLORS} />
        <SliderRow label="SFX"   value={sfxVol}   onChange={onSfxVol}   rowDY={72}  colors={AUDIO_COLORS} />

        {/* ── DISPLAY ── */}
        <SectionDivider label="DISPLAY" dy={94} />
        <SliderRow label="SCNLNS" value={scanlines} onChange={onScanlines} rowDY={112} colors={CRT_COLORS} />
        <SliderRow label="VGNTTE" value={vignette}  onChange={onVignette}  rowDY={134} colors={CRT_COLORS} />

        {/* Divider */}
        <rect x={DLG_X + 10} y={DLG_Y + BTN_DY - 6} width={DLG_W - 20} height={1}
          fill="#1e3050" shapeRendering="crispEdges" />

        {/* Close button */}
        <g data-testid="options-close" onClick={handleClose} style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <rect x={DLG_X + 3} y={DLG_Y + BTN_DY + 3} width={DLG_W - 6} height={BTN_H}
            rx={3} fill="rgba(0,0,0,0.45)" shapeRendering="crispEdges" />
          <rect x={DLG_X} y={DLG_Y + BTN_DY} width={DLG_W - 6} height={BTN_H}
            rx={3} fill={hover ? '#2a4880' : '#1a2840'} shapeRendering="crispEdges" />
          {hover && (
            <rect x={DLG_X} y={DLG_Y + BTN_DY} width={DLG_W - 6} height={BTN_H}
              rx={3} fill="white" opacity={0.08} shapeRendering="crispEdges" />
          )}
          <PixelTextC text="CLOSE" cx={CX - 3} y={DLG_Y + BTN_DY + 7}
            scale={1} fill={hover ? '#e0f0ff' : '#6090b8'} outline={null} />
        </g>
      </g>
    </g>
  );
}

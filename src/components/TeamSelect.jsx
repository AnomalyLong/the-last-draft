import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

const CX = ZOOM_W / 2;

const DX = 80, DW = 248;  // dialog x, width
const DY = 48, DH = 244;  // dialog y, height
const IW = DW - 40;       // inner content width
const IX = DX + 20;       // inner content x

const SHADOW_DROP = 4;

function DialogButton({ y, h = 26, label, color, disabled = false, onClick }) {
  const [hover, setHover] = React.useState(false);
  const fill = disabled ? '#1e2030' : color;
  const pressY = (!disabled && hover) ? SHADOW_DROP : 0;
  const by = y + pressY;
  const scale = 1;
  const textY = by + Math.floor((h - 7 * scale) / 2);
  const darkText = disabled ? '#404060' : 'rgba(0,0,0,0.45)';
  const lightText = disabled ? '#404060' : '#fff';
  return (
    <g onClick={disabled ? undefined : onClick} style={{ cursor: disabled ? 'default' : 'pointer' }}
      onMouseEnter={() => !disabled && setHover(true)} onMouseLeave={() => setHover(false)}>
      {!disabled && <rect x={IX+3} y={y + SHADOW_DROP} width={IW-6} height={h} rx={4} fill="rgba(0,0,0,0.50)" shapeRendering="crispEdges" />}
      <rect x={IX} y={by} width={IW} height={h} rx={6} fill={fill} shapeRendering="crispEdges" />
      {hover && !disabled && <rect x={IX} y={by} width={IW} height={h} rx={6} fill="white" opacity={0.10} shapeRendering="crispEdges" />}
      <PixelTextC text={label} cx={CX} y={textY + scale} scale={scale} fill={darkText} outline={null} />
      <PixelTextC text={label} cx={CX} y={textY} scale={scale} fill={lightText} outline={null} />
    </g>
  );
}

export function TeamSelect({ onStart, onBack }) {
  const [teamName, setTeamName] = React.useState('');

  return (
    <g>
      {/* Dim overlay */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#000" opacity={0.65} />

      {/* Dialog shadow */}
      <rect x={DX+3} y={DY+3} width={DW} height={DH} rx={3} fill="#000" opacity={0.5} shapeRendering="crispEdges" />

      {/* Dialog body */}
      <rect x={DX} y={DY} width={DW} height={DH} rx={3} fill="#1a2240" shapeRendering="crispEdges" />

      {/* Header bar */}
      <rect x={DX} y={DY} width={DW} height={22} rx={3} fill="#232e58" shapeRendering="crispEdges" />
      <PixelTextC text="NEW GAME" cx={CX} y={DY + 7} scale={2} fill="#40d0f0" outline={null} />

      {/* Team name label */}
      <PixelTextC text="YOUR TEAM NAME" cx={CX} y={DY + 34} scale={1} fill="#1eb8d8" outline={null} />

      {/* Input field */}
      <rect x={IX} y={DY + 46} width={IW} height={26} rx={2} fill="#0e1630" shapeRendering="crispEdges" />
      <rect x={IX} y={DY + 46} width={IW} height={26} rx={2}
        fill="none" stroke="#2a4878" strokeWidth={1} shapeRendering="crispEdges" />
      <foreignObject x={IX} y={DY + 46} width={IW} height={26}>
        <div xmlns="http://www.w3.org/1999/xhtml"
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input
            value={teamName}
            onChange={e => setTeamName(e.target.value.toUpperCase().slice(0, 12))}
            onKeyDown={e => { if (e.key === 'Enter') onStart(teamName || 'HOME'); }}
            placeholder="RAPTORS"
            autoFocus
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: '#80e8ff', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold',
              textAlign: 'center', letterSpacing: '2px', padding: '0 8px',
            }}
          />
        </div>
      </foreignObject>

      {/* Game mode section */}
      <PixelTextC text="GAME MODE" cx={CX} y={DY + 88} scale={1} fill="#1eb8d8" outline={null} />
      <rect x={IX} y={DY + 100} width={IW} height={22} rx={2} fill="#202e58" shapeRendering="crispEdges" />
      <PixelTextC text="QUICK GAME" cx={CX} y={DY + 106} scale={1} fill="#60d0f0" outline={null} />

      {/* Divider */}
      <rect x={IX} y={DY + 132} width={IW} height={1} fill="#2a3a58" shapeRendering="crispEdges" />

      {/* START button */}
      <DialogButton y={DY + 142} label="START GAME" color="#1a7ac8"
        onClick={() => onStart(teamName || 'HOME')} />

      {/* BACK button */}
      <DialogButton y={DY + 178} label="BACK" color="#2a3868"
        onClick={onBack} />
    </g>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_HOME, JERSEY_AWAY } from '../constants.js';
import { PixelText, PixelTextC } from './PixelText.jsx';
import { playCursor } from '../sound/ui.js';

const CX = ZOOM_W / 2; // 204

const SHADOW_DROP = 4;

function MenuButton({ x, y, w, h = 26, label, color, scale = 1, onClick }) {
  const [hover, setHover] = React.useState(false);
  const pressY = hover ? SHADOW_DROP : 0;
  const by = y + pressY;
  const textY = by + Math.floor((h - 7 * scale) / 2);
  const darkText = 'rgba(0,0,0,0.45)';
  const handleClick = () => { playCursor(); onClick?.(); };
  return (
    <g onClick={handleClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <rect x={x+3} y={y + SHADOW_DROP} width={w-6} height={h} rx={4} fill="rgba(0,0,0,0.55)" shapeRendering="crispEdges" />
      <rect x={x} y={by} width={w} height={h} rx={6} fill={color} shapeRendering="crispEdges" />
      {hover && <rect x={x} y={by} width={w} height={h} rx={6} fill="white" opacity={0.10} shapeRendering="crispEdges" />}
      <PixelTextC text={label} cx={x + w / 2} y={textY + scale} scale={scale} fill={darkText} outline={null} />
      <PixelTextC text={label} cx={x + w / 2} y={textY} scale={scale} fill="#fff" outline={null} />
    </g>
  );
}

export function TitleScreen({ onPlay, onOptions, onCollections, username = '', credits = 0 }) {
  const ROW_W = 316;
  const bx = Math.round(CX - ROW_W / 2); // 46
  const btnY = 258;

  return (
    <g>
      {/* ── Background ── */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#0d1220" />

      {/* ── User profile — top-right corner ── */}
      {(() => {
        const full = username ? `u/${username}` : 'u/...';
        const displayUsername = full.length > 11 ? full.slice(0, 9) + '..' : full;
        const avatarCx = 390, avatarCy = 16;
        const textCx = 313;
        return (
          <>
            <rect x={244} y={4} width={158} height={28} rx={2} fill="#0a1828" opacity={0.85} shapeRendering="crispEdges" />
            <rect x={244} y={4} width={158} height={28} rx={2} fill="none" stroke="#1e3050" strokeWidth={1} shapeRendering="crispEdges" />
            <defs>
              <clipPath id="title-avatar-clip">
                <circle cx={avatarCx} cy={avatarCy} r={8} />
              </clipPath>
            </defs>
            <circle cx={avatarCx} cy={avatarCy} r={9} fill="#0a1828" stroke="#ffe060" strokeWidth={1} />
            <image href="/jxts5wo9u41e1.png" x={avatarCx - 12} y={avatarCy - 12} width={24} height={31}
              clipPath="url(#title-avatar-clip)" preserveAspectRatio="xMidYMid meet" />
            <PixelTextC text={displayUsername} cx={textCx} y={9} scale={1} fill="#aac8e0" outline={null} />
            <text x={textCx} y={23} textAnchor="middle" fontSize={6} fontFamily="monospace" fill="#ffe060">{credits} CREDITS</text>
          </>
        );
      })()}

      {/* ── Player silhouette ── scaled to fill screen, centered */}
      <g transform="translate(44, 18) scale(2.46)" opacity={0.72}>
        {/* thin detail lines — face, shoe */}
        <g fill="none" stroke="#2a5c9e" strokeWidth={0.75} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10}>
          <path d="m62.8 11.9c0.1 0 0.2 0.1 0.3 0.1 0.3-0.1 0.3-2.7 1.4-2.9 1.2-0.3 1.9 1.9 2.3 1.5 0.8-0.3-0.2-1.3 0.5-1.6 1.2-0.2 0.3-1.4 0.6-2.1 0.2-0.7 1.5-0.3 2.4-0.7 1.8-0.8 1.9-0.1 2.8-0.2 1.1 0 2.8-0.8 3.1 0.5 0.1 1.3 0.4 2.8 0.5 3.8"/>
          <path d="m64.5 20.3c0.4-2.8-2.2-3.4-2.4-6.6-0.1-1.5 1-1.9 1-1.9l-0.2-3.4c0-1.4-0.3-2.4-0.1-2.7 0.6-1.1 0.9-3 2.2-3 0.8-1.4 1-1 2-1.1 0.8 0 1.2-0.7 1.8-0.6 1.1 0 2.7-0.2 4.1 0.5 1.7 0.2 2.2 0.6 3.1 2 0.6 1.1-0.1 1.1 0.4 1.9 0.5 0.6 0.1 1.3 0.4 2.5 0.6 1.7-0.1 2.4-0.1 2.4"/>
          <path d="m23.6 58.4c-0.5 1.5 0.8 3.2 2.8 2.9"/>
          <path d="m26.4 61.3c0.2 2.1 1.5 1.6 2.3 1.3 1.4-0.2 1.7 0.3 2.3 0.8s1.4-0.3 1.4-1"/>
          <path d="m32.2 128.7c2.4-2.7 5.2-3 8.2-0.8 1.8 1.2 3.7 1.5 3.4-0.5-0.4-3.7 0.6-5.4 1-8-2.4-0.8-1.7-2.5-2.9-3.5-0.8-0.9-2.8-0.9-3.5-0.5-1 0.6-0.5 2-0.7 3.3-0.1 0.9-1.1 0.7-1.1 1.7s-1.2 2.2-1.6 3.3"/>
          <path d="m103 43.1c0.5-0.2 2.9-0.5 4.5 0l-0.2 3.5c-0.7-0.2-2.7-0.5-4.3 0"/>
          <path d="m106.9 47.1c-0.5 3.4 0.4 3.5 0 6.5-0.5 3.1-0.2 5.5-1 9"/>
        </g>
        {/* main body lines */}
        <g fill="none" stroke="#2a5c9e" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10}>
          <path d="m60.6 24.4c-4 1.2-4.9 1.6-5.6 2.6-1.2 1.7-2.6 3.9-2.7 6.7s0.5 4.2-0.1 5.3c-0.6 1.4-1.9 4.9-2.5 7.7-0.2 0.9-0.4 0.9-0.9 1-2.8 0.7-4 2.8-5.9 4.3l-1.7 1"/>
          <path d="m39.2 59.9 9.1-2.4c2.2-0.7 3.1-1.5 6.3-3.7 1-0.6 0.4-0.8 1.5-3.6 1.4-3.4 2.7-4.5 2.7-13"/>
          <path d="m61.1 38.7c0.5-1.9 0.2-3.3-0.5-16.3-0.1-0.5 3.5-1.8 4.2-2.2"/>
          <path d="m63.8 22.1c0.4-0.1 1.7-0.8 2.8-0.9"/>
          <path d="m64.2 22c0.2 4.2 2.4 7.7 6.2 7.7s5.7-3.9 6.2-13l7.7 1.6c0.9 0.3 1.4-0.2 3 0.1 2.2 0.3 5.6 1.8 7.4 3.1 0.8 0.7 1.9 0.1 3.3 0.7 2.1 0.8 5.5 2.8 8 4.2 1.9 1.1 1.7 2 1.9 5 0.3 5.3-0.3 7.4-0.6 11.5"/>
          <path d="m89.1 32.6c-0.7 1.1-1.8 2.3-2.5 2-1.1-0.4-6.2-4.3-6.3-12.4 0-1.2 0.3-2.5 0.6-4"/>
          <path d="m87.1 62.8c-0.5 1.8-0.8 2.3-0.5 5.3 0 2.3-3.5 5-5.7 8.6-0.8 1.6-0.3 1.4-1.5 2.6l-12.8 16.1s1.6 0.7 1 2c-1.7 3-4 2.7-5 2.9-0.8 1.6-0.8 3-2.7 4.4-1.5 1.3-6.8 4.4-7.7 2.3-0.8-1.3 0.7-4.4 1.3-5.4l5.2-4.8c0.5 0-0.3 2.1 1.6 3.3 1.3 0.8 2.1-0.5 5.1 0"/>
          <path d="m52.6 101.4 3.3-11.8c0.5-2.2 0.2-2.2 2.2-4.2l4-4.4c0.5-0.4 0.3-0.9 0.7-1.3l3.2-3.4c1.8-1.9 3.6-3.4 2.8-10.2"/>
          <path d="m63 83.1c1.6 3 3.6 6.8 7.4 7.3"/>
          <path d="m59.9 37.9c-1.8-1.2-3.3-2.8-4.3-1.6"/>
          <path d="m69.3 60.3c4.3 1.8 10.1 3.3 17.6 2.5 0.5-1.9-0.3-2.9 1.2-4 0.7-0.4 1.3 0.6 2-0.2 1.3-1.5 0.8-3 0.5-6.6-0.5-5.9 0-6.9-0.5-8.1-1-2.8-0.6-3.3-0.6-6 0-4-0.9-7.9-0.9-7.9 1.3-1 1.8-0.6 3.4 0.1 3.4 1.6 7.5 0.8 8.9 1.6 1.1 0.7 1.1 1.9 1.5 5.2 0.7 6 0.5 7 0.5 10 0 2.5-2.3 5.5-2.3 7.1s0.8 1.9 0 3.9l-0.5 1.7c0.2 1 1.5-0.5 2.1-1 0.4-0.2-1.3 3.8-1.6 4.4 0 0.6 0 0.6 1.4 0.4 0.6-0.3 3.1-3.8 3.4-5.5l1.2-0.3"/>
          <path d="m66.4 18c0.2 1.6 0.2 2.2 1.2 3.3 2.8 2.8 3.4 3.6 5 3.4 2-0.1 2.8-0.8 2.9-2.8"/>
          <path d="m76.1 10.9c-2.2 0.1-0.2 3-0.6 4.5-0.1 0.7-0.9 0.9-1.6 0.9"/>
          <path d="m39.5 115c2.9-7.4 3.9-14.1 5.9-22 0.6-2.5 2.2-4.6 4.7-7.9"/>
          <path d="m41.2 110.1 5 2.1"/>
          <path d="m32.8 125.4c0.8-1 3.4-3 6.7-1.3"/>
          <path d="m59.5 66.3-1.2-1.6"/>
          <path d="m65.6 76.3c0.4-3.4-1.5-6.4-5.2-6.6-3.7-0.1-6.5 1.9-7.2 5.4-0.2 2.8-0.1 3.8-1.6 5.5-0.7 1-1 1.8-1.5 9.1"/>
          <path d="m52.6 74.6c0.4-2.2 1.3-4.5 1.4-6.2 0.1-2.8 1.1-1.8 2.4-4 1.5-2.4 1.2-4 3.1-6.3 1.5-1.3 1-1.8 2.1-3.2 1-0.8-0.5-2.5 0.8-3.6 1-0.7 1.5-0.4 1.2-3.4l-1-7.3c-0.2-1.2-2-2.5-2.7-3"/>
          <path d="m69.3 60.3c3.3 1.3 9.3 3.1 17.6 2.5"/>
        </g>
        {/* basketball — orange */}
        <path fill="#e07828" stroke="#0a1e3c" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit={10}
          d="m22.4 56.3c-1.8-6.2 2-11.7 7.5-12.9 5.2-0.8 10 2.2 11.2 7 1.3 5-2 10.2-6.7 11.7-4.9 1.5-10.5-1.1-12-5.8z"/>
        {/* foot outline */}
        <path fill="none" stroke="#2a5c9e" strokeWidth={1.25} strokeMiterlimit={10}
          d="m53.1 75.1c0.5-3.5 1.5-5 0.9-1.5"/>
        {/* solid filled detail */}
        <path fill="#2a5c9e"
          d="m58.9 66.3c1.5 1.3 3.2 1.3 5 3.1 1.7 1.7 2.7 4.5 2.5 6.9l-1.3 0.1c0.3-2.3-0.7-4.8-3-5.8-2-0.9-5.4-0.7-7.1 1.3l-0.9-0.8c2.5-2.7 6.5-2.7 9-1.4 1 0.7 1.5 1.3 2 1.9-1.5-3-3.2-3.5-4.7-4.5l-1.5-0.8z"/>
      </g>

      {/* ── Title ── */}
      <PixelTextC text="THE MBA"    cx={CX} y={106} scale={6} fill="#e8c060" outline="#2a1800" thick />

      {/* Tagline */}
      <PixelTextC text="MULTIVERSAL BASKETBALL LEAGUE" cx={CX} y={168} scale={1} fill="#1eb8d8" outline={null} />

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

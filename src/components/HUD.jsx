import React from 'react';
import { ZOOM_W, TOP_BAR, TOTAL_H, svgToGrid, JERSEY_HOME, JERSEY_AWAY, JERSEY_BASE } from '../constants.js';
import { pixelTextPixels, MONOGRAM_CELL_W, MONOGRAM_GLYPH_H } from '../sprites/monogram.js';
import { HEAD_PORTRAIT, IDLE_FRAMES, RUN_FRAMES } from '../sprites/index.js';

// ─── Pixel text helpers ────────────────────────────────────────────────────

const OUTLINE_4 = [[-1,0],[1,0],[0,-1],[0,1]];

function PixelText({ text, x, y, scale = 2, fill = '#fff', outline = '#000' }) {
  const pixels = pixelTextPixels(text, x, y, scale);
  return (
    <g shapeRendering="crispEdges">
      {OUTLINE_4.map(([dx,dy],oi) => pixels.map(([px,py],pi) => (
        <rect key={`o${oi}_${pi}`} x={px+dx*scale} y={py+dy*scale} width={scale} height={scale} fill={outline} />
      )))}
      {pixels.map(([px,py],pi) => (
        <rect key={`f${pi}`} x={px} y={py} width={scale} height={scale} fill={fill} />
      ))}
    </g>
  );
}

function PixelTextC({ text, cx, y, scale = 2, ...rest }) {
  const w = text.length * MONOGRAM_CELL_W * scale;
  return <PixelText text={text} x={Math.round(cx - w / 2)} y={y} scale={scale} {...rest} />;
}

// ─── Player portrait helpers ───────────────────────────────────────────────

const POS_COLORS = { PG: '#2a7adf', SG: '#6a5ade', SF: '#28b050', PF: '#d07030', C: '#c03838' };

const STAT_DEFS = [
  { key: 'spd', label: 'SPD', color: '#20c8e0' },
  { key: 'dex', label: 'DEX', color: '#9860e0' },
  { key: 'jmp', label: 'JMP', color: '#30d060' },
  { key: 'acc', label: 'ACC', color: '#e09030' },
];

// Head portrait: 5×6 sprite at scale=4 → 20×24px
const PORT_SCALE = 4;
const PORT_W = 5 * PORT_SCALE; // 20px
const PORT_H = 6 * PORT_SCALE; // 24px

function HeadPortrait({ x, y, jerseyColor, flip = false }) {
  const inner = (
    <g shapeRendering="crispEdges">
      {HEAD_PORTRAIT.map(([px, py, col], i) => (
        <rect key={i}
          x={x + px * PORT_SCALE} y={y + py * PORT_SCALE}
          width={PORT_SCALE} height={PORT_SCALE}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
    </g>
  );
  if (!flip) return inner;
  return (
    <g transform={`scale(-1,1) translate(-${2 * x + PORT_W}, 0)`}>
      {inner}
    </g>
  );
}

const PANEL_Y = 0;
// Panels anchored to viewport edges; center gap reserved for scoreboard
export const LP_X = 0,   LP_W = 150;   // flush left
export const RP_W = 150;
export const RP_X = ZOOM_W - RP_W;     // flush right (dynamically anchored to ZOOM_W)
const BAR_W = 68, BAR_H = 5, ROW_H = 13;
// 4 stat rows + 5px gap + ability badge (9px) + 4px bottom pad = 70
const PANEL_H = 4 * ROW_H + BAR_H + 5 + 9 + 4; // 71

const RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };

export function PlayerPortrait({ player, rosterEntry, side, jerseyColor, hasBall = false }) {
  const isLeft  = side === 'left';
  const panelX  = isLeft ? LP_X : RP_X;
  const panelW  = isLeft ? LP_W : RP_W;
  const posColor = POS_COLORS[player.role] || '#888';
  const name    = rosterEntry?.name ?? '';

  // Portrait — 8px margin from left/right, 7px from top
  const portX  = isLeft ? panelX + 8 : panelX + panelW - PORT_W - 8;
  const portY  = PANEL_Y + 7;
  // Stats block width: label(18) + gap(3) + bar + gap(3) + value(12)
  const STATS_W = 3 * MONOGRAM_CELL_W + 3 + BAR_W + 3 + 2 * MONOGRAM_CELL_W;
  // Home: stats start right of portrait. Away: stats end snug against portrait.
  const lblX   = isLeft ? portX + PORT_W + 13 : portX - STATS_W - 8;
  const barX   = lblX + 3 * MONOGRAM_CELL_W + 3;
  const statY0 = PANEL_Y + 7; // first stat row aligned with portrait top

  return (
    <g>

      {/* Glossy background */}
      <rect x={panelX} y={PANEL_Y} width={panelW} height={PANEL_H}
        fill="rgba(8,12,28,0.72)" shapeRendering="crispEdges" />
      <rect x={panelX} y={PANEL_Y} width={panelW} height={Math.floor(PANEL_H * 0.35)}
        fill="rgba(255,255,255,0.06)" shapeRendering="crispEdges" />

      {/* Ball-holder border — inset so full stroke renders inside the overlay viewBox */}
      {hasBall && (<>
        <rect x={panelX+1} y={PANEL_Y+1} width={panelW-2} height={PANEL_H-2}
          fill="none" stroke="#ffd700" strokeWidth={2} shapeRendering="crispEdges" />
        <rect x={panelX+4} y={PANEL_Y+4} width={panelW-8} height={PANEL_H-8}
          fill="none" stroke="rgba(255,250,180,0.4)" strokeWidth={1} shapeRendering="crispEdges" />
      </>)}

      {/* Head portrait */}
      <HeadPortrait x={portX} y={portY} jerseyColor={jerseyColor} flip={!isLeft} />

      {/* Role badge + name under portrait */}
      <rect x={portX} y={portY + PORT_H + 2} width={PORT_W} height={8} rx={1}
        fill={posColor} shapeRendering="crispEdges" />
      <PixelTextC text={player.role} cx={portX + PORT_W / 2} y={portY + PORT_H + 3}
        scale={1} fill="#fff" outline={null} />
      {name && (
        <PixelTextC text={name.slice(0, 5)} cx={portX + PORT_W / 2} y={portY + PORT_H + 13}
          scale={1} fill="#fff" outline="#000" />
      )}

      {/* Level + XP bar */}
      <PixelTextC text={`Lv.${player.level}`} cx={portX + PORT_W / 2} y={portY + PORT_H + 23}
        scale={1} fill="#c8d8e0" outline="#000" />
      {[0,1,2,3,4].map(i => (
        <rect key={i}
          x={portX + i * 4} y={portY + PORT_H + 34}
          width={3} height={5}
          fill={(player.xp / player.xpMax) * 5 > i ? '#00ff44' : '#1a3820'}
          shapeRendering="crispEdges" />
      ))}

      {/* Stat bars: LABEL [bar] VALUE */}
      {rosterEntry && STAT_DEFS.map(({ key, label, color }, i) => {
        const val    = rosterEntry[key] ?? 0;
        const filled = Math.round((val / 99) * BAR_W);
        const ry     = statY0 + i * ROW_H;
        const numX   = barX + BAR_W + 3;
        return (
          <g key={key}>
            <PixelText text={label} x={lblX} y={ry} scale={1} fill={color} outline="#000" />
            <rect x={barX} y={ry} width={BAR_W} height={BAR_H} rx={1}
              fill="rgba(0,0,0,0.45)" shapeRendering="crispEdges" />
            {filled > 0 && (
              <rect x={barX} y={ry} width={filled} height={BAR_H} rx={1}
                fill={color} opacity={0.9} shapeRendering="crispEdges" />
            )}
            <PixelText text={String(val)} x={numX} y={ry} scale={1} fill="#fff" outline="#000" />
          </g>
        );
      })}

      {/* Ability badges — horizontal row, truncated to 4 chars */}
      {rosterEntry && (() => {
        const ay = statY0 + 3 * ROW_H + BAR_H + 9;
        const abilities = rosterEntry.abilities ?? (rosterEntry.ability ? [rosterEntry.ability] : []);
        if (abilities.length === 0) {
          const slotW = 10 * MONOGRAM_CELL_W + 6;
          return (
            <g>
              <rect x={lblX} y={ay - 1} width={slotW} height={9} rx={2}
                fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} shapeRendering="crispEdges" />
              <PixelText text="NO ABILITY" x={lblX + 3} y={ay} scale={1} fill="rgba(255,255,255,0.3)" outline={null} />
            </g>
          );
        }
        const abPos = [];
        let ax = lblX;
        for (const ab of abilities) {
          const label = ab.name.slice(0, 4);
          const bw = label.length * MONOGRAM_CELL_W + 6;
          abPos.push({ ab, label, x: ax, bw });
          ax += bw + 2;
        }
        return (
          <g>
            {abPos.map(({ ab, label, x, bw }, ai) => {
              const rc = RARITY_COLORS[ab.rarity] ?? '#888';
              return (
                <g key={ai}>
                  <rect x={x} y={ay - 1} width={bw} height={9} rx={2}
                    fill={rc} opacity={0.18} shapeRendering="crispEdges" />
                  <rect x={x} y={ay - 1} width={bw} height={9} rx={2}
                    fill="none" stroke={rc} strokeWidth={1} opacity={0.6} shapeRendering="crispEdges" />
                  <PixelText text={label} x={x + 3} y={ay} scale={1} fill={rc} outline="#000" />
                </g>
              );
            })}
          </g>
        );
      })()}
    </g>
  );
}

// ─── Team Viewer ──────────────────────────────────────────────────────────────

const TV_PX    = 5,  TV_PY = 5;
const TV_PW    = ZOOM_W - 10;                                      // 398
const TV_PH    = TOTAL_H - 10;                                     // 338
const TV_HDR   = 24;
const TV_SEP_W = 36;
const TV_HX    = TV_PX + 8;                                        // 13
const TV_AR    = TV_PX + TV_PW - 8;                                // 395
const TV_COL   = Math.floor((TV_AR - TV_HX - TV_SEP_W - 8) / 2);  // 169
const TV_SEP_X = TV_HX + TV_COL + 4;                               // 186
const TV_AX    = TV_SEP_X + TV_SEP_W + 4;                          // 226
const TV_ROW_H = Math.floor((TV_PH - TV_HDR - 4) / 5);            // 62
const TV_ROWS_Y = TV_PY + TV_HDR;                                  // 29
const TV_BAR_W = 38;
const TV_LW    = MONOGRAM_CELL_W * 3;  // 18 — stat label width
const TV_VW    = MONOGRAM_CELL_W * 2;  // 12 — stat value width
const TV_RC    = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };
const TV_POS   = ['PG', 'SG', 'SF', 'PF', 'C'];
// Portrait offsets — HeadPortrait is PORT_W×PORT_H (20×24) at PORT_SCALE=4
const TV_CONT_HX  = TV_HX + PORT_W + 8;  // 41 — home content starts after portrait
const TV_PORT_AX  = TV_AR - PORT_W - 4;  // 371 — x arg that renders flipped sprite flush to TV_AR
const TV_CONT_ARX = TV_PORT_AX - 4;      // 367 — away content right edge

function TVStatHome({ x, y, label, val, oppVal, color }) {
  const win    = val > oppVal;
  const filled = Math.round((val / 99) * TV_BAR_W);
  return (
    <g>
      <PixelText text={label} x={x} y={y} scale={1}
        fill={win ? color : '#243650'} outline={null} />
      <rect x={x + TV_LW + 2} y={y + 2} width={TV_BAR_W} height={5} rx={1}
        fill="#060e1a" shapeRendering="crispEdges" />
      {filled > 0 && (
        <rect x={x + TV_LW + 2} y={y + 2} width={filled} height={5} rx={1}
          fill={color} opacity={win ? 0.88 : 0.26} shapeRendering="crispEdges" />
      )}
      <PixelText text={String(val)} x={x + TV_LW + 2 + TV_BAR_W + 3} y={y}
        scale={1} fill={win ? '#c8e4ff' : '#243650'} outline={null} />
    </g>
  );
}

function TVStatAway({ rx, y, label, val, oppVal, color }) {
  const win    = val > oppVal;
  const filled = Math.round((val / 99) * TV_BAR_W);
  const lblX   = rx - TV_LW;
  const barX   = lblX - 2 - TV_BAR_W;
  const valX   = barX - 2 - TV_VW;
  return (
    <g>
      <PixelText text={label} x={lblX} y={y} scale={1}
        fill={win ? color : '#243650'} outline={null} />
      <rect x={barX} y={y + 2} width={TV_BAR_W} height={5} rx={1}
        fill="#060e1a" shapeRendering="crispEdges" />
      {filled > 0 && (
        <rect x={barX + TV_BAR_W - filled} y={y + 2} width={filled} height={5} rx={1}
          fill={color} opacity={win ? 0.88 : 0.26} shapeRendering="crispEdges" />
      )}
      <PixelText text={String(val)} x={valX} y={y}
        scale={1} fill={win ? '#c8e4ff' : '#243650'} outline={null} />
    </g>
  );
}

function TVHome({ ry, player, opp, pc, livePlayer }) {
  const abilities = player?.abilities ?? (player?.ability ? [player.ability] : []);
  const ay = ry + 49;
  const abPos = [];
  let ax = TV_CONT_HX;
  for (const ab of abilities) {
    const bw = ab.name.length * MONOGRAM_CELL_W + 6;
    abPos.push({ ab, x: ax, bw });
    ax += bw + 2;
  }
  return (
    <g>
      {/* Portrait frame */}
      <rect x={TV_HX - 1} y={ry + 3} width={PORT_W + 2} height={PORT_H + 2} rx={2}
        fill="#060e1a" shapeRendering="crispEdges" />
      <rect x={TV_HX - 1} y={ry + 3} width={PORT_W + 2} height={PORT_H + 2} rx={2}
        fill="none" stroke={pc} strokeWidth={1} opacity={0.55} />
      <HeadPortrait x={TV_HX} y={ry + 4} jerseyColor={JERSEY_HOME} />

      {/* Pos badge + name + OVR */}
      <rect x={TV_CONT_HX} y={ry + 4} width={20} height={9} rx={1}
        fill={pc} shapeRendering="crispEdges" />
      <PixelTextC text={player.role ?? player.pos ?? ''} cx={TV_CONT_HX + 10} y={ry + 5}
        scale={1} fill="#fff" outline={null} />
      <PixelText text={(player.lastName ?? player.name ?? '').slice(0, 7)} x={TV_CONT_HX + 23} y={ry + 4}
        scale={1} fill="#b0ccec" outline={null} />
      <PixelText text={String(player.ovr)} x={TV_SEP_X - TV_VW - 4} y={ry + 4}
        scale={1} fill="#e8c060" outline={null} />

      {/* Level + XP pips below portrait */}
      {livePlayer && (
        <g>
          <PixelTextC text={`Lv.${livePlayer.level}`} cx={TV_HX + PORT_W / 2} y={ry + 31}
            scale={1} fill="#c8d8e0" outline={null} />
          {[0,1,2,3,4].map(pip => (
            <rect key={pip}
              x={TV_HX + pip * 4} y={ry + 40}
              width={3} height={4}
              fill={livePlayer.xpMax > 0 && (livePlayer.xp / livePlayer.xpMax) * 5 > pip ? '#00ff44' : '#1a3820'}
              shapeRendering="crispEdges" />
          ))}
        </g>
      )}

      {/* Stat bars */}
      {STAT_DEFS.map(({ key, label, color }, si) => (
        <TVStatHome key={key} x={TV_CONT_HX} y={ry + 16 + si * 8}
          label={label} val={player[key] ?? 0} oppVal={opp?.[key] ?? 0} color={color} />
      ))}

      {/* Ability badges — horizontal row */}
      {abPos.length > 0 ? abPos.map(({ ab, x, bw }, ai) => {
        const rc = TV_RC[ab.rarity] ?? '#888';
        return (
          <g key={ai}>
            <rect x={x} y={ay - 1} width={bw} height={9} rx={2}
              fill={rc} opacity={0.16} shapeRendering="crispEdges" />
            <rect x={x} y={ay - 1} width={bw} height={9} rx={2}
              fill="none" stroke={rc} strokeWidth={1} opacity={0.50} />
            <PixelText text={ab.name} x={x + 3} y={ay} scale={1} fill={rc} outline={null} />
          </g>
        );
      }) : (
        <PixelText text="NO ABILITY" x={TV_CONT_HX} y={ay}
          scale={1} fill="#182640" outline={null} />
      )}
    </g>
  );
}

function TVAway({ ry, player, opp, pc, livePlayer }) {
  const abilities = player?.abilities ?? (player?.ability ? [player.ability] : []);
  const ay = ry + 49;
  const abPos = [];
  let rx = TV_CONT_ARX;
  for (let i = abilities.length - 1; i >= 0; i--) {
    const ab = abilities[i];
    const bw = ab.name.length * MONOGRAM_CELL_W + 6;
    rx -= bw;
    abPos[i] = { ab, x: rx, bw };
    if (i > 0) rx -= 2;
  }
  return (
    <g>
      {/* OVR + name (left of away column) */}
      <PixelText text={String(player.ovr)} x={TV_AX + 2} y={ry + 4}
        scale={1} fill="#e8c060" outline={null} />
      <PixelText text={(player.lastName ?? player.name ?? '').slice(0, 7)} x={TV_AX + TV_VW + 6} y={ry + 4}
        scale={1} fill="#b0ccec" outline={null} />

      {/* Pos badge — right-aligned to content edge */}
      <rect x={TV_CONT_ARX - 20} y={ry + 4} width={20} height={9} rx={1}
        fill={pc} shapeRendering="crispEdges" />
      <PixelTextC text={player.pos ?? ''} cx={TV_CONT_ARX - 10} y={ry + 5}
        scale={1} fill="#fff" outline={null} />

      {/* Portrait frame + headshot (right edge, flipped) */}
      <rect x={TV_PORT_AX - 1} y={ry + 3} width={PORT_W + 2} height={PORT_H + 2} rx={2}
        fill="#060e1a" shapeRendering="crispEdges" />
      <rect x={TV_PORT_AX - 1} y={ry + 3} width={PORT_W + 2} height={PORT_H + 2} rx={2}
        fill="none" stroke={pc} strokeWidth={1} opacity={0.55} />
      <HeadPortrait x={TV_PORT_AX} y={ry + 4} jerseyColor={JERSEY_AWAY} flip />

      {/* Level + XP pips below portrait */}
      {livePlayer && (
        <g>
          <PixelTextC text={`Lv.${livePlayer.level}`} cx={TV_PORT_AX + PORT_W / 2} y={ry + 31}
            scale={1} fill="#c8d8e0" outline={null} />
          {[0,1,2,3,4].map(pip => (
            <rect key={pip}
              x={TV_PORT_AX + pip * 4} y={ry + 40}
              width={3} height={4}
              fill={livePlayer.xpMax > 0 && (livePlayer.xp / livePlayer.xpMax) * 5 > pip ? '#00ff44' : '#1a3820'}
              shapeRendering="crispEdges" />
          ))}
        </g>
      )}

      {/* Stat bars (mirrored, right-aligned to content edge) */}
      {STAT_DEFS.map(({ key, label, color }, si) => (
        <TVStatAway key={key} rx={TV_CONT_ARX} y={ry + 16 + si * 8}
          label={label} val={player[key] ?? 0} oppVal={opp?.[key] ?? 0} color={color} />
      ))}

      {/* Ability badges — horizontal row, right-aligned */}
      {abPos.map(({ ab, x, bw }, ai) => {
        const rc = TV_RC[ab.rarity] ?? '#888';
        return (
          <g key={ai}>
            <rect x={x} y={ay - 1} width={bw} height={9} rx={2}
              fill={rc} opacity={0.16} shapeRendering="crispEdges" />
            <rect x={x} y={ay - 1} width={bw} height={9} rx={2}
              fill="none" stroke={rc} strokeWidth={1} opacity={0.50} />
            <PixelText text={ab.name} x={x + 3} y={ay} scale={1} fill={rc} outline={null} />
          </g>
        );
      })}
    </g>
  );
}

// ─── Isometric Roles Panel ─────────────────────────────────────────────────
// World: worldX=0..50 (court width), worldZ=0..47 (depth, 0=midcourt, 47=baseline/basket)

const ISO_T  = 3;    // pixels per world-unit
const ISO_OX = 204;  // screen origin X (≈ ZOOM_W / 2)
const ISO_OY = 62;   // screen origin Y (below header + sub-tabs)

function iso(wx, wz) {
  // Rotate court 90°: basket/baseline appears upper-left, midcourt lower-right
  return { x: ISO_OX + (47 - wz - wx) * ISO_T, y: ISO_OY + (47 - wz + wx) * ISO_T * 0.5 };
}

function isoPts(pairs) {
  return pairs.map(([wx, wz]) => {
    const p = iso(wx, wz);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');
}

function isoArcPts(cx, cz, r, t0, t1, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * i / n;
    pts.push([cx + r * Math.cos(t), cz - r * Math.sin(t)]);
  }
  return isoPts(pts);
}

// Half-court world positions [worldX, worldZ]
const ISO_HOME = { PG: [25,8],  SG: [43,14], SF: [48,28], PF: [39,36], C: [25,42] };
const ISO_AWAY = { PG: [23,12], SG: [45,17], SF: [46,32], PF: [36,40], C: [24,44] };

function IsoCourt() {
  const FLOOR  = '#06100c';
  const LINE   = 'rgba(44,170,80,0.60)';
  const LINE_B = 'rgba(55,210,100,0.90)';
  const PAINT  = '#040c12';
  return (
    <g shapeRendering="crispEdges">
      <polygon  points={isoPts([[0,0],[50,0],[50,47],[0,47]])}         fill={FLOOR} />
      <polygon  points={isoPts([[19,28],[31,28],[31,47],[19,47]])}      fill={PAINT} />
      <polyline points={isoPts([[0,0],[50,0],[50,47],[0,47],[0,0]])}    fill="none" stroke={LINE_B} strokeWidth={0.9} />
      <polyline points={isoPts([[0,0],[50,0]])}                         fill="none" stroke={LINE_B} strokeWidth={0.8} />
      <polyline points={isoPts([[19,28],[19,47]])}                      fill="none" stroke={LINE}   strokeWidth={0.65} />
      <polyline points={isoPts([[31,28],[31,47]])}                      fill="none" stroke={LINE}   strokeWidth={0.65} />
      <polyline points={isoPts([[19,28],[31,28]])}                      fill="none" stroke={LINE}   strokeWidth={0.65} />
      <polyline points={isoArcPts(25,28,6,0,Math.PI)}                  fill="none" stroke={LINE}   strokeWidth={0.5}  opacity={0.55} />
      <polyline points={isoArcPts(25,28,6,Math.PI,2*Math.PI)}          fill="none" stroke={LINE}   strokeWidth={0.5}  opacity={0.25} strokeDasharray="2 3" />
      <polyline points={isoArcPts(25,47,23.75,0,Math.PI)}              fill="none" stroke={LINE_B} strokeWidth={0.9} />
      <polyline points={isoArcPts(25,47,4,0,Math.PI)}                  fill="none" stroke={LINE}   strokeWidth={0.5}  opacity={0.45} />
      <polyline points={isoPts([[22.5,47.8],[27.5,47.8]])}             fill="none" stroke="#b86020" strokeWidth={2} />
      <polyline points={isoArcPts(25,46.5,1.5,0,2*Math.PI,14)}        fill="none" stroke="#e04808" strokeWidth={1.3} />
    </g>
  );
}

function IsoPlayerChar({ wx, wz, jerseyColor, phase = 0, isDragging = false, isDropTarget = false, pos, isStar = false, onDragStart = null, onShooterToggle = null }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 120);
    return () => clearInterval(id);
  }, []);
  const SC = 1;
  const f  = IDLE_FRAMES[(tick + phase) % IDLE_FRAMES.length];
  const gp = iso(wx, wz);
  const sX = gp.x - 6;   // center horizontally (sprite 11px wide at SC=1)
  const sY = gp.y - 16;  // feet at gp.y
  const pc = POS_COLORS[pos] ?? '#888';
  return (
    <g opacity={isDragging ? 0.18 : 1}>
      {isDropTarget && <ellipse cx={gp.x} cy={gp.y + 1} rx={13} ry={4}  fill="#40ffaa" opacity={0.16} />}
      {isStar && !isDragging && <ellipse cx={gp.x} cy={gp.y - 8} rx={10} ry={14} fill="rgba(255,220,40,0.08)" />}
      <ellipse cx={gp.x} cy={gp.y + 1} rx={7} ry={2.5} fill="rgba(0,0,0,0.50)" />
      <g shapeRendering="crispEdges">
        {f.map(([px, py, col], i) => (
          <rect key={i} x={sX + px * SC} y={sY + py * SC} width={SC} height={SC}
            fill={col === JERSEY_BASE ? jerseyColor : col} />
        ))}
      </g>
      {isStar && !isDragging && (
        <PixelTextC text="*" cx={gp.x + 9} y={sY - 1} scale={2} fill="#ffe040" outline="#000" />
      )}
      {isDropTarget && (
        <PixelTextC text="DROP!" cx={gp.x} y={gp.y + 7} scale={1} fill="#40ffaa" outline={null} />
      )}
      <rect x={gp.x - 7} y={gp.y + 3} width={14} height={8} rx={1}
        fill={pc} opacity={0.9} shapeRendering="crispEdges" />
      <PixelTextC text={pos} cx={gp.x} y={gp.y + 4} scale={1} fill="#fff" outline={null} />
      {!isDragging && (onDragStart || onShooterToggle) && (
        <ellipse cx={gp.x} cy={gp.y - 8} rx={9} ry={13}
          fill="transparent"
          style={{ cursor: onShooterToggle ? 'pointer' : 'grab', pointerEvents: 'all' }}
          onMouseDown={onDragStart ? e => onDragStart(e, pos) : undefined}
          onTouchStart={onDragStart ? e => onDragStart(e, pos) : undefined}
          onClick={onShooterToggle ?? undefined} />
      )}
    </g>
  );
}

function TVRolesGhost({ homePos, dragPos }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);
  const SC    = 3;
  const frame = RUN_FRAMES[tick % RUN_FRAMES.length];
  const jc    = POS_COLORS[homePos] ?? '#888';
  const ox    = dragPos.x - 7 * SC;
  const oy    = dragPos.y - 24;
  const feetY = oy + 18 * SC;
  return (
    <g shapeRendering="crispEdges" style={{ pointerEvents: 'none' }}>
      {frame.map(([px, py, col], i) => (
        <rect key={i} x={ox + px * SC} y={oy + py * SC} width={SC} height={SC}
          fill={col === JERSEY_BASE ? jc : col} />
      ))}
      <ellipse cx={dragPos.x} cy={feetY + 3} rx={22} ry={6} fill="rgba(0,0,0,0.28)" />
      <PixelTextC text={homePos} cx={dragPos.x} y={feetY + 10} scale={1} fill="#e8c060" outline="#000" />
    </g>
  );
}

function TVRolesPanel({ homeRoster, awayRoster, guardMap, setGuardMap, primaryShooter, setPrimaryShooter, dragHomePos, dragPos, dropTarget, onStartDrag, slotBoundsRef }) {
  const [rolesTab, setRolesTab] = React.useState('defense');

  React.useEffect(() => {
    slotBoundsRef.current = TV_POS.map(pos => {
      const [wx, wz] = ISO_AWAY[pos];
      const p = iso(wx, wz);
      return { pos, x: p.x - 16, y: p.y - 28, w: 32, h: 36 };
    });
  });

  const sorted = React.useMemo(() => {
    const arr = [
      ...TV_POS.map((pos, i) => {
        const [wx, wz] = ISO_HOME[pos];
        return { pos, wx, wz, sy: iso(wx, wz).y, team: 'home', roster: homeRoster?.[i] };
      }),
      ...TV_POS.map((pos, i) => {
        const [wx, wz] = ISO_AWAY[pos];
        return { pos, wx, wz, sy: iso(wx, wz).y, team: 'away', roster: awayRoster?.[i] };
      }),
    ];
    return arr.sort((a, b) => a.sy - b.sy);
  }, [homeRoster, awayRoster]);

  const TAB_W  = 44;
  const TAB_Y  = TV_ROWS_Y + 3;
  const TAB_H  = 12;
  const INS_Y  = Math.round(ISO_OY + (50 + 47) * ISO_T * 0.5) + 12;
  const BTN_W  = 54;
  const BTN_GAP = 4;
  const BTN_Y  = INS_Y + 12;
  const BTN_X0 = Math.round(ZOOM_W / 2 - (5 * BTN_W + 4 * BTN_GAP) / 2);

  return (
    <g>
      {/* DEFENSE / OFFENSE sub-tabs */}
      {[['defense', 'DEFENSE'], ['offense', 'OFFENSE']].map(([key, label], i) => {
        const active = rolesTab === key;
        const tx = ZOOM_W / 2 - 47 + i * (TAB_W + 6);
        return (
          <g key={key} onClick={e => { e.stopPropagation(); setRolesTab(key); }} style={{ cursor: 'pointer' }}>
            <rect x={tx} y={TAB_Y} width={TAB_W} height={TAB_H} rx={2}
              fill={active ? '#0b2240' : '#050c18'} shapeRendering="crispEdges" />
            <rect x={tx} y={TAB_Y} width={TAB_W} height={TAB_H} rx={2}
              fill="none" stroke={active ? '#2870c0' : '#0c1e30'} strokeWidth={1} />
            <PixelTextC text={label} cx={tx + TAB_W / 2} y={TAB_Y + 2}
              scale={1} fill={active ? '#60b0ff' : '#192a40'} outline={null} />
          </g>
        );
      })}

      {/* Isometric half-court */}
      <IsoCourt />

      {/* Guard assignment lines (defense tab) */}
      {rolesTab === 'defense' && TV_POS.map(hp => {
        const ap   = guardMap[hp] ?? hp;
        const hPt  = iso(ISO_HOME[hp][0], ISO_HOME[hp][1]);
        const aPt  = iso(ISO_AWAY[ap][0], ISO_AWAY[ap][1]);
        const pc   = POS_COLORS[hp];
        const drag = dragHomePos === hp;
        return (
          <line key={hp}
            x1={hPt.x} y1={hPt.y - 18}
            x2={drag ? dragPos.x : aPt.x}
            y2={drag ? dragPos.y : aPt.y - 16}
            stroke={drag ? 'rgba(255,255,255,0.18)' : pc}
            strokeWidth={drag ? 1 : 1.5}
            strokeDasharray={drag ? '3 5' : '2 4'}
            opacity={drag ? 0.2 : 0.60}
            style={{ pointerEvents: 'none' }} />
        );
      })}

      {/* Players — depth-sorted for correct isometric layering */}
      {sorted.map(({ pos, wx, wz, team }) => {
        const home     = team === 'home';
        const dragging = home && dragHomePos === pos;
        const target   = !home && dropTarget === pos;
        const star     = home && primaryShooter === pos;
        const jc       = home ? JERSEY_HOME : JERSEY_AWAY;
        const idx      = TV_POS.indexOf(pos);
        return (
          <IsoPlayerChar
            key={`${team}_${pos}`}
            wx={wx} wz={wz}
            jerseyColor={jc}
            phase={home ? idx * 3 : idx * 3 + 8}
            isDragging={dragging}
            isDropTarget={target}
            pos={pos}
            isStar={star}
            onDragStart={home && rolesTab === 'defense' ? onStartDrag : null}
            onShooterToggle={home && rolesTab === 'offense'
              ? () => setPrimaryShooter(s => s === pos ? null : pos) : null} />
        );
      })}

      {/* Running ghost follows cursor during drag */}
      {dragHomePos && rolesTab === 'defense' && (
        <TVRolesGhost homePos={dragHomePos} dragPos={dragPos} />
      )}

      {/* Instructions */}
      <PixelTextC
        text={rolesTab === 'defense'
          ? (dragHomePos ? `PLACING ${dragHomePos}...` : 'DRAG PLAYERS TO ASSIGN GUARDS')
          : 'TAP A PLAYER TO SET SHOOTER'}
        cx={ZOOM_W / 2} y={INS_Y}
        scale={1} fill={dragHomePos ? '#e8c060' : '#2a4060'} outline={null} />

      {/* Primary shooter selector */}
      {TV_POS.map((pos, i) => {
        const star = primaryShooter === pos;
        const pc   = POS_COLORS[pos];
        const bx   = BTN_X0 + i * (BTN_W + BTN_GAP);
        return (
          <g key={pos} onClick={() => setPrimaryShooter(s => s === pos ? null : pos)} style={{ cursor: 'pointer' }}>
            <rect x={bx + 1} y={BTN_Y + 2} width={BTN_W} height={11} rx={2}
              fill="rgba(0,0,0,0.40)" shapeRendering="crispEdges" />
            <rect x={bx} y={BTN_Y} width={BTN_W} height={11} rx={2}
              fill={star ? '#0d1e06' : '#070e16'} shapeRendering="crispEdges" />
            <rect x={bx} y={BTN_Y} width={BTN_W} height={11} rx={2}
              fill="none" stroke={star ? '#50c820' : pc}
              strokeWidth={star ? 1.5 : 0.5} opacity={star ? 1 : 0.45} />
            <PixelTextC text={star ? `*${pos}` : pos}
              cx={bx + BTN_W / 2} y={BTN_Y + 2}
              scale={1} fill={star ? '#88f040' : pc} opacity={star ? 1 : 0.5} outline={null} />
          </g>
        );
      })}
    </g>
  );
}

// ─── Team Viewer overlay ──────────────────────────────────────────────────────
const TV_TAB_W   = 28;
const TV_TAB_GAP = 4;
const TV_TABS    = [['stats', 'STATS'], ['roles', 'ROLES']];
const TV_TAB_X0  = Math.round(ZOOM_W / 2 - (TV_TABS.length * TV_TAB_W + (TV_TABS.length - 1) * TV_TAB_GAP) / 2);

export function TeamViewer({ players = [], homeRoster, awayRoster, homeTeamName, awayTeamName, onClose }) {
  const [tvTab, setTvTab] = React.useState('stats');
  const [primaryShooter, setPrimaryShooter] = React.useState(null);
  const [guardMap, setGuardMap] = React.useState(
    () => Object.fromEntries(TV_POS.map(p => [p, p]))
  );

  // Drag state
  const [dragHomePos, setDragHomePos] = React.useState(null);
  const [dragPos,     setDragPos]     = React.useState({ x: 0, y: 0 });
  const [dropTarget,  setDropTarget]  = React.useState(null);
  const bgRef         = React.useRef(null);
  const slotBoundsRef = React.useRef([]);
  const assignRef     = React.useRef(null);
  const dropTargetRef = React.useRef(null);

  const assignGuard = React.useCallback((homePos, awayPos) => {
    if (homePos && awayPos) setGuardMap(prev => ({ ...prev, [homePos]: awayPos }));
  }, []);
  assignRef.current = assignGuard;

  const toSvgCoords = React.useCallback((clientX, clientY) => {
    const el = bgRef.current;
    if (!el) return { x: clientX, y: clientY };
    const svg = el.ownerSVGElement;
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = el.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const r = pt.matrixTransform(ctm.inverse());
    return { x: r.x, y: r.y };
  }, []);

  React.useEffect(() => {
    if (!dragHomePos) return;
    const hitSlot = (p) => slotBoundsRef.current.find(
      s => p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h
    )?.pos ?? null;
    const onMove = (e) => {
      const p = toSvgCoords(e.clientX, e.clientY);
      setDragPos(p);
      dropTargetRef.current = hitSlot(p);
      setDropTarget(dropTargetRef.current);
    };
    const onUp = () => {
      if (dropTargetRef.current) assignRef.current?.(dragHomePos, dropTargetRef.current);
      dropTargetRef.current = null;
      setDragHomePos(null);
      setDropTarget(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragHomePos, toSvgCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  const onStartDrag = React.useCallback((e, homePos) => {
    e.preventDefault();
    const src = 'touches' in e ? e.touches[0] : e;
    const p = toSvgCoords(src.clientX, src.clientY);
    setDragHomePos(homePos);
    setDragPos(p);
    if ('touches' in e) {
      const hitSlot = (pt) => slotBoundsRef.current.find(
        s => pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h
      )?.pos ?? null;
      const onTM = (ev) => {
        ev.preventDefault();
        const pt = toSvgCoords(ev.touches[0].clientX, ev.touches[0].clientY);
        setDragPos(pt);
        dropTargetRef.current = hitSlot(pt);
        setDropTarget(dropTargetRef.current);
      };
      const cleanup = () => {
        window.removeEventListener('touchmove', onTM);
        window.removeEventListener('touchend', onTE);
        window.removeEventListener('touchcancel', onTE);
      };
      const onTE = (ev) => {
        const pt = toSvgCoords(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
        const slot = hitSlot(pt);
        if (slot) assignRef.current?.(homePos, slot);
        dropTargetRef.current = null;
        setDragHomePos(null);
        setDropTarget(null);
        cleanup();
      };
      window.addEventListener('touchmove', onTM, { passive: false });
      window.addEventListener('touchend', onTE);
      window.addEventListener('touchcancel', onTE);
    }
  }, [toSvgCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <g style={{ touchAction: 'none' }}>
      <rect ref={bgRef} x={0} y={0} width={ZOOM_W} height={TOTAL_H}
        fill="rgba(0,0,0,0.90)" onClick={onClose} style={{ cursor: 'pointer' }} />

      <rect x={TV_PX} y={TV_PY} width={TV_PW} height={TV_PH} rx={4}
        fill="#09152a" shapeRendering="crispEdges" />
      <rect x={TV_PX} y={TV_PY} width={TV_PW} height={TV_PH} rx={4}
        fill="none" stroke="#243860" strokeWidth={1} />

      {/* Header */}
      <rect x={TV_PX} y={TV_PY} width={TV_PW} height={TV_HDR} rx={4}
        fill="#0d1e3a" shapeRendering="crispEdges" />
      <rect x={TV_PX + 4} y={TV_PY + TV_HDR - 1} width={TV_PW - 8} height={1}
        fill="#243860" shapeRendering="crispEdges" />

      <PixelTextC text={homeTeamName.slice(0, 8)} cx={TV_HX + TV_COL / 2} y={TV_PY + 8}
        scale={1} fill={JERSEY_HOME} outline="#000" />
      <PixelTextC text={awayTeamName.slice(0, 8)} cx={TV_AX + TV_COL / 2} y={TV_PY + 8}
        scale={1} fill={JERSEY_AWAY} outline="#000" />

      {/* Tabs */}
      {TV_TABS.map(([key, label], i) => {
        const active = tvTab === key;
        const tx = TV_TAB_X0 + i * (TV_TAB_W + TV_TAB_GAP);
        return (
          <g key={key} onClick={(e) => { e.stopPropagation(); setTvTab(key); }} style={{ cursor: 'pointer' }}>
            <rect x={tx} y={TV_PY + 7} width={TV_TAB_W} height={10} rx={2}
              fill={active ? '#14406a' : '#060e14'} shapeRendering="crispEdges" />
            <rect x={tx} y={TV_PY + 7} width={TV_TAB_W} height={10} rx={2}
              fill="none" stroke={active ? '#3078c0' : '#1e3050'} strokeWidth={1} />
            <PixelTextC text={label} cx={tx + TV_TAB_W / 2} y={TV_PY + 9}
              scale={1} fill={active ? '#60b0ff' : '#2a4060'} outline={null} />
          </g>
        );
      })}

      {/* Close */}
      <g onClick={onClose} style={{ cursor: 'pointer' }}>
        <rect x={TV_PX + TV_PW - 20} y={TV_PY + 5} width={14} height={12} rx={2}
          fill="#1c2a3e" shapeRendering="crispEdges" />
        <PixelTextC text="X" cx={TV_PX + TV_PW - 13} y={TV_PY + 7}
          scale={1} fill="#c04040" outline={null} />
      </g>

      {/* Content */}
      {tvTab === 'stats' ? (
        TV_POS.map((pos, i) => {
          const home = homeRoster?.[i] ?? null;
          const away = awayRoster?.[i] ?? null;
          const liveHome = players.find(p => p.id === i + 1) ?? null;
          const liveAway = players.find(p => p.id === i + 6) ?? null;
          const ry   = TV_ROWS_Y + i * TV_ROW_H;
          const pc   = POS_COLORS[pos];
          return (
            <g key={pos}>
              <rect x={TV_PX + 1} y={ry} width={TV_PW - 2} height={TV_ROW_H}
                fill={i % 2 ? '#08121e' : '#0b1828'} shapeRendering="crispEdges" />
              <rect x={TV_SEP_X + 2} y={ry + 3} width={TV_SEP_W - 4} height={TV_ROW_H - 6} rx={3}
                fill={pc} opacity={0.10} shapeRendering="crispEdges" />
              <rect x={TV_SEP_X + 2} y={ry + 3} width={TV_SEP_W - 4} height={TV_ROW_H - 6} rx={3}
                fill="none" stroke={pc} strokeWidth={1} opacity={0.32} />
              <PixelTextC text={pos}
                cx={TV_SEP_X + TV_SEP_W / 2}
                y={ry + Math.floor((TV_ROW_H - MONOGRAM_GLYPH_H) / 2)}
                scale={1} fill={pc} outline={null} />
              {home && <TVHome ry={ry} player={home} opp={away} pc={pc} livePlayer={liveHome} />}
              {away && <TVAway ry={ry} player={away} opp={home} pc={pc} livePlayer={liveAway} />}
              {i < 4 && (
                <rect x={TV_PX + 1} y={ry + TV_ROW_H} width={TV_PW - 2} height={1}
                  fill="#14253a" shapeRendering="crispEdges" />
              )}
            </g>
          );
        })
      ) : (
        <TVRolesPanel
          homeRoster={homeRoster}
          awayRoster={awayRoster}
          guardMap={guardMap}
          setGuardMap={setGuardMap}
          primaryShooter={primaryShooter}
          setPrimaryShooter={setPrimaryShooter}
          dragHomePos={dragHomePos}
          dragPos={dragPos}
          dropTarget={dropTarget}
          onStartDrag={onStartDrag}
          slotBoundsRef={slotBoundsRef}
        />
      )}
    </g>
  );
}

// ─── Scoreboard geometry ───────────────────────────────────────────────────

const SB_TOP  = 312;
const SB_BOT  = 333;
const SHELF_B = 338;
const SKEW    = 4;
const WING    = 5;

// Section layout: bottom-edge x, width  (centered on ZOOM_W/2=204, total width=192)
const S = {
  hn: { bx: 108, bw: 52 },   // home name
  hs: { bx: 160, bw: 22 },   // home score
  an: { bx: 182, bw: 52 },   // away name
  as: { bx: 234, bw: 22 },   // away score
  cl: { bx: 256, bw: 44 },   // clock
};

const MID_Y = Math.round((SB_TOP + SB_BOT) / 2);

// SVG polygon points for a section (bottom bx..bx+bw, top skewed by SKEW)
// wingL/wingR: whether the outer edge flares instead of using SKEW
function secPts(sec, wingL = false, wingR = false) {
  const { bx, bw } = sec;
  const tl = bx  + (wingL ? -WING : SKEW);
  const tr = bx + bw + (wingR ?  WING : SKEW);
  return `${bx},${SB_BOT} ${bx+bw},${SB_BOT} ${tr},${SB_TOP} ${tl},${SB_TOP}`;
}

// Accent strip on the left edge of a name section
const ACCENT_W = 7;
function accentPts(sec, wingL = false) {
  const { bx } = sec;
  const tl = bx + (wingL ? -WING : SKEW);
  const tr = bx + ACCENT_W + SKEW;
  return `${bx},${SB_BOT} ${bx+ACCENT_W},${SB_BOT} ${tr},${SB_TOP} ${tl},${SB_TOP}`;
}

// Visual center x of a section at mid-height
function cx(sec) { return sec.bx + sec.bw / 2 + SKEW / 2; }
// Visual center x of name area (after accent strip)
function cxName(sec) {
  return sec.bx + ACCENT_W + (sec.bw - ACCENT_W) / 2 + SKEW / 2;
}

// ─── Debug Console (HTML overlay, renders outside SVG) ────────────────────

export function DebugConsole({ logs, onCommand, showDebug, onToggleDebug }) {
  const [input, setInput] = React.useState('');
  const logRef = React.useRef(null);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === '`' && e.target.tagName !== 'INPUT') { e.preventDefault(); onToggleDebug(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggleDebug]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && input.trim()) { onCommand(input.trim()); setInput(''); }
    if (e.key === 'Escape') onToggleDebug();
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 20, fontFamily: 'monospace', fontSize: '18px' }}>
      {/* DBG toggle */}
      <div
        onClick={onToggleDebug}
        style={{
          position: 'absolute', top: 4, left: 4,
          width: 44, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: showDebug ? '#1a3a1a' : '#1a1a1a', border: `1px solid ${showDebug ? '#3a6a3a' : '#333'}`,
          borderRadius: 2, cursor: 'pointer', pointerEvents: 'auto',
          color: showDebug ? '#8f8' : '#555', fontSize: 14, userSelect: 'none',
        }}>
        DBG
      </div>
      {/* Console panel */}
      {showDebug && (
        <div style={{
          position: 'absolute', top: 36, left: 8, width: 400, height: 260,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(8,8,8,0.92)', border: '1px solid #333', borderRadius: 3,
          overflow: 'hidden', pointerEvents: 'auto',
        }}>
          <div ref={logRef} data-testid="debug-log" style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {logs.map((log, i) => (
              <div key={i} data-testid={`log-entry-${log.type}`} style={{ color: log.type === 'cmd' ? '#4af' : log.type === 'err' ? '#f55' : '#8f8', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                {log.type === 'cmd' ? `> ${log.text}` : log.text}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #222', padding: '4px 8px', gap: 6 }}>
            <span style={{ color: '#4af' }}>{'>'}</span>
            <input data-testid="debug-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: 'monospace', fontSize: 18, padding: 0 }}
              placeholder="command..." autoFocus />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function HUD({ homeScore, awayScore, homeTeamName = 'HOME', quarter, time, players, possession, awayTeamName = 'AWAY', homeRoster = [], awayRoster = [], onOptions, showTeams = false, onShowTeams, showDebug = false, totalCredits = 0, username = '', isMobile = false }) {
  const mins = Math.floor(time / 60), secs = time % 60;
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const qStr    = `Q${quarter}`;
  const hStr    = String(homeScore);
  const aStr    = String(awayScore);

  const carrier = players.find(p => p.hasBall) ?? players[0];
  const g1 = svgToGrid(carrier.cx, carrier.cy);

  const textY  = MID_Y - Math.round(MONOGRAM_GLYPH_H / 2);
  const clockY = SB_TOP + 2;
  const qY     = clockY + MONOGRAM_GLYPH_H + 3;

  return (
    <g>
      {/* ── TOP MENU ───────────────────────────────────────── */}

      {/* User profile — avatar + text centered as a unit over the buttons (x=158–250, mid=204)
          Group: 18px avatar + 4px gap + 66px text zone = 88px → left=160, avatar cx=169, text cx=215 */}
      <defs>
        <clipPath id="user-avatar-clip">
          <circle cx={169} cy={15} r={8} />
        </clipPath>
      </defs>
      <circle cx={169} cy={15} r={9} fill="#0a1828" stroke="#ffe060" strokeWidth={1} />
      <image
        href="/jxts5wo9u41e1.png"
        x={157} y={3} width={24} height={31}
        clipPath="url(#user-avatar-clip)"
        preserveAspectRatio="xMidYMid meet"
      />
      <PixelTextC text={(() => { const t = username ? `u/${username}` : 'u/...'; return t.length > 11 ? t.slice(0, 9) + '..' : t; })()} cx={215} y={9} scale={1} fill="#aac8e0" outline={null} />
      <text x={182} y={23} textAnchor="start" fontSize={6} fontFamily="monospace" fill="#ffe060">{totalCredits} CREDITS</text>

      {/* Debug coords — overlay only when console is open */}
      {showDebug && (
        <text x={204} y={33} textAnchor="middle" fontSize={8} fontFamily="monospace"
          fill="#4af">{`x:${g1.x} y:${g1.y}`}</text>
      )}

      {/* Teams button — left of centre pair */}
      <g onClick={() => onShowTeams(s => !s)} style={{ cursor: 'pointer' }}>
        <rect x={158} y={30} width={44} height={10} rx={1}
          fill={showTeams ? '#14283c' : '#0c1420'} shapeRendering="crispEdges" />
        <rect x={158} y={30} width={44} height={10} rx={1}
          fill="none" stroke={showTeams ? '#3060a0' : '#1e3050'} strokeWidth={1} />
        <PixelTextC text="TEAMS" cx={180} y={32}
          scale={1} fill={showTeams ? '#5898d8' : '#2a4060'} outline={null} />
      </g>

      {/* Options button — right of centre pair */}
      <g data-testid="hud-options-btn" onClick={onOptions} style={{ cursor: 'pointer' }}>
        <rect x={206} y={30} width={44} height={10} rx={1}
          fill="#0c1420" shapeRendering="crispEdges" />
        <rect x={206} y={30} width={44} height={10} rx={1}
          fill="none" stroke="#1e3050" strokeWidth={1} />
        <PixelTextC text="OPT" cx={228} y={32}
          scale={1} fill="#2a4060" outline={null} />
      </g>

      <text data-testid="possession" visibility="hidden"
        fill={possession === 'home' ? '#4af' : '#f55'}>
        {possession === 'home' ? 'HOME ball' : 'AWAY ball'}
      </text>

      {/* Hidden text nodes for test queries */}
      <text data-testid="score-home" visibility="hidden">{homeScore}</text>
      <text data-testid="score-away" visibility="hidden">{awayScore}</text>
      <text data-testid="timer"      visibility="hidden">{timeStr}</text>
      <text data-testid="quarter"    visibility="hidden">{qStr}</text>

      {/* ── SCOREBOARD ─────────────────────────────────────── */}
      {/* On mobile: shift down 15 units and scale 1.15× around the scoreboard centre (204, 322.5) */}
      <g transform={isMobile ? 'translate(204,362.5) scale(1.20) translate(-204,-322.5)' : undefined}>

      {/* 3-D shelf */}
      <polygon shapeRendering="crispEdges" fill="#5a5a5a"
        points={`54,${SB_BOT} 350,${SB_BOT} 352,${SHELF_B} 52,${SHELF_B}`} />
      <polygon shapeRendering="crispEdges" fill="#303030"
        points={`52,${SHELF_B} 352,${SHELF_B} 354,${SHELF_B+3} 50,${SHELF_B+3}`} />

      {/* Outer dark shell */}
      <polygon shapeRendering="crispEdges" fill="#252525"
        points={`${S.hn.bx},${SB_BOT} ${S.cl.bx+S.cl.bw},${SB_BOT} ${S.cl.bx+S.cl.bw+WING},${SB_TOP} ${S.hn.bx-WING},${SB_TOP}`} />

      {/* Home name — dark navy + blue accent */}
      <polygon shapeRendering="crispEdges" fill="#0c1a38" points={secPts(S.hn, true)} />
      <polygon shapeRendering="crispEdges" fill={JERSEY_HOME} points={accentPts(S.hn, true)} />
      <PixelTextC text={homeTeamName.slice(0,7)} cx={cxName(S.hn)} y={textY} scale={1} fill="#fff" />

      {/* Home score — light blue-grey */}
      <polygon shapeRendering="crispEdges" fill="#c4cede" points={secPts(S.hs)} />
      <PixelTextC text={hStr} cx={cx(S.hs)} y={textY} scale={1} fill="#0c1a38" outline="#c4cede" />

      {/* Away name — dark maroon + red accent */}
      <polygon shapeRendering="crispEdges" fill="#2a0808" points={secPts(S.an)} />
      <polygon shapeRendering="crispEdges" fill={JERSEY_AWAY} points={accentPts(S.an)} />
      <PixelTextC text={awayTeamName.slice(0,7)} cx={cxName(S.an)} y={textY} scale={1} fill="#fff" />

      {/* Away score — light red-grey */}
      <polygon shapeRendering="crispEdges" fill="#decac4" points={secPts(S.as)} />
      <PixelTextC text={aStr} cx={cx(S.as)} y={textY} scale={1} fill="#2a0808" outline="#decac4" />

      {/* Clock — near black */}
      <polygon shapeRendering="crispEdges" fill="#111" points={secPts(S.cl, false, true)} />
      <text textAnchor="middle" x={cx(S.cl)} y={MID_Y - 1}
        fontSize={7} fontFamily="monospace" letterSpacing="0.5" fill="#e0e8f0">{timeStr}</text>
      <text textAnchor="middle" x={cx(S.cl)} y={MID_Y + 7}
        fontSize={6} fontFamily="monospace" fill="#707880">{qStr}</text>

      </g>{/* end scoreboard mobile transform */}

    </g>
  );
}

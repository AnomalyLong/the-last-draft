import React from 'react';
import { ZOOM_W, TOP_BAR, svgToGrid, JERSEY_HOME, JERSEY_AWAY, JERSEY_BASE } from '../constants.js';
import { pixelTextPixels, MONOGRAM_CELL_W, MONOGRAM_GLYPH_H } from '../sprites/monogram.js';
import { HEAD_PORTRAIT } from '../sprites/index.js';

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

// Panels nearly fill the full width with a 4px gap between them.
// A debug strip (y=2..13) sits above; panels start at PANEL_Y.
const PANEL_Y = 15;
// Tight panels — center gap (~104px) reserved for future HUD options
const LP_X = 2,   LP_W = 150;   // right edge x=152
const RP_X = 256, RP_W = 150;   // left edge x=256
const BAR_W = 68, BAR_H = 5, ROW_H = 13;
// 4 stat rows + 5px gap + ability badge (9px) + 4px bottom pad = 70
const PANEL_H = 4 * ROW_H + BAR_H + 5 + 9 + 4; // 71

const RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };

function PlayerPortrait({ player, rosterEntry, side, jerseyColor, hasBall = false }) {
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
      {/* Panel */}
      <rect x={panelX} y={PANEL_Y} width={panelW} height={PANEL_H} rx={2}
        fill={isLeft ? '#080e18' : '#100608'} shapeRendering="crispEdges" />
      <rect x={panelX} y={PANEL_Y} width={panelW} height={PANEL_H} rx={2}
        fill="none" stroke={isLeft ? '#182840' : '#281018'} strokeWidth={1} />

      {/* Ball-holder outline around portrait */}
      {hasBall && (
        <rect x={portX - 2} y={portY - 2} width={PORT_W + 4} height={PORT_H + 4} rx={2}
          fill="none" stroke="#ffe060" strokeWidth={2} shapeRendering="crispEdges" />
      )}

      {/* Head portrait */}
      <HeadPortrait x={portX} y={portY} jerseyColor={jerseyColor} flip={!isLeft} />

      {/* Role badge + name under portrait */}
      <rect x={portX} y={portY + PORT_H + 2} width={PORT_W} height={8} rx={1}
        fill={posColor} shapeRendering="crispEdges" />
      <PixelTextC text={player.role} cx={portX + PORT_W / 2} y={portY + PORT_H + 3}
        scale={1} fill="#fff" outline={null} />
      {name && (
        <PixelTextC text={name.slice(0, 5)} cx={portX + PORT_W / 2} y={portY + PORT_H + 13}
          scale={1} fill="#506878" outline={null} />
      )}

      {/* Level + XP bar */}
      <PixelTextC text={`Lv.${player.level}`} cx={portX + PORT_W / 2} y={portY + PORT_H + 23}
        scale={1} fill="#7090a8" outline={null} />
      <rect x={portX} y={portY + PORT_H + 31} width={PORT_W} height={3}
        fill="#182030" shapeRendering="crispEdges" />
      {player.xp > 0 && (
        <rect x={portX} y={portY + PORT_H + 31}
          width={Math.round(PORT_W * (player.xp / player.xpMax))} height={3}
          fill="#40c8e0" shapeRendering="crispEdges" />
      )}

      {/* Stat bars: LABEL [bar] VALUE */}
      {rosterEntry && STAT_DEFS.map(({ key, label, color }, i) => {
        const val    = rosterEntry[key] ?? 0;
        const filled = Math.round((val / 99) * BAR_W);
        const ry     = statY0 + i * ROW_H;
        const numX   = barX + BAR_W + 3;
        return (
          <g key={key}>
            <PixelText text={label} x={lblX} y={ry} scale={1} fill="#406080" outline={null} />
            <rect x={barX} y={ry} width={BAR_W} height={BAR_H} rx={1}
              fill="#182030" shapeRendering="crispEdges" />
            {filled > 0 && (
              <rect x={barX} y={ry} width={filled} height={BAR_H} rx={1}
                fill={color} opacity={0.9} shapeRendering="crispEdges" />
            )}
            <PixelText text={String(val)} x={numX} y={ry} scale={1} fill="#d0e0f0" outline={null} />
          </g>
        );
      })}

      {/* Ability badge — below stats, shown when player has one */}
      {rosterEntry?.ability && (() => {
        const ab = rosterEntry.ability;
        const rc = RARITY_COLORS[ab.rarity] ?? '#888';
        const ay = statY0 + 3 * ROW_H + BAR_H + 9;
        const nameW = ab.name.length * MONOGRAM_CELL_W + 6;
        return (
          <g>
            <rect x={lblX} y={ay - 1} width={nameW} height={9} rx={2}
              fill={rc} opacity={0.18} shapeRendering="crispEdges" />
            <rect x={lblX} y={ay - 1} width={nameW} height={9} rx={2}
              fill="none" stroke={rc} strokeWidth={1} opacity={0.6} shapeRendering="crispEdges" />
            <PixelText text={ab.name} x={lblX + 3} y={ay} scale={1} fill={rc} outline={null} />
          </g>
        );
      })()}
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

// ─── Component ────────────────────────────────────────────────────────────

export function HUD({ homeScore, awayScore, homeTeamName = 'HOME', quarter, time, logs, onCommand, players, possession, homeRoster = [], awayRoster = [], awayTeamName = 'AWAY' }) {
  const mins = Math.floor(time / 60), secs = time % 60;
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const qStr    = `Q${quarter}`;
  const hStr    = String(homeScore);
  const aStr    = String(awayScore);

  const [input, setInput] = React.useState('');
  const [showDebug, setShowDebug] = React.useState(false);
  const logRef = React.useRef(null);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === '`' && e.target.tagName !== 'INPUT') { e.preventDefault(); setShowDebug(d => !d); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter' && input.trim()) { onCommand(input.trim()); setInput(''); }
    if (e.key === 'Escape') setShowDebug(false);
  };

  const carrier     = players.find(p => p.hasBall) ?? players[0];
  const homeCurrent = carrier.team === 'home'
    ? carrier
    : players.find(p => p.team === 'home' && p.role === carrier.role) ?? players[0];
  const awayCurrent = carrier.team === 'away'
    ? carrier
    : players.find(p => p.team === 'away' && p.role === homeCurrent.role) ?? players[5];
  const POS_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];
  const homeEntry = homeRoster[POS_ORDER.indexOf(homeCurrent.role)] ?? null;
  const awayEntry = awayRoster[POS_ORDER.indexOf(awayCurrent.role)] ?? null;
  const homeHasBall = carrier.team === 'home';
  const g1 = svgToGrid(carrier.cx, carrier.cy);

  const textY  = MID_Y - Math.round(MONOGRAM_GLYPH_H / 2);
  const clockY = SB_TOP + 2;
  const qY     = clockY + MONOGRAM_GLYPH_H + 3;

  return (
    <g>
      {/* ── TOP BAR ───────────────────────────────────────── */}
      <rect x={0} y={0} width={ZOOM_W} height={TOP_BAR} fill="#111" />

      {/* Player portraits */}
      <PlayerPortrait player={homeCurrent} rosterEntry={homeEntry} side="left"  jerseyColor={JERSEY_HOME} hasBall={homeHasBall} />
      <PlayerPortrait player={awayCurrent} rosterEntry={awayEntry} side="right" jerseyColor={JERSEY_AWAY} hasBall={!homeHasBall} />

      {/* Debug coords — single line, top centre */}
      <text x={204} y={10} textAnchor="middle" fontSize={8} fontFamily="monospace"
        fill="#4af">{`x:${g1.x} y:${g1.y}`}</text>

      {/* DBG toggle — top left */}
      <rect x={2} y={2} width={22} height={11} fill={showDebug ? '#1a3a1a' : '#1a1a1a'} rx={1}
        style={{ cursor: 'pointer' }} onClick={() => setShowDebug(d => !d)} />
      <text x={13} y={10} textAnchor="middle" fontSize={7} fontFamily="monospace"
        fill={showDebug ? '#8f8' : '#555'} style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setShowDebug(d => !d)}>DBG</text>

      {/* Debug console overlay */}
      {showDebug && (
        <foreignObject x={4} y={18} width={200} height={130}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'rgba(8,8,8,0.92)', border:'1px solid #333', borderRadius:'3px', fontFamily:'monospace', fontSize:'9px', overflow:'hidden' }}>
            <div ref={logRef} data-testid="debug-log" style={{ flex:1, overflowY:'auto', padding:'3px 4px', display:'flex', flexDirection:'column', gap:'1px' }}>
              {logs.map((log, i) => (
                <div key={i} data-testid={`log-entry-${log.type}`} style={{ color: log.type==='cmd' ? '#4af' : log.type==='err' ? '#f55' : '#8f8', whiteSpace:'pre-wrap', lineHeight:'1.3' }}>
                  {log.type === 'cmd' ? `> ${log.text}` : log.text}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', borderTop:'1px solid #222', padding:'2px 4px', gap:'3px' }}>
              <span style={{ color:'#4af' }}>{'>'}</span>
              <input data-testid="debug-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#fff', fontFamily:'monospace', fontSize:'9px', padding:0 }}
                placeholder="command..." autoFocus />
            </div>
          </div>
        </foreignObject>
      )}

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
    </g>
  );
}

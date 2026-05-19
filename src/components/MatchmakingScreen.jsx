import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_HOME, JERSEY_AWAY, JERSEY_BASE } from '../constants.js';
import { PixelText, PixelTextC } from './PixelText.jsx';
import { RUN_FRAMES, HEAD_PORTRAIT } from '../sprites/index.js';

const POS_COLORS = { PG: '#2a7adf', SG: '#6a5ade', SF: '#28b050', PF: '#d07030', C: '#c03838' };
const POS_ORDER  = ['PG', 'SG', 'SF', 'PF', 'C'];
const CX = Math.floor(ZOOM_W / 2); // 204

const HOME_COLOR = '#18f0c0';
const AWAY_COLOR = '#f06030';
const HOME_DIM   = '#050e0c';
const AWAY_DIM   = '#0e0503';

// Diagonal split
const DIAG_TOP = 183;
const DIAG_BOT = 225;

// Running characters
const CHAR_SCALE = 6;
const CHAR_W     = 14 * CHAR_SCALE; // 84
const CHAR_L_X   = 72;   // right edge at 156, ~48px from center
const CHAR_R_X   = 252;  // left edge at 252, ~48px from center
const CHAR_Y     = 22;

// VS
const VS_SCALE = 4;
const VS_Y     = 62;

// Rank badges — float between characters and panels
const BADGE_R    = 20;
const BADGE_CY   = 148;
const BADGE_L_CX = 168;
const BADGE_R_CX = 240;

// Info panels — start just below badge bottom (148+20+6 = 174)
const INFO_Y  = 174;
const INFO_H  = 58;
const INFO_SK = 4;
const H_INF_X = 0;   const H_INF_W = 182;
const A_INF_X = 220; const A_INF_W = 178;

// Player portrait cards — start 4px below panel bottom (INFO_Y+INFO_H = 174+58 = 232)
const CARD_Y    = 236;
const CARD_H    = 57;
const CARD_W    = 28;
const CARD_SK   = 4;
const CARD_STEP = CARD_W + 4; // 32px
const CARDS_L_X = 8;
const CARDS_R_X = 232;
const PORT_S    = 4;
const PORT_W    = 5 * PORT_S; // 20
const PORT_H    = 6 * PORT_S; // 24

// ── LoL-style rank system ─────────────────────────────────────────────────────
const RANK_TIERS = [
  { min: 430, name: 'CHAL', abbr: 'CH', color: '#00d4ff', ring: '#ffd700', bg: '#001018' },
  { min: 410, name: 'MSTR', abbr: 'MS', color: '#bf60ff', ring: '#9040d0', bg: '#120820' },
  { min: 390, name: 'DIA',  abbr: 'DI', color: '#80c8ff', ring: '#4090e0', bg: '#080e1c' },
  { min: 370, name: 'PLAT', abbr: 'PL', color: '#18ddb0', ring: '#10a880', bg: '#041412' },
  { min: 345, name: 'GOLD', abbr: 'GD', color: '#ffd700', ring: '#c8a000', bg: '#141000' },
  { min: 315, name: 'SLVR', abbr: 'SL', color: '#c0ccd8', ring: '#8898b0', bg: '#0e1016' },
  { min: 280, name: 'BRNZ', abbr: 'BR', color: '#d08030', ring: '#a06020', bg: '#120c08' },
  { min: 0,   name: 'IRON', abbr: 'IR', color: '#909898', ring: '#506068', bg: '#0c0c10' },
];

function getRank(ovr) {
  return RANK_TIERS.find(r => ovr >= r.min) ?? RANK_TIERS[RANK_TIERS.length - 1];
}

function calcOvr(p) {
  return p.ovr ?? Math.round(((p.spd ?? 60) + (p.dex ?? 60) + (p.jmp ?? 60) + (p.acc ?? 60)) / 4);
}

function getGrade(ovr) {
  if (ovr >= 86) return { letter: 'S', color: '#ffd700' };
  if (ovr >= 80) return { letter: 'A', color: '#18ddb0' };
  if (ovr >= 74) return { letter: 'B', color: '#4090e0' };
  if (ovr >= 68) return { letter: 'C', color: '#c0ccd8' };
  if (ovr >= 62) return { letter: 'D', color: '#d08030' };
  return { letter: 'F', color: '#c03838' };
}

// ── Helper components ─────────────────────────────────────────────────────────

function SpriteFigure({ frame, x, y, scale, jerseyColor, flip = false, silhouette = false }) {
  const sw   = 14 * scale;
  const fill = (c) => silhouette ? '#101418' : (c === JERSEY_BASE ? jerseyColor : c);
  if (flip) {
    return (
      <g transform={`translate(${x + sw},${y}) scale(-1,1)`}>
        {frame.map(([px, py, c], i) => (
          <rect key={i} x={px * scale} y={py * scale} width={scale} height={scale}
            fill={fill(c)} shapeRendering="crispEdges" />
        ))}
      </g>
    );
  }
  return (
    <g>
      {frame.map(([px, py, c], i) => (
        <rect key={i} x={x + px * scale} y={y + py * scale} width={scale} height={scale}
          fill={fill(c)} shapeRendering="crispEdges" />
      ))}
    </g>
  );
}

// Pixel-art emblem shapes per rank tier (drawn at badge center)
function RankEmblem({ cx, cy, rank, r }) {
  const c  = rank.color;
  const rg = rank.ring;
  const s  = r - 10; // emblem scale factor

  switch (rank.name) {
    case 'CHAL': // starburst: 8 diamond points
      return (
        <g>
          {[0,45,90,135,180,225,270,315].map((deg, i) => {
            const rad = deg * Math.PI / 180;
            const ox = Math.round(Math.cos(rad) * s);
            const oy = Math.round(Math.sin(rad) * s);
            return <rect key={i} x={cx + ox - 1} y={cy + oy - 1} width={3} height={3}
              fill={c} shapeRendering="crispEdges" />;
          })}
          <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={rg} shapeRendering="crispEdges" />
        </g>
      );
    case 'MSTR': // flame: vertical pillar + two side points
      return (
        <g>
          <polygon points={`${cx},${cy - s} ${cx + 4},${cy} ${cx},${cy + 3} ${cx - 4},${cy}`}
            fill={c} shapeRendering="crispEdges" />
          <rect x={cx - 1} y={cy - s + 2} width={3} height={s - 2} fill={rg} shapeRendering="crispEdges" />
        </g>
      );
    case 'DIA': // diamond shape
      return (
        <g>
          <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
            fill={rg} shapeRendering="crispEdges" />
          <polygon points={`${cx},${cy - s + 3} ${cx + s - 3},${cy} ${cx},${cy + s - 3} ${cx - s + 3},${cy}`}
            fill={c} shapeRendering="crispEdges" />
        </g>
      );
    case 'PLAT': // gem crown: flat top + downward V
      return (
        <g>
          <rect x={cx - s} y={cy - 3} width={s * 2} height={4} fill={rg} shapeRendering="crispEdges" />
          <polygon points={`${cx - s},${cy + 1} ${cx},${cy + s} ${cx + s},${cy + 1}`}
            fill={c} shapeRendering="crispEdges" />
          <rect x={cx - 2} y={cy - 3} width={4} height={3} fill={rg} shapeRendering="crispEdges" />
        </g>
      );
    case 'GOLD': // crown: 3 points up
      return (
        <g>
          <polygon points={`${cx - s},${cy + 4} ${cx - s},${cy - 3} ${cx},${cy - s} ${cx + s},${cy - 3} ${cx + s},${cy + 4}`}
            fill={rg} shapeRendering="crispEdges" />
          <rect x={cx - s + 1} y={cy + 2} width={s * 2 - 2} height={3} fill={c} shapeRendering="crispEdges" />
        </g>
      );
    case 'SLVR': // wings: two outward triangles
      return (
        <g>
          <polygon points={`${cx - 1},${cy} ${cx - s},${cy - 4} ${cx - s},${cy + 4}`}
            fill={c} shapeRendering="crispEdges" />
          <polygon points={`${cx + 1},${cy} ${cx + s},${cy - 4} ${cx + s},${cy + 4}`}
            fill={c} shapeRendering="crispEdges" />
          <rect x={cx - 2} y={cy - 2} width={4} height={4} fill={rg} shapeRendering="crispEdges" />
        </g>
      );
    case 'BRNZ': // axe-head: wide top, narrow bottom
      return (
        <g>
          <polygon points={`${cx - s},${cy - 2} ${cx + s},${cy - 2} ${cx + 3},${cy + s} ${cx - 3},${cy + s}`}
            fill={c} shapeRendering="crispEdges" />
          <rect x={cx - s} y={cy - s} width={s * 2} height={s - 1} fill={rg} shapeRendering="crispEdges" />
        </g>
      );
    default: // IRON: simple shield
      return (
        <g>
          <polygon points={`${cx - s},${cy - s} ${cx + s},${cy - s} ${cx + s},${cy + 2} ${cx},${cy + s} ${cx - s},${cy + 2}`}
            fill={c} shapeRendering="crispEdges" />
          <polygon points={`${cx - s + 2},${cy - s + 2} ${cx + s - 2},${cy - s + 2} ${cx + s - 2},${cy + 1} ${cx},${cy + s - 3} ${cx - s + 2},${cy + 1}`}
            fill={rg} opacity="0.4" shapeRendering="crispEdges" />
        </g>
      );
  }
}

// Gundam-style layered parallelogram info panel — 4 rows with dividers
function InfoPanel({ x, w, teamName, isHome, revealed, teamOvr }) {
  const y     = INFO_Y;
  const h     = INFO_H;
  const sk    = INFO_SK;
  const color = isHome ? HOME_COLOR : AWAY_COLOR;
  const bg    = isHome ? HOME_DIM : AWAY_DIM;

  const outer = `${x+sk},${y} ${x+sk+w},${y} ${x+w},${y+h} ${x},${y+h}`;
  const inner = `${x+sk+2},${y+2} ${x+sk+w-2},${y+2} ${x+w-2},${y+h-2} ${x+2},${y+h-2}`;

  const panCX = x + Math.floor(w / 2) + Math.floor(sk / 2);
  // 3px padding from inner borders on all sides
  const lEdge = x + sk + 5;   // left text start (inner border at x+sk+2, +3px pad)
  const rEdge = x + w - 5;    // right text end  (inner border at x+w-2,  +3px pad)

  const displayName = revealed ? teamName : '??????????';
  const nameColor   = revealed ? color : (isHome ? '#0c2418' : '#241008');
  const pwrStr      = revealed ? String(teamOvr ?? 0) : '???';
  const recStr      = revealed ? '0W 0L' : '---';

  // INFO_H=58: row height=13px, 3px padding top/bottom, 3px gap after each divider
  // row top = border(2) + pad(3) = y+5 for row0; each subsequent row +13+3=+16 (divider+pad)
  const r0y = y + 4;   // text at y+4, bottom y+13
  const r1y = y + 18;  // divider at y+14, +3 gap = y+17 → text y+18
  const r2y = y + 32;  // divider at y+28
  const r3y = y + 46;  // divider at y+42, text bottom y+55, panel bottom y+58 → 3px ✓

  // Right-align helper: x so text ends at rEdge
  const rAlignX = (text, scale = 1) => rEdge - text.length * 6 * scale;

  // Divider interpolation helper
  const divPts = (dy) => {
    const t  = dy / h;
    const lx = x + Math.round(sk * (1 - t)) + 2;
    const rx = x + w + Math.round(sk * (1 - t)) - 2;
    return { lx, rx, ry: y + dy };
  };
  const d1 = divPts(14);
  const d2 = divPts(28);
  const d3 = divPts(42);

  return (
    <g>
      <polygon points={outer} fill={bg} shapeRendering="crispEdges" />
      <polygon points={outer} fill="none" stroke={color} strokeWidth={4} opacity="0.12" />
      <polygon points={outer} fill="none" stroke={color} strokeWidth={1.5} />
      <polygon points={inner} fill="none" stroke={color} strokeWidth={0.5} opacity="0.35" />

      {/* Row dividers */}
      <line x1={d1.lx} y1={d1.ry} x2={d1.rx} y2={d1.ry} stroke={color} strokeWidth={0.75} opacity="0.4" />
      <line x1={d2.lx} y1={d2.ry} x2={d2.rx} y2={d2.ry} stroke={color} strokeWidth={0.75} opacity="0.4" />
      <line x1={d3.lx} y1={d3.ry} x2={d3.rx} y2={d3.ry} stroke={color} strokeWidth={0.5}  opacity="0.25" />

      {/* Row 0: "YOUR TEAM" / "OPPONENT" label */}
      <PixelTextC text={isHome ? 'YOUR TEAM' : 'OPPONENT'}
        cx={panCX} y={r0y} scale={1}
        fill={revealed ? color : (isHome ? '#0c2418' : '#241008')} outline={null} />

      {/* Row 1: PWR label left, value right-aligned */}
      <PixelText text="PWR"
        x={lEdge} y={r1y} scale={1}
        fill={revealed ? color : (isHome ? '#0c2418' : '#241008')} outline={null} opacity="0.6" />
      <PixelText text={pwrStr}
        x={rAlignX(pwrStr)} y={r1y} scale={1}
        fill={revealed ? '#ffd700' : (isHome ? '#0c2418' : '#241008')} outline={null} />

      {/* Row 2: team name centered */}
      <PixelTextC text={displayName}
        cx={panCX} y={r2y} scale={1} fill={nameColor} outline={null} />

      {/* Row 3: RANK label left, record right-aligned */}
      <PixelText text="RANK"
        x={lEdge} y={r3y} scale={1}
        fill={revealed ? color : (isHome ? '#0c2418' : '#241008')} outline={null} opacity="0.5" />
      <PixelText text={recStr}
        x={rAlignX(recStr)} y={r3y} scale={1}
        fill={revealed ? '#8898b0' : (isHome ? '#0c2418' : '#241008')} outline={null} />
    </g>
  );
}

// LoL-style rank badge with "RANK" label + pixel-art emblem + tier name
function RankBadge({ cx, cy, r, ovr, revealed }) {
  const rank = getRank(ovr);
  const ir   = r - 5;

  if (!revealed) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="#1e1e1e" strokeWidth={1} opacity="0.3" />
        <circle cx={cx} cy={cy} r={r}     fill="#060606" stroke="#1e1e1e" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={ir}    fill="none"    stroke="#161616" strokeWidth={0.75} />
        <PixelTextC text="?" cx={cx} y={cy - 4} scale={2} fill="#1a1a1a" outline={null} />
      </g>
    );
  }

  return (
    <g>
      {/* Outer glow */}
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={rank.ring} strokeWidth={1.5} opacity="0.2" />
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke={rank.ring} strokeWidth={1} opacity="0.15" />
      {/* Main body */}
      <circle cx={cx} cy={cy} r={r}  fill={rank.bg}   stroke={rank.ring} strokeWidth={2} />
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={ir} fill="none" stroke={rank.color} strokeWidth={0.75} opacity="0.5" />

      {/* "RANK" label at top — 3px from inner ring */}
      <PixelTextC text="RANK" cx={cx} y={cy - ir + 3}
        scale={1} fill={rank.color} outline={null} opacity="0.8" />

      {/* Pixel-art emblem */}
      <RankEmblem cx={cx} cy={cy + 2} rank={rank} r={r} />

      {/* Tier name at bottom */}
      <PixelTextC text={rank.name} cx={cx} y={cy + r - 12}
        scale={1} fill={rank.color} outline={rank.bg} />
    </g>
  );
}

// Portrait card — taller with grade letter replacing rank initial
function PlayerCard({ pos, player, x, isHome, revealed }) {
  const h  = CARD_H;
  const w  = CARD_W;
  const sk = CARD_SK;

  const BAND_H = 12;
  // Interpolate card edge positions at BAND_H depth (not card bottom coords)
  const bandT   = BAND_H / h;
  const bandBLx = Math.round(x + sk * (1 - bandT));       // left edge at CARD_Y+BAND_H
  const bandBRx = Math.round(x + w + sk * (1 - bandT));   // right edge at CARD_Y+BAND_H
  const cardPts = `${x+sk},${CARD_Y} ${x+sk+w},${CARD_Y} ${x+w},${CARD_Y+h} ${x},${CARD_Y+h}`;
  const bandPts = `${x+sk},${CARD_Y} ${x+sk+w},${CARD_Y} ${bandBRx},${CARD_Y+BAND_H} ${bandBLx},${CARD_Y+BAND_H}`;

  const posColor = POS_COLORS[pos] ?? '#3a5878';
  const color    = isHome ? HOME_COLOR : AWAY_COLOR;
  const bg       = revealed ? (isHome ? '#03090f' : '#0f0303') : '#060606';

  // Visual center x of card at mid-height
  const midT  = 0.5;
  const textCx = Math.round(x + w / 2 + sk * (1 - midT)); // x+16

  const ovrVal  = revealed && player ? calcOvr(player) : null;
  const grade   = ovrVal != null ? getGrade(ovrVal) : null;
  const ovrStr  = ovrVal != null ? String(ovrVal) : '';

  // Portrait: sits just below band
  const portCx = Math.round(x + w / 2 + sk * (1 - (BAND_H + PORT_H / 2) / h));
  const portX  = portCx - Math.floor(PORT_W / 2);
  const portY  = CARD_Y + BAND_H + 1;

  // Stat bar: sits immediately below portrait
  const statH = 16;
  const statY = portY + PORT_H + 2;

  // t at statY (for interpolating card width at that height)
  const statT   = (h - statH) / h;
  const statRX  = Math.round(x + w + sk * (1 - statT)) - 2; // right inner edge at statY
  const statLX  = Math.round(x + sk * (1 - statT)) + 2;      // left inner edge at statY

  return (
    <g>
      <polygon points={cardPts} fill={bg} shapeRendering="crispEdges" />
      <polygon points={cardPts} fill="none" stroke={color} strokeWidth={3} opacity="0.12" />
      <polygon points={cardPts} fill="none" stroke={color} strokeWidth={1} />
      {/* Position band fills to card border exactly */}
      <polygon points={bandPts} fill={revealed ? posColor : '#0e0e0e'} shapeRendering="crispEdges" />

      {revealed ? (
        <>
          {/* Position label centered in band — 3px from top */}
          <PixelTextC text={pos} cx={textCx} y={CARD_Y + 3} scale={1} fill="#fff" outline={null} />

          {/* HEAD_PORTRAIT */}
          <g shapeRendering="crispEdges">
            {HEAD_PORTRAIT.map(([px, py, c], i) => (
              <rect key={i}
                x={portX + px * PORT_S} y={portY + py * PORT_S}
                width={PORT_S} height={PORT_S}
                fill={c === JERSEY_BASE ? posColor : c} />
            ))}
          </g>

          {/* Stat bar divider */}
          <line x1={statLX} y1={statY} x2={statRX} y2={statY}
            stroke={color} strokeWidth={0.5} opacity="0.4" />

          {/* Grade letter — 3px from left card edge */}
          <rect x={statLX + 3} y={statY + 2} width={12} height={12}
            fill="#080808" shapeRendering="crispEdges" />
          <PixelTextC text={grade.letter}
            cx={statLX + 9} y={statY + 3}
            scale={1} fill={grade.color} outline={null} />

          {/* OVR number — right-aligned inside card at bottom */}
          <PixelText text={ovrStr}
            x={statRX - ovrStr.length * 6} y={statY + 5}
            scale={1} fill="#ffe060" outline={null} />
        </>
      ) : (
        <PixelTextC text="?"
          cx={textCx} y={CARD_Y + Math.floor(h / 2) - 4}
          scale={1} fill="#161616" outline={null} />
      )}
    </g>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function MatchmakingScreen({ homeRoster, homeTeamName, awayTeam, onReady }) {
  const [phase,    setPhase]    = React.useState('searching');
  const [tick,     setTick]     = React.useState(0);
  const [loadTick, setLoadTick] = React.useState(0);
  const onReadyRef = React.useRef(onReady);
  onReadyRef.current = onReady;

  React.useEffect(() => {
    const ts = [
      setTimeout(() => setPhase('found'),   1600),
      setTimeout(() => setPhase('lineup'),  2600),
      setTimeout(() => setPhase('loading'), 5200),
      setTimeout(() => onReadyRef.current?.(), 6200),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  React.useEffect(() => {
    let id;
    const step = () => { setTick(t => t + 1); id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);

  React.useEffect(() => {
    if (phase !== 'loading') return;
    setLoadTick(0);
    let n = 0, id;
    const step = () => { setLoadTick(++n); id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  const isSearching  = phase === 'searching';
  const isFound      = phase === 'found';
  const showLineup   = phase === 'lineup' || phase === 'loading';
  const awayRevealed = !isSearching;
  const loadProg     = Math.min(loadTick / 60, 1);
  const runFrame     = RUN_FRAMES[Math.floor(tick / 8) % RUN_FRAMES.length];
  const dotIdx       = Math.floor(tick / 20) % 4;
  const flashAlpha   = isFound ? Math.max(0, Math.sin(tick / 8) * 0.2 + 0.15) : 0;

  const awayName = (awayTeam?.name ?? 'OPPONENT').slice(0, 10).toUpperCase();
  const homeName = (homeTeamName ?? 'HOME').slice(0, 10).toUpperCase();
  const homeOvr  = homeRoster?.reduce((s, p) => s + calcOvr(p), 0) ?? 0;
  const awayOvr  = awayTeam?.players?.reduce((s, p) => s + calcOvr(p), 0) ?? 0;

  return (
    <g data-testid="matchmaking-screen">

      {/* ── BACKGROUNDS ── */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#030608" shapeRendering="crispEdges" />
      <polygon shapeRendering="crispEdges"
        points={`0,0 ${DIAG_TOP},0 ${DIAG_BOT},${TOTAL_H} 0,${TOTAL_H}`}
        fill={HOME_DIM} />
      <polygon shapeRendering="crispEdges"
        points={`${DIAG_TOP},0 ${ZOOM_W},0 ${ZOOM_W},${TOTAL_H} ${DIAG_BOT},${TOTAL_H}`}
        fill={AWAY_DIM} />

      {/* Speed-line stripes */}
      {[32, 72, 112].map(sx => (
        <polygon key={sx} shapeRendering="crispEdges" opacity="0.22"
          points={`${sx},0 ${sx+8},0 ${sx+8+42},${TOTAL_H} ${sx+42},${TOTAL_H}`}
          fill={HOME_COLOR} />
      ))}
      {[224, 268, 316].map(sx => (
        <polygon key={sx} shapeRendering="crispEdges" opacity="0.18"
          points={`${sx},0 ${sx+8},0 ${sx+8+42},${TOTAL_H} ${sx+42},${TOTAL_H}`}
          fill={AWAY_COLOR} />
      ))}

      {/* Top accent rule */}
      <rect x={0}        y={0} width={DIAG_TOP}          height={2} fill={HOME_COLOR} shapeRendering="crispEdges" />
      <rect x={DIAG_TOP} y={0} width={ZOOM_W - DIAG_TOP} height={2} fill={AWAY_COLOR} shapeRendering="crispEdges" />

      {/* ── CHARACTERS ── */}
      <SpriteFigure frame={runFrame} x={CHAR_L_X} y={CHAR_Y}
        scale={CHAR_SCALE} jerseyColor={JERSEY_HOME} flip={true} />
      <SpriteFigure frame={runFrame} x={CHAR_R_X} y={CHAR_Y}
        scale={CHAR_SCALE} jerseyColor={JERSEY_AWAY} silhouette={isSearching} />

      {/* ── VS ── */}
      <PixelTextC text="VS" cx={CX} y={VS_Y} scale={VS_SCALE}
        fill="#ffffff" outline="#000" thick={true} />

      {/* ── FOUND FLASH ── */}
      {isFound && (
        <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H}
          fill="#cc2010" opacity={flashAlpha} shapeRendering="crispEdges" />
      )}

      {/* ── STATUS TEXT ── */}
      {isSearching && (
        <>
          <PixelTextC text="SEARCHING FOR OPPONENT" cx={CX} y={6}
            scale={1} fill="#0d2820" outline={null} />
          {[0, 1, 2].map(i => (
            <rect key={i} x={CX - 12 + i * 12} y={16} width={8} height={8}
              fill={dotIdx > i ? '#0f2416' : '#060e0a'}
              shapeRendering="crispEdges" />
          ))}
        </>
      )}
      {isFound && (
        <PixelTextC text="MATCH FOUND!" cx={CX} y={6}
          scale={1} fill="#ff9080" outline="#200" />
      )}
      {showLineup && (
        <PixelTextC text="MATCH FOUND" cx={CX} y={6}
          scale={1} fill="#0e2c1c" outline={null} />
      )}

      {/* ── RANK BADGES drawn first so panels render on top ── */}
      <RankBadge cx={BADGE_L_CX} cy={BADGE_CY} r={BADGE_R} ovr={homeOvr} revealed={true} />
      <RankBadge cx={BADGE_R_CX} cy={BADGE_CY} r={BADGE_R} ovr={awayOvr} revealed={awayRevealed} />

      {/* ── INFO PANELS (drawn over badge edges) ── */}
      <InfoPanel x={H_INF_X} w={H_INF_W} teamName={homeName} isHome={true}
        revealed={true}  teamOvr={homeOvr} />
      <InfoPanel x={A_INF_X} w={A_INF_W} teamName={awayName} isHome={false}
        revealed={awayRevealed} teamOvr={awayOvr} />

      {/* ── PLAYER PORTRAIT CARDS ── */}
      {POS_ORDER.map((pos, i) => {
        const hp    = homeRoster?.find(p => p.pos === pos)
          ?? { pos, name: '???', spd: 60, dex: 60, jmp: 60, acc: 60 };
        const rawAp = awayTeam?.players?.find(p => p.pos === pos)
          ?? awayTeam?.players?.[i]
          ?? { pos, ovr: 60 };
        return (
          <React.Fragment key={pos}>
            <PlayerCard pos={pos} player={hp}
              x={CARDS_L_X + i * CARD_STEP} isHome={true} revealed={true} />
            <PlayerCard pos={pos} player={{ ...rawAp, pos }}
              x={CARDS_R_X + i * CARD_STEP} isHome={false} revealed={showLineup} />
          </React.Fragment>
        );
      })}

      {/* ── LOADING OVERLAY ── */}
      {phase === 'loading' && (
        <g>
          <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H}
            fill="#000" opacity={0.65} shapeRendering="crispEdges" />
          <rect x={40} y={164} width={ZOOM_W - 80} height={14}
            fill="#020408" shapeRendering="crispEdges" />
          <rect x={40} y={164}
            width={Math.max(4, (ZOOM_W - 80) * loadProg)} height={14}
            fill="#20a0d8" shapeRendering="crispEdges" />
          <PixelTextC text="STARTING GAME..." cx={CX} y={187}
            scale={1} fill="#20a0d8" outline={null} />
        </g>
      )}
    </g>
  );
}

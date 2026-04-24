import React from 'react';
import { ZOOM_W, TOP_BAR, svgToGrid, JERSEY_HOME, JERSEY_AWAY } from '../constants.js';
import { pixelTextPixels, MONOGRAM_CELL_W, MONOGRAM_GLYPH_H } from '../sprites/monogram.js';

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

// ─── Scoreboard geometry ───────────────────────────────────────────────────

const SB_TOP  = 312;
const SB_BOT  = 333;
const SHELF_B = 338;
const SKEW    = 4;
const WING    = 5;

// Section layout: bottom-edge x, width  (centered on ZOOM_W/2=204, total width=146)
const S = {
  hn: { bx: 131, bw: 38 },   // home name
  hs: { bx: 169, bw: 19 },   // home score
  an: { bx: 188, bw: 38 },   // away name
  as: { bx: 226, bw: 19 },   // away score
  cl: { bx: 245, bw: 32 },   // clock
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

export function HUD({ homeScore, awayScore, quarter, time, logs, onCommand, players, possession }) {
  const mins = Math.floor(time / 60), secs = time % 60;
  const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const qStr    = `Q${quarter}`;
  const hStr    = String(homeScore);
  const aStr    = String(awayScore);

  const [input, setInput] = React.useState('');
  const logRef = React.useRef(null);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && input.trim()) { onCommand(input.trim()); setInput(''); }
  };

  const g1 = svgToGrid(players[0].cx, players[0].cy);

  const textY  = MID_Y - Math.round(MONOGRAM_GLYPH_H / 2);
  const clockY = SB_TOP + 2;
  const qY     = clockY + MONOGRAM_GLYPH_H + 3;

  return (
    <g>
      {/* ── TOP BAR ───────────────────────────────────────── */}
      <rect x={0} y={0} width={ZOOM_W} height={TOP_BAR} fill="#111" />

      <foreignObject x={4} y={4} width={185} height={88}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'#0a0a0a', border:'1px solid #333', borderRadius:'3px', fontFamily:'monospace', fontSize:'9px', overflow:'hidden' }}>
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
              placeholder="command..." />
          </div>
        </div>
      </foreignObject>

      <text x={404} y={22} fill="#aaa" fontSize={9} fontFamily="monospace" textAnchor="end">char_1</text>
      <text x={404} y={36} fill="#4af" fontSize={10} fontFamily="monospace" textAnchor="end">{`x: ${g1.x}`}</text>
      <text x={404} y={50} fill="#4af" fontSize={10} fontFamily="monospace" textAnchor="end">{`y: ${g1.y}`}</text>
      <text data-testid="possession" x={404} y={64} fontSize={9} fontFamily="monospace" textAnchor="end"
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
      <PixelTextC text="HOME" cx={cxName(S.hn)} y={textY} scale={1} fill="#fff" />

      {/* Home score — light blue-grey */}
      <polygon shapeRendering="crispEdges" fill="#c4cede" points={secPts(S.hs)} />
      <PixelTextC text={hStr} cx={cx(S.hs)} y={textY} scale={1} fill="#0c1a38" outline="#0c1a38" />

      {/* Away name — dark maroon + red accent */}
      <polygon shapeRendering="crispEdges" fill="#2a0808" points={secPts(S.an)} />
      <polygon shapeRendering="crispEdges" fill={JERSEY_AWAY} points={accentPts(S.an)} />
      <PixelTextC text="AWAY" cx={cxName(S.an)} y={textY} scale={1} fill="#fff" />

      {/* Away score — light red-grey */}
      <polygon shapeRendering="crispEdges" fill="#decac4" points={secPts(S.as)} />
      <PixelTextC text={aStr} cx={cx(S.as)} y={textY} scale={1} fill="#2a0808" outline="#2a0808" />

      {/* Clock — near black */}
      <polygon shapeRendering="crispEdges" fill="#111" points={secPts(S.cl, false, true)} />
      <PixelTextC text={timeStr} cx={cx(S.cl)} y={clockY} scale={1} fill="#fff" />
      <PixelTextC text={qStr}    cx={cx(S.cl)} y={qY}     scale={1} fill="#888" />
    </g>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

const PANEL_W = 370;
const PANEL_H = 272;
const PANEL_X_OFF = Math.round((ZOOM_W - PANEL_W) / 2); // 19
const PANEL_Y = Math.round((TOTAL_H - PANEL_H) / 2);    // 38

// Column centers relative to cameraX
const LABEL_CX_OFF  = PANEL_X_OFF + 68;   // label center
const HOME_CX_OFF   = PANEL_X_OFF + 168;  // home number center
const AWAY_CX_OFF   = PANEL_X_OFF + 268;  // away number center

const TEAM_Y      = PANEL_Y + 42;
const DIV1_Y      = PANEL_Y + 54;
const STAT_Y_BASE = PANEL_Y + 66;
const STAT_STEP   = 24;
const DIV2_Y      = STAT_Y_BASE + 4 * STAT_STEP + 4;
const SCORE_Y     = DIV2_Y + 16;
const BTN_Y       = PANEL_Y + PANEL_H - 34;

const STAT_ROWS = [
  { key: 'shots',  label: 'SHOTS' },
  { key: 'dunks',  label: 'DUNKS' },
  { key: 'blocks', label: 'BLOCKS' },
  { key: 'steals', label: 'STEALS' },
];

// Timing (ticks at ~16ms each)
const FADE_TICKS       = 12;
const HEADER_TICK      = 8;
const TEAMS_TICK       = 20;
const STAT_START_TICK  = 34;
const STAT_COUNT_TICKS = 28;
const STAT_GAP_TICKS   = 18;
const SCORE_START      = STAT_START_TICK + STAT_ROWS.length * (STAT_COUNT_TICKS + STAT_GAP_TICKS);
const SCORE_COUNT      = 55;
const BTN_TICK         = SCORE_START + SCORE_COUNT + 10;

function easeOut(t) { return 1 - (1 - t) * (1 - t); }

function countUp(target, startTick, tick, duration) {
  if (tick < startTick) return 0;
  const t = Math.min((tick - startTick) / duration, 1);
  return Math.floor(easeOut(t) * target);
}

const N_PARTICLES = 14;

export function QuarterSummary({ quarterSummary, homeTeamName, awayTeamName, cameraX, onDismiss }) {
  const [tick, setTick]       = React.useState(0);
  const [btnPulse, setBtnPulse] = React.useState(0);
  const [hover, setHover]     = React.useState(false);

  React.useEffect(() => {
    setTick(0);
    let rafId;
    const loop = () => { setTick(t => t + 1); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [quarterSummary]);

  React.useEffect(() => {
    const id = setInterval(() => setBtnPulse(t => t + 1), 35);
    return () => clearInterval(id);
  }, []);

  if (!quarterSummary) return null;

  const { quarter, home, away, homeScore, awayScore } = quarterSummary;

  const px = cameraX + PANEL_X_OFF;
  const cx = cameraX + ZOOM_W / 2;

  const fadeIn     = Math.min(tick / FADE_TICKS, 1);
  const hFlash     = Math.floor(tick / 10) % 2 === 0 ? '#ffe060' : '#ffffff';
  const borderPulse = (Math.sin(tick * 0.05) + 1) / 2;

  const qNames = ['', '1ST QUARTER', '2ND QUARTER', '3RD QUARTER', '4TH QUARTER'];
  const qLabel = qNames[quarter] ?? `Q${quarter}`;

  // Floating cyan particles
  const particles = Array.from({ length: N_PARTICLES }, (_, i) => {
    const cycle = ((tick * 0.009 + i / N_PARTICLES) % 1);
    const xBase = px + 18 + (i / (N_PARTICLES - 1)) * (PANEL_W - 36);
    const x = xBase + Math.sin(tick * 0.05 + i * 1.8) * 5;
    const y = PANEL_Y + PANEL_H - cycle * (PANEL_H + 20);
    const op = Math.min(1, cycle * 8) * (1 - cycle * 0.65) * fadeIn;
    const col = cycle > 0.6 ? '#fffff0' : '#20e8ff';
    return { x, y, op, col };
  });

  // Corner crosshairs
  const corners = [
    { x: px + 9,          y: PANEL_Y + 9 },
    { x: px + PANEL_W - 9, y: PANEL_Y + 9 },
    { x: px + 9,          y: PANEL_Y + PANEL_H - 9 },
    { x: px + PANEL_W - 9, y: PANEL_Y + PANEL_H - 9 },
  ];
  const cSz = 5 + (Math.sin(tick * 0.08) + 1) * 1.5;
  const cOp = (0.4 + (Math.sin(tick * 0.08) + 1) * 0.25) * fadeIn;

  // Burst sparks on entry
  const bursts = tick < 30
    ? Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist  = (tick / 30) * 32;
        return {
          x: cx + Math.cos(angle) * dist,
          y: PANEL_Y + PANEL_H / 2 + Math.sin(angle) * dist * 0.4,
          op: Math.max(0, 1 - tick / 26) * fadeIn,
        };
      })
    : [];

  const bpSin = (Math.sin(btnPulse * 0.09) + 1) / 2;
  const btnBorderW = 1 + bpSin * 2;
  const btnBorderOp = 0.45 + bpSin * 0.55;
  const btnFill = hover ? '#20e8ff' : '#0a1828';
  const btnTextFill = hover ? '#000814' : '#20e8ff';

  return (
    <g opacity={fadeIn} data-testid="quarter-summary">
      {/* Full dim backdrop */}
      <rect x={cameraX} y={0} width={ZOOM_W} height={TOTAL_H} fill="#000" opacity={0.82} />

      {/* Entry burst sparks */}
      {bursts.map((b, i) => (
        <rect key={i}
          x={Math.round(b.x - 2)} y={Math.round(b.y - 2)} width={4} height={4}
          fill="#20e8ff" opacity={b.op} shapeRendering="crispEdges" />
      ))}

      {/* Panel drop-shadow */}
      <rect x={px + 4} y={PANEL_Y + 4} width={PANEL_W} height={PANEL_H} rx={4}
        fill="#000" opacity={0.6} shapeRendering="crispEdges" />

      {/* Panel body */}
      <rect x={px} y={PANEL_Y} width={PANEL_W} height={PANEL_H} rx={4}
        fill="#060d18" shapeRendering="crispEdges" />

      {/* Header gradient bar */}
      <defs>
        <linearGradient id="qs-hdr-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#0a1a2e" />
          <stop offset="50%"  stopColor="#0d2240" />
          <stop offset="100%" stopColor="#0a1a2e" />
        </linearGradient>
      </defs>
      <rect x={px} y={PANEL_Y} width={PANEL_W} height={32} rx={4}
        fill="url(#qs-hdr-grad)" shapeRendering="crispEdges" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <rect key={i}
          x={Math.round(p.x - 1)} y={Math.round(p.y - 1)} width={2} height={2}
          fill={p.col} opacity={p.op} shapeRendering="crispEdges" />
      ))}

      {/* Outer pulsating border */}
      <rect x={px} y={PANEL_Y} width={PANEL_W} height={PANEL_H} rx={4}
        fill="none" stroke="#20e8ff"
        strokeWidth={1 + borderPulse * 1.5}
        opacity={0.35 + borderPulse * 0.45} />
      {/* Inner subtle border */}
      <rect x={px + 2} y={PANEL_Y + 2} width={PANEL_W - 4} height={PANEL_H - 4} rx={3}
        fill="none" stroke="#20e8ff" strokeWidth={0.5} opacity={0.15} />

      {/* Corner crosshairs */}
      {corners.map((c, i) => (
        <g key={i} opacity={cOp}>
          <rect x={Math.round(c.x - cSz)} y={Math.round(c.y) - 0} width={Math.round(cSz * 2)} height={1}
            fill="#20e8ff" shapeRendering="crispEdges" />
          <rect x={Math.round(c.x)} y={Math.round(c.y - cSz)} width={1} height={Math.round(cSz * 2)}
            fill="#20e8ff" shapeRendering="crispEdges" />
        </g>
      ))}

      {/* Header shimmer */}
      <defs>
        <clipPath id="qs-hdr-clip">
          <rect x={px + 1} y={PANEL_Y + 1} width={PANEL_W - 2} height={30} />
        </clipPath>
      </defs>
      <g clipPath="url(#qs-hdr-clip)">
        <g transform={`rotate(-12, ${px + (tick * 2.8 % (PANEL_W + 60)) - 20}, ${PANEL_Y + 16})`}>
          <rect x={px + (tick * 2.8 % (PANEL_W + 60)) - 20} y={PANEL_Y - 4}
            width={16} height={40} fill="white" opacity={0.14} />
        </g>
      </g>

      {/* Header text */}
      {tick >= HEADER_TICK && (
        <g>
          <PixelTextC text={`${qLabel} WRAP UP`}
            cx={cx} y={PANEL_Y + 11}
            scale={2} fill={hFlash} outline="#001020" thick />
        </g>
      )}

      {/* Team name labels */}
      {tick >= TEAMS_TICK && (
        <g>
          <PixelTextC text={(homeTeamName || 'HOME').toUpperCase().slice(0, 8)}
            cx={cameraX + HOME_CX_OFF} y={TEAM_Y}
            scale={1} fill="#20c8ff" outline={null} />
          <PixelTextC text="VS"
            cx={cx} y={TEAM_Y}
            scale={1} fill="#304858" outline={null} />
          <PixelTextC text={(awayTeamName || 'AWAY').toUpperCase().slice(0, 8)}
            cx={cameraX + AWAY_CX_OFF} y={TEAM_Y}
            scale={1} fill="#ff5050" outline={null} />
          <rect x={px + 18} y={DIV1_Y} width={PANEL_W - 36} height={1}
            fill="#152030" shapeRendering="crispEdges" />
        </g>
      )}

      {/* Stat rows */}
      {STAT_ROWS.map((row, i) => {
        const rowStart = STAT_START_TICK + i * (STAT_COUNT_TICKS + STAT_GAP_TICKS);
        if (tick < rowStart - 4) return null;
        const hVal = countUp(home[row.key] * 100, rowStart, tick, STAT_COUNT_TICKS);
        const aVal = countUp(away[row.key] * 100, rowStart, tick, STAT_COUNT_TICKS);
        const isCounting = tick >= rowStart && tick < rowStart + STAT_COUNT_TICKS;
        const numColor = isCounting ? '#ffe060' : '#e8f4ff';
        const rowAlpha = tick >= rowStart - 4 ? Math.min(1, (tick - (rowStart - 4)) / 6) : 0;
        const ry = STAT_Y_BASE + i * STAT_STEP;

        return (
          <g key={row.key} opacity={rowAlpha}>
            {/* Row label */}
            <PixelTextC text={`${row.label}:`}
              cx={cameraX + LABEL_CX_OFF} y={ry}
              scale={1} fill="#4a6880" outline={null} />
            {/* Home count */}
            <PixelTextC text={String(hVal).padStart(4, '0')}
              cx={cameraX + HOME_CX_OFF} y={ry}
              scale={2} fill={numColor} outline="#000a14" />
            {/* Away count */}
            <PixelTextC text={String(aVal).padStart(4, '0')}
              cx={cameraX + AWAY_CX_OFF} y={ry}
              scale={2} fill={numColor} outline="#000a14" />
          </g>
        );
      })}

      {/* Divider before score */}
      {tick >= SCORE_START - 6 && (
        <rect x={px + 18} y={DIV2_Y} width={PANEL_W - 36} height={1}
          fill="#ffe060" opacity={0.35} shapeRendering="crispEdges" />
      )}

      {/* Score row */}
      {tick >= SCORE_START && (() => {
        const hTotal = (home.shots + home.dunks + home.blocks + home.steals) * 100;
        const aTotal = (away.shots + away.dunks + away.blocks + away.steals) * 100;
        return (
          <g>
            <PixelTextC text="TOTAL:"
              cx={cameraX + LABEL_CX_OFF} y={SCORE_Y}
              scale={1} fill="#ffe060" outline={null} />
            <PixelTextC
              text={String(countUp(hTotal, SCORE_START, tick, SCORE_COUNT)).padStart(4, '0')}
              cx={cameraX + HOME_CX_OFF} y={SCORE_Y}
              scale={2} fill="#ffe060" outline="#201000" />
            <PixelTextC
              text={String(countUp(aTotal, SCORE_START, tick, SCORE_COUNT)).padStart(4, '0')}
              cx={cameraX + AWAY_CX_OFF} y={SCORE_Y}
              scale={2} fill="#ffe060" outline="#201000" />
          </g>
        );
      })()}

      {/* Divider below score */}
      {tick >= SCORE_START + SCORE_COUNT && (
        <rect x={px + 18} y={SCORE_Y + 14} width={PANEL_W - 36} height={1}
          fill="#ffe060" opacity={0.35} shapeRendering="crispEdges" />
      )}

      {/* Continue button */}
      {tick >= BTN_TICK && (
        <g
          onClick={onDismiss}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ cursor: 'pointer' }}
          data-testid="quarter-summary-continue"
        >
          <rect x={cx - 68} y={BTN_Y} width={136} height={22} rx={3}
            fill={btnFill} shapeRendering="crispEdges" />
          <rect x={cx - 68} y={BTN_Y} width={136} height={22} rx={3}
            fill="none" stroke="#20e8ff" strokeWidth={btnBorderW} opacity={btnBorderOp} />
          <PixelTextC text="CONTINUE" cx={cx} y={BTN_Y + 7}
            scale={1} fill={btnTextFill} outline={hover ? null : null} />
        </g>
      )}
    </g>
  );
}

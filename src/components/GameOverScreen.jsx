import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';
import { playCoin } from '../sound/basketball.js';
import { useRafTick } from './useRafTick.js';

const PANEL_W = 370;
const PANEL_H = 256;
const PANEL_X_OFF = Math.round((ZOOM_W - PANEL_W) / 2);
const PANEL_Y = Math.round((TOTAL_H - PANEL_H) / 2);

const FADE_TICKS      = 12;
const HEADER_TICK     = 8;
const SCORE_TICK      = 28;
const SCORE_COUNT     = 40;
const CREDITS_TICK    = SCORE_TICK + SCORE_COUNT + 10;
const CREDITS_COUNT   = 60;
const BTN_TICK        = CREDITS_TICK + CREDITS_COUNT + 14;
const N_PARTICLES     = 16;

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function countUp(target, startTick, tick, duration) {
  if (tick < startTick) return 0;
  return Math.floor(easeOut(Math.min((tick - startTick) / duration, 1)) * target);
}

export function GameOverScreen({ gameOver, homeTeamName, awayTeamName, cameraX, onDismiss }) {
  const tick = useRafTick(gameOver);
  const [btnPulse, setBtnPulse] = React.useState(0);
  const [hover, setHover] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setBtnPulse(t => t + 1), 35);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (tick % 8 !== 0) return;
    if (tick >= SCORE_TICK && tick < SCORE_TICK + SCORE_COUNT) { playCoin(); return; }
    if (tick >= CREDITS_TICK && tick < CREDITS_TICK + CREDITS_COUNT) playCoin();
  }, [tick]);

  if (!gameOver) return null;

  const { homeScore, awayScore, totalCredits } = gameOver;
  const credits = totalCredits ?? homeScore;

  const px = cameraX + PANEL_X_OFF;
  const cx = cameraX + ZOOM_W / 2;
  const fadeIn = Math.min(tick / FADE_TICKS, 1);
  const hFlash = Math.floor(tick / 10) % 2 === 0 ? '#ffe060' : '#ffffff';
  const borderPulse = (Math.sin(tick * 0.05) + 1) / 2;

  const homeWon = homeScore >= awayScore;

  const particles = Array.from({ length: N_PARTICLES }, (_, i) => {
    const cycle = ((tick * 0.008 + i / N_PARTICLES) % 1);
    const xBase = px + 18 + (i / (N_PARTICLES - 1)) * (PANEL_W - 36);
    const x = xBase + Math.sin(tick * 0.05 + i * 1.8) * 5;
    const y = PANEL_Y + PANEL_H - cycle * (PANEL_H + 20);
    const op = Math.min(1, cycle * 8) * (1 - cycle * 0.65) * fadeIn;
    const col = cycle > 0.6 ? '#fffff0' : '#ffe060';
    return { x, y, op, col };
  });

  const bursts = tick < 30
    ? Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist  = (tick / 30) * 36;
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
  const btnFill = hover ? '#ffe060' : '#0a1828';
  const btnTextFill = hover ? '#000814' : '#ffe060';

  const corners = [
    { x: px + 9,           y: PANEL_Y + 9 },
    { x: px + PANEL_W - 9, y: PANEL_Y + 9 },
    { x: px + 9,           y: PANEL_Y + PANEL_H - 9 },
    { x: px + PANEL_W - 9, y: PANEL_Y + PANEL_H - 9 },
  ];
  const cSz = 5 + (Math.sin(tick * 0.08) + 1) * 1.5;
  const cOp = (0.4 + (Math.sin(tick * 0.08) + 1) * 0.25) * fadeIn;

  const SCORE_ROW_Y = PANEL_Y + 68;
  const CREDITS_LABEL_Y = PANEL_Y + 116;
  const CREDITS_NUM_Y   = PANEL_Y + 142;
  const BTN_Y = PANEL_Y + PANEL_H - 34;

  return (
    <g opacity={fadeIn} data-testid="game-over-screen">
      <rect x={cameraX} y={0} width={ZOOM_W} height={TOTAL_H} fill="#000" opacity={0.88} />

      {bursts.map((b, i) => (
        <rect key={i}
          x={Math.round(b.x - 2)} y={Math.round(b.y - 2)} width={4} height={4}
          fill="#ffe060" opacity={b.op} shapeRendering="crispEdges" />
      ))}

      <rect x={px + 4} y={PANEL_Y + 4} width={PANEL_W} height={PANEL_H} rx={4}
        fill="#000" opacity={0.6} shapeRendering="crispEdges" />
      <rect x={px} y={PANEL_Y} width={PANEL_W} height={PANEL_H} rx={4}
        fill="#0a0d10" shapeRendering="crispEdges" />

      <defs>
        <linearGradient id="go-hdr-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1a0a00" />
          <stop offset="50%"  stopColor="#2a1400" />
          <stop offset="100%" stopColor="#1a0a00" />
        </linearGradient>
      </defs>
      <rect x={px} y={PANEL_Y} width={PANEL_W} height={32} rx={4}
        fill="url(#go-hdr-grad)" shapeRendering="crispEdges" />

      {particles.map((p, i) => (
        <rect key={i}
          x={Math.round(p.x - 1)} y={Math.round(p.y - 1)} width={2} height={2}
          fill={p.col} opacity={p.op} shapeRendering="crispEdges" />
      ))}

      <rect x={px} y={PANEL_Y} width={PANEL_W} height={PANEL_H} rx={4}
        fill="none" stroke="#ffe060"
        strokeWidth={1 + borderPulse * 1.5}
        opacity={0.35 + borderPulse * 0.45} />
      <rect x={px + 2} y={PANEL_Y + 2} width={PANEL_W - 4} height={PANEL_H - 4} rx={3}
        fill="none" stroke="#ffe060" strokeWidth={0.5} opacity={0.15} />

      {corners.map((c, i) => (
        <g key={i} opacity={cOp}>
          <rect x={Math.round(c.x - cSz)} y={Math.round(c.y)} width={Math.round(cSz * 2)} height={1}
            fill="#ffe060" shapeRendering="crispEdges" />
          <rect x={Math.round(c.x)} y={Math.round(c.y - cSz)} width={1} height={Math.round(cSz * 2)}
            fill="#ffe060" shapeRendering="crispEdges" />
        </g>
      ))}

      <defs>
        <clipPath id="go-hdr-clip">
          <rect x={px + 1} y={PANEL_Y + 1} width={PANEL_W - 2} height={30} />
        </clipPath>
      </defs>
      <g clipPath="url(#go-hdr-clip)">
        <g transform={`rotate(-12, ${px + (tick * 2.8 % (PANEL_W + 60)) - 20}, ${PANEL_Y + 16})`}>
          <rect x={px + (tick * 2.8 % (PANEL_W + 60)) - 20} y={PANEL_Y - 4}
            width={16} height={40} fill="white" opacity={0.14} />
        </g>
      </g>

      {tick >= HEADER_TICK && (
        <PixelTextC text="FINAL BUZZER!"
          cx={cx} y={PANEL_Y + 11}
          scale={2} fill={hFlash} outline="#200a00" thick />
      )}

      {tick >= SCORE_TICK && (
        <g>
          <PixelTextC
            text={(homeTeamName || 'HOME').toUpperCase().slice(0, 8)}
            cx={cameraX + PANEL_X_OFF + 100} y={SCORE_ROW_Y - 14}
            scale={1} fill="#20c8ff" outline={null} />
          <PixelTextC text="VS"
            cx={cx} y={SCORE_ROW_Y - 14}
            scale={1} fill="#304858" outline={null} />
          <PixelTextC
            text={(awayTeamName || 'AWAY').toUpperCase().slice(0, 8)}
            cx={cameraX + PANEL_X_OFF + 270} y={SCORE_ROW_Y - 14}
            scale={1} fill="#ff5050" outline={null} />

          <PixelTextC
            text={String(countUp(homeScore, SCORE_TICK, tick, SCORE_COUNT)).padStart(3, '0')}
            cx={cameraX + PANEL_X_OFF + 100} y={SCORE_ROW_Y}
            scale={3} fill={homeWon ? '#ffe060' : '#e8f4ff'} outline="#100800" />
          <PixelTextC text="-"
            cx={cx} y={SCORE_ROW_Y}
            scale={3} fill="#304858" outline={null} />
          <PixelTextC
            text={String(countUp(awayScore, SCORE_TICK, tick, SCORE_COUNT)).padStart(3, '0')}
            cx={cameraX + PANEL_X_OFF + 270} y={SCORE_ROW_Y}
            scale={3} fill={!homeWon ? '#ffe060' : '#e8f4ff'} outline="#100800" />

          <rect x={px + 18} y={SCORE_ROW_Y + 30} width={PANEL_W - 36} height={1}
            fill="#ffe060" opacity={0.25} shapeRendering="crispEdges" />
        </g>
      )}

      {tick >= CREDITS_TICK - 6 && (
        <PixelTextC text="YOU EARNED"
          cx={cx} y={CREDITS_LABEL_Y}
          scale={1} fill="#aac8e0" outline={null} />
      )}

      {tick >= CREDITS_TICK && (
        <g>
          <PixelTextC
            text={String(countUp(credits, CREDITS_TICK, tick, CREDITS_COUNT))}
            cx={cx} y={CREDITS_NUM_Y}
            scale={4} fill="#ffe060" outline="#201000" thick />
          <PixelTextC text="CREDITS"
            cx={cx} y={CREDITS_NUM_Y + 40}
            scale={2} fill="#ffe060" outline="#201000" />
        </g>
      )}

      {tick >= BTN_TICK && (
        <g
          onClick={onDismiss}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ cursor: 'pointer' }}
          data-testid="game-over-claim-btn"
        >
          <rect x={cx - 72} y={BTN_Y} width={144} height={22} rx={3}
            fill={btnFill} shapeRendering="crispEdges" />
          <rect x={cx - 72} y={BTN_Y} width={144} height={22} rx={3}
            fill="none" stroke="#ffe060" strokeWidth={btnBorderW} opacity={btnBorderOp} />
          <PixelTextC text="CLAIM CREDITS" cx={cx} y={BTN_Y + 7}
            scale={1} fill={btnTextFill} outline={null} />
        </g>
      )}
    </g>
  );
}

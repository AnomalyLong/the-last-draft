import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

// Celebratory two-line popup shown when the user reads the computer's play and
// picks the countering defense. Pops in, holds with a gentle pulse, fades out.
const DROP_MS  = 200;
const HOLD_MS  = 1050;
const EXIT_MS  = 350;
const TOTAL_MS = DROP_MS + HOLD_MS + EXIT_MS;

const GREEN = '#00ff88';
const GOLD  = '#ffe060';

export function DefenseBonusPopup({ credits = 50, cameraX = 0 }) {
  const [elapsed, setElapsed] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    const start = performance.now();
    const tick = (t) => {
      const e = t - start;
      setElapsed(e);
      if (e < TOTAL_MS) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  let scale = 1;
  let opacity = 1;
  let yOff = 0;

  if (elapsed < DROP_MS) {
    const t = elapsed / DROP_MS;
    const eased = 1 - (1 - t) * (1 - t);
    scale = 0.4 + 0.6 * eased;
    yOff = -40 * (1 - eased);
  } else if (elapsed < DROP_MS + HOLD_MS) {
    const held = elapsed - DROP_MS;
    scale = 1 + Math.sin(held * 0.02) * 0.04;
  } else {
    const t = (elapsed - DROP_MS - HOLD_MS) / EXIT_MS;
    opacity = Math.max(0, 1 - t);
    scale = 1 + t * 0.3;
    yOff = -t * 26;
  }

  const cx = cameraX + ZOOM_W / 2;
  const baseY = Math.round(TOTAL_H / 3);

  return (
    <g opacity={opacity} style={{ pointerEvents: 'none' }}
      transform={`translate(${cx} ${baseY + yOff}) scale(${scale}) translate(${-cx} ${-baseY})`}>
      <PixelTextC text="DEFENSE BONUS!" cx={cx} y={baseY} scale={2} fill={GREEN} outline="#001a08" thick />
      <PixelTextC text={`+${credits} CREDITS`} cx={cx} y={baseY + 22} scale={2} fill={GOLD} outline="#201000" thick />
    </g>
  );
}

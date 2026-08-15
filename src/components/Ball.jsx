import React from 'react';
import { BALL_FRAMES } from '../sprites/index.js';
import { SpriteOutline } from './SpriteOutline.jsx';

export const Ball = React.memo(function Ball({ cx, cy, scale = 1, lift = 0, syncToRun = false, phaseOffset = 0, outline = true, outlineColor = '#000000' }) {
  const [frame, setFrame] = React.useState('up');
  const [yOff, setYOff] = React.useState(0);
  const rafRef = React.useRef(null);
  React.useEffect(() => {
    // When syncToRun is on, lock the bounce to the Player's 6-frame × 80ms run
    // cycle (also driven by absolute time). The per-frame yOff lookup makes the
    // ball "stick" near the peak across frames 3–5 — feels like the hand is
    // holding it up against the bounce — and drop quickly back to the floor.
    // Otherwise keep the original mount-relative 500ms sinusoidal bounce.
    const PERIOD = syncToRun ? 480 : 500;
    const LOW = 10 * scale;
    const HIGH = -lift * scale;
    // Indexed by Player's run frameIdx (0–5). Stays near HIGH across idx 2–4 so
    // frames 3–5 (1-indexed) hover at/near the peak.
    const RUN_DRIBBLE_YPX = [10, 4, -2, -3, -2, 4];
    const start = performance.now();
    const tick = (now) => {
      if (syncToRun) {
        const ref = ((now + phaseOffset) % PERIOD + PERIOD) % PERIOD;
        const frameIdx = Math.floor(ref / 80) % RUN_DRIBBLE_YPX.length;
        const yPx = RUN_DRIBBLE_YPX[frameIdx];
        setYOff(yPx * scale);
        setFrame(yPx <= -1 ? 'up' : yPx <= 6 ? 'mid' : 'flat');
      } else {
        const t = (((now - start) % PERIOD) + PERIOD) % PERIOD / PERIOD;
        const bounce = Math.sin(t * Math.PI);
        // Quantize to whole pixels so React can bail out of re-renders between
        // visible position changes (a raw float changes every frame).
        setYOff(Math.round(HIGH + bounce * (LOW - HIGH)));
        setFrame(bounce < 0.25 ? 'up' : bounce < 0.65 ? 'mid' : 'flat');
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [lift, scale, syncToRun, phaseOffset]);
  const pixels = BALL_FRAMES[frame] || BALL_FRAMES.up;
  const S = 7 * scale;
  return (
    <g transform={`translate(${cx - S / 2}, ${cy - S / 2 + yOff})`} shapeRendering="crispEdges">
      {outline && <SpriteOutline pixels={pixels} scale={scale} color={outlineColor} />}
      {pixels.map(([x, y, fill], i) => (
        <rect key={i} x={x * scale} y={y * scale} width={scale} height={scale} fill={fill} />
      ))}
    </g>
  );
});

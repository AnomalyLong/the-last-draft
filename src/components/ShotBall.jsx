import React from 'react';
import { SHOT_FRAMES } from '../sprites/index.js';

export function ShotBall({ shot, scale = 1 }) {
  const [frameIdx, setFrameIdx] = React.useState(0);
  const rafRef = React.useRef(null);
  React.useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      setFrameIdx(Math.floor((now - start) / 80) % SHOT_FRAMES.length);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  const pixels = SHOT_FRAMES[frameIdx] || SHOT_FRAMES[0];
  const S = 7 * scale;
  return (
    <g transform={`translate(${shot.cx - S / 2}, ${shot.cy - S / 2})`} shapeRendering="crispEdges">
      {pixels.map(([x, y, fill], i) => (
        <rect key={i} x={x * scale} y={y * scale} width={scale} height={scale} fill={fill} />
      ))}
    </g>
  );
}

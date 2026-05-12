import React from 'react';
import { SHOT_FRAMES } from '../sprites/index.js';

export function SpecialPassBall({ shot, scale = 1 }) {
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
  const glowId = React.useId();
  return (
    <g transform={`translate(${shot.cx - S / 2}, ${shot.cy - S / 2})`} shapeRendering="crispEdges">
      <defs>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0.6  0 0 0 0 0  0 0 0 1 0" result="green" />
          <feGaussianBlur in="green" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${glowId})`}>
        {pixels.map(([x, y, fill], i) => (
          <rect key={i} x={x * scale} y={y * scale} width={scale} height={scale} fill={fill} />
        ))}
      </g>
    </g>
  );
}

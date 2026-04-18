import React from 'react';
import { BALL_FRAMES } from '../sprites/index.js';

export function Ball({ cx, cy, scale = 1 }) {
  const [frame, setFrame] = React.useState('up');
  const [yOff, setYOff] = React.useState(0);
  const rafRef = React.useRef(null);
  React.useEffect(() => {
    const PERIOD = 500;
    const start = performance.now();
    const tick = (now) => {
      const t = ((now - start) % PERIOD) / PERIOD;
      const bounce = Math.sin(t * Math.PI);
      setYOff(bounce * 10);
      setFrame(bounce < 0.25 ? 'up' : bounce < 0.65 ? 'mid' : 'flat');
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  const pixels = BALL_FRAMES[frame] || BALL_FRAMES.up;
  const S = 7 * scale;
  return (
    <g transform={`translate(${cx - S / 2}, ${cy - S / 2 + yOff})`} shapeRendering="crispEdges">
      {pixels.map(([x, y, fill], i) => (
        <rect key={i} x={x * scale} y={y * scale} width={scale} height={scale} fill={fill} />
      ))}
    </g>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

const BLOCKS   = 20;
const BAR_W    = BLOCKS * 8;  // 160px
const BAR_H    = 5;
const DURATION = 1800;        // ms before transitioning to title

export function LoadingScreen({ onDone }) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const start = performance.now();
    let id;
    const tick = (now) => {
      const t = Math.min((now - start) / DURATION, 1);
      setProgress(t);
      if (t < 1) id = requestAnimationFrame(tick);
      else onDone?.();
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const cx   = ZOOM_W / 2;
  const barY = Math.round(TOTAL_H / 2) + 46;
  const barX = cx - BAR_W / 2;

  return (
    <g>
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#0d1220" />

      <PixelTextC text="THE MBA" cx={cx} y={Math.round(TOTAL_H / 2) - 32}
        scale={6} fill="#e8c060" outline="#2a1800" thick />

      <PixelTextC text="MULTIVERSAL BASKETBALL LEAGUE" cx={cx} y={Math.round(TOTAL_H / 2) + 24}
        scale={1} fill="#1eb8d8" outline={null} />

      {/* Loading bar track */}
      <rect x={barX - 1} y={barY - 1} width={BAR_W + 2} height={BAR_H + 2}
        fill="#0e1828" shapeRendering="crispEdges" />

      {/* Pixel blocks */}
      {Array.from({ length: BLOCKS }, (_, i) => (
        <rect key={i}
          x={barX + i * 8 + 1} y={barY + 1}
          width={6} height={BAR_H - 2}
          fill={(i / BLOCKS) < progress ? '#1eb8d8' : '#131e30'}
          shapeRendering="crispEdges"
        />
      ))}
    </g>
  );
}

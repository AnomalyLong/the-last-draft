import React from 'react';
import { JERSEY_HOME, JERSEY_BASE, JERSEY_DARK_BASE } from '../constants.js';
import { SPRITE_PIXELS, IDLE_FRAMES, RUN_FRAMES, SHOOT_CHAR_FRAMES } from '../sprites/index.js';

export function Player({ cx, cy, scale = 4, jerseyColor = JERSEY_HOME, hasBall = false, isMoving = false, isShooting = false, facingRight = false }) {
  const [frameIdx, setFrameIdx] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (hasBall && !isShooting) return;
    cancelAnimationFrame(rafRef.current);
    if (isShooting) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < SHOOT_CHAR_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    const FRAME_MS = isMoving ? 80 : 120;
    const frames = isMoving ? RUN_FRAMES : IDLE_FRAMES;
    const start = performance.now();
    const tick = (now) => {
      setFrameIdx(Math.floor((now - start) / FRAME_MS) % frames.length);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); setFrameIdx(0); };
  }, [hasBall, isMoving, isShooting]);

  const jerseyDark = jerseyColor + '99';

  const applyColors = (pixels) => pixels.map(([x, y, fill], i) => {
    const c = fill === JERSEY_BASE ? jerseyColor : fill === JERSEY_DARK_BASE ? jerseyDark : fill;
    return <rect key={i} x={x * scale} y={y * scale} width={scale} height={scale} fill={c} />;
  });

  if (isShooting) {
    const pixels = SHOOT_CHAR_FRAMES[frameIdx] || SHOOT_CHAR_FRAMES[0];
    return (
      <g transform={`translate(${cx - 24.9 * scale}, ${cy - 27.5 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (hasBall) {
    const SW = 13 * scale, SH = 17 * scale;
    return (
      <g transform={`translate(${cx - SW / 2}, ${cy - SH / 2})`} shapeRendering="crispEdges">
        {applyColors(SPRITE_PIXELS)}
      </g>
    );
  }

  const frames = isMoving ? RUN_FRAMES : IDLE_FRAMES;
  const pixels = frames[frameIdx] || frames[0];
  const SW = (isMoving ? 14 : 11) * scale;
  const SH = (isMoving ? 18 : 16) * scale;
  return (
    <g transform={`translate(${cx - SW / 2}, ${cy - SH / 2})`} shapeRendering="crispEdges">
      {applyColors(pixels)}
    </g>
  );
}

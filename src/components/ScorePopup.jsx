import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { pixelTextPixels, MONOGRAM_CELL_W, MONOGRAM_GLYPH_H } from '../sprites/monogram.js';

const SCALE = 3;
const OUTLINE_DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

export function ScorePopup({ text, cameraX }) {
  const [opacity, setOpacity] = React.useState(1);
  const [yOff, setYOff] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    setOpacity(1);
    setYOff(0);
    const start = performance.now();
    const holdMs = 900;
    const fadeMs = 600;
    const total = holdMs + fadeMs;
    const tick = (now) => {
      const elapsed = now - start;
      setYOff(Math.min(elapsed / total, 1) * 14);
      if (elapsed < holdMs) {
        setOpacity(1);
      } else {
        setOpacity(Math.max(0, 1 - (elapsed - holdMs) / fadeMs));
      }
      if (elapsed < total) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [text]);

  const textW = text.length * MONOGRAM_CELL_W * SCALE;
  const startX = Math.round(cameraX + (ZOOM_W - textW) / 2);
  const startY = Math.round(TOTAL_H / 2 - (MONOGRAM_GLYPH_H * SCALE) / 2) - yOff;

  const pixels = pixelTextPixels(text, startX, startY, SCALE);

  return (
    <g opacity={opacity} shapeRendering="crispEdges">
      {OUTLINE_DIRS.map(([dx, dy], oi) =>
        pixels.map(([px, py], pi) => (
          <rect key={`o${oi}-${pi}`}
            x={px + dx * SCALE} y={py + dy * SCALE}
            width={SCALE} height={SCALE} fill="black" />
        ))
      )}
      {pixels.map(([px, py], pi) => (
        <rect key={`f${pi}`} x={px} y={py} width={SCALE} height={SCALE} fill="white" />
      ))}
    </g>
  );
}

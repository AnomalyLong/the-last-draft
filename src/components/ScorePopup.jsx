import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { pixelTextPixels, MONOGRAM_CELL_W, MONOGRAM_GLYPH_H } from '../sprites/monogram.js';

const SCALE = 3;
const OUTLINE_DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

export function ScorePopup({ text, cameraX, viewW = ZOOM_W }) {
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
      // Quantize drift to whole pixels so unchanged frames bail out of re-render
      setYOff(Math.round(Math.min(elapsed / total, 1) * 14));
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

  // Pixel rects built once per text at the origin — drift/fade animate via the
  // parent group's transform/opacity, not by rebuilding thousands of rects.
  const layers = React.useMemo(() => {
    const pixels = pixelTextPixels(text, 0, 0, SCALE);
    return {
      outline: OUTLINE_DIRS.map(([dx, dy], oi) =>
        pixels.map(([px, py], pi) => (
          <rect key={`o${oi}-${pi}`}
            x={px + dx * SCALE} y={py + dy * SCALE}
            width={SCALE} height={SCALE} fill="black" />
        ))
      ),
      fill: pixels.map(([px, py], pi) => (
        <rect key={`f${pi}`} x={px} y={py} width={SCALE} height={SCALE} fill="white" />
      )),
    };
  }, [text]);

  const textW  = text.length * MONOGRAM_CELL_W * SCALE;
  // Center on the visible viewport, not ZOOM_W (see HypePopup) — mobile's
  // viewBox is narrower, so ZOOM_W centering skewed this right of center.
  const startX = Math.round(cameraX + (viewW - textW) / 2);
  const startY = Math.round(TOTAL_H / 2 - (MONOGRAM_GLYPH_H * SCALE) / 2);

  return (
    <g data-testid="score-popup" data-text={text}
      opacity={opacity} shapeRendering="crispEdges"
      transform={`translate(${startX} ${startY - yOff})`}>
      {layers.outline}
      {layers.fill}
    </g>
  );
}

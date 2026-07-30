import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { pixelTextPixels, MONOGRAM_CELL_W, MONOGRAM_GLYPH_H } from '../sprites/monogram.js';

// Pixel scale is chosen per-phrase so long lines ("ICE IN HIS VEINS", 16 chars)
// still fit the narrower mobile viewport. MAX_SCALE keeps desktop identical to
// what it has always been; MIN_SCALE is a floor so text never turns to mush.
const MAX_SCALE = 4;
const MIN_SCALE = 2;
const H_MARGIN  = 12; // game-space breathing room on each side
const OUTLINE_DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

const DROP_MS    = 220;  // drop-in
const BOUNCE_MS  = 360;  // bounce settle
const HOLD_MS    = 700;
const EXIT_MS    = 320;
const TOTAL_MS   = DROP_MS + BOUNCE_MS + HOLD_MS + EXIT_MS;

// Bounce: 3 quick decaying overshoots after the drop
function bounceY(t) {
  // t in [0,1]: dampened cosine, settles to 0
  const decay = Math.exp(-3.2 * t);
  return -Math.cos(t * Math.PI * 3) * decay * 18;
}

export function HypePopup({ text, color = '#ff3344', cameraX = 0, viewW = ZOOM_W }) {
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
  }, [text]);

  // Shrink the scale until the phrase fits the *actual* visible width. On desktop
  // viewW === ZOOM_W and this always lands on MAX_SCALE, so nothing changes there.
  const pxScale = React.useMemo(() => {
    const avail = Math.max(1, viewW - H_MARGIN * 2);
    const fit   = Math.floor(avail / (text.length * MONOGRAM_CELL_W));
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, fit));
  }, [text, viewW]);

  // Pixel layers are built ONCE per text/color at the origin and never change —
  // all animation happens via transforms on the parent groups, so per-frame
  // React work is a handful of attribute strings instead of thousands of rects.
  const layers = React.useMemo(() => {
    const pixels = pixelTextPixels(text, 0, 0, pxScale);
    return {
      shadow: pixels.map(([px, py], pi) => (
        <rect key={`s${pi}`} x={px} y={py} width={pxScale} height={pxScale} fill={color} />
      )),
      outline: OUTLINE_DIRS.map(([dx, dy], oi) =>
        pixels.map(([px, py], pi) => (
          <rect key={`o${oi}-${pi}`}
            x={px + dx * pxScale} y={py + dy * pxScale}
            width={pxScale} height={pxScale} fill="black" />
        ))
      ),
      fill: pixels.map(([px, py], pi) => (
        <rect key={`f${pi}`} x={px} y={py} width={pxScale} height={pxScale} fill="white" />
      )),
    };
  }, [text, color, pxScale]);

  // Phase 1: drop from above; 2: bounce; 3: hold + wiggle; 4: exit fade
  let yOff = 0;
  let opacity = 1;
  let scale = 1;
  let rot = 0;

  if (elapsed < DROP_MS) {
    const t = elapsed / DROP_MS;
    const eased = 1 - (1 - t) * (1 - t); // ease-out
    yOff = -120 * (1 - eased);
    scale = 0.6 + 0.4 * eased;
  } else if (elapsed < DROP_MS + BOUNCE_MS) {
    const t = (elapsed - DROP_MS) / BOUNCE_MS;
    yOff = bounceY(t);
    scale = 1 + (1 - t) * 0.06;
  } else if (elapsed < DROP_MS + BOUNCE_MS + HOLD_MS) {
    yOff = 0;
    const held = (elapsed - DROP_MS - BOUNCE_MS);
    rot = Math.sin(held * 0.012) * 1.5;
    scale = 1 + Math.sin(held * 0.018) * 0.03;
  } else {
    const t = (elapsed - DROP_MS - BOUNCE_MS - HOLD_MS) / EXIT_MS;
    opacity = Math.max(0, 1 - t);
    scale = 1 + t * 0.3;
    yOff = -t * 24;
  }

  // Animated colored shadow offset — pulses in/out
  const shadowPulse = (Math.sin(elapsed * 0.018) + 1) / 2; // 0..1
  const shadowOffX  = 4 + shadowPulse * 3;
  const shadowOffY  = 4 + shadowPulse * 3;
  const shadowAlpha = 0.55 + shadowPulse * 0.35;

  const textW  = text.length * MONOGRAM_CELL_W * pxScale;
  const glyphH = MONOGRAM_GLYPH_H * pxScale;
  // Center on the visible viewport, not ZOOM_W — on mobile the viewBox is only
  // ZOOM_W/mobileZoom wide, so centering on ZOOM_W pushed the text ~41px right.
  const baseX  = Math.round(cameraX + (viewW - textW) / 2);
  const baseY  = Math.round(TOTAL_H / 3 - glyphH / 2);

  return (
    <g
      data-testid="hype-popup"
      data-text={text}
      opacity={opacity}
      shapeRendering="crispEdges"
      transform={`translate(${baseX} ${baseY + yOff}) translate(${textW / 2} ${glyphH / 2}) scale(${scale}) rotate(${rot}) translate(${-textW / 2} ${-glyphH / 2})`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Colored shadow (pulses in/out) — animated via transform only */}
      <g opacity={shadowAlpha} transform={`translate(${shadowOffX} ${shadowOffY})`}>
        {layers.shadow}
      </g>
      {/* Black outline for the white text */}
      {layers.outline}
      {/* White text fill */}
      {layers.fill}
    </g>
  );
}

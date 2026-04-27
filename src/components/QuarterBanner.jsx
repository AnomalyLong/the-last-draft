import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { PixelTextC } from './PixelText.jsx';

const BANNER_H = 36;

export function QuarterBanner({ text, cameraX }) {
  const [opacity, setOpacity] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (!text) { setOpacity(0); return; }
    setOpacity(0);
    const start = performance.now();
    const fadeInMs = 300;
    const tick = (now) => {
      const t = Math.min((now - start) / fadeInMs, 1);
      setOpacity(t);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [text]);

  if (!text) return null;

  const bannerY = Math.round(TOTAL_H / 2 - BANNER_H / 2);
  const cx = cameraX + ZOOM_W / 2;

  return (
    <g opacity={opacity}>
      <rect x={cameraX} y={bannerY} width={ZOOM_W} height={BANNER_H}
        fill="#000000" opacity={0.82} shapeRendering="crispEdges" />
      <rect x={cameraX} y={bannerY} width={ZOOM_W} height={1}
        fill="#e8c060" shapeRendering="crispEdges" />
      <rect x={cameraX} y={bannerY + BANNER_H - 1} width={ZOOM_W} height={1}
        fill="#e8c060" shapeRendering="crispEdges" />
      <PixelTextC text={text} cx={cx} y={bannerY + Math.floor((BANNER_H - 7 * 2) / 2)}
        scale={2} fill="#e8c060" outline="#2a1800" thick />
    </g>
  );
}

import React from 'react';

const BAR_W = 8;
const BAR_H = 36;
const SEGMENTS = 4;

export function PowerBar({ cx, cy, team = 'home' }) {
  const [fill, setFill] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    const duration = 480;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setFill(t);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const x = team === 'away' ? cx + 14 : cx - 22;
  const y = cy - BAR_H / 2 - 8;
  const fillH = Math.round(fill * BAR_H);

  return (
    <g shapeRendering="crispEdges" opacity={0.7}>
      {/* background */}
      <rect x={x} y={y} width={BAR_W} height={BAR_H} fill="#1a0000" />
      {/* red fill grows from bottom */}
      <rect x={x} y={y + BAR_H - fillH} width={BAR_W} height={fillH} fill="#cc1111" />
      {/* segment dividers */}
      {Array.from({ length: SEGMENTS - 1 }, (_, i) => {
        const segY = y + Math.round(BAR_H * ((i + 1) / SEGMENTS));
        return <rect key={i} x={x} y={segY} width={BAR_W} height={1} fill="#111" opacity={0.7} />;
      })}
    </g>
  );
}

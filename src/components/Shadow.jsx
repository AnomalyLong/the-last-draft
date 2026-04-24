import React from 'react';

// Pre-computed 2-px pixel positions tracing the indicator ellipse (rx=9, ry=3)
// Manually roughened — a few positions nudged or skipped for a paint-daub feel.
const RING_PIXELS = [
  [9,0],[8,1],[7,2],[5,2],[3,3],
  [0,3],[-3,3],[-5,2],[-7,2],
  [-9,1],[-9,0],[-9,-1],[-7,-2],[-5,-2],[-3,-3],
  [0,-3],[3,-3],[5,-2],[7,-2],[9,-1],
];

export function Shadow({ cx, cy, hasBall = false }) {
  const [angle, setAngle] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (!hasBall) return;
    const start = performance.now();
    const tick = (now) => {
      setAngle(((now - start) / 900) * Math.PI * 2);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); setAngle(0); };
  }, [hasBall]);

  const shadowY = cy + 12;
  const irx = 9, iry = 3;
  const dotX = cx + irx * Math.cos(angle);
  const dotY = shadowY + iry * Math.sin(angle);

  return (
    <g shapeRendering="crispEdges">
      <ellipse cx={cx} cy={shadowY} rx={4.5} ry={1.5} fill="#3a2a1a" opacity={0.25} />
      {hasBall && <>
        {RING_PIXELS.map(([dx, dy], i) => (
          <rect key={i} x={cx + dx - 1} y={shadowY + dy - 1} width={2} height={2} fill="#44ff88" opacity={0.85} />
        ))}
        <rect x={dotX - 1.5} y={dotY - 1.5} width={3} height={3} fill="#ccffdd" opacity={0.95} />
      </>}
    </g>
  );
}

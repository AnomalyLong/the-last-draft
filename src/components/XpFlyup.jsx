import React from 'react';

// 6 sparkle directions (normalized offsets around a circle)
const SPARK_DIRS = [
  [0, -1], [0.87, -0.5], [0.87, 0.5],
  [0, 1], [-0.87, 0.5], [-0.87, -0.5],
];

const easeOut = (x) => 1 - Math.pow(1 - x, 2);

export function XpFlyup({ fromCx, fromCy, toCx, toCy, amount }) {
  const [t, setT] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    const dur = 900;
    const start = performance.now();
    const tick = (now) => {
      const raw = Math.min((now - start) / dur, 1);
      setT(raw);
      if (raw < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const et = easeOut(t);
  // Main anchor: basket → scorer with a gentle upward arc
  const cx = fromCx + (toCx - fromCx) * et;
  const cy = fromCy + (toCy - fromCy) * et - 20 * Math.sin(t * Math.PI);
  const opacity = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);

  return (
    <g pointerEvents="none" opacity={opacity}>
      {SPARK_DIRS.map(([dx, dy], i) => {
        // Each spark lags slightly behind the main anchor
        const st = Math.max(0, Math.min(1, t * 1.2 - i * 0.04));
        const se = easeOut(st);
        const burst = Math.sin(st * Math.PI) * 13;
        const sx = fromCx + (toCx - fromCx) * se + dx * burst;
        const sy = fromCy + (toCy - fromCy) * se + dy * burst - 20 * Math.sin(st * Math.PI);
        const sz = 1.5 + Math.sin(st * Math.PI) * 2;
        return (
          <rect key={i}
            x={sx - sz / 2} y={sy - sz / 2}
            width={sz} height={sz}
            fill="#00ff44"
            transform={`rotate(45,${sx},${sy})`}
            shapeRendering="crispEdges"
          />
        );
      })}
      {/* "+N XP" label — black outline for legibility */}
      <text
        x={cx} y={cy - 7}
        textAnchor="middle"
        fontSize={8}
        fontFamily="monospace"
        fontWeight="bold"
        stroke="#000"
        strokeWidth={2.5}
        paintOrder="stroke"
        fill="#00ff44"
      >
        +{amount} XP
      </text>
    </g>
  );
}

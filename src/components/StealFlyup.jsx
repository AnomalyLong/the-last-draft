import React from 'react';

const easeOut = (x) => 1 - Math.pow(1 - x, 2);

export function StealFlyup({ fromCx, fromCy, toCx, toCy, color }) {
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
  const cx = fromCx + (toCx - fromCx) * et;
  const cy = fromCy + (toCy - fromCy) * et - 20 * Math.sin(t * Math.PI);
  const opacity = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);

  return (
    <g pointerEvents="none" opacity={opacity}>
      <text
        x={cx} y={cy - 7}
        textAnchor="middle"
        fontSize={9}
        fontFamily="monospace"
        fontWeight="bold"
        stroke="#000"
        strokeWidth={2.5}
        paintOrder="stroke"
        fill={color}
      >
        STEAL!
      </text>
    </g>
  );
}

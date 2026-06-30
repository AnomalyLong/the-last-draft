import React from 'react';

// Overlay animations were authored assuming ~16.67ms per tick (60fps).
// Counting raw requestAnimationFrame calls makes them run 2x+ too fast on
// 120Hz/144Hz displays, where RAF fires that many more times per second.
//
// This hook derives an INTEGER tick from elapsed wall-clock time instead, so
// it advances ~once every 16.67ms on any refresh rate. Every `tick * coeff`,
// `Math.floor(tick / N)` and `tick % N` formula keeps the exact same speed.
//
// Pass `resetKey` to restart the timer (tick back to 0) when it changes —
// e.g. a new QuarterSummary/GameOver payload that should replay from the top.
export const FRAME_MS = 1000 / 60;

export function useRafTick(resetKey) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    let rafId;
    const start = performance.now();
    setTick(0);
    const loop = (now) => {
      const t = Math.floor((now - start) / FRAME_MS);
      // Bail out of re-render when the integer tick hasn't advanced (saves
      // redundant renders on high-refresh displays).
      setTick(prev => (prev === t ? prev : t));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [resetKey]);

  return tick;
}

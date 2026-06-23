import React from 'react';
import { NET_PIXELS, SWISH_FRAMES, DUNK_NET_FRAMES, MISS_NET_FRAMES } from '../sprites/index.js';

// Static rim + net overlay that animates when a ball interacts with the rim.
// Bumping `swishId` plays the swish ripple, `dunkId` the dunk net-snap, and
// `missId` the rim wobble. Each plays once then settles back to the static net.
// x,y = top-left of the 37×39 sprite in court SVG space.
const FRAME_MS = 45;

export const Net = React.memo(function Net({ x = 0, y = 0, scale = 1, swishId = 0, dunkId = 0, missId = 0 }) {
  const [anim, setAnim] = React.useState(null); // { frames, idx } | null (null = resting net)
  const rafRef = React.useRef(null);

  const play = React.useCallback((frames) => {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now) => {
      const f = Math.floor((now - start) / FRAME_MS);
      if (f < frames.length) {
        setAnim({ frames, idx: f });
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAnim(null); // done — back to the resting net
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  React.useEffect(() => { if (swishId) play(SWISH_FRAMES); }, [swishId, play]);
  React.useEffect(() => { if (dunkId) play(DUNK_NET_FRAMES); }, [dunkId, play]);
  React.useEffect(() => { if (missId) play(MISS_NET_FRAMES); }, [missId, play]);
  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const pixels = anim ? (anim.frames[anim.idx] || NET_PIXELS) : NET_PIXELS;
  return (
    <g transform={`translate(${x}, ${y})`} shapeRendering="crispEdges">
      {pixels.map(([px, py, fill], i) => (
        <rect key={i} x={px * scale} y={py * scale} width={scale} height={scale} fill={fill} />
      ))}
    </g>
  );
});

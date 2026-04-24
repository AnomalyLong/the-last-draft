import React from 'react';
import { JERSEY_HOME, JERSEY_BASE, JERSEY_DARK_BASE, SHOOT_JUMP_OFFSETS, BLOCK_JUMP_OFFSETS } from '../constants.js';
import { SPRITE_PIXELS, IDLE_FRAMES, RUN_FRAMES, RUN_BALL_FRAMES, SHOOT_CHAR_FRAMES, DUNK_FRAMES, DUNK_BALL_OFFSETS, BALL_FRAMES, BLOCK_JUMP_FRAMES } from '../sprites/index.js';

export function Player({ cx, cy, scale = 4, jerseyColor = JERSEY_HOME, hasBall = false, isMoving = false, isShooting = false, isDunking = false, isBlocking = false, facingRight = false }) {
  const [frameIdx, setFrameIdx] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (hasBall && !isMoving && !isShooting && !isDunking && !isBlocking) return;
    cancelAnimationFrame(rafRef.current);
    if (isDunking) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < DUNK_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isShooting) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < SHOOT_CHAR_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isBlocking) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < BLOCK_JUMP_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    const frames = (hasBall && isMoving) ? RUN_BALL_FRAMES : isMoving ? RUN_FRAMES : IDLE_FRAMES;
    const FRAME_MS = isMoving ? 80 : 120;
    const start = performance.now();
    const tick = (now) => {
      setFrameIdx(Math.floor((now - start) / FRAME_MS) % frames.length);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); setFrameIdx(0); };
  }, [hasBall, isMoving, isShooting, isDunking, isBlocking]);

  const jerseyDark = jerseyColor + '99';

  const applyColors = (pixels) => pixels.map(([x, y, fill], i) => {
    const c = fill === JERSEY_BASE ? jerseyColor : fill === JERSEY_DARK_BASE ? jerseyDark : fill;
    return <rect key={i} x={x * scale} y={y * scale} width={scale} height={scale} fill={c} />;
  });

  if (isDunking) {
    const fi = Math.min(frameIdx, DUNK_FRAMES.length - 1);
    const pixels = DUNK_FRAMES[fi] || DUNK_FRAMES[0];
    const bOff = DUNK_BALL_OFFSETS[fi];
    return (
      <g transform={`translate(${cx - 7 * scale}, ${cy - 17 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
        {bOff && BALL_FRAMES.up.map(([x, y, fill], i) => (
          <rect key={`b${i}`}
            x={(bOff[0] + 0.5) * scale - 3.5 + x}
            y={(bOff[1] + 0.5) * scale - 3.5 + y}
            width={1} height={1} fill={fill} />
        ))}
      </g>
    );
  }

  if (isShooting) {
    const pixels = SHOOT_CHAR_FRAMES[frameIdx] || SHOOT_CHAR_FRAMES[0];
    const jumpY = SHOOT_JUMP_OFFSETS[frameIdx] ?? 0;
    return (
      <g transform={`translate(${cx - 24.9 * scale}, ${cy - 27.5 * scale - jumpY})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (isBlocking) {
    const pixels = BLOCK_JUMP_FRAMES[frameIdx] || BLOCK_JUMP_FRAMES[0];
    const jumpY = BLOCK_JUMP_OFFSETS[frameIdx] ?? 0;
    return (
      <g transform={`translate(${cx - 6 * scale}, ${cy - 17 * scale - jumpY})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (hasBall && isMoving) {
    const pixels = RUN_BALL_FRAMES[frameIdx] || RUN_BALL_FRAMES[0];
    return (
      <g transform={`translate(${cx - 7 * scale}, ${cy - 9 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (hasBall) {
    const SW = 13 * scale, SH = 17 * scale;
    return (
      <g transform={`translate(${cx - SW / 2}, ${cy - SH / 2})`} shapeRendering="crispEdges">
        {applyColors(SPRITE_PIXELS)}
      </g>
    );
  }

  const frames = isMoving ? RUN_FRAMES : IDLE_FRAMES;
  const pixels = frames[frameIdx] || frames[0];
  const SW = (isMoving ? 14 : 11) * scale;
  const SH = (isMoving ? 18 : 16) * scale;
  return (
    <g transform={`translate(${cx - SW / 2}, ${cy - SH / 2})`} shapeRendering="crispEdges">
      {applyColors(pixels)}
    </g>
  );
}

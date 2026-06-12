import React from 'react';
import { JERSEY_HOME, JERSEY_BASE, JERSEY_DARK_BASE, SHOOT_JUMP_OFFSETS, BLOCK_JUMP_OFFSETS, JUMP_BALL_JUMP_OFFSETS } from '../constants.js';
import { SPRITE_PIXELS, IDLE_FRAMES, RUN_FRAMES, RUN_BALL_FRAMES, SHOOT_CHAR_FRAMES, DUNK_FRAMES, DUNK_BALL_OFFSETS, DUNKSPIN_FRAMES, DUNKSPIN_BALL_OFFSETS, BALL_FRAMES, BLOCK_JUMP_FRAMES, IRON_BLOCK_FRAMES, JUMP_BALL_FRAMES, STEAL_FRAMES, PICKPOCKET_FRAMES, SPIN_MOVE_FRAMES, DASH_FRAMES, FADEAWAY_FRAMES, STAGGER_FRAMES } from '../sprites/index.js';

// multiply an "#rrggbb" colour by a 0..1 factor to derive shadow tones
function darken(hex, k) {
  const h = hex.replace('#','');
  const r = Math.round(parseInt(h.slice(0,2),16) * k);
  const g = Math.round(parseInt(h.slice(2,4),16) * k);
  const b = Math.round(parseInt(h.slice(4,6),16) * k);
  const p = (n) => n.toString(16).padStart(2,'0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

// Memoized: during movement frames only players whose props actually changed
// re-render — the other standing players are skipped entirely.
export const Player = React.memo(function Player({ cx, cy, scale = 4, jerseyColor = JERSEY_HOME, skinColor, hasBall = false, isMoving = false, isShooting = false, isDunking = false, isSpinDunking = false, isBlocking = false, isIronBlocking = false, isJumpBall = false, isStealing = false, isPickPocketing = false, isSpinning = false, isDashing = false, isFadingAway = false, isStaggering = false, facingRight = false }) {
  const [frameIdx, setFrameIdx] = React.useState(0);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (hasBall && !isMoving && !isShooting && !isDunking && !isSpinDunking && !isBlocking && !isIronBlocking && !isJumpBall && !isStealing && !isPickPocketing && !isSpinning && !isDashing && !isFadingAway && !isStaggering) return;
    cancelAnimationFrame(rafRef.current);
    if (isJumpBall) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < JUMP_BALL_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isDunking) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < DUNK_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isSpinDunking) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < DUNKSPIN_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
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
    if (isStaggering) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < STAGGER_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isSpinning) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < SPIN_MOVE_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isFadingAway) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < FADEAWAY_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isDashing) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 60);
        if (f < DASH_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isPickPocketing) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / (1200 / PICKPOCKET_FRAMES.length));
        if (f < PICKPOCKET_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isStealing) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 20);
        if (f < STEAL_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (isIronBlocking) {
      const start = performance.now();
      const tick = (now) => {
        const f = Math.floor((now - start) / 80);
        if (f < IRON_BLOCK_FRAMES.length) { setFrameIdx(f); rafRef.current = requestAnimationFrame(tick); }
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
      // For the running cycle use absolute time so the dribble Ball (which can opt
      // in via syncToRun) stays phase-locked. Idle still uses mount-relative time.
      const ref = isMoving ? now : (now - start);
      setFrameIdx(Math.floor(ref / FRAME_MS) % frames.length);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); setFrameIdx(0); };
  }, [hasBall, isMoving, isShooting, isDunking, isSpinDunking, isBlocking, isIronBlocking, isJumpBall, isStealing, isPickPocketing, isSpinning, isDashing, isFadingAway, isStaggering]);

  const jerseyDark = jerseyColor + '99';
  // Optional skin override — remap the two skin tones from the sprite atlas.
  // Default (skinColor unset) preserves the original sprite palette.
  const skinDark = skinColor ? darken(skinColor, 0.78) : null;

  const applyColors = (pixels) => pixels.map(([x, y, fill], i) => {
    let c = fill;
    if      (fill === JERSEY_BASE)      c = jerseyColor;
    else if (fill === JERSEY_DARK_BASE) c = jerseyDark;
    else if (skinColor && fill === '#D9A066') c = skinColor;
    else if (skinColor && fill === '#B17F4C') c = skinDark;
    return <rect key={i} x={x * scale} y={y * scale} width={scale} height={scale} fill={c} />;
  });

  if (isJumpBall) {
    const fi = Math.min(frameIdx, JUMP_BALL_FRAMES.length - 1);
    const pixels = JUMP_BALL_FRAMES[fi] || JUMP_BALL_FRAMES[0];
    const jumpY = JUMP_BALL_JUMP_OFFSETS[fi] ?? 0;
    return (
      <g transform={`translate(${cx - 7 * scale}, ${cy - 17 * scale - jumpY})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

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

  if (isSpinDunking) {
    const fi = Math.min(frameIdx, DUNKSPIN_FRAMES.length - 1);
    const pixels = DUNKSPIN_FRAMES[fi] || DUNKSPIN_FRAMES[0];
    const bOff = DUNKSPIN_BALL_OFFSETS[fi];
    return (
      <g transform={`translate(${cx - 7 * scale}, ${cy - 19 * scale})`} shapeRendering="crispEdges">
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

  if (isStaggering) {
    const fi = Math.min(frameIdx, STAGGER_FRAMES.length - 1);
    const pixels = STAGGER_FRAMES[fi] || STAGGER_FRAMES[0];
    return (
      <g transform={`translate(${cx - 7 * scale}, ${cy - 10 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (isSpinning) {
    const fi = Math.min(frameIdx, SPIN_MOVE_FRAMES.length - 1);
    const pixels = SPIN_MOVE_FRAMES[fi] || SPIN_MOVE_FRAMES[0];
    return (
      <g transform={`translate(${cx - 21 * scale}, ${cy - 28 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (isDashing) {
    const fi = Math.min(frameIdx, DASH_FRAMES.length - 1);
    const pixels = DASH_FRAMES[fi] || DASH_FRAMES[0];
    return (
      <g transform={`translate(${cx - 9 * scale}, ${cy - 17 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (isFadingAway) {
    const fi = Math.min(frameIdx, FADEAWAY_FRAMES.length - 1);
    const pixels = FADEAWAY_FRAMES[fi] || FADEAWAY_FRAMES[0];
    return (
      <g transform={`translate(${cx - 9 * scale}, ${cy - 19 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (isPickPocketing) {
    const fi = Math.min(frameIdx, PICKPOCKET_FRAMES.length - 1);
    const pixels = PICKPOCKET_FRAMES[fi] || PICKPOCKET_FRAMES[0];
    return (
      <g transform={`translate(${cx - 9 * scale}, ${cy - 17 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (isStealing) {
    const fi = Math.min(frameIdx, STEAL_FRAMES.length - 1);
    const pixels = STEAL_FRAMES[fi] || STEAL_FRAMES[0];
    return (
      <g transform={`translate(${cx - 9 * scale}, ${cy - 17 * scale})`} shapeRendering="crispEdges">
        {applyColors(pixels)}
      </g>
    );
  }

  if (isIronBlocking) {
    const fi = Math.min(frameIdx, IRON_BLOCK_FRAMES.length - 1);
    const pixels = IRON_BLOCK_FRAMES[fi] || IRON_BLOCK_FRAMES[0];
    const jumpY = BLOCK_JUMP_OFFSETS[fi] ?? 0;
    return (
      <g transform={`translate(${cx - 6 * scale}, ${cy - 17 * scale - jumpY})`} shapeRendering="crispEdges">
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
});

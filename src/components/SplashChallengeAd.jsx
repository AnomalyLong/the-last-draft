import React from 'react';

// ── SplashChallengeAd — "CHALLENGE OTHER REDDITORS!" mini-ad ─────────────────
//
// Framed avatar + two-line pitch that slides in from off-screen left after a
// beat. Extracted from SplashScreen.jsx (the 'classic' variant) so the 'court'
// variant in SplashCourt.jsx renders the SAME ad from one source instead of a
// second copy that can drift.
//
// COORDINATE SPACE: viewport (408x348), NOT camera space. Both splashes mount
// this outside any camera/field transform — in SplashCourt that means inside
// Frame's screen-space section, next to the title and CTA, not inside the
// translate(-cameraX) group. Drop it in the camera group and the ad slides off
// with the court.
//
// The component owns its own rAF tick rather than taking the parent's. In
// SplashScreen that used to be `hoverTick`, which starts at mount — identical
// to starting our own here, and it means SplashCourt doesn't have to invent a
// tick just to feed this one element.
//
// ── EDGE ANCHORING (edgeMargin) ──────────────────────────────────────────────
// A viewBox x cannot express "N px from the left of the screen", because the
// inline <svg> is xMidYMid meet and the viewBox does NOT coincide with the
// visible area:
//
//   wide container (e.g. 674x471) → HEIGHT-limited. Content is 552 wide inside
//     a 674 box, so ~61px of field shows on each side OUTSIDE the viewBox. The
//     splash bleeds its backdrop and court past the viewBox precisely so this
//     reads as more court rather than black bars — which means viewBox x=0 sits
//     61px inside the visible edge, and an ad at x=15 looks 82px in.
//   narrow container (e.g. 374x758) → WIDTH-limited. Content is exactly 408
//     wide, so viewBox x=0 IS the visible edge and anything at x<0 is clipped.
//
// So the same constant is a different on-screen margin on every surface, and no
// single constant can be small on the wide one without being cut off on the
// narrow one. When `edgeMargin` is set we therefore MEASURE the container each
// layout and translate the ad so its visible outer edge lands exactly that many
// CLIENT PIXELS inside the real left edge, whatever the container's aspect.
//
// Left null (the 'classic' splash passes nothing) this is entirely inert and
// the ad stays wherever frameX puts it — classic is not changing.
export function SplashChallengeAd({
  frameX = 3,
  frameY = 74,
  frameW = 92,
  frameH = 18,
  scale  = 1.25,
  // Client px from the container's visible left edge to the ad's visible outer
  // edge. null = legacy behaviour, position comes from frameX alone.
  edgeMargin = null,
  // Slide in from off-screen left after a delay. Start far enough out that even
  // Reddit desktop's wider letterbox can't reveal it before the slide begins —
  // the inline <svg> is xMidYMid meet with no clip, so a container wider than
  // 408 shows content past the viewBox edge. When anchored we can do better
  // than this guess: the true edge is measured, so the start is derived.
  slideDelay    = 3000,
  slideDuration = 800,
  slideStartX   = -250,          // ~2.7x the frame width past the viewBox edge
}) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const start = performance.now();
    const loop = (now) => {
      setTick(now - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // useId so two mounted instances can't collide on the clip id. React's ids
  // contain colons (":r0:"), which are legal in an SVG id but break url(#...)
  // resolution in some engines — strip them.
  const clipId = `splash-ad-avatar-clip-${React.useId().replace(/:/g, '')}`;

  const rx       = 3;
  const avatarCx = frameX + 9;
  const avatarCy = frameY + frameH / 2;
  const avatarR  = 7;
  const textX    = avatarCx + avatarR + 4;

  // Half the frame's stroke. The rect is stroked 1.5 CENTRED on its edge, so
  // the VISIBLE outer edge is 0.75 local units outside the rect on every side —
  // that outer edge is what the margin is measured to, not the rect.
  const halfStroke = 0.75;
  // Ad's visible outer box in PARENT (viewport) units, before any anchoring.
  const outerX = (frameX - halfStroke) * scale;
  const outerW = (frameW + halfStroke * 2) * scale;

  // ── Measured anchor ────────────────────────────────────────────────────────
  // { dx, startX } in parent units, or null while unmeasured / unanchored.
  const gRef = React.useRef(null);
  const [anchor, setAnchor] = React.useState(null);

  React.useLayoutEffect(() => {
    if (edgeMargin === null) { setAnchor(null); return; }
    const g = gRef.current;
    const svg = g && g.ownerSVGElement;
    const parent = g && g.parentNode;
    if (!svg || !parent) return;

    const measure = () => {
      // Parent space, not root space: this is the space our own transform is
      // applied in, so an ancestor transform can never silently offset us.
      // getScreenCTM is null in JSDOM and in a detached tree — leave the anchor
      // unset and the ad falls back to frameX, which is what the unit tests see.
      const ctm = typeof parent.getScreenCTM === 'function' ? parent.getScreenCTM() : null;
      if (!ctm || !ctm.a) return;
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;

      const pxPerUnit = ctm.a;                        // client px per parent unit
      // Where the container's visible left edge falls in parent units. The root
      // <svg> is overflow:hidden, so its border box IS the visible extent — on a
      // height-limited container this is NEGATIVE (content spills past viewBox 0).
      const leftUnits   = (rect.left - ctm.e) / pxPerUnit;
      const targetOuter = leftUnits + edgeMargin / pxPerUnit;

      setAnchor({
        dx: targetOuter - outerX,
        // Park fully off the REAL edge rather than guessing -250: the ad's own
        // width plus the margin plus slack, so the entrance is off-screen on a
        // 21:9 feed tile just as it is on a phone.
        startX: -(edgeMargin / pxPerUnit + outerW + 8),
      });
    };

    measure();
    // Aspect changes flip which axis is limiting, which moves the visible edge
    // relative to the viewBox — remeasure rather than trusting the mount value.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(svg);
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [edgeMargin, outerX, outerW]);

  const anchorDx = anchor ? anchor.dx : 0;
  const startX   = anchor ? anchor.startX : slideStartX;

  const slideT = Math.max(0, Math.min(1, (tick - slideDelay) / slideDuration));
  const eased  = 1 - Math.pow(1 - slideT, 3);                 // easeOutCubic
  const slideX = startX * (1 - eased);

  return (
    <g ref={gRef} data-testid="splash-challenge-ad"
      data-anchored={anchor ? '1' : '0'}
      transform={`translate(${slideX + anchorDx}, 0) scale(${scale})`}>
      {/* BballTip-style frame */}
      <rect x={frameX} y={frameY} width={frameW} height={frameH} rx={rx}
        fill="#0c1018" shapeRendering="crispEdges" />
      {/* data-testid so a test can measure the ad's VISIBLE extent. The group's
          own getBBox is 5px taller than the ad looks: the avatar <image> below
          is 23 tall and only CLIPPED to a r6 circle, and getBBox ignores
          clipPath. This rect is the true outer edge (plus half its stroke). */}
      <rect data-testid="splash-ad-frame"
        x={frameX} y={frameY} width={frameW} height={frameH} rx={rx}
        fill="none" stroke="#ffffff" strokeWidth={1.5} />

      <defs>
        <clipPath id={clipId}>
          <circle cx={avatarCx} cy={avatarCy} r={avatarR - 1} />
        </clipPath>
      </defs>
      <circle cx={avatarCx} cy={avatarCy} r={avatarR}
        fill="#0a1828" stroke="#ffe060" strokeWidth={1} />
      <image href="/jxts5wo9u41e1.png"
        x={avatarCx - 9} y={avatarCy - 9}
        width={18} height={23}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid meet"
        style={{ imageRendering: 'pixelated' }} />
      <text x={textX} y={avatarCy - 1} style={{ fontFamily: 'var(--f-mono)' }} fontSize={6} fontWeight="bold" fill="#fff">CHALLENGE</text>
      <text x={textX} y={avatarCy + 6} style={{ fontFamily: 'var(--f-mono)' }} fontSize={6} fontWeight="bold" fill="#ffe060">OTHER REDDITORS!</text>
    </g>
  );
}

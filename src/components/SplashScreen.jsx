import React from 'react';
import { ZOOM_W, TOTAL_H, JERSEY_HOME, JERSEY_AWAY } from '../constants.js';
import { Player } from './Player.jsx';
import { Ball } from './Ball.jsx';
import { PixelText, PixelTextC } from './PixelText.jsx';

// ── Letterbox the 16:9 reference inside our 408×348 viewport ─────────────
// Reference image is 2752×1536 ≈ 1.79:1. To preserve composition we render
// the scene inside a 408×228 strip centered vertically; the remaining 60px
// top/bottom become black cinema bars.
const REF_W = 2000;             // reference width (displayed-image basis)
const REF_H = 1116;             // reference height (1.79:1)
const CONTENT_W = ZOOM_W;        // 408
const CONTENT_H = Math.round(CONTENT_W * REF_H / REF_W); // 228
const CONTENT_TOP = Math.round((TOTAL_H - CONTENT_H) / 2); // 60
const SX = CONTENT_W / REF_W;    // x scale ≈ 0.204
const SY = CONTENT_H / REF_H;    // y scale ≈ 0.204
// helper: map a reference (x,y) to viewport coordinates
const rx = (x) => Math.round(x * SX);
const ry = (y) => Math.round(y * SY + CONTENT_TOP);
const rr = (r) => Math.round(r * SX);

// Single bubble component — uses courtillus.png in the lower half of the bubble
// (top half stays transparent so the galaxy shows through). Players run back
// and forth in normalized (u,v) court coords, ball possession rotates between
// the players listed in `scene.ballRotation`, and a Ball component is drawn
// next to whoever currently holds it — mirroring GameScene's rendering layout.
function BubbleCourt({ cx, cy, r, scene, playerScale, clipId, possessionPeriod = 5000, showBall = false }) {
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

  const artW = r * 1.7;              // fits inside the bubble rim with margin
  const artH = artW * 0.30;          // courtillus aspect ≈ 3.33 : 1
  const artX = cx - artW / 2;
  const artY = cy - artH * 0.15;     // sits just below bubble center

  // Rotate the ball among the configured players. `ballRotation` is a list of
  // player indices into scene.players. If omitted we infer it from the player
  // who started with hasBall (held the whole time).
  const rotation = scene.ballRotation ?? scene.players.map((p, i) => p.hasBall ? i : null).filter(v => v !== null);
  const slot = rotation.length > 0
    ? rotation[Math.floor(tick / possessionPeriod) % rotation.length]
    : 0;

  // Players hold their court positions and just run the leg animation. The
  // ball-handler still gets the dribbling pose + bouncing ball. Sprites lift a
  // touch off the floor so they aren't kissing the bubble rim; shadows stay
  // anchored to the ground.
  const playerLift = playerScale * 5;
  const rendered = scene.players.map((p, i) => {
    const playerCx = artX + p.u * artW;
    const groundCy = artY + p.v * artH;
    const playerCy = groundCy - playerLift;
    const flipH = p.facingRight ?? false;
    const hasBall = i === slot;
    return { i, p, playerCx, playerCy, groundCy, flipH, hasBall };
  });

  // Ball offsets scaled off the player size. GameScene uses ±10/±6 at scale 1.5,
  // so the ball is roughly 0.67× the player's footprint.
  const ballScale  = Math.max(playerScale * 0.7, 0.5);
  const ballOffX   = playerScale * 6.5;
  const ballOffY   = 1;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r * 0.95} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <image
          href="/splash/courtillus.png"
          x={artX} y={artY} width={artW} height={artH}
          preserveAspectRatio="xMidYMid meet"
        />
        {/* darken the court so player legs/sprites stay readable */}
        <rect
          x={artX} y={artY} width={artW} height={artH}
          fill="#000" opacity={0.1}
        />
        {/* Custom shadow ellipse drawn at the player's actual foot position.
            For run/idle, Player centers the 14×18 sprite on cy (cy - SH/2
            translate), so feet sit at cy + 9*scale, not cy. */}
        {rendered.map(({ i, playerCx, playerCy }) => (
          <ellipse
            key={`s${i}`}
            cx={playerCx}
            cy={playerCy + 9 * playerScale}
            rx={4.5 * playerScale}
            ry={1.5 * playerScale}
            fill="#000"
            opacity={0.35}
          />
        ))}
        {/* sort by cy so deeper players render behind closer ones, like GameScene */}
        {[...rendered].sort((a, b) => a.playerCy - b.playerCy).map(({ i, p, playerCx, playerCy, flipH, hasBall }) => {
          const playerEl = (
            <Player
              cx={playerCx} cy={playerCy}
              scale={playerScale}
              jerseyColor={p.jerseyColor}
              skinColor={p.skinColor ?? '#db8a5d'}
              isMoving={true}
              hasBall={hasBall}
            />
          );
          return (
            <React.Fragment key={`p${i}`}>
              {flipH
                ? <g transform={`scale(-1,1) translate(${-playerCx * 2}, 0)`}>{playerEl}</g>
                : playerEl}
              {showBall && hasBall && (
                <Ball
                  cx={flipH ? playerCx + ballOffX : playerCx - ballOffX}
                  cy={playerCy + ballOffY}
                  scale={ballScale}
                />
              )}
            </React.Fragment>
          );
        })}
      </g>
      <image
        href="/splash/bubble.png"
        x={cx - r} y={cy - r} width={r * 2} height={r * 2}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}


// Mini-scenes — each player oscillates horizontally around its base (u, v).
// `ballRotation` lists the player indices that take possession in turn (every
// `possessionPeriod` ms — defaults to 5s). Phase offsets stagger the loops so
// the bubbles don't all move in sync.
// Two skin tones cycled across the rosters for visual variety.
const SKIN_LIGHT = '#db8a5d';
const SKIN_DARK  = '#906e57';

const SCENES = [
  { // Center bubble — 2v2, ball circulates between players
    ballRotation: [0, 2, 3, 0],
    players: [
      { u: 0.42, v: 0.42, jerseyColor: JERSEY_HOME, skinColor: SKIN_LIGHT, facingRight: true  },
      { u: 0.55, v: 0.46, jerseyColor: JERSEY_AWAY, skinColor: SKIN_DARK,  facingRight: false },
      { u: 0.38, v: 0.62, jerseyColor: JERSEY_HOME, skinColor: SKIN_DARK,  facingRight: true  },
      { u: 0.60, v: 0.66, jerseyColor: JERSEY_AWAY, skinColor: SKIN_LIGHT, facingRight: false },
    ],
  },
  { // 1-on-1
    ballRotation: [0, 1],
    players: [
      { u: 0.45, v: 0.50, jerseyColor: JERSEY_HOME, skinColor: SKIN_LIGHT, facingRight: true  },
      { u: 0.58, v: 0.55, jerseyColor: JERSEY_AWAY, skinColor: SKIN_DARK,  facingRight: false },
    ],
  },
  { // 1-on-1 mirrored
    ballRotation: [1, 0],
    players: [
      { u: 0.42, v: 0.55, jerseyColor: JERSEY_HOME, skinColor: SKIN_DARK,  facingRight: false },
      { u: 0.55, v: 0.50, jerseyColor: JERSEY_AWAY, skinColor: SKIN_LIGHT, facingRight: true  },
    ],
  },
  { // Two-on-two — ball cycles through both teams
    ballRotation: [0, 2, 0, 1],
    players: [
      { u: 0.40, v: 0.45, jerseyColor: JERSEY_HOME, skinColor: SKIN_LIGHT, facingRight: true  },
      { u: 0.52, v: 0.50, jerseyColor: JERSEY_AWAY, skinColor: SKIN_DARK,  facingRight: false },
      { u: 0.60, v: 0.65, jerseyColor: JERSEY_HOME, skinColor: SKIN_DARK,  facingRight: false },
    ],
  },
  { // Fast break — both running same way
    ballRotation: [0, 0, 1, 0],
    players: [
      { u: 0.45, v: 0.50, jerseyColor: JERSEY_HOME, skinColor: SKIN_DARK,  facingRight: true },
      { u: 0.58, v: 0.60, jerseyColor: JERSEY_HOME, skinColor: SKIN_LIGHT, facingRight: true },
    ],
  },
];

// ── Bubble positions transcribed from the reference image ───────────────
// Coords are in reference pixel space (REF_W × REF_H). The rx/ry helpers
// map them into our 408×228 inner content area. Each entry picks a scene
// and a layer (b = behind man, f = in front of man).
const BUBBLES = [
  // Top row
  { rxc:  340, ryc:  280, rr:  95, scene: 1, layer: 'b' }, // upper-left (small)
  { rxc: 1700, ryc:  140, rr: 120, scene: 2, layer: 'b' }, // upper-right (medium)

  // Left flank
  { rxc:   90, ryc:  560, rr: 125, scene: 3, layer: 'b' }, // left-middle (large)
  { rxc:  155, ryc:  830, rr: 115, scene: 4, layer: 'f' }, // left-lower (medium-large)
  { rxc:  345, ryc: 1055, rr:  70, scene: 1, layer: 'f' }, // bottom-left (small)

  // Right flank
  { rxc: 1815, ryc:  535, rr: 120, scene: 2, layer: 'b' }, // right-middle (large)
  { rxc: 1875, ryc:  795, rr: 125, scene: 3, layer: 'f' }, // right-lower (large)
  { rxc: 1700, ryc: 1050, rr: 115, scene: 4, layer: 'f' }, // bottom-right (medium-large)

  // Center showpiece — dominant focal bubble per the reference
  { rxc: 1000, ryc:  720, rr: 310, scene: 0, layer: 'f', main: true },
];

export function SplashScreen() {
  // pulse for TAP TO PLAY + ms-tick for bubble hover
  const [pulse, setPulse] = React.useState(1);
  const [hoverTick, setHoverTick] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = now - start;
      setPulse(0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t / 500)));
      setHoverTick(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Convert bubbles once. Each bubble gets a phase offset so the group bobs
  // out of sync. Period ~3.6s, amplitude ~3px (slightly larger for the main).
  const bubbles = BUBBLES.map((b, i) => {
    const HOVER_PERIOD = 3600;
    const phase = i * 0.72;
    const amp   = b.main ? 4 : 3;
    // round to whole pixels — sub-pixel jitter on the courtillus PNG flickers
    // on mobile (resampling re-runs at slightly different offsets each frame)
    const hoverY = Math.round(Math.sin((hoverTick / HOVER_PERIOD) * 2 * Math.PI + phase) * amp);
    return {
      ...b,
      cx: rx(b.rxc),
      cy: ry(b.ryc) + hoverY,
      r:  rr(b.rr),
      key: `bubble-${i}`,
    };
  });
  const bubblesBehind = bubbles.filter(b => b.layer === 'b');
  const bubblesFront  = bubbles.filter(b => b.layer === 'f');

  // Figure placement — fills almost the full inner content height, centered.
  // Reference shows the man centered horizontally with arms outstretched.
  const manH = CONTENT_H - 12;                          // ~216
  const manW = Math.round(manH * 1.12);                 // arms make it slightly wider than tall
  const manX = Math.round((CONTENT_W - manW) / 2);      // centered
  const manY = CONTENT_TOP + 6;
  const leftHandCx  = manX + manW * 0.08;
  const rightHandCx = manX + manW * 0.92;
  const handCy      = manY + manH * 0.42;
  const lightSize   = Math.round(manH * 0.65);          // ~140

  const renderBubble = (b) => (
    <BubbleCourt
      key={b.key}
      cx={b.cx}
      cy={b.cy}
      r={b.r}
      // every bubble keeps the same player-to-bubble ratio as the center
      // (center: r=63, playerScale=0.7 → ratio ≈ 0.0111 per unit of radius)
      playerScale={b.r * (0.7 / 63)}
      scene={SCENES[b.scene]}
      clipId={`splash-clip-${b.key}`}
      showBall={!!b.main}
    />
  );

  // Title placement in the top letterbox bar (0..CONTENT_TOP).
  const titleY    = 12;
  const taglineY  = 36;

  return (
    <g>
      {/* ── Letterbox base ── */}
      <rect x={0} y={0} width={ZOOM_W} height={TOTAL_H} fill="#000" />

      {/* ── Title in the top letterbox bar ── */}
      <PixelTextC
        text="ENTER THE MBA"
        cx={ZOOM_W / 2}
        y={titleY}
        scale={2}
        fill="#e8c060"
        outline="#2a1800"
        thick
      />
      <PixelTextC
        text="MULTIVERSE BASKETBALL ASSOCIATION"
        cx={ZOOM_W / 2}
        y={taglineY}
        scale={1}
        fill="#1eb8d8"
        outline={null}
      />

      {/* ── Galaxy background (clipped to content strip) ── */}
      <image
        href="/splash/universe.png"
        x={0} y={CONTENT_TOP} width={CONTENT_W} height={CONTENT_H}
        preserveAspectRatio="xMidYMid slice"
      />

      {/* ── Bubbles behind the figure ── */}
      {bubblesBehind.map(renderBubble)}

      {/* ── The masked figure — subtle breathing scale ── */}
      {(() => {
        const BREATH_PERIOD = 3200;
        const breathAmp     = 0.015;                // ±1.5 %
        const s = 1 + Math.sin((hoverTick / BREATH_PERIOD) * 2 * Math.PI) * breathAmp;
        const manCx = manX + manW / 2;
        const manCy = manY + manH / 2;
        return (
          <g transform={`translate(${manCx}, ${manCy}) scale(${s}) translate(${-manCx}, ${-manCy})`}>
            <image
              href="/splash/man.png"
              x={manX} y={manY} width={manW} height={manH}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        );
      })()}

      {/* ── Hand light bursts — gentle left/right sway ── */}
      {(() => {
        const SWAY_PERIOD = 2200;
        const swayAmp     = 2.5;
        const sway        = Math.sin((hoverTick / SWAY_PERIOD) * 2 * Math.PI) * swayAmp;
        return (
          <>
            <image href="/splash/light.png"
              x={leftHandCx - lightSize / 2 + sway} y={handCy - lightSize / 2}
              width={lightSize} height={lightSize}
              style={{ mixBlendMode: 'screen' }} />
            <image href="/splash/light.png"
              x={rightHandCx - lightSize / 2 - sway} y={handCy - lightSize / 2}
              width={lightSize} height={lightSize}
              style={{ mixBlendMode: 'screen' }} />
          </>
        );
      })()}

      {/* ── Bubbles in front of the figure (main showpiece included) ── */}
      {bubblesFront.map(renderBubble)}

      {/* ── Left-side mini-ad: framed avatar + "Challenge Other Redditors!" ── */}
      {(() => {
        const frameX = 3;
        const frameY = 74;
        const frameW = 92;
        const frameH = 18;
        const rx     = 3;
        const avatarCx = frameX + 9;
        const avatarCy = frameY + frameH / 2;
        const avatarR  = 7;
        const textX    = avatarCx + avatarR + 4;
        // Slide in from off-screen left after a 3s delay. Start far enough out
        // that even Reddit desktop's wider letterbox can't reveal it before
        // the slide begins.
        const SLIDE_DELAY    = 3000;
        const SLIDE_DURATION = 800;
        const SLIDE_START_X  = -250;                                // ~2.7× the frame width past the viewBox edge
        const slideT = Math.max(0, Math.min(1, (hoverTick - SLIDE_DELAY) / SLIDE_DURATION));
        const eased  = 1 - Math.pow(1 - slideT, 3);                 // easeOutCubic
        const slideX = SLIDE_START_X * (1 - eased);
        return (
          <g transform={`translate(${slideX}, 0) scale(1.25)`}>
            {/* BballTip-style frame */}
            <rect x={frameX} y={frameY} width={frameW} height={frameH} rx={rx}
              fill="#0c1018" shapeRendering="crispEdges" />
            <rect x={frameX} y={frameY} width={frameW} height={frameH} rx={rx}
              fill="none" stroke="#ffffff" strokeWidth={1.5} />

            <defs>
              <clipPath id="splash-ad-avatar-clip">
                <circle cx={avatarCx} cy={avatarCy} r={avatarR - 1} />
              </clipPath>
            </defs>
            <circle cx={avatarCx} cy={avatarCy} r={avatarR}
              fill="#0a1828" stroke="#ffe060" strokeWidth={1} />
            <image href="/jxts5wo9u41e1.png"
              x={avatarCx - 9} y={avatarCy - 9}
              width={18} height={23}
              clipPath="url(#splash-ad-avatar-clip)"
              preserveAspectRatio="xMidYMid meet"
              style={{ imageRendering: 'pixelated' }} />
            <text x={textX} y={avatarCy - 1} style={{ fontFamily: 'var(--f-mono)' }} fontSize={6} fontWeight="bold" fill="#fff">CHALLENGE</text>
            <text x={textX} y={avatarCy + 6} style={{ fontFamily: 'var(--f-mono)' }} fontSize={6} fontWeight="bold" fill="#ffe060">OTHER REDDITORS!</text>
          </g>
        );
      })()}

      {/* ── Tap to play prompt — sits in the bottom letterbox bar ── */}
      <g opacity={pulse}>
        <PixelTextC
          text="TAP TO PLAY"
          cx={ZOOM_W / 2}
          y={CONTENT_TOP + CONTENT_H + Math.round((TOTAL_H - CONTENT_TOP - CONTENT_H - 14) / 2)}
          scale={2}
          fill="#7ee0ff"
          outline="#0a1828"
          thick
        />
      </g>
    </g>
  );
}

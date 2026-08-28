/* global React */
/* Draft page — tick-based slide+squeeze+burst animation */

const { useState: useStateD, useEffect: useEffectD, useRef: useRefD, useMemo: useMemoD } = React;

// ─── Name pools ──────────────────────────────────────────────
const FIRST_NAMES = [
  "RYX", "ZEX", "JAX", "NOVA", "KAI", "ASH", "ORION", "MIRA",
  "ROEN", "LIRA", "SOL", "VEX", "KIRA", "ZANE", "ECHO", "RUNE",
  "DEX", "NYX", "AXEL", "BLAZE", "CRUX", "DELTA", "RAIN", "STORM",
];
const LAST_NAMES = [
  "FROST", "KRIX", "CRANE", "DRAKE", "VESS", "VOLT", "CADE", "KAGE",
  "REI", "NYX", "STARK", "GRIM", "VOID", "BLADE", "WIRE", "HUSK",
  "QUARK", "BYTE", "PIXEL", "AXIS", "SLATE", "CHROME", "RIFT", "SPIKE",
];
const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const POS_COLORS_D = {
  PG: "#3ea6ff", SG: "#a855f7", SF: "#19e6c4",
  PF: "#ff7a3c", C: "#ffc94a",
};
const ABILITIES = [
  { name: "SHARPSHOOTER", desc: "+30% crit chance on long-range shots." },
  { name: "BULLDOZER", desc: "Ignores knockback. +25% charge damage." },
  { name: "PLAYMAKER", desc: "+20 accuracy to nearest ally." },
  { name: "ZANSHIN", desc: "Next attack after a parry always crits." },
  { name: "AFTERBURNER", desc: "+40% boost duration." },
  { name: "DEADEYE", desc: "Auto-locks first headshot per match." },
];

// Tier defs — rarity: 0 (silver), 1 (gold), 2 (blue)
const TIER_DEFS = {
  silver: { label: "SILVER PICK", color: "#cbd5e1", glow: "#e2e8f0", weight: 0.60, rarity: 0, burstDur: 110, burstSpeed: 3, sparkles: 0 },
  gold:   { label: "GOLD PICK",   color: "#ffc94a", glow: "#ffe080", weight: 0.30, rarity: 1, burstDur: 138, burstSpeed: 5, sparkles: 12 },
  blue:   { label: "BLUE PICK",   color: "#19e6c4", glow: "#5bf2d4", weight: 0.10, rarity: 2, burstDur: 175, burstSpeed: 7, sparkles: 20 },
};

function pickTier() {
  const r = Math.random();
  if (r < TIER_DEFS.blue.weight) return "blue";
  if (r < TIER_DEFS.blue.weight + TIER_DEFS.gold.weight) return "gold";
  return "silver";
}
function rollStat(tier) {
  if (tier === "blue") return 65 + Math.floor(Math.random() * 30);
  if (tier === "gold") return 55 + Math.floor(Math.random() * 30);
  return 40 + Math.floor(Math.random() * 30);
}
function genCard() {
  const tier = pickTier();
  const spd = rollStat(tier), dex = rollStat(tier), jmp = rollStat(tier), acc = rollStat(tier);
  const ovr = Math.round((spd + dex + jmp + acc) / 4);
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
  const ability = tier === "blue" ? ABILITIES[Math.floor(Math.random() * ABILITIES.length)] : null;
  return {
    id: Math.random().toString(36).slice(2, 9),
    tier, position: pos, overall: ovr,
    name: `${fn} ${ln}`,
    spd, dex, jmp, acc,
    ability: ability ? ability.name : null,
    abilityDesc: ability ? ability.desc : null,
  };
}

// ─── Easing ──────────────────────────────────────────────────
const easeIn  = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// ─── Sequence timing — Anomaly scan + DNA download entry ─────
// Stage 1: SCANNING ANOMALIES   (radar sweep, blips appear)
// Stage 2: LOCATING UNIVERSE    (lock onto selected blip, coords resolve)
// Stage 3: ACQUIRING DNA        (energy beams travel from radar to card pads)
// Stage 4: PLANET ORBIT          (spheres orbit and lock onto central player)
// Stage 5: DNA DOWNLOAD         (per-card helix download, staggered)
const SCAN_S1_END        = 65;   // end of "scanning"
const SCAN_S2_END        = 120;  // end of "locating"
const SCAN_S3_END        = 180;  // end of "acquiring"
const SCAN_FADE          = 162;  // radar starts fading near end of acquiring

const PLANET_ANIM_START  = 148;  // planets begin orbiting
const PLANET_ANIM_DUR    = 250;  // shortened rotation
const PLANET_ANIM_END    = PLANET_ANIM_START + PLANET_ANIM_DUR;
const PLANET_LOCK_START  = PLANET_ANIM_END;  // lock targeting animation begins
const PLANET_LOCK_DUR    = 100;  // lock animation
const PLANET_WAIT_START  = PLANET_LOCK_START + PLANET_LOCK_DUR;  // wait phase
const PLANET_WAIT_DUR    = 192;  // ~3 seconds total (1s solid + 2s extended with blink)
const PLANET_WAIT_END    = PLANET_WAIT_START + PLANET_WAIT_DUR;

// Adjust DNA download to start after planet animation completes
const DNA_DOWNLOAD_START = PLANET_WAIT_END + 300;  // much longer delay before cards appear

const DNA_ENTRY_DELAY    = PLANET_WAIT_END + 60;  // card 0's DNA download begins well after "ANOMALY LOCKED ON" text
const DNA_START_STAGGER  = 14;   // each card's download starts 14 ticks after prev
const DNA_DUR            = 72;   // helix download duration
const MATERIALIZE_DUR    = 18;   // card materializes from helix collapse
const FLIP_DUR           = 24;
const FLIP_HALF          = 12;
const BURST_DELAY        = 4;    // ticks after flip midpoint

// Base pairs for the DNA stream readout
const BASE_PAIRS = [["A","T"], ["T","A"], ["G","C"], ["C","G"]];
const NUCLEOTIDES = "ATCG";

// ─── rAF tick hook ───────────────────────────────────────────
function useTick(running) {
  const [tick, setTick] = useStateD(0);
  const startRef = useRefD(null);
  useEffectD(() => {
    if (!running) return;
    let raf;
    startRef.current = performance.now();
    const loop = (now) => {
      const t = Math.floor((now - startRef.current) / 16);
      setTick(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  // restart by resetting
  return [tick, () => { startRef.current = performance.now(); setTick(0); }];
}

// ─── Card phase computed from tick ───────────────────────────
// Phases: 'pad' (empty projector pad), 'dna' (helix downloading),
//         'materialize' (helix collapses into card back), 'back' (locked card visible),
//         'flipping', 'revealed'
function getCardPhase(tick, idx, flipStart) {
  const dnaStart = DNA_ENTRY_DELAY + idx * DNA_START_STAGGER;
  const dnaEnd   = dnaStart + DNA_DUR;
  const matEnd   = dnaEnd + MATERIALIZE_DUR;

  if (tick < dnaStart) {
    return { phase: "pad", dnaProgress: 0, matProgress: 0, face: "back", scaleX: 1, revealed: false };
  }
  if (tick < dnaEnd) {
    const p = (tick - dnaStart) / DNA_DUR;
    return { phase: "dna", dnaProgress: clamp01(p), matProgress: 0, face: "back", scaleX: 1, revealed: false };
  }
  if (tick < matEnd) {
    const m = (tick - dnaEnd) / MATERIALIZE_DUR;
    return { phase: "materialize", dnaProgress: 1, matProgress: clamp01(m), face: "back", scaleX: 1, revealed: false };
  }

  // After materialize: regular flip handling
  let face = "back";
  let scaleX = 1;
  if (flipStart != null && tick >= flipStart) {
    const ft = tick - flipStart;
    if (ft < FLIP_HALF) {
      face = "back";
      scaleX = 1 - easeIn(ft / FLIP_HALF);
    } else if (ft < FLIP_DUR) {
      face = "front";
      scaleX = easeOut((ft - FLIP_HALF) / FLIP_HALF);
    } else {
      face = "front";
      scaleX = 1;
    }
  }
  const revealed = flipStart != null && tick >= flipStart + FLIP_DUR;
  return { phase: revealed ? "revealed" : (flipStart != null && tick >= flipStart ? "flipping" : "back"),
           dnaProgress: 1, matProgress: 1, face, scaleX, revealed };
}

// ─── Rainbow burst overlay (per card) ────────────────────────
function BurstOverlay({ card, originX, originY, startTick, tick }) {
  if (startTick == null) return null;
  const def = TIER_DEFS[card.tier];
  if (def.rarity < 1) return null; // common ability cards also burst (rarity 0 still triggers a 110-tick burst per spec for "common ability")
  // Spec: 110 (rarity 0 with ability), 138 (rarity 1), 175 (rarity 2)
  // Silver has no ability so we only burst for gold (1) and blue (2).

  const t = tick - startTick;
  if (t < 0 || t > def.burstDur) return null;
  const progress = t / def.burstDur;

  // Diagonal scrolling beams (full screen) — chunky, large stripes
  const beamColors = ['#ff2040', '#ff8020', '#ffe040', '#40e870', '#2070ff', '#a040ff', '#ff40e0'];
  const tileSize = 1800;
  const beamOffset = (t * def.burstSpeed * 3) % tileSize;

  // White flash (entry, fades quickly)
  const flashOpacity = Math.max(0, 1 - t / 8);

  // Expanding ring
  const ringR = t * 11;
  const ringOpacity = Math.max(0, 1 - t / 60);
  const ringStroke = Math.max(0.5, 6 * (1 - t / 60));

  // Radial sparkles
  const sparkleCount = def.sparkles;
  const sparkles = [];
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (i / sparkleCount) * Math.PI * 2;
    const dist = t * 6.5;
    const sx = originX + Math.cos(angle) * dist;
    const sy = originY + Math.sin(angle) * dist;
    const op = Math.max(0, 1 - t / 80);
    sparkles.push({ x: sx, y: sy, op });
  }

  return (
    <div className="burst-overlay" style={{ pointerEvents: "none" }}>
      {/* Diagonal scrolling chunky beams */}
      <div
        className="burst-beams"
        style={{
          backgroundImage: `repeating-linear-gradient(
            135deg,
            ${beamColors[0]} 0px, ${beamColors[0]} 220px,
            ${beamColors[1]} 220px, ${beamColors[1]} 480px,
            ${beamColors[2]} 480px, ${beamColors[2]} 720px,
            ${beamColors[3]} 720px, ${beamColors[3]} 980px,
            ${beamColors[4]} 980px, ${beamColors[4]} 1240px,
            ${beamColors[5]} 1240px, ${beamColors[5]} 1520px,
            ${beamColors[6]} 1520px, ${beamColors[6]} 1800px
          )`,
          backgroundPosition: `${-beamOffset}px ${-beamOffset}px`,
          opacity: 0.85 * (1 - progress * 0.7),
        }}
      ></div>
      {/* White flash */}
      <div className="burst-flash" style={{ opacity: flashOpacity }}></div>
      {/* SVG layer: ring + sparkles */}
      <svg className="burst-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <circle cx={originX} cy={originY} r={ringR}
                fill="none" stroke="#fff"
                strokeWidth={ringStroke} opacity={ringOpacity}/>
        {sparkles.map((s, i) => (
          <g key={i} opacity={s.op}>
            <circle cx={s.x} cy={s.y} r="4" fill="#fff"/>
            <circle cx={s.x} cy={s.y} r="8" fill="#fff" opacity="0.4"/>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── ANOMALY SCAN — radar / locator / acquire sequence ───────
// ─── ANOMALY SCAN — radar / locator / acquire sequence ───────
function AnomalyScan({ tick, universeId }) {
  if (tick >= SCAN_S3_END) return null;

  const stage =
    tick < SCAN_S1_END ? "scanning" :
    tick < SCAN_S2_END ? "locating" : "acquiring";

  const fadeOpacity = tick >= SCAN_FADE
    ? clamp01(1 - (tick - SCAN_FADE) / (SCAN_S3_END - SCAN_FADE))
    : 1;

  const TARGET_ANGLE = -38;
  let sweepAngle;
  if (stage === "scanning") {
    sweepAngle = (tick * 2.6) % 360;  // slower sweep
  } else if (stage === "locating") {
    const p = (tick - SCAN_S1_END) / (SCAN_S2_END - SCAN_S1_END);
    const eased = easeOut(p);
    const spinning = (tick * 2.6 * (1 - eased)) % 360;
    sweepAngle = spinning * (1 - eased) + TARGET_ANGLE * eased;
  } else {
    sweepAngle = TARGET_ANGLE;
  }

  const blips = [
    { id: 0, angle: 124, dist: 0.62, appearTick: 6 },
    { id: 1, angle: 218, dist: 0.84, appearTick: 14 },
    { id: 2, angle: TARGET_ANGLE, dist: 0.56, appearTick: 28, selected: stage !== "scanning" },
    { id: 3, angle: 305, dist: 0.40, appearTick: 38 },
    { id: 4, angle:  88, dist: 0.78, appearTick: 47 },
    { id: 5, angle: 168, dist: 0.70, appearTick: 56 },
  ];
  const anomaliesFound = blips.filter(b => tick >= b.appearTick).length;

  return (
    <div className="anomaly-scan" style={{ opacity: fadeOpacity }}>
      <div className="as-grid"></div>
      <div className="as-radar-wrap">
        <span className="as-bracket tl"></span>
        <span className="as-bracket tr"></span>
        <span className="as-bracket bl"></span>
        <span className="as-bracket br"></span>
        <RadarSVG sweepAngle={sweepAngle} blips={blips} tick={tick} stage={stage}/>
        <div className="as-radar-h">
          <span className="as-radar-tag">ANOMALY · DETECT</span>
          <span className="as-radar-id">SCN.{(tick * 3 | 0).toString(16).toUpperCase().padStart(4, "0")}</span>
        </div>
      </div>
      <ScanReadout tick={tick} stage={stage} anomaliesFound={anomaliesFound} universeId={universeId}/>
    </div>
  );
}

function RadarSVG({ sweepAngle, blips, tick, stage }) {
  const size = 420;
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 12;

  // Sweep cone endpoints
  const armRad = sweepAngle * Math.PI / 180;
  const trailRad = (sweepAngle - 55) * Math.PI / 180;
  const armX = cx + R * Math.cos(armRad);
  const armY = cy + R * Math.sin(armRad);
  const trailX = cx + R * Math.cos(trailRad);
  const trailY = cy + R * Math.sin(trailRad);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="as-radar-svg" width={size} height={size}>
      <defs>
        <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(8,40,32,0.92)"/>
          <stop offset="70%"  stopColor="rgba(3,20,16,0.72)"/>
          <stop offset="100%" stopColor="rgba(2,8,10,0.35)"/>
        </radialGradient>
        <radialGradient id="radarSheen" cx="32%" cy="22%" r="55%">
          <stop offset="0%"   stopColor="rgba(91,242,212,0.16)"/>
          <stop offset="100%" stopColor="rgba(91,242,212,0)"/>
        </radialGradient>
      </defs>

      {/* Backplate */}
      <circle cx={cx} cy={cy} r={R} fill="url(#radarBg)"
              stroke="rgba(25,230,196,0.85)" strokeWidth="1.5"/>
      <circle cx={cx} cy={cy} r={R} fill="url(#radarSheen)" pointerEvents="none"/>

      {/* Concentric rings */}
      {[0.22, 0.45, 0.68, 0.88].map((f, i) => (
        <circle key={i} cx={cx} cy={cy} r={R * f} fill="none"
                stroke="rgba(25,230,196,0.22)" strokeWidth="1"
                strokeDasharray={i % 2 ? "3 5" : "none"}/>
      ))}

      {/* Crosshair */}
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="rgba(25,230,196,0.18)" strokeWidth="1"/>
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(25,230,196,0.18)" strokeWidth="1"/>

      {/* Compass marks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
        const rad = a * Math.PI / 180;
        const major = a % 90 === 0;
        const len = major ? 14 : 8;
        const x1 = cx + Math.cos(rad) * (R - len);
        const y1 = cy + Math.sin(rad) * (R - len);
        const x2 = cx + Math.cos(rad) * R;
        const y2 = cy + Math.sin(rad) * R;
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}
                     stroke="#5bf2d4" strokeWidth={major ? 2 : 1}
                     opacity={major ? 1 : 0.55}/>;
      })}

      {/* Sweep cone */}
      <path d={`M ${cx} ${cy} L ${armX} ${armY} A ${R} ${R} 0 0 0 ${trailX} ${trailY} Z`}
            fill="rgba(91,242,212,0.18)"/>
      <path d={`M ${cx} ${cy} L ${armX} ${armY} A ${R} ${R} 0 0 0 ${trailX} ${trailY} Z`}
            fill="rgba(91,242,212,0.10)"/>

      {/* Sweep arm — leading edge */}
      <line x1={cx} y1={cy} x2={armX} y2={armY}
            stroke="#5bf2d4" strokeWidth="2"
            filter="drop-shadow(0 0 8px #5bf2d4)"/>

      {/* Blips */}
      {blips.map(b => {
        if (tick < b.appearTick) return null;
        const age = tick - b.appearTick;
        const rad = b.angle * Math.PI / 180;
        const bx = cx + Math.cos(rad) * R * b.dist;
        const by = cy + Math.sin(rad) * R * b.dist;
        const pulsePhase = age % 28;
        const pulseR = 4 + pulsePhase * 0.95;
        const pulseOp = Math.max(0, 1 - pulsePhase / 28);
        const locked = b.selected && (stage === "locating" || stage === "acquiring");
        const color = locked ? "#ff3a6a" : "#5bf2d4";
        return (
          <g key={b.id}>
            <circle cx={bx} cy={by} r={pulseR} fill="none"
                    stroke={color} strokeWidth="1" opacity={pulseOp}/>
            <circle cx={bx} cy={by} r="3.5" fill={color}
                    filter={`drop-shadow(0 0 5px ${color})`}/>
            {locked && (
              <g>
                <line x1={bx - 20} y1={by} x2={bx - 8}  y2={by} stroke="#ff3a6a" strokeWidth="1.6"/>
                <line x1={bx + 8}  y1={by} x2={bx + 20} y2={by} stroke="#ff3a6a" strokeWidth="1.6"/>
                <line x1={bx} y1={by - 20} x2={bx} y2={by - 8}  stroke="#ff3a6a" strokeWidth="1.6"/>
                <line x1={bx} y1={by + 8}  x2={bx} y2={by + 20} stroke="#ff3a6a" strokeWidth="1.6"/>
                <circle cx={bx} cy={by} r="18" fill="none"
                        stroke="#ff3a6a" strokeWidth="1"
                        strokeDasharray="3 3" opacity="0.7"/>
              </g>
            )}
          </g>
        );
      })}

      {/* Center reticle */}
      <circle cx={cx} cy={cy} r="2.5" fill="#5bf2d4"/>
      <circle cx={cx} cy={cy} r="6" fill="none" stroke="#5bf2d4" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

function ScanReadout({ tick, stage, anomaliesFound, universeId }) {
  // Ticker values — randomized in scanning, settling in locating, locked in acquiring
  let coordX, coordY, universe;
  const LOCKED_X = "5471.22";
  const LOCKED_Y = "−2206.84";
  const LOCKED_U = `UNIVERSE ${universeId}`;

  if (stage === "scanning") {
    coordX = (((tick * 137) % 9999) / 100).toFixed(2);
    coordY = (((tick * 211) % 9999) / 100 - 50).toFixed(2);
    universe = "????·???";
  } else if (stage === "locating") {
    const p = (tick - SCAN_S1_END) / (SCAN_S2_END - SCAN_S1_END);
    if (p < 0.8) {
      coordX = (((tick * 137) % 9999) / 100).toFixed(2);
      coordY = (((tick * 211) % 9999) / 100 - 50).toFixed(2);
      const letters = "ABCDEFGHJKMNPQRSTVWXYZ";
      universe = letters[tick % letters.length] + "·" + ((tick * 11) % 999).toString().padStart(3, "0") + "·" + letters[(tick * 3) % letters.length];
    } else {
      coordX = LOCKED_X; coordY = LOCKED_Y; universe = LOCKED_U;
    }
  } else {
    coordX = LOCKED_X; coordY = LOCKED_Y; universe = LOCKED_U;
  }

  const statusByStage = {
    scanning:  "SCANNING ANOMALIES",
    locating:  `LOCKING ONTO UNIVERSE ${universeId}`,
    acquiring: `LOCKING ONTO UNIVERSE ${universeId}`,
  };

  return (
    <div className={`as-readout stage-${stage}`}>
      <div className="asr-status">
        <span className="asr-dot"></span>
        <span className="asr-status-text">▸ {statusByStage[stage]}</span>
        <span className="asr-dotseq"></span>
      </div>
      <div className="asr-grid">
        <div className="asr-cell">
          <span className="asr-lbl">X · COORD</span>
          <span className="asr-val">{coordX}</span>
        </div>
        <div className="asr-cell">
          <span className="asr-lbl">Y · COORD</span>
          <span className="asr-val">{coordY}</span>
        </div>
        <div className="asr-cell">
          <span className="asr-lbl">UNIVERSE</span>
          <span className={`asr-val ${stage === "acquiring" ? "lock" : ""}`}>{universe}</span>
        </div>
        <div className="asr-cell">
          <span className="asr-lbl">DETECTED</span>
          <span className="asr-val">{anomaliesFound.toString().padStart(2, "0")} / 06</span>
        </div>
      </div>
    </div>
  );
}

function AcquireBeams({ tick }) {
  // Three beams travel from radar center to the 3 card pad positions.
  // Coords in design-pixel space (1920×1080).
  const cx = 960, cy = 480; // radar center (matches CSS placement)
  const targets = [
    { x: 580,  y: 855, start: SCAN_S2_END +  2 },
    { x: 960,  y: 855, start: SCAN_S2_END + 16 },
    { x: 1340, y: 855, start: SCAN_S2_END + 30 },
  ];
  const BEAM_DUR = 26;

  return (
    <svg className="as-beams-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="acqBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(91,242,212,0)"/>
          <stop offset="30%"  stopColor="rgba(91,242,212,0.65)"/>
          <stop offset="80%"  stopColor="rgba(255,255,255,1)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,1)"/>
        </linearGradient>
      </defs>
      {targets.map((tg, i) => {
        const localT = tick - tg.start;
        if (localT < 0) return null;
        const p = Math.min(1, localT / BEAM_DUR);
        const fx = cx + (tg.x - cx) * p;
        const fy = cy + (tg.y - cy) * p;
        // Pulse opacity after arrival
        const dwell = Math.max(0, localT - BEAM_DUR);
        const dwellOp = Math.max(0, 1 - dwell / 24);

        return (
          <g key={i}>
            {/* Wide soft glow trail */}
            <line x1={cx} y1={cy} x2={fx} y2={fy}
                  stroke="rgba(91,242,212,0.35)" strokeWidth="10"
                  strokeLinecap="round" opacity={0.6 * Math.max(0.3, dwellOp)}/>
            {/* Sharp core */}
            <line x1={cx} y1={cy} x2={fx} y2={fy}
                  stroke="url(#acqBeam)" strokeWidth="3"
                  strokeLinecap="round"/>
            {/* Dashed data shimmer along beam */}
            <line x1={cx} y1={cy} x2={fx} y2={fy}
                  stroke="#fff" strokeWidth="1.2"
                  strokeDasharray="6 10"
                  strokeDashoffset={-(tick * 4) % 16}
                  opacity="0.85"/>
            {/* Impact ring at target */}
            {p >= 1 && (
              <g>
                <circle cx={tg.x} cy={tg.y} r={6 + dwell * 1.8}
                        fill="none" stroke="#fff" strokeWidth="2"
                        opacity={dwellOp}/>
                <circle cx={tg.x} cy={tg.y} r="5" fill="#fff"
                        opacity={Math.max(0.4, dwellOp)}/>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}


// ─── PLANET ORBIT ANIMATION (Solar System) ─────────────
function PlanetOrbit({ tick, lockedPlanetIdx, universeId }) {
  if (tick < PLANET_ANIM_START || tick >= PLANET_WAIT_END) return null;

  const isRotatingPhase = tick < PLANET_ANIM_END;
  const rotationProgress = isRotatingPhase ? (tick - PLANET_ANIM_START) / PLANET_ANIM_DUR : 1;

  const isLockingPhase = tick >= PLANET_ANIM_END && tick < PLANET_LOCK_START + PLANET_LOCK_DUR;
  const lockProgress = isLockingPhase ? (tick - PLANET_ANIM_END) / PLANET_LOCK_DUR : 0;

  const isWaitingPhase = tick >= PLANET_WAIT_START && tick < PLANET_WAIT_END;

  const centerX = 960, centerY = 520;
  const tiltAngle = 35;

  // Planet data with different speeds and sizes
  const planets = [
    { radius: 150, speed: 1.2, color: '#ff3a6a', size: 0.45 },
    { radius: 240, speed: 0.85, color: '#a855f7', size: 1.15 },
    { radius: 320, speed: 0.55, color: '#3b82f6', size: 0.6 },
    { radius: 400, speed: 0.35, color: '#ffc94a', size: 1.25 },
    { radius: 480, speed: 0.20, color: '#19e6c4', size: 0.55 },
    { radius: 560, speed: 0.12, color: '#22d3ee', size: 0.95 },
  ];

  return (
    <svg viewBox="0 0 1920 1080" className="as-planets-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="holoGlow-orbit">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Orbital trajectory lines — elliptical orbits */}
      {planets.map((p, i) => (
        <ellipse
          key={`orbit-${i}`}
          cx={centerX}
          cy={centerY}
          rx={p.radius}
          ry={p.radius * 0.25}
          fill="none"
          stroke="#5bf2d4"
          strokeWidth="1"
          opacity="0.2"
          strokeDasharray="8 4"
        />
      ))}

      {/* Central sun */}
      <g filter="url(#holoGlow-orbit)">
        <circle cx={centerX} cy={centerY} r={48} fill="#fff" opacity="0.85"/>
        <circle cx={centerX} cy={centerY} r={48} fill="none" stroke="#5bf2d4" strokeWidth="2" opacity="0.6"/>
      </g>

      {/* Orbiting planets */}
      {planets.map((planet, i) => {
        const baseAngle = (i * 120) * Math.PI / 180;
        const orbitProgress = isRotatingPhase
          ? rotationProgress * planet.speed * 240 * Math.PI / 180
          : planet.speed * 240 * Math.PI / 180;
        
        const angle = baseAngle + orbitProgress;
        const ellipseRx = planet.radius;
        const ellipseRy = planet.radius * 0.25;
        const x3d = centerX + Math.cos(angle) * ellipseRx;
        const y3d = centerY + Math.sin(angle) * ellipseRy;
        const z3d = Math.sin(angle) * ellipseRy;
        const depthFactor = (z3d + planet.radius) / (planet.radius * 2);

        const displaySize = 32 * 2 * planet.size * (0.6 + depthFactor * 0.4);
        const isSelected = i === lockedPlanetIdx;
        const boxOpacity = isLockingPhase && isSelected ? Math.min(1, lockProgress * 2) : 0;
        const boxSize = displaySize * 2.2;
        const boxGlow = isLockingPhase && isSelected ? Math.sin(lockProgress * Math.PI) : 0;

        const waitT = isWaitingPhase ? tick - PLANET_WAIT_START : PLANET_LOCK_DUR;
        const fadeInProgress = isWaitingPhase ? Math.min(1, waitT / 30) : 0;
        const inBlinkPhase = isWaitingPhase && waitT >= 30 && waitT < 120;
        const blinkOn = inBlinkPhase ? (Math.floor(waitT / 8) % 2 === 0) : true;
        
        const pointerOpacity = isWaitingPhase ? fadeInProgress * (blinkOn ? 1 : 0.3) : 0;
        const textOpacity = isWaitingPhase 
          ? fadeInProgress * (blinkOn ? 1 : 0.2)
          : (lockProgress > 0.3 ? Math.min(1, (lockProgress - 0.3) * 3) : 0);

        // 3D sphere lighting — light source from upper-left
        const lightAngle = -45 * Math.PI / 180;
        const sphereNormal = { x: Math.cos(angle), y: Math.sin(angle) * Math.cos(tiltAngle * Math.PI / 180) };
        const lightDir = { x: Math.cos(lightAngle), y: Math.sin(lightAngle) };
        const lighting = Math.max(0, sphereNormal.x * lightDir.x + sphereNormal.y * lightDir.y);

        return (
          <g key={i} opacity={0.5 + depthFactor * 0.5} filter="url(#holoGlow-orbit)">
            {/* 3D Sphere: Base color + lighting */}
            <defs>
              {/* Main sphere gradient — darker poles, lighter equator */}
              <radialGradient id={`sphere3d-${i}`} cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor={planet.color} stopOpacity="0.8"/>
                <stop offset="60%" stopColor={planet.color} stopOpacity="0.75"/>
                <stop offset="100%" stopColor={planet.color} stopOpacity="0.15"/>
              </radialGradient>
              {/* Darker side shadow */}
              <radialGradient id={`shadow-${i}`} cx="65%" cy="65%" r="50%">
                <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                <stop offset="70%" stopColor="rgba(0,0,0,0.25)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0.5)"/>
              </radialGradient>
              <clipPath id={`planetClip-${i}`}>
                <circle cx={x3d} cy={y3d} r={displaySize}/>
              </clipPath>
            </defs>

            {/* Planet sphere — 3D lit sphere */}
            <circle cx={x3d} cy={y3d} r={displaySize} fill={`url(#sphere3d-${i})`} />
            
            {/* Shadow hemisphere */}
            <circle cx={x3d} cy={y3d} r={displaySize} fill={`url(#shadow-${i})`} />

            {/* Rim light — glow around edge */}
            <circle cx={x3d} cy={y3d} r={displaySize * 1.1} fill="none" 
                    stroke={planet.color} strokeWidth={displaySize * 0.15}
                    opacity={0.25 + lighting * 0.25}
                    style={{ mixBlendMode: 'screen' }} />


            {/* Scanning lines — curved to follow sphere */}
            <g clipPath={`url(#planetClip-${i})`}>
              {Array.from({ length: 6 }).map((_, lineIdx) => {
                const lineY = y3d - displaySize * 0.85 + (lineIdx * displaySize * 0.28);
                const distFromCenter = Math.abs(lineY - y3d);
                const curveAmount = Math.sqrt(Math.max(0, displaySize * displaySize - distFromCenter * distFromCenter));
                const lineWidth = curveAmount * 1.6;
                return (
                  <line
                    key={lineIdx}
                    x1={x3d - lineWidth}
                    y1={lineY}
                    x2={x3d + lineWidth}
                    y2={lineY}
                    stroke="#5bf2d4"
                    strokeWidth="0.7"
                    opacity={0.3 + lighting * 0.25}
                  />
                );
              })}
            </g>

            {/* Targeting box */}
            {i === lockedPlanetIdx && (
            <g opacity={isWaitingPhase ? 1 : boxOpacity}>
              <line x1={x3d - boxSize/2} y1={y3d - boxSize/2} x2={x3d - boxSize/2 + 16} y2={y3d - boxSize/2} stroke="#5bf2d4" strokeWidth="1.5"/>
              <line x1={x3d - boxSize/2} y1={y3d - boxSize/2} x2={x3d - boxSize/2} y2={y3d - boxSize/2 + 16} stroke="#5bf2d4" strokeWidth="1.5"/>
              <line x1={x3d + boxSize/2} y1={y3d - boxSize/2} x2={x3d + boxSize/2 - 16} y2={y3d - boxSize/2} stroke="#5bf2d4" strokeWidth="1.5"/>
              <line x1={x3d + boxSize/2} y1={y3d - boxSize/2} x2={x3d + boxSize/2} y2={y3d - boxSize/2 + 16} stroke="#5bf2d4" strokeWidth="1.5"/>
              <line x1={x3d - boxSize/2} y1={y3d + boxSize/2} x2={x3d - boxSize/2 + 16} y2={y3d + boxSize/2} stroke="#5bf2d4" strokeWidth="1.5"/>
              <line x1={x3d - boxSize/2} y1={y3d + boxSize/2} x2={x3d - boxSize/2} y2={y3d + boxSize/2 - 16} stroke="#5bf2d4" strokeWidth="1.5"/>
              <line x1={x3d + boxSize/2} y1={y3d + boxSize/2} x2={x3d + boxSize/2 - 16} y2={y3d + boxSize/2} stroke="#5bf2d4" strokeWidth="1.5"/>
              <line x1={x3d + boxSize/2} y1={y3d + boxSize/2} x2={x3d + boxSize/2} y2={y3d + boxSize/2 - 16} stroke="#5bf2d4" strokeWidth="1.5"/>
              <rect x={x3d - boxSize/2} y={y3d - boxSize/2} width={boxSize} height={boxSize} fill="none" stroke="#5bf2d4" strokeWidth="1.5" opacity={isWaitingPhase ? 0.8 : (0.6 + boxGlow * 0.4)} filter="drop-shadow(0 0 8px #5bf2d4)"/>
            </g>
            )}

            {/* Pointer and text */}
            {isWaitingPhase && i === lockedPlanetIdx && (
              <>
                <line x1={x3d} y1={y3d - boxSize/2 - 20} x2="960" y2="320" stroke="#5bf2d4" strokeWidth="1.5" opacity={pointerOpacity} strokeDasharray="4 4"/>
                <g opacity={textOpacity}>
                  <text x="960" y="310" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="16" fontWeight="600" fill="#5bf2d4" letterSpacing="0.1em">
                    [ ANOMALY LOCKED ON ]
                  </text>
                </g>
              </>
            )}
          </g>
        );
      })}

      {/* Universe ID text below orbit */}
      <text x="960" y="750" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="18" fontWeight="600" fill="#5bf2d4" letterSpacing="0.08em">
        UNIVERSE {universeId}
      </text>
    </svg>
  );
}


function DNADownload({ progress, idx, tick }) {
  // Card-space coords; SVG viewBox 340x520
  const cardW = 340, cardH = 520;
  const cx = cardW / 2;
  const topY = 78;
  const botY = cardH - 132;
  const reach = botY - topY;
  const segments = 28;
  const amp = 48;
  const twistSpeed = 0.05;
  const twist = tick * twistSpeed;

  // Reveal head — slightly leads progress so head is always at the leading edge
  const headT = clamp01(progress * 1.04);
  const headY = topY + headT * reach;

  // Build strand points (full path, but we'll clip via SVG mask)
  const strandL = [];
  const strandR = [];
  const rungs = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = topY + t * reach;
    const phase = t * Math.PI * 3.2 + twist;
    const sL = Math.sin(phase);
    const sR = Math.sin(phase + Math.PI);
    const xL = cx + sL * amp;
    const xR = cx + sR * amp;
    strandL.push({ x: xL, y, depth: sL });
    strandR.push({ x: xR, y, depth: sR });
    if (i % 2 === 0) {
      const visible = t <= headT;
      const pair = BASE_PAIRS[(i + idx) % 4];
      rungs.push({ y, xL, xR, visible, pair, depthL: sL, depthR: sR });
    }
  }

  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const pathL = toPath(strandL);
  const pathR = toPath(strandR);

  const pct = Math.floor(progress * 100);

  // Scrolling base-pair stream (deterministic but evolving)
  const streamChars = [];
  for (let i = 0; i < 22; i++) {
    streamChars.push(NUCLEOTIDES[(i * 7 + idx * 3 + tick) % 4]);
  }
  const streamText = streamChars.join(" ");

  // Materialize fade: helix dims as card appears (handled by parent via opacity)
  return (
    <div className="dna-dl" style={{ "--dna-headY": `${headY}px` }}>
      <svg viewBox={`0 0 ${cardW} ${cardH}`} className="dna-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`dna-grad-${idx}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5bf2d4" stopOpacity="0.95"/>
            <stop offset="100%" stopColor="#19e6c4" stopOpacity="0.6"/>
          </linearGradient>
          <clipPath id={`dna-clip-${idx}`}>
            <rect x="0" y={topY - 4} width={cardW} height={Math.max(0, headY - topY + 4)} />
          </clipPath>
          <filter id={`dna-glow-${idx}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Center axis */}
        <line x1={cx} y1={topY} x2={cx} y2={botY}
              stroke="rgba(25,230,196,0.10)" strokeWidth="1" strokeDasharray="2 4"/>

        {/* Helix — clipped to reveal head */}
        <g clipPath={`url(#dna-clip-${idx})`} filter={`url(#dna-glow-${idx})`}>
          {/* Rungs first (behind strands) */}
          {rungs.map((r, i) => {
            const opacity = 0.35 + (Math.abs(r.depthL) + Math.abs(r.depthR)) * 0.3;
            return (
              <g key={`rung-${i}`} opacity={opacity}>
                <line x1={r.xL} y1={r.y} x2={r.xR} y2={r.y}
                      stroke="#19e6c4" strokeWidth="1.2" opacity="0.7"/>
              </g>
            );
          })}
          {/* Strands */}
          <path d={pathL} fill="none" stroke={`url(#dna-grad-${idx})`} strokeWidth="2.8"
                strokeLinecap="round"/>
          <path d={pathR} fill="none" stroke="#9ef9e3" strokeWidth="2" strokeLinecap="round"
                opacity="0.85"/>
          {/* Nucleotide nodes — small glowing dots on each rung */}
          {rungs.map((r, i) => (
            <g key={`node-${i}`}>
              <circle cx={r.xL} cy={r.y} r="2.6" fill="#5bf2d4"/>
              <circle cx={r.xR} cy={r.y} r="2.6" fill="#5bf2d4"/>
            </g>
          ))}
        </g>

        {/* Base-pair letters along helix (subset, behind a small fade window) */}
        <g className="dna-letters">
          {rungs.map((r, i) => {
            if (!r.visible) return null;
            // fade based on distance from head
            const dist = Math.abs(headY - r.y);
            const op = clamp01(1 - dist / 130) * 0.75;
            if (op < 0.05) return null;
            const midX = (r.xL + r.xR) / 2;
            return (
              <g key={`lbl-${i}`} opacity={op}>
                <text x={r.xL - 2} y={r.y - 5} textAnchor="end"
                      fontFamily="JetBrains Mono, monospace" fontSize="9"
                      fill="#5bf2d4" fontWeight="600">{r.pair[0]}</text>
                <text x={r.xR + 2} y={r.y - 5}
                      fontFamily="JetBrains Mono, monospace" fontSize="9"
                      fill="#5bf2d4" fontWeight="600">{r.pair[1]}</text>
              </g>
            );
          })}
        </g>

        {/* Scan head — bright horizontal beam */}
        {headT < 1 && (
          <g>
            <rect x="16" y={headY - 1} width={cardW - 32} height="2"
                  fill="#5bf2d4" opacity="0.85"/>
            <rect x="16" y={headY - 8} width={cardW - 32} height="16"
                  fill={`url(#dna-grad-${idx})`} opacity="0.18"/>
            <circle cx={cx - amp - 6} cy={headY} r="3" fill="#fff"/>
            <circle cx={cx + amp + 6} cy={headY} r="3" fill="#fff"/>
          </g>
        )}

        {/* Bottom emitter pad */}
        <g>
          <line x1="40" y1={botY + 22} x2={cardW - 40} y2={botY + 22}
                stroke="#19e6c4" strokeWidth="1.4" opacity="0.7"/>
          <line x1="60" y1={botY + 28} x2={cardW - 60} y2={botY + 28}
                stroke="#19e6c4" strokeWidth="1" opacity="0.4"/>
        </g>
      </svg>

      {/* HUD overlays */}
      <div className="dna-hud-tl">
        <div className="dna-tag">GENOME_{String(idx + 1).padStart(2, "0")}</div>
        <div className="dna-sub">SEQ.dat</div>
      </div>
      <div className="dna-hud-tr">
        <div className="dna-pct">{String(pct).padStart(3, "0")}<span>%</span></div>
        <div className="dna-sub">DECODE</div>
      </div>

      <div className="dna-hud-bottom">
        <div className="dna-bar">
          <div className="dna-bar-fill" style={{ width: `${pct}%` }}></div>
          <div className="dna-bar-ticks"></div>
        </div>
        <div className="dna-status-row">
          <span className="dna-status-lbl">▸ DECODING SEQUENCE</span>
          <span className="dna-status-bp">{streamText}</span>
        </div>
      </div>

      {/* Corner brackets */}
      <span className="dna-bracket tl"></span>
      <span className="dna-bracket tr"></span>
      <span className="dna-bracket bl"></span>
      <span className="dna-bracket br"></span>
    </div>
  );
}

// ─── Single card slot ────────────────────────────────────────
function DraftCardAnim({ card, idx, anim, picked, dimmed, onClick, tick, burstStart, cardRef }) {
  const t = TIER_DEFS[card.tier];
  const { phase, face, scaleX, revealed, dnaProgress, matProgress } = anim;

  // Pulse + shimmer (only after fully revealed)
  const pulse = (Math.sin(tick * 0.10) + 1) / 2;
  const borderW = 1 + pulse * 1.5;
  const shimmerCycle = 290 + 60;
  const shimmerX = ((tick * 1.6) % shimmerCycle) - 60;

  // Hologram flicker — rare quick dimming
  const flick = ((tick * 13) % 211) < 2 ? 0.78 : 1;

  // Materialize visuals: card fades in, DNA fades out
  const dnaOpacity = phase === "materialize" ? (1 - easeIn(matProgress)) : (phase === "dna" || phase === "pad" ? 1 : 0);
  const cardOpacity =
    phase === "pad" ? 0 :
    phase === "dna" ? 0 :
    phase === "materialize" ? easeOut(matProgress) :
    1;
  const cardScale = phase === "materialize" ? 0.94 + 0.06 * easeOut(matProgress) : 1;
  const cardClipY = phase === "materialize" ? `inset(${(1 - matProgress) * 100}% 0 0 0)` : "none";

  // The slot is always present (so DNA has a place to render)
  return (
    <div className={`draft-card-slot phase-${phase}`} ref={cardRef}>
      {/* Hologram projector base — visible whenever entry sequence isn't complete */}
      {(phase === "pad" || phase === "dna" || phase === "materialize") && (
        <div className="holo-pad" style={{ opacity: 1 - matProgress * 0.6, display: "none" }}>
          <div className="holo-pad-ring"></div>
          <div className="holo-pad-ring r2"></div>
          <div className="holo-pad-core"></div>
          <div className="holo-pad-beam"></div>
        </div>
      )}

      {/* DNA download overlay */}
      {(phase === "dna" || phase === "materialize") && (
        <div className="dna-wrap" style={{ opacity: dnaOpacity }}>
          <DNADownload progress={dnaProgress} idx={idx} tick={tick}/>
        </div>
      )}

      {/* The actual card — fades in during materialize, then interactive */}
      <button
        className={`draft-card-anim tier-${card.tier} ${picked ? "picked" : ""} ${dimmed ? "dimmed" : ""} ${revealed ? "revealed" : ""} ${phase === "materialize" ? "materializing" : ""} ${face === "back" ? "is-back hologram" : "is-front"}`}
        onClick={onClick}
        disabled={phase === "pad" || phase === "dna"}
        style={{
          "--tc": t.color,
          "--tg": t.glow,
          opacity: cardOpacity * flick,
          transform: `scale(${cardScale}) scaleX(${scaleX})`,
          clipPath: cardClipY,
          pointerEvents: cardOpacity > 0.5 ? "auto" : "none",
        }}
      >
        {face === "back" ? (
          <CardBack card={card} idx={idx} tick={tick}/>
        ) : (
          <CardFront card={card} tier={t} pulseBorderW={borderW} pulse={pulse} shimmerX={shimmerX} revealed={revealed} />
        )}
      </button>
    </div>
  );
}

function CardBack({ card, idx, tick }) {
  // Subtle chromatic split that drifts
  const split = 0.6 + Math.sin((tick ?? 0) * 0.04) * 0.4;
  // Rolling base-pair readout
  const stream = [];
  for (let i = 0; i < 12; i++) {
    stream.push(NUCLEOTIDES[(i * 5 + idx * 3 + (tick ?? 0)) % 4]);
  }
  return (
    <div className="dc-face dc-back holo-back">
      <div className="dc-back-inner">
        <div className="dcb-h">
          <span className="dcb-id">GENOME_#{card.id.toUpperCase().slice(0, 4)}</span>
          <span>SLOT {((idx ?? 0) + 1).toString().padStart(2, "0")}</span>
        </div>
        <div className="dcb-center">
          <div className="dcb-helix" aria-hidden="true">
            <svg viewBox="0 0 96 96" width="96" height="96">
              {(() => {
                const pts = [];
                for (let i = 0; i <= 14; i++) {
                  const t = i / 14;
                  const y = 6 + t * 84;
                  const phase = t * Math.PI * 2.4 + (tick ?? 0) * 0.06;
                  pts.push({
                    y,
                    xL: 48 + Math.sin(phase) * 22,
                    xR: 48 + Math.sin(phase + Math.PI) * 22,
                  });
                }
                const pL = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.xL.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
                const pR = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.xR.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
                return (
                  <g>
                    {pts.filter((_, i) => i % 2 === 0).map((p, i) => (
                      <line key={i} x1={p.xL} y1={p.y} x2={p.xR} y2={p.y}
                            stroke="#19e6c4" strokeWidth="1" opacity="0.55"/>
                    ))}
                    <path d={pL} fill="none" stroke="#5bf2d4" strokeWidth="1.8"/>
                    <path d={pR} fill="none" stroke="#19e6c4" strokeWidth="1.8" opacity="0.85"/>
                  </g>
                );
              })()}
            </svg>
          </div>
          <div className="dcb-status" data-text="CONFIRMED ANOMALY" style={{ "--split": `${split}px` }}>CONFIRMED ANOMALY</div>
          <div className="dcb-sub">DNA VERIFIED · TAP TO TELEPORT</div>
        </div>
        <div className="dcb-foot">
          <span className="dcb-stream">{stream.join("")}</span>
          <span className="dcb-tap">▸ TAP TO REVEAL</span>
        </div>
      </div>
    </div>
  );
}

function CardFront({ card, tier, pulseBorderW, pulse, shimmerX, revealed }) {
  const frontStyle = revealed
    ? { borderWidth: `${pulseBorderW}px`, boxShadow: `0 0 ${20 + pulse * 30}px ${tier.color}, inset 0 0 ${18 + pulse * 14}px ${tier.color}55` }
    : undefined;
  return (
    <div className="dc-face dc-front" style={frontStyle}>
      <div className="dc-tier-label">{tier.label}</div>
      <div className="dc-card">
        <div className="dc-head">
          <span className="dc-pos" style={{ background: POS_COLORS_D[card.position] }}>{card.position}</span>
          <span className="dc-ovr">{card.overall}</span>
        </div>
        <div className="dc-portrait">
          <img src="assets/idle.gif" className="px-sprite dc-sprite" alt="" />
          <div className="dc-shine"></div>
        </div>
        <div className="dc-name">{card.name}</div>
        <div className="dc-stats">
          <StatRow lbl="SPD" val={card.spd} color="#22d3ee" />
          <StatRow lbl="DEX" val={card.dex} color="#a855f7" />
          <StatRow lbl="JMP" val={card.jmp} color="#22c55e" />
          <StatRow lbl="ACC" val={card.acc} color="#fb923c" />
        </div>
        <div className={`dc-ability ${card.ability ? "has" : "none"}`}>
          {card.ability || "NO ABILITY"}
        </div>
      </div>
      {/* Shimmer sweep */}
      {revealed && (
        <div className="dc-shimmer"
             style={{ transform: `translateX(${shimmerX}px) rotate(-18deg)` }}></div>
      )}
    </div>
  );
}

function StatRow({ lbl, val, color }) {
  return (
    <div className="dc-stat">
      <span className="dc-stat-lbl">{lbl}</span>
      <span className="dc-stat-bar">
        <span className="dc-stat-fill" style={{ width: `${val}%`, background: color, boxShadow: `0 0 6px ${color}90` }}></span>
      </span>
      <span className="dc-stat-val">{val}</span>
    </div>
  );
}

// ─── Draft root ──────────────────────────────────────────────
function DraftView({ onBack }) {
  const [cards, setCards] = useStateD(() => [genCard(), genCard(), genCard()]);
  const [flipTicks, setFlipTicks] = useStateD([null, null, null]);
  const [picked, setPicked] = useStateD(null);
  const [draftCount, setDraftCount] = useStateD(8);
  const [seqKey, setSeqKey] = useStateD(0);
  const [started, setStarted] = useStateD(false);
  const [running, setRunning] = useStateD(false);
  const [randomPlanetIdx, setRandomPlanetIdx] = useStateD(Math.floor(Math.random() * 6));
  const [universeId, setUniverseId] = useStateD(Math.floor(Math.random() * 1000).toString().padStart(3, "0"));
  const [tick, restartTick] = useTick(running);
  const cardRefs = [useRefD(null), useRefD(null), useRefD(null)];

  const startDraft = () => {
    setStarted(true);
    setRunning(true);
    setRandomPlanetIdx(Math.floor(Math.random() * 6)); // randomize from 6 planets at draft start
    setUniverseId(Math.floor(Math.random() * 1000).toString().padStart(3, "0")); // randomize universe ID
  };

  // Reset when seqKey changes
  useEffectD(() => {
    restartTick();
  }, [seqKey]);

  const allRevealed = flipTicks.every(ft => ft != null && tick >= ft + FLIP_DUR);
  const noneFlipped = flipTicks.every(ft => ft == null);

  // Entry sequence complete once all 3 cards have materialized
  const entryEndTick = DNA_ENTRY_DELAY + 2 * DNA_START_STAGGER + DNA_DUR + MATERIALIZE_DUR;
  const entryDone = tick >= entryEndTick;

  const handleCardClick = (i) => {
    if (!entryDone) return;
    if (picked != null) return;
    if (flipTicks[i] == null) {
      // Trigger this card's flip a few ticks in the future for the squeeze anim
      const fStart = tick + 4;
      setFlipTicks(ft => ft.map((v, j) => j === i ? fStart : v));
    } else if (allRevealed) {
      setPicked(i);
    }
  };

  const flipAll = () => {
    if (!entryDone) return;
    // Relative to current tick so the rAF can show the squeeze in real time
    setFlipTicks([tick + 6, tick + 18, tick + 30]);
  };

  const reroll = () => {
    if (draftCount <= 0) return;
    setFlipTicks([null, null, null]);
    setPicked(null);
    setCards([genCard(), genCard(), genCard()]);
    setDraftCount(c => c - 1);
    setSeqKey(k => k + 1);
  };

  const confirmPick = () => {
    setDraftCount(c => Math.max(0, c - 1));
    setTimeout(() => {
      setFlipTicks([null, null, null]);
      setPicked(null);
      setCards([genCard(), genCard(), genCard()]);
      setStarted(false); // reset to show "INITIATE DRAFT SEQUENCE" button again
      setRunning(false);
      setSeqKey(k => k + 1);
    }, 1400);
  };

  // Burst centers (in 1920x1080 viewport space)
  const burstCenters = [
    { x: 1920 * 0.30, y: 1080 * 0.50 },
    { x: 1920 * 0.50, y: 1080 * 0.50 },
    { x: 1920 * 0.70, y: 1080 * 0.50 },
  ];

  const phase = !entryDone
    ? "downloading"
    : (picked != null
        ? "confirmed"
        : (noneFlipped ? "ready" : (allRevealed ? "revealed" : "revealing")));

  return (
    <div className={`draft ${!entryDone ? "is-downloading" : ""}`}>
      <div className="draft-topnav">
        <button className="back-btn" onClick={onBack}>
          <span className="bk-glyph">◀</span>
          <span>READY ROOM</span>
        </button>
        <div className="draft-title">
          <span className="dt-big">DRAFT</span>
          <span className="dt-sub">RECRUITS FROM THE MULTIVERSE</span>
        </div>
        <div className="draft-packs">
          <span className="dp-lbl">PACKS</span>
          <span className="dp-val">{draftCount}</span>
        </div>
      </div>

      <div className="available-h">
        <span className="ah-line"></span>
        <span className="ah-label">
          {tick < SCAN_S1_END ? "ANOMALY SCAN" :
           tick < SCAN_S2_END ? "UNIVERSE LOCATOR" :
           tick < SCAN_S3_END ? "DNA ACQUISITION" :
           !entryDone         ? "PROJECTING GENOMES" :
                                "AVAILABLE PLAYERS"}
        </span>
        <span className="ah-line"></span>
      </div>

      <div className="draft-cards">
        {cards.map((c, i) => {
          const anim = getCardPhase(tick, i, flipTicks[i]);
          return (
            <DraftCardAnim
              key={`${seqKey}-${c.id}`}
              card={c}
              idx={i}
              anim={anim}
              picked={picked === i}
              dimmed={picked != null && picked !== i}
              onClick={() => handleCardClick(i)}
              tick={tick}
              burstStart={flipTicks[i] != null ? flipTicks[i] + FLIP_HALF + BURST_DELAY : null}
              cardRef={cardRefs[i]}
            />
          );
        })}
      </div>

      {/* Start Draft button — shown until user clicks to begin */}
      {!started && (
        <div className="draft-start-overlay">
          <button className="draft-start-btn" onClick={startDraft}>
            <span className="dsb-bracket">[</span>
            <span className="dsb-text">INITIATE DRAFT SEQUENCE</span>
            <span className="dsb-bracket">]</span>
          </button>
          <div className="draft-start-hint">▸ CLICK TO BEGIN ANOMALY SCAN</div>
        </div>
      )}

      {/* Pre-DNA Anomaly Scan overlay — radar → locate → acquire.
          Lives at .draft level so its 1920×1080 viewBox aligns with the design canvas. */}
      {started && <AnomalyScan tick={tick} universeId={universeId}/>}

      {/* Planet orbit animation — spheres rotating and locking */}
      {started && <PlanetOrbit tick={tick} lockedPlanetIdx={randomPlanetIdx} universeId={universeId}/>}

      {/* Burst overlays — rendered above cards, full viewport */}
      <div className="burst-stack" aria-hidden="true">
        {cards.map((c, i) => {
          const def = TIER_DEFS[c.tier];
          // Only burst on gold or blue (rarity ≥ 1)
          if (def.rarity < 1) return null;
          if (flipTicks[i] == null) return null;
          const burstStart = flipTicks[i] + FLIP_HALF + BURST_DELAY;
          return (
            <BurstOverlay
              key={`${seqKey}-burst-${i}`}
              card={c}
              originX={burstCenters[i].x}
              originY={burstCenters[i].y}
              startTick={burstStart}
              tick={tick}
            />
          );
        })}
      </div>

      <div className="draft-actions">
        {phase === "downloading" && (
          <div className="da-hint pulse">
            {tick < SCAN_S1_END ? "▸ SCANNING FOR ANOMALIES" :
             tick < SCAN_S2_END ? "▸ LOCATING UNIVERSE" :
             tick < SCAN_S3_END ? "▸ ACQUIRING DNA" :
                                  "▸ DOWNLOADING GENETIC DATA"}
            <span className="dots">...</span>
          </div>
        )}
        {phase === "ready" && (
          <>
            <button className="da-btn ghost" onClick={reroll} disabled={draftCount <= 0}>
              <span>↺</span><span>NEW PACK</span>
            </button>
            <button className="da-btn primary" onClick={flipAll}>
              <span>⚡</span><span>FLIP ALL</span>
            </button>
            <div className="da-hint">OR · TAP A CARD TO FLIP IT</div>
          </>
        )}
        {phase === "revealing" && (
          <div className="da-hint pulse">REVEALING<span className="dots">...</span></div>
        )}
        {phase === "revealed" && (
          <>
            <button className="da-btn ghost" onClick={reroll} disabled={draftCount <= 0}>
              <span>↺</span><span>REROLL ({draftCount})</span>
            </button>
            <div className="da-hint pulse">TAP A CARD TO DRAFT IT</div>
          </>
        )}
        {phase === "confirmed" && (
          <>
            <button className="da-btn primary big" onClick={confirmPick}>
              <span>✓</span><span>CONFIRM · {cards[picked].name}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

window.DraftView = DraftView;

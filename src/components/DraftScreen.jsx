import React from 'react';
import './DraftScreen.css';
import { JERSEY_BASE } from '../constants.js';
import { IDLE_FRAMES, RUN_FRAMES } from '../sprites/index.js';
import { ABILITIES } from '../abilities.js';
import { playSelect, playCancel, playFlip } from '../sound/ui.js';
import { playRare } from '../sound/basketball.js';
import { trpc } from '../trpc.js';
import { BballTip } from './BballTip.jsx';

// ─── Layout / roster constants ─────────────────────────────────────────────
const ROSTER_SIZE = 5;
const POS_ORDER   = ['PG', 'SG', 'SF', 'PF', 'C'];

const POS_COLORS = {
  PG: '#3ea6ff', SG: '#a855f7', SF: '#19e6c4', PF: '#ff7a3c', C: '#ffc94a',
};

// Tier defs: gold = OVR≥71 (best, biggest burst), blue = OVR 64-70, silver = OVR 58-63, common = OVR<58
const TIER_DEFS = {
  common: { label: 'COMMON',     color: '#b0b8c8', glow: '#d8dde6', rarity: 0, burstDur: 0,   burstSpeed: 0, sparkles: 0  },
  silver: { label: 'UNCOMMON',   color: '#b0b8c8', glow: '#d8dde6', rarity: 0, burstDur: 0,   burstSpeed: 0, sparkles: 0  },
  blue:   { label: 'RARE',       color: '#30c0e0', glow: '#60d8f0', rarity: 1, burstDur: 138, burstSpeed: 5, sparkles: 12 },
  gold:   { label: 'ULTRA RARE', color: '#ffc94a', glow: '#ffe080', rarity: 2, burstDur: 175, burstSpeed: 7, sparkles: 20 },
};
function getPlayerTierKey(ovr, ability) { if (ability) return 'gold'; return ovr >= 76 ? 'gold' : ovr >= 68 ? 'blue' : ovr >= 62 ? 'silver' : 'common'; }
function tierToRarity(ovr, ability) { if (ability) return 'ultra_rare'; return ovr >= 76 ? 'ultra_rare' : ovr >= 68 ? 'super_rare' : ovr >= 62 ? 'rare' : 'common'; }

const ABILITY_RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };

// ─── Player generation ─────────────────────────────────────────────────────
const FIRST_NAMES = [
  'KAEL','ZEX','JAX','REX','ACE','NOVA','ZEPH','AXEL','RYX','LYRA',
  'THOR','KADE','CRIX','ZEN','NUX','RYZE','SKAR','TYX','BRIX','MAVE',
  'WREN','CROW','NERO','VAEL','GRIX','VOSS','XION','LORE','DRACE','FLUX',
];
const LAST_NAMES = [
  'THORNE','STEELE','FROST','STRAND','VORN','KRIX','VOLKOV','MORKOV','FERRON','KRUXX',
  'NEXUS','BLADE','SURGE','DRIFT','ECHO','CROSS','MARCH','NACHT','CRANE','PHASE',
  'VALE','QUILL','STORR','VANCE','GALE','BLAZE','WARD','AEON','FREY','ZORN',
];
const STAT_RANGES = {
  PG: { spd:[42,99], dex:[35,95], jmp:[20,82], acc:[35,95] },
  SG: { spd:[32,92], dex:[38,99], jmp:[22,82], acc:[42,99] },
  SF: { spd:[30,92], dex:[30,92], jmp:[30,92], acc:[30,92] },
  PF: { spd:[18,72], dex:[22,78], jmp:[38,99], acc:[22,78] },
  C:  { spd:[15,62], dex:[15,62], jmp:[42,99], acc:[18,70] },
};
const OVR_WEIGHTS = {
  PG: { spd:0.35, dex:0.30, jmp:0.10, acc:0.25 },
  SG: { spd:0.20, dex:0.30, jmp:0.15, acc:0.35 },
  SF: { spd:0.25, dex:0.25, jmp:0.25, acc:0.25 },
  PF: { spd:0.15, dex:0.25, jmp:0.35, acc:0.25 },
  C:  { spd:0.10, dex:0.20, jmp:0.45, acc:0.25 },
};
function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function generateStats(pos) {
  const r = STAT_RANGES[pos];
  return { spd:randInt(r.spd[0],r.spd[1]), dex:randInt(r.dex[0],r.dex[1]), jmp:randInt(r.jmp[0],r.jmp[1]), acc:randInt(r.acc[0],r.acc[1]) };
}
function calcOvr(pos, stats) {
  const w = OVR_WEIGHTS[pos];
  return Math.round(stats.spd*w.spd + stats.dex*w.dex + stats.jmp*w.jmp + stats.acc*w.acc);
}
function generateDraftPool() {
  const firsts = [...FIRST_NAMES].sort(() => Math.random()-0.5);
  const lasts  = [...LAST_NAMES].sort(() => Math.random()-0.5);
  let i=0, id=1;
  return POS_ORDER.flatMap(pos =>
    Array.from({ length:3 }, () => {
      const stats = generateStats(pos);
      const ovr   = calcOvr(pos, stats);
      const lastName = lasts[i++];
      return { id:id++, pos, name:`${firsts[i-1]} ${lastName}`, lastName, ...stats, ovr };
    })
  );
}
function rollAbilityForPlayer(ovr) {
  const bonus  = Math.max(0, Math.floor((ovr-65)/5)) * 0.05;
  const chance = Math.min(0.55, 0.25+bonus);
  if (ovr < 76 && Math.random() >= chance) return null;
  const lw = ovr>=75 ? 15 : ovr>=70 ? 8 : 3;
  const ew = ovr>=70 ? 25 : 18;
  const pool = ABILITIES.flatMap(a => Array(a.rarity===3 ? lw : a.rarity===2 ? ew : 40).fill(a));
  return pool[Math.floor(Math.random()*pool.length)];
}

// ─── Animation timing ──────────────────────────────────────────────────────
const SCAN_S1_END       = 65;
const SCAN_S2_END       = 120;
const SCAN_S3_END       = 180;
const SCAN_FADE         = 162;

const PLANET_ANIM_START = 148;
const PLANET_ANIM_DUR   = 94;
const PLANET_ANIM_END   = PLANET_ANIM_START + PLANET_ANIM_DUR;
const PLANET_LOCK_START = PLANET_ANIM_END;
const PLANET_LOCK_DUR   = 38;
const PLANET_WAIT_START = PLANET_LOCK_START + PLANET_LOCK_DUR;
const PLANET_WAIT_DUR   = 72;
const PLANET_WAIT_END   = PLANET_WAIT_START + PLANET_WAIT_DUR;

const DNA_ENTRY_DELAY   = PLANET_WAIT_END + 60;
const DNA_START_STAGGER = 7;
const DNA_DUR           = 36;
const MATERIALIZE_DUR   = 18;
const FLIP_DUR          = 24;
const FLIP_HALF         = 12;
const BURST_DELAY       = 4;

// Tick at which all 3 cards have finished materializing
const ENTRY_END_TICK = DNA_ENTRY_DELAY + 2*DNA_START_STAGGER + DNA_DUR + MATERIALIZE_DUR;

const BASE_PAIRS  = [['A','T'],['T','A'],['G','C'],['C','G']];
const NUCLEOTIDES = 'ATCG';

function easeIn(t)  { return t*t; }
function easeOut(t) { return 1-(1-t)*(1-t); }
function clamp01(t) { return Math.max(0, Math.min(1, t)); }

// ─── Mini idle sprite (replaces idle.gif) ─────────────────────────────────
const SPRITE_SCALE = 5;

function MiniPlayerSVG({ jerseyColor, phase = 0 }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 120);
    return () => clearInterval(id);
  }, []);
  const frame = IDLE_FRAMES[(tick + phase) % IDLE_FRAMES.length];
  return (
    <svg
      width={11 * SPRITE_SCALE}
      height={16 * SPRITE_SCALE}
      shapeRendering="crispEdges"
      style={{ imageRendering:'pixelated', display:'block' }}>
      {frame.map(([px, py, col], i) => (
        <rect key={i}
          x={px * SPRITE_SCALE} y={py * SPRITE_SCALE}
          width={SPRITE_SCALE} height={SPRITE_SCALE}
          fill={col === JERSEY_BASE ? jerseyColor : col} />
      ))}
    </svg>
  );
}

// ─── Burst overlay ─────────────────────────────────────────────────────────
function BurstOverlay({ card, originX, originY, startTick, tick }) {
  if (startTick == null) return null;
  if (!card.ability) return null;
  const tierKey = getPlayerTierKey(card.ovr, card.ability);
  const def = TIER_DEFS[tierKey];

  const t = tick - startTick;
  if (t < 0 || t > def.burstDur) return null;
  const progress = t / def.burstDur;

  const beamColors = ['#ff2040','#ff8020','#ffe040','#40e870','#2070ff','#a040ff','#ff40e0'];
  const tileSize   = 1800;
  const beamOffset = (t * def.burstSpeed * 3) % tileSize;
  const flashOpacity = Math.max(0, 1 - t/8);
  const ringR  = t * 11;
  const ringOp = Math.max(0, 1 - t/60);
  const ringStroke = Math.max(0.5, 6*(1-t/60));

  const sparkles = [];
  for (let i=0; i<def.sparkles; i++) {
    const angle = (i/def.sparkles)*Math.PI*2;
    const dist = t * 6.5;
    sparkles.push({
      x: originX + Math.cos(angle)*dist,
      y: originY + Math.sin(angle)*dist,
      op: Math.max(0, 1-t/80),
    });
  }

  return (
    <div className="burst-overlay" style={{ pointerEvents:'none' }}>
      <div className="burst-beams" style={{
        backgroundImage: `repeating-linear-gradient(135deg,
          ${beamColors[0]} 0px, ${beamColors[0]} 220px,
          ${beamColors[1]} 220px, ${beamColors[1]} 480px,
          ${beamColors[2]} 480px, ${beamColors[2]} 720px,
          ${beamColors[3]} 720px, ${beamColors[3]} 980px,
          ${beamColors[4]} 980px, ${beamColors[4]} 1240px,
          ${beamColors[5]} 1240px, ${beamColors[5]} 1520px,
          ${beamColors[6]} 1520px, ${beamColors[6]} 1800px)`,
        backgroundPosition: `${-beamOffset}px ${-beamOffset}px`,
        opacity: 0.85 * (1 - progress*0.7),
      }} />
      <div className="burst-flash" style={{ opacity: flashOpacity }} />
      <svg className="burst-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <circle cx={originX} cy={originY} r={ringR}
          fill="none" stroke="#fff" strokeWidth={ringStroke} opacity={ringOp} />
        {sparkles.map((s,i) => (
          <g key={i} opacity={s.op}>
            <circle cx={s.x} cy={s.y} r="4" fill="#fff" />
            <circle cx={s.x} cy={s.y} r="8" fill="#fff" opacity="0.4" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Anomaly Scan ──────────────────────────────────────────────────────────
function AnomalyScan({ tick, universeId }) {
  if (tick >= SCAN_S3_END) return null;
  const stage = tick < SCAN_S1_END ? 'scanning' : tick < SCAN_S2_END ? 'locating' : 'acquiring';
  const fadeOpacity = tick >= SCAN_FADE ? clamp01(1-(tick-SCAN_FADE)/(SCAN_S3_END-SCAN_FADE)) : 1;
  const TARGET_ANGLE = -38;
  let sweepAngle;
  if (stage === 'scanning') {
    sweepAngle = (tick*2.6)%360;
  } else if (stage === 'locating') {
    const p = (tick-SCAN_S1_END)/(SCAN_S2_END-SCAN_S1_END);
    const eased = easeOut(p);
    sweepAngle = ((tick*2.6*(1-eased))%360)*(1-eased) + TARGET_ANGLE*eased;
  } else {
    sweepAngle = TARGET_ANGLE;
  }
  const blips = [
    { id:0, angle:124, dist:0.62, appearTick:6  },
    { id:1, angle:218, dist:0.84, appearTick:14 },
    { id:2, angle:TARGET_ANGLE, dist:0.56, appearTick:28, selected: stage!=='scanning' },
    { id:3, angle:305, dist:0.40, appearTick:38 },
    { id:4, angle:88,  dist:0.78, appearTick:47 },
    { id:5, angle:168, dist:0.70, appearTick:56 },
  ];
  const anomaliesFound = blips.filter(b => tick >= b.appearTick).length;
  return (
    <div className="anomaly-scan" style={{ opacity:fadeOpacity }}>
      <div className="as-grid" />
      <div className="as-radar-wrap">
        <span className="as-bracket tl" />
        <span className="as-bracket tr" />
        <span className="as-bracket bl" />
        <span className="as-bracket br" />
        <RadarSVG sweepAngle={sweepAngle} blips={blips} tick={tick} stage={stage} />
        <div className="as-radar-h">
          <span className="as-radar-tag">ANOMALY · DETECT</span>
          <span className="as-radar-id">SCN.{(tick*3|0).toString(16).toUpperCase().padStart(4,'0')}</span>
        </div>
      </div>
      <ScanReadout tick={tick} stage={stage} anomaliesFound={anomaliesFound} universeId={universeId} />
    </div>
  );
}

function RadarSVG({ sweepAngle, blips, tick, stage }) {
  const size=360, cx=size/2, cy=size/2, R=size/2-10;
  const armRad   = sweepAngle*Math.PI/180;
  const trailRad = (sweepAngle-55)*Math.PI/180;
  const armX = cx+R*Math.cos(armRad), armY = cy+R*Math.sin(armRad);
  const trailX = cx+R*Math.cos(trailRad), trailY = cy+R*Math.sin(trailRad);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="as-radar-svg" width={size} height={size}>
      <defs>
        <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(8,40,32,0.92)" />
          <stop offset="70%"  stopColor="rgba(3,20,16,0.72)" />
          <stop offset="100%" stopColor="rgba(2,8,10,0.35)" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#radarBg)" stroke="rgba(25,230,196,0.8)" strokeWidth="1.5" />
      {[0.22,0.45,0.68,0.88].map((f,i) => (
        <circle key={i} cx={cx} cy={cy} r={R*f} fill="none"
          stroke="rgba(25,230,196,0.2)" strokeWidth="1"
          strokeDasharray={i%2 ? '3 5' : 'none'} />
      ))}
      <line x1={cx-R} y1={cy} x2={cx+R} y2={cy} stroke="rgba(25,230,196,0.16)" strokeWidth="1" />
      <line x1={cx} y1={cy-R} x2={cx} y2={cy+R} stroke="rgba(25,230,196,0.16)" strokeWidth="1" />
      {[0,45,90,135,180,225,270,315].map(a => {
        const rad=a*Math.PI/180, major=a%90===0, len=major?12:7;
        return <line key={a}
          x1={cx+Math.cos(rad)*(R-len)} y1={cy+Math.sin(rad)*(R-len)}
          x2={cx+Math.cos(rad)*R}       y2={cy+Math.sin(rad)*R}
          stroke="#5bf2d4" strokeWidth={major?2:1} opacity={major?1:0.5} />;
      })}
      <path d={`M ${cx} ${cy} L ${armX} ${armY} A ${R} ${R} 0 0 0 ${trailX} ${trailY} Z`}
        fill="rgba(91,242,212,0.16)" />
      <line x1={cx} y1={cy} x2={armX} y2={armY}
        stroke="#5bf2d4" strokeWidth="2" filter="drop-shadow(0 0 6px #5bf2d4)" />
      {blips.map(b => {
        if (tick < b.appearTick) return null;
        const age = tick-b.appearTick;
        const rad=b.angle*Math.PI/180;
        const bx=cx+Math.cos(rad)*R*b.dist, by=cy+Math.sin(rad)*R*b.dist;
        const pulsePhase=age%28;
        const locked = b.selected && (stage==='locating'||stage==='acquiring');
        const color  = locked ? '#ff3a6a' : '#5bf2d4';
        return (
          <g key={b.id}>
            <circle cx={bx} cy={by} r={4+pulsePhase*0.85} fill="none"
              stroke={color} strokeWidth="1" opacity={Math.max(0,1-pulsePhase/28)} />
            <circle cx={bx} cy={by} r="3" fill={color} filter={`drop-shadow(0 0 4px ${color})`} />
            {locked && <>
              <line x1={bx-18} y1={by} x2={bx-7}  y2={by} stroke="#ff3a6a" strokeWidth="1.5" />
              <line x1={bx+7}  y1={by} x2={bx+18} y2={by} stroke="#ff3a6a" strokeWidth="1.5" />
              <line x1={bx} y1={by-18} x2={bx} y2={by-7}  stroke="#ff3a6a" strokeWidth="1.5" />
              <line x1={bx} y1={by+7}  x2={bx} y2={by+18} stroke="#ff3a6a" strokeWidth="1.5" />
              <circle cx={bx} cy={by} r="15" fill="none" stroke="#ff3a6a" strokeWidth="1" strokeDasharray="3 3" opacity="0.65" />
            </>}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="2" fill="#5bf2d4" />
      <circle cx={cx} cy={cy} r="5" fill="none" stroke="#5bf2d4" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

function ScanReadout({ tick, stage, anomaliesFound, universeId }) {
  const LOCKED_X = '5471.22', LOCKED_Y = '−2206.84', LOCKED_U = `UNIVERSE ${universeId}`;
  let coordX, coordY, universe;
  if (stage === 'scanning') {
    coordX = (((tick*137)%9999)/100).toFixed(2);
    coordY = (((tick*211)%9999)/100-50).toFixed(2);
    universe = '????·???';
  } else if (stage === 'locating') {
    const p = (tick-SCAN_S1_END)/(SCAN_S2_END-SCAN_S1_END);
    if (p < 0.8) {
      coordX = (((tick*137)%9999)/100).toFixed(2);
      coordY = (((tick*211)%9999)/100-50).toFixed(2);
      const letters='ABCDEFGHJKMNPQRSTVWXYZ';
      universe = letters[tick%letters.length]+'·'+((tick*11)%999).toString().padStart(3,'0')+'·'+letters[(tick*3)%letters.length];
    } else { coordX=LOCKED_X; coordY=LOCKED_Y; universe=LOCKED_U; }
  } else { coordX=LOCKED_X; coordY=LOCKED_Y; universe=LOCKED_U; }

  const statusByStage = {
    scanning:  'SCANNING ANOMALIES',
    locating:  `LOCKING ONTO UNIVERSE ${universeId}`,
    acquiring: `LOCKING ONTO UNIVERSE ${universeId}`,
  };
  return (
    <div className={`as-readout stage-${stage}`}>
      <div className="asr-status">
        <span className="asr-dot" />
        <span className="asr-status-text">▸ {statusByStage[stage]}</span>
        <span className="asr-dotseq" />
      </div>
      <div className="asr-grid">
        <div className="asr-cell"><span className="asr-lbl">X · COORD</span><span className="asr-val">{coordX}</span></div>
        <div className="asr-cell"><span className="asr-lbl">Y · COORD</span><span className="asr-val">{coordY}</span></div>
        <div className="asr-cell"><span className="asr-lbl">UNIVERSE</span><span className={`asr-val ${stage==='acquiring'?'lock':''}`}>{universe}</span></div>
        <div className="asr-cell"><span className="asr-lbl">DETECTED</span><span className="asr-val">{anomaliesFound.toString().padStart(2,'0')} / 06</span></div>
      </div>
    </div>
  );
}

function AcquireBeams({ tick }) {
  const cx=960, cy=480;
  const targets = [
    { x:580, y:855, start:SCAN_S2_END+2  },
    { x:960, y:855, start:SCAN_S2_END+16 },
    { x:1340,y:855, start:SCAN_S2_END+30 },
  ];
  const BEAM_DUR = 26;
  return (
    <svg className="as-beams-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="acqBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(91,242,212,0)" />
          <stop offset="30%"  stopColor="rgba(91,242,212,0.6)" />
          <stop offset="80%"  stopColor="rgba(255,255,255,1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,1)" />
        </linearGradient>
      </defs>
      {targets.map((tg,i) => {
        const localT = tick - tg.start;
        if (localT < 0) return null;
        const p = Math.min(1, localT/BEAM_DUR);
        const fx=cx+(tg.x-cx)*p, fy=cy+(tg.y-cy)*p;
        const dwell = Math.max(0, localT-BEAM_DUR);
        const dwellOp = Math.max(0, 1-dwell/24);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={fx} y2={fy} stroke="rgba(91,242,212,0.3)" strokeWidth="10" strokeLinecap="round" opacity={0.55*Math.max(0.3,dwellOp)} />
            <line x1={cx} y1={cy} x2={fx} y2={fy} stroke="url(#acqBeam)" strokeWidth="3" strokeLinecap="round" />
            <line x1={cx} y1={cy} x2={fx} y2={fy} stroke="#fff" strokeWidth="1.2" strokeDasharray="6 10" strokeDashoffset={-(tick*4)%16} opacity="0.8" />
            {p>=1 && <g>
              <circle cx={tg.x} cy={tg.y} r={6+dwell*1.8} fill="none" stroke="#fff" strokeWidth="2" opacity={dwellOp} />
              <circle cx={tg.x} cy={tg.y} r="5" fill="#fff" opacity={Math.max(0.4,dwellOp)} />
            </g>}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Planet Orbit ──────────────────────────────────────────────────────────
function PlanetOrbit({ tick, lockedPlanetIdx, universeId }) {
  if (tick < PLANET_ANIM_START || tick >= PLANET_WAIT_END) return null;
  const isRotating = tick < PLANET_ANIM_END;
  const rotProg    = isRotating ? (tick-PLANET_ANIM_START)/PLANET_ANIM_DUR : 1;
  const isLocking  = tick >= PLANET_ANIM_END && tick < PLANET_LOCK_START+PLANET_LOCK_DUR;
  const lockProg   = isLocking ? (tick-PLANET_ANIM_END)/PLANET_LOCK_DUR : 0;
  const isWaiting  = tick >= PLANET_WAIT_START && tick < PLANET_WAIT_END;
  const cx=960, cy=520;
  const planets = [
    { radius:150, speed:1.2,  color:'#ff3a6a', size:0.45 },
    { radius:240, speed:0.85, color:'#a855f7', size:1.15 },
    { radius:320, speed:0.55, color:'#3b82f6', size:0.6  },
    { radius:400, speed:0.35, color:'#ffc94a', size:1.25 },
    { radius:480, speed:0.20, color:'#19e6c4', size:0.55 },
    { radius:560, speed:0.12, color:'#22d3ee', size:0.95 },
  ];
  return (
    <svg viewBox="0 0 1920 1080" className="as-planets-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="holoGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {planets.map((p,i) => (
        <ellipse key={`orbit-${i}`} cx={cx} cy={cy}
          rx={p.radius} ry={p.radius*0.25}
          fill="none" stroke="#5bf2d4" strokeWidth="1" opacity="0.18" strokeDasharray="8 4" />
      ))}
      <g filter="url(#holoGlow)">
        <circle cx={cx} cy={cy} r={44} fill="#fff" opacity="0.82" />
        <circle cx={cx} cy={cy} r={44} fill="none" stroke="#5bf2d4" strokeWidth="2" opacity="0.55" />
      </g>
      {planets.map((planet,i) => {
        const baseAngle = (i*120)*Math.PI/180;
        const orbitProg = isRotating ? rotProg*planet.speed*240*Math.PI/180 : planet.speed*240*Math.PI/180;
        const angle = baseAngle + orbitProg;
        const x3d = cx + Math.cos(angle)*planet.radius;
        const y3d = cy + Math.sin(angle)*planet.radius*0.25;
        const z3d = Math.sin(angle)*planet.radius*0.25;
        const depthFactor = (z3d+planet.radius)/(planet.radius*2);
        const displaySize = 32*2*planet.size*(0.6+depthFactor*0.4);
        const isSelected = i === lockedPlanetIdx;
        const boxOpacity = isLocking && isSelected ? Math.min(1,lockProg*2) : 0;
        const boxSize    = displaySize*2.2;
        const boxGlow    = isLocking && isSelected ? Math.sin(lockProg*Math.PI) : 0;
        const waitT      = isWaiting ? tick-PLANET_WAIT_START : PLANET_LOCK_DUR;
        const fadeInProg = isWaiting ? Math.min(1,waitT/30) : 0;
        const inBlink    = isWaiting && waitT>=30 && waitT<120;
        const blinkOn    = inBlink ? (Math.floor(waitT/8)%2===0) : true;
        const pointerOp  = isWaiting ? fadeInProg*(blinkOn?1:0.3) : 0;
        const textOp     = isWaiting ? fadeInProg*(blinkOn?1:0.2) : (lockProg>0.3 ? Math.min(1,(lockProg-0.3)*3) : 0);
        return (
          <g key={i} opacity={0.5+depthFactor*0.5} filter="url(#holoGlow)">
            <defs>
              <radialGradient id={`sph-${i}`} cx="50%" cy="50%" r="65%">
                <stop offset="0%"   stopColor={planet.color} stopOpacity="0.8" />
                <stop offset="60%"  stopColor={planet.color} stopOpacity="0.75" />
                <stop offset="100%" stopColor={planet.color} stopOpacity="0.15" />
              </radialGradient>
              <radialGradient id={`shd-${i}`} cx="65%" cy="65%" r="50%">
                <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
                <stop offset="70%"  stopColor="rgba(0,0,0,0.22)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
              </radialGradient>
              <clipPath id={`pc-${i}`}><circle cx={x3d} cy={y3d} r={displaySize} /></clipPath>
            </defs>
            <circle cx={x3d} cy={y3d} r={displaySize} fill={`url(#sph-${i})`} />
            <circle cx={x3d} cy={y3d} r={displaySize} fill={`url(#shd-${i})`} />
            <circle cx={x3d} cy={y3d} r={displaySize*1.1} fill="none"
              stroke={planet.color} strokeWidth={displaySize*0.14} opacity="0.3" style={{ mixBlendMode:'screen' }} />
            <g clipPath={`url(#pc-${i})`}>
              {Array.from({ length:5 }).map((_,li) => {
                const ly = y3d - displaySize*0.8 + li*displaySize*0.35;
                const dc = Math.abs(ly-y3d);
                const lw = Math.sqrt(Math.max(0,displaySize*displaySize-dc*dc))*1.5;
                return <line key={li} x1={x3d-lw} y1={ly} x2={x3d+lw} y2={ly} stroke="#5bf2d4" strokeWidth="0.6" opacity="0.28" />;
              })}
            </g>
            {isSelected && (
              <g opacity={isWaiting ? 1 : boxOpacity}>
                {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],ci) => (
                  <g key={ci}>
                    <line x1={x3d+sx*boxSize/2} y1={y3d+sy*boxSize/2} x2={x3d+sx*boxSize/2-sx*14} y2={y3d+sy*boxSize/2} stroke="#5bf2d4" strokeWidth="1.5" />
                    <line x1={x3d+sx*boxSize/2} y1={y3d+sy*boxSize/2} x2={x3d+sx*boxSize/2} y2={y3d+sy*boxSize/2-sy*14} stroke="#5bf2d4" strokeWidth="1.5" />
                  </g>
                ))}
                <rect x={x3d-boxSize/2} y={y3d-boxSize/2} width={boxSize} height={boxSize}
                  fill="none" stroke="#5bf2d4" strokeWidth="1.5"
                  opacity={isWaiting ? 0.8 : 0.6+boxGlow*0.4}
                  filter="drop-shadow(0 0 6px #5bf2d4)" />
              </g>
            )}
            {isWaiting && isSelected && <>
              <line x1={x3d} y1={y3d-boxSize/2-16} x2="960" y2="310"
                stroke="#5bf2d4" strokeWidth="1.5" opacity={pointerOp} strokeDasharray="4 4" />
              <g opacity={textOp}>
                <text x="960" y="255" textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace" fontSize="75" fontWeight="700"
                  fill="#5bf2d4" letterSpacing="0.16em"
                  style={{ filter: 'drop-shadow(0 0 12px #5bf2d4)' }}>[ ANOMALY LOCKED ON ]</text>
              </g>
            </>}
          </g>
        );
      })}
      <text x="960" y="820" textAnchor="middle"
        fontFamily="JetBrains Mono, monospace" fontSize="70" fontWeight="700"
        fill="#5bf2d4" letterSpacing="0.2em"
        style={{ filter: 'drop-shadow(0 0 14px #5bf2d4)' }}>UNIVERSE {universeId}</text>
    </svg>
  );
}

// ─── DNA Download ──────────────────────────────────────────────────────────
function DNADownload({ progress, idx, tick }) {
  const cardW=290, cardH=440;
  const cx=cardW/2, topY=70, botY=cardH-120, reach=botY-topY;
  const segments=24, amp=42, twist=tick*0.05;
  const headT = clamp01(progress*1.04);
  const headY = topY + headT*reach;
  const strandL=[], strandR=[], rungs=[];
  for (let i=0; i<=segments; i++) {
    const t=i/segments, y=topY+t*reach, phase=t*Math.PI*3.2+twist;
    const sL=Math.sin(phase), sR=Math.sin(phase+Math.PI);
    strandL.push({ x:cx+sL*amp, y, depth:sL });
    strandR.push({ x:cx+sR*amp, y, depth:sR });
    if (i%2===0) rungs.push({ y, xL:cx+sL*amp, xR:cx+sR*amp, visible:t<=headT, pair:BASE_PAIRS[(i+idx)%4], depthL:sL, depthR:sR });
  }
  const toPath = pts => pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const pct = Math.floor(progress*100);
  const streamChars = [];
  for (let i=0; i<20; i++) streamChars.push(NUCLEOTIDES[(i*7+idx*3+tick)%4]);
  return (
    <div className="dna-dl" style={{ '--dna-headY':`${headY}px` }}>
      <svg viewBox={`0 0 ${cardW} ${cardH}`} className="dna-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`dna-g-${idx}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#5bf2d4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#19e6c4" stopOpacity="0.6" />
          </linearGradient>
          <clipPath id={`dna-c-${idx}`}>
            <rect x="0" y={topY-4} width={cardW} height={Math.max(0,headY-topY+4)} />
          </clipPath>
          <filter id={`dna-f-${idx}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <line x1={cx} y1={topY} x2={cx} y2={botY} stroke="rgba(25,230,196,0.08)" strokeWidth="1" strokeDasharray="2 4" />
        <g clipPath={`url(#dna-c-${idx})`} filter={`url(#dna-f-${idx})`}>
          {rungs.map((r,i) => (
            <line key={`rg-${i}`} x1={r.xL} y1={r.y} x2={r.xR} y2={r.y}
              stroke="#19e6c4" strokeWidth="1.1" opacity={0.35+(Math.abs(r.depthL)+Math.abs(r.depthR))*0.28} />
          ))}
          <path d={toPath(strandL)} fill="none" stroke={`url(#dna-g-${idx})`} strokeWidth="2.6" strokeLinecap="round" />
          <path d={toPath(strandR)} fill="none" stroke="#9ef9e3" strokeWidth="1.9" strokeLinecap="round" opacity="0.82" />
          {rungs.map((r,i) => (
            <g key={`nd-${i}`}>
              <circle cx={r.xL} cy={r.y} r="2.4" fill="#5bf2d4" />
              <circle cx={r.xR} cy={r.y} r="2.4" fill="#5bf2d4" />
            </g>
          ))}
        </g>
        <g className="dna-letters">
          {rungs.map((r,i) => {
            if (!r.visible) return null;
            const dist=Math.abs(headY-r.y);
            const op=clamp01(1-dist/120)*0.72;
            if (op<0.05) return null;
            return (
              <g key={`lb-${i}`} opacity={op}>
                <text x={r.xL-2} y={r.y-4} textAnchor="end" fontFamily="JetBrains Mono,monospace" fontSize="8" fill="#5bf2d4" fontWeight="600">{r.pair[0]}</text>
                <text x={r.xR+2} y={r.y-4} fontFamily="JetBrains Mono,monospace" fontSize="8" fill="#5bf2d4" fontWeight="600">{r.pair[1]}</text>
              </g>
            );
          })}
        </g>
        {headT < 1 && (
          <g>
            <rect x="14" y={headY-1} width={cardW-28} height="2" fill="#5bf2d4" opacity="0.82" />
            <rect x="14" y={headY-7} width={cardW-28} height="14" fill={`url(#dna-g-${idx})`} opacity="0.15" />
            <circle cx={cx-amp-4} cy={headY} r="2.8" fill="#fff" />
            <circle cx={cx+amp+4} cy={headY} r="2.8" fill="#fff" />
          </g>
        )}
        <g>
          <line x1="36" y1={botY+18} x2={cardW-36} y2={botY+18} stroke="#19e6c4" strokeWidth="1.3" opacity="0.65" />
          <line x1="52" y1={botY+24} x2={cardW-52} y2={botY+24} stroke="#19e6c4" strokeWidth="0.9" opacity="0.38" />
        </g>
      </svg>
      <div className="dna-hud-tl">
        <div className="dna-tag">GENOME_{String(idx+1).padStart(2,'0')}</div>
        <div className="dna-sub">SEQ.dat</div>
      </div>
      <div className="dna-hud-tr">
        <div className="dna-pct">{String(pct).padStart(3,'0')}<span>%</span></div>
        <div className="dna-sub">DECODE</div>
      </div>
      <div className="dna-hud-bottom">
        <div className="dna-bar">
          <div className="dna-bar-fill" style={{ width:`${pct}%` }} />
          <div className="dna-bar-ticks" />
        </div>
        <div className="dna-status-row">
          <span className="dna-status-lbl">▸ DECODING SEQUENCE</span>
          <span className="dna-status-bp">{streamChars.join(' ')}</span>
        </div>
      </div>
      <span className="dna-bracket tl" /><span className="dna-bracket tr" />
      <span className="dna-bracket bl" /><span className="dna-bracket br" />
    </div>
  );
}

// ─── Card phase from tick ──────────────────────────────────────────────────
function getCardPhase(tick, idx, flipStart) {
  const dnaStart = DNA_ENTRY_DELAY + idx*DNA_START_STAGGER;
  const dnaEnd   = dnaStart + DNA_DUR;
  const matEnd   = dnaEnd + MATERIALIZE_DUR;
  if (tick < dnaStart) return { phase:'pad', dnaProgress:0, matProgress:0, face:'back', scaleX:1, revealed:false };
  if (tick < dnaEnd) return { phase:'dna', dnaProgress:clamp01((tick-dnaStart)/DNA_DUR), matProgress:0, face:'back', scaleX:1, revealed:false };
  if (tick < matEnd) return { phase:'materialize', dnaProgress:1, matProgress:clamp01((tick-dnaEnd)/MATERIALIZE_DUR), face:'back', scaleX:1, revealed:false };
  let face='back', scaleX=1;
  if (flipStart != null && tick >= flipStart) {
    const ft = tick-flipStart;
    if (ft < FLIP_HALF) { face='back';  scaleX=1-easeIn(ft/FLIP_HALF); }
    else if (ft < FLIP_DUR) { face='front'; scaleX=easeOut((ft-FLIP_HALF)/FLIP_HALF); }
    else { face='front'; scaleX=1; }
  }
  const revealed = flipStart!=null && tick>=flipStart+FLIP_DUR;
  return {
    phase: revealed ? 'revealed' : (flipStart!=null && tick>=flipStart ? 'flipping' : 'back'),
    dnaProgress:1, matProgress:1, face, scaleX, revealed,
  };
}

// ─── Card Back ─────────────────────────────────────────────────────────────
function CardBack({ card, idx, tick }) {
  const split = 0.6+Math.sin((tick??0)*0.04)*0.4;
  const stream = [];
  for (let i=0; i<10; i++) stream.push(NUCLEOTIDES[(i*5+idx*3+(tick??0))%4]);
  return (
    <div className="dc-face dc-back holo-back">
      <div className="dc-back-inner">
        <div className="dcb-h">
          <span className="dcb-id">GENOME_#{card.id.toString().padStart(4,'0')}</span>
          <span>SLOT {((idx??0)+1).toString().padStart(2,'0')}</span>
        </div>
        <div className="dcb-center">
          <div className="dcb-helix">
            <svg viewBox="0 0 80 80" width="80" height="80">
              {(() => {
                const pts=[];
                for (let i=0; i<=12; i++) {
                  const t=i/12, y=5+t*70, phase=t*Math.PI*2.4+(tick??0)*0.06;
                  pts.push({ y, xL:40+Math.sin(phase)*18, xR:40+Math.sin(phase+Math.PI)*18 });
                }
                const pL=pts.map((p,i)=>`${i===0?'M':'L'}${p.xL.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                const pR=pts.map((p,i)=>`${i===0?'M':'L'}${p.xR.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                return (
                  <g>
                    {pts.filter((_,i)=>i%2===0).map((p,i)=>(
                      <line key={i} x1={p.xL} y1={p.y} x2={p.xR} y2={p.y} stroke="#19e6c4" strokeWidth="1" opacity="0.5" />
                    ))}
                    <path d={pL} fill="none" stroke="#5bf2d4" strokeWidth="1.6" />
                    <path d={pR} fill="none" stroke="#19e6c4" strokeWidth="1.6" opacity="0.82" />
                  </g>
                );
              })()}
            </svg>
          </div>
          <div className="dcb-status" data-text="CONFIRMED ANOMALY" style={{ '--split':`${split}px` }}>
            CONFIRMED ANOMALY
          </div>
          <div className="dcb-sub">DNA VERIFIED · TAP TO REVEAL</div>
        </div>
        <div className="dcb-foot">
          <span className="dcb-stream">{stream.join('')}</span>
          <span className="dcb-tap">▸ TAP TO REVEAL</span>
        </div>
      </div>
    </div>
  );
}

// ─── Card Front ────────────────────────────────────────────────────────────
function CardFront({ card, tier, pulseBorderW, pulse, shimmerX, revealed, universeId }) {
  // POS_COLORS still drives the jersey color for visual variety — players
  // have a stat archetype internally, but we don't surface "PG/SG/..." anywhere.
  const posColor     = POS_COLORS[card.pos] || '#888';
  const abilityColor = card.ability ? ABILITY_RARITY_COLORS[card.ability.rarity] : null;
  // Use an inset box-shadow ring for the pulse instead of borderWidth so the
  // layout doesn't reflow each frame as the border grows/shrinks.
  const frontStyle   = revealed
    ? { boxShadow:
          `inset 0 0 0 ${pulseBorderW}px ${tier.color},`
        + `0 0 ${18+pulse*28}px ${tier.color},`
        + `inset 0 0 ${16+pulse*12}px ${tier.color}55` }
    : undefined;
  return (
    <div className="dc-face dc-front" style={{ '--tc':tier.color, ...frontStyle }}>
      <div className="dc-tier-label">{tier.label}</div>
      <div className="dc-card">
        <div className="dc-head">
          <span className="dc-universe">U·{universeId ?? '???'}</span>
          <span className="dc-ovr">{card.ovr}</span>
        </div>
        <div className="dc-portrait">
          <div className="dc-sprite-wrap">
            <MiniPlayerSVG jerseyColor={posColor} phase={card.id % 5} />
          </div>
          <div className="dc-shine" />
        </div>
        <div className="dc-name">{card.name}</div>
        <div className="dc-stats">
          <StatRow lbl="SPD" val={card.spd} color="#22d3ee" />
          <StatRow lbl="DEX" val={card.dex} color="#a855f7" />
          <StatRow lbl="JMP" val={card.jmp} color="#22c55e" />
          <StatRow lbl="ACC" val={card.acc} color="#fb923c" />
        </div>
        <div className={`dc-ability ${card.ability?'has':'none'}`}
          style={card.ability ? { '--ac':abilityColor } : undefined}>
          {card.ability ? card.ability.name : 'NO ABILITY'}
        </div>
      </div>
      {revealed && (
        <div className="dc-shimmer" style={{ transform:`translateX(${shimmerX}px) rotate(-18deg)` }} />
      )}
    </div>
  );
}

function StatRow({ lbl, val, color }) {
  return (
    <div className="dc-stat">
      <span className="dc-stat-lbl">{lbl}</span>
      <span className="dc-stat-bar">
        <span className="dc-stat-fill" style={{ width:`${val}%`, background:color, boxShadow:`0 0 5px ${color}90` }} />
      </span>
      <span className="dc-stat-val">{val}</span>
    </div>
  );
}

function AcmStatRow({ lbl, val, color }) {
  return (
    <div className="acm-stat">
      <span className="acm-stat-lbl">{lbl}</span>
      <span className="acm-stat-bar">
        <span className="acm-stat-fill" style={{ width:`${val}%`, background:color, boxShadow:`0 0 4px ${color}90` }} />
      </span>
      <span className="acm-stat-val">{val}</span>
    </div>
  );
}

// ─── Animated card slot ────────────────────────────────────────────────────
function DraftCardAnim({ card, idx, anim, picked, dimmed, onClick, tick, burstStart, universeId }) {
  const tierKey = getPlayerTierKey(card.ovr, card.ability);
  const tier    = TIER_DEFS[tierKey];
  const { phase, face, scaleX, revealed, dnaProgress, matProgress } = anim;

  const pulse       = (Math.sin(tick*0.10)+1)/2;
  const borderW     = 1+pulse*1.5;
  const shimmerX    = ((tick*1.6)%(290+60))-60;
  const flick       = ((tick*13)%211) < 2 ? 0.78 : 1;
  const dnaOpacity  = phase==='materialize' ? (1-easeIn(matProgress)) : (phase==='dna'||phase==='pad' ? 1 : 0);
  const cardOpacity = phase==='pad'||phase==='dna' ? 0 : phase==='materialize' ? easeOut(matProgress) : 1;
  const cardScale   = phase==='materialize' ? 0.94+0.06*easeOut(matProgress) : 1;
  const cardClipY   = phase==='materialize' ? `inset(${(1-matProgress)*100}% 0 0 0)` : 'none';

  return (
    <div className={`draft-card-slot phase-${phase}`}>
      {/* DNA download overlay */}
      {(phase==='dna'||phase==='materialize') && (
        <div className="dna-wrap" style={{ opacity:dnaOpacity }}>
          <DNADownload progress={dnaProgress} idx={idx} tick={tick} />
        </div>
      )}
      {/* The card */}
      <button
        className={[
          'draft-card-anim',
          `tier-${tierKey}`,
          picked  ? 'picked'      : '',
          dimmed  ? 'dimmed'      : '',
          revealed ? 'revealed'  : '',
          phase==='materialize' ? 'materializing' : '',
          face==='back' ? 'is-back hologram' : 'is-front',
        ].filter(Boolean).join(' ')}
        onClick={onClick}
        disabled={phase==='pad'||phase==='dna'}
        style={{
          '--tc': tier.color,
          opacity: cardOpacity * flick,
          transform: `scale(${cardScale}) scaleX(${scaleX})`,
          clipPath: cardClipY,
          pointerEvents: cardOpacity > 0.5 ? 'auto' : 'none',
        }}>
        {face==='back'
          ? <CardBack card={card} idx={idx} tick={tick} />
          : <CardFront card={card} tier={tier} pulseBorderW={borderW} pulse={pulse} shimmerX={shimmerX} revealed={revealed} universeId={universeId} />
        }
      </button>
    </div>
  );
}

// ─── Running ghost (drag cursor sprite) ────────────────────────────────────
function RunningGhost({ player, x, y }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 80);
    return () => clearInterval(id);
  }, []);
  const SCALE = 4;
  const frame = RUN_FRAMES[tick % RUN_FRAMES.length];
  const jerseyColor = POS_COLORS[player.pos] || '#888';
  const W = 14 * SCALE, H = 18 * SCALE;
  // Chest sits ~y=8 in sprite; center cursor on chest
  return (
    <div style={{
      position: 'fixed',
      left: x - W/2,
      top:  y - 8*SCALE,
      pointerEvents: 'none',
      zIndex: 9999,
      filter: 'drop-shadow(0 5px 0 rgba(0,0,0,0.45))',
    }}>
      <svg width={W} height={H} shapeRendering="crispEdges"
        style={{ imageRendering:'pixelated', display:'block' }}>
        {frame.map(([px, py, col], i) => (
          <rect key={i} x={px*SCALE} y={py*SCALE} width={SCALE} height={SCALE}
            fill={col === JERSEY_BASE ? jerseyColor : col} />
        ))}
      </svg>
      <div style={{
        position:'absolute', left:'50%', top: H + 4, transform:'translateX(-50%)',
        fontFamily:'JetBrains Mono, monospace', fontSize:11, fontWeight:700,
        letterSpacing:'0.12em', color:'#e8c060', whiteSpace:'nowrap',
        textShadow:'0 0 3px #000, 0 0 6px rgba(0,0,0,0.9), 0 1px 0 #000',
      }}>
        {player.lastName ?? player.name}
      </div>
    </div>
  );
}

// ─── Main DraftScreen component ────────────────────────────────────────────
// ─── FTUE coach dialogue lines ─────────────────────────────────────────────
const FTUE_IDLE_LINES = [
  "Welcome to the draft! Pick wisely.",
  "OVR ratings don't lie, kid.",
  "Ability cards are rare — snag them!",
  "Build around your best player.",
];
function getFtueLine(phase, pickNum, total, tick, hasAbility = false) {
  if (phase === 'downloading') {
    if (tick < SCAN_S1_END) return "Scanning the multiverse for anomalies...";
    if (tick < SCAN_S2_END) return "Locking onto a target universe...";
    if (tick < SCAN_S3_END) return "Acquiring DNA. Hang tight!";
    return "Downloading the genetic blueprints...";
  }
  if (phase === 'ready') {
    if (pickNum === 1) return "Tap a card to reveal all three.";
    if (pickNum === total) return "Last pick! Make it count.";
    if (pickNum === 2) return "Second pick! 4 more to go!";
    return null;
  }
  if (phase === 'revealed') {
    if (hasAbility) return "Lucky! A player with an ability!";
    if (pickNum === 1) return "Pick one! Look at the OVR.";
    if (pickNum === 2) return "TIP: Acc influences Shot accuracy.";
    if (pickNum === 3) return "TIP: Jmp helps with blocking and jump ball.";
    if (pickNum === 4) return "TIP: Spd helps with steals and dunks.";
    if (pickNum === 5) return "TIP: Dex helps with steals and blocks.";
    return "Pick the one that fits your team.";
  }
  if (phase === 'confirmed') return "Nice pick! Locking it in...";
  if (phase === 'assign') return "Want me to help? Just click Auto Assign";
  return FTUE_IDLE_LINES[Math.floor((tick ?? 0) / 220) % FTUE_IDLE_LINES.length];
}

export function DraftScreen({ homeTeamName='HOME', isFtue=false, onStart, onBack, onMenu }) {
  // Draft state
  const [draftPool]   = React.useState(() => generateDraftPool());
  const [roster,      setRoster]      = React.useState([]);
  const [phase,       setPhase]       = React.useState('draft'); // 'draft' | 'assign'
  const [assignments, setAssignments] = React.useState({});
  const [selectedId,  setSelectedId]  = React.useState(null);
  const [saving,      setSaving]      = React.useState(false);

  // FTUE coach state
  const [coachDismissed, setCoachDismissed] = React.useState(false);
  // Intro coach (shown once for FTUE between "Initiate Draft Sequence" and the scan).
  // Pages through INTRO_LINES one click at a time; last click starts the scan.
  const [coachIntro, setCoachIntro] = React.useState(false);
  const [introIdx,   setIntroIdx]   = React.useState(0);

  // Drag-and-drop state
  const [dragId,     setDragId]     = React.useState(null);
  const [dragPos,    setDragPos]    = React.useState({ x:0, y:0 });
  const [dropTarget, setDropTarget] = React.useState(null);
  const slotRefs       = React.useRef({});
  const dropTargetRef  = React.useRef(null);
  const assignRef      = React.useRef(null);

  // Animation state
  const [cards,     setCards]     = React.useState([]);
  const [flipTicks, setFlipTicks] = React.useState([null,null,null]);
  const [picked,    setPicked]    = React.useState(null);
  const [seqKey,    setSeqKey]    = React.useState(0);
  const [started,   setStarted]   = React.useState(false);
  const [running,   setRunning]   = React.useState(false);
  const [planetIdx,  setPlanetIdx]  = React.useState(() => Math.floor(Math.random()*6));
  const [universeId, setUniverseId] = React.useState(() => Math.floor(Math.random()*1000).toString().padStart(3,'0'));

  // Tick engine — restarts whenever seqKey or running changes
  const [tick, setTick]    = React.useState(0);
  const rafRef             = React.useRef(null);
  const startTimeRef       = React.useRef(null);
  const tickBaseRef        = React.useRef(0);
  const advancingRef       = React.useRef(false); // prevents double-advance

  React.useEffect(() => {
    if (!running) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    startTimeRef.current = performance.now();
    const base = tickBaseRef.current;
    const loop = (now) => {
      setTick(base + Math.floor((now - startTimeRef.current) / 16));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [running, seqKey]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Track which cards have already played their rare-tier sound on flip so
  // each card sounds exactly once per draft session.
  const flipSoundedRef = React.useRef([false, false, false]);
  React.useEffect(() => {
    flipSoundedRef.current = [false, false, false];
  }, [seqKey]);
  React.useEffect(() => {
    flipTicks.forEach((ft, i) => {
      if (ft == null || flipSoundedRef.current[i]) return;
      if (tick < ft + FLIP_HALF) return; // front face not visible yet
      flipSoundedRef.current[i] = true;
      const card = cards[i];
      if (!card) return;
      // Only play a sound for ability cards — tier alone (gold/blue/silver)
      // doesn't trigger anything.
      if (card.ability) playRare();
    });
  }, [tick, flipTicks, cards]);

  // Derived animation state
  const entryDone   = tick >= ENTRY_END_TICK;
  const allRevealed = flipTicks.every(ft => ft!=null && tick>=ft+FLIP_DUR);
  const noneFlipped = flipTicks.every(ft => ft==null);

  // Roll 3 cards from what hasn't been picked yet
  const rollCards = React.useCallback((currentRoster) => {
    const pool = draftPool.filter(p => !currentRoster.find(r => r.id===p.id));
    const shuffled = [...pool].sort(() => Math.random()-0.5);
    return shuffled.slice(0,3).map(p => ({ ...p, ability:rollAbilityForPlayer(p.ovr) }));
  }, [draftPool]);

  const startDraft = () => {
    const newCards = rollCards([]);
    setCards(newCards);
    setStarted(true);
    tickBaseRef.current = 0;
    setTick(0);
    setPlanetIdx(Math.floor(Math.random()*6));
    setUniverseId(Math.floor(Math.random()*1000).toString().padStart(3,'0'));
    // For FTUE on their first pick, show the coach intro BEFORE running the
    // scan. Tick engine stays off until they dismiss the intro.
    if (isFtue && roster.length === 0) {
      setCoachIntro(true);
      setIntroIdx(0);
    } else {
      setRunning(true);
    }
  };

  const INTRO_LINES = [
    "Lets get you started with your first team.",
    "Lets scan the multiverse for Anomalies.",
    "Maybe you'll find your shooting star.",
  ];
  const advanceCoachIntro = () => {
    setIntroIdx((i) => {
      if (i + 1 >= INTRO_LINES.length) {
        // last page — kick off the scan
        setCoachIntro(false);
        setRunning(true);
        return 0;
      }
      return i + 1;
    });
  };

  const flipAll = () => {
    if (!entryDone) return;
    if (coachActive) return; // user must dismiss the FTUE coach first
    // Only flip cards that aren't already flipped — stagger the remaining ones.
    let staggerIdx = 0;
    const next = flipTicks.map(v => {
      if (v != null) return v;
      const t = tick + 6 + staggerIdx * 12;
      staggerIdx++;
      return t;
    });
    if (next.every((v, i) => v === flipTicks[i])) return; // nothing to flip
    setFlipTicks(next);
    playFlip();
  };

  const handleCardClick = (i) => {
    if (!entryDone || picked!=null) return;
    if (coachActive) return; // user must dismiss the FTUE coach first
    if (allRevealed) {
      pickPlayer(i);
    } else {
      flipAll();
    }
  };

  const pickPlayer = (i) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setPicked(i);
    playSelect();
    // Tag the player with the universe they came from so the assign tray
    // can display it instead of the (now-hidden) preferred position.
    const player   = { ...cards[i], universeId };
    const newRoster = [...roster, player];
    setRoster(newRoster);

    setTimeout(() => {
      if (newRoster.length >= ROSTER_SIZE) {
        setRunning(false);
        setPhase('assign');
        advancingRef.current = false;
        return;
      }
      // Advance to next pick: skip scan + planet locator (already locked
      // on a single universe for the whole session) and jump straight to
      // the DNA card reveal. Universe + planet stay the same across all
      // 5 picks of this draft.
      const nextCards = rollCards(newRoster);
      const nextBase = PLANET_WAIT_END + 30;
      tickBaseRef.current = nextBase;
      setCards(nextCards);
      setFlipTicks([null,null,null]);
      setPicked(null);
      // Reset tick IN the same state batch so the next render uses the new
      // base (pad phase, invisible) instead of briefly painting the new
      // face-down cards with the leftover high tick from the prior pick.
      setTick(nextBase);
      setSeqKey(k => k+1); // triggers tick engine restart
      advancingRef.current = false;
    }, 1000);
  };

  // ── Backend ──────────────────────────────────────────────────────────────
  const saveRosterToServer = async (lineup) => {
    const saves = await Promise.allSettled(
      lineup.map(player => trpc.draft.free.mutate({
        name: player.name,
        rarity: tierToRarity(player.ovr, player.ability),
        spd: player.spd, dex: player.dex, jmp: player.jmp, acc: player.acc,
        ability: player.ability ?? null,
      }))
    );
    const withServerIds = lineup.map((player,i) => ({
      ...player,
      serverId: saves[i].status==='fulfilled' ? saves[i].value.id : null,
    }));
    await Promise.allSettled(
      withServerIds
        .filter(p => p.serverId)
        .map(p => trpc.user.setLineupSlot.mutate({ role:p.role, playerId:p.serverId }))
    );
    return withServerIds;
  };

  const handleStartGame = async () => {
    if (!canStart || saving) return;
    const lineup = POS_ORDER.map(pos => ({ ...assignments[pos], role:pos }));
    setSaving(true);
    try {
      const enriched = await saveRosterToServer(lineup);
      onStart(enriched);
    } catch { onStart(lineup); }
    finally { setSaving(false); }
  };

  const handleSaveMenu = async () => {
    if (!canStart || saving) return;
    const lineup = POS_ORDER.map(pos => ({ ...assignments[pos], role:pos }));
    setSaving(true);
    try { await saveRosterToServer(lineup); } catch {} finally { setSaving(false); }
    playCancel();
    onMenu?.(lineup);
  };

  // Brute-force best permutation of roster → positions by total weighted OVR.
  const autoAssign = () => {
    if (roster.length < POS_ORDER.length) return;
    const players = roster.slice(0, POS_ORDER.length);
    let best = null, bestSum = -1;
    const perm = (arr, k = 0) => {
      if (k === arr.length - 1) {
        let sum = 0;
        for (let i = 0; i < arr.length; i++) sum += calcOvr(POS_ORDER[i], arr[i]);
        if (sum > bestSum) { bestSum = sum; best = arr.slice(); }
        return;
      }
      for (let i = k; i < arr.length; i++) {
        [arr[k], arr[i]] = [arr[i], arr[k]];
        perm(arr, k + 1);
        [arr[k], arr[i]] = [arr[i], arr[k]];
      }
    };
    perm(players);
    if (!best) return;
    const next = {};
    POS_ORDER.forEach((pos, i) => {
      next[pos] = { ...best[i], ovr: calcOvr(pos, best[i]) };
    });
    setAssignments(next);
    setSelectedId(null);
    playSelect();
  };

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  const assignPlayerToSlot = React.useCallback((playerId, pos) => {
    if (!playerId || !pos) return;
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k]?.id===playerId) delete next[k]; });
      next[pos] = roster.find(r => r.id===playerId);
      return next;
    });
    playSelect();
  }, [roster]);
  assignRef.current = assignPlayerToSlot;

  const hitSlot = (clientX, clientY) => {
    for (const pos of POS_ORDER) {
      const el = slotRefs.current[pos];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return pos;
      }
    }
    return null;
  };

  React.useEffect(() => {
    if (!dragId) return;
    const onMove = (e) => {
      const src = e.touches ? e.touches[0] : e;
      if (!src) return;
      setDragPos({ x:src.clientX, y:src.clientY });
      const hit = hitSlot(src.clientX, src.clientY);
      dropTargetRef.current = hit;
      setDropTarget(hit);
      if (e.touches) e.preventDefault();
    };
    const onUp = () => {
      if (dropTargetRef.current) assignRef.current?.(dragId, dropTargetRef.current);
      dropTargetRef.current = null;
      setDragId(null);
      setDropTarget(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive:false });
    window.addEventListener('touchend',  onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [dragId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e, playerId) => {
    if (e.preventDefault) e.preventDefault();
    const src = e.touches ? e.touches[0] : e;
    setDragId(playerId);
    setDragPos({ x:src.clientX, y:src.clientY });
    setSelectedId(null);
  };

  // ── Assign phase ─────────────────────────────────────────────────────────
  const canStart = phase==='assign' && POS_ORDER.every(pos => assignments[pos]);

  const handleSlotClick = (pos) => {
    if (selectedId) {
      // Assign selected player to this slot
      setAssignments(prev => {
        const next = { ...prev };
        // Unassign from wherever this player was
        Object.keys(next).forEach(k => { if (next[k]?.id===selectedId) delete next[k]; });
        next[pos] = roster.find(r => r.id===selectedId);
        return next;
      });
      setSelectedId(null);
    } else if (assignments[pos]) {
      // Select the player in this slot
      setSelectedId(assignments[pos].id);
    }
  };

  const handleMiniCardClick = (playerId) => {
    setSelectedId(prev => prev===playerId ? null : playerId);
  };

  // ── Phase label (for section header) ────────────────────────────────────
  const phaseLabel =
    tick < SCAN_S1_END && started  ? 'ANOMALY SCAN'      :
    tick < SCAN_S2_END && started  ? 'UNIVERSE LOCATOR'  :
    tick < SCAN_S3_END && started  ? 'DNA ACQUISITION'   :
    !entryDone && started          ? 'LOCKING ONTO GENOMES':
    phase==='assign'               ? 'ASSIGN POSITIONS'  :
                                     'AVAILABLE PLAYERS';

  const draftPhaseLabel =
    !entryDone     ? 'downloading' :
    picked!=null   ? 'confirmed'   :
    noneFlipped    ? 'ready'       :
    allRevealed    ? 'revealed'    : 'revealing';

  // FTUE coach line + active gate.
  // The coach blocks card / FLIP-ALL clicks until the user taps to dismiss.
  // Dismissal resets whenever the line text changes.
  const hasAbility = cards.some(c => c?.ability);
  const assignedCount = Object.keys(assignments).length;
  const coachPhaseLabel = phase === 'assign' ? 'assign' : draftPhaseLabel;
  const coachLine = isFtue ? getFtueLine(coachPhaseLabel, roster.length + 1, ROSTER_SIZE, tick, hasAbility) : null;
  // Hide during downloading/revealing/confirmed — coach only appears in
  // the stable interactive moments (ready, revealed, assign).
  const coachShowing = isFtue && started && (
    (phase === 'draft'
      && draftPhaseLabel !== 'downloading'
      && draftPhaseLabel !== 'revealing'
      && draftPhaseLabel !== 'confirmed')
    || (phase === 'assign' && assignedCount === 0)
  );
  // Only one stable line per phase: stage to drive the dismiss reset.
  const coachStage = `${coachPhaseLabel}-${roster.length}-${seqKey}-${hasAbility ? 'A' : 'N'}`;
  React.useEffect(() => { setCoachDismissed(false); }, [coachStage]);
  const coachActive = coachShowing && !coachDismissed && !!coachLine;

  // Burst centers (1920×1080 viewport space)
  const burstCenters = [
    { x:1920*0.30, y:1080*0.50 },
    { x:1920*0.50, y:1080*0.50 },
    { x:1920*0.70, y:1080*0.50 },
  ];

  const picksLeft = ROSTER_SIZE - roster.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`draft-screen ${!entryDone && started ? 'is-downloading' : ''}`}>
      {/* TOP NAV */}
      <div className="draft-topnav">
        <button className="draft-back-btn" onClick={() => { playCancel(); onBack(); }}>
          <span>◀</span>
        </button>
        <div className="draft-title">
          <span className="dt-big">DRAFT</span>
          <span className="dt-sub">RECRUITS FROM THE MULTIVERSE</span>
        </div>
        <div className="draft-topnav-spacer" aria-hidden="true" />
      </div>

      {/* PICKS LEFT — floating bottom-right */}
      <div className="draft-picks draft-picks-corner">
        <span className="dp-lbl">{phase==='assign' ? 'ASSIGNED' : 'PICKS LEFT'}</span>
        <span className="dp-val">
          {phase==='assign'
            ? `${Object.keys(assignments).length}/${ROSTER_SIZE}`
            : picksLeft}
        </span>
      </div>

      {/* SECTION HEADER */}
      <div className="available-h">
        <span className="ah-line" />
        <span className="ah-label">{phaseLabel}</span>
        <span className="ah-line" />
      </div>

      {/* ── DRAFT PHASE ── */}
      {phase === 'draft' && (
        <>
          <div className="draft-cards">
            {/* Burst overlays — rendered first so cards sit on top */}
            <div className="burst-stack" aria-hidden="true">
              {cards.map((c,i) => {
                if (!c.ability || flipTicks[i]==null) return null;
                const burstStart = flipTicks[i]+FLIP_HALF+BURST_DELAY;
                return (
                  <BurstOverlay
                    key={`${seqKey}-burst-${i}`}
                    card={c}
                    originX={burstCenters[i].x} originY={burstCenters[i].y}
                    startTick={burstStart} tick={tick}
                  />
                );
              })}
            </div>

            {/* Cards */}
            {cards.map((c,i) => {
              const anim = getCardPhase(tick, i, flipTicks[i]);
              return (
                <DraftCardAnim
                  key={`${seqKey}-${c.id}`}
                  card={c} idx={i} anim={anim}
                  picked={picked===i}
                  dimmed={picked!=null && picked!==i}
                  onClick={() => handleCardClick(i)}
                  tick={tick}
                  burstStart={flipTicks[i]!=null ? flipTicks[i]+FLIP_HALF+BURST_DELAY : null}
                  universeId={universeId}
                />
              );
            })}

            {/* "INITIATE DRAFT SEQUENCE" button — shown before first pick */}
            {!started && (
              <div className="draft-start-overlay">
                <button className="draft-start-btn" onClick={startDraft}>
                  <span className="dsb-bracket">[</span>
                  <span>INITIATE DRAFT SEQUENCE</span>
                  <span className="dsb-bracket">]</span>
                </button>
                <div className="draft-start-hint">▸ CLICK TO BEGIN ANOMALY SCAN</div>
              </div>
            )}

            {/* Anomaly scan overlay */}
            {started && !coachIntro && <AnomalyScan tick={tick} universeId={universeId} />}

            {/* Planet orbit */}
            {started && !coachIntro && <PlanetOrbit tick={tick} lockedPlanetIdx={planetIdx} universeId={universeId} />}
          </div>

          {/* ACTIONS */}
          <div className="draft-actions">
            {draftPhaseLabel==='downloading' && !coachIntro && (
              <div className="da-hint pulse">
                {tick<SCAN_S1_END ? '▸ SCANNING FOR ANOMALIES' :
                 tick<SCAN_S2_END ? '▸ LOCATING UNIVERSE'      :
                 tick<SCAN_S3_END ? '▸ ACQUIRING DNA'          :
                                    '▸ DOWNLOADING GENETIC DATA'}
                <span className="dots">...</span>
              </div>
            )}
            {entryDone && picked==null && flipTicks.some(ft => ft==null) && (
              <div className="da-hint pulse">TAP A CARD TO REVEAL</div>
            )}
            {draftPhaseLabel==='revealed' && (
              <div className="da-hint pulse">TAP A CARD TO DRAFT IT</div>
            )}
            {draftPhaseLabel==='confirmed' && (
              <div className="da-hint pulse">PICK CONFIRMED<span className="dots">...</span></div>
            )}
          </div>
        </>
      )}

      {/* ── ASSIGN PHASE ── */}
      {phase === 'assign' && (
        <div className="assign-phase" style={{ touchAction: dragId ? 'none' : 'auto', userSelect: 'none' }}>
          {/* Position slots */}
          <div className="assign-slots">
            {POS_ORDER.map(pos => {
              const assigned  = assignments[pos] ?? null;
              const posColor  = POS_COLORS[pos];
              const isTarget  = (!!selectedId || !!dragId) && !assigned;
              const isOccupied = !!assigned;
              const isDropOver = dropTarget === pos && !!dragId;
              const tierKey   = assigned ? getPlayerTierKey(assigned.ovr, assigned.ability) : null;
              const abilityColor = assigned?.ability ? ABILITY_RARITY_COLORS[assigned.ability.rarity] : null;
              return (
                <div key={pos}
                  ref={el => { slotRefs.current[pos] = el; }}
                  className={`assign-slot ${isOccupied?'filled':''} ${isTarget?'droppable':''} ${isDropOver?'drop-over':''}`}
                  onClick={() => handleSlotClick(pos)}>
                  <div className="aslot-header" style={{ background:posColor }}>{pos}</div>
                  <div className="aslot-body">
                    {assigned ? <>
                      <div className="aslot-name">{assigned.lastName ?? assigned.name}</div>
                      <div className="aslot-ovr">{assigned.ovr} OVR</div>
                      {assigned.ability && (
                        <div className="aslot-ability" style={{ color:abilityColor }}>
                          {assigned.ability.name}
                        </div>
                      )}
                    </> : isDropOver ? (
                      <div className="aslot-drop">DROP HERE</div>
                    ) : isTarget ? (
                      <div className="aslot-drop">DROP</div>
                    ) : (
                      <div className="aslot-empty">EMPTY</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instruction */}
          <div className="da-hint" style={{ textAlign:'center' }}>
            {dragId
              ? `▸ PLACING ${roster.find(r=>r.id===dragId)?.lastName ?? ''}`
              : selectedId
                ? `▸ SELECT A POSITION FOR ${roster.find(r=>r.id===selectedId)?.lastName ?? ''}`
                : canStart
                  ? '▸ ALL POSITIONS FILLED — READY TO START'
                  : '▸ DRAG A PLAYER TO A POSITION (OR TAP)'}
          </div>

          {/* Mini player cards */}
          <div className="assign-cards">
            {roster.map((player,i) => {
              const tierKey    = getPlayerTierKey(player.ovr, player.ability);
              const tier       = TIER_DEFS[tierKey];
              const posColor   = POS_COLORS[player.pos];
              const assignedPos = POS_ORDER.find(pos => assignments[pos]?.id===player.id) ?? null;
              const acColor    = player.ability ? ABILITY_RARITY_COLORS[player.ability.rarity] : null;
              return (
                <div key={player.id}
                  className={`assign-card-mini ${selectedId===player.id?'selected':''} ${assignedPos?'assigned':''} ${dragId===player.id?'dragging':''}`}
                  style={{ '--tc':tier.color }}
                  onMouseDown={(e) => startDrag(e, player.id)}
                  onTouchStart={(e) => startDrag(e, player.id)}
                  onClick={() => { if (!dragId) handleMiniCardClick(player.id); }}>
                  <div className="acm-universe-header">U·{player.universeId ?? '???'}</div>
                  <div className="acm-body">
                    <div className="acm-sprite">
                      <MiniPlayerSVG jerseyColor={posColor} phase={i*2} />
                    </div>
                    <div className="acm-name">{player.lastName ?? player.name}</div>
                    <div className="acm-stats">
                      <AcmStatRow lbl="SPD" val={player.spd} color="#22d3ee" />
                      <AcmStatRow lbl="DEX" val={player.dex} color="#a855f7" />
                      <AcmStatRow lbl="JMP" val={player.jmp} color="#22c55e" />
                      <AcmStatRow lbl="ACC" val={player.acc} color="#fb923c" />
                    </div>
                    {player.ability && (
                      <div className="acm-ability" style={{ color:acColor }}>
                        {player.ability.name}
                      </div>
                    )}
                  </div>
                  {assignedPos && (
                    <div className="acm-assigned-label" style={{ background:POS_COLORS[assignedPos] }}>
                      {assignedPos}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Assign actions */}
          <div className="assign-actions">
            <button className="da-btn primary big"
              disabled={!canStart || saving}
              onClick={handleStartGame}>
              <span>▶</span>
              <span>{saving ? 'SAVING...' : 'START GAME'}</span>
            </button>
            <button className="da-btn ghost"
              disabled={saving}
              onClick={autoAssign}>
              <span>✨</span><span>AUTO ASSIGN</span>
            </button>
            {canStart && !isFtue && (
              <button className="da-btn ghost"
                disabled={saving}
                onClick={handleSaveMenu}>
                <span>{saving ? 'SAVING...' : 'SAVE & MENU'}</span>
              </button>
            )}
          </div>

          {/* Drag ghost — animated running sprite centered on cursor */}
          {dragId && (() => {
            const dp = roster.find(r => r.id===dragId);
            return dp ? <RunningGhost player={dp} x={dragPos.x} y={dragPos.y} /> : null;
          })()}
        </div>
      )}

      {/* FTUE intro coach — shown once before the scan, after the user
          clicks "INITIATE DRAFT SEQUENCE". Clicking it kicks off the scan. */}
      {coachIntro && (
        <>
        <div style={{ position:'fixed', inset:0, zIndex:19, cursor:'pointer' }} onClick={advanceCoachIntro} />
        <div className="draft-coach" style={{ pointerEvents: 'auto' }}>
          <svg viewBox="0 0 600 112" preserveAspectRatio="xMidYMid meet"
            width="100%" height="112" style={{ display: 'block', cursor: 'pointer' }}
            onClick={advanceCoachIntro}>
            <BballTip
              text={INTRO_LINES[introIdx]}
              charX={12} charY={12} scale={0.6}
              dlgX={60} dlgY={32} dlgW={540} dlgH={48}
              textScale={1.6}
              textX={118}
              tapHint
            />
          </svg>
        </div>
        </>
      )}

      {/* FTUE coach dialogue — blocks card interaction until dismissed. */}
      {coachActive && !coachIntro && (
        <>
        <div style={{ position:'fixed', inset:0, zIndex:19, cursor:'pointer' }} onClick={() => setCoachDismissed(true)} />
        <div className="draft-coach" style={{ pointerEvents: 'auto' }}>
          <svg viewBox="0 0 600 112" preserveAspectRatio="xMidYMid meet"
            width="100%" height="112" style={{ display: 'block', cursor: 'pointer' }}
            onClick={() => setCoachDismissed(true)}>
            <BballTip
              text={coachLine}
              charX={12} charY={12} scale={0.6}
              /* dlg starts INSIDE the character so the bubble reads as
                 coming from behind the ball, not floating away */
              dlgX={60} dlgY={32} dlgW={540} dlgH={48}
              textScale={1.6}
              textX={118}
              tapHint
            />
          </svg>
        </div>
        </>
      )}
    </div>
  );
}

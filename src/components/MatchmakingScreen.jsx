import React from 'react';
import './MatchmakingScreen.css';
import { RUN_FRAMES } from '../sprites/run.js';
import { JERSEY_BASE, JERSEY_HOME, JERSEY_AWAY } from '../constants.js';
// Reuse the draft's player card (front face) so the VIEW TEAM modal shows the
// exact same card design. Importing DraftScreen.css brings the `.dc-*` styles;
// its :root vars match the global tokens, so no color bleed.
import { CardFront, TIER_DEFS, getPlayerTierKey } from './DraftScreen.jsx';
import './DraftScreen.css';

const { useState, useEffect, useRef } = React;

// ── Animated run-cycle sprite (canvas, 14×18, 6 frames @ 80ms) ──────────────
function RunSprite({ jerseyColor, scale = 6 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const W = 14 * scale;
  const H = 18 * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      RUN_FRAMES[frameRef.current].forEach(([x, y, color]) => {
        ctx.fillStyle = color === JERSEY_BASE ? jerseyColor : color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      });
    };
    draw();
    const id = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % RUN_FRAMES.length;
      draw();
    }, 80);
    return () => clearInterval(id);
  }, [jerseyColor, scale, W, H]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="run-sprite"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const OVR_WEIGHTS = {
  PG: { spd: 0.35, dex: 0.30, jmp: 0.10, acc: 0.25 },
  SG: { spd: 0.20, dex: 0.30, jmp: 0.15, acc: 0.35 },
  SF: { spd: 0.25, dex: 0.25, jmp: 0.25, acc: 0.25 },
  PF: { spd: 0.15, dex: 0.25, jmp: 0.35, acc: 0.25 },
  C:  { spd: 0.10, dex: 0.20, jmp: 0.45, acc: 0.25 },
};
const RARITY_COLORS = { 1: '#20c8a0', 2: '#c060e0', 3: '#e8c060' };
const POS_COLORS = { PG: '#3ea6ff', SG: '#a855f7', SF: '#19e6c4', PF: '#ff7a3c', C: '#ffc94a' };

function calcOvr(p) {
  if (p?.ovr != null) return p.ovr;
  const w = OVR_WEIGHTS[p?.pos];
  const spd = p?.spd ?? 60, dex = p?.dex ?? 60, jmp = p?.jmp ?? 60, acc = p?.acc ?? 60;
  if (w) return Math.round(spd * w.spd + dex * w.dex + jmp * w.jmp + acc * w.acc);
  return Math.round((spd + dex + jmp + acc) / 4);
}

// Normalize an ability entry into { name, rarity? }
function normalizeAbility(a) {
  if (!a) return null;
  if (typeof a === 'string') return { name: a };
  if (typeof a === 'object' && a.name) return a;
  return null;
}

function getAbilities(p) {
  const list = Array.isArray(p?.abilities) && p.abilities.length > 0
    ? p.abilities
    : (p?.ability ? [p.ability] : []);
  return list.map(normalizeAbility).filter(Boolean);
}

function gradeOf(ovr) {
  if (ovr >= 86) return 'S';
  if (ovr >= 80) return 'A';
  if (ovr >= 74) return 'B';
  if (ovr >= 68) return 'C';
  if (ovr >= 62) return 'D';
  return 'F';
}

// Display a team as a Reddit-style handle: prefer team.username, then
// callsign/name. If the value already starts with "u/" it's used as-is.
function formatHandle(team) {
  const raw = team?.username ?? team?.callsign ?? team?.name ?? '—';
  if (!raw || raw === '—') return raw;
  return /^u\//i.test(raw) ? raw : `u/${raw}`;
}

function teamOvr(players) {
  if (!players?.length) return 0;
  return Math.round(players.reduce((s, p) => s + calcOvr(p), 0) / players.length);
}

// ── SVG icons (inline, no asset files) ──────────────────────────────────────

const TeamIconLeft = () => (
  <svg viewBox="0 0 28 28" width="28" height="28">
    <polygon points="14,2 26,14 14,26 2,14" fill="var(--c-left)" stroke="#fff" strokeWidth="1" />
    <polygon points="14,8 20,14 14,20 8,14" fill="#02060a" />
  </svg>
);

const TeamIconRight = () => (
  <svg viewBox="0 0 28 28" width="28" height="28">
    <circle cx="14" cy="14" r="11" fill="var(--c-right)" stroke="#fff" strokeWidth="1" />
    <path
      d="M14 5 L17 13 L25 13 L19 18 L21 26 L14 22 L7 26 L9 18 L3 13 L11 13 Z"
      fill="#02060a"
      transform="scale(0.6) translate(9 5)"
    />
  </svg>
);

const CornerBracket = () => (
  <svg viewBox="0 0 64 64">
    <path d="M2 22 L2 2 L22 2" fill="none" stroke="rgba(234,246,243,0.5)" strokeWidth="2" />
    <path d="M8 16 L8 8 L16 8" fill="none" stroke="rgba(234,246,243,0.3)" strokeWidth="1" />
  </svg>
);

const RankEmblemLeft = ({ label }) => (
  <svg viewBox="0 0 100 100" width="68" height="68">
    <defs>
      <linearGradient id="mm-gradL" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a8e7d8" />
        <stop offset="100%" stopColor="var(--c-left)" />
      </linearGradient>
    </defs>
    <polygon points="50,8 86,28 86,72 50,92 14,72 14,28" fill="url(#mm-gradL)" stroke="#fff" strokeWidth="1.5" />
    <polygon points="50,18 76,33 76,67 50,82 24,67 24,33" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    <text x="50" y="62" textAnchor="middle" fontFamily="Orbitron, sans-serif" fontWeight="900" fontSize="28" fill="#1a1a2e">
      {label}
    </text>
  </svg>
);

const RankEmblemRight = ({ label }) => (
  <svg viewBox="0 0 100 100" width="68" height="68">
    <defs>
      <radialGradient id="mm-gradR">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="60%" stopColor="var(--c-right-glow)" />
        <stop offset="100%" stopColor="var(--c-right)" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#mm-gradR)" stroke="#fff" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    <text x="50" y="64" textAnchor="middle" fontFamily="Orbitron, sans-serif" fontWeight="900" fontSize="32" fill="#2a0a14">
      {label}
    </text>
  </svg>
);

// ── Player panel (left = home, right = away) ────────────────────────────────

function PlayerPanel({ side, team, revealed, onViewTeam }) {
  const isLeft = side === 'left';
  const TeamIcon = isLeft ? TeamIconLeft : TeamIconRight;
  const RankEm = isLeft ? RankEmblemLeft : RankEmblemRight;
  const placeholder = isLeft ? 'YOUR TEAM' : (revealed ? 'OPPONENT' : '—');
  const ovr = revealed ? teamOvr(team?.players) : 0;
  const grade = revealed ? gradeOf(ovr) : '?';

  return (
    <div className={`player-panel ${side}`}>
      <div className="portrait-wrap">
        <div className="portrait-frame">
          {revealed ? (
            <img src="/jxts5wo9u41e1.png" alt="" className="portrait-img" />
          ) : (
            <div className="portrait-placeholder">{placeholder}</div>
          )}
        </div>
        <div className="portrait-tint"></div>
        <div className="portrait-edge"></div>
      </div>

      <div className="stats">
        <div className="stat-row row-team">
          <TeamIcon />
          {revealed ? (
            <span className="val team-id">
              {team?.username ? (
                <>
                  <span className="team-user">{formatHandle({ username: team.username })}</span>
                  {team?.name && team.name !== team.username && <span className="team-club">{team.name}</span>}
                </>
              ) : (
                <span className="team-user">{team?.name ?? '—'}</span>
              )}
            </span>
          ) : (
            <span className="val">????</span>
          )}
        </div>
        <div className="stat-row row-rp">
          <span className="val">
            0<span className="rp-suffix">RP</span>
          </span>
        </div>
        <div className="title-ribbon">
          <span className="ribbon-level">
            OVR <b>{revealed ? ovr : '??'}</b>
          </span>
          <button
            type="button"
            className="ribbon-bg view-team-btn"
            onClick={() => revealed && onViewTeam?.(team, side)}
            disabled={!revealed}
          >
            {revealed ? 'VIEW TEAM' : '— — —'}
          </button>
        </div>
      </div>

      <div className="rank-badge">
        <div className="ring"></div>
        <div className="rank-label">RANK</div>
        <div className="rank-emblem">
          <RankEm label={revealed ? grade : '?'} />
        </div>
      </div>
    </div>
  );
}

// ── Roster row (5 lineup cards) ─────────────────────────────────────────────

const POS_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];

function Roster({ side, players, revealed }) {
  const jerseyColor = side === 'left' ? JERSEY_HOME : JERSEY_AWAY;
  return (
    <div className={`roster ${side}`}>
      {POS_ORDER.map((pos, i) => {
        const raw = revealed && players ? (players.find(x => x.pos === pos) ?? players[i]) : null;
        const p = raw ? { ...raw, pos } : null;
        const ovr = p ? calcOvr(p) : 0;
        const abilities = p ? getAbilities(p) : [];
        const posColor = POS_COLORS[pos];
        return (
          <div key={pos} className="player-slot">
            {p ? (
              <>
                <div
                  className="player-img"
                  style={{
                    background: `linear-gradient(160deg,
                      ${posColor}22 0%,
                      rgba(2, 6, 10, 0.85) 60%,
                      rgba(2, 6, 10, 0.95) 100%)`,
                  }}
                >
                  <div className="player-sprite-wrap">
                    <RunSprite jerseyColor={jerseyColor} scale={5} />
                  </div>
                  <div className="player-name">{p.name ?? '—'}</div>
                </div>
                <div className="player-pos-badge" style={{ background: posColor }}>{pos}</div>
                <div className="player-stats">
                  <div className="player-ovr-row">
                    <span className="player-ovr-label">OVR</span>
                    <span className="player-ovr-val">{ovr}</span>
                  </div>
                  <div className="player-abilities">
                    {abilities.length > 0 ? (
                      abilities.slice(0, 3).map((ab, idx) => (
                        <div
                          key={idx}
                          className="player-ability"
                          style={{
                            color: RARITY_COLORS[ab.rarity] ?? '#4888b0',
                            borderColor: RARITY_COLORS[ab.rarity] ?? '#4888b0',
                          }}
                        >
                          {ab.name}
                        </div>
                      ))
                    ) : (
                      <div className="player-ability player-ability-empty">NO ABILITY</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="player-img unknown"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Searching overlay (radar + log + progress) ──────────────────────────────

// How long the "searching" animation runs before an opponent is revealed —
// purely cosmetic pacing (no server round-trip happens during this phase).
// Was 5s; sped up per product request. Bump this one constant to retune.
const SEARCH_DURATION = 1.8; // seconds

// Tip-off countdown shown during the 'vs' phase (TIP-OFF IN N). Was 5s.
const TIP_OFF_SECONDS = 3;

// Log line timestamps are fractions of SEARCH_DURATION (0-1) rather than
// absolute ms, so retiming the whole sequence is a one-line change above.
const SEARCH_LOGS = [
  { t: 0.00, txt: '▸ SCOUTING ARENA: <b>HARDWOOD</b>' },
  { t: 0.16, txt: '▸ MATCHING TIER: <b>OVR 60-75</b>' },
  { t: 0.32, txt: '▸ PING CHECK < <b>40ms</b>' },
  { t: 0.48, txt: '▸ COURT: <b>CENTER STAGE</b>' },
  { t: 0.64, txt: '▸ SCANNING <b>14 TEAMS</b>' },
  { t: 0.80, txt: '▸ CANDIDATES: <b>003</b>' },
  { t: 0.96, txt: '▸ RIVAL LOCKED' },
];

function SearchingView({ elapsed, progress }) {
  return (
    <>
      <div className="radar">
        <div className="ring r1"></div>
        <div className="ring r2"></div>
        <div className="ring r3"></div>
        <div className="ring r4"></div>
        <div className="sweep"></div>
        <div className="pulse p1"></div>
        <div className="pulse p2"></div>
        <div className="pulse p3"></div>
        <div className="blip b1"></div>
        <div className="blip b2"></div>
        <div className="blip b3"></div>
        <div className="blip b4"></div>
      </div>

      <div className="search-status">
        <div className="lock">// LOCK_OPPONENT</div>
        <div className="title">
          SEARCHING<span className="dots"></span>
        </div>
        <div className="sub">
          ARENA <b>HARDWOOD</b> · TIER <b>I</b> · <b>{Math.floor(elapsed)}s</b>
        </div>
      </div>

      <div className="search-log">
        {SEARCH_LOGS.filter(l => elapsed >= l.t * SEARCH_DURATION).map((l, i) => (
          <div key={i} className="l" dangerouslySetInnerHTML={{ __html: l.txt }}></div>
        ))}
      </div>

      <div className="search-bar">
        <div className="track">
          <div className="fill" style={{ width: `${progress * 100}%` }}></div>
        </div>
        <div className="meta">
          <span>
            QUEUE · <b>CASUAL</b>
          </span>
          <span>
            EST <b>{Math.max(0, Math.ceil(SEARCH_DURATION - elapsed))}s</b>
          </span>
          <span>
            PING <b>32ms</b>
          </span>
        </div>
      </div>
    </>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export function MatchmakingScreen({ homeRoster, homeTeamName, homeUsername, awayTeam, onReady, isMobile: isMobileProp }) {
  const [phase, setPhase] = useState('searching'); // 'searching' | 'found' | 'vs' | 'ready'
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(TIP_OFF_SECONDS);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Searching: 5s rAF loop, then advance to 'found'
  useEffect(() => {
    if (phase !== 'searching') return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const e = (now - start) / 1000;
      setElapsed(e);
      if (e >= SEARCH_DURATION) {
        setPhase('found');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [phase]);

  // Found banner: 900ms then 'vs'
  useEffect(() => {
    if (phase !== 'found') return;
    const id = setTimeout(() => setPhase('vs'), 900);
    return () => clearTimeout(id);
  }, [phase]);

  // VS countdown: TIP_OFF_SECONDS..0 then fire onReady
  useEffect(() => {
    if (phase !== 'vs') return;
    setCountdown(TIP_OFF_SECONDS);
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(id);
          setTimeout(() => setPhase('ready'), 0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const progress = Math.min(1, elapsed / SEARCH_DURATION);
  const opponentRevealed = phase === 'found' || phase === 'vs' || phase === 'ready';

  const homeTeam = {
    username: homeUsername ?? '',
    name: homeTeamName ?? '',
    callsign: homeTeamName ?? '',
    players: homeRoster ?? [],
  };

  // Team-view modal: { team, side } | null. Opened by each panel's VIEW TEAM
  // button; shows that team's player cards. (The on-stage rosters are hidden —
  // a richer view will live here.)
  const [teamModal, setTeamModal] = useState(null);
  // Carousel for the team modal: show as many whole cards as fit while keeping
  // them at a readable scale; arrows page through the rest.
  const [cardOffset, setCardOffset] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  useEffect(() => { setCardOffset(0); }, [teamModal]);

  // Scale the 1920×1080 stage to fit its container. Mobile layout can be
  // forced via the `isMobile` prop (for story toggles); otherwise it's
  // auto-detected from the container's aspect ratio.
  const rootRef = useRef(null);
  const [scale, setScale] = useState(1);
  // Scale for the VIEW TEAM modal's 5-card row. The modal renders at the
  // unscaled root (not inside the fit-scaled stage), so cards stay readable;
  // this fits the row (≈1522×440 natural) into the real container.
  const [modalScale, setModalScale] = useState(1);
  const [detectedMobile, setDetectedMobile] = useState(false);
  const isMobile = isMobileProp ?? detectedMobile;
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      if (!w || !h) return;
      // Team modal: always 4 cards at a time (the 5th via the arrows), scaled
      // to fit the container width/height.
      const VIEW_W = 4 * 290 + 3 * 18;
      setVisibleCount(4);
      setModalScale(Math.max(0.2, Math.min(1, (w - 96) / VIEW_W, (h - 150) / 472)));
      const auto = h > w;
      setDetectedMobile(auto);
      const mobile = isMobileProp ?? auto;
      if (mobile) {
        setScale(1);
        document.body.classList.add('is-mobile');
      } else {
        setScale(Math.min(w / 1920, h / 1080));
        document.body.classList.remove('is-mobile');
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.body.classList.remove('is-mobile');
    };
  }, [isMobileProp]);

  // Keep body class in sync with the prop even before ResizeObserver fires
  useEffect(() => {
    if (isMobileProp === undefined) return;
    document.body.classList.toggle('is-mobile', isMobileProp);
  }, [isMobileProp]);

  const stageStyle = isMobile
    ? undefined
    : {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      };

  return (
    <div ref={rootRef} className="matchmaking-screen" data-testid="matchmaking-screen" data-state={phase}>
      <div className="stage-wrap">
        <div className="stage" style={stageStyle}>
          <div className="backplate"></div>
          <div className="starfield"></div>
          <div className="planet"></div>

          {/* Corner brackets */}
          <div className="corner-bracket cb-tl"><CornerBracket /></div>
          <div className="corner-bracket cb-tr"><CornerBracket /></div>
          <div className="corner-bracket cb-bl"><CornerBracket /></div>
          <div className="corner-bracket cb-br"><CornerBracket /></div>

          {/* Side slashes */}
          <div className="side-slashes left">
            <div className="slash" style={{ left: 40 }}></div>
            <div className="slash" style={{ left: 80, opacity: 0.5 }}></div>
            <div className="slash" style={{ left: 160, opacity: 0.25 }}></div>
          </div>
          <div className="side-slashes right">
            <div className="slash" style={{ left: 40 }}></div>
            <div className="slash" style={{ left: 80, opacity: 0.5 }}></div>
            <div className="slash" style={{ left: 160, opacity: 0.25 }}></div>
          </div>

          {/* HUD corners */}
          <div className="hud-corner hud-tl">
            <span className="dot"></span>
            <span>NET · 32ms</span>
          </div>
          <div className="hud-corner hud-tr">
            <span className="hud-credits">CASUAL MATCH</span>
          </div>

          {/* Center: VS pillar */}
          <div className="center-pillar">
            <div className="vs-mark">
              <span className="v">V</span>
              <span className="s">S</span>
            </div>
          </div>

          {/* Side panels */}
          <PlayerPanel side="left"  team={homeTeam} revealed={true} onViewTeam={(t) => setTeamModal({ team: t, side: 'left' })} />
          <PlayerPanel side="right" team={awayTeam} revealed={opponentRevealed} onViewTeam={(t) => setTeamModal({ team: t, side: 'right' })} />

          {/* Rosters now live in the VIEW TEAM modal (below), not on the stage. */}

          {/* Searching overlay */}
          {phase === 'searching' && (
            <SearchingView elapsed={elapsed} progress={progress} />
          )}

          {/* Found banner */}
          {phase === 'found' && (
            <>
              <div className="flash"></div>
              <div className="found-banner">
                OPPONENT LOCKED
                <span className="sub">// INITIALIZING TIP-OFF</span>
              </div>
            </>
          )}

          {/* VS launch countdown */}
          {phase === 'vs' && (
            <div className="launch-bar">
              <span>TIP-OFF IN</span>
              <span className="count">{countdown}</span>
              <span>READY UP</span>
            </div>
          )}

          {phase === 'ready' && (
            <div className="launch-bar tap-to-start" onClick={() => onReadyRef.current?.()}>
              <span>TAP TO START</span>
            </div>
          )}

          {/* CRT atmosphere */}
          <div className="scanlines"></div>
          <div className="crt-glow"></div>
        </div>
      </div>

      {/* VIEW TEAM modal — rendered at the unscaled root (not inside the
          fit-scaled stage) so the player cards stay readable. The 5-card row
          is scaled by modalScale to fit the real container. */}
      {teamModal && (() => {
        const players = teamModal.team?.players ?? [];
        const VISIBLE = visibleCount;
        const VIEW_W = VISIBLE * 290 + (VISIBLE - 1) * 18;   // natural window width
        const maxOffset = Math.max(0, POS_ORDER.length - VISIBLE);
        const offset = Math.min(cardOffset, maxOffset);
        return (
          <div className="team-modal" onClick={() => setTeamModal(null)}>
            <div className="team-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="team-modal-head">
                <span>{teamModal.team?.username || teamModal.team?.name || 'TEAM'}</span>
                <button type="button" className="team-modal-close" onClick={() => setTeamModal(null)}>✕</button>
              </div>
              <div className="team-modal-carousel">
                <button type="button" className="team-modal-nav" onClick={() => setCardOffset(o => Math.max(0, o - 1))} disabled={offset <= 0} aria-label="Previous">◀</button>
                <div className="team-modal-cards-fit" style={{ width: VIEW_W * modalScale, height: 472 * modalScale }}>
                  <div className="team-modal-viewport" style={{ width: VIEW_W, height: 472, transform: `scale(${modalScale})`, transformOrigin: 'top left' }}>
                    <div className="team-modal-track" style={{ transform: `translateX(${-offset * (290 + 18)}px)` }}>
                      {POS_ORDER.map((pos, i) => {
                        const raw = players.find(x => x.pos === pos) ?? players[i];
                        if (!raw) return <div key={pos} className="draft-card-slot mm-card-empty" />;
                        const ovr = calcOvr(raw);
                        const ability = getAbilities(raw)[0] ?? null;
                        const tier = TIER_DEFS[getPlayerTierKey(ovr, ability)];
                        const cardObj = { id: i + 1, pos, name: raw.name, spd: raw.spd, dex: raw.dex, jmp: raw.jmp, acc: raw.acc, ovr, ability };
                        return (
                          <div key={pos} className="draft-card-slot">
                            <div className="draft-card-anim revealed">
                              <CardFront
                                card={cardObj}
                                tier={tier}
                                revealed={false}
                                pulseBorderW={0}
                                pulse={0}
                                shimmerX={0}
                                universeId={String(raw.serverId ?? i + 1).padStart(3, '0')}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button type="button" className="team-modal-nav" onClick={() => setCardOffset(o => Math.min(maxOffset, o + 1))} disabled={offset >= maxOffset} aria-label="Next">▶</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import React from 'react';
import '../styles/lobby.css';
import { RUN_FRAMES } from '../sprites/run.js';
import { JERSEY_BASE } from '../constants.js';
import { BballTip } from './BballTip.jsx';
import { TitleStrip } from './TitleStrip.jsx';
import { playSelect, playCancel, playCursor, playMenuSelect2 } from '../sound/ui.js';
import { trpc } from '../trpc';

const POS_COLORS = { PG: '#3ea6ff', SG: '#a855f7', SF: '#19e6c4', PF: '#ff7a3c', C: '#ffc94a' };
const RARITY_COLORS = { common: '#b0b8c8', rare: '#b0b8c8', super_rare: '#30c0e0', ultra_rare: '#ffc94a' };

function tierFromRarity(rarity) {
  if (rarity >= 5) return 'blue';
  if (rarity >= 3) return 'gold';
  return 'silver';
}

function abilityName(a) {
  if (!a) return null;
  if (typeof a === 'string') return a;
  return a.name ?? null;
}

function overall(p) {
  return Math.round(((p.spd ?? 60) + (p.dex ?? 60) + (p.jmp ?? 60) + (p.acc ?? 60)) / 4);
}

function xpPercent(p) {
  const xp = p.xp ?? 0;
  const max = p.xpMax ?? ((p.level ?? 1) * 50 + 100);
  return Math.min(100, Math.round((xp / max) * 100));
}

// ── Animated run sprite ───────────────────────────────────
const SCALE = 3;
const SPRITE_W = 14 * SCALE;
const SPRITE_H = 18 * SCALE;

function RunSprite({ jerseyColor }) {
  const canvasRef = React.useRef(null);
  const frameRef = React.useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
      RUN_FRAMES[frameRef.current].forEach(([x, y, color]) => {
        ctx.fillStyle = color === JERSEY_BASE ? jerseyColor : color;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      });
    };

    draw();
    const id = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % RUN_FRAMES.length;
      draw();
    }, 80);
    return () => clearInterval(id);
  }, [jerseyColor]);

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_W}
      height={SPRITE_H}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
}

// ── Rank hex badge ────────────────────────────────────────
function RankHex({ size = 14 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <polygon points="50,8 86,28 86,72 50,92 14,72 14,28" fill="var(--c-left)" stroke="#fff" strokeWidth="2" />
      <text x="50" y="64" textAnchor="middle" fontFamily="Orbitron" fontWeight="900" fontSize="36" fill="#02060a">1</text>
    </svg>
  );
}

const CARD_W = 87.5;
const CARD_GAP = 8;

// ── Roster strip (5 pilot cards) ─────────────────────────
function RosterStrip({ roster, onOpen }) {
  const [startIdx, setStartIdx] = React.useState(0);
  const [collapsed, setCollapsed] = React.useState(() => roster.length > 0);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const outerRef = React.useRef(null);
  const [outerW, setOuterW] = React.useState(500);

  React.useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => setOuterW(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleCount = Math.max(1, Math.min(roster.length || 5, Math.floor((outerW + CARD_GAP) / (CARD_W + CARD_GAP))));
  const maxStart = Math.max(0, (roster.length || 5) - visibleCount);
  const showNav = maxStart > 0;
  const idx = Math.min(startIdx, maxStart);
  const slideOffset = idx * (CARD_W + CARD_GAP);

  const prev = () => setStartIdx(i => Math.max(0, i - 1));
  const next = () => setStartIdx(i => Math.min(maxStart, i + 1));

  if (!roster.length) {
    return (
      <div className="lb2-rstrip" onClick={() => { playSelect(); onOpen?.(); }} onMouseEnter={() => playCursor()} data-testid="roster-strip-empty">
        <div className="lb2-rstrip-row">
          <div className="lb2-rstrip-label">
            <span className="lb2-rstrip-h">ROSTER</span>
          </div>
          <div className="lb2-rstrip-cards-outer" ref={outerRef}>
            <div className="lb2-rstrip-clip">
              <div className="lb2-rstrip-cards">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="lb2-rs-card"
                       style={{ '--pos-c': 'rgba(255,255,255,0.15)', '--char-c': 'rgba(255,255,255,0.15)' }}>
                    <div className="lb2-rs-img">
                      <span style={{ fontFamily: 'var(--f-head)', fontSize: 18, color: 'rgba(255,255,255,0.18)' }}>?</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--c-left)' }}>
          DRAFT YOUR ROSTER ▸
        </div>
      </div>
    );
  }

  const safeIdx = Math.min(selectedIdx, roster.length - 1);
  const selected = roster[safeIdx];
  const selectedAbilities = [selected.ability, ...(selected.abilities ?? [])].map(abilityName).filter(Boolean);

  return (
    <div className={`lb2-rstrip${collapsed ? ' collapsed' : ''}`} data-testid="roster-strip">
      <div className="lb2-rstrip-row">
        <button
          className="lb2-rstrip-label"
          onClick={e => { e.stopPropagation(); playMenuSelect2(); setCollapsed(c => !c); }}
          onMouseEnter={() => playCursor()}
          aria-expanded={!collapsed}
        >
          <span className="lb2-rstrip-h">ROSTER</span>
          <span className="lb2-rstrip-chevron">{collapsed ? '▸' : '▾'}</span>
        </button>
        {!collapsed && (
          <div className="lb2-rstrip-cards-outer" ref={outerRef}>
            <div className="lb2-rstrip-clip">
              <div className="lb2-rstrip-cards" style={{ transform: `translateX(-${slideOffset}px)` }}>
                {roster.map((p, i) => {
                  const posColor = POS_COLORS[p.pos] ?? '#eaf6f3';
                  const tier = tierFromRarity(p.rarity ?? 3);
                  const rarityColor = RARITY_COLORS[p.rarity] ?? '#b0b8c8';
                  return (
                    <div key={i}
                         className={`lb2-rs-card tier-${tier} ${i === 0 ? 'leader' : ''} ${i === safeIdx ? 'selected' : ''}`}
                         style={{ '--pos-c': posColor, '--char-c': posColor, '--rc': rarityColor }}
                         onClick={e => { e.stopPropagation(); playMenuSelect2(); setSelectedIdx(i); }}
                         onMouseEnter={() => playCursor()}>
                      {i === 0 && <div className="lb2-rs-leader">CAPTAIN</div>}
                      <div className="lb2-rs-pos">{p.pos}</div>
                      <div className="lb2-rs-img">
                        <RunSprite jerseyColor={posColor} />
                      </div>
                      <div className="lb2-rs-overlay" />
                      <div className="lb2-rs-bot">
                        <span className="lb2-rs-lv">Lv<b>{p.level ?? 1}</b></span>
                        <div className="lb2-rs-ovr-group">
                          <span className="lb2-rs-ovr-label">OVR</span>
                          <span className="lb2-rs-ovrn">{overall(p)}</span>
                        </div>
                      </div>
                      <div className="lb2-rs-xpbar">
                        <div className="lb2-rs-xpbar-fill" style={{ width: `${xpPercent(p)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {showNav && idx > 0 && (
              <button className="lb2-rstrip-nav prev" onClick={e => { e.stopPropagation(); playCursor(); prev(); }} onMouseEnter={() => playCursor()}>‹</button>
            )}
            {showNav && idx < maxStart && (
              <button className="lb2-rstrip-nav next" onClick={e => { e.stopPropagation(); playCursor(); next(); }} onMouseEnter={() => playCursor()}>›</button>
            )}
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="lb2-rstrip-buff">
          <span className="lb2-rs-bufftag">ABILITIES</span>
          <span className="lb2-rs-bufftxt">
            {selectedAbilities.length > 0 ? (
              selectedAbilities.map((a, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="lb2-rs-buffsep"> · </span>}
                  <b>{a}</b>
                </React.Fragment>
              ))
            ) : (
              <span style={{ opacity: 0.5 }}>NONE</span>
            )}
          </span>
          <button
            className="lb2-rs-details"
            onClick={e => { e.stopPropagation(); playSelect(); onOpen?.(); }}
            onMouseEnter={() => playCursor()}
          >
            VIEW DETAILS ▸
          </button>
        </div>
      )}
    </div>
  );
}

// ── Featured section (hero card) ─────────────────────────
export function FeaturedSection({ onUnavailable }) {
  return (
    <div className="lb2-featured">
      <div className="lb2-ft-h">
        <span className="lbl">FEATURED</span>
        <span className="meta">EVENTS · NEWS · UPDATES</span>
        <button className="lb2-ft-more" onMouseEnter={() => playCursor()}>ALL ▸</button>
      </div>
      <div className="lb2-ft-hero">
        <div className="lb2-ft-hero-bg">
          <div className="lb2-ft-hero-grid" />
          <div className="lb2-ft-hero-glow" />
        </div>
        <div className="lb2-ft-hero-tag">
          <span className="lb2-ft-pulse" />
          <span>LIVE EVENTS - COMING SOON</span>
        </div>
        <div className="lb2-ft-hero-body">
          <div className="lb2-ft-hero-eyebrow">OPEN COURT · SEASON 1</div>
          <div className="lb2-ft-hero-title">NEON CUP <em>FINALS</em></div>
          <div className="lb2-ft-hero-sub">2,500 CR POOL · 256 SQUADS</div>
          <div className="lb2-ft-hero-meta">
            <span><em>STARTS</em><b>22:00 UTC</b></span>
            <span><em>ENTRY</em><b>FREE</b></span>
            <span><em>FORMAT</em><b>BO3 · 5v5</b></span>
          </div>
        </div>
        <button className="lb2-ft-hero-cta" onClick={() => { playSelect(); onUnavailable?.(); }} onMouseEnter={() => playCursor()}>
          <span className="g">⟫</span>
          <span>REGISTER</span>
        </button>
      </div>
    </div>
  );
}

// ── Warp lines ────────────────────────────────────────────
// Hyperspace-style streaks shooting radially outward from the modal center.
// Lines are positioned at the center, rotated to a per-streak --angle, then
// the keyframes translate them outward + scale them longer. Bright "head" on
// the outer end via a gradient. Memoised so each modal has a stable layout
// for its lifetime.
const WARP_COLORS = [
  '#ffffff', '#ffffff', '#ffffff',     // mostly white — like starlight
  '#5bf2d4',                            // cyan accent (matches modal border)
  '#ffd97a',                            // gold accent (matches reward number)
];
export function WarpLines({ count = 48 }) {
  const lines = React.useMemo(() => Array.from({ length: count }, (_, i) => {
    const color = WARP_COLORS[i % WARP_COLORS.length];
    return {
      id: i,
      angle: Math.random() * 360,
      delay: Math.random() * 1400,
      duration: 800 + Math.random() * 900,
      length: 60 + Math.random() * 140,
      thickness: 1 + Math.random() * 1.6,
      color,
    };
  }), [count]);
  return (
    <div className="lb2-warp" aria-hidden="true">
      {lines.map(l => (
        <span key={l.id} className="lb2-warp-line"
          style={{
            width: `${l.length}px`,
            height: `${l.thickness}px`,
            background: `linear-gradient(90deg, transparent 0%, ${l.color} 80%, #ffffff 100%)`,
            boxShadow: `0 0 6px ${l.color}`,
            animationDelay: `${l.delay}ms`,
            animationDuration: `${l.duration}ms`,
            '--angle': `${l.angle}deg`,
          }} />
      ))}
    </div>
  );
}

// ── Missions ──────────────────────────────────────────────
// Time until next UTC midnight / Monday 00:00 UTC, formatted "Xh Ym" or "Xd Yh".
function formatResetCountdown(type, now = Date.now()) {
  const d = new Date(now);
  let target;
  if (type === 'daily') {
    target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0);
  } else {
    // Days until next Monday UTC (1 = Monday). If today is Monday, +7.
    const dow = d.getUTCDay();
    const daysToMon = ((1 - dow + 7) % 7) || 7;
    target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysToMon, 0, 0, 0);
  }
  const ms = Math.max(0, target - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) {
    const days = Math.floor(h / 24);
    return `${days}d ${h % 24}h`;
  }
  return `${h}h ${m}m`;
}

function DailyMissionsSection({ missions, onClaim, onCreateChallenge, challengeActive, onViewChallenge }) {
  const [tab, setTab] = React.useState('daily');
  const [, forceTick] = React.useState(0);
  // Re-render once a minute so the reset countdown stays current.
  React.useEffect(() => {
    const id = setInterval(() => forceTick(x => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Featured missions (e.g. CREATE A CHALLENGE ME) live in the weekly list but
  // are surfaced in BOTH tabs. On the daily tab we prepend them; on the weekly
  // tab they're already present in the list, so we don't double them up.
  // Each row is tagged with its source `type` so the claim mutation can route
  // to the correct period hash regardless of which display tab is active.
  const featured = (missions?.weekly ?? []).filter(m => m.featured).map(m => ({ ...m, type: 'weekly' }));
  const baseRows = (missions?.[tab] ?? []).map(m => ({ ...m, type: tab }));
  const rows = tab === 'daily' ? [...featured, ...baseRows] : baseRows;
  const resetLabel = `RESETS IN ${formatResetCountdown(tab)}`;

  return (
    <div className="lb2-missions" data-testid="missions">
      <div className="lb2-ft-h">
        <span className="lbl">MISSIONS</span>
        <div className="lb2-mission-tabs">
          <button className={`lb2-mission-tab${tab === 'daily' ? ' active' : ''}`} onClick={() => { playMenuSelect2(); setTab('daily'); }} onMouseEnter={() => playCursor()}>DAILY</button>
          <button className={`lb2-mission-tab${tab === 'weekly' ? ' active' : ''}`} onClick={() => { playMenuSelect2(); setTab('weekly'); }} onMouseEnter={() => playCursor()}>WEEKLY</button>
        </div>
        <span className="meta">{resetLabel}</span>
      </div>
      <div className="lb2-ft-news">
        {rows.map(m => {
          const claimable = m.completed && !m.claimed;
          return (
            <div key={m.id} className={`lb2-ft-news-row accent-${m.accent}${m.claimed ? ' done' : ''}`}>
              <div className="lb2-ft-news-tag" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{m.reward}</span>
                <span style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.7 }}>CR</span>
              </div>
              <div className="lb2-ft-news-body">
                <div className="lb2-ft-news-title">{m.label}</div>
                <div className="lb2-ft-news-sub">{m.sub}</div>
                <div className="lb2-mission-bar">
                  <div className="lb2-mission-bar-fill" style={{ width: `${Math.round((m.progress / m.total) * 100)}%` }} />
                </div>
              </div>
              <div className="lb2-ft-news-time">
                {m.featured ? (
                  // CTA is driven by whether a live challenge post exists, not by
                  // mission progress — so a deleted post (challengeActive=false)
                  // flips back to POST NOW even though the weekly mission already
                  // credited. challengeActive → VIEW (open results), else POST NOW.
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <button
                      className="lb2-mission-cta"
                      data-testid="mission-create-challenge"
                      onClick={(e) => { e.stopPropagation(); playSelect(); challengeActive ? onViewChallenge?.() : onCreateChallenge?.(); }}
                      onMouseEnter={() => playCursor()}
                      style={{
                        background: 'linear-gradient(180deg,#ffe9bb,#ffd97a 55%,#d6a155)',
                        color: '#2a1a04',
                        border: '1px solid #ffe9bb',
                        borderRadius: 4,
                        padding: '5px 10px',
                        fontFamily: 'inherit', fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {challengeActive ? '✓ VIEW' : 'POST NOW ▸'}
                    </button>
                    {claimable && (
                      <button className="lb2-mission-claim-btn" onClick={(e) => { e.stopPropagation(); onClaim?.(m); }} onMouseEnter={() => playCursor()}>
                        CLAIM ▸
                      </button>
                    )}
                  </div>
                ) : (
                  m.claimed
                    ? <span style={{ color: '#5bf2d4' }}>✓ DONE</span>
                    : claimable
                      ? <button className="lb2-mission-claim-btn" onClick={(e) => { e.stopPropagation(); onClaim?.(m); }} onMouseEnter={() => playCursor()}>CLAIM ▸</button>
                      : `${m.progress}/${m.total}`
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Queue mode button ─────────────────────────────────────
const QUEUE_MODES = [
  { id: 'ranked',   label: 'RANKED',   desc: 'Climb the ladder. RP at stake.',       stake: '±25 RP', wait: '~12s',   accent: 'cyan', unavailable: true },
  { id: 'training', label: 'TRAINING', desc: 'Drill against the AI. No pressure.',   stake: '0 RP',   wait: 'INSTANT', accent: 'ink' },
];

function QueueButton({ q, selected, onSelect, onUnavailable }) {
  return (
    <button
      className={`lb2-qbtn accent-${q.accent} ${selected ? 'selected' : ''}`}
      onClick={() => { playSelect(); q.unavailable ? onUnavailable?.() : onSelect(q.id); }}
      onMouseEnter={() => playCursor()}
      data-testid={`queue-btn-${q.id}`}
    >
      <div className="lb2-qb-mark" />
      <div className="lb2-qb-body">
        <div className="lb2-qb-label">{q.label}</div>
        <div className="lb2-qb-desc">{q.desc}</div>
        <div className="lb2-qb-meta">
          <span><em>STAKE</em><b>{q.stake}</b></span>
          <span><em>QUEUE</em><b>{q.wait}</b></span>
        </div>
      </div>
      <div className="lb2-qb-arrow">{selected ? '▶' : ''}</div>
    </button>
  );
}

// ── Bottom nav ────────────────────────────────────────────
export function BottomNav({ onPlay, onCollection, onDraft, onAuction, onOptions, draftDisabled }) {
  return (
    <nav className="bnav" data-testid="bottom-nav">
      <div className="bnav-bg" />

      <button className="bnav-item" onClick={() => { playSelect(); onCollection?.(); }} onMouseEnter={() => playCursor()} data-testid="bnav-collection">
        <span className="bnav-ico">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </span>
        <span className="bnav-lbl">ROSTER</span>
      </button>

      <button className={`bnav-item${draftDisabled ? ' disabled' : ''}`}
        onClick={draftDisabled ? undefined : () => { playSelect(); onDraft?.(); }}
        onMouseEnter={draftDisabled ? undefined : () => playCursor()}
        data-testid="bnav-draft" disabled={draftDisabled}>
        <span className="bnav-ico">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="14" height="18" rx="1" />
            <path d="M6 2h14a2 2 0 0 1 2 2v16" />
            <path d="M6 9h8M6 13h6" />
          </svg>
        </span>
        <span className="bnav-lbl">DRAFT</span>
      </button>

      <button className="bnav-play" onClick={() => { playSelect(); onPlay?.(); }} onMouseEnter={() => playCursor()} aria-label="Play" data-testid="bnav-play">
        <span className="bnav-globe">
          <svg viewBox="0 0 100 100" className="bnav-globe-svg" aria-hidden="true">
            <defs>
              <radialGradient id="bnavGlobeFill" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="var(--c-left)" stopOpacity="0.42" />
                <stop offset="55%" stopColor="var(--c-left)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--c-left)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="36" fill="url(#bnavGlobeFill)" />
            <circle cx="50" cy="50" r="36" fill="none" stroke="var(--c-left)" strokeWidth="1.4" />
            <ellipse cx="50" cy="50" rx="36" ry="3"  fill="none" stroke="var(--c-left)" strokeWidth="0.6" opacity="0.5" />
            <ellipse cx="50" cy="50" rx="36" ry="13" fill="none" stroke="var(--c-left)" strokeWidth="0.6" opacity="0.6" />
            <ellipse cx="50" cy="50" rx="36" ry="24" fill="none" stroke="var(--c-left)" strokeWidth="0.6" opacity="0.45" />
            <ellipse cx="50" cy="50" rx="36" ry="33" fill="none" stroke="var(--c-left)" strokeWidth="0.6" opacity="0.3" />
            <g className="bnav-globe-long">
              <ellipse cx="50" cy="50" rx="36" ry="36" className="bgl-1" fill="none" stroke="var(--c-left)" strokeWidth="0.7" />
              <ellipse cx="50" cy="50" rx="36" ry="36" className="bgl-2" fill="none" stroke="var(--c-left)" strokeWidth="0.7" />
              <ellipse cx="50" cy="50" rx="36" ry="36" className="bgl-3" fill="none" stroke="var(--c-left)" strokeWidth="0.7" />
            </g>
            <circle cx="50" cy="50" r="1.6" fill="var(--c-left)" />
          </svg>
          <span className="bnav-globe-scan" />
        </span>
        <span className="bnav-globe-lbl">PLAY</span>
      </button>

      <button className="bnav-item" onClick={() => { playSelect(); onAuction?.(); }} onMouseEnter={() => playCursor()} data-testid="bnav-battlepass">
        <span className="bnav-ico">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
        <span className="bnav-lbl">BP</span>
      </button>

      <button className="bnav-item" onClick={() => { playSelect(); onOptions?.(); }} onMouseEnter={() => playCursor()} data-testid="bnav-options">
        <span className="bnav-ico">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </span>
        <span className="bnav-lbl">OPTIONS</span>
      </button>
    </nav>
  );
}

// ── Main LobbyScreen ──────────────────────────────────────
export default function LobbyScreen({ username, credits, homeRoster, missions, isFtue, onPlay, onCollection, onDraft, onAuction, onOptions, onEvents, onCreateChallenge, challengeActive, onViewChallenge, onClaim }) {
  const [selectedMode, setSelectedMode] = React.useState('training');
  const [modal, setModal] = React.useState(() => !username ? 'guest' : null);
  const [coachDismissed, setCoachDismissed] = React.useState(false);
  const [coachIdx, setCoachIdx] = React.useState(0);
  const COACH_LINES = [
    "Howdy! Welcome to the MBA!",
    "Tap the PLAY button in the middle to begin!",
  ];
  const advanceCoach = () => {
    setCoachIdx(i => {
      if (i + 1 >= COACH_LINES.length) {
        setCoachDismissed(true);
        return i;
      }
      return i + 1;
    });
  };
  const showModal = (type) => setModal(type);
  const closeModal = () => setModal(null);
  const hasDraft = homeRoster.length >= 5;

  // Mission claim celebration. The modal is queued explicitly when the user
  // presses CLAIM — no polling or snapshot diffing needed. Each claimed mission
  // is pushed onto missionQueue; the modal pops one at a time and the user
  // dismisses each with COLLECT before the next appears.
  const [missionQueue, setMissionQueue] = React.useState([]);
  const missionPopup = missionQueue[0] ?? null;
  const dismissMissionPopup = () => setMissionQueue(q => q.slice(1));

  // Called by DailyMissionsSection when the user clicks CLAIM on a mission row.
  // Fires the claim mutation, pushes the mission onto the celebration queue,
  // then refreshes missions so the row flips to DONE.
  const handleClaimMission = async (mission) => {
    try {
      const result = await trpc.missions.claim.mutate({ type: mission.type, missionId: mission.id });
      if (result.claimed) {
        setMissionQueue(q => [...q, mission]);
        onClaim?.();
      }
    } catch {
      // Claim errors are silent — the row stays in CLAIM state and the user can retry.
    }
  };

  const handlePlay = () => {
    if (isFtue || !homeRoster.length) {
      onDraft();
    } else {
      onPlay(selectedMode);
    }
  };

  // If the user has no roster yet, route any "roster/collection" entry point
  // to the draft flow instead so they can create one.
  const handleCollection = () => {
    if (!homeRoster.length) onDraft();
    else onCollection();
  };

  return (
    <div className={`lobby2${isFtue && !coachDismissed && !modal ? ' lobby2-ftue' : ''}`} data-testid="lobby-screen">

      {/* Title strip (shared with draft/collection/events screens) */}
      <TitleStrip credits={credits} onEvents={onEvents} />

      {/* Scrollable body */}
      <div className="lb2-body">

        {/* User block */}
        <div className="lb2-user-block">
          <div className="lb2-ub-avatar">
            <img src="/jxts5wo9u41e1.png" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
          </div>
          <div className="lb2-ub-id">
            <div className="lb2-ub-name">{username ? `u/${username}` : 'PLAYER'}</div>
            <div className="lb2-ub-title">THE LAST DRAFT</div>
          </div>
          <div className="lb2-ub-stats">
            <div className="lb2-ub-stat">
              <span className="lbl">ROSTER</span>
              <span className="val">{homeRoster.length}<em>/</em>5</span>
            </div>
          </div>
          <RosterStrip roster={homeRoster} onOpen={handleCollection} />
        </div>

        {/* Daily missions */}
        <DailyMissionsSection missions={missions} onClaim={handleClaimMission} onCreateChallenge={onCreateChallenge} challengeActive={challengeActive} onViewChallenge={onViewChallenge} />

        {/* Queue selector */}
        <div className="lb2-section-h">
          <span className="lb2-sh-bar" />
          <span>GAME TYPE</span>
          <span className="lb2-sh-bar" />
        </div>
        <div className="lb2-queue">
          {QUEUE_MODES.map(q => (
            <QueueButton key={q.id} q={q} selected={selectedMode === q.id} onSelect={setSelectedMode} onUnavailable={() => showModal('unavailable')} />
          ))}
        </div>

      </div>

      {/* Modal */}
      {modal && (
        <div data-testid="lobby-modal" style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={closeModal}>
          <div style={{
            background: '#0d1117', border: '1px solid #ff7a3c',
            padding: '24px 20px', maxWidth: 260, textAlign: 'center',
            fontFamily: 'monospace',
          }} onClick={e => e.stopPropagation()}>
            {modal === 'guest' ? (<>
              <div style={{ color: '#ff7a3c', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>NOT LOGGED IN</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
                You can still play, but your progress, roster, and credits won't be saved.
              </div>
            </>) : (<>
              <div style={{ color: '#ff7a3c', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>NOT AVAILABLE</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
                This feature is not available yet. Check back soon.
              </div>
            </>)}
            <button
              onClick={() => { playCancel(); closeModal(); }}
              onMouseEnter={() => playCursor()}
              style={{
                background: '#ff7a3c', color: '#000', border: 'none',
                padding: '6px 20px', fontFamily: 'monospace', fontSize: 10,
                letterSpacing: '0.1em', cursor: 'pointer',
              }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* Mission claim celebration. Shows one at a time after the user
          presses CLAIM on a mission row. Each queued popup remounts its
          warp streaks and card animation so multi-claim sequences feel distinct. */}
      {missionPopup && (
        <div data-testid="mission-complete-modal" className="lb2-mission-modal" onClick={dismissMissionPopup}>
          {/* Re-key both children on the popup id so each queued popup
              remounts and replays its entrance animation + warp streaks.
              Without this, transitioning m1 → m2 in the queue swaps the
              card's content silently and the user can miss the second one. */}
          <WarpLines key={`warp-${missionPopup.id}`} />
          <div key={`card-${missionPopup.id}`} className="lb2-mission-modal-card" onClick={e => e.stopPropagation()}>
            <div className="lb2-mission-modal-tag">MISSION COMPLETE</div>
            <div className="lb2-mission-modal-title">{missionPopup.label}</div>
            <div className="lb2-mission-modal-sub">{missionPopup.sub}</div>
            <div className="lb2-mission-modal-reward">
              <span className="amt">+{missionPopup.reward}</span>
              <span className="unit">CR</span>
            </div>
            <button className="lb2-mission-modal-cta" onClick={() => { playSelect(); dismissMissionPopup(); }} onMouseEnter={() => playCursor()}>
              COLLECT ▸
            </button>
          </div>
        </div>
      )}

      {/* FTUE coach — pages through intro lines, then points at PLAY. */}
      {isFtue && !coachDismissed && !modal && (
        <div className="lb2-coach" onClick={advanceCoach}>
          <svg viewBox="0 0 600 112" preserveAspectRatio="xMidYMid meet"
            width="100%" height="112" style={{ display: 'block', cursor: 'pointer' }}>
            <BballTip
              text={COACH_LINES[coachIdx]}
              charX={12} charY={12} scale={0.6}
              dlgX={60} dlgY={32} dlgW={540} dlgH={48}
              textScale={1.6}
              textX={118}
              tapHint
            />
          </svg>
        </div>
      )}

      {/* Bottom nav — sole navigation */}
      <BottomNav
        onPlay={handlePlay}
        onCollection={handleCollection}
        onDraft={onDraft}
        onAuction={onAuction}
        onOptions={onOptions}
        draftDisabled={false}
      />
    </div>
  );
}

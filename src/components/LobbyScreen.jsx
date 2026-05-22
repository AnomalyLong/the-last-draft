import React from 'react';
import '../styles/lobby.css';
import { RUN_FRAMES } from '../sprites/run.js';
import { JERSEY_BASE } from '../constants.js';

const POS_COLORS = { PG: '#3ea6ff', SG: '#a855f7', SF: '#19e6c4', PF: '#ff7a3c', C: '#ffc94a' };

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
      <div className="lb2-rstrip" onClick={onOpen} data-testid="roster-strip-empty">
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

  const leader = roster[0];
  const leaderAbilities = [leader.ability, ...(leader.abilities ?? [])].map(abilityName).filter(Boolean);

  return (
    <div className="lb2-rstrip" data-testid="roster-strip">
      <div className="lb2-rstrip-row">
        <div className="lb2-rstrip-label">
          <span className="lb2-rstrip-h">ROSTER</span>
        </div>
        <div className="lb2-rstrip-cards-outer" ref={outerRef}>
          <div className="lb2-rstrip-clip">
            <div className="lb2-rstrip-cards" style={{ transform: `translateX(-${slideOffset}px)` }}>
              {roster.map((p, i) => {
                const posColor = POS_COLORS[p.pos] ?? '#eaf6f3';
                const tier = tierFromRarity(p.rarity ?? 3);
                return (
                  <div key={i}
                       className={`lb2-rs-card tier-${tier} ${i === 0 ? 'leader' : ''}`}
                       style={{ '--pos-c': posColor, '--char-c': posColor }}
                       onClick={onOpen}>
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
            <button className="lb2-rstrip-nav prev" onClick={e => { e.stopPropagation(); prev(); }}>‹</button>
          )}
          {showNav && idx < maxStart && (
            <button className="lb2-rstrip-nav next" onClick={e => { e.stopPropagation(); next(); }}>›</button>
          )}
        </div>
      </div>
      {leaderAbilities.length > 0 && (
        <div className="lb2-rstrip-buff">
          <span className="lb2-rs-bufftag">ABILITIES</span>
          <span className="lb2-rs-bufftxt">
            {leaderAbilities.map((a, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="lb2-rs-buffsep"> · </span>}
                <b>{a}</b>
              </React.Fragment>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Featured events + news (hardcoded) ───────────────────
function FeaturedSection() {
  return (
    <div className="lb2-featured">
      <div className="lb2-ft-h">
        <span className="lbl">FEATURED</span>
        <span className="meta">EVENTS · NEWS · UPDATES</span>
        <button className="lb2-ft-more">ALL ▸</button>
      </div>
      <div className="lb2-ft-hero">
        <div className="lb2-ft-hero-bg">
          <div className="lb2-ft-hero-grid" />
          <div className="lb2-ft-hero-glow" />
        </div>
        <div className="lb2-ft-hero-tag">
          <span className="lb2-ft-pulse" />
          <span>LIVE EVENT</span>
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
        <button className="lb2-ft-hero-cta">
          <span className="g">⟫</span>
          <span>REGISTER</span>
        </button>
      </div>
      <div className="lb2-ft-news">
        <div className="lb2-ft-news-row accent-cyan">
          <div className="lb2-ft-news-tag">PATCH</div>
          <div className="lb2-ft-news-body">
            <div className="lb2-ft-news-title">v1.2.0 · SHOT ARC TUNING</div>
            <div className="lb2-ft-news-sub">ACC rebalance · 3pt window adjusted · netcode pass</div>
          </div>
          <div className="lb2-ft-news-time">2h</div>
        </div>
        <div className="lb2-ft-news-row accent-magenta">
          <div className="lb2-ft-news-tag">DROP</div>
          <div className="lb2-ft-news-body">
            <div className="lb2-ft-news-title">LIMITED · CHROME SLAM PACK</div>
            <div className="lb2-ft-news-sub">5★ guaranteed · ends in 18h</div>
          </div>
          <div className="lb2-ft-news-time">NEW</div>
        </div>
        <div className="lb2-ft-news-row accent-gold">
          <div className="lb2-ft-news-tag">AUCTION</div>
          <div className="lb2-ft-news-body">
            <div className="lb2-ft-news-title">ZEEKBECK · LOT 0451 CLOSING</div>
            <div className="lb2-ft-news-sub">Current bid ◉ 18,450 · 142 bidders</div>
          </div>
          <div className="lb2-ft-news-time">2h 14m</div>
        </div>
      </div>
    </div>
  );
}

// ── Queue mode button ─────────────────────────────────────
const QUEUE_MODES = [
  { id: 'ranked',   label: 'RANKED',   desc: 'Climb the ladder. RP at stake.',       stake: '±25 RP', wait: '~12s',   accent: 'cyan' },
  { id: 'training', label: 'TRAINING', desc: 'Drill against the AI. No pressure.',   stake: '0 RP',   wait: 'INSTANT', accent: 'ink' },
];

function QueueButton({ q, selected, onSelect }) {
  return (
    <button
      className={`lb2-qbtn accent-${q.accent} ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(q.id)}
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
function BottomNav({ onPlay, onCollection, onDraft, onAuction, onOptions, draftDisabled }) {
  return (
    <nav className="bnav" data-testid="bottom-nav">
      <div className="bnav-bg" />

      <button className="bnav-item" onClick={onCollection} data-testid="bnav-collection">
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

      <button className={`bnav-item${draftDisabled ? ' disabled' : ''}`} onClick={draftDisabled ? undefined : onDraft} data-testid="bnav-draft" disabled={draftDisabled}>
        <span className="bnav-ico">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="14" height="18" rx="1" />
            <path d="M6 2h14a2 2 0 0 1 2 2v16" />
            <path d="M6 9h8M6 13h6" />
          </svg>
        </span>
        <span className="bnav-lbl">DRAFT</span>
      </button>

      <button className="bnav-play" onClick={onPlay} aria-label="Play" data-testid="bnav-play">
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

      <button className="bnav-item" onClick={onAuction} data-testid="bnav-auction">
        <span className="bnav-ico">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
        <span className="bnav-lbl">AUCTION</span>
      </button>

      <button className="bnav-item" onClick={onOptions} data-testid="bnav-options">
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
export default function LobbyScreen({ username, credits, homeRoster, isFtue, onPlay, onCollection, onDraft, onAuction, onOptions }) {
  const [selectedMode, setSelectedMode] = React.useState('ranked');
  const hasDraft = homeRoster.length >= 5;

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
    <div className="lobby2" data-testid="lobby-screen">

      {/* Title strip */}
      <div className="lb2-title-strip">
        <span className="lb2-ts-dot" />
        <span className="lb2-ts-text">THE LAST DRAFT</span>
        <span className="lb2-ts-time">{(credits ?? 0).toLocaleString()} CR</span>
      </div>

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

        {/* Featured events */}
        <FeaturedSection />

        {/* Queue selector */}
        <div className="lb2-section-h">
          <span className="lb2-sh-bar" />
          <span>SELECT MISSION</span>
          <span className="lb2-sh-bar" />
        </div>
        <div className="lb2-queue">
          {QUEUE_MODES.map(q => (
            <QueueButton key={q.id} q={q} selected={selectedMode === q.id} onSelect={setSelectedMode} />
          ))}
        </div>

      </div>

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

import React from 'react';
import idleGif from './assets/idle.gif';

// Challenge Me Card — Reddit-style shareable card where a user invites others
// to challenge their team. Same shell as BidCard but the right column scrolls
// through the user's roster (PG → C) and the leaderboard shows previous
// challenges with W/L outcomes.

function StatBar({ lbl, val, color }) {
  const v = val ?? 0;
  return (
    <div className="ps-stat-row">
      <span className="ps-stat-lbl">{lbl}</span>
      <span className="ps-stat-bar">
        <span className="ps-stat-fill" style={{ width: `${v}%`, background: color, boxShadow: `0 0 6px ${color}90` }}></span>
      </span>
      <span className="ps-stat-val">{v}</span>
    </div>
  );
}

const POS_COLORS = {
  PG: '#3ea6ff', SG: '#a855f7', SF: '#19e6c4',
  PF: '#ff7a3c', C: '#ffc94a', '?': '#475569',
};

const DEFAULT_ROSTER = [
  { position: 'PG', tier: 'ultra rare', color: '#ffd97a',
    name: 'KAEL THORNE',  callsign: 'NEON FOX',
    overall: 87, stats: { spd: 84, dex: 78, jmp: 90, acc: 82 },
    abilities: ['SHARPSHOOTER', 'SPEEDY'] },
  { position: 'SG', tier: 'super rare', color: '#a78bfa',
    name: 'RYU TAKEDA',   callsign: 'BLADE',
    overall: 79, stats: { spd: 76, dex: 88, jmp: 72, acc: 84 },
    abilities: ['ANKLE BREAKER'] },
  { position: 'SF', tier: 'ultra rare', color: '#ffd97a',
    name: 'JAX MORENO',   callsign: 'HAWK',
    overall: 81, stats: { spd: 80, dex: 74, jmp: 86, acc: 78 },
    abilities: ['PLAY MAKER', 'PICK POCKET'] },
  { position: 'PF', tier: 'super rare', color: '#a78bfa',
    name: 'CYRO IRONS',   callsign: 'WALL',
    overall: 76, stats: { spd: 62, dex: 70, jmp: 82, acc: 68 },
    abilities: ['IRON BLOCK'] },
  { position: 'C',  tier: 'rare', color: '#19e6c4',
    name: 'BIG TOMO',     callsign: 'TITAN',
    overall: 73, stats: { spd: 58, dex: 64, jmp: 78, acc: 66 },
    abilities: ['DUNK MASTER'] },
];

const DEFAULT_CHALLENGES = [
  { opponent: 'u/CrimsonAce_7',  result: 'W', score: '78-65' },
  { opponent: 'u/SteelHoops_22', result: 'L', score: '68-72' },
  { opponent: 'u/StarSeeker_99', result: 'W', score: '92-80' },
];

const DEFAULT_OWNER = {
  user: 'u/HoopMaster_42',
  team: 'CRIMSON DUNKERS',
  record: { wins: 24, losses: 11 },
};

const NATIVE_SIZE = 880; // matches the .post-card width in post.css
const PADDING    = 8;

export default function ChallengeCard({
  roster = DEFAULT_ROSTER,
  challenges = DEFAULT_CHALLENGES,
  owner = DEFAULT_OWNER,
  postDate = new Date(2026, 4, 16),
  onBack,
  onChallenge,
  showBackButton = false,
}) {
  const wrapRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      const next = Math.min(1, (w - PADDING) / NATIVE_SIZE, (h - PADDING) / NATIVE_SIZE);
      setScale(Math.max(0.1, next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const safeRoster = roster.length > 0 ? roster : DEFAULT_ROSTER;
  const player = safeRoster[idx] ?? safeRoster[0];
  const posColor = POS_COLORS[player.position] || '#19e6c4';

  const day = ['SUN','MON','TUE','WED','THU','FRI','SAT'][postDate.getDay()];
  const dateLine = postDate
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();

  const prev = () => setIdx((i) => (i - 1 + safeRoster.length) % safeRoster.length);
  const next = () => setIdx((i) => (i + 1) % safeRoster.length);

  const totalGames = owner.record.wins + owner.record.losses;
  const winPct = totalGames > 0 ? Math.round((owner.record.wins / totalGames) * 100) : 0;

  const stats = player.stats ?? {};
  const abilities = player.abilities ?? [];

  const avgOvr = safeRoster.length
    ? Math.round(safeRoster.reduce((s, p) => s + (p.overall ?? 0), 0) / safeRoster.length)
    : 0;

  return (
    <div ref={wrapRef} className="post-state" data-state="post" style={{ '--post-scale': scale }}>
      {showBackButton && (
        <button className="post-back" onClick={onBack}>
          <span>◀</span><span>BACK</span>
        </button>
      )}

      <div className="post-card" style={{ '--pos-c': posColor, '--tier-c': player.color }}>
        {/* ── Diagonal date sash ── */}
        <div className="ps-sash">
          <div className="ps-sash-day">{day}</div>
          <div className="ps-sash-date">{dateLine}</div>
        </div>

        {/* ── BG art ── */}
        <div className="ps-bg">
          <div className="ps-bg-tint"></div>
          <div className="ps-bg-grid"></div>
          <div className="ps-bg-rays"></div>
        </div>

        {/* ── Logo / title ── */}
        <div className="ps-logo">
          <div className="ps-logo-flair">
            <span className="ps-coin">◉</span>
            <span className="ps-logo-pre">CHALLENGE</span>
          </div>
          <div className="ps-logo-big">MBA</div>
          <div className="ps-logo-sub">{owner.team} · {owner.user}</div>
        </div>

        {/* ── Open badge ── */}
        <div className="ps-aucbadge">
          <span className="ps-aucbadge-dot"></span>
          OPEN
        </div>

        {/* ── Roster carousel ── */}
        <div className="ps-char">
          <div className="ps-char-glow"></div>
          <div className="ps-char-stage">
            <button className="ps-roster-nav ps-roster-nav-l" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous player">◀</button>
            {/* Team average OVR — sits above the player */}
            <div className="ps-team-ovr">
              <span className="ps-team-ovr-lbl">TEAM AVG OVR</span>
              <span className="ps-team-ovr-val">{avgOvr}</span>
            </div>
            <img src={idleGif} className="ps-char-sprite" alt="" />
            <div className="ps-char-shadow"></div>
            <button className="ps-roster-nav ps-roster-nav-r" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next player">▶</button>
          </div>

          <div className="ps-char-meta">
            <div className="ps-char-meta-top">
              <div className="ps-char-pos" style={{ background: posColor }}>{player.position}</div>
              <div className="ps-char-name">
                <span className="ps-char-name-big">{player.name}</span>
                <span className="ps-char-name-call" style={{ color: player.color }}>{player.tier?.toUpperCase()}</span>
              </div>
              <div className="ps-char-ovr">
                <span>{player.overall}</span><em>OVR</em>
              </div>
            </div>

            {(stats.spd != null || stats.dex != null || stats.jmp != null || stats.acc != null) && (
              <div className="ps-char-stats">
                <StatBar lbl="SPD" val={stats.spd} color="#22d3ee" />
                <StatBar lbl="DEX" val={stats.dex} color="#a855f7" />
                <StatBar lbl="JMP" val={stats.jmp} color="#22c55e" />
                <StatBar lbl="ACC" val={stats.acc} color="#fb923c" />
              </div>
            )}

            {abilities.length > 0 && (
              <div className="ps-char-abilities">
                {abilities.slice(0, 4).map((ab) => (
                  <span key={ab} className="ps-ability">★ {ab}</span>
                ))}
              </div>
            )}

            {/* Position selector — jump to any roster slot */}
            <div className="ps-roster-dots">
              <span className="ps-roster-label">VIEWING:</span>
              {safeRoster.map((p, i) => (
                <button
                  key={`${p.position}-${i}`}
                  className={`ps-roster-dot ${i === idx ? 'active' : ''}`}
                  style={{ '--dot-c': POS_COLORS[p.position] || '#19e6c4' }}
                  onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                  aria-label={`${p.position} — ${p.name}`}
                >
                  {p.position}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Owner identity + Previous Challenges ── */}
        <div className="ps-board-col">
          <div className="ps-owner">
            <div className="lb2-ub-avatar">
              <img alt="avatar" src="/jxts5wo9u41e1.png" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
            </div>
            <div className="ps-owner-meta">
              <div className="ps-owner-user">{owner.user}</div>
              <div className="ps-owner-team">{owner.team}</div>
              <div className="ps-owner-record">
                <span className="ps-rec-w">{owner.record.wins}W</span>
                <span className="ps-rec-sep">—</span>
                <span className="ps-rec-l">{owner.record.losses}L</span>
                <span className="ps-rec-pct">{winPct}%</span>
              </div>
            </div>
          </div>

          <div className="ps-board">
            <div className="ps-board-h">
              <span className="ps-board-glyph">◆</span>
              Previous Challenges
            </div>
          {challenges.length === 0 ? (
            <div className="ps-board-empty">No challenges yet</div>
          ) : (
            challenges.map((c, i) => (
              <div key={`${c.opponent}-${i}`} className="ps-board-row">
                <div className={`ps-result ${c.result === 'W' ? 'win' : 'loss'}`}>
                  {c.result}
                </div>
                <div className="ps-board-info">
                  <div className="ps-board-user">{c.opponent}</div>
                  <div className="ps-board-bid ps-board-score">
                    {c.score} <em>FINAL</em>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>
        </div>

        {/* ── CTA ── */}
        <button className="ps-cta" onClick={(e) => onChallenge && onChallenge(owner.user, e)}>
          <span className="ps-cta-label">CHALLENGE ME</span>
          <span className="ps-cta-arrow">▶</span>
        </button>

        {/* Record moved up under the owner avatar; footer removed. */}

        <div className="ps-substrip">
          <div className="ps-sub">r/LastDraftGame</div>
          <div className="ps-sub-meta">
            <span>▲ 14.2k</span>
            <span>💬 482</span>
            <span>↗ 1.2k</span>
          </div>
        </div>
      </div>
    </div>
  );
}

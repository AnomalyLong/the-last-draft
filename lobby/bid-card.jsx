import React from 'react';
import idleGif from './assets/idle.gif';

// Bid Card — Reddit-style shareable card for an auction. Will be reused as a
// template for other post types ("challenge my team" etc.) but this variant
// is bid-specific: timer, top bidders, BID NOW CTA.

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

function fmtPostTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

const POS_COLORS = {
  PG: '#3ea6ff', SG: '#a855f7', SF: '#19e6c4',
  PF: '#ff7a3c', C: '#ffc94a', '?': '#475569',
};

const DEFAULT_PLAYER = {
  position: 'SF',
  tier: 'ultra rare',
  color: '#ffd97a',
  name: 'KAEL THORNE',
  callsign: 'NEON FOX',
  overall: 87,
  stats: { spd: 84, dex: 78, jmp: 90, acc: 82 },
  abilities: ['SHARPSHOOTER', 'SPEEDY'],
};

const DEFAULT_TOP_BIDDERS = [
  { rank: 1, user: 'u/TokyoSlam_42', bid: 18450, medal: '#ffd97a' },
  { rank: 2, user: 'u/PixelPunk_99', bid: 17200, medal: '#cbd5e1' },
  { rank: 3, user: 'u/HoopLord_TT',  bid: 16800, medal: '#cd7f32' },
];

const NATIVE_SIZE = 880; // matches the .post-card width in post.css
const PADDING    = 8;   // small gap between card edge and wrapper edge

export default function BidCard({
  player = DEFAULT_PLAYER,
  topBidders = DEFAULT_TOP_BIDDERS,
  endsInSeconds = 2 * 3600 + 14 * 60 + 23,
  postDate = new Date(2026, 4, 16), // Sat May 16, 2026
  onBack,
  onBid,
  showBackButton = false,
}) {
  const posColor = POS_COLORS[player.position] || '#19e6c4';
  const [timeLeft, setTimeLeft] = React.useState(endsInSeconds);
  const wrapRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);

  // Recompute scale whenever the wrapper resizes so the 880×880 card fits.
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

  const day = ['SUN','MON','TUE','WED','THU','FRI','SAT'][postDate.getDay()];
  const dateLine = postDate
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();

  React.useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Bid heat — % of "max" bid (visual only)
  const heatPct = topBidders.length
    ? Math.min(100, Math.round((topBidders[0].bid / 25000) * 100))
    : 0;

  const stats = player.stats ?? {};
  const abilities = player.abilities ?? [];

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

        {/* ── Game logo / title ── */}
        <div className="ps-logo">
          <div className="ps-logo-flair">
            <span className="ps-coin">◉</span>
            <span className="ps-logo-pre">THE</span>
          </div>
          <div className="ps-logo-big">MBA</div>
          <div className="ps-logo-sub">MULTIVERSE BASKETBALL ASSOCIATION</div>
        </div>

        {/* ── Auction badge ── */}
        <div className="ps-aucbadge">
          <span className="ps-aucbadge-dot"></span>
          AUCTION LIVE
        </div>

        {/* ── Featured character (big sprite on right) ── */}
        <div className="ps-char">
          <div className="ps-char-glow"></div>
          <div className="ps-char-stage">
            <div className="ps-char-tier">
              <span className="ps-tier-pill">{player.tier?.toUpperCase()} TIER</span>
            </div>
            <img src={idleGif} className="ps-char-sprite" alt="" />
            <div className="ps-char-shadow"></div>
          </div>

          <div className="ps-char-meta">
            <div className="ps-char-meta-top">
              <div className="ps-char-pos" style={{ background: posColor }}>{player.position}</div>
              <div className="ps-char-name">
                <span className="ps-char-name-big">{player.name}</span>
                <span className="ps-char-name-call">「{player.callsign}」</span>
              </div>
              <div className="ps-char-ovr">
                <span>{player.overall}</span><em>OVR</em>
              </div>
            </div>

            {/* Stats bars — matches the draft-card pattern (lbl | bar | val) */}
            {(stats.spd != null || stats.dex != null || stats.jmp != null || stats.acc != null) && (
              <div className="ps-char-stats">
                <StatBar lbl="SPD" val={stats.spd} color="#22d3ee" />
                <StatBar lbl="DEX" val={stats.dex} color="#a855f7" />
                <StatBar lbl="JMP" val={stats.jmp} color="#22c55e" />
                <StatBar lbl="ACC" val={stats.acc} color="#fb923c" />
              </div>
            )}

            {/* Abilities — small pills */}
            {abilities.length > 0 && (
              <div className="ps-char-abilities">
                {abilities.slice(0, 4).map((ab) => (
                  <span key={ab} className="ps-ability">★ {ab}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Top bidders leaderboard ── */}
        <div className="ps-board">
          <div className="ps-board-h">
            <span className="ps-board-glyph">◆</span>
            Top Bidders
          </div>
          {topBidders.map(b => (
            <div key={b.rank} className="ps-board-row">
              <div className="ps-medal" style={{ '--medal-c': b.medal }}>
                <span className="ps-medal-num">{b.rank}</span>
                <span className="ps-medal-tail"></span>
              </div>
              <div className="ps-board-info">
                <div className="ps-board-user">{b.user}</div>
                <div className="ps-board-bid">
                  <span className="ps-coin-sm">◉</span>
                  {b.bid.toLocaleString()} <em>CREDITS</em>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA button ── */}
        <button className="ps-cta" onClick={() => onBid && onBid(player.id ?? player.name)}>
          <span className="ps-cta-label">BID NOW</span>
          <span className="ps-cta-arrow">▶</span>
        </button>

        {/* ── Footer bar ── */}
        <div className="ps-foot">
          <span className="ps-foot-lbl">ENDS IN: {fmtPostTime(timeLeft)}</span>
          <div className="ps-foot-bar">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className={`ps-foot-cell ${i < Math.floor(heatPct / 6.25) ? 'on' : ''}`}></span>
            ))}
          </div>
        </div>

        {/* ── Subreddit / share strip ── */}
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

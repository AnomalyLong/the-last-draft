/* global React */
/* Post view — shareable Reddit-style post for the live auction */

const { useState: useStateP, useEffect: useEffectP } = React;

function fmtPostTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

const TOP_BIDDERS = [
  { rank: 1, user: "u/TokyoSlam_42", bid: 18450, medal: "#ffd97a" },
  { rank: 2, user: "u/PixelPunk_99", bid: 17200, medal: "#cbd5e1" },
  { rank: 3, user: "u/HoopLord_TT",  bid: 16800, medal: "#cd7f32" },
];

const POS_COLORS_PT = {
  PG: "#3ea6ff", SG: "#a855f7", SF: "#19e6c4",
  PF: "#ff7a3c", C: "#ffc94a", "?": "#475569",
};

function PostView({ pilotId, onBack, onBid }) {
  const pilots = window.PILOTS || [];
  const pilot = pilots.find(p => p.id === pilotId) || pilots[0];
  const posColor = POS_COLORS_PT[pilot.position] || "#19e6c4";
  const [timeLeft, setTimeLeft] = useStateP(2 * 3600 + 14 * 60 + 23);
  const date = new Date(2026, 4, 16); // Sat May 16, 2026
  const day = ["SUN","MON","TUE","WED","THU","FRI","SAT"][date.getDay()];
  const dateLine = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();

  useEffectP(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Bid heat — % of "max" bid (just visual)
  const heatPct = Math.min(100, Math.round((TOP_BIDDERS[0].bid / 25000) * 100));

  return (
    <div className="post-state">
      <button className="post-back" onClick={onBack}>
        <span>◀</span><span>BACK</span>
      </button>

      <div className="post-card" style={{ "--pos-c": posColor, "--tier-c": pilot.color }}>
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
          <div className="ps-logo-sub">MOON BASKETBALL ASSOCIATION</div>
        </div>

        {/* ── Auction badge ── */}
        <div className="ps-aucbadge">
          <span className="ps-aucbadge-dot"></span>
          AUCTION LIVE
        </div>

        {/* ── Featured character (big sprite on right) ── */}
        <div className="ps-char">
          <div className="ps-char-glow"></div>
          <div className="ps-char-tier">
            <span className="ps-tier-pill">{pilot.tier?.toUpperCase()} TIER</span>
          </div>
          <img src="assets/idle.gif" className="ps-char-sprite" alt="" />
          <div className="ps-char-floor"></div>
          <div className="ps-char-shadow"></div>
          <div className="ps-char-meta">
            <div className="ps-char-pos" style={{ background: posColor }}>{pilot.position}</div>
            <div className="ps-char-name">
              <span className="ps-char-name-big">{pilot.name}</span>
              <span className="ps-char-name-call">「{pilot.callsign}」</span>
            </div>
            <div className="ps-char-ovr">
              <span>{pilot.overall}</span><em>OVR</em>
            </div>
          </div>
        </div>

        {/* ── Top bidders leaderboard ── */}
        <div className="ps-board">
          <div className="ps-board-h">
            <span className="ps-board-glyph">◆</span>
            Top Bidders
          </div>
          {TOP_BIDDERS.map(b => (
            <div key={b.rank} className="ps-board-row">
              <div className="ps-medal" style={{ "--medal-c": b.medal }}>
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
        <button className="ps-cta" onClick={() => onBid && onBid(pilot.id)}>
          <span className="ps-cta-label">BID NOW</span>
          <span className="ps-cta-arrow">▶</span>
        </button>

        {/* ── Footer bar ── */}
        <div className="ps-foot">
          <span className="ps-foot-lbl">ENDS IN: {fmtPostTime(timeLeft)}</span>
          <div className="ps-foot-bar">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className={`ps-foot-cell ${i < Math.floor(heatPct / 6.25) ? "on" : ""}`}></span>
            ))}
          </div>
        </div>

        {/* ── Subreddit / share strip ── */}
        <div className="ps-substrip">
          <div className="ps-sub">r/TheMBA</div>
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

window.PostView = PostView;

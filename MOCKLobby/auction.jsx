/* global React */
/* Auction page — bid on a pilot from the collection */

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

// ─── Bid simulation data ─────────────────────────────────────
const BIDDERS = [
  { user: "u/TokyoSlam_42", credits: 18450 },
  { user: "u/PixelPunk_99", credits: 17200 },
  { user: "u/HoopLord_TT", credits: 16800 },
  { user: "u/CryptoBaller", credits: 15500 },
  { user: "u/ZeroGravity", credits: 14250 },
  { user: "u/PointGuardKing", credits: 13800 },
  { user: "u/SneakerSlam", credits: 12500 },
  { user: "u/DunkMaster99", credits: 11900 },
  { user: "u/NeonHoops", credits: 10750 },
  { user: "u/ShotClock_TT", credits: 9800 },
  { user: "u/MoonBaseFan", credits: 8500 },
  { user: "u/RookieRiser", credits: 7250 },
  { user: "u/peetan_42", credits: 6800, you: true },
  { user: "u/CourtVisionX", credits: 5400 },
];

const POS_COLORS_A = {
  PG: "#3ea6ff", SG: "#a855f7", SF: "#19e6c4",
  PF: "#ff7a3c", C: "#ffc94a", "?": "#475569",
};

// ─── Stars row (shared style with collection) ────────────────
function StarsA({ count, max = 5, size = 14 }) {
  return (
    <div className="stars" style={{ "--star-size": `${size}px` }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`star ${i < count ? "on" : ""}`}>★</span>
      ))}
    </div>
  );
}

// ─── Stat row ────────────────────────────────────────────────
function AuctionStat({ lbl, val, color }) {
  return (
    <div className="auc-stat">
      <span className="auc-stat-lbl">{lbl}</span>
      <span className="auc-stat-bar">
        <span className="auc-stat-fill" style={{ width: `${val}%`, background: color, boxShadow: `0 0 8px ${color}90` }}></span>
      </span>
      <span className="auc-stat-val">{val}</span>
    </div>
  );
}

// ─── Bid row in history ─────────────────────────────────────
function BidRow({ idx, bid, isLeader }) {
  return (
    <div className={`bid-row ${isLeader ? "leader" : ""} ${bid.you ? "you" : ""}`}>
      <span className="br-rank">#{idx + 1}</span>
      <span className="br-user">
        {bid.user}
        {bid.you && <span className="br-you-chip">YOU</span>}
      </span>
      <span className="br-bid">
        <span className="br-coin">◉</span>
        {bid.credits.toLocaleString()}
      </span>
      {isLeader && <span className="br-crown">★</span>}
    </div>
  );
}

// ─── Time remaining helper ──────────────────────────────────
function fmtTime(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Auction root ───────────────────────────────────────────
function AuctionView({ pilotId, onBack, onSharePost }) {
  const pilots = window.PILOTS || [];
  const pilot = pilots.find(p => p.id === pilotId) || pilots[0];
  const posColor = POS_COLORS_A[pilot.position] || "#19e6c4";

  // Bid state
  const [bids, setBids] = useStateA(BIDDERS);
  const [myBid, setMyBid] = useStateA("");
  const [highlight, setHighlight] = useStateA(null); // recently added bid index
  const [timeLeft, setTimeLeft] = useStateA(2 * 3600 + 14 * 60 + 23); // 02:14:23
  const [feed, setFeed] = useStateA([]); // live activity feed
  const sorted = [...bids].sort((a, b) => b.credits - a.credits);
  const top = sorted[0];

  // Countdown
  useEffectA(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Simulated incoming bids
  useEffectA(() => {
    const id = setInterval(() => {
      const nyms = ["u/HoopOracle", "u/NyxFan", "u/SlamPoet", "u/CapKaze", "u/BlinkPG", "u/CrossOverKing", "u/StreetGoat", "u/SplashBro"];
      const user = nyms[Math.floor(Math.random() * nyms.length)];
      const delta = Math.floor(500 + Math.random() * 2500);
      const newBid = (sorted[0]?.credits || 10000) + delta;
      setBids(prev => [...prev, { user, credits: newBid }]);
      setFeed(prev => [{ user, credits: newBid, t: Date.now() }, ...prev].slice(0, 6));
      setHighlight(user);
      setTimeout(() => setHighlight(null), 1200);
    }, 4200);
    return () => clearInterval(id);
  }, [sorted[0]?.credits]);

  const placeBid = () => {
    const amount = parseInt(myBid.replace(/[^\d]/g, ""), 10);
    if (!amount || amount <= (top?.credits || 0)) return;
    setBids(prev => [...prev.filter(b => !b.you), { user: "u/peetan_42", credits: amount, you: true }]);
    setFeed(prev => [{ user: "u/peetan_42", credits: amount, t: Date.now(), you: true }, ...prev].slice(0, 6));
    setMyBid("");
  };

  const minNext = (top?.credits || 0) + 500;

  return (
    <div className="auction">
      {/* Top nav */}
      <div className="auc-topnav">
        <button className="back-btn" onClick={onBack}>
          <span className="bk-glyph">◀</span>
          <span>COLLECTION</span>
        </button>
        <div className="auc-title">
          <span className="at-big">AUCTION HOUSE</span>
          <span className="at-sub">LOT 0451 · LIVE BIDDING</span>
        </div>
        <div className="auc-topright">
          <button className="auc-share" onClick={onSharePost}>
            <span>↗</span><span>SHARE POST</span>
          </button>
          <div className="auc-timer">
            <span className="aut-lbl">CLOSES IN</span>
            <span className="aut-val">{fmtTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      <div className="auc-grid">
        {/* ── LEFT: Featured pilot ── */}
        <div className="auc-feature" style={{
          "--pos-c": posColor,
          "--tier-c": pilot.color,
        }}>
          <div className="afeat-tier">
            <span className="aft-pill">{pilot.tier?.toUpperCase()} TIER</span>
            <StarsA count={pilot.rarity} size={18} />
          </div>

          <div className="afeat-stage">
            <div className="afeat-spotlight"></div>
            <div className="afeat-scan"></div>
            <div className="afeat-pos" style={{ background: posColor }}>{pilot.position}</div>
            <div className="afeat-ovr">
              <span>{pilot.overall}</span>
              <em>OVR</em>
            </div>
            <img src="assets/idle.gif" className="afeat-sprite" alt="" />
            <div className="afeat-floor"></div>
            <div className="afeat-shadow"></div>
          </div>

          <div className="afeat-name">
            <span className="afn-big">{pilot.name}</span>
            <span className="afn-call">「{pilot.callsign}」 · {pilot.jp}</span>
          </div>

          <div className="afeat-stats">
            <AuctionStat lbl="SPD" val={pilot.spd} color="#22d3ee" />
            <AuctionStat lbl="DEX" val={pilot.dex} color="#a855f7" />
            <AuctionStat lbl="JMP" val={pilot.jmp} color="#22c55e" />
            <AuctionStat lbl="ACC" val={pilot.acc} color="#fb923c" />
          </div>

          <div className={`afeat-ability ${pilot.ability ? "has" : "none"}`}>
            <span className="afa-lbl">ABILITY</span>
            <span className="afa-val">{pilot.ability || "NO ABILITY"}</span>
          </div>

          <div className="afeat-meta">
            <div className="afm-cell">
              <span className="afm-lbl">Lv</span>
              <span className="afm-val">{pilot.level}<em>/{pilot.maxLevel}</em></span>
            </div>
            <div className="afm-cell">
              <span className="afm-lbl">TIER</span>
              <span className="afm-val">{pilot.tier?.toUpperCase()}</span>
            </div>
            <div className="afm-cell">
              <span className="afm-lbl">ROLE</span>
              <span className="afm-val">{pilot.role}</span>
            </div>
            <div className="afm-cell">
              <span className="afm-lbl">LISTED BY</span>
              <span className="afm-val small">u/HangarBot</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Bidding panel ── */}
        <div className="auc-bidpanel">
          {/* Current high bid */}
          <div className="ab-current">
            <span className="abc-lbl">CURRENT HIGH BID</span>
            <span className="abc-val">
              <span className="coin">◉</span>
              {top?.credits.toLocaleString()}
            </span>
            <span className="abc-by">by <b>{top?.user}</b></span>
          </div>

          {/* Place bid input */}
          <div className="ab-place">
            <div className="abp-row">
              <input
                type="text"
                className="abp-input"
                placeholder={`MIN ${minNext.toLocaleString()}`}
                value={myBid}
                onChange={(e) => setMyBid(e.target.value)}
              />
              <button className="abp-btn" onClick={placeBid}>
                <span>⚡</span>
                <span>PLACE BID</span>
              </button>
            </div>
            <div className="abp-shortcuts">
              <button onClick={() => setMyBid(String(minNext))}>+500</button>
              <button onClick={() => setMyBid(String(minNext + 1500))}>+2k</button>
              <button onClick={() => setMyBid(String(minNext + 4500))}>+5k</button>
              <button onClick={() => setMyBid(String(Math.max(minNext, (top?.credits || 0) + 10000)))}>+10k</button>
            </div>
            <div className="abp-bal">
              <span>YOUR BALANCE</span>
              <b><span className="coin">◉</span> 24,800</b>
            </div>
          </div>

          {/* Live activity feed */}
          <div className="ab-feed">
            <div className="abf-h">
              <span className="abf-pulse"></span>
              <span>LIVE FEED</span>
            </div>
            {feed.length === 0 ? (
              <div className="abf-empty">WAITING FOR NEXT BID...</div>
            ) : (
              feed.map((f, i) => (
                <div key={i} className={`abf-row ${f.you ? "you" : ""} ${i === 0 ? "newest" : ""}`}>
                  <span className="abf-user">{f.user}</span>
                  <span className="abf-bid">+<span className="coin">◉</span>{f.credits.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>

          {/* Bid history */}
          <div className="ab-history">
            <div className="abh-h">
              <span>BID HISTORY · {bids.length} BIDS</span>
              <span className="abh-sort">SORT BY HIGH ▾</span>
            </div>
            <div className="abh-list">
              {sorted.map((b, i) => (
                <BidRow key={`${b.user}-${i}`} idx={i} bid={b} isLeader={i === 0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.AuctionView = AuctionView;

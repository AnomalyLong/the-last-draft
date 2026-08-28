/* global React */
/* Lobby v2 — mobile-first ready room with always-on user header */

const { useState: useStateL2 } = React;

const QUEUE_OPTIONS_2 = [
  {
    id: "ranked", label: "RANKED",
    desc: "Climb the ladder. RP at stake.",
    stake: "±25 RP", wait: "~12s", players: 4218,
    accent: "cyan", primary: true,
    action: "deploy",
  },
  {
    id: "training", label: "TRAINING",
    desc: "Drill against the AI.",
    stake: "0 RP", wait: "INSTANT", players: null,
    accent: "ink",
    action: "deploy",
  },
  {
    id: "draft", label: "DRAFT",
    desc: "Recruit new pilots from the multiverse.",
    stake: "PACK ×8", wait: "READY", players: null,
    accent: "magenta",
    action: "draft",
  },
  {
    id: "collection", label: "COLLECTION",
    desc: "Manage your roster and pilot loadout.",
    stake: "11 / 100", wait: "OPEN", players: null,
    accent: "ink",
    action: "collection",
  },
  {
    id: "auction", label: "AUCTION",
    desc: "Bid on rare pilots. Live bidding open.",
    stake: "◉ 24,800", wait: "LIVE", players: 142,
    accent: "gold",
    action: "auction",
  },
];

// Roster used inside the sheet (same as lobby v1's roster)
const SHEET_SQUAD = [
  { name: "RYX FROST",  callsign: "PEETAN", position: "SF", overall: 70, level: 33, rarity: 5, color: "#19e6c4", spd: 71, dex: 68, jmp: 65, acc: 76, abilities: ["SHARPSHOOTER", "ANKLEBREAKER"], tier: "blue" },
  { name: "NOVA RIN",   callsign: "AOI",    position: "PG", overall: 70, level: 28, rarity: 5, color: "#a855f7", spd: 82, dex: 78, jmp: 56, acc: 64, abilities: ["PLAYMAKER"],                       tier: "blue" },
  { name: "KAI VESS",   callsign: "RIN",    position: "PG", overall: 71, level: 22, rarity: 4, color: "#3ea6ff", spd: 87, dex: 66, jmp: 70, acc: 62, abilities: [],                                  tier: "gold" },
  { name: "JAX CRANE",  callsign: "KAZE",   position: "PF", overall: 61, level: 19, rarity: 3, color: "#ff7a3c", spd: 55, dex: 57, jmp: 69, acc: 59, abilities: [],                                  tier: "silver" },
  { name: "SOL KAGE",   callsign: "SORA",   position: "C",  overall: 70, level: 31, rarity: 4, color: "#ffc94a", spd: 48, dex: 72, jmp: 84, acc: 66, abilities: [],                                  tier: "gold" },
];

const POS_COLORS_L2 = { PG: "#3ea6ff", SG: "#a855f7", SF: "#19e6c4", PF: "#ff7a3c", C: "#ffc94a" };

function MiniStat({ lbl, val }) {
  return (
    <div className="lb2-mstat">
      <span className="lb2-mstat-lbl">{lbl}</span>
      <span className="lb2-mstat-bar"><span className="lb2-mstat-fill" style={{ width: `${val}%` }}></span></span>
      <span className="lb2-mstat-val">{val}</span>
    </div>
  );
}

function RankHex({ size = 28 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <polygon points="50,8 86,28 86,72 50,92 14,72 14,28"
               fill="var(--c-left)" stroke="#fff" strokeWidth="2"/>
      <text x="50" y="64" textAnchor="middle"
            fontFamily="Orbitron" fontWeight="900" fontSize="36" fill="#02060a">1</text>
    </svg>
  );
}

function PersistentHeader() {
  return (
    <div className="lb2-header">
      <div className="lb2-h-left">
        <div className="lb2-avatar">
          <svg viewBox="0 0 48 48" width="34" height="34">
            <circle cx="24" cy="24" r="22" fill="#ff4500" stroke="#fff" strokeWidth="2"/>
            <circle cx="16" cy="22" r="3.5" fill="#fff"/>
            <circle cx="32" cy="22" r="3.5" fill="#fff"/>
            <circle cx="16" cy="22" r="1.5" fill="#02060a"/>
            <circle cx="32" cy="22" r="1.5" fill="#02060a"/>
            <path d="M14 30 Q24 36 34 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="lb2-id">
          <div className="lb2-user">u/peetan</div>
          <div className="lb2-meta">
            <span className="lb2-rank">
              <RankHex size={14} />
              <span>RANK 1</span>
            </span>
            <span className="lb2-sep">·</span>
            <span className="lb2-rp">3,380 <em>RP</em></span>
          </div>
        </div>
      </div>
      <div className="lb2-h-right">
        <span className="lb2-h-time">21:48 UTC</span>
      </div>
    </div>
  );
}

function RosterStrip({ onOpen }) {
  const leader = SHEET_SQUAD[0];
  const totalOvr = SHEET_SQUAD.reduce((s, u) => s + u.overall, 0);
  return (
    <div className="lb2-rstrip" onClick={onOpen}>
      <div className="lb2-rstrip-row">
        <div className="lb2-rstrip-label">
          <span className="lb2-rstrip-h">ROSTER</span>
          <span className="lb2-rstrip-ovr">OVR <b>{totalOvr}</b></span>
        </div>
        <div className="lb2-rstrip-cards">
          {SHEET_SQUAD.map((u, i) => (
            <div key={i}
                 className={`lb2-rs-card tier-${u.tier} ${i === 0 ? "leader" : ""}`}
                 style={{ "--pos-c": POS_COLORS_L2[u.position], "--char-c": u.color }}>
              {i === 0 && <div className="lb2-rs-leader">LEADER</div>}
              <div className="lb2-rs-pos">{u.position}</div>
              <div className="lb2-rs-img">
                <img src="assets/idle.gif" alt="" />
              </div>
              <div className="lb2-rs-overlay"></div>
              <div className="lb2-rs-bot">
                <span className="lb2-rs-lv">Lv<b>{u.level}</b></span>
                <span className="lb2-rs-ovrn">{u.overall}</span>
              </div>
              <div className="lb2-rs-stars">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className={`lb2-rs-star ${j < u.rarity ? "on" : ""}`}>★</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {leader.abilities.length > 0 && (
        <div className="lb2-rstrip-buff">
          <span className="lb2-rs-bufftag">ABILITIES</span>
          <span className="lb2-rs-bufftxt">
            {leader.abilities.map((a, i) => (
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

function FeaturedSection() {
  return (
    <div className="lb2-featured">
      <div className="lb2-ft-h">
        <span className="lbl">FEATURED</span>
        <span className="meta">EVENTS · NEWS · UPDATES</span>
        <button className="lb2-ft-more">ALL ▸</button>
      </div>

      {/* Hero event card */}
      <div className="lb2-ft-hero">
        <div className="lb2-ft-hero-bg">
          <div className="lb2-ft-hero-grid"></div>
          <div className="lb2-ft-hero-glow"></div>
        </div>
        <div className="lb2-ft-hero-tag">
          <span className="lb2-ft-pulse"></span>
          <span>LIVE EVENT</span>
        </div>
        <div className="lb2-ft-hero-body">
          <div className="lb2-ft-hero-eyebrow">SECTOR 7 OPEN · S3</div>
          <div className="lb2-ft-hero-title">NEON CUP <em>FINALS</em></div>
          <div className="lb2-ft-hero-sub">2,500 RP POOL · 256 SQUADS</div>
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

      {/* News list */}
      <div className="lb2-ft-news">
        <div className="lb2-ft-news-row accent-cyan">
          <div className="lb2-ft-news-tag">PATCH</div>
          <div className="lb2-ft-news-body">
            <div className="lb2-ft-news-title">v2.4.0 · LOW-G TUNING</div>
            <div className="lb2-ft-news-sub">JMP rebalance · 3 maps reworked · netcode pass</div>
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
        <div className="lb2-ft-news-row accent-ink">
          <div className="lb2-ft-news-tag">DEVS</div>
          <div className="lb2-ft-news-body">
            <div className="lb2-ft-news-title">SECTOR 4 RANKED RESET</div>
            <div className="lb2-ft-news-sub">Season 4 placement matches go live next week</div>
          </div>
          <div className="lb2-ft-news-time">1d</div>
        </div>
      </div>
    </div>
  );
}

function QueueButton({ q, selected, onSelect }) {
  return (
    <button className={`lb2-qbtn accent-${q.accent} ${selected ? "selected" : ""} ${q.locked ? "locked" : ""}`}
            onClick={() => onSelect(q)}>
      <div className="lb2-qb-mark"></div>
      <div className="lb2-qb-body">
        <div className="lb2-qb-label">{q.label}</div>
        <div className="lb2-qb-desc">{q.desc}</div>
        <div className="lb2-qb-meta">
          <span><em>{q.action === "deploy" ? "STAKE" : "STATUS"}</em><b>{q.stake}</b></span>
          <span><em>{q.action === "deploy" ? "QUEUE" : "STATE"}</em><b>{q.wait}</b></span>
          {q.players != null && <span><em>{q.action === "deploy" ? "ONLINE" : "LOTS"}</em><b>{q.players.toLocaleString()}</b></span>}
        </div>
      </div>
      <div className="lb2-qb-arrow">{q.action === "deploy" ? (selected ? "▶" : "") : "↗"}</div>
    </button>
  );
}

function LobbyV2({ onDeploy, onOpenCollection, onOpenDraft, onOpenAuction }) {
  const [selected, setSelected] = useStateL2("ranked");
  const [rosterOpen, setRosterOpen] = useStateL2(false);
  const selectedQ = QUEUE_OPTIONS_2.find(q => q.id === selected);
  const canDeploy = !selectedQ.locked;

  const handleSelect = (q) => {
    if (q.action === "draft") return onOpenDraft && onOpenDraft();
    if (q.action === "collection") return onOpenCollection && onOpenCollection();
    if (q.action === "auction") return onOpenAuction && onOpenAuction();
    setSelected(q.id);
  };

  const handleDeploy = () => {
    if (selectedQ.action === "deploy") return onDeploy(selected);
    if (selectedQ.action === "draft") return onOpenDraft && onOpenDraft();
    if (selectedQ.action === "collection") return onOpenCollection && onOpenCollection();
    if (selectedQ.action === "auction") return onOpenAuction && onOpenAuction();
  };

  const deployLabels = {
    deploy: "DEPLOY",
    draft: "OPEN DRAFT",
    collection: "OPEN COLLECTION",
    auction: "VIEW AUCTION",
  };

  return (
    <div className="lobby2">
      {/* ── Hangar title strip ── */}
      <div className="lb2-title-strip">
        <span className="lb2-ts-dot"></span>
        <span className="lb2-ts-text">READY ROOM · SECTOR 7-2</span>
      </div>

      {/* ── Body ── */}
      <div className="lb2-body">
        {/* User info block (~30% of vertical) */}
        <div className="lb2-user-block">
          <div className="lb2-ub-avatar">
            <svg viewBox="0 0 48 48" width="44" height="44">
              <circle cx="24" cy="24" r="22" fill="#ff4500" stroke="#fff" strokeWidth="2"/>
              <circle cx="16" cy="22" r="3.5" fill="#fff"/>
              <circle cx="32" cy="22" r="3.5" fill="#fff"/>
              <circle cx="16" cy="22" r="1.5" fill="#02060a"/>
              <circle cx="32" cy="22" r="1.5" fill="#02060a"/>
              <path d="M14 30 Q24 36 34 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="lb2-ub-id">
            <div className="lb2-ub-name">u/peetan</div>
            <div className="lb2-ub-title">ROOKIE ALL-STAR</div>
          </div>
          <div className="lb2-ub-stats">
            <div className="lb2-ub-stat">
              <span className="lbl">RANK</span>
              <span className="val rank"><RankHex size={16} /> 1</span>
            </div>
            <div className="lb2-ub-stat">
              <span className="lbl">RP</span>
              <span className="val cyan">3,380</span>
            </div>
            <div className="lb2-ub-stat">
              <span className="lbl">W/L</span>
              <span className="val">412 <em>/</em> 198</span>
            </div>
            <div className="lb2-ub-stat">
              <span className="lbl">WIN</span>
              <span className="val">67<em>%</em></span>
            </div>
            <div className="lb2-ub-stat">
              <span className="lbl">STREAK</span>
              <span className="val gold">W7</span>
            </div>
          </div>

          {/* Compact roster strip — part of user info panel */}
          <RosterStrip onOpen={onOpenCollection} />
        </div>

        {/* Featured: events & news (above mission select) */}
        <FeaturedSection />

        {/* Queue mode list */}
        <div className="lb2-section-h">
          <span className="lb2-sh-bar"></span>
          <span>SELECT MISSION</span>
          <span className="lb2-sh-bar"></span>
        </div>

        <div className="lb2-queue">
          {QUEUE_OPTIONS_2.map(q => (
            <QueueButton key={q.id} q={q} selected={selected === q.id} onSelect={() => handleSelect(q)} />
          ))}
        </div>
      </div>

      {/* ── Sticky deploy bar ── */}
      <div className="lb2-deploy">
        <div className="lb2-d-info">
          <span className="lb2-d-lbl">SELECTED</span>
          <span className="lb2-d-mode">{selectedQ.label}{selectedQ.action === "deploy" ? " MATCH" : ""}</span>
          <span className="lb2-d-meta">STAKE <b>{selectedQ.stake}</b> · QUEUE <b>{selectedQ.wait}</b></span>
        </div>
        <button className={`lb2-d-btn ${selectedQ.action !== "deploy" ? "alt" : ""}`}
                onClick={handleDeploy}>
          <span className="lb2-d-glyph">⟫</span>
          <span className="lb2-d-label">{deployLabels[selectedQ.action]}</span>
        </button>
      </div>
    </div>
  );
}

window.LobbyV2 = LobbyV2;

/* global React */
/* Lobby / Ready Room — pilot + squad + queue selection */

const { useState: useStateL, useEffect: useEffectL } = React;

// Queue options
const QUEUE_OPTIONS = [
  {
    id: "ranked",
    label: "RANKED MATCH",
    sub: "",
    desc: "Compete on the global ladder. RP at stake.",
    rpRange: "±25 RP",
    wait: "~12s",
    players: 4218,
    accent: "left",
    primary: true,
  },
  {
    id: "casual",
    label: "CASUAL MATCH",
    sub: "",
    desc: "Quick play, no rank pressure.",
    rpRange: "0 RP",
    wait: "~4s",
    players: 9842,
    accent: "ink",
  },
  {
    id: "tournament",
    label: "TOURNAMENT",
    sub: "",
    desc: "Bracketed 8-pilot single-elimination.",
    rpRange: "+100 RP",
    wait: "OPENS 21:00",
    players: 312,
    accent: "right",
  },
  {
    id: "training",
    label: "TRAINING",
    sub: "",
    desc: "Drill against the AI in a sandbox arena.",
    rpRange: "0 RP",
    wait: "INSTANT",
    players: null,
    accent: "ink",
  },
];

// Sample squad data — active pilots (positions + stats)
const SQUAD = [
  { name: "RYX FROST",  callsign: "PEETAN", position: "SF", overall: 70, spd: 71, dex: 68, jmp: 65, acc: 76, abilities: ["SHARPSHOOTER", "ANKLEBREAKER"], tier: "blue" },
  { name: "NOVA RIN",   callsign: "AOI",    position: "PG", overall: 70, spd: 82, dex: 78, jmp: 56, acc: 64, abilities: ["PLAYMAKER"],                       tier: "blue" },
  { name: "KAI VESS",   callsign: "RIN",    position: "PG", overall: 71, spd: 87, dex: 66, jmp: 70, acc: 62, abilities: [],                                  tier: "gold" },
  { name: "JAX CRANE",  callsign: "KAZE",   position: "PF", overall: 61, spd: 55, dex: 57, jmp: 69, acc: 59, abilities: [],                                  tier: "silver" },
  { name: "SOL KAGE",   callsign: "SORA",   position: "C",  overall: 70, spd: 48, dex: 72, jmp: 84, acc: 66, abilities: [],                                  tier: "gold" },
];

const POS_COLORS_L = {
  PG: "#3ea6ff", SG: "#a855f7", SF: "#19e6c4",
  PF: "#ff7a3c", C: "#ffc94a",
};

function TerrainIconL({ kind, active }) {
  const cls = `mech-icon ${active ? "active" : ""}`;
  if (kind === "ground") return <div className={cls}>▲</div>;
  if (kind === "space") return <div className={cls}>✦</div>;
  if (kind === "air") return <div className={cls}>▽</div>;
  return null;
}

function MiniStatBar({ lbl, val, tier }) {
  return (
    <div className="lm-stat">
      <span className="lm-stat-lbl">{lbl}</span>
      <span className="lm-stat-bar">
        <span className="lm-stat-fill" style={{ width: `${val}%` }}></span>
      </span>
      <span className="lm-stat-val">{val}</span>
    </div>
  );
}

function PilotCard() {
  return (
    <div className="lobby-pilot">
      <div className="lobby-pilot-portrait">
        <image-slot
          id="lobby-pilot"
          shape="rect"
          fit="contain"
          src="assets/idle.gif"
          placeholder="Drop pilot portrait"
          position="50% 50%"
        ></image-slot>
        <div className="lobby-pilot-overlay"></div>
        <div className="lobby-pilot-edge"></div>
        <div className="lobby-pilot-codestrip">
          <span>// PILOT_ID</span>
          <span>P-2438.07</span>
        </div>
      </div>

      <div className="lobby-pilot-stats">
        <div className="lobby-pilot-name">
          <span className="jp">u/peetan</span>
          <span className="en">PEETAN · U-TRIBE</span>
        </div>

        <div className="lobby-pilot-row">
          <div className="metric">
            <div className="metric-lbl">RANK</div>
            <div className="metric-val">
              <svg viewBox="0 0 100 100" width="42" height="42" style={{ verticalAlign: "middle", marginRight: 8 }}>
                <polygon points="50,8 86,28 86,72 50,92 14,72 14,28" fill="var(--c-left)" stroke="#fff" strokeWidth="2"/>
                <text x="50" y="64" textAnchor="middle" fontFamily="Orbitron" fontWeight="900" fontSize="36" fill="#02060a">1</text>
              </svg>
              ENSIGN
            </div>
          </div>
          <div className="metric">
            <div className="metric-lbl">RATING</div>
            <div className="metric-val accent">3,380 <span className="suf">RP</span></div>
          </div>
          <div className="metric">
            <div className="metric-lbl">LEVEL</div>
            <div className="metric-val">33</div>
          </div>
        </div>

        <div className="lobby-pilot-row">
          <div className="metric">
            <div className="metric-lbl">W / L</div>
            <div className="metric-val">412 <span className="suf">·</span> 198</div>
          </div>
          <div className="metric">
            <div className="metric-lbl">WIN %</div>
            <div className="metric-val">67<span className="suf">%</span></div>
          </div>
          <div className="metric">
            <div className="metric-lbl">STREAK</div>
            <div className="metric-val accent">W7</div>
          </div>
        </div>

        <div className="lobby-pilot-title">
          <span className="lbl">ACTIVE TITLE</span>
          <span className="ribbon">ROOKIE ALL-STAR</span>
        </div>
      </div>
    </div>
  );
}

function SquadStrip({ active, onHover }) {
  return (
    <div className="lobby-squad">
      <div className="lobby-section-h">
        <span className="lbl">ROSTER</span>
        <span className="meta">{SQUAD.length} / 5 DEPLOYED</span>
        <button className="ghost-btn">EDIT ROSTER</button>
      </div>
      <div className="lobby-squad-grid">
        {SQUAD.map((u, i) => (
          <div key={i}
               className={`lobby-mech tier-${u.tier} ${active === i ? "active" : ""}`}
               style={{ "--pos-c": POS_COLORS_L[u.position] }}
               onMouseEnter={() => onHover(i)}>
            <div className="lobby-mech-img">
              <image-slot
                id={`lobby-mech-${i}`}
                shape="rect"
                fit="contain"
                src="assets/running.gif"
                placeholder={u.callsign}
              ></image-slot>
              <div className="lobby-mech-pos">{u.position}</div>
              <div className="lobby-mech-ovr">{u.overall}<em>OVR</em></div>
            </div>
            <div className="lobby-mech-body">
              <div className="lobby-mech-model">{u.name}</div>
              <div className="lobby-mech-callsign">「{u.callsign}」</div>
              <div className="lobby-mech-stats">
                <MiniStatBar lbl="SPD" val={u.spd} />
                <MiniStatBar lbl="DEX" val={u.dex} />
                <MiniStatBar lbl="JMP" val={u.jmp} />
                <MiniStatBar lbl="ACC" val={u.acc} />
              </div>
              <div className={`lobby-mech-abilities ${u.abilities && u.abilities.length ? "has" : "none"}`}>
                {u.abilities && u.abilities.length ? (
                  u.abilities.map((a, j) => (
                    <span key={j} className="lm-ability">{a}</span>
                  ))
                ) : (
                  <span className="lm-ability-none">NO ABILITY</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueuePanel({ selected, onSelect }) {
  return (
    <div className="lobby-queue">
      <div className="lobby-section-h">
        <span className="lbl">SELECT MISSION</span>
      </div>

      <div className="queue-list">
        {QUEUE_OPTIONS.map((q) => {
          const isSel = selected === q.id;
          return (
            <button key={q.id}
                    className={`queue-card ${isSel ? "selected" : ""} accent-${q.accent}`}
                    onClick={() => onSelect(q.id)}>
              <div className="qc-mark"></div>
              <div className="qc-body">
                <div className="qc-h">
                  <span className="qc-label">{q.label}</span>
                  <span className="qc-sub">{q.sub}</span>
                </div>
                <div className="qc-desc">{q.desc}</div>
                <div className="qc-meta">
                  <div><span>STAKE</span><b>{q.rpRange}</b></div>
                  <div><span>QUEUE</span><b>{q.wait}</b></div>
                  {q.players != null && <div><span>ONLINE</span><b>{q.players.toLocaleString()}</b></div>}
                </div>
              </div>
              <div className="qc-arrow">{isSel ? "▶" : ""}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TerrainCard() {
  return (
    <div className="lobby-terrain">
      <div className="terrain-thumb">
        <div className="terrain-grid"></div>
        <div className="terrain-planet"></div>
      </div>
      <div className="terrain-info">
        <div className="terrain-label">COURT</div>
        <div className="terrain-name">MOON BASE</div>
        <div className="terrain-sub">ZERO-G · LOW COVER</div>
      </div>
      <div className="terrain-rolls">
        <span>ROLL</span>
        <span className="dot"></span>
        <span className="dot active"></span>
        <span className="dot"></span>
      </div>
    </div>
  );
}

// ─── Bottom nav (mobile-game style) ──────────────────────────
const BNAV_ICONS = {
  profile: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  collection: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="10" width="7" height="11" />
    </svg>
  ),
  auction: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4l6 6-2.5 2.5L11 6.5z" />
      <path d="M11.5 6.8L4 14.3V18h3.7l7.5-7.5" />
      <path d="M3 22h18" />
    </svg>
  ),
  options: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.3 2.5a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2L4.6 14.6l2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <polygon points="7,4 21,12 7,20" />
    </svg>
  ),
};

function BottomNav({ onProfile, onCollection, onPlay, onAuction, onOptions }) {
  return (
    <nav className="bnav">
      <div className="bnav-bg"></div>
      <button className="bnav-item" onClick={onProfile}>
        <span className="bnav-ico">{BNAV_ICONS.profile}</span>
        <span className="bnav-lbl">PROFILE</span>
      </button>
      <button className="bnav-item" onClick={onCollection}>
        <span className="bnav-ico">{BNAV_ICONS.collection}</span>
        <span className="bnav-lbl">COLLECTION</span>
      </button>
      <button className="bnav-play" onClick={onPlay} aria-label="Play">
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
              <ellipse cx="50" cy="50" rx="36" ry="36" className="bgl-4" fill="none" stroke="var(--c-left)" strokeWidth="0.7" />
            </g>
            <circle cx="50" cy="50" r="1.6" fill="var(--c-left)" />
          </svg>
          <span className="bnav-globe-scan"></span>
        </span>
        <span className="bnav-globe-lbl">PLAY</span>
      </button>
      <button className="bnav-item" onClick={onAuction}>
        <span className="bnav-ico">{BNAV_ICONS.auction}</span>
        <span className="bnav-lbl">AUCTION</span>
      </button>
      <button className="bnav-item" onClick={onOptions}>
        <span className="bnav-ico">{BNAV_ICONS.options}</span>
        <span className="bnav-lbl">OPTIONS</span>
      </button>
    </nav>
  );
}

// ─── Mission Picker modal ────────────────────────────────────
const MISSIONS = [
  { id: "ranked",   label: "RANKED",   jp: "ランク",     desc: "Climb the global ladder. RP at stake.",  stake: "±25 RP", wait: "~12s",    players: 4218, accent: "left", primary: true },
  { id: "casual",   label: "CASUAL",   jp: "カジュアル", desc: "Quick play, no rank pressure.",          stake: "0 RP",   wait: "~4s",     players: 9842, accent: "right" },
  { id: "training", label: "TRAINING", jp: "練習",       desc: "Drill against the AI in a sandbox.",     stake: "0 RP",   wait: "INSTANT", players: null, accent: "ink" },
];

function MissionPicker({ open, onClose, onDeploy }) {
  useEffectL(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="mp-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mp-h">
          <span className="mp-tag">// SELECT_MISSION</span>
          <span className="mp-title">SELECT MISSION</span>
          <button className="mp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mp-list">
          {MISSIONS.map((m) => (
            <button key={m.id}
                    className={`mp-card accent-${m.accent} ${m.primary ? "primary" : ""}`}
                    onClick={() => onDeploy(m.id)}>
              <div className="mp-mark"></div>
              <div className="mp-body">
                <div className="mp-h-row">
                  <span className="mp-label">{m.label}</span>
                  <span className="mp-jp">{m.jp}</span>
                </div>
                <div className="mp-desc">{m.desc}</div>
                <div className="mp-meta">
                  <div><span>STAKE</span><b>{m.stake}</b></div>
                  <div><span>QUEUE</span><b>{m.wait}</b></div>
                  {m.players != null && <div><span>ONLINE</span><b>{m.players.toLocaleString()}</b></div>}
                </div>
              </div>
              <div className="mp-arrow">▶</div>
            </button>
          ))}
        </div>
        <div className="mp-foot">
          <span>PING <b>32ms</b></span>
          <span>SECTOR 7-2</span>
          <span>READY</span>
        </div>
      </div>
    </div>
  );
}

function LobbyView({ onDeploy, onOpenCollection, onOpenDraft, onOpenAuction }) {
  const [hoveredMech, setHoveredMech] = useStateL(0);
  const [missionOpen, setMissionOpen] = useStateL(false);

  return (
    <div className="lobby has-bnav">
      {/* Title strip */}
      <div className="lobby-title-strip">
        <div className="lts-left">
          <span className="dot"></span>
          <span>READY ROOM · 出撃準備</span>
        </div>
        <div className="lts-mid">
          <span className="big">HANGAR</span>
          <span className="sub">DECK · SECTOR 7-2</span>
        </div>
        <div className="lts-right">
          <button className="lobby-nav-btn" onClick={onOpenDraft}>
            <span>♦</span>
            <span>DRAFT</span>
          </button>
        </div>
      </div>

      <div className="lobby-grid two-col">
        <div className="lobby-col-left">
          <PilotCard />
        </div>
        <div className="lobby-col-mid">
          <SquadStrip active={hoveredMech} onHover={setHoveredMech} />
          <TerrainCard />
        </div>
      </div>

      <BottomNav
        onProfile={() => {}}
        onCollection={onOpenCollection}
        onPlay={() => setMissionOpen(true)}
        onAuction={() => onOpenAuction && onOpenAuction()}
        onOptions={() => {}}
      />

      <MissionPicker open={missionOpen}
                     onClose={() => setMissionOpen(false)}
                     onDeploy={(id) => { setMissionOpen(false); onDeploy(id); }} />
    </div>
  );
}

window.LobbyView = LobbyView;

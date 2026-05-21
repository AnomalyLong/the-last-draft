/* global React, ReactDOM */
/* Matchmaking VS — main app */

const { useState, useEffect, useRef, useCallback } = React;

// ─── Palette options for Tweaks ──────────────────────────────
const PALETTES = {
  cyanMagenta: {
    name: "Cyan / Magenta",
    left: "#19e6c4", leftGlow: "#5bf2d4", leftDeep: "#04201a",
    leftBg: "radial-gradient(ellipse at 0% 50%, #0e3a32 0%, #04140f 55%, #02080a 100%)",
    right: "#ff2d6f", rightGlow: "#ff6b9a", rightDeep: "#1f0612",
    rightBg: "radial-gradient(ellipse at 100% 50%, #3e0a1f 0%, #160510 55%, #0a0306 100%)",
  },
  blueOrange: {
    name: "Blue / Orange",
    left: "#3ea6ff", leftGlow: "#7fc7ff", leftDeep: "#06121f",
    leftBg: "radial-gradient(ellipse at 0% 50%, #0a2745 0%, #06121f 55%, #02060a 100%)",
    right: "#ff7a3c", rightGlow: "#ffaa70", rightDeep: "#1f0e06",
    rightBg: "radial-gradient(ellipse at 100% 50%, #45200a 0%, #1f0e06 55%, #0a0603 100%)",
  },
  goldCrimson: {
    name: "Gold / Crimson",
    left: "#ffc94a", leftGlow: "#ffe080", leftDeep: "#201a04",
    leftBg: "radial-gradient(ellipse at 0% 50%, #3a2e0e 0%, #14100f 55%, #08070a 100%)",
    right: "#ff3b3b", rightGlow: "#ff7a7a", rightDeep: "#1f0608",
    rightBg: "radial-gradient(ellipse at 100% 50%, #4a0a14 0%, #1a0508 55%, #0a0306 100%)",
  },
  greenViolet: {
    name: "Lime / Violet",
    left: "#7dff5a", leftGlow: "#b9ff8a", leftDeep: "#0e2008",
    leftBg: "radial-gradient(ellipse at 0% 50%, #163a14 0%, #08140a 55%, #02080a 100%)",
    right: "#a855f7", rightGlow: "#c98fff", rightDeep: "#180a2e",
    rightBg: "radial-gradient(ellipse at 100% 50%, #2a0a55 0%, #14082a 55%, #0a0612 100%)",
  },
};

function applyPalette(p) {
  const r = document.documentElement;
  r.style.setProperty("--c-left", p.left);
  r.style.setProperty("--c-left-glow", p.leftGlow);
  r.style.setProperty("--c-left-deep", p.leftDeep);
  r.style.setProperty("--c-left-bg", p.leftBg);
  r.style.setProperty("--c-right", p.right);
  r.style.setProperty("--c-right-glow", p.rightGlow);
  r.style.setProperty("--c-right-deep", p.rightDeep);
  r.style.setProperty("--c-right-bg", p.rightBg);
}

// ─── Sample game data ────────────────────────────────────────
const PLAYER = {
  team: "",
  teamIcon: "◆",
  location: "東京都 TOKYO",
  rp: 3380,
  name: "Title",
  callsign: "PEETAN",
  level: 33,
  title: "u/peetan",
  rankLabel: "RANK",
  rankName: "1",
  rankTier: "ENSIGN",
  units: [
    { grade: "S", name: "MS-06 Zaku II", img: "assets/mech1.png", terrain: ["space", "ground"], terrainBoost: 2 },
    { grade: "S", name: "RX-78-2 Gundam", img: "assets/mech2.png", terrain: ["ground"], terrainBoost: 1 },
    { grade: "A", name: "MSN-04 Sazabi", img: "assets/mech3.png", terrain: ["space"], terrainBoost: 3 },
    { grade: "S", name: "GN-001 Exia", img: "assets/mech4.png", terrain: ["ground", "air"], terrainBoost: 2 },
    { grade: "S", name: "ZGMF-X10A", img: "assets/mech5.png", terrain: ["space", "air"], terrainBoost: 2 },
  ],
};

const OPPONENT = {
  team: "",
  teamIcon: "✦",
  location: "",
  rp: 11216,
  name: "Title",
  callsign: "ZEEKBECK",
  level: 70,
  title: "u/Computer",
  rankLabel: "RANK",
  rankName: "2",
  rankTier: "S-CLASS",
  // hidden until match found
};

// ─── Small SVG icons ────────────────────────────────────────
const RankEmblemLeft = () => (
  <svg viewBox="0 0 100 100" width="68" height="68">
    <defs>
      <linearGradient id="gradL" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a8e7d8"/>
        <stop offset="100%" stopColor="var(--c-left)"/>
      </linearGradient>
    </defs>
    <polygon points="50,8 86,28 86,72 50,92 14,72 14,28" fill="url(#gradL)" stroke="#fff" strokeWidth="1.5"/>
    <polygon points="50,18 76,33 76,67 50,82 24,67 24,33" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
    <text x="50" y="62" textAnchor="middle" fontFamily="Orbitron" fontWeight="900" fontSize="32" fill="#1a1a2e">1</text>
  </svg>
);

const RankEmblemRight = () => (
  <svg viewBox="0 0 100 100" width="68" height="68">
    <defs>
      <radialGradient id="gradR">
        <stop offset="0%" stopColor="#fff"/>
        <stop offset="60%" stopColor="var(--c-right-glow)"/>
        <stop offset="100%" stopColor="var(--c-right)"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#gradR)" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
    <text x="50" y="64" textAnchor="middle" fontFamily="Orbitron" fontWeight="900" fontSize="36" fill="#2a0a14">2</text>
  </svg>
);

const TeamIconLeft = () => (
  <svg viewBox="0 0 28 28" width="28" height="28">
    <polygon points="14,2 26,14 14,26 2,14" fill="var(--c-left)" stroke="#fff" strokeWidth="1"/>
    <polygon points="14,8 20,14 14,20 8,14" fill="#02060a"/>
  </svg>
);

const TeamIconRight = () => (
  <svg viewBox="0 0 28 28" width="28" height="28">
    <circle cx="14" cy="14" r="11" fill="var(--c-right)" stroke="#fff" strokeWidth="1"/>
    <path d="M14 5 L17 13 L25 13 L19 18 L21 26 L14 22 L7 26 L9 18 L3 13 L11 13 Z" fill="#02060a" transform="scale(0.6) translate(9 5)"/>
  </svg>
);

const CornerBracket = () => (
  <svg viewBox="0 0 64 64">
    <path d="M2 22 L2 2 L22 2" fill="none" stroke="rgba(234,246,243,0.5)" strokeWidth="2"/>
    <path d="M8 16 L8 8 L16 8" fill="none" stroke="rgba(234,246,243,0.3)" strokeWidth="1"/>
  </svg>
);

const TerrainIcon = ({ kind, active }) => {
  const cls = `mech-icon ${active ? "active" : ""}`;
  if (kind === "ground") return <div className={cls}>▲</div>;
  if (kind === "space") return <div className={cls}>✦</div>;
  if (kind === "air") return <div className={cls}>▽</div>;
  if (kind === "water") return <div className={cls}>≈</div>;
  return null;
};

// ─── Side panel (player or opponent) ────────────────────────
function PlayerPanel({ side, data, revealed }) {
  const isLeft = side === "left";
  const RankEm = isLeft ? RankEmblemLeft : RankEmblemRight;
  const TeamIcon = isLeft ? TeamIconLeft : TeamIconRight;
  const slotId = isLeft ? "portrait-left" : "portrait-right";
  const placeholder = isLeft
    ? "Drop pilot portrait"
    : revealed ? "Drop opponent portrait" : "—";

  return (
    <div className={`player-panel ${side}`}>
      <div className="portrait-wrap">
        <div className="portrait-frame">
          <image-slot
            id={slotId}
            shape="rect"
            fit="contain"
            src="assets/idle.gif"
            placeholder={placeholder}
            position="50% 50%"
          ></image-slot>
        </div>
        <div className="portrait-tint"></div>
        <div className="portrait-edge"></div>
      </div>

      <div className="stats">
        <div className="stat-row row-team">
          <TeamIcon />
          <span className="val">{data.title}</span>
          {data.team && <span className="label">{data.team}</span>}
        </div>
        <div className="stat-row row-rp">
          {data.location && <span className="label">{data.location.split(" ")[0]}</span>}
          <span className="val">{data.rp.toLocaleString()}<span className="rp-suffix">RP</span></span>
        </div>
        <div className="stat-row row-name">
          <span className="val">{data.name}</span>
        </div>
        <div className="title-ribbon">
          <span className="ribbon-level">Lv.<b>{data.level}</b></span>
          <div className="ribbon-bg">{data.rankTier}</div>
        </div>
      </div>

      <div className="rank-badge">
        <div className="ring"></div>
        <div className="rank-label">{data.rankLabel}</div>
        <div className="rank-emblem"><RankEm /></div>
      </div>
    </div>
  );
}

// ─── Roster row ──────────────────────────────────────────────
function Roster({ side, units, revealed }) {
  return (
    <div className={`roster ${side}`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const u = revealed && units[i];
        return (
          <div key={i} className="mech-slot">
            {u ? (
              <>
                <div
                  className="mech-img"
                  style={{
                    background: `linear-gradient(135deg,
                      hsl(${(i * 67) % 360}, 60%, 38%) 0%,
                      hsl(${(i * 67 + 40) % 360}, 50%, 18%) 100%)`,
                  }}
                >
                  <image-slot
                    id={`mech-${side}-${i}`}
                    shape="rect"
                    fit="contain"
                    src="assets/running.gif"
                    placeholder={u.name}
                  ></image-slot>
                </div>
                <div className={`mech-grade ${u.grade}`}>{u.grade}</div>
                <div className="mech-icons">
                  <TerrainIcon kind="ground" active={u.terrain.includes("ground")} />
                  <TerrainIcon kind="space" active={u.terrain.includes("space")} />
                  <TerrainIcon kind="air" active={u.terrain.includes("air")} />
                  <TerrainIcon kind="water" active={u.terrain.includes("water")} />
                </div>
              </>
            ) : (
              <div className="mech-img unknown"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Searching overlay ───────────────────────────────────────
function SearchingView({ elapsed, progress }) {
  const logs = [
    { t: 0, txt: "▸ HANDSHAKE @ <b>SECTOR-7</b>" },
    { t: 800, txt: "▸ TIER MATCH: <b>I → III</b>" },
    { t: 1600, txt: "▸ PING < <b>40ms</b>" },
    { t: 2400, txt: "▸ TERRAIN: <b>MOON BASE</b>" },
    { t: 3200, txt: "▸ SCANNING <b>14 SECTORS</b>" },
    { t: 4000, txt: "▸ CANDIDATES: <b>003</b>" },
    { t: 4800, txt: "▸ LOCK ACQUIRED" },
  ];

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
        <div className="title">SEARCHING<span className="dots"></span></div>
        <div className="sub">SECTOR <b>7-2</b> · TIER <b>I</b> · <b>{Math.floor(elapsed)}s</b></div>
      </div>

      <div className="search-log">
        {logs.filter(l => elapsed * 1000 >= l.t).map((l, i) => (
          <div key={i} className="l" dangerouslySetInnerHTML={{ __html: l.txt }}></div>
        ))}
      </div>

      <div className="search-bar">
        <div className="track">
          <div className="fill" style={{ width: `${progress * 100}%` }}></div>
        </div>
        <div className="meta">
          <span>QUEUE · <b>CASUAL</b></span>
          <span>EST <b>{Math.max(0, Math.ceil(5 - elapsed))}s</b></span>
          <span>PING <b>32ms</b></span>
        </div>
      </div>
    </>
  );
}

// ─── Title block (shared across states) ──────────────────────
function TitleBlock({ matchType, mapName }) {
  return (
    <div className="title-block">
      <div className="title-line single">{matchType}</div>
      <div className="title-sub">{mapName}</div>
    </div>
  );
}

// ─── Center pillar (VS + ground type) ────────────────────────
function CenterPillar({ terrainEn, terrainJp }) {
  return (
    <div className="center-pillar">
      <div className="vs-mark">
        <span className="v">V</span><span className="s">S</span>
      </div>
    </div>
  );
}

// ─── Collapsible prototype controls ──────────────────────────
function PrototypeControls({ state, goto, setState }) {
  const [open, setOpen] = useState(false);
  const STATES = [
    ["lobby",      "Lobby"],
    ["lobby2",     "Lobby v2"],
    ["collection", "Collection"],
    ["auction",    "Auction"],
    ["post",       "Post"],
    ["draft",      "Draft"],
    ["court",      "Court"],
    ["searching",  "Searching"],
    ["found",      "Match found"],
    ["vs",         "VS reveal"],
  ];
  return (
    <>
      <button className={`controls-fab ${open ? "open" : ""}`}
              onClick={() => setOpen(o => !o)}
              aria-label={open ? "Hide prototype controls" : "Show prototype controls"}>
        {open ? "✕" : "≡"}
      </button>
      {open && (
        <div className="controls">
          <span className="label">STATE</span>
          {STATES.map(([id, label]) => (
            <button key={id}
                    className={state === id ? "active" : ""}
                    onClick={() => { goto(id); setOpen(false); }}>
              {label}
            </button>
          ))}
          <span className="label">·</span>
          <button onClick={() => { setState("lobby"); setOpen(false); }}>↺ Restart flow</button>
        </div>
      )}
    </>
  );
}

// ─── Top-level App ───────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "cyanMagenta",
  "matchType": "RANKED MATCH",
  "mapName": "Moon Base",
  "terrainEn": "GROUND TYPE",
  "terrainJp": "宇宙",
  "autoLoop": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [state, setState] = useState("lobby2"); // lobby | lobby2 | collection | draft | court | auction | post | searching | found | vs
  const [auctionPilotId, setAuctionPilotId] = useState("p01");
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef(null);

  // apply palette
  useEffect(() => {
    applyPalette(PALETTES[t.palette] || PALETTES.cyanMagenta);
  }, [t.palette]);

  // state machine: searching (5s) -> found (1s) -> vs (sustain w/ countdown)
  useEffect(() => {
    let raf;
    let start = performance.now();
    function tick(now) {
      const e = (now - start) / 1000;
      setElapsed(e);
      if (state === "searching") {
        if (e >= 5) {
          setState("found");
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    }
    if (state === "searching") {
      setElapsed(0);
      raf = requestAnimationFrame(tick);
    }
    return () => raf && cancelAnimationFrame(raf);
  }, [state]);

  useEffect(() => {
    if (state === "found") {
      const id = setTimeout(() => setState("vs"), 900);
      return () => clearTimeout(id);
    }
  }, [state]);

  // VS countdown — stops at 0, no auto-transition
  useEffect(() => {
    if (state === "vs") {
      setCountdown(5);
      const id = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(id);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [state]);

  const goto = (s) => {
    setState(s);
  };

  const progress = Math.min(1, elapsed / 5);
  const opponentRevealed = state === "vs" || state === "found";

  return (
    <div className="stage-wrap">
      <ScaledStage>
        <div className="stage" data-state={state}>
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

          {/* Title — visible on all states */}
          <TitleBlock matchType={t.matchType} mapName={t.mapName} />

          {/* HUD corners */}
          <div className="hud-corner hud-tl">
            <span className="dot"></span>
            <span>NET · TOKYO-7 · 32ms</span>
          </div>
          <div className="hud-corner hud-tr">
            <span className="hud-credits"><b>0</b> CREDIT(S)</span>
          </div>

          {/* Center: VS or radar */}
          <CenterPillar terrainEn={t.terrainEn} terrainJp={t.terrainJp} />

          {/* Player panels */}
          <PlayerPanel side="left" data={PLAYER} revealed={true} />
          <PlayerPanel side="right" data={OPPONENT} revealed={opponentRevealed} />

          {/* Rosters */}
          <Roster side="left" units={PLAYER.units} revealed={true} />
          <Roster side="right" units={[]} revealed={false} />

          {/* Lobby (pre-match) */}
          {state === "lobby" && (
            <LobbyView onDeploy={(mode) => setState("searching")}
                       onOpenCollection={() => setState("collection")}
                       onOpenDraft={() => setState("draft")}
                       onOpenAuction={() => setState("auction")} />
          )}

          {/* Lobby v2 — mobile-first */}
          {state === "lobby2" && (
            <LobbyV2 onDeploy={(mode) => setState("searching")}
                     onOpenCollection={() => setState("collection")}
                     onOpenDraft={() => setState("draft")}
                     onOpenAuction={() => setState("auction")} />
          )}

          {/* Collection (pilot roster) */}
          {state === "collection" && (
            <CollectionView
              onBack={() => setState("lobby")}
              onAuction={(id) => { setAuctionPilotId(id); setState("auction"); }}
            />
          )}

          {/* Auction (live bidding) */}
          {state === "auction" && (
            <AuctionView pilotId={auctionPilotId}
                         onBack={() => setState("collection")}
                         onSharePost={() => setState("post")} />
          )}

          {/* Auction post (shareable Reddit-style) */}
          {state === "post" && (
            <PostView pilotId={auctionPilotId}
                      onBack={() => setState("auction")}
                      onBid={() => setState("auction")} />
          )}

          {/* Draft (new pilot intake) */}
          {state === "draft" && (
            <DraftView onBack={() => setState("lobby")} />
          )}

          {/* Court (in-game basketball view) */}
          {state === "court" && (
            <CourtView onBack={() => setState("lobby")} />
          )}

          {/* Searching overlay */}
          {state === "searching" && (
            <SearchingView elapsed={elapsed} progress={progress} />
          )}

          {/* Match found banner */}
          {state === "found" && (
            <>
              <div className="flash"></div>
              <div className="found-banner">
                OPPONENT LOCKED
                <span className="sub">// INITIALIZING DUEL</span>
              </div>
            </>
          )}

          {/* Launch countdown */}
          {state === "vs" && (
            <div className="launch-bar">
              <span>LAUNCH IN</span>
              <span className="count">{countdown}</span>
              <span>READY UP</span>
            </div>
          )}

          {/* CRT atmosphere */}
          <div className="scanlines"></div>
          <div className="crt-glow"></div>
        </div>
      </ScaledStage>

      {/* Prototype controls — collapsible */}
      <PrototypeControls state={state} goto={goto} setState={setState} />

      <TweaksPanel>
        <TweakSection label="Match" />
        <TweakText label="Match type" value={t.matchType}
                   onChange={(v) => setTweak("matchType", v)} />
        <TweakText label="Map name" value={t.mapName}
                   onChange={(v) => setTweak("mapName", v)} />
        <TweakText label="Terrain (EN)" value={t.terrainEn}
                   onChange={(v) => setTweak("terrainEn", v)} />
        <TweakText label="Terrain (JP)" value={t.terrainJp}
                   onChange={(v) => setTweak("terrainJp", v)} />

        <TweakSection label="Palette" />
        <TweakSelect label="Sides" value={t.palette}
                     options={[
                       { value: "cyanMagenta", label: "Cyan / Magenta" },
                       { value: "blueOrange", label: "Blue / Orange" },
                       { value: "goldCrimson", label: "Gold / Crimson" },
                       { value: "greenViolet", label: "Lime / Violet" },
                     ]}
                     onChange={(v) => setTweak("palette", v)} />

        <TweakSection label="Flow" />
        <TweakToggle label="Auto-loop" value={t.autoLoop}
                     onChange={(v) => setTweak("autoLoop", v)} />
        <TweakButton label="Replay sequence"
                     onClick={() => setState("lobby")} />
      </TweaksPanel>
    </div>
  );
}

// ─── Stage scaler ────────────────────────────────────────────
function ScaledStage({ children }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function fit() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const portrait = h > w;
      const narrow = w < 900;
      const mobile = portrait || narrow;
      setIsMobile(mobile);
      if (mobile) {
        setScale(1);
        document.body.classList.add("is-mobile");
      } else {
        const s = Math.min(w / 1920, h / 1080);
        setScale(s);
        document.body.classList.remove("is-mobile");
      }
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  if (isMobile) {
    return <div className="mobile-shell">{children}</div>;
  }
  return (
    <div ref={wrapRef} style={{
      width: 1920, height: 1080,
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin: "center center",
      flex: "none",
    }}>
      {children}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

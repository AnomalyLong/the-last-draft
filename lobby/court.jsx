/* global React */
/* Court page — in-game basketball court view */

const { useState: useStateCt, useEffect: useEffectCt } = React;

// ─── Player roster on court ──────────────────────────────────
const HOME_TEAM = {
  name: "WOLVES",
  jersey: "BLUE",
  color: "#19e6c4",
  accent: "#5bf2d4",
  score: 0,
  abbr: "WOL",
};
const AWAY_TEAM = {
  name: "HAWKS",
  jersey: "RED",
  color: "#ff2d6f",
  accent: "#ff6b9a",
  score: 0,
  abbr: "HWK",
};

// Court positions for the 5 home + 5 away players in tip-off formation
const COURT_POSITIONS = [
  // BLUE / home team
  { team: "home", pos: "C",  pid: "p01", x: 46, y: 50, name: "FROST" },
  { team: "home", pos: "PG", pid: "p02", x: 42, y: 38, name: "RIN" },
  { team: "home", pos: "SG", pid: "p03", x: 42, y: 64, name: "VESS" },
  { team: "home", pos: "PF", pid: "p04", x: 34, y: 28, name: "KAGE" },
  { team: "home", pos: "SF", pid: "p05", x: 28, y: 50, name: "NYX" },
  // RED / away team
  { team: "away", pos: "C",  pid: "p06", x: 54, y: 50, name: "ZEEK" },
  { team: "away", pos: "PG", pid: "p07", x: 58, y: 38, name: "DRAKE" },
  { team: "away", pos: "SG", pid: "p08", x: 58, y: 64, name: "REI" },
  { team: "away", pos: "PF", pid: "p09", x: 66, y: 28, name: "VOLT" },
  { team: "away", pos: "SF", pid: "p10", x: 72, y: 50, name: "CADE" },
];

const POS_COLORS_CT = {
  PG: "#3ea6ff", SG: "#a855f7", SF: "#19e6c4",
  PF: "#ff7a3c", C: "#ffc94a",
};

// ─── Compact stat row ────────────────────────────────────────
function StatBar({ lbl, val }) {
  return (
    <div className="cp-stat">
      <span className="cp-stat-lbl">{lbl}</span>
      <span className="cp-stat-bar">
        <span className="cp-stat-fill" style={{ width: `${val}%` }}></span>
      </span>
      <span className="cp-stat-val">{val}</span>
    </div>
  );
}

// ─── Compact player dossier (top corners) ────────────────────
function PlayerCardCompact({ pilot, side, active }) {
  return (
    <div className={`court-pcard ${side} ${active ? "active" : ""} tier-${pilot.tier}`}>
      <div className="cp-portrait">
        <div className="cp-pos">{pilot.position}</div>
        <img src="assets/idle.gif" className="px-sprite cp-sprite" alt="" />
        <div className="cp-name">{pilot.name.split(" ").pop()}</div>
        <div className="cp-lvl">Lv.{pilot.level}</div>
      </div>
      <div className="cp-body">
        <div className="cp-ovr">
          <span className="cp-ovr-val">{pilot.overall}</span>
          <span className="cp-ovr-lbl">OVR · Lv.{pilot.level}</span>
        </div>
        <div className="cp-stats">
          <StatBar lbl="SPD" val={pilot.spd} />
          <StatBar lbl="DEX" val={pilot.dex} />
          <StatBar lbl="JMP" val={pilot.jmp} />
          <StatBar lbl="ACC" val={pilot.acc} />
        </div>
        <div className={`cp-ability ${pilot.ability ? "has" : "none"}`}>
          {pilot.ability || "NO ABILITY"}
        </div>
      </div>
    </div>
  );
}

// ─── Reddit user identity (center) ───────────────────────────
function UserCenter({ username, credits }) {
  return (
    <div className="user-center">
      <div className="uc-viewer-tag">▾ VIEWER ▾</div>
      <div className="uc-avatar">
        {/* Reddit snoo-like glyph */}
        <svg viewBox="0 0 48 48" width="44" height="44">
          <circle cx="24" cy="24" r="22" fill="#ff4500" stroke="#fff" strokeWidth="2"/>
          <circle cx="16" cy="22" r="4" fill="#fff"/>
          <circle cx="32" cy="22" r="4" fill="#fff"/>
          <circle cx="16" cy="22" r="2" fill="#02060a"/>
          <circle cx="32" cy="22" r="2" fill="#02060a"/>
          <path d="M14 30 Q24 36 34 30" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <circle cx="38" cy="14" r="3" fill="#fff"/>
          <circle cx="10" cy="14" r="3" fill="#fff"/>
        </svg>
      </div>
      <div className="uc-info">
        <div className="uc-name">{username}</div>
        <div className="uc-credits"><span className="cred-coin">◉</span> {credits.toLocaleString()} <em>CREDITS</em></div>
      </div>
      <div className="uc-actions">
        <button className="uc-btn">TEAMS</button>
        <button className="uc-btn">OPTIONS</button>
      </div>
      <div className="uc-base"></div>
    </div>
  );
}

// ─── Court player sprite + label ────────────────────────────
function CourtPlayer({ team, pos, x, y, name }) {
  const color = team === "home" ? HOME_TEAM.color : AWAY_TEAM.color;
  return (
    <div className={`court-player team-${team}`}
         style={{ left: `${x}%`, top: `${y}%`, "--team-c": color }}>
      <div className="cp-label" style={{ color }}>{pos}</div>
      <div className="cp-aura"></div>
      <img src="assets/idle.gif" className="px-sprite cpx-sprite" alt="" />
      <div className="cp-pname">{name}</div>
    </div>
  );
}

// ─── Score panel ────────────────────────────────────────────
function ScorePanel({ home, away, time, quarter, shotClock, possession }) {
  return (
    <div className="court-scoreboard">
      {/* Home team block */}
      <div className="sp-team home" style={{ "--c": home.color, "--ca": home.accent }}>
        <div className="sp-jersey">{home.abbr}</div>
        <div className="sp-meta">
          <span className="sp-name">{home.name}</span>
          <span className="sp-foul">FOULS · 02</span>
        </div>
        <div className="sp-score">{home.score.toString().padStart(2, "0")}</div>
        <div className={`sp-poss ${possession === "home" ? "on" : ""}`}></div>
      </div>

      {/* Center timer */}
      <div className="sp-timer">
        <div className="sp-clock-row">
          <span className="sp-clock-segment">{time.split(":")[0]}</span>
          <span className="sp-clock-colon">:</span>
          <span className="sp-clock-segment">{time.split(":")[1]}</span>
        </div>
        <div className="sp-q-row">
          <span className="sp-quarter">{quarter}</span>
          <div className="sp-q-dots">
            {[1, 2, 3, 4].map(q => (
              <span key={q} className={`sp-q-dot ${quarter === `Q${q}` ? "on" : ""} ${q < parseInt(quarter.slice(1)) ? "past" : ""}`}></span>
            ))}
          </div>
          {shotClock != null && (
            <span className="sp-shotclock">
              <em>SHOT</em>
              <b>{shotClock.toString().padStart(2, "0")}</b>
            </span>
          )}
        </div>
      </div>

      {/* Away team block (mirrored) */}
      <div className="sp-team away" style={{ "--c": away.color, "--ca": away.accent }}>
        <div className={`sp-poss ${possession === "away" ? "on" : ""}`}></div>
        <div className="sp-score">{away.score.toString().padStart(2, "0")}</div>
        <div className="sp-meta">
          <span className="sp-name">{away.name}</span>
          <span className="sp-foul">FOULS · 04</span>
        </div>
        <div className="sp-jersey">{away.abbr}</div>
      </div>
    </div>
  );
}

// ─── Court root ─────────────────────────────────────────────
function CourtView({ onBack }) {
  // Reuse pilots from collection roster — pick a couple to feature in top cards
  const pilots = window.PILOTS || [];
  const myPilot = pilots.find(p => p.id === "p04") || pilots[0]; // user is controlling JAX CRANE
  const oppPilot = pilots.find(p => p.id === "p10") || pilots[1]; // opponent has ROEN NYX

  // ── Game state: timer, scores ──
  const [timer, setTimer] = useStateCt({ m: 1, s: 0 });
  const [scores, setScores] = useStateCt({ home: 42, away: 38 });
  const [quarter, setQuarter] = useStateCt("Q1");
  const [running, setRunning] = useStateCt(true);

  useEffectCt(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimer(t => {
        let m = t.m, s = t.s - 1;
        if (s < 0) { m -= 1; s = 59; }
        if (m < 0) { m = 0; s = 0; }
        return { m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const fmt = (n) => n.toString().padStart(2, "0");
  const time = `${fmt(timer.m)}:${fmt(timer.s)}`;

  return (
    <div className="court">
      {/* ── Top HUD bar ── */}
      <div className="court-top">
        <PlayerCardCompact pilot={myPilot} side="left" active={true} />
        <UserCenter username="u/peetan_42" credits={4280} />
        <PlayerCardCompact pilot={oppPilot} side="right" active={false} />
      </div>

      {/* ── Court area ── */}
      <div className="court-area">
        <div className="court-bg">
          <img className="cb-half left" src="assets/court-bg.png" alt="" />
          <img className="cb-half right" src="assets/court-bg.png" alt="" />
        </div>
        <button className="court-back" onClick={onBack}>◀ EXIT MATCH</button>
      </div>

      {/* ── Bottom scoreboard ── */}
      <ScorePanel
        home={{ ...HOME_TEAM, score: scores.home }}
        away={{ ...AWAY_TEAM, score: scores.away }}
        time={time}
        quarter={quarter}
        shotClock={14}
        possession="home"
      />
    </div>
  );
}

window.CourtView = CourtView;

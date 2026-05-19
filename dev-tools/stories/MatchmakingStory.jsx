import React, { useState } from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { MatchmakingScreen } from '@src/components/MatchmakingScreen.jsx';

const HOME_TEAMS = {
  BULLS: [
    { pos: 'PG', name: 'JORDAN',  spd: 88, dex: 86, jmp: 90, acc: 87, rarity: 'legendary' },
    { pos: 'SG', name: 'PIPPEN',  spd: 80, dex: 82, jmp: 78, acc: 79, rarity: 'epic' },
    { pos: 'SF', name: 'KUKOC',   spd: 72, dex: 74, jmp: 70, acc: 73, rarity: 'rare' },
    { pos: 'PF', name: 'GRANT',   spd: 70, dex: 68, jmp: 74, acc: 66, rarity: 'common' },
    { pos: 'C',  name: 'LONGLEY', spd: 62, dex: 60, jmp: 65, acc: 64, rarity: 'common' },
  ],
  LAKERS: [
    { pos: 'PG', name: 'MAGIC',  spd: 78, dex: 82, jmp: 74, acc: 85, rarity: 'legendary' },
    { pos: 'SG', name: 'KOBE',   spd: 88, dex: 86, jmp: 84, acc: 90, rarity: 'legendary' },
    { pos: 'SF', name: 'WORTHY', spd: 74, dex: 76, jmp: 72, acc: 75, rarity: 'rare' },
    { pos: 'PF', name: 'GREEN',  spd: 68, dex: 66, jmp: 70, acc: 64, rarity: 'common' },
    { pos: 'C',  name: 'SHAQ',   spd: 60, dex: 62, jmp: 78, acc: 68, rarity: 'epic' },
  ],
  NETS: [
    { pos: 'PG', name: 'KIDD',    spd: 76, dex: 80, jmp: 70, acc: 78, rarity: 'epic' },
    { pos: 'SG', name: 'CARTER',  spd: 82, dex: 80, jmp: 88, acc: 76, rarity: 'rare' },
    { pos: 'SF', name: 'MARTIN',  spd: 74, dex: 72, jmp: 80, acc: 68, rarity: 'rare' },
    { pos: 'PF', name: 'KENYON',  spd: 70, dex: 68, jmp: 72, acc: 62, rarity: 'common' },
    { pos: 'C',  name: 'COLLINS', spd: 60, dex: 58, jmp: 64, acc: 60, rarity: 'common' },
  ],
};

const AWAY_TEAMS = [
  {
    name: 'CELTICS',
    players: [
      { pos: 'PG', name: 'PAUL',    ovr: 76 },
      { pos: 'SG', name: 'RAY',     ovr: 74 },
      { pos: 'SF', name: 'PIERCE',  ovr: 78 },
      { pos: 'PF', name: 'GARNETT', ovr: 82 },
      { pos: 'C',  name: 'PERKINS', ovr: 68 },
    ],
  },
  {
    name: 'HEAT',
    players: [
      { pos: 'PG', name: 'WADE',     ovr: 84 },
      { pos: 'SG', name: 'JAMES',    ovr: 90 },
      { pos: 'SF', name: 'BOSH',     ovr: 78 },
      { pos: 'PF', name: 'HASLEM',   ovr: 66 },
      { pos: 'C',  name: 'ANDERSON', ovr: 64 },
    ],
  },
  {
    name: 'SPURS',
    players: [
      { pos: 'PG', name: 'PARKER',   ovr: 80 },
      { pos: 'SG', name: 'GINOBILI', ovr: 78 },
      { pos: 'SF', name: 'LEONARD',  ovr: 85 },
      { pos: 'PF', name: 'DUNCAN',   ovr: 88 },
      { pos: 'C',  name: 'ARON',     ovr: 64 },
    ],
  },
];

export default function MatchmakingStory() {
  const [homeKey, setHomeKey]   = useState('BULLS');
  const [awayIdx, setAwayIdx]   = useState(0);
  const [runKey, setRunKey]     = useState(0);
  const [log, setLog]           = useState([]);
  const [mobile, setMobile]     = useState(false);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  const controls = (
    <>
      <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
        Home
        <select
          value={homeKey}
          onChange={(e) => { setHomeKey(e.target.value); setRunKey((k) => k + 1); }}
          style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
        >
          {Object.keys(HOME_TEAMS).map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
      <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
        Away
        <select
          value={awayIdx}
          onChange={(e) => { setAwayIdx(Number(e.target.value)); setRunKey((k) => k + 1); }}
          style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
        >
          {AWAY_TEAMS.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
        </select>
      </label>
      <button
        onClick={() => setRunKey((k) => k + 1)}
        style={{ background: '#1a1a1a', border: '1px solid #444', color: '#aaa', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}
      >
        ↺ Replay
      </button>
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Matchmaking Screen" controls={controls} mobile={mobile} onMobile={setMobile}>
        <MatchmakingScreen
          key={runKey}
          homeRoster={HOME_TEAMS[homeKey]}
          homeTeamName={homeKey}
          awayTeam={AWAY_TEAMS[awayIdx]}
          onReady={() => push('onReady → would enter game')}
        />
      </StoryFrame>

      <EventLog log={log} onClear={() => setLog([])} />
    </div>
  );
}

function EventLog({ log, onClear }) {
  if (log.length === 0) return null;
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#555' }}>Events</span>
        <button onClick={onClear} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11 }}>clear</button>
      </div>
      {log.map((l, i) => <div key={i} style={{ color: '#3a8fd4' }}>{l}</div>)}
    </div>
  );
}

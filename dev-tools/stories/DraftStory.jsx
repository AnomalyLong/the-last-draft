import React, { useState } from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { DraftScreen } from '@src/components/DraftScreen.jsx';

const TEAM_NAMES = ['BULLS', 'WOLVES', 'HAWKS', 'NETS', 'KINGS'];

export default function DraftStory() {
  const [teamName, setTeamName] = useState('BULLS');
  const [key, setKey] = useState(0); // remount to reset draft state
  const [log, setLog] = useState([]);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  const controls = (
    <>
      <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
        Team
        <select
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
        >
          {TEAM_NAMES.map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
      <button
        onClick={() => setKey((k) => k + 1)}
        style={{ background: '#1a1a1a', border: '1px solid #444', color: '#aaa', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}
      >
        ↺ Reset
      </button>
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Draft Screen" controls={controls}>
        <DraftScreen
          key={`${key}-${teamName}`}
          homeTeamName={teamName}
          onStart={(roster) => push(`onStart (${roster?.length ?? 0} players)`)}
          onBack={() => push('onBack')}
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

import React, { useState } from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { TeamSelect } from '@src/components/TeamSelect.jsx';

export default function TeamSelectStory() {
  const [log, setLog] = useState([]);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Team Select">
        <TeamSelect
          onStart={(name) => push(`onStart("${name}")`)}
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

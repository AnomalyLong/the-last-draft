import React, { useState } from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { TitleScreen } from '@src/components/TitleScreen.jsx';
import { CRTOverlay } from '@src/components/CRTOverlay.jsx';
import { ZOOM_W, TOTAL_H } from '@src/constants.js';

export default function TitleStory() {
  const [log, setLog] = useState([]);
  const [crt, setCrt] = useState(false);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  const controls = (
    <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
      <input type="checkbox" checked={crt} onChange={(e) => setCrt(e.target.checked)} />
      CRT overlay
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Title Screen" controls={controls}>
        <TitleScreen
          onPlay={() => push('onPlay')}
          onOptions={() => push('onOptions')}
          onCollections={() => push('onCollections')}
        />
        {crt && <CRTOverlay width={ZOOM_W} height={TOTAL_H} scanlines={0.5} vignette={0.75} />}
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

import React, { useState } from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { CollectionScreen } from '@src/components/CollectionScreen.jsx';

const SAMPLE_ROSTER = [
  { id: 1, pos: 'PG', name: 'RIVERS', ovr: 72, spd: 78, dex: 75, jmp: 62, acc: 72, round: 1, ability: null },
  { id: 2, pos: 'SG', name: 'BANKS',  ovr: 69, spd: 69, dex: 67, jmp: 59, acc: 81, round: 1, ability: { name: 'CLUTCH', rarity: 2, desc: 'Bonus in close games' } },
  { id: 3, pos: 'SF', name: 'WELLS',  ovr: 70, spd: 74, dex: 71, jmp: 67, acc: 68, round: 2, ability: null },
  { id: 4, pos: 'PF', name: 'STONE',  ovr: 62, spd: 61, dex: 61, jmp: 69, acc: 58, round: 3, ability: { name: 'ANCHOR', rarity: 3, desc: 'Elite defense' } },
  { id: 5, pos: 'C',  name: 'GRANT',  ovr: 61, spd: 55, dex: 53, jmp: 75, acc: 62, round: 2, ability: null },
];

export default function CollectionStory() {
  const [useRoster, setUseRoster] = useState(true);
  const [log, setLog] = useState([]);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  const controls = (
    <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
      <input type="checkbox" checked={useRoster} onChange={(e) => setUseRoster(e.target.checked)} />
      Has drafted roster
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Collection Screen" controls={controls}>
        <CollectionScreen
          roster={useRoster ? SAMPLE_ROSTER : []}
          onBack={() => push('onBack')}
        />
      </StoryFrame>

      {log.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#555' }}>Events</span>
            <button onClick={() => setLog([])} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11 }}>clear</button>
          </div>
          {log.map((l, i) => <div key={i} style={{ color: '#3a8fd4' }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

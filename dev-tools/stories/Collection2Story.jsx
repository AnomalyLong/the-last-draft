import React, { useState } from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { CollectionScreen2 } from '@src/components/CollectionScreen2.jsx';

const SAMPLE_ROSTER = [
  { id: 1,  pos: 'PG', name: 'RIVERS', ovr: 72, spd: 78, dex: 75, jmp: 62, acc: 72, round: 1, ability: null },
  { id: 2,  pos: 'SG', name: 'BANKS',  ovr: 69, spd: 69, dex: 67, jmp: 59, acc: 81, round: 1, ability: { name: 'CLUTCH', rarity: 2, desc: 'Bonus in close games' } },
  { id: 3,  pos: 'SF', name: 'WELLS',  ovr: 70, spd: 74, dex: 71, jmp: 67, acc: 68, round: 2, ability: null },
  { id: 4,  pos: 'PF', name: 'STONE',  ovr: 62, spd: 61, dex: 61, jmp: 69, acc: 58, round: 3, ability: { name: 'ANCHOR', rarity: 3, desc: 'Elite defense' } },
  { id: 5,  pos: 'C',  name: 'GRANT',  ovr: 61, spd: 55, dex: 53, jmp: 75, acc: 62, round: 2, ability: null },
  { id: 6,  pos: 'PG', name: 'HAYES',  ovr: 68, spd: 76, dex: 70, jmp: 58, acc: 65, round: 2, ability: null },
  { id: 7,  pos: 'SG', name: 'FORD',   ovr: 65, spd: 66, dex: 64, jmp: 55, acc: 77, round: 3, ability: null },
  { id: 8,  pos: 'SF', name: 'PRICE',  ovr: 71, spd: 72, dex: 68, jmp: 70, acc: 74, round: 1, ability: { name: 'LASER',  rarity: 1, desc: 'High accuracy shots' } },
  { id: 9,  pos: 'PF', name: 'JAMES',  ovr: 66, spd: 64, dex: 59, jmp: 72, acc: 60, round: 2, ability: null },
  { id: 10, pos: 'C',  name: 'SCOTT',  ovr: 63, spd: 52, dex: 50, jmp: 78, acc: 58, round: 3, ability: null },
  { id: 11, pos: 'PG', name: 'CLARK',  ovr: 74, spd: 80, dex: 77, jmp: 64, acc: 70, round: 1, ability: { name: 'QUICK',  rarity: 2, desc: 'First step speed' } },
  { id: 12, pos: 'SG', name: 'YOUNG',  ovr: 67, spd: 68, dex: 65, jmp: 57, acc: 79, round: 2, ability: null },
  { id: 13, pos: 'SF', name: 'ROSS',   ovr: 69, spd: 73, dex: 69, jmp: 65, acc: 67, round: 3, ability: null },
  { id: 14, pos: 'PF', name: 'BELL',   ovr: 64, spd: 62, dex: 60, jmp: 71, acc: 59, round: 2, ability: null },
  { id: 15, pos: 'C',  name: 'LONG',   ovr: 60, spd: 51, dex: 49, jmp: 76, acc: 55, round: 3, ability: null },
];

export default function Collection2Story() {
  const [rosterSize, setRosterSize] = useState(5);
  const [credits, setCredits] = useState(1250);
  const [log, setLog] = useState([]);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  const controls = (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
        Roster size
        <input type="range" min={0} max={15} value={rosterSize}
          onChange={(e) => setRosterSize(Number(e.target.value))} style={{ width: 80 }} />
        <span style={{ color: '#ccc', minWidth: 20 }}>{rosterSize}</span>
      </label>
      <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
        Credits
        <input type="number" value={credits} min={0} max={99999}
          onChange={(e) => setCredits(Number(e.target.value))}
          style={{ width: 70, background: '#1a1a1a', border: '1px solid #333', color: '#ccc', fontFamily: 'monospace', fontSize: 12, padding: '2px 4px' }} />
      </label>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Collection Screen 2" controls={controls}>
        <CollectionScreen2
          roster={SAMPLE_ROSTER.slice(0, rosterSize)}
          credits={credits}
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

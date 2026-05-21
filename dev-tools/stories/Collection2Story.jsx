import React, { useState } from 'react';
import { PhoneFrameExpanded, DEVICES } from '../PhoneFrame.jsx';
import { CrtOverlay } from '../StoryFrame.jsx';
import { CollectionScreenNew } from '@src/components/CollectionScreenNew.jsx';

const SAMPLE_ROSTER = [
  { id: 1,  owner: 'TestUser', name: 'KAEL THORNE',  level: 5, xp: 340, source: 'draft',  rarity: 'rare',      spd: 81, dex: 73, jmp: 58, acc: 70, ability: { id: 7, name: 'SHARPSHOOTER', desc: 'FADE AWAY',              rarity: 1 }, abilities: [],                                                                          statBonuses: { spd: 2, dex: 0, jmp: 0, acc: 1 } },
  { id: 2,  owner: 'TestUser', name: 'NOVA STRAND',  level: 3, xp: 180, source: 'draft',  rarity: 'common',    spd: 66, dex: 77, jmp: 60, acc: 80, ability: null,                                                                              abilities: [],                                                                          statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 } },
  { id: 3,  owner: 'TestUser', name: 'ZEX FROST',    level: 8, xp: 620, source: 'draft',  rarity: 'epic',      spd: 70, dex: 74, jmp: 72, acc: 73, ability: { id: 5, name: 'PLAY MAKER',    desc: 'PASS INCREASE SHOT %',   rarity: 2 }, abilities: [{ id: 3, name: 'SPEEDY',        desc: 'SPD BURST',   rarity: 1 }], statBonuses: { spd: 0, dex: 4, jmp: 2, acc: 0 } },
  { id: 4,  owner: 'TestUser', name: 'JAX STEELE',   level: 2, xp: 80,  source: 'draft',  rarity: 'common',    spd: 53, dex: 61, jmp: 79, acc: 57, ability: null,                                                                              abilities: [],                                                                          statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 } },
  { id: 5,  owner: 'TestUser', name: 'REX VOLKOV',   level: 6, xp: 460, source: 'draft',  rarity: 'rare',      spd: 47, dex: 53, jmp: 84, acc: 56, ability: { id: 2, name: 'IRON BLOCK',    desc: 'BLOCK BONUS',            rarity: 1 }, abilities: [],                                                                          statBonuses: { spd: 0, dex: 0, jmp: 3, acc: 0 } },
  { id: 6,  owner: 'TestUser', name: 'ACE MARCH',    level:12, xp: 980, source: 'credit', rarity: 'legendary', spd: 76, dex: 82, jmp: 65, acc: 88, ability: { id: 1, name: 'DUNK MASTER',   desc: 'DUNK RATE UP',           rarity: 3 }, abilities: [{ id: 8, name: 'ANKLE BREAKER', desc: 'SPIN MOVES', rarity: 1 }], statBonuses: { spd: 3, dex: 5, jmp: 0, acc: 4 } },
  { id: 7,  owner: 'TestUser', name: 'ZEPH CRANE',   level: 1, xp: 20,  source: 'draft',  rarity: 'common',    spd: 73, dex: 67, jmp: 52, acc: 64, ability: null,                                                                              abilities: [],                                                                          statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 } },
  { id: 8,  owner: 'TestUser', name: 'AXEL ECHO',    level: 4, xp: 260, source: 'draft',  rarity: 'rare',      spd: 60, dex: 74, jmp: 67, acc: 76, ability: { id: 6, name: 'PICK POCKET',   desc: 'INCREASED STEAL',        rarity: 2 }, abilities: [],                                                                          statBonuses: { spd: 0, dex: 2, jmp: 0, acc: 0 } },
  { id: 9,  owner: 'TestUser', name: 'RYX BLADE',    level: 1, xp: 40,  source: 'draft',  rarity: 'common',    spd: 52, dex: 56, jmp: 76, acc: 59, ability: null,                                                                              abilities: [],                                                                          statBonuses: { spd: 0, dex: 0, jmp: 0, acc: 0 } },
  { id: 10, owner: 'TestUser', name: 'LYRA VANCE',   level: 7, xp: 540, source: 'credit', rarity: 'epic',      spd: 72, dex: 80, jmp: 68, acc: 84, ability: { id: 8, name: 'ANKLE BREAKER', desc: 'SPIN MOVES',             rarity: 1 }, abilities: [{ id: 5, name: 'PLAY MAKER',    desc: 'PASS INCREASE SHOT %', rarity: 2 }], statBonuses: { spd: 2, dex: 3, jmp: 0, acc: 2 } },
];

const SAMPLE_LINEUP = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };

const DESKTOP_PRESETS = [
  { label: '1920×1080', w: 1920, h: 1080 },
  { label: '1440×900',  w: 1440, h: 900  },
  { label: '1280×800',  w: 1280, h: 800  },
  { label: '1024×768',  w: 1024, h: 768  },
  { label: '768×1024',  w: 768,  h: 1024 },
  { label: '740×600',   w: 740,  h: 600  },
  { label: '640×560',   w: 640,  h: 560  },
  { label: '540×700',   w: 540,  h: 700  },
  { label: '480×560',   w: 480,  h: 560  },
];

export default function Collection2Story() {
  const [rosterSize, setRosterSize] = useState(10);
  const [credits, setCredits]       = useState(1250);
  const [mobile, setMobile]         = useState(false);
  const [deviceKey, setDeviceKey]   = useState('iphone14');
  const [desktopW, setDesktopW]     = useState(1200);
  const [desktopH, setDesktopH]     = useState(700);
  const [log, setLog]               = useState([]);
  const [scanlines, setScanlines]   = useState(0.5);
  const [vignette, setVignette]     = useState(0.75);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: 12, color: '#888' }}>
        <span style={{ color: '#e0e0e0', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }}>Collection Screen (New)</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          SL
          <input type="range" min={0} max={1} step={0.05} value={scanlines}
            onChange={e => setScanlines(Number(e.target.value))} style={{ width: 55 }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          VIG
          <input type="range" min={0} max={1} step={0.05} value={vignette}
            onChange={e => setVignette(Number(e.target.value))} style={{ width: 55 }} />
        </label>
        <button
          onClick={() => setMobile(m => !m)}
          style={{
            background: mobile ? '#1e3a5f' : '#1a1a1a',
            border: `1px solid ${mobile ? '#3a8fd4' : '#444'}`,
            color: mobile ? '#3a8fd4' : '#888',
            borderRadius: 3, padding: '3px 10px', fontSize: 12, cursor: 'pointer',
          }}
        >
          Mobile
        </button>
        {mobile && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Device
            <select value={deviceKey} onChange={e => setDeviceKey(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}>
              {Object.entries(DEVICES).map(([key, d]) => (
                <option key={key} value={key}>{d.label} ({d.w}×{d.h})</option>
              ))}
            </select>
          </label>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Roster size
          <input type="range" min={0} max={10} value={rosterSize}
            onChange={(e) => setRosterSize(Number(e.target.value))} style={{ width: 80 }} />
          <span style={{ color: '#ccc', minWidth: 20 }}>{rosterSize}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Credits
          <input type="number" value={credits} min={0} max={99999}
            onChange={(e) => setCredits(Number(e.target.value))}
            style={{ width: 70, background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }} />
        </label>
        {!mobile && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Preset
              <select onChange={e => { const p = DESKTOP_PRESETS[e.target.value]; setDesktopW(p.w); setDesktopH(p.h); }}
                style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}>
                {DESKTOP_PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              W
              <input type="number" value={desktopW} min={320} max={3840}
                onChange={e => setDesktopW(Number(e.target.value))}
                style={{ width: 60, background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              H
              <input type="number" value={desktopH} min={320} max={2160}
                onChange={e => setDesktopH(Number(e.target.value))}
                style={{ width: 60, background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }} />
            </label>
          </>
        )}
      </div>

      {mobile ? (
        <PhoneFrameExpanded device={DEVICES[deviceKey]}>
          <CollectionScreenNew
            roster={SAMPLE_ROSTER.slice(0, rosterSize)}
            lineup={SAMPLE_LINEUP}
            username="TestUser"
            credits={credits}
            isMobile={mobile}
            onBack={() => push('onBack')}
            onAuction={(id) => push(`onAuction id=${id}`)}
          />
          <CrtOverlay scanlines={scanlines} vignette={vignette} />
        </PhoneFrameExpanded>
      ) : (
        <div style={{
          position: 'relative',
          width: desktopW, height: desktopH,
          border: '1px solid #2a2a2a',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#02060a',
          flexShrink: 0,
        }}>
          <CollectionScreenNew
            roster={SAMPLE_ROSTER.slice(0, rosterSize)}
            lineup={SAMPLE_LINEUP}
            username="TestUser"
            credits={credits}
            isMobile={mobile}
            onBack={() => push('onBack')}
            onAuction={(id) => push(`onAuction id=${id}`)}
          />
          <CrtOverlay scanlines={scanlines} vignette={vignette} />
        </div>
      )}

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

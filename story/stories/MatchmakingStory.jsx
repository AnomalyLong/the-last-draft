import React, { useState } from 'react';
import { PhoneFrameExpanded, DEVICES } from '../PhoneFrame.jsx';
import { CrtOverlay } from '../StoryFrame.jsx';
import { MatchmakingScreen } from '@src/components/MatchmakingScreen.jsx';

const HOME_TEAMS = {
  BULLS: [
    { pos: 'PG', name: 'JORDAN',  spd: 88, dex: 86, jmp: 90, acc: 87, rarity: 'legendary', ability: { name: 'SHARPSHOOTER', rarity: 1 } },
    { pos: 'SG', name: 'PIPPEN',  spd: 80, dex: 82, jmp: 78, acc: 79, rarity: 'epic',      ability: { name: 'PLAY MAKER',   rarity: 2 } },
    { pos: 'SF', name: 'KUKOC',   spd: 72, dex: 74, jmp: 70, acc: 73, rarity: 'rare' },
    { pos: 'PF', name: 'GRANT',   spd: 70, dex: 68, jmp: 74, acc: 66, rarity: 'common' },
    { pos: 'C',  name: 'LONGLEY', spd: 62, dex: 60, jmp: 65, acc: 64, rarity: 'common' },
  ],
  LAKERS: [
    { pos: 'PG', name: 'MAGIC',  spd: 78, dex: 82, jmp: 74, acc: 85, rarity: 'legendary', ability: { name: 'PLAY MAKER', rarity: 2 } },
    { pos: 'SG', name: 'KOBE',   spd: 88, dex: 86, jmp: 84, acc: 90, rarity: 'legendary', ability: { name: 'SHARPSHOOTER', rarity: 1 } },
    { pos: 'SF', name: 'WORTHY', spd: 74, dex: 76, jmp: 72, acc: 75, rarity: 'rare' },
    { pos: 'PF', name: 'GREEN',  spd: 68, dex: 66, jmp: 70, acc: 64, rarity: 'common' },
    { pos: 'C',  name: 'SHAQ',   spd: 60, dex: 62, jmp: 78, acc: 68, rarity: 'epic',      ability: { name: 'DUNK MASTER', rarity: 3 } },
  ],
  NETS: [
    { pos: 'PG', name: 'KIDD',    spd: 76, dex: 80, jmp: 70, acc: 78, rarity: 'epic',   ability: { name: 'PLAY MAKER', rarity: 2 } },
    { pos: 'SG', name: 'CARTER',  spd: 82, dex: 80, jmp: 88, acc: 76, rarity: 'rare',   ability: { name: 'DUNK MASTER', rarity: 3 } },
    { pos: 'SF', name: 'MARTIN',  spd: 74, dex: 72, jmp: 80, acc: 68, rarity: 'rare' },
    { pos: 'PF', name: 'KENYON',  spd: 70, dex: 68, jmp: 72, acc: 62, rarity: 'common' },
    { pos: 'C',  name: 'COLLINS', spd: 60, dex: 58, jmp: 64, acc: 60, rarity: 'common' },
  ],
};

const AWAY_TEAMS = [
  {
    name: 'CELTICS',
    players: [
      { pos: 'PG', name: 'PAUL',    ovr: 76, spd: 74, dex: 78, jmp: 70, acc: 79 },
      { pos: 'SG', name: 'RAY',     ovr: 74, spd: 72, dex: 75, jmp: 68, acc: 82 },
      { pos: 'SF', name: 'PIERCE',  ovr: 78, spd: 73, dex: 77, jmp: 76, acc: 80 },
      { pos: 'PF', name: 'GARNETT', ovr: 82, spd: 70, dex: 76, jmp: 86, acc: 78 },
      { pos: 'C',  name: 'PERKINS', ovr: 68, spd: 56, jmp: 74, dex: 60, acc: 62 },
    ],
  },
  {
    name: 'HEAT',
    players: [
      { pos: 'PG', name: 'WADE',     ovr: 84, spd: 86, dex: 84, jmp: 80, acc: 84 },
      { pos: 'SG', name: 'JAMES',    ovr: 90, spd: 88, dex: 90, jmp: 92, acc: 88 },
      { pos: 'SF', name: 'BOSH',     ovr: 78, spd: 72, dex: 76, jmp: 80, acc: 78 },
      { pos: 'PF', name: 'HASLEM',   ovr: 66, spd: 58, dex: 64, jmp: 72, acc: 60 },
      { pos: 'C',  name: 'ANDERSON', ovr: 64, spd: 54, dex: 58, jmp: 70, acc: 58 },
    ],
  },
  {
    name: 'SPURS',
    players: [
      { pos: 'PG', name: 'PARKER',   ovr: 80, spd: 84, dex: 80, jmp: 72, acc: 80 },
      { pos: 'SG', name: 'GINOBILI', ovr: 78, spd: 78, dex: 80, jmp: 72, acc: 80 },
      { pos: 'SF', name: 'LEONARD',  ovr: 85, spd: 82, dex: 84, jmp: 84, acc: 86 },
      { pos: 'PF', name: 'DUNCAN',   ovr: 88, spd: 70, dex: 84, jmp: 90, acc: 88 },
      { pos: 'C',  name: 'ARON',     ovr: 64, spd: 54, dex: 58, jmp: 72, acc: 56 },
    ],
  },
];

const DESKTOP_PRESETS = [
  { label: '628×548 (Reddit)', w: 628, h: 548 },
  { label: '1920×1080', w: 1920, h: 1080 },
  { label: '1440×900',  w: 1440, h: 900  },
  { label: '1280×800',  w: 1280, h: 800  },
  { label: '1024×768',  w: 1024, h: 768  },
  { label: '768×1024',  w: 768,  h: 1024 },
  { label: '540×700',   w: 540,  h: 700  },
  { label: '480×800',   w: 480,  h: 800  },
];

export default function MatchmakingStory() {
  const [homeKey, setHomeKey]   = useState('BULLS');
  const [awayIdx, setAwayIdx]   = useState(0);
  const [runKey, setRunKey]     = useState(0);
  const [log, setLog]           = useState([]);
  const [mobile, setMobile]     = useState(false);
  const [deviceKey, setDeviceKey] = useState('iphone14');
  const [desktopW, setDesktopW] = useState(628);
  const [desktopH, setDesktopH] = useState(548);
  const [scanlines, setScanlines] = useState(0.5);
  const [vignette, setVignette]   = useState(0.75);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'monospace', fontSize: 12, color: '#888' }}>
        <span style={{ color: '#e0e0e0', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }}>Matchmaking Screen</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Home
          <select
            value={homeKey}
            onChange={(e) => { setHomeKey(e.target.value); setRunKey((k) => k + 1); }}
            style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
          >
            {Object.keys(HOME_TEAMS).map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
        {mobile ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Device
            <select
              value={deviceKey}
              onChange={e => setDeviceKey(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
            >
              {Object.entries(DEVICES).map(([key, d]) => (
                <option key={key} value={key}>{d.label} ({d.w}×{d.h})</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Preset
              <select
                onChange={e => { const p = DESKTOP_PRESETS[e.target.value]; setDesktopW(p.w); setDesktopH(p.h); }}
                style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
              >
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
          onClick={() => setRunKey((k) => k + 1)}
          style={{ background: '#1a1a1a', border: '1px solid #444', color: '#aaa', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}
        >
          ↺ Replay
        </button>
      </div>

      {/* Preview */}
      {mobile ? (
        <PhoneFrameExpanded device={DEVICES[deviceKey]}>
          <MatchmakingScreen
            key={`${runKey}-${homeKey}-${awayIdx}-m`}
            isMobile={true}
            homeRoster={HOME_TEAMS[homeKey]}
            homeTeamName={homeKey}
            awayTeam={AWAY_TEAMS[awayIdx]}
            onReady={() => push('onReady → would enter game')}
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
          <MatchmakingScreen
            key={`${runKey}-${homeKey}-${awayIdx}`}
            isMobile={false}
            homeRoster={HOME_TEAMS[homeKey]}
            homeTeamName={homeKey}
            awayTeam={AWAY_TEAMS[awayIdx]}
            onReady={() => push('onReady → would enter game')}
          />
          <CrtOverlay scanlines={scanlines} vignette={vignette} />
        </div>
      )}

      {/* Event log */}
      {log.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11, maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#555' }}>Events</span>
            <button onClick={() => setLog([])} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11 }}>clear</button>
          </div>
          {log.map((l, i) => <div key={i} style={{ color: '#19e6c4' }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

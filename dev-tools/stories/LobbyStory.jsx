import React, { useState } from 'react';
import { PhoneFrameExpanded, DEVICES } from '../PhoneFrame.jsx';
import { CrtOverlay } from '../StoryFrame.jsx';
import LobbyScreen from '@src/components/LobbyScreen.jsx';

const MOCK_ROSTER = [
  { pos: 'SF', name: 'RYX FROST',  spd: 71, dex: 68, jmp: 65, acc: 76, rarity: 5, level: 33, ability: 'SHARPSHOOTER', abilities: ['ANKLEBREAKER'] },
  { pos: 'PG', name: 'NOVA RIN',   spd: 82, dex: 78, jmp: 56, acc: 64, rarity: 5, level: 28, ability: 'PLAYMAKER',    abilities: [] },
  { pos: 'SG', name: 'KAI VESS',   spd: 87, dex: 66, jmp: 70, acc: 62, rarity: 4, level: 22, ability: null,          abilities: [] },
  { pos: 'PF', name: 'JAX CRANE',  spd: 55, dex: 57, jmp: 69, acc: 59, rarity: 3, level: 19, ability: null,          abilities: [] },
  { pos: 'C',  name: 'SOL KAGE',   spd: 48, dex: 72, jmp: 84, acc: 66, rarity: 4, level: 31, ability: null,          abilities: [] },
];

const MISSION_SCENARIOS = {
  empty: {
    label: 'Empty (fresh day)',
    daily: [
      { id: 'win1',   label: 'WIN A GAME',     sub: 'Complete any match',         reward: 50,  total: 1, accent: 'cyan',    progress: 0, awarded: false },
      { id: 'draft1', label: 'DRAFT A PLAYER', sub: 'Use a free or credit draft', reward: 25,  total: 1, accent: 'magenta', progress: 0, awarded: false },
      { id: 'play3',  label: 'PLAY 3 GAMES',   sub: 'Any mode counts',            reward: 100, total: 3, accent: 'gold',    progress: 0, awarded: false },
    ],
    weekly: [
      { id: 'wchallenge', label: 'CREATE A CHALLENGE ME', sub: 'Post your roster on r/TheMBA', reward: 200, total: 1, accent: 'gold', featured: true, progress: 0, awarded: false },
      { id: 'wwin5',   label: 'WIN 5 GAMES',     sub: 'Any mode',                reward: 300, total: 5, accent: 'cyan',    progress: 0, awarded: false },
      { id: 'wdraft',  label: 'DRAFT 3 PLAYERS', sub: 'Free or credit drafts',   reward: 150, total: 3, accent: 'magenta', progress: 0, awarded: false },
    ],
  },
  midway: {
    label: 'In progress',
    daily: [
      { id: 'win1',   label: 'WIN A GAME',     sub: 'Complete any match',         reward: 50,  total: 1, accent: 'cyan',    progress: 0, awarded: false },
      { id: 'draft1', label: 'DRAFT A PLAYER', sub: 'Use a free or credit draft', reward: 25,  total: 1, accent: 'magenta', progress: 1, awarded: true  },
      { id: 'play3',  label: 'PLAY 3 GAMES',   sub: 'Any mode counts',            reward: 100, total: 3, accent: 'gold',    progress: 2, awarded: false },
    ],
    weekly: [
      { id: 'wchallenge', label: 'CREATE A CHALLENGE ME', sub: 'Post your roster on r/TheMBA', reward: 200, total: 1, accent: 'gold', featured: true, progress: 0, awarded: false },
      { id: 'wwin5',   label: 'WIN 5 GAMES',     sub: 'Any mode',                reward: 300, total: 5, accent: 'cyan',    progress: 3, awarded: false },
      { id: 'wdraft',  label: 'DRAFT 3 PLAYERS', sub: 'Free or credit drafts',   reward: 150, total: 3, accent: 'magenta', progress: 1, awarded: false },
    ],
  },
  allDone: {
    label: 'All daily complete',
    daily: [
      { id: 'win1',   label: 'WIN A GAME',     sub: 'Complete any match',         reward: 50,  total: 1, accent: 'cyan',    progress: 1, awarded: true },
      { id: 'draft1', label: 'DRAFT A PLAYER', sub: 'Use a free or credit draft', reward: 25,  total: 1, accent: 'magenta', progress: 1, awarded: true },
      { id: 'play3',  label: 'PLAY 3 GAMES',   sub: 'Any mode counts',            reward: 100, total: 3, accent: 'gold',    progress: 3, awarded: true },
    ],
    weekly: [
      { id: 'wchallenge', label: 'CREATE A CHALLENGE ME', sub: 'Post your roster on r/TheMBA', reward: 200, total: 1, accent: 'gold', featured: true, progress: 1, awarded: true },
      { id: 'wwin5',   label: 'WIN 5 GAMES',     sub: 'Any mode',                reward: 300, total: 5, accent: 'cyan',    progress: 5, awarded: true  },
      { id: 'wdraft',  label: 'DRAFT 3 PLAYERS', sub: 'Free or credit drafts',   reward: 150, total: 3, accent: 'magenta', progress: 2, awarded: false },
    ],
  },
};

const DESKTOP_PRESETS = [
  { label: '628×548 (Reddit)', w: 628, h: 548 },
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

export default function LobbyStory() {
  const [log, setLog]           = useState([]);
  const [isFtue, setIsFtue]     = useState(false);
  const [hasRoster, setHasRoster] = useState(true);
  // Whether the user has a live challenge post — drives the featured mission CTA
  // (VIEW when active, POST NOW otherwise). The My Challenge modal itself is
  // App-level (App.jsx), so here we just preview the CTA + log the click.
  const [hasChallenge, setHasChallenge] = useState(false);
  const [credits, setCredits]   = useState(2450);
  const [mobile, setMobile]     = useState(false);
  const [deviceKey, setDeviceKey] = useState('iphone14');
  const [desktopW, setDesktopW] = useState(628);
  const [desktopH, setDesktopH] = useState(548);
  const [scanlines, setScanlines] = useState(0.5);
  const [vignette, setVignette]   = useState(0.75);
  const [missionScenario, setMissionScenario] = useState('midway');
  const [missions, setMissions] = useState(() => ({
    daily:  MISSION_SCENARIOS.midway.daily,
    weekly: MISSION_SCENARIOS.midway.weekly,
  }));

  // Swap to a scenario from the picker.
  const applyScenario = (key) => {
    setMissionScenario(key);
    setMissions({
      daily:  MISSION_SCENARIOS[key].daily.map(m => ({ ...m })),
      weekly: MISSION_SCENARIOS[key].weekly.map(m => ({ ...m })),
    });
  };

  // Flip the first not-yet-awarded mission to awarded so LobbyScreen's
  // diff detection fires the celebratory modal.
  const fireCelebration = () => {
    setMissions(prev => {
      const dup = { daily: prev.daily.map(m => ({ ...m })), weekly: prev.weekly.map(m => ({ ...m })) };
      const target = dup.daily.find(m => !m.awarded) ?? dup.weekly.find(m => !m.awarded);
      if (target) {
        target.progress = target.total;
        target.awarded = true;
      }
      return dup;
    });
  };

  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 12));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'monospace', fontSize: 12, color: '#888' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={isFtue} onChange={e => setIsFtue(e.target.checked)} />
          FTUE (no games played)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={hasRoster} onChange={e => setHasRoster(e.target.checked)} />
          Has roster
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={hasChallenge} onChange={e => setHasChallenge(e.target.checked)} />
          Has active challenge (VIEW)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Credits
          <input
            type="number"
            value={credits}
            onChange={e => setCredits(Number(e.target.value))}
            style={{ width: 70, background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
          />
        </label>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Missions
          <select
            value={missionScenario}
            onChange={e => applyScenario(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
          >
            {Object.entries(MISSION_SCENARIOS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </label>
        <button
          onClick={fireCelebration}
          style={{
            background: '#1a1a1a', border: '1px solid #5bf2d4', color: '#5bf2d4',
            borderRadius: 3, padding: '3px 10px', fontSize: 12, cursor: 'pointer',
          }}
        >
          🎉 Fire mission complete
        </button>
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
      </div>

      {/* Preview */}
      {mobile ? (
        <PhoneFrameExpanded device={DEVICES[deviceKey]}>
          <LobbyScreen
            username="peetan"
            credits={credits}
            homeRoster={hasRoster ? MOCK_ROSTER : []}
            missions={missions}
            isFtue={isFtue}
            onPlay={(mode) => push(`onPlay(${mode})`)}
            onCollection={() => push('onCollection')}
            onDraft={() => push('onDraft')}
            onAuction={() => push('onAuction')}
            onOptions={() => push('onOptions')}
            onCreateChallenge={() => push('onCreateChallenge')}
            challengeActive={hasChallenge}
            onViewChallenge={() => push('onViewChallenge (opens My Challenge modal)')}
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
          <LobbyScreen
            username="peetan"
            credits={credits}
            homeRoster={hasRoster ? MOCK_ROSTER : []}
            missions={missions}
            isFtue={isFtue}
            onPlay={(mode) => push(`onPlay(${mode})`)}
            onCollection={() => push('onCollection')}
            onDraft={() => push('onDraft')}
            onAuction={() => push('onAuction')}
            onOptions={() => push('onOptions')}
            onCreateChallenge={() => push('onCreateChallenge')}
            challengeActive={hasChallenge}
            onViewChallenge={() => push('onViewChallenge (opens My Challenge modal)')}
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

import React, { useState } from 'react';
import { PhoneFrameExpanded, DEVICES } from '../PhoneFrame.jsx';
import { CrtOverlay } from '../StoryFrame.jsx';
import { DraftScreen } from '@src/components/DraftScreen.jsx';

const TEAM_NAMES = ['BULLS', 'WOLVES', 'HAWKS', 'NETS', 'KINGS'];

const DESKTOP_PRESETS = [
  { label: '628×548 (Reddit)', w: 628, h: 548 },
  { label: '1920×1080', w: 1920, h: 1080 },
  { label: '1440×900',  w: 1440, h: 900  },
  { label: '1280×800',  w: 1280, h: 800  },
  { label: '1024×768',  w: 1024, h: 768  },
  { label: '768×1024',  w: 768,  h: 1024 },
  { label: '640×560',   w: 640,  h: 560  },
  { label: '540×700',   w: 540,  h: 700  },
  { label: '480×800',   w: 480,  h: 800  },
];

export default function DraftStory() {
  const [teamName, setTeamName] = useState('BULLS');
  const [key, setKey] = useState(0);
  const [log, setLog] = useState([]);
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
        <span style={{ color: '#e0e0e0', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }}>Draft Screen</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
          onClick={() => setKey((k) => k + 1)}
          style={{ background: '#1a1a1a', border: '1px solid #444', color: '#aaa', borderRadius: 3, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}
        >
          ↺ Reset
        </button>
      </div>

      {/* Preview */}
      {mobile ? (
        <PhoneFrameExpanded device={DEVICES[deviceKey]}>
          <DraftScreen
            key={`${key}-${teamName}-m`}
            homeTeamName={teamName}
            onStart={(roster) => push(`onStart (${roster?.length ?? 0} players)`)}
            onBack={() => push('onBack')}
            onMenu={(roster) => push(`onMenu (${roster?.length ?? 0} players)`)}
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
          <DraftScreen
            key={`${key}-${teamName}`}
            homeTeamName={teamName}
            onStart={(roster) => push(`onStart (${roster?.length ?? 0} players)`)}
            onBack={() => push('onBack')}
            onMenu={(roster) => push(`onMenu (${roster?.length ?? 0} players)`)}
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

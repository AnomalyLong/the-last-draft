import React, { useState } from 'react';
import { PhoneFrameExpanded, DEVICES } from '../PhoneFrame.jsx';
import { CrtOverlay } from '../StoryFrame.jsx';
import FeaturedEventsScreen from '@src/components/FeaturedEventsScreen.jsx';

// Mock admin announcements (mirrors the post.getChallenge → announcements.list shape).
const MOCK_ANNOUNCEMENTS = [
  { id: 'a1', tag: 'NEWS',  accent: 'cyan',    title: 'CHALLENGE POSTS ARE LIVE', sub: 'Post your roster on r/TheMBA — once per week', body: 'Create a Challenge Me post from the lobby missions.\nDefend your record — every result shows on your card.', createdAt: Date.now() - 2 * 3600_000 },
  { id: 'a2', tag: 'PATCH', accent: 'gold',    title: 'v1.3 · CREDIT DRAFTS',     sub: 'Buy draft picks with credits — cost doubles monthly', body: 'First draft each month is 2,500 CR, doubling after. Picks bank until used.', createdAt: Date.now() - 26 * 3600_000 },
  { id: 'a3', tag: 'EVENT', accent: 'magenta', title: 'SEASON 1 KICKOFF',          sub: 'Neon Cup qualifiers open soon', createdAt: Date.now() - 4 * 86400_000 },
];

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

export default function FeaturedEventsStory() {
  const [log, setLog]           = useState([]);
  const [credits, setCredits]   = useState(2450);
  const [mobile, setMobile]     = useState(false);
  const [deviceKey, setDeviceKey] = useState('iphone14');
  const [desktopW, setDesktopW] = useState(628);
  const [desktopH, setDesktopH] = useState(548);
  const [scanlines, setScanlines] = useState(0.5);
  const [vignette, setVignette]   = useState(0.75);
  const [withAnnouncements, setWithAnnouncements] = useState(true);

  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 12));

  const handlers = {
    onBack:       () => push('onBack'),
    onPlay:       (mode) => push(`onPlay(${mode})`),
    onCollection: () => push('onCollection'),
    onDraft:      () => push('onDraft'),
    onAuction:    () => push('onAuction'),
    onOptions:    () => push('onOptions'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'monospace', fontSize: 12, color: '#888' }}>
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
          <input type="checkbox" checked={withAnnouncements} onChange={e => setWithAnnouncements(e.target.checked)} />
          Announcements
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
      </div>

      {/* Preview */}
      {mobile ? (
        <PhoneFrameExpanded device={DEVICES[deviceKey]}>
          <FeaturedEventsScreen username="peetan" credits={credits} announcements={withAnnouncements ? MOCK_ANNOUNCEMENTS : []} {...handlers} />
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
          <FeaturedEventsScreen username="peetan" credits={credits} announcements={withAnnouncements ? MOCK_ANNOUNCEMENTS : []} {...handlers} />
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

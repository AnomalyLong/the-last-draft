import { useState } from 'react';
import { PhoneFrameExpanded, DEVICES } from '../PhoneFrame.jsx';
import { CrtOverlay } from '../StoryFrame.jsx';
import BattlePassScreen from '@src/components/BattlePassScreen.jsx';

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

export default function BattlePassStory() {
  const [log, setLog]           = useState([]);
  const [credits, setCredits]   = useState(2450);
  const [mobile, setMobile]     = useState(false);
  const [deviceKey, setDeviceKey] = useState('iphone14');
  const [desktopW, setDesktopW] = useState(1280);
  const [desktopH, setDesktopH] = useState(800);
  const [scanlines, setScanlines] = useState(0.5);
  const [vignette, setVignette]   = useState(0.75);
  // Mock pass entitlement state. 'none' / 'basic' / 'premium' covers the three
  // visual variants. Real purchase() is stubbed in the story — see handlers.
  const [passTier, setPassTier] = useState('none');

  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 12));

  // Build a passState that matches what App.jsx hands the screen in prod.
  // founder=true once any pass is owned, mirroring the server-side behavior
  // in core/battlePass.ts where the lifetime flag is set on first purchase.
  const passState = {
    tier: passTier === 'none' ? null : passTier,
    purchasedAt: passTier === 'none' ? 0 : Date.now(),
    founder: passTier !== 'none',
  };

  // Mock BP-exclusive missions covering all three states: in-progress,
  // completed-unclaimed, claimed. Mirrors the MissionView shape from core/missions.ts.
  const mockBpMissions = [
    { id: 'bp_win10',     label: 'WIN 10 GAMES',      sub: 'Any mode',                  reward: 1000, total: 10, progress: 3,  completed: false, claimed: false, accent: 'cyan'    },
    { id: 'bp_win25',     label: 'WIN 25 GAMES',       sub: 'Dominate the season',       reward: 2500, total: 25, progress: 3,  completed: false, claimed: false, accent: 'cyan'    },
    { id: 'bp_draft5',    label: 'DRAFT 5 PLAYERS',    sub: 'Free or credit drafts',     reward: 500,  total: 5,  progress: 5,  completed: true,  claimed: false, accent: 'magenta' },
    { id: 'bp_draft10',   label: 'DRAFT 10 PLAYERS',   sub: 'Build your empire',         reward: 1200, total: 10, progress: 5,  completed: false, claimed: false, accent: 'magenta' },
    { id: 'bp_challenge', label: 'POST 3 CHALLENGES',  sub: 'Challenge the community',   reward: 750,  total: 3,  progress: 3,  completed: true,  claimed: true,  accent: 'gold'    },
    { id: 'bp_play50',    label: 'PLAY 50 GAMES',      sub: 'The grind is real',         reward: 3000, total: 50, progress: 12, completed: false, claimed: false, accent: 'gold'    },
  ];

  const handlers = {
    onBack:        () => push('onBack'),
    onPlay:        () => push('onPlay'),
    onCollection:  () => push('onCollection'),
    onDraft:       () => push('onDraft'),
    onAuction:     () => push('onAuction (re-open battle pass)'),
    onOptions:     () => push('onOptions'),
    onBpClaim:     () => push('onBpClaim (refreshBpMissions)'),
    onPassRefresh: () => push('onPassRefresh (story: no real purchase wired)'),
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
          Pass
          <select
            value={passTier}
            onChange={e => setPassTier(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
          >
            <option value="none">none</option>
            <option value="basic">basic</option>
            <option value="premium">premium</option>
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
      </div>

      {/* Preview */}
      {mobile ? (
        <PhoneFrameExpanded device={DEVICES[deviceKey]}>
          <BattlePassScreen username="peetan" credits={credits} passState={passState} bpMissions={mockBpMissions} {...handlers} />
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
          <BattlePassScreen username="peetan" credits={credits} passState={passState} bpMissions={mockBpMissions} {...handlers} />
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
          {log.map((l, i) => <div key={i} style={{ color: '#c084ff' }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

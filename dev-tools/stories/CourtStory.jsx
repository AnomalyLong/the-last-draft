import React, { useState } from 'react';
import { ZOOM_W, TOTAL_H } from '@src/constants.js';
import { GameScene } from '@src/components/GameScene.jsx';
import { useGame } from '@src/useGame.js';
import OPPONENTS from '@src/opponents.json';
import { PhoneFrameExpanded, MOBILE_EXPANDED_W, MOBILE_EXPANDED_H } from '../PhoneFrame.jsx';
import { MobileToggle } from '../StoryFrame.jsx';

const HOME_ROSTER = OPPONENTS[0].players;  // WOLVES
const AWAY_TEAM   = OPPONENTS[1];          // HAWKS

export default function CourtStory() {
  const [zoom, setZoom] = useState(2);
  const [mobile, setMobile] = useState(false);
  const [musicVol, setMusicVol] = useState(0);
  const [sfxVol, setSfxVol]     = useState(0.5);
  const [scanlines, setScanlines] = useState(0.5);
  const [vignette, setVignette]   = useState(0.75);
  const [showOptions, setShowOptions] = useState(false);

  const gameState = useGame({ homeRoster: HOME_ROSTER, awayRoster: AWAY_TEAM.players });

  const pxW = ZOOM_W * zoom;
  const pxH = TOTAL_H * zoom;

  const gameSceneProps = {
    ...gameState,
    // Always admin in the story so the in-game DebugConsole is available
    // for testing — production gates it on the real admin check in App.jsx.
    isAdmin: true,
    homeTeamName: OPPONENTS[0].name,
    awayTeamName: AWAY_TEAM.name,
    homeRoster: HOME_ROSTER,
    awayRoster: AWAY_TEAM.players,
    gameTip: null,
    onDismissGameTip: () => {},
    showOptions,
    onShowOptions: setShowOptions,
    musicVol,   sfxVol,
    onMusicVol: setMusicVol, onSfxVol: setSfxVol,
    scanlines,  vignette,
    onScanlines: setScanlines, onVignette: setVignette,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: 'monospace' }}>
        <span style={{ color: '#e0e0e0', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }}>Court (Live)</span>
        {!mobile && (
          <label style={{ color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            Zoom
            <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5].map(z => <option key={z} value={z}>{z}×</option>)}
            </select>
          </label>
        )}
        <span style={{ color: '#555', fontSize: 11 }}>
          {ZOOM_W}×{TOTAL_H} native · home: {OPPONENTS[0].name} · away: {AWAY_TEAM.name}
        </span>
        <MobileToggle active={mobile} onToggle={() => setMobile(m => !m)} />
      </div>

      {mobile ? (
        <PhoneFrameExpanded>
          <GameScene
            containerStyle={{ width: MOBILE_EXPANDED_W, height: MOBILE_EXPANDED_H }}
            svgProps={{ style: { imageRendering: 'pixelated', display: 'block' } }}
            {...gameSceneProps}
          />
        </PhoneFrameExpanded>
      ) : (
        <div style={{ width: pxW, height: pxH, flexShrink: 0 }}>
          <GameScene
            containerStyle={{ width: pxW, height: pxH }}
            svgProps={{ style: { imageRendering: 'pixelated', display: 'block' } }}
            {...gameSceneProps}
          />
        </div>
      )}
    </div>
  );
}

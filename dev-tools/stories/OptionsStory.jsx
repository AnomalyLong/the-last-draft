import React, { useState } from 'react';
import StoryFrame from '../StoryFrame.jsx';
import { OptionsScreen } from '@src/components/OptionsScreen.jsx';

export default function OptionsStory() {
  const [musicVol, setMusicVol] = useState(1.0);
  const [sfxVol, setSfxVol] = useState(1.0);
  const [scanlines, setScanlines] = useState(0.5);
  const [vignette, setVignette] = useState(0.75);
  const [log, setLog] = useState([]);
  const push = (msg) => setLog((l) => [`${new Date().toLocaleTimeString()} ${msg}`, ...l].slice(0, 10));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StoryFrame title="Options Screen">
        <OptionsScreen
          musicVol={musicVol}   onMusicVol={setMusicVol}
          sfxVol={sfxVol}       onSfxVol={setSfxVol}
          scanlines={scanlines} onScanlines={setScanlines}
          vignette={vignette}   onVignette={setVignette}
          onBack={() => push('onBack')}
        />
      </StoryFrame>

      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', display: 'flex', gap: 24 }}>
        <span>music: {musicVol.toFixed(2)}</span>
        <span>sfx: {sfxVol.toFixed(2)}</span>
        <span>scanlines: {scanlines.toFixed(2)}</span>
        <span>vignette: {vignette.toFixed(2)}</span>
        {log[0] && <span style={{ color: '#3a8fd4' }}>{log[0]}</span>}
      </div>
    </div>
  );
}

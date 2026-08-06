import React from 'react';
import { BballChar } from './BballChar.jsx';
import { PixelText } from './PixelText.jsx';
import typingSound from '../sound/typing1.ogg';
import { sfxVolume, subscribeAudioSettings, isAudioSuspended } from '../sound/audioSettings.js';

// ── Audio ──────────────────────────────────────────────────────────────────────
// Two alternating nodes chained back-to-back to fake a seamless loop. Volume is
// NOT baked in at module load — it's derived from sfxVolume() on every play so
// the global mute is respected, and re-applied on settings changes so muting
// mid-sentence goes silent immediately instead of at the next chain hop.
const TYPING_BASE = 0.5;
// Constructed LAZILY, on first actual play — never at module scope. BballTip is
// imported by LobbyScreen/GameScene/DraftScreen, all of which hang off App.jsx,
// and App.jsx also loads on the inline (feed post) view. Module-scope
// `new Audio(typingSound)` therefore put two typing1.ogg nodes on every feed
// impression. It happened not to fetch in Chrome (these never set
// preload='auto', so the load is deferred) — but that is a browser heuristic,
// not a guarantee, and it is exactly the pattern that cost ~7.5MB in
// basketball.js. See audioSettings.js for suspend vs mute. (Aug 5)
let _ta = null;
let _taActive = false;
let _taChainTimer = null;

function _getTa() {
  if (!_ta) {
    _ta = [new Audio(typingSound), new Audio(typingSound)];
    _applyTypingVolume();
  }
  return _ta;
}

function _applyTypingVolume() {
  if (!_ta) return; // nothing constructed yet — nothing to re-apply to
  const v = TYPING_BASE * sfxVolume();
  _ta.forEach(a => { a.volume = v; });
}
subscribeAudioSettings(_applyTypingVolume);

function _chainPlay(idx) {
  if (!_taActive) return;
  const a = _getTa()[idx];
  a.currentTime = 0;
  a.volume = TYPING_BASE * sfxVolume();
  a.play().catch(() => {});
  function schedule() {
    const delay = Math.max(0, (a.duration - 0.02) * 1000);
    _taChainTimer = setTimeout(() => _chainPlay(1 - idx), delay);
  }
  if (a.duration) { schedule(); }
  else { a.addEventListener('loadedmetadata', schedule, { once: true }); }
}

const _typingAudio = {
  play()  {
    if (isAudioSuspended()) return Promise.resolve();
    _taActive = true; clearTimeout(_taChainTimer); _chainPlay(0); return Promise.resolve();
  },
  pause() {
    _taActive = false; clearTimeout(_taChainTimer);
    if (_ta) _ta.forEach(a => { a.pause(); a.currentTime = 0; });
  },
};

// ─── BballTip ─────────────────────────────────────────────────────────────────
// text        — string to typewrite; null/undefined hides the component
// charX/Y     — top-left of the BballChar in parent SVG coords
// scale       — character scale (default 0.30 → 45×45px)
// dlgX/Y      — top-left of the dialog box
// dlgW/H      — dialog box dimensions
// textX/Y     — pixel-text origin (defaults: right of char, vertically centered in box)

export function BballTip({ text, charX, charY, scale = 0.30, dlgX, dlgY, dlgW, dlgH = 19, textX, textY, textScale = 1, tapHint = false, onClick }) {
  const [displayed, setDisplayed] = React.useState('');
  const charIdxRef = React.useRef(0);

  const charW = Math.round(150 * scale);
  const rx = 3;
  const glyphH = 7 * textScale;
  const tx = textX ?? charX + charW + 6;
  const ty = textY ?? dlgY + Math.floor((dlgH - glyphH) / 2);

  // Expand the box character by character; cap at dlgW when fully typed
  const CELL_W = 6 * textScale; // 5px glyph + 1px gap, scaled
  const leftPad = tx - dlgX;
  const rightPad = 6;
  const currentW = Math.min(dlgW, leftPad + displayed.length * CELL_W + rightPad);

  const borderPath = [
    `M ${dlgX},${dlgY}`,
    `L ${dlgX + currentW - rx},${dlgY}`,
    `Q ${dlgX + currentW},${dlgY} ${dlgX + currentW},${dlgY + rx}`,
    `L ${dlgX + currentW},${dlgY + dlgH - rx}`,
    `Q ${dlgX + currentW},${dlgY + dlgH} ${dlgX + currentW - rx},${dlgY + dlgH}`,
    `L ${dlgX},${dlgY + dlgH}`,
  ].join(' ');

  React.useEffect(() => () => _typingAudio.pause(), []);

  React.useEffect(() => {
    if (!text) return;
    setDisplayed('');
    charIdxRef.current = 0;
    _typingAudio.play().catch(() => {});
  }, [text]);

  React.useEffect(() => {
    if (!text || charIdxRef.current >= text.length) {
      _typingAudio.pause();
      return;
    }
    const t = setTimeout(() => {
      const idx = charIdxRef.current;
      charIdxRef.current = idx + 1;
      setDisplayed(text.slice(0, idx + 1));
    }, 38);
    return () => clearTimeout(t);
  }, [displayed, text]);

  if (!text) return null;

  return (
    <g data-testid="bball-tip" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <rect x={dlgX} y={dlgY} width={currentW} height={dlgH} rx={rx}
        fill="#0c1018" shapeRendering="crispEdges" />
      <path d={borderPath} fill="none" stroke="#ffffff" strokeWidth={1.5} />
      <PixelText text={displayed} x={tx} y={ty} scale={textScale} fill="#ffffff" outline={null} />
      {tapHint && displayed === text && text && (
        <g className="bballtip-tap" style={{ animation: 'tapbounce 1.2s ease-in-out infinite' }}>
          <text x={dlgX + currentW - 6} y={dlgY + dlgH - 6} textAnchor="end"
            fontFamily="JetBrains Mono, monospace" fontSize={6 * textScale}
            fontWeight="700" fill="#5bf2d4" letterSpacing="0.16em">
            TAP TO CONTINUE ▼
          </text>
        </g>
      )}
      <BballChar x={charX} y={charY} scale={scale} />
    </g>
  );
}

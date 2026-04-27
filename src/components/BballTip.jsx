import React from 'react';
import { BballChar } from './BballChar.jsx';
import { PixelText } from './PixelText.jsx';
import typingSound from '../sound/typing1.ogg';

// ── Audio ──────────────────────────────────────────────────────────────────────
const _ta = [new Audio(typingSound), new Audio(typingSound)];
_ta.forEach(a => { a.volume = 0.5; });
let _taActive = false;
let _taChainTimer = null;

function _chainPlay(idx) {
  if (!_taActive) return;
  const a = _ta[idx];
  a.currentTime = 0;
  a.play().catch(() => {});
  function schedule() {
    const delay = Math.max(0, (a.duration - 0.02) * 1000);
    _taChainTimer = setTimeout(() => _chainPlay(1 - idx), delay);
  }
  if (a.duration) { schedule(); }
  else { a.addEventListener('loadedmetadata', schedule, { once: true }); }
}

const _typingAudio = {
  play()  { _taActive = true; clearTimeout(_taChainTimer); _chainPlay(0); return Promise.resolve(); },
  pause() { _taActive = false; clearTimeout(_taChainTimer); _ta.forEach(a => { a.pause(); a.currentTime = 0; }); },
};

// ─── BballTip ─────────────────────────────────────────────────────────────────
// text        — string to typewrite; null/undefined hides the component
// charX/Y     — top-left of the BballChar in parent SVG coords
// scale       — character scale (default 0.30 → 45×45px)
// dlgX/Y      — top-left of the dialog box
// dlgW/H      — dialog box dimensions
// textX/Y     — pixel-text origin (defaults: right of char, vertically centered in box)

export function BballTip({ text, charX, charY, scale = 0.30, dlgX, dlgY, dlgW, dlgH = 19, textX, textY, onClick }) {
  const [displayed, setDisplayed] = React.useState('');
  const charIdxRef = React.useRef(0);

  const charW = Math.round(150 * scale);
  const rx = 3;
  const tx = textX ?? charX + charW + 6;
  const ty = textY ?? dlgY + Math.floor((dlgH - 7) / 2);

  // Expand the box character by character; cap at dlgW when fully typed
  const CELL_W = 6; // monogram.js: 5px glyph + 1px gap, scale=1
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
    <g onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <rect x={dlgX} y={dlgY} width={currentW} height={dlgH} rx={rx}
        fill="#0c1018" shapeRendering="crispEdges" />
      <path d={borderPath} fill="none" stroke="#ffffff" strokeWidth={1.5} />
      <PixelText text={displayed} x={tx} y={ty} scale={1} fill="#ffffff" outline={null} />
      <BballChar x={charX} y={charY} scale={scale} />
    </g>
  );
}

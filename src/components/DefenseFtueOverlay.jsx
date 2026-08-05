import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';
import { BballTip } from './BballTip.jsx';

const FTUE_SCALE   = 0.30;
const FTUE_CHAR_X  = 20;
const FTUE_CHAR_Y  = Math.round(TOTAL_H / 3);
const FTUE_DLG_X   = FTUE_CHAR_X + 22;
const FTUE_DLG_Y   = FTUE_CHAR_Y + 13;
const FTUE_DLG_H   = 19;
const FTUE_DLG_W   = ZOOM_W - FTUE_DLG_X - 4;

// The overlay <svg> is xMidYMid meet, so on any container whose aspect doesn't
// match ZOOM_W/TOTAL_H there is letterbox INSIDE the element but outside the
// viewBox. A rect sized to the viewBox therefore leaves dead strips where taps
// land on nothing. Overdraw past the viewBox on both axes so "tap anywhere"
// means anywhere in the element, not just the letterboxed centre.
const BLEED = ZOOM_W;

const FTUE_MESSAGES = [
  "Your turn to defend! Pick a defense before they score.",
  "You only have a few secs. Choose fast!",
  "Different defenses counter different plays. Good luck!",
];

export function DefenseFtueOverlay({ cameraX = 0, onDone }) {
  const [page, setPage] = React.useState(0);
  const isLast = page === FTUE_MESSAGES.length - 1;
  const advance = () => isLast ? onDone() : setPage(p => p + 1);

  return (
    <g data-testid="defense-ftue">
      {/* Dim doubles as the tap target. It already blocked pointer events (an
          SVG rect with a fill is hit-testable); it just had no handler, so
          taps outside the bubble were swallowed and did nothing. Sibling of
          BballTip, not an ancestor, so a tap on the bubble fires advance once. */}
      <rect
        data-testid="defense-ftue-tap"
        x={cameraX - BLEED} y={-BLEED}
        width={ZOOM_W + BLEED * 2} height={TOTAL_H + BLEED * 2}
        fill="#000" opacity={0.55}
        style={{ cursor: 'pointer' }}
        onClick={advance}
      />
      <BballTip
        text={FTUE_MESSAGES[page]}
        charX={cameraX + FTUE_CHAR_X} charY={FTUE_CHAR_Y} scale={FTUE_SCALE}
        dlgX={cameraX + FTUE_DLG_X} dlgY={FTUE_DLG_Y} dlgW={FTUE_DLG_W} dlgH={FTUE_DLG_H}
        onClick={advance}
      />
    </g>
  );
}

import React from 'react';
import { COURT_MID_Y } from '../constants.js';
import bg8 from '../sprites/court-nonet2.png';
import { Net } from './Net.jsx';

// Memoized: re-renders only when a net animation counter changes.
export const Court = React.memo(function Court({ netSwish = { left: 0, right: 0 }, netDunk = { left: 0, right: 0 }, netMiss = { left: 0, right: 0 } }) {
  return (
    <g>
      <image href={bg8} x={-154} y={0} width={495} height={428} />
      <g transform="translate(339, 0) scale(-1, 1) translate(-494, 0)">
        <image href={bg8} x={0} y={0} width={495} height={428} />
      </g>
      <ellipse cx={42} cy={COURT_MID_Y} rx={7} ry={3} fill="none" stroke="#8a6a3a" strokeWidth={1.5} opacity={0.5} />
      <ellipse cx={638} cy={COURT_MID_Y} rx={7} ry={3} fill="none" stroke="#8a6a3a" strokeWidth={1.5} opacity={0.5} />
      {/* Left rim + net overlay — sits on the left backboard. */}
      <Net x={31} y={169} scale={1} swishId={netSwish.left} dunkId={netDunk.left} missId={netMiss.left} />
      {/* Right rim + net — mirrored about the court center (right_x = 679 - left_x),
          flipped horizontally so the rim attaches to the right-side backboard. */}
      <g transform="translate(679, 0) scale(-1, 1)">
        <Net x={31} y={169} scale={1} swishId={netSwish.right} dunkId={netDunk.right} missId={netMiss.right} />
      </g>
    </g>
  );
});

import { COURT_MID_Y } from '../constants.js';
import bg8 from '../sprites/bg8.png';

export function Court() {
  return (
    <g>
      <image href={bg8} x={-154} y={0} width={495} height={428} />
      <g transform="translate(339, 0) scale(-1, 1) translate(-494, 0)">
        <image href={bg8} x={0} y={0} width={495} height={428} />
      </g>
      <ellipse cx={42} cy={COURT_MID_Y} rx={7} ry={3} fill="none" stroke="#8a6a3a" strokeWidth={1.5} opacity={0.5} />
      <ellipse cx={638} cy={COURT_MID_Y} rx={7} ry={3} fill="none" stroke="#8a6a3a" strokeWidth={1.5} opacity={0.5} />
    </g>
  );
}

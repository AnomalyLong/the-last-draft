import React from 'react';
import { ZOOM_W, TOTAL_H } from '../constants.js';

export function CRTOverlay({ cameraX }) {
  return (
    <g pointerEvents="none">
      <defs>
        {/* 1px dark / 1px clear horizontal scanlines */}
        <pattern id="crt-lines" x="0" y="0" width="1" height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="1" width="1" height="1" fill="#000" opacity="0.16" />
        </pattern>

        {/* Vignette: transparent center → dark corners */}
        <radialGradient id="crt-vignette" cx="50%" cy="50%" r="75%">
          <stop offset="35%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.60" />
        </radialGradient>

        {/* Subtle RGB aberration filter on the full scene */}
        <filter id="crt-aberration" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href="data:image/svg+xml," result="empty" />
          <feOffset dx="0.6" dy="0" in="SourceGraphic" result="r" />
          <feOffset dx="-0.6" dy="0" in="SourceGraphic" result="b" />
          <feColorMatrix in="r" type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rOnly" />
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gOnly" />
          <feColorMatrix in="b" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bOnly" />
          <feBlend in="rOnly"  in2="gOnly" mode="screen" result="rg" />
          <feBlend in="rg"     in2="bOnly" mode="screen" />
        </filter>
      </defs>

      {/* Scanlines */}
      <rect x={cameraX - 2} y={-2} width={ZOOM_W + 4} height={TOTAL_H + 4} fill="url(#crt-lines)" />

      {/* Vignette */}
      <rect x={cameraX - 2} y={-2} width={ZOOM_W + 4} height={TOTAL_H + 4} fill="url(#crt-vignette)" />
    </g>
  );
}

import React from 'react';

/**
 * BballChar — cartoon basketball mascot, 512×512 natural size.
 * Props: x, y, scale, flipH
 */
export function BballChar({ x = 0, y = 0, scale = 1, flipH = false }) {
  const W = 512, H = 512;
  const tx = flipH
    ? `translate(${x + W * scale}, ${y}) scale(${-scale}, ${scale})`
    : `translate(${x}, ${y}) scale(${scale})`;

  return (
    <g transform={tx}>
      {/* Basketball Body */}
      <circle cx="256" cy="220" r="120" fill="#F28C28" stroke="#5A2E1F" strokeWidth="8"/>

      {/* Basketball Lines */}
      <path d="M136 220 Q256 140 376 220" fill="none" stroke="#5A2E1F" strokeWidth="6"/>
      <path d="M136 220 Q256 300 376 220" fill="none" stroke="#5A2E1F" strokeWidth="6"/>
      <line x1="256" y1="100" x2="256" y2="340" stroke="#5A2E1F" strokeWidth="6"/>

      {/* Eyes */}
      <ellipse cx="220" cy="200" rx="22" ry="28" fill="white"/>
      <ellipse cx="292" cy="200" rx="22" ry="28" fill="white"/>
      <circle cx="220" cy="205" r="10" fill="#3B1F1A"/>
      <circle cx="292" cy="205" r="10" fill="#3B1F1A"/>

      {/* Smile */}
      <path d="M210 250 Q256 290 302 250" stroke="#3B1F1A" strokeWidth="6" fill="none"/>
      <path d="M225 250 Q256 275 287 250" fill="#E94B3C"/>

      {/* Arms */}
      <line x1="150" y1="240" x2="90" y2="180" stroke="#5A2E1F" strokeWidth="10" strokeLinecap="round"/>
      <line x1="362" y1="240" x2="420" y2="200" stroke="#5A2E1F" strokeWidth="10" strokeLinecap="round"/>

      {/* Gloves */}
      <circle cx="90" cy="180" r="20" fill="white" stroke="#5A2E1F" strokeWidth="4"/>
      <circle cx="420" cy="200" r="20" fill="white" stroke="#5A2E1F" strokeWidth="4"/>

      {/* Legs */}
      <line x1="220" y1="340" x2="180" y2="420" stroke="#5A2E1F" strokeWidth="10" strokeLinecap="round"/>
      <line x1="292" y1="340" x2="340" y2="420" stroke="#5A2E1F" strokeWidth="10" strokeLinecap="round"/>

      {/* Shoes */}
      <ellipse cx="180" cy="430" rx="40" ry="20" fill="#D83A2E"/>
      <ellipse cx="340" cy="430" rx="40" ry="20" fill="#D83A2E"/>
    </g>
  );
}

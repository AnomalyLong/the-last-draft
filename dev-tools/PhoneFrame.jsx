import React from 'react';
import { ZOOM_W, TOTAL_H } from '@src/constants.js';

export const DEVICES = {
  iphone14:      { label: 'iPhone 14',        w: 390, h: 844 },
  iphone14plus:  { label: 'iPhone 14 Plus',   w: 428, h: 926 },
  iphoneSE:      { label: 'iPhone SE 3',      w: 375, h: 667 },
  androidSmall:  { label: 'Android Small',    w: 360, h: 780 },
  androidLarge:  { label: 'Pixel 7',          w: 412, h: 915 },
  redditNarrow:  { label: 'Reddit (narrow)',  w: 320, h: 693 },
};

const SIDE_BEZEL = 12;
const TOP_BEZEL  = 14;
const BOT_BEZEL  = 20;
const STATUS_H   = 50;
const HOME_H     = 34;

// Legacy named exports used by other stories
export const MOBILE_EXPANDED_W = DEVICES.iphone14.w;
export const MOBILE_EXPANDED_H = DEVICES.iphone14.h - STATUS_H - HOME_H;
export const MOBILE_INLINE_W   = 288;
export const MOBILE_INLINE_H   = 320;

export function PhoneFrameExpanded({ children, device = DEVICES.iphone14 }) {
  const { w, h } = device;
  const contentH = h - STATUS_H - HOME_H;

  const gameScale = Math.min(w / ZOOM_W, contentH / TOTAL_H);
  const gameW = Math.round(ZOOM_W * gameScale);
  const gameH = Math.round(TOTAL_H * gameScale);

  const outerW = w + SIDE_BEZEL * 2;
  const outerH = h + TOP_BEZEL + BOT_BEZEL;

  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{
        width: outerW, height: outerH,
        background: '#1c1c1e',
        border: '1.5px solid #3a3a3c',
        borderRadius: 44,
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        paddingTop: TOP_BEZEL,
        paddingBottom: BOT_BEZEL,
        paddingLeft: SIDE_BEZEL,
        paddingRight: SIDE_BEZEL,
      }}>
        <div style={{
          width: w, height: h,
          background: '#000',
          borderRadius: 32,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Status bar */}
          <div style={{
            height: STATUS_H,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 20px 8px',
            color: '#fff',
            fontSize: 12,
            fontFamily: '-apple-system, sans-serif',
            fontWeight: 600,
            position: 'relative',
            zIndex: 2,
            background: 'rgba(0,0,0,0.5)',
          }}>
            <span>9:41</span>
            <div style={{
              width: 120, height: 34, background: '#000', borderRadius: 20,
              position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            }} />
            <span style={{ fontSize: 10 }}>●●● ⬛ 🔋</span>
          </div>

          {/* Content area */}
          <div style={{ width: w, height: contentH, position: 'relative', background: '#111' }}>
            {children}
          </div>

          {/* Home indicator */}
          <div style={{ height: HOME_H, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            <div style={{ width: 120, height: 5, background: 'rgba(255,255,255,0.3)', borderRadius: 3 }} />
          </div>
        </div>
      </div>

      <div style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', marginTop: 6, textAlign: 'center' }}>
        {device.label} · {w}×{h} · game {gameW}×{gameH}px
      </div>
    </div>
  );
}

// Inline mode: Reddit feed post card
export function PhoneFrameInline({ children }) {
  const INLINE_W = 288;
  const INLINE_H = 320;
  const inlineScale = Math.min(INLINE_W / ZOOM_W, INLINE_H / TOTAL_H);
  const renderedW = Math.round(ZOOM_W * inlineScale);
  const renderedH = Math.round(TOTAL_H * inlineScale);

  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{
        width: INLINE_W + 32, background: '#1a1a1b', borderRadius: 8,
        overflow: 'hidden', border: '1px solid #2a2a2b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
          <div style={{ width: 18, height: 18, background: '#ff4500', borderRadius: '50%' }} />
          <span style={{ color: '#818384', fontSize: 11, fontFamily: '-apple-system, sans-serif' }}>r/devvit</span>
          <span style={{ color: '#555', fontSize: 11, fontFamily: '-apple-system, sans-serif' }}>• 2h</span>
        </div>
        <div style={{ width: INLINE_W + 32, height: INLINE_H, background: '#111', overflow: 'hidden', position: 'relative' }}>
          <svg
            width={INLINE_W + 32} height={INLINE_H}
            viewBox={`0 0 ${ZOOM_W} ${TOTAL_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', imageRendering: 'pixelated' }}
          >
            {children}
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '6px 12px', color: '#818384', fontSize: 11, fontFamily: '-apple-system, sans-serif' }}>
          <span>▲ 1.2k</span><span>💬 42</span><span>⤴ Share</span>
        </div>
      </div>
      <div style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', marginTop: 6, textAlign: 'center' }}>
        inline card {INLINE_W}×{INLINE_H}px — game renders {renderedW}×{renderedH}px
      </div>
    </div>
  );
}

import React from 'react';
import { ZOOM_W, TOTAL_H } from '@src/constants.js';

// iPhone 14-class logical pixels (used for expanded game webview)
const PHONE_VIEWPORT_W = 390;
const PHONE_VIEWPORT_H = 844;
const SIDE_BEZEL = 12;
const TOP_BEZEL = 14;
const BOT_BEZEL = 20;
const STATUS_H = 50; // status bar + dynamic island
const HOME_H = 34;   // home indicator area

// Inner usable height for the game (full phone height minus chrome bars)
export const MOBILE_EXPANDED_W = PHONE_VIEWPORT_W;
export const MOBILE_EXPANDED_H = PHONE_VIEWPORT_H - STATUS_H - HOME_H;

// Inline post card dimensions (shown in the Reddit feed)
// REGULAR = 320px, width ~288px on narrow mobile
export const MOBILE_INLINE_W = 288;
export const MOBILE_INLINE_H = 320;

// How the game SVG letterboxes inside the expanded phone viewport
// (same logic as SVG preserveAspectRatio="xMidYMid meet")
const GAME_SCALE = Math.min(MOBILE_EXPANDED_W / ZOOM_W, MOBILE_EXPANDED_H / TOTAL_H);
export const MOBILE_GAME_RENDERED_W = Math.round(ZOOM_W * GAME_SCALE);
export const MOBILE_GAME_RENDERED_H = Math.round(TOTAL_H * GAME_SCALE);

const PHONE_OUTER_W = PHONE_VIEWPORT_W + SIDE_BEZEL * 2;
const PHONE_OUTER_H = PHONE_VIEWPORT_H + TOP_BEZEL + BOT_BEZEL;

// Expanded mode: full-screen game webview on a phone.
// children should be sized to MOBILE_EXPANDED_W × MOBILE_EXPANDED_H.
export function PhoneFrameExpanded({ children }) {
  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{
        width: PHONE_OUTER_W,
        height: PHONE_OUTER_H,
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
        {/* Phone screen background */}
        <div style={{
          width: PHONE_VIEWPORT_W,
          height: PHONE_VIEWPORT_H,
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
            {/* Dynamic island */}
            <div style={{
              width: 120,
              height: 34,
              background: '#000',
              borderRadius: 20,
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
            }} />
            <span style={{ fontSize: 10 }}>●●● ⬛ 🔋</span>
          </div>

          {/* Game fills remaining height */}
          <div style={{
            width: MOBILE_EXPANDED_W,
            height: MOBILE_EXPANDED_H,
            position: 'relative',
            background: '#111',
          }}>
            {children}
          </div>

          {/* Home indicator */}
          <div style={{
            height: HOME_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
          }}>
            <div style={{
              width: 120,
              height: 5,
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 3,
            }} />
          </div>
        </div>
      </div>

      {/* Letterbox info */}
      <div style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', marginTop: 6, textAlign: 'center' }}>
        game renders {MOBILE_GAME_RENDERED_W}×{MOBILE_GAME_RENDERED_H}px
        {' '}(letterboxed in {MOBILE_EXPANDED_W}×{MOBILE_EXPANDED_H} viewport)
      </div>
    </div>
  );
}

// Inline mode: the Reddit feed post card on a narrow mobile screen.
// children should be sized to MOBILE_INLINE_W × MOBILE_INLINE_H.
export function PhoneFrameInline({ children }) {
  const INLINE_SCALE = Math.min(MOBILE_INLINE_W / ZOOM_W, MOBILE_INLINE_H / TOTAL_H);
  const renderedW = Math.round(ZOOM_W * INLINE_SCALE);
  const renderedH = Math.round(TOTAL_H * INLINE_SCALE);

  return (
    <div style={{ display: 'inline-block' }}>
      {/* Simulated Reddit feed context */}
      <div style={{
        width: MOBILE_INLINE_W + 32,
        background: '#1a1a1b',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #2a2a2b',
      }}>
        {/* Post header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
          <div style={{ width: 18, height: 18, background: '#ff4500', borderRadius: '50%' }} />
          <span style={{ color: '#818384', fontSize: 11, fontFamily: '-apple-system, sans-serif' }}>r/devvit</span>
          <span style={{ color: '#555', fontSize: 11, fontFamily: '-apple-system, sans-serif' }}>• 2h</span>
        </div>

        {/* Inline post card — fixed height, full width */}
        <div style={{
          width: MOBILE_INLINE_W + 32,
          height: MOBILE_INLINE_H,
          background: '#111',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <svg
            width={MOBILE_INLINE_W + 32}
            height={MOBILE_INLINE_H}
            viewBox={`0 0 ${ZOOM_W} ${TOTAL_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', imageRendering: 'pixelated' }}
          >
            {children}
          </svg>
        </div>

        {/* Post actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '6px 12px',
          color: '#818384',
          fontSize: 11,
          fontFamily: '-apple-system, sans-serif',
        }}>
          <span>▲ 1.2k</span>
          <span>💬 42</span>
          <span>⤴ Share</span>
        </div>
      </div>

      <div style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', marginTop: 6, textAlign: 'center' }}>
        inline card {MOBILE_INLINE_W}×{MOBILE_INLINE_H}px — game renders {renderedW}×{renderedH}px
      </div>
    </div>
  );
}

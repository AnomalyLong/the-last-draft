import React, { useState } from 'react';
import { ZOOM_W, TOTAL_H } from '@src/constants.js';
import { PhoneFrameInline } from './PhoneFrame.jsx';

// Wraps SVG-based screen components in a scaled preview frame.
// Children should be SVG elements sized to ZOOM_W × TOTAL_H.
export default function StoryFrame({ title, children, controls }) {
  const [zoom, setZoom] = useState(1.5);
  const [mobile, setMobile] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {title && (
          <span style={{ color: '#e0e0e0', fontWeight: 'bold', fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 }}>
            {title}
          </span>
        )}
        {!mobile && (
          <label style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
            Zoom
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ background: '#1a1a1a', border: '1px solid #444', color: '#ccc', borderRadius: 3, padding: '2px 6px', fontSize: 12 }}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((z) => (
                <option key={z} value={z}>{z}×</option>
              ))}
            </select>
          </label>
        )}
        <span style={{ color: '#555', fontSize: 11, fontFamily: 'monospace' }}>
          {ZOOM_W} × {TOTAL_H}px native
        </span>
        <MobileToggle active={mobile} onToggle={() => setMobile(m => !m)} />
        {controls}
      </div>

      {mobile ? (
        <PhoneFrameInline>
          {children}
        </PhoneFrameInline>
      ) : (
        <div style={{
          display: 'inline-block',
          border: '1px solid #2a2a2a',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#111',
          width: ZOOM_W * zoom,
          height: TOTAL_H * zoom,
          flexShrink: 0,
        }}>
          <svg
            width={ZOOM_W * zoom}
            height={TOTAL_H * zoom}
            viewBox={`0 0 ${ZOOM_W} ${TOTAL_H}`}
            style={{ display: 'block' }}
          >
            {children}
          </svg>
        </div>
      )}
    </div>
  );
}

export function MobileToggle({ active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        background: active ? '#1e3a5f' : '#1a1a1a',
        border: `1px solid ${active ? '#3a8fd4' : '#444'}`,
        color: active ? '#3a8fd4' : '#888',
        borderRadius: 3,
        padding: '3px 10px',
        fontSize: 12,
        fontFamily: 'monospace',
        cursor: 'pointer',
      }}
    >
      Mobile
    </button>
  );
}

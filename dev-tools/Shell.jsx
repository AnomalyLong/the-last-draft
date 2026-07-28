import React from 'react';
import App from '@src/App.jsx';

// dev:tools renders the REAL game (src/App.jsx), not storybook mockups.
// App internally switches splash vs game via getWebViewMode(), which the
// devvit-shim drives from the ?view= URL param:
//   ?view=post              → App renders the inline SplashScreen
//   ?view=mobile|desktop    → App renders the full expanded game
//
// The Farnsworth canvas loads this harness per frame with the matching
// ?view=. With no param we show a tiny mode switcher for manual browser use.
//
// (The old Storybook harness — 16 hand-authored screens — now lives in
//  `story/` and runs via `npm run story` on port 5175.)

function readView() {
  try {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'post' || v === 'mobile' || v === 'desktop' || v === 'fullscreen') return v;
  } catch {
    /* ignore */
  }
  return 'standalone';
}

export default function Shell() {
  const view = React.useMemo(() => readView(), []);

  // Farnsworth canvas iframe mode — render the real game alone, filling the
  // iframe. No chrome; the canvas supplies the Reddit / phone / desktop frame.
  if (view !== 'standalone') {
    return (
      <div className={`fw-stage fw-stage--${view}`}>
        <App />
      </div>
    );
  }

  // Standalone mode — manual iteration in a plain browser tab. App reads the
  // mode once at mount, so switching reloads with the new ?view=.
  const go = (v) => {
    const u = new URL(window.location.href);
    u.searchParams.set('view', v);
    window.location.href = u.toString();
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <nav style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#111', borderBottom: '1px solid #2a2a2a', alignItems: 'center' }}>
        <span style={{ color: '#888', fontSize: 12, marginRight: 6 }}>Real game · dev:tools</span>
        <button type="button" onClick={() => go('post')} style={btn}>Post (inline splash)</button>
        <button type="button" onClick={() => go('desktop')} style={btn}>Game (expanded)</button>
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: 11 }}>
          vite · 5174 · run <code>npm run dev</code> for live tRPC data
        </span>
      </nav>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#111' }}>
        <div className="fw-stage fw-stage--standalone"><App /></div>
      </div>
    </div>
  );
}

const btn = {
  padding: '6px 14px',
  background: '#2a2a2a',
  color: '#e0e0e0',
  border: '1px solid #333',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
};

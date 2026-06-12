import React from 'react';
import '../styles/lobby.css';
import { FeaturedSection, BottomNav } from './LobbyScreen.jsx';

export default function FeaturedEventsScreen({ username, credits, onBack, onPlay, onCollection, onDraft, onAuction, onOptions }) {
  const [modal, setModal] = React.useState(null);
  const closeModal = () => setModal(null);

  return (
    <div className="lobby2" data-testid="featured-events-screen">

      {/* Title bar — matches the draft / collection centered header */}
      <div className="lb2-topnav">
        <button
          className="lb2-topnav-back"
          onClick={onBack}
          aria-label="Back"
          data-testid="featured-events-back"
        >
          <span>◀</span>
        </button>
        <div className="lb2-topnav-title">
          <span className="lb2-tt-big">FEATURED EVENTS</span>
          <span className="lb2-tt-sub">LIMITED-TIME DROPS</span>
        </div>
        <div className="lb2-topnav-right">
          <span className="lb2-ts-time">{(credits ?? 0).toLocaleString()} CR</span>
        </div>
      </div>

      {/* Scrollable body — featured component only */}
      <div className="lb2-body">
        <FeaturedSection onUnavailable={() => setModal('unavailable')} />
      </div>

      {/* Modal */}
      {modal && (
        <div data-testid="featured-events-modal" style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={closeModal}>
          <div style={{
            background: '#0d1117', border: '1px solid #ff7a3c',
            padding: '24px 20px', maxWidth: 260, textAlign: 'center',
            fontFamily: 'monospace',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#ff7a3c', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>NOT AVAILABLE</div>
            <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
              This feature is not available yet. Check back soon.
            </div>
            <button
              onClick={closeModal}
              style={{
                background: '#ff7a3c', color: '#000', border: 'none',
                padding: '6px 20px', fontFamily: 'monospace', fontSize: 10,
                letterSpacing: '0.1em', cursor: 'pointer',
              }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      <BottomNav
        onPlay={onPlay}
        onCollection={onCollection}
        onDraft={onDraft}
        onAuction={onAuction}
        onOptions={onOptions}
        draftDisabled={false}
      />
    </div>
  );
}

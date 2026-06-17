import React from 'react';
import '../styles/lobby.css';
import { FeaturedSection, BottomNav } from './LobbyScreen.jsx';
import { useAnnouncements, timeAgo } from './TitleStrip.jsx';

// Admin announcements — fuller cards than the bell dropdown (includes the
// optional details body). Rendered under the NEON CUP hero.
function AnnouncementsSection({ announcements }) {
  if (!announcements.length) return null;
  return (
    <div className="lb2-announcements" data-testid="announcements-section">
      <div className="lb2-ft-h">
        <span className="lbl">ANNOUNCEMENTS</span>
        <span className="meta">FROM THE FRONT OFFICE</span>
      </div>
      {announcements.map(a => (
        <div key={a.id} className={`lb2-ft-news-row accent-${a.accent} lb2-ann-row`}>
          <div className="lb2-ft-news-tag">{a.tag}</div>
          <div className="lb2-ft-news-body">
            <div className="lb2-ft-news-title">{a.title}</div>
            <div className="lb2-ft-news-sub">{a.sub}</div>
            {a.body && <div className="lb2-ann-details">{a.body}</div>}
          </div>
          <div className="lb2-ft-news-time">{timeAgo(a.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}

export default function FeaturedEventsScreen({ username, credits, onBack, onPlay, onCollection, onDraft, onAuction, onOptions, announcements: announcementsProp }) {
  const [modal, setModal] = React.useState(null);
  const closeModal = () => setModal(null);
  // Fetched from the server normally; the dev story passes mocks via prop.
  const fetched = useAnnouncements();
  const announcements = announcementsProp ?? fetched;

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
        {/* Credits now live in the global TitleStrip above — keep the spacer so
            the centered title stays balanced against the back button. */}
        <div className="lb2-topnav-right" />
      </div>

      {/* Scrollable body — featured hero + admin announcements */}
      <div className="lb2-body">
        <FeaturedSection onUnavailable={() => setModal('unavailable')} />
        <AnnouncementsSection announcements={announcements} />
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

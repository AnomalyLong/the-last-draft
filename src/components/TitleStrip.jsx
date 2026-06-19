import React from 'react';
import '../styles/lobby.css';
import { trpc } from '../trpc.js';

// ── Global title strip ────────────────────────────────────
// The slim header from the lobby (dot · THE LAST DRAFT · EVENTS · credits ·
// notification bell), extracted so the draft, collection, and events screens
// can share it. Styles live in lobby.css (.lb2-title-strip / .lb2-ts-* /
// .lb2-notif-dropdown). The bell dropdown is self-contained.

// Static demo items — shown only while no admin announcements exist, so the
// bell isn't empty in fresh environments / dev stories.
const NOTIF_ITEMS = [
  { tag: 'PATCH', accent: 'cyan',    title: 'v1.2.0 · SHOT ARC TUNING',        sub: 'ACC rebalance · 3pt window adjusted · netcode pass', time: '2h' },
  { tag: 'DROP',  accent: 'magenta', title: 'LIMITED · CHROME SLAM PACK',       sub: '5★ guaranteed · ends in 18h',                        time: 'NEW' },
  { tag: 'AUCTION',accent: 'gold',   title: 'ZEEKBECK · LOT 0451 CLOSING',      sub: 'Current bid ◉ 18,450 · 142 bidders',                 time: '2h 14m' },
];

// Compact relative timestamp for notification rows ("now", "5m", "2h", "3d").
export function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Admin announcements, newest first. Empty array until loaded / when none
// exist; callers decide their own fallback. Shared by the bell dropdown and
// the Featured Events page.
export function useAnnouncements(limit = 10) {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    trpc.announcements.list.query({ limit }).then(a => setItems(a ?? [])).catch(() => {});
  }, [limit]);
  return items;
}

function NotifDropdown({ announcements, onSelect }) {
  const rows = announcements.length
    ? announcements.map(a => ({ key: a.id, tag: a.tag, accent: a.accent, title: a.title, sub: a.sub, time: timeAgo(a.createdAt) }))
    : NOTIF_ITEMS.map(n => ({ key: n.tag, ...n }));
  return (
    <div className="lb2-notif-dropdown" data-testid="notif-dropdown">
      {rows.map(n => (
        <div key={n.key}
          className={`lb2-ft-news-row accent-${n.accent}`}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onClick={onSelect}
          style={onSelect ? { cursor: 'pointer' } : undefined}>
          <div className="lb2-ft-news-tag">{n.tag}</div>
          <div className="lb2-ft-news-body">
            <div className="lb2-ft-news-title">{n.title}</div>
            <div className="lb2-ft-news-sub">{n.sub}</div>
          </div>
          <div className="lb2-ft-news-time">{n.time}</div>
        </div>
      ))}
    </div>
  );
}

export function TitleStrip({ credits = 0, onEvents }) {
  const [showNotifs, setShowNotifs] = React.useState(false);
  const announcements = useAnnouncements();

  // Unread dot — server-tracked per user (newest announcement vs the user's
  // last bell-open). Opening the dropdown clears it optimistically and
  // persists the seen-marker.
  const [hasUnread, setHasUnread] = React.useState(false);
  React.useEffect(() => {
    trpc.announcements.unread.query().then(r => setHasUnread(!!r?.hasUnread)).catch(() => {});
  }, []);

  const toggleNotifs = () => {
    setShowNotifs(v => {
      const opening = !v;
      if (opening && hasUnread) {
        setHasUnread(false);
        trpc.announcements.markSeen.mutate().catch(() => {});
      }
      return opening;
    });
  };

  return (
    <div className="lb2-title-strip">
      <span className="lb2-ts-dot" />
      <span className="lb2-ts-text">THE LAST DRAFT</span>
      <button
        className="lb2-ts-events"
        onClick={onEvents}
        data-testid="title-events"
      >
        EVENTS
      </button>
      <div className="lb2-ts-right">
        <span className="lb2-ts-time">{(credits ?? 0).toLocaleString()} CR</span>
        <button
          className={`lb2-ts-bell${showNotifs ? ' active' : ''}`}
          onClick={toggleNotifs}
          aria-label="Notifications"
          data-testid="notif-bell"
        >
          🔔
          {hasUnread && <span className="lb2-ts-bell-dot" data-testid="notif-unread-dot" />}
        </button>
      </div>
      {showNotifs && (
        <NotifDropdown
          announcements={announcements}
          onSelect={() => { setShowNotifs(false); onEvents?.(); }}
        />
      )}
    </div>
  );
}

export default TitleStrip;

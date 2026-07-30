import React from 'react';
import '../styles/lobby.css';
import { trpc } from '../trpc.js';
import { toggleMute, isMuted } from '../sound/basketball.js';
import { playCursor, playSelect } from '../sound/ui.js';
import { useNotifStatus, optIn as notifOptIn, optOut as notifOptOut } from '../notifStatus.js';

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

// Push on/off, pinned to the bottom of the bell dropdown.
//
// Deliberately hidden until the user has opted in at least once (sticky
// `everOptedIn`): first-timers are asked to enable via the `wnotify` featured
// mission, which pays them credits for it, and putting a second competing
// prompt in the bell would undercut that. Once they've enabled, this becomes
// the permanent home for the setting — including turning it back ON after an
// opt-out, which is why the flag never clears.
function NotifOptToggle() {
  const { optedIn, everOptedIn, supported, loaded } = useNotifStatus();
  const [busy, setBusy] = React.useState(false);

  if (!loaded || !everOptedIn || !supported) return null;

  const handleToggle = async e => {
    e.stopPropagation(); // never let the row-level onSelect navigation fire
    if (busy) return;
    playSelect();
    setBusy(true);
    try {
      await (optedIn ? notifOptOut() : notifOptIn());
    } catch {
      // Reddit declined — leave the button as it was so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lb2-notif-foot" data-testid="notif-opt-row">
      <span className="lb2-notif-foot-label">
        PUSH ALERTS · {optedIn ? 'ON' : 'OFF'}
      </span>
      <button
        type="button"
        className={`lb2-notif-opt${optedIn ? ' on' : ''}`}
        onClick={handleToggle}
        onMouseEnter={() => playCursor()}
        disabled={busy}
        aria-pressed={optedIn}
        data-testid="notif-opt-toggle"
      >
        {busy ? '···' : optedIn ? 'TURN OFF' : 'TURN ON'}
      </button>
    </div>
  );
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
      <NotifOptToggle />
    </div>
  );
}

export function TitleStrip({ credits = 0, energy, maxEnergy = 5, onEvents }) {
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

  // Global sound mute — backed by the shared audioSettings singleton so the
  // toggle is session-wide regardless of which screen's strip is mounted.
  const [muted, setMuted] = React.useState(() => isMuted());
  const handleToggleMute = () => {
    const next = toggleMute();
    setMuted(next);
    if (!next) playCursor(); // audible confirmation only when turning sound back on
  };

  return (
    <div className="lb2-title-strip">
      <span className="lb2-ts-dot" />
      <span className="lb2-ts-text">THE LAST DRAFT</span>
      <button
        className="lb2-ts-events"
        onClick={onEvents}
        aria-label="Events"
        data-testid="title-events"
      >
        {/* Label shown on wider viewports; swapped for a calendar icon
            below the 480px mobile breakpoint (see lobby.css) so the strip
            stays compact on phones. */}
        <span className="lb2-ts-events-label">EVENTS</span>
        <svg className="lb2-ts-events-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M3 9.5H21" stroke="currentColor" strokeWidth="2" />
          <path d="M8 2.5V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 2.5V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="6.5" y="12.5" width="3" height="3" fill="currentColor" />
        </svg>
      </button>
      <div className="lb2-ts-right">
        {energy != null && (
          <div
            className={`lb2-ts-energy${energy <= 0 ? ' is-empty' : ''}`}
            aria-label={`Energy ${energy} of ${maxEnergy}`}
            data-testid="title-energy"
          >
            <svg className="lb2-ts-energy-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="lb2-ts-energy-val">{energy}<em>/{maxEnergy}</em></span>
          </div>
        )}
        <span className="lb2-ts-time">{(credits ?? 0).toLocaleString()} CR</span>
        <button
          className={`lb2-ts-mute${muted ? ' active' : ''}`}
          onClick={handleToggleMute}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          aria-pressed={muted}
          data-testid="sound-mute"
        >
          {muted ? '🔇' : '🔊'}
        </button>
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

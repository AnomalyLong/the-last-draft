import React from 'react';
import '../styles/lobby.css';

// ── Global title strip ────────────────────────────────────
// The slim header from the lobby (dot · THE LAST DRAFT · EVENTS · credits ·
// notification bell), extracted so the draft, collection, and events screens
// can share it. Styles live in lobby.css (.lb2-title-strip / .lb2-ts-* /
// .lb2-notif-dropdown). The bell dropdown is self-contained.

const NOTIF_ITEMS = [
  { tag: 'PATCH', accent: 'cyan',    title: 'v1.2.0 · SHOT ARC TUNING',        sub: 'ACC rebalance · 3pt window adjusted · netcode pass', time: '2h' },
  { tag: 'DROP',  accent: 'magenta', title: 'LIMITED · CHROME SLAM PACK',       sub: '5★ guaranteed · ends in 18h',                        time: 'NEW' },
  { tag: 'AUCTION',accent: 'gold',   title: 'ZEEKBECK · LOT 0451 CLOSING',      sub: 'Current bid ◉ 18,450 · 142 bidders',                 time: '2h 14m' },
];

function NotifDropdown() {
  return (
    <div className="lb2-notif-dropdown" data-testid="notif-dropdown">
      {NOTIF_ITEMS.map(n => (
        <div key={n.tag} className={`lb2-ft-news-row accent-${n.accent}`}>
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
          onClick={() => setShowNotifs(v => !v)}
          aria-label="Notifications"
          data-testid="notif-bell"
        >
          🔔
          <span className="lb2-ts-bell-dot" />
        </button>
      </div>
      {showNotifs && <NotifDropdown />}
    </div>
  );
}

export default TitleStrip;

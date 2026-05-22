import React from 'react';
import './DraftHubScreen.css';
import { playCancel, playSelect } from '../sound/ui.js';

export function DraftHubScreen({
  freeDrafts = 0,
  credits = 0,
  rosterCount = 0,
  onUsePick,
  onBack,
}) {
  const hasPicks = freeDrafts > 0;
  const handleUse = () => {
    if (!hasPicks) return;
    playSelect();
    onUsePick?.();
  };

  return (
    <div className="draft-hub">
      {/* TOP NAV */}
      <div className="dh-topnav">
        <button
          className="dh-back-btn"
          onClick={() => { playCancel(); onBack?.(); }}
          aria-label="Back"
        >
          <span>◀</span>
        </button>
        <div className="dh-title">
          <span className="dh-big">DRAFT</span>
          <span className="dh-sub">CHOOSE YOUR ANOMALIES</span>
        </div>
        <div className="dh-topnav-spacer" aria-hidden="true" />
      </div>

      {/* SECTION HEADER */}
      <div className="dh-section-h">
        <span className="dh-line" />
        <span className="dh-label">DRAFT PICKS</span>
        <span className="dh-line" />
      </div>

      {/* MAIN — pick counter card */}
      <div className="dh-body">
        <div className="dh-counter">
          <div className="dh-counter-label">PICKS AVAILABLE</div>
          <div className={`dh-counter-value ${hasPicks ? '' : 'empty'}`}>
            {freeDrafts}
          </div>
          <div className="dh-counter-sub">
            {hasPicks
              ? `${freeDrafts === 1 ? 'ONE DRAFT' : `${freeDrafts} DRAFTS`} REMAINING`
              : 'NO DRAFTS REMAINING'}
          </div>
        </div>

        <div className="dh-stats">
          <div className="dh-stat">
            <span className="dh-stat-lbl">CREDITS</span>
            <span className="dh-stat-val">{credits.toLocaleString()}</span>
          </div>
          <div className="dh-stat">
            <span className="dh-stat-lbl">ROSTER</span>
            <span className="dh-stat-val">{rosterCount}<em>/</em>5</span>
          </div>
        </div>

        <button
          className="dh-btn primary"
          onClick={handleUse}
          disabled={!hasPicks}
        >
          <span>⚡</span>
          <span>{hasPicks ? 'USE A PICK · START DRAFT' : 'NO PICKS REMAINING'}</span>
        </button>

        {!hasPicks && (
          <div className="dh-hint">
            ▸ EARN MORE PICKS BY PLAYING GAMES
          </div>
        )}
      </div>
    </div>
  );
}

export default DraftHubScreen;

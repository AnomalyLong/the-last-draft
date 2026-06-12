import React from 'react';
import './DraftHubScreen.css';
import { playCancel, playSelect } from '../sound/ui.js';

export function DraftHubScreen({
  freeDrafts = 0,
  paidPicks = 0,          // banked credit-draft picks (bought, not yet used)
  credits = 0,
  rosterCount = 0,
  nextDraftCost = null,   // cost of the next paid (credit) draft this month, or null while loading
  onUsePick,
  onBuyDraft,
  onCreditDraft,
  onBack,
}) {
  // One pick = one player, whether earned (free) or bought (paid). The big
  // counter shows the TOTAL so it never contradicts the buttons below. Free
  // picks are consumed first (they run the 5-player draft flow); bought picks
  // run the single-player reveal.
  const hasFreePicks = freeDrafts > 0;
  const hasPaidPick = paidPicks > 0;
  const totalPicks = freeDrafts + paidPicks;
  const hasAnyPick = totalPicks > 0;

  const handleUse = () => {
    if (hasFreePicks) {
      playSelect();
      onUsePick?.();
    } else if (hasPaidPick) {
      playSelect();
      onCreditDraft?.();
    }
  };

  const canAffordCredit = nextDraftCost != null && credits >= nextDraftCost;
  const handleBuyDraft = () => {
    if (!canAffordCredit) return;
    playSelect();
    onBuyDraft?.();
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
          <div className={`dh-counter-value ${hasAnyPick ? '' : 'empty'}`}>
            {totalPicks}
          </div>
          <div className="dh-counter-sub">
            {hasAnyPick
              ? `${totalPicks === 1 ? 'ONE DRAFT' : `${totalPicks} DRAFTS`} REMAINING`
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
          disabled={!hasAnyPick}
        >
          <span>⚡</span>
          <span>{hasAnyPick ? 'USE A PICK · START DRAFT' : 'NO PICKS REMAINING'}</span>
        </button>

        {!hasAnyPick && (
          <div className="dh-hint">
            ▸ EARN PICKS BY PLAYING — OR BUY ONE BELOW
          </div>
        )}

        {/* Buy a draft pick — banks a reusable pick (monthly doubling cost) */}
        <div className="dh-credit">
          <button
            className="dh-btn credit"
            onClick={handleBuyDraft}
            disabled={!canAffordCredit}
          >
            <span>★</span>
            <span>
              {nextDraftCost == null
                ? 'BUY A DRAFT'
                : `BUY A DRAFT · ${nextDraftCost.toLocaleString()} CR`}
            </span>
          </button>
          <div className="dh-credit-note">
            {nextDraftCost == null
              ? 'First draft each month is 2,500 CR'
              : canAffordCredit
                ? 'Adds a pick above · cost doubles each buy · resets monthly'
                : `Need ${nextDraftCost.toLocaleString()} CR · cost doubles each buy`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DraftHubScreen;

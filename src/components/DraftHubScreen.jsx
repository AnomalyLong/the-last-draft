import React from 'react';
import './DraftHubScreen.css';
import { playCancel, playSelect } from '../sound/ui.js';

export function DraftHubScreen({
  freeDrafts = 0,
  paidPicks = 0,          // banked credit-draft picks (bought, not yet used)
  credits = 0,
  rosterCount = 0,
  nextDraftCost = null,   // cost of the next paid (credit) draft this week, or null while loading
  costStepPct = null,     // % the cost rises per buy (server-derived), or null while loading
  firstDraftCost = null,  // price of the week's first paid draft (server-derived), or null while loading
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
  // Escalation copy is derived from the server's configured stepPct, never
  // hardcoded. Until it arrives we describe the cost WITHOUT naming a
  // percentage — a vague-but-true string beats a precise-but-stale one.
  // At 0% (the shipped default) there is no rise to describe, and "+0% each
  // buy" would be technically true but absurd, so say it plainly instead.
  const isFlatCost = costStepPct === 0;
  const stepNote = costStepPct == null
    ? 'cost set weekly'
    : isFlatCost
      ? 'same cost every buy'
      : `cost +${costStepPct}% each buy`;
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

        {hasAnyPick && (
          <button
            className="dh-btn primary"
            onClick={handleUse}
          >
            <span>⚡</span>
            <span>USE A PICK · START DRAFT</span>
          </button>
        )}

        {!hasAnyPick && (
          <div className="dh-hint">
            ▸ EARN PICKS BY PLAYING — OR BUY ONE BELOW
          </div>
        )}

        {/* Buy a draft pick — banks a reusable pick (cost escalates weekly) */}
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
              ? (firstDraftCost == null
                  // Nothing from the server yet: say nothing about the ladder.
                  ? (costStepPct == null
                      ? 'Buy an extra pick this week'
                      : isFlatCost
                        ? 'Every draft this week costs the same'
                        : 'First draft each week is the cheapest')
                  : isFlatCost
                    ? `Every draft this week is ${firstDraftCost.toLocaleString()} CR`
                    : `First draft each week is ${firstDraftCost.toLocaleString()} CR`)
              : canAffordCredit
                ? `Adds a pick above · ${stepNote} · resets weekly`
                : `Need ${nextDraftCost.toLocaleString()} CR · ${stepNote}`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DraftHubScreen;

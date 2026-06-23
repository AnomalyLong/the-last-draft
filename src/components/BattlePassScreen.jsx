import React from 'react';
import '../styles/lobby.css';
import '../styles/battle-pass.css';
import { BottomNav, WarpLines } from './LobbyScreen.jsx';
import { playSelect, playCancel, playCursor } from '../sound/ui.js';
import { purchase, OrderResultStatus } from '@devvit/web/client';
import { trpc } from '../trpc';

// ── Static reward data (mock — not wired to server) ──────────
const PREMIUM_REWARDS = [
  { tier: 1,  name: 'WARPLATE CROWN',   rarity: 5, glyph: '◐', color: '#ff2d6f' },
  { tier: 2,  name: 'TITAN CUFF',       rarity: 5, glyph: '◈', color: '#ff7a3c' },
  { tier: 4,  name: 'VOIDWALK SHOES',   rarity: 5, glyph: '◆', color: '#fb923c' },
  { tier: 6,  name: 'ZANSHIN BAND',     rarity: 5, glyph: '◐', color: '#a855f7' },
  { tier: 8,  name: 'GLACIER BOOSTERS', rarity: 5, glyph: '◆', color: '#3ea6ff' },
  { tier: 12, name: 'PARRY GUARD',      rarity: 5, glyph: '◈', color: '#f472b6' },
  { tier: 16, name: 'FROST CUFF',       rarity: 4, glyph: '◈', color: '#67e8f9' },
  { tier: 25, name: 'BOOSTER HI-LO',    rarity: 5, glyph: '◆', color: '#22d3ee' },
];

const SKU_BASIC = 'founders_pass_basic';
const SKU_PREMIUM = 'founders_pass_premium';

// Mirrors BASIC_CREDIT_GRANT / PREMIUM_CREDIT_GRANT in core/battlePass.ts.
// Used only for the success-modal copy — the server is the source of truth
// for the actual credits deposited. Keep in sync if either constant changes.
const CREDITS_BY_TIER = { basic: 25_000, premium: 150_000 };
const SKU_TO_TIER = { [SKU_BASIC]: 'basic', [SKU_PREMIUM]: 'premium' };

function RewardTier({ reward, isPremium, currentTier }) {
  const isActive = currentTier >= reward.tier;
  return (
    <div
      className={`bp-tier ${isActive ? 'active' : ''} ${isPremium ? 'premium' : 'free'}`}
      style={{ '--reward-color': reward.color }}
    >
      <div className="bpt-marker">
        <span className="bptm-num">{reward.tier}</span>
        {isActive && isPremium && <span className="bptm-lock">★</span>}
      </div>
      <div className="bpt-reward">
        <div className="bptr-glyph">{reward.glyph}</div>
        <div className="bptr-name">{reward.name}</div>
        <div className="bptr-rarity">★★★</div>
      </div>
    </div>
  );
}

function ProgressBar({ current, max }) {
  const pct = (current / max) * 100;
  return (
    <div className="bp-progress">
      <div className="bpp-track">
        <div className="bpp-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="bpp-meta">
        <span className="bppm-val">{current} / {max}</span>
        <span className="bppm-pct">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

export default function BattlePassScreen({
  username,
  credits,
  // Server-truth pass state: { tier: 'basic' | 'premium' | null, purchasedAt, founder }.
  // Defaults below cover the dev-story case where the prop isn't provided.
  passState = { tier: null, purchasedAt: 0, founder: false },
  // BP-exclusive seasonal missions. Non-empty only for pass holders.
  bpMissions = [],
  onPassRefresh,
  onBpClaim,
  onBack,
  onPlay,
  onCollection,
  onDraft,
  onAuction,
  onOptions,
}) {
  const tier = passState?.tier ?? null;
  const isPremium = tier === 'premium';
  const isBasic = tier === 'basic';
  const hasAnyPass = tier !== null;

  // Mock tier progress for the rewards display when premium is active.
  // Replace with server-tracked progress when battle-pass advancement ships.
  const currentTier = 8;

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  // After a successful purchase we stash { tier, credits } so the modal can
  // show "FOUNDERS PASS UNLOCKED · Premium Pass · 150,000 credits added".
  // Cleared when the user dismisses the modal.
  const [success, setSuccess] = React.useState(null);
  // Coin-warp animation state — set when the user dismisses the success
  // modal. We capture both endpoints in viewport coords (modal reward row →
  // top-right CR badge) so a fleet of small coins can fly between them.
  const [flying, setFlying] = React.useState(null);
  const rewardRowRef = React.useRef(null);

  // ── BP mission claim state ────────────────────────────────────────────
  const [missionQueue, setMissionQueue] = React.useState([]);
  const missionPopup = missionQueue[0] ?? null;
  const dismissMissionPopup = () => setMissionQueue(q => q.slice(1));

  const handleClaimMission = async (mission) => {
    try {
      const result = await trpc.missions.claimPass.mutate({ missionId: mission.id });
      if (result.claimed) {
        setMissionQueue(q => [...q, mission]);
        onBpClaim?.();
      }
    } catch {
      // Silent — row stays claimable so user can retry.
    }
  };

  const handleBuy = async (sku) => {
    if (busy) return;
    playSelect();
    setError(null);
    setBusy(true);
    try {
      const result = await purchase(sku);
      if (result?.status === OrderResultStatus.STATUS_SUCCESS) {
        await onPassRefresh?.();
        const purchasedTier = SKU_TO_TIER[sku];
        setSuccess({
          tier: purchasedTier,
          credits: CREDITS_BY_TIER[purchasedTier] ?? 0,
        });
      } else {
        playCancel();
        setError(result?.errorMessage || 'Purchase did not complete.');
      }
    } catch (e) {
      playCancel();
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Dismiss the success modal and fly a fleet of coins from the modal's
  // reward row up to the top-right credits badge in the TitleStrip. The
  // modal closes immediately; the coins continue in their own layer.
  const handleSuccessDismiss = () => {
    playSelect();
    const target = document.querySelector('.lb2-ts-time');
    if (!rewardRowRef.current || !target) {
      setSuccess(null);
      return;
    }
    const src = rewardRowRef.current.getBoundingClientRect();
    const dst = target.getBoundingClientRect();
    setFlying({
      start: { x: src.left + src.width / 2, y: src.top + src.height / 2 },
      end:   { x: dst.left + dst.width / 2, y: dst.top + dst.height / 2 },
    });
    setSuccess(null);
    // After the longest coin lands, pulse the target and clear the layer.
    window.setTimeout(() => {
      target.classList.add('lb2-ts-time-pulse');
      window.setTimeout(() => target.classList.remove('lb2-ts-time-pulse'), 700);
      setFlying(null);
    }, 900);
  };

  // CTA labels reflect entitlement state. Basic locks out once Basic is owned
  // (or Premium — premium implies basic). Premium locks out only when owned;
  // when only Basic is owned, the Premium button works as a paid upgrade.
  // 4-point Reddit-Gold-style star, rendered next to the gold price on
  // each CTA per the Devvit "Support This App" design guidelines.
  // Inline SVG so it scales crisply at any button size.
  const goldStar = (
    <svg className="bpf-cta-gold" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path d="M8 0.5 L9.2 6.8 L15.5 8 L9.2 9.2 L8 15.5 L6.8 9.2 L0.5 8 L6.8 6.8 Z" fill="#ffd700" />
    </svg>
  );

  const basicDisabled = isBasic || isPremium || busy;
  const premiumDisabled = isPremium || busy;
  const basicLabel = isBasic || isPremium
    ? <>OWNED</>
    : <>BASIC · {goldStar} 50</>;
  const premiumLabel = isPremium
    ? <>OWNED</>
    : isBasic
      ? <>UPGRADE · {goldStar} 250</>
      : <>PREMIUM · {goldStar} 250</>;

  return (
    <div className="battle-pass" data-testid="battle-pass-screen">
      <div className="lb2-topnav">
        <button
          className="lb2-topnav-back"
          onClick={() => { playCancel(); onBack?.(); }}
          onMouseEnter={() => playCursor()}
          aria-label="Back"
          data-testid="battle-pass-back"
        >
          <span>◀</span>
        </button>
        <div className="lb2-topnav-title">
          <span className="lb2-tt-big">BATTLE PASS</span>
          <span className="lb2-tt-sub">EARLY ACCESS FOUNDERS PASS</span>
        </div>
        {/* Right slot intentionally empty during Early Access — tier counter
            will return when a battle pass is active. */}
        <div className="lb2-topnav-right" />
      </div>

      <div className="bp-scroll">
        {/* Progress section — only shown when a battle pass is active.
            Pre-launch / Early Access has no progress to show. */}
        {isPremium && (
          <section className="bp-section bp-progress-sec">
            <div className="bps-head">
              <span className="bpsh-mark">📊</span>
              <span className="bpsh-title">YOUR PROGRESS</span>
            </div>
            <div className="bp-progress-card">
              <ProgressBar current={currentTier} max={50} />
              <div className="bppc-next">
                <span className="bppcn-lbl">NEXT REWARD IN</span>
                <span className="bppcn-val">{50 - currentTier} TIERS</span>
              </div>
            </div>
          </section>
        )}

        {/* Featured Premium Pass — hero card. Hidden once premium is owned. */}
        {!isPremium && (
          <section className="bp-section bp-featured-sec">
            <div className="bp-featured-wrap">
              <div className="bpf-sidebar" aria-hidden="true">
                <span className="bpf-sidebar-tab" />
              </div>
              <article className="bp-featured-card">
                <div className="bpf-border-ring" aria-hidden="true" />
                <div className="bpf-corner-line" aria-hidden="true" />
                <div className="bpf-art" aria-hidden="true">
                  <div className="bpf-art-placeholder">
                    <div className="bpf-art-glyph">◆</div>
                    <div className="bpf-art-label">SEASON 0<br />EARLY ACCESS</div>
                  </div>
                </div>

                <div className="bpf-content">
                  <h2 className="bpf-title">
                    <span>FOUNDERS PASS</span>
                  </h2>

                  <div className="bpf-blocks-row">
                    <div className="bpf-block bpf-block-perks">
                      <div className="bpf-block-head">PREMIUM PRIVILEGES</div>
                      <ul className="bpf-perks">
                        <li><span className="bpf-bullet">◆</span>Support Last Draft Development</li>
                        <li><span className="bpf-bullet">◆</span>2 Seasons of BP Unlocked Automatically</li>
                        <li><span className="bpf-bullet">◆</span>Up to 150,000 Initial Credits</li>
                        <li><span className="bpf-bullet">◆</span>New Missions</li>
                        <li><span className="bpf-bullet">◆</span>More Bonuses to Come</li>
                      </ul>
                    </div>

                    <div className="bpf-block bpf-block-rewards">
                      <div className="bpf-block-head">CREDITS</div>
                      <div className="bpf-rewards-row bpf-rewards-row-credits">
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: '#19e6c4' }}>★</span>
                            <span className="bpf-reward-count">25,000</span>
                          </div>
                          <div className="bpf-reward-name">BASIC</div>
                        </div>
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: '#c084ff' }}>★</span>
                            <span className="bpf-reward-count">150,000</span>
                          </div>
                          <div className="bpf-reward-name">PREMIUM</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bpf-disclaimer">
                    <span className="bpf-disc-mark">⚠</span>
                    <span>Initial Credits will be Credited with more features coming soon.</span>
                  </div>

                  <div className="bpf-cta-row">
                    <button
                      className="bpf-cta bpf-cta-claim"
                      onClick={() => handleBuy(SKU_BASIC)}
                      onMouseEnter={() => !basicDisabled && playCursor()}
                      disabled={basicDisabled}
                      data-testid="bp-cta-basic"
                    >
                      <span className="bpf-cta-corner bpf-cta-corner-tl" />
                      <span className="bpf-cta-corner bpf-cta-corner-br" />
                      <span className="bpf-cta-label">{basicLabel}</span>
                    </button>
                    <button
                      className="bpf-cta bpf-cta-buy"
                      onClick={() => handleBuy(SKU_PREMIUM)}
                      onMouseEnter={() => !premiumDisabled && playCursor()}
                      disabled={premiumDisabled}
                      data-testid="bp-cta-premium"
                    >
                      <span className="bpf-cta-corner bpf-cta-corner-tl" />
                      <span className="bpf-cta-corner bpf-cta-corner-br" />
                      <span className="bpf-cta-label">{premiumLabel}</span>
                    </button>
                  </div>

                  {error && (
                    <div className="bpf-purchase-error" data-testid="bp-purchase-error" role="alert">
                      {error}
                    </div>
                  )}
                </div>
              </article>
            </div>
          </section>
        )}

        {/* Tier display — premium track only, shown after Founders Pass purchase */}
        {isPremium && (
          <section className="bp-section bp-tiers-sec">
            <div className="bps-head">
              <span className="bpsh-mark">🎁</span>
              <span className="bpsh-title">SEASON REWARDS</span>
              <span className="bpsh-sub">PREMIUM TRACK</span>
            </div>

            <div className="bp-tiers-grid">
              {PREMIUM_REWARDS.map((reward) => (
                <RewardTier
                  key={`premium-${reward.tier}`}
                  reward={reward}
                  isPremium={true}
                  currentTier={currentTier}
                />
              ))}
            </div>
          </section>
        )}

        {/* BP Seasonal Missions — exclusive to pass holders. */}
        <section className="bp-section bp-challenges">
          <div className="bps-head">
            <span className="bpsh-mark">⚡</span>
            <span className="bpsh-title">SEASONAL MISSIONS</span>
            {hasAnyPass && (
              <span className="bpsh-sub" style={{ marginLeft: 'auto', color: '#5bf2d4', fontSize: 9, letterSpacing: '0.14em' }}>PASS EXCLUSIVE</span>
            )}
          </div>
          <div className="bp-challenges-list" style={{ position: 'relative' }}>
            {bpMissions.map(m => {
              const claimable = m.completed && !m.claimed;
              const pct = Math.round((m.progress / m.total) * 100);
              return (
                <div key={m.id} className={`bpcl-item accent-${m.accent}${m.claimed ? ' claimed' : ''}`}>
                  <div className="bpcli-icon">{m.claimed ? '✓' : claimable ? '★' : '◆'}</div>
                  <div className="bpcli-info">
                    <div className="bpclii-name">{m.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', lineHeight: 1.2 }}>{m.sub}</div>
                    <div className="bpclii-progress">
                      <div className="bpclip-bar">
                        <div className="bpclip-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <div className="bpcli-reward">+{m.reward} CR</div>
                    {m.claimed
                      ? <span style={{ fontSize: 10, color: '#5bf2d4', letterSpacing: '0.12em' }}>DONE</span>
                      : claimable
                        ? <button className="bpcl-claim-btn" onClick={() => handleClaimMission(m)} onMouseEnter={() => playCursor()}>CLAIM ▸</button>
                        : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>{m.progress}/{m.total}</span>
                    }
                  </div>
                </div>
              );
            })}
            {/* Lock overlay for non-pass holders */}
            {!hasAnyPass && (
              <div className="bpcl-missions-locked">
                <div className="bpcl-lock-icon">🔒</div>
                <div className="bpcl-lock-title">PASS EXCLUSIVE</div>
                <div className="bpcl-lock-sub">Get the Founders Pass to unlock seasonal missions and earn up to 9,000 bonus credits.</div>
              </div>
            )}
          </div>
        </section>

        {/* Spacer so content isn't hidden behind BottomNav */}
        <div style={{ height: 96 }} />
      </div>

      <BottomNav
        onPlay={onPlay}
        onCollection={onCollection}
        onDraft={onDraft}
        onAuction={onAuction}
        onOptions={onOptions}
        draftDisabled={false}
      />

      {/* Success modal — shown after purchase() resolves successfully. The
          tier + credit count come from the SKU we just initiated; the
          server-side credit deposit has already happened (we refreshed
          passState + userCredits via onPassRefresh before opening this).
          WarpLines (the same hyperspace streak effect used by the lobby's
          mission-complete modal) sells the celebration. */}
      {success && (
        <div
          className="bp-success-backdrop"
          data-testid="bp-purchase-success"
          onClick={handleSuccessDismiss}
        >
          <WarpLines />
          <div
            className={`bp-success-card bp-success-${success.tier}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bp-success-glyph" aria-hidden="true">★</div>
            <div className="bp-success-title">FOUNDERS PASS UNLOCKED</div>
            <div className="bp-success-tier">
              {success.tier === 'premium' ? 'PREMIUM PASS' : 'BASIC PASS'}
            </div>
            <div className="bp-success-rewards" ref={rewardRowRef}>
              <span className="bp-success-coin">◉</span>
              <span className="bp-success-amount">{success.credits.toLocaleString()}</span>
              <span className="bp-success-label">CREDITS ADDED</span>
            </div>
            <div className="bp-success-sub">
              Thanks for supporting Last Draft. You're now a Founder for life.
            </div>
            <button
              className="bp-success-cta"
              onClick={handleSuccessDismiss}
              onMouseEnter={() => playCursor()}
              data-testid="bp-success-continue"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* Mission claim celebration modal — one queued mission at a time. */}
      {missionPopup && (
        <div className="lb2-mission-modal" onClick={dismissMissionPopup} data-testid="bp-mission-modal">
          <WarpLines key={`warp-${missionPopup.id}`} />
          <div key={`card-${missionPopup.id}`} className="lb2-mission-modal-card" onClick={e => e.stopPropagation()}>
            <div className="lb2-mission-modal-tag">MISSION COMPLETE</div>
            <div className="lb2-mission-modal-title">{missionPopup.label}</div>
            <div className="lb2-mission-modal-sub">{missionPopup.sub}</div>
            <div className="lb2-mission-modal-reward">
              <span className="amt">+{missionPopup.reward}</span>
              <span className="unit">CR</span>
            </div>
            <button className="lb2-mission-modal-cta" onClick={() => { playSelect(); dismissMissionPopup(); }} onMouseEnter={() => playCursor()}>
              COLLECT ▸
            </button>
          </div>
        </div>
      )}

      {/* Credit-warp coins — fly from the modal's reward row to the
          top-right CR badge. Rendered at the screen root so they ride
          over the title strip without being clipped. position: fixed
          + viewport coords means they're independent of any scroll. */}
      {flying && Array.from({ length: 12 }).map((_, i) => {
        const dx = flying.end.x - flying.start.x;
        const dy = flying.end.y - flying.start.y;
        // Slight per-coin jitter so the fleet doesn't look stamped.
        const jx = (Math.random() - 0.5) * 36;
        const jy = (Math.random() - 0.5) * 24;
        return (
          <span
            key={i}
            className="bp-coin-fly"
            aria-hidden="true"
            style={{
              top:  `${flying.start.y + jy}px`,
              left: `${flying.start.x + jx}px`,
              '--dx': `${dx - jx}px`,
              '--dy': `${dy - jy}px`,
              '--dur': `${520 + Math.random() * 280}ms`,
              animationDelay: `${i * 28}ms`,
            }}
          >
            ◉
          </span>
        );
      })}
    </div>
  );
}

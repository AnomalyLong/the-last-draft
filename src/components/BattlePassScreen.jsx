import React from 'react';
import '../styles/lobby.css';
import '../styles/battle-pass.css';
import { BottomNav } from './LobbyScreen.jsx';
import { playSelect, playCancel, playCursor } from '../sound/ui.js';

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
  onBack,
  onPlay,
  onCollection,
  onDraft,
  onAuction,
  onOptions,
}) {
  const [isPremium, setIsPremium] = React.useState(false);
  const [currentTier] = React.useState(8);

  const handleUpgrade = () => {
    playSelect();
    setIsPremium(true);
  };

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

        {/* Featured Premium Pass — cyber-cut hero card */}
        {!isPremium && (
          <section className="bp-section bp-featured-sec">
            <div className="bp-featured-wrap">
              <div className="bpf-sidebar" aria-hidden="true">
                <span className="bpf-sidebar-tab" />
              </div>
              <article className="bp-featured-card">
                <div className="bpf-border-ring" aria-hidden="true" />
                <div className="bpf-corner-line" aria-hidden="true" />
                <div className="bpf-version">v.PASS.S0.FOUNDER</div>

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
                        <li><span className="bpf-bullet">◆</span>Initial 50,000 Credits</li>
                        <li><span className="bpf-bullet">◆</span>New Missions</li>
                        <li><span className="bpf-bullet">◆</span>More Bonuses to Come</li>
                      </ul>
                    </div>

                    <div className="bpf-block bpf-block-rewards">
                      <div className="bpf-block-head">BUY TO RECEIVE</div>
                      <div className="bpf-rewards-row">
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: '#ff8c5a' }}>◈</span>
                            <span className="bpf-reward-tag">L</span>
                          </div>
                          <div className="bpf-reward-name">COMING SOON</div>
                        </div>
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: '#3ea6ff' }}>◆</span>
                            <span className="bpf-reward-tag">24h</span>
                          </div>
                          <div className="bpf-reward-name">XP BOOST<br />(COMING SOON)</div>
                        </div>
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: '#a855f7' }}>◐</span>
                            <span className="bpf-reward-tag">24h</span>
                          </div>
                          <div className="bpf-reward-name">CRED BOOST<br />(COMING SOON)</div>
                        </div>
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: '#19e6c4' }}>★</span>
                            <span className="bpf-reward-count">50,000</span>
                          </div>
                          <div className="bpf-reward-name">CREDITS</div>
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
                      onClick={() => { playSelect(); }}
                      onMouseEnter={() => playCursor()}
                      data-testid="bp-cta-basic"
                    >
                      <span className="bpf-cta-corner bpf-cta-corner-tl" />
                      <span className="bpf-cta-corner bpf-cta-corner-br" />
                      <span className="bpf-cta-label">$6.99 BASIC PASS</span>
                    </button>
                    <button
                      className="bpf-cta bpf-cta-buy"
                      onClick={handleUpgrade}
                      onMouseEnter={() => playCursor()}
                      data-testid="bp-cta-premium"
                    >
                      <span className="bpf-cta-corner bpf-cta-corner-tl" />
                      <span className="bpf-cta-corner bpf-cta-corner-br" />
                      <span className="bpf-cta-label">$29.99 PREMIUM PASS</span>
                    </button>
                  </div>
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

        {/* Challenges — locked during early access */}
        <section className="bp-section bp-challenges bp-locked">
          <div className="bps-head">
            <span className="bpsh-mark">⚡</span>
            <span className="bpsh-title">DAILY CHALLENGES</span>
            <span className="bpsh-sub">+50 XP EACH</span>
          </div>
          <div className="bp-locked-wrap">
            <div className="bp-challenges-list" aria-hidden="true">
              {[
                { name: 'Win 3 ranked matches', progress: 1 },
                { name: 'Score 50 points total', progress: 47 },
                { name: 'Make 10 steals', progress: 6 },
              ].map((challenge, i) => (
                <div key={i} className="bpcl-item">
                  <div className="bpcli-icon">✓</div>
                  <div className="bpcli-info">
                    <div className="bpclii-name">{challenge.name}</div>
                    <div className="bpclii-progress">
                      <div className="bpclip-bar">
                        <div className="bpclip-fill" style={{ width: `${challenge.progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="bpcli-reward">+50 XP</div>
                </div>
              ))}
            </div>
            <div className="bp-lock-overlay" data-testid="daily-challenges-lock">
              <span className="bp-lock-icon">🔒</span>
              <span className="bp-lock-title">LOCKED</span>
              <span className="bp-lock-sub">Battle Pass Daily Challenges are in development</span>
            </div>
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
    </div>
  );
}

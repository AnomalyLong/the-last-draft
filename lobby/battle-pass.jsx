/* global React */
/* Battle Pass — seasonal cosmetic rewards and progression */

const { useState: useStateBP, useEffect: useEffectBP } = React;

const FREE_REWARDS = [
  { tier: 1,  name: "STARTER VISOR",    rarity: 3, glyph: "◐", color: "#7dff5a" },
  { tier: 2,  name: "GRIP BAND",        rarity: 3, glyph: "◈", color: "#ffc94a" },
  { tier: 3,  name: "CARBON SNEAKS",    rarity: 4, glyph: "◆", color: "#a855f7" },
  { tier: 5,  name: "XP BOOST ×2",      rarity: 2, glyph: "↑", color: "#3ea6ff" },
  { tier: 7,  name: "BLAST GOGGLES",    rarity: 3, glyph: "◐", color: "#7dff5a" },
  { tier: 10, name: "CREDITS ×500",     rarity: 2, glyph: "◉", color: "#ffc94a" },
  { tier: 15, name: "ICE VISOR",        rarity: 4, glyph: "◐", color: "#3ea6ff" },
  { tier: 20, name: "PULSE CUFF",       rarity: 5, glyph: "◈", color: "#19e6c4" },
];

const PREMIUM_REWARDS = [
  { tier: 1,  name: "WARPLATE CROWN",   rarity: 5, glyph: "◐", color: "#ff2d6f" },
  { tier: 2,  name: "TITAN CUFF",       rarity: 5, glyph: "◈", color: "#ff7a3c" },
  { tier: 4,  name: "VOIDWALK SHOES",   rarity: 5, glyph: "◆", color: "#fb923c" },
  { tier: 6,  name: "ZANSHIN BAND",     rarity: 5, glyph: "◐", color: "#a855f7" },
  { tier: 8,  name: "GLACIER BOOSTERS", rarity: 5, glyph: "◆", color: "#3ea6ff" },
  { tier: 12, name: "PARRY GUARD",      rarity: 5, glyph: "◈", color: "#f472b6" },
  { tier: 16, name: "FROST CUFF",       rarity: 4, glyph: "◈", color: "#67e8f9" },
  { tier: 25, name: "BOOSTER HI-LO",    rarity: 5, glyph: "◆", color: "#22d3ee" },
];

function RewardTier({ reward, isPremium, isUnlocked, currentTier }) {
  const isActive = currentTier >= reward.tier;
  return (
    <div className={`bp-tier ${isActive ? "active" : ""} ${isPremium ? "premium" : "free"}`}
         style={{ "--reward-color": reward.color }}>
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
        <div className="bpp-fill" style={{ width: `${pct}%` }}></div>
      </div>
      <div className="bpp-meta">
        <span className="bppm-val">{current} / {max}</span>
        <span className="bppm-pct">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function BattlePassView({ onBack }) {
  const [isPremium, setIsPremium] = useStateBP(false);
  const [currentTier, setCurrentTier] = useStateBP(8);
  const [timeRemaining] = useStateBP("47 DAYS");

  const handleUpgrade = () => {
    setIsPremium(true);
  };

  const handleSkipTier = () => {
    if (currentTier < 50) {
      setCurrentTier(currentTier + 1);
    }
  };

  return (
    <div className="battle-pass">
      <div className="bp-topnav">
        <button className="bp-back" onClick={onBack}>
          <span className="bpb-glyph">◀</span>
          <span>SHOP</span>
        </button>

        <div className="bp-title">
          <span className="bpt-big">BATTLE PASS · SEASON 12</span>
          <span className="bpt-sub">{timeRemaining} REMAINING</span>
        </div>

        <div className="bp-season">
          <div className="bps-info">
            <span className="bpsi-lbl">TIER</span>
            <span className="bpsi-val">{currentTier} / 50</span>
          </div>
        </div>
      </div>

      <div className="bp-scroll">
        {/* Progress section */}
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

        {/* Featured Premium Pass — cyber-cut hero card */}
        {!isPremium && (
          <section className="bp-section bp-featured-sec">
            <div className="bp-featured-wrap">
              <div className="bpf-sidebar" aria-hidden="true">
                <span className="bpf-sidebar-tab"></span>
              </div>
              <article className="bp-featured-card">
                <div className="bpf-border-ring" aria-hidden="true"></div>
                <div className="bpf-corner-line" aria-hidden="true"></div>
                <div className="bpf-version">v.PASS.S12.PREMIUM</div>

                <div className="bpf-art" aria-hidden="true">
                  <div className="bpf-art-placeholder">
                    <div className="bpf-art-glyph">◆</div>
                    <div className="bpf-art-label">SEASON 12<br/>CHAMPION SKIN</div>
                  </div>
                </div>

                <div className="bpf-content">
                  <h2 className="bpf-title">
                    <span>PREMIUM PASS</span>
                    <span className="bpf-title-mark">!</span>
                  </h2>

                  <div className="bpf-blocks-row">
                    <div className="bpf-block bpf-block-perks">
                      <div className="bpf-block-head">PREMIUM PRIVILEGES</div>
                      <ul className="bpf-perks">
                        <li><span className="bpf-bullet">◆</span>Unlock weekly bonus rewards</li>
                        <li><span className="bpf-bullet">◆</span>+10% credits, hero XP and rubies on every match</li>
                        <li><span className="bpf-bullet">◆</span>Tier skip discount —30% across the season</li>
                        <li><span className="bpf-bullet">◆</span>Stamina cost reduced —30% in ranked queues</li>
                        <li><span className="bpf-bullet">◆</span>Access 25 exclusive ability skins and cosmetics</li>
                      </ul>
                    </div>

                    <div className="bpf-block bpf-block-rewards">
                      <div className="bpf-block-head">BUY TO RECEIVE</div>
                      <div className="bpf-rewards-row">
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: "#ff8c5a" }}>◈</span>
                            <span className="bpf-reward-tag">L</span>
                          </div>
                          <div className="bpf-reward-name">PASS CRATE</div>
                        </div>
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: "#3ea6ff" }}>◆</span>
                            <span className="bpf-reward-tag">24h</span>
                          </div>
                          <div className="bpf-reward-name">XP BOOST</div>
                        </div>
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: "#a855f7" }}>◐</span>
                            <span className="bpf-reward-tag">24h</span>
                          </div>
                          <div className="bpf-reward-name">CRED BOOST</div>
                        </div>
                        <div className="bpf-reward-item">
                          <div className="bpf-reward">
                            <span className="bpf-reward-glyph" style={{ color: "#19e6c4" }}>★</span>
                            <span className="bpf-reward-count">2400</span>
                          </div>
                          <div className="bpf-reward-name">CREDITS</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bpf-disclaimer">
                    <span className="bpf-disc-mark">⚠</span>
                    <span>Weekly, monthly and season passes can be used simultaneously</span>
                  </div>

                  <div className="bpf-cta-row">
                    <button className="bpf-cta bpf-cta-claim">
                      <span className="bpf-cta-corner bpf-cta-corner-tl"></span>
                      <span className="bpf-cta-corner bpf-cta-corner-br"></span>
                      <span className="bpf-cta-label">CLAIM FREE</span>
                    </button>
                    <button className="bpf-cta bpf-cta-buy" onClick={handleUpgrade}>
                      <span className="bpf-cta-corner bpf-cta-corner-tl"></span>
                      <span className="bpf-cta-corner bpf-cta-corner-br"></span>
                      <span className="bpf-cta-glyph">◉</span>
                      <span className="bpf-cta-label">980 CREDITS</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        )}

        {/* Tier display */}
        <section className="bp-section bp-tiers-sec">
          <div className="bps-head">
            <span className="bpsh-mark">🎁</span>
            <span className="bpsh-title">SEASON REWARDS</span>
            <span className="bpsh-sub">{isPremium ? "50 FREE + PREMIUM TRACK" : "25 FREE REWARDS"}</span>
          </div>

          <div className="bp-track-header">
            <span className="bpth-label">FREE TRACK</span>
            {isPremium && <span className="bpth-label premium">PREMIUM TRACK</span>}
          </div>

          <div className="bp-tiers-grid">
            {FREE_REWARDS.map((reward) => (
              <RewardTier
                key={`free-${reward.tier}`}
                reward={reward}
                isPremium={false}
                isUnlocked={currentTier >= reward.tier}
                currentTier={currentTier}
              />
            ))}
            {isPremium && PREMIUM_REWARDS.map((reward) => (
              <RewardTier
                key={`premium-${reward.tier}`}
                reward={reward}
                isPremium={true}
                isUnlocked={currentTier >= reward.tier}
                currentTier={currentTier}
              />
            ))}
          </div>
        </section>

        {/* Skip tier option */}
        {currentTier < 50 && (
          <section className="bp-section bp-skip-sec">
            <div className="bp-skip-card">
              <span className="bpsk-icon">⏭</span>
              <span className="bpsk-title">SKIP TO NEXT TIER</span>
              <span className="bpsk-price"><span className="coin">◉</span>100 CREDITS</span>
              <button className="bpsk-btn" onClick={handleSkipTier}>SKIP TIER</button>
            </div>
          </section>
        )}

        {/* Challenges */}
        <section className="bp-section bp-challenges">
          <div className="bps-head">
            <span className="bpsh-mark">⚡</span>
            <span className="bpsh-title">DAILY CHALLENGES</span>
            <span className="bpsh-sub">+50 XP EACH</span>
          </div>
          <div className="bp-challenges-list">
            {[
              { name: "Win 3 ranked matches", progress: 1 },
              { name: "Score 50 points total", progress: 47 },
              { name: "Make 10 steals", progress: 6 },
            ].map((challenge, i) => (
              <div key={i} className="bpcl-item">
                <div className="bpcli-icon">✓</div>
                <div className="bpcli-info">
                  <div className="bpclii-name">{challenge.name}</div>
                  <div className="bpclii-progress">
                    <div className="bpclip-bar">
                      <div className="bpclip-fill" style={{ width: `${challenge.progress}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="bpcli-reward">+50 XP</div>
              </div>
            ))}
          </div>
        </section>

        <div className="bp-footer-tag">
          <span>// SEASON ENDS IN 47 DAYS · PROGRESS DOES NOT CARRY OVER</span>
        </div>
      </div>
    </div>
  );
}

window.BattlePassView = BattlePassView;

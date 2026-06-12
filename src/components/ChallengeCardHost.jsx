import React from 'react';
import ChallengeCard from '../../lobby/challenge-card.jsx';
import '../../lobby/post.css';

// Bridges the server `post.getChallenge` payload to the presentational
// ChallengeCard (which lives in lobby/ and is also used by the dev-tools
// story with its own mock data). Two jobs:
//   1. Supply the CSS variables ChallengeCard's post.css relies on, WITHOUT
//      importing lobby/styles.css (that file has global `*`/`body` resets that
//      would bleed into the rest of the app).
//   2. Adapt the game-shaped roster (pos/spd/dex/... from buildRosterForUser)
//      into the card-shaped roster (position/tier/color/overall/stats/abilities).

// CSS vars copied from lobby/styles.css :root — only the ones post.css reads.
const CARD_VARS = {
  '--c-left': '#19e6c4',
  '--c-right': '#ff2d6f',
  '--c-ink': '#eaf6f3',
  '--c-ink-dim': 'rgba(234, 246, 243, 0.62)',
  '--f-head': '"Orbitron", "Chakra Petch", system-ui, sans-serif',
  '--f-jp': '"Noto Sans JP", "Rajdhani", system-ui, sans-serif',
  '--f-mono': '"JetBrains Mono", "Share Tech Mono", ui-monospace, monospace',
};

// rarity → display tier + accent color (matches challenge-card.jsx DEFAULT_ROSTER).
const RARITY = {
  ultra_rare: { tier: 'ultra rare', color: '#ffd97a' },
  super_rare: { tier: 'super rare', color: '#a78bfa' },
  rare:       { tier: 'rare',       color: '#19e6c4' },
  common:     { tier: 'common',     color: '#9fb2c8' },
};

function toCardRoster(roster = []) {
  return roster.map((p) => {
    const { tier, color } = RARITY[p.rarity] ?? RARITY.common;
    const abilities = [p.ability, ...(p.abilities ?? [])]
      .filter(Boolean)
      .map((a) => (typeof a === 'string' ? a : a.name))
      .filter(Boolean);
    return {
      position: p.pos,
      tier,
      color,
      name: p.name,
      overall: p.overall,
      stats: { spd: p.spd, dex: p.dex, jmp: p.jmp, acc: p.acc },
      abilities,
    };
  });
}

export default function ChallengeCardHost({ data, onChallenge }) {
  if (!data) return null;
  const roster = toCardRoster(data.roster);
  const owner = {
    user: data.owner,
    team: data.team,
    record: data.record ?? { wins: 0, losses: 0 },
  };
  const challenges = data.challenges ?? [];

  return (
    <div style={{ position: 'absolute', inset: 0, ...CARD_VARS }}>
      <ChallengeCard
        roster={roster}
        challenges={challenges}
        owner={owner}
        onChallenge={onChallenge}
      />
    </div>
  );
}

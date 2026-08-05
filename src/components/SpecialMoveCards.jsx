import React from 'react';
import { JERSEY_HOME, JERSEY_AWAY } from '../constants.js';
import { SpecialMoveCard } from './SpecialMoveCard.jsx';
import {
  DASH_FRAMES, FADEAWAY_FRAMES, SPIN_MOVE_FRAMES, PICKPOCKET_FRAMES,
  IRON_BLOCK_FRAMES, PICK_FRAMES, DUNKSPIN_FRAMES,
} from '../sprites/index.js';

// ── SPECIAL_MOVE_CARDS ───────────────────────────────────────────────────────
// The full set of comic-panel cards the sim can raise, in render order (later
// entries paint on top). Lifted verbatim out of GameScene, where all seven were
// inline JSX — the inline splash needs the same set, and a second copy of this
// table is exactly how the two would drift (see teamPalette.js / abilityRoll.js
// for the same move).
//
// `flag` is the per-player boolean useGame sets while the animation runs; the
// card lives exactly as long as that flag does. Six of the seven are unlocked by
// an ability (IRON BLOCK / PICK POCKET / ANKLE BREAKER / SPEEDY / SHARPSHOOTER /
// DUNK MASTER); SET PICK is the exception — it is not ability-gated at all, it
// fires when the called play is 'pickroll'.
export const SPECIAL_MOVE_CARDS = [
  { key: 'ib',   flag: 'isIronBlocking',  label: 'IRON BLOCK!',  frames: IRON_BLOCK_FRAMES, frameDurationMs: 80,  accentColor: '#CC3333', bgColor: '#FFD0D0', anchorX: 6,  anchorY: 17 },
  { key: 'pp',   flag: 'isPickPocketing', label: 'PICK POCKET!', frames: PICKPOCKET_FRAMES, frameDurationMs: 133, accentColor: '#00FF44', bgColor: '#C8FFD8', anchorX: 9,  anchorY: 17 },
  { key: 'spin', flag: 'isSpinning',      label: 'SPIN MOVE!',   frames: SPIN_MOVE_FRAMES,  frameDurationMs: 80,  accentColor: '#F5C800', bgColor: '#F5E6C8', anchorX: 21, anchorY: 28 },
  { key: 'dash', flag: 'isDashing',       label: 'SPEED BURST!', frames: DASH_FRAMES,       frameDurationMs: 60,  accentColor: '#44AAFF', bgColor: '#C8E8FF', anchorX: 9,  anchorY: 17 },
  { key: 'fade', flag: 'isFadingAway',    label: 'FADEAWAY!',    frames: FADEAWAY_FRAMES,   frameDurationMs: 80,  accentColor: '#FF8C00', bgColor: '#FFF0CC', anchorX: 9,  anchorY: 12 },
  { key: 'pick', flag: 'isPicking',       label: 'SET PICK!',    frames: PICK_FRAMES,       frameDurationMs: 80,  accentColor: '#C060E0', bgColor: '#E8D0FF', anchorX: 5,  anchorY: 8 },
  { key: 'sd',   flag: 'isSpinDunking',   label: 'SPIN DUNK!',   frames: DUNKSPIN_FRAMES,   frameDurationMs: 130, accentColor: '#FF3399', bgColor: '#FFD6E8', anchorX: 8,  anchorY: 14, spriteScale: 3 },
];

/**
 * Renders whichever special-move cards are currently active.
 *
 * cameraX — how far to push the card back into screen space. GameScene shifts its
 *   viewBox by cameraX, so it passes cameraX to cancel that out. SplashCourt
 *   instead translates the field by -cameraX inside a fixed viewBox, so it
 *   renders this OUTSIDE the field group and passes 0 (the default). Passing
 *   cameraX there would double-apply the pan and slide the card off screen.
 * cy — card centre; defaults to the in-game HUD-band position.
 * withTestIds — attach data-testid="special-card-<key>" to each card.
 */
export function SpecialMoveCards({ players, cameraX = 0, cy, withTestIds = false }) {
  return (
    <>
      {SPECIAL_MOVE_CARDS.map((spec) => {
        const p = players?.find((pl) => pl[spec.flag]);
        if (!p) return null;
        return (
          <SpecialMoveCard
            key={`${spec.key}-${p.id}`}
            testId={withTestIds ? `special-card-${spec.key}` : undefined}
            player={p}
            frames={spec.frames}
            label={spec.label}
            jerseyColor={p.team === 'home' ? JERSEY_HOME : JERSEY_AWAY}
            cameraX={cameraX}
            cy={cy}
            frameDurationMs={spec.frameDurationMs}
            accentColor={spec.accentColor}
            bgColor={spec.bgColor}
            anchorX={spec.anchorX}
            anchorY={spec.anchorY}
            spriteScale={spec.spriteScale}
          />
        );
      })}
    </>
  );
}

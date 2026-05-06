import React from 'react';
import { JERSEY_HOME } from '../constants.js';
import { SPIN_MOVE_FRAMES } from '../sprites/index.js';
import { SpecialMoveCard } from './SpecialMoveCard.jsx';

export function SpinMoveCard({ player, jerseyColor = JERSEY_HOME, cameraX = 0 }) {
  return (
    <SpecialMoveCard
      player={player}
      frames={SPIN_MOVE_FRAMES}
      label="SPIN MOVE!"
      jerseyColor={jerseyColor}
      cameraX={cameraX}
      frameDurationMs={80}
      accentColor="#F5C800"
      bgColor="#F5E6C8"
      anchorX={21}
      anchorY={28}
    />
  );
}

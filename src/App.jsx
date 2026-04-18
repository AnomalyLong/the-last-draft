import React from 'react';
import { W, TOTAL_H, BOT_BAR, ZOOM_W, JERSEY_HOME, JERSEY_AWAY } from './constants.js';
import { Court, Ball, ShotBall, Player, HUD } from './components/index.js';
import { useGame } from './useGame.js';

export default function App() {
  const { players, shot, logs, handleCommand, cameraX, homeScore, awayScore, quarter, time } = useGame();

  return (
    <div data-testid="game-root" style={{ background: '#111', lineHeight: 0, height: '100vh' }}>
      <svg
        data-testid="game-court"
        width="100%"
        height="100%"
        viewBox={`${cameraX} 0 ${ZOOM_W} ${TOTAL_H}`}
        style={{ imageRendering: 'pixelated', display: 'block' }}
      >
        <defs>
          <clipPath id="left-arc-clip">
            <rect x={30} y={96} width={310} height={240} />
          </clipPath>
          <clipPath id="right-arc-clip">
            <rect x={340} y={96} width={310} height={240} />
          </clipPath>
        </defs>

        <rect x={0} y={0} width={W} height={TOTAL_H} fill="#111" />
        <Court />
        <rect x={0} y={336} width={W} height={BOT_BAR} fill="#111" />

        {players.map((p) => {
          const flipH = p.facingRight;
          const labelColor = p.team === 'home' ? '#1a4fa0' : '#c02020';
          const jerseyColor = p.team === 'home' ? JERSEY_HOME : JERSEY_AWAY;
          return (
            <g key={p.id}
              data-testid={`player-${p.id}`}
              data-team={p.team}
              data-role={p.role}
              data-has-ball={p.hasBall}
              data-is-moving={p.isMoving}
            >
              {flipH
                ? <g transform={`scale(-1,1) translate(${-p.cx * 2}, 0)`}>
                    <Player cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
                      hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} facingRight={p.facingRight} />
                  </g>
                : <Player cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
                    hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} facingRight={p.facingRight} />
              }
              {p.hasBall && <Ball data-testid="dribble-ball" cx={p.cx - 10} cy={p.cy + 1} scale={1} />}
              <text data-testid={`player-${p.id}-role`} x={p.cx} y={p.cy - 14} textAnchor="middle" fontSize={6}
                fontFamily="monospace" fill={labelColor} fontWeight="bold">
                {p.role}
              </text>
            </g>
          );
        })}

        {shot && <ShotBall data-testid="shot-ball" shot={shot} scale={1} />}

        <g transform={`translate(${cameraX}, 0)`}>
          <HUD
            homeScore={homeScore}
            awayScore={awayScore}
            quarter={quarter}
            time={time}
            logs={logs}
            onCommand={handleCommand}
            players={players}
          />
        </g>
      </svg>
    </div>
  );
}

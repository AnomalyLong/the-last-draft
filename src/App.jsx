import React from 'react';
import { W, TOTAL_H, BOT_BAR, ZOOM_W, JERSEY_HOME, JERSEY_AWAY } from './constants.js';
import { Court, Ball, ShotBall, Player, HUD, Shadow, PowerBar, ScorePopup, CRTOverlay, TitleScreen, TeamSelect, DraftScreen, LevelUpOverlay } from './components/index.js';
import { useGame } from './useGame.js';
import OPPONENTS from './opponents.json';

export default function App() {
  const [scene, setScene] = React.useState('title'); // 'title' | 'teamSelect' | 'draft' | 'game'
  const [homeTeamName, setHomeTeamName] = React.useState('HOME');
  const [homeRoster, setHomeRoster] = React.useState([]);
  const [awayTeam] = React.useState(
    () => OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)]
  );

  const { players, shot, logs, handleCommand, cameraX, possession, homeScore, awayScore, quarter, time, scorePopup, levelUpState, onPickLevelUp } = useGame();

  const viewX = scene === 'game' ? cameraX : 0;

  return (
    <div data-testid="game-root" style={{ background: '#111', lineHeight: 0, height: '100vh' }}>
      <svg
        data-testid="game-court"
        width="100%"
        height="100%"
        viewBox={`${viewX} 0 ${ZOOM_W} ${TOTAL_H}`}
        style={{ imageRendering: 'pixelated', display: 'block' }}
      >
        {/* ── TITLE SCREEN ─────────────────────────────────── */}
        {scene === 'title' && (
          <TitleScreen
            onPlay={() => setScene('teamSelect')}
            onOptions={() => {}}
            onCollections={() => {}}
          />
        )}

        {/* ── TEAM SELECT ──────────────────────────────────── */}
        {scene === 'teamSelect' && (
          <TeamSelect
            onStart={(name) => { setHomeTeamName(name); setScene('draft'); }}
            onBack={() => setScene('title')}
          />
        )}

        {/* ── DRAFT ────────────────────────────────────────── */}
        {scene === 'draft' && (
          <DraftScreen
            homeTeamName={homeTeamName}
            onStart={(r) => { setHomeRoster(r); setScene('game'); }}
            onBack={() => setScene('teamSelect')}
          />
        )}

        {/* ── GAME ─────────────────────────────────────────── */}
        {scene === 'game' && (
          <>
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
                <React.Fragment key={p.id}>
                  <Shadow cx={p.cx} cy={p.cy} hasBall={p.hasBall} />
                  {p.isShooting && <PowerBar cx={p.cx} cy={p.cy} team={p.team} />}
                  <g
                    data-testid={`player-${p.id}`}
                    data-team={p.team}
                    data-role={p.role}
                    data-has-ball={p.hasBall}
                    data-is-moving={p.isMoving}
                  >
                    {flipH
                      ? <g transform={`scale(-1,1) translate(${-p.cx * 2}, 0)`}>
                          <Player cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
                            hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} isDunking={p.isDunking} isBlocking={p.isBlocking} facingRight={p.facingRight} />
                        </g>
                      : <Player cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
                          hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} isDunking={p.isDunking} isBlocking={p.isBlocking} facingRight={p.facingRight} />
                    }
                    {p.hasBall && !p.isDunking && <Ball data-testid="dribble-ball"
                      cx={p.isMoving
                        ? (p.facingRight ? p.cx + 10 : p.cx - 10)
                        : (p.facingRight ? p.cx - 6 : p.cx + 6)}
                      cy={p.cy + 1} scale={1} />}
                    <text data-testid={`player-${p.id}-role`} x={p.cx} y={p.cy - 14} textAnchor="middle" fontSize={6}
                      fontFamily="monospace" fill={labelColor} fontWeight="bold">
                      {p.role}
                    </text>
                  </g>
                </React.Fragment>
              );
            })}

            {shot && <ShotBall data-testid="shot-ball" shot={shot} scale={1} />}
            {scorePopup && <ScorePopup text={scorePopup} cameraX={cameraX} />}

            <g transform={`translate(${cameraX}, 0)`}>
              <HUD
                homeScore={homeScore}
                awayScore={awayScore}
                homeTeamName={homeTeamName}
                quarter={quarter}
                time={time}
                logs={logs}
                onCommand={handleCommand}
                players={players}
                possession={possession}
                homeRoster={homeRoster}
                awayRoster={awayTeam.players}
                awayTeamName={awayTeam.name}
              />
            </g>
          </>
        )}

        {/* ── LEVEL UP ─────────────────────────────────── */}
        {scene === 'game' && levelUpState && (
          <LevelUpOverlay
            player={levelUpState.player}
            abilities={levelUpState.abilities}
            cameraX={cameraX}
            onPick={onPickLevelUp}
          />
        )}

        <CRTOverlay cameraX={viewX} />
      </svg>
    </div>
  );
}

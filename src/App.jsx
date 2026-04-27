import React from 'react';
import { W, TOTAL_H, BOT_BAR, ZOOM_W, JERSEY_HOME, JERSEY_AWAY } from './constants.js';
import { requestExpandedMode, getWebViewMode } from '@devvit/web/client';

// Safe wrappers — devvit globals aren't present outside the Reddit app
function getMode() {
  try { return getWebViewMode(); } catch { return 'expanded'; }
}
function tryExpand(nativeEvent) {
  try { requestExpandedMode(nativeEvent, 'game'); } catch {}
}

import { Court, Ball, ShotBall, Player, HUD, Shadow, PowerBar, ScorePopup, XpFlyup, TitleScreen, TeamSelect, DraftScreen, LevelUpOverlay, BballTip, QuarterBanner, LoadingScreen } from './components/index.js';
import { titleMusic } from './sound/basketball.js';
import { useGame } from './useGame.js';
import OPPONENTS from './opponents.json';

// BballTip layout for game screen (screen-space, inside cameraX group)
const GAME_TIP_CHAR_X  = 10;
const GAME_TIP_CHAR_Y  = 96;
const GAME_TIP_SCALE   = 0.30;
const GAME_TIP_CHAR_W  = Math.round(150 * GAME_TIP_SCALE); // 45
const GAME_TIP_DLG_X   = GAME_TIP_CHAR_X + 22;
const GAME_TIP_DLG_W   = ZOOM_W - GAME_TIP_DLG_X - 4;
const GAME_TIP_DLG_Y   = GAME_TIP_CHAR_Y + 13;
const GAME_TIP_DLG_H   = 19;
const GAME_TIP_TEXT_X  = GAME_TIP_CHAR_X + GAME_TIP_CHAR_W + 6;
const GAME_TIP_TEXT_Y  = GAME_TIP_DLG_Y + Math.floor((GAME_TIP_DLG_H - 7) / 2);

export default function App() {
  const isInline = React.useMemo(() => getMode() === 'inline', []);
  const [scene, setScene] = React.useState('loading'); // 'loading' | 'title' | 'teamSelect' | 'draft' | 'game'

  React.useEffect(() => {
    if (scene === 'title' || scene === 'teamSelect' || scene === 'draft') {
      titleMusic.start();
    } else {
      titleMusic.stop();
    }
  }, [scene]);
  const [gameTip, setGameTip] = React.useState(null);
  const [homeTeamName, setHomeTeamName] = React.useState('HOME');
  const [homeRoster, setHomeRoster] = React.useState([]);
  const [awayTeam] = React.useState(
    () => OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)]
  );

  const { players, shot, logs, handleCommand, cameraX, possession, homeScore, awayScore, quarter, time, scorePopup, levelUpState, onPickLevelUp, quarterAnnouncement, playerAlpha, xpFlyup } = useGame({ homeRoster, awayRoster: awayTeam.players });

  const viewX = scene === 'game' ? cameraX : 0;

  return (
    <div data-testid="game-root"
      style={{ background: '#111', lineHeight: 0, height: '100vh', position: 'relative', cursor: isInline ? 'pointer' : undefined }}
      onClick={isInline ? (e) => tryExpand(e.nativeEvent) : undefined}
    >
      <svg
        data-testid="game-court"
        width="100%"
        height="100%"
        viewBox={`${viewX} 0 ${ZOOM_W} ${TOTAL_H}`}
        style={{ imageRendering: 'pixelated', display: 'block' }}
      >
        {/* ── INLINE PREVIEW (Reddit feed) ─────────────────── */}
        {isInline && (
          <TitleScreen onPlay={() => {}} onOptions={() => {}} onCollections={() => {}} />
        )}

        {/* ── LOADING SCREEN ───────────────────────────────── */}
        {!isInline && scene === 'loading' && (
          <LoadingScreen onDone={() => setScene('title')} />
        )}

        {/* ── TITLE SCREEN ─────────────────────────────────── */}
        {!isInline && scene === 'title' && (
          <TitleScreen
            onPlay={() => setScene('teamSelect')}
            onOptions={() => {}}
            onCollections={() => {}}
          />
        )}

        {/* ── TEAM SELECT ──────────────────────────────────── */}
        {!isInline && scene === 'teamSelect' && (
          <TeamSelect
            onStart={(name) => { setHomeTeamName(name); setScene('draft'); }}
            onBack={() => setScene('title')}
          />
        )}

        {/* ── DRAFT ────────────────────────────────────────── */}
        {!isInline && scene === 'draft' && (
          <DraftScreen
            homeTeamName={homeTeamName}
            onStart={(r) => { setHomeRoster(r); setGameTip("Welcome to your first game!"); setScene('game'); }}
            onBack={() => setScene('teamSelect')}
          />
        )}

        {/* ── GAME ─────────────────────────────────────────── */}
        {!isInline && scene === 'game' && (
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

            <g opacity={playerAlpha}>
            {[...players].sort((a, b) => a.cy - b.cy).map((p) => {
              const flipH = p.facingRight;
              const labelColor = p.team === 'home' ? '#1a4fa0' : '#c02020';
              const jerseyColor = p.team === 'home' ? JERSEY_HOME : JERSEY_AWAY;
              return (
                <React.Fragment key={p.id}>
                  <Shadow cx={p.cx} cy={p.cy} hasBall={p.hasBall} />
                  {(p.isShooting || p.isJumpBall || p.isChargingJump) && <PowerBar cx={p.cx} cy={p.cy} team={p.team} />}
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
                            hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} isDunking={p.isDunking} isBlocking={p.isBlocking} isJumpBall={p.isJumpBall} facingRight={p.facingRight} />
                        </g>
                      : <Player cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
                          hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} isDunking={p.isDunking} isBlocking={p.isBlocking} isJumpBall={p.isJumpBall} facingRight={p.facingRight} />
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
            </g>
            {scorePopup && <ScorePopup text={scorePopup} cameraX={cameraX} />}
            {xpFlyup && <XpFlyup key={xpFlyup.id} fromCx={xpFlyup.fromCx} fromCy={xpFlyup.fromCy} toCx={xpFlyup.toCx} toCy={xpFlyup.toCy} amount={xpFlyup.amount} />}

            <g transform={`translate(${cameraX}, 0)`}>
              {gameTip && (
                <BballTip
                  text={gameTip}
                  charX={GAME_TIP_CHAR_X} charY={GAME_TIP_CHAR_Y} scale={GAME_TIP_SCALE}
                  dlgX={GAME_TIP_DLG_X} dlgY={GAME_TIP_DLG_Y} dlgW={GAME_TIP_DLG_W} dlgH={GAME_TIP_DLG_H}
                  textX={GAME_TIP_TEXT_X} textY={GAME_TIP_TEXT_Y}
                  onClick={() => { handleCommand('testGamePlay'); setGameTip(null); }}
                />
              )}
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

        {/* ── QUARTER BANNER ───────────────────────────── */}
        {!isInline && scene === 'game' && (
          <QuarterBanner text={quarterAnnouncement} cameraX={cameraX} />
        )}

        {/* ── LEVEL UP ─────────────────────────────────── */}
        {!isInline && scene === 'game' && levelUpState && (
          <LevelUpOverlay
            player={levelUpState.player}
            abilities={levelUpState.abilities}
            cameraX={cameraX}
            onPick={onPickLevelUp}
          />
        )}

      </svg>
      {/* CRT scanlines — full window coverage */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(0,0,0,0.16) 1px, rgba(0,0,0,0.16) 2px)',
      }} />
      {/* CRT vignette — full window coverage */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11,
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)',
      }} />
    </div>
  );
}

import React from 'react';
import { W, TOTAL_H, TOP_BAR, BOT_BAR, ZOOM_W, JERSEY_HOME, JERSEY_AWAY } from './constants.js';
import { requestExpandedMode, getWebViewMode } from '@devvit/web/client';

// Safe wrappers — devvit globals aren't present outside the Reddit app
function getMode() {
  try { return getWebViewMode(); } catch { return 'expanded'; }
}
function tryExpand(nativeEvent) {
  try { requestExpandedMode(nativeEvent, 'game'); } catch {}
}

import { Court, Ball, ShotBall, Player, HUD, PlayerPortrait, LP_X, LP_W, RP_X, RP_W, Shadow, PowerBar, ScorePopup, XpFlyup, StealFlyup, BlockFlyup, TitleScreen, TeamSelect, DraftScreen, LevelUpOverlay, BballTip, QuarterBanner, LoadingScreen, QuarterSummary, PlayPickerOverlay, OptionsScreen, OptionsOverlay, SpinMoveCard, SpecialMoveCard } from './components/index.js';
import { DASH_FRAMES } from './sprites/index.js';
import { titleMusic, bgMusic, bounceBall } from './sound/basketball.js';
import { audioSettings } from './sound/audioSettings.js';
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
  const [scene, setScene] = React.useState('loading'); // 'loading' | 'title' | 'options' | 'teamSelect' | 'draft' | 'game'
  const [musicVol, setMusicVol] = React.useState(1.0);
  const [sfxVol, setSfxVol] = React.useState(1.0);
  // CRT: stored 0-1; scanlines CSS opacity = value*0.35, vignette CSS opacity = value*0.80
  const [scanlines, setScanlines] = React.useState(0.5);   // 0.5 → 0.175 ≈ original 0.16
  const [vignette,  setVignette]  = React.useState(0.75);  // 0.75 → 0.60 = original 0.60
  const [showInGameOptions, setShowInGameOptions] = React.useState(false);

  React.useEffect(() => {
    if (scene === 'title' || scene === 'options' || scene === 'teamSelect' || scene === 'draft') {
      titleMusic.start();
    } else {
      titleMusic.stop();
    }
  }, [scene]);

  const handleMusicVol = (v) => {
    audioSettings.music = v;
    titleMusic.applyVolume();
    bgMusic.applyVolume();
    setMusicVol(v);
  };
  const handleSfxVol = (v) => {
    audioSettings.sfx = v;
    bounceBall.applyVolume();
    setSfxVol(v);
  };

  const [gameTip, setGameTip] = React.useState(null);
  const [homeTeamName, setHomeTeamName] = React.useState('HOME');
  const [homeRoster, setHomeRoster] = React.useState([]);
  const [awayTeam] = React.useState(
    () => OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)]
  );

  const { players, shot, logs, handleCommand, cameraX, possession, homeScore, awayScore, quarter, time, scorePopup, levelUpState, onPickLevelUp, playPickState, onPickPlay, quarterAnnouncement, playerAlpha, xpFlyup, stealFlyup, blockFlyup, quarterSummary, onDismissQuarterSummary } = useGame({ homeRoster, awayRoster: awayTeam.players });

  const viewX = scene === 'game' ? cameraX : 0;

  // Portrait panel data (game scene only)
  const POS_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];
  const carrier     = players.find(p => p.hasBall) ?? players[0];
  const homeCurrent = carrier.team === 'home' ? carrier : (players.find(p => p.team === 'home' && p.role === carrier.role) ?? players[0]);
  const awayCurrent = carrier.team === 'away' ? carrier : (players.find(p => p.team === 'away' && p.role === homeCurrent.role) ?? players[5]);
  const homePortEntry = homeRoster[POS_ORDER.indexOf(homeCurrent.role)] ?? null;
  const awayPortEntry = awayTeam.players[POS_ORDER.indexOf(awayCurrent.role)] ?? null;
  const homeHasBall = carrier.team === 'home';
  // Panel height tracks the game's rendered TOP_BAR height (game fills screen height on landscape)
  const panelH = `min(${(TOP_BAR / TOTAL_H * 100 * 0.8).toFixed(2)}vh, ${(TOP_BAR / ZOOM_W * 100 * 0.8).toFixed(2)}vw)`;

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
            onOptions={() => setScene('options')}
            onCollections={() => {}}
          />
        )}

        {/* ── OPTIONS ──────────────────────────────────────── */}
        {!isInline && scene === 'options' && (
          <OptionsScreen
            musicVol={musicVol}
            sfxVol={sfxVol}
            onMusicVol={handleMusicVol}
            onSfxVol={handleSfxVol}
            scanlines={scanlines}
            vignette={vignette}
            onScanlines={setScanlines}
            onVignette={setVignette}
            onBack={() => setScene('title')}
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
                            hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} isDunking={p.isDunking} isBlocking={p.isBlocking} isJumpBall={p.isJumpBall} isStealing={p.isStealing} isSpinning={p.isSpinning} isDashing={p.isDashing} facingRight={p.facingRight} />
                        </g>
                      : <Player cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
                          hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting} isDunking={p.isDunking} isBlocking={p.isBlocking} isJumpBall={p.isJumpBall} isStealing={p.isStealing} isSpinning={p.isSpinning} isDashing={p.isDashing} facingRight={p.facingRight} />
                    }
                    {p.hasBall && !p.isDunking && !p.isStealing && !p.isSpinning && !p.isDashing && <Ball data-testid="dribble-ball"
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
            {stealFlyup && <StealFlyup key={stealFlyup.id} fromCx={stealFlyup.fromCx} fromCy={stealFlyup.fromCy} toCx={stealFlyup.toCx} toCy={stealFlyup.toCy} color={stealFlyup.color} />}
            {blockFlyup && <BlockFlyup key={blockFlyup.id} fromCx={blockFlyup.fromCx} fromCy={blockFlyup.fromCy} toCx={blockFlyup.toCx} toCy={blockFlyup.toCy} color={blockFlyup.color} />}
            {(() => { const sp = players.find(p => p.isSpinning); return sp ? <SpinMoveCard key={sp.id} player={sp} jerseyColor={sp.team === 'home' ? JERSEY_HOME : JERSEY_AWAY} cameraX={cameraX} /> : null; })()}
            {(() => { const dp = players.find(p => p.isDashing); return dp ? <SpecialMoveCard key={`dash-${dp.id}`} player={dp} frames={DASH_FRAMES} label="SPEED BURST!" jerseyColor={dp.team === 'home' ? JERSEY_HOME : JERSEY_AWAY} cameraX={cameraX} frameDurationMs={60} accentColor="#44AAFF" bgColor="#C8E8FF" anchorX={9} anchorY={17} /> : null; })()}

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
                awayTeamName={awayTeam.name}
                homeRoster={homeRoster}
                awayRoster={awayTeam.players}
                onOptions={() => setShowInGameOptions(true)}
              />
            </g>
          </>
        )}

        {/* ── QUARTER BANNER ───────────────────────────── */}
        {!isInline && scene === 'game' && (
          <QuarterBanner text={quarterAnnouncement} cameraX={cameraX} />
        )}

        {/* ── PLAY PICKER ──────────────────────────────── */}
        {!isInline && scene === 'game' && playPickState && (
          <PlayPickerOverlay
            cameraX={cameraX}
            onPick={onPickPlay}
          />
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

        {/* ── QUARTER SUMMARY ──────────────────────────── */}
        {!isInline && scene === 'game' && quarterSummary && (
          <QuarterSummary
            quarterSummary={quarterSummary}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeam.name}
            cameraX={cameraX}
            onDismiss={onDismissQuarterSummary}
          />
        )}

        {/* ── IN-GAME OPTIONS ──────────────────────────── */}
        {!isInline && showInGameOptions && (
          <OptionsOverlay
            musicVol={musicVol}
            sfxVol={sfxVol}
            onMusicVol={handleMusicVol}
            onSfxVol={handleSfxVol}
            scanlines={scanlines}
            vignette={vignette}
            onScanlines={setScanlines}
            onVignette={setVignette}
            onClose={() => setShowInGameOptions(false)}
            cameraX={cameraX}
          />
        )}

      </svg>
      {/* Player portrait overlays — pinned to screen corners, outside the letterboxed game SVG */}
      {!isInline && scene === 'game' && (<>
        <svg style={{ position:'absolute', top:0, left:0, height:panelH, width:'auto', pointerEvents:'none', zIndex:5, imageRendering:'pixelated' }}
          viewBox={`${LP_X} 0 ${LP_W} ${TOP_BAR}`}>
          <PlayerPortrait player={homeCurrent} rosterEntry={homePortEntry} side="left"
            jerseyColor={JERSEY_HOME} hasBall={homeHasBall} />
        </svg>
        <svg style={{ position:'absolute', top:0, right:0, height:panelH, width:'auto', pointerEvents:'none', zIndex:5, imageRendering:'pixelated' }}
          viewBox={`${RP_X} 0 ${RP_W} ${TOP_BAR}`}>
          <PlayerPortrait player={awayCurrent} rosterEntry={awayPortEntry} side="right"
            jerseyColor={JERSEY_AWAY} hasBall={!homeHasBall} />
        </svg>
      </>)}
      {/* CRT scanlines — full window coverage */}
      {scanlines > 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(0,0,0,${(scanlines * 0.35).toFixed(3)}) 1px, rgba(0,0,0,${(scanlines * 0.35).toFixed(3)}) 2px)`,
        }} />
      )}
      {/* CRT vignette — full window coverage */}
      {vignette > 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11,
          background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(vignette * 0.80).toFixed(3)}) 100%)`,
        }} />
      )}
    </div>
  );
}

import React from 'react';
import {
  W, TOTAL_H, TOP_BAR, BOT_BAR, ZOOM_W,
  JERSEY_HOME, JERSEY_AWAY,
} from '../constants.js';
import { Court } from './Court.jsx';
import { Ball } from './Ball.jsx';
import { ShotBall } from './ShotBall.jsx';
import { SpecialPassBall } from './SpecialPassBall.jsx';
import { Player } from './Player.jsx';
import { HUD, DebugConsole, PlayerPortrait, LP_X, LP_W, RP_X, RP_W } from './HUD.jsx';
import { Shadow } from './Shadow.jsx';
import { PowerBar } from './PowerBar.jsx';
import { ScorePopup } from './ScorePopup.jsx';
import { XpFlyup } from './XpFlyup.jsx';
import { StealFlyup } from './StealFlyup.jsx';
import { BlockFlyup } from './BlockFlyup.jsx';
import { LevelUpOverlay } from './LevelUpOverlay.jsx';
import { QuarterBanner } from './QuarterBanner.jsx';
import { QuarterSummary } from './QuarterSummary.jsx';
import { GameOverScreen } from './GameOverScreen.jsx';
import { PlayPickerOverlay } from './PlayPickerOverlay.jsx';
import { OptionsOverlay } from './OptionsOverlay.jsx';
import { SpecialMoveCard } from './SpecialMoveCard.jsx';
import { BballTip } from './BballTip.jsx';
import { DASH_FRAMES, FADEAWAY_FRAMES, SPIN_MOVE_FRAMES, PICKPOCKET_FRAMES, IRON_BLOCK_FRAMES } from '../sprites/index.js';

// BballTip layout constants (game-screen space, inside cameraX group)
const TIP_CHAR_X = 10;
const TIP_CHAR_Y = 96;
const TIP_SCALE  = 0.30;
const TIP_CHAR_W = Math.round(150 * TIP_SCALE); // 45
const TIP_DLG_X  = TIP_CHAR_X + 22;
const TIP_DLG_W  = ZOOM_W - TIP_DLG_X - 4;
const TIP_DLG_Y  = TIP_CHAR_Y + 13;
const TIP_DLG_H  = 19;
const TIP_TEXT_X = TIP_CHAR_X + TIP_CHAR_W + 6;
const TIP_TEXT_Y = TIP_DLG_Y + Math.floor((TIP_DLG_H - 7) / 2);

const POS_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];

/**
 * GameScene — the full in-game rendering layer.
 *
 * Renders a position:relative container holding:
 *   - the main game SVG (court, players, HUD, overlays)
 *   - portrait panel SVGs pinned to the top corners
 *
 * containerStyle / containerProps let callers control sizing and data-testid.
 * The inner SVG is always width="100%" height="100%" so the container drives size.
 */
export function GameScene({
  // Container sizing / identity
  containerStyle,
  containerProps,
  svgProps,
  setViewportW,

  // from useGame
  players, shot, logs, handleCommand, cameraX,
  possession, homeScore, awayScore, quarter, time,
  scorePopup, levelUpState, onPickLevelUp,
  playPickState, onPickPlay,
  quarterAnnouncement, playerAlpha,
  xpFlyup, stealFlyup, blockFlyup,
  quarterSummary, onDismissQuarterSummary,
  gameOver, onDismissGameOver,
  totalCredits,

  // Team / roster info
  homeTeamName, awayTeamName,
  homeRoster, awayRoster,

  // Game tip (mascot dialogue on game start)
  gameTip, onDismissGameTip,

  // In-game options overlay state (managed by caller so audio controls work)
  showOptions, onShowOptions,
  musicVol, sfxVol, onMusicVol, onSfxVol,
  scanlines, vignette, onScanlines, onVignette,
}) {
  const [showDebug, setShowDebug] = React.useState(false);
  const [showTeams, setShowTeams] = React.useState(false);

  // Derive portrait subjects
  const carrier      = players.find(p => p.hasBall) ?? players[0];
  const homeCurrent  = carrier.team === 'home'
    ? carrier
    : (players.find(p => p.team === 'home' && p.role === carrier.role) ?? players[0]);
  const awayCurrent  = carrier.team === 'away'
    ? carrier
    : (players.find(p => p.team === 'away' && p.role === homeCurrent.role) ?? players[5]);
  const homePortEntry = homeRoster[POS_ORDER.indexOf(homeCurrent.role)] ?? null;
  const awayPortEntry = awayRoster[POS_ORDER.indexOf(awayCurrent.role)] ?? null;
  const homeHasBall   = carrier.team === 'home';

  const anyOverlay = !!(levelUpState || quarterSummary || gameOver || showOptions || showTeams || playPickState || gameTip);

  // Measure the container to compute pixel-accurate panel height and viewBox extension.
  // CSS cqw/cqh resolve against the browser viewport in some contexts (devtools phone frame),
  // so we use JS instead.
  const containerRef = React.useRef(null);
  const [extraViewH, setExtraViewH] = React.useState(0);
  const [mobileZoom, setMobileZoom] = React.useState(1);
  const [panelH, setPanelH] = React.useState('0px');
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const zoom = width < height ? 1.25 : 1;
      setMobileZoom(zoom);
      setViewportW?.(Math.round(ZOOM_W / zoom));
      const scale = (width * zoom) / ZOOM_W;
      const widthConstrained = (width / ZOOM_W) <= (height / TOTAL_H);
      setPanelH(`${Math.round(TOP_BAR * (width / ZOOM_W) * (widthConstrained ? 1.0 : 0.62))}px`);
      // Extend viewBox down to fill ~65% of leftover vertical space (in zoomed SVG units)
      const naturalH = TOTAL_H / zoom * scale; // = TOTAL_H * width / ZOOM_W (zoom cancels)
      setExtraViewH(naturalH < height ? Math.round((height - naturalH) * 0.65 / scale) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setViewportW]);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...containerStyle }} {...containerProps}>
      <svg
        width="100%"
        height="100%"
        viewBox={`${cameraX} 0 ${ZOOM_W / mobileZoom} ${TOTAL_H / mobileZoom + extraViewH}`}
        preserveAspectRatio="xMidYMin meet"
        style={{ imageRendering: 'pixelated', display: 'block' }}
        {...svgProps}
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
        <rect x={0} y={0} width={W} height={TOP_BAR} fill="#111" />
        <rect x={0} y={336} width={W} height={BOT_BAR} fill="#111" />

        <g opacity={playerAlpha}>
          {[...players].sort((a, b) => a.cy - b.cy).map((p) => {
            const flipH       = p.facingRight;
            const labelColor  = p.team === 'home' ? '#1a4fa0' : '#c02020';
            const jerseyColor = p.team === 'home' ? JERSEY_HOME : JERSEY_AWAY;
            return (
              <React.Fragment key={p.id}>
                <Shadow cx={p.cx} cy={p.cy} hasBall={p.hasBall} />
                {(p.isShooting || p.isJumpBall || p.isChargingJump) &&
                  <PowerBar cx={p.cx} cy={p.cy} team={p.team} />}
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
                          hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting}
                          isDunking={p.isDunking} isBlocking={p.isBlocking} isIronBlocking={p.isIronBlocking} isJumpBall={p.isJumpBall}
                          isStealing={p.isStealing} isPickPocketing={p.isPickPocketing} isSpinning={p.isSpinning} isDashing={p.isDashing}
                          isFadingAway={p.isFadingAway} facingRight={p.facingRight} />
                      </g>
                    : <Player cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
                        hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting}
                        isDunking={p.isDunking} isBlocking={p.isBlocking} isIronBlocking={p.isIronBlocking} isJumpBall={p.isJumpBall}
                        isStealing={p.isStealing} isPickPocketing={p.isPickPocketing} isSpinning={p.isSpinning} isDashing={p.isDashing}
                        isFadingAway={p.isFadingAway} facingRight={p.facingRight} />
                  }
                  {p.hasBall && !p.isDunking && !p.isStealing && !p.isPickPocketing && !p.isSpinning && !p.isDashing && !p.isFadingAway &&
                    <Ball data-testid="dribble-ball"
                      cx={p.isMoving
                        ? (p.facingRight ? p.cx + 10 : p.cx - 10)
                        : (p.facingRight ? p.cx - 6 : p.cx + 6)}
                      cy={p.cy + 1} scale={1} />}
                  <text data-testid={`player-${p.id}-role`}
                    x={p.cx} y={p.cy - 14} textAnchor="middle"
                    fontSize={6} fontFamily="monospace" fill={labelColor} fontWeight="bold">
                    {p.role}
                  </text>
                </g>
              </React.Fragment>
            );
          })}

          {shot && (shot.isSpecialPass
            ? <SpecialPassBall data-testid="shot-ball" shot={shot} scale={1} />
            : <ShotBall data-testid="shot-ball" shot={shot} scale={1} />
          )}
        </g>

        {scorePopup && <ScorePopup text={scorePopup} cameraX={cameraX} />}
        {xpFlyup    && <XpFlyup    key={xpFlyup.id}    fromCx={xpFlyup.fromCx}    fromCy={xpFlyup.fromCy}    toCx={xpFlyup.toCx}    toCy={xpFlyup.toCy}    amount={xpFlyup.amount} />}
        {stealFlyup && <StealFlyup key={stealFlyup.id}  fromCx={stealFlyup.fromCx} fromCy={stealFlyup.fromCy} toCx={stealFlyup.toCx} toCy={stealFlyup.toCy} color={stealFlyup.color} />}
        {blockFlyup && <BlockFlyup key={blockFlyup.id}  fromCx={blockFlyup.fromCx} fromCy={blockFlyup.fromCy} toCx={blockFlyup.toCx} toCy={blockFlyup.toCy} color={blockFlyup.color} />}

        {(() => { const ib = players.find(p => p.isIronBlocking); return ib ? <SpecialMoveCard key={`ib-${ib.id}`} player={ib} frames={IRON_BLOCK_FRAMES} label="IRON BLOCK!" jerseyColor={ib.team === 'home' ? JERSEY_HOME : JERSEY_AWAY} cameraX={cameraX} frameDurationMs={80} accentColor="#CC3333" bgColor="#FFD0D0" anchorX={6} anchorY={17} /> : null; })()}
        {(() => { const pp = players.find(p => p.isPickPocketing); return pp ? <SpecialMoveCard key={`pp-${pp.id}`} player={pp} frames={PICKPOCKET_FRAMES} label="PICK POCKET!" jerseyColor={pp.team === 'home' ? JERSEY_HOME : JERSEY_AWAY} cameraX={cameraX} frameDurationMs={107} accentColor="#00FF44" bgColor="#C8FFD8" anchorX={9} anchorY={17} /> : null; })()}
        {(() => { const sp = players.find(p => p.isSpinning);   return sp ? <SpecialMoveCard key={`spin-${sp.id}`}  player={sp} frames={SPIN_MOVE_FRAMES} label="SPIN MOVE!"   jerseyColor={sp.team === 'home' ? JERSEY_HOME : JERSEY_AWAY} cameraX={cameraX} frameDurationMs={80} accentColor="#F5C800" bgColor="#F5E6C8" anchorX={21} anchorY={28} /> : null; })()}
        {(() => { const dp = players.find(p => p.isDashing);    return dp ? <SpecialMoveCard key={`dash-${dp.id}`}  player={dp} frames={DASH_FRAMES}      label="SPEED BURST!" jerseyColor={dp.team === 'home' ? JERSEY_HOME : JERSEY_AWAY} cameraX={cameraX} frameDurationMs={60} accentColor="#44AAFF" bgColor="#C8E8FF" anchorX={9}  anchorY={17} /> : null; })()}
        {(() => { const fp = players.find(p => p.isFadingAway); return fp ? <SpecialMoveCard key={`fade-${fp.id}`} player={fp} frames={FADEAWAY_FRAMES}  label="FADEAWAY!"    jerseyColor={fp.team === 'home' ? JERSEY_HOME : JERSEY_AWAY} cameraX={cameraX} frameDurationMs={80} accentColor="#FF8C00" bgColor="#FFF0CC" anchorX={9}  anchorY={12} /> : null; })()}

        <g transform={`translate(${cameraX}, 0)`}>
          {gameTip && (
            <BballTip
              text={gameTip}
              charX={TIP_CHAR_X} charY={TIP_CHAR_Y} scale={TIP_SCALE}
              dlgX={TIP_DLG_X} dlgY={TIP_DLG_Y} dlgW={TIP_DLG_W} dlgH={TIP_DLG_H}
              textX={TIP_TEXT_X} textY={TIP_TEXT_Y}
              onClick={onDismissGameTip}
            />
          )}
          <HUD
            homeScore={homeScore} awayScore={awayScore}
            homeTeamName={homeTeamName} awayTeamName={awayTeamName}
            quarter={quarter} time={time}
            players={players} possession={possession}
            homeRoster={homeRoster} awayRoster={awayRoster}
            onOptions={onShowOptions}
            showTeams={showTeams} onShowTeams={setShowTeams}
            showDebug={showDebug} totalCredits={totalCredits}
          />
        </g>

        <QuarterBanner text={quarterAnnouncement} cameraX={cameraX} />

        {playPickState && <PlayPickerOverlay cameraX={cameraX} onPick={onPickPlay} />}

        {levelUpState && (
          <LevelUpOverlay
            player={levelUpState.player}
            abilities={levelUpState.abilities}
            cameraX={cameraX}
            onPick={onPickLevelUp}
          />
        )}

        {quarterSummary && (
          <QuarterSummary
            quarterSummary={quarterSummary}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            cameraX={cameraX}
            onDismiss={onDismissQuarterSummary}
          />
        )}

        {gameOver && (
          <GameOverScreen
            gameOver={gameOver}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            cameraX={cameraX}
            onDismiss={onDismissGameOver}
          />
        )}

        {showOptions && (
          <OptionsOverlay
            musicVol={musicVol}   sfxVol={sfxVol}
            onMusicVol={onMusicVol} onSfxVol={onSfxVol}
            scanlines={scanlines} vignette={vignette}
            onScanlines={onScanlines} onVignette={onVignette}
            onClose={() => onShowOptions(false)}
            cameraX={cameraX}
          />
        )}
      </svg>

      {/* Debug console — always on top */}
      <DebugConsole logs={logs} onCommand={handleCommand} showDebug={showDebug} onToggleDebug={() => setShowDebug(d => !d)} />

      {/* Portrait panels — hidden when any overlay is active */}
      {!anyOverlay && (<>
        <svg style={{ position: 'absolute', top: 0, left: 0, height: panelH, width: 'auto', pointerEvents: 'none', zIndex: 5, imageRendering: 'pixelated' }}
          viewBox={`${LP_X} 0 ${LP_W} ${TOP_BAR}`}>
          <PlayerPortrait player={homeCurrent} rosterEntry={homePortEntry} side="left"
            jerseyColor={JERSEY_HOME} hasBall={homeHasBall} />
        </svg>
        <svg style={{ position: 'absolute', top: 0, right: 0, height: panelH, width: 'auto', pointerEvents: 'none', zIndex: 5, imageRendering: 'pixelated' }}
          viewBox={`${RP_X} 0 ${RP_W} ${TOP_BAR}`}>
          <PlayerPortrait player={awayCurrent} rosterEntry={awayPortEntry} side="right"
            jerseyColor={JERSEY_AWAY} hasBall={!homeHasBall} />
        </svg>
      </>)}
    </div>
  );
}

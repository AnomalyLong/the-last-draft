import React from 'react';
import { ZOOM_W, TOTAL_H } from './constants.js';
import { requestExpandedMode, getWebViewMode } from '@devvit/web/client';

// Safe wrappers — devvit globals aren't present outside the Reddit app
function getMode() {
  try { return getWebViewMode(); } catch { return 'expanded'; }
}
function tryExpand(nativeEvent) {
  try { requestExpandedMode(nativeEvent, 'game'); } catch {}
}

import { TitleScreen, TeamSelect, DraftScreen, LoadingScreen, OptionsScreen, GameScene, CollectionScreen } from './components/index.js';
import { titleMusic, bgMusic, bounceBall } from './sound/basketball.js';
import { audioSettings } from './sound/audioSettings.js';
import { useGame } from './useGame.js';
import OPPONENTS from './opponents.json';

export default function App() {
  const isInline = React.useMemo(() => getMode() === 'inline', []);
  const [scene, setScene] = React.useState('loading'); // 'loading' | 'title' | 'options' | 'teamSelect' | 'draft' | 'game' | 'collection'
  const [musicVol, setMusicVol] = React.useState(1.0);
  const [sfxVol, setSfxVol] = React.useState(1.0);
  // CRT: stored 0-1; scanlines CSS opacity = value*0.35, vignette CSS opacity = value*0.80
  const [scanlines, setScanlines] = React.useState(0.5);   // 0.5 → 0.175 ≈ original 0.16
  const [vignette,  setVignette]  = React.useState(0.75);  // 0.75 → 0.60 = original 0.60
  const [showInGameOptions, setShowInGameOptions] = React.useState(false);

  React.useEffect(() => {
    if (scene === 'title' || scene === 'options' || scene === 'teamSelect' || scene === 'draft' || scene === 'collection') {
      bgMusic.stop();
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

  const gameState = useGame({ homeRoster, awayRoster: awayTeam.players });

  const withAbilities = (roster, baseId) =>
    roster.map((r, i) => {
      const extras = gameState.abilityOverridesRef.current.get(baseId + i) ?? [];
      const abilities = [r.ability, ...extras].filter(Boolean);
      return { ...r, abilities };
    });
  const homeRosterFull = withAbilities(homeRoster, 1);
  const awayRosterFull = withAbilities(awayTeam.players, 6);

  return (
    <div data-testid="game-root"
      style={{ background: '#111', lineHeight: 0, height: '100vh', position: 'relative', cursor: isInline ? 'pointer' : undefined }}
      onClick={isInline ? (e) => tryExpand(e.nativeEvent) : undefined}
    >
      {/* ── NON-GAME SCENES ──────────────────────────────────── */}
      {(isInline || scene !== 'game') && (
        <svg
          data-testid="game-court"
          width="100%"
          height="100%"
          viewBox={`0 0 ${ZOOM_W} ${TOTAL_H}`}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        >
          {isInline && (
            <TitleScreen onPlay={() => {}} onOptions={() => {}} onCollections={() => {}} />
          )}
          {!isInline && scene === 'loading' && (
            <LoadingScreen onDone={() => setScene('title')} />
          )}
          {!isInline && scene === 'title' && (
            <TitleScreen
              onPlay={() => setScene('teamSelect')}
              onOptions={() => setScene('options')}
              onCollections={() => setScene('collection')}
            />
          )}
          {!isInline && scene === 'options' && (
            <OptionsScreen
              musicVol={musicVol}   sfxVol={sfxVol}
              onMusicVol={handleMusicVol} onSfxVol={handleSfxVol}
              scanlines={scanlines} vignette={vignette}
              onScanlines={setScanlines} onVignette={setVignette}
              onBack={() => setScene('title')}
            />
          )}
          {!isInline && scene === 'teamSelect' && (
            <TeamSelect
              onStart={(name) => { setHomeTeamName(name); setScene('draft'); }}
              onBack={() => setScene('title')}
            />
          )}
          {!isInline && scene === 'collection' && (
            <CollectionScreen
              roster={homeRoster}
              onBack={() => setScene('title')}
            />
          )}
          {!isInline && scene === 'draft' && (
            <DraftScreen
              homeTeamName={homeTeamName}
              onStart={(r) => { setHomeRoster(r); setGameTip("Welcome to your first game!"); setScene('game'); }}
              onBack={() => setScene('teamSelect')}
              onMenu={(r) => { setHomeRoster(r); setScene('title'); }}
            />
          )}
        </svg>
      )}

      {/* ── GAME SCENE ───────────────────────────────────────── */}
      {!isInline && scene === 'game' && (
        <GameScene
          containerStyle={{ position: 'absolute', inset: 0 }}
          svgProps={{ 'data-testid': 'game-court' }}
          setViewportW={gameState.setViewportW}
          {...gameState}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeam.name}
          homeRoster={homeRosterFull}
          awayRoster={awayRosterFull}
          gameTip={gameTip}
          onDismissGameTip={() => { gameState.handleCommand('testGamePlay'); setGameTip(null); }}
          onDismissGameOver={() => setScene('title')}
          showOptions={showInGameOptions}
          onShowOptions={setShowInGameOptions}
          musicVol={musicVol}     sfxVol={sfxVol}
          onMusicVol={handleMusicVol} onSfxVol={handleSfxVol}
          scanlines={scanlines}   vignette={vignette}
          onScanlines={setScanlines} onVignette={setVignette}
        />
      )}

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

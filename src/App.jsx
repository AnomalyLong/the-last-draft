import React from 'react';
import { ZOOM_W, TOTAL_H } from './constants.js';
import { requestExpandedMode, getWebViewMode, context as devvitContext } from '@devvit/web/client';

// Safe wrappers — devvit globals aren't present outside the Reddit app
function getMode() {
  try { return getWebViewMode(); } catch { return 'expanded'; }
}
function tryExpand(nativeEvent) {
  try { requestExpandedMode(nativeEvent, 'game'); } catch {}
}

import { TitleScreen, DraftScreen, DraftHubScreen, LoadingScreen, OptionsScreen, GameScene, CollectionScreenNew, DebugConsole, AdminOverlay, MatchmakingScreen, LobbyScreen, FtueIntroVideo } from './components/index.js';
import TeamSetupView from '../lobby/team-setup.jsx';
import '../lobby/team-setup.css';
import '../lobby/mobile-team-setup.css';
import { titleMusic, bgMusic, bounceBall } from './sound/basketball.js';
import { audioSettings } from './sound/audioSettings.js';
import { useGame } from './useGame.js';
import OPPONENTS from './opponents.json';
import { trpc } from './trpc';

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
    if (scene === 'title' || scene === 'options' || scene === 'teamSelect' || scene === 'draft' || scene === 'draftHub' || scene === 'collection' || scene === 'matchmaking') {
      bgMusic.stop();
      bounceBall.stop();
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

  const [username] = React.useState(() => {
    try { return devvitContext?.username ?? ''; } catch { return ''; }
  });
  const [serverCredits, setServerCredits] = React.useState(0);
  const [freeDrafts,    setFreeDrafts]    = React.useState(0);

  const refreshUser = React.useCallback(() => {
    return trpc.user.init.query().then((user) => {
      setServerCredits(user.credits);
      setFreeDrafts(user.freeDrafts ?? 0);
      if (user.teamName) setHomeTeamName(user.teamName);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    trpc.user.init.query().then((user) => {
      setServerCredits(user.credits);
      setFreeDrafts(user.freeDrafts ?? 0);
      setIsFtue(user.gamesPlayed === 0);
      if (user.teamName) setHomeTeamName(user.teamName);
    }).catch(() => {});

    // Load saved roster + lineup so returning players can skip the draft
    Promise.all([trpc.user.roster.query(), trpc.user.lineup.query()])
      .then(([roster, lineup]) => {
        if (!roster?.length) return;
        setRawRoster(roster);
        setRawLineup(lineup ?? {});
        const byId = new Map(roster.map(p => [p.id, p]));
        const ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];
        const built = ORDER.map(pos => {
          const pid = lineup?.[pos];
          if (!pid) return null;
          const p = byId.get(Number(pid));
          if (!p) return null;
          const sb = p.statBonuses ?? {};
          return {
            pos, name: p.name,
            spd: (p.spd ?? 60) + (sb.spd ?? 0),
            dex: (p.dex ?? 60) + (sb.dex ?? 0),
            jmp: (p.jmp ?? 60) + (sb.jmp ?? 0),
            acc: (p.acc ?? 60) + (sb.acc ?? 0),
            rarity: p.rarity, ability: p.ability,
            abilities: p.abilities ?? [],
            level: p.level ?? 1, xp: p.xp ?? 0,
            serverId: p.id,
          };
        }).filter(Boolean);
        if (built.length === 5) setHomeRoster(built);
      })
      .catch(() => {});
  }, []);

  const [titleLogs, setTitleLogs] = React.useState([]);
  const [showTitleDebug, setShowTitleDebug] = React.useState(false);
  const [showAdminOverlay, setShowAdminOverlay] = React.useState(false);

  const handleMatchmakingReady = () => {
    trpc.game.start.mutate()
      .then(result => {
        if (result?.gameId) {
          gameSessionRef.current = { gameId: result.gameId, token: result.token, seq: 0 };
        }
      })
      .catch(() => {});
    gameState.handleCommand('testGamePlay');
    setScene('game');
  };

  const handleTitleCommand = (cmd) => {
    const trimmed = cmd.trim();
    if (trimmed === 'admin') {
      trpc.admin.isAdmin.query()
        .then(result => {
          if (result.isAdmin) setShowAdminOverlay(true);
        })
        .catch(() => {});
    }
  };

  const [gameTip, setGameTip] = React.useState(null);
  const [homeTeamName, setHomeTeamName] = React.useState('HOME');
  const [homeRoster, setHomeRoster] = React.useState([]);
  const [rawRoster, setRawRoster]   = React.useState([]);
  const [rawLineup, setRawLineup]   = React.useState({});
  const [isFtue, setIsFtue] = React.useState(true); // true until persisted completion flag is received
  const [ftueIntroSeen, setFtueIntroSeen] = React.useState(false);

  // Refresh user data (credits, picks, team name) whenever we land on the
  // draft hub or the lobby — values may have changed since page load.
  React.useEffect(() => {
    if (scene === 'draftHub' || scene === 'title') refreshUser();
  }, [scene, refreshUser]);
  const [awayTeam] = React.useState(
    () => OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)]
  );

  const gameSessionRef = React.useRef(null); // { gameId, token, seq }
  const clientScoreRef = React.useRef(0);    // tracks only post-session-ready makes

  const onPlayEvent = (play) => {
    const session = gameSessionRef.current;
    if (!session) return; // session not ready yet — skip recording and counting
    if (play.type === 'shoot' && play.result === 'made' && play.points) {
      clientScoreRef.current += play.points;
    } else if (play.type === 'dunk') {
      clientScoreRef.current += 2;
    }
    const seq = session.seq++;
    trpc.game.recordPlay.mutate({ gameId: session.gameId, token: session.token, sequence: seq, play }).catch(() => {});
  };

  const gameState = useGame({ homeRoster, awayRoster: awayTeam.players, isFtue, onPlayEvent });

  const withLevelUpBonuses = (roster, baseId) =>
    roster.map((r, i) => {
      const id = baseId + i;
      const extras = gameState.abilityOverridesRef.current.get(id) ?? [];
      const abilities = [r.ability, ...(r.abilities ?? []), ...extras].filter(Boolean);
      const bonus = gameState.statBonuses.get(id) ?? {};
      const progress = gameState.playerProgressRef.current.get(id);
      return {
        ...r,
        abilities,
        spd: (r.spd ?? 0) + (bonus.spd ?? 0),
        dex: (r.dex ?? 0) + (bonus.dex ?? 0),
        jmp: (r.jmp ?? 0) + (bonus.jmp ?? 0),
        acc: (r.acc ?? 0) + (bonus.acc ?? 0),
        level: progress?.level ?? r.level ?? 1,
        xp: progress?.xp ?? r.xp ?? 0,
        xpMax: progress?.xpMax ?? r.xpMax,
      };
    });
  const homeRosterFull = withLevelUpBonuses(homeRoster, 1);
  const awayRosterFull = withLevelUpBonuses(awayTeam.players, 6);

  return (
    <div data-testid="game-root"
      style={{ background: '#111', lineHeight: 0, height: '100vh', position: 'relative', cursor: isInline ? 'pointer' : undefined }}
      onClick={isInline ? (e) => tryExpand(e.nativeEvent) : undefined}
    >
      {/* ── LOBBY SCREEN (HTML layer — replaces SVG title scene) ── */}
      {!isInline && scene === 'title' && (
        <LobbyScreen
          username={username}
          credits={serverCredits}
          homeRoster={homeRoster}
          isFtue={isFtue}
          onPlay={(mode) => {
            // Kick audio context inside the user-gesture so subsequent
            // scene-driven music starts cleanly on mobile (iOS Safari needs
            // play() invoked from a direct gesture handler).
            titleMusic.start();
            const hasTeam = homeTeamName && homeTeamName !== 'HOME';
            if (isFtue && !ftueIntroSeen) {
              setScene('ftueIntro');
            } else if (!isFtue && homeRoster.length === 5) {
              setScene('matchmaking');
            } else if (isFtue && homeRoster.length === 0) {
              setScene(hasTeam ? 'draft' : 'teamSelect');
            } else {
              setScene('draftHub');
            }
          }}
          onCollection={() => setScene('collection')}
          onDraft={() => {
            if (isFtue && !ftueIntroSeen) setScene('ftueIntro');
            else setScene('draftHub');
          }}
          onAuction={() => {}}
          onOptions={() => setScene('options')}
        />
      )}

      {!isInline && scene === 'collection' && (
        <CollectionScreenNew
          roster={rawRoster}
          lineup={rawLineup}
          username={username}
          credits={serverCredits}
          onBack={() => setScene('title')}
        />
      )}

      {!isInline && scene === 'draft' && (
        <DraftScreen
          homeTeamName={homeTeamName}
          isFtue={isFtue}
          onStart={(r) => {
            setHomeRoster(r);
            // Always refresh — the 5 mints just decremented the server-side
            // freeDrafts counter and we want the client to reflect that.
            refreshUser();
            // FTUE: jump straight into the first game with a tip.
            // Post-FTUE: return to the hub so the user sees their updated pick count.
            if (isFtue) {
              setGameTip("Welcome to your first game!");
              setScene('game');
            } else {
              setScene('draftHub');
            }
          }}
          onBack={() => setScene('teamSelect')}
          onMenu={(r) => { setHomeRoster(r); refreshUser(); setScene('title'); }}
        />
      )}

      {!isInline && scene === 'ftueIntro' && (
        <FtueIntroVideo
          onDone={() => {
            setFtueIntroSeen(true);
            const hasTeam = homeTeamName && homeTeamName !== 'HOME';
            if (homeRoster.length === 0) {
              setScene(hasTeam ? 'draft' : 'teamSelect');
            } else {
              setScene('draftHub');
            }
          }}
        />
      )}

      {!isInline && scene === 'teamSelect' && (
        <TeamSetupView
          initialName={homeTeamName === 'HOME' ? '' : homeTeamName}
          onBack={() => setScene(homeRoster.length ? 'draftHub' : 'title')}
          onContinue={({ name }) => {
            setHomeTeamName(name);
            trpc.user.setTeamName.mutate({ teamName: name }).catch(() => {});
            setScene('draft');
          }}
        />
      )}

      {!isInline && scene === 'draftHub' && (
        <DraftHubScreen
          freeDrafts={freeDrafts}
          credits={serverCredits}
          rosterCount={homeRoster.length}
          onUsePick={() => {
            // Skip team-name setup if the user has already named their team
            const hasTeam = homeTeamName && homeTeamName !== 'HOME';
            setScene(hasTeam ? 'draft' : 'teamSelect');
          }}
          onBack={() => setScene('title')}
        />
      )}

      {/* ── NON-GAME SCENES (SVG — excludes title + collection + draft + teamSelect + draftHub) ── */}
      {(isInline || (scene !== 'game' && scene !== 'title' && scene !== 'collection' && scene !== 'draft' && scene !== 'teamSelect' && scene !== 'draftHub' && scene !== 'matchmaking')) && (
        <svg
          data-testid="game-court"
          width="100%"
          height="100%"
          viewBox={`0 0 ${ZOOM_W} ${TOTAL_H}`}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        >
          {isInline && (
            <TitleScreen onPlay={() => {}} onOptions={() => {}} onCollections={() => {}} username={username} credits={serverCredits} />
          )}
          {!isInline && scene === 'loading' && (
            <LoadingScreen onDone={() => setScene('title')} />
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
        </svg>
      )}

      {/* ── MATCHMAKING (HTML overlay — full-bleed div, not SVG) ── */}
      {!isInline && scene === 'matchmaking' && (
        <MatchmakingScreen
          homeRoster={homeRoster}
          homeTeamName={(homeTeamName && homeTeamName !== 'HOME') ? homeTeamName : (username ? `u/${username}` : 'YOU')}
          awayTeam={awayTeam}
          onReady={handleMatchmakingReady}
        />
      )}

      {/* ── TITLE/MENU DEBUG CONSOLE ─────────────────────────── */}
      {!isInline && scene !== 'game' && (
        <DebugConsole
          logs={titleLogs}
          onCommand={handleTitleCommand}
          showDebug={showTitleDebug}
          onToggleDebug={() => setShowTitleDebug(d => !d)}
        />
      )}

      {/* ── GAME SCENE ───────────────────────────────────────── */}
      {!isInline && scene === 'game' && (
        <GameScene
          containerStyle={{ position: 'absolute', inset: 0 }}
          svgProps={{ 'data-testid': 'game-court' }}
          setViewportW={gameState.setViewportW}
          {...gameState}
          onPickLevelUp={(ability) => {
            const p = gameState.levelUpState?.player;
            if (p?.team === 'home' && ability) {
              const serverId = homeRoster[p.id - 1]?.serverId;
              if (serverId) {
                trpc.player.progress.mutate({ playerId: serverId, level: p.level, xp: p.xp, addAbility: ability }).catch(() => {});
              }
            }
            gameState.onPickLevelUp(ability);
          }}
          onDismissStatUpgrade={() => {
            const p = gameState.levelUpState?.player;
            const statGained = gameState.levelUpState?.statGained;
            if (p?.team === 'home' && statGained) {
              const serverId = homeRoster[p.id - 1]?.serverId;
              if (serverId) {
                trpc.player.progress.mutate({ playerId: serverId, level: p.level, xp: p.xp, statDelta: statGained }).catch(() => {});
              }
            }
            gameState.onDismissStatUpgrade();
          }}
          username={username}
          serverCredits={serverCredits}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeam.name}
          homeRoster={homeRosterFull}
          awayRoster={awayRosterFull}
          gameTip={gameTip}
          onDismissGameTip={() => {
            trpc.game.start.mutate().then((result) => {
              if (result && 'gameId' in result) {
                gameSessionRef.current = { gameId: result.gameId, token: result.token, seq: 0 };
              }
            }).catch(() => {});
            gameState.handleCommand('testGamePlay');
            setGameTip(null);
          }}
          onDismissGameOver={() => {
            const session = gameSessionRef.current;
            if (session) {
              const score = clientScoreRef.current;
              trpc.game.end.mutate({ gameId: session.gameId, token: session.token, score })
                .then(summary => { setServerCredits(c => c + summary.creditsEarned); })
                .catch(() => {});
              setIsFtue(false);
              gameSessionRef.current = null;
              clientScoreRef.current = 0;
            }
            // Save each home player's progress earned this game
            homeRoster.forEach((r, i) => {
              if (!r.serverId) return;
              const gameId = i + 1;
              const progress = gameState.playerProgressRef.current.get(gameId);
              if (!progress) return;
              const statDelta = gameState.statBonusRef.current.get(gameId);
              const addAbilities = gameState.abilityOverridesRef.current.get(gameId) ?? [];
              trpc.player.progress.mutate({
                playerId: r.serverId,
                level: progress.level,
                xp: progress.xp,
                ...(addAbilities.length ? { addAbilities } : {}),
                ...(statDelta ? { statDelta } : {}),
              }).catch(() => {});
            });
            setScene('title');
          }}
          showOptions={showInGameOptions}
          onShowOptions={setShowInGameOptions}
          musicVol={musicVol}     sfxVol={sfxVol}
          onMusicVol={handleMusicVol} onSfxVol={handleSfxVol}
          scanlines={scanlines}   vignette={vignette}
          onScanlines={setScanlines} onVignette={setVignette}
        />
      )}

      {/* ── ADMIN OVERLAY ────────────────────────────────────── */}
      {showAdminOverlay && <AdminOverlay onClose={() => setShowAdminOverlay(false)} />}

      {/* Debug: FTUE indicator */}
      {isFtue && (
        <div style={{
          position: 'absolute', bottom: 6, right: 6, zIndex: 20,
          background: 'rgba(0,0,0,0.75)', color: '#00ff88',
          fontFamily: 'monospace', fontSize: 10, padding: '2px 5px',
          borderRadius: 2, pointerEvents: 'none', letterSpacing: 1,
        }}>FTUE: ON</div>
      )}

      {/* CRT scanlines — full window coverage */}
      {scanlines > 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 90,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 1px, rgba(0,0,0,${(scanlines * 0.35).toFixed(3)}) 1px, rgba(0,0,0,${(scanlines * 0.35).toFixed(3)}) 2px)`,
        }} />
      )}
      {/* CRT vignette — full window coverage */}
      {vignette > 0 && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 91,
          background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(vignette * 0.80).toFixed(3)}) 100%)`,
        }} />
      )}
    </div>
  );
}

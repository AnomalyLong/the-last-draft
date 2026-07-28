import React from 'react';
import { ZOOM_W, TOTAL_H } from './constants.js';
import { requestExpandedMode, getWebViewMode, navigateTo as devvitNavigateTo, context as devvitContext } from '@devvit/web/client';

// Safe wrappers — devvit globals aren't present outside the Reddit app
function getMode() {
  try { return getWebViewMode(); } catch { return 'expanded'; }
}
function tryExpand(nativeEvent) {
  try { requestExpandedMode(nativeEvent, 'game'); } catch {}
}

// Map a challenge post's roster (game-shape from buildRosterForUser, serverId
// already stripped server-side) into the away-team shape useGame consumes —
// same fields as an opponents.json entry, plus the team's abilities so the
// challenge roster plays with its real kit.
function toAwayPlayers(roster = []) {
  return roster.map((p) => ({
    pos: p.pos,
    name: p.name,
    spd: p.spd, dex: p.dex, jmp: p.jmp, acc: p.acc,
    ovr: p.overall,
    rarity: p.rarity,
    ability: p.ability ?? null,
    abilities: p.abilities ?? [],
    palette: p.palette ?? 0,
  }));
}

import { TitleScreen, SplashScreen, DraftScreen, DraftHubScreen, LoadingScreen, OptionsScreen, GameScene, CollectionScreen, DebugConsole, AdminOverlay, MatchmakingScreen, LobbyScreen, FeaturedEventsScreen, BattlePassScreen, FtueIntroVideo } from './components/index.js';
import { TitleStrip } from './components/TitleStrip.jsx';

// Column wrapper that pins the global TitleStrip (lobby header) above a
// full-screen scene. The wrapped screens use `position: absolute; inset: 0`
// roots, so the inner relative container confines them below the strip.
function ScreenWithStrip({ credits, onEvents, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, display: 'flex', flexDirection: 'column' }}>
      <TitleStrip credits={credits} onEvents={onEvents} />
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}
import ChallengeCardHost from './components/ChallengeCardHost.jsx';
import TeamSetupView from '../lobby/team-setup.jsx';
import '../lobby/team-setup.css';
import '../lobby/mobile-team-setup.css';
import { titleMusic, bgMusic, bounceBall } from './sound/basketball.js';
import { audioSettings } from './sound/audioSettings.js';
import { useGame } from './useGame.js';
import OPPONENTS from './opponents.json';
import { trpc } from './trpc';
import { runCommand } from './debugCommands.js';
import { SKIN_PALETTES } from './constants.js';

// Deterministic palette index for non-persisted opponents — same name always
// renders the same look. Hash uses the same FNV-ish loop as elsewhere.
function paletteFromName(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h) % SKIN_PALETTES.length;
}
// Assigns a deterministic palette to each player in an opponents-style roster
// (opponents.json bots or challenge teams). Skips entries that already have one.
function withDerivedPalette(players = []) {
  return players.map(p => p.palette != null ? p : { ...p, palette: paletteFromName(p.name) });
}

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
    if (scene === 'title' || scene === 'options' || scene === 'teamSelect' || scene === 'draft' || scene === 'draftHub' || scene === 'collection' || scene === 'matchmaking' || scene === 'featuredEvents' || scene === 'battlePass') {
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
  // Paid (credit) draft: which mode the DraftScreen runs in, and the
  // server-priced cost of the user's next paid draft this month.
  const [draftMode, setDraftMode] = React.useState('free'); // 'free' | 'credit'
  const [draftCost, setDraftCost] = React.useState(null);   // null = loading
  const refreshDraftCost = React.useCallback(() => {
    return trpc.draft.cost.query().then(r => setDraftCost(r.cost)).catch(() => {});
  }, []);
  const [freeDrafts,    setFreeDrafts]    = React.useState(0);
  const [paidPicks,     setPaidPicks]     = React.useState(0); // banked credit-draft picks
  const [serverMissions, setServerMissions] = React.useState({ daily: [], weekly: [] });
  const [serverBpMissions, setServerBpMissions] = React.useState([]);

  const refreshMissions = React.useCallback(() => {
    return trpc.missions.list.query()
      .then(setServerMissions)
      .catch(() => {});
  }, []);

  const refreshBpMissions = React.useCallback(() => {
    return trpc.missions.listPass.query()
      .then(setServerBpMissions)
      .catch(() => {});
  }, []);

  // Reload the owned roster + lineup from the server. Updates rawRoster/rawLineup
  // (what the Collection screen reads) and rebuilds the 5-man lineup. Call this
  // after any mint (e.g. a paid credit draft) so the Collection isn't stale.
  const refreshRoster = React.useCallback(() => {
    return Promise.all([trpc.user.roster.query(), trpc.user.lineup.query()])
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
            palette: p.palette ?? 0,
            serverId: p.id,
          };
        }).filter(Boolean);
        if (built.length === 5) setHomeRoster(built);
      })
      .catch(() => {});
  }, []);

  const refreshUser = React.useCallback(() => {
    return Promise.all([
      trpc.user.init.query().then((user) => {
        setServerCredits(user.credits);
        setFreeDrafts(user.freeDrafts ?? 0);
        setPaidPicks(user.paidPicks ?? 0);
        if (user.teamName) setHomeTeamName(user.teamName);
      }).catch(() => {}),
      refreshMissions(),
    ]);
  }, [refreshMissions]);

  // Founders Pass state — { tier: 'basic' | 'premium' | null, purchasedAt, founder }.
  // Refreshed on mount + after every successful purchase (BattlePassScreen calls
  // onPassRefresh which invokes refreshPass + refreshUser to pick up the credit grant).
  const [passState, setPassState] = React.useState({ tier: null, purchasedAt: 0, founder: false });
  const refreshPass = React.useCallback(() => {
    return trpc.pass.getMine.query().then(setPassState).catch(() => {});
  }, []);

  // Admin kill switches (server: core/featureFlags.ts). `null` = not yet
  // loaded; we treat unknown as ENABLED so a slow query never flashes a
  // false "unavailable" state at a legitimate buyer. The server rejects
  // purchases independently, so an optimistic client here is safe.
  const [flags, setFlags] = React.useState(null);
  const refreshFlags = React.useCallback(() => {
    return trpc.config.getFlags.query().then(setFlags).catch(() => {});
  }, []);
  // Shown when someone reaches the battle pass entry point while sales
  // are paused and they don't already own a pass.
  const [passLocked, setPassLocked] = React.useState(false);

  // ── Battle pass access gate ─────────────────────────────────────────
  // Sales off does NOT mean the page is dead for everyone: existing pass
  // holders reach their seasonal BP missions and claim rewards here, and
  // locking them out would strand rewards they already paid for. So the
  // page is blocked only for users with no pass — exactly the people who
  // could only have come here to buy.
  const passPurchasesOn = flags?.passPurchases !== false;
  const ownsPass = (passState?.tier ?? null) !== null;
  const passPageBlocked = !passPurchasesOn && !ownsPass;

  const openBattlePass = React.useCallback(() => {
    if (passPageBlocked) { setPassLocked(true); return; }
    setScene('battlePass');
  }, [passPageBlocked]);

  // Catches the mid-session case: an admin flips the switch (or the flag
  // query resolves) while the user is already sitting on the page.
  React.useEffect(() => {
    if (scene === 'battlePass' && passPageBlocked) {
      setScene('title');
      setPassLocked(true);
    }
  }, [scene, passPageBlocked]);

  React.useEffect(() => {
    trpc.user.init.query().then((user) => {
      setServerCredits(user.credits);
      setFreeDrafts(user.freeDrafts ?? 0);
      setPaidPicks(user.paidPicks ?? 0);
      setIsFtue(user.gamesPlayed === 0);
      if (user.teamName) setHomeTeamName(user.teamName);
    }).catch(() => {});

    refreshPass();
    refreshBpMissions();
    refreshFlags();

    // Load saved roster + lineup so returning players can skip the draft
    refreshRoster().finally(() => setRosterLoaded(true));
  }, [refreshRoster, refreshPass]);

  const [titleLogs, setTitleLogs] = React.useState([]);
  const [showTitleDebug, setShowTitleDebug] = React.useState(false);
  const [showAdminOverlay, setShowAdminOverlay] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Determine admin status once on mount — gates the debug console icon.
  React.useEffect(() => {
    trpc.admin.isAdmin.query()
      .then(r => setIsAdmin(!!r?.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  const handleMatchmakingReady = () => {
    trpc.game.start.mutate()
      .then(result => {
        if (result?.gameId) {
          gameSessionRef.current = { gameId: result.gameId, token: result.token, seq: 0 };
        } else {
          console.error('game.start returned no gameId', result);
        }
      })
      .catch(err => console.error('game.start failed', err));
    gameState.handleCommand('testGamePlay');
    setScene('game');
  };

  const handleTitleCommand = (cmd) => {
    const addTitleLog = (text, type = 'out') => setTitleLogs(prev => [...prev, { text, type }]);
    runCommand(cmd, { scene: 'title', addLog: addTitleLog, setShowAdminOverlay, closeConsole: () => setShowTitleDebug(false) });
  };

  const [gameTip, setGameTip] = React.useState(null);
  const [homeTeamName, setHomeTeamName] = React.useState('HOME');
  const [homeRoster, setHomeRoster] = React.useState([]);
  const [rawRoster, setRawRoster]   = React.useState([]);
  const [rawLineup, setRawLineup]   = React.useState({});
  const [isFtue, setIsFtue] = React.useState(true); // true until persisted completion flag is received
  const [ftueIntroSeen, setFtueIntroSeen] = React.useState(false);

  // ── Challenge Me ──────────────────────────────────────────
  // getChallenge resolves context.postId server-side → null when the current
  // post isn't a challenge post (default post / no context). The postId
  // persists across the inline→expanded reload, so this works in both modes.
  const [challengePost, setChallengePost] = React.useState(undefined); // undefined=loading | null=none | obj
  const [rosterLoaded, setRosterLoaded] = React.useState(false);
  const [challengeModal, setChallengeModal] = React.useState(null);    // null|'confirm'|'posting'|'posted'|'error'
  const [challengeUrl, setChallengeUrl] = React.useState('');
  const challengeRoutedRef = React.useRef(false);
  // The current user's own active challenge post (lobby "My Challenge" view).
  const [myChallenge, setMyChallenge] = React.useState(undefined); // undefined=loading | null=none | obj
  const [myChallengeOpen, setMyChallengeOpen] = React.useState(false);
  // Deep-link block messaging (expanded boot): own post / no roster.
  const [challengeBlock, setChallengeBlock] = React.useState(null); // null|'self'|'noRoster'

  React.useEffect(() => {
    trpc.post.getChallenge.query().then(setChallengePost).catch(() => setChallengePost(null));
  }, []);

  // Lobby: the user's own active challenge post (drives the mission CTA + the
  // My Challenge modal). Only meaningful outside inline (the lobby lives in the
  // expanded webview). getMyChallenge self-heals a deleted-post gate, so a null
  // result flips the CTA back to POST NOW.
  const refreshMyChallenge = React.useCallback(() => {
    trpc.post.getMyChallenge.query().then(setMyChallenge).catch(() => setMyChallenge(null));
  }, []);
  React.useEffect(() => {
    if (!isInline) refreshMyChallenge();
  }, [isInline, refreshMyChallenge]);

  const handleCreateChallenge = () => {
    setChallengeModal('posting');
    trpc.post.createChallenge.mutate()
      .then((res) => {
        // Stay in-app: show a success state with the post URL rather than
        // navigating away (which would drop the user out of the lobby). The
        // user can optionally tap "View Post" to go to it.
        setChallengeUrl(res.navigateTo || '');
        setChallengeModal('posted');
        refreshMissions();      // flip the lobby mission state
        refreshMyChallenge();   // CTA now reflects the live post → VIEW
      })
      .catch(() => setChallengeModal('error'));
  };

  // Refresh user data (credits, picks, team name) whenever we land on the
  // draft hub or the lobby — values may have changed since page load.
  React.useEffect(() => {
    if (scene === 'draftHub' || scene === 'title') refreshUser();
    if (scene === 'draftHub') refreshDraftCost();
    if (scene === 'battlePass') { refreshBpMissions(); refreshFlags(); }
    // Collection reads rawRoster — refresh on open so newly minted players
    // (e.g. from a paid draft) always show without a full app reload.
    if (scene === 'collection') refreshRoster();
  }, [scene, refreshUser, refreshDraftCost, refreshRoster, refreshBpMissions]);
  const [awayTeam, setAwayTeam] = React.useState(
    () => {
      const team = OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
      return { ...team, players: withDerivedPalette(team.players) };
    }
  );

  // Challenge deep-link routing (expanded mode only). Declared AFTER the state
  // it depends on (homeRoster/homeTeamName/challengePost/awayTeam) so its deps
  // array doesn't hit the temporal dead zone during render. Once the lobby is
  // up and both the challenge fetch + roster load have settled, decide ONCE: if
  // this is someone else's challenge post, set the away team to their roster
  // and route into matchmaking (or onboarding if the viewer has no team yet).
  React.useEffect(() => {
    if (isInline || challengeRoutedRef.current) return;
    if (challengePost === undefined || !rosterLoaded) return; // wait for both
    if (scene !== 'title') return;                            // let loading → lobby settle first
    challengeRoutedRef.current = true;
    if (!challengePost) return;                            // not a challenge post
    if (challengePost.username === username) {             // opened your own post
      setChallengeBlock('self');                           // stay on lobby, explain why
      return;
    }
    if (homeRoster.length !== 5) {                         // can't play without a full squad
      setChallengeBlock('noRoster');                       // explain + offer to draft
      return;
    }
    setAwayTeam({ name: challengePost.team, username: challengePost.owner, players: toAwayPlayers(challengePost.roster), isChallenge: true });
    setScene('matchmaking');
  }, [isInline, challengePost, rosterLoaded, scene, homeRoster.length, username, homeTeamName]);

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
      /* NOTE on `lineHeight: 0` below: this is THE source of the inherited
         zero line-height that every text container in this app has to defend
         against. It kills the whitespace gap under inline sprites/images, so
         it is load-bearing for the pixel-art layout, but it is inherited by
         ALL descendants, giving them zero-height line boxes so stacked labels
         paint on the same baseline and overlap.

         It is NOT Reddit's doing. Several comments elsewhere in this repo
         blame "Reddit's host CSS" for forcing line-height:0; that attribution
         is wrong. Reddit injects zero CSS into Devvit webviews (verified Jul
         25 by CDP-attaching to the live webview), and the shipped bundle
         carries this exact inline style, so the collapse is identical in
         production and in preview. Any container with real text must set its
         own line-height. (Jul 27) */
      style={{ background: '#111', lineHeight: 0, height: '100vh', position: 'relative', cursor: (isInline && !challengePost) ? 'pointer' : undefined }}
      /* Inline splash: any tap launches. Inline challenge card: the window is
         inert — only the CHALLENGE ME button (via onChallenge) launches, and the
         carousel arrows browse. So the root tap-to-expand is disabled whenever a
         challenge card is showing. */
      onClick={(isInline && !challengePost) ? (e) => tryExpand(e.nativeEvent) : undefined}
    >
      {/* ── LOBBY SCREEN (HTML layer — replaces SVG title scene) ── */}
      {!isInline && scene === 'title' && (
        <LobbyScreen
          username={username}
          credits={serverCredits}
          homeRoster={homeRoster}
          missions={serverMissions}
          isFtue={isFtue}
          onPlay={(mode) => {
            // Kick audio context inside the user-gesture so subsequent
            // scene-driven music starts cleanly on mobile (iOS Safari needs
            // play() invoked from a direct gesture handler).
            titleMusic.start();
            const hasTeam = homeTeamName && homeTeamName !== 'HOME';
            if (isFtue && !ftueIntroSeen) {
              setScene('ftueIntro');
            } else if (isFtue && homeRoster.length === 5) {
              // FTUE user already drafted but quit before completing their
              // first game — skip the draft hub and drop them into the game.
              setScene('matchmaking');
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
          onAuction={openBattlePass}
          onOptions={() => setScene('options')}
          onEvents={() => setScene('featuredEvents')}
          onCreateChallenge={() => setChallengeModal('confirm')}
          challengeActive={!!myChallenge}
          onViewChallenge={() => setMyChallengeOpen(true)}
          onClaim={refreshMissions}
        />
      )}

      {!isInline && scene === 'featuredEvents' && (
        <ScreenWithStrip credits={serverCredits}>
          <FeaturedEventsScreen
            username={username}
            credits={serverCredits}
            onBack={() => setScene('title')}
            onPlay={() => setScene('title')}
            onCollection={() => setScene('collection')}
            onDraft={() => setScene('draftHub')}
            onAuction={openBattlePass}
            onOptions={() => setScene('options')}
          />
        </ScreenWithStrip>
      )}

      {!isInline && scene === 'battlePass' && (
        <ScreenWithStrip credits={serverCredits} onEvents={() => setScene('featuredEvents')}>
          <BattlePassScreen
            username={username}
            credits={serverCredits}
            passState={passState}
            purchasesEnabled={passPurchasesOn}
            bpMissions={serverBpMissions}
            onPassRefresh={async () => {
              await refreshPass();
              await refreshUser();
              await refreshBpMissions();
            }}
            onBpClaim={refreshBpMissions}
            onBack={() => setScene('title')}
          />
        </ScreenWithStrip>
      )}

      {!isInline && scene === 'collection' && (
        <ScreenWithStrip credits={serverCredits} onEvents={() => setScene('featuredEvents')}>
          <CollectionScreen
            roster={rawRoster}
            lineup={rawLineup}
            username={username}
            credits={serverCredits}
            onLineupChange={(next) => setRawLineup({ ...next })}
            onRosterChange={refreshRoster}
            onBack={() => setScene('title')}
          />
        </ScreenWithStrip>
      )}

      {!isInline && scene === 'draft' && (
        <ScreenWithStrip credits={serverCredits} onEvents={() => setScene('featuredEvents')}>
        <DraftScreen
          homeTeamName={homeTeamName}
          isFtue={isFtue}
          mode={draftMode}
          onPaidComplete={() => {
            // Paid single draft finished — credits + monthly cost changed, and a
            // new player was minted into the collection.
            setDraftMode('free');
            refreshUser();
            refreshDraftCost();
            refreshRoster();   // so the Collection shows the new player without a reload
            setScene('draftHub');
          }}
          onStart={(r) => {
            setHomeRoster(r);
            // Always refresh — the 5 mints just decremented the server-side
            // freeDrafts counter and we want the client to reflect that.
            refreshUser();
            // FTUE: jump straight into the first game with a tip.
            // Post-FTUE: return to the hub so the user sees their updated pick count.
            if (isFtue) {
              setGameTip("Coach the players, sit back, watch, and make decisions!");
              setScene('game');
            } else {
              setScene('draftHub');
            }
          }}
          onBack={() => setScene(draftMode === 'credit' ? 'draftHub' : 'teamSelect')}
          onMenu={(r) => { setHomeRoster(r); refreshUser(); setScene('title'); }}
        />
        </ScreenWithStrip>
      )}

      {!isInline && scene === 'ftueIntro' && (
        <FtueIntroVideo
          onDone={() => {
            setFtueIntroSeen(true);
            const hasTeam = homeTeamName && homeTeamName !== 'HOME';
            if (homeRoster.length === 0) {
              setScene(hasTeam ? 'draft' : 'teamSelect');
            } else if (isFtue && homeRoster.length === 5) {
              // FTUE user with a full roster from a prior abandoned session —
              // straight into the first game.
              setScene('matchmaking');
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
        <ScreenWithStrip credits={serverCredits} onEvents={() => setScene('featuredEvents')}>
        <DraftHubScreen
          freeDrafts={freeDrafts}
          paidPicks={paidPicks}
          credits={serverCredits}
          rosterCount={homeRoster.length}
          nextDraftCost={draftCost}
          onUsePick={() => {
            // Free FTUE draft — skip team-name setup if already named.
            setDraftMode('free');
            const hasTeam = homeTeamName && homeTeamName !== 'HOME';
            setScene(hasTeam ? 'draft' : 'teamSelect');
          }}
          onBuyDraft={() => {
            // Buy a draft pick — charge now, bank it (persists). Stay on the hub
            // so the banked pick is visible; the button flips to USE DRAFT PICK.
            // Use the mutation's authoritative return value to update the count +
            // next cost IMMEDIATELY (don't wait on a separate refresh, which can
            // race/lag and leave the button showing the stale, cheaper price).
            trpc.draft.buy.mutate()
              .then((res) => {
                if (res) {
                  setPaidPicks(res.paidPicks);
                  setDraftCost(res.nextCost);
                }
                refreshUser();   // sync credits (authoritative)
              })
              .catch(() => { refreshUser(); refreshDraftCost(); });
          }}
          onCreditDraft={() => {
            // Use a banked pick — enter the single-player reveal (mint consumes
            // the pick server-side; no further charge).
            setDraftMode('credit');
            setScene('draft');
          }}
          onBack={() => setScene('title')}
        />
        </ScreenWithStrip>
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
          {isInline && !challengePost && (
            <SplashScreen />
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

      {/* ── INLINE CHALLENGE CARD (HTML overlay — replaces splash for
             challenge posts; a tap anywhere bubbles to the root tryExpand) ── */}
      {isInline && challengePost && (
        <ChallengeCardHost data={challengePost} onChallenge={(_user, e) => tryExpand(e?.nativeEvent)} />
      )}

      {/* ── MATCHMAKING (HTML overlay — full-bleed div, not SVG) ── */}
      {!isInline && scene === 'matchmaking' && (
        <MatchmakingScreen
          homeRoster={homeRoster}
          homeTeamName={(homeTeamName && homeTeamName !== 'HOME') ? homeTeamName : ''}
          homeUsername={username ? `u/${username}` : 'YOU'}
          awayTeam={awayTeam}
          onReady={handleMatchmakingReady}
        />
      )}

      {/* ── TITLE/MENU DEBUG CONSOLE (admins only) ───────────── */}
      {!isInline && scene !== 'game' && isAdmin && (
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
          isAdmin={isAdmin}
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
              } else {
                console.error('game.start returned no gameId', result);
              }
            }).catch(err => console.error('game.start failed', err));
            gameState.handleCommand('testGamePlay');
            setGameTip(null);
          }}
          onDismissGameOver={() => {
            const session = gameSessionRef.current;
            if (session) {
              const score = clientScoreRef.current;
              trpc.game.end.mutate({ gameId: session.gameId, token: session.token, score })
                .then(summary => {
                  setServerCredits(c => c + summary.creditsEarned);
                  // Mission progress (+ any mission-credit awards) happened
                  // server-side during endGame — refresh so the lobby shows
                  // it and the celebratory modal fires.
                  refreshMissions();
                })
                .catch(err => console.error('game.end failed', err));
              gameSessionRef.current = null;
              clientScoreRef.current = 0;
            } else {
              console.warn('GameOver dismissed with no session — game.end skipped, credits will not be awarded. Marking FTUE done as fallback.');
              trpc.user.markFtuePlayed.mutate()
                .catch(err => console.error('markFtuePlayed failed', err));
            }
            setIsFtue(false);
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

      {/* ── CREATE CHALLENGE ME — confirm modal ──────────────── */}
      {/* ── FOUNDERS PASS UNAVAILABLE — admin kill switch ────────── */}
      {!isInline && passLocked && (
        <div
          data-testid="pass-locked-modal"
          onClick={() => setPassLocked(false)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1117', border: '1px solid #ffd97a',
              padding: '24px 22px', maxWidth: 300, textAlign: 'center', fontFamily: 'monospace',
              lineHeight: 1.4, // explicit — Reddit forces line-height:0, collapsing/overlapping text
            }}
          >
            <div style={{ color: '#ffd97a', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>FOUNDERS PASS CLOSED</div>
            <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
              Founders Pass sales are paused right now. Nothing has been charged — check back soon.
            </div>
            <button
              data-testid="pass-locked-ok"
              onClick={() => setPassLocked(false)}
              style={{ background: '#ffd97a', color: '#000', border: 'none', padding: '6px 20px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}
            >GOT IT</button>
          </div>
        </div>
      )}

      {!isInline && challengeModal && (
        <div
          data-testid="challenge-modal"
          onClick={() => challengeModal !== 'posting' && setChallengeModal(null)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1117', border: '1px solid #ffd97a',
              padding: '24px 22px', maxWidth: 300, textAlign: 'center', fontFamily: 'monospace',
              lineHeight: 1.4, // explicit — Reddit forces line-height:0, collapsing/overlapping text
            }}
          >
            {challengeModal === 'posting' ? (
              <div style={{ color: '#ffd97a', fontSize: 12, letterSpacing: '0.1em' }}>CREATING POST…</div>
            ) : challengeModal === 'posted' ? (<>
              <div style={{ color: '#5bf2d4', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>✓ CHALLENGE POSTED</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 12 }}>
                Your team is live on r/LastDraftGame. Other Redditors can now challenge your roster.
              </div>
              {challengeUrl && (
                <div style={{ color: '#cbd5e1', fontSize: 9, lineHeight: 1.5, marginBottom: 16, padding: '8px 10px', background: 'rgba(0,0,0,0.35)', border: '1px solid #2a3340', wordBreak: 'break-all', userSelect: 'all' }}>
                  {challengeUrl}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setChallengeModal(null)} style={{ background: 'transparent', color: '#8899aa', border: '1px solid #2a3340', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>DONE</button>
                {challengeUrl && (
                  <button onClick={() => { try { devvitNavigateTo(challengeUrl); } catch { try { window.location.href = challengeUrl; } catch {} } }} style={{ background: 'linear-gradient(180deg,#5bf2d4,#19b89e)', color: '#02201a', border: 'none', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', cursor: 'pointer' }}>VIEW POST ▸</button>
                )}
              </div>
            </>) : challengeModal === 'error' ? (<>
              <div style={{ color: '#ff7a3c', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>COULDN'T POST</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
                You may have already created a Challenge Me post this week. Try again next week.
              </div>
              <button onClick={() => setChallengeModal(null)} style={{ background: '#ffd97a', color: '#000', border: 'none', padding: '6px 20px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>GOT IT</button>
            </>) : homeRoster.length < 5 ? (<>
              <div style={{ color: '#ffd97a', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>CHALLENGE ME</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
                You need a full 5-player lineup before posting a Challenge Me card. Draft and set your squad first.
              </div>
              <button onClick={() => setChallengeModal(null)} style={{ background: '#ffd97a', color: '#000', border: 'none', padding: '6px 20px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>GOT IT</button>
            </>) : (<>
              <div style={{ color: '#ffd97a', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>POST CHALLENGE ME?</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
                Post <b style={{ color: '#eaf6f3' }}>{(homeTeamName && homeTeamName !== 'HOME') ? homeTeamName : 'your team'}</b> to r/LastDraftGame. Other Redditors can challenge your roster — once per week.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setChallengeModal(null)} style={{ background: 'transparent', color: '#8899aa', border: '1px solid #2a3340', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>CANCEL</button>
                <button data-testid="challenge-confirm" onClick={handleCreateChallenge} style={{ background: 'linear-gradient(180deg,#ffe9bb,#ffd97a 55%,#d6a155)', color: '#2a1a04', border: 'none', padding: '6px 18px', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', cursor: 'pointer' }}>POST ▸</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* ── MY CHALLENGE — results + view post ────────────────── */}
      {!isInline && myChallengeOpen && (
        <div
          data-testid="my-challenge-modal"
          onClick={() => setMyChallengeOpen(false)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1117', border: '1px solid #ffd97a',
              padding: '20px 22px', width: 300, maxWidth: '88%', textAlign: 'center', fontFamily: 'monospace',
              lineHeight: 1.4, // explicit — Reddit forces line-height:0, collapsing/overlapping text
            }}
          >
            {myChallenge === undefined ? (
              <div style={{ color: '#ffd97a', fontSize: 12, letterSpacing: '0.1em' }}>LOADING…</div>
            ) : myChallenge === null ? (<>
              <div style={{ color: '#ff7a3c', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>NO ACTIVE CHALLENGE</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 18 }}>
                Your challenge post is no longer active. Post a new one to keep getting challenged.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setMyChallengeOpen(false)} style={{ background: 'transparent', color: '#8899aa', border: '1px solid #2a3340', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>CLOSE</button>
                <button onClick={() => { setMyChallengeOpen(false); setChallengeModal('confirm'); }} style={{ background: 'linear-gradient(180deg,#ffe9bb,#ffd97a 55%,#d6a155)', color: '#2a1a04', border: 'none', padding: '6px 18px', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', cursor: 'pointer' }}>CREATE NEW ▸</button>
              </div>
            </>) : (<>
              <div style={{ color: '#ffd97a', fontSize: 11, letterSpacing: '0.1em', marginBottom: 6 }}>YOUR CHALLENGE</div>
              <div style={{ marginTop: 4, marginBottom: 14, fontSize: 15, fontWeight: 900, letterSpacing: '0.06em', lineHeight: 1.2 }}>
                <span style={{ color: '#5bf2d4' }}>{myChallenge.record.wins}W</span>
                <span style={{ color: '#5a6b7a', margin: '0 6px' }}>—</span>
                <span style={{ color: '#ff6b6b' }}>{myChallenge.record.losses}L</span>
              </div>
              <div style={{ textAlign: 'left', marginBottom: 16 }}>
                <div style={{ color: '#8899aa', fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>PREVIOUS CHALLENGES</div>
                {myChallenge.challenges.length === 0 ? (
                  <div style={{ color: '#5a6b7a', fontSize: 10, fontStyle: 'italic', padding: '6px 0' }}>No challenges yet</div>
                ) : (
                  myChallenge.challenges.map((c, i) => (
                    <div key={`${c.opponent}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #1a222c' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 900, width: 16, textAlign: 'center', borderRadius: 3,
                        color: c.result === 'W' ? '#02201a' : '#2a0606',
                        background: c.result === 'W' ? '#5bf2d4' : '#ff6b6b',
                      }}>{c.result}</span>
                      <span style={{ color: '#cbd5e1', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>u/{c.opponent}</span>
                      <span style={{ color: '#8899aa', fontSize: 10 }}>{c.score}</span>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setMyChallengeOpen(false)} style={{ background: 'transparent', color: '#8899aa', border: '1px solid #2a3340', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>CLOSE</button>
                <button onClick={() => { const u = myChallenge.navigateTo; try { devvitNavigateTo(u); } catch { try { window.location.href = u; } catch {} } }} style={{ background: 'linear-gradient(180deg,#5bf2d4,#19b89e)', color: '#02201a', border: 'none', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', cursor: 'pointer' }}>VIEW POST ▸</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* ── CHALLENGE DEEP-LINK BLOCK — own post / no roster ──── */}
      {!isInline && challengeBlock && (
        <div
          data-testid="challenge-block-modal"
          onClick={() => setChallengeBlock(null)}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1117', border: '1px solid #ffd97a',
              padding: '24px 22px', maxWidth: 300, textAlign: 'center', fontFamily: 'monospace',
              lineHeight: 1.4, // explicit — Reddit forces line-height:0, collapsing/overlapping text
            }}
          >
            {challengeBlock === 'self' ? (<>
              <div style={{ color: '#ffd97a', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>YOUR OWN CHALLENGE</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
                This is your own Challenge Me post — you can't challenge yourself. Head back to the lobby.
              </div>
              <button onClick={() => setChallengeBlock(null)} style={{ background: '#ffd97a', color: '#000', border: 'none', padding: '6px 20px', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', cursor: 'pointer' }}>BACK TO LOBBY</button>
            </>) : (<>
              <div style={{ color: '#ffd97a', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>NEED A TEAM</div>
              <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.6, marginBottom: 20 }}>
                You need a full 5-player roster to accept a challenge. Draft your squad first!
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setChallengeBlock(null)} style={{ background: 'transparent', color: '#8899aa', border: '1px solid #2a3340', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>BACK TO LOBBY</button>
                <button onClick={() => { const hasTeam = homeTeamName && homeTeamName !== 'HOME'; setChallengeBlock(null); setScene(hasTeam ? 'draft' : 'teamSelect'); }} style={{ background: 'linear-gradient(180deg,#ffe9bb,#ffd97a 55%,#d6a155)', color: '#2a1a04', border: 'none', padding: '6px 16px', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', cursor: 'pointer' }}>DRAFT MY TEAM ▸</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Debug: FTUE indicator — admins only */}
      {isFtue && isAdmin && (
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

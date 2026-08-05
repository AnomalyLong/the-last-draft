import React from 'react';
import {
  W, ZOOM_W, TOTAL_H, TOP_BAR, BOT_BAR, INITIAL_PLAYERS,
  JERSEY_HOME, JERSEY_AWAY, resolvePalette,
} from '../constants.js';
import OPPONENTS from '../opponents.json';
import { withDerivedPalette } from '../teamPalette.js';
import { rollAbilities } from '../abilityRoll.js';
import { useGame } from '../useGame.js';
import { setMuted, isMuted } from '../sound/basketball.js';
import { Court } from './Court.jsx';
import { Player } from './Player.jsx';
import { Ball } from './Ball.jsx';
import { ShotBall } from './ShotBall.jsx';
import { SpecialPassBall } from './SpecialPassBall.jsx';
import { Shadow } from './Shadow.jsx';
import { PixelTextC } from './PixelText.jsx';
import { SpecialMoveCards } from './SpecialMoveCards.jsx';
import { PLAYS } from './PlayPickerOverlay.jsx';
import { MONOGRAM_CELL_W } from '../sprites/monogram.js';

// ── SplashCourt — inline (feed) splash showing the debug-court sandbox ────────
//
// This is the SAME matchup the `court` debug command drops you onto:
// OPPONENTS[0] WOLVES (home) vs OPPONENTS[1] HAWKS (away), palettes derived by
// name through the shared helper in teamPalette.js. Nothing here is hand-posed;
// the roster, the formation and the motion all come from existing game code.
//
// Which splash ships is DEFAULT_SPLASH in src/splashConfig.js. To compare the
// two on a device without rebuilding, use the `splash classic|court` debug
// command or Admin panel -> Config -> "Post view splash" (device-local).

// ── ATTRACT ──────────────────────────────────────────────────────────────────
//
//   'live'   → mounts useGame with the fixture rosters and runs the real
//              `testGamePlay` command — the actual match loop (jump ball,
//              possessions, shots, nets, clock), same as the sandbox court.
//              Muted, and the human-input gates are auto-answered (below).
//
//   'static' → INITIAL_PLAYERS jump-ball formation, no sim. This is exactly
//              what the sandbox court looks like the instant you enter it,
//              before you type a command. Zero timers beyond sprite idle.
//
export const ATTRACT = 'live';

// ── FRAMING ──────────────────────────────────────────────────────────────────
//   'game' → 1:1 with the game: sprite scale 1.5, camera follows the ball.
//   'fit'  → whole 680-wide field squeezed into the 408 viewport.
export const FRAMING = 'game';

// ── TOP_CHROME ───────────────────────────────────────────────────────────────
// y 0..TOP_BAR is chrome in the real game — the HUD's top menu (user avatar,
// u/name, CREDITS, TEAMS, OPT) covers it, so the court PNG behind it only has
// crowd art in patches: a full crowd at mid-court, a bare blue strip once the
// camera reaches either baseline.
//   'crowd' → DEFAULT. Leave the court art exactly as it renders, no paint. The
//             feed tile shows only the title over it; none of the HUD menu is
//             mounted here, so there is no user/TEAMS/OPT to hide.
//   'bar'   → paint that band #111 and treat it as chrome the way GameScene does.
//             Consistent at every camera x, but it is a painted layer.
export const TOP_CHROME = 'crowd';

// ── SHOW_SCORELINE ───────────────────────────────────────────────────────────
// The live "WOLVES 0-0 HAWKS  00:58" readout under the title. Off: the top of
// the tile carries the title and nothing else.
export const SHOW_SCORELINE = false;

// ── TITLE_PLATE ──────────────────────────────────────────────────────────────
// Dark rounded plate behind the title text. Off by default so the court art
// reads straight through; PixelTextC's thick outline carries the legibility.
export const TITLE_PLATE = false;

// ── ABILITIES_PER_PLAYER ─────────────────────────────────────────────────────
// How many random abilities every one of the 10 players gets, rarity-weighted by
// their OVR through the shared roller in abilityRoll.js.
//
// This exists for the attract loop's benefit: without abilities the sim only
// ever plays run / shoot / block / idle, so the feed tile never shows any of the
// signature animations. Each ability unlocks one —
//   DUNK MASTER   → every dunk becomes a SPIN DUNK (dunkspin sprite)
//   ANKLE BREAKER → spin moves off the dribble (spinmove)
//   SHARPSHOOTER  → fadeaway jumpers (fadeaway) + 10 ACC
//   IRON BLOCK    → iron block animation (ironblock) + 10% block rate
//   PICK POCKET   → pickpocket steal animation (pickpocket) + 10% steal rate
//   SPEEDY        → dash bursts (dash)
//   PLAY MAKER    → passes render as SpecialPassBall, better shot odds
//
// 0 restores the plain no-ability sandbox roster. Capped at MAX_ABILITIES (3) by
// the roller, so this can never build a row that countOwnedAbilities() rejects.
export const ABILITIES_PER_PLAYER = 2;

// ── SHOW_MOVE_CARDS ──────────────────────────────────────────────────────────
// The comic-panel special-move cards (IRON BLOCK!, SPIN DUNK!, FADEAWAY! ...).
// Same seven the real game raises — shared table in SpecialMoveCards.jsx, so the
// feed tile cannot drift from the match.
//
// These are the payoff for ABILITIES_PER_PLAYER: the ability-driven animations
// are only a few percent of frames and are hard to read at sprite scale 1.5, but
// a card is a full 160x130 panel with the sprite blown up 5x, so it reads
// instantly in a feed. Six of the seven are ability-gated; SET PICK! is not — it
// needs AUTO_PLAY 'rotate' below.
export const SHOW_MOVE_CARDS = true;

// Card centre. The in-game default is y=74, which sits in the HUD band on
// purpose (the card is meant to cover the HUD). No HUD is mounted here and the
// title lives up there instead, so drop the card to the middle of the court:
// 120 spans y 55..185, clear of the title (~24) and the CTA (304).
export const SPLASH_CARD_CY = 120;

// ── AUTO_PLAY ────────────────────────────────────────────────────────────────
// What to answer the play picker with on each home possession.
//   'rotate' → cycle the real PLAYS table (standard → pickroll → iso). pickroll
//              is the ONLY thing that sets isPicking, so it is the only way the
//              SET PICK! card can ever appear; iso also gives the ball-handler
//              isolation drives instead of motion passing.
//   'none'   → onPickPlay(null), the supported "no choice" path: every play?.id
//              check falls through to motion offence. Never fires SET PICK!.
export const AUTO_PLAY = 'rotate';

// ── GATE_MS ──────────────────────────────────────────────────────────────────
// How long to sit on each human-input gate before auto-answering it.
//
// These gates exist so a PLAYER can choose. Nothing in a feed tile can choose,
// so every millisecond spent here is just the court standing still — the clock
// is stopped and the possession is parked, with none of the overlays that would
// explain the pause mounted. So: answer immediately.
//
// This matters most for the DEFENSE picker. useGame self-dismisses that one
// after DEFENSE_PICK_MS (8250ms), which is why the splash originally left it
// alone — but 8.25s of frozen court per away possession is the bulk of the dead
// air in the tile. Pre-empting it with onPickDefense(null) runs the exact same
// continuation the auto-dismiss would, just without the wait.
//
// Residual pause is NOT zero: useGame defers its own continuations by 300ms
// (onPickPlay) and 100ms (onPickDefense). Those are the real game's animation
// beats and are deliberately left alone.
export const GATE_MS = 0;

const SCALE    = ZOOM_W / W;                           // 0.6
const SCALED_H = TOTAL_H * SCALE;                      // 208.8
const BAR_H    = Math.round((TOTAL_H - SCALED_H) / 2); // 70

// The inline <svg> is xMidYMid meet with no explicit clip, so on a container
// wider than 408/348 the browser clips to the VIEWPORT, not the viewBox — the
// court keeps drawing past x=0 and x=ZOOM_W. Full-bleed fills therefore have to
// overdraw well past the viewBox or they show up as a short bar mid-screen.
const BLEED = W;

// ── Fixture teams — identical construction to App.jsx enterDebugCourt ────────
// Home players deliberately carry no serverId, which is what keeps useGame's
// per-player progress writes away from real roster rows.
const HOME_TEAM = OPPONENTS[0];
const AWAY_TEAM = OPPONENTS[1];
//
// Abilities are written to `abilities` (the "earned in previous games" slot) and
// `ability` (the drafted slot) is left null. useGame's hasAbility() reads BOTH,
// plus the in-session override ref, so any of the three would work — but this is
// the only one that needs no ref plumbing, and rolling here means the loadout is
// fixed for the page's lifetime instead of re-randomising on every render (which
// would churn rosterRef and change a player's abilities mid-possession).
const grantAbilities = (p) => ({
  ...p, abilities: rollAbilities(ABILITIES_PER_PLAYER, p.ovr ?? 70),
});
const HOME_ROSTER = withDerivedPalette(HOME_TEAM.players).map(p => grantAbilities({
  ...p, rarity: p.rarity ?? 'common', ability: p.ability ?? null,
  abilities: p.abilities ?? [], level: 1, xp: 0,
}));
const AWAY_ROSTER = withDerivedPalette(AWAY_TEAM.players).map(grantAbilities);

// Auto-answer delays for the gates that normally wait on a human (see the
// SplashCourtLive comments for why each one is required).
// Game over → restart. Not an input gate: no overlay is drawn and the scoreline
// is off, so there is nothing to read here — just enough of a beat to register
// that the possession stopped before the tile loops.
const RESTART_MS = 1200;

const TITLE = 'THE LAST DRAFT';
const CTA   = 'TAP TO PLAY';
const plateW = (text, scale) => text.length * MONOGRAM_CELL_W * scale + 16;

// ── Court + players layer ────────────────────────────────────────────────────
// Mirrors GameScene's player layer exactly: depth sort by cy, palette looked up
// from the source roster BY POSITION (rosterEntry.pos === p.role), facingRight
// implemented as scale(-1,1) + translate(-cx*2), ball offset -6/+6 when set and
// +10/-10 while moving. Deliberately excludes the HUD, the popups and the
// overlays — those are camera-space chrome that would need their own cameraX
// handling and are not wanted in a feed tile.
// Which animation a player is currently in, exposed as data-anim purely so a
// test can assert the ability-driven sprites actually fire — several of them
// (spin dunk, fadeaway, iron block, pickpocket) are otherwise only
// distinguishable by looking at pixels. Order matters: the more specific
// ability variant is checked before the generic action it replaces.
const ANIM_FLAGS = [
  ['spindunk',   p => p.isSpinDunking],
  ['dunk',       p => p.isDunking],
  ['ironblock',  p => p.isIronBlocking],
  ['block',      p => p.isBlocking],
  ['pickpocket', p => p.isPickPocketing],
  ['steal',      p => p.isStealing],
  ['fadeaway',   p => p.isFadingAway],
  ['shoot',      p => p.isShooting],
  ['spin',       p => p.isSpinning],
  ['dash',       p => p.isDashing],
  ['stagger',    p => p.isStaggering],
  ['pick',       p => p.isPicking],
  ['jumpball',   p => p.isJumpBall],
  ['run',        p => p.isMoving],
];
const animOf = (p) => ANIM_FLAGS.find(([, test]) => test(p))?.[0] ?? 'idle';

function CourtLayer({ players, shot, netSwish, netDunk, netMiss, playerAlpha }) {
  return (
    <>
      <Court netSwish={netSwish} netDunk={netDunk} netMiss={netMiss} />
      <rect x={0} y={336} width={W} height={BOT_BAR} fill="#111" />
      <g opacity={playerAlpha}>
        {[...players].sort((a, b) => a.cy - b.cy).map((p) => {
          const jerseyColor = p.team === 'home' ? JERSEY_HOME : JERSEY_AWAY;
          const labelColor  = p.team === 'home' ? '#1a4fa0' : '#c02020';
          const roster      = p.team === 'home' ? HOME_ROSTER : AWAY_ROSTER;
          const rosterEntry = roster.find(r => r.pos === p.role);
          const pal         = resolvePalette(rosterEntry?.palette);
          const sprite = (
            <Player
              cx={p.cx} cy={p.cy} scale={1.5} jerseyColor={jerseyColor}
              skinColor={pal.skin} hairColor={pal.hair} beardColor={pal.beard}
              hasBall={p.hasBall} isMoving={p.isMoving} isShooting={p.isShooting}
              isDunking={p.isDunking} isSpinDunking={p.isSpinDunking}
              isBlocking={p.isBlocking} isIronBlocking={p.isIronBlocking}
              isJumpBall={p.isJumpBall} isStealing={p.isStealing}
              isPickPocketing={p.isPickPocketing} isSpinning={p.isSpinning}
              isDashing={p.isDashing} isFadingAway={p.isFadingAway}
              isStaggering={p.isStaggering} facingRight={p.facingRight}
            />
          );
          return (
            <React.Fragment key={p.id}>
              <Shadow cx={p.cx} cy={p.cy} hasBall={p.hasBall} />
              <g data-testid={`splash-player-${p.id}`} data-team={p.team} data-role={p.role} data-has-ball={p.hasBall} data-anim={animOf(p)}
                data-abilities={(rosterEntry?.abilities ?? []).map(a => a.name).join(',')}>
                {p.facingRight
                  ? <g transform={`scale(-1,1) translate(${-p.cx * 2}, 0)`}>{sprite}</g>
                  : sprite}
                {p.hasBall && !p.isDunking && !p.isSpinDunking && !p.isStealing &&
                 !p.isPickPocketing && !p.isSpinning && !p.isDashing && !p.isFadingAway &&
                  <Ball
                    cx={p.isMoving
                      ? (p.facingRight ? p.cx + 10 : p.cx - 10)
                      : (p.facingRight ? p.cx - 6 : p.cx + 6)}
                    cy={p.cy + 1} scale={1} lift={p.isMoving ? 3 : 0}
                    syncToRun={p.isMoving} />}
                <text x={p.cx} y={p.cy - 14} textAnchor="middle" fontSize={6}
                  fontFamily="monospace" fill={labelColor} fontWeight="bold">
                  {p.role}
                </text>
              </g>
            </React.Fragment>
          );
        })}
        {shot && (shot.isSpecialPass
          ? <SpecialPassBall shot={shot} scale={1} />
          : <ShotBall shot={shot} scale={1} />)}
      </g>
    </>
  );
}

// ── Frame ────────────────────────────────────────────────────────────────────
// Shared shell: backdrop, camera transform, title / scoreline / CTA. cameraX is
// the game's own smoothed camera value; GameScene applies it by moving the
// viewBox, which we can't do from inside App's shared <svg>, so we translate the
// field by -cameraX instead. Same result.
function Frame({ cameraX, scoreline, overlay, children }) {
  const [pulse, setPulse] = React.useState(1);
  React.useEffect(() => {
    let raf;
    const start = performance.now();
    const loop = (now) => {
      setPulse(0.55 + 0.45 * (0.5 + 0.5 * Math.sin(((now - start) / 1000) * 3)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const layout = FRAMING === 'game'
    ? { tx: -cameraX, ty: 0, scale: 1, titleY: 10, scoreY: 30, ctaY: 304 }
    : { tx: 0, ty: BAR_H, scale: SCALE,
        titleY: Math.round((BAR_H - 14) / 2), scoreY: BAR_H + 4,
        ctaY: Math.round(BAR_H + SCALED_H + (TOTAL_H - BAR_H - SCALED_H - 14) / 2) };

  // With the top band painted as chrome the title/score already sit on a solid
  // dark field, so their individual backing plates would just be visible boxes.
  // Unforced plates are also suppressed when TITLE_PLATE is off.
  const barTop = FRAMING === 'game' && TOP_CHROME === 'bar';
  const plate = (text, scale, y, force = false) => (
    ((barTop || !TITLE_PLATE) && !force) ? null : (
      <rect x={(ZOOM_W - plateW(text, scale)) / 2} y={y - 6}
        width={plateW(text, scale)} height={14 + 12} rx={3} fill="#05080f" opacity={0.62} />
    )
  );

  return (
    <g data-testid="splash-court" data-attract={ATTRACT} data-framing={FRAMING}>
      <rect x={-BLEED} y={0} width={ZOOM_W + BLEED * 2} height={TOTAL_H} fill="#111" />
      <g transform={`translate(${layout.tx}, ${layout.ty}) scale(${layout.scale})`}>
        {children}
      </g>
      {/* Re-cover the bottom strip: under 'game' framing the court art runs to
          y=428 but the play area ends at 336, and the camera translate moves the
          field's own bottom bar horizontally, not vertically. */}
      <rect x={-BLEED} y={TOTAL_H - BOT_BAR} width={ZOOM_W + BLEED * 2} height={BOT_BAR} fill="#111" />
      {barTop && <rect x={-BLEED} y={0} width={ZOOM_W + BLEED * 2} height={TOP_BAR} fill="#111" />}

      {plate(TITLE, 2, layout.titleY)}
      <PixelTextC text={TITLE} cx={ZOOM_W / 2} y={layout.titleY} scale={2}
        fill="#ffe060" outline="#0a1828" thick />

      {SHOW_SCORELINE && scoreline && (
        <>
          {plate(scoreline, 1, layout.scoreY)}
          <PixelTextC data-testid="splash-scoreline" text={scoreline} cx={ZOOM_W / 2}
            y={layout.scoreY} scale={1} fill="#e8e8e8" outline="#0a1828" />
        </>
      )}

      {plate(CTA, 2, layout.ctaY, true)}
      <g opacity={pulse}>
        <PixelTextC text={CTA} cx={ZOOM_W / 2} y={layout.ctaY} scale={2}
          fill="#7ee0ff" outline="#0a1828" thick />
      </g>

      {/* Screen space, OUTSIDE the camera group and after the text — mirrors
          GameScene rendering its cards after the HUD so they paint on top. */}
      {overlay}
    </g>
  );
}

// ── Live attract mode ────────────────────────────────────────────────────────
// Runs the real `testGamePlay` loop. Three of the loop's continuations normally
// wait on a human, and with no HUD/overlays mounted here nothing would ever
// answer them, so each is auto-answered:
//
//   playPickState     — loopHomeRef parks the possession on setPlayPickState(true)
//                       and resumes only from onPickPlay. PlayPickerOverlay has NO
//                       auto-dismiss timer, so an unattended loop stalls on the
//                       FIRST home possession. onPickPlay(null) is the supported
//                       "no choice" path: play?.id checks fall through to motion
//                       offence.
//   levelUpState      — a HOME level-up sets gamePausedRef and waits for
//                       onPickLevelUp / onDismissStatUpgrade. Never self-clears.
//   quarterSummary    — end of quarter waits for onDismissQuarterSummary, which
//                       is also what advances the period / ends the game.
//
//   defensePickState  — showDefensePicker sets gamePausedRef and arms its OWN
//                       auto-dismiss, so this one can't deadlock. But that timer
//                       is DEFENSE_PICK_MS = 8250ms, and with no overlay drawn
//                       that reads as the court simply freezing for 8 seconds on
//                       every away possession. Answered immediately instead;
//                       onPickDefense(null) is the same path the auto-dismiss
//                       takes (and it clears the pending timer itself).
function SplashCourtLive() {
  const game = useGame({ homeRoster: HOME_ROSTER, awayRoster: AWAY_ROSTER, isFtue: false });
  const { handleCommand, onPickPlay, onPickDefense, onDismissStatUpgrade, onDismissQuarterSummary } = game;

  // Silence first — testGamePlay calls bgMusic.start() immediately. Autoplay is
  // blocked in the feed anyway, but a tap that expands the post must not leave a
  // second music channel running. Restore on unmount so this never leaks into a
  // real session.
  React.useEffect(() => {
    const prev = isMuted();
    setMuted(true);
    return () => setMuted(prev);
  }, []);

  React.useEffect(() => { handleCommand('testGamePlay'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cycles PLAYS so every possession type shows up in rotation rather than the
  // sim only ever running motion offence. Ref, not state: bumping it must not
  // re-render mid-possession.
  const playCycleRef = React.useRef(0);
  React.useEffect(() => {
    if (!game.playPickState) return;
    const t = setTimeout(() => {
      if (AUTO_PLAY !== 'rotate') return onPickPlay(null);
      const play = PLAYS[playCycleRef.current % PLAYS.length];
      playCycleRef.current += 1;
      onPickPlay(play);
    }, GATE_MS);
    return () => clearTimeout(t);
  }, [game.playPickState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Away possession. Pre-empts useGame's 8250ms auto-dismiss (see GATE_MS).
  React.useEffect(() => {
    if (!game.defensePickState) return;
    const t = setTimeout(() => onPickDefense(null), GATE_MS);
    return () => clearTimeout(t);
  }, [game.defensePickState]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!game.levelUpState) return;
    const t = setTimeout(() => onDismissStatUpgrade(), GATE_MS);
    return () => clearTimeout(t);
  }, [game.levelUpState]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!game.quarterSummary) return;
    const t = setTimeout(() => onDismissQuarterSummary(), GATE_MS);
    return () => clearTimeout(t);
  }, [game.quarterSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loop forever: stopGamePlay first, or testGamePlay rejects with
  // "already running" (it guards on gameLoopActiveRef).
  React.useEffect(() => {
    if (!game.gameOver) return;
    const t = setTimeout(() => {
      handleCommand('stopGamePlay');
      handleCommand('testGamePlay');
    }, RESTART_MS);
    return () => clearTimeout(t);
  }, [game.gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => () => handleCommand('stopGamePlay'), []); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(game.time / 60)).padStart(2, '0');
  const ss = String(game.time % 60).padStart(2, '0');
  const scoreline = `${HOME_TEAM.name} ${game.homeScore}-${game.awayScore} ${AWAY_TEAM.name}  ${mm}:${ss}`;

  return (
    <Frame cameraX={game.cameraX} scoreline={scoreline}
      overlay={SHOW_MOVE_CARDS
        ? <SpecialMoveCards players={game.players} cameraX={0} cy={SPLASH_CARD_CY} withTestIds />
        : null}>
      <CourtLayer players={game.players} shot={game.shot}
        netSwish={game.netSwish} netDunk={game.netDunk} netMiss={game.netMiss}
        playerAlpha={game.playerAlpha} />
    </Frame>
  );
}

// ── Static mode ──────────────────────────────────────────────────────────────
// INITIAL_PLAYERS is the jump-ball formation the sandbox court opens on, so this
// is a faithful still of it. Camera parked with the same clamp useGame uses at
// mount: carrier (players[0], home PG) centred in the 408 window.
function SplashCourtStatic() {
  const players = React.useMemo(() => INITIAL_PLAYERS.map(p => ({ ...p })), []);
  const cameraX = Math.max(0, Math.min(W - ZOOM_W, players[0].cx - ZOOM_W / 2));
  const zero = { left: 0, right: 0 };
  return (
    <Frame cameraX={cameraX} scoreline={`${HOME_TEAM.name} VS ${AWAY_TEAM.name}`}>
      <CourtLayer players={players} shot={null}
        netSwish={zero} netDunk={zero} netMiss={zero} playerAlpha={1} />
    </Frame>
  );
}

export function SplashCourt() {
  return ATTRACT === 'live' ? <SplashCourtLive /> : <SplashCourtStatic />;
}

import React from 'react';
import {
  W, ZOOM_W, TOTAL_H, TOP_BAR, BOT_BAR, INITIAL_PLAYERS,
  JERSEY_HOME, JERSEY_AWAY, resolvePalette,
} from '../constants.js';
import OPPONENTS from '../opponents.json';
import { withDerivedPalette } from '../teamPalette.js';
import { rollAbilities } from '../abilityRoll.js';
import { useGame } from '../useGame.js';
import { setAudioSuspended } from '../sound/audioSettings.js';
import { Court } from './Court.jsx';
import { Player } from './Player.jsx';
import { Ball } from './Ball.jsx';
import { ShotBall } from './ShotBall.jsx';
import { SpecialPassBall } from './SpecialPassBall.jsx';
import { Shadow } from './Shadow.jsx';
import { PixelText, PixelTextC } from './PixelText.jsx';
import { SpecialMoveCards } from './SpecialMoveCards.jsx';
import { PLAYS, PlayPickerOverlay } from './PlayPickerOverlay.jsx';
import { DEFENSES, DefensePickerOverlay } from './DefensePickerOverlay.jsx';
import { SplashChallengeAd } from './SplashChallengeAd.jsx';
import { ScorePopup } from './ScorePopup.jsx';
import { HypePopup } from './HypePopup.jsx';
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
//              `testGamePlayHome` command — the actual match loop (possessions,
//              shots, nets, clock), same as the sandbox court, but opening on a
//              home half-court possession instead of the tip-off. Muted, and the
//              human-input gates are auto-answered (below).
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
// Most of these gates exist so a PLAYER can choose. Nothing in a feed tile can
// choose, so time spent on one is just the court standing still — the clock is
// stopped and the possession parked. Those answer immediately.
//
// This now applies only to the LEVEL-UP and QUARTER-SUMMARY gates. The defense
// picker used to be answered here too (an unrendered 8250ms auto-dismiss read as
// the court freezing every away possession), but it has its own overlay and
// dwell now — see DEF_GATE_MS.
//
// Residual pause is NOT zero: useGame defers its own continuations by 300ms
// (onPickPlay) and 100ms (onPickDefense). Those are the real game's animation
// beats and are deliberately left alone.
export const GATE_MS = 0;

// ── PLAY_GATE_MS ─────────────────────────────────────────────────────────────
// The PLAY picker is the exception, and it is the one gate the tile WANTS to
// dwell on: "call a play" is the game's signature decision, so the tile shows
// the three real cards for a beat before answering, the way a player would see
// them. This is only worth doing because PlayPickerOverlay is now actually
// mounted below — a dwell without the overlay is just a frozen court.
//
// Note this is a dwell on top of the panel's own entrance animation: the cards
// stagger in over ~14 rAF ticks each, so the full row is only settled ~600ms in.
export const PLAY_GATE_MS = 3000;

// ── SELECT_FLASH_MS ──────────────────────────────────────────────────────────
// After the dwell, the tile does NOT resolve the play instantly — it marks the
// rotated card as chosen (lift + blink, siblings dimmed) and holds that for a
// beat so the choice is visible. Without this the panel simply vanishes and the
// tile never shows WHICH play was called, which is the whole point of showing
// three cards.
//
// This is additive to the dwell: a home possession now spends
// PLAY_GATE_MS + SELECT_FLASH_MS on the panel. ~4 blink half-cycles at 7.5Hz.
export const SELECT_FLASH_MS = 700;

// ── DEF_GATE_MS ──────────────────────────────────────────────────────────────
// The defense picker gets the same treatment as the play picker now that
// DefensePickerOverlay is actually mounted below. It was previously answered at
// GATE_MS (0) precisely BECAUSE nothing was drawn — 8.25s of frozen court with
// no panel is dead air, but a dwell with the real panel up is a demo of the away
// possession, which is half the game.
//
// Must stay under useGame's own DEFENSE_PICK_MS auto-dismiss (8250ms) or the
// game answers for us mid-flash: 3000 + 700 = 3700ms, comfortable margin. The
// panel's countdown ring is live, so it visibly ticks 8 → 7 → 6 during the
// dwell rather than sitting still.
export const DEF_GATE_MS = 3000;

// ── Picker position / CTA during the dwell ───────────────────────────────────
// The picker is drawn at its REAL in-game position (PlayPickerOverlay hardcodes
// DLG_Y 232, height 116 → y 232..348). It used to be shifted up 68px here to
// keep the CTA at y=304 out from under it, but moving the game's signature panel
// off its real mark to protect a label is the wrong trade — the whole point of
// the dwell is that the tile shows the cards where a player sees them.
//
// So the CTA yields instead of the cards. Painting it ON TOP of the panel was
// tried first and looked worse than the original overlap: "TAP TO DRAFT" lands
// straight across the cards' own body text ("Motion Offense", "1-on-1 Matchup",
// "SELECT"), and its backing plate reads as a smear over the middle card.
// Hiding it for the 3s dwell is the only option where nothing moves and nothing
// collides — the cards carry their own SELECT affordance while they are up, and
// the CTA is back for the rest of the loop.

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
const CTA   = 'TAP TO DRAFT';

// ── AD_MARGIN / AD_Y — placement of the shared CHALLENGE OTHER REDDITORS! ad ─
// Passed explicitly rather than changed in SplashChallengeAd's defaults: the
// 'classic' splash mounts the same component with no props and is NOT moving,
// so the defaults stay where classic wants them and the court variant overrides.
//
// THE MARGIN IS IN CLIENT PIXELS FROM THE VISIBLE LEFT EDGE, not viewBox units,
// and the ad measures the container to hit it — see SplashChallengeAd's
// edgeMargin. This is not over-engineering; a viewBox constant genuinely cannot
// express the requirement. The inline <svg> is xMidYMid meet and the splash
// deliberately bleeds its backdrop and court PAST the viewBox so a wide tile
// reads as more court instead of black bars. Consequence: on a height-limited
// container (measured: 674x471 → scale 1.3534, content 552 wide) about 61px of
// field is drawn OUTSIDE the viewBox on each side, so viewBox x=0 sits 61px in
// from what the eye reads as the edge, and the ad's old x=15 looked like 82px.
// On a width-limited container (374x758) the opposite holds: viewBox x=0 IS the
// visible edge and anything negative is clipped. One constant cannot be 20px on
// both — hence the measurement.
//
// AD_X remains the FALLBACK for when getScreenCTM is unavailable (JSDOM, a
// detached tree). It is expressed the old way — a viewport-unit margin divided
// back out of the group's 1.25 scale, plus the 0.75 half-stroke so the number
// positioned is the border's visible OUTER edge — and is deliberately the same
// 20, so the unmeasured path lands within a couple of px of the measured one on
// a phone-shaped tile rather than jumping somewhere unrelated.
const AD_SCALE  = 1.25;
const AD_MARGIN = 20;                                  // CLIENT px, visible left edge → border outer edge
const AD_X = AD_MARGIN / AD_SCALE + 0.75;              // 16.75 local — fallback only
const AD_Y = 24;

// ── DEMO badge ───────────────────────────────────────────────────────────────
// Badge marking the tile as an attract loop rather than a live game. Sized to
// match the picker's own "CALL A PLAY" header — scale 1 — so it reads as a label
// belonging to the panel rather than a second title.
//
// BACKING PLATE. Semi-transparent (#05080f at 0.62), the same fill Frame's
// plate() uses for the title and CTA, so the court art still reads through it.
// This is NOT Frame's plate(): that one spans y-6 .. y+20 regardless of the text
// it backs, which around a 7px-tall scale-1 word is a box far bigger than its
// contents — the reason the badge had no plate at all until now. This one is
// derived from the outlined ink box plus a fixed pad, so it hugs the word.
//
// LEFT-ALIGNED to the choice panel. Both pickers place their dialog at
// dlgX = cameraX + round((ZOOM_W - DLG_W) / 2), and the splash renders them at
// cameraX 0, so that is 54 for either panel. The PLATE's left edge is what is
// aligned, not the text's — with a backing box present the box edge is the
// visible edge, and aligning the glyphs instead would leave the plate hanging
// 4px into the margin. The text is inset within it by DEMO_PAD_X.
//
// VERTICAL. Sits directly above the choices: both pickers hardcode
// DLG_Y = TOTAL_H - round(TOTAL_H/3) = 232 in VIEWPORT space (not camera space),
// and PlayPickerOverlay draws an outer aura starting 8px above that, so 224 is
// the real top of the choices. DEMO_BOX_Y is derived backwards from that line so
// the PLATE (not the ink) is what clears it by DEMO_GAP.
//
// Ink height is derived from the OUTLINED box, not the glyph cell.
// MONOGRAM_GLYPH_H is 9, but 2 of those rows exist only for descenders (g j p q
// y) and 'DEMO MODE' has none — the caps occupy 7 rows, plus one outline cell
// above and below.
//
// Ink WIDTH drops one cell: MONOGRAM_CELL_W is 6 = 5px glyph + 1px gap, so a
// naive length * CELL_W counts a trailing gap after the final E that is not ink.
// Left in, the word would sit 1px left of centre inside its own plate — which at
// scale 1 is visible.
//
// MOUNTED ONLY WHILE A PICKER IS UP (see Frame's pickerUp). It is a label for
// the choices, so it appears and leaves with them. It carries the picker's OWN
// entrance curve rather than popping — see DEMO_FADE_TICKS.
const DEMO_LABEL   = 'DEMO MODE';
const DEMO_HINT    = '- TAP TO DRAFT YOUR TEAM';                // sits beside the label, same baseline
const DEMO_SCALE   = 1;                                       // == PlayPickerOverlay's 'CALL A PLAY'
const PICKER_W     = 300;                                     // DLG_W — identical in both pickers
const PICKER_X     = Math.round((ZOOM_W - PICKER_W) / 2);     // 54 — dlgX at the splash's cameraX 0
const PICKER_TOP   = TOTAL_H - Math.round(TOTAL_H / 3) - 8;   // 224 — aura, not panel body (232)
const DEMO_CAP_H   = 7;                                       // uppercase ink rows (GLYPH_H 9 incl. descenders)
const DEMO_GAP     = 2;                                       // breathing room above the aura
const DEMO_PAD_X   = 3;                                       // plate inset, left and right of the outline
const DEMO_PAD_Y   = 2;                                       // plate inset, above and below the outline
const DEMO_TEXT_LEN = DEMO_LABEL.length + 1 + DEMO_HINT.length;                      // 34 — incl. joining space
const DEMO_INK_W   = DEMO_TEXT_LEN * MONOGRAM_CELL_W * DEMO_SCALE - DEMO_SCALE;      // 203 — less trailing gap
const DEMO_BOX_W   = DEMO_INK_W + (2 + DEMO_PAD_X * 2) * DEMO_SCALE;                 // 211 — + outline + pad
const DEMO_BOX_H   = (DEMO_CAP_H + 2) * DEMO_SCALE + DEMO_PAD_Y * 2;                 // 13
const DEMO_BOX_Y   = PICKER_TOP - DEMO_GAP - DEMO_BOX_H;                             // 209 — plate 209..222
const DEMO_X       = PICKER_X + (DEMO_PAD_X + 1) * DEMO_SCALE;                       // 58 — ink left (outline 57)
const DEMO_Y       = DEMO_BOX_Y + (DEMO_PAD_Y + 1) * DEMO_SCALE;                     // 212 — ink 212..219
// The hint is a SECOND PixelText, not a longer string, so the existing
// [data-text='DEMO MODE'] selector keeps resolving to the label alone. Offsetting
// by whole cells (label + one space) puts it on exactly the grid a single
// combined string would have produced — pixelTextPixels lays every glyph out at
// charX = x + ci * CELL_W * scale, so a whole-cell offset is bit-identical.
const DEMO_HINT_X  = DEMO_X + (DEMO_LABEL.length + 1) * MONOGRAM_CELL_W * DEMO_SCALE; // 118
const DEMO_LABEL_FILL    = '#e8e8e8';
// Hint is the SAME white as the label -- aliased, not repeated, so the two runs
// cannot drift apart into a two-tone bar. Note #e8e8e8 is this splash's white
// (the scoreline uses it too), not pure #ffffff: at scale 1 over the court art
// pure white reads hotter than the yellow title it sits under.
const DEMO_HINT_FILL     = DEMO_LABEL_FILL;
const DEMO_PLATE_FILL    = '#05080f';                         // == Frame's plate()
const DEMO_PLATE_OPACITY = 0.62;
// Both pickers fade their whole <g> in over `min(tick / 12, 1)` rAF ticks and
// then unmount hard with no exit animation. The badge copies that exactly, so
// it arrives with the panel instead of snapping in a frame ahead of it. The
// loop stops once settled — this runs on every possession and there is no
// reason to hold a rAF open for the remaining ~3.5s of the dwell.
const DEMO_FADE_TICKS = 12;

function DemoBadge() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let raf, n = 0;
    const loop = () => {
      n += 1;
      setTick(n);
      if (n < DEMO_FADE_TICKS) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const fadeIn = Math.min(tick / DEMO_FADE_TICKS, 1);
  return (
    <g data-testid="splash-demo-mode" data-fade={fadeIn === 1 ? '1' : '0'} opacity={fadeIn}>
      <rect data-testid="splash-demo-plate"
        x={PICKER_X} y={DEMO_BOX_Y} width={DEMO_BOX_W} height={DEMO_BOX_H} rx={2}
        fill={DEMO_PLATE_FILL} opacity={DEMO_PLATE_OPACITY} shapeRendering="crispEdges" />
      <PixelText text={DEMO_LABEL} x={DEMO_X} y={DEMO_Y} scale={DEMO_SCALE}
        fill={DEMO_LABEL_FILL} outline="#0a1828" />
      <PixelText text={DEMO_HINT} x={DEMO_HINT_X} y={DEMO_Y} scale={DEMO_SCALE}
        fill={DEMO_HINT_FILL} outline="#0a1828" />
    </g>
  );
}

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
//
// scorePopup / hypePopup — mirrors GameScene's own score-celebration text
// ("2 POINTS", "BOOMSHAKALAKA", ...). useGame() computes both regardless of who
// mounts it, so the attract loop already HAS them; GameScene was simply the
// only renderer wired up. Rendered here (screen space, cameraX FIXED AT 0, not
// game.cameraX) rather than inside the camera-following `children` group:
// ScorePopup/HypePopup each self-center as `cameraX + (viewW - textW) / 2`,
// which is only correct when the coordinate system they're placed in has its
// origin at the visible viewport's left edge. In GameScene that's true because
// the <svg>'s OWN viewBox is `${cameraX} 0 ...` (the camera IS the viewBox
// origin), so passing the same cameraX re-derives "centered on screen". Here
// the outer <svg> (App.jsx) has a fixed viewBox `0 0 ZOOM_W TOTAL_H` and it is
// the INNER `children` group that carries `translate(-cameraX, 0)` — so the
// screen-space origin this Frame renders everything else in (title, CTA, ad,
// demo badge) is already 0, and that's what centers the popups on the visible
// tile instead of on the (currently off-screen) world origin.
//
// Ordered identically to GameScene: score/hype text paints AFTER the court
// (so it's never hidden under a player) but BEFORE the overlay's special-move
// cards, matching GameScene mounting SpecialMoveCards after its own popups —
// on a DUNK MASTER dunk the card and "BOOMSHAKALAKA" can occupy overlapping
// vertical space (pre-existing in the real game too: CARD_CY 74 spans 9..139,
// HypePopup's band is 98..134 at max scale), and this keeps the card on top
// exactly like the game it's mirroring.
function Frame({ cameraX, scoreline, overlay, pickerUp = false, scorePopup = null, hypePopup = null, children }) {
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

  const cta = (
    <g data-testid="splash-cta">
      {plate(CTA, 2, layout.ctaY, true)}
      <g opacity={pulse}>
        <PixelTextC text={CTA} cx={ZOOM_W / 2} y={layout.ctaY} scale={2}
          fill="#7ee0ff" outline="#0a1828" thick />
      </g>
    </g>
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

      {/* Score-celebration text — screen space, cameraX fixed at 0 (see the
          function comment above for why 0 and not game.cameraX). */}
      {scorePopup && <ScorePopup text={scorePopup} cameraX={0} viewW={ZOOM_W} />}
      {hypePopup && <HypePopup key={hypePopup.id} text={hypePopup.text} color={hypePopup.color} variant={hypePopup.variant} cameraX={0} viewW={ZOOM_W} />}

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

      {/* Mini-ad, shared verbatim with the 'classic' splash. Screen space: it
          must NOT go in the camera group above or it slides off with the
          court. Anchored AD_MARGIN client px inside the real left edge, which
          is NOT a fixed viewBox x — see AD_MARGIN / AD_Y. */}
      <SplashChallengeAd frameX={AD_X} frameY={AD_Y} scale={AD_SCALE} edgeMargin={AD_MARGIN} />

      {/* Demo-mode badge — labels the choices, so it lives and dies with the
          picker panel rather than being always-on. See DEMO_Y. */}
      {pickerUp && <DemoBadge />}

      {/* Suppressed entirely while the play picker is up — see the note up top. */}
      {!pickerUp && cta}

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
//                       auto-dismiss (DEFENSE_PICK_MS = 8250ms), so this one
//                       can't deadlock. DefensePickerOverlay is mounted below and
//                       answered on DEF_GATE_MS + SELECT_FLASH_MS (3700ms) with a
//                       rotated pick from the real DEFENSES table — well inside
//                       the auto-dismiss, so the game never answers over us.
function SplashCourtLive() {
  const game = useGame({ homeRoster: HOME_ROSTER, awayRoster: AWAY_ROSTER, isFtue: false });
  const { handleCommand, onPickPlay, onPickDefense, onDismissStatUpgrade, onDismissQuarterSummary } = game;

  // Suspend ALL audio for the lifetime of the inline splash — see
  // audioSettings.setAudioSuspended. Two reasons this is suspend and not mute:
  //
  //  1. Bytes. This is a real sim: testGamePlay calls bgMusic.start()
  //     immediately, and the possessions below call playLeap/playJumpball/etc.
  //     as they play out. Muting set volume 0 but still constructed each Audio,
  //     so the feed post fetched the files anyway. Suspend returns before
  //     construction, so a feed post fetches zero audio.
  //  2. Correctness. Mute could be clobbered: user.init resolves after mount
  //     and calls setMuted(user.muted), which unmutes the splash again for
  //     anyone whose saved preference is unmuted. Suspend is owned by this
  //     view, so init can't touch it.
  //
  // Released on unmount (a tap expanding the post) so the real session has
  // sound, at whatever mute setting the user actually saved.
  React.useEffect(() => {
    setAudioSuspended(true);
    return () => setAudioSuspended(false);
  }, []);

  React.useEffect(() => { handleCommand('testGamePlayHome'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cycles PLAYS so every possession type shows up in rotation rather than the
  // sim only ever running motion offence. Ref, not state: bumping it must not
  // re-render mid-possession.
  const playCycleRef = React.useRef(0);
  // Which card is shown as chosen during SELECT_FLASH_MS. null = still deciding.
  const [selectedPlayId, setSelectedPlayId] = React.useState(null);
  React.useEffect(() => {
    if (!game.playPickState) { setSelectedPlayId(null); return; }
    if (AUTO_PLAY !== 'rotate') {
      const t = setTimeout(() => onPickPlay(null), PLAY_GATE_MS);
      return () => clearTimeout(t);
    }
    const play = PLAYS[playCycleRef.current % PLAYS.length];
    // Phase 1: dwell on all three cards. Phase 2: mark the pick and hold.
    const t1 = setTimeout(() => setSelectedPlayId(play.id), PLAY_GATE_MS);
    const t2 = setTimeout(() => {
      playCycleRef.current += 1;
      onPickPlay(play);
    }, PLAY_GATE_MS + SELECT_FLASH_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [game.playPickState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Away possession — same dwell + selection flash as the play picker.
  // Cycles the real DEFENSES table so all three show up in rotation.
  const defCycleRef = React.useRef(0);
  const [selectedDefenseId, setSelectedDefenseId] = React.useState(null);
  React.useEffect(() => {
    if (!game.defensePickState) { setSelectedDefenseId(null); return; }
    const def = DEFENSES[defCycleRef.current % DEFENSES.length];
    const t1 = setTimeout(() => setSelectedDefenseId(def.id), DEF_GATE_MS);
    const t2 = setTimeout(() => {
      defCycleRef.current += 1;
      onPickDefense(def);
    }, DEF_GATE_MS + SELECT_FLASH_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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

  // Loop forever: stopGamePlay first, or testGamePlayHome rejects with
  // "already running" (it guards on gameLoopActiveRef).
  React.useEffect(() => {
    if (!game.gameOver) return;
    const t = setTimeout(() => {
      handleCommand('stopGamePlay');
      handleCommand('testGamePlayHome');
    }, RESTART_MS);
    return () => clearTimeout(t);
  }, [game.gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => () => handleCommand('stopGamePlay'), []); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(game.time / 60)).padStart(2, '0');
  const ss = String(game.time % 60).padStart(2, '0');
  const scoreline = `${HOME_TEAM.name} ${game.homeScore}-${game.awayScore} ${AWAY_TEAM.name}  ${mm}:${ss}`;

  return (
    <Frame cameraX={game.cameraX} scoreline={scoreline}
      pickerUp={!!game.playPickState || !!game.defensePickState}
      scorePopup={game.scorePopup} hypePopup={game.hypePopup}
      overlay={<>
        {/* The real picker, purely as a display. pointerEvents:none matters:
            App.jsx puts onClick={tryExpand} on the whole inline container, and
            PlayCard carries its own onClick — without this a tap on a card
            would also resolve the play early, out of the rotation. */}
        {game.playPickState && (
          <g data-testid="splash-play-picker" style={{ pointerEvents: 'none' }}>
            <PlayPickerOverlay cameraX={0} onPick={() => {}} disabledPlayId={null}
              selectedPlayId={selectedPlayId} />
          </g>
        )}
        {game.defensePickState && (
          <g data-testid="splash-defense-picker" style={{ pointerEvents: 'none' }}>
            <DefensePickerOverlay cameraX={0} onPick={() => {}}
              selectedDefenseId={selectedDefenseId} />
          </g>
        )}
        {SHOW_MOVE_CARDS &&
          <SpecialMoveCards players={game.players} cameraX={0} cy={SPLASH_CARD_CY} withTestIds />}
      </>}>
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

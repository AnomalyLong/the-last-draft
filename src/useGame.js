import { useRef, useState, useEffect } from 'react';
import { gridToSvg, svgToGrid, INITIAL_PLAYERS, SHOOT_TARGET_LEFT, SHOOT_TARGET_RIGHT, W, ZOOM_W, PLAYER_SPEED_FT_S, C_BOOST_SECS, BASKET_RIGHT_GX, BASKET_LEFT_GX, BASKET_GY, OFFENSE_RADIUS_FT, SHOOT_JUMP_OFFSETS, QUARTER_END_ALPHA, XP_FOR_LEVEL, MAX_LEVEL, STEAL_RATE, DUNK_RATE, BLOCK_RATE,
  MISS_REBOUND_MIN_FT, MISS_REBOUND_MAX_FT,
  BLOCK_REBOUND_MIN_FT, BLOCK_REBOUND_MAX_FT, JUMP_BALL_FORMATION } from './constants.js';
import { SHOOT_CHAR_FRAMES } from './sprites/index.js';
import { ABILITIES } from './abilities.js';
import { playShot, playMiss, playDunk, playJumpball, playPass, playLeap, playQuarter, playSwish, playLevelUp, playFanfare, playBlock, bounceBall, bgMusic } from './sound/basketball.js';

// ─── Half-court formation positions ─────────────────────────────────────────
// Mirrors the positions used by triggerThrowInHome / triggerThrowInAway.
// Used by setupOffense to spread players out before re-starting the loop.
const HOME_FORMATION = [
  { id: 1, gx: 62, gy: 25 }, { id: 2, gx: 70, gy: 12 }, { id: 3, gx: 70, gy: 38 },
  { id: 4, gx: 80, gy: 18 }, { id: 5, gx: 82, gy: 25 },
  { id: 6, gx: 68, gy: 25 }, { id: 7, gx: 73, gy: 11 }, { id: 8, gx: 73, gy: 39 },
  { id: 9, gx: 82, gy: 17 }, { id: 10, gx: 84, gy: 24 },
];
const AWAY_FORMATION = [
  { id: 1, gx: 26, gy: 25 }, { id: 2, gx: 21, gy: 12 }, { id: 3, gx: 21, gy: 38 },
  { id: 4, gx: 12, gy: 18 }, { id: 5, gx: 10, gy: 25 },
  { id: 6, gx: 32, gy: 25 }, { id: 7, gx: 24, gy: 12 }, { id: 8, gx: 24, gy: 38 },
  { id: 9, gx: 14, gy: 18 }, { id: 10, gx: 12, gy: 25 },
];

// Total time (ms) for the shoot character animation — ball launches at the midpoint
const SHOOT_DURATION = SHOOT_CHAR_FRAMES.length * 80; // 560ms


function pickLevelUpChoices(gamePlayer, rosterRef, abilityOverridesRef) {
  const owned = new Set();
  if (gamePlayer && rosterRef && abilityOverridesRef) {
    const roster = gamePlayer.team === 'home' ? rosterRef.current.home : rosterRef.current.away;
    const rp = roster?.find(r => (r.role ?? r.pos) === gamePlayer.role);
    if (rp?.ability?.name) owned.add(rp.ability.name);
    const extras = abilityOverridesRef.current.get(gamePlayer.id) ?? [];
    extras.forEach(a => owned.add(a.name));
  }
  const available = ABILITIES.filter(a => !owned.has(a.name));
  return [...available].sort(() => Math.random() - 0.5).slice(0, 3);
}

// Returns updated player fields after applying XP gain. Handles level-up carry-over.
// Stops at MAX_LEVEL. Returns { level, xp, xpMax, didLevelUp }.
function applyXp(player, amount) {
  if (player.level >= MAX_LEVEL) return { level: player.level, xp: player.xp, xpMax: player.xpMax, didLevelUp: false };
  let { level, xp, xpMax } = player;
  xp += amount;
  let didLevelUp = false;
  while (xp >= xpMax && level < MAX_LEVEL) {
    xp -= xpMax;
    level += 1;
    xpMax = XP_FOR_LEVEL(level);
    didLevelUp = true;
  }
  return { level, xp, xpMax, didLevelUp };
}

export function useGame({ homeRoster = [], awayRoster = [] } = {}) {
  const [players, setPlayers] = useState(() => INITIAL_PLAYERS.map(p => ({ ...p })));
  const [shot, setShot] = useState(null);
  const [logs, setLogs] = useState([
    { type: 'out', text: 'debug console ready' },
    { type: 'out', text: 'type help for commands' },
  ]);

  // ─── Game State ────────────────────────────────────────────────────────────
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [scorePopup, setScorePopup] = useState(null);
  const [quarter, setQuarter] = useState(1);   // 1–4
  const [time, setTime] = useState(60);          // seconds (1-minute quarters)
  const [levelUpState, setLevelUpState] = useState(null); // { player, abilities } | null
  const levelUpPlayerRef = useRef(null); // tracks leveling-up player cx for camera during overlay
  const abilityOverridesRef = useRef(new Map()); // playerId → ability[] (earned via level-up, max 2 extras)
  const [playPickState, setPlayPickState] = useState(false);
  const [xpFlyup, setXpFlyup] = useState(null);
  const xpFlyupIdRef = useRef(0);
  const [stealFlyup, setStealFlyup] = useState(null);
  const stealFlyupIdRef = useRef(0);
  const [blockFlyup, setBlockFlyup] = useState(null);
  const blockFlyupIdRef = useRef(0);

  // Awards XP to a player by id. Home level-ups pause for player choice;
  // away level-ups apply silently and immediately.
  // flyToCx/flyToCy: scorer's position captured at shot/dunk start — avoids reading
  // stale playersRef after throw-in setPlayers calls have already been batched.
  const awardXp = (playerId, amount, flyToCx = null, flyToCy = null) => {
    const cur = playersRef.current.find(p => p.id === playerId);
    if (cur) {
      const { level, didLevelUp } = applyXp(cur, amount);
      if (didLevelUp) {
        if (cur.team === 'home') {
          gamePausedRef.current = true;
          wanderActiveRef.current = false;
          setTimeout(() => {
            const fresh = playersRef.current.find(p => p.id === playerId);
            stopTimer();
            playLevelUp();
            playFanfare();
            const lvlPlayer = { ...cur, level, cx: fresh?.cx ?? cur.cx, cy: fresh?.cy ?? cur.cy };
            levelUpPlayerRef.current = lvlPlayer;
            setLevelUpState({ player: lvlPlayer, abilities: pickLevelUpChoices(cur, rosterRef, abilityOverridesRef) });
          }, 600);
        } else {
          setTimeout(() => {
            playLevelUp();
            addLog(`${cur.role} (away) → Lv.${level}!`);
          }, 400);
        }
      }
      const basket = cur.team === 'home' ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
      const id = ++xpFlyupIdRef.current;
      setXpFlyup({ id, fromCx: basket.cx, fromCy: basket.cy, toCx: flyToCx ?? cur.cx, toCy: flyToCy ?? cur.cy, amount });
      setTimeout(() => setXpFlyup(prev => prev?.id === id ? null : prev), 1100);
    }
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const { level, xp, xpMax } = applyXp(p, amount);
      return { ...p, level, xp, xpMax };
    }));
  };

  const [quarterAnnouncement, setQuarterAnnouncement] = useState(null);
  const [playerAlpha, setPlayerAlpha] = useState(1);

  // Per-quarter stat counters (refs for closure access)
  const quarterStatsRef = useRef({ home: { shots: 0, dunks: 0, blocks: 0, steals: 0 }, away: { shots: 0, dunks: 0, blocks: 0, steals: 0 } });
  const quarterPointsRef = useRef({ home: 0, away: 0 });
  const homeScoreRef = useRef(0);
  const awayScoreRef = useRef(0);
  const quarterRef = useRef(1);
  const [quarterSummary, setQuarterSummary] = useState(null);
  const [gameOver, setGameOver] = useState(null); // { homeScore, awayScore, totalCredits } | null
  const totalCreditsRef = useRef(0);
  const [totalCredits, setTotalCredits] = useState(0);

  const timerIntervalRef = useRef(null);
  const timerSpeedRef    = useRef(1);

  const startTimer = (speed = 1) => {
    timerSpeedRef.current = speed;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    // Tick every (1000/speed)ms and decrement by 1 each tick
    timerIntervalRef.current = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, Math.round(1000 / speed));
  };

  const stopTimer = () => {
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
  };

  // Tracks who tipped the opening jump ball.
  // Q2 + Q3: opposite team  |  Q4: jump ball winner
  const [jumpBallWinner, setJumpBallWinner] = useState(null); // 'home' | 'away' | null
  const jumpBallWinnerRef = useRef(null);

  // playersRef mirrors players state so animation closures can read the
  // latest positions without capturing a stale closure value.
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { homeScoreRef.current = homeScore; }, [homeScore]);
  useEffect(() => { awayScoreRef.current = awayScore; }, [awayScore]);
  useEffect(() => { quarterRef.current = quarter; }, [quarter]);

  useEffect(() => {
    const carrier = players.find(p => p.hasBall);
    if (carrier?.isMoving) bounceBall.start();
    else bounceBall.stop();
  }, [players]);

  // Shared animation loop — all smoothMoveTo calls register here so one setPlayers
  // call per frame covers all moving players, instead of N separate RAF callbacks.
  const activeAnimsRef = useRef(new Map()); // id → (now) → fields | { _done, ...fields }
  const animCbsRef     = useRef(new Map()); // id → onComplete callback
  const gameRafRef     = useRef(null);
  // Incrementing this cancels all in-flight smoothMoveTo animations (each
  // animation captures the epoch at creation and bails if it has changed).
  const moveEpochRef = useRef(0);

  // Roster data — kept in a ref so animation closures always read latest values.
  const rosterRef = useRef({ home: homeRoster, away: awayRoster });
  useEffect(() => { rosterRef.current = { home: homeRoster, away: awayRoster }; }, [homeRoster, awayRoster]);

  // Cap the log buffer at 30 entries to avoid unbounded growth.
  const addLog = (text, type = 'out') =>
    setLogs(prev => [...prev.slice(-30), { type, text }]);

  // ─── Movement ──────────────────────────────────────────────────────────────

  // Animates a single player from their current SVG position to a grid target.
  // restoreFacingRight lets callers override the final facing direction after
  // the move (e.g. testMoveHome always wants players facing right regardless
  // of which direction they traveled).
  // boostSecs: if finite, player moves at speedMult for that many seconds then
  // drops to normal speed (1×) for the remainder — all in one rAF loop.
  const ensureGameRaf = () => {
    if (gameRafRef.current !== null) return;
    const tick = (now) => {
      const updates   = new Map();
      const toFinish  = [];
      for (const [id, fn] of activeAnimsRef.current) {
        const r = fn(now);
        if (!r) continue;
        if ('_done' in r) {
          const { _done, ...fields } = r;
          if (Object.keys(fields).length) updates.set(id, fields);
          toFinish.push({ id, fire: _done });
        } else {
          updates.set(id, r);
        }
      }
      for (const { id } of toFinish) activeAnimsRef.current.delete(id);
      if (updates.size > 0)
        setPlayers(prev => prev.map(p => { const u = updates.get(p.id); return u ? { ...p, ...u } : p; }));
      for (const { id, fire } of toFinish) {
        const cb = animCbsRef.current.get(id);
        animCbsRef.current.delete(id);
        if (fire && cb) cb();
      }
      gameRafRef.current = activeAnimsRef.current.size > 0 ? requestAnimationFrame(tick) : null;
    };
    gameRafRef.current = requestAnimationFrame(tick);
  };

  const smoothMoveTo = (gridX, gridY, playerId = 1, restoreFacingRight = null, speedMult = 1, onComplete = null, boostSecs = Infinity) => {
    const epoch = moveEpochRef.current;
    const target = gridToSvg(gridX, gridY);
    const p = playersRef.current.find(p => p.id === playerId);
    const startCx = p.cx, startCy = p.cy;
    const movingRight = target.cx >= startCx;
    const finalFacing = restoreFacingRight !== null ? restoreFacingRight : p.facingRight;

    const SVG_PER_FT = 620 / 94;
    const totalDist = Math.sqrt((target.cx - startCx) ** 2 + (target.cy - startCy) ** 2);

    // How far the player travels during the boost window.
    const boostDist = Math.min(totalDist, PLAYER_SPEED_FT_S * speedMult * SVG_PER_FT * boostSecs);
    const frac = totalDist > 0 ? boostDist / totalDist : 0;
    const midCx = startCx + (target.cx - startCx) * frac;
    const midCy = startCy + (target.cy - startCy) * frac;

    // Phase 1: boosted; Phase 2: normal speed for whatever distance remains.
    const phase1Dur = Math.max(100, boostDist / (PLAYER_SPEED_FT_S * speedMult * SVG_PER_FT) * 1000);
    const remainDist = totalDist - boostDist;
    const phase2Dur = remainDist > 0.1 ? Math.max(100, remainDist / (PLAYER_SPEED_FT_S * SVG_PER_FT) * 1000) : 0;

    // Mark player as moving immediately (batches with other sync smoothMoveTo calls in forEach loops)
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isMoving: true, facingRight: movingRight } : p));

    const startTime = performance.now();
    if (onComplete) animCbsRef.current.set(playerId, onComplete);
    else animCbsRef.current.delete(playerId);

    // Overwriting the entry cancels any previous animation for this player
    activeAnimsRef.current.set(playerId, (now) => {
      if (moveEpochRef.current !== epoch || gamePausedRef.current) {
        animCbsRef.current.delete(playerId);
        return { _done: false, isMoving: false };
      }
      const elapsed = now - startTime;
      let cx, cy, done;
      if (elapsed < phase1Dur) {
        const t = elapsed / phase1Dur;
        cx = startCx + (midCx - startCx) * t;
        cy = startCy + (midCy - startCy) * t;
        done = false;
      } else if (phase2Dur > 0) {
        const t = Math.min((elapsed - phase1Dur) / phase2Dur, 1);
        cx = midCx + (target.cx - midCx) * t;
        cy = midCy + (target.cy - midCy) * t;
        done = t >= 1;
      } else {
        cx = target.cx; cy = target.cy; done = true;
      }
      if (!done) return { cx, cy, isMoving: true, facingRight: movingRight };
      return { _done: true, cx: target.cx, cy: target.cy, isMoving: false, facingRight: finalFacing };
    });
    ensureGameRaf();
  };

  // ─── Reusable Game Actions ─────────────────────────────────────────────────
  // These are called by both manual commands and the testGamePlay loop.

  // Drifts all non-shooting players 2–4 grid-ft toward the attacking basket at
  // half speed so the court feels alive while the ball is in the air.
  const driftTowardBasket = (shooterTeam) => {
    const basketGx = shooterTeam === 'home' ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
    playersRef.current
      .filter(p => !p.isShooting && !p.isDunking && !p.isBlocking && !p.isFadingAway)
      .forEach(p => {
        const { x: gx, y: gy } = svgToGrid(p.cx, p.cy);
        const dx = basketGx - gx;
        const dy = BASKET_GY - gy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) return; // already close — don't crowd the paint
        const step = 2 + Math.random() * 2; // 2–4 ft drift
        const s = step / dist;
        const newGx = Math.max(1, Math.min(93, Math.round(gx + dx * s)));
        const newGy = Math.max(2, Math.min(48, Math.round(gy + dy * s)));
        smoothMoveTo(newGx, newGy, p.id, p.facingRight, 0.2); // slow drift ~1s
      });
  };

  // Slowly walks all players off court to their bench sides after the quarter ends,
  // fading them and the ball to QUARTER_END_ALPHA over 1500ms.
  const walkOffCourt = () => {
    playersRef.current.forEach(p => {
      const isHome = p.team === 'home';
      const exitGx = isHome ? 100 : -6;
      const { y: gy } = svgToGrid(p.cx, p.cy);
      smoothMoveTo(exitGx, gy, p.id, isHome, 0.35);
    });
    const fadeDur = 1500;
    const fadeStart = performance.now();
    const fadeAnim = (now) => {
      const t = Math.min((now - fadeStart) / fadeDur, 1);
      setPlayerAlpha(1 + (QUARTER_END_ALPHA - 1) * t);
      if (t < 1) requestAnimationFrame(fadeAnim);
    };
    requestAnimationFrame(fadeAnim);
  };

  // Watches the clock every second; only acts when time hits 0 to trigger end-of-quarter sequence.
  useEffect(() => {
    if (time !== 0 || !gameLoopActiveRef.current || gamePausedRef.current) return;
    gameLoopActiveRef.current = false;
    wanderActiveRef.current = false;
    playQuarter();
    const qAnnouncements = ['', 'END OF 1ST!', 'HALFTIME!', 'END OF 3RD!', 'FINAL BUZZER!'];
    setQuarterAnnouncement(qAnnouncements[quarterRef.current] ?? `Q${quarterRef.current} FINAL!`);
    setTimeout(walkOffCourt, 1200);
    // Show quarter stats screen after players walk off (1200ms delay + 1500ms walk = 2700ms, add 400ms buffer)
    setTimeout(() => {
      const qHome = quarterStatsRef.current.home;
      const winBonus = quarterPointsRef.current.home > quarterPointsRef.current.away ? 500 : 0;
      totalCreditsRef.current += (qHome.shots + qHome.dunks + qHome.blocks + qHome.steals) * 100 + winBonus;
      setTotalCredits(totalCreditsRef.current);
      setQuarterSummary({
        quarter: quarterRef.current,
        home: { ...quarterStatsRef.current.home },
        away: { ...quarterStatsRef.current.away },
        homeScore: homeScoreRef.current,
        awayScore: awayScoreRef.current,
        quarterPoints: { ...quarterPointsRef.current },
        winBonus,
      });
    }, 3100);
  }, [time]);

  // Final-second buzzer beater: whoever has the ball takes an uncontested shot.
  // Beyond the 3-point arc (>24ft from basket) → 10% make chance; inside → player's ACC.
  useEffect(() => {
    if (time !== 1 || !gameLoopActiveRef.current || gamePausedRef.current) return;
    const carrier = playersRef.current.find(
      p => p.hasBall && !p.isShooting && !p.isDunking && !p.isFadingAway
    );
    if (!carrier) return;

    moveEpochRef.current += 1; // cancel any in-progress smoothMoveTo
    wanderActiveRef.current = false;

    const basketGx = carrier.team === 'home' ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
    const { x: gx, y: gy } = svgToGrid(carrier.cx, carrier.cy);
    const dist = Math.sqrt((basketGx - gx) ** 2 + (BASKET_GY - gy) ** 2);
    const isBeyondArc = dist > OFFENSE_RADIUS_FT;

    const makeChance = isBeyondArc ? 10 : getShooterAcc(carrier);
    const isMake = Math.random() * 100 < makeChance;

    addLog(isBeyondArc ? 'BUZZER BEATER 3!' : 'BUZZER BEATER!');
    if (isMake) {
      triggerShoot(null, null, true); // skipBlock=true, no game-loop callback
    } else {
      triggerShootFail(null, true);   // skipBlock=true, no game-loop callback
    }
  }, [time]);

  // Passes from the current ball carrier to a random teammate.
  const triggerPass = (onComplete = null, onSteal = null) => {
    const passer = playersRef.current.find(p => p.hasBall);
    if (!passer) { if (onComplete) onComplete(); return; }

    const teammates = playersRef.current.filter(p => p.team === passer.team && p.id !== passer.id);
    const receiver = teammates[Math.floor(Math.random() * teammates.length)];

    // Steal chance — pick the closest opponent to the receiver upfront, then roll
    // PICK POCKET ability adds +10% steal rate for that defender
    const stealerId = (() => {
      const opponents = playersRef.current.filter(p => p.team !== passer.team);
      const closest = opponents.reduce((best, p) => {
        const d = Math.hypot(p.cx - receiver.cx, p.cy - receiver.cy);
        return !best || d < Math.hypot(best.cx - receiver.cx, best.cy - receiver.cy) ? p : best;
      }, null);
      if (!closest) return null;
      const rate = STEAL_RATE + (hasAbility(closest, 'PICK POCKET') ? 0.10 : 0);
      return Math.random() < rate ? closest.id : null;
    })();

    const startCx = passer.cx, startCy = passer.cy;
    const duration = 300;
    //Play maker ability increases chance of scoring
    const isSpecialPass = hasAbility(passer, 'PLAY MAKER');

    playersRef.current = playersRef.current.map(p => p.id === passer.id ? { ...p, hasBall: false } : p);
    setPlayers(prev => prev.map(p => p.id === passer.id ? { ...p, hasBall: false } : p));

    playPass(); setShot({ cx: startCx, cy: startCy, isSpecialPass });

    const startTime = performance.now();
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const cx = startCx + (receiver.cx - startCx) * t;
      const cy = startCy + (receiver.cy - startCy) * t - 12 * Math.sin(t * Math.PI);
      setShot({ cx, cy, isSpecialPass });
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setShot(null);
        // Ball reaches receiver
        playersRef.current = playersRef.current.map(p => p.id === receiver.id ? { ...p, hasBall: true } : p);
        setPlayers(prev => prev.map(p => p.id === receiver.id ? { ...p, hasBall: true } : p));

        if (stealerId) {
          const stealer = playersRef.current.find(p => p.id === stealerId);
          if (!stealer) { addLog(`${passer.role} → ${receiver.role}`); if (onComplete) onComplete(); return; }

          addLog(`STEAL! ${stealer.team.toUpperCase()} ${stealer.role} strips ${receiver.role}!`);
          quarterStatsRef.current[stealer.team].steals += 1;
          playLeap();
          wanderActiveRef.current = false; // stop guard/wander loops so they don't snap the stealer back

          // Dash target: mirror stealer through receiver — receiver + (receiver - stealer)
          const { x: recGx, y: recGy } = svgToGrid(receiver.cx, receiver.cy);
          const { x: stealerGx, y: stealerGy } = svgToGrid(stealer.cx, stealer.cy);
          const dashGx = Math.max(1, Math.min(93, 2 * recGx - stealerGx));
          const dashGy = Math.max(2, Math.min(48, 2 * recGy - stealerGy));
          const { cx: toDashCx, cy: toDashCy } = gridToSvg(dashGx, dashGy);

          // "STEAL!" flyup: green for home steal, red for away steal
          const sfId = ++stealFlyupIdRef.current;
          const sfColor = stealer.team === 'home' ? '#00FF44' : '#FF3344';
          setStealFlyup({ id: sfId, fromCx: receiver.cx, fromCy: receiver.cy, toCx: toDashCx, toCy: toDashCy, color: sfColor });
          setTimeout(() => setStealFlyup(prev => prev?.id === sfId ? null : prev), 1100);

          // Transfer ball, start steal animation
          const stealerHasPickPocket = hasAbility(stealer, 'PICK POCKET');
          playersRef.current = playersRef.current.map(p => {
            if (p.id === receiver.id) return { ...p, hasBall: false };
            if (p.id === stealerId)   return { ...p, hasBall: true, isStealing: !stealerHasPickPocket, isPickPocketing: stealerHasPickPocket };
            return p;
          });
          setPlayers(prev => prev.map(p => {
            if (p.id === receiver.id) return { ...p, hasBall: false };
            if (p.id === stealerId)   return { ...p, hasBall: true, isStealing: !stealerHasPickPocket, isPickPocketing: stealerHasPickPocket };
            return p;
          }));

          // Two-phase timed dash: reach receiver exactly at frame 6 (100ms), finish at 180ms
          // Phase 1: stealer → receiver (0–100ms), Phase 2: receiver → dashPos (100–180ms)
          const CONTACT_MS = 5 * 20; // frame 6 is index 5 at 20ms/frame
          const DASH_END_MS = 9 * 20;
          const fromCx = stealer.cx, fromCy = stealer.cy;
          const midCx = receiver.cx, midCy = receiver.cy;
          const movingRight = toDashCx >= fromCx;
          setPlayers(prev => prev.map(p => p.id === stealerId ? { ...p, isMoving: true, facingRight: movingRight } : p));
          const dashStart = performance.now();
          const dashAnim = (now) => {
            if (gamePausedRef.current) return;
            const elapsed = now - dashStart;
            let cx, cy, done;
            if (elapsed < CONTACT_MS) {
              const t = elapsed / CONTACT_MS;
              cx = fromCx + (midCx - fromCx) * t;
              cy = fromCy + (midCy - fromCy) * t;
              done = false;
            } else if (elapsed < DASH_END_MS) {
              const t = (elapsed - CONTACT_MS) / (DASH_END_MS - CONTACT_MS);
              cx = midCx + (toDashCx - midCx) * t;
              cy = midCy + (toDashCy - midCy) * t;
              done = false;
            } else {
              cx = toDashCx; cy = toDashCy; done = true;
            }
            if (!done) {
              setPlayers(prev => prev.map(p => p.id === stealerId ? { ...p, cx, cy } : p));
              requestAnimationFrame(dashAnim);
            } else {
              setPlayers(prev => prev.map(p => p.id === stealerId ? { ...p, cx: toDashCx, cy: toDashCy, isMoving: false } : p));
            }
          };
          requestAnimationFrame(dashAnim);

          // Clear steal pose after 9 frames × 20ms, then both teams move into position for 2s
          setTimeout(() => {
            playersRef.current = playersRef.current.map(p =>
              p.id === stealerId ? { ...p, isStealing: false, isPickPocketing: false } : p
            );
            setPlayers(prev => prev.map(p =>
              p.id === stealerId ? { ...p, isStealing: false, isPickPocketing: false } : p
            ));
            // Cancel all competing smoothMoveTo loops before starting formation movement.
            // This prevents old wander/guard rAF callbacks from fighting the new positions.
            moveEpochRef.current += 1;
            const isHome = stealer.team === 'home';

            const runAfterDash = () => {
              // Re-read stealer position so fast break check uses post-dash coordinates.
              const stealerCurrent = playersRef.current.find(p => p.id === stealerId);
              const laneClear = stealerCurrent && !playersRef.current.some(p => {
                if (p.team === stealer.team) return false;
                const ahead = isHome ? p.cx > stealerCurrent.cx : p.cx < stealerCurrent.cx;
                return ahead && Math.abs(p.cy - stealerCurrent.cy) < 50;
              });
              if (laneClear) {
                addLog('FAST BREAK!');
                setupOffense(stealer.team);
                triggerDunk(() => {
                  if (!gameLoopActiveRef.current) return;
                  const resumeFastBreak = () => {
                    if (!gameLoopActiveRef.current) return;
                    if (gamePausedRef.current) { resumeAfterPauseRef.current = resumeFastBreak; return; }
                    if (isHome) triggerThrowInAway(() => loopAwayRef.current?.());
                    else triggerThrowInHome(() => loopHomeRef.current?.());
                  };
                  resumeFastBreak();
                }, 1.25);
              } else {
                // Give ball directly to PG and move both teams into formation.
                // Loop fires as soon as the PG arrives — zero idle gap.
                const pgId = stealer.team === 'home' ? 1 : 6;
                playersRef.current = playersRef.current.map(p => ({
                  ...p, hasBall: p.id === pgId,
                }));
                setPlayers(prev => prev.map(p => ({ ...p, hasBall: p.id === pgId })));
                setupOffense(stealer.team, () => {
                  if (!gameLoopActiveRef.current || gamePausedRef.current) return;
                  if (onSteal) onSteal(stealer.team);
                });
              }
            };

            // If stealer has SPEEDY, burst toward basket with isDashing before repositioning.
            const stealerNow = playersRef.current.find(p => p.id === stealerId);
            if (hasAbility(stealer, 'SPEEDY') && stealerNow) {
              const { x: sGx, y: sGy } = svgToGrid(stealerNow.cx, stealerNow.cy);
              const basketGx = isHome ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
              const dx = basketGx - sGx, dy = BASKET_GY - sGy;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 3) {
                const s = Math.min(6, dist) / dist;
                const burstGx = Math.round(Math.max(2, Math.min(92, sGx + dx * s)));
                const burstGy = Math.round(Math.max(2, Math.min(48, sGy + dy * s)));
                addLog(`SPEED BURST! ${stealer.role} breaks away!`);
                playersRef.current = playersRef.current.map(p => p.id === stealerId ? { ...p, isDashing: true } : p);
                setPlayers(prev => prev.map(p => p.id === stealerId ? { ...p, isDashing: true } : p));
                setTimeout(() => {
                  playersRef.current = playersRef.current.map(p => p.id === stealerId ? { ...p, isDashing: false } : p);
                  setPlayers(prev => prev.map(p => p.id === stealerId ? { ...p, isDashing: false } : p));
                }, 960);
                smoothMoveTo(burstGx, burstGy, stealerId, null, 3, runAfterDash);
                return;
              }
            }
            runAfterDash();
          }, 9 * 20);
        } else {
          addLog(`${passer.role} → ${receiver.role}`);
          if (hasAbility(receiver, 'SPEEDY')) {
            const rNow = playersRef.current.find(p => p.id === receiver.id);
            if (rNow) {
              const { x: rxGx, y: rxGy } = svgToGrid(rNow.cx, rNow.cy);
              const basketGx = receiver.team === 'home' ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
              const dx = basketGx - rxGx, dy = BASKET_GY - rxGy;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 3) {
                const s = Math.min(6, dist) / dist;
                const burstGx = Math.round(Math.max(2, Math.min(92, rxGx + dx * s)));
                const burstGy = Math.round(Math.max(2, Math.min(48, rxGy + dy * s)));
                addLog(`SPEED BURST! ${receiver.role} jets!`);
                playersRef.current = playersRef.current.map(p => p.id === receiver.id ? { ...p, isDashing: true } : p);
                setPlayers(prev => prev.map(p => p.id === receiver.id ? { ...p, isDashing: true } : p));
                setTimeout(() => {
                  playersRef.current = playersRef.current.map(p => p.id === receiver.id ? { ...p, isDashing: false } : p);
                  setPlayers(prev => prev.map(p => p.id === receiver.id ? { ...p, isDashing: false } : p));
                }, 960);
                smoothMoveTo(burstGx, burstGy, receiver.id, null, 3, () => {
                  if (onComplete && gameLoopActiveRef.current && !gamePausedRef.current) onComplete();
                });
                return;
              }
            }
          }
          if (onComplete && gameLoopActiveRef.current && !gamePausedRef.current) onComplete();
        }
      }
    };
    requestAnimationFrame(animate);
  };

  // Runs 1–3 random passes then waits 1.5s before calling onComplete.
  // Used by the game loop so players settle into position before shooting.
  const triggerPreShoot = (onComplete = null, onSteal = null) => {
    let remaining = Math.floor(Math.random() * 3) + 1;
    const doPass = () => {
      remaining--;
      triggerPass(() => {
        if (remaining > 0) {
          // 1–3s random gap between passes
          setTimeout(doPass, 100 + Math.random() * 2900);
        } else {
          // all passes done — 1.5s settle before shoot
          setTimeout(() => { if (onComplete) onComplete(); }, 1500);
        }
      }, onSteal);
    };
    // 1.5s before the first pass so players reach their spots
    setTimeout(doPass, 1500);
  };

  // Shoots with whoever currently has the ball.
  // Bounces the ball from (fromCx, fromCy) to a random spot [minDist, maxDist] grid-ft from the basket.
  // Closest player (excluding excludeId) picks it up; their nearest opponent chases.
  const bounceToRebound = (fromCx, fromCy, basketGx, excludeId, minDist, maxDist, onComplete) => {
    const angle  = Math.random() * 2 * Math.PI;
    const dist   = minDist + Math.random() * (maxDist - minDist);
    const rebGx  = Math.round(Math.max(2, Math.min(92, basketGx + Math.cos(angle) * dist)));
    const rebGy  = Math.round(Math.max(2, Math.min(48, BASKET_GY + Math.sin(angle) * dist)));
    const { cx: rebCx, cy: rebCy } = gridToSvg(rebGx, rebGy);

    const eligible  = playersRef.current.filter(p => p.id !== excludeId);
    const closestTo = (arr) => arr.reduce((best, p) => {
      const d = Math.hypot(p.cx - rebCx, p.cy - rebCy);
      return !best || d < Math.hypot(best.cx - rebCx, best.cy - rebCy) ? p : best;
    }, null);
    const rebounder = closestTo(eligible);
    const chaser    = rebounder ? closestTo(eligible.filter(p => p.team !== rebounder.team)) : null;

    let bounceActive = true;
    if (rebounder) {
      smoothMoveTo(rebGx, rebGy, rebounder.id, null, 1, () => {
        bounceActive = false;
        shotRef.current = null;
        setShot(null);
        playersRef.current = playersRef.current.map(p => p.id === rebounder.id ? { ...p, hasBall: true } : p);
        setPlayers(prev => prev.map(p => p.id === rebounder.id ? { ...p, hasBall: true } : p));
        addLog(`${rebounder.role} (${rebounder.team}) grabs the board!`);
        if (onComplete) onComplete();
      });
    }
    if (chaser) smoothMoveTo(rebGx, rebGy, chaser.id);

    const bounceDur   = 480;
    const bounceStart = performance.now();
    const animateBounce = (now) => {
      if (!bounceActive) return;
      const t  = Math.min((now - bounceStart) / bounceDur, 1);
      const cx = fromCx + (rebCx - fromCx) * t;
      const cy = fromCy + (rebCy - fromCy) * t - 18 * Math.sin(t * Math.PI);
      setShot({ cx, cy });
      if (t < 1) requestAnimationFrame(animateBounce);
    };
    requestAnimationFrame(animateBounce);
  };

  // Ball deflects off the blocker toward a rebound spot.
  const triggerBlock = (pg, handCx, arcStartCy, blocker, onComplete) => {
    playBlock();
    setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isShooting: false } : p));
    addLog(`BLOCKED by ${blocker.role} (${blocker.team})!`);
    quarterStatsRef.current[blocker.team].blocks += 1;

    const blockerNow = playersRef.current.find(p => p.id === blocker.id);
    const deflectCx  = blockerNow ? blockerNow.cx : (handCx + (pg.team === 'home' ? SHOOT_TARGET_RIGHT.cx : SHOOT_TARGET_LEFT.cx)) / 2;
    const deflectCy  = blockerNow ? blockerNow.cy - 15 : arcStartCy;

    const bfColor = blocker.team === 'home' ? '#00CCFF' : '#FF6600';
    const bfId = ++blockFlyupIdRef.current;
    setBlockFlyup({ id: bfId, fromCx: deflectCx, fromCy: deflectCy - 10, toCx: deflectCx, toCy: deflectCy - 40, color: bfColor });
    setTimeout(() => setBlockFlyup(prev => prev?.id === bfId ? null : prev), 1100);
    const basketGx   = pg.team === 'home' ? BASKET_RIGHT_GX : BASKET_LEFT_GX;

    const deflectDur   = 250;
    const deflectStart = performance.now();
    const animateDeflect = (now) => {
      const t  = Math.min((now - deflectStart) / deflectDur, 1);
      const cx = handCx + (deflectCx - handCx) * t;
      const cy = arcStartCy + (deflectCy - arcStartCy) * t - 20 * Math.sin(t * Math.PI);
      setShot({ cx, cy });
      if (t < 1) { requestAnimationFrame(animateDeflect); return; }
      bounceToRebound(deflectCx, deflectCy, basketGx, pg.id, BLOCK_REBOUND_MIN_FT, BLOCK_REBOUND_MAX_FT, onComplete);
    };
    requestAnimationFrame(animateDeflect);
  };

  const triggerBlockAnimation = (shooterCx, shooterCy, shooterTeam) => {
    const opponents = playersRef.current.filter(p => p.team !== shooterTeam);
    const blocker = opponents.reduce((closest, p) => {
      const d = Math.hypot(p.cx - shooterCx, p.cy - shooterCy);
      return !closest || d < Math.hypot(closest.cx - shooterCx, closest.cy - shooterCy) ? p : closest;
    }, null);
    if (!blocker) return null;
    const ironBlock = hasAbility(blocker, 'IRON BLOCK');
    setTimeout(() => {
      setPlayers(prev => prev.map(p => p.id === blocker.id ? { ...p, isBlocking: !ironBlock, isIronBlocking: ironBlock } : p));
      setTimeout(() => {
        setPlayers(prev => prev.map(p => p.id === blocker.id ? { ...p, isBlocking: false, isIronBlocking: false } : p));
      }, 12 * 80);
    }, 160);
    return blocker;
  };

  // If onComplete is provided, it's called after the score instead of
  // returning the ball to the shooter (used by the game loop).
  // onBlock is called after a blocked shot rebound is picked up (game loop only).
  const triggerShoot = (onComplete = null, onBlock = null, skipBlock = false) => {
    wanderActiveRef.current = false;
    const pg = playersRef.current.find(p => p.hasBall);
    if (!pg) return;

    // ANKLE BREAKER: spin stuns the nearest defender — re-call with skipBlock=true after spin
    if (!skipBlock && hasAbility(pg, 'ANKLE BREAKER')) {
      addLog(`ANKLE BREAKER! ${pg.role} spins past the defender!`);
      playersRef.current = playersRef.current.map(p => p.id === pg.id ? { ...p, isSpinning: true } : p);
      setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isSpinning: true } : p));
      setTimeout(() => {
        if (!gameLoopActiveRef.current || gamePausedRef.current) return;
        playersRef.current = playersRef.current.map(p => p.id === pg.id ? { ...p, isSpinning: false } : p);
        setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isSpinning: false } : p));
        triggerShoot(onComplete, onBlock, true);
      }, 12 * 80);
      return;
    }

    const startCx = pg.cx, startCy = pg.cy;
    const { cx: targetCx, cy: targetCy } = pg.team === 'home' ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
    const duration = 800;

    const blocker   = skipBlock ? null : triggerBlockAnimation(startCx, startCy, pg.team);
    const blockRate = BLOCK_RATE + (blocker && hasAbility(blocker, 'IRON BLOCK') ? 0.10 : 0);
    const isBlock   = !!blocker && Math.random() < blockRate;

    playLeap();
    setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: false, isShooting: true } : p));

    // Frame 5 begins at 320ms — ball appears in the extended hand position.
    // Ball tracks the player's jump (SHOOT_JUMP_OFFSETS) each frame until arc launches at 560ms.
    // Arc starts from the elevated position at frame index 7 (jump offset 8px).
    const handCx = pg.facingRight ? startCx + 8 : startCx - 8;
    const handCy = startCy - 22;

    setTimeout(() => setShot({ cx: handCx, cy: handCy - SHOOT_JUMP_OFFSETS[4] }), 320); // frame 5:  -11
    setTimeout(() => setShot({ cx: handCx, cy: handCy - SHOOT_JUMP_OFFSETS[5] }), 400); // frame 5b: -12
    setTimeout(() => setShot({ cx: handCx, cy: handCy - SHOOT_JUMP_OFFSETS[6] }), 480); // frame 5c: -14
    const arcStartCy = handCy - SHOOT_JUMP_OFFSETS[6]; // launch from peak (frame 5c): -14

    setTimeout(() => {
      if (isBlock) {
        triggerBlock(pg, handCx, arcStartCy, blocker, onBlock);
        return;
      }

      playShot();
      setTimeout(playSwish, 700); // 700ms into 800ms arc — ball enters net before landing
      driftTowardBasket(pg.team);
      const startTime = performance.now();
      const animate = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const cx = handCx + (targetCx - handCx) * t;
        const cy = arcStartCy + (targetCy - arcStartCy) * t - 40 * Math.sin(t * Math.PI);
        setShot({ cx, cy });
        if (t < 1) requestAnimationFrame(animate);
        else {
          setShot(null);
          setTimeout(() => {
            if (onComplete) {
              // Game loop path: clear shoot pose, score, hand off to next action.
              setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isShooting: false } : p));
              if (pg.team === 'home') setHomeScore(s => s + 2);
              else setAwayScore(s => s + 2);
              quarterStatsRef.current[pg.team].shots += 1;
              quarterPointsRef.current[pg.team] += 2;
              awardXp(pg.id, 10, pg.cx, pg.cy);
              addLog('swish! +2'); setScorePopup('2 POINTS'); setTimeout(() => setScorePopup(null), 1600);
              onComplete();
            } else {
              // Manual shoot: restore ball to shooter.
              setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: true, isShooting: false } : p));
              if (pg.team === 'home') setHomeScore(s => s + 2);
              else setAwayScore(s => s + 2);
              quarterStatsRef.current[pg.team].shots += 1;
              quarterPointsRef.current[pg.team] += 2;
              awardXp(pg.id, 10, pg.cx, pg.cy);
              addLog('swish! +2'); setScorePopup('2 POINTS'); setTimeout(() => setScorePopup(null), 1600);
            }
          }, 400);
        }
      };
      requestAnimationFrame(animate);
    }, 560);
    addLog('shooting...');
  };

  // Alternative to triggerShoot for players with special move Fade Away
  // higher success rate than regular shooting
  const triggerFadeaway = (onComplete = null, onBlock = null, blockRate = BLOCK_RATE, _spunAlready = false) => {
    wanderActiveRef.current = false;
    const pg = playersRef.current.find(p => p.hasBall);
    if (!pg) return;

    // ANKLE BREAKER: spin before the fadeaway — re-call with _spunAlready=true after spin
    if (!_spunAlready && hasAbility(pg, 'ANKLE BREAKER')) {
      addLog(`ANKLE BREAKER! ${pg.role} spins past the defender!`);
      playersRef.current = playersRef.current.map(p => p.id === pg.id ? { ...p, isSpinning: true } : p);
      setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isSpinning: true } : p));
      setTimeout(() => {
        if (!gameLoopActiveRef.current || gamePausedRef.current) return;
        playersRef.current = playersRef.current.map(p => p.id === pg.id ? { ...p, isSpinning: false } : p);
        setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isSpinning: false } : p));
        triggerFadeaway(onComplete, onBlock, blockRate, true);
      }, 12 * 80);
      return;
    }

    const startCx = pg.cx, startCy = pg.cy;
    const { cx: targetCx, cy: targetCy } = pg.team === 'home' ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
    const duration = 800;

    playLeap();
    setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: false, isFadingAway: true } : p));

    // Slide player 5px away from the basket over the wind-up (320ms).
    // Ball tracks the hand position (drifting with the player) each frame.
    const driftBack = pg.facingRight ? -5 : 5;
    const handOffset = pg.facingRight ? 6 : -6;
    const handYPerFrame = [-17, -18, -21, -21]; // cy offsets for frames 1-4
    const arcStartCy = startCy - 24;            // frame 5 launch point

    setShot({ cx: startCx + handOffset, cy: startCy - 17 });
    const driftStart = performance.now();
    const animateDrift = (now) => {
      const t = Math.min((now - driftStart) / 320, 1);
      const newCx = startCx + driftBack * t;
      setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, cx: newCx } : p));
      const fi = Math.min(Math.floor(t * 4), 3);
      setShot({ cx: newCx + handOffset, cy: startCy + handYPerFrame[fi] });
      if (t < 1) requestAnimationFrame(animateDrift);
    };
    requestAnimationFrame(animateDrift);

    const arcStartCx = startCx + driftBack + handOffset; // hand position at end of drift
    const blocker = triggerBlockAnimation(startCx, startCy, pg.team);
    const effectiveBlockRate = blockRate + (blocker && hasAbility(blocker, 'IRON BLOCK') ? 0.10 : 0);
    const isBlock = !!blocker && Math.random() < effectiveBlockRate;

    setTimeout(() => {
      if (isBlock) {
        triggerBlock(pg, arcStartCx, arcStartCy, blocker, onBlock);
        return;
      }
      playShot();
      setTimeout(playSwish, 700);
      driftTowardBasket(pg.team);
      const startTime = performance.now();
      const animate = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const cx = arcStartCx + (targetCx - arcStartCx) * t;
        const cy = arcStartCy + (targetCy - arcStartCy) * t - 40 * Math.sin(t * Math.PI);
        setShot({ cx, cy });
        if (t < 1) requestAnimationFrame(animate);
        else {
          setShot(null);
          setTimeout(() => {
            if (onComplete) {
              setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isFadingAway: false } : p));
              if (pg.team === 'home') setHomeScore(s => s + 2);
              else setAwayScore(s => s + 2);
              quarterStatsRef.current[pg.team].shots += 1;
              quarterPointsRef.current[pg.team] += 2;
              awardXp(pg.id, 10, pg.cx, pg.cy);
              addLog('fadeaway! +2'); setScorePopup('2 POINTS'); setTimeout(() => setScorePopup(null), 1600);
              onComplete();
            } else {
              setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: true, isFadingAway: false } : p));
              if (pg.team === 'home') setHomeScore(s => s + 2);
              else setAwayScore(s => s + 2);
              quarterStatsRef.current[pg.team].shots += 1;
              quarterPointsRef.current[pg.team] += 2;
              awardXp(pg.id, 10, pg.cx, pg.cy);
              addLog('fadeaway! +2'); setScorePopup('2 POINTS'); setTimeout(() => setScorePopup(null), 1600);
            }
          }, 400);
        }
      };
      requestAnimationFrame(animate);
    }, 320);
    addLog('fadeaway...');
  };

  // Like triggerShoot but the ball rims out and bounces to a random spot within
  // 15ft of the basket. The nearest player (either team) grabs the rebound.
  const triggerShootFail = (onComplete = null, skipBlock = false) => {
    wanderActiveRef.current = false;
    const pg = playersRef.current.find(p => p.hasBall);
    if (!pg) return;
    const isHome = pg.team === 'home';
    const startCx = pg.cx, startCy = pg.cy;
    const { cx: targetCx, cy: targetCy } = isHome ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
    const basketGx = isHome ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
    const duration = 800;

    if (!skipBlock) triggerBlockAnimation(startCx, startCy, pg.team);

    playLeap();
    setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: false, isShooting: true } : p));

    const handCx = pg.facingRight ? startCx + 8 : startCx - 8;
    const handCy = startCy - 22;

    setTimeout(() => setShot({ cx: handCx, cy: handCy - SHOOT_JUMP_OFFSETS[4] }), 320);
    setTimeout(() => setShot({ cx: handCx, cy: handCy - SHOOT_JUMP_OFFSETS[5] }), 400);
    setTimeout(() => setShot({ cx: handCx, cy: handCy - SHOOT_JUMP_OFFSETS[6] }), 480);
    const arcStartCy = handCy - SHOOT_JUMP_OFFSETS[6];

    setTimeout(() => {
      playShot();
      driftTowardBasket(pg.team);
      const startTime = performance.now();
      const animateShot = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const cx = handCx + (targetCx - handCx) * t;
        const cy = arcStartCy + (targetCy - arcStartCy) * t - 40 * Math.sin(t * Math.PI);
        setShot({ cx, cy });
        if (t < 1) {
          requestAnimationFrame(animateShot);
        } else {
          playMiss();
          setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isShooting: false } : p));
          bounceToRebound(targetCx, targetCy, basketGx, pg.id, MISS_REBOUND_MIN_FT, MISS_REBOUND_MAX_FT, onComplete);
        }
      };
      requestAnimationFrame(animateShot);
    }, 560);
    addLog('shot... no good!');
  };

  // All defenders scramble to cut off the dunker's path to the basket.
  // Called as soon as the dunker begins their run — before the jump animation.
  const reactDunk = (dunkerId, isHome) => {
    const dunker = playersRef.current.find(p => p.id === dunkerId);
    if (!dunker) return;
    const basketGx = isHome ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
    const defFacingRight = !isHome;
    const { x: dunkerGx, y: dunkerGy } = svgToGrid(dunker.cx, dunker.cy);

    playersRef.current
      .filter(p => p.team !== dunker.team)
      .forEach(p => {
        // Each defender rushes to a spot 35–65% of the way between the dunker and basket
        const t = 0.35 + Math.random() * 0.3;
        const gx = Math.round(dunkerGx + (basketGx - dunkerGx) * t);
        const gy = Math.round(dunkerGy + (BASKET_GY - dunkerGy) * t + (Math.random() * 10 - 5));
        smoothMoveTo(
          Math.max(1, Math.min(93, gx)),
          Math.max(2, Math.min(48, gy)),
          p.id,
          defFacingRight,
          1
        );
      });
  };

  const triggerDunk = (onComplete = null, speed = 1.5, _spunAlready = false) => {
    wanderActiveRef.current = false;
    const dunker = playersRef.current.find(p => p.hasBall);
    if (!dunker) return;

    // ANKLE BREAKER: spin before the drive — re-call with _spunAlready=true after spin
    if (!_spunAlready && hasAbility(dunker, 'ANKLE BREAKER')) {
      addLog(`ANKLE BREAKER! ${dunker.role} spins past the defender!`);
      playersRef.current = playersRef.current.map(p => p.id === dunker.id ? { ...p, isSpinning: true } : p);
      setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, isSpinning: true } : p));
      setTimeout(() => {
        if (!gameLoopActiveRef.current || gamePausedRef.current) return;
        playersRef.current = playersRef.current.map(p => p.id === dunker.id ? { ...p, isSpinning: false } : p);
        setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, isSpinning: false } : p));
        triggerDunk(onComplete, speed, true);
      }, 12 * 80);
      return;
    }

    const isHome = dunker.team === 'home';
    const launchGx = isHome ? 83 : 11;
    const { cx: basketCx, cy: basketCy } = isHome ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
    reactDunk(dunker.id, isHome);

    const DF = Math.round(80 / speed);
    smoothMoveTo(launchGx, 25, dunker.id, isHome, speed * (2 / 1.5), () => {
      const { cx: startCx, cy: startCy } = gridToSvg(launchGx, 25);
      playersRef.current = playersRef.current.map(p => p.id === dunker.id ? { ...p, isDunking: true } : p);
      setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, isDunking: true, hasBall: true } : p));
      driftTowardBasket(dunker.team);
      setTimeout(() => {
        const jumpDur = 8 * DF;
        const jumpStart = performance.now();
        const jumpAnim = (now) => {
          const t = Math.min((now - jumpStart) / jumpDur, 1);
          const cx = startCx + (basketCx - startCx) * t;
          const cy = startCy - 22 * Math.sin(t * Math.PI);
          setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, cx, cy } : p));
          if (t < 1) requestAnimationFrame(jumpAnim);
          else setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, cx: basketCx, cy: startCy, isDunking: false, hasBall: false } : p));
        };
        requestAnimationFrame(jumpAnim);
      }, DF);
      setTimeout(() => {
        if (isHome) setHomeScore(s => s + 2);
        else setAwayScore(s => s + 2);
        quarterStatsRef.current[isHome ? 'home' : 'away'].dunks += 1;
        quarterPointsRef.current[isHome ? 'home' : 'away'] += 2;
        awardXp(dunker.id, 15, startCx, startCy);
        playDunk(); addLog('DUNK! +2'); setScorePopup('2 POINTS'); setTimeout(() => setScorePopup(null), 1600);
      }, 4 * DF);
      setTimeout(() => {
        setShot({ cx: basketCx, cy: basketCy });
        const dropStart = performance.now();
        const dropDur = Math.round(400 / 1.5);
        const dropAnim = (now) => {
          const t = Math.min((now - dropStart) / dropDur, 1);
          setShot({ cx: basketCx, cy: basketCy + 18 * t });
          if (t < 1) requestAnimationFrame(dropAnim);
          else {
            setShot(null);
            setTimeout(() => { if (onComplete) onComplete(); }, Math.round(400 / 1.5));
          }
        };
        requestAnimationFrame(dropAnim);
      }, 7 * DF);
    });
    addLog('driving to the basket...');
  };

  // Away C inbounds from right sideline. onComplete fires when away PG
  // reaches their formation spot (the cue for the next action).
  const triggerThrowInAway = (onComplete = null) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === 10) return { ...p, cx: 660, cy: 216, hasBall: true,  facingRight: false };
      if (p.id === 6)  return { ...p, cx: 562, cy: 216, hasBall: false, facingRight: false };
      return { ...p, hasBall: false };
    }));

    const otherMoves = [
      { id: 1, gx: 26, gy: 25 }, { id: 2, gx: 21, gy: 12 }, { id: 3, gx: 21, gy: 38 },
      { id: 4, gx: 12, gy: 18 }, { id: 5, gx: 10, gy: 25 },
      { id: 7, gx: 24, gy: 12 }, { id: 8, gx: 24, gy: 38 }, { id: 9, gx: 14, gy: 18 },
    ];
    otherMoves.forEach(({ id, gx, gy }) => smoothMoveTo(gx, gy, id, id <= 5 ? true : false));
    addLog('away throw-in...');

    setTimeout(() => {
      const startCx = 660, startCy = 216;
      setPlayers(prev => prev.map(p => p.id === 10 ? { ...p, hasBall: false } : p));
      playPass(); setShot({ cx: startCx, cy: startCy });
      const endCx = 562, endCy = 216;
      const duration = 300;
      const startTime = performance.now();

      const animate = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const cx = startCx + (endCx - startCx) * t;
        const cy = startCy + (endCy - startCy) * t - 12 * Math.sin(t * Math.PI);
        setShot({ cx, cy });
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          setShot(null);
          setPlayers(prev => prev.map(p => p.id === 6 ? { ...p, hasBall: true } : p));
          addLog('PG receives inbound');
          smoothMoveTo(12, 25, 10, false, 2, null, C_BOOST_SECS);
          smoothMoveTo(32, 25, 6, false, 1, onComplete); // PG arrival triggers next step
        }
      };
      requestAnimationFrame(animate);
    }, 200);
  };

  // Home C inbounds from left sideline. onComplete fires when home PG
  // reaches their formation spot.
  const triggerThrowInHome = (onComplete = null) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === 5) return { ...p, cx: 20,  cy: 216, hasBall: true,  facingRight: true };
      if (p.id === 1) return { ...p, cx: 118, cy: 216, hasBall: false, facingRight: true };
      return { ...p, hasBall: false };
    }));

    const homeMoves = [
      { id: 2, gx: 70, gy: 12 }, { id: 3, gx: 70, gy: 38 }, { id: 4, gx: 80, gy: 18 },
      { id: 6, gx: 68, gy: 25 }, { id: 7, gx: 73, gy: 11 }, { id: 8, gx: 73, gy: 39 },
      { id: 9, gx: 82, gy: 17 }, { id: 10, gx: 84, gy: 24 },
    ];
    homeMoves.forEach(({ id, gx, gy }) => smoothMoveTo(gx, gy, id, id <= 5 ? true : false));
    addLog('home throw-in...');

    setTimeout(() => {
      const startCx = 20, startCy = 216;
      setPlayers(prev => prev.map(p => p.id === 5 ? { ...p, hasBall: false } : p));
      playPass(); setShot({ cx: startCx, cy: startCy });
      const endCx = 118, endCy = 216;
      const duration = 300;
      const startTime = performance.now();

      const animate = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const cx = startCx + (endCx - startCx) * t;
        const cy = startCy + (endCy - startCy) * t - 12 * Math.sin(t * Math.PI);
        setShot({ cx, cy });
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          setShot(null);
          setPlayers(prev => prev.map(p => p.id === 1 ? { ...p, hasBall: true } : p));
          addLog('PG receives inbound');
          smoothMoveTo(82, 25, 5, true, 2, null, C_BOOST_SECS);
          smoothMoveTo(62, 25, 1, true, 1, onComplete); // PG arrival triggers next step
        }
      };
      requestAnimationFrame(animate);
    }, 200);
  };

  // ─── Roster Helpers ────────────────────────────────────────────────────────

  // Returns the shooter's ACC stat (0–100). Falls back to 70 if roster is missing.
  const getShooterAcc = (gamePlayer) => {
    const roster = gamePlayer.team === 'home' ? rosterRef.current.home : rosterRef.current.away;
    const rp = roster.find(r => (r.role ?? r.pos) === gamePlayer.role);
    return rp ? rp.acc : 70;
  };

  // Returns true if the player has the named ability (draft or any level-up earned slot).
  const hasAbility = (gamePlayer, abilityName) => {
    const roster = gamePlayer.team === 'home' ? rosterRef.current.home : rosterRef.current.away;
    const rp = roster.find(r => (r.role ?? r.pos) === gamePlayer.role);
    if (rp?.ability?.name === abilityName) return true;
    const extras = abilityOverridesRef.current.get(gamePlayer.id) ?? [];
    return extras.some(a => a.name === abilityName);
  };

  // Quick outlet pass from the current ball-carrier to their team's PG, then
  // calls onComplete so the caller can start the appropriate loop half.
  const triggerReboundTransition = (possTeam, onComplete = null) => {
    const carrier = playersRef.current.find(p => p.hasBall);
    const pg      = playersRef.current.find(p => p.team === possTeam && p.role === 'PG');
    if (!carrier || !pg || carrier.id === pg.id) { onComplete?.(); return; }

    const startCx = carrier.cx, startCy = carrier.cy;
    const endCx   = pg.cx,      endCy   = pg.cy;
    const duration = 350;

    playersRef.current = playersRef.current.map(p => p.id === carrier.id ? { ...p, hasBall: false } : p);
    setPlayers(prev => prev.map(p => p.id === carrier.id ? { ...p, hasBall: false } : p));
    playPass(); setShot({ cx: startCx, cy: startCy });

    const startTime = performance.now();
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const cx = startCx + (endCx - startCx) * t;
      const cy = startCy + (endCy - startCy) * t - 12 * Math.sin(t * Math.PI);
      setShot({ cx, cy });
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        shotRef.current = null;
        setShot(null);
        playersRef.current = playersRef.current.map(p => p.id === pg.id ? { ...p, hasBall: true } : p);
        setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: true } : p));
        addLog(`outlet → PG`);
        onComplete?.();
      }
    };
    requestAnimationFrame(animate);
  };

  // Moves all players to proper half-court formation for `possTeam`, then fires
  // onComplete when the possessing PG reaches their spot (signals team is ready).
  const setupOffense = (possTeam, onComplete = null) => {
    const formation = possTeam === 'home' ? HOME_FORMATION : AWAY_FORMATION;
    const pg = playersRef.current.find(p => p.team === possTeam && p.role === 'PG');
    formation.forEach(({ id, gx, gy }) => {
      const facingRight = id <= 5; // home always faces right, away always faces left
      const isPG = pg && id === pg.id;
      smoothMoveTo(gx, gy, id, facingRight, 1, isPG ? onComplete : null);
    });
  };

  // ─── Jump Ball ─────────────────────────────────────────────────────────────


  // Moves all 10 players to jump ball positions, then tips off:
  // referee tosses the ball at center, Centers jump, ball deflects left or right,
  // and the closest player to the landing spot gets possession.
  // onComplete receives the winning team name.
  const triggerJumpBall = (onComplete = null) => {
    wanderActiveRef.current = false;

    const homeCId = JUMP_BALL_FORMATION.find(f => f.id === 5).id; // 5
    const awayCId = JUMP_BALL_FORMATION.find(f => f.id === 10).id; // 10

    // Clear any ball
    playersRef.current = playersRef.current.map(p => ({ ...p, hasBall: false }));
    setPlayers(prev => prev.map(p => ({ ...p, hasBall: false })));
    addLog('jump ball!');

    // Move every player to their formation spot; once all 10 arrive, tip off
    let arrived = 0;
    const onArrived = () => {
      arrived++;
      if (arrived < JUMP_BALL_FORMATION.length) return;

      const { cx: centerCx, cy: centerCy } = gridToSvg(47, 25);
      const goesRight = Math.random() < 0.5;

      // Landing zone: ~13 ft from center toward the tipped side
      const landGx = goesRight
        ? Math.round(60 + Math.random() * 3)   // gx 60-63, near Away SF — away wins tip
        : Math.round(31 + Math.random() * 3);   // gx 31-34, near Home SF — home wins tip
      const landGy = Math.round(22 + Math.random() * 6); // gy 22-28
      const { cx: landCx, cy: landCy } = gridToSvg(landGx, landGy);

      // Phase 0: Centers charge up (PowerBar fills over 480ms) before the toss
      playersRef.current = playersRef.current.map(p =>
        (p.id === homeCId || p.id === awayCId) ? { ...p, isChargingJump: true } : p
      );
      setPlayers(prev => prev.map(p =>
        (p.id === homeCId || p.id === awayCId) ? { ...p, isChargingJump: true } : p
      ));

      setTimeout(() => {
        // Clear charge state — ball toss begins
        playersRef.current = playersRef.current.map(p =>
          (p.id === homeCId || p.id === awayCId) ? { ...p, isChargingJump: false } : p
        );
        setPlayers(prev => prev.map(p =>
          (p.id === homeCId || p.id === awayCId) ? { ...p, isChargingJump: false } : p
        ));

      // Ball toss: 3 phases
      //   1. Rise up to peak (600ms) — players wait
      //   2. Fall to hands height (320ms = 4 frames) — players start jumping at phase 2 start,
      //      so they reach their peak exactly when the ball reaches tip height
      //   3. Ball deflects left or right from hands height (350ms)
      const peakCy = centerCy - 65;  // ~65px above court
      const tipCy  = centerCy - 30;  // hands height at peak jump
      const UP_DUR   = 600;
      const DOWN_DUR = 320;  // = 4 frames × 80ms — matches time to player jump peak
      const TIP_DUR  = 350;  // matches other ball speeds

      setShot({ cx: centerCx, cy: centerCy });
      const upStart = performance.now();
      const phaseUp = (now) => {
        const t = Math.min((now - upStart) / UP_DUR, 1);
        setShot({ cx: centerCx, cy: centerCy + (peakCy - centerCy) * t });
        if (t < 1) { requestAnimationFrame(phaseUp); return; }

        // Ball at peak — trigger player jumps now so they peak in 320ms
        playLeap();
        playersRef.current = playersRef.current.map(p =>
          (p.id === homeCId || p.id === awayCId) ? { ...p, isJumpBall: true } : p
        );
        setPlayers(prev => prev.map(p =>
          (p.id === homeCId || p.id === awayCId) ? { ...p, isJumpBall: true } : p
        ));

        // Ball descends to meet the players' extended hands
        const downStart = performance.now();
        const phaseDown = (now2) => {
          const t2 = Math.min((now2 - downStart) / DOWN_DUR, 1);
          setShot({ cx: centerCx, cy: peakCy + (tipCy - peakCy) * t2 });
          if (t2 < 1) { requestAnimationFrame(phaseDown); return; }

          // Players are at peak, ball is at hands height — tip it sideways
          playJumpball();
          const tipStart = performance.now();
          const phaseTip = (now3) => {
            const t3 = Math.min((now3 - tipStart) / TIP_DUR, 1);
            setShot({ cx: centerCx + (landCx - centerCx) * t3, cy: tipCy + (landCy - tipCy) * t3 });
            if (t3 < 1) { requestAnimationFrame(phaseTip); return; }

            // Ball landed — clear jump pose, find closest player
            shotRef.current = null;
            setShot(null);
            playersRef.current = playersRef.current.map(p =>
              (p.id === homeCId || p.id === awayCId) ? { ...p, isJumpBall: false } : p
            );
            setPlayers(prev => prev.map(p =>
              (p.id === homeCId || p.id === awayCId) ? { ...p, isJumpBall: false } : p
            ));

            const receiver = playersRef.current.reduce((best, p) => {
              const d = Math.hypot(p.cx - landCx, p.cy - landCy);
              return !best || d < Math.hypot(best.cx - landCx, best.cy - landCy) ? p : best;
            }, null);

            if (!receiver) { onComplete?.(null); return; }

            smoothMoveTo(landGx, landGy, receiver.id, receiver.facingRight, 1, () => {
              playersRef.current = playersRef.current.map(p =>
                p.id === receiver.id ? { ...p, hasBall: true } : p
              );
              setPlayers(prev => prev.map(p =>
                p.id === receiver.id ? { ...p, hasBall: true } : p
              ));
              // Record jump ball winner for quarter possession rules:
              // Q2 + Q3 → opposite team, Q4 → this team
              if (!jumpBallWinnerRef.current) {
                jumpBallWinnerRef.current = receiver.team;
                setJumpBallWinner(receiver.team);
              }
              addLog(`${receiver.team.toUpperCase()} ${receiver.role} gets possession!`);
              onComplete?.(receiver.team);
            });
          };
          requestAnimationFrame(phaseTip);
        };
        requestAnimationFrame(phaseDown);
      };
      requestAnimationFrame(phaseUp);
      }, 480); // wait for PowerBar to fill before tossing
    };

    JUMP_BALL_FORMATION.forEach(({ id, gx, gy, facingRight }) =>
      smoothMoveTo(gx, gy, id, facingRight, 1, onArrived)
    );
  };

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  const gameLoopActiveRef    = useRef(false);
  const wanderActiveRef      = useRef(false);
  const gamePausedRef        = useRef(false);
  const resumeAfterPauseRef  = useRef(null);
  // Refs hold the latest closures for mutual recursion between the loop halves.
  const loopHomeRef    = useRef(null);
  const loopAwayRef    = useRef(null);
  const attemptShotRef = useRef(null);

  // Starts small random movement for every player on `team` to simulate
  // half-court positioning. Each player picks a new spot every 0.5–1.5s,
  // staying within OFFENSE_RADIUS_FT of their attacking basket.
  // Stopped by setting wanderActiveRef.current = false (done in triggerPreShoot).
  const startWander = (team) => {
    wanderActiveRef.current = true;
    const basketGx = team === 'home' ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
    const facingRight = team === 'home';

    const scheduleWander = (playerId) => {
      if (!wanderActiveRef.current || !gameLoopActiveRef.current || gamePausedRef.current) return;
      const delay = 500 + Math.random() * 1000;
      setTimeout(() => {
        if (!wanderActiveRef.current || !gameLoopActiveRef.current || gamePausedRef.current) return;
        // Skip players with a pending action callback (e.g. mid-pass): clobbering it breaks the play chain.
        if (animCbsRef.current.has(playerId)) { scheduleWander(playerId); return; }
        const player = playersRef.current.find(p => p.id === playerId);
        if (!player) return;

        const { x: gx, y: gy } = svgToGrid(player.cx, player.cy);
        // Small random step: ±1–3 grid feet in each axis
        let newGx = gx + (Math.random() * 6 - 3);
        let newGy = gy + (Math.random() * 6 - 3);

        // Clamp to playable court area
        newGx = Math.max(1, Math.min(93, newGx));
        newGy = Math.max(2, Math.min(48, newGy));

        // Pull inside the 24ft offensive arc if the step drifted outside
        const dist = Math.sqrt((basketGx - newGx) ** 2 + (BASKET_GY - newGy) ** 2);
        if (dist > OFFENSE_RADIUS_FT) {
          const scale = OFFENSE_RADIUS_FT / dist;
          newGx = basketGx + (newGx - basketGx) * scale;
          newGy = BASKET_GY + (newGy - BASKET_GY) * scale;
        }

        smoothMoveTo(Math.round(newGx), Math.round(newGy), playerId, facingRight);
        scheduleWander(playerId);
      }, delay);
    };

    playersRef.current
      .filter(p => p.team === team)
      .forEach(p => scheduleWander(p.id));
  };

  // Each defensive player stays between their role counterpart and the basket
  // the offensive team is attacking. The target point is 40% of the way from
  // the offensive player toward the basket center (net shadow on the floor),
  // so the defender is close to the attacker but always cutting off the lane.
  const startGuarding = (defensiveTeam) => {
    const offensiveTeam = defensiveTeam === 'home' ? 'away' : 'home';
    // Basket being attacked is the offensive team's target
    const basketGx = offensiveTeam === 'home' ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
    const facingRight = defensiveTeam === 'home';

    const scheduleGuard = (defenderId, offenderId) => {
      if (!wanderActiveRef.current || !gameLoopActiveRef.current || gamePausedRef.current) return;
      const delay = 200 + Math.random() * 200; // reposition every 200–400ms
      setTimeout(() => {
        if (!wanderActiveRef.current || !gameLoopActiveRef.current || gamePausedRef.current) return;
        const offender = playersRef.current.find(p => p.id === offenderId);
        if (!offender) { scheduleGuard(defenderId, offenderId); return; }

        const { x: ox, y: oy } = svgToGrid(offender.cx, offender.cy);

        // Stand 20% of the way from the offensive player toward the basket shadow.
        // t=0 → on top of attacker, t=1 → at basket. 0.2 keeps defender tight
        // on the attacker while still cutting off the lane.
        const t = 0.2;
        const gx = Math.round(ox + (basketGx - ox) * t);
        const gy = Math.round(oy + (BASKET_GY - oy) * t);

        smoothMoveTo(
          Math.max(1, Math.min(93, gx)),
          Math.max(2, Math.min(48, gy)),
          defenderId,
          facingRight
        );
        scheduleGuard(defenderId, offenderId);
      }, delay);
    };

    const defenders = playersRef.current.filter(p => p.team === defensiveTeam);
    const offenders = playersRef.current.filter(p => p.team === offensiveTeam);
    defenders.forEach(defender => {
      const counterpart = offenders.find(p => p.role === defender.role);
      if (counterpart) scheduleGuard(defender.id, counterpart.id);
    });
  };

  // ACC-based shot attempt. On make → finishMake (hand off after score).
  // On miss → rebound: same team gets 0–2 quick passes then shoots again;
  //            opposing team gets an outlet to their PG then restarts their loop.
  attemptShotRef.current = (finishMake) => {
    if (!gameLoopActiveRef.current || gamePausedRef.current) return;
    const shooter = playersRef.current.find(p => p.hasBall);
    if (!shooter) return;

    if (Math.random() < DUNK_RATE) {
      triggerDunk(finishMake);
      return;
    }

    const acc    = getShooterAcc(shooter);
    const effectiveAcc = hasAbility(shooter, 'SHARPSHOOTER') ? acc + 10 : acc;
    const isMake = Math.random() * 100 < effectiveAcc;

    if (isMake) {
      const onBlockRebound = () => {
        // Block rebound — route possession exactly like a miss rebound.
        if (!gameLoopActiveRef.current || gamePausedRef.current) return;
        const rebounder = playersRef.current.find(p => p.hasBall);
        if (!rebounder) return;
        if (rebounder.team === shooter.team) {
          const numPasses = Math.floor(Math.random() * 3);
          let rem = numPasses;
          const doPass = () => {
            rem--;
            triggerPass(() => {
              if (!gameLoopActiveRef.current || gamePausedRef.current) return;
              if (rem > 0) setTimeout(doPass, 200 + Math.random() * 400);
              else setTimeout(() => attemptShotRef.current?.(finishMake), 400);
            }, onPassSteal);
          };
          if (numPasses === 0) setTimeout(() => attemptShotRef.current?.(finishMake), 300);
          else setTimeout(doPass, 300);
        } else {
          setTimeout(() => {
            if (!gameLoopActiveRef.current || gamePausedRef.current) return;
            triggerReboundTransition(rebounder.team, () => {
              if (!gameLoopActiveRef.current || gamePausedRef.current) return;
              const nextLoop = rebounder.team === 'home'
                ? () => loopHomeRef.current?.()
                : () => loopAwayRef.current?.();
              setupOffense(rebounder.team, () => {
                if (!gameLoopActiveRef.current || gamePausedRef.current) return;
                nextLoop();
              });
            });
          }, 100 + Math.random() * 900);
        }
      };

      if (hasAbility(shooter, 'SHARPSHOOTER')) {
        triggerFadeaway(finishMake, onBlockRebound, 0.01);
        return;
      }
      triggerShoot(finishMake, onBlockRebound);
    } else {
      triggerShootFail(() => {
        if (!gameLoopActiveRef.current || gamePausedRef.current) return;
        const rebounder = playersRef.current.find(p => p.hasBall);
        if (!rebounder) return;

        if (rebounder.team === shooter.team) {
          // Offensive rebound — 0–2 quick passes then another attempt
          const numPasses = Math.floor(Math.random() * 3);
          let rem = numPasses;
          const doPass = () => {
            rem--;
            triggerPass(() => {
              if (!gameLoopActiveRef.current || gamePausedRef.current) return;
              if (rem > 0) setTimeout(doPass, 200 + Math.random() * 400);
              else setTimeout(() => attemptShotRef.current?.(finishMake), 400);
            }, onPassSteal);
          };
          if (numPasses === 0) setTimeout(() => attemptShotRef.current?.(finishMake), 300);
          else setTimeout(doPass, 300);
        } else {
          // Opposing team grabbed the board — pause 0.1–1s, then outlet to PG
          setTimeout(() => {
            if (!gameLoopActiveRef.current || gamePausedRef.current) return;
            triggerReboundTransition(rebounder.team, () => {
              if (!gameLoopActiveRef.current || gamePausedRef.current) return;
              const nextLoop = rebounder.team === 'home'
                ? () => loopHomeRef.current?.()
                : () => loopAwayRef.current?.();
              setupOffense(rebounder.team, () => {
                if (!gameLoopActiveRef.current || gamePausedRef.current) return;
                nextLoop();
              });
            });
          }, 100 + Math.random() * 900);
        }
      });
    }
  };

  // Shared steal handler — works regardless of which team intercepts.
  // Mirrors the defensive-rebound path: outlet to PG → setup offense → start that team's loop.
  const onPassSteal = (stealerTeam) => {
    if (!gameLoopActiveRef.current || gamePausedRef.current) return;
    wanderActiveRef.current = false;
    const nextLoop = stealerTeam === 'home' ? () => loopHomeRef.current?.() : () => loopAwayRef.current?.();
    nextLoop();
  };

  loopHomeRef.current = () => {
    if (!gameLoopActiveRef.current || gamePausedRef.current) return;

    stopTimer();
    setPlayPickState(true);
    resumeAfterPauseRef.current = () => {
      startWander('home');
      startGuarding('away');
      triggerPreShoot(() => {
        if (!gameLoopActiveRef.current || gamePausedRef.current) return;
        const finishMake = () => {
          if (!gameLoopActiveRef.current || gamePausedRef.current) {
            resumeAfterPauseRef.current = finishMake;
            return;
          }
          triggerThrowInAway(() => loopAwayRef.current?.());
        };
        attemptShotRef.current(finishMake);
      }, onPassSteal);
    };
  };

  loopAwayRef.current = () => {
    if (!gameLoopActiveRef.current || gamePausedRef.current) return;
    startWander('away');
    startGuarding('home');

    /** 
     * PreShoot is the start of the 1-3 passes upon getting 
     * the ball after getting into position 
    **/
    triggerPreShoot(() => {
      if (!gameLoopActiveRef.current || gamePausedRef.current) return;
      const finishMake = () => {
        if (!gameLoopActiveRef.current || gamePausedRef.current) {
          resumeAfterPauseRef.current = finishMake;
          return;
        }
        triggerThrowInHome(() => loopHomeRef.current?.());
      };
      attemptShotRef.current(finishMake);
    }, onPassSteal);
  };

  // ─── Commands ──────────────────────────────────────────────────────────────

  const handleCommand = (cmd) => {
    addLog(cmd, 'cmd');
    const parts = cmd.trim().split(/\s+/);
    const op = parts[0];
    try {
      if (op === 'move') {
        // Nudge every player by a raw SVG pixel offset (useful for layout tweaks).
        const dx = Number(parts[1] || 0), dy = Number(parts[2] || 0);
        if (isNaN(dx) || isNaN(dy)) { addLog(`invalid args: "${parts[1]} ${parts[2]}"`, 'err'); return; }
        setPlayers(prev => prev.map(p => ({ ...p, cx: Math.max(30, Math.min(650, p.cx + dx)), cy: Math.max(96, Math.min(336, p.cy + dy)) })));
        addLog(`moved by (${dx}, ${dy})`);

      } else if (op === 'moveTo') {
        // Smooth-move the ball carrier to a grid position (in feet, 0–94 x 0–50).
        const gx = Math.max(0, Math.min(94, Number(parts[1])));
        const gy = Math.max(0, Math.min(50, Number(parts[2])));
        if (isNaN(gx) || isNaN(gy)) { addLog('usage: moveTo <x> <y>', 'err'); return; }
        const carrier = playersRef.current.find(p => p.hasBall);
        smoothMoveTo(gx, gy, carrier ? carrier.id : 1);
        addLog(`moving to grid (${gx}, ${gy})...`);

      } else if (op === 'tp') {
        // Instant teleport — no animation, just snaps the PG (id=1).
        const gx = Math.max(0, Math.min(94, Number(parts[1])));
        const gy = Math.max(0, Math.min(50, Number(parts[2])));
        const { cx, cy } = gridToSvg(gx, gy);
        setPlayers(prev => prev.map(p => p.id === 1 ? { ...p, cx, cy } : p));
        addLog(`teleported to (${gx}, ${gy})`);

      } else if (op === 'pos') {
        const p = playersRef.current[0];
        const { x, y } = svgToGrid(p.cx, p.cy);
        addLog(`grid (${x}, ${y})`);

      } else if (op === 'shoot') {
        if (!playersRef.current.find(p => p.hasBall)) { addLog('nobody has the ball', 'err'); return; }
        triggerShoot();

      } else if (op === 'shootFail') {
        if (!playersRef.current.find(p => p.hasBall)) { addLog('nobody has the ball', 'err'); return; }
        triggerShootFail();

      } else if (op === 'fadeaway') {
        if (!playersRef.current.find(p => p.hasBall)) { addLog('nobody has the ball', 'err'); return; }
        triggerFadeaway();

      } else if (op === 'testPass') {
        const role = parts[1]?.toUpperCase();
        if (!role) { addLog('usage: testPass <role>  e.g. testPass SG', 'err'); return; }

        const passer = playersRef.current.find(p => p.hasBall);
        if (!passer) { addLog('nobody has the ball', 'err'); return; }

        const receiver = playersRef.current.find(p => p.team === passer.team && p.role === role && p.id !== passer.id);
        if (!receiver) { addLog(`no ${role} on ${passer.team} team`, 'err'); return; }

        const startCx = passer.cx, startCy = passer.cy;
        const endCx = receiver.cx, endCy = receiver.cy;
        const duration = 300; // fast chest pass

        setPlayers(prev => prev.map(p => p.id === passer.id ? { ...p, hasBall: false } : p));
        playPass(); setShot({ cx: startCx, cy: startCy });

        const startTime = performance.now();
        const animate = (now) => {
          const t = Math.min((now - startTime) / duration, 1);
          const cx = startCx + (endCx - startCx) * t;
          // Shallow arc — passes travel flatter than shots
          const cy = startCy + (endCy - startCy) * t - 12 * Math.sin(t * Math.PI);
          setShot({ cx, cy });
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            setShot(null);
            setPlayers(prev => prev.map(p => p.id === receiver.id ? { ...p, hasBall: true } : p));
            addLog(`${passer.role} → ${role}`);
          }
        };
        requestAnimationFrame(animate);
        addLog(`passing to ${role}...`);

      } else if (op === 'testJumpBall') {
        triggerJumpBall();

      } else if (op === 'testThrowInHome') {
        triggerThrowInHome();

      } else if (op === 'testThrowInAway') {
        triggerThrowInAway();

      } else if (op === 'testDunk') {
        const dunker = playersRef.current.find(p => p.hasBall);
        if (!dunker) { addLog('nobody has the ball', 'err'); return; }
        const isHome = dunker.team === 'home';
        const launchGx = isHome ? 83 : 11;
        const { cx: basketCx, cy: basketCy } = isHome ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
        reactDunk(dunker.id, isHome);
        // Move to launch point at 2×, then soar at 1.5×
        const DF2 = Math.round(80 / 1.5);
        smoothMoveTo(launchGx, 25, dunker.id, isHome ? true : false, 2, () => {
          const { cx: startCx, cy: startCy } = gridToSvg(launchGx, 25);
          playersRef.current = playersRef.current.map(p => p.id === dunker.id ? { ...p, isDunking: true } : p);
          setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, isDunking: true, hasBall: true } : p));
          driftTowardBasket(dunker.team);
          setTimeout(() => {
            const jumpDur = 8 * DF2;
            const jumpStart = performance.now();
            const jumpAnim = (now) => {
              const t = Math.min((now - jumpStart) / jumpDur, 1);
              const cx = startCx + (basketCx - startCx) * t;
              const cy = startCy - 22 * Math.sin(t * Math.PI);
              setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, cx, cy } : p));
              if (t < 1) requestAnimationFrame(jumpAnim);
              else setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, cx: basketCx, cy: startCy, isDunking: false, hasBall: false } : p));
            };
            requestAnimationFrame(jumpAnim);
          }, DF2);
          setTimeout(() => {
            if (isHome) setHomeScore(s => s + 2);
            else setAwayScore(s => s + 2);
            quarterStatsRef.current[isHome ? 'home' : 'away'].dunks += 1;
            quarterPointsRef.current[isHome ? 'home' : 'away'] += 2;
            awardXp(dunker.id, 15, startCx, startCy);
            playDunk(); addLog('DUNK! +2'); setScorePopup('2 POINTS'); setTimeout(() => setScorePopup(null), 1600);
          }, 4 * DF2);
          setTimeout(() => {
            setShot({ cx: basketCx, cy: basketCy });
            const dropStart = performance.now();
            const dropDur2 = Math.round(400 / 1.5);
            const dropAnim = (now) => {
              const t = Math.min((now - dropStart) / dropDur2, 1);
              setShot({ cx: basketCx, cy: basketCy + 18 * t });
              if (t < 1) requestAnimationFrame(dropAnim);
              else setShot(null);
            };
            requestAnimationFrame(dropAnim);
          }, 7 * DF2);
        });
        addLog('driving to the basket...');

      } else if (op === 'testGamePlay') {
        if (gameLoopActiveRef.current) { addLog('already running — type stopGamePlay', 'err'); return; }
        gameLoopActiveRef.current = true;
        bgMusic.start();
        startTimer(1);
        addLog('game loop started');
        triggerJumpBall((winnerTeam) => {
          // Safety check: bail out if the game was stopped or paused while the jump ball was animating
          if (!gameLoopActiveRef.current || gamePausedRef.current) return;

          // Pick which team's possession loop to run based on who won the tip
          // (loopHomeRef / loopAwayRef are stored in refs so each loop can call
          //  the other one without stale-closure issues — see their definitions below)
          const loopFn = winnerTeam === 'home' ? loopHomeRef : loopAwayRef;

          // Move all players into their half-court offensive formation first,
          // then kick off the possession loop once the PG reaches their spot
          setupOffense(winnerTeam, () => {
            if (!gameLoopActiveRef.current || gamePausedRef.current) return;
            loopFn.current?.(); // start the game loop for the winning team
          });
        });

      } else if (op === 'stopGamePlay') {
        gameLoopActiveRef.current = false;
        wanderActiveRef.current = false;
        stopTimer();
        bgMusic.stop();
        addLog('game loop stopped');

      } else if (op === 'reset') {
        activeAnimsRef.current.delete(1);
        animCbsRef.current.delete(1);
        const { cx, cy } = gridToSvg(62, 25);
        setPlayers(prev => prev.map(p => p.id === 1 ? { ...p, cx, cy } : p));
        addLog('PG reset to top of key');

      } else if (op === 'testMoveAway') {
        // Simulate away team taking possession on the left side of the court.
        const g = gridToSvg;
        const moves = [
          { id: 1, ...g(26, 25) }, { id: 2, ...g(21, 12) }, { id: 3, ...g(21, 38) },
          { id: 4, ...g(12, 18) }, { id: 5, ...g(10, 25) },
          { id: 6, ...g(32, 25) }, { id: 7, ...g(24, 12) }, { id: 8, ...g(24, 38) },
          { id: 9, ...g(14, 18) }, { id: 10, ...g(12, 25) },
        ];
        setPlayers(prev => prev.map(p => ({ ...p, hasBall: p.id === 6 })));
        moves.forEach(m => smoothMoveTo(
          Math.round((m.cx - 30) / 620 * 94),
          Math.round((m.cy - 96) / 240 * 50),
          m.id,
          m.id <= 5 ? true : false
        ));
        addLog('away team takes possession...');

      } else if (op === 'testMoveHome') {
        // Simulate home team in standard half-court offense on the right side.
        const g = gridToSvg;
        const moves = [
          { id: 1, ...g(62, 25) }, { id: 2, ...g(70, 12) }, { id: 3, ...g(70, 38) },
          { id: 4, ...g(80, 18) }, { id: 5, ...g(82, 25) },
          { id: 6, ...g(68, 25) }, { id: 7, ...g(73, 11) }, { id: 8, ...g(73, 39) },
          { id: 9, ...g(82, 17) }, { id: 10, ...g(84, 24) },
        ];
        setPlayers(prev => prev.map(p => ({ ...p, hasBall: p.id === 1 })));
        moves.forEach(m => smoothMoveTo(
          Math.round((m.cx - 30) / 620 * 94),
          Math.round((m.cy - 96) / 240 * 50),
          m.id,
          m.id <= 5 ? true : false
        ));
        addLog('home team takes possession...');

      } else if (op === 'help') {
        addLog('move <dx> <dy>    — move ball carrier by pixels');
        addLog('moveTo <x> <y>   — smooth move ball carrier to grid');
        addLog('tp <x> <y>       — teleport PG to grid pos');
        addLog('pos              — print PG grid position');
        addLog('shoot            — shoot toward basket (make)');
        addLog('fadeaway         — fadeaway shot toward basket (make)');
        addLog('shootFail        — shoot and miss, bounce to random rebound');
        addLog('reset            — reset PG to top of key');
        addLog('testMoveAway     — away team takes possession');
        addLog('testMoveHome     — home team takes possession');
        addLog('testPass <role>  — pass to teammate (PG/SG/SF/PF/C)');
        addLog('testJumpBall     — both Cs tip off at center, 50/50 winner');
        addLog('testThrowInHome  — home C inbounds from left sideline');
        addLog('testThrowInAway  — away C inbounds from right sideline');
        addLog('testDunk         — ball carrier drives to basket and dunks');
        addLog('testGamePlay     — start continuous game loop');
        addLog('stopGamePlay     — stop the game loop');
        addLog('testSpinMove     — ball carrier performs spin move animation');
        addLog('testHomePG       — give ball to home PG for testing');
        addLog('testSpeedBurst   — ball carrier performs speed-burst dash animation');
        addLog('testDash         — alias for testSpeedBurst');
        addLog('testLevelUp      — trigger level-up sequence for ball carrier');
      } else if (op === 'testHomePG') {
        setPlayers(prev => prev.map(p => ({ ...p, hasBall: p.id === 1 })));
        addLog('ball given to home PG');
      } else if (op === 'testSpeedBurst' || op === 'testDash') {
        const carrier = playersRef.current.find(p => p.hasBall);
        if (!carrier) { addLog('no ball carrier', 'err'); return; }
        setPlayers(prev => prev.map(p => p.id === carrier.id ? { ...p, isDashing: true } : p));
        setTimeout(() => {
          setPlayers(prev => prev.map(p => p.id === carrier.id ? { ...p, isDashing: false } : p));
        }, 9 * 60);
        addLog(`${carrier.role} speed burst!`);
      } else if (op === 'testSpinMove') {
        const carrier = playersRef.current.find(p => p.hasBall);
        if (!carrier) { addLog('no ball carrier', 'err'); return; }
        setPlayers(prev => prev.map(p => p.id === carrier.id ? { ...p, isSpinning: true } : p));
        setTimeout(() => {
          setPlayers(prev => prev.map(p => p.id === carrier.id ? { ...p, isSpinning: false } : p));
        }, 12 * 80);
        addLog(`${carrier.role} spin move!`);

      } else if (op === 'testLevelUp') {
        const carrier = playersRef.current.find(p => p.hasBall) || playersRef.current[0];
        playLevelUp(); playFanfare(); setLevelUpState({ player: { ...carrier }, abilities: pickLevelUpChoices(carrier, rosterRef, abilityOverridesRef) });
        addLog(`${carrier.role} leveling up!`);
      } else {
        addLog(`unknown: "${op}" — type help`, 'err');
      }
    } catch (e) { addLog(e.message, 'err'); }
  };

  // ─── Camera ────────────────────────────────────────────────────────────────

  const carrier = players.find(p => p.hasBall) || players.find(p => p.isShooting) || players.find(p => p.isFadingAway) || players[0];

  // Smoothed camera: lerps toward the carrier each frame so possession changes
  // (pass, rebound) pan gradually instead of snapping to the new carrier.
  const initialCameraX = Math.max(0, Math.min(W - ZOOM_W, carrier.cx - ZOOM_W / 2));
  const [cameraX, setCameraX] = useState(initialCameraX);
  const cameraXRef = useRef(initialCameraX);
  // Mirrors shot state so the camera rAF loop can follow ball-in-flight
  // without the closure capturing a stale value.
  const shotRef = useRef(null);
  useEffect(() => { shotRef.current = shot; }, [shot]);

  useEffect(() => {
    let rafId;
    const tick = () => {
      // During a pass/shot arc, follow the ball itself — avoids the camera
      // drifting to the fallback player (players[0]) while nobody has hasBall.
      const ball = shotRef.current;
      const c = levelUpPlayerRef.current
        ? levelUpPlayerRef.current
        : ball ? { cx: ball.cx }
        : (playersRef.current.find(p => p.hasBall) || playersRef.current[0]);
      const target = Math.max(0, Math.min(W - ZOOM_W, c.cx - ZOOM_W / 2));
      const diff = target - cameraXRef.current;
      // Only update state when the camera actually needs to move (avoids pointless re-renders).
      if (Math.abs(diff) > 0.5) {
        const next = cameraXRef.current + diff * 0.1; // 10% lerp per frame ≈ smooth ~0.5s pan
        cameraXRef.current = next;
        setCameraX(next);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const possession = carrier.team; // 'home' | 'away'

  const onPickPlay = (play) => {
    if (play) addLog(`Play called: ${play.name}`);
    setPlayPickState(false);
    startTimer(timerSpeedRef.current);
    const resume = resumeAfterPauseRef.current;
    resumeAfterPauseRef.current = null;
    if (resume) setTimeout(resume, 300);
  };

  const onPickLevelUp = (ability) => {
    const p = levelUpState?.player;
    if (ability && p) {
      const roster = p.team === 'home' ? rosterRef.current.home : rosterRef.current.away;
      const rp = roster.find(r => (r.role ?? r.pos) === p.role);
      const hasDraft = !!rp?.ability;
      const extras = abilityOverridesRef.current.get(p.id) ?? [];
      if ((hasDraft ? 1 : 0) + extras.length < 3) {
        abilityOverridesRef.current.set(p.id, [...extras, ability]);
        addLog(`${p.role} gained: ${ability.name}!`);
      } else {
        addLog(`${p.role} already has max abilities (3)`);
      }
    } else addLog('level-up skipped');
    levelUpPlayerRef.current = null;
    setLevelUpState(null);
    gamePausedRef.current = false;
    startTimer(timerSpeedRef.current);
    const resume = resumeAfterPauseRef.current;
    resumeAfterPauseRef.current = null;
    if (resume) setTimeout(resume, 300);
  };

  const startNextQuarter = () => {
    moveEpochRef.current += 1; // cancel any still-running animations
    activeAnimsRef.current.clear();
    animCbsRef.current.clear();
    if (gameRafRef.current) { cancelAnimationFrame(gameRafRef.current); gameRafRef.current = null; }
    const freshPlayers = INITIAL_PLAYERS.map(p => ({ ...p }));
    playersRef.current = freshPlayers;
    setPlayers(freshPlayers);
    setPlayerAlpha(1);
    setTime(60);
    gamePausedRef.current = false;
    gameLoopActiveRef.current = true;
    bgMusic.start();
    startTimer(1);
    triggerJumpBall((winnerTeam) => {
      if (!gameLoopActiveRef.current || gamePausedRef.current) return;
      const loopFn = winnerTeam === 'home' ? loopHomeRef : loopAwayRef;
      setupOffense(winnerTeam, () => {
        if (!gameLoopActiveRef.current || gamePausedRef.current) return;
        loopFn.current?.();
      });
    });
  };

  const onDismissQuarterSummary = () => {
    setQuarterSummary(null);
    setQuarterAnnouncement(null);
    quarterStatsRef.current = { home: { shots: 0, dunks: 0, blocks: 0, steals: 0 }, away: { shots: 0, dunks: 0, blocks: 0, steals: 0 } };
    quarterPointsRef.current = { home: 0, away: 0 };
    setQuarter(prev => {
      const next = prev + 1;
      if (next <= 4) {
        setTimeout(startNextQuarter, 200);
      } else {
        setGameOver({ homeScore: homeScoreRef.current, awayScore: awayScoreRef.current, totalCredits: totalCreditsRef.current });
      }
      return next <= 4 ? next : prev;
    });
  };

  return { players, shot, logs, handleCommand, cameraX, possession, homeScore, awayScore, quarter, time, scorePopup, levelUpState, onPickLevelUp, playPickState, onPickPlay, jumpBallWinner, quarterAnnouncement, playerAlpha, xpFlyup, stealFlyup, blockFlyup, quarterSummary, onDismissQuarterSummary, gameOver, totalCredits, abilityOverridesRef };
}

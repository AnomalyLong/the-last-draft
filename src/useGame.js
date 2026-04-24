import { useRef, useState, useEffect } from 'react';
import { gridToSvg, svgToGrid, INITIAL_PLAYERS, SHOOT_TARGET_LEFT, SHOOT_TARGET_RIGHT, W, ZOOM_W, PLAYER_SPEED_FT_S, C_BOOST_SECS, BASKET_RIGHT_GX, BASKET_LEFT_GX, BASKET_GY, OFFENSE_RADIUS_FT, SHOOT_JUMP_OFFSETS } from './constants.js';
import { SHOOT_CHAR_FRAMES } from './sprites/index.js';

// Total time (ms) for the shoot character animation — ball launches at the midpoint
const SHOOT_DURATION = SHOOT_CHAR_FRAMES.length * 80; // 560ms

export function useGame() {
  const [players, setPlayers] = useState(() => INITIAL_PLAYERS.map(p => ({ ...p })));
  const [shot, setShot] = useState(null);
  const [logs, setLogs] = useState([
    { type: 'out', text: 'debug console ready' },
    { type: 'out', text: 'type help for commands' },
  ]);

  // ─── Game State ────────────────────────────────────────────────────────────
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [quarter, setQuarter] = useState(1);   // 1–4
  const [time, setTime] = useState(720);        // seconds (12-minute quarters)

  // playersRef mirrors players state so animation closures can read the
  // latest positions without capturing a stale closure value.
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  // Only the PG (id=1) stores its rAF handle so incoming move commands can
  // cancel an in-progress animation. Other players run fire-and-forget rAF.
  const animRef = useRef(null);

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
  const smoothMoveTo = (gridX, gridY, playerId = 1, restoreFacingRight = null, speedMult = 1, onComplete = null, boostSecs = Infinity) => {
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

    if (playerId === 1 && animRef.current) cancelAnimationFrame(animRef.current);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isMoving: true, facingRight: movingRight } : p));

    const startTime = performance.now();

    const animate = (now) => {
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

      if (!done) {
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, cx, cy, isMoving: true, facingRight: movingRight } : p));
        if (playerId === 1) animRef.current = requestAnimationFrame(animate);
        else requestAnimationFrame(animate);
      } else {
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, cx: target.cx, cy: target.cy, isMoving: false, facingRight: finalFacing } : p));
        if (onComplete) onComplete();
      }
    };

    if (playerId === 1) animRef.current = requestAnimationFrame(animate);
    else requestAnimationFrame(animate);
  };

  // ─── Reusable Game Actions ─────────────────────────────────────────────────
  // These are called by both manual commands and the testGamePlay loop.

  // Passes from the current ball carrier to a random teammate.
  const triggerPass = (onComplete = null) => {
    const passer = playersRef.current.find(p => p.hasBall);
    if (!passer) { if (onComplete) onComplete(); return; }

    const teammates = playersRef.current.filter(p => p.team === passer.team && p.id !== passer.id);
    const receiver = teammates[Math.floor(Math.random() * teammates.length)];

    const startCx = passer.cx, startCy = passer.cy;
    const endCx = receiver.cx, endCy = receiver.cy;
    const duration = 300;

    // Update ref immediately so chained calls see the correct carrier right away,
    // without waiting for the useEffect to sync after React's next render.
    playersRef.current = playersRef.current.map(p => p.id === passer.id ? { ...p, hasBall: false } : p);
    setPlayers(prev => prev.map(p => p.id === passer.id ? { ...p, hasBall: false } : p));
    setShot({ cx: startCx, cy: startCy });

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
        playersRef.current = playersRef.current.map(p => p.id === receiver.id ? { ...p, hasBall: true } : p);
        setPlayers(prev => prev.map(p => p.id === receiver.id ? { ...p, hasBall: true } : p));
        addLog(`${passer.role} → ${receiver.role}`);
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(animate);
  };

  // Runs 1–3 random passes then waits 1.5s before calling onComplete.
  // Used by the game loop so players settle into position before shooting.
  const triggerPreShoot = (onComplete = null) => {
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
      });
    };
    // 1.5s before the first pass so players reach their spots
    setTimeout(doPass, 1500);
  };

  // Shoots with whoever currently has the ball.
  // If onComplete is provided, it's called after the score instead of
  // returning the ball to the shooter (used by the game loop).
  const triggerShoot = (onComplete = null) => {
    wanderActiveRef.current = false;
    const pg = playersRef.current.find(p => p.hasBall);
    if (!pg) return;
    const startCx = pg.cx, startCy = pg.cy;
    const { cx: targetCx, cy: targetCy } = pg.team === 'home' ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
    const duration = 800;

    // Closest opposing player jumps to contest the shot (12 frames × 80ms = 960ms)
    const opponents = playersRef.current.filter(p => p.team !== pg.team);
    const blocker = opponents.reduce((closest, p) => {
      const d = Math.hypot(p.cx - startCx, p.cy - startCy);
      return !closest || d < Math.hypot(closest.cx - startCx, closest.cy - startCy) ? p : closest;
    }, null);
    if (blocker) {
      setTimeout(() => {
        setPlayers(prev => prev.map(p => p.id === blocker.id ? { ...p, isBlocking: true } : p));
        setTimeout(() => {
          setPlayers(prev => prev.map(p => p.id === blocker.id ? { ...p, isBlocking: false } : p));
        }, 12 * 80);
      }, 100);
    }

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
              addLog('swish! +2');
              onComplete();
            } else {
              // Manual shoot: restore ball to shooter.
              setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: true, isShooting: false } : p));
              if (pg.team === 'home') setHomeScore(s => s + 2);
              else setAwayScore(s => s + 2);
              addLog('swish! +2');
            }
          }, 400);
        }
      };
      requestAnimationFrame(animate);
    }, 560);
    addLog('shooting...');
  };

  // The counterpart defender got beaten — after a 1s delay they give chase,
  // following the dunker's path toward the basket so it looks like they got
  // blown past and are scrambling to recover.
  const guardDunk = (dunkerId, isHome) => {
    const defender = playersRef.current.find(p => p.team !== (isHome ? 'home' : 'away') && p.role === playersRef.current.find(p2 => p2.id === dunkerId)?.role);
    if (!defender) return;
    const launchGx = isHome ? 83 : 11;
    const nearBasketGx = isHome ? BASKET_RIGHT_GX - 3 : BASKET_LEFT_GX + 3;
    const defFacingRight = !isHome;
    setTimeout(() => {
      smoothMoveTo(launchGx, 25, defender.id, defFacingRight, 1, () => {
        smoothMoveTo(nearBasketGx, 25, defender.id, defFacingRight, 1);
      });
    }, 100);
  };

  const triggerDunk = (onComplete = null) => {
    wanderActiveRef.current = false;
    const dunker = playersRef.current.find(p => p.hasBall);
    if (!dunker) return;
    const isHome = dunker.team === 'home';
    const launchGx = isHome ? 83 : 11;
    const { cx: basketCx, cy: basketCy } = isHome ? SHOOT_TARGET_RIGHT : SHOOT_TARGET_LEFT;
    guardDunk(dunker.id, isHome);

    smoothMoveTo(launchGx, 25, dunker.id, isHome, 1, () => {
      const launcher = playersRef.current.find(p => p.id === dunker.id);
      const startCx = launcher.cx, startCy = launcher.cy;
      setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, isDunking: true, hasBall: true } : p));
      setTimeout(() => {
        const jumpDur = 8 * 80;
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
      }, 80);
      setTimeout(() => {
        if (isHome) setHomeScore(s => s + 2);
        else setAwayScore(s => s + 2);
        addLog('DUNK! +2');
      }, 4 * 80);
      setTimeout(() => {
        setShot({ cx: basketCx, cy: basketCy });
        const dropStart = performance.now();
        const dropAnim = (now) => {
          const t = Math.min((now - dropStart) / 400, 1);
          setShot({ cx: basketCx, cy: basketCy + 18 * t });
          if (t < 1) requestAnimationFrame(dropAnim);
          else {
            setShot(null);
            setTimeout(() => { if (onComplete) onComplete(); }, 400);
          }
        };
        requestAnimationFrame(dropAnim);
      }, 7 * 80);
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
      setShot({ cx: startCx, cy: startCy });
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
      setShot({ cx: startCx, cy: startCy });
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

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  const gameLoopActiveRef = useRef(false);
  const wanderActiveRef = useRef(false);
  // Refs hold the latest closures for mutual recursion between the two halves.
  const loopHomeRef = useRef(null);
  const loopAwayRef = useRef(null);

  // Starts small random movement for every player on `team` to simulate
  // half-court positioning. Each player picks a new spot every 0.5–1.5s,
  // staying within OFFENSE_RADIUS_FT of their attacking basket.
  // Stopped by setting wanderActiveRef.current = false (done in triggerPreShoot).
  const startWander = (team) => {
    wanderActiveRef.current = true;
    const basketGx = team === 'home' ? BASKET_RIGHT_GX : BASKET_LEFT_GX;
    const facingRight = team === 'home';

    const scheduleWander = (playerId) => {
      if (!wanderActiveRef.current || !gameLoopActiveRef.current) return;
      const delay = 500 + Math.random() * 1000;
      setTimeout(() => {
        if (!wanderActiveRef.current || !gameLoopActiveRef.current) return;
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
      if (!wanderActiveRef.current || !gameLoopActiveRef.current) return;
      const delay = 200 + Math.random() * 200; // reposition every 200–400ms
      setTimeout(() => {
        if (!wanderActiveRef.current || !gameLoopActiveRef.current) return;
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

  loopHomeRef.current = () => {
    if (!gameLoopActiveRef.current) return;
    startWander('home');
    startGuarding('away');
    triggerPreShoot(() => {
      if (!gameLoopActiveRef.current) return;
      const finish = () => {
        if (!gameLoopActiveRef.current) return;
        triggerThrowInAway(() => loopAwayRef.current?.());
      };
      if (Math.random() < 0.5) triggerShoot(finish);
      else triggerDunk(finish);
    });
  };

  loopAwayRef.current = () => {
    if (!gameLoopActiveRef.current) return;
    startWander('away');
    startGuarding('home');
    triggerPreShoot(() => {
      if (!gameLoopActiveRef.current) return;
      const finish = () => {
        if (!gameLoopActiveRef.current) return;
        triggerThrowInHome(() => loopHomeRef.current?.());
      };
      if (Math.random() < 0.5) triggerShoot(finish);
      else triggerDunk(finish);
    });
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
        setShot({ cx: startCx, cy: startCy });

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
        // Move to launch point, then soar toward the basket in a parabolic arc
        smoothMoveTo(launchGx, 25, dunker.id, isHome ? true : false, 1, () => {
          const launcher = playersRef.current.find(p => p.id === dunker.id);
          const startCx = launcher.cx, startCy = launcher.cy;
          setPlayers(prev => prev.map(p => p.id === dunker.id ? { ...p, isDunking: true, hasBall: true } : p));
          // Arc starts on frame 1 (one frame after animation begins)
          setTimeout(() => {
            const jumpDur = 8 * 80;
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
          }, 80);
          // Score fires at frame 5 (index 4)
          setTimeout(() => {
            if (isHome) setHomeScore(s => s + 2);
            else setAwayScore(s => s + 2);
            addLog('DUNK! +2');
          }, 4 * 80);
          // Ball leaves hand at frame 8 (index 7 = first null offset) — start drop
          setTimeout(() => {
            setShot({ cx: basketCx, cy: basketCy });
            const dropStart = performance.now();
            const dropAnim = (now) => {
              const t = Math.min((now - dropStart) / 400, 1);
              setShot({ cx: basketCx, cy: basketCy + 18 * t });
              if (t < 1) requestAnimationFrame(dropAnim);
              else setShot(null);
            };
            requestAnimationFrame(dropAnim);
          }, 7 * 80);
        });
        addLog('driving to the basket...');

      } else if (op === 'testGamePlay') {
        if (gameLoopActiveRef.current) { addLog('already running — type stopGamePlay', 'err'); return; }
        gameLoopActiveRef.current = true;
        addLog('game loop started');
        const carrier = playersRef.current.find(p => p.hasBall) || playersRef.current[0];
        if (carrier.team === 'home') loopHomeRef.current();
        else loopAwayRef.current();

      } else if (op === 'stopGamePlay') {
        gameLoopActiveRef.current = false;
        wanderActiveRef.current = false;
        addLog('game loop stopped');

      } else if (op === 'reset') {
        if (animRef.current) cancelAnimationFrame(animRef.current);
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
        addLog('shoot            — shoot toward basket');
        addLog('reset            — reset PG to top of key');
        addLog('testMoveAway     — away team takes possession');
        addLog('testMoveHome     — home team takes possession');
        addLog('testPass <role>  — pass to teammate (PG/SG/SF/PF/C)');
        addLog('testThrowInHome  — home C inbounds from left sideline');
        addLog('testThrowInAway  — away C inbounds from right sideline');
        addLog('testDunk         — ball carrier drives to basket and dunks');
        addLog('testGamePlay     — start continuous game loop');
        addLog('stopGamePlay     — stop the game loop');
      } else {
        addLog(`unknown: "${op}" — type help`, 'err');
      }
    } catch (e) { addLog(e.message, 'err'); }
  };

  // ─── Camera ────────────────────────────────────────────────────────────────

  const carrier = players.find(p => p.hasBall) || players.find(p => p.isShooting) || players[0];

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
      const c = ball ? { cx: ball.cx }
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

  return { players, shot, logs, handleCommand, cameraX, possession, homeScore, awayScore, quarter, time };
}

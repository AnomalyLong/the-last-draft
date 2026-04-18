import { useRef, useState, useEffect } from 'react';
import { gridToSvg, svgToGrid, INITIAL_PLAYERS, SHOOT_TARGET, W, ZOOM_W, PLAYER_SPEED_FT_S, C_BOOST_SECS } from './constants.js';
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
        const pg = playersRef.current.find(p => p.hasBall);
        if (!pg) { addLog('nobody has the ball', 'err'); return; }
        const startCx = pg.cx, startCy = pg.cy;
        const { cx: targetCx, cy: targetCy } = SHOOT_TARGET;
        const duration = 800;

        // Start the character shoot animation immediately, remove ball from player.
        // Also pin shot to shooter's position so the camera doesn't blink to
        // players[0] during the 320ms wind-up before the ball actually launches.
        setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: false, isShooting: true } : p));
        setShot({ cx: startCx, cy: startCy });

        // Delay the ball launch to frame 4 of the shoot animation (4 × 80ms = 320ms)
        // so the ball appears to leave the player's hand at the top of the jump.
        setTimeout(() => {
          const startTime = performance.now();
          const animate = (now) => {
            const t = Math.min((now - startTime) / duration, 1);
            const cx = startCx + (targetCx - startCx) * t;
            // Arc: linear interpolation plus a sine bump that peaks at t=0.5
            const cy = (startCy - 20) + (targetCy - (startCy - 20)) * t - 40 * Math.sin(t * Math.PI);
            setShot({ cx, cy });
            if (t < 1) requestAnimationFrame(animate);
            else {
              setShot(null);
              // Brief pause after ball arrives before returning possession.
              setTimeout(() => {
                setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, hasBall: true } : p));
                if (pg.team === 'home') setHomeScore(s => s + 2);
                else setAwayScore(s => s + 2);
                addLog('swish! +2');
              }, 400);
            }
          };
          requestAnimationFrame(animate);
        }, 320);

        // Clear the shooting pose after the full character animation completes.
        setTimeout(() => {
          setPlayers(prev => prev.map(p => p.id === pg.id ? { ...p, isShooting: false } : p));
        }, SHOOT_DURATION);
        addLog('shooting...');

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

      } else if (op === 'testThrowInAway') {
        // Away C inbounds from the right sideline while everyone else sets up.
        // After the pass, C and PG run to their testMoveAway spots.

        // Snap C to out-of-bounds throw-in spot, PG to receiving position.
        // Clear hasBall from everyone else — C holds the ball.
        setPlayers(prev => prev.map(p => {
          if (p.id === 10) return { ...p, cx: 660, cy: 216, hasBall: true,  facingRight: false };
          if (p.id === 6)  return { ...p, cx: 562, cy: 216, hasBall: false, facingRight: false };
          return { ...p, hasBall: false };
        }));

        // All other players move to their testMoveAway formation positions right away.
        const otherMoves = [
          { id: 1, gx: 26, gy: 25 }, { id: 2, gx: 21, gy: 12 }, { id: 3, gx: 21, gy: 38 },
          { id: 4, gx: 12, gy: 18 }, { id: 5, gx: 10, gy: 25 },
          { id: 7, gx: 24, gy: 12 }, { id: 8, gx: 24, gy: 38 }, { id: 9, gx: 14, gy: 18 },
        ];
        otherMoves.forEach(({ id, gx, gy }) => smoothMoveTo(gx, gy, id, id <= 5 ? true : false));
        addLog('away throw-in...');

        // 1-second pause then inbound pass from C to PG.
        setTimeout(() => {
          const startCx = 660, startCy = 216;
          // Set shot and remove hasBall in the same synchronous block so React
          // batches them — prevents a frame where nobody has the ball and shot
          // is null (which makes the camera blink to players[0]).
          setPlayers(prev => prev.map(p => p.id === 10 ? { ...p, hasBall: false } : p));
          setShot({ cx: startCx, cy: startCy });
          const endCx   = 562, endCy   = 216;
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
              // C and PG now run to their testMoveAway formation spots.
              smoothMoveTo(12, 25, 10, false, 2, null, C_BOOST_SECS); // away C — 2× burst then normal
              smoothMoveTo(32, 25, 6,  false);                       // away PG
            }
          };
          requestAnimationFrame(animate);
        }, 200);

      } else if (op === 'reset') {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        const { cx, cy } = gridToSvg(62, 25);
        setPlayers(prev => prev.map(p => p.id === 1 ? { ...p, cx, cy } : p));
        addLog('PG reset to top of key');

      } else if (op === 'testMoveAway') {
        // Simulate away team taking possession on the left side of the court.
        // Grid coords → SVG → grid again because smoothMoveTo takes grid coords
        // but the position table is authored in grid space via gridToSvg.
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
          m.id <= 5 ? true : false  // home players face right (defending), away face left (attacking)
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
          m.id <= 5 ? true : false  // home attacks right (face right), away defends right (face left)
        ));
        addLog('home team takes possession...');

      } else if (op === 'help') {
        addLog('move <dx> <dy>   — move ball carrier by pixels');
        addLog('moveTo <x> <y>  — smooth move ball carrier to grid');
        addLog('tp <x> <y>      — teleport PG to grid pos');
        addLog('pos             — print PG grid position');
        addLog('shoot           — shoot toward basket');
        addLog('reset           — reset PG to top of key');
        addLog('testMoveAway    — away team takes possession');
        addLog('testMoveHome    — home team takes possession');
        addLog('testPass <role>  — pass to teammate by role (PG/SG/SF/PF/C)');
        addLog('testThrowInAway — away C inbounds from right sideline to PG');
      } else {
        addLog(`unknown: "${op}" — type help`, 'err');
      }
    } catch (e) { addLog(e.message, 'err'); }
  };

  // ─── Camera ────────────────────────────────────────────────────────────────

  const carrier = players.find(p => p.hasBall) || players[0];

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

  // Derived from hasBall — always in sync with player state, no separate tracking needed.
  const possession = carrier.team; // 'home' | 'away'

  return { players, shot, logs, handleCommand, cameraX, possession, homeScore, awayScore, quarter, time };
}

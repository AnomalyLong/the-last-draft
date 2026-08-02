# Player Stats & Gameplay

Every player has four core stats — **ACC**, **JMP**, **SPD**, **DEX** — set at draft
time and slightly boosted by stat-upgrade level-ups (`STAT_POOL` in `useGame.js`).
This doc covers what each stat actually *does* mechanically, plus how abilities
and defense reads interact with those formulas. All formulas below are taken
directly from `src/constants.js` and `src/useGame.js`.

Where a formula is "centered at 50," that's the roster baseline — a player
sitting exactly at 50 in that stat sees **no tilt at all**, positive or
negative. Draft pool stats range roughly 15–99, so real games see a fairly
wide spread.

---

## ACC — Accuracy

**The original, pre-existing stat.** Drives whether a shot goes in at all.

```
isMake = Math.random() * 100 < acc
```

- Used directly as a make-percentage (0–100) on every regular jump-shot
  attempt (`attemptShotRef`).
- **SHARPSHOOTER** ability: `+10` to effective ACC, and the shot itself becomes
  a fadeaway with a near-zero block chance (`blockRate = 0.01` passed to
  `triggerFadeaway`) — so it's both more accurate *and* much safer to attempt.
- Also used for the last-second buzzer-beater: if the shot is beyond the
  3pt arc it's a flat 10% regardless of ACC; inside the arc, ACC applies as
  normal.

ACC has no effect on blocking, stealing, or the jump ball — it's purely a
scoring stat.

---

## JMP — Jump

Originally just flavor; now affects **jump ball** and **blocking**.

### Jump ball (center vs. center)

```
homeWinProb = clamp(0.5 + (homeJmp - awayJmp) * 0.0015, 0.35, 0.65)
```

- Equal JMP → exact 50/50.
- Every point of JMP advantage for your Center tilts the opening tip
  ~0.15% in your favor.
- Clamped to **35%–65%** so no gap (even the full ~85-point draft-pool
  spread) can push the odds past "slightly favored." A +10 JMP edge is
  ~51.5/48.5; the clamp only kicks in around a ~100-point gap.

### Blocking (defender's own JMP)

```
jmpTilt = (blockerJmp - 50) * 0.0008
blockRate = base + ironBonus + counterBonus + jmpTilt   // clamped 0–0.75
```

- Centered at the roster baseline (50), so an average defender is
  unaffected — only a Center/defender notably above or below 50 JMP
  feels this.
- At the draft pool's extremes (~15–99 JMP) this swings block chance by
  roughly **−3% to +4%** off the 20% base — deliberately subtle.

---

## SPD / DEX — Speed & Dexterity

Both now feed **stealing**, averaged together:

```
statTilt = ((defenderSpd + defenderDex) / 2 - 50) * 0.0015
stealRate = clamp(STEAL_RATE + pickPocketBonus + statTilt, 0, 0.6)
```

- `STEAL_RATE` base is **7.5%**.
- Centered at 50 like the JMP tilt above — an average defender sees no
  change.
- A defender with both SPD and DEX well above 50 gets a meaningfully
  better shot at jumping the passing lane; below 50, worse.
- Steal attempts only happen on the pass phase, when a defender is close
  enough to the passing lane to have a shot at it in the first place —
  SPD/DEX don't create more steal *opportunities*, just better odds when
  one occurs.

---

## Blocking — full formula

```
blockRate = BLOCK_RATE                          // 0.20 base
          + (blocker has IRON BLOCK ? 0.10 : 0)
          + (blocker's team called the defense that counters
             the AI's play this possession ? 0.05 : 0)
          + (blockerJmp - 50) * 0.0008
// clamped to [0, 0.75]
```

- **Base 20%** — only rolled at all if a defender is close enough to
  contest the shot (`triggerBlockAnimation` picks the nearest opponent).
- **IRON BLOCK**: flat **+10 points**.
- **Defense-counter bonus**: flat **+5 points**, awarded only when you
  (the human, playing defense) pick the defense call that hard-counters
  the AI's play this possession (see `DEFENSE_COUNTERS` below). This is
  the same "correct read" moment that also pays out +50 credits — now it
  also makes the resulting block roll slightly more likely.
- **JMP tilt**: see above.
- Applies identically on the normal jump-shot path and the fadeaway path
  (`computeBlockRate` is shared by both).

Worked example — defender has IRON BLOCK, JMP 90, and you called the
correct counter-defense:
```
0.20 + 0.10 (iron block) + 0.05 (counter) + (90-50)*0.0008 (≈0.032)
≈ 0.382 → ~38% block chance on that possession
```

---

## Stealing — full formula

```
stealRate = STEAL_RATE                              // 0.075 base
          + (defender has PICK POCKET ? 0.10 : 0)
          + ((defenderSpd + defenderDex)/2 - 50) * 0.0015
// clamped to [0, 0.6]
```

- **Base 7.5%**, only rolled when a defender is positioned to jump the
  passing lane on a given pass.
- **PICK POCKET**: flat **+10 points**.
- **SPD/DEX tilt**: see above.

---

## Defense reads — the counter system

Each defense call hard-counters exactly one offensive play:

| Defense call | id           | Counters      |
|---|---|---|
| ZONE   | `motion`     | Pick & Roll |
| MAN    | `guard`      | Isolation |
| PRESS  | `aggressive` | Motion offense |

Calling the right defense against the AI's actual play (checked *before*
the picker appears, so it's graded on the real upcoming play, not chance)
grants:
- **+50 credits** (`DEFENSE_BONUS_CREDITS`, tallied at quarter end)
- **+5% block chance** on that possession's shot attempt (above)
- A "DEFENSE BONUS!" popup

---

## Abilities that interact with these stats

| Ability | Effect |
|---|---|
| **SHARPSHOOTER** | +10 effective ACC; shot becomes a fadeaway with ~1% block chance |
| **IRON BLOCK** | +10 points flat to blocker's block rate |
| **PICK POCKET** | +10 points flat to defender's steal rate |
| **DUNK MASTER** | +10% chance a shot attempt becomes a dunk instead; dunks always render as the spin-dunk animation |
| **ANKLE BREAKER** | Spins past the nearest defender (visual/positional) before shooting/dunking — doesn't change block/steal odds directly |
| **PLAY MAKER** | Flags a pass as a "special pass" (visual) |
| **SPEEDY** | Burst of speed after a steal or reception when a lane to the basket is open |

Max **3 abilities** per player (1 optional draft ability + up to 2 earned via
level-up), enforced by `src/shared/abilities.ts` so the offer list and the
cap can't drift apart.

---

## Design notes / tuning knobs

All the constants above live in `src/constants.js` under clearly labeled
sections (`Game Rates`, and the blocking/stealing tilt constants), so tuning
any of this is a one-line change:

- `JUMP_BALL_TILT_PER_JMP_POINT` / `_MIN` / `_MAX`
- `BLOCK_JMP_TILT_PER_POINT`, `DEFENSE_COUNTER_BLOCK_BONUS`, `BLOCK_RATE_MAX`
- `STEAL_STAT_TILT_PER_POINT`, `STEAL_RATE_MAX`

Everything is deliberately clamped so no combination of ability + stat +
defense-read bonuses can approach a guaranteed outcome — the intent across
all three systems (jump ball, block, steal) is "slightly favors the better
stat/read," never "decides the outcome."

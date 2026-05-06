// ─── Game Rates ───────────────────────────────────────────────────────────────
export const STEAL_RATE = 0.50; // probability a pass is stolen (0–1)
export const DUNK_RATE  = 0.20; // probability a shot attempt becomes a dunk (0–1)
export const BLOCK_RATE = 0.20; // probability the closest defender blocks a shot (0–1)

export const MISS_REBOUND_MIN_FT  = 5;  // grid-ft: nearest rebound lands from basket on a miss
export const MISS_REBOUND_MAX_FT  = 15; // grid-ft: farthest rebound lands from basket on a miss
export const BLOCK_REBOUND_MIN_FT = 5;  // grid-ft: nearest rebound lands from basket on a block
export const BLOCK_REBOUND_MAX_FT = 8;  // grid-ft: farthest rebound lands from basket on a block

// ─── Court Layout ────────────────────────────────────────────────────────────
export const W = 680;
export const ZOOM_W = Math.round(W * 0.6); // 408 — camera viewport width
export const TOP_BAR = 96;
export const COURT_H = 240;
export const BOT_BAR = 12;
export const TOTAL_H = TOP_BAR + COURT_H + BOT_BAR;
export const COURT_Y = TOP_BAR;
export const COURT_MID_Y = COURT_Y + COURT_H / 2;

// ─── Quarter Break ────────────────────────────────────────────────────────────
export const QUARTER_END_ALPHA = 0; // opacity target for players and ball when a quarter ends

// ─── Jersey Colors ────────────────────────────────────────────────────────────
export const JERSEY_HOME = "#1a4fa0"; // blue
export const JERSEY_AWAY = "#c02020"; // red
export const JERSEY_BASE = "#AC3232"; // placeholder color in sprite data
export const JERSEY_DARK_BASE = "#8a1a1a";

// ─── Grid <-> SVG Conversion ─────────────────────────────────────────────────
// Court grid is 94ft wide x 50ft tall
// SVG court occupies x=30..650, y=96..336

export const gridToSvg = (gx, gy) => ({
  cx: 30 + (gx / 94) * 620,
  cy: 96 + (gy / 50) * 240,
});

export const svgToGrid = (cx, cy) => ({
  x: Math.round((cx - 30) / 620 * 94),
  y: Math.round((cy - 96) / 240 * 50),
});

// ─── XP / Levelling ──────────────────────────────────────────────────────────
export const MAX_LEVEL = 10;
// XP needed to advance FROM level n: 10, 20, 40, 80 … (doubles each level)
export const XP_FOR_LEVEL = (n) => Math.round(10 * Math.pow(2, n - 1));

// ─── Initial Player Positions ────────────────────────────────────────────────
const g = gridToSvg;

export const INITIAL_PLAYERS = [
  // Jump ball formation — blue (home) left half, red (away) right half, no one has ball
  { id: 1,  role: "PG", team: "home", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: true,  level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(41, 20) },
  { id: 2,  role: "SG", team: "home", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: true,  level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(41, 30) },
  { id: 3,  role: "SF", team: "home", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: true,  level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(34, 25) },
  { id: 4,  role: "PF", team: "home", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: true,  level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(38, 16) },
  { id: 5,  role: "C",  team: "home", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: true,  level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(46, 25) },
  { id: 6,  role: "PG", team: "away", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: false, level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(53, 20) },
  { id: 7,  role: "SG", team: "away", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: false, level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(53, 30) },
  { id: 8,  role: "SF", team: "away", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: false, level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(60, 25) },
  { id: 9,  role: "PF", team: "away", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: false, level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(56, 16) },
  { id: 10, role: "C",  team: "away", hasBall: false, isMoving: false, isShooting: false, isDunking: false, isBlocking: false, isJumpBall: false, isChargingJump: false, isStealing: false, isSpinning: false, isDashing: false, facingRight: false, level: 1, xp: 0, xpMax: XP_FOR_LEVEL(1), ...g(48, 25) },
];

// ─── Player Speed ────────────────────────────────────────────────────────────
export const PLAYER_SPEED_FT_S = 16; // ft/s base movement speed
export const C_BOOST_SECS = 1.35;    // seconds C's 2× speed burst lasts

// ─── Shoot Targets ───────────────────────────────────────────────────────────
export const SHOOT_TARGET_RIGHT = { cx: 638, cy: 188 }; // home attacks right
export const SHOOT_TARGET_LEFT  = { cx: 42,  cy: 188 }; // away attacks left
export const SHOOT_TARGET = SHOOT_TARGET_RIGHT;          // legacy alias

// ─── Basket Grid Positions ───────────────────────────────────────────────────
// Derived from SHOOT_TARGET SVG coords via svgToGrid:
//   right basket: cx=638 → gx = (638-30)/620*94 ≈ 92   gy=25 (vertical center)
//   left  basket: cx=42  → gx = (42-30)/620*94  ≈  2   gy=25
export const BASKET_RIGHT_GX = 92; // grid x of the right basket (home attacks here)
export const BASKET_LEFT_GX  = 2;  // grid x of the left basket  (away attacks here)
export const BASKET_GY       = 25; // both baskets sit on the vertical midline

// ─── Offensive Zone Radius ───────────────────────────────────────────────────
// NBA 3-point line sits ~23.75ft from the basket. We use 24ft as the boundary
// so offensive players stay inside the arc during half-court sets.
// Enforced as Euclidean distance in grid feet:
//   sqrt((BASKET_GX - gx)² + (BASKET_GY - gy)²) ≤ OFFENSE_RADIUS_FT
//
// Rough grid bounds this produces:
//   Home (attacking right): gx ≥ 68  (92 - 24)
//   Away (attacking left):  gx ≤ 26  ( 2 + 24)
export const OFFENSE_RADIUS_FT = 24;

// ─── Shoot Jump Offsets ───────────────────────────────────────────────────────
// Per-frame upward Y offset (SVG px) applied to both the player sprite and the
// ball-in-hand during the shoot animation. Index matches SHOOT_CHAR_FRAMES index.
// Rise: 0→10px by frame 4, peak 14px at frame 5c, drops back to 0 on landing.
export const SHOOT_JUMP_OFFSETS = [0, 3, 6, 10, 11, 12, 14, 8, 0, 0];

// ─── Block Jump Offsets ───────────────────────────────────────────────────────
// Per-frame upward Y offset (SVG px) for the block jump animation.
// 11 frames: crouch → leave ground → rise → peak (×3 hang) → descend → land → settle.
export const BLOCK_JUMP_OFFSETS = [0, 3, 10, 18, 20, 20, 20, 14, 6, 0, 0];

// ─── Jump Ball Jump Offsets ───────────────────────────────────────────────────
// 9 frames peaking at frame 4 (midpoint of reversed-dunk arc) — 8px max rise.
export const JUMP_BALL_JUMP_OFFSETS = [0, 2, 4, 6, 8, 6, 4, 2, 0];

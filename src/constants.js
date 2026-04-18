// ─── Court Layout ────────────────────────────────────────────────────────────
export const W = 680;
export const ZOOM_W = Math.round(W * 0.6); // 408 — camera viewport width
export const TOP_BAR = 96;
export const COURT_H = 240;
export const BOT_BAR = 12;
export const TOTAL_H = TOP_BAR + COURT_H + BOT_BAR;
export const COURT_Y = TOP_BAR;
export const COURT_MID_Y = COURT_Y + COURT_H / 2;

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

// ─── Initial Player Positions ────────────────────────────────────────────────
const g = gridToSvg;

export const INITIAL_PLAYERS = [
  // Home team — offense, attacking right basket
  { id: 1,  role: "PG", team: "home", hasBall: true,  isMoving: false, isShooting: false, facingRight: true,  ...g(62, 25) },
  { id: 2,  role: "SG", team: "home", hasBall: false, isMoving: false, isShooting: false, facingRight: true,  ...g(70, 12) },
  { id: 3,  role: "SF", team: "home", hasBall: false, isMoving: false, isShooting: false, facingRight: true,  ...g(70, 38) },
  { id: 4,  role: "PF", team: "home", hasBall: false, isMoving: false, isShooting: false, facingRight: true,  ...g(80, 18) },
  { id: 5,  role: "C",  team: "home", hasBall: false, isMoving: false, isShooting: false, facingRight: true,  ...g(82, 25) },
  // Away team — defense, guarding right basket
  { id: 6,  role: "PG", team: "away", hasBall: false, isMoving: false, isShooting: false, facingRight: false, ...g(68, 25) },
  { id: 7,  role: "SG", team: "away", hasBall: false, isMoving: false, isShooting: false, facingRight: false, ...g(73, 11) },
  { id: 8,  role: "SF", team: "away", hasBall: false, isMoving: false, isShooting: false, facingRight: false, ...g(73, 39) },
  { id: 9,  role: "PF", team: "away", hasBall: false, isMoving: false, isShooting: false, facingRight: false, ...g(82, 17) },
  { id: 10, role: "C",  team: "away", hasBall: false, isMoving: false, isShooting: false, facingRight: false, ...g(84, 24) },
];

// ─── Player Speed ────────────────────────────────────────────────────────────
export const PLAYER_SPEED_FT_S = 16; // ft/s base movement speed
export const C_BOOST_SECS = 1.35;    // seconds C's 2× speed burst lasts

// ─── Shoot Target ────────────────────────────────────────────────────────────
export const SHOOT_TARGET = { cx: 638, cy: 188 }; // right backboard

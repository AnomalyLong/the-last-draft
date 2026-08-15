import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain JS sprite modules, no type decls
import { outlinePixels } from './outline.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { BALL_FRAMES } from './ball.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { SHOT_FRAMES } from './shot.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { SPIN_MOVE_FRAMES } from './spinmove.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { PICK_FRAMES } from './pick.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { IRON_BLOCK_FRAMES } from './ironblock.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { DASH_FRAMES } from './dash.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { FADEAWAY_FRAMES } from './fadeaway.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { PICKPOCKET_FRAMES } from './pickpocket.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { DUNKSPIN_FRAMES } from './dunkspin.js';
// @ts-expect-error -- plain JS sprite module, no type declarations
import { IDLE_FRAMES } from './idle.js';

type Px = [number, number, string];

const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

const key = (x: number, y: number) => `${x},${y}`;

/** Asserts the four spec invariants for one frame. */
function assertOutline(pixels: Px[]) {
  const filled = new Set(pixels.map(([x, y]) => key(x, y)));
  const outline = outlinePixels(pixels) as [number, number][];
  const outSet = new Set(outline.map(([x, y]) => key(x, y)));

  // 1. Existing sprite pixels are never modified — no outline pixel lands on ink.
  expect(outline.filter(([x, y]) => filled.has(key(x, y)))).toEqual([]);

  // 2. Every outline pixel has at least one ORTHOGONAL filled neighbour.
  expect(outline.filter(([x, y]) =>
    !ORTHO.some(([dx, dy]) => filled.has(key(x + dx, y + dy))))).toEqual([]);

  // 3. Completeness — every transparent pixel orthogonally touching ink IS outlined.
  const missing: string[] = [];
  for (const [x, y] of pixels) {
    for (const [dx, dy] of ORTHO) {
      const k = key(x + dx, y + dy);
      if (!filled.has(k) && !outSet.has(k)) missing.push(k);
    }
  }
  expect(missing).toEqual([]);

  // 4. Diagonal-only contact stays transparent (this is what rounds the corners).
  expect(outline.filter(([x, y]) =>
    !ORTHO.some(([dx, dy]) => filled.has(key(x + dx, y + dy))) &&
    DIAG.some(([dx, dy]) => filled.has(key(x + dx, y + dy))))).toEqual([]);
}

describe('outlinePixels', () => {
  it('gives a single pixel exactly 4 orthogonal neighbours and no diagonals', () => {
    const out = outlinePixels([[5, 5, '#fff']]) as [number, number][];
    expect(out.length).toBe(4);
    expect(new Set(out.map(([x, y]) => key(x, y))))
      .toEqual(new Set(['6,5', '4,5', '5,6', '5,4']));
  });

  it('leaves a diagonal-only corner pixel transparent', () => {
    // Two pixels touching at a corner: the shared diagonal gap (1,0)/(0,1) must
    // still be outlined (each is orthogonal to one of them), but the far corners
    // of the 2x2 must not be filled by diagonal contact alone.
    const out = outlinePixels([[0, 0, '#fff'], [1, 1, '#fff']]) as [number, number][];
    const s = new Set(out.map(([x, y]) => key(x, y)));
    expect(s.has('2,2')).toBe(false);
    expect(s.has('-1,-1')).toBe(false);
  });

  it('emits the 1px canvas expansion (negative coords allowed)', () => {
    // Ball ink starts at x=1,y=1 in the 7x7 box; a sprite touching 0 must
    // produce -1, i.e. the canvas grew by 1px rather than clipping the outline.
    const out = outlinePixels([[0, 0, '#fff']]) as [number, number][];
    const s = new Set(out.map(([x, y]) => key(x, y)));
    expect(s.has('-1,0')).toBe(true);
    expect(s.has('0,-1')).toBe(true);
  });

  it('returns no outline for an empty frame', () => {
    expect(outlinePixels([])).toEqual([]);
    expect(outlinePixels(undefined as never)).toEqual([]);
  });

  it('is stable across repeated calls (cache returns the same set)', () => {
    const frame = BALL_FRAMES.up;
    expect(outlinePixels(frame)).toBe(outlinePixels(frame));
  });

  // The ball, in every bounce phase — dribble ball (Ball.jsx) and the dunk ball
  // baked into Player.jsx both draw these.
  describe.each(Object.keys(BALL_FRAMES))('BALL_FRAMES.%s', (phase) => {
    it('satisfies the outline invariants', () => {
      assertOutline(BALL_FRAMES[phase as keyof typeof BALL_FRAMES]);
    });
  });

  // Shot arc ball (ShotBall.jsx) + special pass ball (SpecialPassBall.jsx).
  describe.each(SHOT_FRAMES.map((_: Px[], i: number) => i))('SHOT_FRAMES[%i]', (i: number) => {
    it('satisfies the outline invariants', () => {
      assertOutline(SHOT_FRAMES[i]);
    });
  });

  // Every frame set the special-move cards animate.
  const CARD_FRAMES: Record<string, Px[][]> = {
    IRON_BLOCK_FRAMES, PICKPOCKET_FRAMES, SPIN_MOVE_FRAMES,
    DASH_FRAMES, FADEAWAY_FRAMES, PICK_FRAMES, DUNKSPIN_FRAMES, IDLE_FRAMES,
  };
  describe.each(Object.keys(CARD_FRAMES))('%s', (name) => {
    it('satisfies the outline invariants on every frame', () => {
      const frames = CARD_FRAMES[name];
      expect(frames.length).toBeGreaterThan(0);
      frames.forEach((f) => assertOutline(f));
    });
  });
});

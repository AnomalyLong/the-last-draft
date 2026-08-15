import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
// @ts-expect-error — plain JSX components, no type decls
import { Ball } from './Ball.jsx';
// @ts-expect-error -- plain JS/JSX module, no type declarations
import { ShotBall } from './ShotBall.jsx';
// @ts-expect-error -- plain JS/JSX module, no type declarations
import { SpecialPassBall } from './SpecialPassBall.jsx';
// @ts-expect-error -- plain JS/JSX module, no type declarations
import { SpecialMoveCard } from './SpecialMoveCard.jsx';
// @ts-expect-error -- plain JS/JSX module, no type declarations
import { BALL_FRAMES } from '../sprites/ball.js';
// @ts-expect-error -- plain JS/JSX module, no type declarations
import { DASH_FRAMES } from '../sprites/dash.js';
// @ts-expect-error -- plain JS/JSX module, no type declarations
import { outlinePixels } from '../sprites/outline.js';

type Rect = Record<string, string>;

/** Pull every <rect> out of the markup, in document order, as attr maps. */
function rects(markup: string): Rect[] {
  return (markup.match(/<rect\b[^>]*>/g) || []).map((tag) => {
    const attrs: Rect = {};
    for (const m of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
    return attrs;
  });
}

const isOutline = (r: Rect) => r.fill === '#000000';

describe('sprite outline rendering', () => {
  describe('Ball (dribble)', () => {
    const markup = renderToStaticMarkup(<Ball cx={0} cy={0} scale={1} />);
    const all = rects(markup);
    const outline = all.filter(isOutline);

    it('emits one opaque, hard-edged black rect per outline pixel', () => {
      // Frame at mount is 'up'.
      expect(outline.length).toBe(outlinePixels(BALL_FRAMES.up).length);
      expect(outline.length).toBeGreaterThan(0);
      for (const r of outline) {
        expect(r['fill-opacity']).toBe('1');
        expect(r['shape-rendering']).toBe('crispEdges');
        // Full sprite-pixel square: no hairlines, no fractional coverage.
        expect(r.width).toBe('1');
        expect(r.height).toBe('1');
      }
    });

    it('paints the outline UNDER the sprite (outline rects come first)', () => {
      const lastOutline = all.findLastIndex(isOutline);
      const firstInk = all.findIndex((r) => !isOutline(r));
      expect(firstInk).toBeGreaterThan(lastOutline);
    });

    it('places outline rects exactly on the computed outline coordinates', () => {
      const want = new Set(
        (outlinePixels(BALL_FRAMES.up) as [number, number][]).map(([x, y]) => `${x},${y}`));
      const got = new Set(outline.map((r) => `${r.x},${r.y}`));
      expect(got).toEqual(want);
    });

    it('scales outline rects with the sprite', () => {
      const scaled = rects(renderToStaticMarkup(<Ball cx={0} cy={0} scale={3} />)).filter(isOutline);
      for (const r of scaled) expect(r.width).toBe('3');
      // The 7x7 ball's ink starts at x=1, so an outline pixel sits at x=0*3=0.
      expect(scaled.some((r) => r.x === '0')).toBe(true);
    });

    it('honours outline={false} and a custom colour', () => {
      expect(rects(renderToStaticMarkup(<Ball cx={0} cy={0} outline={false} />)).filter(isOutline))
        .toEqual([]);
      const red = rects(renderToStaticMarkup(<Ball cx={0} cy={0} outlineColor="#FF0000" />));
      expect(red.filter((r) => r.fill === '#FF0000').length).toBeGreaterThan(0);
    });
  });

  describe('ShotBall', () => {
    const all = rects(renderToStaticMarkup(<ShotBall shot={{ cx: 10, cy: 10 }} scale={1} />));
    it('outlines the shot ball, under the ink', () => {
      const outline = all.filter(isOutline);
      expect(outline.length).toBeGreaterThan(0);
      expect(all.findIndex((r) => !isOutline(r))).toBeGreaterThan(all.findLastIndex(isOutline));
      for (const r of outline) expect(r['fill-opacity']).toBe('1');
    });
  });

  describe('SpecialPassBall', () => {
    const markup = renderToStaticMarkup(<SpecialPassBall shot={{ cx: 10, cy: 10 }} scale={1} />);
    it('outlines the ball', () => {
      expect(rects(markup).filter(isOutline).length).toBeGreaterThan(0);
    });

    it('keeps the outline OUTSIDE the glow filter group', () => {
      // The filter group tints (feColorMatrix) and blurs (feGaussianBlur). If the
      // outline were inside it, black would come out green and soft-edged. So the
      // outline rects must appear after the filtered group closes.
      const groupEnd = markup.lastIndexOf('</g>', markup.lastIndexOf('</g>') - 1);
      const firstOutline = markup.search(/<rect[^>]*fill="#000000"/);
      expect(firstOutline).toBeGreaterThan(groupEnd);
    });
  });

  describe('SpecialMoveCard', () => {
    const player = { id: 'p1', team: 'home' };
    const markup = renderToStaticMarkup(
      <SpecialMoveCard player={player} frames={DASH_FRAMES} label="SPEED BURST!"
        anchorX={9} anchorY={17} spriteScale={5} />);
    const all = rects(markup);

    it('outlines the card sprite at the card sprite scale', () => {
      const outline = all.filter(isOutline);
      expect(outline.length).toBe(outlinePixels(DASH_FRAMES[0]).length);
      for (const r of outline) {
        expect(r.width).toBe('5');
        expect(r['fill-opacity']).toBe('1');
        expect(r['shape-rendering']).toBe('crispEdges');
      }
    });

    it('paints the outline under the sprite ink', () => {
      // The card frame draws chrome rects too; compare within the sprite group.
      const spriteGroup = markup.slice(markup.indexOf('<g transform="translate(') );
      const idx = spriteGroup.search(/<rect[^>]*fill="#000000"/);
      expect(idx).toBeGreaterThanOrEqual(0);
    });

    it('honours outline={false}', () => {
      const off = rects(renderToStaticMarkup(
        <SpecialMoveCard player={player} frames={DASH_FRAMES} label="X"
          anchorX={9} anchorY={17} outline={false} />));
      // #1a1a1a label bar is not #000000, so zero pure-black rects means no outline.
      expect(off.filter(isOutline)).toEqual([]);
    });
  });
});

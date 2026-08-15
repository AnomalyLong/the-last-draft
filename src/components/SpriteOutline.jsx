import React from 'react';
import { outlinePixels } from '../sprites/outline.js';

// Shared renderer for the 1px 4-connected sprite outline.
//
// Paint this BEFORE the sprite's own pixels so it sits underneath — the outline
// only ever occupies transparent pixels, so it can't cover sprite ink, but
// painting it first also keeps the sprite authoritative if a caller ever passes
// a mismatched frame.
//
// Geometry is deliberately split into `scale` (pixel pitch) and `size` (drawn
// rect size) because not every call site draws a sprite pixel as a `scale`-sized
// square: Player's dunk ball lays its 7x7 ball out at 1-unit pitch inside an
// already-scaled group. Same outline maths either way.
//
// `ox`/`oy` shift the whole outline layer, for call sites that bake a sub-pixel
// offset into each rect's x/y rather than into a wrapping transform.
export function SpriteOutline({ pixels, scale = 1, size = scale, ox = 0, oy = 0, color = '#000000' }) {
  return (
    <>
      {outlinePixels(pixels).map(([x, y], i) => (
        <rect key={`o${i}`}
          x={ox + x * scale} y={oy + y * scale}
          width={size} height={size}
          fill={color} fillOpacity={1} shapeRendering="crispEdges" />
      ))}
    </>
  );
}

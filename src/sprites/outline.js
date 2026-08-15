// 1px rounded sprite outline via 4-connected dilation.
//
// Sprites are pixel arrays of [x, y, colour]; any coordinate NOT present in the
// array is a fully transparent pixel. For every transparent pixel we ask: does
// at least one of its four ORTHOGONAL neighbours (up/down/left/right) contain a
// sprite pixel? If yes, that transparent pixel becomes an outline pixel.
// Diagonal-only contact (corner touch) stays transparent, which is what gives
// the outline its rounded corners.
//
// Equivalent (and cheaper) formulation used below: walk the sprite pixels and
// collect their 4 orthogonal neighbours that are themselves empty. Same set.
//
// Existing sprite pixels are never modified — the outline is emitted as a
// separate layer painted UNDER the sprite. Coordinates may go to -1 (or W/H),
// i.e. the implicit 1px canvas expansion; the SVG group is unclipped so this
// renders without cropping. Everything stays hard-edged: outline rects are full
// alpha, one sprite-pixel square each, no anti-aliasing.

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Frame arrays are module-level constants, so cache by array identity.
const cache = new WeakMap();

/**
 * @param {Array<[number,number,string]>} pixels sprite frame
 * @returns {Array<[number,number]>} outline pixel coordinates
 */
export function outlinePixels(pixels) {
  if (!Array.isArray(pixels) || pixels.length === 0) return [];

  const hit = cache.get(pixels);
  if (hit) return hit;

  const filled = new Set();
  for (let i = 0; i < pixels.length; i++) {
    filled.add(pixels[i][0] + ',' + pixels[i][1]);
  }

  const seen = new Set();
  const out = [];
  for (let i = 0; i < pixels.length; i++) {
    const x = pixels[i][0], y = pixels[i][1];
    for (let n = 0; n < 4; n++) {
      const nx = x + NEIGHBOURS[n][0];
      const ny = y + NEIGHBOURS[n][1];
      const key = nx + ',' + ny;
      if (filled.has(key)) continue;   // occupied → not an outline pixel
      if (seen.has(key)) continue;     // already emitted
      seen.add(key);
      out.push([nx, ny]);
    }
  }

  cache.set(pixels, out);
  return out;
}

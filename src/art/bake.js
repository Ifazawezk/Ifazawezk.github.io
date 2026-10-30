import { PAL } from './palette.js';

// Turn rows of letters into a canvas once, then only ever draw the canvas.
export function bake(rows, flip = false) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = PAL[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    });
  });
  return c;
}

// Both facings of a sprite, keyed by direction.
export function bakePair(rows) {
  return { 1: bake(rows), [-1]: bake(rows, true) };
}

export function bakeAll(map) {
  const out = {};
  for (const [name, rows] of Object.entries(map)) out[name] = bakePair(rows);
  return out;
}

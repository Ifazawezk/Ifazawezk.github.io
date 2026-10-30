// Little painting helpers shared by the tile and background code.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rect(ctx, color, x, y, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Sky in flat bands with a checker dither between them, the way an old game
// with no spare colours would do it.
export function bandedSky(ctx, colors, w, h) {
  const band = h / colors.length;
  colors.forEach((color, i) => {
    const y0 = Math.floor(i * band);
    rect(ctx, color, 0, y0, w, Math.ceil(band));
    const next = colors[i + 1];
    if (!next) return;
    const y1 = Math.floor((i + 1) * band);
    for (let y = y1 - 3; y < y1; y++) {
      const gap = y1 - y + 1;
      for (let x = (y % 2) * 2; x < w; x += gap) rect(ctx, next, x, y, 1, 1);
    }
  });
}

// Paint something that may hang over the seam of a repeating layer.
export function wrapped(width, x, draw) {
  draw(x);
  if (x < 0) draw(x + width);
  draw(x - width);
}

// Lumpy ground line that joins up with itself across the seam.
export function ridge(width, base, parts) {
  const out = new Array(width);
  for (let x = 0; x < width; x++) {
    let y = base;
    for (const [amp, cycles, shift] of parts) {
      y += amp * Math.sin((x / width) * Math.PI * 2 * cycles + shift);
    }
    out[x] = Math.round(y);
  }
  return out;
}

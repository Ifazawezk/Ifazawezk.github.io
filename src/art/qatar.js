import { makeCanvas, rect } from './paint.js';
import { drawText, textWidth } from './font.js';

// Doha, drawn by hand from memory of the shapes, not from anybody's logo.

const INK = '#1c1530';
const STONE = '#e9dcc0';
const STONE_DARK = '#cdb891';
const STONE_LIGHT = '#f8f0dc';
const GLASS = '#7fb2c9';
const GLASS_LIGHT = '#bfe6ef';

function piece(w, h, paint) {
  const c = makeCanvas(w, h);
  paint(c.getContext('2d'), w, h);
  return c;
}

function box(ctx, x, y, w, h, fill) {
  rect(ctx, INK, x, y, w, h);
  rect(ctx, fill, x + 1, y + 1, w - 2, h - 2);
}

function label(ctx, text, cx, y, color, opts = { font: 'tiny' }) {
  drawText(ctx, text, cx - textWidth(text, opts.font, opts.scale ?? 1) / 2, y, color, opts);
}

// A pointed-top opening, the shape every doorway in the souq has.
function arch(ctx, x, base, w, h, fill) {
  const top = base - h;
  for (let y = top; y < base; y++) {
    const u = (y - top) / (w * 0.6);
    const half = u >= 1 ? w / 2 : Math.round((w / 2) * Math.sqrt(Math.max(0, 1 - (1 - u) ** 2)));
    rect(ctx, fill, Math.round(x + w / 2 - half), y, half * 2, 1);
  }
}

function disc(ctx, cx, cy, r, fill) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    rect(ctx, fill, cx - half, cy + dy, half * 2, 1);
  }
}

export const QATAR_PIECES = {
  // Tall counter on purpose: a small child cannot reach it. This matters later.
  karakStand: () => piece(84, 62, (ctx, w) => {
    box(ctx, 6, 20, 72, 42, STONE);
    box(ctx, 14, 26, 56, 20, '#3a2632');
    // The big steel kettle that has been on since before anyone can remember.
    rect(ctx, INK, 22, 31, 18, 14);
    rect(ctx, '#a8a4b8', 23, 32, 16, 12);
    rect(ctx, '#d8d4e4', 25, 33, 4, 8);
    rect(ctx, INK, 39, 34, 6, 3);
    rect(ctx, '#a8a4b8', 40, 35, 5, 1);
    rect(ctx, INK, 29, 29, 4, 2);
    for (let x = 48; x < 66; x += 5) {
      rect(ctx, INK, x, 38, 4, 7);
      rect(ctx, '#d9b36c', x + 1, 40, 2, 4);
    }
    box(ctx, 2, 45, 80, 6, '#a86b3c');
    rect(ctx, '#c98a54', 3, 46, 78, 1);
    for (let x = 0; x < w; x++) {
      const on = Math.floor(x / 8) % 2 === 0;
      rect(ctx, on ? '#b84a1f' : '#fff7e6', x, 13, 1, 7);
      rect(ctx, INK, x, 20 + (x % 8 < 4 ? 1 : 0), 1, 1);
    }
    box(ctx, 16, 0, 52, 13, '#7a2d3d');
    label(ctx, 'KARAK', 42, 3, '#fff7e6', { font: 'big' });
  }),

  souqWaqif: () => piece(152, 80, (ctx, w, h) => {
    rect(ctx, INK, 0, 16, w, h - 16);
    rect(ctx, '#c9a877', 1, 17, w - 2, h - 17);
    rect(ctx, '#d9bb8c', 1, 17, w - 2, 3);
    // Battlements, and the wooden poles that stick out of every old Gulf wall.
    for (let x = 2; x < w - 4; x += 10) {
      rect(ctx, INK, x, 9, 7, 8);
      rect(ctx, '#d9bb8c', x + 1, 10, 5, 7);
    }
    for (let x = 6; x < w - 4; x += 9) {
      rect(ctx, '#3c2716', x, 28, 3, 6);
      rect(ctx, '#6e4226', x, 28, 3, 1);
    }
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 36;
      arch(ctx, x - 1, h, 28, 41, INK);
      arch(ctx, x, h, 26, 40, '#3a2632');
      rect(ctx, '#55391f', x + 5, h - 18, 16, 2);
      // Stock: lamps, rugs, spices, sweets, in that order.
      const colors = [['#f7b733', '#fff0a8'], ['#b84a1f', '#f0d9a0'], ['#d4841f', '#7a2d3d'], ['#58d3e0', '#2b8ea3']][i];
      for (let n = 0; n < 4; n++) {
        rect(ctx, colors[n % 2], x + 6 + n * 4, h - 24 + (n % 2), 3, 6);
      }
      rect(ctx, '#f7b733', x + 12, h - 34, 3, 4);
      rect(ctx, INK, x + 13, h - 37, 1, 3);
    }
    box(ctx, 44, 0, 64, 12, '#fff7e6');
    label(ctx, 'SOUQ WAQIF', 76, 3, '#7a2d3d');
  }),

  // Four-sided, slatted, and cooler than it has any right to be.
  windTower: () => piece(36, 84, (ctx, w, h) => {
    box(ctx, 2, 32, 32, 52, '#d9bb8c');
    rect(ctx, '#e9cfa2', 3, 33, 2, 50);
    box(ctx, 4, 0, 28, 34, '#e9cfa2');
    for (let i = 0; i < 3; i++) {
      const x = 8 + i * 7;
      rect(ctx, INK, x, 5, 5, 25);
      rect(ctx, '#3a2632', x + 1, 6, 3, 23);
    }
    rect(ctx, INK, 4, 16, 28, 2);
    rect(ctx, '#d9bb8c', 4, 16, 28, 1);
    arch(ctx, 11, h, 14, 24, INK);
    rect(ctx, '#6e4226', 3, 44, 30, 2);
  }),

  mia: () => piece(172, 88, (ctx, w, h) => {
    // Blocks stacked smaller and smaller, with a dome tucked in at the top.
    const tiers = [[6, 62, 160, 26], [24, 44, 124, 19], [42, 30, 88, 15], [60, 18, 52, 13]];
    tiers.forEach(([x, y, tw, th], i) => {
      box(ctx, x, y, tw, th, i % 2 ? STONE : STONE_LIGHT);
      rect(ctx, STONE_DARK, x + 1, y + th - 3, tw - 2, 2);
      // Chamfered corners, so it stops being a box.
      rect(ctx, INK, x, y, 3, 1);
      rect(ctx, INK, x + tw - 3, y, 3, 1);
    });
    disc(ctx, 86, 16, 11, INK);
    disc(ctx, 86, 16, 10, STONE_LIGHT);
    rect(ctx, STONE_DARK, 80, 12, 12, 2);
    arch(ctx, 72, h - 4, 28, 54, INK);
    arch(ctx, 73, h - 4, 26, 53, '#2b5f86');
    for (let x = 75; x < 98; x += 5) rect(ctx, GLASS, x, h - 50, 1, 46);
    for (let y = h - 46; y < h - 4; y += 6) rect(ctx, GLASS, 74, y, 24, 1);
    for (let x = 16; x < 156; x += 20) {
      if (x > 62 && x < 104) continue;
      arch(ctx, x, h - 6, 8, 16, '#8a9fb0');
    }
    rect(ctx, '#58b6c8', 0, h - 4, w, 4);
    rect(ctx, '#a8e6ee', 0, h - 4, w, 1);
  }),

  westBay: () => piece(192, 132, (ctx, w, h) => {
    const base = h;
    // The cylinder wrapped in diagonal lattice, with the rounded tip.
    rect(ctx, INK, 12, 36, 34, base - 36);
    rect(ctx, '#7fa8c4', 13, 37, 32, base - 37);
    disc(ctx, 29, 36, 17, INK);
    disc(ctx, 29, 36, 16, '#7fa8c4');
    for (let y = 22; y < base; y += 6) {
      const half = y < 36 ? Math.round(Math.sqrt(Math.max(0, 256 - (36 - y) ** 2))) - 3 : 13;
      for (let x = 29 - half; x < 29 + half - 2; x += 6) {
        rect(ctx, '#c9e0ec', x + (y % 12 ? 3 : 0), y, 2, 2);
      }
    }
    rect(ctx, INK, 28, 6, 2, 16);
    // The one pinched in at the waist, as if somebody squeezed it.
    for (let y = 44; y < base; y++) {
      const u = (y - 44) / (base - 44);
      const half = Math.round(10 + 8 * Math.abs(u - 0.5) * 2);
      rect(ctx, INK, 74 - half - 1, y, half * 2 + 2, 1);
      rect(ctx, '#58a9c4', 74 - half, y, half * 2, 1);
      if (y % 4 === 0) rect(ctx, '#bfe6ef', 74 - half, y, half * 2, 1);
    }
    rect(ctx, INK, 54, 43, 40, 2);
    // Glass sail, leaning.
    for (let y = 22; y < base; y++) {
      const lean = Math.round((base - y) * 0.16);
      rect(ctx, INK, 106 + lean - 1, y, 26, 1);
      rect(ctx, y % 5 ? '#8fc4dc' : '#d8eef6', 106 + lean, y, 24, 1);
    }
    // A pointy one, because there is always a pointy one.
    for (let i = 0; i < 26; i++) rect(ctx, '#6d93b3', 164 - Math.floor(i / 2), 26 + i, i + 1, 1);
    rect(ctx, INK, 150, 52, 28, base - 52);
    rect(ctx, '#6d93b3', 151, 53, 26, base - 53);
    for (let y = 58; y < base; y += 7) {
      for (let x = 154; x < 174; x += 6) rect(ctx, GLASS_LIGHT, x, y, 3, 4);
    }
  }),

  // Round, thin, very tall, and on fire at the top: a hotel with one idea.
  torch: () => piece(44, 136, (ctx, w, h) => {
    for (let y = 44; y < h; y++) {
      const half = Math.round(7 + ((y - 44) / (h - 44)) * 7);
      rect(ctx, INK, 22 - half - 1, y, half * 2 + 2, 1);
      rect(ctx, y % 9 < 2 ? '#b9c4cf' : '#dfe6ec', 22 - half, y, half * 2, 1);
      rect(ctx, '#9fb0c0', 22 + half - 3, y, 3, 1);
    }
    // The open lattice cage at the top.
    box(ctx, 9, 24, 26, 22, '#3a4a7a');
    for (let i = 0; i < 4; i++) rect(ctx, '#dfe6ec', 11 + i * 7, 25, 2, 20);
    for (let y = 29; y < 45; y += 6) rect(ctx, '#dfe6ec', 10, y, 24, 1);
    // The flame.
    for (let y = 2; y < 25; y++) {
      const half = Math.round(Math.sin(((y - 2) / 23) * Math.PI * 0.9) * 8);
      rect(ctx, '#f2762e', 22 - half, y, half * 2 + 1, 1);
      if (half > 2) rect(ctx, '#f7b733', 22 - half + 3, y, half * 2 - 5, 1);
      if (half > 5 && y > 12) rect(ctx, '#fff0a8', 20, y, 4, 1);
    }
  }),

  katara: () => piece(132, 76, (ctx) => {
    // The amphitheatre: tiers of pale arches in a shallow curve.
    for (let tier = 0; tier < 3; tier++) {
      const y = 20 + tier * 18;
      rect(ctx, INK, 0, y, 92, 19);
      rect(ctx, STONE_LIGHT, 1, y + 1, 90, 17);
      for (let x = 5 - (tier % 2) * 6; x < 86; x += 13) {
        if (x < 2) continue;
        arch(ctx, x, y + 18, 8, 14, tier === 2 ? '#7a2d3d' : '#b9a884');
      }
    }
    rect(ctx, INK, 0, 18, 92, 3);
    rect(ctx, '#f7b733', 0, 19, 92, 1);
    // Pigeon tower. They have these in Tanta too. Pigeons get around.
    for (let i = 0; i < 52; i++) {
      const half = 3 + Math.floor(i / 3.2);
      rect(ctx, INK, 113 - half - 1, 24 + i, half * 2 + 2, 1);
      rect(ctx, '#e6cfa4', 113 - half, 24 + i, half * 2, 1);
    }
    for (let y = 32; y < 74; y += 6) {
      const half = 2 + Math.floor((y - 24) / 3.2);
      for (let x = 113 - half + 2; x < 113 + half - 1; x += 4) rect(ctx, '#5a3a27', x, y, 2, 3);
    }
    rect(ctx, '#d4af37', 111, 16, 4, 8);
    disc(ctx, 113, 16, 3, '#f7b733');
  }),

  // Before oil, this was the whole economy. Hence the very large oyster.
  pearl: () => piece(78, 70, (ctx) => {
    box(ctx, 8, 54, 62, 16, '#58b6c8');
    rect(ctx, '#a8e6ee', 9, 55, 60, 2);
    box(ctx, 28, 44, 22, 12, STONE_DARK);
    // Lower shell, upper shell, ribbed like the real thing.
    for (let a = 0; a < 15; a++) {
      const t = (a / 14) * Math.PI;
      const x0 = 39 + Math.cos(t) * 8;
      const y0 = 42;
      for (let r = 8; r < 34; r++) {
        const x = Math.round(x0 + Math.cos(t) * (r - 8));
        const y = Math.round(y0 - Math.sin(t) * (r - 8) * 1.1 - 1);
        rect(ctx, a % 2 ? '#f8f0dc' : '#d9c9a8', x, y, 2, 2);
      }
    }
    for (let i = -32; i <= 32; i++) {
      rect(ctx, '#d9c9a8', 39 + i, 42 + Math.round(Math.abs(i) * 0.06), 1, 4);
      rect(ctx, INK, 39 + i, 46 + Math.round(Math.abs(i) * 0.06), 1, 1);
    }
    disc(ctx, 39, 32, 8, INK);
    disc(ctx, 39, 32, 7, '#fff7e6');
    disc(ctx, 37, 30, 3, '#ffffff');
  }),

  metro: () => piece(152, 76, (ctx, w, h) => {
    // A long ribbed vault, cool and pale. No logo: just a word.
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const roof = Math.round(12 + 14 * (2 * u - 1) ** 2);
      rect(ctx, INK, x, roof, 1, h - roof);
      rect(ctx, '#dce6ea', x, roof + 1, 1, h - roof - 1);
      if (x % 12 < 2) rect(ctx, '#aebcc6', x, roof + 1, 1, h - roof - 1);
    }
    rect(ctx, GLASS, 6, 40, w - 12, 24);
    for (let x = 6; x < w - 6; x += 14) {
      rect(ctx, GLASS_LIGHT, x, 40, 5, 24);
      rect(ctx, INK, x + 13, 40, 1, 24);
    }
    rect(ctx, INK, 6, 40, w - 12, 1);
    rect(ctx, '#7a2d3d', 0, 66, w, 3);
    box(ctx, 52, 0, 48, 13, '#fff7e6');
    label(ctx, 'METRO', 76, 3, '#7a2d3d', { font: 'big' });
    rect(ctx, INK, 75, 12, 2, 6);
  }),

  landcruiser: () => piece(60, 30, (ctx) => {
    // White, enormous, and up to its axles. Tilted, like a Friday afternoon.
    ctx.save();
    ctx.translate(30, 16);
    ctx.rotate(-0.1);
    ctx.translate(-30, -16);
    rect(ctx, INK, 6, 12, 48, 12);
    rect(ctx, '#fff7e6', 7, 13, 46, 10);
    rect(ctx, INK, 12, 3, 32, 10);
    rect(ctx, '#fff7e6', 13, 4, 30, 9);
    rect(ctx, '#7fb2c9', 15, 5, 12, 7);
    rect(ctx, '#7fb2c9', 29, 5, 12, 7);
    rect(ctx, '#7a2d3d', 7, 18, 46, 2);
    ctx.restore();
    rect(ctx, '#d9a65f', 0, 24, 60, 6);
    rect(ctx, '#f6d893', 0, 24, 60, 2);
    rect(ctx, INK, 10, 21, 10, 4);
    rect(ctx, INK, 42, 18, 10, 4);
  }),

  duneBack: () => piece(240, 58, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const y = Math.round(34 - 24 * Math.sin((x / w) * Math.PI) - 6 * Math.sin((x / w) * Math.PI * 3));
      rect(ctx, '#e8a868', x, y, 1, h - y);
      rect(ctx, '#f6cf90', x, y, 1, 2);
      if (x > w * 0.5) rect(ctx, '#d48a4c', x, y + 8, 1, h - y - 8);
    }
  }),

  // Flags up everywhere for the year of the tournament. Maroon, white, a ball.
  bunting: () => piece(168, 64, (ctx, w, h) => {
    rect(ctx, INK, 2, 6, 3, h - 6);
    rect(ctx, INK, w - 5, 6, 3, h - 6);
    for (let x = 4; x < w - 4; x++) {
      const u = (x - 4) / (w - 8);
      const y = 8 + Math.round(16 * u * (1 - u) * 4 * 0.5);
      rect(ctx, INK, x, y, 1, 1);
      if ((x - 4) % 14 === 0) {
        const color = (x - 4) % 28 === 0 ? '#7a2d3d' : '#fff7e6';
        for (let i = 0; i < 9; i++) rect(ctx, color, x + Math.floor(i / 2), y + 1 + i, 9 - i, 1);
      }
    }
    disc(ctx, 84, 52, 9, INK);
    disc(ctx, 84, 52, 8, '#fff7e6');
    rect(ctx, INK, 82, 49, 4, 4);
    rect(ctx, INK, 78, 54, 3, 3);
    rect(ctx, INK, 88, 54, 3, 3);
    rect(ctx, INK, 83, 57, 3, 2);
    rect(ctx, INK, 79, 48, 2, 2);
    rect(ctx, INK, 88, 48, 2, 2);
  }),

  villaLit: () => piece(96, 56, (ctx) => {
    box(ctx, 8, 14, 80, 42, '#c9bfa6');
    rect(ctx, '#a89c84', 9, 15, 78, 3);
    for (let i = 8; i < 88; i += 8) rect(ctx, INK, i, 9, 5, 5);
    for (let i = 9; i < 88; i += 8) rect(ctx, '#c9bfa6', i, 10, 3, 4);
    box(ctx, 40, 30, 16, 26, '#b84a1f');
    rect(ctx, '#f7b733', 52, 42, 2, 2);
    for (const x of [18, 64]) {
      rect(ctx, INK, x, 24, 14, 14);
      rect(ctx, '#f7b733', x + 1, 25, 12, 12);
      rect(ctx, '#ffe9a0', x + 1, 25, 5, 5);
      rect(ctx, INK, x + 6, 25, 1, 12);
    }
    label(ctx, 'HOME', 48, 20, '#7a2d3d');
    // The porch light. Someone left it on for him.
    rect(ctx, '#fff0a8', 46, 25, 4, 3);
  }),
};

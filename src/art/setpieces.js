import { makeCanvas, rect } from './paint.js';
import { drawText, textWidth } from './font.js';
import { PAL } from './palette.js';

const INK = PAL.k;

function piece(w, h, paint) {
  const c = makeCanvas(w, h);
  paint(c.getContext('2d'), w, h);
  return c;
}

function outlined(ctx, x, y, w, h, fill) {
  rect(ctx, INK, x, y, w, h);
  rect(ctx, fill, x + 1, y + 1, w - 2, h - 2);
}

function centredText(ctx, text, cx, y, color, opts) {
  drawText(ctx, text, cx - textWidth(text, opts?.font, opts?.scale ?? 1) / 2, y, color, opts);
}

function column(ctx, x, top, bottom) {
  rect(ctx, INK, x, top, 6, bottom - top);
  rect(ctx, '#efe2c8', x + 1, top, 3, bottom - top);
  rect(ctx, '#c9b693', x + 4, top, 1, bottom - top);
}

const PIECES = {
  uni: () => piece(120, 72, (ctx, w, h) => {
    outlined(ctx, 6, 22, 108, 50, '#e6d3ad');
    for (let x = 12; x < 110; x += 16) {
      for (let y = 30; y < 62; y += 14) {
        rect(ctx, INK, x, y, 8, 10);
        rect(ctx, '#7fc4e6', x + 1, y + 1, 6, 8);
        rect(ctx, '#d8eef6', x + 1, y + 1, 2, 3);
      }
    }
    rect(ctx, INK, 44, 10, 32, 13);
    rect(ctx, '#efe2c8', 45, 11, 30, 11);
    for (let i = 0; i < 10; i++) {
      rect(ctx, INK, 60 - i * 2.6 - 1, 11 + i, i * 5.2 + 3, 1);
      rect(ctx, '#efe2c8', 60 - i * 2.6, 11 + i, i * 5.2 + 1, 1);
    }
    rect(ctx, INK, 0, 21, w, 2);
    rect(ctx, '#c9b693', 2, 20, w - 4, 1);
    for (const x of [40, 52, 62, 74]) column(ctx, x, 40, h);
    rect(ctx, '#5a3a27', 52, 52, 22, 20);
    outlined(ctx, 24, 25, 72, 9, '#2a4d91');
    centredText(ctx, 'TANTA UNIVERSITY', 60, 27, '#fff7e6', { font: 'tiny' });
    rect(ctx, INK, 59, 0, 1, 10);
    rect(ctx, '#e0403f', 60, 0, 8, 2);
    rect(ctx, '#fff7e6', 60, 2, 8, 2);
    rect(ctx, INK, 60, 4, 8, 2);
  }),

  train: () => piece(92, 42, (ctx) => {
    outlined(ctx, 2, 4, 88, 32, '#2a4d91');
    rect(ctx, '#3f7fd1', 3, 5, 86, 4);
    rect(ctx, '#fff7e6', 3, 24, 86, 3);
    for (let x = 10; x < 80; x += 14) {
      rect(ctx, INK, x, 11, 10, 10);
      rect(ctx, '#bfe6ef', x + 1, 12, 8, 8);
      rect(ctx, '#f7fcff', x + 1, 12, 3, 3);
    }
    rect(ctx, INK, 2, 36, 88, 2);
    for (const x of [16, 28, 60, 72]) {
      rect(ctx, INK, x - 3, 36, 8, 6);
      rect(ctx, '#5c5670', x - 2, 37, 6, 4);
    }
    drawText(ctx, 'TANTA > CAIRO', 15, 29, '#fff7e6', { font: 'tiny' });
  }),

  door: () => piece(40, 56, (ctx) => {
    outlined(ctx, 2, 2, 36, 54, '#6e4226');
    rect(ctx, '#a86b3c', 6, 6, 28, 50);
    rect(ctx, '#c98a54', 6, 6, 28, 1);
    rect(ctx, '#6e4226', 10, 12, 20, 14);
    rect(ctx, '#6e4226', 10, 32, 20, 18);
    rect(ctx, '#a86b3c', 11, 13, 18, 12);
    rect(ctx, '#a86b3c', 11, 33, 18, 16);
    rect(ctx, '#f7b733', 29, 30, 3, 3);
    outlined(ctx, 8, 15, 24, 8, '#fff7e6');
    centredText(ctx, 'EXIT', 20, 17, '#e0403f', { font: 'tiny' });
  }),

  roofdoor: () => piece(48, 56, (ctx) => {
    outlined(ctx, 0, 6, 48, 50, '#a79f96');
    rect(ctx, INK, 0, 2, 48, 6);
    rect(ctx, '#8f8a84', 1, 3, 46, 4);
    outlined(ctx, 10, 18, 28, 38, '#3f7fd1');
    rect(ctx, '#2a4d91', 14, 22, 20, 12);
    rect(ctx, '#2a4d91', 14, 38, 20, 14);
    rect(ctx, '#f7b733', 32, 36, 3, 3);
    outlined(ctx, 12, 9, 24, 7, '#fff7e6');
    centredText(ctx, 'STAIRS', 24, 10, INK, { font: 'tiny' });
  }),

  hatch: () => piece(56, 64, (ctx) => {
    outlined(ctx, 0, 0, 56, 64, '#232a4d');
    outlined(ctx, 6, 16, 44, 48, '#101330');
    for (let y = 18; y < 62; y += 4) rect(ctx, '#58d3e0', 8, y, 40, 1);
    rect(ctx, '#58d3e033', 8, 18, 40, 44);
    outlined(ctx, 8, 3, 40, 10, '#2f6b3a');
    centredText(ctx, 'DEPLOY', 28, 5, '#8fd14f', { font: 'tiny' });
    for (let x = 0; x < 56; x += 8) {
      rect(ctx, '#f7b733', x, 13, 4, 2);
      rect(ctx, INK, x + 4, 13, 4, 2);
    }
  }),

  arch: () => piece(72, 72, (ctx, w, h) => {
    rect(ctx, INK, 0, 8, w, h - 8);
    rect(ctx, '#c9a877', 1, 9, w - 2, h - 9);
    rect(ctx, '#e6c99a', 1, 9, w - 2, 3);
    for (let i = 0; i < 9; i++) rect(ctx, i % 2 ? '#c9a877' : INK, i * 8 + 2, 2, 6, 7);
    for (let i = 0; i < 9; i++) rect(ctx, '#e6c99a', i * 8 + 3, 3, 4, 6);
    const cx = 36;
    for (let y = 22; y < h; y++) {
      const half = y < 42 ? Math.round(Math.sqrt(Math.max(0, 400 - (42 - y) ** 2))) : 20;
      rect(ctx, INK, cx - half - 1, y, half * 2 + 2, 1);
      rect(ctx, '#3a2632', cx - half, y, half * 2, 1);
    }
    centredText(ctx, 'SOUQ', cx, 13, '#7a2d3d', { font: 'tiny' });
  }),

  promenade: () => piece(72, 72, (ctx, w, h) => {
    rect(ctx, INK, 0, 8, w, h - 8);
    rect(ctx, '#8d86a6', 1, 9, w - 2, h - 9);
    rect(ctx, '#b3adc6', 1, 9, w - 2, 3);
    for (let y = 26; y < h; y++) {
      const half = y < 46 ? Math.round(Math.sqrt(Math.max(0, 400 - (46 - y) ** 2))) : 20;
      rect(ctx, INK, 35 - half, y, half * 2 + 2, 1);
      rect(ctx, '#0d0f33', 36 - half, y, half * 2, 1);
    }
    centredText(ctx, 'CORNICHE', 36, 15, '#fff7e6', { font: 'tiny' });
  }),

  finish: () => piece(64, 56, (ctx) => {
    rect(ctx, INK, 4, 8, 3, 48);
    rect(ctx, INK, 57, 8, 3, 48);
    outlined(ctx, 0, 0, 64, 14, '#7a2d3d');
    centredText(ctx, 'DOHA', 32, 3, '#fff7e6', { scale: 1 });
  }),

  bank: () => piece(110, 80, (ctx, w, h) => {
    outlined(ctx, 8, 6, 94, 74, '#27305c');
    for (let y = 12; y < 74; y += 9) {
      for (let x = 14; x < 96; x += 8) {
        rect(ctx, (x * y) % 7 < 3 ? '#f7b733' : '#58d3e0', x, y, 5, 6);
        rect(ctx, '#ffffff55', x, y, 2, 2);
      }
    }
    outlined(ctx, 34, 0, 42, 13, '#7a2d3d');
    centredText(ctx, 'QNB', 55, 3, '#fff7e6', { scale: 1 });
    rect(ctx, INK, 44, h - 18, 22, 18);
    rect(ctx, '#bfe6ef', 45, h - 17, 9, 17);
    rect(ctx, '#bfe6ef', 56, h - 17, 9, 17);
  }),

  whiteboard: () => piece(84, 58, (ctx) => {
    outlined(ctx, 0, 0, 84, 44, '#fff7e6');
    outlined(ctx, 0, 0, 84, 7, '#3f7fd1');
    centredText(ctx, 'GDSC', 42, 1, '#fff7e6', { font: 'tiny' });
    drawText(ctx, 'data science', 5, 10, '#e0403f');
    drawText(ctx, 'y = what?', 5, 20, '#2a4d91');
    drawText(ctx, 'ask me anything', 5, 31, '#2f6b3a', { font: 'big' });
    rect(ctx, INK, 12, 44, 3, 14);
    rect(ctx, INK, 69, 44, 3, 14);
  }),

  rackLabel: () => piece(92, 24, (ctx) => {
    outlined(ctx, 0, 0, 92, 24, '#101330');
    rect(ctx, '#58d3e0', 1, 1, 90, 1);
    centredText(ctx, '8HEARTS.CO', 46, 8, '#58d3e0', { scale: 1 });
  }),

  graph: () => piece(96, 64, (ctx) => {
    const nodes = [[14, 16], [42, 8], [78, 18], [26, 44], [60, 36], [86, 52], [50, 56]];
    const edges = [[0, 1], [1, 2], [0, 3], [3, 4], [1, 4], [2, 4], [4, 5], [4, 6], [3, 6]];
    for (const [a, b] of edges) {
      const [x0, y0] = nodes[a];
      const [x1, y1] = nodes[b];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= steps; i += 2) {
        rect(ctx, '#2b8ea3', Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps));
      }
    }
    nodes.forEach(([x, y], i) => {
      rect(ctx, INK, x - 3, y - 3, 7, 7);
      rect(ctx, i === 4 ? '#e0403f' : '#58d3e0', x - 2, y - 2, 5, 5);
    });
  }),

  dhowBack: () => piece(120, 50, (ctx) => {
    paintDhow(ctx, 0, 0, 120);
  }),
};

export function paintDhow(ctx, x, y, w) {
  const deck = y + 34;
  for (let i = 0; i < 12; i++) {
    const inset = Math.round(i * 0.9);
    rect(ctx, INK, x + inset, deck + i, w - inset * 2, 1);
    rect(ctx, i < 3 ? '#c98a54' : i < 7 ? '#a86b3c' : '#6e4226', x + inset + 1, deck + i, w - inset * 2 - 2, 1);
  }
  // The bow lifts at the front, the way a dhow does.
  for (let i = 0; i < 9; i++) rect(ctx, '#a86b3c', x + w - 2 - i, deck - 9 + i, i + 1, 1);
  rect(ctx, INK, x + w - 2, deck - 10, 2, 11);
  rect(ctx, INK, x + (w >> 1), y, 2, 34);
  // Lateen sail, the big slanted triangle.
  for (let i = 0; i < 30; i++) {
    const row = y + 2 + i;
    const start = x + (w >> 1) - 26 + i;
    rect(ctx, '#fff7e6', start, row, 52 - i * 1.4, 1);
    rect(ctx, '#d8cfc0', start + 44 - i * 1.4, row, 8, 1);
  }
  // A small maroon pennant up top.
  rect(ctx, '#7a2d3d', x + (w >> 1) + 2, y, 9, 3);
  rect(ctx, '#fff7e6', x + (w >> 1) + 2, y, 2, 3);
}

const cache = new Map();

export function getPiece(kind) {
  if (!cache.has(kind)) {
    if (!PIECES[kind]) throw new Error(`no set piece called ${kind}`);
    cache.set(kind, PIECES[kind]());
  }
  return cache.get(kind);
}

export function hasPiece(kind) {
  return kind in PIECES;
}

const AWNINGS = [
  ['#b84a1f', '#f0d9a0'], ['#2b8ea3', '#fff7e6'], ['#7a2d3d', '#fff7e6'],
  ['#2f6b3a', '#f0d9a0'], ['#6a4bb0', '#f0d9a0'], ['#d4841f', '#7a2d3d'],
];

// Language decides the goods on the counter. Python is sold as snakes in jars.
const GOODS = {
  Python: ['#4f9a3c', '#8fd14f'],
  TypeScript: ['#3f7fd1', '#58d3e0'],
  JavaScript: ['#f7b733', '#fff0a8'],
  Go: ['#58d3e0', '#2b8ea3'],
  'Jupyter Notebook': ['#f2762e', '#f0d9a0'],
  default: ['#caa2f0', '#6a4bb0'],
};

function wrapName(name, max) {
  const up = name.toUpperCase();
  if (up.length <= max) return [up];
  const parts = up.split(/(?<=[-_])/);
  const lines = [''];
  for (const part of parts) {
    if ((lines[lines.length - 1] + part).length > max && lines[lines.length - 1]) lines.push('');
    lines[lines.length - 1] += part;
  }
  return lines.slice(0, 2).map((l) => l.slice(0, max));
}

export const STALL_W = 88;
export const STALL_H = 72;

export function paintStall(repo, index) {
  return piece(STALL_W, STALL_H, (ctx, w, h) => {
    const [a, b] = AWNINGS[index % AWNINGS.length];
    // Back wall and shelves.
    rect(ctx, '#3a2632', 6, 24, w - 12, h - 24);
    rect(ctx, '#55391f', 6, 36, w - 12, 2);
    const [g1, g2] = GOODS[repo.language] ?? GOODS.default;
    for (let x = 10; x < w - 12; x += 8) {
      const tall = 5 + ((x * 7 + index * 3) % 5);
      rect(ctx, INK, x, 36 - tall - 1, 6, tall + 1);
      rect(ctx, (x + index) % 3 ? g1 : g2, x + 1, 36 - tall, 4, tall);
      rect(ctx, '#ffffff66', x + 1, 36 - tall, 1, 2);
    }
    // Posts.
    rect(ctx, INK, 3, 16, 4, h - 16);
    rect(ctx, '#a86b3c', 4, 16, 2, h - 16);
    rect(ctx, INK, w - 7, 16, 4, h - 16);
    rect(ctx, '#a86b3c', w - 6, 16, 2, h - 16);
    // Name board.
    const lines = wrapName(repo.name, 19);
    outlined(ctx, 2, 0, w - 4, lines.length > 1 ? 15 : 10, '#f0d9a0');
    lines.forEach((line, i) => centredText(ctx, line, w / 2, 2 + i * 6, INK, { font: 'tiny' }));
    // Striped awning with a scalloped edge.
    const ay = lines.length > 1 ? 15 : 10;
    for (let x = 0; x < w; x++) {
      const on = Math.floor(x / 11) % 2 === 0;
      const drop = 11 + (Math.abs(((x % 11) - 5)) < 4 ? 2 : 0);
      rect(ctx, on ? a : b, x, ay, 1, drop);
      rect(ctx, INK, x, ay + drop, 1, 1);
    }
    // Counter.
    outlined(ctx, 8, 52, w - 16, h - 52, '#a86b3c');
    rect(ctx, '#c98a54', 9, 53, w - 18, 2);
    for (let x = 14; x < w - 16; x += 12) rect(ctx, '#6e4226', x, 56, 1, h - 57);
    // Stock on the counter, one item per star so popular stalls look busy.
    const stock = Math.min(5, 1 + (repo.stars ?? 0));
    for (let i = 0; i < stock; i++) {
      const x = 14 + i * 12;
      rect(ctx, INK, x, 45, 8, 7);
      rect(ctx, g1, x + 1, 46, 6, 6);
      rect(ctx, g2, x + 1, 46, 6, 2);
    }
  });
}

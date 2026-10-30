import { makeCanvas, rng, rect } from './paint.js';
import { TILE } from '../game/physics.js';
import { HAZARDS } from './sprites.js';
import { bake } from './bake.js';

function tile(paint) {
  const c = makeCanvas(TILE, TILE);
  paint(c.getContext('2d'));
  return c;
}

function speckle(ctx, r, colors, count, y0 = 0) {
  for (let i = 0; i < count; i++) {
    rect(ctx, colors[Math.floor(r() * colors.length)], Math.floor(r() * 16), y0 + Math.floor(r() * (16 - y0)));
  }
}

const SOIL = {
  fill(ctx, r, base, specks) {
    rect(ctx, base, 0, 0, 16, 16);
    speckle(ctx, r, specks, 14);
    // A few small stones, because mud is never just mud.
    for (let i = 0; i < 2; i++) {
      const x = 1 + Math.floor(r() * 12);
      const y = 1 + Math.floor(r() * 12);
      rect(ctx, specks[1], x, y, 3, 2);
      rect(ctx, specks[0], x, y + 1, 3, 1);
    }
  },
};

function grassTop(ctx, r, light, mid, dark) {
  for (let x = 0; x < 16; x++) {
    const depth = 4 + Math.floor(r() * 3);
    rect(ctx, mid, x, 0, 1, depth);
    rect(ctx, dark, x, depth, 1, 1);
    if (r() < 0.45) rect(ctx, light, x, 0, 1, 1);
    if (r() < 0.2) rect(ctx, light, x, 1, 1, 1);
  }
}

function books(ctx, r, covers) {
  for (let y = 0; y < 16; y += 8) {
    const c = covers[Math.floor(r() * covers.length)];
    const edge = 1 + Math.floor(r() * 3);
    rect(ctx, c, 0, y, 16, 8);
    rect(ctx, '#1c1530', 0, y + 7, 16, 1);
    rect(ctx, '#fff7e6', edge + 8, y + 1, 7 - edge, 5);
    for (let i = y + 2; i < y + 6; i += 2) rect(ctx, '#d8cfc0', edge + 8, i, 7 - edge, 1);
    rect(ctx, '#ffffff40', 0, y + 1, 8 + edge, 1);
  }
}

function bricks(ctx, r) {
  rect(ctx, '#7b3b32', 0, 0, 16, 16);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const off = row % 2 ? 4 : 0;
    for (let x = -8 + off; x < 16; x += 8) {
      const shade = ['#9a4c3c', '#a85a44', '#8a4436', '#b0644c'][Math.floor(r() * 4)];
      rect(ctx, shade, x + 1, y, 7, 3);
    }
  }
}

function panel(ctx, r) {
  rect(ctx, '#232a4d', 0, 0, 16, 16);
  rect(ctx, '#2f3863', 1, 1, 14, 14);
  rect(ctx, '#3c4678', 1, 1, 14, 1);
  rect(ctx, '#171b36', 1, 14, 14, 1);
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) rect(ctx, '#58628f', x, y);
  rect(ctx, '#171b36', 5, 6, 6, 4);
  rect(ctx, r() < 0.5 ? '#58d3e0' : '#8fd14f', 6, 7, 1, 1);
  rect(ctx, r() < 0.5 ? '#f2762e' : '#58d3e0', 8, 7, 1, 1);
}

function sandFill(ctx, r) {
  rect(ctx, '#d9a65f', 0, 0, 16, 16);
  speckle(ctx, r, ['#c98f4c', '#e6bc7a', '#b97f42'], 24);
}

function stones(ctx, r, base, light, dark) {
  rect(ctx, dark, 0, 0, 16, 16);
  const layout = [[0, 0, 7, 7], [8, 0, 8, 5], [8, 6, 8, 9], [0, 8, 7, 7]];
  for (const [x, y, w, h] of layout) {
    rect(ctx, base, x, y, w, h);
    rect(ctx, light, x, y, w, 1);
    if (r() < 0.7) rect(ctx, light, x + 2, y + 3, 2, 1);
  }
}

// How each world is built: what its ground is made of and what its ledges are.
const STYLES = {
  tanta: {
    top(ctx, r) { SOIL.fill(ctx, r, '#6b4630', ['#5a3a27', '#7d5539']); grassTop(ctx, r, '#a6de6a', '#73b84a', '#4a8a3a'); },
    fill(ctx, r) { SOIL.fill(ctx, r, '#6b4630', ['#5a3a27', '#7d5539']); },
    ledge: ['#a86b3c', '#6e4226', '#c98a54'],
    water: ['#3f9fb0', '#2b7f97', '#7fd0d8'],
    bounce: ['#d9b36c', '#b78a4e'],
  },
  alx: {
    top(ctx, r) { books(ctx, r, ['#d94f4a', '#3f7fd1', '#f2a33a']); rect(ctx, '#fff7e6', 0, 0, 16, 2); rect(ctx, '#1c1530', 0, 2, 16, 1); },
    fill(ctx, r) { books(ctx, r, ['#b0394a', '#2a5da3', '#b56a22', '#3e8a55', '#6a4bb0']); },
    ledge: ['#f7cf5a', '#b98a2c', '#fff0a8'],
    ruler: true,
    water: ['#3a4a44', '#2a3833', '#6b8378'],
    bounce: ['#e0403f', '#9c2a3f'],
  },
  cairo: {
    top(ctx, r) { bricks(ctx, r); rect(ctx, '#b5b0ab', 0, 0, 16, 4); rect(ctx, '#d6d1c9', 0, 0, 16, 1); rect(ctx, '#7c7570', 0, 4, 16, 1); speckle(ctx, r, ['#9b9590'], 6); },
    fill: bricks,
    ledge: ['#8f8a84', '#5c5670', '#c0bbb4'],
    water: ['#3a3250', '#2a2440', '#5a4d78'],
    bounce: ['#d8cfc0', '#5c5670'],
  },
  hearts: {
    top(ctx, r) { panel(ctx, r); rect(ctx, '#58d3e0', 0, 0, 16, 2); rect(ctx, '#b8f4fa', 0, 0, 16, 1); rect(ctx, '#171b36', 0, 2, 16, 1); },
    fill: panel,
    ledge: ['#58628f', '#232a4d', '#8d97c4'],
    water: ['#3a2a60', '#2a1d4a', '#caa2f0'],
    bounce: ['#8fd14f', '#2f6b3a'],
  },
  dunes: {
    top(ctx, r) {
      sandFill(ctx, r);
      for (let x = 0; x < 16; x++) {
        const d = 3 + Math.round(Math.sin(x / 2.5) * 1.5);
        rect(ctx, '#f6d893', x, 0, 1, d);
        rect(ctx, '#e6bc7a', x, d, 1, 1);
      }
    },
    fill: sandFill,
    ledge: ['#a86b3c', '#6e4226', '#c98a54'],
    water: ['#2b7f97', '#1f5f7d', '#7fd0d8'],
    bounce: ['#f2762e', '#b84a1f'],
  },
  dohaday: {
    top(ctx, r) { sandFill(ctx, r); stones(ctx, r, '#e9dcc0', '#f8f0dc', '#b9a884'); rect(ctx, '#fff7e6', 0, 0, 16, 2); rect(ctx, '#a08f6c', 0, 2, 16, 1); for (let y = 11; y < 16; y++) rect(ctx, '#d9a65f', 0, y, 16, 1); speckle(ctx, r, ['#c98f4c', '#e6bc7a'], 8, 11); },
    fill: sandFill,
    ledge: ['#e9dcc0', '#a08f6c', '#fff7e6'],
    water: ['#2b8ea3', '#1f6f8a', '#a8e6ee'],
    bounce: ['#f2762e', '#b84a1f'],
  },
  dohanight: null,
  souq: {
    top(ctx, r) { stones(ctx, r, '#c9a877', '#e6c99a', '#8a6a44'); rect(ctx, '#f0dcb4', 0, 0, 16, 2); rect(ctx, '#8a6a44', 0, 2, 16, 1); },
    fill(ctx, r) { stones(ctx, r, '#a98658', '#c9a877', '#6e5234'); },
    ledge: ['#a86b3c', '#6e4226', '#c98a54'],
    water: ['#2b7f97', '#1f5f7d', '#7fd0d8'],
    bounce: ['#f2762e', '#b84a1f'],
  },
  corniche: {
    top(ctx, r) { stones(ctx, r, '#8d86a6', '#b3adc6', '#4b4468'); rect(ctx, '#d8d2e6', 0, 0, 16, 2); rect(ctx, '#4b4468', 0, 2, 16, 1); },
    fill(ctx, r) { stones(ctx, r, '#5c5580', '#756e98', '#3a3456'); },
    ledge: ['#a86b3c', '#6e4226', '#c98a54'],
    water: ['#1d3a78', '#142a5e', '#5f8fe0'],
    bounce: ['#f2762e', '#b84a1f'],
  },
};

STYLES.dohanight = STYLES.dohaday;

const HAZARD_OF = { dohaday: 'doha', dohanight: 'doha', tanta: 'tanta', alx: 'alx', cairo: 'cairo', hearts: 'hearts', dunes: 'doha', souq: 'doha', corniche: 'doha' };

function ledgeTile(style) {
  const [base, dark, light] = style.ledge;
  return tile((ctx) => {
    rect(ctx, '#1c1530', 0, 0, 16, 7);
    rect(ctx, base, 0, 1, 16, 4);
    rect(ctx, light, 0, 1, 16, 1);
    rect(ctx, dark, 0, 5, 16, 1);
    if (style.ruler) {
      for (let x = 0; x < 16; x += 2) rect(ctx, '#1c1530', x, 2, 1, x % 8 === 0 ? 3 : 2);
    } else {
      rect(ctx, dark, 7, 1, 1, 4);
      rect(ctx, dark, 15, 1, 1, 4);
    }
  });
}

function waterFrames(style) {
  const [mid, deep, light] = style.water;
  return [0, 1, 2, 3].map((f) => tile((ctx) => {
    rect(ctx, deep, 0, 0, 16, 16);
    rect(ctx, mid, 0, 4, 16, 12);
    for (let x = 0; x < 16; x++) {
      const y = 2 + Math.round(Math.sin(((x + f * 4) / 16) * Math.PI * 2) * 1.4);
      rect(ctx, light, x, y, 1, 1);
      rect(ctx, mid, x, y + 1, 1, 3);
    }
    rect(ctx, deep, (f * 4 + 2) % 16, 9, 5, 1);
    rect(ctx, deep, (f * 4 + 10) % 16, 13, 4, 1);
  }));
}

function bounceFrames(style) {
  const [top, side] = style.bounce;
  return [0, 1].map((f) => tile((ctx) => {
    rect(ctx, '#1c1530', 1, 2 + f, 14, 14 - f);
    rect(ctx, top, 2, 3 + f, 12, 3);
    rect(ctx, '#ffffff66', 2, 3 + f, 12, 1);
    for (let y = 7 + f; y < 15; y += 2) rect(ctx, side, 3, y, 10, 1);
  }));
}

function beltFrames() {
  return [0, 1, 2, 3].map((f) => tile((ctx) => {
    rect(ctx, '#1c1530', 0, 0, 16, 16);
    rect(ctx, '#3c4678', 0, 1, 16, 5);
    for (let x = -8; x < 24; x += 8) {
      const px = x + f * 2;
      rect(ctx, '#f7b733', px, 2, 2, 1);
      rect(ctx, '#f7b733', px + 1, 3, 2, 1);
      rect(ctx, '#f7b733', px, 4, 2, 1);
    }
    rect(ctx, '#232a4d', 0, 7, 16, 8);
    for (let x = 1; x < 16; x += 5) {
      rect(ctx, '#58628f', x, 9, 3, 3);
      rect(ctx, '#171b36', x + (f % 2), 10, 1, 1);
    }
  }));
}

function speedFrames() {
  return [0, 1, 2, 3].map((f) => tile((ctx) => {
    rect(ctx, '#1c1530', 0, 0, 16, 16);
    rect(ctx, '#2a2440', 0, 1, 16, 15);
    const heights = [6, 9, 5, 11, 7, 12, 8, 10];
    heights.forEach((h, i) => {
      const k = (h + f * (i % 3)) % 12 + 2;
      rect(ctx, i % 2 ? '#f7b733' : '#f2762e', i * 2, 15 - k, 2, k);
    });
    rect(ctx, '#fff7e6', 0, 0, 16, 1);
  }));
}

function blinkTiles(color, light) {
  const on = tile((ctx) => {
    rect(ctx, '#1c1530', 0, 0, 16, 16);
    rect(ctx, color, 1, 1, 14, 14);
    rect(ctx, light, 1, 1, 14, 2);
    rect(ctx, '#1c1530', 4, 6, 8, 4);
    rect(ctx, light, 5, 7, 2, 2);
    rect(ctx, light, 9, 7, 2, 2);
  });
  const off = tile((ctx) => {
    for (let i = 0; i < 16; i += 3) {
      rect(ctx, color, i, 0);
      rect(ctx, color, i, 15);
      rect(ctx, color, 0, i);
      rect(ctx, color, 15, i);
    }
  });
  return { on, off };
}

export function buildTiles(theme) {
  const style = STYLES[theme];
  const r = rng(theme.length * 7919 + theme.charCodeAt(0));
  const variants = (paint, n) => Array.from({ length: n }, () => tile((ctx) => paint(ctx, r)));
  return {
    top: variants(style.top, 4),
    fill: variants(style.fill, 4),
    ledge: ledgeTile(style),
    water: waterFrames(style),
    bounce: bounceFrames(style),
    belt: beltFrames(),
    speed: speedFrames(),
    blinkA: blinkTiles('#2b8ea3', '#58d3e0'),
    blinkB: blinkTiles('#b84a1f', '#f2762e'),
    spike: bake(HAZARDS[HAZARD_OF[theme]]),
  };
}

import { makeCanvas, rng, rect, bandedSky, wrapped, ridge } from './paint.js';
import { drawText } from './font.js';

// Every world is a flat sky plus a few repeating strips that slide at
// different speeds. A strip must repeat cleanly at its own width.

function strip(w, h, paint) {
  const c = makeCanvas(w, h);
  paint(c.getContext('2d'), w, h);
  return c;
}

function sky(colors) {
  const c = makeCanvas(320, 180);
  bandedSky(c.getContext('2d'), colors, 320, 180);
  return c;
}

function cloud(ctx, x, y, s, color, shade) {
  for (const [dx, dy, w, h] of [[0, 4, 26, 5], [5, 1, 12, 8], [14, 0, 9, 9], [20, 3, 11, 6]]) {
    rect(ctx, color, x + dx * s, y + dy * s, w * s, h * s);
  }
  rect(ctx, shade, x, y + 8 * s, 31 * s, s);
}

function minaret(ctx, x, base, h, body, tip) {
  rect(ctx, body, x, base - h, 5, h);
  rect(ctx, body, x - 1, base - h + 6, 7, 2);
  rect(ctx, body, x + 1, base - h - 5, 3, 5);
  rect(ctx, tip, x + 2, base - h - 8, 1, 3);
}

function dome(ctx, x, base, r, color) {
  for (let i = -r; i <= r; i++) {
    const h = Math.round(Math.sqrt(r * r - i * i));
    rect(ctx, color, x + i, base - h, 1, h);
  }
}

function palmShape(ctx, x, base, h, color) {
  rect(ctx, color, x, base - h, 2, h);
  // Fronds droop, or it stops being a palm and starts being an umbrella.
  for (const [dir, reach] of [[-1, 9], [1, 9], [-1, 6], [1, 6]]) {
    for (let i = 0; i < reach; i++) {
      const drop = Math.floor((i * i) / (reach === 9 ? 14 : 5)) - (reach === 6 ? 2 : 0);
      rect(ctx, color, x + (dir > 0 ? 2 + i : -1 - i), base - h + drop, 1, 2);
    }
  }
}

function tanta() {
  const clouds = strip(640, 80, (ctx, w) => {
    const r = rng(11);
    for (let x = 10; x < w - 70; x += 80 + Math.floor(r() * 60)) {
      cloud(ctx, x, 6 + Math.floor(r() * 44), r() < 0.3 ? 2 : 1, '#ffffff', '#d6ebef');
    }
  });
  const far = strip(480, 180, (ctx, w, h) => {
    const r = rng(5);
    const line = ridge(w, 112, [[2, 2, 0.4], [1, 5, 1.2]]);
    for (let x = 0; x < w; x++) rect(ctx, '#9ccf9a', x, line[x], 1, h - line[x]);
    for (let x = 6; x < w - 8; x += 9 + Math.floor(r() * 14)) {
      const tall = 8 + Math.floor(r() * 9);
      palmShape(ctx, x, line[x] + 1, tall, '#7fb98a');
    }
    minaret(ctx, 92, line[92] + 1, 34, '#8cb9a4', '#f7b733');
    minaret(ctx, 372, line[372] + 1, 28, '#8cb9a4', '#f7b733');
    dome(ctx, 108, line[108] + 1, 9, '#8cb9a4');
    // Water tower, the true skyline of every delta town.
    rect(ctx, '#8cb9a4', 236, 84, 2, 28);
    rect(ctx, '#8cb9a4', 246, 84, 2, 28);
    rect(ctx, '#8cb9a4', 232, 74, 20, 12);
  });
  const fields = strip(640, 180, (ctx, w, h) => {
    const r = rng(9);
    const top = 124;
    const greens = ['#7fc25a', '#93d066', '#6cb04f', '#a7d86d', '#e3cf62'];
    for (let y = top; y < h; y += 7) {
      let x = -Math.floor(r() * 60);
      while (x < w) {
        const len = 50 + Math.floor(r() * 90);
        rect(ctx, greens[Math.floor(r() * greens.length)], x, y, len, 7);
        x += len;
      }
      rect(ctx, '#5f9e4a', 0, y + 6, w, 1);
    }
    for (let x = 0; x < w; x += 2) rect(ctx, '#4f8f45', x, top, 1, 1);
    const house = (x, wd, ht, c1, c2) => {
      rect(ctx, c1, x, top - ht, wd, ht);
      rect(ctx, c2, x, top - ht, wd, 2);
      for (let i = x + 3; i < x + wd - 3; i += 6) rect(ctx, '#5a3a27', i, top - ht + 5, 3, 4);
      for (let i = x + 2; i < x + wd - 1; i += 3) rect(ctx, '#7d5539', i, top - ht - 2, 1, 2);
    };
    house(44, 34, 20, '#c9a075', '#e0bb8c');
    house(70, 22, 13, '#b58c60', '#cfa67a');
    house(330, 40, 24, '#d0a97c', '#e6c294');
    house(362, 18, 12, '#b58c60', '#cfa67a');
    // Pigeon tower: a mud cone full of little holes.
    const tower = (x) => {
      for (let i = 0; i < 26; i++) rect(ctx, '#c9a075', x + Math.floor(i / 3), top - 26 + 26 - i - 1, 18 - Math.floor(i / 3) * 2, 1);
      for (let y = top - 22; y < top - 2; y += 4) {
        for (let i = x + 4; i < x + 16; i += 4) rect(ctx, '#5a3a27', i, y, 2, 2);
      }
    };
    tower(210);
    tower(520);
    for (const x of [150, 174, 292, 440, 470, 590]) palmShape(ctx, x, top + 1, 26 + (x % 11), '#3f8a4f');
  });
  return {
    sky: sky(['#7fc4e6', '#95d2ea', '#aadced', '#bfe6ef', '#d4eff0', '#e8f5e4']),
    sun: { x: 250, y: 24, r: 11, color: '#fff3b8', rim: '#ffe28a' },
    layers: [
      { img: clouds, speed: 0.06, y: 0 },
      { img: far, speed: 0.14, y: 0 },
      { img: fields, speed: 0.3, y: 0 },
    ],
  };
}

const CHALK = [
  'import pandas as pd', 'df = df.dropna()  # sorry', 'np.mean(tea)', 'y = mx + c',
  'k = 3  # clusters', 'model.fit(X, y)', 'print("why")', 'for i in range(n):',
  '# TODO: understand this', 'df.groupby("city")', 'x = x + 1', 'assert tea > 0',
];

function alx() {
  const board = strip(640, 180, (ctx, w, h) => {
    const r = rng(21);
    rect(ctx, '#2c4a40', 0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      rect(ctx, r() < 0.5 ? '#2f4f45' : '#284439', Math.floor(r() * w), Math.floor(r() * h), 2 + Math.floor(r() * 5), 1);
    }
    // Half-wiped chalk, the smell of every classroom.
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(r() * w);
      const y = Math.floor(r() * h);
      for (let j = 0; j < 9; j++) rect(ctx, '#38584e', x + j * 3, y + Math.floor(r() * 7), 12, 1);
    }
    CHALK.forEach((line, i) => {
      const x = 14 + (i * 211) % (w - 150);
      const y = 12 + (i * 37) % 92;
      drawText(ctx, line, x, y, i % 3 === 0 ? '#f6e6a5' : '#cfe3d6', { scale: 1 });
    });
    // A hand-drawn scatter plot with three obvious clusters.
    const dots = [[0, 0, '#f7b733'], [30, 18, '#f08fa8'], [12, 34, '#58d3e0']];
    dots.forEach(([cx, cy, color]) => {
      for (let i = 0; i < 12; i++) rect(ctx, color, 330 + cx + Math.floor(r() * 12), 34 + cy + Math.floor(r() * 10), 2, 2);
    });
    rect(ctx, '#cfe3d6', 324, 30, 1, 62);
    rect(ctx, '#cfe3d6', 324, 92, 66, 1);
    // A bell curve, because of course.
    for (let x = 0; x < 70; x++) {
      const y = Math.round(36 * Math.exp(-((x - 35) ** 2) / 200));
      rect(ctx, '#cfe3d6', 500 + x, 92 - y, 1, 1);
    }
    rect(ctx, '#7a4e2c', 0, h - 6, w, 6);
  });
  const paper = strip(480, 180, (ctx, w) => {
    const r = rng(31);
    const glyphs = ['%', '=', '+', '{', '}', '#', '<', '>', '*', '?'];
    for (let i = 0; i < 26; i++) {
      drawText(ctx, glyphs[Math.floor(r() * glyphs.length)], Math.floor(r() * (w - 8)), 8 + Math.floor(r() * 150), '#ffffff14', { scale: 2 });
    }
  });
  return {
    sky: sky(['#2c4a40']),
    layers: [
      { img: board, speed: 0.22, y: 0 },
      { img: paper, speed: 0.4, y: 0 },
    ],
  };
}

function apartmentRow(ctx, w, top, bottom, seed, colors, lit, dark) {
  const r = rng(seed);
  let x = 0;
  while (x < w) {
    const bw = 18 + Math.floor(r() * 26);
    const room = Math.min(bw, w - x);
    const by = top + Math.floor(r() * 28);
    const c = colors[Math.floor(r() * colors.length)];
    rect(ctx, c, x, by, room, bottom - by);
    for (let wy = by + 4; wy < bottom - 4; wy += 7) {
      for (let wx = x + 3; wx < x + room - 3; wx += 6) {
        const on = r() < 0.34;
        rect(ctx, on ? lit[Math.floor(r() * lit.length)] : dark, wx, wy, 3, 4);
      }
    }
    if (r() < 0.55 && room > 12) {
      rect(ctx, dark, x + 4, by - 3, 1, 3);
      rect(ctx, dark, x + 2, by - 4, 5, 1);
    }
    if (r() < 0.4 && room > 16) rect(ctx, dark, x + room - 10, by - 5, 7, 5);
    x += bw;
  }
}

function cairo() {
  const far = strip(480, 180, (ctx, w, h) => {
    const c = '#7a4a78';
    const line = ridge(w, 104, [[3, 1, 0.3], [2, 3, 1]]);
    for (let x = 0; x < w; x++) rect(ctx, c, x, line[x], 1, h - line[x]);
    // The citadel up on its hill.
    dome(ctx, 120, 96, 15, c);
    dome(ctx, 92, 98, 9, c);
    dome(ctx, 148, 98, 9, c);
    rect(ctx, c, 84, 96, 74, 12);
    minaret(ctx, 74, 104, 40, c, '#f7b733');
    minaret(ctx, 164, 104, 40, c, '#f7b733');
    // The tall tower on the island, lattice and all.
    rect(ctx, c, 330, 54, 8, 54);
    rect(ctx, c, 326, 46, 16, 9);
    rect(ctx, c, 333, 34, 2, 12);
    for (let y = 60; y < 104; y += 3) rect(ctx, '#6a3f6c', 331, y, 6, 1);
    minaret(ctx, 244, 106, 30, c, '#f7b733');
    minaret(ctx, 404, 106, 24, c, '#f7b733');
  });
  const blocks = strip(640, 180, (ctx, w) => {
    apartmentRow(ctx, w, 100, 180, 77, ['#54305f', '#5e3560', '#4a2a58', '#633a5e'], ['#f7b733', '#f2a33a', '#ffd97a'], '#2f1d42');
  });
  const near = strip(640, 180, (ctx, w) => {
    apartmentRow(ctx, w, 128, 180, 41, ['#3c2350', '#432755', '#361f4a'], ['#f2762e', '#f7b733'], '#241535');
  });
  return {
    sky: sky(['#2f2460', '#4c2c74', '#7b3a7e', '#b24f79', '#e0746a', '#f4a35e', '#f8c76e']),
    sun: { x: 70, y: 104, r: 14, color: '#ffd97a', rim: '#f8a85a' },
    layers: [
      { img: far, speed: 0.1, y: 0 },
      { img: blocks, speed: 0.22, y: 0 },
      { img: near, speed: 0.36, y: 0 },
    ],
  };
}

function rack(ctx, x, y, w, h, r, face, slot, leds) {
  rect(ctx, '#0f1228', x, y, w, h);
  rect(ctx, face, x + 1, y + 1, w - 2, h - 2);
  for (let sy = y + 3; sy < y + h - 6; sy += 6) {
    rect(ctx, slot, x + 3, sy, w - 6, 4);
    for (let lx = x + 4; lx < x + w - 5; lx += 3) {
      if (r() < 0.5) rect(ctx, leds[Math.floor(r() * leds.length)], lx, sy + 1, 1, 1);
    }
  }
}

function hearts() {
  const far = strip(480, 180, (ctx, w, h) => {
    const r = rng(101);
    rect(ctx, '#141735', 0, 0, w, h);
    for (let x = 0; x < w; x += 34) rack(ctx, x + 1, 26, 32, 150, r, '#1b2048', '#12153a', ['#2b8ea3', '#3a4a7a', '#4f9a3c']);
    rect(ctx, '#0f1228', 0, 0, w, 24);
    for (let x = 0; x < w; x += 40) rect(ctx, '#2a3163', x + 6, 18, 28, 2);
  });
  const near = strip(640, 180, (ctx, w) => {
    const r = rng(202);
    const groups = [0, 92, 240, 330, 470, 560];
    for (const gx of groups) {
      rack(ctx, gx, 44, 40, 136, r, '#232a56', '#141735', ['#58d3e0', '#8fd14f', '#f7b733', '#f2762e']);
      rack(ctx, gx + 42, 44, 40, 136, r, '#262e5c', '#141735', ['#58d3e0', '#8fd14f', '#e0403f']);
    }
    // Cables, hanging the way cables hang when nobody labelled them.
    for (let i = 0; i < 14; i++) {
      const x0 = Math.floor(r() * (w - 90));
      const span = 40 + Math.floor(r() * 50);
      const sag = 8 + Math.floor(r() * 18);
      const color = ['#e0403f', '#3f7fd1', '#f7b733', '#8fd14f'][i % 4];
      for (let k = 0; k <= span; k++) {
        const u = k / span;
        rect(ctx, color, x0 + k, 14 + Math.round(4 * sag * u * (1 - u)), 1, 1);
      }
    }
  });
  return {
    sky: sky(['#101330']),
    layers: [
      { img: far, speed: 0.15, y: 0 },
      { img: near, speed: 0.34, y: 0 },
    ],
    leds: true,
  };
}

function dunes() {
  const far = strip(480, 180, (ctx, w, h) => {
    const line = ridge(w, 114, [[8, 2, 0.5], [4, 3, 2.1]]);
    for (let x = 0; x < w; x++) rect(ctx, '#e8a868', x, line[x], 1, h - line[x]);
    const shade = ridge(w, 128, [[7, 2, 1.7], [3, 5, 0.3]]);
    for (let x = 0; x < w; x++) rect(ctx, '#dc9458', x, Math.max(shade[x], line[x]), 1, h - shade[x]);
  });
  const near = strip(640, 180, (ctx, w, h) => {
    const r = rng(303);
    const line = ridge(w, 134, [[10, 2, 2.2], [5, 3, 0.9]]);
    for (let x = 0; x < w; x++) {
      rect(ctx, '#d48a4c', x, line[x], 1, h - line[x]);
      rect(ctx, '#ecb878', x, line[x], 1, 2);
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * w);
      rect(ctx, '#c47c42', x, line[x] + 4 + Math.floor(r() * 36), 6, 1);
    }
    // Far off, a line of pylons. Progress, walking into the desert.
    for (const x of [80, 300, 520]) {
      rect(ctx, '#a0603a', x, line[x] - 22, 1, 22);
      rect(ctx, '#a0603a', x - 4, line[x] - 20, 9, 1);
      rect(ctx, '#a0603a', x - 3, line[x] - 16, 7, 1);
    }
  });
  return {
    sky: sky(['#f7c26b', '#f9cf7f', '#fbdb96', '#fde6ae', '#fdeec4', '#fef3d4']),
    sun: { x: 232, y: 52, r: 17, color: '#fff6d0', rim: '#ffe7a0' },
    layers: [
      { img: far, speed: 0.12, y: 0 },
      { img: near, speed: 0.28, y: 0 },
    ],
  };
}

function souq() {
  const wall = strip(480, 180, (ctx, w, h) => {
    const r = rng(404);
    rect(ctx, '#7a5636', 0, 0, w, h);
    for (let i = 0; i < 900; i++) rect(ctx, r() < 0.5 ? '#6e4c2e' : '#86603c', Math.floor(r() * w), Math.floor(r() * h), 3, 1);
    // Plaster arches, one after another.
    for (let x = 0; x < w; x += 80) {
      rect(ctx, '#3a2632', x + 16, 72, 48, 108);
      dome(ctx, x + 40, 72, 24, '#3a2632');
      rect(ctx, '#2a1c28', x + 22, 90, 36, 90);
      dome(ctx, x + 40, 90, 18, '#2a1c28');
      rect(ctx, '#f7b733', x + 39, 58, 2, 2);
    }
    // The wooden poles that stick out of every old Gulf wall.
    rect(ctx, '#55391f', 0, 18, w, 4);
    for (let x = 6; x < w; x += 12) {
      rect(ctx, '#3c2716', x, 24, 3, 7);
      rect(ctx, '#55391f', x, 24, 3, 1);
    }
  });
  const cloth = strip(240, 60, (ctx, w) => {
    const colors = ['#b84a1f', '#2b8ea3', '#7a2d3d', '#d4841f'];
    for (let x = 0; x < w; x += 60) {
      const c = colors[(x / 60) % 4];
      for (let i = 0; i < 60; i++) {
        const sag = Math.round(9 * Math.sin((i / 60) * Math.PI));
        rect(ctx, c, x + i, 0, 1, 7 + sag);
        if (i % 12 < 4) rect(ctx, '#fff7e640', x + i, 0, 1, 7 + sag);
      }
    }
  });
  return {
    sky: sky(['#2a1c28']),
    layers: [
      { img: wall, speed: 0.3, y: 0 },
      { img: cloth, speed: 0.5, y: 0 },
    ],
  };
}

// Doha after dark. The strips here repeat at 120 and 240 px so the profile
// animation can loop on a whole number of them.
function skylineStrip(w, seed, h0, colors, lit) {
  return strip(w, 180, (ctx) => {
    const r = rng(seed);
    const base = 140;
    let x = 0;
    while (x < w) {
      const bw = 10 + Math.floor(r() * 12);
      const room = Math.min(bw, w - x);
      const tall = h0 + Math.floor(r() * 44);
      const c = colors[Math.floor(r() * colors.length)];
      const kind = Math.floor(r() * 4);
      rect(ctx, c, x, base - tall, room, tall);
      if (kind === 1) {
        // A tower that tapers to a point, Doha's favourite shape.
        for (let i = 0; i < 12; i++) rect(ctx, c, x + Math.floor(i / 2), base - tall - i, Math.max(1, room - i), 1);
      } else if (kind === 2) {
        dome(ctx, x + (room >> 1), base - tall, room >> 1, c);
      } else if (kind === 3) {
        rect(ctx, c, x + (room >> 1), base - tall - 9, 1, 9);
      }
      for (let wy = base - tall + 3; wy < base - 3; wy += 4) {
        for (let wx = x + 2; wx < x + room - 2; wx += 3) {
          if (r() < 0.42) rect(ctx, lit[Math.floor(r() * lit.length)], wx, wy, 1, 2);
        }
      }
      x += bw + Math.floor(r() * 3);
    }
  });
}

function corniche() {
  const stars = makeCanvas(320, 180);
  {
    const ctx = stars.getContext('2d');
    bandedSky(ctx, ['#0d0f33', '#121544', '#1a1c56', '#252567', '#352e78', '#4c3a86'], 320, 180);
    const r = rng(505);
    for (let i = 0; i < 90; i++) {
      rect(ctx, r() < 0.2 ? '#fff7e6' : '#a8a4d8', Math.floor(r() * 320), Math.floor(r() * 110));
    }
  }
  const far = skylineStrip(120, 606, 26, ['#262a6e', '#2c2f78', '#232566'], ['#4f5fb0', '#6a78c8']);
  const near = skylineStrip(240, 707, 34, ['#151848', '#1a1d56', '#12143e'], ['#f7b733', '#ffd97a', '#58d3e0', '#f08fa8']);
  const sea = strip(120, 180, (ctx, w) => {
    rect(ctx, '#142a5e', 0, 140, w, 40);
    const r = rng(808);
    for (let y = 142; y < 178; y += 3) {
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(r() * (w - 12));
        rect(ctx, ['#f7b733', '#58d3e0', '#2a4d91', '#f08fa8'][Math.floor(r() * 4)], x, y, 3 + Math.floor(r() * 8), 1);
      }
    }
  });
  return {
    sky: stars,
    moon: { x: 262, y: 34 },
    layers: [
      { img: far, speed: 0.12, y: -4 },
      { img: near, speed: 0.24, y: 0 },
      { img: sea, speed: 0.24, y: 0 },
    ],
  };
}

const BUILDERS = { tanta, alx, cairo, hearts, dunes, souq, corniche };

export function buildBackground(theme) {
  return BUILDERS[theme]();
}

function drawDisc(ctx, x, y, r, color, rim) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    rect(ctx, rim, x - half, y + dy, half * 2, 1);
    if (Math.abs(dy) < r - 1) rect(ctx, color, x - half + 2, y + dy, Math.max(0, half * 2 - 4), 1);
  }
}

export function drawBackground(ctx, bg, camX, camY, t) {
  ctx.drawImage(bg.sky, 0, 0);
  if (bg.sun) drawDisc(ctx, bg.sun.x, bg.sun.y, bg.sun.r, bg.sun.color, bg.sun.rim);
  if (bg.moon) {
    drawDisc(ctx, bg.moon.x, bg.moon.y, 11, '#fff3d6', '#e8d6b0');
    drawDisc(ctx, bg.moon.x + 5, bg.moon.y - 3, 8, '#141646', '#141646');
  }
  for (const layer of bg.layers) {
    const w = layer.img.width;
    let x = -Math.round(camX * layer.speed) % w;
    if (x > 0) x -= w;
    const y = (layer.y ?? 0) - Math.round(camY * 0.4);
    for (; x < 320; x += w) ctx.drawImage(layer.img, x, y);
  }
  if (bg.leds) {
    // A few LEDs that actually blink, on top of the painted ones.
    const r = rng(Math.floor(t / 20));
    for (let i = 0; i < 26; i++) {
      rect(ctx, ['#58d3e0', '#8fd14f', '#f7b733'][i % 3], Math.floor(r() * 320), 40 + Math.floor(r() * 120));
    }
  }
}

// Draws the social card, the favicons and the profile animation from the real
// game art, in a real browser, then writes them to assets/.
//
//   node tools/make-images.mjs

import { writeFileSync, statSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 8943;
const SCALE = 3;
const DELAY_CS = 4;

function fromDataUrl(url) {
  return Buffer.from(url.split(',')[1], 'base64');
}

// ---- A small GIF writer ---------------------------------------------------

function lzw(indices, minCode) {
  const clear = 1 << minCode;
  const end = clear + 1;
  const out = [];
  let bits = 0;
  let acc = 0;
  let size = minCode + 1;
  const put = (code) => {
    acc |= code << bits;
    bits += size;
    while (bits >= 8) {
      out.push(acc & 255);
      acc >>>= 8;
      bits -= 8;
    }
  };
  let table = new Map();
  let next = end + 1;
  const reset = () => {
    table = new Map();
    next = end + 1;
    size = minCode + 1;
  };
  put(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const hit = table.get(key);
    if (hit !== undefined) {
      prefix = hit;
    } else {
      put(prefix);
      if (next === 4096) {
        put(clear);
        reset();
      } else {
        table.set(key, next);
        if (next === 1 << size && size < 12) size++;
        next++;
      }
      prefix = k;
    }
  }
  put(prefix);
  put(end);
  if (bits > 0) out.push(acc & 255);
  return Buffer.from(out);
}

function subBlocks(data) {
  const parts = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.subarray(i, i + 255);
    parts.push(Buffer.from([chunk.length]), chunk);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

const u16 = (n) => [n & 255, n >> 8];

function encodeGif(width, height, palette, frames) {
  const bitsNeeded = Math.max(2, Math.ceil(Math.log2(palette.length + 1)));
  const tableSize = 1 << bitsNeeded;
  const table = Buffer.alloc(tableSize * 3);
  palette.forEach((rgb, i) => {
    table[i * 3] = rgb >> 16;
    table[i * 3 + 1] = (rgb >> 8) & 255;
    table[i * 3 + 2] = rgb & 255;
  });
  const transparent = tableSize - 1;
  const parts = [
    Buffer.from('GIF89a'),
    Buffer.from([...u16(width), ...u16(height), 0xf0 | (bitsNeeded - 1), 0, 0]),
    table,
    // Loop for ever.
    Buffer.from([0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0]),
  ];
  let previous = null;
  frames.forEach((indices) => {
    let x0 = 0;
    let y0 = 0;
    let x1 = width - 1;
    let y1 = height - 1;
    let body = indices;
    if (previous) {
      // Only store what changed. Unchanged pixels become transparent, which
      // gives the compressor long easy runs.
      x0 = width; y0 = height; x1 = -1; y1 = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (indices[y * width + x] !== previous[y * width + x]) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      body = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const at = (y + y0) * width + x + x0;
          body[y * w + x] = indices[at] === previous[at] ? transparent : indices[at];
        }
      }
    }
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    parts.push(
      Buffer.from([0x21, 0xf9, 4, (1 << 2) | 1, ...u16(DELAY_CS), transparent, 0]),
      Buffer.from([0x2c, ...u16(x0), ...u16(y0), ...u16(w), ...u16(h), 0]),
      Buffer.from([bitsNeeded]),
      subBlocks(lzw(body, bitsNeeded)),
    );
    previous = indices;
  });
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

// ---- Run ------------------------------------------------------------------

const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto(`http://localhost:${PORT}/tools/card.html`);
await page.waitForFunction(() => window.gifInfo);

// The card is drawn at 300 wide and pixel-doubled twice, then trimmed to size.
const cardUrl = await page.evaluate(() => window.card());
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<body style="margin:0;background:#000"><img src="${cardUrl}" style="display:block;width:1200px;height:632px;image-rendering:pixelated"></body>`);
await page.waitForTimeout(200);
await page.screenshot({ path: 'assets/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });

await page.goto(`http://localhost:${PORT}/tools/card.html`);
await page.waitForFunction(() => window.gifInfo);
for (const [name, px] of [['favicon.png', 32], ['favicon-180.png', 180]]) {
  writeFileSync(`assets/${name}`, fromDataUrl(await page.evaluate((n) => window.favicon(n), px)));
}

const { W, H, FRAMES } = await page.evaluate(() => window.gifInfo);
console.log(`Drawing ${FRAMES} frames at ${W}x${H}...`);
const raw = [];
for (let i = 0; i < FRAMES; i++) raw.push(Buffer.from(await page.evaluate((n) => window.gifFrame(n), i), 'base64'));
await browser.close();
server.close();

const colors = new Map();
const indexed = raw.map((data) => {
  const out = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const rgb = (data[p * 4] << 16) | (data[p * 4 + 1] << 8) | data[p * 4 + 2];
    let index = colors.get(rgb);
    if (index === undefined) {
      index = colors.size;
      colors.set(rgb, index);
    }
    out[p] = index;
  }
  return out;
});
if (colors.size > 255) throw new Error(`${colors.size} colours, a GIF holds 255 plus transparency`);

// Nearest-neighbour by hand: every art pixel becomes a clean 3x3 block.
const width = W * SCALE;
const height = H * SCALE;
const scaled = indexed.map((small) => {
  const big = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / SCALE) * W;
    for (let x = 0; x < width; x++) big[y * width + x] = small[row + Math.floor(x / SCALE)];
  }
  return big;
});

writeFileSync('assets/profile.gif', encodeGif(width, height, [...colors.keys()], scaled));
const bytes = statSync('assets/profile.gif').size;
console.log(`assets/profile.gif: ${width}x${height}, ${FRAMES} frames, ${colors.size} colours, ${(bytes / 1048576).toFixed(2)} MB, ${((FRAMES * DELAY_CS) / 100).toFixed(1)}s loop`);
if (bytes >= 3 * 1048576) throw new Error('the profile animation is over 3 MB');

// A last sanity check that the seam is clean: last frame should lead into the first.
let same = 0;
const a = indexed[0];
const b = indexed[FRAMES - 1];
for (let p = 0; p < a.length; p++) if (a[p] === b[p]) same++;
console.log(`first and last frames match on ${((same / a.length) * 100).toFixed(1)}% of pixels (one step of scroll apart)`);

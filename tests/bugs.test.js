import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T, TILE } from '../src/game/physics.js';
import { BUG_TYPES, makeBug, updateBug, splitBug } from '../src/game/bugs.js';
import { createSession, createGame, startRun, step, worldOf } from '../src/game/game.js';

function mini(rows) {
  const cols = rows[0].length;
  const tiles = new Uint8Array(cols * rows.length);
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') tiles[y * cols + x] = T.SOLID; }));
  return { cols, rows: rows.length, tiles };
}
const far = { x: 100, y: 0, w: 10, h: 15 };
const none = { left: false, right: false, jump: false, action: false };

test('every bug type has a sprite-sized box', () => {
  for (const [name, d] of Object.entries(BUG_TYPES)) {
    assert.ok(d.w > 0 && d.h > 0, name);
  }
});

test('walkers turn around at a wall', () => {
  const w = mini(['#      #', '#      #', '########']);
  const b = makeBug('nullptr', 2 * TILE, 2 * TILE, { dir: 1 });
  const dirs = new Set();
  for (let i = 0; i < 400; i++) { updateBug(b, w, i, far); dirs.add(b.dir); }
  assert.deepEqual([...dirs].sort(), [-1, 1]);
});

test('walkers do not walk off a ledge', () => {
  const w = mini(['        ', '        ', '  ####  ', '        ', '        ']);
  const b = makeBug('nullptr', 3 * TILE, 2 * TILE, { dir: 1 });
  for (let i = 0; i < 800; i++) updateBug(b, w, i, far);
  assert.equal(b.y + b.h, 2 * TILE);
});

test('Scope Creep grows every time it turns', () => {
  const w = mini(['#        #', '#        #', '##########']);
  const b = makeBug('creep', 2 * TILE, 2 * TILE, { dir: 1 });
  for (let i = 0; i < 1600; i++) updateBug(b, w, i, far);
  assert.ok(b.scale > 1.2, `scale ${b.scale}`);
  assert.ok(b.scale <= 2);
  assert.equal(b.y + b.h, 2 * TILE);
});

test('Segfault drops when you walk underneath', () => {
  const w = mini(['      ', '      ', '      ', '      ', '      ', '######']);
  const b = makeBug('segfault', 2 * TILE, 2 * TILE);
  const start = b.y;
  const under = { x: b.x, y: 4 * TILE, w: 10, h: 15 };
  for (let i = 0; i < 40; i++) updateBug(b, w, i, under);
  assert.ok(b.y > start + 20);
});

test('Merge Conflict splits in two, the small ones do not', () => {
  const big = makeBug('merge', 0, 32);
  assert.deepEqual(splitBug(big).map((b) => b.type), ['ours', 'theirs']);
  const small = splitBug(big)[0];
  assert.deepEqual(splitBug(small), []);
});

test('N+1 Query leaves two smaller queries and stops there', () => {
  const big = makeBug('nplus1', 0, 32);
  const kids = splitBug(big);
  assert.equal(kids.length, 2);
  assert.ok(kids[0].w < big.w);
  assert.deepEqual(splitBug(kids[0]), []);
});

function arena(type) {
  const s = createSession();
  const g = createGame();
  startRun(s, g);
  const w = worldOf(s, g);
  const feet = w.spawn.y + 15;
  g.bugs = [makeBug(type, w.spawn.x + 40, feet)];
  g.bugs[0].vx = 0;
  return { s, g, w, b: g.bugs[0] };
}

test('landing on a bug stomps it and bounces you', () => {
  const { s, g, b } = arena('nullptr');
  g.p.x = b.x;
  g.p.y = b.y - 18;
  g.p.vy = 3;
  for (let i = 0; i < 6 && b.dead === 0; i++) step(s, g, none);
  assert.ok(b.dead > 0);
  assert.equal(g.stomped, 1);
  assert.ok(g.p.vy < 0);
  assert.ok(g.events.some((e) => e.type === 'stomp' && e.name === 'bug.nullptr'));
});

test('walking into a bug drains the battery and gives a moment of safety', () => {
  const { s, g, b } = arena('nullptr');
  g.p.x = b.x - 8;
  g.p.y = b.y + b.h - g.p.h;
  g.p.vy = 0;
  const before = g.battery;
  for (let i = 0; i < 12; i++) step(s, g, none);
  assert.equal(g.battery, before - 1);
  assert.ok(g.p.inv > 0);
});

test('a flat battery sends you back to the last checkpoint with a fresh charge', () => {
  const { s, g, b } = arena('nullptr');
  g.battery = 1;
  g.p.x = b.x - 8;
  g.p.y = b.y + b.h - g.p.h;
  g.p.vy = 0;
  for (let i = 0; i < 60; i++) step(s, g, none);
  assert.equal(g.retries, 1);
  assert.equal(g.battery, 3);
});

test('Works On My Machine survives the first stomp', () => {
  const { s, g, b } = arena('works');
  g.p.x = b.x;
  g.p.y = b.y - 18;
  g.p.vy = 3;
  for (let i = 0; i < 6 && b.hp === 2; i++) step(s, g, none);
  assert.equal(b.hp, 1);
  assert.equal(b.dead, 0);
  assert.equal(g.stomped, 0);
});

test('a stomped Merge Conflict adds both halves to the level', () => {
  const { s, g, b } = arena('merge');
  g.p.x = b.x;
  g.p.y = b.y - 18;
  g.p.vy = 3;
  for (let i = 0; i < 6 && b.dead === 0; i++) step(s, g, none);
  assert.ok(g.bugs.some((x) => x.type === 'ours'));
  assert.ok(g.bugs.some((x) => x.type === 'theirs'));
});

test('caffeine turns contact into a stomp', () => {
  const { s, g, b } = arena('nullptr');
  g.hyperT = 100;
  g.p.x = b.x - 8;
  g.p.y = b.y + b.h - g.p.h;
  g.p.vy = 0;
  const before = g.battery;
  for (let i = 0; i < 12 && b.dead === 0; i++) step(s, g, none);
  assert.ok(b.dead > 0);
  assert.equal(g.battery, before);
});

test('spikes hurt', () => {
  const { s, g, w } = arena('nullptr');
  g.bugs = [];
  const i = w.cols * (w.rows - 3) + 6;
  const saved = w.tiles[i];
  w.tiles[i] = T.SPIKE;
  g.p.x = 6 * TILE + 3;
  g.p.y = (w.rows - 3) * TILE;
  g.p.vy = 0;
  const before = g.battery;
  step(s, g, none);
  w.tiles[i] = saved;
  assert.equal(g.battery, before - 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T, TILE, PHYS, moveBody, tileAt, overlaps, isSolidTile } from '../src/game/physics.js';
import { newPlayer, updatePlayer } from '../src/game/player.js';

// Small test world from rows of text.
function mini(rows) {
  const cols = rows[0].length;
  const tiles = new Uint8Array(cols * rows.length);
  const map = { '#': T.SOLID, '=': T.ONEWAY, '^': T.SPIKE, '}': T.BELT_R, '*': T.BOUNCE, '%': T.SPEED };
  rows.forEach((row, y) => [...row].forEach((c, x) => { tiles[y * cols + x] = map[c] ?? T.AIR; }));
  return { cols, rows: rows.length, tiles };
}
const body = (x, y, vx = 0, vy = 0) => ({ x, y, w: 10, h: 15, vx, vy, onGround: false });
const idle = { left: false, right: false, jump: false };

test('edges of the map behave', () => {
  const w = mini(['   ', '###']);
  assert.equal(tileAt(w, -1, 0), T.SOLID);
  assert.equal(tileAt(w, 3, 0), T.SOLID);
  assert.equal(tileAt(w, 0, -1), T.AIR);
  assert.equal(tileAt(w, 0, 5), T.AIR);
});

test('a falling body lands on top of a solid tile', () => {
  const w = mini(['    ', '    ', '####']);
  const b = body(4, 10, 0, 4);
  for (let i = 0; i < 20; i++) { b.vy = Math.min(b.vy + PHYS.GRAVITY, 4); moveBody(b, w, 0); }
  assert.equal(b.onGround, true);
  assert.equal(b.y + b.h, 2 * TILE);
  assert.equal(b.vy, 0);
});

test('a wall stops horizontal movement', () => {
  const w = mini(['   #', '   #', '####']);
  const b = body(20, 17, 3, 0);
  for (let i = 0; i < 10; i++) { b.vx = 3; moveBody(b, w, 0); }
  assert.equal(b.x + b.w, 3 * TILE);
  assert.equal(b.hitWall, true);
});

test('head bumps stop a jump', () => {
  const w = mini(['####', '    ', '    ', '####']);
  const b = body(4, 30, 0, -4);
  moveBody(b, w, 0); moveBody(b, w, 0); moveBody(b, w, 0); moveBody(b, w, 0);
  assert.equal(b.y, TILE);
  assert.equal(b.hitHead, true);
});

test('one-way platforms let you up but catch you coming down', () => {
  const w = mini(['    ', '    ', '====', '    ', '    ', '####']);
  const b = body(4, 50, 0, -4);
  moveBody(b, w, 0); moveBody(b, w, 0); moveBody(b, w, 0);
  assert.equal(b.hitHead, false);
  assert.ok(b.y < 40);
  const c = body(4, 10, 0, 2);
  for (let i = 0; i < 10; i++) { c.vy = 2; moveBody(c, w, 0); }
  assert.equal(c.y + c.h, 2 * TILE);
  assert.equal(c.onGround, true);
});

test('blink platforms take turns, with a moment of overlap at each swap', () => {
  const half = PHYS.BLINK_PERIOD / 2;
  assert.equal(isSolidTile(T.BLINK_A, half / 2), true);
  assert.equal(isSolidTile(T.BLINK_B, half / 2), false);
  assert.equal(isSolidTile(T.BLINK_A, half + half / 2), false);
  assert.equal(isSolidTile(T.BLINK_B, half + half / 2), true);
  for (const swap of [half, PHYS.BLINK_PERIOD]) {
    assert.equal(isSolidTile(T.BLINK_A, swap), true);
    assert.equal(isSolidTile(T.BLINK_B, swap), true);
  }
});

test('there is never a moment with no blink platform at all', () => {
  for (let t = 0; t < PHYS.BLINK_PERIOD * 3; t++) {
    assert.ok(isSolidTile(T.BLINK_A, t) || isSolidTile(T.BLINK_B, t), `tick ${t}`);
  }
});

test('overlap ignores bodies that only touch', () => {
  assert.equal(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 10, h: 10 }), true);
});

function settled(world, x = 8) {
  const p = newPlayer(x, world.rows * TILE - TILE - 15);
  updatePlayer(p, idle, world, 0);
  return p;
}

test('a full jump clears three tiles and a held one crosses four', () => {
  const w = mini([...Array(8).fill(' '.repeat(40)), '#'.repeat(40)]);
  const p = settled(w);
  const startY = p.y;
  let top = p.y, airborne = 0, startX = 0;
  for (let i = 0; i < 90; i++) {
    updatePlayer(p, { left: false, right: true, jump: i > 30 }, w, i);
    if (i === 30) startX = p.x;
    top = Math.min(top, p.y);
    if (!p.onGround) airborne++;
    if (airborne > 0 && p.onGround) break;
  }
  assert.ok(startY - top >= 3 * TILE - 4, `rose ${startY - top}`);
  assert.ok(p.x - startX >= 4 * TILE, `travelled ${p.x - startX}`);
});

test('a tap jump is lower than a held jump', () => {
  const w = mini([...Array(8).fill(' '.repeat(10)), '#'.repeat(10)]);
  const rise = (hold) => {
    const p = settled(w);
    const start = p.y;
    let top = p.y;
    for (let i = 0; i < 60; i++) {
      updatePlayer(p, { ...idle, jump: i < hold }, w, i);
      top = Math.min(top, p.y);
    }
    return start - top;
  };
  assert.ok(rise(4) < rise(30) * 0.6);
});

test('you can still jump just after walking off a ledge', () => {
  const w = mini([...Array(5).fill(' '.repeat(12)), '####        ', '            ', '            ']);
  const p = newPlayer(30, 5 * TILE - 15);
  p.vx = PHYS.MAX_RUN;
  updatePlayer(p, idle, w, 0);
  let jumped = false;
  for (let i = 0; i < 40 && !jumped; i++) {
    const inAir = !p.onGround;
    jumped = updatePlayer(p, { left: false, right: true, jump: inAir }, w, i).jumped;
  }
  assert.equal(jumped, true);
});

test('a jump pressed just before landing still fires', () => {
  const w = mini([...Array(8).fill(' '.repeat(10)), '#'.repeat(10)]);
  const p = newPlayer(8, 8 * TILE - 15 - 12);
  p.vy = 2;
  let fired = false;
  for (let i = 0; i < 20 && !fired; i++) {
    fired = updatePlayer(p, { ...idle, jump: i >= 2 }, w, i).jumped;
  }
  assert.equal(fired, true);
});

test('holding jump does not bunny hop', () => {
  const w = mini([...Array(8).fill(' '.repeat(10)), '#'.repeat(10)]);
  const p = settled(w);
  let jumps = 0;
  for (let i = 0; i < 200; i++) if (updatePlayer(p, { ...idle, jump: true }, w, i).jumped) jumps++;
  assert.equal(jumps, 1);
});

test('belts carry you and bouncers launch you', () => {
  const belt = mini([...Array(4).fill(' '.repeat(20)), '}'.repeat(20)]);
  const p = newPlayer(16, 4 * TILE - 15);
  for (let i = 0; i < 60; i++) updatePlayer(p, idle, belt, i);
  assert.ok(p.x > 60, `belt moved him to ${p.x}`);

  const bounce = mini([...Array(8).fill(' '.repeat(10)), '*'.repeat(10)]);
  const q = newPlayer(16, 8 * TILE - 16);
  let launched = false;
  for (let i = 0; i < 10; i++) launched = updatePlayer(q, idle, bounce, i).bounced || launched;
  assert.equal(launched, true);
  assert.ok(q.vy < -5);
});

test('speed pads push you past normal top speed', () => {
  const w = mini([...Array(4).fill(' '.repeat(30)), '%'.repeat(30)]);
  const p = newPlayer(16, 4 * TILE - 15);
  for (let i = 0; i < 20; i++) updatePlayer(p, { ...idle, right: true }, w, i);
  assert.ok(p.vx > PHYS.MAX_RUN);
});

test('caffeine gives one extra jump in the air', () => {
  const w = mini([...Array(12).fill(' '.repeat(10)), '#'.repeat(10)]);
  const p = settled(w);
  let jumps = 0;
  for (let i = 0; i < 40; i++) {
    const press = i === 1 || i === 20;
    if (updatePlayer(p, { ...idle, jump: press }, w, i, { airJumps: 1 }).jumped) jumps++;
  }
  assert.equal(jumps, 2);
});

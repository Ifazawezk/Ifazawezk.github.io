import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, PHYS, T, tileAt } from '../src/game/physics.js';
import { moverPos } from '../src/game/world.js';
import { createSession, createGame, startRun, step, worldOf, loadLevel } from '../src/game/game.js';
import { snapshotRepos } from '../tools/bot.mjs';

const none = { left: false, right: false, jump: false, action: false };
const session = () => createSession(snapshotRepos());

// How far a person can comfortably jump, in pixels: not the frame-perfect best.
const SAFE_GAP = 3.5 * TILE;

function allMovers(s) {
  return s.worlds.flatMap((w) => w.movers.map((m) => ({ w, m })));
}

// Nearest ground at or below deck height, looking outward from x.
function groundGap(w, m, x, dir) {
  const deck = Math.floor(m.y / TILE);
  for (let i = 0; i < 12; i++) {
    const cx = Math.floor((x + dir * i * TILE - (dir < 0 ? 1 : 0)) / TILE);
    for (let cy = deck; cy < w.rows; cy++) {
      const type = tileAt(w, cx, cy);
      if (type === T.SOLID) return dir > 0 ? cx * TILE - x : x - (cx + 1) * TILE;
      if (type === T.ONEWAY) break;
    }
  }
  return Infinity;
}

test('movers pause and still return to where they started', () => {
  const m = { x: 100, y: 0, dx: 60, dy: 0, period: 200, hold: 40 };
  assert.equal(moverPos(m, 0).x, 100);
  assert.equal(moverPos(m, 39).x, 100);
  assert.equal(moverPos(m, 100).x, 160);
  assert.equal(moverPos(m, 139).x, 160);
  assert.equal(moverPos(m, 200).x, 100);
});

test('no mover ever moves faster than Faza can run', () => {
  for (const { w, m } of allMovers(session())) {
    let last = moverPos(m, 0);
    for (let t = 1; t <= m.period; t++) {
      const now = moverPos(m, t);
      assert.ok(Math.abs(now.x - last.x) < PHYS.MAX_RUN, `${w.id} ${m.kind}`);
      assert.ok(Math.abs(now.y - last.y) < PHYS.MAX_RUN, `${w.id} ${m.kind}`);
      last = now;
    }
  }
});

test('every sideways mover reaches solid ground or the next mover at both ends', () => {
  for (const { w, m } of allMovers(session())) {
    if (m.dx === 0) continue;
    const others = w.movers.filter((o) => o !== m);
    const nearMover = others.some((o) => m.x - (o.x + o.dx + o.w) <= SAFE_GAP && o.x < m.x);
    const farMover = others.some((o) => o.x - (m.x + m.dx + m.w) <= SAFE_GAP && o.x > m.x);
    const near = groundGap(w, m, m.x, -1);
    const far = groundGap(w, m, m.x + m.dx + m.w, 1);
    assert.ok(near <= SAFE_GAP || nearMover, `${w.id} ${m.kind}: ${near}px from the near side`);
    assert.ok(far <= SAFE_GAP || farMover, `${w.id} ${m.kind}: ${far}px from the far side`);
  }
});

test('both boats get right up to the bank, with room to spare', () => {
  const s = session();
  for (const id of ['tanta', 'corniche']) {
    const w = s.worlds.find((x) => x.id === id);
    const boat = w.movers[0];
    assert.ok(groundGap(w, boat, boat.x, -1) <= TILE, `${id} near end`);
    assert.ok(groundGap(w, boat, boat.x + boat.dx + boat.w, 1) <= TILE, `${id} far end`);
  }
});

function boatGame(id) {
  const s = session();
  const g = createGame();
  startRun(s, g);
  const index = s.worlds.findIndex((w) => w.id === id);
  loadLevel(s, g, index);
  const w = worldOf(s, g);
  const boat = w.movers[0];
  return { s, g, w, boat };
}

for (const id of ['tanta', 'corniche']) {
  test(`standing still on the ${id} boat, you ride a full lap without sliding`, () => {
    const { s, g, boat } = boatGame(id);
    const start = moverPos(boat, g.t);
    g.p.x = start.x + 30;
    g.p.y = start.y - g.p.h;
    step(s, g, none);
    const offset = g.p.x - moverPos(boat, g.t).x;
    for (let i = 0; i < boat.period; i++) {
      step(s, g, none);
      const deck = moverPos(boat, g.t);
      assert.equal(g.p.onGround, true, `fell off at tick ${i}`);
      assert.ok(Math.abs(g.p.x - deck.x - offset) < 0.01, `slid at tick ${i}`);
      assert.equal(g.p.y + g.p.h, deck.y);
    }
    assert.equal(g.retries, 0);
  });

  test(`jumping on the ${id} boat lands you back on the deck`, () => {
    const { s, g, boat } = boatGame(id);
    for (let i = 0; i < boat.period / 4; i++) step(s, g, none);
    const start = moverPos(boat, g.t);
    g.p.x = start.x + 40;
    g.p.y = start.y - g.p.h;
    step(s, g, none);
    for (let i = 0; i < 70; i++) step(s, g, { ...none, jump: i < 20 });
    const deck = moverPos(boat, g.t);
    assert.equal(g.retries, 0);
    assert.ok(g.p.x + g.p.w > deck.x && g.p.x < deck.x + boat.w, 'left behind by the boat');
  });

  test(`falling in at ${id} restarts you just before the boat with nothing lost`, () => {
    const { s, g, w, boat } = boatGame(id);
    g.p.x = boat.x - 2 * TILE;
    g.p.y = boat.y - 40;
    for (let i = 0; i < 40; i++) step(s, g, none);
    const cups = g.cupsTaken;
    const score = g.score;
    assert.ok(g.check.x <= boat.x && boat.x - g.check.x <= 5 * TILE, `checkpoint ${boat.x - g.check.x}px back`);
    g.p.x = boat.x + 4 * TILE;
    g.p.y = (w.rows - 3) * TILE;
    g.p.vx = 0;
    for (let i = 0; i < 120; i++) step(s, g, none);
    assert.equal(g.retries, 1);
    assert.equal(g.cupsTaken, cups);
    assert.equal(g.score, score);
    assert.ok(boat.x - g.p.x <= 5 * TILE && g.p.x <= boat.x, `respawned ${boat.x - g.p.x}px back`);
  });
}

test('every pit crossed by a mover has a checkpoint close before it', () => {
  for (const { w, m } of allMovers(session())) {
    if (m.dx === 0) continue;
    const before = w.checkpoints.filter((c) => c.x <= m.x + TILE);
    const nearest = Math.max(w.spawn.x, ...before.map((c) => c.x));
    assert.ok(m.x - nearest <= 20 * TILE, `${w.id} ${m.kind}: ${m.x - nearest}px since the last checkpoint`);
  }
});

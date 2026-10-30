import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, T } from '../src/game/physics.js';
import { createSession, createGame, startRun, step, worldOf } from '../src/game/game.js';

const none = { left: false, right: false, jump: false, action: false };
const right = { ...none, right: true };

function fresh() {
  const s = createSession();
  const g = createGame();
  startRun(s, g);
  return { s, g };
}

test('a new run starts at the first level in play', () => {
  const { g } = fresh();
  assert.equal(g.phase, 'play');
  assert.equal(g.level, 0);
});

test('stepping forward moves the hero and counts time', () => {
  const { s, g } = fresh();
  const x = g.p.x;
  for (let i = 0; i < 60; i++) step(s, g, right);
  assert.ok(g.p.x > x + 40);
  assert.equal(g.runT, 60);
});

test('falling in water costs a retry and puts you back', () => {
  const { s, g } = fresh();
  const w = worldOf(s, g);
  const water = w.tiles.indexOf(T.WATER);
  g.p.x = (water % w.cols) * TILE + 3;
  g.p.y = Math.floor(water / w.cols) * TILE - 16;
  for (let i = 0; i < 80; i++) step(s, g, none);
  assert.ok(g.retries >= 1);
  assert.ok(g.p.y < w.rows * TILE);
});

test('walking past a sign raises its bubble, then it fades', () => {
  const { s, g } = fresh();
  const sign = worldOf(s, g).signs[0];
  g.p.x = sign.x;
  step(s, g, none);
  assert.equal(g.bubble.key, sign.key);
  g.p.x = sign.x + 140;
  for (let i = 0; i < 200; i++) step(s, g, none);
  assert.equal(g.bubble, null);
});

test('state stays plain so the bot can copy it', () => {
  const { s, g } = fresh();
  for (let i = 0; i < 30; i++) step(s, g, right);
  const copy = structuredClone(g);
  step(s, copy, right);
  assert.equal(copy.t, g.t + 1);
});

test('the same inputs always give the same result', () => {
  const a = fresh();
  const b = fresh();
  for (let i = 0; i < 400; i++) {
    const input = { ...right, jump: i % 50 < 20 };
    step(a.s, a.g, input);
    step(b.s, b.g, input);
  }
  assert.deepEqual([a.g.p.x, a.g.p.y], [b.g.p.x, b.g.p.y]);
});

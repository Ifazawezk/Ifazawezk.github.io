import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, createGame, startRun, step, worldOf, loadLevel, skipLevel, FULL_BATTERY } from '../src/game/game.js';
import { BOSS_POINTS, bossSpeed } from '../src/game/boss.js';

const none = { left: false, right: false, jump: false, action: false };

function atBoss() {
  const s = createSession();
  const g = createGame();
  startRun(s, g);
  loadLevel(s, g, s.worlds.length - 1);
  const b = g.boss;
  g.p.x = b.arena0 + 60;
  g.p.y = b.feet - g.p.h;
  for (let i = 0; i < 3; i++) step(s, g, none);
  return { s, g, b };
}

function stompOnce(s, g, b) {
  b.dizzy = 0;
  b.safe = 0;
  g.p.inv = 0;
  g.p.x = b.x + 6;
  g.p.y = b.y - 18;
  g.p.vy = 3;
  const hp = b.hp;
  for (let i = 0; i < 8 && b.hp === hp; i++) step(s, g, none);
}

test('only the last level has The Deadline', () => {
  const s = createSession();
  const g = createGame();
  startRun(s, g);
  s.worlds.forEach((world, index) => {
    loadLevel(s, g, index);
    if (index === s.worlds.length - 1) {
      assert.ok(g.boss, world.id);
      assert.equal(g.boss.hp, 3);
    } else {
      assert.equal(g.boss, null, `${world.id} has a boss in it`);
    }
  });
});

test('it wakes up when you walk in, and shouts about it', () => {
  const { g, b } = atBoss();
  assert.equal(b.awake, true);
  assert.equal(g.bubble.key, 'boss.intro');
});

test('the camera arena is at least a screen wide', () => {
  const { b } = atBoss();
  assert.ok(b.arena1 - b.arena0 >= 320);
});

test('each stomp costs it a life and moves the deadline', () => {
  const { s, g, b } = atBoss();
  stompOnce(s, g, b);
  assert.equal(b.hp, 2);
  assert.equal(g.bubble.key, 'boss.hit1');
  stompOnce(s, g, b);
  assert.equal(b.hp, 1);
  assert.equal(g.bubble.key, 'boss.hit2');
});

test('it speeds up as it gets more desperate', () => {
  const { s, g, b } = atBoss();
  const calm = bossSpeed(b);
  stompOnce(s, g, b);
  assert.ok(bossSpeed(b) > calm);
});

test('three stomps and it leaves for the next sprint', () => {
  const { s, g, b } = atBoss();
  const score = g.score;
  stompOnce(s, g, b);
  stompOnce(s, g, b);
  stompOnce(s, g, b);
  assert.equal(b.defeated, true);
  assert.equal(g.score, score + BOSS_POINTS);
  assert.equal(g.bubble.key, 'boss.hit3');
  for (let i = 0; i < 900 && !b.gone; i++) step(s, g, none);
  assert.equal(b.gone, true);
});

test('you cannot walk out of the level past a live Deadline', () => {
  const { s, g } = atBoss();
  const goal = worldOf(s, g).goal;
  g.p.x = goal.x + 10;
  g.p.y = goal.feet - g.p.h;
  step(s, g, none);
  assert.equal(g.phase, 'play');
});

test('the way out opens once it is beaten', () => {
  const { s, g, b } = atBoss();
  stompOnce(s, g, b);
  stompOnce(s, g, b);
  stompOnce(s, g, b);
  const goal = worldOf(s, g).goal;
  g.p.x = goal.x + 10;
  g.p.y = goal.feet - g.p.h;
  step(s, g, none);
  assert.equal(g.phase, 'clear');
  for (let i = 0; i < 80; i++) step(s, g, none);
  assert.equal(g.phase, 'ending');
});

test('running into it hurts', () => {
  const { s, g, b } = atBoss();
  b.shout = 0;
  g.p.x = b.x;
  g.p.y = b.y + 20;
  g.p.vy = 0;
  step(s, g, none);
  assert.equal(g.battery, FULL_BATTERY - 1);
});

test('it throws calendar invites, and they sting', () => {
  const { s, g, b } = atBoss();
  b.shout = 0;
  b.throwT = 1;
  g.p.x = b.x - 120;
  step(s, g, none);
  assert.equal(g.invites.length, 1);
  const invite = g.invites[0];
  g.p.x = invite.x;
  g.p.y = invite.y - 4;
  g.p.vy = 0;
  step(s, g, none);
  assert.equal(g.battery, FULL_BATTERY - 1);
  assert.equal(g.invites.length, 0);
});

test('dying leaves its damage in place, because this is a CV and not a punishment', () => {
  const { s, g, b } = atBoss();
  stompOnce(s, g, b);
  g.battery = 1;
  g.p.inv = 0;
  b.safe = 0;
  b.dizzy = 0;
  b.shout = 0;
  g.p.x = b.x;
  g.p.y = b.y + 20;
  g.p.vy = 0;
  for (let i = 0; i < 60; i++) step(s, g, none);
  assert.equal(g.retries, 1);
  assert.equal(b.hp, 2);
});

test('skipping a level is possible, and counted', () => {
  const s = createSession();
  const g = createGame();
  startRun(s, g);
  skipLevel(s, g);
  for (let i = 0; i < 300 && g.phase !== 'play'; i++) step(s, g, none);
  assert.equal(g.level, 1);
  assert.equal(g.skips, 1);
});

test('skipping the last level goes straight to the ending', () => {
  const s = createSession();
  const g = createGame();
  startRun(s, g);
  loadLevel(s, g, s.worlds.length - 1);
  skipLevel(s, g);
  for (let i = 0; i < 5; i++) step(s, g, none);
  assert.equal(g.phase, 'ending');
});

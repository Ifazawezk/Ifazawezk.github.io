import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE } from '../src/game/physics.js';
import { createSession, createGame, startRun, step, worldOf, setRepos, loadLevel } from '../src/game/game.js';
import { SOUQ_INDEX } from '../src/game/levels/index.js';
import { MAX_STALLS, MORE_URL, STALL_COLS } from '../src/game/levels/souq.js';
import { parseLevel } from '../src/game/world.js';
import { souqDef } from '../src/game/levels/souq.js';
import { snapshotRepos } from '../tools/bot.mjs';

const repo = (name) => ({ name, description: 'd', url: `https://github.com/Ifazawezk/${name}`, language: 'Go', stars: 1 });
const none = { left: false, right: false, jump: false, action: false };

function inSouq(repos) {
  const s = createSession(repos);
  const g = createGame();
  startRun(s, g);
  loadLevel(s, g, SOUQ_INDEX);
  return { s, g };
}

test('there is one stall per repo plus the way to the rest of GitHub', () => {
  const world = parseLevel(souqDef([repo('a'), repo('b'), repo('c')]));
  assert.equal(world.stalls.length, 4);
  assert.deepEqual(world.stalls.map((st) => st.repo.name), ['a', 'b', 'c', 'more on github']);
  assert.equal(world.stalls[3].repo.url, MORE_URL);
});

test('the souq grows with the repo list', () => {
  const small = parseLevel(souqDef([repo('a')]));
  const big = parseLevel(souqDef(Array.from({ length: 10 }, (_, i) => repo(`r${i}`))));
  assert.equal(big.cols - small.cols, 9 * STALL_COLS);
});

test('a huge repo list is capped so the game stays short', () => {
  const world = parseLevel(souqDef(Array.from({ length: 80 }, (_, i) => repo(`r${i}`))));
  assert.equal(world.stalls.length, MAX_STALLS + 1);
});

test('an empty repo list still gives a playable souq', () => {
  const world = parseLevel(souqDef([]));
  assert.equal(world.stalls.length, 1);
  assert.ok(world.goal);
});

test('there are no bugs in the market', () => {
  assert.equal(parseLevel(souqDef(snapshotRepos())).bugs.length, 0);
});

test('stalls do not overlap each other or the exit', () => {
  const world = parseLevel(souqDef(snapshotRepos()));
  world.stalls.forEach((st, i) => {
    const next = world.stalls[i + 1];
    if (next) assert.ok(st.x + st.w <= next.x);
    assert.ok(st.x + st.w < world.goal.x);
  });
});

test('standing at a stall and pressing action opens that repo, once', () => {
  const { s, g } = inSouq([repo('qanun'), repo('ACAS')]);
  const world = worldOf(s, g);
  const stall = world.stalls[1];
  g.p.x = stall.x + 30;
  g.p.y = stall.feet - g.p.h;
  step(s, g, none);
  assert.equal(g.stall, 1);
  step(s, g, { ...none, action: true });
  const opened = g.events.filter((e) => e.type === 'open-repo');
  assert.equal(opened.length, 1);
  assert.equal(opened[0].url, 'https://github.com/Ifazawezk/ACAS');
  step(s, g, { ...none, action: true });
  assert.equal(g.events.filter((e) => e.type === 'open-repo').length, 0);
});

test('pressing action away from a stall does nothing', () => {
  const { s, g } = inSouq([repo('qanun')]);
  step(s, g, { ...none, action: true });
  assert.equal(g.stall, -1);
  assert.equal(g.events.filter((e) => e.type === 'open-repo').length, 0);
});

test('live repos replace the stock, but never under your feet', () => {
  const s = createSession([repo('old')]);
  const g = createGame();
  startRun(s, g);
  assert.equal(setRepos(s, g, [repo('new'), repo('newer')]), true);
  assert.equal(s.worlds[SOUQ_INDEX].stalls.length, 3);
  loadLevel(s, g, SOUQ_INDEX);
  assert.equal(setRepos(s, g, [repo('third')]), false);
  assert.equal(s.worlds[SOUQ_INDEX].stalls.length, 3);
});

test('total cups counts every level', () => {
  const s = createSession(snapshotRepos());
  assert.equal(s.totalCups, s.worlds.reduce((n, w) => n + w.cups.length, 0));
  assert.ok(s.totalCups > 80, `only ${s.totalCups} cups`);
});

test('the souq floor is flat all the way to the exit', () => {
  const world = parseLevel(souqDef(snapshotRepos()));
  assert.equal(world.goal.feet, 10 * TILE);
});

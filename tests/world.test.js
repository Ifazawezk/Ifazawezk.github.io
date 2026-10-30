import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, T, tileAt } from '../src/game/physics.js';
import { parseLevel, stitch, moverPos } from '../src/game/world.js';
import { LEVEL_DEFS, buildWorlds } from '../src/game/levels/index.js';

const def = {
  id: 'test',
  theme: 'tanta',
  signs: ['a.sign'],
  movers: [{ dx: 32, dy: 0, period: 100, tiles: 2 }],
  legend: { N: { bug: 'nullptr' }, P: { prop: 'palm' }, B: { npc: 'buffalo', say: 'b.say' } },
  rows: [
    '                ',
    ' o  0  M        ',
    ' @  !  N P B  G ',
    '#############~~^',
  ],
};

test('stitch glues chunks side by side and pads short rows', () => {
  assert.deepEqual(stitch([['ab', 'c'], ['d', 'e']]), ['abd', 'c e']);
});

test('stitch refuses chunks of different heights', () => {
  assert.throws(() => stitch([['a'], ['b', 'c']]));
});

test('the parser finds tiles and things', () => {
  const w = parseLevel(def);
  assert.equal(w.cols, 16);
  assert.equal(tileAt(w, 0, 3), T.SOLID);
  assert.equal(tileAt(w, 13, 3), T.WATER);
  assert.equal(tileAt(w, 15, 3), T.SPIKE);
  assert.equal(w.cups.length, 1);
  assert.equal(w.signs[0].key, 'a.sign');
  assert.equal(w.checkpoints.length, 1);
  assert.equal(w.bugs[0].type, 'nullptr');
  assert.equal(w.props[0].kind, 'palm');
  assert.equal(w.npcs[0].key, 'b.say');
  assert.equal(w.movers[0].w, 2 * TILE);
  assert.equal(w.spawn.y + 15, 3 * TILE);
  assert.equal(w.goal.feet, 3 * TILE);
});

test('unknown map letters are caught early', () => {
  assert.throws(() => parseLevel({ ...def, rows: ['Z G', '###'] }), /unknown map letter/);
});

test('a level without a goal is rejected', () => {
  assert.throws(() => parseLevel({ ...def, rows: ['   ', '###'] }), /no goal/);
});

test('movers go out and come back', () => {
  const m = { x: 10, y: 0, dx: 50, dy: 0, period: 100 };
  assert.equal(moverPos(m, 0).x, 10);
  assert.equal(moverPos(m, 50).x, 60);
  assert.equal(moverPos(m, 100).x, 10);
});

test('every level parses and has a start, a goal and something to read', () => {
  const worlds = buildWorlds();
  assert.equal(worlds.length, LEVEL_DEFS.length);
  for (const w of worlds) {
    assert.ok(w.spawn.x >= 0, w.id);
    assert.ok(w.goal, w.id);
    assert.ok(w.signs.length > 0, `${w.id} has no signs`);
  }
});

test('spawn points stand on ground rather than float', () => {
  for (const w of buildWorlds()) {
    const cx = Math.floor((w.spawn.x + 4) / TILE);
    const below = Math.floor((w.spawn.y + 16) / TILE);
    assert.equal(tileAt(w, cx, below), T.SOLID, w.id);
  }
});

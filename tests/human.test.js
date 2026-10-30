import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/game/game.js';
import { TILE } from '../src/game/physics.js';
import { LIMITS, playLikeAPerson } from '../tools/human.mjs';
import { snapshotRepos } from '../tools/bot.mjs';

const session = () => createSession(snapshotRepos());

function find(id) {
  return session().worlds.find((w) => w.id === id);
}

// Column just past the far end of a mover, and the column just before it.
function acrossMover(id, index) {
  const m = find(id).movers[index];
  return {
    level: id,
    fromCol: Math.floor(m.x / TILE),
    toCol: Math.ceil((m.x + m.dx + m.w) / TILE) + 2,
  };
}

function cairoSprings() {
  const w = find('cairo');
  const col = Math.floor(w.tiles.indexOf(7) % w.cols);
  return { level: 'cairo', fromCol: col, toCol: col + 12 };
}

function cairoPad() {
  const w = find('cairo');
  let col = 0;
  for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i] === 10) col = Math.max(col, i % w.cols);
  return { level: 'cairo', fromCol: col - 10, toCol: col + 9 };
}

function heartsBlink() {
  const w = find('hearts');
  const cols = [];
  for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i] === 8 || w.tiles[i] === 9) cols.push(i % w.cols);
  return { level: 'hearts', fromCol: Math.min(...cols), toCol: Math.max(...cols) + 4 };
}

const SECTIONS = {
  'the Tanta felucca': { ...acrossMover('tanta', 0), allowed: 1 },
  'the Corniche dhow': { ...acrossMover('corniche', 0), allowed: 1 },
  'the ALX ferry': { ...acrossMover('alx', 1), allowed: 1 },
  'the Power BI bars': { ...acrossMover('cairo', 0), level: 'cairo', fromCol: Math.floor(find('cairo').movers[0].x / TILE), toCol: Math.floor(find('cairo').movers[3].x / TILE) + 6, allowed: 1 },
  'the Cairo springs': { ...cairoSprings(), allowed: 0 },
  'the dashboard pad jump': { ...cairoPad(), allowed: 1 },
  'the blink platforms': { ...heartsBlink(), allowed: 1 },
  'the server crates': { ...acrossMover('hearts', 0), toCol: Math.ceil((find('hearts').movers[1].x + 64 + 48) / TILE) + 3, allowed: 1 },
};

test('the human model really has human limits', () => {
  assert.ok(LIMITS.reactionMin >= 15, 'reaction must be at least 250 ms');
  assert.ok(LIMITS.jitter >= 3, 'presses must not be frame-perfect');
  assert.ok(LIMITS.minPress >= 5, 'no one-frame button taps');
});

for (const [name, section] of Object.entries(SECTIONS)) {
  test(`a person gets across ${name}`, { timeout: 120000 }, () => {
    for (let seed = 1; seed <= 8; seed++) {
      const res = playLikeAPerson(session(), { seed, section, maxTicks: 60 * 90 });
      assert.ok(res.finished, `seed ${seed} never got across`);
      assert.ok(
        res.g.retries <= section.allowed,
        `seed ${seed} needed ${res.g.retries} retries: ${JSON.stringify(res.deaths)}`,
      );
      assert.equal(res.risky.length, 0, `seed ${seed} had no safe move: ${JSON.stringify(res.risky)}`);
    }
  });
}

test('a person can finish the whole game, more than once', { timeout: 200000 }, () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const res = playLikeAPerson(session(), { seed });
    assert.ok(res.finished, `seed ${seed} stuck: ${JSON.stringify(res.stuck)}`);
    assert.equal(res.g.phase, 'ending');
    assert.ok(res.g.retries <= 6, `seed ${seed}: ${res.g.retries} retries ${JSON.stringify(res.deaths)}`);
  }
});

test('the whole game fits the promise of a few minutes', { timeout: 60000 }, () => {
  const res = playLikeAPerson(session(), { seed: 7 });
  const minutes = res.g.runT / 3600;
  assert.ok(res.finished);
  assert.ok(minutes >= 2.5 && minutes <= 7, `${minutes.toFixed(1)} minutes`);
});

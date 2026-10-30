import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, createGame, startRun, step } from '../src/game/game.js';
import { playGame, snapshotRepos } from '../tools/bot.mjs';

test('the bot plays every level through the real game and reaches the ending', { timeout: 280000 }, () => {
  const session = createSession(snapshotRepos());
  const result = playGame(session);
  for (const level of result.levels) assert.ok(level.finished, `${level.id} was not finished`);
  assert.equal(result.finished, true);
  assert.equal(result.g.phase, 'ending');
  assert.equal(result.g.retries, 0, 'the bot route should not need a retry');
});

test('replaying the same buttons on a fresh game gives the same ending', { timeout: 280000 }, () => {
  const first = playGame(createSession(snapshotRepos()));
  const session = createSession(snapshotRepos());
  const g = createGame();
  startRun(session, g);
  for (const b of first.tape) {
    step(session, g, { left: !!(b & 1), right: !!(b & 2), jump: !!(b & 4), action: !!(b & 8) });
  }
  assert.equal(g.phase, 'ending');
  assert.equal(g.score, first.g.score);
  assert.equal(g.runT, first.g.runT);
});

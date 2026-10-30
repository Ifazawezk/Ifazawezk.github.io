import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS } from '../src/content/strings.js';
import { createSession } from '../src/game/game.js';
import { T, TILE, PHYS } from '../src/game/physics.js';
import { moverPos } from '../src/game/world.js';
import { snapshotRepos } from '../tools/bot.mjs';
import { playLikeAPerson } from '../tools/human.mjs';

const worlds = createSession(snapshotRepos()).worlds;
const home = worlds.find((w) => w.id === 'home');
const homecoming = worlds.find((w) => w.id === 'homecoming');
const allWords = (lang) => Object.values(STRINGS[lang]).join('\n');

test('every place from the list stands in the opening, in the game art', () => {
  const props = home.props.map((p) => p.kind);
  for (const place of ['souqWaqif', 'mia', 'westBay', 'pearl', 'katara', 'torch', 'karakStand', 'metro', 'windTower', 'duneBack']) {
    assert.ok(props.includes(place), place);
  }
  assert.ok(home.movers.some((m) => m.kind === 'metro'), 'the metro should really run');
  assert.ok(home.sand.from < home.sand.to, 'the desert should be sand underfoot');
});

test('each place has words in both languages', () => {
  const keys = ['souq', 'mia', 'westbay', 'pearl', 'katara', 'torch', 'karak', 'metro', 'wind', 'dunes', 'worldcup', 'ac'];
  const signs = home.signs.map((s) => s.key);
  for (const key of keys) {
    assert.ok(signs.includes(`home.${key}`), `no sign for ${key}`);
    assert.match(STRINGS.ar[`home.${key}`], /[؀-ۿ]/, key);
  }
});

test('the three schools come in order, with the growth spurt at the second', () => {
  const school = (id) => home.props.find((p) => p.kind === id).x;
  assert.ok(school('schoolA') < school('schoolB'));
  assert.ok(school('schoolB') < school('schoolC'));
  const spurt = home.grows[0].x;
  assert.ok(spurt > school('schoolB') && spurt < school('schoolC'));
});

test('the jokes a local would get are all here', () => {
  const en = allWords('en');
  for (const phrase of ['August', 'Honk twice', '3 am', 'Wind tower', '2022', 'World Cup', 'standing market']) {
    assert.ok(en.includes(phrase), phrase);
  }
  const ar = allWords('ar');
  for (const phrase of ['أغسطس', 'كلّكس', 'البرجيل', 'كأس العالم', 'السوق الواقف']) {
    assert.ok(ar.includes(phrase), phrase);
  }
});

test('he leaves in the World Cup year, as he really did', () => {
  assert.match(STRINGS.en['home.worldcup'], /2022/);
  assert.match(STRINGS.ar['home.worldcup'], /2022/);
  const words = home.signs.map((s) => s.key);
  assert.ok(words.indexOf('home.worldcup') < words.indexOf('home.leave'));
});

test('no official tournament branding, in words or in the code that draws', () => {
  const art = readFileSync('src/art/qatar.js', 'utf8');
  for (const text of [allWords('en'), allWords('ar'), art]) {
    assert.doesNotMatch(text, /FIFA|فيفا|La'eeb|لعيب|Al Rihla/i);
  }
});

test('the opening still cannot kill you', () => {
  assert.equal(home.tiles.includes(T.SPIKE), false);
  assert.equal(home.tiles.includes(T.WATER), false);
  for (let col = 0; col < home.cols; col++) {
    assert.equal(home.tiles[(home.rows - 1) * home.cols + col], T.SOLID, `hole at column ${col}`);
  }
});

test('the metro is a gentle first moving platform, and you can walk underneath it', () => {
  const train = home.movers.find((m) => m.kind === 'metro');
  assert.ok(train.hold >= 60, 'it should wait at the platform');
  const floor = 10 * TILE;
  assert.ok(floor - train.y <= PHYS.JUMP_V ** 2 / (2 * PHYS.GRAVITY), 'the roof should be one jump up');
  assert.ok(floor - train.y >= 15, 'he should fit underneath');
  let last = moverPos(train, 0).x;
  for (let t = 1; t < train.period; t++) {
    const x = moverPos(train, t).x;
    assert.ok(Math.abs(x - last) < PHYS.MAX_RUN);
    last = x;
  }
});

test('a real person gets through the opening in one to two minutes, and never dies', { timeout: 60000 }, () => {
  for (const seed of [1, 2, 3, 4]) {
    const res = playLikeAPerson(createSession(snapshotRepos()), {
      seed,
      section: { level: 'home', fromCol: 0, toCol: home.cols + 10 },
      maxTicks: 60 * 180,
    });
    const seconds = res.g.runT / 60;
    assert.ok(res.finished, `seed ${seed} stuck`);
    assert.equal(res.g.retries, 0);
    assert.ok(seconds >= 45 && seconds <= 120, `seed ${seed} took ${seconds.toFixed(0)}s`);
  }
});

test('the finale comes back to the same street: stand, keeper, cat, door', () => {
  const stand = (w) => w.props.some((p) => p.kind === 'karakStand');
  assert.ok(stand(home) && stand(homecoming));
  for (const w of [home, homecoming]) {
    assert.ok(w.npcs.some((n) => n.kind === 'keeper'), `${w.id} keeper`);
    assert.ok(w.npcs.some((n) => n.kind === 'cat'), `${w.id} cat`);
  }
  assert.ok(home.props.some((p) => p.kind === 'villa'));
  assert.equal(homecoming.goalKind, 'villaLit');
  assert.equal(homecoming.theme, 'dohanight');
});

test('the keeper remembers: the promise in the opening pays off at the end', () => {
  assert.match(STRINGS.en['home.keeper'], /reach it/);
  assert.match(STRINGS.en['return.keeper'], /reach the counter/);
  assert.match(STRINGS.ar['home.keeper'], /كاونتر/);
  assert.match(STRINGS.ar['return.keeper'], /كاونتر/);
});

test('the last stage is a walk: nothing to fight, no way to fall', () => {
  assert.equal(homecoming.bugs.length, 0);
  assert.equal(homecoming.bossSpawn, null);
  assert.equal(homecoming.tiles.includes(T.SPIKE), false);
  assert.equal(homecoming.tiles.includes(T.WATER), false);
});

test('the finale passes the same landmarks after dark', () => {
  const corniche = worlds.find((w) => w.id === 'corniche').props.map((p) => p.kind);
  for (const place of ['westBay:night', 'mia:night', 'pearl:night']) assert.ok(corniche.includes(place), place);
});

test('the ending stands at his own door', () => {
  assert.match(readFileSync('src/render.js', 'utf8'), /getPiece\('villaLit'\)/);
});

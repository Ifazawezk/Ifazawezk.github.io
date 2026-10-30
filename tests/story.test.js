import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, LAST_STAGE } from '../src/art/faza.js';
import { newPlayer } from '../src/game/player.js';
import { STRINGS } from '../src/content/strings.js';
import { createSession, createGame, startRun, step, loadLevel, GROW_TICKS } from '../src/game/game.js';
import { TILE } from '../src/game/physics.js';
import { snapshotRepos } from '../tools/bot.mjs';

const none = { left: false, right: false, jump: false, action: false };
const FRAMES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'hurt', 'cheer', 'sip0', 'sip1'];

function run() {
  const s = createSession(snapshotRepos());
  const g = createGame();
  startRun(s, g);
  return { s, g };
}

test('there are six ages, in order', () => {
  assert.deepEqual(STAGES.map((st) => st.id), ['kid', 'teen', 'student', 'pro', 'dev', 'grown']);
  assert.equal(LAST_STAGE, 5);
});

test('every age has every frame, and no frame is crooked', () => {
  for (const stage of STAGES) {
    for (const name of FRAMES) {
      const rows = stage.frames[name];
      assert.ok(rows?.length, `${stage.id} ${name}`);
      const width = rows[0].length;
      for (const row of rows) assert.equal(row.length, width, `${stage.id} ${name}: ${row}`);
    }
  }
});

test('all the frames of one age are the same height, so he does not jitter', () => {
  for (const stage of STAGES) {
    const heights = new Set(['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'cheer'].map((n) => stage.frames[n].length));
    assert.equal(heights.size, 1, `${stage.id}: ${[...heights]}`);
  }
});

test('he really does get taller', () => {
  const height = (i) => STAGES[i].frames.idle0.length;
  assert.ok(height(0) < height(1));
  assert.ok(height(2) < height(3));
  assert.ok(height(0) < height(LAST_STAGE));
  assert.ok(height(1) <= height(LAST_STAGE));
});

test('the hair is the family resemblance: every age has it', () => {
  for (const stage of STAGES) {
    assert.ok(stage.frames.idle0.slice(0, 5).join('').includes('h'), stage.id);
  }
});

test('growing up never changes the collision box', () => {
  const { s, g } = run();
  const { w, h } = newPlayer(0, 0);
  for (let i = 0; i < s.worlds.length; i++) {
    loadLevel(s, g, i);
    assert.equal(g.p.w, w);
    assert.equal(g.p.h, h);
  }
  assert.equal(w, 10);
  assert.equal(h, 15);
});

test('each level has the right age', () => {
  const { s } = run();
  const ages = Object.fromEntries(s.worlds.map((w) => [w.id, STAGES[w.stage].id]));
  assert.deepEqual(ages, {
    home: 'kid', tanta: 'student', alx: 'student', cairo: 'pro', hearts: 'dev', dunes: 'grown', souq: 'grown', corniche: 'grown', homecoming: 'grown',
  });
});

test('the story starts in Doha, goes to Egypt, and ends back in Doha', () => {
  const { s } = run();
  const order = s.worlds.map((w) => w.id);
  assert.equal(order[0], 'home');
  assert.equal(order[1], 'tanta');
  assert.equal(order.at(-2), 'corniche');
  assert.equal(order.at(-1), 'homecoming');
});

test('walking past the school gate turns the kid into a teenager, without stopping', () => {
  const { s, g } = run();
  assert.equal(g.stage, 0);
  const spot = s.worlds[0].grows[0];
  g.p.x = spot.x + 1;
  step(s, g, none);
  assert.equal(g.stage, 1);
  assert.equal(g.phase, 'play');
  assert.ok(g.events.some((e) => e.type === 'grow-here' && e.to === 1));
});

function finishLevel(s, g) {
  const goal = s.worlds[g.level].goal;
  g.p.x = goal.x + 10;
  g.p.y = goal.feet - g.p.h;
  step(s, g, none);
  assert.equal(g.phase, 'clear');
  for (let i = 0; i < 70 && g.phase === 'clear'; i++) step(s, g, none);
}

test('leaving Doha plays the 2022 moment before Tanta', () => {
  const { s, g } = run();
  g.stage = 1;
  finishLevel(s, g);
  assert.equal(g.phase, 'grow');
  assert.equal(g.growFrom, 1);
  assert.equal(g.growTo, 2);
  for (let i = 0; i <= GROW_TICKS; i++) step(s, g, none);
  assert.equal(g.phase, 'play');
  assert.equal(s.worlds[g.level].id, 'tanta');
  assert.equal(g.stage, 2);
});

test('moving between levels of the same age skips the flash', () => {
  const { s, g } = run();
  loadLevel(s, g, 1);
  finishLevel(s, g);
  assert.equal(g.phase, 'play');
  assert.equal(s.worlds[g.level].id, 'alx');
});

test('the growth moment is short and a jump can skip it', () => {
  assert.ok(GROW_TICKS <= 150, 'over two and a half seconds is a cut-scene, not a joke');
  const { s, g } = run();
  g.stage = 1;
  finishLevel(s, g);
  for (let i = 0; i < 45; i++) step(s, g, none);
  step(s, g, { ...none, jump: true });
  assert.equal(g.phase, 'play');
});

test('every change of age has a joke in both languages', () => {
  const { s } = run();
  const ages = new Set(s.worlds.map((w) => w.stage));
  s.worlds.forEach((w) => w.grows.forEach((spot) => ages.add(spot.stage)));
  ages.delete(0);
  for (const age of ages) {
    for (const lang of ['en', 'ar']) {
      assert.ok(STRINGS[lang][`grow.${age}`], `${lang} grow.${age}`);
      assert.ok(STRINGS[lang][`grow.${age}.sub`], `${lang} grow.${age}.sub`);
    }
  }
});

test('the opening level names all three schools, in order, in both languages', () => {
  const { s } = run();
  const signs = s.worlds[0].signs.map((sign) => sign.key);
  const order = (lang, names) => {
    const text = signs.map((key) => STRINGS[lang][key]).join(' | ');
    const spots = names.map((n) => text.indexOf(n));
    assert.ok(spots.every((i) => i >= 0), `${lang}: ${spots}`);
    assert.deepEqual([...spots].sort((a, b) => a - b), spots);
  };
  order('en', ['Al Rashad', 'Ibn Khaldoun', 'Ali Bin Jassim']);
  order('ar', ['مدرسة الرشاد', 'مدرسة ابن خلدون', 'مدرسة علي بن جاسم']);
});

test('no school sign carries a date', () => {
  for (const lang of ['en', 'ar']) {
    for (const key of ['home.rashad', 'home.khaldoun', 'home.jassim']) {
      assert.doesNotMatch(STRINGS[lang][key], /\d{4}/, `${lang} ${key}`);
    }
  }
});

test('the opening level cannot kill you', () => {
  const { s } = run();
  const w = s.worlds[0];
  assert.equal(w.tiles.includes(3), false, 'spikes');
  assert.equal(w.tiles.includes(4), false, 'water');
  for (let col = 0; col < w.cols; col++) {
    assert.ok(w.tiles[(w.rows - 1) * w.cols + col] === 1, `hole at column ${col}`);
  }
});

test('the ending says he came home', () => {
  assert.match(STRINGS.en['end.home'], /[Bb]ack home/);
  assert.match(STRINGS.ar['end.home'], /رجعت البيت/);
  assert.match(STRINGS.en['dunes.hello'], /came back/);
  assert.ok(TILE > 0);
});

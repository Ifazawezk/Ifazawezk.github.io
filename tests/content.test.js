import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, LINKS, say } from '../src/content/strings.js';
import { pickJoke, formatTime } from '../src/content/ending.js';
import { buildWorlds } from '../src/game/levels/index.js';
import { BUG_TYPES } from '../src/game/bugs.js';

const allText = (lang) => Object.values(STRINGS[lang]).join('\n');

test('every line exists in both languages', () => {
  const en = Object.keys(STRINGS.en).sort();
  const ar = Object.keys(STRINGS.ar).sort();
  assert.deepEqual(ar, en);
});

test('no line is empty', () => {
  for (const lang of ['en', 'ar']) {
    for (const [key, value] of Object.entries(STRINGS[lang])) assert.ok(value.length > 0, `${lang} ${key}`);
  }
});

test('Arabic lines are actually in Arabic, apart from a few names', () => {
  const sameOnPurpose = new Set([
    'dir', 'ui.lang', 'ui.langLabel', 'bug.ref', 'bug.segfault', 'end.linkedin', 'end.github', 'level.hearts',
  ]);
  for (const [key, value] of Object.entries(STRINGS.ar)) {
    if (sameOnPurpose.has(key)) continue;
    assert.match(value, /[؀-ۿ]/, key);
  }
});

test('every sign and speaker in every level has words', () => {
  for (const w of buildWorlds()) {
    for (const item of [...w.signs, ...w.npcs]) {
      assert.ok(STRINGS.en[item.key], `${w.id}: ${item.key}`);
      assert.ok(STRINGS.ar[item.key], `${w.id}: ${item.key}`);
    }
    assert.ok(STRINGS.en[`level.${w.id}`], w.id);
    assert.ok(STRINGS.en[`level.${w.id}.sub`], w.id);
  }
});

test('every bug has a name', () => {
  for (const type of Object.keys(BUG_TYPES)) assert.ok(STRINGS.en[`bug.${type}`], type);
});

test('his name is spelled the way he spells it', () => {
  assert.match(allText('en'), /Mohanned Elhagar/);
  assert.match(allText('ar'), /مهند الحجر/);
});

test('the real numbers are all still here, in both languages', () => {
  const facts = ['35%', '10,000', '88%', '30%', '20%', '50,000'];
  for (const fact of facts) {
    assert.ok(allText('en').includes(fact), `en ${fact}`);
    assert.ok(allText('ar').includes(fact), `ar ${fact}`);
  }
  assert.ok(allText('en').includes('100k+'));
  assert.ok(allText('ar').includes('100 ألف'));
  assert.ok(allText('en').includes('two thirds'));
  assert.ok(allText('ar').includes('التلتين'));
});

test('the only ways to reach him are LinkedIn and GitHub', () => {
  assert.deepEqual(Object.keys(LINKS).sort(), ['github', 'linkedin']);
  for (const lang of ['en', 'ar']) {
    assert.doesNotMatch(allText(lang), /@[a-z0-9.-]+\.[a-z]{2,}/i);
    assert.doesNotMatch(allText(lang), /\+?\d{3}[\s-]?\d{3,4}[\s-]?\d{3,4}/);
  }
});

test('say falls back to English, then to the key', () => {
  assert.equal(say('xx', 'ui.title'), STRINGS.en['ui.title']);
  assert.equal(say('en', 'no.such.key'), 'no.such.key');
});

test('the ending joke depends on how you played', () => {
  const base = { cups: 40, totalCups: 100, retries: 3, skips: 0 };
  assert.equal(pickJoke({ ...base, skips: 1 }), 'end.jokeSkips');
  assert.equal(pickJoke({ ...base, cups: 100 }), 'end.jokeAllCups');
  assert.equal(pickJoke({ ...base, retries: 0 }), 'end.jokeClean');
  assert.equal(pickJoke({ ...base, retries: 9 }), 'end.jokeRetries');
  assert.equal(pickJoke({ ...base, cups: 70 }), 'end.jokeManyCups');
  assert.equal(pickJoke(base), 'end.jokeFewCups');
});

test('every joke the picker can return exists', () => {
  for (const key of ['Skips', 'AllCups', 'Clean', 'Retries', 'ManyCups', 'FewCups']) {
    assert.ok(STRINGS.en[`end.joke${key}`]);
    assert.ok(STRINGS.ar[`end.joke${key}`]);
  }
});

test('times read like a stopwatch', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(60 * 65), '1:05');
  assert.equal(formatTime(60 * 245), '4:05');
});

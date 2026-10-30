import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from '../src/store.js';

function memory() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
}

test('values round trip', () => {
  const store = makeStore(memory());
  store.set('best', 1230);
  assert.equal(store.get('best'), 1230);
});

test('missing keys give the fallback', () => {
  assert.equal(makeStore(memory()).get('nope', 7), 7);
});

test('a browser with no storage at all still works', () => {
  const store = makeStore(null);
  assert.equal(store.set('best', 1), false);
  assert.equal(store.get('best', 0), 0);
});

test('storage that throws is survived', () => {
  const store = makeStore({
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('full'); },
  });
  assert.equal(store.set('best', 1), false);
  assert.equal(store.get('best', 3), 3);
});

test('corrupt saved data gives the fallback', () => {
  const area = memory();
  area.setItem('faza.best', '{not json');
  assert.equal(makeStore(area).get('best', 9), 9);
});

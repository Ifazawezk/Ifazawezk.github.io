import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tidyRepos, loadRepos, API_URL, SNAPSHOT_URL, CACHE_MS, FEATURED } from '../src/repos.js';
import { makeStore } from '../src/store.js';

const raw = (name, extra = {}) => ({
  name, description: `${name} desc`, html_url: `https://github.com/Ifazawezk/${name}`,
  language: 'Python', stargazers_count: 0, fork: false, pushed_at: '2026-01-01T00:00:00Z', ...extra,
});

function memory() {
  const data = new Map();
  return makeStore({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) });
}

const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

test('forks and the excluded repos stay out of the market', () => {
  const names = tidyRepos([
    raw('qanun'), raw('forked', { fork: true }), raw('Ifazawezk'),
    raw('Ifazawezk.github.io'), raw('Mohaned-elhagar'), raw('ifazawezk'),
  ]).map((r) => r.name);
  assert.deepEqual(names, ['qanun']);
});

test('featured repos come first and in the given order', () => {
  const names = tidyRepos([
    raw('zebra', { stargazers_count: 50 }), raw('ds_salary_proj'), raw('ACAS'), raw('qanun'),
  ]).map((r) => r.name);
  assert.deepEqual(names, ['qanun', 'ACAS', 'ds_salary_proj', 'zebra']);
});

test('the rest are sorted by stars', () => {
  const names = tidyRepos([raw('low'), raw('high', { stargazers_count: 9 })]).map((r) => r.name);
  assert.deepEqual(names, ['high', 'low']);
});

test('tidying survives junk', () => {
  assert.deepEqual(tidyRepos(null), []);
  assert.deepEqual(tidyRepos({ message: 'API rate limit exceeded' }), []);
  assert.deepEqual(tidyRepos([null, {}]), []);
});

test('tidying its own output changes nothing', () => {
  const once = tidyRepos([raw('qanun'), raw('other', { stargazers_count: 3 })]);
  assert.deepEqual(tidyRepos(once), once);
});

test('a good API reply is used and cached', async () => {
  const store = memory();
  let calls = 0;
  const fetchFn = async () => { calls++; return reply([raw('qanun')]); };
  const first = await loadRepos({ fetchFn, store, now: () => 1000 });
  assert.equal(first.source, 'live');
  const second = await loadRepos({ fetchFn, store, now: () => 2000 });
  assert.equal(second.source, 'cache');
  assert.equal(calls, 1);
});

test('the cache expires after an hour', async () => {
  const store = memory();
  const seen = [];
  const fetchFn = async (url) => { seen.push(url); return reply([raw('qanun')]); };
  await loadRepos({ fetchFn, store, now: () => 0 });
  const later = await loadRepos({ fetchFn, store, now: () => CACHE_MS + 1 });
  assert.equal(later.source, 'live');
  assert.equal(seen.length, 2);
});

test('a rate limit falls back to the snapshot', async () => {
  const seen = [];
  const fetchFn = async (url) => {
    seen.push(url);
    return url === API_URL ? reply({ message: 'rate limited' }, false, 403) : reply([raw('qanun')]);
  };
  const res = await loadRepos({ fetchFn, store: memory() });
  assert.equal(res.source, 'snapshot');
  assert.deepEqual(seen, [API_URL, SNAPSHOT_URL]);
  assert.equal(res.repos[0].name, 'qanun');
});

test('being offline falls back to the snapshot', async () => {
  const fetchFn = async (url) => {
    if (url === API_URL) throw new TypeError('failed to fetch');
    return reply([raw('ACAS')]);
  };
  assert.equal((await loadRepos({ fetchFn, store: memory() })).source, 'snapshot');
});

test('if everything fails the souq is empty rather than broken', async () => {
  const fetchFn = async () => { throw new Error('nope'); };
  const res = await loadRepos({ fetchFn, store: memory() });
  assert.deepEqual(res, { repos: [], source: 'none' });
});

test('the snapshot on disk is clean, real and has no excluded repos', () => {
  const snapshot = JSON.parse(readFileSync('data/repos.json', 'utf8'));
  const tidy = tidyRepos(snapshot);
  assert.ok(tidy.length >= 5);
  assert.equal(tidy.length, snapshot.length);
  for (const repo of tidy) {
    assert.match(repo.url, /^https:\/\/github\.com\/Ifazawezk\//);
    assert.ok(repo.description, repo.name);
  }
  assert.equal(tidy[0].name, FEATURED[0]);
});

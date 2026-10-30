// Stock for the souq. Live from GitHub when possible, from a saved hour-old copy
// when not, and from the snapshot in data/ when GitHub says no.

export const API_URL = 'https://api.github.com/users/Ifazawezk/repos?per_page=100';
export const SNAPSHOT_URL = 'data/repos.json';
export const CACHE_KEY = 'repos';
export const CACHE_MS = 60 * 60 * 1000;

const EXCLUDED = new Set(['ifazawezk', 'ifazawezk.github.io', 'mohaned-elhagar']);

export const FEATURED = [
  'qanun', 'dukkan', 'ACAS', 'qar-budget', 'sql-retail-analytics', 'qatar-open-data-pipeline',
  'arabic-subtitles', 'living-in-qatar', 'arabic-pdf', 'rtl-skill', 'ds_salary_proj',
];

function rank(name) {
  const i = FEATURED.findIndex((f) => f.toLowerCase() === name.toLowerCase());
  return i === -1 ? FEATURED.length : i;
}

// Works on raw API rows and on our own trimmed rows alike.
export function tidyRepos(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && typeof r.name === 'string' && !r.fork && !r.archived && !EXCLUDED.has(r.name.toLowerCase()))
    .map((r) => ({
      name: r.name,
      description: r.description || null,
      url: r.html_url ?? r.url ?? `https://github.com/Ifazawezk/${r.name}`,
      language: r.language ?? null,
      stars: r.stargazers_count ?? r.stars ?? 0,
      pushed: r.pushed_at ?? r.pushed ?? '',
    }))
    .sort((a, b) => rank(a.name) - rank(b.name)
      || b.stars - a.stars
      || String(b.pushed).localeCompare(String(a.pushed))
      || a.name.localeCompare(b.name));
}

async function fetchJson(fetchFn, url, timeoutMs) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: stop.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Returns { repos, source } and never throws: the souq opens no matter what.
export async function loadRepos({ fetchFn = globalThis.fetch, store, now = Date.now, timeoutMs = 4000 } = {}) {
  const cached = store?.get(CACHE_KEY, null);
  if (cached && now() - cached.at < CACHE_MS && Array.isArray(cached.repos) && cached.repos.length) {
    return { repos: cached.repos, source: 'cache' };
  }
  try {
    const repos = tidyRepos(await fetchJson(fetchFn, API_URL, timeoutMs));
    if (repos.length) {
      store?.set(CACHE_KEY, { at: now(), repos });
      return { repos, source: 'live' };
    }
  } catch {
    // Rate limited, offline or blocked. That is what the snapshot is for.
  }
  try {
    const repos = tidyRepos(await fetchJson(fetchFn, SNAPSHOT_URL, timeoutMs));
    return { repos, source: 'snapshot' };
  } catch {
    return { repos: [], source: 'none' };
  }
}

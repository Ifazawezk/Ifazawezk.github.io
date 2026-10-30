import { TILE } from '../physics.js';

export const STALL_COLS = 6;
export const MAX_STALLS = 18;
const LEAD_IN = 9;
const LEAD_OUT = 12;
const ROWS = 12;
const FLOOR = 10;

export const MORE_URL = 'https://github.com/Ifazawezk?tab=repositories';

// The souq is drawn from whatever repos exist today, so it has no fixed map.
// Every stall is a safe spot: no bugs in the market, by order of the keeper.
export function souqDef(repos) {
  const list = repos.slice(0, MAX_STALLS).map((repo) => ({ ...repo }));
  list.push({ name: 'more on github', description: null, url: MORE_URL, more: true, stars: 0, language: null });

  const cols = LEAD_IN + list.length * STALL_COLS + LEAD_OUT;
  const rows = Array.from({ length: ROWS }, (_, y) => (y >= FLOOR ? '#' : ' ').repeat(cols).split(''));

  const put = (x, y, c) => { rows[y][x] = c; };
  put(2, FLOOR - 1, '@');
  put(5, FLOOR - 1, '0');

  const stalls = list.map((repo, index) => {
    const col = LEAD_IN + index * STALL_COLS;
    // Every other awning has a plank on it and something worth climbing for.
    if (index % 2 === 0) {
      for (let x = 1; x < STALL_COLS - 1; x++) put(col + x, 4, '=');
      put(col + 2, 2, 'o');
      put(col + 3, 2, 'o');
    }
    if (index % 2 === 1) {
      put(col + 1, 7, 'o');
      put(col + 4, 7, 'o');
    }
    return { x: col * TILE, w: STALL_COLS * TILE, feet: FLOOR * TILE, repo, index };
  });

  const end = LEAD_IN + list.length * STALL_COLS;
  put(end + 2, FLOOR - 1, 'K');
  put(end + 5, FLOOR - 1, 'F');
  put(end + 9, FLOOR - 1, 'G');

  return {
    id: 'souq',
    theme: 'souq',
    goalKind: 'promenade',
    signs: ['souq.hello'],
    stalls,
    legend: {
      K: { npc: 'keeper', say: 'souq.keeper' },
      F: { npc: 'falcon', say: 'souq.falcon' },
    },
    rows: rows.map((r) => r.join('')),
  };
}

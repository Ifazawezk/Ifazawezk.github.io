import { T, TILE } from './physics.js';

// Levels are drawn as rows of text. Chunks of rows are glued side by side so a
// level can be edited one screen at a time.
//
//   #  ground       =  one-way ledge    ^  spikes       ~  water
//   {  belt left    }  belt right       *  bouncer      %  speed pad
//   a  blink A      b  blink B
//   o  karak cup    @  start            !  checkpoint   G  goal
//   M  moving platform (next entry in def.movers)
//   0-9  signpost (index into def.signs)
//   anything else is looked up in def.legend

const TILE_OF = {
  '#': T.SOLID, '=': T.ONEWAY, '^': T.SPIKE, '~': T.WATER,
  '{': T.BELT_L, '}': T.BELT_R, '*': T.BOUNCE, '%': T.SPEED,
  a: T.BLINK_A, b: T.BLINK_B,
};

export function stitch(chunks) {
  const height = chunks[0].length;
  const rows = Array.from({ length: height }, () => '');
  chunks.forEach((chunk, n) => {
    if (chunk.length !== height) throw new Error(`chunk ${n} has ${chunk.length} rows, wanted ${height}`);
    const width = Math.max(...chunk.map((r) => r.length));
    chunk.forEach((row, y) => { rows[y] += row.padEnd(width, ' '); });
  });
  return rows;
}

// Out, pause, back, pause. `hold` is how long it waits at each end, in ticks.
export function moverPos(m, t) {
  const hold = m.hold ?? 0;
  const travel = m.period / 2 - hold;
  const u = (t + (m.phase || 0)) % m.period;
  let k;
  if (u < hold) k = 0;
  else if (u < hold + travel) k = (u - hold) / travel;
  else if (u < hold * 2 + travel) k = 1;
  else k = 1 - (u - hold * 2 - travel) / travel;
  const e = k * k * (3 - 2 * k);
  return { x: m.x + m.dx * e, y: m.y + m.dy * e };
}

export function parseLevel(def) {
  const rows = def.rows ?? stitch(def.chunks);
  const cols = Math.max(...rows.map((r) => r.length));
  const world = {
    id: def.id,
    theme: def.theme,
    goalKind: def.goalKind ?? null,
    cols,
    rows: rows.length,
    tiles: new Uint8Array(cols * rows.length),
    spawn: { x: 16, y: 16 },
    goal: null,
    cups: [],
    bugs: [],
    npcs: [],
    props: [],
    signs: [],
    checkpoints: [],
    movers: [],
    stalls: def.stalls ?? [],
    bossSpawn: null,
    night: !!def.night,
  };

  const moverDefs = def.movers ?? [];
  const seen = { mover: 0 };

  // Scan left to right so numbered things come out in reading order.
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows.length; y++) {
      const c = rows[y][x] ?? ' ';
      if (c === ' ' || c === '.') continue;
      const px = x * TILE;
      const py = y * TILE;
      const feet = py + TILE;
      if (c in TILE_OF) {
        world.tiles[y * cols + x] = TILE_OF[c];
      } else if (c === 'o') {
        world.cups.push({ x: px + 3, y: py + 3 });
      } else if (c === '@') {
        world.spawn = { x: px + 3, y: feet - 15 };
      } else if (c === '!') {
        world.checkpoints.push({ x: px + 3, y: feet - 15, drawX: px, feet });
      } else if (c === 'G') {
        world.goal = { x: px, y: feet - 48, w: 24, h: 48, feet };
      } else if (c === 'M') {
        const m = moverDefs[seen.mover++];
        if (!m) throw new Error(`${def.id}: more M in the map than entries in movers`);
        world.movers.push({ ...m, x: px, y: py + (m.sink ?? 0), h: 8, w: (m.tiles ?? 3) * TILE });
      } else if (c >= '0' && c <= '9') {
        const key = def.signs?.[Number(c)];
        if (!key) throw new Error(`${def.id}: no sign text for ${c}`);
        world.signs.push({ x: px, y: feet - 14, feet, key });
      } else if (c === 'D') {
        world.bossSpawn = { x: px, feet };
      } else {
        const entry = def.legend?.[c];
        if (!entry) throw new Error(`${def.id}: unknown map letter ${c} at ${x},${y}`);
        if (entry.bug) world.bugs.push({ type: entry.bug, x: px, feet, ...entry.opts });
        else if (entry.npc) world.npcs.push({ kind: entry.npc, x: px, feet, key: entry.say, flip: !!entry.flip });
        else if (entry.prop) world.props.push({ kind: entry.prop, x: px, feet, front: !!entry.front });
      }
    }
  }

  if (!world.goal) throw new Error(`${def.id}: level has no goal`);
  return world;
}

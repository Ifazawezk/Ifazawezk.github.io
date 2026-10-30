// The opening: young Faza crossing Doha, with his three schools as the stops on
// the way. Nothing here can kill you, so it doubles as the tutorial. The metro
// quietly teaches moving platforms before the first boat asks you to trust one.

const FLOOR = 10;
const ROWS = 12;

// One screen of street. Only the rows that have something in them are listed.
function street(width, rows) {
  const out = [];
  for (let y = 0; y < ROWS; y++) {
    if (rows[y] !== undefined) out.push(rows[y].padEnd(width, y >= FLOOR ? '#' : ' '));
    else out.push((y >= FLOOR ? '#' : ' ').repeat(width));
  }
  return out;
}

export const home = {
  id: 'home',
  theme: 'dohaday',
  goalKind: 'airport',
  stage: 0,
  signs: ['home.hello', 'home.jump', 'home.rashad', 'home.bugs', 'home.khaldoun', 'home.jassim', 'home.leave'],
  legend: {
    V: { prop: 'villa' },
    c: { prop: 'ac' },
    K: { prop: 'karakStand' },
    A: { prop: 'schoolA' },
    S: { prop: 'souqWaqif' },
    w: { prop: 'windTower' },
    I: { prop: 'schoolB' },
    T: { prop: 'metro' },
    W: { prop: 'westBay' },
    U: { prop: 'mia' },
    R: { prop: 'pearl' },
    J: { prop: 'schoolC' },
    Z: { prop: 'katara' },
    H: { prop: 'torch' },
    E: { prop: 'duneBack' },
    L: { prop: 'landcruiser' },
    B: { prop: 'bunting' },
    P: { prop: 'palm' },
    C: { npc: 'cat', say: 'home.cat' },
    k: { npc: 'keeper', say: 'home.keeper' },
    f: { npc: 'falcon', say: 'home.falcon' },
    Q: { bug: 'homework' },
    X: { bug: 'popquiz' },
    Y: { grow: 1 },
    h: { sandFrom: true },
    i: { sandTo: true },
    s: { sign: 'home.ac' },
    t: { sign: 'home.karak' },
    u: { sign: 'home.souq' },
    v: { sign: 'home.wind' },
    x: { sign: 'home.metro' },
    y: { sign: 'home.westbay' },
    z: { sign: 'home.mia' },
    p: { sign: 'home.pearl' },
    q: { sign: 'home.katara' },
    r: { sign: 'home.torch' },
    d: { sign: 'home.dunes' },
    e: { sign: 'home.worldcup' },
  },
  movers: [
    { dx: 176, dy: 0, period: 640, hold: 100, tiles: 8, kind: 'metro' },
  ],
  chunks: [
    // Home. It is hot.
    street(26, { 8: '          c', 9: ' V      @ c  0     s      ' }),
    // The karak stand, where this story ends as well.
    street(20, { 7: '             o o o', 8: '        k', 9: ' t  K' }),
    // First stop.
    street(28, {
      7: '                 o o',
      9: '  1     ##   A     2     3 Q',
    }),
    // The old town.
    street(30, {
      7: '                     o o o',
      9: ' u  S    f            v w',
    }),
    // Second stop. Something happens to his legs.
    street(26, {
      6: '                 o o o',
      7: '                =====',
      9: '   Q I          4  Y C',
    }),
    // A train with a very cold inside and a very walkable roof.
    street(32, {
      6: '              o o o o',
      8: '      M',
      9: ' x  T',
    }),
    // The new town, the old sea.
    street(36, {
      7: '                o o',
      9: ' W      y    U      z         R p  Q',
    }),
    // Third stop.
    street(24, {
      6: '               o o',
      7: '              ====',
      8: '            ##',
      9: '   J      ####   5  X',
    }),
    // Friday.
    street(30, { 9: ' Z    q         H  r    P' }),
    street(24, {
      6: '          o o',
      8: '        ####',
      9: 'h d E  ########   L',
    }),
    // 2022.
    street(28, {
      8: '                  o o o',
      9: 'i  B       e       6      G',
    }),
  ],
};

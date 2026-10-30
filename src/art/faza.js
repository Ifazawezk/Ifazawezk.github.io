import { FAZA_PARTS as P } from './sprites.js';

// Faza at six ages. The hair, the head and the two dot eyes never change, which
// is how you can tell it is the same person. Only the drawing grows: the hit box
// in player.js is the same at every age.

const swap = (rows, map) => rows.map((r) => [...r].map((c) => map[c] ?? c).join(''));

// Repeat one row to make a body or a pair of legs longer.
const stretch = (rows, index, times = 1) => [
  ...rows.slice(0, index),
  ...Array(times).fill(rows[index]),
  ...rows.slice(index),
];

const legsFrom = (map, extra = 0) => {
  const long = (rows) => (extra ? stretch(rows, 0, extra) : rows);
  return {
    stand: swap(long(P.LEGS), map),
    wide: swap(long(P.LEGS_WIDE), map),
    wide2: swap(long(P.LEGS_WIDE_2), map),
    pass: swap(long(P.LEGS_PASS), map),
    tuck: swap(long(P.LEGS_TUCK), map),
    dangle: swap(long(P.LEGS_DANGLE), map),
  };
};

function frames({ head, blink, body, swing, up, legs, sip = null, width = 16 }) {
  const blank = '.'.repeat(width);
  // The bob: one row lower on the passing step, feet still on the ground.
  const bob = (h) => [blank, ...h, ...body, ...legs.pass.slice(0, -2), legs.pass[legs.pass.length - 1]];
  const set = {
    idle0: [...head, ...body, ...legs.stand],
    idle1: [...blink, ...body, ...legs.stand],
    run0: [...head, ...swing, ...legs.wide],
    run1: bob(head),
    run2: [...head, ...swing, ...legs.wide2],
    run3: bob(blink),
    jump: [...head, ...up, ...legs.tuck],
    fall: [...head, ...up, ...legs.dangle],
    hurt: [...blink, ...up, ...legs.dangle],
    cheer: [...head, ...up, ...legs.stand],
  };
  set.sip0 = sip ? [...blink, ...sip.body, ...legs.stand] : set.idle0;
  set.sip1 = sip ? [...sip.head, ...sip.body, ...legs.stand] : set.idle1;
  return set;
}

// 0. Small, round, carrying a bag bigger than his future.
const KID_HEAD = [
  '...kk.kk.k....',
  '..khhkhhkhk...',
  '.khHhhhHhhhk..',
  '.khhhhhhhhhk..',
  '.khhhssshshk..',
  '.khhsskssksk..',
  '..khsskssksk..',
  '...kssssssk...',
  '....kkSSkk....',
];
const KID_BLINK = [
  ...KID_HEAD.slice(0, 5),
  '.khhssssssk...',
  '..khskkskksk..',
  ...KID_HEAD.slice(7),
];
const KID_BODY = [
  '.kkkkwwwwk....',
  'krrrrkwWwwk...',
  'krRrrkwWwsk...',
  'krrrrkBBBk....',
];
const KID_SWING = [
  '.kkkkwwwwk....',
  'krrrrkwWwk....',
  'krRrrkswWwsk..',
  'krrrrkBBBk....',
];
const KID_UP = [
  '.kkkkwwwwwssk.',
  'krrrrkwWwwk...',
  'krRrrkwWwk....',
  'krrrrkBBBk....',
];
const KID_LEGS = {
  stand: ['.....ksksk....', '.....kwkwk....'],
  wide: ['....ksk.ksk...', '...kww...kww..'],
  wide2: ['.....ksksk....', '....kww.kww...'],
  pass: ['......kssk....', '......kwwk....'],
  tuck: ['....kssssk....', '....kw..kw....'],
  dangle: ['.....ks.sk....', '....kw...wk...'],
};

// 1. All legs. Same uniform idea, one faint attempt at a moustache.
const TEEN_MAP = { y: 'w', Y: 'W', g: 'b', c: 'y', K: 'K' };
const moustache = (head) => [...head.slice(0, 9), '....kkHHHSk.....'];

// 3. First job. Neat hair, as neat as this hair goes. Tie. Lanyard.
const neat = (head) => [
  '.....kk.kkk.....',
  '....khhkhhhk....',
  '...khHhhhHhhk...',
  ...head.slice(3),
];
const PRO_BODY = [
  '..kkkkiiRiik....',
  '.kGGGkiiRiiik...',
  '.kGGGkiIRiiik...',
  '.kGGGkiIRiisk...',
  '.kGGGkiIRiik....',
  '..kkkkiiiiik....',
];
const PRO_SWING = [
  '..kkkkiiRiik....',
  '.kGGGkiiRiik....',
  '.kGGGkiIRiiisk..',
  '.kGGGksIRiik....',
  '.kGGGkiIRiik....',
  '..kkkkiiiiik....',
];
const PRO_UP = [
  '..kkkkiiRiiissk.',
  '.kGGGkiiRiiik...',
  '.kGGGkiIRiik....',
  '.kGGGkiIRiik....',
  '.kGGGkiIRiik....',
  '..kkkkiiiiik....',
];

// 4. Hoodie, bags under the eyes, karak surgically attached to the right hand.
const tired = (head) => [
  '....kk.kkk.kk.k.',
  '...khhkhhkhhhk..',
  ...head.slice(2, 8),
  '...kSSSSSSSSk...',
  '....kkSsssSk....',
];
const DEV_BODY = [
  '..kkkkCCCCCk....',
  '.kgggkCBCCCCk...',
  '.kgcgkCBCCCCssk.',
  '.kgggkCBCCCkkkkk',
  '.kgggkCBCCCkuUUk',
  '..kkkkCCCCCkkkk.',
];
const DEV_SWING = [
  '..kkkkCCCCCk....',
  '.kgggkCBCCCk....',
  '.kgcgkCBCCCCssk.',
  '.kgggksBCCCkkkkk',
  '.kgggkCBCCCkuUUk',
  '..kkkkCCCCCkkkk.',
];
const DEV_UP = [
  '..kkkkCCCCCCkkkk',
  '.kgggkCBCCCCkuUk',
  '.kgcgkCBCCCCssk.',
  '.kgggkCBCCCk....',
  '.kgggkCBCCCk....',
  '..kkkkCCCCCk....',
];
const DEV_SIP_BODY = [
  '..kkkkCCCCCCssk.',
  '.kgggkCBCCCCssk.',
  '.kgcgkCBCCCCCk..',
  '.kgggkCBCCCCk...',
  '.kgggkCBCCCCk...',
  '..kkkkCCCCCk....',
];

// 5. Grown up. The yellow is back, as a proper jacket. The beard is new.
const beard = (head) => [
  ...head.slice(0, 7),
  '...khHskssksk...',
  '...kHHHHHHHHk...',
  '....kkHHHHHk....',
];
const GROWN_BODY = [
  '..kkkkywwyyk....',
  '.kgggkywwYyyk...',
  '.kgcgkywwYyyk...',
  '.kgggkywwYyyk...',
  '.kgggkywwYyssk..',
  '.kgggkywwYyyk...',
  '..kkkkyyyyyk....',
];
const GROWN_SWING = [
  '..kkkkywwyyk....',
  '.kgggkywwYyk....',
  '.kgcgkywwYyyyk..',
  '.kgggkywwYyysk..',
  '.kgggksywYyk....',
  '.kgggkywwYyk....',
  '..kkkkyyyyyk....',
];
const GROWN_UP = [
  '..kkkkywwyyyyssk',
  '.kgggkywwYyyyk..',
  '.kgcgkywwYyyk...',
  '.kgggkywwYyyk...',
  '.kgggkywwYyyk...',
  '.kgggkywwYyyk...',
  '..kkkkyyyyyk....',
];
const GROWN_SIP = [
  '..kkkkywwyyyssk.',
  '.kgggkywwYyyssk.',
  '.kgcgkywwYyyyk..',
  '.kgggkywwYyyk...',
  '.kgggkywwYyyk...',
  '.kgggkywwYyyk...',
  '..kkkkyyyyyk....',
];

const SIP_MUG = (rows) => [
  ...rows.slice(0, 7),
  '...khssksskuUk..',
  '...kssssssskUk..',
  '....kkSsssSkkk..',
];

const teenBody = (rows) => swap(stretch(rows, 2), TEEN_MAP);

export const STAGES = [
  {
    id: 'kid',
    frames: frames({
      head: KID_HEAD, blink: KID_BLINK, body: KID_BODY, swing: KID_SWING, up: KID_UP, legs: KID_LEGS, width: 14,
    }),
  },
  {
    id: 'teen',
    frames: frames({
      head: moustache(P.HEAD),
      blink: moustache(P.HEAD_BLINK),
      body: teenBody(P.BODY),
      swing: teenBody(P.BODY_SWING),
      up: teenBody(P.BODY_UP),
      legs: legsFrom({ B: 'G', w: 'K' }, 1),
    }),
  },
  {
    id: 'student',
    frames: frames({
      head: P.HEAD,
      blink: P.HEAD_BLINK,
      body: P.BODY,
      swing: P.BODY_SWING,
      up: P.BODY_UP,
      legs: legsFrom({}),
      sip: { head: SIP_MUG(P.HEAD), body: P.BODY_SIP },
    }),
  },
  {
    id: 'pro',
    frames: frames({
      head: neat(P.HEAD),
      blink: neat(P.HEAD_BLINK),
      body: PRO_BODY,
      swing: PRO_SWING,
      up: PRO_UP,
      legs: legsFrom({ B: 'K', w: 'T' }, 1),
    }),
  },
  {
    id: 'dev',
    frames: frames({
      head: tired(P.HEAD),
      blink: tired(P.HEAD_BLINK),
      body: DEV_BODY,
      swing: DEV_SWING,
      up: DEV_UP,
      legs: legsFrom({ w: 'W' }, 1),
      sip: { head: SIP_MUG(tired(P.HEAD)), body: DEV_SIP_BODY },
    }),
  },
  {
    id: 'grown',
    frames: frames({
      head: beard(P.HEAD),
      blink: beard(P.HEAD_BLINK),
      body: GROWN_BODY,
      swing: GROWN_SWING,
      up: GROWN_UP,
      legs: legsFrom({}, 1),
      sip: { head: SIP_MUG(beard(P.HEAD)), body: GROWN_SIP },
    }),
  },
];

export const LAST_STAGE = STAGES.length - 1;

// Original tunes, written for this game. Plain data so a test can check them.
// Notes are semitones above the track's root. null is a rest. One step is an
// eighth note. The feel comes from maqam Hijaz and a maqsum drum pattern, which
// is why it sounds like a wedding in Tanta played on a calculator.

const _ = null;

// Maqam Hijaz on the root: the flat second and the raised third do the work.
export const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
// Same shape without the raised third, darker, for night time and servers.
export const NAHAWAND = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];

const DAY_LEAD = [
  0, 1, 4, 5, 7, _, 5, 4,
  5, 4, 1, 0, 1, _, _, _,
  7, 8, 7, 5, 4, 5, 7, _,
  8, 7, 5, 4, 1, 0, _, _,
  12, _, 10, 8, 7, _, 8, 10,
  12, 10, 8, 7, 5, _, 7, _,
  4, 5, 7, 8, 7, 5, 4, 1,
  0, _, 1, _, 0, _, _, _,
];

const NIGHT_LEAD = [
  7, _, 8, 7, 5, _, 3, _,
  5, 7, 5, 3, 2, _, 0, _,
  3, _, 5, 7, 8, _, 10, _,
  12, _, 10, 8, 7, _, _, _,
  7, 8, 10, 12, 10, 8, 7, _,
  5, 7, 8, 7, 5, 3, 2, _,
  0, 2, 3, 5, 7, _, 5, 3,
  2, _, 0, _, _, _, _, _,
];

const BOSS_LEAD = [
  0, 0, 1, 0, 4, 4, 5, 4,
  7, 7, 8, 7, 5, 4, 1, 0,
  0, 0, 1, 0, 4, 4, 5, 4,
  8, 7, 5, 4, 1, 1, 0, _,
];

const bass = (roots) => roots.flatMap((n) => [n - 12, _, n - 12, _, n - 5, _, n - 12, _]);

export const TRACKS = {
  day: {
    bpm: 138, root: 62, scale: HIJAZ, lead: DAY_LEAD, bass: bass([0, 0, 5, 1, 7, 5, 1, 0]), wave: 'square',
  },
  roof: {
    bpm: 150, root: 64, scale: HIJAZ, lead: DAY_LEAD, bass: bass([0, 5, 0, 1, 7, 5, 1, 0]), wave: 'square',
  },
  night: {
    bpm: 112, root: 60, scale: NAHAWAND, lead: NIGHT_LEAD, bass: bass([0, 0, 3, 5, 3, 5, 0, 0]), wave: 'triangle',
  },
  boss: {
    bpm: 168, root: 62, scale: HIJAZ, lead: BOSS_LEAD, bass: bass([0, 1, 0, 1]), wave: 'sawtooth',
  },
};

// Dum, tak, rest, tak, dum, rest, tak, rest: one bar of maqsum.
export const DRUMS = ['D', 'T', _, 'T', 'D', _, 'T', _];

export const TRACK_OF_LEVEL = {
  home: 'day', tanta: 'day', alx: 'day', cairo: 'roof', hearts: 'night', dunes: 'day', souq: 'day', corniche: 'night', homecoming: 'night',
};

export const SFX = {
  jump: [['square', 330, 620, 0.1, 0.18]],
  bounce: [['square', 220, 880, 0.2, 0.2]],
  land: [['triangle', 140, 90, 0.05, 0.12]],
  cup: [['triangle', 988, 988, 0.05, 0.22], ['triangle', 1319, 1319, 0.1, 0.22, 0.05]],
  stomp: [['square', 520, 110, 0.13, 0.24]],
  soft: [['square', 300, 240, 0.08, 0.16]],
  hurt: [['sawtooth', 300, 90, 0.22, 0.2]],
  die: [['square', 440, 60, 0.45, 0.2]],
  checkpoint: [['square', 523, 523, 0.07, 0.16], ['square', 659, 659, 0.07, 0.16, 0.07], ['square', 784, 784, 0.12, 0.16, 0.14]],
  hyper: [['square', 300, 1400, 0.3, 0.16]],
  clear: [['square', 587, 587, 0.09, 0.18], ['square', 622, 622, 0.09, 0.18, 0.09], ['square', 740, 740, 0.09, 0.18, 0.18], ['square', 880, 880, 0.24, 0.18, 0.27]],
  grow: [['square', 262, 1047, 0.5, 0.12], ['triangle', 1047, 1568, 0.3, 0.2, 0.5]],
  'boss-hit': [['sawtooth', 700, 80, 0.3, 0.26]],
  'boss-throw': [['square', 880, 440, 0.12, 0.12]],
  ending: [['square', 587, 587, 0.14, 0.2], ['square', 740, 740, 0.14, 0.2, 0.14], ['square', 880, 880, 0.14, 0.2, 0.28], ['square', 1175, 1175, 0.5, 0.2, 0.42]],
  open: [['triangle', 660, 990, 0.12, 0.2]],
};

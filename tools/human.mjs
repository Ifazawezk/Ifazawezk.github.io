// A pretend person. The search bot in bot.mjs proves a route exists, which is
// not the same as proving somebody can do it: it will happily land a jump that
// only works on one exact frame. This one has human limits.
//
//   - It looks, then needs at least 250 ms before its fingers do anything.
//   - While it reacts it stands still, like somebody working out the next move.
//   - Its timing is sloppy: every press lands a random few frames early or late.
//   - It presses buttons for a human length of time, never a single frame.
//   - It only picks a move if that move still works when done early AND late.
//     If no such move exists at some spot, that spot needs a frame-perfect
//     input, and the spot is reported as risky.
//
//   node tools/human.mjs [seed] [seed...]

import { fileURLToPath } from 'node:url';
import { createSession, createGame, startRun, step, worldOf, loadLevel } from '../src/game/game.js';
import { TILE, T } from '../src/game/physics.js';
import { snapshotRepos } from './bot.mjs';

export const LIMITS = {
  reactionMin: 15, // 250 ms at 60 ticks a second
  reactionMax: 24, // 400 ms
  jitter: 5, // a press can land up to 83 ms early or late
  minPress: 6, // 100 ms
};

const NONE = { left: false, right: false, jump: false, action: false };

// run: ticks of run-up. hold: how long jump stays down. dir: 1 right, -1 left.
const jump = (dir, run, hold) => ({ kind: 'jump', dir, run, hold, len: run + 90 });
const MOVES = [
  { kind: 'walk', dir: 1, len: 7 },
  { kind: 'walk', dir: 1, len: 20 },
  { kind: 'walk', dir: 1, len: 44 },
  jump(1, 0, 24),
  jump(1, 14, 24),
  jump(1, 28, 24),
  jump(1, 0, 10),
  jump(1, 14, 10),
  jump(0, 0, 24),
  { kind: 'wait', dir: 0, len: 28 },
  { kind: 'walk', dir: -1, len: 7 },
  { kind: 'walk', dir: -1, len: 16 },
  jump(-1, 0, 24),
];

function press(move, f, shift) {
  const input = { ...NONE };
  if (move.kind === 'wait') return input;
  if (move.dir > 0) input.right = true;
  if (move.dir < 0) input.left = true;
  if (move.kind === 'jump') {
    const at = Math.max(0, move.run + shift);
    const hold = Math.max(LIMITS.minPress, move.hold + (shift > 0 ? -2 : 2));
    input.jump = f >= at && f < at + hold;
  }
  return input;
}

// Play a move on a copy. Returns the copy, or null if it cost a life.
function tryMove(session, g, move, reaction, shift) {
  const c = structuredClone(g);
  const startRetries = c.retries;
  const level = c.level;
  for (let i = 0; i < reaction; i++) {
    step(session, c, NONE);
    if (c.retries > startRetries) return null;
    if (c.phase !== 'play' || c.level !== level) return c;
  }
  let inAir = false;
  for (let f = 0; f < move.len; f++) {
    step(session, c, press(move, f, shift));
    if (c.retries > startRetries) return null;
    if (c.phase !== 'play' || c.level !== level) return c;
    if (move.kind === 'jump') {
      if (!c.p.onGround) inAir = true;
      else if (inAir) break;
    }
  }
  // He then has to survive standing there while he thinks about the next move.
  for (let i = 0; i < LIMITS.reactionMin; i++) {
    step(session, c, NONE);
    if (c.retries > startRetries) return null;
    if (c.phase !== 'play' || c.level !== level) return c;
  }
  return c;
}

function value(g) {
  const bossPart = g.boss ? (g.boss.maxHp - g.boss.hp) * 6000 : 0;
  const chase = g.boss?.awake && !g.boss.defeated ? 2000 - Math.abs(g.p.x - g.boss.x) : 0;
  const done = g.phase !== 'play' ? 100000 : 0;
  return g.p.x + bossPart + chase + done + g.level * 200000 - (3 - g.battery) * 30;
}

// Look a few moves ahead from what he can see, then rank the first moves.
export function rankMoves(session, g) {
  const ranked = [];
  for (const move of MOVES) {
    const first = tryMove(session, g, move, LIMITS.reactionMin, 0);
    if (!first) continue;
    let best = value(first);
    if (first.phase === 'play' && first.level === g.level) {
      for (const next of MOVES) {
        const second = tryMove(session, first, next, LIMITS.reactionMin, 0);
        if (second) best = Math.max(best, value(second));
      }
    }
    ranked.push({ move, best: best + (move.kind === 'wait' ? -1 : 0) });
  }
  return ranked.sort((a, b) => b.best - a.best);
}

// Early, on time and late, at the fastest and slowest reaction.
export function holdsUp(session, g, move) {
  for (const reaction of [LIMITS.reactionMin, LIMITS.reactionMax]) {
    const shifts = move.kind === 'jump' ? [-LIMITS.jitter, 0, LIMITS.jitter] : [0];
    for (const shift of shifts) {
      if (!tryMove(session, g, move, reaction, shift)) return false;
    }
  }
  return true;
}

export function playLikeAPerson(session, {
  seed = 1, maxTicks = 60 * 60 * 15, log = () => {}, section = null, onRisky = null,
} = {}) {
  let r = seed * 2654435761 % 4294967296;
  const rand = () => {
    r = (r * 1664525 + 1013904223) % 4294967296;
    return r / 4294967296;
  };
  const between = (a, b) => a + Math.floor(rand() * (b - a + 1));

  const g = createGame();
  startRun(session, g);
  if (section) {
    // Start at the last checkpoint before the section, as a player would.
    loadLevel(session, g, session.worlds.findIndex((w) => w.id === section.level));
    const world = worldOf(session, g);
    g.t = between(0, 1200);
    const before = world.checkpoints.filter((c) => c.x <= section.fromCol * TILE).at(-1);
    if (before) {
      g.check = { x: before.x, y: before.y };
      g.p.x = before.x;
      g.p.y = before.y;
    }
  }
  const risky = [];
  const deaths = [];
  let bestX = 0;
  let bestLevel = 0;
  let stuckSince = 0;

  while (g.phase !== 'ending' && g.runT < maxTicks) {
    if (section && (g.level !== session.worlds.findIndex((w) => w.id === section.level)
      || g.p.x >= section.toCol * TILE)) {
      return { finished: true, risky, deaths, g };
    }
    if (g.phase !== 'play') {
      step(session, g, NONE);
      continue;
    }
    const seenRetries = g.retries;
    const world = worldOf(session, g);
    const ranked = rankMoves(session, g);
    let chosen = ranked.find((entry) => holdsUp(session, g, entry.move));
    // Two safe options, one of them standing still: on firm ground, people
    // shuffle forward. On a boat or a blinking tile they stay put and wait.
    const firm = g.p.onGround && (g.p.ride ?? -1) < 0 && ![T.BLINK_A, T.BLINK_B].includes(g.p.groundTile);
    if (firm && chosen && !chosen.move.dir) {
      const step = ranked.find((entry) => entry.move.dir > 0 && entry.move.kind === 'walk'
        && entry.best > chosen.best - TILE * 3 && holdsUp(session, g, entry.move));
      if (step) chosen = step;
    }
    // Nobody stands still for ever. After a while he goes for it anyway, and
    // that gets written down as a risky move.
    const bored = g.runT - stuckSince > 60 * 10 && !chosen?.move.dir && ranked[0]?.move.dir;
    if (!chosen || bored) {
      onRisky?.(g, ranked, !!bored);
      if (ranked.length) {
        risky.push({ level: world.id, col: Math.floor(g.p.x / TILE), row: Math.floor(g.p.y / TILE) });
        chosen = ranked[0];
      } else {
        chosen = { move: MOVES.find((m) => m.kind === 'wait') };
      }
    }

    // Reaction time: he has decided, his fingers have not caught up yet.
    const reaction = between(LIMITS.reactionMin, LIMITS.reactionMax);
    for (let i = 0; i < reaction && g.phase === 'play'; i++) step(session, g, NONE);

    const shift = chosen.move.kind === 'jump' ? between(-LIMITS.jitter, LIMITS.jitter) : 0;
    let inAir = false;
    const level = g.level;
    for (let f = 0; f < chosen.move.len && g.phase === 'play' && g.level === level; f++) {
      step(session, g, press(chosen.move, f, shift));
      if (chosen.move.kind === 'jump') {
        if (!g.p.onGround) inAir = true;
        else if (inAir) break;
      }
    }

    if (g.retries > seenRetries) {
      deaths.push({ level: world.id, col: Math.floor(g.p.x / TILE) });
      bestX = g.check.x;
      stuckSince = g.runT;
    }

    if (g.level > bestLevel || g.p.x > bestX + 16) {
      bestX = g.level > bestLevel ? 0 : g.p.x;
      bestLevel = Math.max(bestLevel, g.level);
      stuckSince = g.runT;
    } else if (g.boss?.awake) {
      stuckSince = g.runT;
    } else if (g.runT - stuckSince > 60 * 90) {
      log(`  stuck in ${world.id} at column ${Math.floor(g.p.x / TILE)}`);
      return { finished: false, stuck: { level: world.id, col: Math.floor(g.p.x / TILE) }, risky, deaths, g };
    }
  }
  return { finished: g.phase === 'ending', risky, deaths, g };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\//g, '\\')) {
  const seeds = process.argv.slice(2).map(Number).filter(Boolean);
  let ok = true;
  for (const seed of seeds.length ? seeds : [1, 2, 3]) {
    const t0 = Date.now();
    const res = playLikeAPerson(createSession(snapshotRepos()), { seed, log: console.log });
    const g = res.g;
    ok = ok && res.finished;
    console.log(`seed ${seed}: ${res.finished ? 'finished' : 'DID NOT FINISH'} in ${(g.runT / 60).toFixed(0)}s of game time, `
      + `${g.retries} retries, ${res.risky.length} risky moves, cups ${g.cupsTaken}, bugs ${g.stomped} `
      + `(${((Date.now() - t0) / 1000).toFixed(0)}s real time)`);
    if (res.risky.length) console.log('  risky:', JSON.stringify(res.risky.slice(0, 12)));
    if (res.deaths.length) console.log('  deaths:', JSON.stringify(res.deaths.slice(0, 12)));
  }
  process.exit(ok ? 0 : 1);
}

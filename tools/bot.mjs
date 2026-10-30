// A scripted player. It only ever presses buttons: every move goes through the
// same step() the browser runs, and it searches for a route rather than reading
// one from a list, so a broken level makes it fail instead of quietly passing.
//
//   node tools/bot.mjs            play the whole game and print a report
//   node tools/bot.mjs --tape     also save the inputs for the browser replay

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSession, createGame, startRun, step, worldOf } from '../src/game/game.js';
import { tidyRepos } from '../src/repos.js';

export function snapshotRepos() {
  return tidyRepos(JSON.parse(readFileSync(new URL('../data/repos.json', import.meta.url), 'utf8')));
}

const pack = (left, right, jump, action = false) => (left ? 1 : 0) | (right ? 2 : 0) | (jump ? 4 : 0) | (action ? 8 : 0);
const unpack = (b) => ({ left: !!(b & 1), right: !!(b & 2), jump: !!(b & 4), action: !!(b & 8) });

// Each macro is a short burst of buttons. Jumps run until he lands or time is up.
const MACROS = [
  { name: 'run', len: 12, at: () => pack(0, 1, 0) },
  { name: 'dash', len: 30, at: () => pack(0, 1, 0) },
  { name: 'hop', len: 60, stopOnLand: true, at: (f) => pack(0, 1, f < 7) },
  { name: 'jump', len: 70, stopOnLand: true, at: (f) => pack(0, 1, f < 22) },
  { name: 'vault', len: 70, stopOnLand: true, at: (f) => pack(0, f > 12, f < 22) },
  { name: 'up', len: 60, stopOnLand: true, at: (f) => pack(0, 0, f < 22) },
  { name: 'wait', len: 16, at: () => pack(0, 0, 0) },
  { name: 'long-wait', len: 50, at: () => pack(0, 0, 0) },
  { name: 'back', len: 14, at: () => pack(1, 0, 0) },
  { name: 'back-jump', len: 70, stopOnLand: true, at: (f) => pack(1, 0, f < 22) },
];

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(item) {
    const { a } = this;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (a[up].score >= a[i].score) break;
      [a[up], a[i]] = [a[i], a[up]];
      i = up;
    }
  }
  pop() {
    const { a } = this;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < a.length && a[l].score > a[best].score) best = l;
        if (r < a.length && a[r].score > a[best].score) best = r;
        if (best === i) break;
        [a[best], a[i]] = [a[i], a[best]];
        i = best;
      }
    }
    return top;
  }
}

function score(g, depth) {
  const bossPart = g.boss ? (g.boss.maxHp - g.boss.hp) * 6000 : 0;
  const bossChase = g.boss?.awake && !g.boss.defeated
    ? 2000 - Math.abs(g.p.x - g.boss.x) - Math.max(0, g.p.y + g.p.h - g.boss.y)
    : 0;
  return g.p.x + bossPart + bossChase + g.cupsTaken * 6 + g.stomped * 10 - depth * 0.35 - (3 - g.battery) * 40;
}

function keyOf(g) {
  const p = g.p;
  const clock = Math.floor(g.t / 24) % 40;
  const boss = g.boss ? `${g.boss.hp}${g.boss.awake ? 'a' : ''}${Math.floor(g.boss.x / 16)}` : '';
  return `${Math.floor(p.x / 5)},${Math.floor(p.y / 5)},${p.onGround ? 1 : 0},${clock},${g.battery},${boss}`;
}

// Find button presses from this exact state to the end of the level.
export function solveLevel(session, start, { maxNodes = 60000 } = {}) {
  const level = start.level;
  const heap = new Heap();
  const seen = new Set();
  let nodes = 0;
  let furthest = 0;
  heap.push({ g: start, tail: null, score: 0, depth: 0 });

  while (heap.size && nodes < maxNodes) {
    const node = heap.pop();
    nodes++;
    for (const macro of MACROS) {
      const g = structuredClone(node.g);
      const keys = [];
      let done = false;
      let lost = false;
      let wasAir = false;
      for (let f = 0; f < macro.len; f++) {
        const b = macro.at(f);
        keys.push(b);
        step(session, g, unpack(b));
        if (g.retries > start.retries) { lost = true; break; }
        if (g.phase !== 'play' || g.level !== level) { done = true; break; }
        if (macro.stopOnLand) {
          if (!g.p.onGround) wasAir = true;
          else if (wasAir) break;
        }
      }
      if (lost) continue;
      const entry = { keys, prev: node.tail };
      if (done) {
        const out = [];
        for (let e = entry; e; e = e.prev) out.push(e.keys);
        return { keys: out.reverse().flat(), nodes };
      }
      furthest = Math.max(furthest, g.p.x);
      const key = keyOf(g);
      if (seen.has(key)) continue;
      seen.add(key);
      const depth = node.depth + keys.length;
      heap.push({ g, tail: entry, score: score(g, depth), depth });
    }
  }
  return { keys: null, nodes, furthest };
}

// Open every stall on the way past, like a person who wants to see the goods.
function visitStalls(session, g, tape, opened) {
  const world = worldOf(session, g);
  for (const stall of world.stalls) {
    const target = stall.x + 36;
    for (let i = 0; i < 900 && Math.abs(g.p.x - target) > 4; i++) {
      const b = pack(g.p.x > target, g.p.x < target, false);
      tape.push(b);
      step(session, g, unpack(b));
    }
    for (let i = 0; i < 12; i++) {
      const b = pack(0, 0, 0, i === 4);
      tape.push(b);
      step(session, g, unpack(b));
      for (const e of g.events) if (e.type === 'open-repo') opened.push(e.url);
    }
  }
}

export function playGame(session, { log = () => {}, stalls = true } = {}) {
  const g = createGame();
  startRun(session, g);
  const tape = [];
  const levels = [];
  const opened = [];

  while (g.phase !== 'ending') {
    if (g.phase === 'clear') {
      tape.push(0);
      step(session, g, unpack(0));
      continue;
    }
    const world = worldOf(session, g);
    const id = world.id;
    const startT = g.runT;
    if (stalls && world.stalls.length) visitStalls(session, g, tape, opened);
    const { keys, nodes, furthest } = solveLevel(session, structuredClone(g));
    if (!keys) {
      levels.push({ id, finished: false, nodes });
      log(`  ${id}: NOT finished after ${nodes} search nodes, got to column ${Math.floor(furthest / 16)} of ${world.cols}`);
      return { finished: false, g, tape, levels, opened };
    }
    for (const b of keys) {
      tape.push(b);
      step(session, g, unpack(b));
    }
    const seconds = (g.runT - startT) / 60;
    levels.push({ id, finished: true, nodes, seconds });
    log(`  ${id}: finished in ${seconds.toFixed(1)}s of game time (${nodes} nodes)`);
  }
  return { finished: g.phase === 'ending', g, tape, levels, opened };
}

export function encodeTape(tape) {
  const out = [];
  for (const b of tape) {
    const last = out[out.length - 1];
    if (last && last[0] === b) last[1]++;
    else out.push([b, 1]);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\//g, '\\')) {
  const session = createSession(snapshotRepos());
  console.log('Bot starting.');
  const res = playGame(session, { log: console.log });
  const g = res.g;
  console.log(res.finished ? 'REACHED THE ENDING' : 'DID NOT FINISH');
  console.log(`phase=${g.phase} cups=${g.cupsTaken} bugs=${g.stomped} retries=${g.retries} score=${g.score} time=${(g.runT / 60).toFixed(1)}s repos-opened=${res.opened.length}`);
  if (process.argv.includes('--tape')) {
    mkdirSync('tools/out', { recursive: true });
    writeFileSync('tools/out/tape.json', JSON.stringify(encodeTape(res.tape)));
    console.log('tape saved');
  }
  process.exit(res.finished ? 0 : 1);
}

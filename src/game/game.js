import { TILE, T, touchesTile } from './physics.js';
import { newPlayer, updatePlayer } from './player.js';
import { moverPos } from './world.js';
import { buildWorlds } from './levels/index.js';

export const VIEW_W = 320;
export const VIEW_H = 180;
const CLEAR_TICKS = 60;
const DEAD_TICKS = 36;
const BUBBLE_LINGER = 150;
const SIGN_RANGE = 42;

// The world never changes during a run, so it lives outside the game state.
// That keeps the state a small plain object, cheap to copy for the test bot.
export function createSession() {
  return { worlds: buildWorlds() };
}

export function createGame() {
  return {
    phase: 'title',
    t: 0,
    level: 0,
    levelT: 0,
    runT: 0,
    p: newPlayer(0, 0),
    deadT: 0,
    clearT: 0,
    retries: 0,
    check: null,
    checksOn: [],
    bubble: null,
    events: [],
  };
}

function emit(g, type, data = {}) {
  g.events.push({ type, ...data });
}

export function worldOf(s, g) {
  return s.worlds[g.level];
}

export function loadLevel(s, g, index) {
  g.level = index;
  g.levelT = 0;
  const world = s.worlds[index];
  g.p = newPlayer(world.spawn.x, world.spawn.y);
  g.check = { x: world.spawn.x, y: world.spawn.y };
  g.checksOn = [];
  g.bubble = null;
  g.deadT = 0;
  emit(g, 'level', { index, id: world.id });
}

export function startRun(s, g) {
  Object.assign(g, createGame());
  g.phase = 'play';
  loadLevel(s, g, 0);
}

function respawn(g) {
  const { x, y } = g.check;
  g.p = newPlayer(x, y);
  g.p.inv = 60;
  g.deadT = 0;
  g.bubble = null;
}

function die(g, why) {
  if (g.deadT > 0) return;
  g.deadT = DEAD_TICKS;
  g.retries++;
  emit(g, 'die', { why });
}

function updateMoversAndPlayer(g, world, input) {
  const p = g.p;
  const now = world.movers.map((m) => moverPos(m, g.t));
  const before = world.movers.map((m) => moverPos(m, g.t - 1));

  const riding = p.ride ?? -1;
  p.rideDx = riding >= 0 ? now[riding].x - before[riding].x : 0;

  const prevBottom = p.y + p.h;
  const res = updatePlayer(p, input, world, g.t);
  if (res.jumped) emit(g, 'jump');
  if (res.bounced) emit(g, 'bounce');
  if (res.landed) emit(g, 'land');

  p.ride = -1;
  if (p.vy >= 0) {
    for (let i = 0; i < world.movers.length; i++) {
      const m = world.movers[i];
      const inX = p.x + p.w > now[i].x + 1 && p.x < now[i].x + m.w - 1;
      if (!inX) continue;
      const glued = riding === i;
      const fell = prevBottom <= before[i].y + 2 && p.y + p.h >= now[i].y;
      if (glued || fell) {
        p.y = now[i].y - p.h;
        p.vy = 0;
        if (!p.onGround && !glued) emit(g, 'land');
        p.onGround = true;
        p.ride = i;
        break;
      }
    }
  }
}

function updateSigns(g, world) {
  const p = g.p;
  const cx = p.x + p.w / 2;
  let near = null;
  for (const sign of world.signs) {
    const dx = Math.abs(sign.x + 8 - cx);
    if (dx < SIGN_RANGE && Math.abs(sign.feet - (p.y + p.h)) < 70) near = { key: sign.key, x: sign.x + 8, y: sign.y };
  }
  for (const npc of world.npcs) {
    const dx = Math.abs(npc.x + 8 - cx);
    if (dx < SIGN_RANGE && Math.abs(npc.feet - (p.y + p.h)) < 70) near = { key: npc.key, x: npc.x + 8, y: npc.feet - 20 };
  }
  if (near) {
    if (!g.bubble || g.bubble.key !== near.key) emit(g, 'bubble', { key: near.key });
    g.bubble = { ...near, left: BUBBLE_LINGER };
  } else if (g.bubble) {
    g.bubble.left--;
    if (g.bubble.left <= 0) g.bubble = null;
  }
}

function updateChecks(g, world) {
  const p = g.p;
  world.checkpoints.forEach((c, i) => {
    if (!g.checksOn.includes(i) && Math.abs(p.x - c.x) < 14 && Math.abs(p.y - c.y) < 40) {
      g.checksOn.push(i);
      g.check = { x: c.x, y: c.y };
      emit(g, 'checkpoint', { n: g.checksOn.length });
    }
  });
}

function playTick(s, g, input) {
  const world = worldOf(s, g);
  const p = g.p;
  g.runT++;
  g.levelT++;

  if (g.deadT > 0) {
    g.deadT--;
    if (g.deadT === 0) respawn(g);
    return;
  }

  updateMoversAndPlayer(g, world, input);

  if (touchesTile(p, world, [T.WATER])) { die(g, 'water'); return; }
  if (p.y > world.rows * TILE + 24) { die(g, 'fall'); return; }

  updateChecks(g, world);
  updateSigns(g, world);

  const goal = world.goal;
  if (p.x + p.w > goal.x + 8 && Math.abs(p.y + p.h - goal.feet) < 40) {
    g.phase = 'clear';
    g.clearT = CLEAR_TICKS;
    emit(g, 'clear', { index: g.level });
  }
}

export function step(s, g, input) {
  g.events.length = 0;
  g.t++;
  if (g.phase === 'play') playTick(s, g, input);
  else if (g.phase === 'clear') {
    g.clearT--;
    g.levelT++;
    if (g.clearT <= 0) {
      if (g.level + 1 < s.worlds.length) {
        g.phase = 'play';
        loadLevel(s, g, g.level + 1);
      } else {
        g.phase = 'ending';
        emit(g, 'ending');
      }
    }
  }
}

import { TILE, T, PHYS, overlaps, touchesTile } from './physics.js';
import { newPlayer, updatePlayer } from './player.js';
import { moverPos } from './world.js';
import { buildWorlds, SOUQ_INDEX } from './levels/index.js';
import { parseLevel } from './world.js';
import { souqDef } from './levels/souq.js';
import { makeBug, updateBug, splitBug, BUG_POINTS } from './bugs.js';
import { makeBoss, updateBoss, BOSS_POINTS } from './boss.js';

export const VIEW_W = 320;
export const VIEW_H = 180;
const CLEAR_TICKS = 60;
const DEAD_TICKS = 36;
const BUBBLE_LINGER = 150;
const SIGN_RANGE = 42;
export const CUP_POINTS = 10;
export const CAFFEINE_FULL = 12;
export const FULL_BATTERY = 3;
const HYPER_TICKS = 420;
export const GROW_TICKS = 130;
const GROW_SKIPPABLE_AFTER = 40;

// The world never changes during a run, so it lives outside the game state.
// That keeps the state a small plain object, cheap to copy for the test bot.
export function createSession(repos = []) {
  const worlds = buildWorlds(repos);
  return { worlds, repos, totalCups: countCups(worlds) };
}

function countCups(worlds) {
  return worlds.reduce((sum, w) => sum + w.cups.length, 0);
}

// New stock can arrive from GitHub at any moment. Never swap the souq while
// someone is standing in it.
export function setRepos(s, g, repos) {
  s.repos = repos;
  if (g.phase === 'play' && g.level === SOUQ_INDEX) return false;
  s.worlds[SOUQ_INDEX] = parseLevel(souqDef(repos));
  s.totalCups = countCups(s.worlds);
  return true;
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
    battery: FULL_BATTERY,
    bugs: [],
    stomped: 0,
    stage: 0,
    growT: 0,
    growFrom: 0,
    growTo: 0,
    growHeld: false,
    boss: null,
    invites: [],
    stall: -1,
    actionHeld: false,
    skips: 0,
    score: 0,
    best: 0,
    cups: [],
    cupsTaken: 0,
    caffeine: 0,
    hyperT: 0,
    seen: [],
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
  g.stage = world.stage;
  g.p = newPlayer(world.spawn.x, world.spawn.y);
  g.check = { x: world.spawn.x, y: world.spawn.y };
  g.checksOn = [];
  g.bubble = null;
  g.deadT = 0;
  g.battery = FULL_BATTERY;
  g.cups = world.cups.map((c) => ({ x: c.x, y: c.y, w: 10, h: 10, taken: false }));
  g.bugs = world.bugs.map((b) => makeBug(b.type, b.x, b.feet, b));
  g.boss = world.bossSpawn ? makeBoss(world.bossSpawn, world) : null;
  g.invites = [];
  g.stall = -1;
  emit(g, 'level', { index, id: world.id });
}

export function startRun(s, g) {
  const { best } = g;
  Object.assign(g, createGame(), { best });
  g.phase = 'play';
  loadLevel(s, g, 0);
}

function respawn(g) {
  const { x, y } = g.check;
  g.p = newPlayer(x, y);
  g.p.inv = 60;
  g.deadT = 0;
  g.bubble = null;
  g.battery = FULL_BATTERY;
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
  const hyper = g.hyperT > 0;
  const res = updatePlayer(p, input, world, g.t, { boost: hyper ? 1.35 : 1, airJumps: hyper ? 1 : 0 });
  if (res.jumped) emit(g, 'jump');
  if (res.bounced) emit(g, 'bounce');
  if (res.landed) emit(g, 'land');

  p.ride = -1;
  if (p.vy >= 0) {
    for (let i = 0; i < world.movers.length; i++) {
      const m = world.movers[i];
      // A couple of pixels of mercy: if it looks like a landing, it is one.
      const inX = p.x + p.w > now[i].x - 2 && p.x < now[i].x + m.w + 2;
      if (!inX) continue;
      const glued = riding === i;
      const fell = prevBottom <= before[i].y + 2 && p.y + p.h >= now[i].y;
      if (glued || fell) {
        p.y = now[i].y - p.h;
        p.vy = 0;
        if (!p.onGround && !glued) emit(g, 'land');
        p.onGround = true;
        p.ride = i;
        // Physics saw him in mid air this tick, so walking is counted here.
        const walking = Math.abs(p.vx);
        p.anim = (p.deckAnim ?? 0) + walking;
        p.deckAnim = p.anim;
        p.idle = walking === 0 && !input.left && !input.right ? (p.deckIdle ?? 0) + 1 : 0;
        p.deckIdle = p.idle;
        break;
      }
    }
  }
}

function addScore(g, n) {
  g.score += n;
  if (g.score > g.best) {
    g.best = g.score;
    emit(g, 'best', { best: g.best });
  }
}

function updateCups(g) {
  const p = g.p;
  for (const c of g.cups) {
    if (c.taken || !overlaps(p, c)) continue;
    c.taken = true;
    g.cupsTaken++;
    addScore(g, CUP_POINTS);
    emit(g, 'cup', { x: c.x, y: c.y });
    g.caffeine++;
    if (g.caffeine >= CAFFEINE_FULL) {
      g.caffeine = 0;
      g.hyperT = HYPER_TICKS;
      emit(g, 'hyper');
    }
  }
}

function hurt(g, fromX) {
  const p = g.p;
  if (p.inv > 0 || g.deadT > 0) return;
  g.battery--;
  emit(g, 'hurt');
  if (g.battery <= 0) {
    die(g, 'battery');
    return;
  }
  p.inv = 90;
  p.vy = -2.8;
  p.onGround = false;
  p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 2.2;
}

function stomp(g, b, input) {
  const p = g.p;
  p.vy = input.jump ? PHYS.STOMP_V * 1.5 : PHYS.STOMP_V;
  p.onGround = false;
  p.coyote = 0;
  b.hp--;
  if (b.hp > 0) {
    b.safe = 30;
    emit(g, 'stomp-soft', { name: `bug.${b.type}Hit`, x: b.x + b.w / 2, y: b.y });
    return;
  }
  b.dead = 1;
  g.stomped++;
  addScore(g, BUG_POINTS);
  emit(g, 'stomp', { name: `bug.${b.type}`, x: b.x + b.w / 2, y: b.y });
  g.bugs.push(...splitBug(b));
}

function updateBugs(g, world, input) {
  const p = g.p;
  // Bugs added by a split wait until the next tick to start moving.
  const count = g.bugs.length;
  for (let i = 0; i < count; i++) {
    const b = g.bugs[i];
    updateBug(b, world, g.t, p);
    if (b.dead > 0 || b.safe > 0 || !overlaps(p, b) || g.deadT > 0) continue;
    const onTop = p.vy > 0 && p.y + p.h - b.y < Math.max(9, b.h * 0.7);
    if (onTop || g.hyperT > 0) stomp(g, b, input);
    else hurt(g, b.x + b.w / 2);
  }
  // Keep the list short; a flattened bug only needs drawing for half a second.
  if (g.bugs.length > 0 && g.t % 60 === 0) g.bugs = g.bugs.filter((b) => b.dead < 40);
}

function updateGrowth(g, world) {
  for (const spot of world.grows) {
    if (g.stage < spot.stage && g.p.x >= spot.x) {
      g.stage = spot.stage;
      emit(g, 'grow-here', { to: spot.stage, x: g.p.x + 5, y: g.p.y });
    }
  }
}

function updateStalls(g, world, input) {
  const p = g.p;
  const cx = p.x + p.w / 2;
  g.stall = world.stalls.findIndex((st) => cx >= st.x && cx < st.x + st.w && p.y + p.h > st.feet - 90);
  const pressed = input.action && !g.actionHeld;
  g.actionHeld = !!input.action;
  if (pressed && g.stall >= 0) {
    const { repo } = world.stalls[g.stall];
    emit(g, 'open-repo', { url: repo.url, name: repo.name });
  }
}

function updateFinalBoss(g) {
  if (!g.boss) return;
  updateBoss(g.boss, g, {
    emit: (type, data) => emit(g, type, data),
    hurt: (fromX) => hurt(g, fromX),
    shout: (key) => {
      g.bubble = { key, x: g.boss.x + 12, y: g.boss.y, left: 150, boss: true };
      emit(g, 'bubble', { key });
    },
    defeated: () => {
      g.stomped++;
      addScore(g, BOSS_POINTS);
      emit(g, 'stomp', { name: 'bug.deadline', x: g.boss.x + 12, y: g.boss.y });
      emit(g, 'boss-down');
    },
  });
}

function updateSigns(g, world) {
  // The Deadline talks over everybody, as deadlines do.
  if (g.bubble?.boss) {
    g.bubble.x = g.boss.x + 12;
    if (--g.bubble.left <= 0) g.bubble = null;
    return;
  }
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
    near.key ??= 'souq.hello';
    if (!g.bubble || g.bubble.key !== near.key) emit(g, 'bubble', { key: near.key });
    if (!g.seen.includes(near.key)) g.seen.push(near.key);
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
      // Committing your work is good for morale, and also charges the laptop.
      g.battery = FULL_BATTERY;
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
  if (touchesTile(p, world, [T.SPIKE])) hurt(g, p.x + p.w / 2 - p.dir * 4);
  updateBugs(g, world, input);
  updateFinalBoss(g);
  if (g.deadT > 0) return;

  if (g.hyperT > 0) g.hyperT--;
  updateCups(g);
  updateGrowth(g, world);
  updateChecks(g, world);
  updateStalls(g, world, input);
  if (g.stall < 0 || g.bubble?.boss) updateSigns(g, world);
  else g.bubble = null;

  const goal = world.goal;
  const blocked = g.boss && !g.boss.defeated;
  if (!blocked && p.x + p.w > goal.x + 8 && Math.abs(p.y + p.h - goal.feet) < 40) {
    g.phase = 'clear';
    g.clearT = CLEAR_TICKS;
    emit(g, 'clear', { index: g.level });
  }
}

// From the pause menu. Allowed, counted, gently mocked at the end.
export function skipLevel(s, g) {
  if (g.phase !== 'play') return;
  g.skips++;
  g.phase = 'clear';
  g.clearT = 1;
}

export function step(s, g, input) {
  g.events.length = 0;
  g.t++;
  if (g.phase === 'play') playTick(s, g, input);
  else if (g.phase === 'clear') {
    g.clearT--;
    g.levelT++;
    if (g.clearT <= 0) nextStop(s, g);
  } else if (g.phase === 'grow') {
    g.growT--;
    const pressed = input.jump && !g.growHeld;
    g.growHeld = !!input.jump;
    if (g.growT <= 0 || (pressed && GROW_TICKS - g.growT > GROW_SKIPPABLE_AFTER)) {
      g.phase = 'play';
      loadLevel(s, g, g.level + 1);
    }
  }
}

function nextStop(s, g) {
  const next = s.worlds[g.level + 1];
  if (!next) {
    g.phase = 'ending';
    emit(g, 'ending');
  } else if (next.stage !== g.stage) {
    g.phase = 'grow';
    g.growT = GROW_TICKS;
    g.growFrom = g.stage;
    g.growTo = next.stage;
    g.growHeld = true;
    emit(g, 'grow', { to: next.stage });
  } else {
    g.phase = 'play';
    loadLevel(s, g, g.level + 1);
  }
}

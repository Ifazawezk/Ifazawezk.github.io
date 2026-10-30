import { PHYS, TILE, tileAt, isSolidTile, moveBody, T } from './physics.js';

// Each bug's behaviour is a small joke about what the bug is.
export const BUG_TYPES = {
  nullptr: { w: 12, h: 11, speed: 0.45, ai: 'walk' },
  offbyone: { w: 12, h: 10, speed: 0, ai: 'hop' },
  merge: { w: 14, h: 11, speed: 0.4, ai: 'walk', split: ['ours', 'theirs'] },
  ours: { w: 8, h: 6, speed: 0.9, ai: 'walk' },
  theirs: { w: 8, h: 6, speed: 0.9, ai: 'walk' },
  works: { w: 14, h: 14, speed: 0.25, ai: 'walk', hp: 2 },
  ref: { w: 14, h: 10, speed: 0.5, ai: 'walk' },
  replyall: { w: 16, h: 9, speed: 0.7, ai: 'fly' },
  race: { w: 12, h: 8, speed: 1.3, ai: 'walk' },
  leak: { w: 12, h: 10, speed: 0.4, ai: 'walk' },
  nplus1: { w: 14, h: 10, speed: 0.5, ai: 'walk', split: ['nplus1', 'nplus1'], miniOf: true },
  segfault: { w: 12, h: 9, speed: 0, ai: 'drop' },
  creep: { w: 14, h: 9, speed: 0.35, ai: 'grow' },
};

export const BUG_POINTS = 25;

export function makeBug(type, x, feet, opts = {}) {
  const d = BUG_TYPES[type];
  const scale = opts.scale ?? 1;
  const w = Math.round(d.w * scale);
  const h = Math.round(d.h * scale);
  return {
    type,
    x: x + (TILE - w) / 2,
    y: feet - h,
    w, h, vx: 0, vy: 0,
    dir: opts.dir ?? -1,
    hp: d.hp ?? 1,
    dead: 0,
    safe: 0,
    t: 0,
    scale,
    mini: !!opts.mini,
    onGround: false,
    hitWall: false,
    hitHead: false,
    groundTile: 0,
    homeX: x,
    homeY: feet - h - (opts.lift ?? 0),
    range: opts.range ?? 72,
    thread: null,
  };
}

function groundAhead(b, world, t) {
  const footX = b.dir > 0 ? b.x + b.w + 1 : b.x - 1;
  const cx = Math.floor(footX / TILE);
  const cy = Math.floor((b.y + b.h + 1) / TILE);
  const type = tileAt(world, cx, cy);
  return isSolidTile(type, t) || type === T.ONEWAY;
}

function walk(b, world, t, speed) {
  b.vx = b.dir * speed;
  b.vy = Math.min(b.vy + PHYS.GRAVITY, PHYS.MAX_FALL);
  const wasGround = b.onGround;
  moveBody(b, world, t);
  let turned = false;
  if (b.hitWall) {
    b.dir = -b.dir;
    turned = true;
  } else if (wasGround && b.onGround && !groundAhead(b, world, t)) {
    b.dir = -b.dir;
    turned = true;
  }
  return turned;
}

const AI = {
  walk(b, world, t) {
    walk(b, world, t, BUG_TYPES[b.type].speed);
  },

  // Always moves exactly one tile, and always one tile too far.
  hop(b, world, t) {
    if (b.onGround) {
      b.vx = 0;
      if (b.t % 56 === 0) {
        if (!groundAhead(b, world, t)) b.dir = -b.dir;
        b.vy = -2.7;
        b.vx = b.dir * 0.72;
      }
    }
    b.vy = Math.min(b.vy + PHYS.GRAVITY, PHYS.MAX_FALL);
    const vx = b.vx;
    moveBody(b, world, t);
    if (b.hitWall) b.dir = -b.dir;
    else if (!b.onGround) b.vx = vx;
  },

  fly(b, world, t) {
    const u = (b.t * BUG_TYPES.replyall.speed) / b.range;
    const x = b.homeX + Math.sin(u) * b.range;
    b.dir = Math.cos(u) >= 0 ? 1 : -1;
    b.x = x;
    b.y = b.homeY + Math.sin(b.t / 13) * 7;
  },

  // Hangs on a thread and lets go the moment you stand underneath.
  drop(b, world, t, p) {
    if (b.thread === null) b.thread = b.homeY - 4;
    if (b.state === 'fall') {
      b.vy = Math.min(b.vy + 0.3, PHYS.MAX_FALL);
      b.vx = 0;
      moveBody(b, world, t);
      if (b.onGround) {
        b.state = 'wait';
        b.waitT = 50;
      }
    } else if (b.state === 'wait') {
      if (--b.waitT <= 0) b.state = 'climb';
    } else if (b.state === 'climb') {
      b.y -= 0.8;
      if (b.y <= b.homeY) {
        b.y = b.homeY;
        b.state = 'hang';
      }
    } else if (Math.abs(p.x + p.w / 2 - (b.x + b.w / 2)) < 26 && p.y > b.y) {
      b.state = 'fall';
      b.vy = 0;
    }
  },

  // Starts small. Every time you look, it has grown.
  grow(b, world, t) {
    if (walk(b, world, t, BUG_TYPES.creep.speed) && b.scale < 2) {
      const feet = b.y + b.h;
      const mid = b.x + b.w / 2;
      b.scale = Math.min(2, b.scale + 0.25);
      b.w = Math.round(BUG_TYPES.creep.w * b.scale);
      b.h = Math.round(BUG_TYPES.creep.h * b.scale);
      b.y = feet - b.h;
      b.x = mid - b.w / 2;
    }
  },
};

export function updateBug(b, world, t, p) {
  if (b.dead > 0) {
    b.dead++;
    return;
  }
  if (Math.abs(b.x - p.x) > 280) return;
  b.t++;
  if (b.safe > 0) b.safe--;
  AI[BUG_TYPES[b.type].ai](b, world, t, p);
}

// What is left after a stomp: nothing, or a smaller problem.
export function splitBug(b) {
  const d = BUG_TYPES[b.type];
  if (!d.split || b.mini) return [];
  const feet = b.y + b.h;
  const opts = d.miniOf ? { scale: 0.6, mini: true } : {};
  return d.split.map((type, i) => makeBug(type, b.x + (i ? 6 : -6), feet, { ...opts, dir: i ? 1 : -1 }));
}

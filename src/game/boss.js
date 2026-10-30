import { PHYS, TILE, overlaps } from './physics.js';

export const BOSS_POINTS = 500;
const SHOUT_TICKS = 130;

// The Deadline: a furious desk calendar. Three stomps on the head and it starts
// negotiating. It never actually dies. It just moves to the next sprint.
export function makeBoss(spawn, world) {
  const arena1 = world.cols * TILE;
  return {
    x: spawn.x, y: spawn.feet - 40, w: 24, h: 40,
    dir: -1, hp: 3, maxHp: 3,
    awake: false, defeated: false, gone: false,
    shout: 0, dizzy: 0, safe: 0, t: 0, throwT: 170,
    arena0: arena1 - 400, arena1,
    feet: spawn.feet,
  };
}

export function bossSpeed(b) {
  return 0.55 + (b.maxHp - b.hp) * 0.28;
}

// `api` is what the boss may ask of the game: emit, hurt and shout.
export function updateBoss(b, g, api) {
  if (b.gone) return;
  const p = g.p;
  b.t++;
  if (b.shout > 0) b.shout--;
  if (b.safe > 0) b.safe--;

  if (!b.awake) {
    if (p.x > b.arena0 + 40) {
      b.awake = true;
      b.shout = SHOUT_TICKS;
      api.shout('boss.intro');
      api.emit('boss-awake');
    }
    return;
  }

  if (b.defeated) {
    if (b.shout <= 0) {
      b.dir = 1;
      b.x += 1.4;
      if (b.x > b.arena1 + 30) b.gone = true;
    }
    return;
  }

  if (b.dizzy > 0) {
    b.dizzy--;
  } else if (b.shout <= 40) {
    b.x += b.dir * bossSpeed(b);
    const left = b.arena0 + 24;
    const right = b.arena1 - 72;
    if (b.x < left) { b.x = left; b.dir = 1; }
    if (b.x > right) { b.x = right; b.dir = -1; }

    b.throwT--;
    if (b.throwT <= 0) {
      b.throwT = 190 - (b.maxHp - b.hp) * 30;
      const toPlayer = p.x < b.x ? -1 : 1;
      b.dir = toPlayer;
      g.invites.push({ x: b.x + 7, y: b.y + 10, w: 10, h: 7, vx: toPlayer * 1.25, vy: -1.5 });
      api.emit('boss-throw');
    }
  }

  for (const inv of g.invites) {
    inv.x += inv.vx;
    inv.vy = Math.min(inv.vy + 0.05, 1.6);
    inv.y += inv.vy;
    if (inv.y + inv.h > b.feet) { inv.y = b.feet - inv.h; inv.vy = -inv.vy * 0.5; }
    if (overlaps(p, inv)) { inv.dead = true; api.hurt(inv.x); }
    if (inv.x < b.arena0 - 20 || inv.x > b.arena1) inv.dead = true;
  }
  g.invites = g.invites.filter((inv) => !inv.dead);

  if (b.safe > 0 || g.deadT > 0 || !overlaps(p, b)) return;
  const stomped = p.vy > 0 && p.y + p.h - b.y < 16;
  if (stomped) {
    b.hp--;
    b.safe = 80;
    b.dizzy = 70;
    b.shout = SHOUT_TICKS;
    p.vy = PHYS.STOMP_V * 1.4;
    p.onGround = false;
    b.dir = p.x + p.w / 2 < b.x + b.w / 2 ? 1 : -1;
    api.shout(`boss.hit${b.maxHp - b.hp}`);
    api.emit('boss-hit', { x: b.x + b.w / 2, y: b.y });
    if (b.hp <= 0) {
      b.defeated = true;
      g.invites = [];
      api.defeated();
    }
  } else if (g.hyperT <= 0) {
    api.hurt(b.x + b.w / 2);
  }
}

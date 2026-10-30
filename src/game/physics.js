// Everything here is plain numbers on plain objects: no DOM, no canvas.
// One tick is 1/60 of a second. Units are art pixels.

export const TILE = 16;

export const T = {
  AIR: 0,
  SOLID: 1,
  ONEWAY: 2,
  SPIKE: 3,
  WATER: 4,
  BELT_L: 5,
  BELT_R: 6,
  BOUNCE: 7,
  BLINK_A: 8,
  BLINK_B: 9,
  SPEED: 10,
};

export const PHYS = {
  GRAVITY: 0.22,
  MAX_FALL: 4.6,
  RUN_ACCEL: 0.16,
  AIR_ACCEL: 0.12,
  FRICTION: 0.22,
  MAX_RUN: 1.75,
  JUMP_V: -4.9,
  JUMP_CUT: 0.45,
  COYOTE: 6,
  BUFFER: 7,
  BOUNCE_V: -6.6,
  STOMP_V: -3.6,
  BELT: 0.9,
  SPEED_PAD: 2.7,
  BLINK_PERIOD: 200,
};

export function tileAt(world, cx, cy) {
  if (cx < 0 || cx >= world.cols) return T.SOLID;
  if (cy < 0 || cy >= world.rows) return T.AIR;
  return world.tiles[cy * world.cols + cx];
}

// Blink platforms swap every half period, so A and B are never both there.
export function blinkPhase(t) {
  return Math.floor(t / (PHYS.BLINK_PERIOD / 2)) % 2;
}

export function isSolidTile(type, t) {
  if (type === T.SOLID || type === T.BELT_L || type === T.BELT_R) return true;
  if (type === T.BOUNCE || type === T.SPEED) return true;
  if (type === T.BLINK_A) return blinkPhase(t) === 0;
  if (type === T.BLINK_B) return blinkPhase(t) === 1;
  return false;
}

// Move one body by its velocity, one axis at a time. Sets onGround, hitWall,
// hitHead and groundTile on the body.
export function moveBody(b, world, t) {
  const EPS = 0.001;
  b.hitWall = false;
  b.hitHead = false;

  b.x += b.vx;
  if (b.vx !== 0) {
    const top = Math.floor(b.y / TILE);
    const bot = Math.floor((b.y + b.h - EPS) / TILE);
    const cx = Math.floor((b.vx > 0 ? b.x + b.w - EPS : b.x) / TILE);
    for (let cy = top; cy <= bot; cy++) {
      if (isSolidTile(tileAt(world, cx, cy), t)) {
        b.x = b.vx > 0 ? cx * TILE - b.w : (cx + 1) * TILE;
        b.vx = 0;
        b.hitWall = true;
        break;
      }
    }
  }

  const prevBottom = b.y + b.h;
  b.y += b.vy;
  b.onGround = false;
  b.groundTile = T.AIR;
  const left = Math.floor(b.x / TILE);
  const right = Math.floor((b.x + b.w - EPS) / TILE);

  if (b.vy >= 0) {
    const cy = Math.floor((b.y + b.h) / TILE);
    let best = T.AIR;
    for (let cx = left; cx <= right; cx++) {
      const type = tileAt(world, cx, cy);
      const solid = isSolidTile(type, t);
      const oneWay = type === T.ONEWAY && prevBottom <= cy * TILE + EPS;
      if (solid || oneWay) {
        // A belt or pad under one foot beats plain floor under the other.
        if (best === T.AIR || best === T.ONEWAY || best === T.SOLID) best = type;
      }
    }
    if (best !== T.AIR) {
      b.y = cy * TILE - b.h;
      b.vy = 0;
      b.onGround = true;
      b.groundTile = best;
    }
  } else {
    const cy = Math.floor(b.y / TILE);
    for (let cx = left; cx <= right; cx++) {
      if (isSolidTile(tileAt(world, cx, cy), t)) {
        b.y = (cy + 1) * TILE;
        b.vy = 0;
        b.hitHead = true;
        break;
      }
    }
  }
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// True if the body's middle touches any of the given tile types.
export function touchesTile(b, world, types) {
  const EPS = 0.001;
  const x0 = Math.floor((b.x + 2) / TILE);
  const x1 = Math.floor((b.x + b.w - 2 - EPS) / TILE);
  const y0 = Math.floor((b.y + 3) / TILE);
  const y1 = Math.floor((b.y + b.h - EPS) / TILE);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (types.includes(tileAt(world, cx, cy))) return true;
    }
  }
  return false;
}

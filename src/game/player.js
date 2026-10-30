import { PHYS, T, moveBody } from './physics.js';

export function newPlayer(x, y) {
  return {
    x, y, w: 10, h: 15, vx: 0, vy: 0,
    dir: 1, onGround: false, hitWall: false, hitHead: false, groundTile: 0,
    coyote: 0, buffer: 0, jumpHeld: false, airJumps: 0,
    inv: 0, idle: 0, anim: 0, rideDx: 0, rideDy: 0,
  };
}

// One tick of the hero. `boost` scales run speed (caffeine), `airJumps` is how
// many extra jumps he gets while caffeinated. Returns the things that happened
// so the caller can play a sound about it.
export function updatePlayer(p, input, world, t, { boost = 1, airJumps = 0 } = {}) {
  const out = { jumped: false, landed: false, bounced: false };
  const max = PHYS.MAX_RUN * boost;
  const accel = p.onGround ? PHYS.RUN_ACCEL : PHYS.AIR_ACCEL;
  const wish = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (wish !== 0) {
    p.dir = wish;
    p.vx += wish * accel * boost;
    if (p.vx > max) p.vx = Math.max(max, p.vx - PHYS.FRICTION);
    if (p.vx < -max) p.vx = Math.min(-max, p.vx + PHYS.FRICTION);
  } else if (p.onGround) {
    if (Math.abs(p.vx) <= PHYS.FRICTION) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * PHYS.FRICTION;
  } else {
    p.vx *= 0.985;
  }

  // Forgiving jump: a little late off the ledge and a little early before
  // landing both still count.
  if (input.jump && !p.jumpHeld) p.buffer = PHYS.BUFFER;
  else if (p.buffer > 0) p.buffer--;
  if (p.onGround) { p.coyote = PHYS.COYOTE; p.airJumps = airJumps; }
  else if (p.coyote > 0) p.coyote--;

  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = PHYS.JUMP_V;
    p.buffer = 0;
    p.coyote = 0;
    out.jumped = true;
  } else if (p.buffer > 0 && !p.onGround && p.airJumps > 0) {
    p.vy = PHYS.JUMP_V * 0.9;
    p.buffer = 0;
    p.airJumps--;
    out.jumped = true;
  }
  if (!input.jump && p.jumpHeld && p.vy < 0) p.vy *= PHYS.JUMP_CUT;
  p.jumpHeld = !!input.jump;

  p.vy = Math.min(p.vy + PHYS.GRAVITY, PHYS.MAX_FALL);

  const wasGround = p.onGround;
  const belt = p.onGround
    ? (p.groundTile === T.BELT_R ? PHYS.BELT : p.groundTile === T.BELT_L ? -PHYS.BELT : 0)
    : 0;
  if (p.onGround && p.groundTile === T.SPEED && wish !== 0) {
    p.vx = wish * Math.max(Math.abs(p.vx), PHYS.SPEED_PAD);
  }
  const ownVx = p.vx;
  p.vx += belt + (p.rideDx || 0);
  moveBody(p, world, t);
  if (p.vx !== 0) p.vx = ownVx;

  if (p.onGround && !wasGround) out.landed = true;
  if (p.onGround && p.groundTile === T.BOUNCE) {
    p.vy = PHYS.BOUNCE_V;
    p.onGround = false;
    p.coyote = 0;
    out.bounced = true;
  }

  p.anim = p.onGround ? p.anim + Math.abs(p.vx) : 0;
  p.idle = p.onGround && wish === 0 && p.vx === 0 ? p.idle + 1 : 0;
  if (p.inv > 0) p.inv--;
  return out;
}

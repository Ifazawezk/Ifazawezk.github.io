import { T, TILE, isSolidTile } from './game/physics.js';
import { moverPos } from './game/world.js';
import { VIEW_W, VIEW_H, GROW_TICKS } from './game/game.js';
import { makeCanvas, rect } from './art/paint.js';
import { CUP, BUGS, DEADLINE, INVITE, NPCS, PROPS } from './art/sprites.js';
import { STAGES, LAST_STAGE } from './art/faza.js';
import { bakeAll, bake, bakePair } from './art/bake.js';
import { buildTiles } from './art/tiles.js';
import { buildBackground, drawBackground } from './art/backgrounds.js';
import { getPiece, hasPiece, paintDhow, paintStall } from './art/setpieces.js';
import { drawText, textWidth } from './art/font.js';

let SPR = null;

// Sprites only need baking once, and only in a browser.
export function bakeSprites() {
  if (SPR) return SPR;
  SPR = {
    faza: STAGES.map((stage) => bakeAll(stage.frames)),
    cup: CUP.map((rows) => bake(rows)),
    bugs: Object.fromEntries(Object.entries(BUGS).map(([k, frames]) => [k, frames.map(bakePair)])),
    deadline: bakeAll(DEADLINE),
    invite: bake(INVITE),
    npcs: Object.fromEntries(Object.entries(NPCS).map(([k, frames]) => [k, frames.map(bakePair)])),
    props: bakeAll(PROPS),
  };
  return SPR;
}

const themeCache = new Map();

export function themeArt(theme) {
  if (!themeCache.has(theme)) themeCache.set(theme, { tiles: buildTiles(theme), bg: buildBackground(theme) });
  return themeCache.get(theme);
}

function hash(x, y) {
  return Math.abs((x * 73856093) ^ (y * 19349663)) >>> 3;
}

// Static tiles go on one big sheet so a frame only needs a single draw call.
export function bakeWorld(world) {
  const { tiles } = themeArt(world.theme);
  const sheet = makeCanvas(world.cols * TILE, world.rows * TILE);
  const ctx = sheet.getContext('2d');
  const animated = [];
  const at = (x, y) => (x < 0 || x >= world.cols || y < 0 || y >= world.rows ? -1 : world.tiles[y * world.cols + x]);
  const ground = (t) => t === T.SOLID || t === -1;

  for (let y = 0; y < world.rows; y++) {
    for (let x = 0; x < world.cols; x++) {
      const type = at(x, y);
      if (type === T.AIR) continue;
      const px = x * TILE;
      const py = y * TILE;
      if (type === T.SOLID) {
        const above = at(x, y - 1);
        const set = above === T.SOLID ? tiles.fill : tiles.top;
        ctx.drawImage(set[hash(x, y) % set.length], px, py);
        if (!ground(at(x - 1, y))) rect(ctx, '#1c1530', px, py, 1, TILE);
        if (!ground(at(x + 1, y))) rect(ctx, '#1c1530', px + TILE - 1, py, 1, TILE);
        if (at(x, y + 1) === T.AIR) rect(ctx, '#1c1530', px, py + TILE - 1, TILE, 1);
      } else if (type === T.ONEWAY) {
        ctx.drawImage(tiles.ledge, px, py);
      } else if (type === T.SPIKE) {
        ctx.drawImage(tiles.spike, px, py);
      } else {
        animated.push({ x: px, y: py, type, surface: at(x, y - 1) !== T.WATER });
      }
    }
  }
  return { sheet, animated };
}

export function fazaFrame(p, t) {
  if (!p.onGround) return p.vy < 0 ? 'jump' : 'fall';
  if (Math.abs(p.vx) > 0.15) return `run${Math.floor(p.anim / 7) % 4}`;
  if (p.idle > 200) return p.idle % 150 < 60 ? 'sip1' : 'sip0';
  return t % 200 < 8 ? 'idle1' : 'idle0';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  bakeSprites();

  const state = {
    camX: 0, camY: 0, shake: 0, baked: null, worldId: null, stalls: new Map(),
    reduced: false, particles: [],
  };

  function burst(x, y, colors, n = 8, speed = 1.2) {
    if (state.reduced) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      state.particles.push({
        x, y, vx: Math.cos(a) * speed * (0.4 + Math.random()), vy: Math.sin(a) * speed - 0.6,
        life: 18 + Math.random() * 14, color: colors[i % colors.length],
      });
    }
  }

  function onEvent(e, g) {
    const p = g.p;
    if (e.type === 'cup') burst(e.x + 4, e.y + 4, ['#fff7e6', '#f0d9a0', '#f7b733'], 6, 0.9);
    if (e.type === 'stomp') { burst(e.x, e.y, ['#fff7e6', '#f7b733', '#58d3e0'], 10, 1.5); }
    if (e.type === 'land') burst(p.x + 5, p.y + p.h, ['#ffffffaa'], 3, 0.5);
    if (e.type === 'hurt' || e.type === 'die') { burst(p.x + 5, p.y + 8, ['#e0403f', '#fff7e6'], 10, 1.6); state.shake = 6; }
    if (e.type === 'boss-hit') { burst(e.x, e.y, ['#e0403f', '#fff7e6', '#f7b733'], 16, 2.2); state.shake = 10; }
    if (e.type === 'checkpoint') burst(p.x + 5, p.y, ['#8fd14f', '#fff7e6'], 8, 1.1);
    if (e.type === 'grow-here') burst(e.x, e.y, ['#f7b733', '#fff7e6', '#58d3e0'], 18, 1.8);
  }

  function ensureWorld(world) {
    if (state.worldId === world) return;
    state.worldId = world;
    state.baked = bakeWorld(world);
    state.particles.length = 0;
    state.stalls.clear();
    for (const stall of world.stalls) state.stalls.set(stall, paintStall(stall.repo, stall.index));
  }

  function camera(g, world, snap) {
    const p = g.p;
    const maxX = world.cols * TILE - VIEW_W;
    const maxY = Math.max(0, world.rows * TILE - VIEW_H);
    let tx = p.x + p.w / 2 - VIEW_W / 2 + p.dir * 28;
    let ty = p.y - 96;
    let lo = 0;
    let hi = maxX;
    if (g.boss && g.boss.awake && !g.boss.gone) {
      lo = g.boss.arena0;
      hi = g.boss.arena1 - VIEW_W;
    }
    tx = Math.max(lo, Math.min(tx, hi));
    ty = Math.max(0, Math.min(ty, maxY));
    if (snap) {
      state.camX = tx;
      state.camY = ty;
    } else {
      state.camX += (tx - state.camX) * 0.09;
      state.camY += (ty - state.camY) * 0.08;
    }
  }

  function drawTiles(world, g, art, cx, cy) {
    ctx.drawImage(state.baked.sheet, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    const frame4 = Math.floor(g.t / 10) % 4;
    const belt = Math.floor(g.t / 5) % 4;
    for (const a of state.baked.animated) {
      const sx = a.x - cx;
      if (sx < -TILE || sx > VIEW_W) continue;
      const sy = a.y - cy;
      if (a.type === T.WATER) {
        if (a.surface) ctx.drawImage(art.tiles.water[frame4], sx, sy);
        else ctx.drawImage(art.tiles.water[frame4], 0, 8, 16, 8, sx, sy, 16, 16);
      } else if (a.type === T.BELT_L) {
        ctx.drawImage(art.tiles.belt[3 - belt], sx, sy);
      } else if (a.type === T.BELT_R) {
        ctx.drawImage(art.tiles.belt[belt], sx, sy);
      } else if (a.type === T.BOUNCE) {
        ctx.drawImage(art.tiles.bounce[Math.floor(g.t / 16) % 2], sx, sy);
      } else if (a.type === T.SPEED) {
        ctx.drawImage(art.tiles.speed[frame4], sx, sy);
      } else if (a.type === T.BLINK_A || a.type === T.BLINK_B) {
        const set = a.type === T.BLINK_A ? art.tiles.blinkA : art.tiles.blinkB;
        const live = isSolidTile(a.type, g.t);
        // Flicker for the last 40 ticks, so a vanishing tile warns you first.
        const flicker = live && !isSolidTile(a.type, g.t + 40) && Math.floor(g.t / 4) % 2 === 0;
        ctx.drawImage(live && !flicker ? set.on : set.off, sx, sy);
      }
    }
  }

  function drawProp(p, cx, cy, t, wantFront) {
    if (p.front !== wantFront) return;
    const img = hasPiece(p.kind) ? getPiece(p.kind) : SPR.props[p.kind]?.[1];
    if (!img) return;
    const x = p.x - cx;
    if (x < -160 || x > VIEW_W + 10) return;
    ctx.drawImage(img, x, p.feet - img.height - cy);
  }

  function drawMover(world, m, g, cx, cy) {
    const pos = moverPos(m, g.t);
    const x = Math.round(pos.x - cx);
    const y = Math.round(pos.y - cy);
    if (x > VIEW_W + 40 || x + m.w < -40) return;
    const ink = '#1c1530';
    if (m.kind === 'felucca') {
      rect(ctx, '#1c1530', x + 2, y, m.w - 4, 8);
      rect(ctx, '#a86b3c', x + 3, y + 1, m.w - 6, 2);
      rect(ctx, '#6e4226', x + 5, y + 3, m.w - 10, 3);
      rect(ctx, '#1c1530', x + 6, y + 6, m.w - 12, 2);
      rect(ctx, ink, x + 14, y - 34, 2, 34);
      for (let i = 0; i < 30; i++) rect(ctx, i % 11 === 10 ? '#d8cfc0' : '#fff7e6', x + 16, y - 34 + i, Math.round(i * 0.9) + 2, 1);
    } else if (m.kind === 'lift') {
      rect(ctx, ink, x, y, m.w, 10);
      rect(ctx, '#cfe3d6', x + 1, y + 1, m.w - 2, 8);
      drawText(ctx, m.label, x + 3, y + 2, '#2c4a40', { font: 'tiny' });
    } else if (m.kind === 'bar') {
      rect(ctx, ink, x, y, m.w, 200);
      rect(ctx, m.color ?? '#f7b733', x + 1, y + 1, m.w - 2, 200);
      rect(ctx, '#ffffff55', x + 1, y + 1, 3, 200);
      rect(ctx, '#fff7e6', x + 1, y + 1, m.w - 2, 2);
    } else if (m.kind === 'crate') {
      rect(ctx, ink, x, y, m.w, 14);
      rect(ctx, '#3f7fd1', x + 1, y + 1, m.w - 2, 12);
      for (let i = x + 4; i < x + m.w - 2; i += 5) rect(ctx, '#2a4d91', i, y + 2, 2, 10);
      rect(ctx, '#58d3e0', x + 1, y + 1, m.w - 2, 1);
    } else if (m.kind === 'dhow') {
      paintDhow(ctx, x, y - 34, m.w);
    } else {
      rect(ctx, ink, x, y, m.w, 8);
      rect(ctx, '#a86b3c', x + 1, y + 1, m.w - 2, 5);
    }
  }

  function drawGoal(world, g, cx, cy) {
    const goal = world.goal;
    const kind = world.goalKind;
    if (!kind) return;
    const img = getPiece(kind);
    ctx.drawImage(img, goal.x - 8 - cx, goal.feet - img.height - cy);
  }

  function drawSigns(world, g, cx, cy) {
    for (const s of world.signs) {
      const x = s.x - cx;
      if (x < -24 || x > VIEW_W) continue;
      ctx.drawImage(SPR.props.sign[1], x, s.feet - 14 - cy);
      // A little bang above signs you have not read yet.
      if (!g.seen?.includes(s.key)) {
        const bob = Math.floor(g.t / 14) % 2;
        rect(ctx, '#f7b733', x + 7, s.feet - 25 - cy + bob, 2, 5);
        rect(ctx, '#f7b733', x + 7, s.feet - 19 - cy + bob, 2, 2);
      }
    }
    world.checkpoints.forEach((c, i) => {
      const x = c.drawX - cx;
      if (x < -24 || x > VIEW_W) return;
      const on = g.checksOn?.includes(i);
      const img = on ? SPR.props[Math.floor(g.t / 20) % 2 ? 'flagUp1' : 'flagUp0'][1] : SPR.props.flagDown[1];
      ctx.drawImage(img, x, c.feet - img.height - cy);
    });
    for (const n of world.npcs) {
      const x = n.x - cx;
      if (x < -40 || x > VIEW_W + 10) continue;
      const frames = SPR.npcs[n.kind];
      const frame = frames[Math.floor((g.t + n.x) / 45) % frames.length];
      const face = n.flip ? -1 : 1;
      ctx.drawImage(frame[face], x, n.feet - frame[1].height - cy);
    }
  }

  function drawCups(g, cx, cy) {
    const frame = Math.floor(g.t / 16) % 2;
    for (const c of g.cups ?? []) {
      if (c.taken) continue;
      const x = c.x - cx;
      if (x < -10 || x > VIEW_W) continue;
      const bob = Math.round(Math.sin((g.t + c.x) / 16));
      ctx.drawImage(SPR.cup[frame], x, c.y - cy + bob);
    }
  }

  function drawBugs(g, cx, cy) {
    for (const b of g.bugs ?? []) {
      if (b.dead > 30) continue;
      const x = b.x - cx;
      if (x < -40 || x > VIEW_W + 10) continue;
      const frames = SPR.bugs[b.type];
      const squashed = b.dead > 0;
      const frame = squashed ? frames[2] : frames[Math.floor(g.t / 10) % 2];
      const img = frame[b.dir];
      if (squashed && g.t % 4 < 2 && b.dead > 16) continue;
      const scale = b.scale ?? 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const dx = Math.round(x + b.w / 2 - w / 2);
      const dy = Math.round(b.y + b.h - h - cy);
      if (b.thread != null) rect(ctx, '#d8cfc0', Math.round(x + b.w / 2), b.thread - cy, 1, b.y - b.thread);
      ctx.drawImage(img, dx, dy, w, h);
    }
  }

  function drawBoss(g, cx, cy) {
    const b = g.boss;
    if (!b || b.gone) return;
    const x = Math.round(b.x - cx);
    const y = Math.round(b.y + b.h - 44 - cy);
    let name = Math.floor(g.t / 12) % 2 ? 'walk0' : 'walk1';
    if (b.shout > 0) name = 'shout';
    if (b.dizzy > 0 || b.defeated) name = 'dizzy';
    if (b.dizzy > 0 && g.t % 6 < 3) return;
    ctx.drawImage(SPR.deadline[name][b.dir], x, y);
    for (const inv of g.invites ?? []) ctx.drawImage(SPR.invite, Math.round(inv.x - cx), Math.round(inv.y - cy));
  }

  // Old Faza and new Faza flicker back and forth, faster and faster, then pop.
  function drawGrowth(g) {
    const u = 1 - g.growT / GROW_TICKS;
    ctx.fillStyle = '#1c1530';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 44, VIEW_W, 96);
    ctx.globalAlpha = 1;
    const swapEvery = Math.max(2, Math.round(16 - u * 20));
    const grown = u >= 0.62 || (u > 0.15 && Math.floor(g.t / swapEvery) % 2 === 0);
    const stage = grown ? g.growTo : g.growFrom;
    const img = SPR.faza[stage][u >= 0.62 && Math.floor(g.t / 10) % 2 ? 'cheer' : 'idle0'][1];
    const w = img.width * 3;
    const h = img.height * 3;
    ctx.drawImage(img, Math.round(VIEW_W / 2 - w / 2), 136 - h, w, h);
    if (u >= 0.62 && u < 0.67 && !state.reduced) {
      ctx.fillStyle = '#fff7e6';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function drawPlayer(g, cx, cy) {
    const p = g.p;
    if (p.inv > 0 && g.t % 6 < 3) return;
    if (g.phase === 'ending' || g.phase === 'grow') return;
    const name = g.deadT > 0 ? 'hurt' : g.phase === 'clear' ? 'cheer' : fazaFrame(p, g.t);
    const img = SPR.faza[g.stage ?? 2][name][p.dir];
    const jitter = g.hyperT > 0 && !state.reduced ? (g.t % 2) * 2 - 1 : 0;
    const x = Math.round(p.x + p.w / 2 - img.width / 2 - cx) + jitter;
    const y = Math.round(p.y + p.h - img.height - cy);
    ctx.drawImage(img, x, y);
    if (g.hyperT > 0 && g.t % 3 === 0) rect(ctx, '#f7b733', x + 3 + (g.t % 10), y + (g.t % 16), 1, 1);
  }

  function drawParticles(cx, cy) {
    const ps = state.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.x += q.vx;
      q.y += q.vy;
      q.vy += 0.06;
      q.life--;
      if (q.life <= 0) ps.splice(i, 1);
      else rect(ctx, q.color, Math.round(q.x - cx), Math.round(q.y - cy), 2, 2);
    }
  }

  function draw(g, world, opts = {}) {
    ensureWorld(world);
    camera(g, world, opts.snap);
    const art = themeArt(world.theme);
    let shakeX = 0;
    let shakeY = 0;
    if (state.shake > 0) {
      state.shake--;
      if (!state.reduced) {
        shakeX = (state.shake % 2) * 2 - 1;
        shakeY = ((state.shake >> 1) % 2) * 2 - 1;
      }
    }
    const cx = Math.round(state.camX) + shakeX;
    const cy = Math.round(state.camY) + shakeY;

    drawBackground(ctx, art.bg, cx, cy, g.t);
    for (const p of world.props) drawProp(p, cx, cy, g.t, false);
    drawGoal(world, g, cx, cy);
    for (const stall of world.stalls) {
      const x = stall.x - cx;
      if (x > -STALL_MARGIN && x < VIEW_W + 4) ctx.drawImage(state.stalls.get(stall), x, stall.feet - 72 - cy);
    }
    drawTiles(world, g, art, cx, cy);
    drawSigns(world, g, cx, cy);
    for (const m of world.movers) drawMover(world, m, g, cx, cy);
    drawCups(g, cx, cy);
    drawBugs(g, cx, cy);
    drawBoss(g, cx, cy);
    drawPlayer(g, cx, cy);
    for (const p of world.props) drawProp(p, cx, cy, g.t, true);
    drawParticles(cx, cy);
    if (g.phase === 'grow') drawGrowth(g);
    state.lastCx = cx;
    state.lastCy = cy;
  }

  return {
    ctx,
    draw,
    onEvent,
    state,
    setReduced(v) { state.reduced = v; },
    toScreen(x, y) { return { x: x - state.camX, y: y - state.camY }; },
  };
}

const STALL_MARGIN = 96;

// One small sprite on a dark tile, repeated behind the screen as wallpaper.
export function paintWallpaper(el) {
  bakeSprites();
  const size = 72;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  rect(ctx, '#17132b', 0, 0, size, size);
  ctx.globalAlpha = 0.16;
  ctx.drawImage(SPR.cup[0], 6, 8);
  ctx.drawImage(SPR.bugs.nullptr[0][1], 42, 22);
  ctx.drawImage(SPR.bugs.offbyone[0][1], 12, 50);
  ctx.drawImage(SPR.cup[1], 54, 54);
  ctx.globalAlpha = 1;
  el.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
  el.style.backgroundSize = `${size * 3}px`;
}

function firework(ctx, cx, cy, t, colors) {
  const age = t % 90;
  if (age > 46) return;
  const radius = age * 0.75;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * radius);
    const y = Math.round(cy + Math.sin(a) * radius + age * age * 0.012);
    rect(ctx, colors[i % colors.length], x, y, age > 34 ? 1 : 2, age > 34 ? 1 : 2);
  }
}

// The Doha night scene that the title, the ending, the social card and the
// profile animation all share. It only uses the real game art.
export function drawPostcard(ctx, opts) {
  const {
    t = 0, ending = false, reduced = false, camX = t * 0.25, floorY = 148,
    faza = null, fazaX = 96, boss = !ending, dhow = true,
  } = opts;
  bakeSprites();
  const art = themeArt('corniche');
  const scroll = reduced ? 0 : camX;
  drawBackground(ctx, art.bg, scroll, 0, t);

  if (dhow) {
    const x = reduced ? 190 : 340 - ((t * 0.18) % 520);
    paintDhow(ctx, Math.round(x), floorY - 42, 92);
  }
  if (ending && !reduced) {
    firework(ctx, 70, 44, t, ['#f7b733', '#fff7e6']);
    firework(ctx, 170, 34, t + 30, ['#7a2d3d', '#fff7e6', '#f08fa8']);
    firework(ctx, 262, 56, t + 60, ['#58d3e0', '#fff7e6']);
  }

  for (let x = -16; x < VIEW_W + 16; x += TILE) {
    const n = (Math.floor(x / TILE) + 8) % 4;
    ctx.drawImage(art.tiles.top[n], x, floorY);
    ctx.drawImage(art.tiles.fill[n], x, floorY + TILE);
    ctx.drawImage(art.tiles.fill[(n + 1) % 4], x, floorY + TILE * 2);
  }

  const lamp = SPR.props.lamp[1];
  ctx.drawImage(lamp, 22, floorY - lamp.height);
  const palm = SPR.props.palm[1];
  ctx.drawImage(palm, 236, floorY - palm.height);

  const name = faza ?? (ending ? (Math.floor(t / 20) % 2 ? 'cheer' : 'idle0') : (t % 240 < 120 ? 'sip1' : 'sip0'));
  const img = SPR.faza[opts.stage ?? LAST_STAGE][name][1];
  ctx.drawImage(img, Math.round(fazaX), floorY - img.height);
  const cupFrame = Math.floor(t / 16) % 2;
  ctx.drawImage(SPR.cup[cupFrame], Math.round(fazaX) + 26, floorY - 10);

  // The Deadline, peeking in from the edge of the title. It knows.
  if (boss) {
    const peek = 300 + Math.round(Math.sin(t / 50) * 4);
    ctx.drawImage(SPR.deadline.walk0[-1], peek, floorY - 44);
  }
}

export { drawText, textWidth, rect };

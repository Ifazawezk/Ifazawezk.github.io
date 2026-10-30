import { T, TILE } from './game/physics.js';
import { newPlayer, updatePlayer } from './game/player.js';
import { FAZA } from './art/sprites.js';
import { bakeAll } from './art/bake.js';

const rows = [...Array(9).fill(' '.repeat(40)), '#'.repeat(14) + '    ' + '#'.repeat(22), '#'.repeat(14) + '    ' + '#'.repeat(22)];
const cols = 40;
const tiles = new Uint8Array(cols * rows.length);
rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') tiles[y * cols + x] = T.SOLID; }));
const world = { cols, rows: rows.length, tiles };

const ctx = document.getElementById('game').getContext('2d');
const sprites = bakeAll(FAZA);
const held = new Set();
addEventListener('keydown', (e) => held.add(e.code));
addEventListener('keyup', (e) => held.delete(e.code));
let p = newPlayer(24, 100);
let t = 0;

function frameName() {
  if (!p.onGround) return p.vy < 0 ? 'jump' : 'fall';
  if (Math.abs(p.vx) > 0.1) return `run${Math.floor(p.anim / 8) % 4}`;
  return t % 180 < 8 ? 'idle1' : 'idle0';
}

function frame() {
  t++;
  updatePlayer(p, {
    left: held.has('ArrowLeft') || held.has('KeyA'),
    right: held.has('ArrowRight') || held.has('KeyD'),
    jump: held.has('Space') || held.has('ArrowUp') || held.has('KeyW'),
  }, world, t);
  if (p.y > 220) p = newPlayer(24, 100);
  const camX = Math.max(0, Math.min(p.x - 150, cols * TILE - 320));
  ctx.fillStyle = '#87b5c9';
  ctx.fillRect(0, 0, 320, 180);
  ctx.fillStyle = '#3c2b22';
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i]) ctx.fillRect(Math.round((i % cols) * TILE - camX), Math.floor(i / cols) * TILE, TILE, TILE);
  }
  ctx.drawImage(sprites[frameName()][p.dir], Math.round(p.x - 3 - camX), Math.round(p.y + p.h - 18));
  requestAnimationFrame(frame);
}
frame();

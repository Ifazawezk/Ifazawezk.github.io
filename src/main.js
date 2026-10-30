import { createSession, createGame, startRun, step, worldOf } from './game/game.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';

const TICK = 1000 / 60;

const session = createSession();
const game = createGame();
const renderer = createRenderer(document.getElementById('game'));
const ui = createUI({ lang: 'en', boringHref: () => 'boring/' });
const input = createInput(() => { if (game.phase === 'title') begin(); });

function begin() {
  startRun(session, game);
}

function handleEvents() {
  for (const e of game.events) {
    renderer.onEvent(e, game);
    if (e.type === 'level') ui.showBanner(`level.${e.id}`, `level.${e.id}.sub`);
  }
}

let last = performance.now();
let extra = 0;

function frame(now) {
  extra += Math.min(now - last, 100);
  last = now;
  while (extra >= TICK) {
    step(session, game, input.read());
    handleEvents();
    extra -= TICK;
  }
  renderer.draw(game, worldOf(session, game));
  ui.update(game, renderer);
  requestAnimationFrame(frame);
}

begin();
requestAnimationFrame(frame);

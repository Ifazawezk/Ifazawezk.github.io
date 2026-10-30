import { createSession, createGame, startRun, step, worldOf } from './game/game.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { makeStore } from './store.js';

const TICK = 1000 / 60;
const COMMITS = ['fix', 'fix2', 'final', 'final_final', 'final_final_v2'];

const store = makeStore();
const session = createSession();
const game = createGame();
game.best = store.get('best', 0);
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
    if (e.type === 'best') store.set('best', e.best);
    if (e.type === 'stomp' || e.type === 'stomp-soft') {
      const pos = renderer.toScreen(e.x, e.y - 6);
      ui.float(ui.t(e.name), pos.x, pos.y);
    }
    if (e.type === 'die') {
      const pos = renderer.toScreen(game.p.x, game.p.y - 12);
      ui.float(ui.t(`die.${e.why}`), pos.x, pos.y, 'bad');
    }
    if (e.type === 'checkpoint') {
      const pos = renderer.toScreen(game.p.x, game.p.y - 20);
      const name = COMMITS[Math.min(e.n, COMMITS.length) - 1];
      ui.float(`git commit -m "${name}"`, pos.x, pos.y, 'good');
    }
    if (e.type === 'hyper') {
      const pos = renderer.toScreen(game.p.x, game.p.y - 12);
      ui.float(ui.t('ui.caffeine'), pos.x, pos.y);
    }
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

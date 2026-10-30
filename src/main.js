import {
  createSession, createGame, startRun, step, worldOf, skipLevel, setRepos,
} from './game/game.js';
import { SOUQ_INDEX } from './game/levels/index.js';
import { createRenderer, drawPostcard, paintWallpaper } from './render.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { makeStore } from './store.js';
import { loadRepos } from './repos.js';
import { createSound } from './audio/sound.js';
import { TRACK_OF_LEVEL } from './audio/music.js';

const TICK = 1000 / 60;
const COMMITS = ['fix', 'fix2', 'final', 'final_final', 'final_final_v2'];
const query = new URLSearchParams(location.search);
const touchDevice = matchMedia('(pointer: coarse)').matches || query.has('touch');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const store = makeStore();
const session = createSession([]);
const game = createGame();
game.best = store.get('best', 0);

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
renderer.setReduced(reducedMotion.matches);
reducedMotion.addEventListener?.('change', (e) => renderer.setReduced(e.matches));

const askedLang = query.get('lang');
const startLang = askedLang === 'ar' || askedLang === 'en' ? askedLang : store.get('lang', 'en');
const ui = createUI({
  lang: startLang,
  boringHref: (lang) => (lang === 'ar' ? 'boring/ar/' : 'boring/'),
  touch: touchDevice,
});

const sound = createSound({ muted: store.get('muted', false) });
ui.setMuted(sound.muted);

const app = { paused: false, newBest: false, startBest: game.best, pendingRepos: null, frozen: false };

// ---- Starting, stopping ---------------------------------------------------

function begin() {
  startRun(session, game);
  app.paused = false;
  app.newBest = false;
  app.startBest = game.best;
  ui.forgetEnding();
  ui.hideGrowth();
  ui.showScreen(null);
  ui.els.shell.classList.add('playing');
}

function pause() {
  if (game.phase === 'title' || game.phase === 'ending' || app.paused) return;
  app.paused = true;
  input.clear();
  sound.pause();
  ui.showScreen('pause');
}

function resume() {
  if (!app.paused) return;
  app.paused = false;
  input.clear();
  sound.resume();
  ui.showScreen(null);
  last = performance.now();
}

function toggleLang() {
  ui.state.lang = ui.state.lang === 'ar' ? 'en' : 'ar';
  store.set('lang', ui.state.lang);
  ui.applyLang();
}

function toggleMute() {
  sound.setMuted(!sound.muted);
  store.set('muted', sound.muted);
  ui.setMuted(sound.muted);
}

// Opening a tab must happen inside the key press or tap itself. Do it any later
// and the browser treats it as a popup.
function openStall() {
  if (game.phase !== 'play' || game.stall < 0) return false;
  window.open(worldOf(session, game).stalls[game.stall].repo.url, '_blank', 'noopener');
  sound.play('open');
  return true;
}

const input = createInput({
  onKey(e, isAction) {
    sound.unlock();
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (app.paused) resume();
      else pause();
      return;
    }
    if (game.phase === 'title') {
      if (e.code !== 'Tab' && !e.target?.closest?.('a, button')) begin();
      return;
    }
    if (!app.paused && isAction) openStall();
  },
});

addEventListener('pointerdown', () => sound.unlock(), { capture: true });

// ---- Things that happen ---------------------------------------------------

function floatAt(text, x, y, tone) {
  const pos = renderer.toScreen(x, y);
  ui.float(text, pos.x, pos.y, tone);
}

const SOUND_OF = {
  jump: 'jump', bounce: 'bounce', land: 'land', cup: 'cup', stomp: 'stomp', 'stomp-soft': 'soft',
  hurt: 'hurt', die: 'die', checkpoint: 'checkpoint', hyper: 'hyper', clear: 'clear', grow: 'grow',
  'grow-here': 'grow', 'boss-hit': 'boss-hit', 'boss-throw': 'boss-throw', ending: 'ending',
};

function handleEvents() {
  for (const e of game.events) {
    renderer.onEvent(e, game);
    sound.play(SOUND_OF[e.type]);
    if (e.type === 'level') {
      ui.hideGrowth();
      ui.showBanner(`level.${e.id}`, `level.${e.id}.sub`);
      sound.music(TRACK_OF_LEVEL[e.id]);
      if (app.pendingRepos) {
        setRepos(session, game, app.pendingRepos);
        app.pendingRepos = null;
      }
    }
    if (e.type === 'boss-awake') sound.music('boss');
    if (e.type === 'boss-down') sound.music('night');
    if (e.type === 'best') {
      store.set('best', e.best);
      app.newBest = e.best > app.startBest;
    }
    if (e.type === 'stomp' || e.type === 'stomp-soft') floatAt(ui.t(e.name), e.x, e.y - 6);
    if (e.type === 'die') floatAt(ui.t(`die.${e.why}`), game.p.x, game.p.y - 12, 'bad');
    if (e.type === 'hyper') floatAt(ui.t('ui.caffeine'), game.p.x, game.p.y - 12);
    if (e.type === 'grow') ui.showGrowth(e.to);
    if (e.type === 'grow-here') floatAt(ui.t(`grow.${e.to}`), e.x, e.y - 8, 'good');
    if (e.type === 'checkpoint') {
      const name = COMMITS[Math.min(e.n, COMMITS.length) - 1];
      floatAt(`git commit -m "${name}"`, game.p.x, game.p.y - 20, 'good');
    }
    if (e.type === 'ending') {
      ui.hideBanner();
      ui.fillEnding(game, session.totalCups, app.newBest);
      ui.showScreen('ending');
      ui.els.shell.classList.remove('playing');
      sound.stopMusic();
    }
  }
}

// ---- Layout ---------------------------------------------------------------

function layout() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const portrait = vh > vw;
  const dpr = window.devicePixelRatio || 1;
  const { shell } = ui.els;
  shell.classList.toggle('touch', touchDevice);
  shell.classList.toggle('portrait', touchDevice && portrait);
  shell.classList.toggle('landscape', touchDevice && !portrait);

  let scale;
  if (touchDevice && portrait) {
    scale = vw / 320;
  } else if (touchDevice) {
    scale = Math.min(vw / 320, vh / 180);
  } else {
    scale = Math.min((vw - 24) / 320, (vh - 92) / 180);
    // Whole device pixels keep the art crisp, when there is room for it.
    const crisp = Math.floor(scale * dpr) / dpr;
    if (crisp >= 2) scale = crisp;
  }
  document.documentElement.style.setProperty('--s', scale);
  ui.dockBubble(touchDevice && portrait);
}

addEventListener('resize', layout);
addEventListener('orientationchange', layout);

// ---- Wiring ---------------------------------------------------------------

function bindClick(id, fn) {
  document.getElementById(id).addEventListener('click', (e) => {
    fn(e);
    // A clicked button keeps focus, and then Space would press it, not jump.
    e.currentTarget.blur();
  });
}

bindClick('lang', toggleLang);
bindClick('btn-mute', toggleMute);
bindClick('btn-pause', () => (app.paused ? resume() : pause()));
bindClick('pause-resume', resume);
bindClick('pause-skip', () => {
  skipLevel(session, game);
  resume();
});
bindClick('end-again', begin);

ui.els.title.addEventListener('click', (e) => {
  if (!e.target.closest('a, button') && game.phase === 'title') begin();
});

// Tapping the world at a stall counts too. It is a real click, so no popup block.
canvas.addEventListener('click', openStall);

input.bindDpad(document.getElementById('dpad'));
input.bindJump(document.getElementById('btn-jump'));

addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// ---- The loop -------------------------------------------------------------

let last = performance.now();
let extra = 0;

function draw(snap = false) {
  const world = worldOf(session, game);
  if (game.phase === 'title' || game.phase === 'ending') {
    drawPostcard(renderer.ctx, {
      t: performance.now() / (1000 / 60),
      ending: game.phase === 'ending',
      reduced: reducedMotion.matches,
      fazaX: game.phase === 'ending' ? 34 : 96,
    });
  } else {
    renderer.draw(game, world, { snap: snap || game.levelT < 2 });
  }
  ui.update(game, world, renderer);
}

function frame(now) {
  if (!app.paused && !app.frozen) {
    extra += Math.min(now - last, 100);
    while (extra >= TICK) {
      step(session, game, input.read());
      handleEvents();
      extra -= TICK;
    }
  }
  last = now;
  draw();
  requestAnimationFrame(frame);
}

ui.showScreen('title');
layout();
paintWallpaper(document.body);
requestAnimationFrame(frame);

loadRepos({ store }).then(({ repos, source }) => {
  document.documentElement.dataset.repos = source;
  if (game.phase === 'play' && game.level === SOUQ_INDEX) app.pendingRepos = repos;
  else setRepos(session, game, repos);
});

// ---- Test hook ------------------------------------------------------------
// With ?dev in the address the browser test can drive the real game loop.

if (query.has('dev')) {
  app.frozen = true;
  window.__faza = {
    game,
    session,
    begin,
    pause,
    resume,
    run(keys) {
      for (const b of keys) {
        step(session, game, { left: !!(b & 1), right: !!(b & 2), jump: !!(b & 4), action: !!(b & 8) });
        handleEvents();
        ui.update(game, worldOf(session, game), renderer);
      }
      draw(true);
      return { phase: game.phase, level: game.level, x: game.p.x };
    },
    unfreeze() { app.frozen = false; last = performance.now(); },
    draw,
    world: () => worldOf(session, game),
  };
}

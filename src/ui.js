import { say, STRINGS, LINKS } from './content/strings.js';
import { describeRepo } from './content/repoNotes.js';
import { pickJoke, formatTime } from './content/ending.js';
import { VIEW_W, VIEW_H, CAFFEINE_FULL } from './game/game.js';

// Everything translatable sits in the DOM on top of the canvas, so Arabic gets
// real shaping and screen readers get real text. The canvas never holds words
// that need translating.

const $ = (id) => document.getElementById(id);

export function createUI({ lang, boringHref, touch }) {
  const els = {
    root: document.documentElement,
    shell: $('shell'),
    stage: $('stage'),
    bubble: $('bubble'),
    bubbleTitle: $('bubble-title'),
    bubbleText: $('bubble-text'),
    bubbleMeta: $('bubble-meta'),
    bubbleLink: $('bubble-link'),
    bubbleTail: $('bubble-tail'),
    overlay: $('overlay'),
    dock: $('dock'),
    banner: $('banner'),
    bannerTitle: $('banner-title'),
    bannerSub: $('banner-sub'),
    growCard: $('grow-card'),
    growTitle: $('grow-title'),
    growSub: $('grow-sub'),
    boring: $('boring'),
    langBtn: $('lang'),
    cups: $('cups'),
    score: $('score'),
    best: $('best'),
    meter: $('meter-fill'),
    battery: $('hud-battery'),
    cells: [...$('hud-battery').children],
    floats: $('floats'),
    live: $('live'),
    hint: $('hint'),
    title: $('screen-title'),
    pause: $('screen-pause'),
    ending: $('screen-ending'),
    endRows: $('end-rows'),
    endJoke: $('end-joke'),
    endBest: $('end-best'),
    action: $('btn-action'),
    mute: $('btn-mute'),
    linkedin: $('end-linkedin'),
    github: $('end-github'),
    boringEnd: $('end-boring'),
    boringPause: $('pause-boring'),
  };

  const state = {
    lang, bannerT: 0, hud: {}, bubbleKey: null, endingShown: false, bannerKeys: null, growStage: null, muted: false,
  };

  function t(key) {
    return say(state.lang, key);
  }

  function applyLang() {
    const dir = STRINGS[state.lang].dir;
    els.root.lang = state.lang;
    els.root.dataset.lang = state.lang;
    // The stage keeps its layout; only the words change direction.
    for (const node of document.querySelectorAll('[data-dir]')) node.dir = dir;
    els.langBtn.textContent = t('ui.lang');
    els.langBtn.setAttribute('aria-label', t('ui.langLabel'));
    for (const a of [els.boring, els.boringEnd, els.boringPause]) a.href = boringHref(state.lang);
    for (const node of document.querySelectorAll('[data-t]')) node.textContent = t(node.dataset.t);
    for (const node of document.querySelectorAll('[data-t-aria]')) node.setAttribute('aria-label', t(node.dataset.tAria));
    els.hint.textContent = t(touch ? 'ui.controlsTouch' : 'ui.controls');
    $('title-start').textContent = t(touch ? 'ui.startTouch' : 'ui.start');
    if (state.bannerKeys) {
      els.bannerTitle.textContent = t(state.bannerKeys[0]);
      els.bannerSub.textContent = t(state.bannerKeys[1]);
    }
    if (state.growStage !== null) showGrowth(state.growStage);
    state.bubbleKey = null;
    setMuted(state.muted);
    if (state.endingShown) fillEnding(state.lastGame, state.lastTotal, state.lastNewBest);
  }

  function setMuted(muted) {
    state.muted = muted;
    els.mute.setAttribute('aria-pressed', String(muted));
    els.mute.setAttribute('aria-label', t(muted ? 'ui.soundOff' : 'ui.soundOn'));
    els.mute.title = t(muted ? 'ui.soundOff' : 'ui.soundOn');
  }

  function showBanner(titleKey, subKey) {
    state.bannerKeys = [titleKey, subKey];
    els.bannerTitle.textContent = t(titleKey);
    els.bannerSub.textContent = t(subKey);
    els.banner.hidden = false;
    state.bannerT = 170;
  }

  function hideBanner() {
    els.banner.hidden = true;
    state.bannerT = 0;
    state.bannerKeys = null;
  }

  function showGrowth(stage) {
    state.growStage = stage;
    els.growTitle.textContent = t(`grow.${stage}`);
    els.growSub.textContent = t(`grow.${stage}.sub`);
    els.growCard.hidden = false;
  }

  function hideGrowth() {
    state.growStage = null;
    els.growCard.hidden = true;
  }

  function placeTail(screenX) {
    const pct = Math.max(5, Math.min(95, (screenX / VIEW_W) * 100));
    els.bubbleTail.style.left = `${pct}%`;
  }

  function hideBubble() {
    if (els.bubble.hidden) return;
    els.bubble.hidden = true;
    state.bubbleKey = null;
    els.bubbleText.textContent = '';
  }

  function showSign(key) {
    if (state.bubbleKey === key) return;
    state.bubbleKey = key;
    els.bubble.hidden = false;
    els.bubble.classList.remove('stall');
    els.bubbleTitle.hidden = true;
    els.bubbleMeta.hidden = true;
    els.bubbleLink.hidden = true;
    els.bubbleText.textContent = t(key);
    els.live.textContent = t(key);
  }

  function showStall(stall) {
    const { repo } = stall;
    const key = `stall:${repo.name}`;
    if (state.bubbleKey === key) return;
    state.bubbleKey = key;
    els.bubble.hidden = false;
    els.bubble.classList.add('stall');
    els.bubbleTitle.hidden = false;
    els.bubbleTitle.textContent = repo.more ? t('ui.moreStall') : repo.name;
    const description = describeRepo(repo, state.lang, { none: t('ui.noDesc'), more: t('ui.moreStallDesc') });
    els.bubbleText.textContent = description;
    const meta = repo.more ? '' : [repo.language, `${t('ui.stars')}: ${repo.stars}`].filter(Boolean).join(' / ');
    els.bubbleMeta.hidden = !meta;
    els.bubbleMeta.textContent = meta;
    els.bubbleLink.hidden = false;
    els.bubbleLink.href = repo.url;
    els.bubbleLink.textContent = t(touch ? 'ui.openTap' : 'ui.openKey');
    els.live.textContent = `${els.bubbleTitle.textContent}. ${description}`;
  }

  // A word that pops up where something happened, then cleans up after itself.
  function float(text, x, y, tone = '') {
    const node = document.createElement('div');
    node.className = `float ${tone}`;
    node.textContent = text;
    node.style.left = `${Math.max(14, Math.min(86, (x / VIEW_W) * 100))}%`;
    node.style.top = `${Math.max(14, (y / VIEW_H) * 100)}%`;
    node.addEventListener('animationend', () => node.remove());
    els.floats.append(node);
    while (els.floats.children.length > 5) els.floats.firstChild.remove();
    setTimeout(() => node.remove(), 1600);
  }

  function setNumber(el, key, value) {
    if (state.hud[key] === value) return;
    state.hud[key] = value;
    el.textContent = value;
  }

  function update(g, world, renderer) {
    setNumber(els.cups, 'cups', g.cupsTaken);
    setNumber(els.score, 'score', g.score);
    setNumber(els.best, 'best', g.best);
    const meter = g.hyperT > 0 ? 100 : Math.round((g.caffeine / CAFFEINE_FULL) * 100);
    if (state.hud.meter !== meter) {
      state.hud.meter = meter;
      els.meter.style.width = `${meter}%`;
      els.meter.parentElement.classList.toggle('hot', g.hyperT > 0);
    }
    if (state.hud.battery !== g.battery) {
      state.hud.battery = g.battery;
      els.cells.forEach((cell, i) => cell.classList.toggle('off', i >= g.battery));
      els.battery.classList.toggle('low', g.battery === 1);
    }
    if (state.bannerT > 0) {
      state.bannerT--;
      if (state.bannerT === 0) els.banner.hidden = true;
    }

    const stall = g.phase === 'play' && g.stall >= 0 ? world.stalls[g.stall] : null;
    els.action.hidden = !stall;
    if (stall) {
      els.action.href = stall.repo.url;
      showStall(stall);
      placeTail(renderer.toScreen(stall.x + 44, 0).x);
    } else if (g.bubble && g.phase === 'play') {
      showSign(g.bubble.key);
      placeTail(renderer.toScreen(g.bubble.x, 0).x);
    } else {
      hideBubble();
    }
  }

  function showScreen(name) {
    els.title.hidden = name !== 'title';
    els.pause.hidden = name !== 'pause';
    els.ending.hidden = name !== 'ending';
    els.shell.dataset.screen = name || '';
  }

  function fillEnding(g, totalCups, isNewBest) {
    state.endingShown = true;
    state.lastGame = g;
    state.lastTotal = totalCups;
    state.lastNewBest = isNewBest;
    const rows = [
      ['end.cups', `${g.cupsTaken} / ${totalCups}`],
      ['end.bugs', g.stomped],
      ['end.time', formatTime(g.runT)],
      ['end.retries', g.retries],
      ['end.score', g.score],
      ['end.best', g.best],
    ];
    els.endRows.replaceChildren(...rows.map(([key, value]) => {
      const row = document.createElement('div');
      const label = document.createElement('dt');
      const number = document.createElement('dd');
      label.textContent = t(key);
      number.textContent = value;
      number.dir = 'ltr';
      row.append(label, number);
      return row;
    }));
    els.endJoke.textContent = t(pickJoke({ cups: g.cupsTaken, totalCups, retries: g.retries, skips: g.skips }));
    els.endBest.hidden = !isNewBest;
    els.linkedin.href = LINKS.linkedin;
    els.github.href = LINKS.github;
  }

  function forgetEnding() {
    state.endingShown = false;
  }

  // On a phone held upright the bubble lives under the screen, not on it.
  function dockBubble(docked) {
    const home = docked ? els.dock : els.overlay;
    if (els.bubble.parentElement !== home) home.append(els.bubble);
  }

  applyLang();
  return {
    t, update, showBanner, hideBanner, showGrowth, hideGrowth, applyLang, setMuted, float, showScreen,
    fillEnding, forgetEnding, dockBubble, hideBubble, state, els,
  };
}

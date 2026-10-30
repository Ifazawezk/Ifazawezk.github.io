import { say } from './content/strings.js';
import { VIEW_W, VIEW_H, CAFFEINE_FULL } from './game/game.js';

// Everything translatable sits in the DOM on top of the canvas, so Arabic gets
// real shaping and screen readers get real text. The canvas never holds words
// that need translating.

const $ = (id) => document.getElementById(id);

export function createUI({ lang, boringHref }) {
  const els = {
    root: document.documentElement,
    stage: $('stage'),
    bubble: $('bubble'),
    bubbleText: $('bubble-text'),
    bubbleTail: $('bubble-tail'),
    dock: $('dock'),
    banner: $('banner'),
    bannerTitle: $('banner-title'),
    bannerSub: $('banner-sub'),
    boring: $('boring'),
    langBtn: $('lang'),
    cups: $('cups'),
    score: $('score'),
    best: $('best'),
    meter: $('meter-fill'),
  };

  const state = { lang, bubbleKey: null, bannerT: 0, hud: {} };

  function t(key) {
    return say(state.lang, key);
  }

  function applyLang() {
    els.root.lang = state.lang;
    els.root.dataset.lang = state.lang;
    els.langBtn.textContent = t('ui.lang');
    els.langBtn.setAttribute('aria-label', t('ui.langLabel'));
    els.boring.textContent = t('ui.boring');
    els.boring.href = boringHref(state.lang);
    for (const node of document.querySelectorAll('[data-t]')) node.textContent = t(node.dataset.t);
    for (const node of document.querySelectorAll('[data-t-aria]')) node.setAttribute('aria-label', t(node.dataset.tAria));
    state.bubbleKey = null;
  }

  function showBanner(titleKey, subKey) {
    els.bannerTitle.textContent = t(titleKey);
    els.bannerSub.textContent = t(subKey);
    els.banner.hidden = false;
    state.bannerT = 170;
  }

  function setBubble(text, screenX) {
    els.bubble.hidden = false;
    if (els.bubbleText.textContent !== text) els.bubbleText.textContent = text;
    const pct = Math.max(6, Math.min(94, (screenX / VIEW_W) * 100));
    els.bubbleTail.style.left = `${pct}%`;
  }

  function hideBubble() {
    els.bubble.hidden = true;
    els.bubbleText.textContent = '';
  }

  function setNumber(el, key, value) {
    if (state.hud[key] === value) return;
    state.hud[key] = value;
    el.textContent = value;
  }

  function update(g, renderer) {
    setNumber(els.cups, 'cups', g.cupsTaken);
    setNumber(els.score, 'score', g.score);
    setNumber(els.best, 'best', g.best);
    const meter = g.hyperT > 0 ? 100 : Math.round((g.caffeine / CAFFEINE_FULL) * 100);
    if (state.hud.meter !== meter) {
      state.hud.meter = meter;
      els.meter.style.width = `${meter}%`;
    }
    if (state.bannerT > 0) {
      state.bannerT--;
      if (state.bannerT === 0) els.banner.hidden = true;
    }
    if (g.bubble) {
      const at = renderer.toScreen(g.bubble.x, g.bubble.y);
      setBubble(t(g.bubble.key), at.x);
    } else {
      hideBubble();
    }
  }

  applyLang();
  return { t, update, showBanner, applyLang, state, els, VIEW_H };
}

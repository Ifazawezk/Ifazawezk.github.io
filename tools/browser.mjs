// The real thing, in a real browser. Replays the bot's button presses through
// the shipped page in headless Edge, stops to take a picture of every level, then
// checks the parts a Node test cannot see: real key presses, pausing when the
// window loses focus, touch buttons, and opening a repo.
//
//   node tools/browser.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import { playGame, snapshotRepos, encodeTape } from './bot.mjs';
import { createSession } from '../src/game/game.js';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 8942;
const BASE = `http://localhost:${PORT}/`;
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const SIZES = {
  desktop: { viewport: { width: 1366, height: 768 } },
  portrait: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 },
  landscape: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 },
};

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

function expand(rle) {
  const out = [];
  for (const [b, n] of rle) for (let i = 0; i < n; i++) out.push(b);
  return out;
}

// Local copy of the snapshot, so these runs do not depend on the network.
async function useSnapshot(context) {
  await context.route('https://api.github.com/**', (route) => route.abort());
}

async function openGame(browser, size, query = '') {
  const context = await browser.newContext(SIZES[size]);
  await useSnapshot(context);
  const page = await context.newPage();
  page.problems = [];
  page.on('pageerror', (e) => page.problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/api\.github\.com|ERR_FAILED/.test(m.text())) page.problems.push(m.text());
  });
  await page.goto(`${BASE}?dev${query}`);
  await page.waitForFunction(() => window.__faza && document.documentElement.dataset.repos);
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

// Where the landmarks are in the opening, in pixels along the street.
const PLACES = [
  ['karak', 800], ['souq', 1300], ['metro', 2120], ['westbay', 2700], ['mia', 2930],
  ['pearl', 3120], ['school3', 3300], ['katara', 3640], ['torch', 3800], ['desert', 4120], ['worldcup', 4500],
].map(([name, x]) => ({ name, x }));

// Walk through the tape, stopping at each level's interesting moment.
async function playthrough(browser, size, tape, lang) {
  const tag = `${size}-${lang}`;
  const { context, page } = await openGame(browser, size, `&lang=${lang}`);
  await page.evaluate(() => __faza.run(Array(90).fill(0)));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${tag}-title.png` });
  await page.evaluate(() => __faza.begin());

  const CHUNK = 60;
  const shot = new Set();
  let i = 0;
  let last = null;
  while (i < tape.length) {
    const part = tape.slice(i, i + CHUNK);
    i += CHUNK;
    last = await page.evaluate((keys) => {
      const r = __faza.run(keys);
      const g = __faza.game;
      const w = __faza.world();
      return { ...r, id: w.id, cols: w.cols, stall: g.stall, levelT: g.levelT, bubble: g.bubble?.key ?? null, grow: g.phase === 'grow', growT: g.growT, boss: g.boss && g.boss.awake && !g.boss.defeated, bossHits: g.boss ? g.boss.maxHp - g.boss.hp : 0 };
    }, part);
    const progress = last.x / (last.cols * 16);
    const place = PLACES.find((p) => last.id === 'home' && last.x >= p.x && !shot.has(p.name));
    const moment = place ? place.name
      : last.id === 'homecoming' && progress > 0.4 && !shot.has('homecoming') ? 'homecoming'
      : last.id === 'homecoming' && progress > 0.74 && !shot.has('door') ? 'door'
      : last.grow ? `grow${last.level}`
      : last.boss && last.bossHits > 0 ? 'boss'
        : last.id === 'souq' && last.stall >= 2 ? 'souq'
          : last.phase === 'play' && progress > 0.42 && last.bubble ? last.id
            : last.phase === 'play' && progress > 0.72 ? last.id : null;
    if (moment && !shot.has(moment) && (!last.grow || last.growT < 80)) {
      shot.add(moment);
      // Words float on a real-time clock, and this replay runs far faster than
      // real time, so old ones would otherwise pile up in the picture.
      await page.evaluate(() => document.getElementById('floats').replaceChildren());
      await page.waitForTimeout(60);
      await page.screenshot({ path: `${OUT}/${tag}-${moment}.png` });
    }
  }
  await page.evaluate(() => document.getElementById('floats').replaceChildren());
  await page.waitForTimeout(200);
  await page.evaluate(() => __faza.draw());
  await page.screenshot({ path: `${OUT}/${tag}-ending.png` });
  const end = await page.evaluate(() => ({
    phase: __faza.game.phase,
    screen: !document.getElementById('screen-ending').hidden,
    linkedin: document.getElementById('end-linkedin').href,
    github: document.getElementById('end-github').href,
    score: __faza.game.score,
    runT: __faza.game.runT,
    cups: __faza.game.cupsTaken,
    stomped: __faza.game.stomped,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  check(`${tag}: the replay reaches the ending in the browser`, end.phase === 'ending' && end.screen, `score ${end.score}, ${end.cups} cups, ${end.stomped} bugs`);
  check(`${tag}: LinkedIn and GitHub buttons are live`, end.linkedin.includes('linkedin.com/in/mohanned-alhagar-b298b8272') && end.github === 'https://github.com/Ifazawezk');
  check(`${tag}: no sideways scrolling`, !end.overflow);
  if (size === 'desktop') {
    const side = await page.evaluate(() => {
      const card = document.querySelector('.end-card').getBoundingClientRect();
      const stage = document.getElementById('stage').getBoundingClientRect();
      return card.left - stage.left;
    });
    check(`${tag}: the ending card leaves Faza and his door in view`, side > 150, `${Math.round(side)}px clear`);
  }
  check(`${tag}: no errors in the page`, page.problems.length === 0, page.problems.slice(0, 2).join(' | '));
  await context.close();
  return end;
}

async function boringPages(browser) {
  for (const size of ['desktop', 'portrait']) {
    for (const [lang, path] of [['en', 'boring/'], ['ar', 'boring/ar/']]) {
      const context = await browser.newContext({ ...SIZES[size], javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(BASE + path);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/${size}-boring-${lang}.png`, fullPage: size === 'desktop' });
      const fine = await page.locator('h1').count();
      check(`boring page ${lang} on ${size} works with JavaScript off`, fine === 1);
      await context.close();
    }
  }
}

async function realKeys(browser) {
  const context = await browser.newContext(SIZES.desktop);
  await useSnapshot(context);
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForFunction(() => document.documentElement.dataset.repos);
  const titleUp = await page.isVisible('#screen-title');
  await page.keyboard.press('KeyD');
  await page.waitForTimeout(120);
  const started = !(await page.isVisible('#screen-title'));
  check('the title screen shows, and any key starts', titleUp && started);

  await page.waitForTimeout(300);
  const canvasA = await page.evaluate(() => document.getElementById('game').toDataURL());
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  const canvasB = await page.evaluate(() => document.getElementById('game').toDataURL());
  check('held arrow key moves the world', canvasA !== canvasB);

  await page.evaluate(() => dispatchEvent(new Event('blur')));
  await page.waitForTimeout(100);
  check('losing focus pauses the game', await page.isVisible('#screen-pause'));
  await page.click('#pause-resume');
  await page.waitForTimeout(60);
  check('Back to work resumes', !(await page.isVisible('#screen-pause')));

  await page.keyboard.press('KeyP');
  await page.waitForTimeout(60);
  const pausedByKey = await page.isVisible('#screen-pause');
  await page.keyboard.press('KeyP');
  check('P toggles pause', pausedByKey && !(await page.isVisible('#screen-pause')));

  await page.click('#btn-mute');
  const pressed = await page.getAttribute('#btn-mute', 'aria-pressed');
  const saved = await page.evaluate(() => localStorage.getItem('faza.muted'));
  check('the mute button works and is remembered', pressed === 'true' && saved === 'true');
  await page.click('#btn-mute');

  const audio = await page.evaluate(() => typeof (window.AudioContext || window.webkitAudioContext));
  check('Web Audio is available for the sound', audio === 'function');
  await context.close();
}

async function stallOpens(browser, tape) {
  const { context, page } = await openGame(browser, 'desktop');
  await page.evaluate(() => __faza.begin());
  const placed = await page.evaluate(async () => {
    const { game, session } = __faza;
    const index = session.worlds.findIndex((w) => w.id === 'souq');
    const mod = await import('/src/game/game.js');
    mod.loadLevel(session, game, index);
    const stall = session.worlds[index].stalls[0];
    game.p.x = stall.x + 30;
    game.p.y = stall.feet - game.p.h;
    __faza.run([0, 0]);
    return { name: stall.repo.name, stalls: session.worlds[index].stalls.length, bubble: document.getElementById('bubble-title').textContent, link: document.getElementById('bubble-link').href };
  });
  check('the souq shows real repos from the snapshot', placed.stalls === snapshotRepos().length + 1, `${placed.stalls} stalls`);
  check('standing at a stall shows its name and link', placed.bubble === placed.name && placed.link.includes(`/Ifazawezk/${placed.name}`));
  const [popup] = await Promise.all([
    context.waitForEvent('page', { timeout: 4000 }).catch(() => null),
    page.keyboard.press('KeyE'),
  ]);
  check('pressing E opens the repo in a new tab', !!popup);
  await popup?.close();
  await context.close();
}

async function touchPlay(browser, size) {
  const context = await browser.newContext(SIZES[size]);
  await useSnapshot(context);
  const page = await context.newPage();
  await page.goto(`${BASE}?dev`);
  await page.waitForFunction(() => window.__faza);
  await page.tap('#screen-title');
  await page.waitForTimeout(80);
  const started = await page.evaluate(() => __faza.game.phase === 'play');
  await page.evaluate(() => __faza.unfreeze());
  const before = await page.evaluate(() => __faza.game.p.x);
  const pad = await page.locator('#dpad').boundingBox();
  const jump = await page.locator('#btn-jump').boundingBox();
  const client = await context.newCDPSession(page);
  const point = (x, y, id) => ({ x, y, id });
  const right = point(pad.x + pad.width * 0.8, pad.y + pad.height / 2, 1);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right] });
  await page.waitForTimeout(500);
  const moved = await page.evaluate(() => __faza.game.p.x);
  const thumb = point(jump.x + jump.width / 2, jump.y + jump.height / 2, 2);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [right, thumb] });
  await page.waitForTimeout(120);
  const air = await page.evaluate(() => !__faza.game.p.onGround);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(`${size}: tap starts the game`, started);
  check(`${size}: the touch pad walks`, moved > before + 20, `moved ${(moved - before).toFixed(0)}px`);
  check(`${size}: jumping while walking works with two thumbs`, air);
  const fits = await page.evaluate(() => {
    const ids = ['stage', 'dpad', 'btn-jump', 'boring'];
    return ids.every((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
    });
  });
  check(`${size}: screen, thumbs and boring button all fit`, fits);
  await context.close();
}

// One plain request to GitHub from the browser, exactly as a visitor's would be.
async function liveRepos(browser) {
  const context = await browser.newContext(SIZES.desktop);
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForFunction(() => document.documentElement.dataset.repos, null, { timeout: 8000 });
  const source = await page.evaluate(() => document.documentElement.dataset.repos);
  check('the page gets its repos from GitHub, or falls back cleanly', ['live', 'cache', 'snapshot'].includes(source), `source: ${source}`);
  await context.close();
}

// ---- Run ------------------------------------------------------------------

const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: EDGE, headless: true });

console.log('Planning the route...');
const plan = playGame(createSession(snapshotRepos()));
if (!plan.finished) throw new Error('the bot could not finish, nothing to replay');
const tape = expand(encodeTape(plan.tape));
writeFileSync('tools/out/tape.json', JSON.stringify(encodeTape(plan.tape)));
console.log(`Route found: ${tape.length} ticks, ${(tape.length / 60).toFixed(0)}s of game time.`);

const first = await playthrough(browser, 'desktop', tape, 'en');
check('the browser and Node agree on the final score', first.score === plan.g.score, `${first.score} vs ${plan.g.score}`);
await playthrough(browser, 'portrait', tape, 'en');
await playthrough(browser, 'landscape', tape, 'en');
await playthrough(browser, 'desktop', tape, 'ar');
await playthrough(browser, 'portrait', tape, 'ar');
await boringPages(browser);
await realKeys(browser);
await stallOpens(browser, tape);
await touchPlay(browser, 'portrait');
await touchPlay(browser, 'landscape');
await liveRepos(browser);

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} browser checks passed.`);
process.exit(failed.length ? 1 : 0);

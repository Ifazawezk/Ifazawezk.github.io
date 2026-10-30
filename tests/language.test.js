import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';

// The language button, driven in a real browser: a click handler is exactly the
// kind of thing a unit test of the strings would never notice was missing.

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 8941;
const URL_BASE = `http://localhost:${PORT}/`;
const canRun = existsSync(EDGE);
let server;
let browser;

before(async () => {
  if (!canRun) return;
  server = await serve(PORT);
  browser = await chromium.launch({ executablePath: EDGE, headless: true });
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(path = '') {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(URL_BASE + path);
  await page.waitForSelector('#lang');
  return { context, page };
}

const lang = (page) => page.evaluate(() => document.documentElement.lang);
const boring = (page) => page.getAttribute('#boring', 'href');

test('clicking the button switches to Arabic and back', { skip: !canRun }, async () => {
  const { context, page } = await open();
  assert.equal(await lang(page), 'en');
  await page.click('#lang');
  assert.equal(await lang(page), 'ar');
  assert.equal((await page.textContent('#lang')).trim(), 'English');
  await page.click('#lang');
  assert.equal(await lang(page), 'en');
  assert.equal((await page.textContent('#lang')).trim(), 'عربي');
  await context.close();
});

test('the boring link follows the language', { skip: !canRun }, async () => {
  const { context, page } = await open();
  assert.equal(await boring(page), 'boring/');
  await page.click('#lang');
  assert.equal(await boring(page), 'boring/ar/');
  assert.match(await page.textContent('#boring'), /[\u0600-\u06FF]/);
  await context.close();
});

test('the choice is remembered on the next visit', { skip: !canRun }, async () => {
  const { context, page } = await open();
  await page.click('#lang');
  await page.reload();
  await page.waitForSelector('#lang');
  assert.equal(await lang(page), 'ar');
  await context.close();
});

test('the address can ask for a language, and beats the saved one', { skip: !canRun }, async () => {
  const { context, page } = await open('?lang=ar');
  assert.equal(await lang(page), 'ar');
  assert.equal(await boring(page), 'boring/ar/');
  await page.goto(`${URL_BASE}?lang=en`);
  await page.waitForSelector('#lang');
  assert.equal(await lang(page), 'en');
  await context.close();
});

test('speech runs right to left in Arabic, the screen layout does not', { skip: !canRun }, async () => {
  const { context, page } = await open('?lang=ar');
  assert.equal(await page.getAttribute('#bubble', 'dir'), 'rtl');
  assert.equal(await page.getAttribute('#banner', 'dir'), 'rtl');
  await page.click('#lang');
  assert.equal(await page.getAttribute('#bubble', 'dir'), 'ltr');
  await context.close();
});

test('after clicking the button, Space still jumps instead of clicking it again', { skip: !canRun }, async () => {
  const { context, page } = await open();
  await page.click('#lang');
  await page.keyboard.press('Space');
  assert.equal(await lang(page), 'ar');
  await context.close();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';

const en = readFileSync('boring/index.html', 'utf8');
const ar = readFileSync('boring/ar/index.html', 'utf8');
const game = readFileSync('index.html', 'utf8');
const LINKEDIN = 'https://www.linkedin.com/in/mohanned-alhagar-b298b8272';
const GITHUB = 'https://github.com/Ifazawezk';

test('the boring button points at a page that exists', () => {
  assert.match(game, /href="boring\/"/);
  assert.ok(existsSync('boring/index.html'));
  assert.ok(existsSync('boring/ar/index.html'));
});

test('the Arabic page really is right to left', () => {
  assert.match(ar, /<html lang="ar" dir="rtl">/);
  assert.match(en, /<html lang="en" dir="ltr">/);
});

test('the two versions link to each other and back to the game', () => {
  assert.match(en, /href="ar\/"/);
  assert.match(ar, /href="\.\.\/"/);
  assert.match(en, /href="\.\.\/"/);
  assert.match(ar, /href="\.\.\/\.\.\/\?lang=ar"/);
});

test('search engines get what they need', () => {
  for (const page of [en, ar]) {
    assert.match(page, /<link rel="canonical"/);
    assert.match(page, /hreflang="ar"/);
    assert.match(page, /<meta name="description"/);
    assert.match(page, /application\/ld\+json/);
    assert.match(page, /<h1>/);
  }
  const data = JSON.parse(en.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data['@type'], 'Person');
  assert.equal(data.name, 'Mohanned Elhagar');
});

test('born and raised in Qatar comes before any job', () => {
  assert.ok(en.indexOf('Born and raised in Qatar') < en.indexOf('8Hearts.co'));
  assert.ok(ar.indexOf('مولود ومتربّي في قطر') < ar.indexOf('8Hearts.co'));
  assert.ok(en.indexOf('Born and raised in Qatar') < en.indexOf('Experience'));
});

test('the three schools are there in full, in order, with no dates of their own', () => {
  const english = [
    'Al Rashad Model Independent School for Boys',
    'Ibn Khaldoun Preparatory Independent School for Boys',
    'Ali Bin Jassim Bin Mohammed Al Thani Secondary Independent School for Boys',
  ];
  const arabic = [
    'مدرسة الرشاد النموذجية المستقلة للبنين',
    'مدرسة ابن خلدون الإعدادية للبنين',
    'مدرسة علي بن جاسم بن محمد آل ثاني الثانوية المستقلة للبنين',
  ];
  for (const [page, names] of [[en, english], [ar, arabic]]) {
    const spots = names.map((n) => page.indexOf(`<li>${n}</li>`));
    assert.ok(spots.every((i) => i > 0), 'a school is missing or has extra text');
    assert.deepEqual([...spots].sort((a, b) => a - b), spots);
  }
});

test('all the real numbers and employers are on both pages', () => {
  for (const page of [en, ar]) {
    for (const fact of ['35%', '10,000', '88%', '30%', '20%', '50,000', '8Hearts.co', 'QNB', 'GDSC', 'ALX Africa', 'Power BI', 'FastAPI', 'Hugging Face']) {
      assert.ok(page.includes(fact), fact);
    }
  }
  assert.ok(en.includes('two thirds'));
  assert.ok(ar.includes('التلتين'));
  assert.ok(en.includes('Sep 2024 to Jan 2026'));
  assert.ok(en.includes('Aug 2022 to May 2026'));
});

test('his Arabic name is spelled exactly', () => {
  assert.match(ar, /<h1>مهند الحجر<\/h1>/);
});

test('contact is LinkedIn and GitHub only', () => {
  for (const page of [en, ar, game]) {
    assert.doesNotMatch(page, /mailto:|tel:/);
    assert.doesNotMatch(page, /[a-z0-9._-]+@[a-z0-9-]+\.[a-z]{2,}/i);
  }
  assert.ok(en.includes(LINKEDIN) && en.includes(GITHUB));
  assert.ok(ar.includes(LINKEDIN) && ar.includes(GITHUB));
});

test('the boring page needs no JavaScript and keeps still on request', () => {
  for (const page of [en, ar]) {
    assert.doesNotMatch(page, /<script(?![^>]*application\/ld\+json)/);
    assert.match(page, /prefers-reduced-motion/);
  }
});

test('every project listed is a real repo from the snapshot', () => {
  const repos = JSON.parse(readFileSync('data/repos.json', 'utf8')).map((r) => r.name);
  const listed = [...en.matchAll(/github\.com\/Ifazawezk\/([\w.-]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...listed].sort(), [...repos].sort());
});

test('the story on both pages says he went away and came home', () => {
  assert.match(en, /until 2022/);
  assert.match(en, /Tanta University/);
  assert.match(en, /came back to Doha/);
  assert.match(ar, /لحد 2022/);
  assert.match(ar, /رجعت الدوحة/);
});

test('every font the stylesheet asks for is really there', () => {
  const css = readFileSync('style.css', 'utf8');
  const urls = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 7);
  for (const url of urls) assert.ok(existsSync(url), url);
});

test('digits have their own clear font, because 20% must never read as 80%', () => {
  const css = readFileSync('style.css', 'utf8');
  assert.match(css, /font-family: 'Digits'[^}]*unicode-range: U\+30-39/);
  assert.match(css, /--type: 'Digits'/);
});

test('the social card and icons exist at the right size', () => {
  const size = (file) => {
    const png = readFileSync(file);
    assert.equal(png.toString('latin1', 1, 4), 'PNG', file);
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  assert.deepEqual(size('assets/og.png'), [1200, 630]);
  assert.deepEqual(size('assets/favicon.png'), [32, 32]);
  assert.deepEqual(size('assets/favicon-180.png'), [180, 180]);
  assert.match(game, /assets\/og\.png/);
  assert.match(game, /assets\/favicon\.png/);
});

test('the profile animation is a looping GIF about 840 wide and under 3 MB', () => {
  const gif = readFileSync('assets/profile.gif');
  assert.equal(gif.toString('latin1', 0, 6), 'GIF89a');
  assert.equal(gif.readUInt16LE(6), 840);
  assert.ok(gif.includes('NETSCAPE2.0'), 'no loop block');
  assert.ok(statSync('assets/profile.gif').size < 3 * 1024 * 1024);
});

test('nothing here would stop GitHub Pages serving the site', () => {
  assert.ok(existsSync('.nojekyll'));
  assert.ok(existsSync('robots.txt'));
  assert.ok(existsSync('sitemap.xml'));
  assert.equal(existsSync('.github/workflows'), false);
});

test('the 404 page exists and leads back', () => {
  const page = readFileSync('404.html', 'utf8');
  assert.match(page, /href="\/"/);
  assert.match(page, /href="\/boring\/"/);
});

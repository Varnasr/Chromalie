// Search tags: robots.txt, sitemap.xml and a canonical address on every page.
// Regenerate with `python3 scripts/build-seo.py` after adding or editing a page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url);
const HOST = 'https://chromalie.page';
const read = (name) => readFileSync(new URL(name, DIST), 'utf8');
const pages = readdirSync(DIST).filter((f) => f.endsWith('.html'));
const indexable = pages.filter((f) => !/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(read(f)));
const urlFor = (f) => (f === 'index.html' ? `${HOST}/` : `${HOST}/${f.slice(0, -5)}`);

test('robots.txt allows crawling and names the sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Sitemap: https:\/\/chromalie\.page\/sitemap\.xml$/m);
});

test('every sitemap address has a page behind it', () => {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 0, 'sitemap.xml lists no pages');
  for (const loc of locs) {
    assert.ok(loc.startsWith(HOST), `${loc} is not on ${HOST}`);
    const path = loc.slice(HOST.length);
    const file = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
    assert.ok(existsSync(new URL(file, DIST)), `${loc} has no file ${file}`);
  }
});

test('the sitemap lists every indexable page', () => {
  const locs = new Set([...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  assert.deepEqual([...locs].sort(), indexable.map(urlFor).sort());
});

test('every indexable page carries its own canonical address and Open Graph url', () => {
  for (const f of indexable) {
    const html = read(f);
    const want = urlFor(f);
    assert.ok(html.includes(`<link rel="canonical" href="${want}">`), `${f} lacks canonical ${want}`);
    assert.ok(html.includes(`<meta property="og:url" content="${want}">`), `${f} lacks og:url ${want}`);
    for (const p of ['og:title', 'og:description']) assert.ok(html.includes(`property="${p}"`), `${f} lacks ${p}`);
  }
});

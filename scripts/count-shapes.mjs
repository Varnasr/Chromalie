// Counts the shapes a visitor can colour on every page and writes `shapes` and `level` into
// dist/catalog.json. It runs the studio's own engine (dist/engine.js) in Chromium, with the
// studio's default gap closing, so the number is the one the studio works with.
//
// A shape counts when it is not background (it does not touch the page edge and is under 35% of
// the page) and covers at least 40 pixels. Smaller specks exist on most pages and nobody colours
// them one by one. The same rule is in dist/app.js, which uses it for "shapes left".
//
// Levels: Simple under 150 shapes, Medium 150 to 399, Detailed 400 to 899, Intricate 900 or more.
// A page with fewer than 10 shapes keeps the level it had: the engine could not separate its
// shapes (butterflies-042 has grey paper, so every pixel reads as outline), which says nothing
// about how hard the drawing is.
//
// Needs the artwork in dist/pages (see CONTRIBUTING.md) and playwright-core with Chromium:
//   PLAYWRIGHT_CORE=... CHROME=... node scripts/count-shapes.mjs          writes the catalogue
//   node scripts/count-shapes.mjs --check                                  fails if it would change
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIN_SHAPE_PIXELS = 40;
export function levelFor(shapes, previous) {
  if (shapes < 10) return previous || 'Simple';
  return shapes < 150 ? 'Simple' : shapes < 400 ? 'Medium' : shapes < 900 ? 'Detailed' : 'Intricate';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp' };
  const server = http.createServer(async (req, res) => {
    const full = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!full.startsWith(root)) { res.writeHead(403).end(); return; }
    try { res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream' }).end(await readFile(full)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const file = path.join(root, 'catalog.json');
  const catalog = JSON.parse(await readFile(file, 'utf8'));
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/help.html`);
  let changed = 0;
  for (const p of catalog.pages) {
    const shapes = await page.evaluate(async ({ p, min }) => {
      const { segmentRegions, isBackgroundArea } = await import('/engine.js');
      const img = new Image(); img.src = '/' + p.image; await img.decode();
      const c = document.createElement('canvas'); c.width = p.width; c.height = p.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.fillStyle = 'white'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0);
      const r = segmentRegions(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, true, 2);
      let n = 0;
      for (let id = 1; id <= r.count; id++) if (r.areas[id] >= min && !isBackgroundArea(id, r.areas, r.edge, c.width * c.height)) n++;
      return n;
    }, { p, min: MIN_SHAPE_PIXELS });
    const level = levelFor(shapes, p.level);
    if (p.shapes !== shapes || p.level !== level) { changed++; if (process.argv.includes('--check')) console.log(`stale: ${p.id} has ${p.shapes} (${p.level}), measured ${shapes} (${level})`); }
    p.shapes = shapes; p.level = level;
  }
  await browser.close(); server.close();
  if (process.argv.includes('--check')) { console.log(changed ? `${changed} pages are stale` : 'Shape counts are current.'); process.exit(changed ? 1 : 0); }
  await writeFile(file, JSON.stringify(catalog));
  console.log(`Counted ${catalog.pages.length} pages; ${changed} changed.`);
}

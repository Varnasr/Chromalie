// Browser test, run by CI before every deploy. It serves dist/ locally, then at
// a phone width and a desktop width: opens the library, opens a page, fills a
// shape, opens every fold-out strip, picks a brush, opens the journal and turns
// a page. On the way it runs axe over the home page, the studio (strip closed
// and open), the tour and the journal, and fails on any serious or critical
// finding, any script error and any page wider than the screen.
//
//   npm i --no-save playwright-core@1.56.1 axe-core@4.10.3
//   node node_modules/playwright-core/cli.js install chromium
//   node tests/ui.test.mjs
//
// In the agent sandbox: CHROME=/opt/pw-browsers/chromium, and PLAYWRIGHT_CORE /
// AXE pointing at installed copies.
import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.env.DIST || path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist'));
const require = createRequire(import.meta.url);
const { chromium, devices } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const axeSource = await readFile(process.env.AXE || require.resolve('axe-core/axe.min.js'), 'utf8');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  let file = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (file.endsWith('/')) file += 'index.html';
  const full = path.join(root, file);
  if (!full.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(full);
    res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const failures = [];
const captureDir = path.resolve(process.env.CAPTURE_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '../test-artifacts'));
await mkdir(captureDir,{recursive:true});
const capture=async(page,name)=>{await page.screenshot({path:path.join(captureDir,name+'.png'),fullPage:false,animations:'disabled'});};
const fail = (where, what) => { failures.push(`${where}: ${what}`); console.log(`  FAIL ${what}`); };
const ok = what => console.log(`  ok   ${what}`);

async function audit(page, where) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  const bad = result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  if (bad.length) for (const v of bad) fail(where, `axe ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
  else ok(`axe: no serious or critical findings (${where})`);
}
async function noOverflow(page, where) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (extra > 1) fail(where, `page is ${extra}px wider than the screen`); else ok(`no sideways scroll (${where})`);
}
async function checkVisibleControlsFit(page, where) {
  const bad = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const selectors = ['.journal-bar button','.journal-bar input:not([hidden])','.m-quick .m-chip-btn','.m-rail-toggle','.m-tools button','.journal-caption button'];
    return [...document.querySelectorAll(selectors.join(','))].filter(el => {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return false;
      const r=el.getBoundingClientRect();
      return r.width > 0 && (r.left < -2 || r.right > viewport + 2);
    }).map(el => (el.className || el.tagName) + ': ' + Math.round(el.getBoundingClientRect().left) + '..' + Math.round(el.getBoundingClientRect().right)).slice(0,8);
  });
  if (bad.length) fail(where,'controls outside viewport: '+bad.join('; '));
  else ok('all visible controls fit screen ('+where+')');
}
const loaded = page => page.waitForFunction(() => document.getElementById('loading').hidden, null, { timeout: 30000 });

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const tag = `${w}x${h}`;
  console.log(`\n${tag}`);
  const ctx = await browser.newContext(w < 700 ? { ...devices['Pixel 7'], viewport: { width: w, height: h } } : { viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { try { localStorage.setItem('chromalie-storage-notice', 'seen'); } catch (e) {} });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => errors.push(`request failed: ${r.url()}`));

  await page.goto(base, { waitUntil: 'networkidle' });
  await noOverflow(page, `${tag} home`);
  await checkVisibleControlsFit(page, `${tag} home`);
  await audit(page, `${tag} home`);
  await capture(page,`${tag}-home`);

  // Open a page. The tour shows the first time; audit it, then close it.
  await page.click('#hero-start');
  // The second page is a tall owl; a tall page is the one that can overflow the journal leaf.
  await page.locator('.page-card').nth(1).click();
  await loaded(page);
  const tour = await page.locator('.guide-card').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
  if (!tour) fail(tag, 'the first-visit tour did not appear');
  else {
    await audit(page, `${tag} tour`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => { try { localStorage.setItem('chromalie-tour', 'done'); } catch (e) {} });
  await noOverflow(page, `${tag} studio`);
  await checkVisibleControlsFit(page, `${tag} studio`);
  await audit(page, `${tag} studio`);
  await capture(page,`${tag}-studio`);

  // Layers must be available in both layouts and must survive a local save/reopen.
  // [data-pop="more"] matches the chip and the hidden strip. On a phone the chip
  // sits in the collapsed tool rail, so open that rail and click the visible chip.
  const layerRailToggle = page.locator('.m-rail-toggle');
  const openedRail = w < 700 && await layerRailToggle.isVisible();
  if (openedRail) await layerRailToggle.click();
  await page.locator('.m-chip-btn[data-pop="more"]:visible').click();
  const addLayer=page.locator('#add-layer');
  if(!await addLayer.isVisible())fail(tag,'Add layer is not accessible in the current layout');
  else{
    await addLayer.click();
    const layers=page.locator('#layer-list [data-layer]');
    if(await layers.count()!==2)fail(tag,'Adding a layer did not create a second layer');
    else ok('Two painting layers can be selected');
    if(await layers.nth(1).getAttribute('aria-pressed')!=='true')fail(tag,'New layer was not selected');
    await layers.nth(0).click();
    if(await layers.nth(0).getAttribute('aria-pressed')!=='true')fail(tag,'Switching to the first layer failed');
    await layers.nth(1).click();
    const visibility=page.locator('#layer-list .layer-visibility').nth(0);
    await visibility.click();
    if(await visibility.getAttribute('aria-pressed')!=='false')fail(tag,'Layer visibility did not switch off');
    const opacityControl=page.locator('#layer-list input[type="range"]').nth(0);
    await opacityControl.evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
    // A layered project must export its individual layers and remain importable.
    const [download]=await Promise.all([page.waitForEvent('download'),page.click('#save-project')]);
    const project=JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(),'utf8'));
    if(project.version!==2||project.layers?.length!==2||project.layers[0]?.visible!==false||project.layers[0]?.opacity!==0.45||!project.layers.every(l=>l.paint.startsWith('data:image/png;base64,')))fail(tag,'Layered project export is incomplete');
    else ok('Layered project exports both independent paint surfaces');
    // Wait for the import itself to finish. The layer state it restores (first
    // layer hidden, opacity 45) is the state the test set before exporting, so
    // waiting on that alone passed before the import had run; the import's
    // openPage then redrew the list under the rename below and the rename was
    // lost. The import's own toast is the signal that it has finished.
    await page.evaluate(()=>{document.getElementById('toast').textContent='';});
    await page.locator('#project-file').setInputFiles({name:'layer-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
    await page.waitForFunction(()=>document.getElementById('toast')?.textContent==='Editable project restored.' && document.querySelector('#layer-list .layer-visibility')?.getAttribute('aria-pressed')==='false' && document.querySelector('#layer-list input[type="range"]')?.value==='45',null,{timeout:15000});
    if(await page.locator('#layer-list [data-layer]').count()!==2)fail(tag,'Layered project import lost layers');
    else ok('Layered project imports two editable layers');
    if(await page.locator('#layer-list .layer-visibility').first().getAttribute('aria-pressed')!=='false')fail(tag,'Project import lost hidden layer state');
    if(await page.locator('#layer-list input[type="range"]').first().inputValue()!=='45')fail(tag,'Project import lost layer opacity');
    page.once('dialog',dialog=>dialog.accept('Highlights'));
    await page.locator('#layer-list button[aria-label^="Rename "]').nth(1).click();
    if(await page.locator('#layer-list [data-layer]').nth(1).textContent()!=='Highlights')fail(tag,'Layer rename failed');
    await page.locator('#layer-list button[aria-label="Move Highlights down"]').click();
    if(await page.locator('#layer-list [data-layer]').first().textContent()!=='Highlights')fail(tag,'Layer reorder failed');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#layer-list button[aria-label^="Delete "]').first().click();
    if(await page.locator('#layer-list [data-layer]').count()!==1)fail(tag,'Layer deletion failed');
    else ok('Rename, reorder and delete layer controls work');
  }
  await page.keyboard.press('Escape');
  if (openedRail && !await page.locator('.m-quick').evaluate(el => el.classList.contains('m-rail-collapsed')))
    await layerRailToggle.click();
  // The colour panel starts collapsed; open it for the palette checks.
  // Its chip (data-pop="shade", labelled Colours) sits in the same tool rail as
  // the layers chip, which the step above has just collapsed again, so reopen it.
  // The strip is built at every width, so open it wherever the harmonies are
  // not already on screen.
  let reopenedRail=false,openedColours=false;
  if(!await page.locator('#harmony-swatches').isVisible()){
    if(await layerRailToggle.isVisible() && await page.locator('.m-quick').evaluate(el=>el.classList.contains('m-rail-collapsed'))){
      await layerRailToggle.click();reopenedRail=true;
    }
    await page.locator('.m-chip-btn[data-pop="shade"]:visible').click();openedColours=true;
  }
  // Colour harmony suggestions are derived from the selected colour.
  const harmonies=page.locator('#harmony-swatches button');
  if(await harmonies.count()!==5)fail(tag,'Expected five harmony colour suggestions');
  else{
    await harmonies.nth(2).click();
    if(!/^#[0-9a-f]{6}$/i.test(await page.locator('#custom-colour').inputValue()))fail(tag,'Harmony colour was not selected');
    else ok('Colour harmonies select a valid custom colour');
  }
  // Close the strip, and leave the rail collapsed again, as the steps below expect.
  if(openedColours)await page.keyboard.press('Escape');
  if(reopenedRail)await layerRailToggle.click();
  // Brush samples must be actual, varied drawings rather than identical CSS pills.
  const samples = await page.evaluate(() => [...document.querySelectorAll('.brush-button canvas.brush-sample-canvas')].map(c => ({
    tool: c.closest('[data-tool]')?.dataset.tool,
    pixels: c.getContext('2d').getImageData(0, 0, c.width, c.height).data,
  })).map(({tool,pixels}) => {
    let hash=2166136261;
    for(let i=0;i<pixels.length;i+=4){hash=Math.imul(hash^pixels[i+3],16777619)>>>0;hash=Math.imul(hash^pixels[i],16777619)>>>0;}
    return {tool,hash};
  }));
  if(samples.length!==16 || new Set(samples.map(x=>x.hash)).size!==16) fail(tag, 'brush picker does not show 16 visually distinct canvas samples');
  else ok('all 16 brush samples have distinct rendered pixels');

  // Fill a shape: Undo should come alive.
  await page.waitForFunction(() => !document.querySelector('.canvas-loading:not([hidden])'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.click('[data-m="fill"]');
  await page.locator('.m-swatch').nth(2).click();
  const box = await page.locator('#canvas').boundingBox();
  for (const [fx, fy] of [[0.5, 0.42], [0.45, 0.5], [0.55, 0.35]]) { await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(250); }
  if (await page.locator('#undo').isDisabled()) fail(tag, 'filling a shape did not enable Undo'); else ok('filling a shape enables Undo');

  // The artwork should be unobstructed until the visitor opens the mobile rail.
  const railToggle = page.locator('.m-rail-toggle');
  if (await railToggle.isVisible()) {
    const rail = page.locator('.m-quick');
    if (!await rail.evaluate(el => el.classList.contains('m-rail-collapsed')))
      fail(tag, 'mobile tool rail must start collapsed');
    if (await railToggle.getAttribute('aria-expanded') !== 'false')
      fail(tag, 'collapsed tool rail must announce aria-expanded=false');
    if (await page.locator('.m-quick .m-chips').isVisible())
      fail(tag, 'collapsed tool rail still obscures the canvas');
    await railToggle.click();
    if (await rail.evaluate(el => el.classList.contains('m-rail-collapsed')))
      fail(tag, 'mobile tool rail did not expand');
    else ok('mobile tool rail opens on demand');
    if (await railToggle.getAttribute('aria-expanded') !== 'true')
      fail(tag, 'expanded tool rail must announce aria-expanded=true');
    await checkVisibleControlsFit(page, tag+' expanded mobile tool rail');
    await capture(page,tag+'-studio-tools-expanded');
    await railToggle.click();
    if (!await rail.evaluate(el => el.classList.contains('m-rail-collapsed')))
      fail(tag, 'mobile tool rail did not collapse again');
    await railToggle.click();
  }

  // Every fold-out strip opens, and closes on Escape.
  for (const name of ['brushes', 'size', 'shade', 'more']) {
    await page.click(`[data-pop="${name}"]`);
    await page.waitForTimeout(350);
    const open = await page.locator('.m-pop:not([hidden])').count();
    if (!open) fail(tag, `the ${name} strip did not open`);
    else {
      ok(`the ${name} strip opens`);
      if (name === 'brushes') await audit(page, `${tag} studio, brushes strip open`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  // Palette collections must be discoverable and usable inside the mobile
  // Colour strip as well as in the desktop workspace.
  await page.keyboard.press('Escape');
  await page.locator('.m-chip-btn[data-pop="shade"]:visible').click();
  const paletteButtons=page.locator(w < 700 ? '.m-pop-shade [data-palette]' : '.palette-switcher [data-palette]');
  if(await paletteButtons.count()!==7)fail(tag,'Colour strip does not contain seven palette choices');
  else ok('all seven palettes are visible in the Colour strip');
  await page.locator(w < 700 ? '.m-pop-shade [data-palette="bright"]' : '.palette-switcher [data-palette="bright"]').click();
  if(await page.locator('#palette-select').inputValue()!=='bright'||await page.locator('#swatches .swatch').count()!==18)
    fail(tag,'Bright palette did not display its eighteen swatches');
  else ok('Bright palette switches visible swatches');
  await page.locator(w < 700 ? '.m-pop-shade [data-palette="everyday"]' : '.palette-switcher [data-palette="everyday"]').click();
  if(await page.locator('#palette-select').inputValue()!=='everyday'||await page.locator('#swatches .swatch').count()!==20)
    fail(tag,'Everyday palette did not restore its twenty swatches');
  else ok('Everyday palette restores twenty swatches');
  await capture(page,tag+'-colour-palettes');
  await page.keyboard.press('Escape');

  // New media must switch out of Solid Fill and enter stay-in-lines brush mode.
  for (const medium of ['oil','gouache','coloured-pencil']) {
    await page.click('[data-m="fill"]');
    await page.click('[data-pop="brushes"]');
    await page.locator('.m-pop:not([hidden]) .brush-button[data-tool="'+medium+'"]').click();
    await page.waitForTimeout(150);
    const state=await page.evaluate((selectedMedium) => ({
      selected:document.querySelector('.brush-button[data-tool="'+selectedMedium+'"]')?.classList.contains('active'),
      auto:document.querySelector('[data-mode="auto"]')?.classList.contains('active')
    }),medium);
    if(!state.selected||!state.auto)fail(tag, medium+' did not switch from fill to brush mode');
    else ok(medium+' switches from fill to brush mode');
    await page.keyboard.press('Escape');
  }
  // Every medium offers a circular style palette and choosing a preset
  // applies settings without reopening the chooser.
  for(const medium of ['watercolour','oil','gouache','coloured-pencil','paint']){
    if(medium==='watercolour'){
      // The styles control is contextual: explicitly select Watercolour first.
      await page.keyboard.press('Escape');
      await page.click('[data-pop="brushes"]');
      await page.locator('.m-pop-brushes [data-tool="watercolour"]').evaluate(button=>button.click());
      await page.waitForTimeout(250);
      await page.keyboard.press('Escape');
      const label=await page.locator('.m-watercolour').getAttribute('aria-label');
      if(!/watercolour/i.test(label||''))fail(tag,'contextual style control does not name the selected watercolour brush');
      await page.locator('.m-watercolour').click();
      if(await page.locator('.m-pop-watercolour:not(.m-pop-medium-styles)').isHidden()){
        fail(tag,'watercolour style panel did not open');
        await capture(page,tag+'-watercolour-panel-failure');
        throw Error('Watercolour style chooser hidden after selecting Watercolour; see screenshot artifact');
      }
      ok('watercolour style panel opens');
      await capture(page,tag+'-watercolour-styles');
      await page.locator('.m-pop-watercolour:not(.m-pop-medium-styles) .m-watercolour-style').first().click();
    }else{
      await page.keyboard.press('Escape');
      await page.click('[data-pop="brushes"]');
      await page.locator('.m-pop-brushes input[type="search"]').fill(medium);
      await page.locator('.m-pop-brushes [data-tool="'+medium+'"]').evaluate(button=>button.click());
      await page.waitForTimeout(250);
      const options=page.locator('.m-pop-medium-styles .m-watercolour-style');
      if(!(await page.locator('.m-pop-medium-styles').isVisible())||(await options.count())!==6)
        fail(tag,medium+' style chooser missing or not six choices');
      else ok(medium+' has six painting style choices');
      if(await page.locator('.m-pop-medium-styles').isVisible())
        await capture(page,tag+'-'+medium+'-styles');
      // A style panel must let users return to the brush library without losing the canvas.
      if(medium==='oil'){
        await page.locator('.m-style-back').click();
        if(!(await page.locator('.m-pop-brushes').isVisible()))fail(tag,'Back to brushes did not reopen the brush chooser');
        else ok('style chooser returns to brushes');
        await page.locator('.m-pop-brushes [data-tool="oil"]').evaluate(button=>button.click());
        await page.waitForTimeout(250);
      }
      await options.nth(2).click();
    }
    if(await page.locator('.m-pop-medium-styles').isVisible())fail(tag,medium+' chooser stayed open after preset');
    const selected=await page.locator('#brush-tools [data-tool="'+medium+'"]').getAttribute('aria-pressed');
    if(selected!=='true')fail(tag,medium+' preset did not select medium');
  }
  // Contextual material controls must remain accessible on phone and desktop.
  await page.click('[data-pop="brushes"]');
  await page.locator('.m-pop-brushes [data-tool="coloured-pencil"]').evaluate(button=>button.click());
  await page.waitForTimeout(250);
  await page.keyboard.press('Escape');
  await page.click('[data-pop="size"]');
  const mediumControl=page.locator('.m-pop-size #medium-control');
  const mediumLabel=page.locator('.m-pop-size #medium-label');
  if (!(await mediumControl.isVisible()) || (await mediumLabel.textContent())!=='Pencil hardness')
    fail(tag,'coloured-pencil hardness control missing from brush settings');
  else ok('contextual pencil hardness control visible in brush settings');
  await mediumControl.evaluate(el=>{el.value='77';el.dispatchEvent(new Event('input',{bubbles:true}));});
  if ((await page.locator('#medium-value').textContent())!=='77%')
    fail(tag,'medium setting does not update');
  await page.keyboard.press('Escape');
  await page.click('[data-pop="brushes"]');
  await page.locator('.m-pop:not([hidden]) .brush-button[data-tool="oil"]').evaluate(button=>button.click());
  await page.waitForTimeout(150);
  await page.click('[data-pop="size"]');
  if ((await mediumLabel.textContent())!=='Paint load')
    fail(tag,'oil paint load label not updated');
  await page.keyboard.press('Escape');
  await page.click('[data-pop="brushes"]');
  await page.locator('.m-pop:not([hidden]) .brush-button[data-tool="coloured-pencil"]').click();
  await page.waitForTimeout(150);
  await page.click('[data-pop="size"]');
  if ((await mediumControl.inputValue())!=='77')
    fail(tag,'pencil hardness did not persist across brush switching');
  else ok('medium settings persist across brush switching');
  await page.keyboard.press('Escape');
  // Pick a brush from the strip.
  await page.click('[data-pop="brushes"]');
  await page.waitForTimeout(350);
  const brush = page.locator('.m-pop:not([hidden]) .brush-button').nth(1);
  const brushName = (await brush.innerText()).replace(/\s+/g, ' ').trim();
  await brush.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  const active = await page.locator('.brush-button.active').count();
  if (!active) fail(tag, `picking ${brushName} left no brush active`); else ok(`picking a brush (${brushName}) works`);
  if (!(await page.locator('#share-page').isVisible())) fail(tag, 'the Share button is not visible'); else ok('the Share button is visible');

  // Back to the library, open the journal, turn a page.
  await page.click('#exit-studio');
  await page.waitForTimeout(1200);
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole('button', { name: 'My journal' }).first().click();
  await page.waitForTimeout(600);
  await audit(page, `${tag} journal cover`);
  await checkVisibleControlsFit(page, `${tag} journal cover`);
  await capture(page,`${tag}-journal`);
  await page.click('.journal-next');
  await page.waitForTimeout(1600);
  const where = await page.textContent('.journal-where');
  const pictures = await page.locator('.journal-art img').count();
  if (where !== 'Page 1 of 1' || pictures !== 1) fail(tag, `journal shows "${where}" with ${pictures} picture(s); expected page 1 of 1 with a picture`);
  else ok('the journal holds the coloured page and turns to it');
  const fit = await page.evaluate(() => {
    const i = document.querySelector('.journal-art img')?.getBoundingClientRect(), c = document.querySelector('.journal-leaf .journal-caption')?.getBoundingClientRect();
    return i && c ? i.bottom <= c.top + 1 : false;
  });
  if (!fit) fail(tag, 'the journal picture runs into its caption'); else ok('the journal picture fits above its caption');
  await audit(page, `${tag} journal page`);
  await capture(page,`${tag}-journal-page`);
  await page.click('.journal-close');

  if (errors.length) for (const e of errors) fail(tag, `browser error: ${e}`); else ok('no script errors or failed requests');
  await ctx.close();
}
// Landscape touch viewport: settings must stay in the rail, off the canvas.
{
 const ctx=await browser.newContext({ ...devices['Pixel 7'],viewport:{width:844,height:390},isMobile:true,hasTouch:true });
 await ctx.addInitScript(() => { try { localStorage.setItem('chromalie-storage-notice','seen'); } catch(e) {} });
 const page=await ctx.newPage();
 await page.goto(base,{waitUntil:'networkidle'});
 await page.click('#hero-start');
 await page.locator('.page-card').nth(1).click();
 await loaded(page);
 const tour=await page.locator('.guide-card').first().waitFor({state:'visible',timeout:5000}).then(()=>true,()=>false);
 if(tour){await page.keyboard.press('Escape');await page.waitForTimeout(300);}
 await page.click('[data-pop="size"]');
 const bounds=await page.evaluate(()=>{
  const c=document.querySelector('.studio-body>.canvas-area')?.getBoundingClientRect();
  const p=document.querySelector('.m-pop-size')?.getBoundingClientRect();
  const rail=document.querySelector('.studio-body>.tool-panel')?.getBoundingClientRect();
  return c&&p&&rail?{overlap:p.left<c.right&&p.right>c.left&&p.top<c.bottom&&p.bottom>c.top,inside:p.left>=rail.left-2&&p.right<=rail.right+2}:null;
 });
 if(!bounds||bounds.overlap||!bounds.inside)fail('844x390','brush settings obscure landscape canvas or escape tool rail');
 else ok('landscape brush settings stay in the side rail');
 await capture(page,'844x390-landscape-studio');
 await ctx.close();
}
// Additional narrow-phone and tablet smoke checks catch viewport regressions
// without repeating the full painting interaction suite.
for(const [w,h] of [[320,700],[430,932],[768,1024]]){
 const tag=w+'x'+h;
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<700,hasTouch:true});
 await ctx.addInitScript(()=>{try{localStorage.setItem('chromalie-storage-notice','seen');localStorage.setItem('chromalie-tour','done')}catch(e){}});
 const page=await ctx.newPage();
 await page.goto(base,{waitUntil:'networkidle'});
 await noOverflow(page,tag+' home');
 await checkVisibleControlsFit(page,tag+' home');
 await capture(page,tag+'-home');
 await page.click('#hero-start');
 await page.locator('.page-card').nth(1).click();
 await loaded(page);
 if(await page.locator('#retry-save').isVisible())fail(tag,'Retry save appears before a save failure');
 else ok('Save retry stays hidden when no failure is reported');
 await noOverflow(page,tag+' studio');
 await checkVisibleControlsFit(page,tag+' studio');
 await capture(page,tag+'-studio');
 await page.click('#exit-studio');
 await page.waitForTimeout(500);
 await page.evaluate(()=>scrollTo(0,0));
 await page.getByRole('button',{name:'My journal'}).first().click();
 await checkVisibleControlsFit(page,tag+' journal');
 await capture(page,tag+'-journal');
 await ctx.close();
}
// Exercise the actual IndexedDB failure path, then recover without losing the page.
{
 const tag='save-failure-recovery';
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});
 await ctx.addInitScript(()=>{localStorage.setItem('chromalie-storage-notice','seen');localStorage.setItem('chromalie-tour','done');});
 const page=await ctx.newPage();
 await page.goto(base,{waitUntil:'networkidle'});
 await page.click('#hero-start');
 await page.locator('.page-card').nth(1).click();
 await loaded(page);
 await page.waitForFunction(()=>!document.querySelector('.canvas-loading:not([hidden])'),null,{timeout:30000});
 await page.evaluate(()=>{
   const original=IDBObjectStore.prototype.put;
   window.__restoreArtworkWrites=()=>{IDBObjectStore.prototype.put=original;};
   IDBObjectStore.prototype.put=function(...args){
     if(this.name==='artwork')throw new DOMException('Simulated storage failure','QuotaExceededError');
     return original.apply(this,args);
   };
 });
 await page.click('[data-m="fill"]');
 const box=await page.locator('#canvas').boundingBox();
 await page.mouse.click(box.x+box.width*.5,box.y+box.height*.42);
 const retry=page.locator('#retry-save');
 await retry.waitFor({state:'visible',timeout:10000}).catch(()=>{});
 if(!await retry.isVisible())fail(tag,'A failed save did not expose Retry save');
 else ok('A failed IndexedDB write exposes Retry save');
 await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.textContent='';});
 await page.click('#exit-studio');
 // Leave starts another save. Wait until that attempt has failed before restoring writes,
 // otherwise the in-flight save can succeed and hide Retry save.
 await page.waitForFunction(()=>(document.querySelector('#toast')?.textContent||'').includes('Saving failed'),null,{timeout:15000});
 if(await page.locator('#studio').isHidden())fail(tag,'A failed save allowed the painting to close');
 else ok('The unsaved painting remains open after a failed save');
 if(!await retry.isVisible())fail(tag,'Retry save disappeared after a blocked exit');
 await page.evaluate(()=>window.__restoreArtworkWrites());
 await retry.click();
 await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='Saved on this device',{timeout:10000});
 if(await page.locator('#retry-save').isVisible())fail(tag,'Retry save remained visible after recovery');
 else ok('Retry save recovers after storage becomes available');
 await page.click('#exit-studio');
 if(!await page.locator('#studio').isHidden())fail(tag,'The painting could not close after recovery');
 else ok('The recovered painting closes normally');
 await ctx.close();
}
await browser.close();
server.close();

if (failures.length) { console.log(`\n${failures.length} failure(s).`); process.exit(1); }
console.log('\nAll browser checks passed.');

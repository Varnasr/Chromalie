// My journal: every page coloured on this device, as a flipbook, oldest first
// like a diary. It reads the same saved work the studio keeps (IndexedDB
// "colour-room", store "artwork"), so nothing is stored twice and nothing
// leaves the device. Each leaf is the page as it would download: the drawing,
// the paint, and the Chromalie footer with the page name and any art credit.
import { footerHeight, drawBrandFooter } from './brand.js';
import { count } from './count.js';
import { sharePicture } from './share.js';
import { keepAdvice } from './keep.js';

const $ = id => document.getElementById(id);
const dateText = t => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

// The button in the site header, beside My work.
const navButton = document.createElement('button');
navButton.className = 'nav-link';
navButton.type = 'button';
navButton.textContent = 'My journal';
document.querySelector('[data-view="work"]')?.after(navButton);

const book = document.createElement('div');
book.className = 'journal';
book.hidden = true;
book.setAttribute('role', 'dialog');
book.setAttribute('aria-modal', 'true');
book.setAttribute('aria-label', 'My journal');
book.innerHTML = `
  <div class="journal-bar">
    <button type="button" class="journal-close" aria-label="Close the journal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    <p class="journal-where" aria-live="polite"></p>
    <button type="button" class="journal-gallery-toggle" aria-pressed="false">Gallery view</button>
    <button type="button" class="journal-backup">Back up journal</button>
    <button type="button" class="journal-restore">Restore backup</button>
    <input class="journal-restore-file" type="file" accept=".json,application/json" hidden>
    <button type="button" class="journal-print">Print or save as PDF</button>
  </div>
  <div class="journal-stage">
    <button type="button" class="journal-turn journal-prev" aria-label="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <div class="journal-book"></div>
    <button type="button" class="journal-turn journal-next" aria-label="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>`;
document.body.append(book);
const leaves = book.querySelector('.journal-book');

let entries = [], at = 0, urls = new Map(), opener = null, turning = false, galleryMode = false;

function readSaved() {
  return new Promise(resolve => {
    let saving = true;
    try { saving = localStorage.getItem('chromalie-save-work') !== 'off'; } catch (e) {}
    if (!window.indexedDB) return resolve({ saving, items: [] });
    const req = indexedDB.open('colour-room');
    req.onerror = () => resolve({ saving, items: [] });
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('artwork')) { db.close(); return resolve({ saving, items: [] }); }
      const all = db.transaction('artwork').objectStore('artwork').getAll();
      all.onsuccess = () => { db.close(); resolve({ saving, items: all.result || [] }); };
      all.onerror = () => { db.close(); resolve({ saving, items: [] }); };
    };
  });
}

// The page as it would download: paper, paint, the drawing multiplied over it,
// and the Chromalie footer.
async function picture(entry) {
  if (urls.has(entry.id)) return urls.get(entry.id);
  const page = entry.page;
  const ink = new Image(); ink.src = page.image; await ink.decode();
  const paint = await createImageBitmap(entry.blob);
  const w = page.width, h = page.height, out = document.createElement('canvas');
  out.width = w; out.height = h + footerHeight(w);
  const c = out.getContext('2d');
  c.fillStyle = 'white'; c.fillRect(0, 0, w, h);
  c.drawImage(paint, 0, 0, w, h); paint.close();
  c.globalCompositeOperation = 'multiply'; c.drawImage(ink, 0, 0, w, h); c.globalCompositeOperation = 'source-over';
  drawBrandFooter(c, w, h, page);
  const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.9));
  const url = URL.createObjectURL(blob);
  urls.set(entry.id, url);
  return url;
}

function cover() {
  const leaf = document.createElement('article');
  leaf.className = 'journal-leaf journal-cover';
  const first = entries[0], last = entries[entries.length - 1];
  leaf.innerHTML = entries.length
    ? `<span class="brand-flower" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
       <h2>My Chromalie journal</h2>
       <p>${entries.length} ${entries.length === 1 ? 'page' : 'pages'} coloured</p>
       <p class="journal-dates">${dateText(first.updated)}${entries.length > 1 && dateText(first.updated) !== dateText(last.updated) ? ` to ${dateText(last.updated)}` : ''}</p>
       <p class="journal-hint">Swipe or use the arrows to turn the page.</p>
       ${keepAdvice ? `<p class="journal-keep-advice">${keepAdvice}</p>` : ''}`
    : `<span class="brand-flower" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
       <h2>My Chromalie journal</h2>
       <p>${saving ? 'Your journal fills itself as you colour. Every page you colour on this device appears here, with the date.' : 'Device saving is off, so nothing is kept for the journal. Turn it on in Storage settings to start one.'}</p>`;
  return leaf;
}
let saving = true;

async function leafFor(i) {
  if (i === 0) return cover();
  const entry = entries[i - 1];
  const leaf = document.createElement('article');
  leaf.className = 'journal-leaf';
  leaf.innerHTML = `<div class="journal-art"><span class="journal-loading">Opening the page…</span></div>
    <div class="journal-caption"><div><h2></h2><p></p></div><div class="journal-acts"><button type="button" class="icon-btn share-btn journal-share" aria-label="Share this page"><svg aria-hidden="true"><use href="#i-share"/></svg></button><button type="button" class="button small journal-keep">Keep colouring</button></div></div>`;
  leaf.querySelector('h2').textContent = entry.page.title;
  leaf.querySelector('p').textContent = `Last coloured ${dateText(entry.updated)}`;
  leaf.querySelector('.journal-share').onclick = async () => {
    const blob = await (await fetch(await picture(entry))).blob();
    sharePicture(blob, entry.page);
  };
  leaf.querySelector('.journal-keep').onclick = () => { close(); window.chromalieOpen?.(entry.id); };
  picture(entry).then(url => {
    const img = new Image();
    img.alt = `Your coloured ${entry.page.title}`;
    img.src = url;
    leaf.querySelector('.journal-art').replaceChildren(img);
  }).catch(() => { leaf.querySelector('.journal-loading').textContent = 'This page could not be opened.'; });
  return leaf;
}

async function showGallery() {
  const grid = document.createElement('div');
  grid.className = 'journal-gallery';
  grid.setAttribute('aria-label', 'Saved artwork gallery');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;overflow:auto;max-height:75vh;padding:20px;width:100%';
  if (!entries.length) { grid.textContent = 'Your saved artwork will appear here.'; leaves.replaceChildren(grid); return; }
  for (const [index, entry] of entries.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = 'background:#fff;border:1px solid #ddd5c8;border-radius:12px;padding:10px;cursor:pointer;text-align:left;color:inherit';
    const img = document.createElement('img');
    img.alt = entry.page.title;
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:160px;object-fit:contain';
    picture(entry).then(url => { img.src = url; }).catch(() => { img.alt = 'Preview unavailable'; });
    const name = document.createElement('strong');
    name.textContent = entry.page.title;
    name.style.display = 'block';
    const date = document.createElement('small');
    date.textContent = dateText(entry.updated);
    button.append(img, name, date);
    button.onclick = () => { galleryMode = false; updateGalleryToggle(); show(index + 1); };
    grid.append(button);
  }
  leaves.replaceChildren(grid);
}
function updateGalleryToggle() {
  const toggle = book.querySelector('.journal-gallery-toggle');
  toggle.textContent = galleryMode ? 'Flipbook view' : 'Gallery view';
  toggle.setAttribute('aria-pressed', String(galleryMode));
  book.querySelector('.journal-prev').hidden = galleryMode;
  book.querySelector('.journal-next').hidden = galleryMode;
}
book.querySelector('.journal-gallery-toggle').onclick = () => {
  galleryMode = !galleryMode;
  updateGalleryToggle();
  if (galleryMode) showGallery(); else show(at);
};
function where() {
  book.querySelector('.journal-where').textContent = at === 0 ? 'Cover' : `Page ${at} of ${entries.length}`;
  book.querySelector('.journal-prev').disabled = at === 0;
  book.querySelector('.journal-next').disabled = at >= entries.length;
  book.querySelector('.journal-print').disabled = !entries.length;
}

async function show(i, direction = 0) {
  if (turning || i < 0 || i > entries.length) return;
  if (galleryMode) { await showGallery(); return; }
  const old = leaves.querySelector('.journal-leaf');
  const leaf = await leafFor(i);
  at = i; where();
  if (!old || !direction || reduce.matches) { leaves.replaceChildren(leaf); return; }
  // Forward: the old leaf turns over to the left, uncovering the new one.
  // Back: the new leaf turns in from the left, over the old one.
  turning = true;
  if (direction > 0) { leaves.insertBefore(leaf, old); old.classList.add('turn-away'); }
  else { leaves.append(leaf); leaf.classList.add('turn-in'); }
  setTimeout(() => { leaves.replaceChildren(leaf); leaf.classList.remove('turn-in'); turning = false; }, 460);
}

async function open() {
  opener = document.activeElement;
  const [{ saving: s, items }] = await Promise.all([readSaved()]);
  saving = s;
  const catalog = window.chromalieCatalog?.() || { pages: [] };
  const byId = new Map(catalog.pages.map(p => [p.id, p]));
  entries = items.filter(e => e.blob && byId.has(e.id)).map(e => ({ ...e, page: byId.get(e.id) }))
    .sort((a, b) => a.updated - b.updated);
  book.hidden = false;
  galleryMode = false; updateGalleryToggle();
  document.body.classList.add('journal-open');
  count('journal');
  await show(0);
  book.querySelector('.journal-next').focus();
}
function close() {
  book.hidden = true;
  document.body.classList.remove('journal-open');
  leaves.replaceChildren();
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls = new Map();
  opener?.focus?.();
}

navButton.onclick = open;
book.querySelector('.journal-close').onclick = close;
book.querySelector('.journal-prev').onclick = () => show(at - 1, -1);
book.querySelector('.journal-next').onclick = () => show(at + 1, 1);
document.addEventListener('keydown', e => {
  if (book.hidden) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowRight') show(at + 1, 1);
  else if (e.key === 'ArrowLeft') show(at - 1, -1);
});
// Swipe to turn.
let startX = null;
leaves.addEventListener('pointerdown', e => { startX = e.clientX; });
leaves.addEventListener('pointerup', e => {
  if (startX === null) return;
  const dx = e.clientX - startX; startX = null;
  if (Math.abs(dx) > 50) dx < 0 ? show(at + 1, 1) : show(at - 1, -1);
});

// Print or save as PDF: every page, one to a sheet, as it would download.
book.querySelector('.journal-print').onclick = async () => {
  const btn = book.querySelector('.journal-print');
  if(btn.disabled)return;
  btn.disabled = true; btn.textContent = 'Preparing…';
  const imgs = [];
  let cleanupTimer;
  const cleanup = () => {
    clearTimeout(cleanupTimer);
    imgs.forEach(img => img.remove());
    window.removeEventListener('afterprint', cleanup);
    btn.disabled = false;
    btn.textContent = 'Print or save as PDF';
  };
  try {
    if(!entries.length)throw Error('There are no saved pages to print yet.');
    for (const entry of entries) {
      const img = new Image();
      img.className = 'print-art';
      img.src = await picture(entry);
      await img.decode();
      imgs.push(img);
    }
    document.body.append(...imgs);
    count('pdf');
    window.addEventListener('afterprint',cleanup,{once:true});
    // Some mobile browsers never fire afterprint; retain print pages until the
    // print interface has had time to capture them.
    cleanupTimer=setTimeout(cleanup,60000);
    window.print();
  } catch (error) {
    cleanup();
    alert('Could not prepare the journal for printing: ' + error.message);
  }
};


// Portable journal backup. This is an explicit local download, not a cloud upload.
const blobDataURL = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
const dataURLBlob = data => {
  if (typeof data !== 'string' || !/^data:image\/png;base64,/.test(data)) throw Error('Invalid artwork data');
  const raw = atob(data.slice(data.indexOf(',') + 1));
  if (raw.length > 25000000) throw Error('Artwork exceeds the import size limit');
  if (raw.length < 24 || [137,80,78,71,13,10,26,10].some((v,i) => raw.charCodeAt(i) !== v)) throw Error('Invalid PNG artwork');
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  return new Blob([bytes], {type: 'image/png'});
};
book.querySelector('.journal-backup').onclick = async () => {
  const button = book.querySelector('.journal-backup');
  button.disabled = true;
  try {
    const {items} = await readSaved();
    const artwork = [];
    for (const entry of items) {
      if (!entry.blob || !(entry.blob instanceof Blob)) continue;
      artwork.push({id: entry.id, updated: entry.updated,
        paint: await blobDataURL(entry.blob)});
    }
    const file = new Blob([JSON.stringify({format:'chromalie-journal',version:1,
      exported:new Date().toISOString(),artwork})],{type:'application/json'});
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chromalie-journal-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) { alert('Could not back up the journal: ' + error.message); }
  finally { button.disabled = false; }
};
const restoreInput = book.querySelector('.journal-restore-file');
book.querySelector('.journal-restore').onclick = () => restoreInput.click();
restoreInput.onchange = async () => {
  const file = restoreInput.files?.[0];
  restoreInput.value = '';
  if (!file) return;
  try {
    if (file.size > 250000000) throw Error('Backup file is too large');
    const backup = JSON.parse(await file.text());
    if (backup.format !== 'chromalie-journal' || backup.version !== 1 ||
        !Array.isArray(backup.artwork) || backup.artwork.length > 5000) throw Error('Not a compatible Chromalie backup');
    const catalog = window.chromalieCatalog?.() || {pages:[]};
    const pages = new Map(catalog.pages.map(p => [p.id,p]));
    const prepared = [];
    for (const item of backup.artwork) {
      if (!item || typeof item.id !== 'string' || !pages.has(item.id)) continue;
      const blob = dataURLBlob(item.paint);
      const bitmap = await createImageBitmap(blob);
      const page = pages.get(item.id);
      const compatible = bitmap.width === page.width && bitmap.height === page.height;
      bitmap.close();
      if (!compatible) throw Error('Artwork dimensions do not match the page: ' + item.id);
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 200;
      thumbCanvas.height = Math.round(200 * page.height / page.width);
      const thumbCtx = thumbCanvas.getContext('2d');
      const paintImage = await createImageBitmap(blob);
      thumbCtx.fillStyle = 'white';
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbCtx.drawImage(paintImage, 0, 0, thumbCanvas.width, thumbCanvas.height);
      paintImage.close();
      const thumb = await new Promise(resolve => thumbCanvas.toBlob(resolve, 'image/png'));
      prepared.push({id:item.id,blob,thumb,
        updated:Number.isFinite(item.updated)?item.updated:Date.now()});
    }
    if (!prepared.length) throw Error('No compatible artwork was found');
    if (prepared.length > 1000) throw Error('Too many artworks in one backup');
    if (!confirm('Restore ' + prepared.length + ' artworks? Existing work with the same page IDs will be kept.')) return;
    const db = await new Promise((resolve,reject) => {
      const req = indexedDB.open('colour-room');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!db.objectStoreNames.contains('artwork')) {db.close();throw Error('Artwork storage unavailable');}
    const existing = new Set((await readSaved()).items.map(e => e.id));
    const added = prepared.filter(e => !existing.has(e.id));
    await new Promise((resolve,reject) => {
      const tx = db.transaction('artwork','readwrite');
      const store = tx.objectStore('artwork');
      for (const item of added) store.put(item);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
    db.close();
    alert('Restored ' + added.length + ' artworks. ' + (prepared.length-added.length) + ' existing artworks were kept.');
    window.location.reload();
  } catch (error) { alert('Could not restore backup: ' + error.message); }
};

// Guidance in the studio: a short tour on the first visit, and a tip on every
// control when a mouse or pen rests on it or the keyboard reaches it. Touch gets
// no tips, because a press on a phone is a tap and should act at once.
const $ = id => document.getElementById(id);

const TIPS = {
  '#exit-studio': 'Back to the library.',
  '[data-m="fill"]': 'Tap a shape to fill it with one colour.',
  '[data-m="brush"]': 'Paint with the brush you chose. Open the bar below to change it.',
  '[data-m="erase"]': 'Rub out paint. The outlines stay.',
  '[data-pop="brushes"]': 'Choose a brush.',
  '[data-pop="size"]': 'Brush size, how see-through the paint is, and smoothing.',
  '[data-pop="shade"]': 'Lighter or darker, other palettes, and your own colours.',
  '.m-lines': 'A switch. On, paint stays inside the shape where you start. Off, it can cross any line.',
  '[data-pop="more"]': 'Pick a colour from the page, move it, select areas, gap closing, print, save and more.',
  '.m-custom': 'Mix any colour you like.',
  '.m-undo': 'Undo your last change (Ctrl+Z).',
  '.m-redo': 'Redo what you undid (Ctrl+Shift+Z).',
  '.m-full': 'Give the page the whole screen. Press again to bring the tools back.',
  '#focus-mode': 'Hide the tools so the page fills the screen. Press again to bring them back.',
  '#undo': 'Undo your last change (Ctrl+Z).',
  '#redo': 'Redo what you undid (Ctrl+Shift+Z).',
  '#share-page': 'Send your coloured page to WhatsApp or anywhere else.',
  '#download': 'Download your coloured page as a picture.',
  '#help-button': 'How every tool works, and the tour again.',
  '[data-mode="fill"]': 'Tap a shape to fill it with one colour.',
  '[data-mode="auto"]': 'Brush strokes stay inside the shape where they start.',
  '[data-mode="free"]': 'Paint anywhere, across the lines.',
  '[data-tool="fill"]': 'Flat, even colour.',
  '[data-tool="pencil"]': 'Light, grainy strokes that build up as you go over them.',
  '[data-tool="marker"]': 'Strong, even strokes with a chisel edge.',
  '[data-tool="paint"]': 'Thick, smooth colour.',
  '[data-tool="watercolour"]': 'Soft washes you can see through.',
  '[data-tool="pastel"]': 'Chalky, textured strokes.',
  '[data-tool="airbrush"]': 'A soft spray that builds up slowly.',
  '[data-tool="glitter"]': 'Sparkling speckles of colour.',
  '[data-tool="gradient"]': 'Fills a shape with your colour, shading from top to bottom.',
  '[data-tool="erase"]': 'Rub out paint. The outlines stay.',
  '[data-tool="picker"]': 'Tap the page to pick up a colour you have already used.',
  '[data-tool="hand"]': 'Drag to move the page around.',
  '[data-tool="select"]': 'Choose several shapes, then colour them all at once.',
  '#brush-size': 'How wide the brush is.',
  '#opacity': 'How much the paint lets the page show through.',
  '#smoothing': 'Evens out shaky lines as you draw.',
  '#gap-strength': 'Closes small breaks in the outlines so colour does not leak out.',
  '#paint-background': 'Lets you colour the background and very large areas.',
  '#palette-select': 'Switch to another set of colours.',
  '#custom-colour': 'Mix any colour you like.',
  '#add-colour': 'Keep this colour in your palette.',
  '#shade': 'Make the colour lighter or darker.',
  '#zoom-out': 'Zoom out.',
  '#zoom-in': 'Zoom in.',
  '#zoom-fit': 'Fit the whole page on the screen.',
  '#next-page': 'The next page in this book.',
  '#start-over': 'Clear all the paint from this page.',
  '#print': 'Print your coloured page.',
  '#save-project': 'Download a file you can reopen later to carry on colouring.',
  '#open-project': 'Reopen a project file you saved.'
};

const STEPS = [
  { at: '.m-tools', title: 'Fill, brush or rub out', text: 'Fill colours a whole shape with one tap. Brush paints with the brush you choose. Eraser rubs paint away and leaves the outlines.' },
  { at: '.m-swatches', title: 'Pick a colour', text: 'Tap a colour to use it. The rainbow circle at the end mixes any colour you like.' },
  { at: '.m-rail-toggle', title: 'Open the tools', text: 'On a phone the brushes, size, colours and more stay tucked away so the page has room. Tap Tools to open them. Layers are under More.' },
  { at: '.m-chips', title: 'More choices fold out', text: 'Each button here opens a short strip: the brushes, brush size, colours with their shade and suggestions, in the lines or freehand, and the rest under More, including layers.' },
  { at: '#viewport', title: 'Colour here', text: 'Tap or draw on the page. Pinch to zoom, and drag with two fingers to move it.' },
  { at: '.m-undo', title: 'Change your mind', text: 'Undo and redo sit on the page. The corner button gives the page the whole screen. Your work is kept on this device as you go.' },
  { at: '#download', title: 'Keep your page', text: 'Download or print your page when you are done. Help explains every tool and can show you this tour again.' }
];

const TOUR_KEY = 'chromalie-tour';
const store = {
  get() { try { return localStorage.getItem(TOUR_KEY); } catch (e) { return 'done'; } },
  set() { try { localStorage.setItem(TOUR_KEY, 'done'); } catch (e) {} }
};

// Tips --------------------------------------------------------------------
const tip = document.createElement('div');
tip.className = 'guide-tip';
tip.setAttribute('role', 'tooltip');
tip.id = 'guide-tip';
tip.hidden = true;
document.body.append(tip);

for (const [sel, text] of Object.entries(TIPS)) {
  for (const el of document.querySelectorAll(sel)) {
    el.dataset.tip = text;
    el.removeAttribute('title');
  }
}
// Brush buttons are written by app.js before this module runs; anything added
// later picks up its tip here.
new MutationObserver(() => {
  for (const [sel, text] of Object.entries(TIPS))
    for (const el of document.querySelectorAll(sel)) if (!el.dataset.tip) el.dataset.tip = text;
}).observe($('studio'), { childList: true, subtree: true });

let timer = 0, owner = null;
function place(box, target, gap = 10) {
  const r = target.getBoundingClientRect ? target.getBoundingClientRect() : target, b = box.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight;
  let top = r.bottom + gap;
  if (top + b.height > vh - 8) top = Math.max(8, r.top - gap - b.height);
  let left = r.left + r.width / 2 - b.width / 2;
  left = Math.min(Math.max(8, left), vw - b.width - 8);
  box.style.top = `${Math.round(top)}px`;
  box.style.left = `${Math.round(left)}px`;
}
function showTip(el) {
  if (tourOpen || !el.dataset.tip || !shown(el)) return;
  owner = el;
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  el.setAttribute('aria-describedby', 'guide-tip');
  place(tip, el);
}
function hideTip() {
  clearTimeout(timer);
  if (owner) owner.removeAttribute('aria-describedby');
  owner = null;
  tip.hidden = true;
}
const tipTarget = e => e.target.closest?.('[data-tip]');
document.addEventListener('pointerover', e => {
  if (e.pointerType === 'touch') return;
  const el = tipTarget(e);
  if (!el || el === owner) return;
  hideTip();
  timer = setTimeout(() => showTip(el), 450);
});
document.addEventListener('pointerout', e => {
  const el = tipTarget(e);
  if (el && !el.contains(e.relatedTarget)) hideTip();
});
document.addEventListener('pointerdown', hideTip);
document.addEventListener('focusin', e => {
  const el = tipTarget(e);
  if (el && el.matches(':focus-visible')) showTip(el); else hideTip();
});
document.addEventListener('focusout', hideTip);
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, true);

// Tour --------------------------------------------------------------------
let tourOpen = false, step = 0, steps = [];
const ring = document.createElement('div');
ring.className = 'guide-ring';
ring.hidden = true;
const card = document.createElement('div');
card.className = 'guide-card';
card.setAttribute('role', 'dialog');
card.setAttribute('aria-labelledby', 'guide-title');
card.hidden = true;
card.innerHTML = '<p class="guide-count" id="guide-count"></p><h2 id="guide-title"></h2><p id="guide-text"></p>' +
  '<div class="guide-actions"><button type="button" class="guide-skip" id="guide-skip">Skip tour</button>' +
  '<span><button type="button" class="guide-back" id="guide-back">Back</button>' +
  '<button type="button" class="button guide-next" id="guide-next">Next</button></span></div>';
document.body.append(ring, card);

// offsetParent is null for a fixed-position element even when it is on screen, so ask for
// a layout box instead.
const shown = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
function visible(sel) {
  const el = document.querySelector(sel);
  // A tool may be inside a closed sheet or another tab; open it first.
  if (el && !shown(el)) window.chromalieShowGroup?.(el);
  return el && shown(el) ? el : null;
}

function show() {
  const s = steps[step], el = visible(s.at);
  if (!el) { close(); return; }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('guide-count').textContent = `${step + 1} of ${steps.length}`;
  $('guide-title').textContent = s.title;
  $('guide-text').textContent = s.text;
  $('guide-back').hidden = step === 0;
  $('guide-next').textContent = step === steps.length - 1 ? 'Start colouring' : 'Next';
  ring.hidden = card.hidden = false;
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect(), pad = 6;
    const top = Math.max(2, r.top - pad), left = Math.max(2, r.left - pad);
    const bottom = Math.min(innerHeight - 2, r.bottom + pad), right = Math.min(innerWidth - 2, r.right + pad);
    Object.assign(ring.style, { top: `${top}px`, left: `${left}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    // The page itself is most of the screen, so its card sits at the bottom
    // of the page area, not below it.
    if (s.at === '#viewport') {
      const b = card.getBoundingClientRect();
      card.style.top = `${Math.round(bottom - b.height - 14)}px`;
      card.style.left = `${Math.round(Math.max(8, Math.min(innerWidth - b.width - 8, left + (right - left - b.width) / 2)))}px`;
    } else place(card, { top, left, bottom, right, width: right - left, height: bottom - top }, 12);
    $('guide-next').focus({ preventScroll: true });
  });
}
function open() {
  steps = STEPS.filter(s => visible(s.at));
  if (!steps.length) return;
  hideTip();
  tourOpen = true; step = 0;
  show();
}
function close() {
  tourOpen = false; ring.hidden = card.hidden = true; store.set();
  $('exit-studio')?.focus({ preventScroll: true });
}
$('guide-next').onclick = () => { if (step < steps.length - 1) { step++; show(); } else close(); };
$('guide-back').onclick = () => { if (step > 0) { step--; show(); } };
$('guide-skip').onclick = close;
document.addEventListener('keydown', e => {
  if (!tourOpen) return;
  if (e.key === 'Escape') { e.stopPropagation(); close(); }
}, true);
addEventListener('resize', () => { if (tourOpen) show(); });
$('studio').addEventListener('scroll', () => { if (tourOpen) show(); }, true);
// The studio is hidden while the library shows; leaving it ends the tour.
new MutationObserver(() => { if ($('studio').hidden && tourOpen) { tourOpen = false; ring.hidden = card.hidden = true; } })
  .observe($('studio'), { attributes: true, attributeFilter: ['hidden'] });

// First visit: start once the page has finished loading in the studio.
new MutationObserver(() => {
  if (!$('studio').hidden && $('loading').hidden && !tourOpen && store.get() !== 'done') setTimeout(open, 300);
}).observe($('loading'), { attributes: true, attributeFilter: ['hidden'] });

// Help offers the tour again.
$('help-button').addEventListener('click', () => {
  const content = $('dialog-content');
  if (!content || content.querySelector('.guide-replay')) return;
  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'guide-replay';
  again.textContent = 'Show me the tour again';
  again.onclick = () => { $('info-dialog').close(); setTimeout(open, 50); };
  content.append(again);
});

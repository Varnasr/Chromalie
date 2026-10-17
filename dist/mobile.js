// The studio, page first, at every screen size. The page takes the screen and
// a short sheet at the bottom holds a row of colours, Fill / Brush / Eraser,
// and a row of small round buttons. Each of those folds out one short strip
// for one job: brushes, size, shade, in the lines or freehand, and the rest
// under "More". Undo, redo and full screen float over the page.
//
// The strips hold the real controls, moved here from the old tool panel, so
// their handlers in app.js keep working and app.js stays the only place that
// decides what a tool does. The old panel itself is never shown.
const $ = id => document.getElementById(id);
const panel = document.querySelector('.tool-panel');
const area = document.querySelector('.canvas-area');
const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const use = id => svg(`<use href="#${id}"/>`);
const line = d => svg(`<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);

// The sheet -----------------------------------------------------------------
const quick = document.createElement('div');
quick.className = 'm-quick';
quick.innerHTML = `
  <div class="m-swatches" role="group" aria-label="Colours"></div>
  <div class="m-tools" role="group" aria-label="Tool">
    <button type="button" data-m="fill">${use('i-fill')}<span>Fill</span></button>
    <button type="button" data-m="brush">${use('i-brush')}<span>Brush</span></button>
    <button type="button" data-m="erase">${use('i-erase')}<span>Eraser</span></button>
  </div>
  <div class="m-selection"></div>
  <div class="m-chips" role="group" aria-label="More choices">
    <button type="button" class="m-chip-btn" data-pop="brushes" aria-expanded="false">${use('i-brush')}<span class="m-chip-label" data-for="brush">Brushes</span></button>
    <button type="button" class="m-chip-btn m-watercolour" title="Paint with watercolour" aria-label="Choose Watercolour brush"><span aria-hidden="true">◉</span><span class="m-style-label">Watercolour styles</span></button>
    <button type="button" class="m-chip-btn" data-pop="size" aria-expanded="false"><span class="m-dot" aria-hidden="true"></span><span class="m-chip-label" data-for="size">Size</span></button>
    <button type="button" class="m-chip-btn" data-pop="shade" aria-expanded="false"><span class="m-colour" aria-hidden="true"></span><span>Colours</span></button>
    <button type="button" class="m-chip-btn m-lines" aria-pressed="true">${line('M4 6h16M4 12h16M4 18h16')}<span class="m-chip-label" data-for="lines">In the lines</span></button>
    <button type="button" class="m-chip-btn" data-pop="more" aria-expanded="false">${line('M5 12h.01M12 12h.01M19 12h.01')}<span>More</span></button>
  </div>`;
panel.prepend(quick);
const railToggle=document.createElement('button');
railToggle.type='button';railToggle.className='m-rail-toggle';
railToggle.textContent='Tools +';railToggle.setAttribute('aria-expanded','false');
quick.classList.add('m-rail-collapsed');
railToggle.setAttribute('aria-label','Show or hide painting tools');
quick.append(railToggle);
railToggle.addEventListener('click',()=>{
 const collapsed=quick.classList.toggle('m-rail-collapsed');
 if(collapsed)closeAll();
 railToggle.setAttribute('aria-expanded',String(!collapsed));
 railToggle.textContent=collapsed?'Tools +':'Tools −';
});

const press = sel => document.querySelector(sel)?.click();
const currentMode = () => document.querySelector('.mode-tabs [data-mode].active')?.dataset.mode || 'auto';
const currentTool = () => document.querySelector('[data-tool].active')?.dataset.tool;

quick.querySelector('[data-m="fill"]').onclick = () => press('.mode-tabs [data-mode="fill"]');
quick.querySelector('[data-m="erase"]').onclick = () => press('.utility-tools [data-tool="erase"]');
// Brush keeps In the lines or Freehand, whichever was chosen last; from Fill it
// goes to In the lines, which is the safer default.
let lastBrushMode = 'auto';
quick.querySelector('[data-m="brush"]').onclick = () => {
  const mode = currentMode();
  press(`.mode-tabs [data-mode="${mode === 'fill' ? lastBrushMode : mode}"]`);
  toggle('brushes');
};
// A visible shortcut makes watercolour discoverable without searching the brush library.
// Watercolour has a visible palette of distinct painting presets.
const watercolourStyles=[
  {name:'Soft wash',size:75,opacity:42,wet:85},
  {name:'Round brush',size:24,opacity:75,wet:52},
  {name:'Fine detail',size:8,opacity:92,wet:24},
  {name:'Dry brush',size:38,opacity:82,wet:12},
  {name:'Glaze',size:54,opacity:25,wet:65},
  {name:'Wet bloom',size:95,opacity:35,wet:100}
];
const wcPanel=document.createElement('div');
wcPanel.className='m-pop m-pop-watercolour';
wcPanel.hidden=true;
wcPanel.setAttribute('role','dialog');
wcPanel.setAttribute('aria-label','Watercolour painting styles');
wcPanel.innerHTML='<p class="m-pop-title">Watercolour styles</p><div class="m-watercolour-wheel"></div><p class="m-watercolour-help">Choose a brush style and adjust wetness here.</p>';
quick.append(wcPanel);
// Draw representative marks in each circular selector, rather than identical dots.
function paintPresetMark(node,medium,index){
 const c=document.createElement('canvas');c.width=c.height=88;c.className='m-preset-preview';
 const g=c.getContext('2d');const colours={watercolour:'#508cae',oil:'#967653',gouache:'#c47565',paint:'#728c65','coloured-pencil':'#ab6676',pencil:'#636b70',charcoal:'#555963',pastel:'#aa88b1',marker:'#6b9d8c',ink:'#385c74',airbrush:'#6c9cbd',drybrush:'#a17d61',glitter:'#a78a43',smudge:'#8a97a1'};
 const col=colours[medium]||'#638da0';
 g.lineCap='round';g.lineJoin='round';
 if(index===0||index===4||index===5||medium==='watercolour'||medium==='airbrush'){
  const r=index===2?15:index===4?33:29;
  const grad=g.createRadialGradient(44,44,2,44,44,r);
  grad.addColorStop(0,col);grad.addColorStop(.6,col+'99');grad.addColorStop(1,col+'00');
  g.globalAlpha=index===4?.38:index===0?.55:.85;
  g.fillStyle=grad;g.beginPath();g.arc(44,44,r,0,Math.PI*2);g.fill();g.globalAlpha=1;
 }
 g.strokeStyle=col;
 g.lineWidth=[12,17,2.8,9,24,7][index];
 g.globalAlpha=[.4,.9,.95,.72,.3,.5][index];
 if(index===3||medium==='drybrush'||medium==='charcoal'||medium==='coloured-pencil'){
  for(let j=0;j<7;j++){
   g.beginPath();g.lineWidth=index===2?1.5:Math.max(1,7-j*.65);
   g.moveTo(19,26+j*5);g.quadraticCurveTo(45,11+j*6,70,35+j*4);g.stroke();
  }
 }else{
  g.beginPath();g.moveTo(20,55);g.bezierCurveTo(29,16,54,68,69,29);g.stroke();
 }
 g.globalAlpha=1;
 node.replaceChildren(c);
}
const wcWheel=wcPanel.querySelector('.m-watercolour-wheel');
const wetnessControl=document.createElement('label');
wetnessControl.className='m-watercolour-wetness';
wetnessControl.innerHTML='<span>Wetness <output>50%</output></span><input type="range" min="0" max="100" value="50" aria-label="Watercolour wetness">';
wcPanel.append(wetnessControl);
const wetnessSlider=wetnessControl.querySelector('input');
const syncWetness=()=>{const original=$('medium-control');if(original)wetnessSlider.value=original.value;wetnessControl.querySelector('output').textContent=wetnessSlider.value+'%';};
wetnessSlider.addEventListener('input',()=>{const original=$('medium-control');if(original){original.value=wetnessSlider.value;original.dispatchEvent(new Event('input',{bubbles:true}));}syncWetness();});
for(const preset of watercolourStyles){
 const b=document.createElement('button');
 b.type='button';b.className='m-watercolour-style';
 b.innerHTML='<span class="m-watercolour-mark" aria-hidden="true"></span><span>'+preset.name+'</span>';
 b.setAttribute('aria-label',preset.name+' watercolour style');
 paintPresetMark(b.querySelector('.m-watercolour-mark'),'watercolour',watercolourStyles.indexOf(preset));
 b.onclick=()=>{
  press('.mode-tabs [data-mode="auto"]');
  press('#brush-tools [data-tool="watercolour"]');
  const apply=(id,value)=>{const el=$(id);if(el){el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));}};
  apply('brush-size',preset.size);
  apply('opacity',preset.opacity);
  document.documentElement.dataset.paintMedium='watercolour';
  document.documentElement.dataset.paintStyle=String(watercolourStyles.indexOf(preset));
  apply('medium-control',preset.wet);
  syncWetness();
  wcWheel.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  closeAll();
 };
 wcWheel.append(b);
}
// Every painting medium has a circular preset palette, not only watercolour.
// Presets adjust the existing engine; they are not separate physical simulations.
let applyingStylePreset=false;
const mediumPresets={
 paint:['Soft acrylic','Flat colour','Detail','Dry texture','Broad strokes','Layering'],
 oil:['Loaded brush','Soft blend','Fine detail','Thick stroke','Light scumble','Glaze'],
 gouache:['Opaque block','Soft matte','Fine detail','Dry texture','Broad flat','Light layer'],
 'coloured-pencil':['Light sketch','Firm line','Fine point','Soft shading','Crosshatch','Layered colour'],
 pencil:['Light sketch','Firm line','Fine point','Soft shading','Hatching','Dark line'],
 marker:['Light marker','Bold marker','Fine tip','Broad tip','Soft layer','Dense colour'],
 pastel:['Soft pastel','Dense pastel','Fine edge','Wide shading','Light dust','Layered pastel'],
 charcoal:['Soft charcoal','Deep charcoal','Fine line','Broad shading','Dry grain','Light sketch'],
 drybrush:['Soft texture','Strong texture','Fine grain','Broad grain','Light strokes','Dense strokes'],
 ink:['Fine nib','Bold ink','Calligraphy','Dry ink','Soft ink','Wide nib'],
 airbrush:['Soft mist','Dense spray','Fine spray','Broad spray','Light haze','Layered spray'],
 glitter:['Fine sparkle','Dense sparkle','Small flecks','Wide sparkle','Light dust','Bold sparkle'],
 smudge:['Gentle blend','Strong blend','Fine blend','Broad blend','Light smudge','Deep smudge']
};
const presetShapes=[
 {size:65,opacity:38,level:80},{size:38,opacity:95,level:88},
 {size:8,opacity:90,level:55},{size:54,opacity:70,level:22},
 {size:100,opacity:50,level:45},{size:42,opacity:28,level:65}
];
const stylePanel=document.createElement('div');
stylePanel.className='m-pop m-pop-watercolour m-pop-medium-styles';
stylePanel.hidden=true;stylePanel.setAttribute('role','dialog');
stylePanel.setAttribute('aria-label','Painting styles');
stylePanel.innerHTML='<p class="m-pop-title">Painting styles</p><div class="m-watercolour-wheel"></div><p class="m-watercolour-help">Select a style, then fine-tune the brush under Size.</p>';
quick.append(stylePanel);
const styleWheel=stylePanel.querySelector('.m-watercolour-wheel');
const styleBack=document.createElement('button');
styleBack.type='button';styleBack.className='m-style-back';
styleBack.textContent='← All brushes';
styleBack.setAttribute('aria-label','Back to brush choices');
stylePanel.prepend(styleBack);
styleBack.addEventListener('click',()=>toggle('brushes'));
const brushHeading=document.createElement('p');
brushHeading.className='m-brush-current';
brushHeading.setAttribute('aria-live','polite');
brushHeading.textContent='Choose a painting medium';
function showMediumStyles(medium){
 const names=mediumPresets[medium];
 if(!names)return;
 stylePanel.querySelector('.m-pop-title').textContent=(document.querySelector('#brush-tools [data-tool="'+medium+'"]')?.textContent.trim()||medium)+' styles';
 styleWheel.replaceChildren();
 names.forEach((name,i)=>{
  const b=document.createElement('button');b.type='button';b.className='m-watercolour-style';
  b.innerHTML='<span class="m-watercolour-mark" aria-hidden="true"></span><span></span>';
  b.lastElementChild.textContent=name;
  b.setAttribute('aria-label',name+' style');
  paintPresetMark(b.querySelector('.m-watercolour-mark'),medium,i);
  b.onclick=()=>{
   press('.mode-tabs [data-mode="auto"]');
   applyingStylePreset=true;
   press('#brush-tools [data-tool="'+medium+'"]');
   applyingStylePreset=false;
   document.documentElement.dataset.paintMedium=medium;
   document.documentElement.dataset.paintStyle=String(i);
   const shape=presetShapes[i];
   for(const [id,value] of [['brush-size',shape.size],['opacity',shape.opacity],['medium-control',shape.level]]){
    const el=$(id);if(el){el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));}
   }
   closeAll();
  };
  styleWheel.append(b);
 });
 closeAll();stylePanel.hidden=false;
}
quick.querySelector('.m-watercolour').setAttribute('aria-haspopup','dialog');
quick.querySelector('.m-watercolour').setAttribute('aria-expanded','false');
quick.querySelector('.m-watercolour').onclick = () => {
 const medium=document.querySelector('#brush-tools [data-tool].active')?.dataset.tool || 'watercolour';
 if(medium!=='watercolour' && mediumPresets[medium]){
   showMediumStyles(medium);
   quick.querySelector('.m-watercolour').setAttribute('aria-expanded','true');
   return;
 }
 syncWetness();
 const opening=wcPanel.hidden;
 closeAll();
 wcPanel.hidden=!opening;
 quick.querySelector('.m-watercolour').setAttribute('aria-expanded',String(opening));
};
quick.querySelector('.m-lines').onclick = () => {
  const next = currentMode() === 'auto' ? 'free' : 'auto';
  lastBrushMode = next;
  press(`.mode-tabs [data-mode="${next}"]`);
};

// Fold-out strips ------------------------------------------------------------
function strip(name, title, parts) {
  const pop = document.createElement('div');
  pop.className = `m-pop m-pop-${name}`;
  pop.dataset.pop = name;
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', title);
  pop.innerHTML = `<p class="m-pop-title">${title}</p>`;
  for (const el of parts) if (el) pop.append(el);
  quick.append(pop);
  return pop;
}
const q = sel => panel.querySelector(sel);
const parentOf = id => $(id)?.closest('label');

// Keep brush search and favourites with the brush grid on mobile.
// app.js inserts the finder immediately before #brush-tools in the desktop panel.
const brushGrid=$('brush-tools');
const brushFinder=panel.querySelector('.chromalie-brush-finder');
const brushEmpty=panel.querySelector('.brush-empty');
strip('brushes', 'Choose a brush', [brushFinder,brushGrid,brushEmpty]);
strip('size', 'Brush', [$('size-label'), parentOf('opacity'), $('medium-setting'), parentOf('smoothing')]);
strip('shade', 'Colour palettes and shades', [q('.palette-heading'), q('.palette-switcher'), q('.palette-select-label'), $('swatches'), q('.shade-control'), q('.custom-colour')]);

// More: the utility tools other than the eraser, the page settings, and the
// page actions, as one list.
const moreList = document.createElement('div');
moreList.className = 'm-more-list';
const util = q('.utility-tools');
for (const b of [...util.querySelectorAll('[data-tool]')]) if (b.dataset.tool !== 'erase') moreList.append(b);
const pageButtons = document.createElement('div');
pageButtons.className = 'm-more-actions';
const help = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Help' });
help.onclick = () => { closeAll(); $('help-button').click(); };
const next = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Next page' });
next.onclick = () => { closeAll(); $('next-page').click(); };
pageButtons.append(next, help, ...q('.project-actions').children, ...q('.panel-bottom').children);
strip('more', 'More', [moreList, q('.layer-controls'), ...q('.tool-settings').querySelectorAll('.gap-setting'), pageButtons, q('.studio-policy-links')]);
quick.querySelector('.m-selection').append($('selection-info'));

// Pointer hover and keyboard focus reveal where to change brush types.
// Touch devices receive the same guidance via the button's accessible label.
const brushChoice=quick.querySelector('.m-chip-btn[data-pop="brushes"]');
brushChoice.title='Choose your brush type here';
brushChoice.setAttribute('aria-label','Choose your brush type here');
brushChoice.setAttribute('aria-haspopup','dialog');
const brushMain=quick.querySelector('[data-m="brush"]');
brushMain.title='Choose your brush type';
brushMain.setAttribute('aria-label','Brush — choose your brush type');
const chips = [...quick.querySelectorAll('[data-pop]')].filter(b => b.classList.contains('m-chip-btn'));
function closeAll() {
  for (const p of quick.querySelectorAll('.m-pop')) p.hidden = true;
  for (const b of chips) b.setAttribute('aria-expanded', 'false');
  quick.querySelector('.m-watercolour').setAttribute('aria-expanded','false');
}
function toggle(name) {
  const pop = quick.querySelector(`.m-pop[data-pop="${name}"]`), open = pop.hidden;
  closeAll();
  if (!open) return;
  lastPopoverTrigger=quick.querySelector(`.m-chip-btn[data-pop="${name}"]`);
  pop.hidden = false;
  quick.querySelector(`.m-chip-btn[data-pop="${name}"]`).setAttribute('aria-expanded', 'true');
}
for (const b of chips) b.onclick = () => toggle(b.dataset.pop);
// Dismiss temporary panels with Escape and when tapping outside the tool rail.
// This matters particularly in landscape, where the popover sits over the canvas.
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !quick.querySelector('.m-pop:not([hidden])')) return;
  event.preventDefault();
  closeAll();
  lastPopoverTrigger?.focus();
});
// Expose which brush selector opened the dialog and return focus when
// closing via Escape, without moving focus during ordinary painting.
let lastPopoverTrigger=null;
document.addEventListener('pointerdown', event => {
  if (!quick.querySelector('.m-pop:not([hidden])')) return;
  if (quick.contains(event.target)) return;
  closeAll();
}, {capture:true});

// Choosing a brush or a tool in a strip is a decision made; fold the strip away.
quick.querySelector('.m-pop-brushes').prepend(brushHeading);
quick.querySelector('.m-pop-brushes').addEventListener('click', e => { const brush=e.target.closest('[data-tool]');if(brush&&!applyingStylePreset){const medium=brush.dataset.tool;setTimeout(()=>{if(mediumPresets[medium])showMediumStyles(medium);else closeAll();},150);} });
moreList.addEventListener('click', e => { if (e.target.closest('[data-tool]')) setTimeout(closeAll, 120); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('.m-quick') && !e.target.closest('input[type=color]')) closeAll(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

// Colours: the palette in one row, each pressing the real swatch -------------
const mirror = quick.querySelector('.m-swatches');
function mirrorSwatches() {
  mirror.textContent = '';
  for (const s of $('swatches').children) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm-swatch' + (s.classList.contains('active') ? ' active' : '');
    b.style.background = s.style.background || getComputedStyle(s).backgroundColor;
    b.setAttribute('aria-label', s.getAttribute('aria-label') || s.title || 'Colour');
    b.setAttribute('aria-pressed', String(s.classList.contains('active')));
    b.onclick = () => s.click();
    mirror.append(b);
  }
  const custom = document.createElement('button');
  custom.type = 'button';
  custom.className = 'm-swatch m-custom';
  custom.setAttribute('aria-label', 'Mix your own colour');
  custom.onclick = () => $('custom-colour').click();
  mirror.append(custom);
}
new MutationObserver(mirrorSwatches).observe($('swatches'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
mirrorSwatches();

// Everything on the sheet follows the real state ------------------------------
function sync() {
  const tool = currentTool(), mode = currentMode();
  if (mode !== 'fill') lastBrushMode = mode;
  const kind = tool === 'erase' ? 'erase' : mode === 'fill' ? 'fill' : 'brush';
  for (const b of quick.querySelectorAll('.m-tools button')) {
    const on = b.dataset.m === kind;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  }
  const activeBrush=document.querySelector('#brush-tools [data-tool].active');
  const brushName=activeBrush?.textContent.trim();
  brushHeading.textContent=brushName?'Selected: '+brushName:'Choose a painting medium';
  const medium=activeBrush?.dataset.tool || 'watercolour';
  const styleButton=quick.querySelector('.m-watercolour');
  const styleLabel=styleButton.querySelector('.m-style-label');
  const styleName=(brushName||medium.replace(/-/g,' ')).replace(/\s+/g,' ').trim();
  styleLabel.textContent=styleName+' styles';
  styleButton.dataset.medium=medium;
  styleButton.setAttribute('aria-label','Choose '+styleName+' styles');
  styleButton.title='Choose '+styleName+' styles';
  // A soft hyphen lets the one long brush name break cleanly on a narrow button.
  quick.querySelector('[data-for="brush"]').textContent = 'Brushes';
  const size = +$('brush-size').value;
  quick.querySelector('[data-for="size"]').textContent = `Size ${size}`;
  quick.querySelector('.m-dot').style.setProperty('--d', `${Math.round(6 + Math.min(size, 150) / 150 * 16)}px`);
  const activeSwatch = $('swatches').querySelector('.active');
  quick.querySelector('.m-colour').style.background = $('current-colour').style.background
    || (activeSwatch && (activeSwatch.style.background || getComputedStyle(activeSwatch).backgroundColor)) || '';
  const lines = quick.querySelector('.m-lines');
  lines.querySelector('[data-for="lines"]').textContent = lastBrushMode === 'free' ? 'Freehand' : 'In the lines';
  lines.setAttribute('aria-pressed', String(lastBrushMode !== 'free'));
  lines.classList.toggle('dim', kind !== 'brush');
}
new MutationObserver(sync).observe($('studio'), { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
$('brush-size').addEventListener('input', sync);
sync();

// Floating buttons over the page ------------------------------------------------
const float = document.createElement('div');
float.className = 'm-float';
float.innerHTML = `
  <button type="button" class="m-fab m-undo" aria-label="Undo">${use('i-undo')}</button>
  <button type="button" class="m-fab m-redo" aria-label="Redo">${use('i-redo')}</button>
  <button type="button" class="m-fab m-full" aria-label="Full screen" aria-pressed="false">${line('M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5')}</button>`;
area.append(float);
float.querySelector('.m-undo').onclick = () => $('undo').click();
float.querySelector('.m-redo').onclick = () => $('redo').click();
float.querySelector('.m-full').onclick = () => {
  closeAll();
  $('focus-mode').click();
  float.querySelector('.m-full').setAttribute('aria-pressed', String($('studio').classList.contains('studio-focus')));
};
const history = () => {
  float.querySelector('.m-undo').disabled = $('undo').disabled;
  float.querySelector('.m-redo').disabled = $('redo').disabled;
};
new MutationObserver(history).observe($('undo'), { attributes: true, attributeFilter: ['disabled'] });
new MutationObserver(history).observe($('redo'), { attributes: true, attributeFilter: ['disabled'] });
history();

// Leaving the studio folds every strip away.
new MutationObserver(() => { if ($('studio').hidden) closeAll(); })
  .observe($('studio'), { attributes: true, attributeFilter: ['hidden'] });

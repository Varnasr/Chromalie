import {regionAt,hexToRgb,shadeColour,blendPixel,isBackgroundArea,maskPixels,stabilisePoint} from './engine.js';
import {brand,applyCollectionNames,footerHeight,drawBrandFooter} from './brand.js';
const $=id=>document.getElementById(id), icon=name=>`<svg><use href="#i-${name}"/></svg>`;
const palettes={
 everyday:['#ed3b42','#f66b27','#ffb51b','#ffe44b','#78c83e','#16a765','#11b8ad','#16a4e0','#2766d7','#6549c8','#ad4fc2','#e84c99','#f4a7b9','#f5d2aa','#a9d6f2','#b7dfaa','#8b5c42','#6f747a','#ffffff','#20252b'],
 garden:['#638765','#91a582','#b2c49c','#d8d7a5','#d6b865','#ba8b54','#d6a09e','#b77583','#80596b','#a1b4b0','#608e9a','#405c71','#faf6e8','#cfc6b7','#858478','#494f42','#c29264','#e8c6ac'],
 bright:['#ef5654','#f99740','#ffd657','#9cc852','#49a475','#21b2ac','#49aed9','#4782cd','#615aaf','#a862b7','#dd659d','#f2a6a2','#ffecce','#b6d7a0','#bdceef','#5d6687','#744941','#323d3c'],
 earth:['#715744','#9f7760','#c89571','#dbb78c','#e2c998','#ecd9b8','#5c6949','#819166','#a9ad83','#c2bb96','#844c4c','#b97970','#d69c8b','#5b7580','#8eabae','#cccac3','#f2eee3','#333a33'],
 pastel:['#e6b1b0','#ebc6ae','#f0dcac','#d9deb5','#bcd4bf','#bdded6','#b9d3e2','#bbc5df','#ccc0df','#d7b8d0','#efd0d7','#f2e7d4','#f8f5e9','#d9d6cf','#b2b5a6','#a3adb7','#c4aab0','#878f89'],
 ocean:['#263c62','#3c5b83','#4a799e','#69a4ba','#8ac3cd','#b1dbd8','#267f7d','#439c91','#83b9a5','#aecbae','#c6d5b9','#e4e2bd','#c9ac7f','#9c765b','#e5c9b3','#f1e8d9','#899cac','#455e63']
};
let catalog={pages:[],books:[]},category='All',view='library',visible=24,filtered=[],saved=new Map(),db,customPalette=[];
const brushDefs=[['fill','Solid fill'],['pencil','Pencil'],['marker','Marker'],['paint','Acrylic paint'],['oil','Oil paint'],['gouache','Gouache'],['coloured-pencil','Coloured pencil'],['watercolour','Watercolour'],['pastel','Pastel'],['charcoal','Charcoal'],['drybrush','Dry brush'],['smudge','Soft smudge'],['airbrush','Airbrush'],['glitter','Glitter'],['ink','Calligraphy ink'],['gradient','Gradient']];
let current=null,mode='auto',tool='pencil',lastBrush='pencil',colour='#2766d7',baseColour=colour,size=30,opacity=1,labels=null,regionAreas=null,regionEdges=null,regionReady=false,worker=null,epoch=0;
const canvas=$('canvas'),ctx=canvas.getContext('2d'),paint=document.createElement('canvas'),pc=paint.getContext('2d',{willReadFrequently:true}),ink=document.createElement('canvas'),ic=ink.getContext('2d',{willReadFrequently:true}),stroke=document.createElement('canvas'),sc=stroke.getContext('2d'),mask=document.createElement('canvas'),mc=mask.getContext('2d'),clipped=document.createElement('canvas'),cc=clipped.getContext('2d'),selectionCanvas=$('selection-overlay'),selCtx=selectionCanvas.getContext('2d');
const eraserPreview=document.createElement('canvas'),epc=eraserPreview.getContext('2d');
let paintLayers=[],activeLayer=0;
function snapshotPaint(){const c=document.createElement('canvas');c.width=paint.width;c.height=paint.height;c.getContext('2d').drawImage(paint,0,0);return c;}
function syncLayer(){if(paintLayers[activeLayer])paintLayers[activeLayer].canvas=snapshotPaint();}
function compositeLayers(target){const c=target.getContext('2d');for(let i=0;i<paintLayers.length;i++){const layer=paintLayers[i];if(layer.visible===false)continue;c.save();c.globalAlpha=layer.opacity??1;c.drawImage(i===activeLayer?paint:layer.canvas,0,0,target.width,target.height);c.restore();}}
function mergedPaint(){const c=document.createElement('canvas');c.width=paint.width;c.height=paint.height;compositeLayers(c);return c;}
function switchLayer(i){
 if(i===activeLayer)return;
 finishStroke();syncLayer();paintLayers[activeLayer].undo=undoStack;paintLayers[activeLayer].redo=redoStack;
 activeLayer=i;pc.clearRect(0,0,paint.width,paint.height);pc.drawImage(paintLayers[i].canvas,0,0);
 undoStack=paintLayers[i].undo||[];redoStack=paintLayers[i].redo||[];
 updateHistory();drawLayerControls();render();
}
function drawLayerControls(){
 const root=$('layer-list');root.replaceChildren();
 paintLayers.forEach((layer,i)=>{
  const item=document.createElement('div');item.className='layer-item';
  const select=document.createElement('button');select.type='button';select.textContent=layer.name;select.dataset.layer=String(i);select.setAttribute('aria-pressed',String(i===activeLayer));select.onclick=()=>switchLayer(i);
  const visible=document.createElement('button');visible.type='button';visible.className='layer-visibility';visible.textContent=layer.visible===false?'Show':'Hide';visible.setAttribute('aria-label',(layer.visible===false?'Show ':'Hide ')+layer.name);visible.setAttribute('aria-pressed',String(layer.visible!==false));
  visible.onclick=()=>{finishStroke();layer.visible=layer.visible===false;drawLayerControls();render();scheduleSave();};
  const opacity=document.createElement('input');opacity.type='range';opacity.min='0';opacity.max='100';opacity.step='5';opacity.value=String(Math.round((layer.opacity??1)*100));opacity.setAttribute('aria-label',layer.name+' opacity');opacity.title=layer.name+' opacity';
  opacity.oninput=()=>{finishStroke();layer.opacity=Number(opacity.value)/100;render();scheduleSave();};
  const rename=document.createElement('button');rename.type='button';rename.textContent='Rename';rename.setAttribute('aria-label','Rename '+layer.name);
  rename.onclick=()=>{const name=prompt('Layer name',layer.name);if(name===null)return;const clean=name.trim().slice(0,40);if(!clean)return;layer.name=clean;drawLayerControls();scheduleSave();};
  const up=document.createElement('button');up.type='button';up.textContent='↑';up.setAttribute('aria-label','Move '+layer.name+' up');up.disabled=i===paintLayers.length-1;
  up.onclick=()=>{finishStroke();syncLayer();[paintLayers[i],paintLayers[i+1]]=[paintLayers[i+1],paintLayers[i]];if(activeLayer===i)activeLayer=i+1;else if(activeLayer===i+1)activeLayer=i;drawLayerControls();render();scheduleSave();};
  const down=document.createElement('button');down.type='button';down.textContent='↓';down.setAttribute('aria-label','Move '+layer.name+' down');down.disabled=i===0;
  down.onclick=()=>{finishStroke();syncLayer();[paintLayers[i],paintLayers[i-1]]=[paintLayers[i-1],paintLayers[i]];if(activeLayer===i)activeLayer=i-1;else if(activeLayer===i-1)activeLayer=i;drawLayerControls();render();scheduleSave();};
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Delete '+layer.name);remove.title='Delete '+layer.name;remove.disabled=paintLayers.length===1;
  remove.onclick=()=>{if(!confirm('Delete '+layer.name+'? This removes its painting.'))return;finishStroke();syncLayer();paintLayers.splice(i,1);if(activeLayer===i){activeLayer=Math.min(i,paintLayers.length-1);pc.clearRect(0,0,paint.width,paint.height);pc.drawImage(paintLayers[activeLayer].canvas,0,0);undoStack=paintLayers[activeLayer].undo||[];redoStack=paintLayers[activeLayer].redo||[];updateHistory();}else if(activeLayer>i)activeLayer--;drawLayerControls();render();scheduleSave();};
  item.append(select,visible,opacity,rename,up,down,remove);root.append(item);
 });$('add-layer').disabled=paintLayers.length>=5;
}
function resetLayers(){paintLayers=[{name:'Layer 1',canvas:snapshotPaint(),visible:true,opacity:1,undo:[],redo:[]}];activeLayer=0;undoStack=[];redoStack=[];updateHistory();drawLayerControls();}
$('add-layer').onclick=()=>{if(!current||paintLayers.length>=5)return;finishStroke();syncLayer();paintLayers[activeLayer].undo=undoStack;paintLayers[activeLayer].redo=redoStack;const c=document.createElement('canvas');c.width=paint.width;c.height=paint.height;paintLayers.push({name:'Layer '+(paintLayers.length+1),canvas:c,visible:true,opacity:1,undo:[],redo:[]});activeLayer=paintLayers.length-1;pc.clearRect(0,0,paint.width,paint.height);undoStack=[];redoStack=[];updateHistory();drawLayerControls();render();scheduleSave();};
let undoStack=[],redoStack=[],strokeActive=false,lastPoint=null,strokeMask=false,selected=new Set(),strokeBefore=null,tip=null,stampCounter=0,changed=0,saveTimer,saveChain=Promise.resolve(),zoom=1,panX=0,panY=0,fitWidth=400,fitHeight=550;
let points=new Map(),gesture=null,panStart=null,dirty=false,toastTimer,activePointer=null,pendingTap=null;
let mediumLevels={oil:50,gouache:50,'coloured-pencil':50,watercolour:50},smoothing=.2,lastSmudgePoint=null,smudgeTip=null,smudgeBuffer=null;
let storageEnabled=true;try{storageEnabled=localStorage.getItem('chromalie-save-work')!=='off';}catch(e){}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function showInfo(title,html){$('dialog-title').textContent=title;$('dialog-content').innerHTML=html;$('info-dialog').showModal();}
$('close-dialog').onclick=$('dialog-ok').onclick=()=> $('info-dialog').close();
async function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('colour-room',1);req.onupgradeneeded=()=>{req.result.createObjectStore('artwork',{keyPath:'id'});req.result.createObjectStore('settings');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function dbGet(store,key){if(!db)return Promise.resolve(null);return new Promise((resolve,reject)=>{const req=db.transaction(store).objectStore(store).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function dbPut(store,value,key){if(!db)return Promise.reject(Error('Storage unavailable'));return new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');if(key===undefined)t.objectStore(store).put(value);else t.objectStore(store).put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
async function loadSaved(){if(!db)return;await new Promise((resolve,reject)=>{const req=db.transaction('artwork').objectStore('artwork').openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return resolve();const v=c.value;saved.set(v.id,{id:v.id,thumb:v.thumb,updated:v.updated});c.continue();};req.onerror=()=>reject(req.error);});updateWorkCount();customPalette=await dbGet('settings','palette')||[];const previousPalette=await dbGet('settings','selected-palette');if(previousPalette&&Object.hasOwn(palettes,previousPalette)||previousPalette==='custom')$('palette-select').value=previousPalette;}
function updateWorkCount(){$('work-count').textContent=saved.size?`(${saved.size})`:'';}
const blobOf=c=>new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Could not save image')),'image/png'));
function compose(target){const c=target.getContext('2d');c.clearRect(0,0,target.width,target.height);c.fillStyle='white';c.fillRect(0,0,target.width,target.height);compositeLayers(target);c.globalCompositeOperation='multiply';c.drawImage(ink,0,0,target.width,target.height);c.globalCompositeOperation='source-over';}
$('retry-save').onclick=()=>{if(!current||!storageEnabled)return;dirty=true;$('retry-save').hidden=true;$('save-state').textContent='Retrying save…';persist();};
function scheduleSave(){changed++;if(!storageEnabled){dirty=false;$('save-state').textContent='Device saving is off. Download to keep.';return;}dirty=true;$('retry-save').hidden=true;$('save-state').textContent='Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),850);}
function persist(){
 clearTimeout(saveTimer);if(!storageEnabled){dirty=false;return saveChain;}if(!current||!dirty)return saveChain;
 const page=current,version=changed;dirty=false;
 const copy=document.createElement('canvas');copy.width=paint.width;copy.height=paint.height;copy.getContext('2d').drawImage(mergedPaint(),0,0);
 const layerCopies=paintLayers.map((layer,i)=>i===activeLayer?snapshotPaint():layer.canvas);const layerMeta=paintLayers.map(layer=>({name:layer.name,visible:layer.visible!==false,opacity:layer.opacity??1}));const thumb=document.createElement('canvas');thumb.width=200;thumb.height=Math.round(200*paint.height/paint.width);compose(thumb);
 saveChain=saveChain.catch(()=>{}).then(async()=>{
  try{const [blob,small,...layerBlobs]=await Promise.all([blobOf(copy),blobOf(thumb),...layerCopies.map(blobOf)]);await dbPut('artwork',{id:page.id,blob,thumb:small,layers:layerBlobs,layerMeta,updated:Date.now()});saved.set(page.id,{id:page.id,thumb:small,updated:Date.now()});updateWorkCount();if(current?.id===page.id&&changed===version){$('retry-save').hidden=true;$('save-state').textContent='Saved on this device';}}
  catch(e){if(current?.id===page.id){dirty=true;$('retry-save').hidden=false;$('save-state').textContent='Save failed. Download your work or retry.';toast('Your browser could not save this page. Download a copy to keep it.');}}
 });return saveChain;
}
function setView(next){view=next;visible=24;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('hero').hidden=view==='work';$('library-eyebrow').textContent=view==='work'?'YOUR SAVED PAGES':'THE COLOURING LIBRARY';$('library-title').textContent=view==='work'?'A little colour, kept for later.':'What will you colour today?';renderLibrary();}
const urls=[];
function renderLibrary(){
 urls.splice(0).forEach(u=>URL.revokeObjectURL(u));
 const q=$('search').value.toLowerCase().trim(),book=$('book-filter').value,level=$('detail-filter').value;
 filtered=catalog.pages.filter(p=>(category==='All'||p.category===category)&&(book==='all'||p.book===book)&&(level==='all'||p.level===level)&&(!q||`${p.title} ${p.subject} ${p.originalTitle} ${p.category}`.toLowerCase().includes(q))&&(view!=='work'||saved.has(p.id)));
 if(view==='work')filtered.sort((a,b)=>saved.get(b.id).updated-saved.get(a.id).updated);
 $('result-count').textContent=`${filtered.length} ${filtered.length===1?'page':'pages'}`;
 $('page-grid').replaceChildren();
 for(const p of filtered.slice(0,visible)){
  const b=document.createElement('button');b.className='page-card';b.setAttribute('aria-label',`Colour ${p.title}`);
  const item=saved.get(p.id);let thumb=p.thumb;
  if(view==='work'&&item?.thumb){thumb=URL.createObjectURL(item.thumb);urls.push(thumb);}
  b.innerHTML=`<div class="page-preview"><div class="sheet-thumbnail"><img class="page-art" loading="lazy" decoding="async" src="${thumb}" alt="${p.title}, ${p.subject}"><div class="sheet-brand"><img src="wordmark.svg" alt="Chromalie"></div></div><span class="page-hover">${item?'Keep colouring':'Start colouring'}</span>${item?'<span class="saved-chip">Saved</span>':''}</div><h3>${p.title}</h3><div class="page-meta"><span>${p.subject}</span><span>${p.level==='Easy'?'Simpler':'Detailed'}</span></div>`;
  if(view==='work')b.querySelector('.page-art').alt=`Your coloured ${p.title}`;
  b.onclick=()=>openPage(p);$('page-grid').append(b);
 }
 $('empty').hidden=filtered.length>0;$('load-more').hidden=filtered.length<=visible;
 if(view==='work'&&!filtered.length){$('empty').querySelector('h3').textContent=saved.size?'No pages match these filters.':'Your colours will live here.';$('empty').querySelector('p').textContent=saved.size?'Try another search or subject.':'Open any page and colour a shape. Your progress saves on this browser.';}else{$('empty').querySelector('h3').textContent='No pages match these filters.';$('empty').querySelector('p').textContent='Try another search or browse all subjects.';}
}
function resetFilters(){category='All';$('search').value='';$('book-filter').value='all';$('detail-filter').value='all';if(view==='work'&&!saved.size)setView('library');document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category==='All'));renderLibrary();}
$('reset-filters').onclick=resetFilters;
$('load-more').onclick=()=>{visible+=24;renderLibrary();};
$('search').oninput=$('book-filter').onchange=$('detail-filter').onchange=()=>{visible=24;renderLibrary();};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{setView(b.dataset.view);if(view==='work')$('library').scrollIntoView({behavior:'smooth'});});
$('hero-start').onclick=()=> $('library').scrollIntoView({behavior:'smooth'});
$('header-start').onclick=()=>{if(catalog.pages.length)openPage(catalog.pages.find(p=>p.book==='flowers')||catalog.pages[0]);};
$('about-button').onclick=()=>showInfo('Your work, on your device','<p>Your pages save in this browser on this device. There is no account and no upload of your artwork.</p><p>Clearing browser data or using a private window can remove saved work. Download a PNG whenever you want a copy to keep or share.</p><p>The collections are prepared from the colouring books provided for this site. The catalogue does not update automatically when the Drive folder changes.</p>');

function renderColours(){const selectedPalette=$('palette-select').value;const remove=$('remove-colour');if(remove)remove.hidden=selectedPalette!=='custom'||!customPalette.includes(baseColour);document.querySelectorAll('[data-palette]').forEach(b=>{const active=b.dataset.palette===selectedPalette;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});const list=selectedPalette==='custom'?customPalette:palettes[selectedPalette];$('swatches').replaceChildren();if(!list.length){const p=document.createElement('span');p.textContent='Add your first colour below.';p.style.cssText='grid-column:1/-1;font-size:10px;color:#72786d';$('swatches').append(p);}for(const c of list){const b=document.createElement('button');b.className='swatch';b.style.background=c;b.classList.toggle('active',c.toLowerCase()===baseColour.toLowerCase());b.setAttribute('aria-label',`Choose colour ${c}`);b.title=c;b.onclick=()=>setColour(c);$('swatches').append(b);}}
const recentColours=[];
// Colour suggestions are purely local; no painting or palette data leaves the device.

function renderRecentColours(){const root=$('recent-swatches');if(!root)return;root.replaceChildren();for(const c of recentColours){const b=document.createElement('button');b.type='button';b.className='swatch';b.style.background=c;b.title=c;b.setAttribute('aria-label','Choose recent colour '+c);b.onclick=()=>setColour(c);root.append(b);}}
function setColour(c){baseColour=c;$('shade').value=0;colour=c;$('custom-colour').value=c;if(recentColours.includes(c))recentColours.splice(recentColours.indexOf(c),1);recentColours.unshift(c);if(recentColours.length>8)recentColours.pop();renderRecentColours();updateColour();}
function renderHarmonyColours(){
 const root=$('harmony-swatches');if(!root||!/^#[0-9a-f]{6}$/i.test(baseColour))return;
 const r=parseInt(baseColour.slice(1,3),16)/255,g=parseInt(baseColour.slice(3,5),16)/255,b=parseInt(baseColour.slice(5,7),16)/255;
 const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let h=0;
 if(delta){if(max===r)h=((g-b)/delta)%6;else if(max===g)h=(b-r)/delta+2;else h=(r-g)/delta+4;h=(h*60+360)%360;}
 const light=(max+min)/2,sat=delta===0?0:delta/(1-Math.abs(2*light-1));
 const hslHex=(angle)=>{const hue=(angle+360)%360;const chroma=(1-Math.abs(2*light-1))*sat;const x=chroma*(1-Math.abs((hue/60)%2-1)),m=light-chroma/2;let rgb=hue<60?[chroma,x,0]:hue<120?[x,chroma,0]:hue<180?[0,chroma,x]:hue<240?[0,x,chroma]:hue<300?[x,0,chroma]:[chroma,0,x];return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');};
 root.replaceChildren();
 for(const [label,angle] of [['Neighbour −30°',h-30],['Neighbour +30°',h+30],['Complement',h+180],['Triad +120°',h+120],['Triad −120°',h-120]]){
  const c=hslHex(angle),button=document.createElement('button');button.type='button';button.className='swatch';button.style.background=c;button.title=label+' · '+c;button.setAttribute('aria-label',label+' '+c);button.onclick=()=>setColour(c);root.append(button);
 }
}
function updateColour(){colour=shadeColour(baseColour,Number($('shade').value));$('current-colour').style.background=colour;$('current-colour').title=colour;tip=null;renderColours();renderHarmonyColours();updateBrushPreview();}
async function choosePalette(name){if(name!=='custom'&&!Object.hasOwn(palettes,name))return;$('palette-select').value=name;renderColours();if(storageEnabled&&db)try{await dbPut('settings',name,'selected-palette');}catch(e){/* The palette still works for this session. */}}$('palette-select').onchange=e=>choosePalette(e.target.value);document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>choosePalette(b.dataset.palette)));$('remove-colour').onclick=async()=>{if($('palette-select').value!=='custom')return;const index=customPalette.indexOf(baseColour);if(index<0)return;customPalette.splice(index,1);renderColours();if(storageEnabled&&db)try{await dbPut('settings',customPalette,'palette');toast('Colour removed from My palette.');}catch(e){toast('Palette change is available for this session only.');}};
$('custom-colour').oninput=e=>setColour(e.target.value);$('shade').oninput=updateColour;
$('add-colour').onclick=async()=>{if(!customPalette.includes(colour))customPalette.push(colour);if(customPalette.length>60)customPalette.shift();choosePalette('custom');if(!storageEnabled){toast('Colour added for this session. Device saving is off.');return;}try{await dbPut('settings',customPalette,'palette');toast('Colour added to your palette.');}catch(e){toast('Palette is available for this session.');}};
$('brush-size').oninput=e=>{finishStroke();size=+e.target.value;$('size-value').textContent=size;tip=null;updateBrushPreview();};$('opacity').oninput=e=>{finishStroke();opacity=+e.target.value/100;$('opacity-value').textContent=`${e.target.value}%`;updateBrushPreview();};
$('smoothing').oninput=e=>{smoothing=+e.target.value/100;$('smoothing-value').textContent=`${e.target.value}%`;};
for(const [id,name]of brushDefs){const b=document.createElement('button');b.className='brush-button';b.dataset.tool=id;b.innerHTML=`<span class="brush-sample ${id}" aria-hidden="true"></span><span>${name}</span>`;b.onclick=()=>selectTool(id);$('brush-tools').append(b);}
document.querySelectorAll('.utility-tools [data-tool]').forEach(b=>b.onclick=()=>selectTool(b.dataset.tool));
// Render individual brush marks rather than reusing generic CSS swatches.
function drawBrushSamples(){
 const names=['fill','pencil','marker','paint','oil','gouache','coloured-pencil','watercolour','pastel','charcoal','drybrush','smudge','airbrush','glitter','ink','gradient'];
 for(const name of names){
  const el=document.querySelector('.brush-button[data-tool="'+name+'"] .brush-sample');
  if(!el)continue;
  const c=document.createElement('canvas');c.width=132;c.height=54;c.className='brush-sample-canvas';c.setAttribute('aria-hidden','true');
  c.style.cssText='width:94px;height:40px;flex:none;object-fit:contain';
  const g=c.getContext('2d'),base='#466d67';
  let seed=names.indexOf(name)+11;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const line=(x,y,xx,yy,width=1,col=base)=>{g.strokeStyle=col;g.lineWidth=width;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();};
  const ribbon=()=>{g.beginPath();g.moveTo(9,38);g.bezierCurveTo(40,5,74,48,123,13);};
  if(name==='fill'){g.fillStyle=base;g.fillRect(12,9,108,36);}
  if(name==='gradient'){const gr=g.createLinearGradient(8,0,124,0);gr.addColorStop(0,base);gr.addColorStop(1,'#f0d1a3');g.fillStyle=gr;g.fillRect(12,9,108,36);}
  if(name==='pencil'||name==='coloured-pencil'){for(let j=0;j<3;j++){g.globalAlpha=.45+j*.2;line(11,34+j*2,119,12+j*2,.65+j*.25);}g.globalAlpha=1;}
  if(name==='marker'){g.globalAlpha=.42;g.fillStyle=base;g.save();g.translate(13,15);g.rotate(-.12);g.fillRect(0,0,105,21);g.restore();g.globalAlpha=1;line(15,15,119,2,1.4);}
  if(name==='paint'||name==='oil'||name==='gouache'){g.fillStyle=base;g.beginPath();g.moveTo(10,37);g.bezierCurveTo(31,14,58,12,89,24);g.bezierCurveTo(103,30,115,19,123,12);g.lineTo(119,34);g.bezierCurveTo(84,50,51,30,10,45);g.closePath();g.fill();}
  if(name==='watercolour'){for(let j=0;j<35;j++){const x=14+j*3,y=26+Math.sin(j*.24)*7,rad=12+rnd()*7;const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'#628c8650');gr.addColorStop(.75,'#628c861c');gr.addColorStop(1,'#628c8600');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}for(let j=0;j<45;j++){g.fillStyle='#3e77731e';g.fillRect(13+rnd()*105,14+rnd()*27,2+rnd()*5,1+rnd()*3);}}
  if(name==='pastel'){for(let j=0;j<310;j++){const x=11+rnd()*109,y=15+rnd()*25;g.globalAlpha=.18+rnd()*.55;line(x,y,x+3+rnd()*8,y-1-rnd()*3,1+rnd()*3);}g.globalAlpha=1;}
  if(name==='charcoal'){for(let j=0;j<190;j++){const x=11+rnd()*108,y=8+rnd()*38;g.globalAlpha=.12+rnd()*.48;line(x,y,x+4+rnd()*12,y-2-rnd()*7,.5+rnd()*3,'#303b38');}g.globalAlpha=1;}
  if(name==='drybrush'){for(let j=0;j<26;j++){const y=12+j*1.25;const x=13+rnd()*25;g.globalAlpha=.18+rnd()*.6;line(x,y,108+rnd()*14,y-7+rnd()*12,.5+rnd()*1.8);}g.globalAlpha=1;}
  if(name==='smudge'){for(let j=0;j<18;j++){const x=15+j*5,y=32-j*.55;const gr=g.createRadialGradient(x,y,0,x,y,13);gr.addColorStop(0,'#466d6740');gr.addColorStop(1,'#466d6700');g.fillStyle=gr;g.fillRect(x-13,y-13,26,26);}}
  if(name==='airbrush'){const gr=g.createRadialGradient(67,27,1,67,27,52);gr.addColorStop(0,'#466d6788');gr.addColorStop(.45,'#466d6730');gr.addColorStop(1,'#466d6700');g.fillStyle=gr;g.fillRect(10,0,114,54);}
  if(name==='glitter'){for(let j=0;j<75;j++){const x=10+rnd()*112,y=7+rnd()*41;g.fillStyle=j%3===0?'#c69d50':j%3===1?'#547f79':'#ead7a5';const r=.6+rnd()*2;g.fillRect(x-r,y-r,r*2,r*2);}for(let j=0;j<8;j++){const x=15+rnd()*100,y=10+rnd()*30;line(x-4,y,x+4,y,.7,'#a58b4b');line(x,y-4,x,y+4,.7,'#a58b4b');}}
  if(name==='oil'){for(let j=0;j<7;j++)line(16,19+j*3,113,15+j*2,.7,'#c1d1bf');}
  if(name==='gouache'){g.fillStyle='#466d67';g.fillRect(17,17,99,24);}
  if(name==='coloured-pencil'){for(let j=0;j<16;j++)line(14,11+j*2,115,9+j*2,.7,'#769c8e');}
  if(name==='ink'){g.fillStyle='#334e4a';g.beginPath();g.moveTo(12,43);g.bezierCurveTo(25,10,48,7,58,26);g.bezierCurveTo(70,46,94,42,121,7);g.lineTo(116,19);g.bezierCurveTo(86,53,65,50,53,32);g.bezierCurveTo(42,15,29,21,12,43);g.fill();line(80,37,123,6,.8);}
  el.replaceWith(c);
 }
}
drawBrushSamples();
const brushFinder=document.createElement('div');
brushFinder.className='chromalie-brush-finder';
brushFinder.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 12px';
brushFinder.innerHTML='<label style="flex:1;min-width:130px">Find a brush <input type="search" aria-label="Find a brush" placeholder="Search brushes…" style="width:100%;max-width:260px"></label><button type="button" class="button small brush-favourites-only" aria-pressed="false">Favourites only</button>';
const brushTools=$('brush-tools');
brushTools?.parentElement?.insertBefore(brushFinder,brushTools);
const brushEmpty=document.createElement('p');
brushEmpty.className='brush-empty';
brushEmpty.textContent='No matching brushes. Try a different search or show all brushes.';
brushEmpty.hidden=true;
brushEmpty.setAttribute('role','status');
brushTools?.insertAdjacentElement('afterend',brushEmpty);
const brushSearch=brushFinder.querySelector('input');
const favouriteOnly=brushFinder.querySelector('.brush-favourites-only');
let favouritesOnly=false;
let brushFavourites=[];
try{const stored=JSON.parse(localStorage.getItem('chromalie-brush-favourites')||'[]');if(Array.isArray(stored))brushFavourites=stored.filter(x=>brushDefs.some(([id])=>id===x));}catch(e){}
for(const [id,name] of brushDefs){
 const button=brushTools?.querySelector('[data-tool="'+id+'"]');
 if(!button)continue;
 const star=document.createElement('button');
 star.type='button';star.className='brush-star';star.setAttribute('aria-label','Favourite '+name);
 star.style.cssText='border:0;background:transparent;cursor:pointer;font-size:17px;padding:2px 6px';
 const item=document.createElement('div');
 item.className='brush-search-item';item.style.cssText='display:flex;align-items:center;min-width:0';
 button.parentElement.insertBefore(item,button);item.append(button,star);
 star.onclick=()=>{brushFavourites=brushFavourites.includes(id)?brushFavourites.filter(x=>x!==id):[...brushFavourites,id];try{localStorage.setItem('chromalie-brush-favourites',JSON.stringify(brushFavourites));}catch(e){}refreshBrushFinder();};
}
function refreshBrushFinder(){
 const query=brushSearch.value.trim().toLocaleLowerCase();
 let visibleCount=0;
 for(const [id,name] of brushDefs){
  const button=brushTools?.querySelector('[data-tool="'+id+'"]');
  if(!button)continue;
  const item=button.closest('.brush-search-item');
  item.hidden=(!name.toLocaleLowerCase().includes(query))||(favouritesOnly&&!brushFavourites.includes(id));
  item.style.display=item.hidden?'none':'flex';
  if(!item.hidden)visibleCount++;
  const star=item.querySelector('.brush-star');
  star.textContent=brushFavourites.includes(id)?'★':'☆';
  star.setAttribute('aria-pressed',String(brushFavourites.includes(id)));
 }
 brushEmpty.hidden=visibleCount>0;
 favouriteOnly.setAttribute('aria-pressed',String(favouritesOnly));
 favouriteOnly.textContent=favouritesOnly?'Show all brushes':'Favourites only';
}
brushSearch.addEventListener('input',refreshBrushFinder);
favouriteOnly.onclick=()=>{favouritesOnly=!favouritesOnly;refreshBrushFinder();};
refreshBrushFinder();

function updateMediumSetting(){
 const names={oil:'Paint load',gouache:'Coverage','coloured-pencil':'Pencil hardness',watercolour:'Wetness'};
 const label=$('medium-setting');if(!label)return;
 label.hidden=!names[tool];if(!names[tool])return;
 $('medium-label').textContent=names[tool];$('medium-control').value=mediumLevels[tool];$('medium-value').textContent=mediumLevels[tool]+'%';
}
$('medium-control').oninput=e=>{finishStroke();mediumLevels[tool]=+e.target.value;$('medium-value').textContent=e.target.value+'%';tip=null;updateBrushPreview();};
function selectTool(t){
 finishStroke();tool=t;tip=null;
 if(t==='fill'||t==='gradient')mode='fill';else if(['pencil','coloured-pencil','marker','paint','oil','gouache','watercolour','pastel','charcoal','drybrush','smudge','airbrush','glitter','ink'].includes(t)){lastBrush=t;if(mode==='fill')mode='auto';}
 updateTools();updateMediumSetting();
}
function updateTools(){
 document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',String(b.dataset.tool===tool));});
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
 const hints={fill:'Tap an enclosed shape to fill it.',auto:'Each stroke stays inside the shape where it begins.',free:'Colour freely across the page. The outlines stay visible.'};
 $('mode-hint').textContent=tool==='select'?'Tap shapes to select them. Then choose a brush to shade only those areas.':mode==='free'?'Freehand is on. Brush strokes can cross shapes.':hints[mode];
 $('canvas-instruction').textContent=tool==='hand'?'Drag to move the page.':tool==='picker'?'Tap your artwork to pick a colour.':tool==='erase'?'Brush away colour. The outlines stay.':tool==='select'?'Tap shapes to add or remove them from your selection.':mode==='fill'?'Pick a colour, then tap a shape.':mode==='auto'?'Paint within the lines.': 'Paint anywhere on the page.';
 $('brush-size').disabled=mode==='fill'&&tool!=='erase';canvas.style.cursor=tool==='hand'?'grab':tool==='picker'?'crosshair':'crosshair';
 $('selection-info').hidden=!selected.size&&tool!=='select';$('selection-count').textContent=`${selected.size} ${selected.size===1?'area':'areas'} selected`;
 updateBrushPreview();
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{finishStroke();mode=b.dataset.mode;if(mode==='fill')tool='fill';else tool=lastBrush;tip=null;updateTools();});
function clearSelection(){selected.clear();selCtx.clearRect(0,0,canvas.width,canvas.height);updateTools();}
$('clear-selection').onclick=clearSelection;
function updateSelection(){const im=selCtx.createImageData(canvas.width,canvas.height);for(let i=0;i<labels.length;i++)if(selected.has(labels[i])){im.data[i*4]=88;im.data[i*4+1]=135;im.data[i*4+2]=160;im.data[i*4+3]=45;}selCtx.putImageData(im,0,0);updateTools();}
function updateHistory(){$('undo').disabled=!undoStack.length;$('redo').disabled=!redoStack.length;}
function remember(before){undoStack.push(before);if(undoStack.length>10)undoStack.shift();redoStack=[];updateHistory();}
$('undo').onclick=()=>{finishStroke();if(!undoStack.length)return;redoStack.push(pc.getImageData(0,0,paint.width,paint.height));pc.putImageData(undoStack.pop(),0,0);render();updateHistory();scheduleSave();};
$('redo').onclick=()=>{finishStroke();if(!redoStack.length)return;undoStack.push(pc.getImageData(0,0,paint.width,paint.height));pc.putImageData(redoStack.pop(),0,0);render();updateHistory();scheduleSave();};
function render(){
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);compositeLayers(canvas);
 if(strokeActive){
  prepareClipped();
  if(tool==='erase'){
   epc.globalCompositeOperation='source-over';epc.clearRect(0,0,paint.width,paint.height);epc.drawImage(paint,0,0);epc.globalCompositeOperation='destination-out';epc.drawImage(clipped,0,0);epc.globalCompositeOperation='source-over';
   ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=0;i<paintLayers.length;i++){const layer=paintLayers[i];if(layer.visible===false)continue;ctx.save();ctx.globalAlpha=layer.opacity??1;ctx.drawImage(i===activeLayer?eraserPreview:layer.canvas,0,0);ctx.restore();}ctx.globalCompositeOperation='multiply';ctx.drawImage(ink,0,0);ctx.globalCompositeOperation='source-over';
  }else{ctx.drawImage(clipped,0,0);}
 }
 if(!(strokeActive&&tool==='erase')){ctx.globalCompositeOperation='multiply';ctx.drawImage(ink,0,0);ctx.globalCompositeOperation='source-over';}
}
function prepareClipped(){cc.clearRect(0,0,clipped.width,clipped.height);cc.globalCompositeOperation='source-over';cc.globalAlpha=opacity;cc.drawImage(stroke,0,0);cc.globalAlpha=1;if(strokeMask){cc.globalCompositeOperation='destination-in';cc.drawImage(mask,0,0);cc.globalCompositeOperation='source-over';}}
function makeMask(ids){mc.putImageData(new ImageData(maskPixels(labels,ids),mask.width,mask.height),0,0);}
function allowedArea(id){
 if(!id)return false;
 if(!$('paint-background').checked&&isBackgroundArea(id,regionAreas,regionEdges,labels.length)){
  toast('This area reaches the page edge or covers much of the page. Turn on Paint background if you meant to colour it.');return false;
 }
 return true;
}
function getPoint(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height,pressure:e.pointerType==='pen'?Math.max(.12,e.pressure):.65};}
function createTip(){
 const t=document.createElement('canvas');const sz=Math.max(8,Math.ceil(size*2));t.width=t.height=sz;const c=t.getContext('2d'),r=sz/2;
 const rgb=hexToRgb(colour);const css=a=>`rgba(${rgb.join(',')},${a})`;
 if(['airbrush','watercolour'].includes(tool)){
  const g=c.createRadialGradient(r,r,0,r,r,r);g.addColorStop(0,css(tool==='airbrush'?.2:.12));g.addColorStop(.55,css(tool==='airbrush'?.1:.08));g.addColorStop(1,css(0));c.fillStyle=g;c.fillRect(0,0,sz,sz);
  if(tool==='watercolour'){
   // Granulation and irregular pigment edges create a wash rather than a uniform airbrush.
   for(let i=0;i<Math.max(24,Math.round(sz*1.8));i++){
    const angle=Math.random()*Math.PI*2,rad=Math.sqrt(Math.random())*r*.87;
    const x=r+Math.cos(angle)*rad,y=r+Math.sin(angle)*rad;
    const pigment=Math.random()*.085+.012;
    c.fillStyle=css(pigment);
    c.beginPath();c.ellipse(x,y,Math.max(1,r*(.025+Math.random()*.09)),Math.max(1,r*(.015+Math.random()*.065)),angle,0,Math.PI*2);c.fill();
   }
   // Darker broken edge simulates pigment gathering along the wash perimeter.
   c.lineWidth=Math.max(.6,r*.035);
   for(let j=0;j<32;j++){
    const a=Math.random()*Math.PI*2,arc=.04+Math.random()*.14;
    c.strokeStyle=css(.025+Math.random()*.045);
    c.beginPath();c.arc(r,r,r*(.72+Math.random()*.17),a,a+arc);c.stroke();
   }
  }
 }else if(['pencil','coloured-pencil','pastel','charcoal','drybrush'].includes(tool)){
  const im=c.createImageData(sz,sz);
  // Grain follows a fixed diagonal tooth. Deterministic speckle avoids
  // changing the tip every time a user starts another pencil stroke.
  for(let y=0;y<sz;y++)for(let x=0;x<sz;x++){
   const distance=Math.hypot(x-r,y-r)/r;
   if(distance>1)continue;
   const grain=Math.sin((x*.81+y*.24)*2.3)*.5+.5;
   let seed=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^Math.imul(sz,2246822519);
   seed=Math.imul(seed^(seed>>>13),1274126177);
   const speckle=((seed^(seed>>>16))>>>0)/4294967295;
   const noise=tool==='coloured-pencil'?speckle*.62+grain*.38:speckle;
   if(noise<(tool==='pencil'?.45:tool==='coloured-pencil'?.38:tool==='charcoal'?.16:tool==='drybrush'?.62:.3))continue;
   const i=(y*sz+x)*4;
   im.data[i]=rgb[0];im.data[i+1]=rgb[1];im.data[i+2]=rgb[2];
   im.data[i+3]=Math.round(255*(tool==='pencil'?.23:tool==='coloured-pencil'?.44:tool==='charcoal'?.56:tool==='drybrush'?.8:.32)*(1-distance*.35)*noise);
  }
  c.putImageData(im,0,0);
 }else{
  c.fillStyle=colour;c.beginPath();if(tool==='marker'||tool==='ink')c.ellipse(r,r,tool==='ink'?r*.24:r*.5,r*.88,-Math.PI/5,0,Math.PI*2);else c.arc(r,r,r*.92,0,Math.PI*2);c.fill();
  if(tool==='oil'||tool==='gouache'){
   // Paint-specific tips: thick oil bristles versus even matte gouache.
   c.clearRect(0,0,sz,sz);
   c.fillStyle=colour;c.beginPath();c.arc(r,r,r*.9,0,Math.PI*2);c.fill();
   if(tool==='oil'){
    // Fine, uneven bristle channels reveal the underlying paint. Keep the
    // grooves inside the circular tip instead of cutting a rectangular band.
    c.globalCompositeOperation='destination-out';
    const grooves=Math.max(7,Math.round(r/2.5));
    for(let j=0;j<grooves;j++){
     const fraction=(j+.5)/grooves;
     const y=r*.22+fraction*r*1.56;
     const chord=Math.sqrt(Math.max(0,(r*.9)**2-(y-r)**2));
     const start=r-chord*.82;
     const length=chord*1.64;
     c.globalAlpha=.06+.13*(.5+.5*Math.sin(j*2.47));
     c.fillRect(start,y,length,Math.max(.5,r*.022));
    }
    c.globalAlpha=1;
    c.globalCompositeOperation='source-over';
   }
  }
  if(tool==='glitter'){for(let i=0;i<sz*2;i++){const x=Math.random()*sz,y=Math.random()*sz;if(Math.hypot(x-r,y-r)>r*.9)continue;c.fillStyle=Math.random()>.5?'#ffedb5':'#ffffff';c.fillRect(x,y,1.5,1.5);}}
 }
 return t;
}
function stamp(p){
 // Style-specific mark geometry: presets alter the actual deposited stroke,
 // not just the size and opacity controls.
 const style=Number(document.documentElement.dataset.paintStyle ?? -1);
 const styledMedium=document.documentElement.dataset.paintMedium;
 const variant=styledMedium===tool&&style>=0?style:-1;

 if(tool==='smudge'){
  // Carry a small dab of pigment between pointer samples instead of
  // allocating a new canvas for every interpolated stamp.
  const radius=Math.max(4,Math.round(size*(.35+p.pressure*.55)));
  const d=radius*2;
  if(!smudgeTip||smudgeTip.width!==d){
   smudgeTip=document.createElement('canvas');smudgeTip.width=smudgeTip.height=d;
   smudgeBuffer=document.createElement('canvas');smudgeBuffer.width=smudgeBuffer.height=d;
  }
  const g=smudgeTip.getContext('2d');
  if(!lastSmudgePoint){
   g.clearRect(0,0,d,d);
   g.drawImage(paint,p.x-radius,p.y-radius,d,d,0,0,d,d);
  }else{
   const dx=p.x-lastSmudgePoint.x,dy=p.y-lastSmudgePoint.y;
   // A large jump (for example after a pointer interruption) should not
   // drag an unrelated patch of pigment across the page.
   if(Math.hypot(dx,dy)>radius*1.5){
    g.clearRect(0,0,d,d);
    g.drawImage(paint,p.x-radius,p.y-radius,d,d,0,0,d,d);
    lastSmudgePoint=p;
    return;
   }
   const n=smudgeBuffer.getContext('2d');
   n.clearRect(0,0,d,d);
   n.drawImage(paint,p.x-radius,p.y-radius,d,d,0,0,d,d);
   n.globalAlpha=.84;
   n.drawImage(smudgeTip,-dx,-dy);
   n.globalAlpha=1;
   g.clearRect(0,0,d,d);g.drawImage(smudgeBuffer,0,0);
  }
  sc.save();sc.globalAlpha=.52;
  sc.beginPath();sc.arc(p.x,p.y,radius,0,Math.PI*2);sc.clip();
  sc.drawImage(smudgeTip,p.x-radius,p.y-radius);
  sc.restore();
  lastSmudgePoint=p;stampCounter++;return;
 }
 if(!tip)tip=createTip();
 // Pen pressure changes pigment deposition as well as tip width. Mouse and
 // touch retain their existing fixed-pressure behaviour from getPoint().
 const pressure=Math.max(0,Math.min(1,Number.isFinite(p.pressure)?p.pressure:.65));
 const scale=.5+pressure*.7;
 const radius=size*(tool==='ink' ? (.35+p.pressure*.95) : scale)*(variant===2?.58:variant===4?1.22:1);
 if(tool==='watercolour'){
  // A broad, dilute wet edge followed by a smaller pigment-rich centre.
  // Overlapping dabs build colour gradually, rather than stamping opaque disks.
  sc.save();
  sc.globalAlpha=(.18+mediumLevels.watercolour*.0032)*(.4+pressure*.8)*(variant===0?.55:variant===3?.7:1);
  sc.drawImage(tip,p.x-radius*1.18,p.y-radius*1.18,radius*2.36,radius*2.36);
  sc.globalAlpha=(variant===5?.34:variant===3?.85:.68)*(.45+pressure*.7);
  sc.drawImage(tip,p.x-radius*.72,p.y-radius*.72,radius*1.44,radius*1.44);
  // A small irregular edge bloom gives the wet wash a less mechanical outline.
  // This remains deterministic within a stroke and requires no per-dab canvas.
  if(stampCounter%(variant===5?2:variant===3?11:5)===0){
   const angle=stampCounter*2.399963229728653;
   const bx=p.x+Math.cos(angle)*radius*.68,by=p.y+Math.sin(angle)*radius*.68;
   sc.globalAlpha=.16;
   sc.drawImage(tip,bx-radius*.43,by-radius*.43,radius*.86,radius*.86);
  }
  sc.restore();
 }else{
  if(tool==='paint'||tool==='oil'||tool==='gouache'){
   // Build an opaque centre over a softer outer rim, with pressure-dependent
   // coverage so slow repeated strokes deposit more pigment.
   sc.save();
   sc.globalAlpha=tool==='gouache'?(.55+mediumLevels.gouache*.004)*(.35+pressure*.65):tool==='oil'?(.12+pressure*.48)*(0.5+mediumLevels.oil/100):.24;
   sc.drawImage(tip,p.x-radius*1.08,p.y-radius*1.08,radius*2.16,radius*2.16);
   sc.globalAlpha=(tool==='gouache'?( .4+pressure*.6):tool==='oil'?(.25+pressure*.65)*(0.5+mediumLevels.oil/100):.64)*(variant===0?.5:variant===3?1:variant===5?.4:1);
   sc.drawImage(tip,p.x-radius*(variant===3?.45:.78),p.y-radius*(variant===3?.45:.78),radius*(variant===3?.9:1.56),radius*(variant===3?.9:1.56));
   sc.restore();
  }else{
   sc.globalAlpha=tool==='erase'?.7:tool==='coloured-pencil'?(.15+p.pressure*.55)*(0.65+mediumLevels['coloured-pencil']/100):1;
   sc.drawImage(tip,p.x-radius,p.y-radius,radius*2,radius*2);
   sc.globalAlpha=1;
  }
 }
 stampCounter++;
}
function updateBrushPreview(){
 const c=$('brush-preview');if(!c)return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.fillStyle='#fffefa';g.fillRect(0,0,c.width,c.height);
 if(tool==='fill'||tool==='gradient'){let fill=colour;if(tool==='gradient'){fill=g.createLinearGradient(0,0,c.width,0);fill.addColorStop(0,colour);fill.addColorStop(1,shadeColour(colour,65));}g.globalAlpha=opacity;g.fillStyle=fill;g.fillRect(18,17,c.width-36,28);g.globalAlpha=1;return;}
 if(['hand','picker','select','erase'].includes(tool)){g.fillStyle='#526b54';g.font='14px sans-serif';g.textBaseline='middle';g.fillText({hand:'Drag to move the page',picker:'Tap to sample a colour',select:'Choose areas, then a brush',erase:'Brush away colour'}[tool],14,31);return;}
 const sample=document.createElement('canvas');sample.width=c.width;sample.height=c.height;const s=sample.getContext('2d'),image=createTip(),radius=Math.min(22,5+size*.25);
 for(let x=20;x<c.width-20;x+=Math.max(1,radius*.14)){const y=31+Math.sin(x/42)*5;s.drawImage(image,x-radius,y-radius,radius*2,radius*2);}g.globalAlpha=opacity;g.drawImage(sample,0,0);g.globalAlpha=1;
}
function drawTo(p,renderNow=true){const last=lastPoint||p;const dist=Math.hypot(p.x-last.x,p.y-last.y),spacing=tool==='smudge'?Math.max(2,size*.22):Math.max(1,size*.12),steps=Math.max(1,Math.ceil(dist/spacing));for(let i=1;i<=steps;i++){const f=i/steps;stamp({x:last.x+(p.x-last.x)*f,y:last.y+(p.y-last.y)*f,pressure:last.pressure+(p.pressure-last.pressure)*f});}lastPoint=p;if(renderNow)render();}
function beginStroke(p){
 if((mode==='auto'||selected.size)&&!regionReady){toast('The page is still preparing its shapes.');return;}
 if(selected.size){makeMask(selected);strokeMask=true;}
 else if(mode==='auto'){const id=regionAt(labels,canvas.width,canvas.height,p.x,p.y);if(!allowedArea(id))return;makeMask(new Set([id]));strokeMask=true;}
 else strokeMask=false;
 strokeBefore=pc.getImageData(0,0,paint.width,paint.height);sc.clearRect(0,0,stroke.width,stroke.height);strokeActive=true;lastPoint=p;lastSmudgePoint=null;smudgeTip=null;smudgeBuffer=null;stampCounter=0;tip=null;stamp(p);render();
}
// Mix wet watercolour pigment with colour already on the page.
// Work on the clipped layer so stay-in-lines masks remain authoritative.
function commitWatercolour(){
 const incoming=cc.getImageData(0,0,clipped.width,clipped.height);
 const prior=strokeBefore;
 const out=new ImageData(new Uint8ClampedArray(prior.data),prior.width,prior.height);
 const src=incoming.data,dst=out.data;
 for(let i=0;i<src.length;i+=4){
  const a=src[i+3]/255;if(a<=0)continue;
  const b=prior.data[i+3]/255;
  const alpha=a+b*(1-a);
  if(alpha<=0)continue;
  // A wet stroke lifts some underlying pigment into the new wash.
  // Transparent paper has no pigment to mix with.
  const pickup=b*Math.min(.42,.12+a*.4);
  // A transparent wash accumulates pigment at the edge of its deposited
  // footprint. Only apply the effect where a stroke actually has alpha;
  // the existing region mask remains authoritative.
  const x=(i/4)%incoming.width,y=Math.floor((i/4)/incoming.width);
  const left=x>0?src[i-1]/255:a;
  const right=x+1<incoming.width?src[i+7]/255:a;
  const above=y>0?src[i-incoming.width*4+3]/255:a;
  const below=y+1<incoming.height?src[i+incoming.width*4+3]/255:a;
  const edge=Math.max(0,a-Math.min(left,right,above,below));
  const pooling=Math.min(.16,edge*.28)*(1-b*.4);
  for(let c=0;c<3;c++){
   // Transparent glaze keeps the original colour visible. Where wet
   // pigment meets pigment, a little subtractive mixing darkens the overlap.
   const under=prior.data[i+c],fresh=src[i+c];
   const mixed=(fresh*under)/255;
   const wet=fresh*(1-pickup)+mixed*pickup;
   dst[i+c]=Math.round(Math.max(0,(wet*(1-pooling)*a+under*b*(1-a))/alpha));
  }
  dst[i+3]=Math.round(alpha*255);
 }
 pc.putImageData(out,0,0);
}
// Oil carries some existing colour into the new stroke; gouache covers it
// with a mostly opaque matte layer. Both use the clipped region mask.
function commitOpaqueMedium(){
 const incoming=cc.getImageData(0,0,clipped.width,clipped.height);
 const prior=strokeBefore;
 const out=new ImageData(new Uint8ClampedArray(prior.data),prior.width,prior.height);
 const src=incoming.data,dst=out.data;
 const oil=tool==='oil';
 for(let i=0;i<src.length;i+=4){
  const a=src[i+3]/255;if(a<=0)continue;
  const b=prior.data[i+3]/255;
  const coverage=oil?Math.min(1,a*.92):Math.min(1,a*1.15);
  const mixedAlpha=coverage+b*(1-coverage);
  const drag=oil?Math.min(.35,b*.32):0;
  for(let c=0;c<3;c++){
   const pigment=src[i+c]*(1-drag)+prior.data[i+c]*drag;
   out.data[i+c]=Math.round((pigment*coverage+prior.data[i+c]*b*(1-coverage))/Math.max(.0001,mixedAlpha));
  }
  out.data[i+3]=Math.round(mixedAlpha*255);
 }
 pc.putImageData(out,0,0);
}
function finishStroke(commit=true){if(!strokeActive)return;prepareClipped();if(commit&&stampCounter){remember(strokeBefore);if(tool==='watercolour')commitWatercolour();else if(tool==='oil'||tool==='gouache')commitOpaqueMedium();else{pc.globalCompositeOperation=tool==='erase'?'destination-out':'source-over';pc.drawImage(clipped,0,0);pc.globalCompositeOperation='source-over';}scheduleSave();}strokeActive=false;lastPoint=null;lastSmudgePoint=null;smudgeTip=null;smudgeBuffer=null;strokeBefore=null;sc.clearRect(0,0,stroke.width,stroke.height);render();}
function fillArea(p){
 if(!regionReady){toast('The page is still preparing its shapes.');return;}
 const id=regionAt(labels,canvas.width,canvas.height,p.x,p.y);if(!selected.size&&!allowedArea(id))return;
 const ids=selected.size?selected:new Set([id]),before=pc.getImageData(0,0,paint.width,paint.height),im=pc.getImageData(0,0,paint.width,paint.height),rgb=hexToRgb(colour);
 let x0=canvas.width,y0=canvas.height,x1=0,y1=0;
 if(tool==='gradient'){for(let i=0;i<labels.length;i++)if(ids.has(labels[i])){let x=i%canvas.width,y=Math.floor(i/canvas.width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
 for(let i=0;i<labels.length;i++)if(ids.has(labels[i])){
  let pixel=rgb;
  if(tool==='gradient'){const y=Math.floor(i/canvas.width),f=(y-y0)/Math.max(1,y1-y0);pixel=rgb.map(c=>Math.round(c+(255-c)*f*.72));}
  blendPixel(im.data,i*4,pixel,opacity);
 }
 pc.putImageData(im,0,0);remember(before);render();scheduleSave();
}
function pickColour(p){const x=Math.min(canvas.width-1,Math.max(0,Math.round(p.x))),y=Math.min(canvas.height-1,Math.max(0,Math.round(p.y)));const rgb=ctx.getImageData(x,y,1,1).data;setColour('#'+[...rgb].slice(0,3).map(c=>c.toString(16).padStart(2,'0')).join(''));selectTool(mode==='fill'?'fill':lastBrush);toast('Colour picked.');}
function fitPage(){if(!current)return;const r=$('viewport').getBoundingClientRect(),foot=footerHeight(canvas.width),scale=Math.max(.03,Math.min((r.width-34)/canvas.width,(r.height-30)/(canvas.height+foot)));fitWidth=canvas.width*scale;fitHeight=(canvas.height+foot)*scale;$('canvas-wrap').style.width=`${fitWidth}px`;$('canvas-wrap').style.height=`${fitHeight}px`;$('page-brand').style.height=`${foot*scale}px`;$('page-brand').querySelector('img').style.width=`${canvas.width*.255*scale}px`;transform();}
function transform(){const r=$('viewport').getBoundingClientRect();panX=Math.max(-fitWidth*zoom/2,Math.min(fitWidth*zoom/2,panX));panY=Math.max(-fitHeight*zoom/2,Math.min(fitHeight*zoom/2,panY));$('canvas-wrap').style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;$('zoom-fit').textContent=`${Math.round(zoom*100)}%`;}
function setZoom(z){zoom=Math.max(.5,Math.min(6,z));transform();}
$('zoom-in').onclick=()=>setZoom(zoom*1.25);$('zoom-out').onclick=()=>setZoom(zoom/1.25);$('zoom-fit').onclick=()=>{zoom=1;panX=panY=0;fitPage();};window.addEventListener('resize',fitPage);
const vp=$('viewport');
// While a pen is drawing, ignore incidental finger contacts from the palm.
// Ordinary two-finger gestures remain available when no pen is active.
let penPointer=null;
vp.onpointerdown=e=>{
 if(!current||e.button>0||!$('loading').hidden)return;
 if(penPointer!==null&&e.pointerType==='touch')return;
 if(e.pointerType==='pen'&&points.size){for(const id of points.keys()){try{vp.releasePointerCapture(id);}catch(_){} }points.clear();finishStroke(false);gesture=null;pendingTap=null;panStart=null;activePointer=null;}
 if(e.pointerType==='pen')penPointer=e.pointerId;
 e.preventDefault();vp.setPointerCapture(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(points.size===2){finishStroke(false);pendingTap=null;const a=[...points.values()];gesture={dist:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom,x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,panX,panY};panStart=null;activePointer=null;return;}
 if(points.size>1)return;
 activePointer=e.pointerId;if(tool==='hand'||e.altKey){panStart={x:e.clientX,y:e.clientY,panX,panY};return;}
 const p=getPoint(e);if(p.x<0||p.y<0||p.x>canvas.width||p.y>canvas.height)return;
 if(tool==='picker'||tool==='select'||(mode==='fill'&&tool!=='erase'))pendingTap={point:p,x:e.clientX,y:e.clientY};else beginStroke(p);
};
vp.onpointermove=e=>{
 if(!points.has(e.pointerId))return;if(penPointer!==null&&e.pointerType==='touch')return;e.preventDefault();points.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(gesture&&points.size>=2){const a=[...points.values()];setZoom(gesture.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(10,gesture.dist));panX=gesture.panX+(a[0].x+a[1].x)/2-gesture.x;panY=gesture.panY+(a[0].y+a[1].y)/2-gesture.y;transform();return;}
 if(e.pointerId!==activePointer)return;if(panStart){panX=panStart.panX+e.clientX-panStart.x;panY=panStart.panY+e.clientY-panStart.y;transform();return;}
 if(pendingTap&&Math.hypot(e.clientX-pendingTap.x,e.clientY-pendingTap.y)>12)pendingTap=null;
 if(strokeActive){
  // Some browsers report coalesced samples in a different order or include
  // duplicates. Keep only this pointer's samples, in chronological order.
  const samples=(e.getCoalescedEvents?.()||[]).filter(sample=>sample.pointerId===e.pointerId);
  if(!samples.length)samples.push(e);
  samples.sort((a,b)=>a.timeStamp-b.timeStamp);
  for(const sample of samples)drawTo(stabilisePoint(lastPoint,getPoint(sample),smoothing),false);
  render();
 }
};
function endPointer(e){
 if(e.pointerId===activePointer){
  if(strokeActive&&e.type==='pointerup'&&lastPoint){const p=getPoint(e);p.pressure=lastPoint.pressure;drawTo(p,false);}
  if(pendingTap&&e.type==='pointerup'&&!gesture){const p=pendingTap.point;if(tool==='picker')pickColour(p);else if(tool==='select'){if(regionReady){const id=regionAt(labels,canvas.width,canvas.height,p.x,p.y);if(selected.has(id)){selected.delete(id);updateSelection();}else if(allowedArea(id)){selected.add(id);updateSelection();}}else toast('Wait while the page prepares its shapes.');}else fillArea(p);}
  pendingTap=null;finishStroke(e.type!=='pointercancel');
 }
 points.delete(e.pointerId);if(e.pointerId===penPointer)penPointer=null;if(!points.size){gesture=null;panStart=null;activePointer=null;}else if(gesture){activePointer=null;}
}
vp.onpointerup=vp.onpointercancel=endPointer;vp.addEventListener('lostpointercapture',e=>{if(e.pointerId===activePointer)endPointer(e);});
vp.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.0015));},{passive:false});
async function prepareRegions(){
 if(!current)return;regionReady=false;labels=null;regionAreas=null;regionEdges=null;clearSelection();worker?.terminate();const mine=epoch;
 $('loading').hidden=false;$('loading-text').textContent='Preparing the colouring areas…';
 const im=ic.getImageData(0,0,ink.width,ink.height);
 worker=new Worker('regions-worker.js',{type:'module'});
 worker.onmessage=({data})=>{if(mine!==epoch)return;if(data.error){regionReady=false;$('loading').hidden=true;updateTools();toast('Shape detection failed. Choose Freehand explicitly if you want to continue.');return;}labels=new Uint32Array(data.labels);regionAreas=new Uint32Array(data.areas);regionEdges=new Uint8Array(data.edge);regionReady=true;$('loading').hidden=true;worker.terminate();worker=null;};
 worker.onerror=()=>{if(mine!==epoch)return;$('loading').hidden=true;updateTools();toast('Shape detection is unavailable. Choose Freehand explicitly if you want to continue.');};
 worker.postMessage({pixels:im.data.buffer,width:ink.width,height:ink.height,closeGaps:$('gap-protection').checked,gapRadius:Number($('gap-strength').value)},[im.data.buffer]);
}
$('gap-protection').onchange=()=>{finishStroke();prepareRegions();};
$('gap-strength').onchange=()=>{finishStroke();prepareRegions();};
$('paint-background').onchange=()=>{finishStroke();if(!$('paint-background').checked&&labels){for(const id of selected)if(isBackgroundArea(id,regionAreas,regionEdges,labels.length))selected.delete(id);updateSelection();}};
// The journal (journal.js) reads the catalogue and reopens pages through these two.
window.chromalieCatalog=()=>catalog;
window.chromalieOpen=id=>{const p=catalog.pages.find(x=>x.id===id);if(p)openPage(p);};
async function openPage(p){
 window.dispatchEvent(new CustomEvent('chromalie:open',{detail:p}));
 finishStroke();await persist();if(storageEnabled&&dirty){toast('This page could not be saved. Download your painting before switching pages.');return;}const mine=++epoch;current=p;dirty=false;$('retry-save').hidden=true;undoStack=[];redoStack=[];selected.clear();regionReady=false;labels=null;updateHistory();
 $('storage-notice').hidden=true;$('home').hidden=true;$('studio').hidden=false;document.body.style.overflow='hidden';$('art-title').textContent=p.title;$('page-position').textContent=`Page ${p.number} · ${catalog.books.find(b=>b.id===p.book)?.title||''}`;const credit=$('page-credit');if(credit){credit.hidden=!p.credit;credit.textContent=p.credit?`Art: ${p.credit}`:'';if(p.creditUrl)credit.href=p.creditUrl;}$('save-state').textContent=storageEnabled?'Ready to colour':'Device saving is off. Download to keep.';$('loading').hidden=false;$('loading-text').textContent='Opening your page…';
 for(const c of [canvas,paint,ink,stroke,mask,clipped,selectionCanvas,eraserPreview]){c.width=p.width;c.height=p.height;}
 // Automatic remains automatic for every collection. Freehand is only selected
 // by the visitor, never silently enabled for shaded drawings.
 zoom=1;panX=panY=0;fitPage();updateTools();
 try{
  const img=new Image();img.src=p.image;await img.decode();if(mine!==epoch)return;ic.fillStyle='white';ic.fillRect(0,0,ink.width,ink.height);ic.drawImage(img,0,0);pc.clearRect(0,0,paint.width,paint.height);resetLayers();
  const entry=await dbGet('artwork',p.id);if(mine!==epoch)return;
  if(entry?.blob){if(Array.isArray(entry.layers)&&entry.layers.length>0&&entry.layers.length<=5){paintLayers=[];for(const blob of entry.layers){const bitmap=await createImageBitmap(blob);const c=document.createElement('canvas');c.width=paint.width;c.height=paint.height;c.getContext('2d').drawImage(bitmap,0,0);bitmap.close();paintLayers.push({name:entry.layerMeta?.[paintLayers.length]?.name||'Layer '+(paintLayers.length+1),canvas:c,visible:entry.layerMeta?.[paintLayers.length]?.visible!==false,opacity:entry.layerMeta?.[paintLayers.length]?.opacity??1});}activeLayer=paintLayers.length-1;undoStack=[];redoStack=[];updateHistory();pc.drawImage(paintLayers[activeLayer].canvas,0,0);drawLayerControls();}else{const bitmap=await createImageBitmap(entry.blob);if(mine!==epoch){bitmap.close();return;}pc.drawImage(bitmap,0,0);bitmap.close();resetLayers();}$('save-state').textContent=storageEnabled?'Saved on this device':'Device saving is off. Download to keep.';}
  render();prepareRegions();$('exit-studio').focus({preventScroll:true});
 }catch(e){if(mine!==epoch)return;$('loading').hidden=true;toast('This page could not open. Please try another page.');await exitStudio();}
}
async function exitStudio(){finishStroke();await persist();if(storageEnabled&&dirty){toast('Saving failed. Download your painting before leaving.');return;}epoch++;worker?.terminate();worker=null;current=null;points.clear();gesture=null;panStart=null;$('studio').hidden=true;$('home').hidden=false;document.body.style.overflow='';renderLibrary();$('library').scrollIntoView();$('library-title').tabIndex=-1;$('library-title').focus({preventScroll:true});}
$('exit-studio').onclick=exitStudio;
$('focus-mode').onclick=()=>{const active=$('studio').classList.toggle('studio-focus');$('focus-mode').textContent=active?'Tools':'Focus';$('focus-mode').setAttribute('aria-pressed',String(active));requestAnimationFrame(fitPage);};
$('next-page').onclick=()=>{if(!current)return;const pages=catalog.pages.filter(p=>p.book===current.book),i=pages.findIndex(p=>p.id===current.id);openPage(pages[(i+1)%pages.length]);};
// Non-destructive finishing options: these affect exported art, not editable paint.
const finishPrefs={frame:'none',paper:'white'};
try {
 const stored=JSON.parse(localStorage.getItem('chromalie-finishing')||'null');
 if(stored&&['none','simple','double','dots','botanical'].includes(stored.frame))finishPrefs.frame=stored.frame;
 if(stored&&['white','cream','linen'].includes(stored.paper))finishPrefs.paper=stored.paper;
} catch(e) {}
function saveFinishing(){
 try{localStorage.setItem('chromalie-finishing',JSON.stringify(finishPrefs));}catch(e){}
}
const finishing=document.createElement('div');
finishing.className='chromalie-finishing';
finishing.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;border:1px solid #d9d0bf;border-radius:12px;margin:10px 0;background:#fcfaf5;color:#394a40';
finishing.innerHTML='<strong style="margin-right:8px">Finishing touches</strong><label>Frame <select class="finish-frame"><option value="none">None</option><option value="simple">Classic</option><option value="double">Double line</option><option value="dots">Dotted</option><option value="botanical">Botanical</option></select></label><label>Paper <select class="finish-paper"><option value="white">White</option><option value="cream">Warm cream</option><option value="linen">Linen</option></select></label>';
const toolPanel=document.querySelector('.tool-panel');
if(toolPanel) toolPanel.append(finishing);
finishing.querySelector('.finish-frame').value=finishPrefs.frame;
finishing.querySelector('.finish-paper').value=finishPrefs.paper;
finishing.querySelector('.finish-frame').onchange=e=>{finishPrefs.frame=e.target.value;saveFinishing();toast('Frame selected for download and print.');};
finishing.querySelector('.finish-paper').onchange=e=>{finishPrefs.paper=e.target.value;saveFinishing();toast('Paper selected for download and print.');};
const finishingPreview=document.createElement('canvas');
finishingPreview.width=240;finishingPreview.height=180;
finishingPreview.setAttribute('role','img');
finishingPreview.setAttribute('aria-label','Preview of your selected frame and paper');
finishingPreview.style.cssText='display:block;width:100%;max-width:240px;height:auto;border-radius:6px;margin-top:8px';
finishing.append(finishingPreview);
function refreshFinishingPreview(){
 const c=finishingPreview.getContext('2d'),w=finishingPreview.width,h=finishingPreview.height;
 c.clearRect(0,0,w,h);
 c.fillStyle='#fff';c.fillRect(0,0,w,h);
 c.fillStyle='#e7e9e0';c.fillRect(22,18,w-44,h-36);
 c.fillStyle='#d2b3a4';c.beginPath();c.arc(95,83,30,0,Math.PI*2);c.fill();
 c.fillStyle='#9cb5a2';c.beginPath();c.ellipse(143,107,34,20,-.5,0,Math.PI*2);c.fill();
 applyFinishing(c,w,h);
}
finishing.querySelectorAll('select').forEach(select=>select.addEventListener('change',refreshFinishingPreview));
refreshFinishingPreview();
function applyFinishing(c,w,h){
 if(finishPrefs.paper!=='white'){
  c.save();c.globalCompositeOperation='multiply';
  c.fillStyle=finishPrefs.paper==='cream'?'#fff4dc':'#f2eee5';c.fillRect(0,0,w,h);
  if(finishPrefs.paper==='linen'){
   c.strokeStyle='rgba(105,92,70,.055)';c.lineWidth=1;
   for(let x=0;x<w;x+=9){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
   for(let y=0;y<h;y+=9){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  }
  c.restore();
 }
 if(finishPrefs.frame==='none')return;
 c.save();const margin=Math.max(14,Math.round(Math.min(w,h)*.035));
 c.strokeStyle='#6b7564';c.lineWidth=Math.max(2,w/550);
 const rect=(inset)=>c.strokeRect(inset,inset,w-2*inset,h-2*inset);
 if(finishPrefs.frame==='dots')c.setLineDash([2,9]);
 rect(margin);
 if(finishPrefs.frame==='double'){c.setLineDash([]);rect(margin+Math.max(6,w/100));}
 if(finishPrefs.frame==='botanical'){
  c.setLineDash([]);c.strokeStyle='#829577';
  for(const [x,y,dx,dy] of [[margin,margin,1,1],[w-margin,margin,-1,1],[margin,h-margin,1,-1],[w-margin,h-margin,-1,-1]]){
   c.beginPath();c.moveTo(x,y+dy*38);c.quadraticCurveTo(x+dx*5,y+dy*5,x+dx*38,y);c.stroke();
   for(let k=12;k<36;k+=12){c.beginPath();c.ellipse(x+dx*k,y+dy*(30-k)*.65,7,3,-dx*dy*.6,0,Math.PI*2);c.stroke();}
  }
 }
 c.restore();
}
function brandedArtwork(){const art=document.createElement('canvas');art.width=canvas.width;art.height=canvas.height;compose(art);applyFinishing(art.getContext('2d'),art.width,art.height);const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height+footerHeight(canvas.width);const c=out.getContext('2d');c.drawImage(art,0,0);drawBrandFooter(c,out.width,canvas.height,current);return out;}
$('download').onclick=async()=>{const button=$('download');if(button.disabled)return;button.disabled=true;try{finishStroke();if(!current)throw Error('No page is open');const page=current,out=brandedArtwork();await persist();const blob=await blobOf(out),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${brand.slug}-${page.id}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Your artwork is ready to download.');window.dispatchEvent(new CustomEvent('chromalie:download',{detail:page}));}catch(error){toast('Could not prepare the download. Try again or save an editable project.');console.error('Artwork export failed',error);}finally{button.disabled=false;}};
$('print').onclick=()=>{finishStroke();window.dispatchEvent(new CustomEvent('chromalie:print',{detail:current}));const out=brandedArtwork();const im=document.createElement('img');im.className='print-art';im.src=out.toDataURL('image/png');document.body.append(im);im.onload=()=>{window.print();setTimeout(()=>im.remove(),1000);};};
// Sharing (share.js) asks for the page as it would download.
window.chromalieArtwork=async()=>{if(!current)return null;finishStroke();const page=current,out=brandedArtwork();await persist();return {blob:await blobOf(out),page};};
function downloadFile(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('save-project').onclick=()=>{finishStroke();const project={format:'chromalie-project',version:2,page_id:current.id,width:paint.width,height:paint.height,paint:mergedPaint().toDataURL('image/png'),layers:paintLayers.map((layer,i)=>({name:layer.name,visible:layer.visible!==false,opacity:layer.opacity??1,paint:(i===activeLayer?paint:layer.canvas).toDataURL('image/png')}))};downloadFile(new Blob([JSON.stringify(project)],{type:'application/json'}),`chromalie-${current.id}-editable.json`);toast('Editable layered project ready to download.');};
$('open-project').onclick=()=> $('project-file').click();
$('project-file').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 try{
  if(file.size>20*1024*1024)throw Error('This project file is too large.');
  const project=JSON.parse(await file.text());const page=catalog.pages.find(p=>p.id===project.page_id);
  if(project.format!=='chromalie-project'||![1,2].includes(project.version)||!page||project.width!==page.width||project.height!==page.height||typeof project.paint!=='string')throw Error('This is not a supported Chromalie project.');
  const entries=project.version===2?project.layers:[{name:'Layer 1',paint:project.paint}];
  if(!Array.isArray(entries)||entries.length<1||entries.length>5)throw Error('The project has an invalid number of layers.');
  const bitmaps=[];
  try{
   for(const entry of entries){
    if(!entry||typeof entry.paint!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(entry.paint))throw Error('A project layer is not a valid PNG.');
    const raw=atob(entry.paint.split(',')[1]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    if(bytes.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>bytes[i]!==v))throw Error('A project layer does not contain PNG data.');
    const header=new DataView(bytes.buffer);
    if(header.getUint32(16)!==page.width||header.getUint32(20)!==page.height)throw Error('A project layer has the wrong dimensions.');
    bitmaps.push(await createImageBitmap(new Blob([bytes],{type:'image/png'})));
   }
   await openPage(page);
   if(current?.id!==page.id)return;
   paintLayers=bitmaps.map((bitmap,i)=>{const c=document.createElement('canvas');c.width=paint.width;c.height=paint.height;c.getContext('2d').drawImage(bitmap,0,0);return {name:typeof entries[i].name==='string'&&entries[i].name.trim()?entries[i].name.slice(0,40):'Layer '+(i+1),canvas:c,visible:entries[i].visible!==false,opacity:typeof entries[i].opacity==='number'&&entries[i].opacity>=0&&entries[i].opacity<=1?entries[i].opacity:1};});
   activeLayer=paintLayers.length-1;pc.clearRect(0,0,paint.width,paint.height);pc.drawImage(paintLayers[activeLayer].canvas,0,0);
   undoStack=[];redoStack=[];updateHistory();drawLayerControls();render();scheduleSave();toast('Editable project restored.');
  }finally{bitmaps.forEach(bitmap=>bitmap.close());}
 }catch(error){toast(error.message||'This project could not open.');}
};
$('start-over').onclick=()=> $('reset-dialog').showModal();$('cancel-reset').onclick=()=> $('reset-dialog').close();$('confirm-reset').onclick=()=>{finishStroke();pc.clearRect(0,0,paint.width,paint.height);undoStack=[];redoStack=[];resetLayers();updateHistory();clearSelection();render();scheduleSave();$('reset-dialog').close();};
$('help-button').onclick=()=>showInfo('A few ways to colour','<ul><li>In the lines is the default. Each stroke stays inside the area where it begins. All brushes respect the same area mask.</li><li>Fill: tap an enclosed shape. Gradient fill adds a lighter shade towards the bottom.</li><li>Select areas: tap one or more shapes, then choose a brush. The selection stays active until you clear it.</li><li>Freehand: deliberately paint across shapes. Clear a selection first to paint everywhere.</li><li>Close gaps: choose Fine for tiny details, Standard for most pages, or Strong for broken outlines. Strong can hide very small areas. Drawings with larger openings may still need freehand.</li><li>Paint background: turn this on to colour an area that touches the page edge or covers a large part of the drawing. It is off initially to help contain accidental spills.</li><li>Pinch to zoom. Drag with two fingers or choose Move page. A supported stylus adds pressure variation.</li><li>The Chromalie mark sits below the artwork. It appears on downloads and printouts.</li><li>Your work saves on this browser. Download a PNG for a copy to keep. Undo history lasts while a page is open.</li></ul>');
$('studio-help').onclick=()=> $('help-button').click();
document.addEventListener('keydown',e=>{if(!current||e.target.matches('input,select,textarea')||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}if(e.key==='['){size=Math.max(2,size-3);$('brush-size').value=size;$('size-value').textContent=size;tip=null;updateBrushPreview();}if(e.key===']'){size=Math.min(150,size+3);$('brush-size').value=size;$('size-value').textContent=size;tip=null;updateBrushPreview();}if(e.key==='Escape')clearSelection();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){finishStroke();persist();}});window.addEventListener('pagehide',()=>{finishStroke();persist();});
function openStorage(){finishStroke();$('save-device').checked=storageEnabled;$('storage-dialog').showModal();}
document.querySelectorAll('[data-open-storage]').forEach(b=>b.onclick=openStorage);$('close-storage').onclick=()=> $('storage-dialog').close();
$('save-device').onchange=async e=>{finishStroke();const next=e.target.checked;await persist();storageEnabled=next;try{localStorage.setItem('chromalie-save-work',next?'on':'off');}catch(error){}if(current)$('save-state').textContent=next?'Device saving is on':'Device saving is off. Download to keep.';toast(next?'New work will save on this device.':'New work and palettes will stay in this session only.');};
$('clear-saved').onclick=()=> $('clear-data-dialog').showModal();$('cancel-clear-data').onclick=()=> $('clear-data-dialog').close();
$('confirm-clear-data').onclick=async()=>{
 finishStroke(false);clearTimeout(saveTimer);dirty=false;changed++;await saveChain.catch(()=>{});
 try{
  if(db)await new Promise((resolve,reject)=>{const t=db.transaction(['artwork','settings'],'readwrite');t.objectStore('artwork').clear();t.objectStore('settings').clear();t.oncomplete=resolve;t.onerror=()=>reject(t.error);});
  saved.clear();customPalette=[];updateWorkCount();renderColours();if(current){pc.clearRect(0,0,paint.width,paint.height);undoStack=[];redoStack=[];clearSelection();updateHistory();render();$('save-state').textContent='Saved work cleared. The open page has been reset.';}else renderLibrary();$('clear-data-dialog').close();toast('Saved artwork and custom colours cleared on this device.');
 }catch(error){toast('Saved work could not be cleared. Try your browser’s site data settings.');}
};
$('dismiss-storage').onclick=()=>{$('storage-notice').hidden=true;try{localStorage.setItem('chromalie-storage-notice','seen');}catch(e){}};
window.addEventListener('hashchange',()=>{if(location.hash==='#storage'&&!$('storage-dialog').open)openStorage();});
async function init(){
 try{db=await openDB();await loadSaved();}catch(e){toast('Device saving is unavailable. You can still colour and download.');}
 renderColours();updateTools();
 try{$('storage-notice').hidden=localStorage.getItem('chromalie-storage-notice')==='seen';}catch(e){$('storage-notice').hidden=false;}if(location.hash==='#storage')openStorage();
 try{const response=await fetch('catalog.json');if(!response.ok)throw Error('catalog');catalog=applyCollectionNames(await response.json());catalog.pages.sort((a,b)=>a.number-b.number||catalog.books.findIndex(p=>p.id===a.book)-catalog.books.findIndex(p=>p.id===b.book));
  $('page-count').textContent=`${catalog.pages.length} pages · ${catalog.books.length} collections`;
  const cats=['All',...new Set(catalog.pages.map(p=>p.category))];for(const c of cats){const b=document.createElement('button');b.dataset.category=c;b.textContent=c;b.classList.toggle('active',c==='All');b.onclick=()=>{category=c;visible=24;document.querySelectorAll('[data-category]').forEach(btn=>btn.classList.toggle('active',btn===b));renderLibrary();};$('categories').append(b);}
  for(const b of catalog.books){const o=document.createElement('option');o.value=b.id;o.textContent=`${b.title} · ${b.subject} (${b.count})`;$('book-filter').append(o);}renderLibrary();
 }catch(e){$('page-count').textContent='Library unavailable';$('page-grid').textContent='The library could not load. Please reload the page.';}
}
init();

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const catalog=read('dist/catalog.json'),manifest=read('assets-manifest.json');
const sums=new Map(manifest.files.map(f=>[f.path,f]));
test('Every collection count equals its pages and numbers run from 1 without gaps',()=>{
 for(const b of catalog.books){const pages=catalog.pages.filter(p=>p.book===b.id);assert.equal(pages.length,b.count,b.id);assert.deepEqual(pages.map(p=>p.number).sort((x,y)=>x-y),pages.map((_,i)=>i+1),b.id);}
});
test('Every page and thumbnail is in assets-manifest.json and, where the artwork is present, matches its checksum',t=>{
 // The artwork is third-party material kept in private storage (see CONTRIBUTING.md and
 // scripts/import-assets.py). Without CHROMALIE_ART_INDEX_URL, as on a fork or a pull request
 // that cannot read secrets, none of it is on disk and this test checks the manifest alone.
 // With the secret set, or with any artwork on disk, every file must exist and match.
 const paths=catalog.pages.flatMap(p=>[p.image,p.thumb]).map(rel=>'dist/'+rel);
 const artwork=Boolean(process.env.CHROMALIE_ART_INDEX_URL)||paths.some(path=>existsSync(new URL('../'+path,import.meta.url)));
 if(!artwork)t.diagnostic('No artwork on disk and CHROMALIE_ART_INDEX_URL is not set: file existence and checksums not checked. import-assets.py checks them wherever the artwork is fetched.');
 for(const path of paths){
  const entry=sums.get(path);assert.ok(entry,'not in manifest: '+path);
  if(!artwork)continue;
  const file=new URL('../'+path,import.meta.url);assert.ok(existsSync(file),'missing: '+path);
  const data=readFileSync(file);assert.equal(data.length,entry.bytes,path);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256,path);
 }
});
test('Festivals of India pages are credited to the owner with a link',()=>{
 const pages=catalog.pages.filter(p=>p.book==='festivals');assert.ok(pages.length>0);
 for(const p of pages){assert.equal(p.credit,'Varna Sri Raman',p.id);assert.equal(p.creditUrl,'https://storywell.in',p.id);}
});

test('Every page has a name, search words, a shape count and a level that follows from the count',()=>{
 const levels=['Simple','Medium','Detailed','Intricate'];
 for(const p of catalog.pages){
  assert.equal(typeof p.name,'string',p.id);assert.ok(p.name.trim().length>=4,'no name: '+p.id);
  assert.ok(!/[\u2013\u2014]/.test(p.name),'dash in name: '+p.id);
  assert.ok(!/\d+$/.test(p.name.trim()),'a name that ends in a number is a number, not a name: '+p.id);
  assert.ok(Array.isArray(p.tags)&&p.tags.length>=3,'fewer than three search words: '+p.id);
  for(const t of p.tags)assert.equal(t,t.toLowerCase().trim(),'search words are lower case: '+p.id);
  assert.ok(Number.isInteger(p.shapes)&&p.shapes>=0,'no shape count: '+p.id);
  assert.ok(levels.includes(p.level),'unknown level '+p.level+': '+p.id);
  // Under ten shapes the engine could not separate the drawing, and the level is not derived from the count.
  if(p.shapes>=10)assert.equal(p.level,p.shapes<150?'Simple':p.shapes<400?'Medium':p.shapes<900?'Detailed':'Intricate',p.id);
 }
});
test('No two pages of one collection share a name',()=>{
 const seen=new Map();
 for(const p of catalog.pages){const key=p.book+'|'+p.name.toLowerCase();assert.ok(!seen.has(key),p.id+' and '+seen.get(key)+' are both named '+p.name);seen.set(key,p.id);}
});

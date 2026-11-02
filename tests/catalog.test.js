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

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
// The artwork is in private storage. A run that cannot read the secret (a Dependabot or fork pull
// request) sets CHROMALIE_SKIP_ART_FILES=1 in deploy.yml and still checks that every page is in the
// manifest, but cannot check the files. Without the variable (local runs, main) a missing file fails.
const skipFiles=process.env.CHROMALIE_SKIP_ART_FILES==='1';
test('Every page and thumbnail exists and matches the checksum in assets-manifest.json',t=>{
 if(skipFiles)t.diagnostic('artwork files not available in this run: manifest membership checked, files and checksums not');
 for(const p of catalog.pages)for(const rel of [p.image,p.thumb]){
  const path='dist/'+rel,entry=sums.get(path);assert.ok(entry,'not in manifest: '+path);
  if(skipFiles)continue;
  const file=new URL('../'+path,import.meta.url);assert.ok(existsSync(file),'missing: '+path);
  const data=readFileSync(file);assert.equal(data.length,entry.bytes,path);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256,path);
 }
});
test('Festivals of India pages are credited to the owner with a link',()=>{
 const pages=catalog.pages.filter(p=>p.book==='festivals');assert.ok(pages.length>0);
 for(const p of pages){assert.equal(p.credit,'Varna Sri Raman',p.id);assert.equal(p.creditUrl,'https://storywell.in',p.id);}
});

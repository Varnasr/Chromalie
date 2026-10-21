"""Fetch the colouring artwork from private storage and verify it against the manifest.

The artwork belongs to its publishers (private label rights packs, Monkey Pen,
Twinkl) and is not in this repository. It lives in a private storage bucket.
CHROMALIE_ART_INDEX_URL is a signed link to a small index of signed links, one
per file, so the build holds one narrow read-only credential and nothing that
can write to the bucket or reach any other data.

Every file is checked against assets-manifest.json by size and SHA-256 before
it is kept. Without the variable the script stops and says so; the engine and
catalogue tests do not need the artwork, the browser test and the build do.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request,urlopen
import hashlib,json,os,sys,time
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'assets-manifest.json').read_text())
INDEX=os.environ.get('CHROMALIE_ART_INDEX_URL','')
def get(url):
 request=Request(url,headers={'User-Agent':'Chromalie-artwork-import/2.0'})
 for attempt in range(3):
  try:
   with urlopen(request,timeout=90) as response:return response.read()
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def present(item):
 target=ROOT/item['path']
 return target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']
missing=[item for item in manifest['files'] if not present(item)]
urls={}
if missing:
 if not INDEX:
  sys.exit('%d artwork files are missing and CHROMALIE_ART_INDEX_URL is not set. The artwork is kept in private storage; see CONTRIBUTING.md.'%len(missing))
 urls=json.loads(get(INDEX))
def fetch(item):
 path=item['path'];target=ROOT/path
 relative=path.removeprefix('dist/')
 if not (relative.startswith(('pages/','thumbs/')) or relative=='hero.webp'):raise ValueError('Unapproved asset path')
 if '..' in Path(relative).parts:raise ValueError('Invalid asset path')
 data=get(urls[relative])
 if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Artwork checksum mismatch: '+path)
 target.parent.mkdir(parents=True,exist_ok=True);temp=target.with_suffix(target.suffix+'.tmp');temp.write_bytes(data);temp.replace(target);return True
with ThreadPoolExecutor(max_workers=8) as pool:
 results=list(pool.map(fetch,missing))
print('Approved assets verified:',len(manifest['files']),'Downloaded:',len(results))

"""Import approved public artwork once and verify it against local checksums."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request,urlopen
import hashlib,json,sys,time
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'assets-manifest.json').read_text())
def fetch(item):
 path=item['path'];target=ROOT/path
 if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']:return False
 relative=path.removeprefix('dist/')
 if not (relative.startswith(('pages/','thumbs/')) or relative=='hero.webp'):raise ValueError('Unapproved asset path')
 if '..' in Path(relative).parts:raise ValueError('Invalid asset path')
 request=Request(manifest['source'].rstrip('/')+'/'+relative,headers={'User-Agent':'Chromalie-artwork-import/1.0'})
 for attempt in range(3):
  try:
   with urlopen(request,timeout=90) as response:data=response.read()
   if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Artwork checksum mismatch: '+path)
   target.parent.mkdir(parents=True,exist_ok=True);temp=target.with_suffix(target.suffix+'.tmp');temp.write_bytes(data);temp.replace(target);return True
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
with ThreadPoolExecutor(max_workers=8) as pool:
 results=list(pool.map(fetch,manifest['files']))
print('Approved assets verified:',len(results),'Downloaded:',sum(results))

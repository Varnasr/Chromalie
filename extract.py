import fitz, json, hashlib
from PIL import Image, ImageOps, ImageDraw
from pathlib import Path

src=Path('/workspace/scratch/dcf53989472c/books')
out=Path('/workspace/sites/colour-room/dist')
(out/'pages').mkdir(exist_ok=True)
(out/'thumbs').mkdir(exist_ok=True)
settings={
 'flowers':('Flowers & plants','Nature','Easy'),
 'owls':('Patterned owls','Animals','Detailed'),
 'geometric':('Geometric patterns','Patterns','Detailed'),
 'butterflies':('Butterflies','Nature','Detailed'),
 'space':('Space adventures','Space','Easy'),
 'cars':('Classic cars','Vehicles','Detailed'),
 'dragons':('Dragons','Fantasy','Detailed'),
 'cats':('Little cats','Animals','Detailed')
}
pages=[];books=[]
for key,(title,category,level) in settings.items():
 path=src/(key+'.pdf')
 if not path.exists(): continue
 doc=fitz.open(path); count=0; hashes=set()
 for n,page in enumerate(doc):
  pix=page.get_pixmap(matrix=fitz.Matrix(1400/max(page.rect.width,page.rect.height),1400/max(page.rect.width,page.rect.height)),colorspace=fitz.csGRAY)
  im=Image.frombytes('L',(pix.width,pix.height),pix.samples)
  # Remove near-white scan noise while retaining fine grey line work.
  im=im.point(lambda v: 255 if v>247 else v)
  histogram=im.histogram(); dark=sum(histogram[:220])/(im.width*im.height)
  if dark<0.001: continue
  digest=hashlib.sha256(im.tobytes()).hexdigest()
  if digest in hashes: continue
  hashes.add(digest); count+=1; ident=f'{key}-{n+1:03d}'
  im.save(out/'pages'/f'{ident}.webp',lossless=True,method=4)
  thumb=im.copy();thumb.thumbnail((270,340));thumb.save(out/'thumbs'/f'{ident}.webp',quality=85)
  style='shaded' if key in ['cars','cats','dragons','butterflies'] else 'line'
  pages.append(dict(id=ident,book=key,title=f'{title} {count}',number=count,sourcePage=n+1,category=category,level=level,style=style,width=im.width,height=im.height,image=f'pages/{ident}.webp',thumb=f'thumbs/{ident}.webp'))
 books.append(dict(id=key,title=title,category=category,level=level,count=count))
 print(key,count,flush=True)
(out/'catalog.json').write_text(json.dumps(dict(books=books,pages=pages),ensure_ascii=False))
print('Total',len(pages),flush=True)

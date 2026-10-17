export const brand={name:'Chromalie',wordmark:'chromalie',slug:'chromalie'};
export const collectionNames={
 flowers:{title:'Petal stories',subject:'Flowers & plants'},
 owls:{title:'Keepers of the night',subject:'Owls'},
 geometric:{title:'The pattern atelier',subject:'Geometric patterns'},
 butterflies:{title:'On gossamer wings',subject:'Butterflies'},
 space:{title:'Starlight wanderers',subject:'Space adventures'},
 cars:{title:'Sunday drives',subject:'Classic cars'},
 dragons:{title:'Here be dragons',subject:'Dragons'},
 cats:{title:'Velvet paws',subject:'Cats'},
 india:{title:'Around India',subject:'India'}
};
export function applyCollectionNames(catalog){
 for(const book of catalog.books){const name=collectionNames[book.id];if(name){book.originalTitle=book.originalTitle||book.title;Object.assign(book,name);}}
 for(const page of catalog.pages){const name=collectionNames[page.book];if(name){page.originalTitle=page.originalTitle||page.title;page.subject=name.subject;page.title=`${name.title} · ${String(page.number).padStart(2,'0')}`;}}
 return catalog;
}
export function footerHeight(width){return Math.max(60,Math.round(width*.075));}
export function drawBrandFooter(ctx,width,artHeight,page){
 const h=footerHeight(width),scale=width/1000,y=artHeight+h/2;
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#fffefa';ctx.fillRect(0,artHeight,width,h);
 ctx.strokeStyle='#e5e7df';ctx.lineWidth=Math.max(1,scale);ctx.beginPath();ctx.moveTo(width*.035,artHeight+1);ctx.lineTo(width*.965,artHeight+1);ctx.stroke();
 const colours=['#9ba788','#d6a372','#d89294','#b3a3ce','#87a5b2','#e2c577'];
 ctx.save();ctx.translate(width*.052,y);for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.fillStyle=colours[i];ctx.beginPath();ctx.ellipse(0,-10*scale,5*scale,12*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#fffefa';ctx.beginPath();ctx.arc(0,0,4*scale,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle='#526b54';ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=`${30*scale}px Georgia, serif`;ctx.fillText(brand.wordmark,width*.084,y);
 const markWidth=ctx.measureText(brand.wordmark).width;ctx.fillStyle='#bd8667';ctx.beginPath();ctx.arc(width*.084+markWidth+6*scale,y+9*scale,2*scale,0,Math.PI*2);ctx.fill();
 if(page){const text=page.credit?`${page.title} · Art: ${page.credit}`:page.title;ctx.font=`${12*scale}px sans-serif`;ctx.fillStyle='#7a8175';ctx.textAlign='right';ctx.fillText(text,width*.963,y,width*.52);}
 ctx.restore();
}

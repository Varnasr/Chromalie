/** Pure pixel operations shared by the studio and its region worker. */
export function segmentRegions(rgba, width, height, closeGaps = true, gapRadius = 2) {
 const n=width*height, ink=new Uint8Array(n), labels=new Uint32Array(n), queue=new Uint32Array(n);
 // Faint scanned outlines are real boundaries too. Near-white paper noise was
 // removed at import, so a higher threshold keeps those lines connected.
 for(let i=0;i<n;i++) ink[i]=(rgba[i*4]+rgba[i*4+1]+rgba[i*4+2])/3<238?1:0;
 let blocked=ink;
 if(closeGaps){
  blocked=ink.slice();
  const radius=Math.max(1,Math.min(4,Math.round(gapRadius)));
  for(let y=0;y<height;y++) for(let x=0;x<width;x++){
   const i=y*width+x;
   if(ink[i])for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    if(dx*dx+dy*dy>radius*radius)continue;
    const xx=x+dx,yy=y+dy;
    if(xx>=0&&yy>=0&&xx<width&&yy<height)blocked[yy*width+xx]=1;
   }
  }
 }
 let count=0;const areas=[0],edge=[0];
 for(let p=0;p<n;p++){
  if(blocked[p]||labels[p])continue;
  const id=++count;let head=0,tail=1;queue[0]=p;labels[p]=id;let touchesEdge=0;
  while(head<tail){
   const i=queue[head++], x=i%width;
   if(x===0||x===width-1||i<width||i>=n-width)touchesEdge=1;
   if(x>0&&!blocked[i-1]&&!labels[i-1]){labels[i-1]=id;queue[tail++]=i-1;}
   if(x<width-1&&!blocked[i+1]&&!labels[i+1]){labels[i+1]=id;queue[tail++]=i+1;}
   if(i>=width&&!blocked[i-width]&&!labels[i-width]){labels[i-width]=id;queue[tail++]=i-width;}
   if(i<n-width&&!blocked[i+width]&&!labels[i+width]){labels[i+width]=id;queue[tail++]=i+width;}
  }
  areas[id]=tail;edge[id]=touchesEdge;
 }
 // Restore antialiased edge pixels to a neighbouring region. Never bridge ink.
 const extended=labels.slice();
 // Reclaim the white rim around each area without assigning ink to paint.
 // Propagate labels into gap-protection pixels from existing area borders.
 let head=0,tail=0;
 for(let i=0;i<n;i++)if(labels[i]){
  const x=i%width;
  if((x>0&&!labels[i-1]&&!ink[i-1])||(x<width-1&&!labels[i+1]&&!ink[i+1])||(i>=width&&!labels[i-width]&&!ink[i-width])||(i<n-width&&!labels[i+width]&&!ink[i+width]))queue[tail++]=i;
 }
 while(head<tail){
  const i=queue[head++],x=i%width,id=extended[i];
  const assign=j=>{if(!ink[j]&&!extended[j]){extended[j]=id;queue[tail++]=j;areas[id]++;}};
  if(x>0)assign(i-1);if(x<width-1)assign(i+1);if(i>=width)assign(i-width);if(i<n-width)assign(i+width);
 }
 return {labels:extended,count,areas:Uint32Array.from(areas),edge:Uint8Array.from(edge)};
}

export function isBackgroundArea(id,areas,edge,pixelCount){return !!id&&(!!edge[id]||areas[id]>pixelCount*.35);}

export function maskPixels(labels,ids){const pixels=new Uint8ClampedArray(labels.length*4);for(let i=0;i<labels.length;i++)if(ids.has(labels[i]))pixels[i*4+3]=255;return pixels;}

export function stabilisePoint(previous,target,smoothing){
 if(!previous)return {...target};
 const follow=1-Math.max(0,Math.min(.8,smoothing));
 return {x:previous.x+(target.x-previous.x)*follow,y:previous.y+(target.y-previous.y)*follow,pressure:target.pressure};
}

export function regionAt(labels,width,height,x,y){
 x=Math.round(x);y=Math.round(y);
 if(x<0||y<0||x>=width||y>=height)return 0;
 const id=labels[y*width+x];if(id)return id;
 // For taps on ink or antialiased borders, choose the geometrically nearest
 // paintable pixel. Scan the whole search window: iteration order must not
 // make a farther neighbouring shape win over a closer one.
 let nearest=0, bestDistance=Infinity;
 for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
  const xx=x+dx,yy=y+dy;
  if(xx<0||yy<0||xx>=width||yy>=height)continue;
  const candidate=labels[yy*width+xx];
  const distance=dx*dx+dy*dy;
  if(candidate&&distance<bestDistance){nearest=candidate;bestDistance=distance;}
 }
 return nearest;
}

export function hexToRgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export function shadeColour(hex,amount){
 const rgb=hexToRgb(hex),t=amount>0?255:0,f=Math.abs(amount)/100;
 return '#'+rgb.map(c=>Math.round(c+(t-c)*f).toString(16).padStart(2,'0')).join('');
}

export function blendPixel(data,i,rgb,opacity){
 const a=data[i+3]/255, out=opacity+a*(1-opacity);
 if(!out)return;
 for(let c=0;c<3;c++)data[i+c]=Math.round((rgb[c]*opacity+data[i+c]*a*(1-opacity))/out);
 data[i+3]=Math.round(out*255);
}

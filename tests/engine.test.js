import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentRegions,regionAt,regionNear,blendPixel,shadeColour,hexToRgb,isBackgroundArea,maskPixels,stabilisePoint} from '../dist/engine.js';
function fixture(gap=false){const w=30,h=24,p=new Uint8ClampedArray(w*h*4).fill(255);const black=(x,y)=>{const i=(y*w+x)*4;p[i]=p[i+1]=p[i+2]=0;};for(let x=3;x<=26;x++){black(x,3);black(x,20);}for(let y=3;y<=20;y++){black(3,y);black(26,y);if(!gap||y!==10)black(15,y);}return {w,h,p};}
test('Enclosed sections have independent labels and an outside area',()=>{const {w,h,p}=fixture();const {labels}=segmentRegions(p,w,h,false);const a=regionAt(labels,w,h,8,10),b=regionAt(labels,w,h,21,10),outside=regionAt(labels,w,h,0,0);assert.ok(a&&b&&outside);assert.notEqual(a,b);assert.notEqual(a,outside);assert.equal(labels[10*w+15],0);});
test('Tiny gap protection stops a one pixel leak',()=>{const {w,h,p}=fixture(true),a=segmentRegions(p,w,h,false),b=segmentRegions(p,w,h,true);assert.equal(regionAt(a.labels,w,h,8,10),regionAt(a.labels,w,h,21,10));assert.notEqual(regionAt(b.labels,w,h,8,10),regionAt(b.labels,w,h,21,10));});
test('Outside coordinates never fill the page',()=>{const {w,h,p}=fixture(),{labels}=segmentRegions(p,w,h);assert.equal(regionAt(labels,w,h,-1,10),0);assert.equal(regionAt(labels,w,h,w,10),0);});
test('Translucent fills retain alpha and blend over earlier colours',()=>{const data=new Uint8ClampedArray(4);blendPixel(data,0,[200,50,0],.5);assert.deepEqual([...data],[200,50,0,128]);blendPixel(data,0,[0,50,200],.5);assert.equal(data[3],192);assert.ok(data[0]>=66&&data[0]<=67);assert.ok(data[2]>=133&&data[2]<=134);});
test('Shade control produces valid bounded colours',()=>{assert.deepEqual(hexToRgb('#638765'),[99,135,101]);assert.equal(shadeColour('#638765',0),'#638765');assert.equal(shadeColour('#000000',100),'#ffffff');assert.equal(shadeColour('#ffffff',-100),'#000000');});
test('Faint scanned outlines contain colour in separate shapes',()=>{const {w,h,p}=fixture();for(let i=0;i<p.length;i+=4)if(p[i]===0)p[i]=p[i+1]=p[i+2]=228;const result=segmentRegions(p,w,h,true);assert.notEqual(regionAt(result.labels,w,h,8,10),regionAt(result.labels,w,h,21,10));});
test('Standard gap protection closes a three pixel break',()=>{const {w,h,p}=fixture();for(const y of [9,10,11]){const i=(y*w+15)*4;p[i]=p[i+1]=p[i+2]=255;}const fine=segmentRegions(p,w,h,true,1),standard=segmentRegions(p,w,h,true,2);assert.equal(regionAt(fine.labels,w,h,8,10),regionAt(fine.labels,w,h,21,10));assert.notEqual(regionAt(standard.labels,w,h,8,10),regionAt(standard.labels,w,h,21,10));});
test('A brush footprint crossing the wall cannot paint the adjacent shape or ink',()=>{const {w,h,p}=fixture(),result=segmentRegions(p,w,h,true),id=regionAt(result.labels,w,h,8,10),mask=maskPixels(result.labels,new Set([id]));let painted=0;for(let y=5;y<19;y++)for(let x=5;x<25;x++){const i=y*w+x;if(mask[i*4+3]){assert.ok(x<15,'stroke escaped into the neighbouring shape');assert.notEqual(p[i*4],0,'stroke painted over ink');painted++;}}assert.ok(painted>50);});
test('Selection masks support multiple independent shapes without selecting the background',()=>{const {w,h,p}=fixture(),r=segmentRegions(p,w,h,true),a=regionAt(r.labels,w,h,8,10),b=regionAt(r.labels,w,h,21,10),mask=maskPixels(r.labels,new Set([a,b]));assert.equal(mask[(10*w+8)*4+3],255);assert.equal(mask[(10*w+21)*4+3],255);assert.equal(mask[3],0);});
test('Background protection distinguishes page-edge areas from bounded shapes',()=>{const {w,h,p}=fixture(),r=segmentRegions(p,w,h,true),a=regionAt(r.labels,w,h,8,10),outside=regionAt(r.labels,w,h,0,0);assert.equal(isBackgroundArea(a,r.areas,r.edge,w*h),false);assert.equal(isBackgroundArea(outside,r.areas,r.edge,w*h),true);assert.equal([...r.areas].reduce((a,b)=>a+b,0),[...r.labels].filter(Boolean).length);});
test('Smoothing reduces jitter while preserving the latest stylus pressure',()=>{const previous={x:10,y:10,pressure:.3},target={x:20,y:0,pressure:.8},result=stabilisePoint(previous,target,.5);assert.deepEqual(result,{x:15,y:5,pressure:.8});assert.deepEqual(stabilisePoint(previous,target,0),target);assert.deepEqual(stabilisePoint(null,target,.5),target);});

test('Tapping an outline chooses the nearest paintable region, not scan order',()=>{
 const w=13,h=13,labels=new Uint32Array(w*h);
 labels[3*w+3]=1; // farther and earlier in the search order
 labels[6*w+7]=2; // one pixel away from the tapped outline
 assert.equal(regionAt(labels,w,h,6,6),2);
 assert.equal(regionAt(labels,w,h,7,6),2);
 assert.equal(regionAt(labels,w,h,12,12),0); // farther than the four-pixel lookup radius
});

test('A stroke that begins on an outline reaches the nearest shape within its wider radius',()=>{
 const w=44,h=40,labels=new Uint32Array(w*h);
 for(let y=10;y<30;y++)for(let x=10;x<18;x++)labels[y*w+x]=1; // shape 1, right edge at x=17
 for(let y=10;y<30;y++)for(let x=28;x<38;x++)labels[y*w+x]=2; // shape 2, left edge at x=28
 // A thick outline fills x=18..27. At x=22 shape 1 is five pixels away and shape 2 six.
 assert.equal(regionAt(labels,w,h,22,20),0,'a tap reaches four pixels, so it finds nothing');
 assert.equal(regionNear(labels,w,h,22,20,4),0,'radius 4 is the tap reach');
 assert.equal(regionNear(labels,w,h,22,20,6),1,'radius 6 finds both and the nearer one, shape 1, wins');
 assert.equal(regionNear(labels,w,h,25,20,6),2,'at x=25 shape 2 is three pixels away and shape 1 eight');
 assert.equal(regionNear(labels,w,h,15,20,1),1,'a point already inside a shape is that shape, whatever the radius');
 assert.equal(regionNear(labels,w,h,-1,20,24),0);assert.equal(regionNear(labels,w,h,w,20,24),0);
});
test('regionAt keeps its four pixel reach',()=>{
 const w=20,h=20,labels=new Uint32Array(w*h);labels[10*w+14]=7;
 assert.equal(regionAt(labels,w,h,10,10),7);assert.equal(regionAt(labels,w,h,9,10),0);
});

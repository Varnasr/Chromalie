import {segmentRegions} from './engine.js';
self.onmessage=({data})=>{
 try{
  const result=segmentRegions(new Uint8ClampedArray(data.pixels),data.width,data.height,data.closeGaps,data.gapRadius);
  self.postMessage({labels:result.labels.buffer,count:result.count,areas:result.areas.buffer,edge:result.edge.buffer},[result.labels.buffer,result.areas.buffer,result.edge.buffer]);
 }catch(error){self.postMessage({error:error.message});}
};

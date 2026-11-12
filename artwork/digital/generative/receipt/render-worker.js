import {scene} from './scene.js?edition=28';
import {unpackSurface} from './render-data.js?edition=27';

let canvas,paint,layout,ink=[];
const surface=[],rows=[];

async function handle(data){
    if(data.type==='init'){
        canvas=new OffscreenCanvas(1,1);
        paint=await scene(canvas,data.slotScale);
        postMessage({type:'ready'});
        return;
    }
    layout=data.layout??layout;
    ink=data.ink??ink;
    const count=data.points.length/9;
    rows.length=Math.min(rows.length,count);
    for(let i=rows.length;i<count;i++)rows.push({at:i*data.spacing});

    paint({layout,rows,head:data.head,width:data.width,band:data.band},ink,
        unpackSurface(data.points,surface),data.viewport);
    const bitmap=canvas.transferToImageBitmap();
    postMessage({type:'frame',bitmap,generation:data.generation},[bitmap]);
}

self.onmessage=({data})=>{
    handle(data).catch(()=>postMessage({type:'error'}));
};

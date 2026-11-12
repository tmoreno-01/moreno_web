import {canvas,paintSpine,paintWood,paintCover,paintBack,paintPaper,bookColor} from './paint.js?146';
import {BOOK_TILE_W,BOOK_TILE_H,ATLAS_COLS,ATLAS_ROWS,BOOK_COUNT,WOOD_TILE_W,WOOD_TILE_H,WOOD_COLS,WOOD_ROWS,WOOD_VARIANTS} from './geometry.js?142';
import {makeCatalogue} from './catalogue.js?146';

function sheet(tileWidth,tileHeight,cols,rows){
  const image=canvas(tileWidth*cols,tileHeight*rows);
  const ctx=image.getContext('2d',{alpha:false});
  const tile=canvas(tileWidth,tileHeight);
  const brush=tile.getContext('2d',{alpha:false});
  return {
    image,tileWidth,tileHeight,cols,rows,
    paint(index,draw){
      draw(brush,tileWidth,tileHeight);
      ctx.drawImage(tile,(index%cols)*tileWidth,Math.floor(index/cols)*tileHeight);
    },
  };
}

function* paintAtlas(seed,works,draft){
  const catalogue=makeCatalogue(seed,works);
  const books=sheet(draft?72:BOOK_TILE_W,draft?88:BOOK_TILE_H,ATLAS_COLS,ATLAS_ROWS);
  const width=draft?80:WOOD_TILE_W,height=draft?48:WOOD_TILE_H;
  const timber=canvas(width,height).getContext('2d',{alpha:false,willReadFrequently:true});
  const layerSize=width*height*4;
  const pixels=new Uint8Array(layerSize*WOOD_VARIANTS);
  for(let i=0;i<BOOK_COUNT;i++){
    books.paint(i*4,(ctx,w,h)=>paintCover(ctx,w,h,i,catalogue[i],draft));
    books.paint(i*4+1,(ctx,w,h)=>paintSpine(ctx,w,h,i,catalogue[i],draft));
    books.paint(i*4+3,(ctx,w,h)=>paintBack(ctx,w,h,i,draft));
    books.paint(i*4+2,(ctx,w,h)=>{
      paintPaper(ctx,w,h,i,true,draft);
      const rim=Math.round(w*.059);
      ctx.fillStyle=bookColor(i);
      ctx.fillRect(0,0,rim,h);
      ctx.fillRect(w-rim,0,rim,h);
      ctx.fillStyle='#f6ddab66';
      ctx.fillRect(rim,0,1,h);
      ctx.fillRect(w-rim-1,0,1,h);
    });
    yield;
  }
  for(let i=0;i<WOOD_VARIANTS;i++){
    paintWood(timber,width,height,i,draft);
    pixels.set(timber.getImageData(0,0,width,height).data,i*layerSize);
    yield;
  }
  return {books:books.image,wood:{width,height,pixels}};
}

export function makeAtlas(seed,works,draft=false){
  const tiles=paintAtlas(seed,works,draft);
  let next=tiles.next();
  while(!next.done)next=tiles.next();
  return next.value;
}

export function makeAtlasInSlices(seed,works){
  const tiles=paintAtlas(seed,works,false);
  return new Promise(resolve=>{
    function paint(){
      const start=performance.now();
      do{
        const next=tiles.next();
        if(next.done){resolve(next.value);return;}
      }while(performance.now()-start<7);
      schedule();
    }
    function schedule(){
      if(typeof requestIdleCallback==='function')requestIdleCallback(paint,{timeout:100});
      else setTimeout(paint,16);
    }
    schedule();
  });
}

function levels(image,cols,rows){
  return [1,2,4,8].map(scale=>{
    const tileWidth=image.width/(cols*scale),tileHeight=image.height/(rows*scale);
    const c=scale===1&&image.getContext?image:canvas(tileWidth*cols,tileHeight*rows);
    const ctx=c.getContext('2d',{alpha:false});
    if(c!==image){
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(image,0,0,c.width,c.height);
    }
    const pixels=new Uint32Array(ctx.getImageData(0,0,c.width,c.height).data.buffer);
    return {pixels,tileWidth,tileHeight,width:c.width,cols};
  });
}
export function softwareTextures(atlas){
  // The software renderer uses a sheet with the same tile numbering as
  // the GPU layers. Build it only when the software renderer is active.
  const {width,height,pixels}=atlas.wood;
  const wood=canvas(width*WOOD_COLS,height*WOOD_ROWS);
  const ctx=wood.getContext('2d',{alpha:false});
  const tile=ctx.createImageData(width,height),layerSize=tile.data.length;
  for(let i=0;i<WOOD_VARIANTS;i++){
    tile.data.set(pixels.subarray(i*layerSize,(i+1)*layerSize));
    ctx.putImageData(tile,(i%WOOD_COLS)*width,Math.floor(i/WOOD_COLS)*height);
  }
  return {books:levels(atlas.books,ATLAS_COLS,ATLAS_ROWS),wood:levels(wood,WOOD_COLS,WOOD_ROWS)};
}

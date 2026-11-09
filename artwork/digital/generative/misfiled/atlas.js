import {canvas,paintSpine,paintWood,paintCover,paintBack,paintPaper,bookColor} from './paint.js?141';
import {BOOK_TILE_W,BOOK_TILE_H,ATLAS_COLS,ATLAS_ROWS,BOOK_COUNT,WOOD_TILE_W,WOOD_TILE_H,WOOD_COLS,WOOD_ROWS,WOOD_VARIANTS} from './geometry.js?141';
import {makeCatalogue} from './catalogue.js?141';

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

export function makeAtlas(seed,works){
  const catalogue=makeCatalogue(seed,works);
  const books=sheet(BOOK_TILE_W,BOOK_TILE_H,ATLAS_COLS,ATLAS_ROWS);
  const wood=sheet(WOOD_TILE_W,WOOD_TILE_H,WOOD_COLS,WOOD_ROWS);
  for(let i=0;i<BOOK_COUNT;i++){
    books.paint(i*4,(ctx,w,h)=>paintCover(ctx,w,h,i,catalogue[i]));
    books.paint(i*4+1,(ctx,w,h)=>paintSpine(ctx,w,h,i,catalogue[i]));
    books.paint(i*4+3,(ctx,w,h)=>paintBack(ctx,w,h,i));
    books.paint(i*4+2,(ctx,w,h)=>{
      paintPaper(ctx,w,h,i,true);
      const rim=Math.round(w*.059);
      ctx.fillStyle=bookColor(i);
      ctx.fillRect(0,0,rim,h);
      ctx.fillRect(w-rim,0,rim,h);
      ctx.fillStyle='#f6ddab66';
      ctx.fillRect(rim,0,1,h);
      ctx.fillRect(w-rim-1,0,1,h);
    });
  }
  for(let i=0;i<WOOD_VARIANTS;i++)wood.paint(i,(ctx,w,h)=>paintWood(ctx,w,h,i));
  // Drop the scratch tiles and keep only the two painted sheets.
  return {books:books.image,wood:wood.image};
}

function levels(image,cols,rows){
  return [1,2,4,8].map(scale=>{
    const tileWidth=image.width/(cols*scale),tileHeight=image.height/(rows*scale);
    const c=scale===1?image:canvas(tileWidth*cols,tileHeight*rows);
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
  return {books:levels(atlas.books,ATLAS_COLS,ATLAS_ROWS),wood:levels(atlas.wood,WOOD_COLS,WOOD_ROWS)};
}

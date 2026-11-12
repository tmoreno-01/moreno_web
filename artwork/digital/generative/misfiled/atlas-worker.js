import {makeAtlas} from './atlas.js?147';

self.onmessage=({data:{seed,titles}})=>{
  const atlas=makeAtlas(seed,titles);
  const books=atlas.books.transferToImageBitmap();
  const {wood}=atlas;
  postMessage({books,wood},[books,wood.pixels.buffer]);
};

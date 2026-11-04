import {ErrataWorld} from './world.js?edition=84';
import {renderErrata} from './render.js?edition=84';
let world,canvas,ctx,serial=0;
onmessage=e=>{const m=e.data;try{
 if(m.type==='init'){canvas=m.canvas;world=new ErrataWorld(m.seed);ctx=canvas.getContext('2d',{alpha:false});postMessage({type:'ready'});}
 else if(m.type==='news'){world.setNews(m.words,m.date);}
 else if(m.type==='restore'){world.restore(m.state);serial=0;}
 else if(m.type==='frame'){let start=performance.now();world.advance(m.dt);if(canvas.width!==m.size)canvas.width=canvas.height=m.size;renderErrata(ctx,m.size,world,m.quality);
  const meta={time:world.time,frames:world.frames,accumulator:world.accumulator,events:world.events,notes:world.notes.length,written:world.written,crossed:world.crossed,erased:world.erased};
  postMessage({type:'frame',ms:performance.now()-start,meta,state:serial++%15===0?world:null});
 }
}catch(error){postMessage({type:'error',message:error.message});}};

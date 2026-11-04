import {BiotaWorld} from './world.js?edition=87';
import {createRenderer} from './render.js?edition=87';
let canvas,world,render,serial=0;
onmessage=e=>{const m=e.data;try{
 if(m.type==='init'){canvas=m.canvas;world=new BiotaWorld(m.kind,m.seed,m.grid);if(m.state)world.restore(m.state);else world.warm(500);render=createRenderer(canvas,world);postMessage({type:'ready',state:world.snapshot()});}
 else if(m.type==='restore'){world.restore(m.state);}
 else if(m.type==='frame'){const start=performance.now();world.advance(m.dt,m.steps);const simMs=performance.now()-start;if(canvas.width!==m.size)canvas.width=canvas.height=m.size;render(m.size,m.quality);postMessage({type:'frame',ms:performance.now()-start,simMs,paintMs:performance.now()-start-simMs,time:world.time,tick:world.tick,events:world.events,state:serial++%75===0?world.snapshot():null});}
 }catch(error){postMessage({type:'error',message:error.message});}};

import {LibraryWorld,VERSION} from './world.js?142';
import {readGallery} from './catalogue.js?146';
import {Scenery} from './scenery.js?147';
import {createActivityLoop} from '../activity.js?145';
import {createLoader} from '../assemblage/loader.js?edition=124';

const q=new URLSearchParams(location.search), still=q.has('still');
const seed=q.has('seed') ? Number(q.get('seed'))>>>0 : crypto.getRandomValues(new Uint32Array(1))[0];
document.title='Misfiled — Tyrone Moreno';
const loader=createLoader();
document.body.append(loader);
await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const titles=await readGallery();
const world=new LibraryWorld(seed);
world.prime();
const scene=new Scenery(world,titles);
scene.draw(false); loader.remove();
requestAnimationFrame(()=>scene.refineMaterials());
const loop=createActivityLoop({fps:60,update:dt=>{if(!still)world.step(dt);},draw:()=>{if(!still)scene.draw();}});
window.livingArtwork={
  get backend(){return scene.renderer;},
  snapshot:()=>({...world.snapshot(),galleryTitles:scene.galleryTitles}),
  restore:state=>{
    if(!world.restore(state))return;
    scene.reset(state.galleryTitles);scene.draw(false);
  },
  stats:()=>({edition:VERSION,seed:world.seed,frames:scene.frames,time:world.time,travel:world.travel,
    launched:world.events,exchanges:world.exchangeCount,inFlight:world.inFlight,bays:scene.rooms.size,active:loop.running&&!still}),
};
document.querySelector('#error')?.style.setProperty('display','none');
addEventListener('resize',()=>{scene.resize();scene.draw(false);});
addEventListener('keydown',e=>{if(e.key==='Escape'&&parent!==window)parent.postMessage({type:'living-close'},location.origin);});
if(parent!==window)parent.postMessage({type:'living-ready'},location.origin);

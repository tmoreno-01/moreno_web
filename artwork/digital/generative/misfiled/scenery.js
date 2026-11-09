import {BAY,AHEAD} from './world.js?141';
import {canvas} from './paint.js?141';
import {makeAtlas,softwareTextures} from './atlas.js?141';
import {STRIDE,furniture,horizon,putFurniture,putSeated,putFlying} from './geometry.js?141';
import {Accelerator} from './accelerator.js?141';
import {Lighting} from './lighting.js?141';
import {SoftwareProjector} from './projection.js?141';

const css=document.createElement('style');
css.textContent=`html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#171211}.misfiled-view{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}`;
document.head.append(css);

export class Scenery {
  constructor(world,titles){
    this.sim=world;
    this.materialSeed=world.seed;
    this.galleryTitles=titles;
    this.atlas=makeAtlas(world.seed,titles);
    this.root=canvas(1,1);
    this.useHardware=false;
    this.renderer='canvas-depth';
    this.quality=1;
    this.frames=0;
    this.cost=0;
    this.rooms=new Map();
    this.lighting=new Lighting();
    // At most 17 bays, with no more than 700 pieces of furniture and books per bay.
    this.instances=new Float32Array((AHEAD+2)*700*STRIDE);
    try{
      if(!new URLSearchParams(location.search).has('software')){
        this.backend=new Accelerator(this.root,this.atlas);
        this.useHardware=true;
        this.renderer='webgl2-depth';
      }
    }catch{
      this.root=canvas(1,1);
    }
    this.decorate();
    if(this.useHardware){
      this.root.addEventListener('webglcontextlost',event=>{
        event.preventDefault();
        const old=this.root;
        this.root=canvas(1,1);
        this.decorate();
        old.replaceWith(this.root);
        this.useHardware=false;
        this.renderer='canvas-depth';
        this.useSoftware();
        this.draw(false);
      },{once:true});
    }else this.useSoftware();
    document.body.prepend(this.root);
    this.resize();
  }

  decorate(){
    this.root.className='misfiled-view';
    this.root.setAttribute('role','img');
    this.root.setAttribute('aria-label','Misfiled. A tunnel of deep timber shelves with books drifting across the aisle and trading places.');
  }

  useSoftware(){
    this.backend=new SoftwareProjector(this.root,softwareTextures(this.atlas));
    this.atlas=null;
    this.resize();
  }

  resize(){
    const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
    const limit=this.useHardware?2100:1080;
    const ratio=Math.min(devicePixelRatio||1,this.useHardware?1.6:1,limit/w,(limit*.76)/h)*this.quality;
    this.root.width=Math.max(1,Math.round(w*ratio));
    this.root.height=Math.max(1,Math.round(h*ratio));
    this.focal=this.root.height*.94;
  }

  reset(titles=this.galleryTitles){
    if(this.materialSeed!==this.sim.seed||titles.join('\n')!==this.galleryTitles.join('\n')){
      this.galleryTitles=titles;
      this.materialSeed=this.sim.seed;
      this.atlas=makeAtlas(this.materialSeed,this.galleryTitles);
      if(this.useHardware)this.backend.uploadAtlas(this.atlas);
      else{
        this.backend.textures=softwareTextures(this.atlas);
        this.atlas=null;
      }
    }
    this.rooms.clear();
    this.at=undefined;
    this.lighting.index=NaN;
  }

  sync(){
    const at=Math.floor(this.sim.travel/BAY);
    if(at===this.at)return;
    this.at=at;
    for(const i of this.rooms.keys())if(i<at||i>at+AHEAD)this.rooms.delete(i);
    for(let i=at;i<=at+AHEAD;i++){
      const bay=this.sim.bays.get(i);
      if(bay&&!this.rooms.has(i))this.rooms.set(i,furniture(bay));
    }
    this.tail=horizon(at*BAY);
  }

  draw(advance=true){
    const start=performance.now(),world=this.sim;
    if(this.needsResize){
      this.needsResize=false;
      this.resize();
    }
    this.sync();
    const base=this.at*BAY,data=this.instances;
    // Front objects fill the depth buffer first, cutting software overdraw.
    let size=putFlying(data,0,world,base);
    const visibleFlights=size/STRIDE;
    for(const [i,boxes] of this.rooms){
      size=putSeated(data,size,world.bays.get(i),base,world.travel);
      size=putFurniture(data,size,boxes,base,world.travel);
    }
    size=putFurniture(data,size,this.tail,base,world.travel);
    const staticChanged=this.lighting.prepare(data,size,visibleFlights*STRIDE,this.at,world.departures+world.exchangeCount);
    this.backend.draw(data,size,this.root.width,this.root.height,this.focal,world.travel-base,this.lighting,staticChanged);
    const elapsed=performance.now()-start;
    this.cost=this.frames?this.cost*.95+elapsed*.05:elapsed;
    if(this.frames++%12===0){
      Object.assign(this.root.dataset,{
        renderer:this.renderer,frames:String(this.frames),time:world.time.toFixed(3),
        galleryTitles:String(this.galleryTitles.length),
        swaps:String(world.exchangeCount),flying:String(visibleFlights),
        activeBooks:String(world.inFlight),objects:String(size/STRIDE),drawMs:this.cost.toFixed(1),
      });
    }
    if(advance&&!this.useHardware&&this.frames%36===0&&this.cost>27&&this.quality>.78){
      this.quality=Math.max(.78,this.quality-.08);
      this.needsResize=true;
    }
  }
}

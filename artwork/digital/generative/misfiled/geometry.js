import {BAY,R,WIDTH,BACK,anchor,pose,clamp,BOOK_COUNT,bookFormat,hash,random} from './world.js?142';
import {axes,motionProgress} from './rigid.js?142';
export {BOOK_COUNT};

export const NEAR=.24, FAR=174;
export const BOOK_TILE_W=144, BOOK_TILE_H=176, ATLAS_COLS=28;
export const WOOD=BOOK_COUNT*4;
export const ATLAS_ROWS=Math.ceil(WOOD/ATLAS_COLS);
export const WOOD_TILE_W=320, WOOD_TILE_H=192, WOOD_COLS=8, WOOD_SPECIES=8, WOOD_CUTS=9, WOOD_VARIANTS=WOOD_SPECIES*WOOD_CUTS;
export const WOOD_ROWS=Math.ceil(WOOD_VARIANTS/WOOD_COLS);
export const STRIDE=16;
export const faces=[
  [0,-1,2,1], [0,1,2,1],
  [1,-1,0,2], [1,1,0,2],
  [2,-1,0,1], [2,1,0,1],
];

export function tileIndex(material,face){
  if(material>=BOOK_COUNT)return WOOD+material-BOOK_COUNT;
  return material*4+(face===0?0:face===1?3:face===4?1:2);
}

// The three columns are the local book axes, scaled only by their fixed dimensions.
export function putBox(data,i,p,w,h,d,material,light,grainDirection=0){
  const a=Math.cos(p.angle), b=Math.sin(p.angle);
  if(!p.yaw&&!p.pitch){
    const c=p.roll?Math.cos(p.roll):1,s=p.roll?Math.sin(p.roll):0;
    data[i]=-b*s*w/2;data[i+1]=a*s*w/2;data[i+2]=c*w/2;data[i+3]=p.x;
    data[i+4]=-b*c*h/2;data[i+5]=a*c*h/2;data[i+6]=-s*h/2;data[i+7]=p.y;
    data[i+8]=a*d/2;data[i+9]=b*d/2;data[i+10]=0;data[i+11]=p.s;
    data[i+12]=material;data[i+13]=light;data[i+14]=grainDirection;data[i+15]=0;
    return;
  }
  const basis=axes(p), sizes=[w/2,h/2,d/2];
  for(let axis=0;axis<3;axis++)for(let j=0;j<3;j++)data[i+axis*4+j]=basis[axis][j]*sizes[axis];
  data[i+3]=p.x;data[i+7]=p.y;data[i+11]=p.s;
  data[i+12]=material;data[i+13]=light;data[i+14]=grainDirection;data[i+15]=0;
}
function panel(s,u,r,side){
  const angle=side*Math.PI/2;
  return {x:Math.cos(angle)*r-Math.sin(angle)*u,y:Math.sin(angle)*r+Math.cos(angle)*u,s,angle};
}
function box(p,w,h,d,material,light,grain=0){return {p,w,h,d,material,light,grain};}
const sideLight=[1.06,.94,1.01,.87];
// A room has successive pools of light, with darker joins between the bays.
function bayLight(bay){
  return .81+.31*bay.light**2*(.33+.67*bay.mood)+.12*(bay.index%4===0);
}

function seatedGain(bay,side){return sideLight[side]*bayLight(bay)*.87;}

export const LAMP_Y=-R+.17;
export function fixture(index){
  const r=random(hash(0x8c73,index));
  // Concealed at the upper shoulder of a bay, just beyond its crosspiece.
  const side=(index+Math.floor(index/5))%2===0?-1:1;
  const x=side*(1.35+r.next()*.20);
  const s=index*BAY+.19+r.next()*.06;
  // A slow rhythm of lit and shaded passages, fixed in tunnel coordinates.
  const position=(index+.35)/2.4+.22*Math.sin(index*.21);
  const section=Math.floor(position), t=position-section;
  const strength=n=>(n%2===0?.79:.14)+random(hash(0x6472,n)).next()*.18;
  const mood=strength(section)+(strength(section+1)-strength(section))*t*t*(3-2*t);
  const energy=(1.01+2.64*mood)*(.93+.14*r.next());
  return {x,s,energy,mood};
}

export function furniture(bay){
  const boxes=[];
  const finish=Math.floor(bay.mood*WOOD_SPECIES);
  const origin=bay.index*BAY;
  const timber=random(hash(bay.index,Math.round(bay.mood*0xffffffff)));
  const board=(finishOffset=0)=>{
    const variance=timber.next()<.23?Math.floor(timber.next()*3)-1:0;
    const species=(finish+finishOffset+variance+WOOD_SPECIES)%WOOD_SPECIES;
    return BOOK_COUNT+species+WOOD_SPECIES*Math.floor(timber.next()*WOOD_CUTS);
  };
  for(const wall of bay.walls){
    const {side,rows,cols}=wall;
    const light=sideLight[side]*bayLight(bay);
    const ledge=.119+(bay.mood>.8?.026:0);
    const depth=BACK-R;
    // Each cell gets a separate recessed back with contact shadow at its edges.
    for(let j=0;j<rows.length-1;j++)for(let k=0;k<cols.length-1;k++){
      boxes.push(box(panel(origin+(cols[k]+cols[k+1])/2,(rows[j]+rows[j+1])/2-WIDTH/2,BACK,side),
        cols[k+1]-cols[k]+.03,rows[j+1]-rows[j]+.03,.071,board(1),light*.68,2));
    }
    for(let j=0;j<rows.length;j++){
      const y=rows[j]-WIDTH/2;
      boxes.push(box(panel(origin+BAY/2,y,R+depth/2,side),BAY+.016,ledge,depth+.031,board(),light*.98));
      // A thin rounded-looking lip with lighter end grain at the face.
      boxes.push(box(panel(origin+BAY/2,y+.012,R-.033,side),BAY+.018,ledge*.74,.081,board(2),light*1.02));
    }
    for(let k=0;k<cols.length;k++){
      const end=k===0||k===cols.length-1;
      const thickness=end?.17:.138;
      boxes.push(box(panel(origin+cols[k],0,R+depth/2,side),thickness,WIDTH+.04,depth+.04,board(),light*.92,1));
      if(k===0)boxes.push(box(panel(origin-.026,0,R-.04,side),.155,WIDTH+.11,.16,board(),light*1.05,1));
    }
    for(const stack of wall.stacks){
      const depth=bookFormat(stack.design).d;
      const p=panel(origin+stack.x+stack.w/2,stack.y+stack.h/2-WIDTH/2,Math.min(stack.front,BACK-depth-.044)+depth/2,side);
      p.roll=Math.PI/2;
      boxes.push(box(p,stack.h,stack.w,depth,stack.design,light*.83));
    }
  }
  return boxes;
}

// Stationary objects use the same basis until a book changes slots.
const furnitureBases=new WeakMap(), seatedBases=new WeakMap();

export function putFurniture(data,i,boxes,base,travel){
  for(const b of boxes){
    // The long frame boards can cross the near clip plane.
    if(b.p.s+Math.max(b.w,b.d)/2<travel+NEAR)continue;
    let basis=furnitureBases.get(b);
    if(!basis){
      basis=new Float32Array(STRIDE);
      putBox(basis,0,b.p,b.w,b.h,b.d,b.material,b.light,b.grain);
      furnitureBases.set(b,basis);
    }
    data.set(basis,i);
    data[i+11]-=base;
    i+=STRIDE;
  }
  return i;
}

export function putSeated(data,i,bay,base,travel){
  for(const wall of bay.walls){
    const light=seatedGain(bay,wall.side);
    for(const slot of wall.slots){
      const book=slot.book;
      if(!book||bay.index*BAY+slot.x<travel+1.65)continue;
      let cached=seatedBases.get(slot);
      if(cached?.book!==book){
        const basis=new Float32Array(STRIDE);
        putBox(basis,0,anchor(slot,book),book.w,book.h,book.d,book.design,light);
        cached={book,basis};
        seatedBases.set(slot,cached);
      }
      data.set(cached.basis,i);
      data[i+11]-=base;
      // Past the near cubbies, the front spine still reads at this scale.
      if(bay.index*BAY+slot.x>travel+24)data[i+15]=1;
      i+=STRIDE;
    }
  }
  return i;
}

export function putFlying(data,i,world,base){
  for(const flight of world.flights){
    for(const path of flight.paths){
      if(!path.departed)continue;
      const progress=clamp(motionProgress(path,flight,world.time));
      const p=pose(path,progress);
      if(p.s<world.travel+NEAR-.9)continue;
      const book=path.book;
      let light=.97+book.ink*.12;
      if(progress<path.pull||progress>path.dock){
        const leaving=progress<path.pull;
        const slot=world.find(leaving?path.from:path.to);
        const t=leaving?progress/path.pull:(1-progress)/(1-path.dock);
        const weight=t*t*(3-2*t);
        const rest=seatedGain(world.bays.get(slot.bay),slot.side);
        light=rest+(light-rest)*weight;
      }
      putBox(data,i,p,book.w,book.h,book.d,book.design,light);
      data[i+11]-=base;
      data[i+15]=2;
      i+=STRIDE;
    }
  }
  return i;
}

export function horizon(base){
  const boxes=[];
  const length=FAR-7, farStart=base+53;
  for(let side=0;side<4;side++){
    boxes.push(box(panel(farStart+length/2,0,BACK,side),length,2*BACK+.2,.12,BOOK_COUNT+7,.36,2));
    for(let n=0;n<24;n++){
      const z=farStart+n*4.75;
      boxes.push(box(panel(z,0,R,side),.24,WIDTH+.16,.24,BOOK_COUNT+(n*11%WOOD_VARIANTS),.63,1));
    }
  }
  boxes.push(box({x:0,y:0,s:base+FAR-3,angle:0},.15,2*BACK,2*BACK,BOOK_COUNT+7,.26));
  return boxes;
}

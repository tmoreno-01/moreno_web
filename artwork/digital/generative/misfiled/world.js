import {motionBounds,minimumFlightTime,motionProgress,clearPair,clearAisle} from './rigid.js?141';

// Local coordinates: u runs across one wall, s goes down the tunnel, r is out.
export const BAY = 4.56, R = 2.48, WIDTH = 2 * R;
export const FRONT = R + .12, BACK = R + .97;
export const SIDES = 4, AHEAD = 15, SPEED = 1.05, VERSION = 141;
const WIDTHS = [.105, .146, .202, .267, .325];
export const EDITIONS_PER_TIER=32, BOOK_COUNT=WIDTHS.length*EDITIONS_PER_TIER;
const MAX_HEIGHT=1.19;
export function bookFormat(design){
  const tier=Math.floor(design/EDITIONS_PER_TIER);
  const r=random(hash(1904,design));
  const h=.87+r.next()*.32;
  const d=Math.max(h*.59,.56+.32*r.next()**1.65);
  return {w:WIDTHS[tier]+.010-r.next()*.017,h,d};
}
const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a,b,t) => a+(b-a)*t;
export function hash(a,b) {
  let n = Math.imul(a ^ Math.imul(b, 0x9e3779b9), 0x85ebca6b);
  n = Math.imul(n ^ n >>> 16, 0xc2b2ae35);
  return (n ^ n >>> 15) >>> 0;
}
export function random(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let n = Math.imul(state ^ state >>> 15, 1 | state);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    },
    get state() { return state; },
  };
}
const pick = (r, xs) => xs[Math.floor(r.next()*xs.length)];
const split = (n,span,r,jitter=.46) => Array.from({length:n+1},(_,i) => i===0 ? 0 : i===n ? span : span*i/n + (r.next()-.5)*jitter);
export function makeBay(seed,index) {
  const r = random(hash(seed,index));
  const mood = r.next(), light = .86 + r.next()*.14;
  return { index, mood, light, walls: Array.from({length:SIDES},(_,side)=>{
    const cols = split(r.next() < .64 ? 3 : 2, BAY, r);
    const rows = split(3, WIDTH, r, .20);
    const slots = [], stacks = [], cells = [];
    for(let j=0;j<rows.length-1;j++) for(let i=0;i<cols.length-1;i++) {
      const left = cols[i]+.09, right = cols[i+1]-.09;
      const placement=random(hash(hash(seed,index),1000+side*37+j*7+i));
      const ledge=(mood>.8?.145:.119)/2+.003;
      const top=rows[j]+ledge,base=rows[j+1]-ledge;
      const topMounted=placement.next()<.30;
      const front=R+(placement.next()<.48?.015:.15+placement.next()*.10);
      const cell = {left,right,top,base,topMounted};
      cells.push(cell);
      const chance = r.next();
      if(chance < .085) {
        let y=topMounted?top:base, n=2+Math.floor(r.next()*5);
        while(n--) {
          r.next();r.next();
          const spread=r.next(),design=Math.floor(r.next()*EDITIONS_PER_TIER);
          const format=bookFormat(design);
          const h=format.w,w=Math.min(right-left-.09,format.h);
          const x=left+.045+spread*Math.max(0,right-left-w-.09);
          stacks.push({x,y:topMounted?y:y-h,w,h,front:front+placement.next()*.06,design,ink:r.next()});
          y+=(topMounted?1:-1)*(h+.007);
        }
        continue;
      }
      const first=slots.length;
      let x=left+r.next()*.094;
      const stop=right-(chance>.91 ? .27+r.next()*.3 : r.next()*.085);
      while(x+WIDTHS[0] < stop) {
        const tier=pick(r,[0,0,1,1,1,2,2,3,4]);
        const w=WIDTHS[tier];
        if(x+w>stop) break;
        const id=slots.length;
        // Keep the original packing stream so existing slot IDs can be restored.
        r.next();
        const design=tier*EDITIONS_PER_TIER+Math.floor(r.next()*EDITIONS_PER_TIER);
        const edition=Math.floor(r.next()*10000);
        r.next();
        const book={id:index+'/'+side+'/'+id,design,edition,spineFlip:(edition&1)!==0,...bookFormat(design),ink:r.next(),recessed:r.next()*.047};
        const setback=placement.next()<.22?R-.018:front+(placement.next()-.5)*.14;
        slots.push({bay:index,side,id,tier,x:x+w/2,base,top,topMounted,front:Math.max(R-.018,setback),lean:0,book,flight:false});
        x+=w+.013+r.next()*.022;
      }
      if(slots.length>first&&placement.next()<.70){
        const last=slots.length-1, atStart=placement.next()<.5;
        const edge=slots[atStart?first:last], half=edge.book.w/2;
        const gap=atStart?edge.x-half-left:right-edge.x-half;
        const lean=Math.min(.125,Math.max(0,gap-.009)/MAX_HEIGHT);
        edge.lean=(atStart?1:-1)*lean;
        edge.x+=(atStart?-1:1)*Math.sin(lean)*MAX_HEIGHT/2;
      }
    }
    // Leave real vacancies without changing the packing or slot IDs.
    for(const slot of slots){
      const detail=random(hash(seed,hash(index,side*4096+slot.id)));
      if(detail.next()<.11)slot.book=null;
      slot.bindingFlip=detail.next()<.5;
    }
    const tiers = WIDTHS.map((_, tier) => slots.filter(slot => slot.tier === tier));
    return {side,cols,rows,slots,stacks,cells,tiers,tone:r.next()};
  })};
}
export const slotKey = s => s.bay+'/'+s.side+'/'+s.id;
export function anchor(slot,book) {
  const angle=slot.side*Math.PI/2;
  const lean=slot.lean||0;
  const flipped=book.spineFlip===undefined?slot.topMounted:book.spineFlip!==slot.bindingFlip;
  const roll=(flipped?Math.PI:0)+lean;
  const extent=(Math.cos(lean)*book.h+Math.abs(Math.sin(lean))*book.w)/2;
  const u=(slot.topMounted?slot.top+extent:slot.base-extent)-WIDTH/2;
  const front=clamp(slot.front??FRONT,R-.018,BACK-book.d-.044);
  const r=front+book.d/2;
  return {
    x:Math.cos(angle)*r-Math.sin(angle)*u,
    y:Math.sin(angle)*r+Math.cos(angle)*u,
    s:slot.bay*BAY+slot.x,angle,roll,
  };
}
const ease = t => {
  t=clamp(t);
  return t*t*t*(t*(t*6-15)+10);
};
export const MAX_BOOK_SPEED=5.4;
const signedAngle = a => ((a+3*Math.PI)%TAU)-Math.PI;

export function pose(path,t) {
  const {a,b,clearA,clearB,pull,dock,controlA,controlB}=path;
  if(t<=pull||t>=dock){
    const leaving=t<=pull;
    const end=leaving?a:b, clear=leaving?clearA:clearB;
    const slide=ease(leaving?t/pull:(t-dock)/(1-dock));
    const bias=(leaving?path.pullBias:path.dockBias)??0;
    const travel=slide+bias*slide*(1-slide);
    const f=leaving?travel:1-travel;
    return {x:mix(end.x,clear.x,f),y:mix(end.y,clear.y,f),s:end.s,
      angle:end.angle,pitch:0,yaw:0,roll:end.roll};
  }
  const time=ease((t-pull)/(dock-pull));
  const phase=path.glidePhase??0;
  const pulse=(Math.sin(TAU*time+phase)-Math.sin(phase))/TAU;
  const f=time+(path.pace??0)*time*(1-time)+(path.glide??0)*pulse;
  const m=1-f,arc=Math.sin(Math.PI*f)**2;
  const at=key=>m*m*m*clearA[key]+3*m*m*f*controlA[key]+3*m*f*f*controlB[key]+f*f*f*clearB[key];
  const sway=Math.sin(TAU*f)*arc;
  const drift=path.broadArc?arc:sway;
  const yaw=path.yaw*arc*(path.gesture==='late turn'?2*f:1);
  return {x:at('x')+(path.driftX??0)*drift,y:at('y')+(path.driftY??0)*drift,s:at('s'),angle:a.angle+path.turn*f,
    pitch:path.pitch*arc,yaw,roll:a.roll+path.rollTurn*f+path.bank*arc+(path.trim??0)*sway};
}

function buildPath(from,to,r,style,lane){
  const book=from.book,a=anchor(from,book),b=anchor(to,book);
  const clear=(p,gap)=>{
    const nx=Math.cos(p.angle),ny=Math.sin(p.angle);
    const release=p.x*nx+p.y*ny+book.d/2-R+gap;
    return {x:p.x-nx*release,y:p.y-ny*release,s:p.s};
  };
  const pullGap=.135+.515*r.next(), dockGap=.135+.535*r.next();
  const clearA=clear(a,pullGap),clearB=clear(b,dockGap);
  let turn=signedAngle(b.angle-a.angle),rollTurn=signedAngle(b.roll-a.roll);
  if(Math.abs(turn+Math.PI)<1e-5&&r.next()<.5)turn=Math.PI;
  if(Math.abs(Math.abs(rollTurn)-Math.PI)<.15&&r.next()<.5)rollTurn-=Math.sign(rollTurn)*TAU;
  const angle=r.next()*TAU, bow=(style===2?.78:style===1?.43:.18)*(.70+r.next()*.62);
  const exitAngle=angle+Math.PI/2+(r.next()-.5)*1.25;
  const traction=(style===1?.57:style===0?.22:.40)+(r.next()-.5)*.18;
  const bearing=r.next()*TAU, drift=.07+r.next()**1.45*.55;
  const glide=r.next()<.29?.31+r.next()*.24:r.next()*.23;
  const controlA={x:clearA.x*traction+Math.cos(angle)*bow,y:clearA.y*traction+Math.sin(angle)*bow,s:mix(a.s,b.s,.25)+lane};
  const controlB={x:clearB.x*traction+Math.cos(exitAngle)*bow*.72,y:clearB.y*traction+Math.sin(exitAngle)*bow*.72,s:mix(a.s,b.s,.75)+lane};
  const gesture=pick(r,['glide','lift','sweep','late turn']);
  if(gesture==='lift'){
    controlA.y-=.42+r.next()*.47;
    controlB.y-=.20+r.next()*.32;
  }else if(gesture==='sweep'){
    const dx=clearB.x-clearA.x,dy=clearB.y-clearA.y;
    const offset=(.44+r.next()*.53)*(r.next()<.5?-1:1)/Math.max(.1,Math.hypot(dx,dy));
    controlA.x-=dy*offset*.48;
    controlA.y+=dx*offset*.48;
    controlB.x-=dy*offset;
    controlB.y+=dx*offset;
  }
  const yaw=gesture==='late turn'?(r.next()<.5?-1:1)*(.47+r.next()*.31):(r.next()-.5)*.68;
  return {
    from:slotKey(from),to:slotKey(to),book,a,b,clearA,clearB,controlA,controlB,gesture,
    pull:.14+r.next()*.12+(pullGap-.24)*.12,
    dock:.75+r.next()*.10-(dockGap-.24)*.15,
    pullBias:(r.next()-.5)*.82,dockBias:(r.next()-.5)*.82,pace:(r.next()-.5)*.29,
    driftX:Math.cos(bearing)*drift,driftY:Math.sin(bearing)*drift,
    broadArc:r.next()<.46,glide,glidePhase:r.next()*TAU,trim:(r.next()-.5)*.55,
    pitch:(r.next()-.5)*.80,yaw,bank:(r.next()-.5)*1.14,turn,rollTurn,
  };
}

export class LibraryWorld {
  constructor(seed) {
    this.seed=seed>>>0;
    this.r=random(hash(this.seed,177));
    this.bays=new Map();
    this.time=0;
    this.travel=0;
    this.next=.18;
    this.flights=[];
    this.events=0;
    this.departures=0;
    this.exchangeCount=0;
    this.inFlight=0;
    this.current=null;
    this.stream();
  }

  stream() {
    const at=Math.floor(this.travel/BAY);
    for(let i=at-1;i<=at+AHEAD;i++)if(!this.bays.has(i))this.bays.set(i,makeBay(this.seed,i));
    for(const [i,bay] of this.bays){
      if(i<at-1&&!bay.walls.some(w=>w.slots.some(s=>s.flight)))this.bays.delete(i);
    }
  }

  find(key) {
    const [i,side,id]=key.split('/').map(Number);
    return this.bays.get(i)?.walls[side]?.slots[id];
  }

  wave(){
    const r=this.r;
    // A new region briefly becomes busy. Its timing, side, reach and route vary.
    this.current={
      end:this.time+3+r.next()*5, band:8+r.next()**.78*31,
      spread:2.6+r.next()*9, side:Math.floor(r.next()*4),
      style:Math.floor(r.next()*3), reach:r.next()<.29?1:0,
      pressure:r.next(),
    };
  }

  openExchange(progress=0, useCurrent=true) {
    const r=this.r, wave=useCurrent?this.current:null;
    const band=wave ? wave.band+(r.next()-.5)*wave.spread : 7+r.next()**.85*42;
    const depth=clamp(band,7,51);
    const bayIndex=Math.floor((this.travel+depth)/BAY);
    const bay=this.bays.get(bayIndex);
    if(!bay)return false;
    const side0=wave&&r.next()<.60?wave.side:Math.floor(r.next()*4);
    const turn=r.next()<.48?2:r.next()<.5?1:3;
    const solo=r.next()<.42;
    const side1=solo&&r.next()<.29?side0:(side0+turn)%4;
    const rest=[0,1,2,3].filter(x=>x!==side0&&x!==side1);
    if(r.next()<.5)rest.reverse();
    const size=solo||r.next()<.78?2:3;
    const sides=[side0,side1,...rest].slice(0,size);
    const tiers=[0,1,2,3,4];
    const rotateBy=Math.floor(r.next()*tiers.length);
    const style=wave&&r.next()<.78?wave.style:Math.floor(r.next()*3);
    const target=this.travel+depth;
    for(let i=0;i<tiers.length;i++){
      const tier=tiers[(i+rotateBy)%tiers.length];
      const slots=[];
      for(const side of sides){
        const nextBay=clamp(bayIndex+(wave?.reach&&r.next()<.34?(r.next()<.5?-1:1):0),
          Math.floor((this.travel+6.2)/BAY),Math.floor((this.travel+56)/BAY));
        const list=this.bays.get(nextBay)?.walls[side].tiers[tier]??[];
        const start=Math.floor(r.next()*list.length);
        let selected;
        const occupied=!solo||slots.length===0;
        for(let j=0;j<list.length;j++){
          const slot=list[(start+j)%list.length];
          const z=slot.bay*BAY+slot.x;
          if(slot.flight||Boolean(slot.book)!==occupied||z<this.travel+6.2||Math.abs(z-target)>6.8)continue;
          selected=slot;
          break;
        }
        if(!selected)break;
        slots.push(selected);
      }
      if(slots.length!==size)continue;
      const first=Math.floor(r.next()*size);
      const order=slots.slice().sort((a,b)=>(a.bay-b.bay)*BAY+a.x-b.x);
      const paths=(solo?slots.slice(0,1):slots).map((slot,j)=>{
        const lane=solo?(r.next()-.5)*4.4:(order.indexOf(slot)-(size-1)/2)*(3.7+r.next()*1.6);
        const path=buildPath(slot,slots[(j+1)%size],r,r.next()<.49?style:Math.floor(r.next()*3),lane);
        path.delay=solo||j===first?0:.30+1.26*r.next()**1.35;
        path.duration=Math.max(2.75+(4.35-path.delay)*r.next(),minimumFlightTime(path,pose,MAX_BOOK_SPEED));
        path.bounds=motionBounds(path,path.duration);
        return path;
      });
      const duration=Math.max(...paths.map(path=>path.delay+path.duration));
      if(duration>7.6)continue;
      const flight={id:this.events+1,start:this.time-duration*progress,duration,paths};
      if(!paths.every(path=>clearAisle(path,flight,R-.025,pose)))continue;
      const passes=paths.every((path,i)=>
        paths.slice(0,i).every(other=>clearPair(path,flight,other,flight,this.time,pose))&&
        this.flights.every(group=>group.paths.every(other=>clearPair(path,flight,other,group,this.time,pose))));
      if(!passes)continue;
      for(const slot of slots)slot.flight=true;
      this.inFlight+=paths.length;
      this.releaseBooks(flight);
      this.events++;
      this.flights.push(flight);
      return true;
    }
    return false;
  }

  releaseBooks(flight){
    for(const path of flight.paths){
      if(path.departed||motionProgress(path,flight,this.time)<0)continue;
      this.find(path.from).book=null;
      path.departed=true;
      this.departures++;
    }
  }

  prime(){
    // Start with activity already at different stages, instead of a synchronized launch.
    for(let n=0;this.inFlight<54&&n<145;n++){
      this.openExchange(.18+this.r.next()*.67,false);
    }
    this.wave();
  }

  step(dt) {
    const previousBay=Math.floor(this.travel/BAY);
    this.time+=dt;
    this.travel+=SPEED*dt;
    if(previousBay!==Math.floor(this.travel/BAY))this.stream();
    for(let i=this.flights.length-1;i>=0;i--){
      const flight=this.flights[i];
      this.releaseBooks(flight);
      if(this.time-flight.start<flight.duration)continue;
      for(const path of flight.paths){
        this.find(path.from).flight=false;
        const slot=this.find(path.to);
        slot.book=path.book;
        slot.flight=false;
      }
      this.inFlight-=flight.paths.length;
      this.flights.splice(i,1);
      this.exchangeCount++;
    }
    if(this.time<this.next)return;
    if(!this.current||this.time>this.current.end)this.wave();
    const r=this.r;
    const target=47+this.current.pressure*28;
    for(let n=0;n<4&&this.inFlight<target;n++)this.openExchange(0,r.next()<.55);
    this.next=this.time+.105+r.next()*.135;
  }

  snapshot() {
    return {version:VERSION,seed:this.seed,rng:this.r.state,time:this.time,travel:this.travel,
      next:this.next,events:this.events,departures:this.departures,exchangeCount:this.exchangeCount,current:this.current,
      bays:[...this.bays.values()].map(b=>[b.index,b.walls.map(w=>w.slots.map(s=>s.book))]),
      flights:structuredClone(this.flights)};
  }

  restore(state) {
    if(![125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,VERSION].includes(state?.version))return false;
    Object.assign(this,{seed:state.seed,time:state.time,travel:state.travel,next:state.next,
      events:state.events,departures:state.departures??0,exchangeCount:state.exchangeCount,current:state.current??null});
    this.r=random(state.rng);
    this.bays.clear();
    const savedBook=(slot,book)=>{
      if(state.version>=133)return book;
      if(!book||state.version>=129)return book??slot.book;
      const design=slot.tier*EDITIONS_PER_TIER+(book.design%EDITIONS_PER_TIER);
      return {...book,design,...bookFormat(design)};
    };
    for(const [index,walls] of state.bays){
      const bay=makeBay(this.seed,index);
      for(let side=0;side<4;side++){
        bay.walls[side].slots.forEach((slot,i)=>{slot.book=savedBook(slot,walls[side][i]);});
      }
      this.bays.set(index,bay);
    }
    this.stream();
    this.inFlight=0;
    this.flights=[];
    for(const flight of structuredClone(state.flights)){
      const valid=flight.paths.every(path=>this.find(path.from)&&this.find(path.to));
      if(!valid)continue;
      // Finish old routes that exceed the new motion limits at their reserved slots.
      const outdated=state.version>=129&&state.version<140&&flight.paths.some(path=>path.recoil||
        Math.abs(path.rollTurn)>Math.PI+.15||
        minimumFlightTime(path,pose,MAX_BOOK_SPEED)>(path.duration??flight.duration-(path.delay??0)));
      if(state.version<129||outdated){
        for(const path of flight.paths)this.find(path.from).book=null;
        for(const path of flight.paths){
          const slot=this.find(path.to);
          slot.book=savedBook(slot,path.book);
        }
        continue;
      }
      for(const path of flight.paths){
        this.find(path.from).flight=true;
        this.find(path.to).flight=true;
      }
      this.releaseBooks(flight);
      this.inFlight+=flight.paths.length;
      this.flights.push(flight);
    }
    return true;
  }
}

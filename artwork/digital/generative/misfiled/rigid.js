// Shared by the renderer and the motion reservation system.
export function axes(p) {
  const ca=Math.cos(p.angle),sa=Math.sin(p.angle);
  const cr=Math.cos(p.roll||0),sr=Math.sin(p.roll||0);
  const cy=Math.cos(p.yaw||0),sy=Math.sin(p.yaw||0);
  const cp=Math.cos(p.pitch||0),sp=Math.sin(p.pitch||0);
  return [0,1,2].map(i=>{
    const x=i===0?cr:i===1?-sr:0, y=i===0?sr:i===1?cr:0, z=i===2?1:0;
    const forward=x*cy+z*sy, radial=z*cy-x*sy;
    const down=y*cp-radial*sp, out=y*sp+radial*cp;
    return [out*ca-down*sa,out*sa+down*ca,forward];
  });
}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const basis=[[1,0,0],[0,1,0],[0,0,1]];
export function orientedBox(p,book){
  return {center:[p.x,p.y,p.s],axes:axes(p),half:[book.w/2,book.h/2,book.d/2]};
}
const support=(box,n)=>box.half.reduce((sum,h,i)=>sum+Math.abs(dot(box.axes[i],n))*h,0);

export function separated(a,b,margin=0){
  const delta=b.center.map((v,i)=>v-a.center[i]);
  function clears(n){
    return Math.abs(dot(delta,n))-support(a,n)-support(b,n)>margin*Math.hypot(...n);
  }
  if(basis.some(clears)||a.axes.some(clears)||b.axes.some(clears))return true;
  for(const u of a.axes)for(const v of b.axes){
    const n=cross(u,v);
    if(dot(n,n)>1e-10&&clears(n))return true;
  }
  return false;
}

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.s-b.s);
export function motionBounds(path,duration){
  const nodes=[path.a,path.clearA,path.controlA,path.controlB,path.clearB,path.b];
  const radius=Math.hypot(path.book.w,path.book.h,path.book.d)/2;
  const z0=Math.min(...nodes.map(p=>p.s))-radius,z1=Math.max(...nodes.map(p=>p.s))+radius;
  // Convex-hull derivative bound for the cubic, plus the maximum movement
  // of any corner from rotation. Quintic easing has derivative <= 1.875.
  const cubic=3*Math.max(distance(nodes[1],nodes[2]),distance(nodes[2],nodes[3]),distance(nodes[3],nodes[4]));
  // The broad arc has slope at most π. The sway is half sin(2πf)
  // minus a quarter sin(4πf), so its slope has magnitude at most 2π.
  const drift=(path.broadArc?1:2)*Math.PI*Math.hypot(path.driftX??0,path.driftY??0);
  // The late turn uses 2f times the yaw envelope, so bound its product derivative.
  const yawSlope=(path.gesture==='late turn'?2*Math.PI+2:Math.PI)*Math.abs(path.yaw);
  const rotation=Math.abs(path.turn)+Math.abs(path.rollTurn)+yawSlope+Math.PI*(Math.abs(path.pitch)+Math.abs(path.bank)+2*Math.abs(path.trim??0));
  const pull=1.875*(1+Math.abs(path.pullBias??0))*distance(nodes[0],nodes[1])/(path.pull*duration);
  const sail=1.875*(1+Math.abs(path.pace??0)+Math.abs(path.glide??0))*(cubic+drift+radius*rotation)/((path.dock-path.pull)*duration);
  const dock=1.875*(1+Math.abs(path.dockBias??0))*distance(nodes[4],nodes[5])/((1-path.dock)*duration);
  return {z0,z1,pull,sail,dock};
}

// Bound center speed with secants and a curvature allowance. Within an
// interval of width h, velocity differs from its average by at most A*h/2.
export function minimumFlightTime(path,pose,speedLimit){
  const {clearA:a,controlA:b,controlB:c,clearB:d}=path;
  const pull=1.875*(1+Math.abs(path.pullBias??0))*distance(path.a,a)/path.pull;
  const dock=1.875*(1+Math.abs(path.dockBias??0))*distance(d,path.b)/(1-path.dock);

  const drift=Math.hypot(path.driftX??0,path.driftY??0);
  const slope=3*Math.max(distance(a,b),distance(b,c),distance(c,d))+(path.broadArc?1:2)*Math.PI*drift;
  const second=(a,b,c)=>Math.hypot(a.x-2*b.x+c.x,a.y-2*b.y+c.y,a.s-2*b.s+c.s);
  const curvature=6*Math.max(second(a,b,c),second(b,c,d))+(path.broadArc?2:6)*Math.PI**2*drift;
  const pace=Math.abs(path.pace??0),glide=Math.abs(path.glide??0),warp=1+pace+glide;
  const speed=1.875*warp;
  const acceleration=curvature*speed**2+slope*(5.774*warp+1.875**2*(2*pace+2*Math.PI*glide));
  const samples=32,span=path.dock-path.pull;
  let previous=a,peak=0;
  for(let i=1;i<=samples;i++){
    const point=i===samples?d:pose(path,path.pull+span*i/samples);
    peak=Math.max(peak,distance(previous,point)*samples);
    previous=point;
  }
  const sail=(peak+acceleration/(2*samples))/span;
  return Math.max(pull,sail,dock)/speedLimit;
}

function clearInterval(lo,hi,test){
  const mid=(lo+hi)/2;
  if(test(mid,(hi-lo)/2))return true;
  // If separation cannot be certified, the proposed route is not admitted.
  if(hi-lo<.0025)return false;
  return clearInterval(lo,mid,test)&&clearInterval(mid,hi,test);
}
function activeDuration(path,flight,delay){
  return path.duration??(flight.duration-delay);
}
export function motionProgress(path,flight,time){
  const delay=path.delay??0;
  return (time-flight.start-delay)/activeDuration(path,flight,delay);
}
function rate(path,flight,lo,hi){
  const start=motionProgress(path,flight,lo),end=motionProgress(path,flight,hi);
  if(end<=0||start>=1)return 0;
  if(end<=path.pull)return path.bounds.pull;
  if(start>=path.dock)return path.bounds.dock;
  if(start>=path.pull&&end<=path.dock)return path.bounds.sail;
  return Math.max(path.bounds.pull,path.bounds.sail,path.bounds.dock);
}
export function clearPair(path,flight,other,otherFlight,now,pose){
  if(path.bounds.z0>other.bounds.z1||other.bounds.z0>path.bounds.z1)return true;
  const start=Math.max(now,flight.start,otherFlight.start);
  const end=Math.min(flight.start+flight.duration,otherFlight.start+otherFlight.duration);
  if(end<=start)return true;
  return clearInterval(start,end,(mid,half)=>{
    const a=orientedBox(pose(path,motionProgress(path,flight,mid)),path.book);
    const b=orientedBox(pose(other,motionProgress(other,otherFlight,mid)),other.book);
    const travel=half*(rate(path,flight,mid-half,mid+half)+rate(other,otherFlight,mid-half,mid+half));
    return separated(a,b,.0015+travel);
  });
}
export function clearAisle(path,flight,radius,pose){
  const delay=path.delay??0,duration=activeDuration(path,flight,delay);
  const start=flight.start+delay+path.pull*duration,end=flight.start+delay+path.dock*duration;
  return clearInterval(start,end,(mid,half)=>{
    const box=orientedBox(pose(path,motionProgress(path,flight,mid)),path.book);
    const margin=.0015+half*path.bounds.sail;
    return basis.slice(0,2).every((n,i)=>Math.abs(box.center[i])+support(box,n)+margin<radius);
  });
}

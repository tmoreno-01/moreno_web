// A continuously repartitioned painted field. No input or prerecorded frames.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
const INKS=['#00acd0','#00acd0','#053777','#082d68','#720e17','#b82831','#db4949','#f0a0a2','#f5bec7','#efeee4','#f7f0dc','#fbd51e','#eba311','#176e56','#9bbcaf','#c3c7bc','#434858'];
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const css=c=>`rgb(${c.map(v=>Math.round(v)).join(',')})`;
const cache=new WeakMap();
function reducePoints(p,tol){if(p.length<5)return p;let result=[p[0]],anchor=0;for(let i=1;i<p.length-1;i++){let a=p[anchor],b=p[i],c=p[i+1],dx=c.x-a.x,dy=c.y-a.y,d=Math.abs(dx*(b.y-a.y)-dy*(b.x-a.x))/(Math.hypot(dx,dy)+1e-9);if(d>tol||i-anchor>8){result.push(b);anchor=i;}}result.push(p.at(-1));return result;}
export class Mosaic{
 constructor(seed=1){this.seed=seed>>>0||1;this.time=0;this.forms=[];this.mutations=0;this.paletteChanges=0;this.geometryChanges=0;this.colourMutations=0;this.reactions=0;this.contacts=0;this.bondsMade=0;this.smallEvents=0;this.births=0;this.eventAge=0;this.eventLife=this.rand(1.5,3.5);this.warp=[this.rand(-3,3),this.rand(-3,3),this.rand(-3,3)];this.warpSpeed=[.19,-.13,.16];
  for(let i=0;i<96;i++){let x=((i%10)+this.rand(.2,.8))/10,y=((i/10|0)+this.rand(.2,.8))/10,ink=rgb(INKS[this.rand(0,INKS.length)|0]);this.forms.push({id:i,x,y,vx:0,vy:0,tx:clamp(x+this.rand(-.18,.18),-.04,1.04),ty:clamp(y+this.rand(-.18,.18),-.04,1.04),sx:this.rand(.65,1.7),sy:this.rand(.65,1.7),toX:this.rand(.6,1.8),toY:this.rand(.6,1.8),square:this.rand(.25,1),squareTo:this.rand(.25,1),angle:this.rand(-.12,.12),angleTo:this.rand(-.22,.22),ink,inkFrom:ink.slice(),inkTo:ink.slice(),inkAge:0,inkLife:this.rand(1,6),inkDuration:this.rand(1.3,3),age:this.rand(0,2),life:this.rand(2.5,6),phase:this.rand(0,TAU),style:this.rand(0,4)|0});}
  this.currents=Array.from({length:4},()=>({x:this.rand(.15,.85),y:this.rand(.15,.85),tx:this.rand(.15,.85),ty:this.rand(.15,.85),spin:this.rand(-1,1),targetSpin:this.rand(-1,1),radius:this.rand(.25,.5)}));
  for(const f of this.forms){f.inkTo=this.nextInk(f.ink);f.inkLife=f.inkDuration=this.rand(2.5,5);}
  this.ribbons=Array.from({length:13},(_,id)=>{let x=this.rand(-.05,.95),y=this.rand(-.05,.95),nodes=[],a=(id%4)*Math.PI*.5;for(let j=0;j<5;j++){nodes.push({x,y,tx:x,ty:y});a+=(this.rand()<.5?-1:1)*Math.PI*.5;x=clamp(x+Math.cos(a)*this.rand(.1,.25),-.07,1.07);y=clamp(y+Math.sin(a)*this.rand(.1,.25),-.07,1.07);}let ink=rgb(INKS[id%INKS.length]);return{id,nodes,width:this.rand(.035,.085),toWidth:this.rand(.03,.08),ink,from:ink.slice(),to:ink.slice(),age:0,life:this.rand(3,7),phase:this.rand(0,TAU),colourAge:0,colourLife:this.rand(2.5,5)};});
  for(const r of this.ribbons){r.to=this.nextInk(r.ink);for(const n of r.nodes){n.vx=0;n.vy=0;}}
 }
 rand(a=0,b=1){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return a+(b-a)*this.seed/4294967296;}
 get bodies(){return this.forms;}
 nextInk(previous){let c;for(let i=0;i<20;i++){c=rgb(INKS[this.rand(0,INKS.length)|0]);if(c.reduce((s,v,j)=>s+Math.abs(v-previous[j]),0)>100)break;}return c;}
 flow(x,y){let vx=Math.sin(y*6+this.warp[1])*.025,vy=Math.cos(x*5+this.warp[0])*.025;for(const c of this.currents){let dx=x-c.x,dy=y-c.y,w=Math.exp(-(dx*dx+dy*dy)/(c.radius*c.radius))*c.spin;vx-=dy*w*.7;vy+=dx*w*.7;}return{vx,vy};}
 update(dt){if(!(dt>0))return;dt=Math.min(.12,dt);this.time+=dt;this.eventAge+=dt;
  if(this.eventAge>this.eventLife){this.eventAge=0;this.eventLife=this.rand(1.4,3.7);let i=this.rand(0,96)|0,f=this.forms[i],q=this.forms[(i+1+(this.rand(0,95)|0))%96];f.tx=clamp(q.x+this.rand(-.08,.08),-.02,1.02);f.ty=clamp(q.y+this.rand(-.08,.08),-.02,1.02);f.toX=this.rand(.45,2);f.toY=this.rand(.45,2);this.warpSpeed[this.rand(0,3)|0]=this.rand(-.35,.35);let c=this.currents[this.rand(0,4)|0];c.tx=this.rand(.1,.9);c.ty=this.rand(.1,.9);c.targetSpin=this.rand(-1.3,1.3);this.smallEvents++;this.geometryChanges++;}
  for(const c of this.currents){c.x+=(c.tx-c.x)*dt*.25;c.y+=(c.ty-c.y)*dt*.25;c.spin+=(c.targetSpin-c.spin)*dt*.4;}
  for(const r of this.ribbons){r.age+=dt;r.colourAge+=dt;if(r.age>r.life){r.age=0;r.life=this.rand(2.5,5.5);r.toWidth=this.rand(.025,.095);for(const n of r.nodes){n.tx=clamp(n.x+this.rand(-.16,.16),-.1,1.1);n.ty=clamp(n.y+this.rand(-.16,.16),-.1,1.1);}this.mutations++;}
   if(r.colourAge>r.colourLife){r.colourAge=0;r.colourLife=this.rand(2.5,5);r.from=r.ink.slice();r.to=this.nextInk(r.ink);this.colourMutations++;}
   let blend=clamp(r.colourAge/r.colourLife,0,1);blend=blend*blend*(3-2*blend);r.ink=r.from.map((v,i)=>mix(v,r.to[i],blend));r.width+=(r.toWidth-r.width)*dt*.55;
   for(const n of r.nodes){let flow=this.flow(n.x,n.y);n.tx=clamp(n.tx+flow.vx*dt*.65,-.12,1.12);n.ty=clamp(n.ty+flow.vy*dt*.65,-.12,1.12);n.vx=(n.vx+((n.tx-n.x)*.9+flow.vx*2.5)*dt)*Math.exp(-dt*2);n.vy=(n.vy+((n.ty-n.y)*.9+flow.vy*2.5)*dt)*Math.exp(-dt*2);n.x=clamp(n.x+n.vx*dt,-.15,1.15);n.y=clamp(n.y+n.vy*dt,-.15,1.15);}
  }
  for(let j=0;j<3;j++)this.warp[j]+=this.warpSpeed[j]*dt;
  for(const f of this.forms){f.age+=dt;f.inkAge+=dt;if(f.age>f.life){f.age=0;f.life=this.rand(2.5,7);f.tx=clamp(f.x+this.rand(-.2,.2),-.03,1.03);f.ty=clamp(f.y+this.rand(-.2,.2),-.03,1.03);f.toX=this.rand(.55,1.8);f.toY=this.rand(.55,1.8);f.squareTo=this.rand(.2,1);f.angleTo=this.rand(-.65,.65);this.mutations++;}
   let flow=this.flow(f.x,f.y),fx=(f.tx-f.x)*.4+flow.vx*3,fy=(f.ty-f.y)*.4+flow.vy*3;
   for(const q of this.forms){if(q===f)continue;let dx=f.x-q.x,dy=f.y-q.y,d=dx*dx+dy*dy;if(d<.0049&&d>1e-8){let scale=(.0049-d)/.0049*.11/Math.sqrt(d);fx+=dx*scale;fy+=dy*scale;this.contacts++;}}
   const damp=Math.exp(-dt*2);f.vx=(f.vx+fx*dt)*damp;f.vy=(f.vy+fy*dt)*damp;f.x=clamp(f.x+f.vx*dt,-.05,1.05);f.y=clamp(f.y+f.vy*dt,-.05,1.05);f.sx+=(f.toX-f.sx)*dt*.45;f.sy+=(f.toY-f.sy)*dt*.45;f.square+=(f.squareTo-f.square)*dt*.3;f.angle+=(f.angleTo-f.angle)*dt*.3;
   if(f.inkAge>f.inkLife){f.inkFrom=f.ink.slice();f.inkTo=this.nextInk(f.ink);f.inkAge=0;f.inkLife=f.inkDuration=this.rand(2.5,5);this.colourMutations++;this.paletteChanges++;}
   let t=clamp(f.inkAge/f.inkDuration,0,1);t=t*t*(3-2*t);f.ink=f.inkFrom.map((v,i)=>mix(v,f.inkTo[i],t));
  }
 }
 snapshot(){return structuredClone({...this});}
 restore(s){Object.assign(this,structuredClone(s));cache.delete(this);}
 contours(N){let cells=this.forms.map(f=>({x:f.x,y:f.y,c:Math.cos(f.angle),s:Math.sin(f.angle),ix:1/(f.sx*f.sx),iy:1/(f.sy*f.sy),square:f.square,id:f.id})),labels=new Int16Array(N*N),edges=Array.from({length:96},()=>new Map()),stride=N+1;
  // A shared smooth deformation makes the territories interlock without gaps.
  for(let y=0;y<N;y++){let py=(y+.5)/N,wx=Math.sin(py*13+this.warp[0])*.035+Math.sin(py*29+this.warp[2])*.012;for(let x=0;x<N;x++){let px=(x+.5)/N,wy=Math.sin(px*12+this.warp[1])*.031+Math.sin(px*25+py*7+this.warp[2])*.012,qx=px+wx,qy=py+wy,best=1e9,id=0;for(let i=0;i<cells.length;i++){let f=cells[i],dx=qx-f.x,dy=qy-f.y,a=dx*f.c+dy*f.s,b=dy*f.c-dx*f.s,xx=a*a*f.ix,yy=b*b*f.iy,score=Math.max(xx,yy)+(1-f.square*.82)*Math.min(xx,yy);if(score<best){best=score;id=i;}}labels[y*N+x]=id;}}
  const vertices=new Map();
  const score=(x,y,f)=>{let a0=y*13+this.warp[0],a1=y*29+this.warp[2],a2=x*12+this.warp[1],a3=x*25+y*7+this.warp[2],qx=x+Math.sin(a0)*.035+Math.sin(a1)*.012,qy=y+Math.sin(a2)*.031+Math.sin(a3)*.012,dx=qx-f.x,dy=qy-f.y,a=dx*f.c+dy*f.s,b=dy*f.c-dx*f.s,xx=a*a*f.ix,yy=b*b*f.iy,w=1-f.square*.82,wa=xx>yy?1:w,wb=xx>yy?w:1,gx=2*a*f.ix*f.c*wa-2*b*f.iy*f.s*wb,gy=2*a*f.ix*f.s*wa+2*b*f.iy*f.c*wb;return{v:Math.max(xx,yy)+w*Math.min(xx,yy),gx:gx+gy*(Math.cos(a2)*.372+Math.cos(a3)*.3),gy:gx*(Math.cos(a0)*.455+Math.cos(a1)*.348)+gy*(1+Math.cos(a3)*.084)};};
  const vertex=at=>{if(vertices.has(at))return vertices.get(at);let ix=at%stride,iy=at/stride|0,x=ix/N,y=iy/N,ids=[];for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){let xx=ix+dx,yy=iy+dy;if(xx>=0&&xx<N&&yy>=0&&yy<N){let id=labels[yy*N+xx];if(!ids.includes(id))ids.push(id);}}ids.sort((a,b)=>a-b);let ox=x,oy=y;
   if(ids.length>=2)for(let it=0;it<2;it++){let a=score(x,y,cells[ids[0]]),b=score(x,y,cells[ids[1]]),v=a.v-b.v,gx=a.gx-b.gx,gy=a.gy-b.gy,den=gx*gx+gy*gy+1e-12,dx=v*gx/den,dy=v*gy/den;
    if(ids.length>=3){let c=score(x,y,cells[ids[2]]),v2=a.v-c.v,gx2=a.gx-c.gx,gy2=a.gy-c.gy,det=gx*gy2-gy*gx2;if(Math.abs(det)>1e-7){dx=(v*gy2-v2*gy)/det;dy=(gx*v2-gx2*v)/det;}}
    x=ix===0?0:ix===N?1:clamp(x-dx,ox-.8/N,ox+.8/N);y=iy===0?0:iy===N?1:clamp(y-dy,oy-.8/N,oy+.8/N);
   }let p={x,y};vertices.set(at,p);return p;};
  const edge=(id,a,b)=>{let m=edges[id],v=m.get(a);if(v)v.push(b);else m.set(a,[b]);};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let i=y*N+x,id=labels[i],v=y*stride+x;if(y===0||labels[i-N]!==id)edge(id,v,v+1);if(x===N-1||labels[i+1]!==id)edge(id,v+1,v+stride+1);if(y===N-1||labels[i+N]!==id)edge(id,v+stride+1,v+stride);if(x===0||labels[i-1]!==id)edge(id,v+stride,v);}
  let regions=[];
  for(let id=0;id<96;id++){let m=edges[id],loops=[];while(m.size){let start=m.keys().next().value,at=start,points=[],guard=0;do{points.push(vertex(at));let list=m.get(at);if(!list)break;let next=list.pop();if(!list.length)m.delete(at);at=next;}while(at!==start&&guard++<N*N*4);if(points.length>=4)loops.push(reducePoints(points,.0025));}regions.push(loops);}
  return regions;
 }
 path(ctx,loops,size){ctx.beginPath();for(const p of loops){const n=p.length;if(n<3)continue;let a=p[n-1],b=p[0];ctx.moveTo((a.x+b.x)*size*.5,(a.y+b.y)*size*.5);for(let i=0;i<n;i++){let a=p[i],b=p[(i+1)%n];ctx.quadraticCurveTo(a.x*size,a.y*size,(a.x+b.x)*size*.5,(a.y+b.y)*size*.5);}ctx.closePath();}}
 draw(ctx,size,quality=1){const N=Math.round(128*clamp(quality,.75,1)),regions=this.contours(N);ctx.fillStyle='#f1eee4';ctx.fillRect(0,0,size,size);
  for(let i=0;i<regions.length;i++){let f=this.forms[i],loops=regions[i];if(!loops.length)continue;this.path(ctx,loops,size);ctx.fillStyle=css(f.ink);ctx.fill('evenodd');ctx.lineWidth=Math.max(.45,size*.0008);ctx.strokeStyle='rgba(79,70,66,.48)';ctx.stroke();}
  for(const r of this.ribbons){const ns=r.nodes,sp=[];for(let i=0;i<ns.length-1;i++){let a=ns[Math.max(0,i-1)],b=ns[i],c=ns[i+1],d=ns[Math.min(ns.length-1,i+2)];for(let j=0;j<10;j++){let t=j/10,t2=t*t,t3=t2*t,cat=(a,b,c,d)=>.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);sp.push({x:cat(a.x,b.x,c.x,d.x),y:cat(a.y,b.y,c.y,d.y)});}}sp.push(ns.at(-1));let left=[],right=[];
   for(let i=0;i<sp.length;i++){let p=sp[i],a=sp[Math.max(0,i-1)],b=sp[Math.min(sp.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)+1e-9,u=i/(sp.length-1),w=r.width*.5*(.86+.22*Math.sin(u*7+this.time*.65+r.phase)+.13*Math.cos(u*15-this.time*.5+r.phase));left.push({x:p.x-dy/len*w,y:p.y+dx/len*w});right.push({x:p.x+dy/len*w,y:p.y-dx/len*w});}
   const outline=left.concat(right.reverse());this.path(ctx,[outline],size);ctx.fillStyle=css(r.ink);ctx.fill();ctx.strokeStyle='rgba(79,70,66,.5)';ctx.lineWidth=.7;ctx.stroke();
   for(let j=0;j<3;j++){let progress=(this.time*.045+r.phase+j*.29)%1,u=progress*(sp.length-1),i=Math.min(sp.length-2,Math.floor(u)),t=u-i,p=sp[i],q=sp[i+1],x=mix(p.x,q.x,t)*size,y=mix(p.y,q.y,t)*size,w=size*(.012+.012*(.5+.5*Math.sin(r.phase+j))),h=w*(1.2+.4*Math.sin(this.time*.4+r.phase)),rad=w*.22;ctx.beginPath();ctx.moveTo(x-w/2+rad,y-h/2);ctx.lineTo(x+w/2-rad,y-h/2);ctx.quadraticCurveTo(x+w/2,y-h/2,x+w/2,y-h/2+rad);ctx.lineTo(x+w/2,y+h/2-rad);ctx.quadraticCurveTo(x+w/2,y+h/2,x+w/2-rad,y+h/2);ctx.lineTo(x-w/2+rad,y+h/2);ctx.quadraticCurveTo(x-w/2,y+h/2,x-w/2,y+h/2-rad);ctx.lineTo(x-w/2,y-h/2+rad);ctx.quadraticCurveTo(x-w/2,y-h/2,x-w/2+rad,y-h/2);ctx.closePath();ctx.globalAlpha=Math.min(1,progress*12,(1-progress)*12);ctx.fillStyle=css(this.forms[(r.id*7+j)%96].ink);ctx.fill();ctx.strokeStyle='rgba(79,70,66,.45)';ctx.lineWidth=.65;ctx.stroke();ctx.globalAlpha=1;}
  }
  let c=cache.get(this);if(!c){let tile=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(160,160):Mosaic.canvasFactory(160,160),tc=tile.getContext('2d'),img=tc.createImageData(160,160),z=7691;for(let i=0;i<img.data.length;i+=4){z^=z<<13;z^=z>>>17;z^=z<<5;let v=70+(z>>>0)%120;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}tc.putImageData(img,0,0);c={tile};cache.set(this,c);}
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.075;ctx.fillStyle=ctx.createPattern(c.tile,'repeat');ctx.fillRect(0,0,size,size);ctx.restore();
 }
}

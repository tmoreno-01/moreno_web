// Autonomous woven ribbons: moving routes, material bands and local encounters.
const TAU=Math.PI*2,PI=Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const palettes=[
 ['#082b56','#03516f','#006f81','#005947','#0b1116','#f51e16','#ffb71d','#f9d65e','#eee6d3','#b10d65','#182e49'],
 ['#e54927','#101d31','#173d95','#f1b735','#f4e7cb','#137565','#94334f','#dd7651','#4d6e82'],
 ['#f3dcc0','#e45143','#e8a53c','#2a938d','#283c70','#12192d','#a94b64','#d8d4ad','#465f58']
];
const backgrounds=['#f1eee4','#dcca9e','#172a3b'];
const caches=new WeakMap();
const colourRGB=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const colourCSS=c=>`rgb(${c.map(v=>Math.round(v)).join(',')})`;
function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
function cat(a,b,c,d,t){return .5*((2*b)+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
export class Wild{
 constructor(seed=1,kind=0){this.seed=seed>>>0||1;this.kind=kind;this.time=0;this.mutations=0;this.geometryChanges=0;this.languageChanges=0;this.paletteChanges=0;this.reactions=0;this.contacts=0;this.bondsMade=0;this.smallEvents=0;this.forms=[];this.eddies=[];this.eventAge=0;this.eventLife=this.rand(.6,1.7);this.interactionStrength=1;
  const count=kind===0?13:kind===1?15:10;
  for(let id=0;id<count;id++)this.addRibbon(id,false);
  if(kind===2)for(let i=0;i<6;i++)this.addRibbon(count+i,true);
  // Establish tangles before the first visible frame; no blank growth-in or repeated prerecorded loop.
  for(let i=0;i<70;i++)this.update(.04);
  this.time=0;this.spawnAge=0;this.spawnLife=this.rand(3,6);this.nextId=this.forms.length;this.births=0;this.colourMutations=0;
 }
 rand(a=0,b=1){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return a+(b-a)*this.seed/4294967296;}
 get bodies(){return this.forms;}
 addRibbon(id,branch){const k=this.kind,thin=id%6===5,spacing=k===0?.039:k===1?.028:.034,count=branch?21:k===0?34:k===1?43:38;let x=.13+(id%4)*.23+this.rand(-.05,.05),y=.14+((id/4|0)%4)*.24+this.rand(-.04,.04),a=this.rand(0,TAU),nodes=[];
  const f={id,branch,thin,parent:branch?this.rand(0,10)|0:-1,attach:this.rand(.15,.8),nodes,spacing,width:branch?this.rand(.013,.025):thin?this.rand(.007,.014):k===0?this.rand(.042,.062):k===1?this.rand(.019,.042):this.rand(.029,.053),angle:a,turn:0,wantTurn:this.rand(-1,1),age:0,life:this.rand(.7,2.6),target:[this.rand(.12,.88),this.rand(.12,.88)],speed:this.rand(.08,k===1?.16:.14),mode:id%4,hand:this.rand()<.5?-1:1,phase:this.rand(0,TAU),depth:this.rand(-1,1),depthGoal:this.rand(-1,1),pattern:[],scroll:0,pigmentSpeed:this.rand(-.014,.024),grip:0,pulse:0,style:id%4,routeChanges:0};
  for(let j=0;j<count;j++){nodes.push({x,y,z:Math.sin(j*.18+f.phase)*.4+f.depth});if(j%4===0)a+=this.rand(-.85,.85);x+=Math.cos(a)*spacing;y+=Math.sin(a)*spacing;if(x<.09||x>.91){a=PI-a;x=clamp(x,.09,.91);}if(y<.09||y>.91){a=-a;y=clamp(y,.09,.91);}}
  // Independent irregular band lengths: large fields interrupted by tight strata.
  let cursor=-.5,last=-1;while(cursor<4){let tone;do{tone=this.rand(0,palettes[k].length)|0;}while(tone===last);last=tone;let len=this.rand()<.32?this.rand(.004,.016):this.rand(.025,.11);f.pattern.push({s:cursor,len,tone,wave:this.rand(.0008,.0038),frequency:this.rand(.8,2.3),phase:this.rand(0,TAU),detail:this.rand(1,7)|0});cursor+=len;}
  f.inks=palettes[k].map(colourRGB);f.inkFrom=f.inks.map(c=>c.slice());f.inkTo=f.inks.map(c=>c.slice());f.inkAge=0;f.inkLife=this.rand(1.5,4);f.inkDuration=1.8;f.growth=1;f.retiring=false;f.born=this.time;
  this.forms.push(f);
 }
 update(dt){if(!(dt>0))return;dt=Math.min(.12,dt);const steps=Math.ceil(dt/.025),h=dt/steps;for(let j=0;j<steps;j++)this.step(h);}
 spawnWorm(){
  if(this.forms.length>=23)return;
  if(this.forms.filter(f=>!f.retiring).length>=19){const candidates=this.forms.filter(f=>!f.retiring&&f.growth>.99);if(candidates.length)candidates[this.rand(0,candidates.length)|0].retiring=true;}
  const carrier=this.forms[this.rand(0,this.forms.length)|0],origin=carrier.nodes[this.rand(0,carrier.nodes.length)|0];this.addRibbon(this.nextId++,false);const f=this.forms.at(-1),dx=origin.x-f.nodes[0].x,dy=origin.y-f.nodes[0].y;
  for(const n of f.nodes){n.x=clamp(n.x+dx,.06,.94);n.y=clamp(n.y+dy,.06,.94);}f.growth=.005;f.width*=this.rand(.65,1.1);f.depth=origin.z+.1;f.nodes[0].z=f.depth;this.births++;
 }
 step(dt){this.time+=dt;const k=this.kind;
  if(k===0&&this.spawnLife){this.spawnAge+=dt;if(this.spawnAge>this.spawnLife){this.spawnAge=0;this.spawnLife=this.rand(3,7);this.spawnWorm();if(this.rand()<.23&&this.forms.length<22)this.spawnWorm();}}
  this.forms=this.forms.filter(f=>!f.retiring||f.growth>0);
  for(const f of this.forms){f.growth=clamp(f.growth+dt*(f.retiring?-.65:.34),0,1);f.inkAge+=dt;const t=clamp(f.inkAge/f.inkDuration,0,1),blend=t*t*(3-2*t);f.inks=f.inkFrom.map((c,i)=>c.map((v,j)=>mix(v,f.inkTo[i][j],blend)));
   if(f.inkAge>f.inkLife){f.inkFrom=f.inks.map(c=>c.slice());f.inkTo=f.inks.map(c=>c.slice());for(let i=0;i<3;i++){const slot=this.rand(0,f.inks.length)|0;f.inkTo[slot]=colourRGB(palettes[k][this.rand(0,palettes[k].length)|0]);}f.inkAge=0;f.inkLife=this.rand(2,5.5);f.inkDuration=this.rand(1.1,2.7);this.colourMutations=(this.colourMutations||0)+1;this.paletteChanges++;}
  }
this.eventAge+=dt;if(this.eventAge>this.eventLife){this.eventAge=0;this.eventLife=this.rand(.8,2);this.eddies.push({x:this.rand(.15,.85),y:this.rand(.15,.85),r:this.rand(.16,.38),spin:this.rand(-1.4,1.4),age:0,life:this.rand(3,7)});if(this.eddies.length>6)this.eddies.shift();const f=this.forms[this.rand(0,this.forms.length)|0];f.pulse=1;f.depthGoal=this.rand(-1,1);this.smallEvents++;}
  this.eddies=this.eddies.filter(v=>(v.age+=dt)<v.life);
  for(const f of this.forms){let ns=f.nodes,head=ns[0];f.age+=dt;f.pulse*=Math.exp(-dt*.9);f.depth+=(f.depthGoal-f.depth)*dt*.6;f.scroll+=dt*f.pigmentSpeed;
   let first=f.pattern[0],last=f.pattern.at(-1);if(first.s>f.scroll-.15){let len=this.rand(.015,.09);f.pattern.unshift({...first,s:first.s-len,len,tone:this.rand(0,palettes[k].length)|0,phase:this.rand(0,TAU)});}if(last.s<f.scroll+2){let len=this.rand(.015,.09);f.pattern.push({...last,s:last.s+last.len,len,tone:this.rand(0,palettes[k].length)|0,phase:this.rand(0,TAU)});}while(f.pattern.length>4&&f.pattern[1].s<f.scroll-.3)f.pattern.shift();while(f.pattern.length>4&&f.pattern.at(-2).s>f.scroll+2.4)f.pattern.pop();
   if(f.age>f.life){f.age=0;f.life=this.rand(.7,2.8);f.target=[this.rand(.08,.92),this.rand(.08,.92)];f.wantTurn=this.rand(-1.8,1.8);f.mode=this.rand(0,4)|0;f.speed=this.rand(.08,k===1?.17:.15);f.depthGoal=this.rand(-1,1);f.routeChanges++;this.mutations++;this.geometryChanges++;if(this.rand()<.25){f.style=(f.style+1)%4;this.languageChanges++;}if(this.rand()<.24){f.pigmentSpeed=this.rand(-.02,.03);this.paletteChanges++;}}
   let desired=Math.atan2(f.target[1]-head.y,f.target[0]-head.x),steer=angleDelta(desired,f.angle)*.8+f.wantTurn*.6;
   // Three locomotion languages share a material, not a trajectory: broken meanders, coils, branching currents.
   if(k===0){let snapped=Math.round(desired/(PI/3))*(PI/3);steer=angleDelta(snapped,f.angle)*1.8+f.wantTurn*.4;}
   if(k===1){steer+=f.hand*(f.mode===1?2.4:f.mode===2?1.1:.12);}
   if(k===2){steer+=Math.sin(head.x*7+head.y*5+this.time*.32)*.8;}
   let forceX=0,forceY=0;
   if(this.interactionStrength){for(const g of this.forms){if(g===f||g.parent===f.id||f.parent===g.id)continue;for(let i=0;i<g.nodes.length;i+=3){let q=g.nodes[i],ahead=.065,dx=head.x+Math.cos(f.angle)*ahead-q.x,dy=head.y+Math.sin(f.angle)*ahead-q.y,d=Math.hypot(dx,dy)+.0001,range=(f.width+g.width)*.65+.028;if(d<range){let w=(range-d)/range,side=Math.sin(Math.atan2(dy,dx)-f.angle)>0?1:-1;steer+=side*w*1.7;forceX+=dx/d*w*.025;forceY+=dy/d*w*.025;f.grip=Math.max(f.grip,w);this.contacts++;}}
    }
    for(const v of this.eddies){let dx=head.x-v.x,dy=head.y-v.y,w=Math.exp(-(dx*dx+dy*dy)/(v.r*v.r))*Math.sin(v.age/v.life*PI);steer+=w*v.spin*(k===1?1.6:.8);}
   }
   // A soft boundary turns approaching heads back into the composition.
   const margin=.075,look=.1,px=head.x+Math.cos(f.angle)*look,py=head.y+Math.sin(f.angle)*look;
   if(px<margin||px>1-margin||py<margin||py>1-margin){let inward=Math.atan2(.5-head.y,.5-head.x);steer+=angleDelta(inward,f.angle)*4;}
   f.turn+=(clamp(steer,k===1?-2.2:-1.5,k===1?2.2:1.5)-f.turn)*Math.min(1,dt*(k===0?8:4));f.angle+=f.turn*dt;f.grip*=Math.exp(-dt*2.5);
   if(f.branch){const p=this.forms[f.parent],ix=Math.floor(f.attach*(p.nodes.length-1)),q=p.nodes[ix];head.x=q.x;head.y=q.y;head.z=q.z+.01;}
   else{head.x=clamp(head.x+(Math.cos(f.angle)*f.speed+forceX)*dt,.045,.955);head.y=clamp(head.y+(Math.sin(f.angle)*f.speed+forceY)*dt,.045,.955);head.z+=(f.depth-head.z)*dt;}
   // A moving, flexible chain carries turns down its length. Small eddies disturb different sections separately.
   for(let i=1;i<ns.length;i++){let n=ns[i],p=ns[i-1],dx=n.x-p.x,dy=n.y-p.y,d=Math.hypot(dx,dy)+.00001,target=f.spacing*(1+.12*Math.sin(i*.3-this.time*.8+f.phase));let correction=(d-target)/d; n.x-=dx*correction*.65;n.y-=dy*correction*.65;
    if(this.interactionStrength)for(const v of this.eddies){let dx=n.x-v.x,dy=n.y-v.y,w=Math.exp(-(dx*dx+dy*dy)/(v.r*v.r))*v.spin*.045*Math.sin(v.age/v.life*PI);n.x-=dy*w*dt;n.y+=dx*w*dt;}
    if(i<ns.length-1){let q=ns[i+1],w=dt*(k===0?.12:k===1?.5:.2);n.x+=(p.x+q.x-2*n.x)*w;n.y+=(p.y+q.y-2*n.y)*w;}
    n.z+=(Math.sin(i*.16+f.phase+this.time*.22)*.55+f.depth-n.z)*dt*.7;n.x=clamp(n.x,.035,.965);n.y=clamp(n.y,.035,.965);
   }
   // Maintain contour length without snapping positions at a route change.
   for(let pass=0;pass<2;pass++)for(let i=1;i<ns.length;i++){let p=ns[i-1],n=ns[i],dx=n.x-p.x,dy=n.y-p.y,d=Math.hypot(dx,dy)+1e-8,err=(d-f.spacing)/d*.36;if(i>1){p.x+=dx*err*.3;p.y+=dy*err*.3;}n.x-=dx*err*.7;n.y-=dy*err*.7;}
  }
 }
 snapshot(){return structuredClone({...this});}
 restore(s){Object.assign(this,structuredClone(s));caches.delete(this);}
 spine(f){let raw=f.nodes,samples=[],distance=0,last=null,sub=this.kind===0?3:5,smooth=this.kind===0?.18:this.kind===1?1:.5;
  for(let i=0;i<raw.length-1;i++)for(let j=0;j<sub;j++){let t=j/sub,a=raw[Math.max(0,i-1)],b=raw[i],c=raw[i+1],d=raw[Math.min(raw.length-1,i+2)],x=mix(mix(b.x,c.x,t),cat(a.x,b.x,c.x,d.x,t),smooth),y=mix(mix(b.y,c.y,t),cat(a.y,b.y,c.y,d.y,t),smooth),z=mix(b.z,c.z,t);if(last)distance+=Math.hypot(x-last.x,y-last.y);let p={x,y,z,s:distance};samples.push(p);last=p;}
  let n=raw.at(-1);distance+=Math.hypot(n.x-last.x,n.y-last.y);samples.push({x:n.x,y:n.y,z:n.z,s:distance});
  for(let i=0;i<samples.length;i++){let a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],p=samples[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)+1e-8,u=p.s/distance,taper=f.branch?(.18+.82*Math.pow(1-u,.55)):1; p.nx=-dy/d;p.ny=dx/d;p.r=f.width*.5*Math.min(1,f.growth*3)*taper*(1+.09*Math.sin(u*12+f.phase+this.time*.3)+.13*f.pulse*Math.exp(-((u-.5)**2)/.04));}
  return{samples,length:distance};
 }
 at(sp,s,v=0){let ps=sp.samples;s=clamp(s,0,sp.length);let low=0,high=ps.length-1;while(high-low>1){let m=(low+high)>>1;if(ps[m].s<s)low=m;else high=m;}let a=ps[low],b=ps[high],t=(s-a.s)/(b.s-a.s+1e-9),r=mix(a.r,b.r,t),nx=mix(a.nx,b.nx,t),ny=mix(a.ny,b.ny,t);return{x:mix(a.x,b.x,t)+nx*r*v,y:mix(a.y,b.y,t)+ny*r*v,z:mix(a.z,b.z,t)};}
 boundary(b,v,time){return b.wave*(Math.sin(v*b.frequency*PI+b.phase+time*.18)+.3*Math.sin(v*17+b.phase));}
 patch(ctx,size,sp,start,end,left,right,b1,b2){let pts=[],resolution=22;
  // Shared wavy boundaries tile the ribbon without seams, with edge samples around bends.
  for(let i=0;i<=resolution;i++){let v=mix(left,right,i/resolution),s=end+this.boundary(b2,v,this.time);pts.push(this.at(sp,s,v));}
  let a=end+this.boundary(b2,right,this.time),b=start+this.boundary(b1,right,this.time),steps=Math.max(2,Math.ceil(Math.abs(a-b)/.007));for(let i=1;i<=steps;i++)pts.push(this.at(sp,mix(a,b,i/steps),right));
  for(let i=1;i<=resolution;i++){let v=mix(right,left,i/resolution),s=start+this.boundary(b1,v,this.time);pts.push(this.at(sp,s,v));}
  a=start+this.boundary(b1,left,this.time);b=end+this.boundary(b2,left,this.time);steps=Math.max(2,Math.ceil(Math.abs(a-b)/.007));for(let i=1;i<=steps;i++)pts.push(this.at(sp,mix(a,b,i/steps),left));
  ctx.beginPath();for(let i=0;i<pts.length;i++){let p=pts[i];i?ctx.lineTo(p.x*size,p.y*size):ctx.moveTo(p.x*size,p.y*size);}ctx.closePath();
 }
 draw(ctx,size){let k=this.kind,pal=palettes[k];ctx.fillStyle=backgrounds[k];ctx.fillRect(0,0,size,size);let patches=[];
  for(const f of this.forms){if(f.growth<.008)continue;let sp=this.spine(f),offset=f.scroll,chunkSize=sp.length*f.growth/3;
   for(let ci=0;ci<3;ci++){let lo=ci*chunkSize,hi=(ci+1)*chunkSize,p=this.at(sp,(lo+hi)*.5),bands=[];
    for(let i=0;i<f.pattern.length-1;i++){let band=f.pattern[i],next=f.pattern[i+1],start=band.s-offset,end=next.s-offset;if(end<lo-.012||start>hi+.012)continue;bands.push({band,next,start,end});}
    patches.push({f,sp,lo,hi,bands,z:p.z});
   }
  }
  patches.sort((a,b)=>a.z-b.z);
  const straight={wave:0,frequency:1,phase:0};
  for(const chunk of patches){let{f,sp,lo,hi}=chunk;ctx.save();this.patch(ctx,size,sp,lo,hi,-1,1,straight,straight);ctx.fillStyle=colourCSS(f.inks[chunk.bands[0]?.band.tone||0]);ctx.fill();ctx.clip();
   for(const q of chunk.bands){let{band,next,start,end}=q;this.patch(ctx,size,sp,start,end,-1.01,1.01,band,next);ctx.fillStyle=colourCSS(f.inks[band.tone]);ctx.fill();
   // Fine strata lie within the broad colour fields, like printed wood grain.
   if(end-start>.018){ctx.lineWidth=Math.max(.4,size*.00045);ctx.strokeStyle=band.tone%3===0?'rgba(238,230,199,.11)':'rgba(13,36,47,.10)';for(let j=1;j<=band.detail;j++){let u=j/(band.detail+1),s=mix(start,end,u),wave=mix(band.wave,next.wave,u);ctx.beginPath();for(let h=0;h<=24;h++){let v=-1+h/12,ss=s+wave*(Math.sin(v*band.frequency*PI+band.phase+this.time*.18)+.3*Math.sin(v*17+band.phase)),p=this.at(sp,ss,v);h?ctx.lineTo(p.x*size,p.y*size):ctx.moveTo(p.x*size,p.y*size);}ctx.stroke();}
    // A subset has an inset seam, interrupted stitches or a second narrow current.
    if((f.style===2&&k!==0)||f.thin){ctx.strokeStyle=colourCSS(f.inks[(band.tone+3)%pal.length]);ctx.lineWidth=f.thin?size*.001:size*.0009;ctx.beginPath();let n=Math.max(4,Math.ceil((end-start)/.004));for(let j=0;j<=n;j++){let s=mix(start,end,j/n),v=.46+.15*Math.sin(s*40+f.phase),p=this.at(sp,s,v);j?ctx.lineTo(p.x*size,p.y*size):ctx.moveTo(p.x*size,p.y*size);}ctx.stroke();}
    }
   }ctx.restore();
  }
  let c=caches.get(this);if(!c){const tile=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(180,180):Wild.canvasFactory(180,180),tc=tile.getContext('2d'),im=tc.createImageData(180,180);let z=23741+k*151;for(let i=0;i<im.data.length;i+=4){z^=z<<13;z^=z>>>17;z^=z<<5;let v=60+(z>>>0)%140;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}tc.putImageData(im,0,0);c={tile};caches.set(this,c);}
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.19;ctx.fillStyle=ctx.createPattern(c.tile,'repeat');ctx.fillRect(0,0,size,size);ctx.restore();
 }
}

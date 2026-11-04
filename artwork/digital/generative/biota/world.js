import {table,NN} from './neural.js?edition=87';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
export const profiles={
 9:{title:'Soft Ruin',feed:.036,kill:.0612,da:.25,db:.12,flow:.42,scale:1,theme:0},
 10:{title:'Foreign Body',feed:.026,kill:.055,da:.24,db:.115,flow:.60,scale:1.1,theme:1},
 11:{title:'A Slow Becoming',feed:.024,kill:.0538,da:.23,db:.11,flow:.28,scale:.9,theme:2},
 12:{title:'What Remains',feed:.040,kill:.0615,da:.26,db:.12,flow:.50,scale:1,theme:3}
};
export class BiotaWorld{
 constructor(kind,seed,n=224){this.kind=kind;this.seed=seed>>>0||1;this.initialSeed=this.seed;this.n=n;this.tick=0;this.time=0;this.events=0;this.nextMutation=180;this.accumulator=0;this.profile=profiles[kind];this.palettePhase=0;this.targetPalette=0;this.regime=0;this.wounds=0;this.splits=0;this.surges=0;this.nextRegime=900;this.liveEventAt=2;this.folds=0;this.phase=this.rand()*TAU;
 const count=n*n;for(const key of ['a','b','a2','b2','scar','pigment','history2','mask','flowX','flowY','localFeed','c','d','c2','d2','wash','wash2'])this[key]=new Float32Array(count);this.a.fill(1);this.c.fill(1);
 this.vortices=Array.from({length:7},()=>({x:this.rand()*n,y:this.rand()*n,tx:this.rand()*n,ty:this.rand()*n,spin:(this.rand()<.5?-1:1)*(.4+this.rand()*.7),radius:n*(.09+this.rand()*.17)}));
 const phase=this.phase;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,xx=(x/n-.5)*2,yy=(y/n-.5)*2,r=Math.hypot(xx/.90,yy/.92),a=Math.atan2(yy,xx),edge=.075*Math.sin(a*3+phase)+.06*Math.cos(a*7-phase)+.045*Math.sin(x*.09+y*.07+phase);
 this.mask[i]=clamp((1-r+edge)*8);this.localFeed[i]=Math.sin(x*.035+phase)*Math.cos(y*.042-phase)*.0024;
 this.pigment[i]=.5+.25*Math.sin(x*.019+phase)+.16*Math.cos(y*.025-phase);}
 // A family of overlapping growth fronts, not a tiled initial texture.
 for(let k=0;k<54;k++){const a=this.rand()*TAU,r=Math.sqrt(this.rand())*n*.33;this.seedAt(n*.5+Math.cos(a)*r,n*.5+Math.sin(a)*r,2+this.rand()*7,.6);}
 for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++){const i=y*n+x;if(this.mask[i]>.4&&this.rand()<.025){this.d[i]=.35+this.rand()*.2;this.c[i]=.45;}}
 this.updateFlow();
 }
 rand(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 seedAt(cx,cy,radius,strength=.5){const n=this.n;for(let y=Math.max(1,Math.floor(cy-radius*2));y<Math.min(n-1,cy+radius*2);y++)for(let x=Math.max(1,Math.floor(cx-radius*2));x<Math.min(n-1,cx+radius*2);x++){const d=Math.hypot(x-cx,y-cy)/radius;if(d>1.5)continue;const i=y*n+x,m=Math.exp(-d*d*2)*this.mask[i];this.b[i]=Math.max(this.b[i],m*strength);if(this.d){this.d[i]=Math.max(this.d[i],m*.24);this.c[i]=Math.min(this.c[i],1-m*.5);}this.a[i]=Math.min(this.a[i],1-m*.72);this.scar[i]=Math.max(this.scar[i],m*.12);}}
 updateFlow(){const n=this.n,p=this.profile;
 for(const v of this.vortices){if(this.tick%120===0){v.tx=n*(.12+this.rand()*.76);v.ty=n*(.12+this.rand()*.76);}v.x+=(v.tx-v.x)*.055;v.y+=(v.ty-v.y)*.055;}
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x;let vx=0,vy=0;for(const v of this.vortices){const dx=(x-v.x)/v.radius,dy=(y-v.y)/v.radius,s=v.spin/(1+dx*dx+dy*dy)**2;vx-=dy*s;vy+=dx*s;}this.flowX[i]=vx*p.flow;this.flowY[i]=vy*p.flow;}
 }
 sample(field,x,y){const n=this.n;x=clamp(x,0,n-1.001);y=clamp(y,0,n-1.001);const xx=x|0,yy=y|0,f=x-xx,g=y-yy,i=yy*n+xx;return (field[i]*(1-f)+field[i+1]*f)*(1-g)+(field[i+n]*(1-f)+field[i+n+1]*f)*g;}
 step(){const n=this.n,p=this.profile,a=this.a,b=this.b,aa=this.a2,bb=this.b2,scar=this.scar,pig=this.pigment,c=this.c,d=this.d,cc=this.c2,dd=this.d2,wash=this.wash,ww=this.wash2,advect=this.tick%3===0;
 if(this.tick%24===0)this.updateFlow();
 // Each cell perceives neighbouring state; the learned reaction competes with diffusion.
 this.palettePhase+=(this.targetPalette-this.palettePhase)*.0018;
 const feed=p.feed+this.regime*.0025+Math.sin(this.tick*.0009+this.phase)*.0018,kill=p.kill+Math.sin(this.tick*.00051-this.phase)*.0007;
 for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
 const i=y*n+x,A=a[i],B=b[i],lapA=.2*(a[i-1]+a[i+1]+a[i-n]+a[i+n])+.05*(a[i-n-1]+a[i-n+1]+a[i+n-1]+a[i+n+1])-A,lapB=.2*(b[i-1]+b[i+1]+b[i-n]+b[i+n])+.05*(b[i-n-1]+b[i-n+1]+b[i+n-1]+b[i+n+1])-B;
 const u=clamp(A)*NN,v=clamp(B)*NN,ux=Math.min(NN-1,u|0),vy=Math.min(NN-1,v|0),f=u-ux,g=v-vy,j=ux*(NN+1)+vy;
 const reaction=(table[j]*(1-g)+table[j+1]*g)*(1-f)+(table[j+NN+1]*(1-g)+table[j+NN+2]*g)*f;
 const localF=feed+this.localFeed[i]+(pig[i]-.5)*.0014,alive=this.mask[i];
 let na=A+p.da*lapA-reaction+localF*(1-A),nb=B+p.db*lapB+reaction-(kill+localF)*B;
 if(advect){const vx=this.flowX[i],vy=this.flowY[i],flowA=this.sample(a,x-vx,y-vy),flowB=this.sample(b,x-vx,y-vy);na+=(flowA-A)*.75;nb+=(flowB-B)*.75;this.history2[i]=this.sample(pig,x-vx*.3,y-vy*.3);}
 aa[i]=clamp(na);bb[i]=clamp(nb*alive,0,.95);
 const C=c[i],D=d[i],lc=.2*(c[i-1]+c[i+1]+c[i-n]+c[i+n])+.05*(c[i-n-1]+c[i-n+1]+c[i+n-1]+c[i+n+1])-C,ld=.2*(d[i-1]+d[i+1]+d[i-n]+d[i+n])+.05*(d[i-n-1]+d[i-n+1]+d[i+n-1]+d[i+n+1])-D;
 // A finer-scale population shares food and stress with the larger growth fronts.
 const cr=C*D*D,cf=.029+B*.027+(pig[i]-.5)*.008,ck=.057+(scar[i]-.15)*.003;
 cc[i]=clamp(C+.23*lc-cr+cf*(1-C));dd[i]=clamp((D+.10*ld+cr-(cf+ck)*D)*alive,0,.95);
 ww[i]=clamp(wash[i]+.16*(.25*(wash[i-1]+wash[i+1]+wash[i-n]+wash[i+n])-wash[i])+(B-wash[i])*.012);
 
 scar[i]=Math.max(scar[i]*.9990,B*.84);if(advect)pig[i]=clamp(this.history2[i]+(B-.16)*.0008+(scar[i]-.12)*.00018);
 }
 for(let i=0;i<n;i++){aa[i]=aa[(n-1)*n+i]=aa[i*n]=aa[i*n+n-1]=1;bb[i]=bb[(n-1)*n+i]=bb[i*n]=bb[i*n+n-1]=0;}
 this.c=cc;this.c2=c;this.d=dd;this.d2=d;this.wash=ww;this.wash2=wash;this.a=aa;this.a2=a;this.b=bb;this.b2=b;this.tick++;
 if(this.tick>=this.nextMutation){this.mutate();this.nextMutation=this.tick+140+Math.floor(this.rand()*480);}
 }
 mutate(){const n=this.n;this.events++;const cx=n*(.17+this.rand()*.66),cy=n*(.17+this.rand()*.66),r=n*(.05+this.rand()*.09),type=Math.floor(this.rand()*6);this.lastEvent=type;
 if(type===0||type===1){this.splits++;const angle=this.rand()*TAU;for(let k=0;k<4;k++){const a=angle+k*TAU/4;this.seedAt(cx+Math.cos(a)*r*.75,cy+Math.sin(a)*r*.75,r*.35,.42+this.rand()*.2);}}
 else if(type===2){this.wounds++;const a=this.rand()*TAU,co=Math.cos(a),si=Math.sin(a);for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const dx=x-cx,dy=y-cy,along=dx*co+dy*si,across=-dx*si+dy*co,f=Math.exp(-(across*across)/(n*n*.00022)-(along*along)/(r*r*8));const i=y*n+x;this.b[i]*=1-f*.91;this.d[i]*=1-f*.78;this.a[i]=clamp(this.a[i]+f*.5);this.c[i]=clamp(this.c[i]+f*.4);this.scar[i]=Math.max(this.scar[i],f*.27);}}
 else if(type===3){this.surges++;const v=this.vortices[Math.floor(this.rand()*this.vortices.length)];v.x=cx;v.y=cy;v.tx=n*(.1+this.rand()*.8);v.ty=n*(.1+this.rand()*.8);v.spin=(this.rand()<.5?-1:1)*(1+this.rand()*1.7);this.updateFlow();this.seedAt(cx,cy,r*.4,.4);}
 else if(type===4){this.targetPalette+=(this.rand()-.5)*2.5;for(let y=Math.max(1,Math.floor(cy-r*2));y<Math.min(n-1,cy+r*2);y++)for(let x=Math.max(1,Math.floor(cx-r*2));x<Math.min(n-1,cx+r*2);x++){const i=y*n+x,f=Math.exp(-((x-cx)**2+(y-cy)**2)/(r*r));this.pigment[i]=clamp(this.pigment[i]+f*(this.rand()-.5)*.35);this.localFeed[i]=clamp(this.localFeed[i]+f*(this.rand()-.5)*.0025,-.004,.004);}}
 else{this.folds++;this.regime=(this.rand()-.5)*2;this.targetPalette+=(this.rand()-.5)*1.6;
 const fields=[this.a,this.b,this.c,this.d,this.scar],source=fields.map(f=>f.slice()),angle=(this.rand()-.5)*2.4;
 for(let y=Math.max(1,Math.floor(cy-r*2));y<Math.min(n-1,cy+r*2);y++)for(let x=Math.max(1,Math.floor(cx-r*2));x<Math.min(n-1,cx+r*2);x++){const dx=x-cx,dy=y-cy,fall=Math.exp(-(dx*dx+dy*dy)/(r*r)),a=angle*fall,co=Math.cos(a),si=Math.sin(a),xx=cx+dx*co-dy*si,yy=cy+dx*si+dy*co,i=y*n+x;for(let k=0;k<fields.length;k++)fields[k][i]=fields[k][i]*(1-fall)+this.sample(source[k],xx,yy)*fall;}}
 
 }
 advance(dt,steps=3){if(!(dt>0))return;const delta=Math.min(.1,dt);this.accumulator+=delta*30;if(this.accumulator>=1){this.accumulator%=1;for(let i=0;i<steps;i++)this.step();}this.time+=delta;if(this.time>=this.liveEventAt){this.mutate();this.liveEventAt=this.time+2+this.rand()*3.8;}}
 warm(steps=550){for(let i=0;i<steps;i++)this.step();}
 snapshot(){return {kind:this.kind,seed:this.seed,initialSeed:this.initialSeed,n:this.n,tick:this.tick,time:this.time,events:this.events,nextMutation:this.nextMutation,accumulator:this.accumulator,phase:this.phase,palettePhase:this.palettePhase,targetPalette:this.targetPalette,regime:this.regime,wounds:this.wounds,splits:this.splits,surges:this.surges,lastEvent:this.lastEvent,liveEventAt:this.liveEventAt,folds:this.folds,vortices:structuredClone(this.vortices),a:this.a.slice(),b:this.b.slice(),c:this.c.slice(),d:this.d.slice(),wash:this.wash.slice(),scar:this.scar.slice(),pigment:this.pigment.slice(),mask:this.mask.slice(),localFeed:this.localFeed.slice(),flowX:this.flowX.slice(),flowY:this.flowY.slice()};}
 restore(state){if(state.n!==this.n||state.kind!==this.kind)throw Error('Incompatible living state');Object.assign(this,structuredClone(state));this.a2=new Float32Array(this.n*this.n);this.b2=new Float32Array(this.n*this.n);this.history2=new Float32Array(this.n*this.n);this.c2=new Float32Array(this.n*this.n);this.d2=new Float32Array(this.n*this.n);this.wash2=new Float32Array(this.n*this.n);}
}

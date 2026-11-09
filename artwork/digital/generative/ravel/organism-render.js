const PI=Math.PI,TAU=PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const colour=(ink,light=1,alpha=1)=>`rgba(${ink.map(x=>Math.round(clamp(x*light,0,255))).join(',')},${alpha})`;
function transform(x,y,z,b,t){const p=b.p,a=p[3]+Math.sin(t*.23+b.phase)*.08,c=Math.cos(a),s=Math.sin(a);let yy=y*c-z*s,zz=y*s+z*c;x*=1;y=yy;z=zz;const d=p[4],e=Math.cos(d),f=Math.sin(d);let xx=x*e+z*f;zz=-x*f+z*e;x=xx;z=zz;const g=p[5],h=Math.cos(g),j=Math.sin(g);return [x*h-y*j+p[0],x*j+y*h+p[1],z+p[2]];}
export function surface(b,u,v,t,layer=0){const p=b.p,r=p[6]*(1-layer*.14)*(1+.045*Math.sin(t*.8+b.phase)),q=v*TAU,wave=p[11]+t*.31;
 if(b.type===1){const a=u*PI,rr=r*Math.sin(a)*(1+.11*Math.sin(q*9+wave)*Math.sin(a)**2);return transform(rr*Math.cos(q),rr*Math.sin(q)*p[10],r*Math.cos(a)*1.1+.018*Math.sin(q*19+a*17+wave),b,t);}
 const a=b.type===2?(v-.5)*4.7:q,ruffle=Math.sin(a*5+wave)*(1-(p[9]-3)/9)+Math.sin(a*9-wave)*(p[9]-3)/9+.15*Math.sin(a*13-wave*.7),radius=r*u*(.88+.12*Math.sin(a*3+wave)+.06*Math.sin(a*7-wave)),z=p[7]*(u*u-.35)+p[8]*ruffle*u**2-layer*.044;
 return transform(radius*Math.cos(a),radius*Math.sin(a)*p[10],z,b,t);
}
export function renderOrganism(ctx,size,world,quality=1){const t=world.time,angle=t*.065+Math.sin(t*.073)*.25,ca=Math.cos(angle),sa=Math.sin(angle),tilt=.16+Math.sin(t*.11)*.13,ct=Math.cos(tilt),st=Math.sin(tilt),items=[];
 const project=p=>{let x=p[0]*ca+p[2]*sa,z=-p[0]*sa+p[2]*ca,y=p[1]*ct-z*st;z=p[1]*st+z*ct;let scale=size*1.12/(3.8-z);return [size*.5+x*scale,size*.5-y*scale,z,scale];};
 const bg=ctx.createRadialGradient(size*.46,size*.43,0,size*.5,size*.5,size*.7);bg.addColorStop(0,'#34403c');bg.addColorStop(.6,'#1e2826');bg.addColorStop(1,'#101817');ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
 for(const b of world.bodies){if(b.type===1){const p=project(b.p.slice(0,3));items.push({type:'bulb',p,z:p[2],b,r:p[3]*b.p[6]});continue;}const count=Math.round((b.type===1?24:72)*quality),layers=b.type===1?1:2;
  for(let layer=layers-1;layer>=0;layer--){const rows=[];for(let j=0;j<=count;j++){let row=[];for(let i=0;i<=8;i++)row.push(project(surface(b,i/8,j/count,t,layer)));rows.push(row);}
   for(let j=0;j<count;j++){const A=rows[j],B=rows[j+1];
    if(b.type===1){for(let i=0;i<8;i++){const pts=[A[i],A[i+1],B[i+1],B[i]],z=pts.reduce((s,p)=>s+p[2],0)/4;items.push({type:'pod',pts,z,b,i,j});}}
    else {let z=0;for(let i=0;i<=8;i++)z+=(A[i][2]+B[i][2])/18;items.push({type:'sheet',A,B,z,b,j,layer});}
   }
  }
  // Hundreds of small pores and pearl-like nodules follow the skin in three dimensions.
  if(b.type===1){for(let k=0;k<74;k++){let u=.12+.76*((k*.6180339)%1),v=(k*.381966)%1,p=project(surface(b,u,v,t));items.push({type:'pore',p,z:p[2]+.006,b,r:(.008+.004*Math.sin(k*2.3))*p[3]});}}
 }
 for(const f of world.filaments){const b=world.bodies[f.body],p=surface(b,f.u,f.v,t),points=[];for(let i=0;i<=12;i++){let u=i/12,a=f.phase+t*(.35+f.length)+u*3.7;points.push(project([p[0]+Math.cos(a)*f.length*u,p[1]+f.length*u*.8+Math.sin(a*1.3)*u*.06,p[2]+Math.sin(a)*f.length*u]));}items.push({type:'filament',points,z:points[6][2],b});}
 items.sort((a,b)=>a.z-b.z);ctx.lineJoin='round';
 for(const it of items){const b=it.b;
  if(it.type==='bulb'){const {p,r}=it;const g=ctx.createRadialGradient(p[0]-r*.3,p[1]-r*.35,r*.05,p[0],p[1],r);g.addColorStop(0,colour(b.ink,1.3));g.addColorStop(.45,colour(b.ink,1));g.addColorStop(.85,colour(b.ink,.55));g.addColorStop(1,colour(b.ink,.2));ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p[0],p[1],r,r*b.p[10],b.p[5],0,TAU);ctx.fill();ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(b.p[5]);ctx.scale(1,b.p[10]);for(let k=0;k<95;k++){let a=k*2.39996,d=r*Math.sqrt((k+.5)/95)*.92,x=Math.cos(a)*d,y=Math.sin(a)*d,rr=r*(.018+.008*Math.sin(k*1.7+t*.5));ctx.fillStyle=colour(b.ink,.3);ctx.beginPath();ctx.ellipse(x,y,rr,rr*.65,a,0,TAU);ctx.fill();ctx.strokeStyle=colour(b.ink,1.3,.55);ctx.lineWidth=.7;ctx.stroke();}ctx.restore();
  }else if(it.type==='sheet'){let {A,B,j,layer}=it;const edgeA=A[8],edgeB=B[8],delta=edgeA[2]-A[1][2],light=clamp(.78+delta*.45+Math.sin(j*.37+b.phase)*.09,.35,1.18),g=ctx.createLinearGradient(A[0][0],A[0][1],edgeA[0],edgeA[1]);g.addColorStop(0,colour(b.ink,.28));g.addColorStop(.3,colour(b.ink,light*.63));g.addColorStop(.76,colour(b.ink,light));g.addColorStop(1,colour(b.ink,light*1.21));ctx.beginPath();A.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0],p[1]));for(let i=8;i>=0;i--)ctx.lineTo(B[i][0],B[i][1]);ctx.closePath();ctx.fillStyle=g;ctx.fill();
   // Anatomical radial gills, secondary capillaries and a pale curled lip.
   ctx.strokeStyle=colour(b.ink,light*1.3,.43);ctx.lineWidth=.48;ctx.beginPath();A.slice(1).forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0],p[1]));ctx.stroke();ctx.strokeStyle=colour(b.ink,.33,.36);ctx.lineWidth=.6;ctx.beginPath();for(let i=2;i<=8;i++){let x=(A[i][0]+B[i][0])*.5,y=(A[i][1]+B[i][1])*.5;ctx[i===2?'moveTo':'lineTo'](x,y);}ctx.stroke();
   ctx.strokeStyle=colour(b.ink,1.27,.75);ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(edgeA[0],edgeA[1]);ctx.lineTo(edgeB[0],edgeB[1]);ctx.stroke();
   if(layer===0&&j%5===0){ctx.strokeStyle=colour(b.ink,1.13,.24);ctx.lineWidth=.4;for(let i=3;i<8;i++){ctx.beginPath();ctx.moveTo(A[i][0],A[i][1]);ctx.lineTo(B[i+1][0],B[i+1][1]);ctx.stroke();}}
  }else if(it.type==='pod'){const {pts,i,j}=it,light=.45+.62*Math.max(0,Math.sin(i/8*PI)*(.55+.45*Math.cos(j*.143)));ctx.fillStyle=ctx.strokeStyle=colour(b.ink,light);ctx.lineWidth=.6;ctx.beginPath();pts.forEach((p,k)=>ctx[k?'lineTo':'moveTo'](p[0],p[1]));ctx.closePath();ctx.fill();ctx.stroke();
  }else if(it.type==='pore'){const {p,r}=it;if(r<.3)continue;ctx.fillStyle=colour(b.ink,.32);ctx.beginPath();ctx.ellipse(p[0],p[1],r,r*.65,Math.sin(p[2]),0,TAU);ctx.fill();ctx.strokeStyle=colour(b.ink,1.22,.72);ctx.lineWidth=.65;ctx.stroke();ctx.fillStyle=colour(b.ink,1.3,.7);ctx.beginPath();ctx.arc(p[0]-.25*r,p[1]-.45*r,.3*r,0,TAU);ctx.fill();
  }else{ctx.strokeStyle=colour(b.ink,1.1,.65);ctx.lineWidth=size*.001;ctx.beginPath();it.points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0],p[1]));ctx.stroke();const p=it.points[12];ctx.fillStyle=colour(b.ink,1.25);ctx.beginPath();ctx.arc(p[0],p[1],size*.0014,0,TAU);ctx.fill();}
 }
}

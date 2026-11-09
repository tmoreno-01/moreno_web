// Depth-sorted curved surface strips: a lightweight software projection of the same 3D skeleton.
function curve(body,s){let f=Math.max(0,Math.min(.99999,s))*7,i=Math.floor(f),t=f-i,p=body.points,a=p[Math.max(0,i-1)],b=p[i],c=p[Math.min(7,i+1)],d=p[Math.min(7,i+2)];return b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t));}
export function renderSculpture(ctx,size,world,quality=1){const t=world.time,a=t*.035+Math.sin(t*.041)*.2,b=-.24+Math.sin(t*.071)*.14,c=Math.cos(a),s=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),pieces=[];
 const rot=p=>[c*p[0]+s*p[2],sb*s*p[0]+cb*p[1]-sb*c*p[2],-cb*s*p[0]+sb*p[1]+cb*c*p[2]],project=p=>[size*(.5+p[0]*1.15/(4.6-p[2])),size*(.5-p[1]*1.15/(4.6-p[2]))];
 const bg=ctx.createRadialGradient(size*.48,size*.43,0,size*.5,size*.5,size*.7);bg.addColorStop(0,'#303b39');bg.addColorStop(1,'#101717');ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
 for(const body of world.bodies){const count=Math.round((body.style===0?84:70)*quality),rows=[];
  for(let i=0;i<=count;i++){let u=Math.max(.0002,Math.min(.9998,i/count)),p=rot(curve(body,u*body.growth)),q=project(p),fold=Math.sin(u*body.twist*3+body.phase+t*.23),radius=size*1.15/(4.6-p[2])*body.width*Math.pow(Math.max(.001,Math.sin(u*Math.PI)),.48)*(1+fold*(body.style===0?.28:.1));rows.push({p,q,r:radius});}
  for(let i=0;i<count;i++){let A=rows[i],B=rows[i+1],dx=B.q[0]-A.q[0],dy=B.q[1]-A.q[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;pieces.push({A,B,nx,ny,z:(A.p[2]+B.p[2])*.5,body,i,count});}
 }
 pieces.sort((a,b)=>a.z-b.z);
 for(const {A,B,nx,ny,body,i,count,z} of pieces){const mx=(A.q[0]+B.q[0])*.5,my=(A.q[1]+B.q[1])*.5,r=(A.r+B.r)*.5;if(r<.1)continue;const grad=ctx.createLinearGradient(mx-nx*r,my-ny*r,mx+nx*r,my+ny*r),shade=(v)=>`rgb(${body.colour.map((c,k)=>Math.max(0,Math.min(255,Math.round(255*(c*v+(v>1?(v-1)*.16:0)))))).join(',')})`;grad.addColorStop(0,shade(.23));grad.addColorStop(.23,shade(.65));grad.addColorStop(.48,shade(1.25));grad.addColorStop(.61,shade(.94));grad.addColorStop(1,shade(.27));ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(A.q[0]+nx*A.r,A.q[1]+ny*A.r);ctx.lineTo(B.q[0]+nx*B.r,B.q[1]+ny*B.r);ctx.lineTo(B.q[0]-nx*B.r,B.q[1]-ny*B.r);ctx.lineTo(A.q[0]-nx*A.r,A.q[1]-ny*A.r);ctx.closePath();ctx.fill();ctx.strokeStyle=grad;ctx.lineWidth=.65;ctx.stroke();
  // Raised transverse lamellae and fine longitudinal fibres stay attached to each surface.
  ctx.lineWidth=body.style===0?.65:.4;ctx.strokeStyle='rgba(226,217,187,.3)';ctx.beginPath();ctx.moveTo(mx-nx*r*.84,my-ny*r*.84);ctx.quadraticCurveTo(mx+ny*r*.26,my-nx*r*.26,mx+nx*r*.84,my+ny*r*.84);ctx.stroke();
  if(body.style===0){ctx.strokeStyle='rgba(17,27,24,.3)';ctx.lineWidth=.6;for(let n=-2;n<=2;n++){let v=n*.28+Math.sin(i*.2+body.twist)*.05;ctx.beginPath();ctx.moveTo(A.q[0]+nx*A.r*v,A.q[1]+ny*A.r*v);ctx.lineTo(B.q[0]+nx*B.r*v,B.q[1]+ny*B.r*v);ctx.stroke();}}
 }
}

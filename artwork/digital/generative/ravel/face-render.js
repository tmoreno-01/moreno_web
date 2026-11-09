const PI=Math.PI,TAU=PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const rgb=(c,f=1,a=1)=>`rgba(${c.map(x=>Math.round(clamp(x*f,0,255))).join(',')},${a})`;
export function renderFace(ctx,size,world,quality=1){const p=world.bodies.map(b=>b.value),t=world.time,C=world.inks;
 ctx.setTransform(size/1000,0,0,size/1000,0,0);
 const bg=ctx.createRadialGradient(470,420,40,500,480,650);bg.addColorStop(0,'#303c39');bg.addColorStop(.65,'#172420');bg.addColorStop(1,'#101815');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,1000);
 const yaw=p[0]*.33,roll=p[1]*.12,cs=Math.cos(roll),sn=Math.sin(roll);
 function P(x,y,z=0){x+=.085*p[4]*Math.sin(y*5+p[5]*2)+.045*Math.sin(y*9+t*.33)*p[6];y+=.055*p[7]*Math.sin(x*5+y*4);const xx=x*Math.cos(yaw)+z*Math.sin(yaw);return [500+(xx*cs-y*sn)*440+p[2]*20,490+(xx*sn+y*cs)*440+p[3]*18-z*15];}
 function path(points,close=true){ctx.beginPath();points.forEach((pt,i)=>{const q=P(...pt);ctx[i?'lineTo':'moveTo'](q[0],q[1]);});if(close)ctx.closePath();}
 function head(a,scale=1,z=0){let y=Math.sin(a),width=.68-.16*Math.max(0,y)+p[8]*.09*Math.sin(3*a),x=Math.cos(a)*width;return [x*scale,(y*.91+.055*p[9]*Math.sin(a*4))*scale,z];}
 // Stacked, shaded shell: the whole silhouette bends before facial features are laid into it.
 for(let k=17;k>=0;k--){const z=(17-k)*.008,s=1+k*.005,pts=[];for(let j=0;j<180;j++){let a=j/180*TAU,q=head(a,s,z);q[0]+=k*.0014*p[9]*Math.sin(a*5+t*.21);q[1]+=k*.0015;pts.push(q);}path(pts);const g=ctx.createLinearGradient(180,140,760,820);g.addColorStop(0,rgb(C[0],1.13-k*.024));g.addColorStop(.4,rgb(C[0],.95-k*.023));g.addColorStop(.75,rgb(C[4],.65-k*.018));g.addColorStop(1,rgb(C[1],.42-k*.009));ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=rgb(C[0],1.25,.13);ctx.lineWidth=.6;ctx.stroke();}
 // Flowing anatomical striations wrap the cheeks and forehead in different directions.
 ctx.save();path(Array.from({length:160},(_,j)=>head(j/160*TAU)));ctx.clip();
 for(let side of [-1,1])for(let i=0;i<72;i++){const u=i/71,pts=[];for(let j=0;j<=45;j++){let v=j/45,y=-.88+v*1.7,x=side*(.12+u*.55+Math.sin(v*PI*2+p[10]*.8)*.045*(1-u));x+=side*.09*Math.exp(-(((y-.1)/.3)**2))*Math.sin(u*4+p[11]);pts.push([x,y,.1+.06*Math.sin(v*PI)]);}path(pts,false);ctx.strokeStyle=rgb(side<0?C[0]:C[1],i%4===0?1.24:.48,i%4===0?.36:.2);ctx.lineWidth=i%4===0?1.2:.6;ctx.stroke();}
 for(const dot of world.pores){const [x,y]=P(dot.x,dot.y,.13),r=dot.r*440*(1+.17*Math.sin(t*.5+dot.phase));ctx.fillStyle='rgba(25,36,31,.19)';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.fillStyle='rgba(230,217,183,.24)';ctx.beginPath();ctx.arc(x-r*.3,y-r*.7,r*.45,0,TAU);ctx.fill();}ctx.restore();
 // Raised laminar folds break the surface into independently slipping anatomical regions.
 for(let side of [-1,1])for(let k=0;k<18;k++){const pts=[],phase=p[side<0?13:15],base=.014*k;for(let j=0;j<=70;j++){let u=j/70,x=side*(.08+u*.51),y=-.47-base*.9+.12*Math.sin(u*PI)+phase*.08*Math.sin(u*5);pts.push([x,y,.15+.07*Math.sin(u*PI)]);}for(let j=70;j>=0;j--){let u=j/70,x=side*(.08+u*.51),y=-.47-base*.9+.12*Math.sin(u*PI)+phase*.08*Math.sin(u*5)+.009*Math.sin(u*PI);pts.push([x,y,.16]);}path(pts);ctx.fillStyle=rgb(C[side<0?4:1],.55+k*.025,.85);ctx.fill();ctx.strokeStyle=rgb(C[0],1.25,.2);ctx.lineWidth=.5;ctx.stroke();}
 for(let k=0;k<22;k++){const pts=[];for(let j=0;j<=80;j++){let a=.08+PI*j/80,x=Math.cos(a)*(.36+k*.009),y=.42+Math.sin(a)*(.27+k*.007)+p[24]*.07*Math.sin(a*3);pts.push([x,y,.1+k*.002]);}path(pts,false);ctx.strokeStyle=rgb(C[k%3===0?0:4],k%3===0?1.2:.4,.32);ctx.lineWidth=k%3===0?1.4:.8;ctx.stroke();}
 // Sculpted regional plates open and shear independently, without losing the face's anatomy.
 function plate(cx,cy,rx,ry,tilt,tone,phase){const co=Math.cos(tilt),si=Math.sin(tilt);for(let k=27;k>=0;k--){const s=.16+k*.039,pts=[];for(let j=0;j<100;j++){const a=j/100*TAU,rr=1+.12*Math.sin(a*3+phase+t*.25)+.07*Math.sin(a*7-phase+t*.17),x=rx*s*Math.cos(a)*rr,y=ry*s*Math.sin(a)*rr;pts.push([cx+x*co-y*si,cy+x*si+y*co,.17-k*.009+.04*Math.sin(a)]);}path(pts);const A=P(cx-rx,cy-ry,.2),B=P(cx+rx,cy+ry,.2),g=ctx.createLinearGradient(...A,...B);g.addColorStop(0,rgb(tone,1.23-k*.012));g.addColorStop(.5,rgb(tone,1.04-k*.012));g.addColorStop(1,rgb(tone,.36+k*.004));ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=rgb(tone,1.3,.32);ctx.lineWidth=.75;ctx.stroke();}}
 plate(-.41+p[12]*.04,.24,.17,.28,-.2+p[13]*.25,C[1],1);
 plate(.43+p[14]*.035,.19,.145,.3,.25+p[15]*.3,C[2],3);
 plate(p[9]*.07,-.66,.27,.15,p[16]*.22,C[0],2);
 // Laminated sockets and mouth: dark negative space, no cartoon eyes or teeth.
 function aperture(cx,cy,rx,ry,tilt,tone,phase,isMouth=false){const co=Math.cos(tilt),si=Math.sin(tilt),loop=(scale,depth)=>{const pts=[];for(let j=0;j<120;j++){const a=j/120*TAU,rr=1+.14*Math.sin(a*3+phase+t*.37)+.045*Math.sin(a*7-phase),x=rx*scale*Math.cos(a)*rr,y=ry*scale*Math.sin(a)*(isMouth?1+.2*Math.sin(a*2+p[23]):.68+.32*Math.abs(Math.sin(a)));pts.push([cx+x*co-y*si,cy+x*si+y*co,depth+.025*Math.cos(a*2+phase)]);}return pts;};
  for(let k=13;k>=0;k--){const s=1+k*.048;path(loop(s,.23-k*.009));const A=P(cx-rx,cy-ry,.2),B=P(cx+rx,cy+ry,.2),g=ctx.createLinearGradient(...A,...B);g.addColorStop(0,rgb(tone,1.2-k*.018));g.addColorStop(.42,rgb(tone,.82-k*.013));g.addColorStop(1,rgb(tone,.22));ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=rgb(tone,1.32,.38);ctx.lineWidth=k%3===0?.85:.45;ctx.stroke();}
  path(loop(.97,.24));let A=P(cx-rx*.25,cy-ry*.3,.2),B=P(cx,cy,.2),g=ctx.createRadialGradient(A[0],A[1],1,B[0],B[1],rx*430);g.addColorStop(0,'#040d0c');g.addColorStop(.67,'#0a1715');g.addColorStop(1,rgb(tone,.25));ctx.fillStyle=g;ctx.fill();
  // Thin nested inner folds make the hollow feel deep and continuously alive.
  for(let k=0;k<9;k++){const s=.9-k*.065;path(loop(s,.21-k*.009));ctx.strokeStyle=rgb(tone,.7+k*.025,.18);ctx.lineWidth=.7;ctx.stroke();}
 }
 const leftY=-.23+p[17]*.14,rightY=-.25+p[18]*.14;
 aperture(-.29+p[12]*.11,leftY,.18*(1+p[19]*.42),.085*(1+p[20]*.72),-.15+p[13]*.7,C[4],p[10]*3);
 aperture(.29+p[14]*.11,rightY,.175*(1-p[19]*.42),.088*(1-p[21]*.73),.14+p[15]*.7,C[1],p[11]*3);
 // Twisting nasal bridge is one continuous raised surface, with independently flexing ridges.
 for(let k=20;k>=0;k--){let f=k/20,pts=[];for(let j=0;j<=50;j++){let u=j/50,y=-.43+u*.71,x=p[22]*.17*Math.sin(u*PI)+.035*Math.sin(u*4+p[16]),w=(.032+.07*Math.pow(u,3))*f;pts.push([x-w,y,.3+.13*Math.sin(u*PI)]);}for(let j=50;j>=0;j--){let u=j/50,y=-.43+u*.71,x=p[22]*.17*Math.sin(u*PI)+.035*Math.sin(u*4+p[16]),w=(.032+.07*Math.pow(u,3))*f;pts.push([x+w,y,.3+.13*Math.sin(u*PI)]);}path(pts);ctx.fillStyle=rgb(C[0],.4+.7*(1-f));ctx.fill();ctx.strokeStyle=rgb(C[0],1.2,.17);ctx.lineWidth=.6;ctx.stroke();}
 aperture(p[23]*.09,.47+p[24]*.06,.25*(1+p[25]*.48),.045+.065*(p[21]+1)*.5,p[24]*.5,C[2],p[23]*3,true);
 // Fine independent tendrils peel away from the temples and jaw edges.
 for(let side of [-1,1])for(let i=0;i<15;i++){let yy=-.58+i*.085,xx=side*(.65-.13*Math.max(0,yy)),pts=[];for(let j=0;j<=24;j++){let u=j/24,a=i*.9+t*(.18+i*.007)+side;pts.push([xx+side*u*(.06+.035*Math.sin(a+u*4)),yy+u*.075*Math.sin(a*.7+u*5),.07+u*.06]);}path(pts,false);ctx.strokeStyle=rgb(C[i%6],1.15,.4);ctx.lineWidth=.55;ctx.stroke();}
 ctx.setTransform(1,0,0,1,0,0);
}

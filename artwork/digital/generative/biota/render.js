const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const themes=[
 {paper:[237,231,220],stops:[[.0,[227,218,206]],[.08,[125,111,123]],[.20,[44,34,48]],[.40,[94,65,92]],[.62,[151,103,113]],[.78,[197,169,155]],[.91,[216,208,185]],[1,[43,43,46]]],accent:[124,49,40],vein:[206,183,134]},
 {paper:[29,26,32],stops:[[0,[40,32,40]],[.13,[66,38,46]],[.30,[131,64,55]],[.48,[186,117,88]],[.65,[214,164,122]],[.82,[225,212,173]],[1,[63,48,53]]],accent:[92,88,112],vein:[215,180,117]},
 {paper:[235,232,218],stops:[[0,[211,218,199]],[.13,[143,163,144]],[.29,[49,87,81]],[.46,[34,57,61]],[.65,[114,149,128]],[.83,[184,190,151]],[1,[223,208,165]]],accent:[133,98,72],vein:[187,157,96]},
 {paper:[238,229,218],stops:[[0,[215,196,188]],[.11,[158,122,122]],[.29,[81,40,51]],[.46,[119,57,64]],[.63,[163,94,89]],[.80,[218,165,146]],[.94,[222,207,182]],[1,[46,39,48]]],accent:[78,70,88],vein:[210,175,124]}
];
function table(theme){const lut=new Float32Array(512*16*3);for(let p=0;p<16;p++)for(let i=0;i<512;i++){const v=i/511;let k=0;while(k<theme.stops.length-2&&v>theme.stops[k+1][0])k++;const [a,c]=theme.stops[k],[b,d]=theme.stops[k+1],f=clamp((v-a)/(b-a)),t=clamp((p/15-.36)*1.5)*.42;for(let j=0;j<3;j++)lut[(p*512+i)*3+j]=mix(mix(c[j],d[j],f),theme.accent[j],t);}return lut;}
// Native simulation-grid shading; detailed contours are drawn as vectors afterward.
export function createRenderer(canvas,world){const ctx=canvas.getContext('2d',{alpha:false}),n=world.n,theme=themes[world.profile.theme],lut=table(theme),paper=theme.paper;
 const make=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
 const surface=make(n,n),sx=surface.getContext('2d',{alpha:false}),im=sx.createImageData(n,n),pixels=im.data,field=new Float32Array(n*n),grain=make(256,256),gx=grain.getContext('2d'),gim=gx.createImageData(256,256);let r=world.initialSeed;
 for(let i=0;i<gim.data.length;i+=4){r=(Math.imul(r,1664525)+1013904223)|0;const v=(r>>>24)>127?255:0;gim.data[i]=gim.data[i+1]=gim.data[i+2]=v;gim.data[i+3]=10;}gx.putImageData(gim,0,0);
 const overlay=make(n*4,n*4),ox=overlay.getContext('2d');let serial=0;
 const edges=[[0,1],[1,2],[2,3],[3,0]],offsets=[[0,0],[1,0],[1,1],[0,1]],values=new Float32Array(4),crossings=new Float32Array(8);
 return(size)=>{const b=world.b,d=world.d,h=world.scar,pig=world.pigment,wash=world.wash,mask=world.mask;
 for(let i=0;i<n*n;i++)field[i]=b[i]*.62+d[i]*.48;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,B=b[i],D=d[i],H=h[i],P=pig[i],W=wash[i],density=clamp(B*2.4+D*1.7+W*.7),ink=clamp((B-.008)*11+H*.65+W*1.8)*mask[i];
 const phase=P*8+H*3+W*4+(world.palettePhase||0),tone=clamp(density+.28*Math.sin(phase)),idx=((clamp(P+D*.25)*15|0)*512+(tone*511|0))*3;
 const dx=x>0&&x<n-1?field[i+1]-field[i-1]:0,dy=y>0&&y<n-1?field[i+n]-field[i-n]:0,shade=clamp(1+dx*1.3-dy*1.8,.72,1.19),ridge=clamp(1-Math.abs(D-.24)*26)*.10;
 const at=i*4;for(let k=0;k<3;k++){const material=mix(lut[idx+k]*shade,theme.vein[k],ridge),ground=mix(paper[k],theme.stops[1][1][k],clamp((H+W)*1.4)*mask[i]*.17);pixels[at+k]=mix(ground,material,ink);}pixels[at+3]=255;}
 sx.putImageData(im,0,0);ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(surface,0,0,size,size);
 // Marching contours remain crisp at fullscreen without shading millions of pixels.
 if(serial++%3===0){ox.setTransform(1,0,0,1,0,0);ox.clearRect(0,0,n*4,n*4);ox.setTransform(4,0,0,4,0,0);ox.lineWidth=.13;
 const dark=world.profile.theme===1;
 for(const threshold of [.115,.19,.265]){ox.beginPath();for(let y=1;y<n-2;y++)for(let x=1;x<n-2;x++){const i=y*n+x;if(mask[i]<.2||b[i]+d[i]<.06)continue;values[0]=field[i];values[1]=field[i+1];values[2]=field[i+n+1];values[3]=field[i+n];let count=0;
 for(let e=0;e<4;e++){const a=edges[e][0],bb=edges[e][1],va=values[a],vb=values[bb];if((va<threshold)===(vb<threshold))continue;const f=(threshold-va)/(vb-va);crossings[count++]=x+offsets[a][0]+(offsets[bb][0]-offsets[a][0])*f;crossings[count++]=y+offsets[a][1]+(offsets[bb][1]-offsets[a][1])*f;}
 for(let k=0;k+3<count;k+=4){ox.moveTo(crossings[k],crossings[k+1]);ox.lineTo(crossings[k+2],crossings[k+3]);}}
 ox.strokeStyle=dark?'rgba(246,218,170,.27)':'rgba(38,28,41,.24)';ox.stroke();}
}
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(overlay,0,0,size,size);
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=.32;ctx.fillStyle=ctx.createPattern(grain,'repeat');ctx.fillRect(0,0,size,size);ctx.globalAlpha=1;
 };
}

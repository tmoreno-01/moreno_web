import{colors}from'./world.js?edition=84';
const clamp=x=>Math.max(0,Math.min(1,x)),papers=new WeakMap();
function stroke(ctx,s,progress,opacity,width,erase=0){if(progress<=0||opacity<.008)return;const points=s.pts,total=points.length/2,limit=Math.min(total-1,progress*(total-1)),whole=Math.floor(limit);if(whole<1)return;
 ctx.globalAlpha=opacity;ctx.strokeStyle=colors[s.color];ctx.lineCap='round';ctx.lineJoin='round';
 // The pen changes pressure within a stroke, including a fine taper at entry and exit.
 for(let band=0;band<3;band++){ctx.lineWidth=width*s.width*(.62+band*.38);ctx.beginPath();let connected=false;for(let i=1;i<=whole;i++){const t=i/(total-1),pressure=Math.sin(t*Math.PI)*.50+.25+.17*Math.sin(t*11+s.phase),bucket=Math.min(2,Math.max(0,Math.floor(pressure*3))),hide=erase>0&&t<erase;if(bucket!==band||hide){connected=false;continue;}if(!connected)ctx.moveTo(points[(i-1)*2],points[(i-1)*2+1]);ctx.lineTo(points[i*2],points[i*2+1]);connected=true;}ctx.stroke();}
 if(limit-whole>0&&whole<total-1){ctx.lineWidth=width*s.width*.8;ctx.beginPath();ctx.moveTo(points[whole*2],points[whole*2+1]);const f=limit-whole;ctx.lineTo(points[whole*2]+(points[whole*2+2]-points[whole*2])*f,points[whole*2+1]+(points[whole*2+3]-points[whole*2+1])*f);ctx.stroke();}
}
export function renderErrata(ctx,size,world){ctx.setTransform(size/1000,0,0,size/1000,0,0);ctx.fillStyle='#eee9de';ctx.fillRect(0,0,1000,1000);
 let grain=papers.get(ctx);if(!grain){const im=ctx.createImageData(160,160);let n=world.initialSeed;for(let k=0;k<im.data.length;k+=4){n=(Math.imul(n,1664525)+1013904223)|0;const v=(n>>>24)>128?255:90;im.data[k]=v;im.data[k+1]=v;im.data[k+2]=v;im.data[k+3]=12;}if(typeof OffscreenCanvas!=='undefined'){grain=new OffscreenCanvas(160,160);grain.getContext('2d').putImageData(im,0,0);papers.set(ctx,grain);}}
 if(grain){ctx.globalAlpha=.45;ctx.fillStyle=ctx.createPattern(grain,'repeat');ctx.fillRect(0,0,1000,1000);ctx.globalAlpha=1;}
 for(const n of world.notes){const age=world.time-n.birth;if(age<0)continue;const width=(n.weight||1)*(n.size>48?1.25:.85);
  const death=new Map(n.letters.map(l=>[l.index,l]));
  for(const s of n.strokes){const letter=death.get(s.letter),elapsed=age-s.start;let progress=clamp(elapsed/s.duration),opacity=.82,erase=0;if(letter&&age>letter.death){const gone=clamp((age-letter.death)/letter.fade);if(n.mode===0)opacity*=1-gone;else if(n.mode===1)erase=gone;else if(n.mode===2)progress*=1-gone;else opacity*=1-clamp(gone*3);opacity=Math.max(opacity,letter.ghost*(1-clamp((age-letter.death-4)/5)));}stroke(ctx,s,progress,opacity,width,erase);}
  for(const s of n.marks){const progress=clamp((age-s.start)/s.duration),opacity=.67*(1-clamp((age-n.markDeath)/4));stroke(ctx,s,progress,opacity,width);}
 }
 for(const l of world.links){stroke(ctx,l.stroke,clamp((world.time-l.stroke.start)/l.stroke.duration),.35*(1-clamp((world.time-l.death)/5)),.8);}
 ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);
}

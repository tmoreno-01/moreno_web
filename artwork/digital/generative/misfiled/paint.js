import {hash,random,bookFormat} from './world.js?142';

const palette = ['#982f22','#772f35','#292324','#2e3d3e','#35605c','#5b6749','#7c7437','#ac7738','#b65331','#b9aa86','#e2d6bb','#cdc4aa','#424757','#3b536a','#684657','#826c52','#222b28','#b48f61','#694132','#aa4d41','#536b6b','#2b353f','#d6ceb3','#543d31'];
const woods = [[143,98,65],[99,68,52],[176,131,87],[127,82,58],[114,80,59],[157,116,78],[139,108,80],[86,64,51]];
export function canvas(w,h) {
  const width=Math.max(1,Math.round(w)),height=Math.max(1,Math.round(h));
  if(typeof document==='undefined')return new OffscreenCanvas(width,height);
  const c=document.createElement('canvas'); c.width=width;c.height=height;return c;
}
function noise(ctx,w,h,r,amount=20){
  const pix=ctx.getImageData(0,0,w,h);
  for(let i=0;i<pix.data.length;i+=4){
    const n=(r.next()-.5)*amount;
    pix.data[i]+=n; pix.data[i+1]+=n; pix.data[i+2]+=n;
  }
  ctx.putImageData(pix,0,0);
}
// Rift, quarter and flat cuts expose different parts of the growth rings.
export function paintWood(ctx,w,h,index,draft=false){
  if(draft){
    const [r,g,b]=woods[index%woods.length];
    const grain=ctx.createLinearGradient(0,0,0,h);
    grain.addColorStop(0,`rgb(${r-19},${g-16},${b-12})`);
    grain.addColorStop(.42,`rgb(${r+9},${g+7},${b+5})`);
    grain.addColorStop(1,`rgb(${r-13},${g-11},${b-9})`);
    ctx.fillStyle=grain;ctx.fillRect(0,0,w,h);
    return;
  }
  const species=index%woods.length, r=random(hash(index,7612));
  const rgb=woods[species], cut=Math.floor(index/woods.length), drift=(r.next()-.5)*.55;
  const bend=.15+r.next()*.80, center=.14+r.next()*.72;
  const rings=13+r.next()*20, tint=(r.next()-.5)*20;
  const cutDepths=[0,.06,.13,.24,.34,.42,.52,.64,.81];
  const cutDepth=cutDepths[cut];
  const curve=cut<3?.37:cut<6?.68:1;
  const phase=r.next()*Math.PI*2, xCenter=.17+r.next()*.63;
  const knots=Array.from({length:cut<3?index%3===0?1:0:cut>5?2:1},()=>({
    x:.09+r.next()*.82,y:.13+r.next()*.74,reach:.043+r.next()*.125,
    width:.055+r.next()*.099,push:.045+r.next()*.09,
  }));
  const pixels=ctx.createImageData(w,h);
  const profile=Array.from({length:w},(_,x)=>{
    const u=x/w;
    return {u,patina:.5+.5*Math.sin(u*5.7+phase),depth:cutDepth+bend*(u-xCenter)**2,
      bow:drift*(u-.5)+curve*(.059*Math.sin(u*5.6+phase)+.016*Math.sin(u*17.3+phase))};
  });
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const {u,patina,depth,bow}=profile[x], v=y/h, low=v-center;
    let warped=low+bow, knotTone=0;
    for(const k of knots){
      const dx=(u-k.x)/k.reach,dy=(v-k.y)/k.width;
      const envelope=Math.exp(-dx*dx*.74-dy*dy*.36);
      warped+=k.push*envelope*Math.atan(dy*2.7);
      knotTone+=Math.exp(-dx*dx*2.1-dy*dy*3.8)*25;
    }
    const radial=cut<3?warped+depth*curve:Math.hypot(warped*(1+curve*.28),depth);
    const wave=radial*rings+.44*Math.sin(radial*27+phase)+.17*Math.sin(radial*89+u*3);
    const season=wave-Math.floor(wave);
    const ray=Math.max(0,1-Math.abs(season-.78)*7)**2;
    const slow=Math.sin(radial*21.1+phase)*7+Math.sin(v*8.1+u*2.9+phase)*5;
    const stripe=Math.sin(warped*212+Math.cos(u*3.9)*2)*2.8;
    const fibers=Math.sin(warped*391+u*7.3)*Math.sin(warped*87+phase)*1.8;
    const pore=(r.next()-.5)*8-(r.next()<.017?7+r.next()*12:0);
    const edgeStain=Math.max(0,1-5.3*Math.min(v,1-v));
    const tone=tint+slow+stripe+fibers+pore-ray*(13+7*Math.sin(radial*47+phase))-knotTone
      -edgeStain*(2+5*patina)-patina*2.2;
    const p=(y*w+x)*4;
    pixels.data[p]=rgb[0]+tone;pixels.data[p+1]=rgb[1]+tone*.86;
    pixels.data[p+2]=rgb[2]+tone*.64;pixels.data[p+3]=255;
  }
  ctx.putImageData(pixels,0,0);
}
const colorIndex=i=>(i*7+Math.floor(random(hash(7621,i)).next()*17))%palette.length;
export const bookColor=i=>palette[colorIndex(i)];

function fitText(ctx,text,desired,max,family,style=''){
  let size=desired;
  ctx.font=style+size+'px '+family;
  const width=ctx.measureText(text).width;
  if(width>max){
    size*=max/width;
    ctx.font=style+size+'px '+family;
  }
  return size;
}
function printColor(index){
  return [9,10,11,17,22].includes(colorIndex(index))?'#3a2b20':'#f2dfb7';
}
function cloth(ctx,w,h,index,draft){
  ctx.fillStyle=bookColor(index);ctx.fillRect(0,0,w,h);
  if(draft)return;
  const r=random(hash(index,981));
  const leather=index%5===0;
  noise(ctx,w,h,r,leather?17:19);
  ctx.lineWidth=.48;
  if(leather){
    ctx.strokeStyle='#f0dfba19';
    ctx.beginPath();
    for(let i=0;i<245;i++){
      const x=r.next()*w,y=r.next()*h;
      ctx.moveTo(x,y);
      ctx.quadraticCurveTo(x+.6,y-.62,x+1.35,y-.22);
    }
    ctx.stroke();
  }else{
    const pitch=1.63+r.next()*.68;
    ctx.strokeStyle=index%3===0?'#ebdfc119':'#170f132a';
    ctx.beginPath();
    for(let y=0;y<h;y+=pitch){ctx.moveTo(0,y);ctx.lineTo(w,y+.25);}
    for(let x=0;x<w;x+=pitch*.87){ctx.moveTo(x,0);ctx.lineTo(x-.36,h);}
    ctx.stroke();
    ctx.strokeStyle='#f6e9ce16';
    ctx.beginPath();
    for(let y=.7;y<h;y+=pitch*2){ctx.moveTo(0,y);ctx.lineTo(w,y+.25);}
    ctx.stroke();
  }
  const wear=ctx.createRadialGradient(w*.51,h*.46,w*.18,w*.51,h*.46,Math.max(w,h)*.71);
  wear.addColorStop(0,'#fff0d809');wear.addColorStop(.69,'#fff2cf0d');wear.addColorStop(1,'#24120d7c');
  ctx.fillStyle=wear;ctx.fillRect(0,0,w,h);
}

export function paintSpine(ctx,w,h,index,title,draft=false){
  cloth(ctx,w,h,index,draft);
  const physical=bookFormat(index),sw=physical.w*160,sh=physical.h*160;
  const edge=ctx.createLinearGradient(0,0,w,0);
  edge.addColorStop(0,'#180c0a8a');edge.addColorStop(.067,'#fff0cd66');
  edge.addColorStop(.29,'#fff5d21a');edge.addColorStop(.75,'#190a0c10');edge.addColorStop(1,'#15080787');
  ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
  ctx.save();
  ctx.scale(w/sw,h/sh);
  const ink=printColor(index);
  ctx.strokeStyle=ink;ctx.fillStyle=ink;
  ctx.lineWidth=.8;
  if(index%3===0)ctx.strokeRect(sw*.11,sh*.039,sw*.78,sh*.92);
  for(const y of [sh*.075,sh*.11,sh*.87,sh*.91]){
    ctx.globalAlpha=.69;ctx.fillRect(sw*.12,y,sw*.76,.96);
  }
  ctx.globalAlpha=1;
  ctx.translate(sw*.52,sh*.49);
  ctx.rotate(-Math.PI/2);
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  const family=index%5===1&&sw/sh>.23?'Courier New':index%5===3?'Arial':'Georgia';
  const desired=Math.min(sh*.128,sw*.80), min=Math.min(desired,sh*.068), limit=sh*.74;
  let label=index%4===0?title.toUpperCase():title;
  if(fitText(ctx,label,desired,limit,family,'bold ')<min){
    ctx.font='bold '+min+'px '+family;
    const words=label.split(' ');
    while(words.length>1&&ctx.measureText(words.join(' ')+'…').width>limit)words.pop();
    label=words.join(' ');
    while(label.length>1&&ctx.measureText(label+'…').width>limit)label=label.slice(0,-1);
    label=label.trimEnd()+'…';
  }
  ctx.fillStyle=ink==='#f2dfb7'?'#ffedc9':ink;
  ctx.fillText(label,0,0);
  ctx.restore();
}

function coverLines(ctx,title,limit){
  const lines=[];
  let line='';
  for(const word of title.split(' ')){
    const next=line?line+' '+word:word;
    if(line&&ctx.measureText(next).width>limit){lines.push(line);line=word;}
    else line=next;
  }
  if(line)lines.push(line);
  return lines;
}
export function paintCover(ctx,w,h,index,title,draft=false){
  cloth(ctx,w,h,index,draft);
  const physical=bookFormat(index),cw=physical.d,ch=physical.h;
  const lip=ctx.createLinearGradient(0,0,w,0);
  lip.addColorStop(0,'#0c060b75');lip.addColorStop(.034,'#f6e7be58');lip.addColorStop(.08,'#29180d31');lip.addColorStop(.17,'#fff0d300');
  lip.addColorStop(.96,'#f0dca71b');lip.addColorStop(1,'#1a0c116d');
  ctx.fillStyle=lip;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.scale(w/cw,h/ch);
  const style=index%7, ink=printColor(index),family=style===2?'Courier New':'Georgia';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.strokeStyle=ink;ctx.fillStyle=ink;
  ctx.lineWidth=.005;
  ctx.globalAlpha=.65;
  if(style<3||style===5){
    ctx.strokeRect(cw*.073,ch*.065,cw*.854,ch*.87);
    if(style!==5)ctx.strokeRect(cw*.098,ch*.084,cw*.804,ch*.832);
  }
  ctx.globalAlpha=1;ctx.fillStyle=ink;
  const label=style===4?title.toUpperCase():title;
  const wanted=Math.min(cw*.159,ch*.112);
  const weight=style===1?'italic bold ':'bold ';
  ctx.font=weight+wanted+'px '+family;
  const lines=coverLines(ctx,label,cw*.78);
  const lineSpace=ch*Math.min(.123,.49/Math.max(1,lines.length));
  for(let i=0;i<lines.length;i++){
    fitText(ctx,lines[i],Math.min(wanted,lineSpace*.91),cw*.80,family,weight);
    ctx.fillText(lines[i],cw/2,ch*.455+(i-(lines.length-1)/2)*lineSpace);
  }
  ctx.globalAlpha=.83;
  fitText(ctx,'MISFILED PRESS',cw*.072,cw*.70,'Georgia','bold ');
  ctx.fillText('MISFILED PRESS',cw/2,ch*.81);
  ctx.restore();
}
// Backs use the same binding stock, with their own wear and sparse marks.
export function paintBack(ctx,w,h,index,draft=false){
  cloth(ctx,w,h,index,draft);
  const edge=ctx.createLinearGradient(0,0,w,0);
  edge.addColorStop(0,'#0f080e7d');edge.addColorStop(.045,'#e2c99e33');
  edge.addColorStop(.11,'#2110192e');edge.addColorStop(.40,'#d3c4a100');edge.addColorStop(1,'#0c040957');
  ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
  const r=random(hash(index,2867));
  ctx.strokeStyle='#eedcc227';ctx.lineWidth=.7;
  for(let i=0;i<4;i++){
    const x=w*(.13+r.next()*.73),y=h*(.07+r.next()*.86);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*(.011+r.next()*.037),y-h*.006);ctx.stroke();
  }
  if(index%7===2||index%7===5){
    const {d:cw,h:ch}=bookFormat(index);
    ctx.save();ctx.scale(w/cw,h/ch);
    ctx.globalAlpha=.64;ctx.fillStyle=printColor(index);ctx.textAlign='left';
    const note=index%7===2?['From the studio archive.','Printed in a small edition.']:['MISFILED PRESS','Objects and other mistakes'];
    for(let i=0;i<note.length;i++){
      fitText(ctx,note[i],cw*.058,cw*.72,'Georgia');
      ctx.fillText(note[i],cw*.14,ch*(.75+i*.045));
    }
    ctx.restore();
  }
}

export function paintPaper(ctx,w,h,index,vertical=false,draft=false){
  const r=random(hash(index,1902));
  const g=ctx.createLinearGradient(0,0,vertical?w:0,vertical?0:h);
  g.addColorStop(0,'#9c8868');g.addColorStop(.12,'#cbbb98');g.addColorStop(.52,'#efe6cb');g.addColorStop(.85,'#ddd0b1');g.addColorStop(1,'#a38d6d');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  if(draft)return;
  for(let i=1,n=vertical?w:h;i<n;i+=.73+r.next()*1.74){
    const line=r.next(),width=.36+r.next()*.55;
    ctx.fillStyle=line<.16?'#55432d49':line>.83?'#fff8dd56':'#59493225';
    if(vertical)ctx.fillRect(i,0,width,h);else ctx.fillRect(0,i,w,width);
  }
}

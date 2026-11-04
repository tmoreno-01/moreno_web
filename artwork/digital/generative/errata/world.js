import{alphabet,advances}from'./alphabet.js?edition=84';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
// Each hand has a distinct skeleton, rhythm, proportion and pen pressure.
const hands=[
 {name:'looped',sx:1,sy:1,slant:.25,join:.9,w:1,jitter:.018},
 {name:'needle',sx:.55,sy:1.65,slant:.10,join:.2,w:.48,jitter:.009},
 {name:'round print',sx:1.1,sy:.82,slant:0,join:0,w:.9,jitter:.025,print:true},
 {name:'hurried',sx:.85,sy:.8,slant:.6,join:.95,w:.8,jitter:.08},
 {name:'brush',sx:1.2,sy:1.15,slant:.15,join:.5,w:2.5,jitter:.035},
 {name:'backhand',sx:.8,sy:1.15,slant:-.45,join:.65,w:.7,jitter:.018},
 {name:'architect',sx:.8,sy:1.15,slant:0,join:0,w:.55,jitter:.008,print:true,angular:true},
 {name:'tremor',sx:1,sy:1,slant:-.1,join:.2,w:.6,jitter:.09},
 {name:'compressed',sx:.5,sy:1.3,slant:.35,join:.85,w:1.15,jitter:.02},
 {name:'wide whisper',sx:1.5,sy:.65,slant:.1,join:.75,w:.45,jitter:.015},
 {name:'felt tip',sx:1,sy:1,slant:.08,join:0,w:2.1,jitter:.025,print:true},
 {name:'broken shorthand',sx:.7,sy:.7,slant:.5,join:.25,w:.6,jitter:.055,angular:true},
 {name:'ceremonial',sx:.8,sy:1.4,slant:.2,join:.9,w:1.35,jitter:.012},
 {name:'loose capitals',sx:1.3,sy:1.05,slant:-.18,join:0,w:.85,jitter:.045,print:true}
];
const printAlphabet={
 a:[[[0,1],[.4,0],[.85,1]],[[.17,.6],[.67,.6]]],b:[[[0,1],[0,0],[.6,0],[.8,.25],[.6,.48],[0,.48]],[[.6,.48],[.85,.75],[.65,1],[0,1]]],
 c:[[[.85,.15],[.6,0],[.15,.1],[0,.5],[.15,.9],[.6,1],[.85,.85]]],d:[[[0,1],[0,0],[.5,0],[.85,.3],[.85,.7],[.5,1],[0,1]]],
 e:[[[.8,0],[0,0],[0,1],[.8,1]],[[0,.5],[.6,.5]]],f:[[[0,1],[0,0],[.8,0]],[[0,.48],[.6,.48]]],g:[[[.85,.15],[.6,0],[.15,.1],[0,.5],[.15,.9],[.7,1],[.85,.65],[.5,.65]]],
 h:[[[0,0],[0,1]],[[.8,0],[.8,1]],[[0,.5],[.8,.5]]],i:[[[.1,0],[.7,0]],[[.4,0],[.4,1]],[[.1,1],[.7,1]]],j:[[[.8,0],[.8,.8],[.6,1],[.2,1],[0,.8]]],
 k:[[[0,0],[0,1]],[[.8,0],[0,.55],[.8,1]]],l:[[[0,0],[0,1],[.8,1]]],m:[[[0,1],[0,0],[.55,.6],[1.1,0],[1.1,1]]],n:[[[0,1],[0,0],[.85,1],[.85,0]]],
 o:[[[.4,0],[.1,.1],[0,.5],[.1,.9],[.4,1],[.75,.9],[.85,.5],[.75,.1],[.4,0]]],p:[[[0,1],[0,0],[.6,0],[.8,.2],[.8,.4],[.6,.55],[0,.55]]],
 q:[[[.4,0],[0,.2],[0,.8],[.4,1],[.8,.8],[.8,.2],[.4,0]],[[.5,.7],[1,1.2]]],r:[[[0,1],[0,0],[.6,0],[.8,.2],[.6,.5],[0,.5]],[[.4,.5],[.85,1]]],
 s:[[[.8,.1],[.5,0],[.1,.1],[0,.35],[.7,.65],[.8,.85],[.5,1],[.05,.9]]],t:[[[0,0],[.9,0]],[[.45,0],[.45,1]]],u:[[[0,0],[0,.75],[.2,1],[.6,1],[.8,.75],[.8,0]]],
 v:[[[0,0],[.4,1],[.85,0]]],w:[[[0,0],[.2,1],[.55,.4],[.9,1],[1.1,0]]],x:[[[0,0],[.8,1]],[[.8,0],[0,1]]],y:[[[0,0],[.4,.5],[.8,0]],[[.4,.5],[.4,1]]],z:[[[0,0],[.8,0],[0,1],[.8,1]]]
};
const colors=['#292724','#3b3630','#343d4a','#763a35','#62564a'];
function spline(points){const out=[];for(let i=0;i<points.length-1;i++){const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)],steps=Math.max(2,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/2.5));for(let j=0;j<steps;j++){const t=j/steps,tt=t*t,ttt=tt*t;for(let k=0;k<2;k++)out.push(.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*tt+(-a[k]+3*b[k]-3*c[k]+d[k])*ttt));}}out.push(...points.at(-1));return new Float32Array(out);}
export class ErrataWorld{
 constructor(seed=82){this.seed=seed>>>0||1;this.initialSeed=this.seed;this.time=0;this.frames=0;this.accumulator=0;this.events=0;this.written=0;this.crossed=0;this.erased=0;this.nextId=0;this.spawnClock=.15;this.notes=[];this.links=[];this.newsWords=[];this.newsDate='';this.episode=0;this.episodeEnd=0;this.gestureClock=2;
  for(let i=0;i<78;i++)this.addNote(-this.rand()*25);
 }
 rand(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 pick(items){return items[Math.floor(this.rand()*items.length)];}
 setNews(words,date){this.newsWords=[...new Set(words.filter(w=>/^[a-z]{4,16}$/.test(w)))].slice(0,180);this.newsDate=date;}
 curve(points,start,speed,letter,width=1,kind='ink',color=0){const pts=this.angular?new Float32Array(points.flat()):spline(points);let length=0;for(let i=2;i<pts.length;i+=2)length+=Math.hypot(pts[i]-pts[i-2],pts[i+1]-pts[i-1]);return{pts,start,duration:Math.max(.025,length/speed),letter,width,kind,color,length,phase:this.rand()*TAU};}
 addNote(birth=this.time){
  if(this.notes.length>=154)return;
  const big=this.rand()<.10,style=Math.floor(this.rand()*hands.length),hand=hands[style],size=big?40+this.rand()*38:13+this.rand()*27,slant=hand.slant+(this.rand()-.5)*.18,spacing=(.75+this.rand()*.4)*hand.sx,angle=(this.rand()-.5)*(this.episode===3?2.6:this.rand()<.1?2:.4),speed=(65+this.rand()*220)*(style===3?2.2:1),ink=this.rand()<.72?0:this.pick([1,2,3,4]);
  this.angular=hand.angular;
  let text='',isNews=this.newsWords.length&&this.rand()<.18;
  if(isNews)text=this.pick(this.newsWords);
  else if(this.rand()<.32)text=this.pick(['again','almost','no','here','elsewhere','undo','still','wait','why','not yet','erase','hush','perhaps','nothing','tomorrow','is it','never mind','listen','otherwise','remember','somewhere','enough','what remains','i forgot','borrowed','maybe','after','before','yes but','who knows']);
  else{const count=big?1+Math.floor(this.rand()*3):2+Math.floor(this.rand()*11),pool=this.pick(['aeioulnrsm','aaeeeiillmnnrrss','abcdefghijklmnopqrstuvwxyz','xyzzzywqg','0123?+']);for(let i=0;i<count;i++)text+=pool[Math.floor(this.rand()*pool.length)];}
  if(big&&text.length>5)text=text.slice(0,3+Math.floor(this.rand()*3));if(this.rand()<.12)text+='?';
  let width=0;for(const c of text)width+=(advances[c]||.92)*size*spacing;
  width=Math.min(440,width);let x,y,best=-1;
  for(let attempt=0;attempt<18;attempt++){const xx=35+this.rand()*(925-width),yy=55+this.rand()*860;let nearest=10000;for(const n of this.notes){const distance=Math.hypot((xx+width*.5)-(n.x+n.width*.5),(yy-n.y)*2.1);nearest=Math.min(nearest,distance);}if(nearest>best){best=nearest;x=xx;y=yy;}if(nearest>90)break;}
  if(this.notes.length&&this.rand()<.22){const parent=this.pick(this.notes);x=clamp(parent.x+(this.rand()-.5)*85,25,940-width);y=clamp(parent.y+(this.rand()-.5)*80,55,930);}
  const note={news:!!isNews,hand:hand.name,weight:hand.w,id:this.nextId++,birth,x,y,width,height:size*1.65,size,angle,text,ink,strokes:[],letters:[],marks:[],style,mode:Math.floor(this.rand()*4),hold:4+this.rand()*14,writingDone:false,crossDone:false,eraseDone:false};
  const co=Math.cos(angle),si=Math.sin(angle),transform=(px,py)=>[x+px*co-py*si,y+px*si+py*co];let cursor=0,clock=0,last=null;
  for(let letter=0;letter<text.length;letter++){const character=text[letter];if(character===' '){cursor+=size*.5;clock+=.18;continue;}const shape=(hand.print?printAlphabet[character]:null)||alphabet[character]||alphabet.a,stretch=.83+this.rand()*.30,rise=(this.rand()-.5)*size*.19,tilt=(this.rand()-.5)*.14,variant=this.rand(),strokeStart=clock;
   for(let stroke=0;stroke<shape.length;stroke++){const source=shape[stroke],points=source.map(([px,py],i)=>{const jitter=Math.sin(i*1.9+variant*7)*hand.jitter;return transform(cursor+(px*stretch*hand.sx+slant*(1-py)+py*tilt+jitter)*size,(py-1)*size*hand.sy+rise+Math.sin(px*3+variant*8)*size*hand.jitter);});
    if(last&&stroke===0&&this.rand()<hand.join){const start=points[0],connector=this.curve([last,[last[0]+size*.14,last[1]-size*.10],[start[0]-size*.10,start[1]+size*.08],start],clock,speed,letter,.7,'join',ink);note.strokes.push(connector);clock+=connector.duration;}
    const line=this.curve(points,clock,speed*(.7+this.rand()*.6),letter,.65+this.rand()*.7,'ink',ink);note.strokes.push(line);clock+=line.duration+.02+this.rand()*.10;last=points.at(-1);
   }
   if(this.rand()<.09){clock+=.18+this.rand()*.45;last=null;}
   note.letters.push({index:letter,start:strokeStart,death:0,fade:1.3+this.rand()*4,ghost:this.rand()<.24?.05:0});cursor+=(advances[character]||.92)*size*spacing;
  }
  note.writeEnd=clock;note.width=cursor;note.eraseAt=clock+note.hold;note.finish=note.eraseAt+15;
  for(const letter of note.letters)letter.death=note.eraseAt+this.rand()*7;
  if(this.rand()<.68)this.crossOut(note,transform);
  if(this.rand()<.37)this.annotate(note,transform);
  this.angular=false;
  this.notes.push(note);this.events++;
 }
 crossOut(n,transform){const begin=n.writeEnd+.5+this.rand()*9,w=n.width,sz=n.size,portion=this.rand()<.5,from=portion?this.rand()*w*.55:-sz*.1,to=portion?Math.min(w,from+sz*(1+this.rand()*3)):w+sz*.15,type=Math.floor(this.rand()*5);let clock=begin;
  const add=(pts,width=1,color=n.ink)=>{const stroke=this.curve(pts.map(p=>transform(...p)),clock,350+this.rand()*400,-1,width,'cross',color);n.marks.push(stroke);clock+=stroke.duration+.04;};
  if(type===0||type===1){const passes=type===0?2:5+Math.floor(this.rand()*9);for(let j=0;j<passes;j++){const yy=-sz*(.22+this.rand()*.64),points=[];for(let i=0;i<=8;i++){const t=i/8,xx=j%2?to-(to-from)*t:from+(to-from)*t;points.push([xx,yy+Math.sin(t*5+j)*sz*.10+(this.rand()-.5)*sz*.10]);}add(points,type===0?1.2:.8);}}
  else if(type===2){const points=[],cycles=5+Math.floor(this.rand()*9);for(let i=0;i<cycles*15;i++){const t=i/(cycles*15),theta=t*cycles*TAU;points.push([from+(to-from)*t+Math.cos(theta)*sz*.30,-sz*.45+Math.sin(theta)*sz*(.38+this.rand()*.09)]);}add(points,.95);}
  else if(type===3){for(let j=0;j<2+Math.floor(this.rand()*3);j++){const xx=from+(to-from)*this.rand();add([[xx-sz*.32,-sz*1.05],[xx+sz*.45,sz*.25]],1.1);add([[xx-sz*.25,sz*.18],[xx+sz*.40,-sz]],1.1);}}
  else{const points=[];for(let i=0;i<=52;i++){const a=i/52*TAU;points.push([(from+to)*.5+Math.cos(a)*(to-from)*.62,-sz*.43+Math.sin(a)*sz*.8]);}add(points,.65,3);if(this.rand()<.7)add([[from-sz*.2,-sz],[to+sz*.2,sz*.2]],1.2,3);}
  n.crossAt=begin;n.crossEnd=clock;n.markDeath=Math.max(clock+5,n.eraseAt+5)+this.rand()*9;n.finish=Math.max(n.finish,n.markDeath+6);
 }
 annotate(n,transform){
  let clock=n.writeEnd+.3+this.rand()*12;const sz=n.size,w=n.width,type=Math.floor(this.rand()*6);
  const add=(pts,width=.7,color=n.ink)=>{const line=this.curve(pts.map(p=>transform(...p)),clock,150+this.rand()*450,-1,width,'cross',color);n.marks.push(line);clock+=line.duration+.09;};
  if(type===0){for(let j=0;j<1+Math.floor(this.rand()*3);j++)add([[0,sz*(.2+j*.15)],[w*.4,sz*(.12+j*.15)],[w,sz*(.25+j*.15)]]);}
  if(type===1){const x=w+sz*.3;add([[x,0],[x+sz*.2,-sz*.3],[x,-sz*.8],[x+sz*.4,-sz*1.1]]);add([[x+sz*.1,-sz*.85],[x+sz*.4,-sz*1.1],[x+sz*.4,-sz*.72]]);}
  if(type===2)add([[-sz*.2,sz*.2],[-sz*.25,-sz*1.25],[w+sz*.2,-sz*1.2],[w+sz*.3,sz*.2],[-sz*.2,sz*.2]],.55);
  if(type===3){for(let i=0;i<2+Math.floor(this.rand()*5);i++){const x=this.rand()*w;add([[x,-sz*1.2],[x+sz*.12,-sz*1.45],[x+sz*.24,-sz*1.2]],.6,3);}}
  if(type===4){const pts=[];for(let i=0;i<50;i++){const a=i*.55;pts.push([w+sz*.55+Math.cos(a)*sz*.24*i/50,-sz*.4+Math.sin(a)*sz*.5*i/50]);}add(pts,.6);}
  if(type===5){for(let i=0;i<3;i++)add([[w*.4+i*sz*.18,-sz*1.25],[w*.4+i*sz*.18+sz*.04,-sz*1.3]],2.3);}
  n.markDeath=Math.max(n.markDeath||0,clock+7+this.rand()*10);n.finish=Math.max(n.finish,n.markDeath+6);
 }
 gesture(){
  if(this.notes.length<2)return;const a=this.pick(this.notes),b=this.pick(this.notes);if(a===b||Math.hypot(a.x-b.x,a.y-b.y)>430)return;
  const x=a.x+a.width*.5,y=a.y-a.size*.5,xx=b.x+b.width*.5,yy=b.y-b.size*.5;
  const pts=[[x,y],[(x+xx)*.5+(this.rand()-.5)*130,(y+yy)*.5-35-this.rand()*70],[xx,yy]];
  this.links.push({stroke:this.curve(pts,this.time,110+this.rand()*160,-1,.55,'join',this.pick([0,2,3])),death:this.time+8+this.rand()*14});
  if(this.links.length>12)this.links.shift();
 }
 update(dt){if(!(dt>0))return;this.time+=dt;this.frames++;this.spawnClock-=dt;this.gestureClock-=dt;
  if(this.time>this.episodeEnd){this.episode=Math.floor(this.rand()*5);this.episodeEnd=this.time+8+this.rand()*23;}
  if(this.gestureClock<0){this.gesture();this.gestureClock=1+this.rand()*6;}this.links=this.links.filter(l=>this.time<l.death+5);
  if(this.spawnClock<=0){this.addNote();if(this.rand()<.32)this.addNote(this.time+.15+this.rand()*.4);this.spawnClock=this.episode===0?.08+this.rand()*.15:this.episode===1?.6+this.rand()*1.6:.14+this.rand()*.5;}
  for(const n of this.notes){const age=this.time-n.birth;if(age>n.writeEnd&&!n.writingDone){n.writingDone=true;this.written++;}if(n.crossAt!==undefined&&age>n.crossAt&&!n.crossDone){n.crossDone=true;this.crossed++;this.events++;}if(age>n.eraseAt&&!n.eraseDone){n.eraseDone=true;this.erased++;this.events++;}}
  this.notes=this.notes.filter(n=>this.time-n.birth<n.finish);
 }
 advance(dt){this.accumulator+=Math.max(0,dt);while(this.accumulator+1e-8>=1/30){this.update(1/30);this.accumulator=Math.max(0,this.accumulator-1/30);}}
 snapshot(){return structuredClone({seed:this.seed,initialSeed:this.initialSeed,time:this.time,frames:this.frames,accumulator:this.accumulator,events:this.events,written:this.written,crossed:this.crossed,erased:this.erased,nextId:this.nextId,spawnClock:this.spawnClock,notes:this.notes,links:this.links,newsWords:this.newsWords,newsDate:this.newsDate,episode:this.episode,episodeEnd:this.episodeEnd,gestureClock:this.gestureClock});}
 restore(state){Object.assign(this,structuredClone(state));}
}
export{colors};

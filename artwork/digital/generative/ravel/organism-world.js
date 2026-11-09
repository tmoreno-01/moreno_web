const TAU=Math.PI*2;
const palette=[[195,187,164],[128,151,139],[159,137,151],[167,118,96],[93,119,124],[177,158,132]];
export class Organism{
 constructor(seed=73){this.seed=seed||1;this.time=0;this.events=0;this.bodies=[];
  for(let i=0;i<25;i++){let a=i*2.39996,z=(i%5-2)*.24,spread=i<6?.23:.58;const type=i<16?0:i<21?1:2;
   const b={id:i,type,phase:this.rand()*TAU,anchor:[Math.cos(a)*spread,Math.sin(a)*spread*.95,z],p:[],v:Array(12).fill(0),target:[],age:0,life:2+this.rand()*6,ink:[...palette[i%6]],inkTarget:[...palette[(i+1)%6]],inkLife:6+this.rand()*11};
   b.p=[...b.anchor,this.rand()*TAU,this.rand()*TAU,this.rand()*TAU,type===1?.23+this.rand()*.12:.37+this.rand()*.23,(this.rand()-.4)*.9,.10+this.rand()*.17,4+this.rand()*5,.6+this.rand()*.5,this.rand()*TAU];b.target=[...b.p];this.bodies.push(b);
  }
  this.filaments=Array.from({length:46},(_,i)=>({body:i%25,u:.55+this.rand()*.4,v:this.rand(),phase:this.rand()*TAU,length:.12+this.rand()*.29}));
 }
 rand(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 update(dt){if(dt<=0)return;this.time+=dt;for(const b of this.bodies){b.age+=dt;b.inkLife-=dt;if(b.age>b.life){b.age=0;b.life=2.5+this.rand()*6;for(let k=0;k<3;k++)b.target[k]=b.anchor[k]+(this.rand()-.5)*.38;for(let k=3;k<6;k++)b.target[k]+=(this.rand()-.5)*1.6;b.target[6]=(b.type===1?.23:.36)+this.rand()*(b.type===1?.14:.26);b.target[7]=(this.rand()-.5)*1.35;b.target[8]=.07+this.rand()*.3;b.target[9]=3+this.rand()*9;b.target[10]=.53+this.rand()*.6;b.target[11]+=(this.rand()-.5)*3;this.events++;}if(b.inkLife<=0){b.inkTarget=[...palette[Math.floor(this.rand()*6)]];b.inkLife=8+this.rand()*14;this.events++;}
   for(let k=0;k<12;k++){const force=(b.target[k]-b.p[k])*(k<3?.8:1.1);b.v[k]=(b.v[k]+force*dt)*Math.exp(-2.1*dt);b.p[k]+=b.v[k]*dt;}for(let k=0;k<3;k++)b.ink[k]+=(b.inkTarget[k]-b.ink[k])*dt*.13;
  }}
 snapshot(){return structuredClone({seed:this.seed,time:this.time,events:this.events,bodies:this.bodies,filaments:this.filaments});}
 restore(s){Object.assign(this,structuredClone(s));}
}

// Independent, inertial growth systems. Random targets are never applied as jumps.
const TAU=Math.PI*2;
const palette=[[.72,.48,.27],[.21,.48,.46],[.78,.72,.58],[.44,.20,.17],[.15,.29,.34],[.53,.54,.39],[.68,.42,.39]];
export class Sculpture {
 constructor(seed=12345){this.seed=seed;this.time=0;this.events=0;this.bodies=[];
  for(let i=0;i<28;i++){
   const a=i*2.399963,b={id:i,phase:this.rand()*TAU,angle:a,tilt:this.rand()*TAU,spread:i<7?.38:.67,reach:i<7?.65:1.03+this.rand()*.35,width:i<7?.19+this.rand()*.09:i<18?.055+this.rand()*.055:.018+this.rand()*.025,style:i<7?0:i<18?1:2,life:1+this.rand()*5,colour:[...palette[i%palette.length]],ink:[...palette[i%palette.length]],inkLife:this.rand()*8,points:[],targets:[],velocity:[],growth:.75+this.rand()*.25,growthTarget:1,twist:this.rand()*6,twistTarget:this.rand()*6};
   this.retarget(b,true);b.points=b.targets.map(p=>[...p]);b.velocity=b.points.map(()=>[0,0,0]);this.bodies.push(b);
  }
 }
 rand(){let x=this.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 retarget(b,initial=false){const a=b.angle+(this.rand()-.5)*.8,twist=.6+this.rand()*1.7,reach=b.reach*(.75+this.rand()*.5),off=this.rand()*TAU; b.targets=[];
  for(let j=0;j<8;j++){const u=j/7,t=off+u*TAU*twist,rad=reach*(.23+Math.sin(u*Math.PI)*.64),r=b.spread;
   const x=Math.cos(t)*rad*.69+r*Math.cos(a),y=Math.sin(t)*rad*.69+r*Math.sin(a),z=Math.sin(t*1.23+b.tilt)*rad*.65;
   // Distinct folded cavities, long curls and filamentary growths occupy a shared volume.
   b.targets.push([x*Math.cos(a)-z*Math.sin(a),y*(b.style===0?.92:1.15),x*Math.sin(a)+z*Math.cos(a)]);
  }
  b.life=2.8+this.rand()*5.8;b.growthTarget=.6+this.rand()*.4;b.twistTarget=(this.rand()-.5)*9;if(!initial)this.events++;
 }
 update(dt){this.time+=dt;
  for(const b of this.bodies){b.life-=dt;b.inkLife-=dt;if(b.life<=0)this.retarget(b);if(b.inkLife<=0){b.ink=[...palette[Math.floor(this.rand()*palette.length)]];b.inkLife=5+this.rand()*9;this.events++;}
   b.growth+=(b.growthTarget-b.growth)*dt*.36;b.twist+=(b.twistTarget-b.twist)*dt*.2;
   for(let k=0;k<3;k++)b.colour[k]+=(b.ink[k]-b.colour[k])*dt*.24;
   for(let j=0;j<8;j++)for(let k=0;k<3;k++){let force=(b.targets[j][k]-b.points[j][k])*1.1;force+=Math.sin(this.time*(.29+b.id*.007)+j*.7+b.phase+k*2)*.035;b.velocity[j][k]=(b.velocity[j][k]+force*dt)*Math.exp(-2.2*dt);b.points[j][k]+=b.velocity[j][k]*dt;}
  }
 }
 snapshot(){return structuredClone({seed:this.seed,time:this.time,events:this.events,bodies:this.bodies});}
 restore(s){Object.assign(this,structuredClone(s));}
}

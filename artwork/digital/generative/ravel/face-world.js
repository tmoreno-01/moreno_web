const palette=[[190,172,143],[120,150,141],[177,128,119],[153,143,164],[168,156,122],[96,127,139]];
export class Face{
 constructor(seed=74){this.seed=seed||1;this.time=0;this.events=0;this.bodies=Array.from({length:26},(_,i)=>({id:i,value:this.rand()*2-1,velocity:0,target:this.rand()*2-1,life:.6+this.rand()*4}));this.inks=palette.map(c=>[...c]);this.inkTargets=palette.map(c=>[...c]);this.inkLife=5;this.pores=Array.from({length:650},()=>({x:(this.rand()*2-1)*.63,y:(this.rand()*2-1)*.83,r:.0007+this.rand()*.0018,phase:this.rand()*6.28}));}
 rand(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 update(dt){if(!(dt>0))return;this.time+=dt;for(const b of this.bodies){b.life-=dt;if(b.life<=0){b.target=this.rand()*2-1;b.life=.8+this.rand()*5.2;this.events++;}let force=(b.target-b.value)*(b.id<4?1.3:3.2);b.velocity=(b.velocity+force*dt)*Math.exp(-3*dt);b.value+=b.velocity*dt;}this.inkLife-=dt;if(this.inkLife<=0){this.inkLife=4+this.rand()*7;let i=Math.floor(this.rand()*6);this.inkTargets[i]=[...palette[Math.floor(this.rand()*6)]];this.events++;}for(let i=0;i<6;i++)for(let j=0;j<3;j++)this.inks[i][j]+=(this.inkTargets[i][j]-this.inks[i][j])*dt*.18;}
 snapshot(){return structuredClone({seed:this.seed,time:this.time,events:this.events,bodies:this.bodies,inks:this.inks,inkTargets:this.inkTargets,inkLife:this.inkLife,pores:this.pores});}
 restore(s){Object.assign(this,structuredClone(s));}
}

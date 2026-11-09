import {BAY,AHEAD,R,hash,random} from './world.js?141';
import {STRIDE,faces,fixture,LAMP_Y} from './geometry.js?141';

export const SHADOW_SIZE=96, SHADOW_COUNT=6, LIGHT_COUNT=AHEAD+2, SHADOW_SPREAD=2.15;
const MIN=.14, REACH=BAY*1.09;
export const SHADOW_FADE_START=BAY*(SHADOW_COUNT-2.6), SHADOW_FADE_END=BAY*(SHADOW_COUNT-2);
export const UPLIGHT_Y=-R+.88, UPLIGHT_REACH=2.65;
export const BOUNCE_BASE=.012, BOUNCE_FLOOR=.028;
export const HIGHLIGHT_KNEE=.65, HIGHLIGHT_SOFTNESS=1.46;
const clamp01=x=>Math.max(0,Math.min(1,x));
const smooth=x=>x*x*(3-2*x);
const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];

function nearClip(poly){
  const result=[];
  let a=poly.at(-1);
  for(const b of poly){
    if((a.y>=MIN)!==(b.y>=MIN)){
      const t=(MIN-a.y)/(b.y-a.y);
      result.push({x:a.x+(b.x-a.x)*t,y:MIN,z:a.z+(b.z-a.z)*t});
    }
    if(b.y>=MIN)result.push(b);
    a=b;
  }
  return result;
}

function raster(map,offset,a,b,c){
  if(a.y>b.y)[a,b]=[b,a];
  if(a.y>c.y)[a,c]=[c,a];
  if(b.y>c.y)[b,c]=[c,b];
  const height=c.y-a.y, ab=b.x-a.x, ac=c.x-a.x, middle=b.y-a.y;
  const det=ab*height-ac*middle;
  if(height<.01||Math.abs(det)<.002)return;
  const start=Math.max(0,Math.ceil(a.y-.5)),end=Math.min(SHADOW_SIZE,Math.ceil(c.y-.5));
  const qx=((b.q-a.q)*height-(c.q-a.q)*middle)/det;
  const qy=(ab*(c.q-a.q)-ac*(b.q-a.q))/det;
  const long=ac/height,upper=middle>0?ab/middle:0,lower=height>middle?(c.x-b.x)/(height-middle):0;
  for(let y=start;y<end;y++){
    const py=y+.5,dy=py-a.y;
    const p=a.x+long*dy, r=py<b.y?a.x+upper*dy:b.x+lower*(py-b.y);
    const x0=Math.max(0,Math.ceil(Math.min(p,r)-.5)),x1=Math.min(SHADOW_SIZE,Math.ceil(Math.max(p,r)-.5));
    let q=a.q+qx*(x0+.5-a.x)+qy*dy;
    for(let x=x0,i=offset+y*SHADOW_SIZE+x;x<x1;x++,i++,q+=qx)if(q>map[i])map[i]=q;
  }
}

export class Lighting {
  constructor(){
    this.lamps=new Float32Array(LIGHT_COUNT*4);
    this.uplights=new Float32Array(LIGHT_COUNT*4);
    this.maps=new Float32Array(SHADOW_SIZE*SHADOW_SIZE*SHADOW_COUNT);
    this.stationary=new Float32Array(this.maps.length);
    this.staticStamp=-1;
    this.index=NaN;
  }

  prepare(data,length,flying,index,stamp){
    const newBay=index!==this.index;
    if(newBay){
      this.index=index;
      for(let j=0;j<LIGHT_COUNT;j++){
        const bay=index+j-1;
        const {x,s,energy,mood}=fixture(bay);
        this.lamps.set([x,s-index*BAY,energy,mood],j*4);
        // Concealed upward accents vary independently from the main light.
        const pair=Math.floor(bay/2), selected=2*pair+(random(hash(0x3a91,pair)).next()>=.5?1:0);
        const r=random(hash(0x96b5,bay));
        const strength=bay===selected?.36+r.next()*.43:0;
        this.uplights.set([(r.next()-.5)*3.3,(j-1)*BAY+.65+r.next()*3.22,strength,0],j*4);
      }
    }
    const staticChanged=newBay||stamp!==this.staticStamp;
    if(staticChanged){
      this.stationary.fill(0);
      for(let j=0;j<SHADOW_COUNT;j++)this.capture(this.stationary,data,flying,length,j);
      this.staticStamp=stamp;
    }
    this.maps.set(this.stationary);
    for(let j=0;j<SHADOW_COUNT;j++)this.capture(this.maps,data,0,flying,j);
    return staticChanged;
  }

  ambience(z){
    const at=Math.max(0,Math.min(LIGHT_COUNT-1,z/BAY+.5));
    const i=Math.floor(at), t=at-i;
    const a=this.lamps[i*4+3], b=this.lamps[Math.min(i+1,LIGHT_COUNT-1)*4+3];
    return a+(b-a)*smooth(t);
  }

  capture(map,data,start,length,light){
    const lx=this.lamps[light*4],lz=this.lamps[light*4+1];
    const offset=light*SHADOW_SIZE*SHADOW_SIZE, half=SHADOW_SIZE/2;
    const focal=half/SHADOW_SPREAD;
    for(let i=start;i<length;i+=STRIDE){
      const x=data[i+3]-lx,y=data[i+7]-LAMP_Y,z=data[i+11]-lz;
      const ry=Math.abs(data[i+1])+Math.abs(data[i+5])+Math.abs(data[i+9]);
      const rz=Math.abs(data[i+2])+Math.abs(data[i+6])+Math.abs(data[i+10]);
      if(Math.abs(z)-rz>REACH+.85||y+ry<MIN||y-ry>6.4)continue;
      for(const [axis,sign,u,v] of faces){
        const a=i+axis*4,b=i+u*4,c=i+v*4;
        const nx=data[a],ny=data[a+1],nz=data[a+2];
        if(sign*(nx*x+ny*y+nz*z)+nx*nx+ny*ny+nz*nz>=0)continue;
        const px=x+sign*nx,py=y+sign*ny,pz=z+sign*nz;
        let behind=false;
        let poly=corners.map(([s,t])=>{
          const depth=py+data[b+1]*s+data[c+1]*t;
          if(depth<MIN)behind=true;
          return {x:px+data[b]*s+data[c]*t,y:depth,z:pz+data[b+2]*s+data[c+2]*t};
        });
        if(behind)poly=nearClip(poly);
        if(poly.length<3)continue;
        for(const p of poly){
          p.q=1/p.y;
          p.y=half+p.z*focal*p.q;
          p.x=half+p.x*focal*p.q;
        }
        for(let k=1;k<poly.length-1;k++)raster(map,offset,poly[0],poly[k],poly[k+1]);
      }
    }
  }

  visibility(i,dx,drop,dz,nx,nz,incidence,airborne=false){
    if(i>=SHADOW_COUNT||drop<MIN)return 1;
    const half=SHADOW_SIZE/2,scale=half/(drop*SHADOW_SPREAD);
    const x=half+dx*scale-.5,y=half+dz*scale-.5;
    if(x<0||y<0||x>=SHADOW_SIZE-1||y>=SHADOW_SIZE-1)return 1;
    const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,at=(i*SHADOW_SIZE+iy)*SHADOW_SIZE+ix;
    // Compare each tap with the receiving plane at that tap's ray.
    // This prevents the floor or a spine from casting striped shadows on itself.
    const test=1/Math.max(MIN,drop-.029-drop*.004);
    const slope=-2*SHADOW_SPREAD/(SHADOW_SIZE*Math.max(.035,incidence));
    const u=nx*slope,v=nz*slope, start=test-u*fx-v*fy;
    // A flying binding receives fixed geometry shadows only. Its moving
    // silhouette is still cast onto the tunnel, with the current frame's pose.
    const map=airborne?this.stationary:this.maps;
    const slopeScale=(drop*drop+.12)/.065;
    const a=clamp01((map[at]-start)*slopeScale)*(1-fx)+clamp01((map[at+1]-start-u)*slopeScale)*fx;
    const b=clamp01((map[at+SHADOW_SIZE]-start-v)*slopeScale)*(1-fx)+clamp01((map[at+SHADOW_SIZE+1]-start-u-v)*slopeScale)*fx;
    return 1-.91*(a+(b-a)*fy);
  }

  key(x,y,z,nx,ny,nz,airborne,eye){
    const drop=y-LAMP_Y,rise=UPLIGHT_Y-y;
    const bay=Math.floor(z/BAY)+1;
    let result=0;
    for(let i=Math.max(0,bay-1);i<=Math.min(LIGHT_COUNT-1,bay+1);i++){
      const j=i*4;
      if(rise>.035&&this.uplights[j+2]>0){
        const dx=x-this.uplights[j],dz=z-this.uplights[j+1];
        const incidence=ny*rise-nx*dx-nz*dz;
        const squared=dx*dx+rise*rise+dz*dz;
        const edge=1-squared/(UPLIGHT_REACH*UPLIGHT_REACH);
        if(incidence>0&&edge>0){
          const length=Math.sqrt(squared);
          const cone=clamp01((rise/length-.18)*2.6);
          result+=this.uplights[j+2]*incidence/length*cone*edge*edge/(.69+.36*squared);
        }
      }
      if(drop<=.025)continue;
      const dx=x-this.lamps[j],dz=z-this.lamps[j+1];
      const incidence=-(nx*dx+ny*drop+nz*dz);
      if(incidence<=0||Math.abs(dz)>=REACH)continue;
      const squared=dx*dx+drop*drop+dz*dz, length=Math.sqrt(squared);
      const cone=clamp01((drop/length-.21)*3.55);
      if(cone===0)continue;
      const falloff=1-smooth(clamp01((Math.abs(dz)/REACH-.63)/.37));
      const shadowWeight=1-smooth(clamp01((this.lamps[j+1]-eye-SHADOW_FADE_START)/(SHADOW_FADE_END-SHADOW_FADE_START)));
      const shade=shadowWeight>0?1-shadowWeight*(1-this.visibility(i,dx,drop,dz,nx,nz,incidence,airborne)):1;
      result+=this.lamps[j+2]*incidence/length*cone*falloff*shade/(.67+.275*squared);
    }
    const highlight=Math.max(0,result-HIGHLIGHT_KNEE);
    return result-highlight+highlight/(1+HIGHLIGHT_SOFTNESS*highlight);
  }
}

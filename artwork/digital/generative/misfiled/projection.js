import {BOUNCE_BASE,BOUNCE_FLOOR} from './lighting.js?145';
import {NEAR,FAR,STRIDE,BOOK_COUNT,WOOD,faces,tileIndex} from './geometry.js?142';

const SKY=0xff111217, RB=0x00ff00ff, G=0x0000ff00;
function blend(a,b,weight){
  const rest=256-weight;
  return (((a&RB)*rest+(b&RB)*weight>>>8)&RB)|(((a&G)*rest+(b&G)*weight>>>8)&G);
}
const corners=[[0,0],[1,0],[1,1],[0,1]];
function clip(vertices){
  const visible=[];
  let a=vertices[vertices.length-1];
  for(const b of vertices){
    if((a.z>=NEAR)!==(b.z>=NEAR)){
      const k=(NEAR-a.z)/(b.z-a.z);
      visible.push({x:a.x+k*(b.x-a.x),y:a.y+k*(b.y-a.y),z:NEAR,
        u:a.u+k*(b.u-a.u),v:a.v+k*(b.v-a.v)});
    }
    if(b.z>=NEAR)visible.push(b);
    a=b;
  }
  return visible;
}

export class SoftwareProjector {
  constructor(canvas,textures){
    this.ctx=canvas.getContext('2d',{alpha:false});
    this.textures=textures;
  }

  resize(w,h){
    if(this.width===w&&this.height===h)return;
    this.width=w;
    this.height=h;
    this.frame=this.ctx.createImageData(w,h);
    this.color=new Uint32Array(this.frame.data.buffer);
    this.depth=new Float32Array(w*h);
  }

  triangle(a,b,c,material,level,normal,base,wash,key,fog,occlusion,mood,airborne){
    if(a.y>b.y)[a,b]=[b,a];
    if(a.y>c.y)[a,c]=[c,a];
    if(b.y>c.y)[b,c]=[c,b];
    const height=c.y-a.y;
    if(height<.32)return;
    const start=Math.max(0,Math.ceil(a.y-.5)),end=Math.min(this.height,Math.ceil(c.y-.5));
    if(start>=end)return;
    const ab=b.x-a.x, ac=c.x-a.x, by=b.y-a.y;
    const det=ab*height-ac*by;
    if(Math.abs(det)<.17)return;
    const qx=((b.q-a.q)*height-(c.q-a.q)*by)/det;
    const qy=(ab*(c.q-a.q)-ac*(b.q-a.q))/det;
    const ux=((b.u-a.u)*height-(c.u-a.u)*by)/det;
    const uy=(ab*(c.u-a.u)-ac*(b.u-a.u))/det;
    const vx=((b.v-a.v)*height-(c.v-a.v)*by)/det;
    const vy=(ab*(c.v-a.v)-ac*(b.v-a.v))/det;
    const longEdge=ac/height;
    const upper=by>0?ab/by:0,lower=height>by?(c.x-b.x)/(height-by):0;

    const isWood=material>=WOOD, index=isWood?material-WOOD:material;
    const spine=!isWood&&index%4===1;
    const textureLevel=spine?Math.max(0,level-1):level;
    const {pixels,tileWidth,tileHeight,width:tileStride,cols}=(isWood?this.textures.wood:this.textures.books)[textureLevel];
    const tileX=(index%cols)*tileWidth+1, tileY=Math.floor(index/cols)*tileHeight+1;
    const tileStart=tileY*tileStride+tileX, spanX=tileWidth-3,spanY=tileHeight-3;
    const {width,color,depth}=this;
    const fogR=Math.round(17*fog),fogG=Math.round(16*fog),fogB=Math.round(20*fog);
    const {lighting,eye,focal}=this, cx=this.width*.5,cy=this.height*.5;
    const near=level<=1;
    const [nx,ny,nz]=normal;
    const scale=256*base*(1-fog);
    const bounce=BOUNCE_BASE+BOUNCE_FLOOR*Math.max(0,ny);
    const fillR=wash*(isWood?.79+.075*mood:.723+.133*mood)+bounce;
    const fillG=wash*(isWood?.89+.05*mood:.871+.069*mood)+bounce*.69;
    const fillB=wash*(isWood?.99-.04*mood:1.205-.115*mood)+bounce*.42;
    let rGain=scale*(fillR+key*1.205);
    let gGain=scale*(fillG+key*.935);
    let bGain=scale*(fillB+key*.625);
    const filter=textureLevel<=1&&!isWood;
    for(let y=start;y<end;y++){
      const sampleY=y+.5,dy=sampleY-a.y;
      const edge0=a.x+longEdge*dy;
      const edge1=sampleY<b.y?a.x+upper*dy:b.x+lower*(sampleY-b.y);
      const left=Math.max(0,Math.ceil(Math.min(edge0,edge1)-.5));
      const right=Math.min(width,Math.ceil(Math.max(edge0,edge1)-.5));
      const dx=left+.5-a.x;
      let q=a.q+qx*dx+qy*dy, u=a.u+ux*dx+uy*dy, v=a.v+vx*dx+vy*dy;
      let lightAt=left,lightFrom=left,keyStart=key,keySlope=0;
      for(let x=left,i=y*width+left;x<right;x++,i++,q+=qx,u+=ux,v+=vx){
        if(q<=depth[i])continue;
        depth[i]=q;
        const z=1/q;
        if(near){
          if(x>=lightAt){
            // Interpolate between light samples along the scanline to avoid
            // a staircase at a shadow boundary.
            const step=Math.min(13,Math.max(1,right-x-1));
            const farZ=1/(q+qx*step);
            keyStart=lighting.key((x+.5-cx)*z/focal,(sampleY-cy)*z/focal,z+eye,nx,ny,nz,airborne);
            const keyEnd=lighting.key((x+step+.5-cx)*farZ/focal,(sampleY-cy)*farZ/focal,farZ+eye,nx,ny,nz,airborne);
            keySlope=(keyEnd-keyStart)/step;
            lightFrom=x;
            lightAt=x+step;
          }
          const direct=keyStart+(x-lightFrom)*keySlope;
          rGain=scale*(fillR+direct*1.205);
          gGain=scale*(fillG+direct*.935);
          bGain=scale*(fillB+direct*.625);
        }
        const uu=Math.min(1,Math.max(0,u*z)),vv=Math.min(1,Math.max(0,v*z));
        const sx=uu*spanX,sy=vv*spanY;
        let texel;
        if(filter){
          const tx=sx|0,ty=sy|0,at=tileStart+ty*tileStride+tx;
          const f=(sx-tx)*256|0,g=(sy-ty)*256|0;
          texel=blend(blend(pixels[at],pixels[at+1],f),blend(pixels[at+tileStride],pixels[at+tileStride+1],f),g);
        }else texel=pixels[tileStart+((sy+.5)|0)*tileStride+((sx+.5)|0)];
        let ao=1;
        if(occlusion===3)ao=.57+.43*Math.min(1,5.9*Math.min(uu,1-uu,vv,1-vv));
        else if(occlusion>0){
          const recess=occlusion===1?uu:vv;
          ao=1-.43*recess*recess;
        }
        const r=Math.min(255,((texel&255)*rGain*ao>>>8)+fogR);
        const g=Math.min(255,(((texel>>>8)&255)*gGain*ao>>>8)+fogG);
        const b=Math.min(255,(((texel>>>16)&255)*bGain*ao>>>8)+fogB);
        color[i]=0xff000000|r|(g<<8)|(b<<16);
      }
    }
  }

  draw(data,count,w,h,focal,eye,lighting){
    this.lighting=lighting;
    this.focal=focal;
    this.eye=eye;
    lighting.setView(eye);
    this.resize(w,h);
    this.color.fill(SKY);
    this.depth.fill(0);
    const cx=w/2,cy=h/2, limitX=cx/focal,limitY=cy/focal;
    for(let i=0;i<count;i+=STRIDE){
      const x=data[i+3],y=data[i+7],z=data[i+11]-eye;
      const rx=Math.abs(data[i])+Math.abs(data[i+4])+Math.abs(data[i+8]);
      const ry=Math.abs(data[i+1])+Math.abs(data[i+5])+Math.abs(data[i+9]);
      const rz=Math.abs(data[i+2])+Math.abs(data[i+6])+Math.abs(data[i+10]);
      if(z+rz<NEAR||z-rz>FAR||Math.abs(x)-rx>(z+rz)*limitX||Math.abs(y)-ry>(z+rz)*limitY)continue;
      const material=data[i+12], grain=data[i+14], t=Math.min(1,Math.max(0,(z-17)/89));
      const fog=t*t*(3-2*t)*.91;
      const spineOnly=data[i+15]===1, airborne=data[i+15]===2;
      for(let side=spineOnly?4:0;side<(spineOnly?5:6);side++){
        const [axis,sign,across,down]=faces[side];
        const j=i+axis*4,k=i+across*4,l=i+down*4;
        const ax=data[j],ay=data[j+1],az=data[j+2];
        const len2=ax*ax+ay*ay+az*az;
        if(sign*(ax*x+ay*y+az*z)+len2>=0)continue;
        const px=x+sign*ax,py=y+sign*ay,pz=z+sign*az;
        let near=false;
        let poly=corners.map(([u,v])=>{
          const a=u*2-1,b=v*2-1,depth=pz+data[k+2]*a+data[l+2]*b;
          if(depth<NEAR)near=true;
          if(material<BOOK_COUNT&&(side===1||side===4))u=1-u;
          if(grain>.5&&(side<2||side>=4))[u,v]=[v,u];
          return {x:px+data[k]*a+data[l]*b,y:py+data[k+1]*a+data[l+1]*b,z:depth,u,v};
        });
        if(near)poly=clip(poly);
        if(poly.length<3)continue;
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(const p of poly){
          p.q=1/p.z;
          p.x=cx+focal*p.x*p.q;
          p.y=cy+focal*p.y*p.q;
          p.u*=p.q;
          p.v*=p.q;
          minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
          minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
        }
        if(maxX<0||minX>w||maxY<0||minY>h||maxX-minX<.32||maxY-minY<.32)continue;
        const normal=sign/Math.sqrt(len2), nx=ax*normal, ny=ay*normal, nz=az*normal;
        const diffuse=Math.max(0,-.40*nx-.33*ny-.82*nz);
        const mood=lighting.ambience(pz+eye);
        const wash=.238+.104*mood+(.193+.045*mood)*diffuse, base=data[i+13];
        const occlusion=material<BOOK_COUNT?0:grain>1.5?3:side<2&&grain<.5?1:side<4?2:0;
        const area=(Math.min(w,maxX)-Math.max(0,minX))*(Math.min(h,maxY)-Math.max(0,minY));
        const level=area>2400?0:area>640?1:area>125?2:3;
        const key=lighting.key(px,py,pz+eye,nx,ny,nz,airborne);
        const tile=tileIndex(material,side);
        for(let j=1;j<poly.length-1;j++){
          this.triangle(poly[0],poly[j],poly[j+1],tile,level,[nx,ny,nz],base,wash,key,fog,occlusion,mood,airborne);
        }
      }
    }
    this.ctx.putImageData(this.frame,0,0);
  }
}

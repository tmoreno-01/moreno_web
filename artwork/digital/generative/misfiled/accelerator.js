import {BAY} from './world.js?141';
import {ATLAS_COLS,ATLAS_ROWS,BOOK_COUNT,WOOD,WOOD_COLS,WOOD_ROWS,STRIDE,NEAR,FAR,LAMP_Y} from './geometry.js?141';

import {LIGHT_COUNT,SHADOW_COUNT,SHADOW_SIZE,SHADOW_SPREAD,SHADOW_FADE_START,SHADOW_FADE_END,BOUNCE_BASE,BOUNCE_FLOOR,HIGHLIGHT_KNEE,HIGHLIGHT_SOFTNESS,UPLIGHT_Y,UPLIGHT_REACH} from './lighting.js?141';

const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec4 axisX;
layout(location=1) in vec4 axisY;
layout(location=2) in vec4 axisZ;
layout(location=3) in vec4 info;
uniform vec2 projection;
uniform float eye;
flat out int tile;
flat out vec3 normal;
flat out float materialGain;
flat out float specular;
flat out int occlusion;
flat out int airborne;
out vec3 position;
out vec2 uv;
const vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(1,1),vec2(0,0),vec2(1,1),vec2(0,1));
void main(){
  int face=gl_VertexID/6, axis=face/2, material=int(info.x+.5);
  vec2 t=corners[gl_VertexID%6];
  float signOfFace=float(face%2)*2.-1.;
  vec3 axes[3]=vec3[3](axisX.xyz,axisY.xyz,axisZ.xyz);
  vec3 p=vec3(axisX.w,axisY.w,axisZ.w-eye);
  p+=axes[axis]*signOfFace+axes[axis==0?2:0]*(t.x*2.-1.)+axes[axis==2?1:axis==1?2:1]*(t.y*2.-1.);
  normal=normalize(axes[axis])*signOfFace;
  position=p;
  materialGain=info.y;
  specular=material>=${BOOK_COUNT}?.10:face<2?.043:.018;
  occlusion=material<${BOOK_COUNT}?0:info.z>1.5?3:face<2&&info.z<.5?1:face<4?2:0;
  airborne=info.w>1.5?1:0;
  if(dot(normal,p)>=0.||(info.w>.5&&airborne==0&&face!=4)){
    gl_Position=vec4(2.,2.,2.,1.);
    return;
  }
  uv=t;
  if(material<${BOOK_COUNT}){
    tile=material*4+(face==0?0:face==1?3:face==4?1:2);
    if(face==1||face==4)uv.x=1.-uv.x;
  }else{
    tile=${WOOD}+material-${BOOK_COUNT};
    if(info.z>.5&&(face<2||face>=4))uv=uv.yx;
  }
  const float near=${NEAR.toFixed(3)}, far=${FAR.toFixed(3)};
  gl_Position=vec4(p.x*projection.x,-p.y*projection.y,(far+near)/(far-near)*p.z-2.*far*near/(far-near),p.z);
}`;

const fragment=`#version 300 es
precision highp float;
uniform sampler2D atlas;
uniform sampler2D timber;
uniform highp sampler2D shadowDepth;
uniform vec4 lamps[${LIGHT_COUNT}];
uniform vec4 uplights[${LIGHT_COUNT}];
uniform float eye;
flat in int tile;
flat in vec3 normal;
flat in float materialGain;
flat in float specular;
flat in int occlusion;
flat in int airborne;
in vec3 position;
in vec2 uv;
out vec4 color;
float transmission(int i,vec3 offset){
  const int size=${SHADOW_SIZE};
  if(i>=${SHADOW_COUNT}||offset.y<.14)return 1.;
  vec2 at=(vec2(.5)+offset.xz/(offset.y*${SHADOW_SPREAD.toFixed(2)}*2.))*float(size)-.5;
  if(min(at.x,at.y)<0.||max(at.x,at.y)>=float(size-1))return 1.;
  ivec2 p=ivec2(at)+ivec2(0,(i+airborne*${SHADOW_COUNT})*size);
  vec2 f=fract(at);
  float slope=-2.*${SHADOW_SPREAD.toFixed(2)}/(float(size)*max(.035,-dot(normal,offset)));
  vec2 adjustment=normal.xz*slope;
  float depth=1./max(.14,offset.y-.029-offset.y*.004)-dot(adjustment,f);
  float scale=(offset.y*offset.y+.12)/.065;
  float a=clamp((texelFetch(shadowDepth,p,0).r-depth)*scale,0.,1.);
  float b=clamp((texelFetch(shadowDepth,p+ivec2(1,0),0).r-depth-adjustment.x)*scale,0.,1.);
  float c=clamp((texelFetch(shadowDepth,p+ivec2(0,1),0).r-depth-adjustment.y)*scale,0.,1.);
  float d=clamp((texelFetch(shadowDepth,p+ivec2(1,1),0).r-depth-adjustment.x-adjustment.y)*scale,0.,1.);
  return 1.-.91*mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
void main(){
  vec3 albedo;
  if(tile>=${WOOD}){
    int index=tile-${WOOD};
    vec2 cell=vec2(float(index%${WOOD_COLS}),float(index/${WOOD_COLS}));
    vec2 coord=(cell+mix(vec2(.009),vec2(.991),uv))/vec2(${WOOD_COLS}.0,${WOOD_ROWS}.0);
    albedo=texture(timber,coord).rgb;
  }else{
    vec2 cell=vec2(float(tile%${ATLAS_COLS}),float(tile/${ATLAS_COLS}));
    vec2 coord=(cell+mix(vec2(.011),vec2(.989),uv))/vec2(${ATLAS_COLS}.0,${ATLAS_ROWS}.0);
    albedo=texture(atlas,coord,tile%4==1?-.55:0.).rgb;
  }
  float ao=1.;
  if(occlusion==3)ao=.57+.43*min(1.,5.9*min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
  else if(occlusion>0){
    float recess=occlusion==1?uv.x:uv.y;
    ao=1.-.43*recess*recess;
  }
  float fog=smoothstep(17.,106.,position.z)*.91;
  const float bay=${BAY}, yLamp=${LAMP_Y.toFixed(3)};
  float fill=max(0.,dot(normal,vec3(-.40,-.33,-.82)));
  float key=0., highlight=0.;
  vec3 viewer=normalize(-position);
  float z=position.z+eye;
  float ambientAt=clamp(z/bay+.5,0.,float(${LIGHT_COUNT}-1));
  int ambientIndex=int(ambientAt);
  float mood=mix(lamps[ambientIndex].w,lamps[min(ambientIndex+1,${LIGHT_COUNT}-1)].w,smoothstep(0.,1.,fract(ambientAt)));
  float wash=.238+.104*mood+(.193+.045*mood)*fill;
  int band=int(floor(z/bay))+1;
  for(int j=-1;j<=1;j++){
    int i=band+j;
    if(i<0||i>=${LIGHT_COUNT})continue;
    vec4 uplight=uplights[i];
    float rise=${UPLIGHT_Y.toFixed(3)}-position.y;
    if(rise>.035&&uplight.z>0.){
      vec3 upOffset=vec3(position.x-uplight.x,-rise,z-uplight.y);
      float incidence=-dot(normal,upOffset);
      float squared=dot(upOffset,upOffset);
      float edge=1.-squared/${(UPLIGHT_REACH*UPLIGHT_REACH).toFixed(4)};
      if(incidence>0.&&edge>0.){
        float r=sqrt(squared),cone=clamp((rise/r-.18)*2.6,0.,1.);
        key+=uplight.z*incidence/r*cone*edge*edge/(.69+.36*squared);
      }
    }
    vec4 lamp=lamps[i];
    vec3 offset=vec3(position.x-lamp.x,position.y-yLamp,z-lamp.y);
    if(offset.y<.025||abs(offset.z)>bay*1.09)continue;
    float r2=dot(offset,offset), r=sqrt(r2);
    vec3 source=-offset/r;
    float normalLight=max(0.,dot(normal,source));
    float cone=clamp((offset.y/r-.21)*3.55,0.,1.);
    float attenuation=1.-smoothstep(bay*.6867,bay*1.09,abs(offset.z));
    if(normalLight<=0.||cone<=0.)continue;
    float shadowWeight=1.-smoothstep(${SHADOW_FADE_START.toFixed(4)},${SHADOW_FADE_END.toFixed(4)},lamp.y-eye);
    float shade=shadowWeight>0.?mix(1.,transmission(i,offset),shadowWeight):1.;
    float direct=lamp.z*normalLight*cone*attenuation*shade/(.67+.275*r2);
    key+=direct;
    float reflection=max(0.,dot(normal,normalize(source+viewer)));
    highlight+=specular*pow(reflection,23.)*direct;
  }
  float rolloff=max(0.,key-${HIGHLIGHT_KNEE});
  key=key-rolloff+rolloff/(1.+${HIGHLIGHT_SOFTNESS}*rolloff);
  float bounce=${BOUNCE_BASE}+${BOUNCE_FLOOR}*max(0.,normal.y);
  vec3 light=wash*vec3(.723+.133*mood,.871+.069*mood,1.205-.115*mood)+bounce*vec3(1.,.69,.42)+key*vec3(1.205,.935,.625);
  vec3 lit=albedo*materialGain*light*ao+highlight*vec3(1.,.84,.61);
  lit=lit/(1.+.16*max(vec3(0.),lit-.72));
  color=vec4(mix(lit,vec3(.067,.064,.079),fog),1.);
}`;
export const shaderSource={vertex,fragment};

export class Accelerator {
  constructor(canvas,atlas){
    const gl=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,stencil:false});
    if(!gl)throw new Error('WebGL2 is unavailable');
    const compile=(kind,code)=>{
      const shader=gl.createShader(kind);
      gl.shaderSource(shader,code);
      gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    const program=gl.createProgram();
    gl.attachShader(program,vs);
    gl.attachShader(program,fs);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);
    this.projection=gl.getUniformLocation(program,'projection');
    this.eye=gl.getUniformLocation(program,'eye');
    this.lamps=gl.getUniformLocation(program,'lamps[0]');
    this.uplights=gl.getUniformLocation(program,'uplights[0]');
    gl.bindVertexArray(gl.createVertexArray());
    this.buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(let i=0;i<4;i++){
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i,4,gl.FLOAT,false,STRIDE*4,i*16);
      gl.vertexAttribDivisor(i,1);
    }
    this.texture=gl.createTexture();
    this.timber=gl.createTexture();
    this.anisotropic=gl.getExtension('EXT_texture_filter_anisotropic');
    gl.uniform1i(gl.getUniformLocation(program,'timber'),2);
    this.uploadAtlas(atlas);
    this.shadows=gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,this.shadows);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,SHADOW_SIZE,SHADOW_SIZE*SHADOW_COUNT*2,0,gl.RED,gl.FLOAT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.uniform1i(gl.getUniformLocation(program,'shadowDepth'),1);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(.09,.071,.068,1);
    if(gl.getError()!==gl.NO_ERROR)throw new Error('Could not allocate the book atlas');
  }

  uploadAtlas(atlas){
    const gl=this.gl;
    for(const [unit,texture,image] of [[gl.TEXTURE0,this.texture,atlas.books],[gl.TEXTURE2,this.timber,atlas.wood]]){
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAX_LEVEL,3);
      gl.generateMipmap(gl.TEXTURE_2D);
      if(texture===this.texture&&this.anisotropic){
        const {TEXTURE_MAX_ANISOTROPY_EXT,MAX_TEXTURE_MAX_ANISOTROPY_EXT}=this.anisotropic;
        gl.texParameterf(gl.TEXTURE_2D,TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      }
    }
    gl.activeTexture(gl.TEXTURE0);
  }

  draw(data,length,width,height,focal,eye,lighting,staticChanged){
    const gl=this.gl;
    gl.viewport(0,0,width,height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(this.projection,2*focal/width,2*focal/height);
    gl.uniform1f(this.eye,eye);
    gl.uniform4fv(this.lamps,lighting.lamps);
    gl.uniform4fv(this.uplights,lighting.uplights);
    gl.activeTexture(gl.TEXTURE1);
    const rows=SHADOW_SIZE*SHADOW_COUNT;
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,SHADOW_SIZE,rows,gl.RED,gl.FLOAT,lighting.maps);
    if(staticChanged)gl.texSubImage2D(gl.TEXTURE_2D,0,0,rows,SHADOW_SIZE,rows,gl.RED,gl.FLOAT,lighting.stationary);
    gl.activeTexture(gl.TEXTURE0);
    gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,length),gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES,0,36,length/STRIDE);
  }
}

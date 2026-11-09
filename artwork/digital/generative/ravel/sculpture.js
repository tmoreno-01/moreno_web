import {Sculpture} from './sculpture-world.js?edition=72';
import {renderSculpture} from './sculpture-canvas.js?edition=72';
import {createActivityLoop} from '../activity.js';
const canvas=document.createElement('canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','Living Reliquary. An autonomous evolving three-dimensional sculpture.');document.body.prepend(canvas);
const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
let ctx=null,worker=null,busy=false,workerMs=0;
if(!gl&&canvas.transferControlToOffscreen){worker=new Worker(new URL('./sculpture-worker.js?edition=72',import.meta.url),{type:'module'});const offscreen=canvas.transferControlToOffscreen();worker.postMessage({type:'init',canvas:offscreen},[offscreen]);worker.onmessage=e=>{if(e.data.type==='frame'){busy=false;workerMs=e.data.ms;}else if(e.data.type==='error'){busy=false;console.error(e.data.message);}};}else if(!gl)ctx=canvas.getContext('2d',{alpha:false});
const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec2 uv;
uniform vec3 points[8];
uniform float time,phase,width,style,growth,twist;
uniform mat3 rotation;
out vec3 pos,norm;out vec2 tex;out float folds;
vec3 curve(float s){float f=clamp(s,0.,.99999)*7.;int i=int(f);float t=fract(f);vec3 a=points[max(0,i-1)],b=points[i],c=points[min(7,i+1)],d=points[min(7,i+2)];return .5*((2.*b)+(-a+c)*t+(2.*a-5.*b+4.*c-d)*t*t+(-a+3.*b-3.*c+d)*t*t*t);}
vec3 surface(vec2 q){float u=q.x*growth;float v=q.y*6.2831853;vec3 p=curve(u),T=normalize(curve(min(.9999,u+.002))-curve(max(0.,u-.002)));vec3 B=normalize(cross(T,vec3(.213,1.,.127))),N=cross(B,T);float taper=pow(max(.001,sin(q.x*3.14159)),.48);float fold=sin(v*(style<.5?7.:3.)+u*twist*3.+phase+time*.23);float ribs=sin(u*(style<.5?180.:240.)+phase+time*.65);float rad=width*taper*(1.+fold*(style<.5?.28:.1)+ribs*.035);float angle=v+u*twist;float flatScale=style<.5?.52:1.;return p+(B*cos(angle)+N*sin(angle)*flatScale)*rad;}
void main(){vec3 p=surface(uv);vec3 du=surface(vec2(min(.9999,uv.x+.0005),uv.y))-surface(vec2(max(.0001,uv.x-.0005),uv.y));vec3 dv=surface(uv+vec2(0.,.0005))-surface(uv-vec2(0.,.0005));pos=rotation*p;norm=normalize(rotation*cross(dv,du));tex=uv;folds=style;float z=4.6-pos.z;gl_Position=vec4(pos.x*2.3,pos.y*2.3,(z-2.0)*1.2,z);}`;
const fragment=`#version 300 es
precision highp float;
in vec3 pos,norm;in vec2 tex;in float folds;
uniform vec3 ink;uniform float time,phase;
out vec4 colour;
void main(){vec3 N=normalize(norm);if(!gl_FrontFacing)N=-N;
 // Fine engraved lamellae follow the growing surface, rather than screen-space noise.
 float ridge=sin(tex.x*(folds<.5?520.:760.)+sin(tex.y*37.+tex.x*25.)*1.7+time*.3+phase);
 vec3 tangent=normalize(dFdx(pos));N=normalize(N+tangent*ridge*.1);
 vec3 V=normalize(vec3(0.,0.,4.6)-pos),L=normalize(vec3(-2.5,4.,4.)),R=reflect(-V,N);
 float diffuse=max(dot(N,L),0.),rim=pow(1.-max(dot(N,V),0.),3.);
 float spec=pow(max(dot(N,normalize(L+V)),0.),38.);
 float striation=.89+.11*ridge;
 float pores=sin(tex.x*1230.+phase)*sin(tex.y*167.+tex.x*63.);
 float patina=smoothstep(.12,.8,sin(tex.x*21.+sin(tex.y*9.)+phase)*sin(tex.y*5.+time*.07));
 vec3 base=mix(ink,ink*.36+vec3(.025,.065,.055),patina*.38)*striation;
 float cavity=.72+.28*smoothstep(0.,1.8,length(pos));
 vec3 light=base*(.25+diffuse*.85)*cavity;
 light+=vec3(.9,.83,.67)*spec*.7;
 light+=vec3(.23,.42,.45)*pow(max(dot(N,normalize(vec3(3.,-.4,-2.))),0.),2.)*.5;
 light+=rim*(vec3(.22,.28,.25)+ink*.3);
 light+=pow(max(0.,R.y*.7+R.x*.25),12.)*vec3(.28,.29,.24);
 light*=1.+pores*.025;
 colour=vec4(pow(max(light,vec3(0.)),vec3(.82)),1.);}`;
function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
let program,loc={},indices=[];
if(gl){
program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
for(const n of ['points','time','phase','width','style','growth','twist','rotation','ink'])loc[n]=gl.getUniformLocation(program,n);
const vertices=[],long=112,around=24;
for(let i=0;i<=long;i++)for(let j=0;j<=around;j++)vertices.push(Math.max(.0002,Math.min(.9998,i/long)),j/around);
for(let i=0;i<long;i++)for(let j=0;j<around;j++){let a=i*(around+1)+j,b=a+around+1;indices.push(a,a+1,b,b,a+1,b+1);}
const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
}
const world=new Sculpture(crypto.getRandomValues(new Uint32Array(1))[0]);let frames=0,ms=0,scale=1;
function draw(dt){world.update(dt);const start=performance.now();let size=Math.round(Math.min(gl?1000:650,innerWidth*Math.min(devicePixelRatio||1,1.5))*scale);if(!worker&&canvas.width!==size)canvas.width=canvas.height=size;if(gl){gl.viewport(0,0,size,size);gl.clearColor(.075,.085,.085,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const a=world.time*.035+Math.sin(world.time*.041)*.2,b=-.24+Math.sin(world.time*.071)*.14,c=Math.cos(a),s=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
 gl.uniformMatrix3fv(loc.rotation,false,new Float32Array([c,sb*s,-cb*s,0,cb,sb,s,-sb*c,cb*c]));gl.uniform1f(loc.time,world.time);
 for(const body of world.bodies){gl.uniform3fv(loc.points,body.points.flat());gl.uniform3fv(loc.ink,body.colour);for(const n of ['phase','width','style','growth','twist'])gl.uniform1f(loc[n],body[n]);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);}
 }else if(worker){if(!busy){busy=true;worker.postMessage({type:"frame",size,world:world.snapshot(),quality:scale});}}else renderSculpture(ctx,size,world,scale);
 ms=ms*.9+(worker?workerMs:performance.now()-start)*.1;frames++;if(frames%20===0&&ms>29)scale=Math.max(.65,scale*.9);
 Object.assign(canvas.dataset,{edition:'72',renderer:gl?'webgl2':worker?'worker-software-3d':'software-3d',frames:String(frames),time:world.time.toFixed(2),drawMs:ms.toFixed(2),population:'28',events:String(world.events),renderScale:scale.toFixed(2)});
}
const loop=createActivityLoop({fps:30,update:draw,draw:()=>{}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();loop.setLost(true);});canvas.addEventListener('webglcontextrestored',()=>location.reload());
window.livingArtwork={snapshot:()=>({version:72,kind:8,state:world.snapshot()}),restore:s=>{if(s?.version===72&&s.kind===8){world.restore(s.state);draw(0);}}};
addEventListener('resize',()=>draw(0));addEventListener('keydown',e=>{if(e.key==='Escape')parent.postMessage({type:'living-close'},location.origin);});
document.title='Living Reliquary — Tyrone Moreno';document.querySelector('#error').style.display='none';draw(0);parent.postMessage({type:'living-ready'},location.origin);

export class OrganicGL{
 constructor(gl){this.gl=gl;
 const vertex=`#version 300 es
 precision highp float;
 layout(location=0) in vec2 uv;
 uniform vec3 center,angles;uniform float radius,curl,ripple,fold,aspect,phase,style,layer,time;uniform mat3 camera;
 out vec3 pos,norm;out vec2 tex;
 vec3 orient(vec3 p){float c=cos(angles.x),s=sin(angles.x);p.yz=mat2(c,s,-s,c)*p.yz;c=cos(angles.y);s=sin(angles.y);p.xz=mat2(c,-s,s,c)*p.xz;c=cos(angles.z);s=sin(angles.z);p.xy=mat2(c,s,-s,c)*p.xy;return p+center;}
 vec3 surf(vec2 q){float u=q.x,a=q.y*6.2831853,wave=phase+time*.31,r=radius*(1.-layer*.14)*(1.+.045*sin(time*.8+phase));
 if(style>.5&&style<1.5){float lat=u*3.14159265,rr=r*sin(lat)*(1.+.11*sin(a*9.+wave)*pow(sin(lat),2.));return orient(vec3(rr*cos(a),rr*sin(a)*aspect,r*cos(lat)*1.1+.009*sin(a*19.+lat*17.+wave)));}
 if(style>1.5)a=(q.y-.5)*4.7;
 float morph=(fold-3.)/9.,ruffle=sin(a*5.+wave)*(1.-morph)+sin(a*9.-wave)*morph+.15*sin(a*13.-wave*.7);
 float rad=r*u*(.88+.12*sin(a*3.+wave)+.06*sin(a*7.-wave));
 float z=curl*(u*u-.35)+ripple*ruffle*u*u-layer*.044;
 z+=.0035*sin(a*105.+u*12.+wave)*u;
 return orient(vec3(rad*cos(a),rad*sin(a)*aspect,z));}
 void main(){vec3 p=surf(uv),du=surf(uv+vec2(.0003,0.))-surf(uv-vec2(.0003,0.)),dv=surf(uv+vec2(0.,.0003))-surf(uv-vec2(0.,.0003));pos=camera*p;norm=normalize(camera*cross(du,dv));tex=uv;float z=3.8-pos.z;gl_Position=vec4(pos.x*2.24,pos.y*2.24,1.2*z-2.4,z);}`;
 const fragment=`#version 300 es
 precision highp float;
 in vec3 pos,norm;in vec2 tex;uniform vec3 ink;uniform float style,phase,time;
 out vec4 colour;
 void main(){vec3 N=normalize(norm);if(!gl_FrontFacing)N=-N;vec3 V=normalize(vec3(0.,0.,3.8)-pos),L=normalize(vec3(-2.,3.,4.));
 float ribs=sin(tex.y*660.+sin(tex.x*19.+phase)*.7),veins=sin(tex.x*280.+sin(tex.y*80.)*2.);
 float pores=pow(max(0.,sin(tex.x*140.+phase)*sin(tex.y*260.)),8.);
 float micro=style>.5&&style<1.5?1.-pores*.46:.91+.09*ribs;
 vec3 base=ink*micro;float diff=max(dot(N,L),0.),rim=pow(1.-max(dot(N,V),0.),2.8),spec=pow(max(dot(N,normalize(L+V)),0.),42.);
 float ao=.55+.45*smoothstep(.0,1.05,length(pos));
 vec3 light=base*(.28+.72*diff)*ao;
 light+=vec3(.9,.86,.76)*spec*.3;
 light+=base*max(dot(-N,L),0.)*.19;
 light+=vec3(.20,.26,.23)*rim*.35;
 if(style<.5||style>1.5){light*=.97+.03*veins;light+=ink*.12*smoothstep(.94,1.,tex.x);}
 colour=vec4(pow(max(light,vec3(0.)),vec3(.85)),1.);}`;
 const shader=(type,source)=>{let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));this.p=p;gl.useProgram(p);this.loc={};for(const n of ['center','angles','radius','curl','ripple','fold','aspect','phase','style','layer','time','camera','ink'])this.loc[n]=gl.getUniformLocation(p,n);
 const vertices=[],indices=[],nu=36,nv=144;for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)vertices.push(Math.max(.0001,Math.min(.9999,i/nu)),j/nv);for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){let a=i*(nv+1)+j,b=a+nv+1;indices.push(a,b,a+1,b,b+1,a+1);}this.count=indices.length;
 gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);gl.enable(gl.DEPTH_TEST);
 }
 draw(size,world){const gl=this.gl,l=this.loc,t=world.time;gl.viewport(0,0,size,size);gl.clearColor(.067,.092,.082,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let a=t*.065+Math.sin(t*.073)*.25,c=Math.cos(a),s=Math.sin(a),b=.16+Math.sin(t*.11)*.13,cb=Math.cos(b),sb=Math.sin(b);gl.uniformMatrix3fv(l.camera,false,new Float32Array([c,s*sb,-s*cb,0,cb,sb,s,-c*sb,c*cb]));gl.uniform1f(l.time,t);
  for(const b of world.bodies){const p=b.p;gl.uniform3fv(l.center,p.slice(0,3));gl.uniform3fv(l.angles,[p[3]+Math.sin(t*.23+b.phase)*.08,p[4],p[5]]);gl.uniform3fv(l.ink,b.ink.map(v=>v/255));for(const [n,v]of Object.entries({radius:p[6],curl:p[7],ripple:p[8],fold:p[9],aspect:p[10],phase:p[11],style:b.type}))gl.uniform1f(l[n],v);for(let layer=0;layer<(b.type===1?1:3);layer++){gl.uniform1f(l.layer,layer);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);}}
 }
}

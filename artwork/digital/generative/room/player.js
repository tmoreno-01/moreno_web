import * as T from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import * as C from './vendor/cannon-es.js';
import {createActivityLoop} from '../activity.js';
const canvas=document.querySelector('canvas');
try {
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new T.Scene();scene.background=null;renderer.setClearColor(0xffffff,0);scene.fog=new T.Fog(0xffffff,18,48);
const camera=new T.PerspectiveCamera(35,1,.1,80);
const room=new T.Group();scene.add(room);
const world=new C.World({gravity:new C.Vec3(0,-9.8,0)});world.allowSleep=true;world.solver.iterations=25;world.defaultContactMaterial.friction=.13;world.defaultContactMaterial.restitution=.08;
const mat=(color,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const plaster=mat(0xbcbcbc),floorMat=mat(0xaaaaaa),white=mat(0xd1d1d1),fabric=mat(0xaaaaaa),dark=mat(0x505050),wood=mat(0x909090),metal=mat(0x999999,.32,.65),paper=mat(0xd9d9d9);
// Fine monochrome weave adds scale without coloured texture or visual noise.
const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const ctx=texCanvas.getContext('2d');ctx.fillStyle='#999';ctx.fillRect(0,0,128,128);for(let i=0;i<128;i+=2){ctx.strokeStyle=i%4?'#aaa':'#888';ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,128);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(128,i);ctx.stroke();}const weave=new T.CanvasTexture(texCanvas);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(4,4);fabric.bumpMap=weave;fabric.bumpScale=.025;
const objects=[],meshes=[];
function box(group,size,pos,material){const m=new T.Mesh((Math.min(...size)>.1?new RoundedBoxGeometry(...size,2,material===fabric?.07:.018):new T.BoxGeometry(...size)),material);m.position.set(...pos);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
function cylinder(group,top,bottom,height,pos,material){const m=new T.Mesh(new T.CylinderGeometry(top,bottom,height,32),material);m.position.set(...pos);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
function body(name,pos,mass,parts,build){const group=new T.Group();room.add(group);const b=new C.Body({mass,material:world.defaultMaterial,allowSleep:true,sleepSpeedLimit:.22,sleepTimeLimit:1,linearDamping:.2,angularDamping:.36});b.position.set(...pos);for(const [s,p] of parts)b.addShape(new C.Box(new C.Vec3(s[0]/2,s[1]/2,s[2]/2)),new C.Vec3(...p));world.addBody(b);build(group);group.position.copy(b.position);group.userData.body=b;group.traverse(m=>{if(m.isMesh){m.userData.body=b;meshes.push(m);}});objects.push({name,group,b,home:b.position.clone()});return b;}
function fixed(size,pos,material,visible=true){if(visible)box(room,size,pos,material);const b=new C.Body({mass:0,material:world.defaultMaterial,shape:new C.Box(new C.Vec3(...size.map(v=>v/2)))});b.position.set(...pos);world.addBody(b);}
// A finite architectural fragment: the slab has a visible edge and no ground below it.
fixed([10,.4,7.7],[0,-.2,0],null,false);box(room,[10,.045,7.7],[0,-.0225,0],floorMat);
// Four wall sections leave a real aperture; light and its shadows pass through.
fixed([4.6,3.65,.22],[-2.7,1.825,-3.85],plaster,false);
fixed([1,3.65,.22],[4.5,1.825,-3.85],plaster,false);
fixed([4.4,1.05,.22],[1.8,.525,-3.85],plaster,false);
fixed([4.4,.25,.22],[1.8,3.525,-3.85],plaster,false);
const backOutline=new T.Shape();backOutline.moveTo(-5,0);backOutline.lineTo(5,0);backOutline.lineTo(5,3.65);backOutline.lineTo(-5,3.65);backOutline.closePath();const windowHole=new T.Path();windowHole.moveTo(-.4,1.05);windowHole.lineTo(-.4,3.4);windowHole.lineTo(4,3.4);windowHole.lineTo(4,1.05);windowHole.closePath();backOutline.holes.push(windowHole);
const backWall=new T.Mesh(new T.ExtrudeGeometry(backOutline,{depth:.22,bevelEnabled:false}),plaster);backWall.position.z=-3.96;backWall.castShadow=backWall.receiveShadow=true;room.add(backWall);
fixed([.16,3.65,5.15],[5,1.825,-1.275],plaster,false);
fixed([.16,3.65,1.35],[5,1.825,3.175],plaster,false);
fixed([.16,1.05,1.2],[5,3.125,1.9],plaster,false);
// One continuous wall mesh avoids seams and rounded edges above the doorway.
const sideOutline=new T.Shape();sideOutline.moveTo(-3.85,0);for(const [z,y] of [[1.3,0],[1.3,2.6],[2.5,2.6],[2.5,0],[3.85,0],[3.85,3.65],[-3.85,3.65]])sideOutline.lineTo(z,y);sideOutline.closePath();
const sideWall=new T.Mesh(new T.ExtrudeGeometry(sideOutline,{depth:.16,bevelEnabled:false}),plaster);sideWall.rotation.y=-Math.PI/2;sideWall.position.x=5.08;sideWall.castShadow=sideWall.receiveShadow=true;room.add(sideWall);
// Continuous architrave with a consistent narrow reveal around the hinged leaf.
for(const z of [1.26,2.54]){fixed([.11,2.7,.075],[4.83,1.35,z],paper);box(room,[.14,2.62,.025],[4.81,1.31,z+(z<1.9?.045:-.045)],white);}
fixed([.11,.075,1.355],[4.83,2.6625,1.9],paper);
box(room,[.14,.025,1.2],[4.81,2.6125,1.9],white);
const door=body('hinged door',[4.87,1.3,1.9],6,[[[.055,2.58,1.16],[0,0,0]]],g=>{
box(g,[.055,2.58,1.16],[0,0,0],white);
for(const y of [-.64,.58]){box(g,[.015,.87,.88],[-.035,y,0],plaster);for(const z of [-.455,.455])box(g,[.025,.92,.025],[-.047,y,z],paper);for(const dy of [-.45,.45])box(g,[.025,.025,.935],[-.047,y+dy,0],paper);}
const rose=cylinder(g,.04,.04,.018,[-.05,-.18,-.43],metal);rose.rotation.z=Math.PI/2;
const spindle=cylinder(g,.012,.012,.055,[-.085,-.18,-.43],metal);spindle.rotation.z=Math.PI/2;
const lever=cylinder(g,.012,.012,.15,[-.11,-.18,-.36],metal);lever.rotation.x=Math.PI/2;
for(const y of [-1,.8]){const hinge=cylinder(g,.018,.018,.1,[0,y,.59],metal);}
});
door.angularDamping=.35;
const doorAnchor=new C.Body({mass:0,position:new C.Vec3(4.87,1.3,2.48)});world.addBody(doorAnchor);
const doorHinge=new C.HingeConstraint(doorAnchor,door,{pivotA:new C.Vec3(0,0,0),axisA:new C.Vec3(0,1,0),pivotB:new C.Vec3(0,0,.58),axisB:new C.Vec3(0,1,0),collideConnected:false,maxForce:1e5});world.addConstraint(doorHinge);
// Invisible low rails keep bodies on the suspended slab without closing the view.
fixed([.35,12,8.4],[-5.175,5,0],null,false);fixed([.35,12,8.4],[5.175,5,0],null,false);
fixed([10.7,12,.35],[0,5,4.025],null,false);fixed([10.7,12,.35],[0,5,-4.025],null,false);fixed([10.7,.25,8.4],[0,3.775,0],null,false);
box(room,[9.8,.11,.055],[0,.06,-3.74],white);box(room,[.055,.11,5.02],[4.89,.06,-1.28],white);box(room,[.055,.11,1.18],[4.89,.06,3.2],white);
// White exterior is visible through the aperture, but never occludes the light.
const sky=box(room,[4.4,2.35,.012],[1.8,2.225,-4.04],new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}));sky.castShadow=false;sky.receiveShadow=false;sky.material.color.setRGB(4.8,4.8,4.8);
for(const x of [-.4,.7,1.8,2.9,4])fixed([.055,2.35,.14],[x,2.225,-3.8],white);
for(const y of [1.05,1.05+2.35/3,1.05+2.35*2/3,3.4])fixed([4.45,.055,.14],[1.8,y,-3.8],white);
fixed([4.65,.1,.4],[1.8,1.02,-3.66],white);
// A restrained optical halo around the luminous opening.
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const gc=glowCanvas.getContext('2d'),gradient=gc.createRadialGradient(64,64,2,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.45)');gradient.addColorStop(.4,'rgba(255,255,255,.13)');gradient.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=gradient;gc.fillRect(0,0,128,128);const glow=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(glowCanvas),transparent:true,opacity:.42,depthWrite:false,blending:T.AdditiveBlending}));glow.position.set(1.8,2.5,-3.55);glow.scale.set(6,4,1);room.add(glow);
// Floorboard joints, narrow enough to remain quiet at phone scale.
for(let x=-4.5;x<5;x+=.5)box(room,[.008,.003,7.6],[x,.003,0],mat(0x858585));
for(let i=0;i<20;i++){const x=-4.75+i*.5;box(room,[.495,.003,.008],[x,.004,(i%3-1)*2.2],mat(0x858585));}
// Straight three-seat sofa; cushions and piping move as one solid object.
body('sofa',[-2.4,.23,-1.7],20,[[[3.5,.55,1.35],[0,.45,0]],[[3.5,.9,.25],[0,1,-.58]],[[.25,.65,1.4],[-1.64,.75,0]],[[.25,.65,1.4],[1.64,.75,0]],...[-1.4,1.4].flatMap(x=>[-.45,.45].map(z=>[[.09,.27,.09],[x,.02,z]]))],g=>{
box(g,[3.5,.42,1.35],[0,.4,0],fabric);box(g,[3.45,.85,.26],[0,.97,-.58],fabric);
for(const x of [-1.1,0,1.1]){box(g,[1.04,.23,1.08],[x,.72,.05],fabric);
for(const z of [-.47,.57])box(g,[.96,.009,.009],[x,.79,z],white);box(g,[1.03,.65,.18],[x,1.02,-.36],fabric);}
for(const x of [-1.66,1.66])box(g,[.26,.64,1.4],[x,.72,0],fabric);
for(const x of [-1.4,1.4])for(const z of [-.45,.45])box(g,[.09,.27,.09],[x,.02,z],dark);
});
// Woven rug remains an architectural anchor as the furniture slides over it.
const rug=box(room,[4.7,.018,3.2],[-.5,.012,.55],mat(0xb0b0b0));rug.material.bumpMap=weave;rug.material.bumpScale=.012;
for(let i=0;i<50;i++){box(room,[.015,.012,.13],[-2.8+i*.094,.017,2.2],white);box(room,[.015,.012,.13],[-2.8+i*.094,.017,-1.1],white);}
body('coffee table',[-.3,.49,.6],7,[[[2.35,.12,1.15],[0,0,0]],...[-.95,.95].flatMap(x=>[-.4,.4].map(z=>[[.075,.45,.075],[x,-.27,z]]))],g=>{box(g,[2.35,.12,1.15],[0,0,0],wood);for(const x of [-.95,.95])for(const z of [-.4,.4])box(g,[.075,.45,.075],[x,-.27,z],dark);});
function chair(x,z,angle){
const parts=[[[.85,.09,.88],[0,0,0]],...[-.33,.33].flatMap(x=>[-.34,.34].map(z=>[[.065,.49,.065],[x,-.27,z]])),...[-.35,.35].map(x=>[[.065,.78,.065],[x,.39,-.37]]),[[.78,.12,.07],[0,.74,-.37]],...[-.21,0,.21].map(x=>[[.055,.54,.045],[x,.39,-.37]])];
const b=body('wooden chair',[x,.52,z],3.8,parts,g=>{for(const [size,pos] of parts){if(size[0]===.055&&size[1]===.54&&size[2]===.045)box(g,[.055,.68,.045],[pos[0],.365,pos[2]],wood);else box(g,size,pos,wood);}
for(const z of [-.34,.34])box(g,[.68,.035,.035],[0,-.28,z],wood);
for(const x of [-.33,.33])box(g,[.035,.035,.68],[x,-.28,0],wood);
for(const x of [-.32,.32])for(const z of [-.3,.3]){const pin=cylinder(g,.012,.012,.005,[x,.047,z],metal);}
});b.quaternion.setFromEuler(0,angle,0);
}
chair(1.6,-.55,-.45);chair(.7,2.5,2.7);
// A hollow carcass: drawers and contents have independent collision bodies.
const chestStart=objects.length;
const chestParts=[[[1.1,.07,1.5],[0,.665,0]],[[1.1,.07,1.5],[0,-.665,0]],[[.07,1.26,1.5],[-.515,0,0]],...[-.715,.715].map(z=>[[1.03,1.26,.07],[.035,0,z]])];
for(const y of [-.61,-.19,.23])for(const z of [-.62,.62])chestParts.push([[.96,.035,.08],[.04,y,z]]);
body('chest carcass',[-3.9,.7,1.5],28,chestParts.slice(0,5),g=>{for(const [size,pos] of chestParts)box(g,size,pos,wood);});
for(let row=0;row<3;row++){
const cy=.28+row*.42, drawerParts=[[[.94,.035,1.18],[0,-.14,0]],[[.045,.25,1.18],[-.4475,.0175,0]],...[-.5725,.5725].map(z=>[[.94,.25,.035],[0,.0175,z]]),[[.055,.33,1.38],[.59,0,0]]];
body('loose drawer',[-3.87,cy,1.5],1.6,drawerParts,g=>{for(const [size,pos] of drawerParts){if(size[0]===.94)box(g,[1.045,size[1]===.25?.275:size[1],size[2]],[.0525,size[1]===.25?.005:pos[1],pos[2]],wood);else if(size[1]===.25)box(g,[size[0],.275,size[2]],[pos[0],.005,pos[2]],wood);else box(g,size,pos,pos[0]>.48?white:wood);}box(g,[.05,.026,.3],[.64,.07,0],metal);for(const z of [-.135,.135])box(g,[.055,.026,.026],[.62,.07,z],metal);});
for(let i=0;i<4;i++)body('pen',[-4.1+i*.14,cy-.1,1.18],.035,[[[.023,.023,.29],[0,0,0]]],g=>{const pen=cylinder(g,.0115,.0115,.26,[0,0,0],i%2?dark:metal);pen.rotation.x=Math.PI/2;const tip=new T.Mesh(new T.ConeGeometry(.011,.035,12),metal);tip.rotation.x=Math.PI/2;tip.position.z=.145;g.add(tip);box(g,[.008,.008,.07],[.012,.01,-.075],white);});
body('pocket notebook',[-3.92,cy-.09,1.66],.12,[[[.32,.045,.4],[0,0,0]]],g=>{box(g,[.32,.045,.4],[0,0,0],row%2?dark:paper);box(g,[.29,.032,.38],[.012,0,0],paper);});
body('small eraser',[-3.6,cy-.09,1.83],.04,[[[.09,.04,.15],[0,0,0]]],g=>box(g,[.09,.04,.15],[0,0,0],white));
body('tape roll',[-4.13,cy-.08,1.99],.07,[[[.13,.06,.13],[0,0,0]]],g=>{const tape=new T.Mesh(new T.TorusGeometry(.045,.018,10,20),paper);tape.rotation.x=Math.PI/2;g.add(tape);});
}

const chestRotation=new C.Quaternion();chestRotation.setFromEuler(0,0,0);
for(const o of objects.slice(chestStart)){const rel=new C.Vec3(o.b.position.x+3.9,o.b.position.y-.7,o.b.position.z-1.5);const v=chestRotation.vmult(rel);v.x-=3.9;v.y+=.7;v.z+=1.5;o.b.position.copy(v);o.home.copy(v);o.b.quaternion.copy(chestRotation);o.group.position.copy(v);o.group.quaternion.copy(chestRotation);}
// Separate small bodies make collisions legible: books, a bowl, a sphere and a fallen frame.
for(let i=0;i<4;i++)body('book',[-.65+i*.04,.61+i*.075,.55],.35,[[[.52,.07,.36],[0,0,0]]],g=>{box(g,[.52,.07,.36],[0,0,0],i%2?dark:paper);box(g,[.49,.04,.34],[.015,0,.01],paper);});
const fruitBowl=body('fruit bowl',[.45,.61,.55],.75,[[[.4,.045,.4],[0,0,0]]],g=>{const profile=[[0,0],[.15,0],[.24,.055],[.31,.16],[.32,.18],[.30,.18],[.285,.15],[.22,.07],[.14,.025],[0,.025]].map(p=>new T.Vector2(...p));const bowlMesh=new T.Mesh(new T.LatheGeometry(profile,40),white);bowlMesh.castShadow=bowlMesh.receiveShadow=true;g.add(bowlMesh);});
for(let i=0;i<16;i++){const angle=i*Math.PI/8,q=new C.Quaternion();q.setFromEuler(0,-angle,0);fruitBowl.addShape(new C.Box(new C.Vec3(.065,.085,.025)),new C.Vec3(Math.sin(angle)*.265,.095,Math.cos(angle)*.265),q);}
for(let i=0;i<5;i++){const radius=.075+(i%2)*.009,b=new C.Body({mass:.18,shape:new C.Sphere(radius),allowSleep:true,sleepSpeedLimit:.15,sleepTimeLimit:1,linearDamping:.12,angularDamping:.2});b.position.set(.45+Math.sin(i*2.4)*.115,.84+Math.floor(i/3)*.2,.55+Math.cos(i*2.4)*.115);world.addBody(b);const g=new T.Group();room.add(g);const fruit=new T.Mesh(new T.SphereGeometry(radius,24,18),mat(i%2?0xaaaaa5:0xbab8ae,.75));fruit.castShadow=fruit.receiveShadow=true;g.add(fruit);const stem=cylinder(g,.008,.006,.045,[0,radius+.012,0],wood);g.traverse(m=>{if(m.isMesh){m.userData.body=b;meshes.push(m);}});objects.push({name:i%2?'pear':'apple',b,group:g,home:b.position.clone()});}

body('ottoman',[-.8,.3,2.65],4,[[[.85,.6,.85],[0,0,0]]],g=>box(g,[.85,.6,.85],[0,0,0],fabric));
function addLampLight(group,y,power){
const light=new T.SpotLight(0xffffff,power,9,Math.PI*.31,.08,2);light.position.set(0,y,0);const target=new T.Object3D();target.position.set(0,y-2,0);group.add(target);light.target=target;light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.radius=.5;light.shadow.bias=-.0003;light.shadow.normalBias=.025;light.shadow.camera.near=.08;group.add(light);
const glow=new T.PointLight(0xffffff,1.6,1.2,2);glow.position.set(0,y+.12,0);group.add(glow);
}
body('floor lamp',[3.9,.12,-2.95],5,[[[.62,.18,.62],[0,0,0]],[[.07,1.9,.07],[0,1,0]],[[.72,.45,.72],[0,2,0]]],g=>{cylinder(g,.32,.32,.12,[0,0,0],metal);cylinder(g,.025,.025,1.9,[0,.98,0],metal);const shadeMat=white.clone();shadeMat.side=T.DoubleSide;shadeMat.bumpMap=weave;shadeMat.bumpScale=.008;const shade=new T.Mesh(new T.CylinderGeometry(.27,.43,.5,48,1,true),shadeMat);shade.position.y=1.95;shade.castShadow=shade.receiveShadow=true;g.add(shade);
for(const [r,y] of [[.27,2.2],[.43,1.7]]){const rim=new T.Mesh(new T.TorusGeometry(r,.012,8,48),white);rim.rotation.x=Math.PI/2;rim.position.y=y;g.add(rim);}
cylinder(g,.045,.045,.18,[0,1.82,0],metal);const bulb=new T.Mesh(new T.SphereGeometry(.065,16,12),paper);bulb.material=new T.MeshBasicMaterial({color:0xffffff});bulb.position.y=1.94;g.add(bulb);addLampLight(g,1.66,18);for(let i=0;i<3;i++){const strut=box(g,[.26,.012,.012],[Math.cos(i*2.094)*.13,1.76,Math.sin(i*2.094)*.13],metal);strut.rotation.y=-i*2.094;}});
// Open bookcase with individual shelves and loose, differently sized books.
const shelfParts=[[[1.7,.1,.55],[0,-1.3,0]],[[.08,2.7,.55],[-.81,0,0]],[[.08,2.7,.55],[.81,0,0]],[[1.7,.1,.55],[0,1.3,0]]];
for(const y of [-.65,0,.65])shelfParts.push([[1.6,.065,.55],[0,y,0]]);
body('bookcase',[-4,1.4,-2.75],35,shelfParts,g=>{for(const [size,pos] of shelfParts)box(g,size,pos,wood);box(g,[1.65,2.65,.035],[0,0,-.26],mat(0x666666));});
for(let row=0;row<4;row++)for(let j=0;j<(row==1?3:6);j++){const h=.25+((j*7+row*3)%7)*.045,w=.07+(j%4)*.03;const x=-4.62+j*.19,y=.15+row*.65+h/2;
body('shelf book',[x,y,-2.72],.18,[[[w,h,.32],[0,0,0]]],g=>{box(g,[w,h,.32],[0,0,0],j%3===0?dark:j%3===1?paper:wood);box(g,[w*.8,h*.91,.31],[0,0,.012],paper);box(g,[w,.018,.008],[0,-h*.25,.166],white);});}
// Ordinary domestic clutter, each a small independent rigid body.
body('side table',[2.9,.82,-2.8],4,[[[.85,.09,.65],[0,0,0]],[[.14,.78,.14],[0,-.4,0]]],g=>{box(g,[.85,.09,.65],[0,0,0],wood);box(g,[.14,.78,.14],[0,-.4,0],wood);box(g,[.55,.06,.45],[0,-.78,0],wood);});
function mug(x,y,z){body('mug',[x,y,z],.22,[[[.18,.21,.18],[0,0,0]]],g=>{const m=new T.Mesh(new T.CylinderGeometry(.095,.08,.21,24,1,true),new T.MeshStandardMaterial({color:0xc9c9c9,roughness:.3,side:T.DoubleSide}));m.castShadow=true;g.add(m);cylinder(g,.08,.08,.012,[0,-.1,0],white);const handle=new T.Mesh(new T.TorusGeometry(.065,.018,8,18),white);handle.position.x=.105;g.add(handle);});}
mug(2.9,.98,-2.8);
for(let i=0;i<3;i++)body('magazine',[-3.9+i*.04,1.44+i*.025,1.5],.15,[[[.4,.025,.52],[0,0,0]]],g=>{box(g,[.4,.025,.52],[0,0,0],paper);box(g,[.25,.004,.12],[0,.015,.08],dark);});
body('remote',[-.1,.59,.98],.1,[[[.09,.035,.26],[0,0,0]]],g=>{box(g,[.09,.035,.26],[0,0,0],dark);for(let i=0;i<5;i++)box(g,[.04,.006,.018],[0,.02,-.08+i*.033],white);});

body('tissue box',[2.65,.97,-2.7],.2,[[[.3,.2,.22],[0,0,0]]],g=>{box(g,[.3,.2,.22],[0,0,0],paper);const tissue=box(g,[.14,.16,.012],[0,.16,0],white);tissue.rotation.z=.3;});
// Two cushions can slip off the sofa instead of being fused into its frame.
for(const [x,z] of [[-3.45,-1.65],[-1.35,-1.7]])body('cushion',[x,1.3,z],.6,[[[.46,.44,.18],[0,0,0]]],g=>{const m=box(g,[.46,.44,.18],[0,0,0],fabric);m.rotation.z=.12;});
// An original ink-like relief, centred over the sofa with clear space from the shelf.

const artCanvas=document.createElement('canvas');artCanvas.width=600;artCanvas.height=720;const ac=artCanvas.getContext('2d');ac.fillStyle='#dddcd8';ac.fillRect(0,0,600,720);let ar=57;const rand=()=>((ar=(Math.imul(ar,1664525)+1013904223)>>>0)/4294967296);
for(let j=0;j<42;j++){ac.strokeStyle=j%4?'rgba(28,28,28,.5)':'rgba(20,20,20,.9)';ac.lineWidth=1+rand()*7;ac.beginPath();let x=120+rand()*360,y=110+rand()*500;ac.moveTo(x,y);for(let k=0;k<8;k++){x+=rand()*100-50;y+=rand()*90-45;ac.lineTo(x,y);}ac.stroke();}
for(let j=0;j<16;j++){ac.fillStyle='rgba(25,25,25,.7)';ac.fillRect(70+rand()*450,90+rand()*530,4+rand()*30,2+rand()*12);}
const artMap=new T.CanvasTexture(artCanvas);artMap.colorSpace=T.SRGBColorSpace;
const wallArt=body('loose wall art',[-1.7,2.5,-3.62],1.3,[[[1.55,1.8,.09],[0,0,0]]],g=>{box(g,[1.55,1.8,.09],[0,0,0],dark);box(g,[1.42,1.67,.02],[0,0,.055],new T.MeshStandardMaterial({map:artMap,roughness:1}));});
const artAnchor=new C.Body({mass:0,position:new C.Vec3(-1.7,3.35,-3.62)});world.addBody(artAnchor);let artHook=new C.PointToPointConstraint(wallArt,new C.Vec3(0,.85,0),artAnchor,new C.Vec3(),1e4);world.addConstraint(artHook);let artReleased=false;

// Music furniture is modelled locally, then placed against the right wall beside the door.
const musicStart=objects.length;
const deskParts=[[[2.85,.09,1.4],[0,0,0]],[[2.7,.07,.9],[0,-.78,0]],...[-1.34,0,1.34].map(x=>[[.065,.78,.9],[x,-.4,0]]),...[-1.22,1.22].flatMap(x=>[-.36,.36].map(z=>[[.07,.25,.07],[x,-.95,z]]))];
body('record console',[0,1.05,0],28,deskParts,g=>{for(const [size,pos] of deskParts.slice(0,5))box(g,size,pos,wood);for(const x of [-1.22,1.22])for(const z of [-.36,.36])cylinder(g,.025,.035,.25,[x,-.95,z],metal);box(g,[2.72,.07,.04],[0,-.7,.46],dark);});
for(const x of [-.92,.92]){
body('turntable',[x,1.17,.18],2.4,[[[.83,.13,.84],[0,0,0]]],g=>{box(g,[.83,.13,.84],[0,0,0],dark);box(g,[.8,.025,.81],[0,.075,0],metal);cylinder(g,.29,.29,.032,[-.035,.11,0],metal);cylinder(g,.26,.26,.008,[-.035,.131,0],dark);cylinder(g,.027,.027,.12,[.31,.13,-.27],metal);const arm=box(g,[.012,.012,.39],[.27,.19,-.1],metal);arm.rotation.y=.22;box(g,[.045,.035,.065],[.225,.17,.095],white);for(let j=0;j<3;j++)box(g,[.032,.013,.032],[-.32+j*.05,.1,.32],white);box(g,[.017,.009,.22],[.345,.1,.13],dark);box(g,[.045,.02,.018],[.345,.115,.16],white);});
body('loose vinyl',[x-.035,1.315,.18],.12,[[[.53,.012,.53],[0,0,0]]],g=>{cylinder(g,.27,.27,.009,[0,0,0],dark);cylinder(g,.06,.06,.012,[0,.004,0],paper);for(let r=.1;r<.27;r+=.016){const groove=new T.Mesh(new T.TorusGeometry(r,.001,4,64),wood);groove.rotation.x=Math.PI/2;groove.position.y=.006;g.add(groove);}});
}
body('mixing console',[0,1.17,.18],2,[[[.65,.13,.85],[0,0,0]]],g=>{box(g,[.65,.13,.85],[0,0,0],dark);box(g,[.61,.012,.8],[0,.072,0],metal);for(let col=0;col<4;col++){const x=-.22+col*.145;for(let row=0;row<4;row++){cylinder(g,.02,.02,.045,[x,.1,-.31+row*.09],dark);box(g,[.005,.004,.012],[x,.125,-.31+row*.09],white);}box(g,[.013,.008,.2],[x,.085,.2],dark);box(g,[.055,.025,.025],[x,.105,.14+col*.026],white);}box(g,[.3,.008,.013],[0,.085,.35],dark);box(g,[.025,.025,.055],[.04,.105,.35],white);});
for(const x of [-1.13,1.13]){
body('monitor riser',[x,1.15,-.56],1,[[[.4,.12,.3],[0,0,0]]],g=>box(g,[.4,.12,.3],[0,0,0],dark));
body('monitor speaker',[x,1.49,-.56],2.2,[[[.36,.55,.3],[0,0,0]]],g=>{box(g,[.36,.55,.3],[0,0,0],dark);for(const [y,r] of [[-.1,.115],[.16,.043]]){const driver=cylinder(g,r,r,.02,[0,y,.16],wood);driver.rotation.x=Math.PI/2;const rim=new T.Mesh(new T.TorusGeometry(r,.009,8,32),metal);rim.position.set(0,y,.172);g.add(rim);}});
}
for(const bay of [-.68,.68])for(let i=0;i<9;i++)body('record sleeve',[bay-.29+i*.072,.57,0],.14,[[[.035,.57,.57],[0,0,0]]],g=>{box(g,[.035,.57,.57],[0,0,0],i%3===0?dark:i%3===1?paper:wood);box(g,[.036,.018,.12],[0,.18,.22],i%3?dark:white);});
// Every deck, mixer, speaker, record and sleeve is a separate rigid body.
const musicRotation=new C.Quaternion();musicRotation.setFromEuler(0,-Math.PI/2,0);
for(const o of objects.slice(musicStart)){const pos=musicRotation.vmult(o.b.position);pos.x+=4.05;pos.z-=.85;o.b.position.copy(pos);o.home.copy(pos);o.b.quaternion.copy(musicRotation);o.group.position.copy(pos);o.group.quaternion.copy(musicRotation);}
// Mixed horizontal stacks and oversized volumes give the bookcase a less uniform rhythm.
for(let i=0;i<4;i++)body('wide book',[-3.55,.84+i*.065,-2.71],.2,[[[.45,.055,.36],[0,0,0]]],g=>box(g,[.45,.055,.36],[0,0,0],i%2?wood:paper));
const hemi=new T.HemisphereLight(0xffffff,0x888888,1.15);scene.add(hemi);
const key=new T.DirectionalLight(0xffffff,6.5);key.position.set(5,5.2,-11);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:30});key.shadow.bias=-.0002;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);key.target.position.set(-1,0,2);scene.add(key.target);
const fill=new T.DirectionalLight(0xffffff,.2);fill.position.set(-5,3,5);scene.add(fill);
const ray=new T.Raycaster(),pointer=new T.Vector2(),target=new T.Vector2(),hit=new T.Vector3(),plane=new T.Plane(new T.Vector3(0,1,0),-.6);let inside=false,drag=null,dragPlane=null,dragPoint=new T.Vector3(),dragOffset=new C.Vec3(),idle=0,time=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let activePointer=null,tapCandidate=null,tapTimer=0,touchTiltOrigin=null;
// Both mouse hover and touch drag feed the existing tilt/gravity target.
function setRoomTilt(x,y){target.set(T.MathUtils.clamp(x,-1,1),T.MathUtils.clamp(y,-1,1));inside=true;idle=0;}
function startTouchTilt(x,y){release();touchTiltOrigin={x,y};setRoomTilt(0,0);}
function moveTouchTilt(x,y){if(!touchTiltOrigin)return;setRoomTilt((x-touchTiltOrigin.x)*4,(touchTiltOrigin.y-y)*4);}
function normalizedTouch(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height)};}
function startTouchAt(e){const p=normalizedTouch(e);startTouchTilt(p.x,p.y);}
const TAP_TIME=250,TAP_DISTANCE=10;
function isThumbnail(){return parent!==window&&!!window.frameElement?.parentElement?.classList.contains('living-stage');}
function openRoomFullscreen(){if(isThumbnail())parent.postMessage({type:'living-open'},location.origin);}
function clearTap(){clearTimeout(tapTimer);tapTimer=0;tapCandidate=null;}
function position(e){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const cursor=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);if(!drag)setRoomTilt(cursor.x,cursor.y);inside=true;idle=0;camera.updateMatrixWorld();room.updateMatrixWorld(true);ray.setFromCamera(cursor,camera);ray.ray.intersectPlane(plane,hit);if(drag)ray.ray.intersectPlane(dragPlane,dragPoint);}
function startInteraction(e){position(e);const pick=ray.intersectObjects(meshes,false)[0];if(pick){drag=pick.object.userData.body;const localPick=room.worldToLocal(pick.point.clone());drag.pointToLocalFrame(new C.Vec3(localPick.x,localPick.y,localPick.z),dragOffset);const viewNormal=new T.Vector3();camera.getWorldDirection(viewNormal);dragPlane=new T.Plane().setFromNormalAndCoplanarPoint(viewNormal,pick.point);canvas.style.cursor='grabbing';dragPoint.copy(pick.point);}}
function activateHold(){if(!tapCandidate)return;const start=tapCandidate;clearTap();startTouchAt(start);}
function beginPointer(e){if(e.button>0)return;if(activePointer!==null){activateHold();return;}activePointer=e.pointerId;try{canvas.setPointerCapture?.(e.pointerId);}catch{}if(e.pointerType!=='mouse'&&e.cancelable)e.preventDefault();
if(e.pointerType!=='mouse'&&isThumbnail()){tapCandidate={clientX:e.clientX,clientY:e.clientY,time:performance.now()};tapTimer=setTimeout(activateHold,TAP_TIME);}else if(e.pointerType!=='mouse')startTouchAt(e);else startInteraction(e);}
function movePointer(e){if(activePointer!==null&&activePointer!==e.pointerId)return;if(e.pointerType!=='mouse'&&activePointer===null)return;if(tapCandidate){if(Math.hypot(e.clientX-tapCandidate.clientX,e.clientY-tapCandidate.clientY)<=TAP_DISTANCE)return;activateHold();}if(e.pointerType!=='mouse'){const p=normalizedTouch(e);moveTouchTilt(p.x,p.y);}else position(e);}
function release(){if(drag){drag.velocity.scale(.9,drag.velocity);drag.angularVelocity.scale(.85,drag.angularVelocity);}drag=null;canvas.style.cursor='grab';}
function endPointer(e){if(activePointer!==e.pointerId)return;const completed=e.type==='pointerup'||e.type==='touchend';const tap=!!tapCandidate&&completed&&performance.now()-tapCandidate.time<TAP_TIME&&Math.hypot(e.clientX-tapCandidate.clientX,e.clientY-tapCandidate.clientY)<=TAP_DISTANCE;clearTap();activePointer=null;touchTiltOrigin=null;release();if(e.pointerType!=='mouse'||e.type!=='pointerup'||!canvas.matches(':hover')){inside=false;target.set(0,0);}if(tap)openRoomFullscreen();}
if(window.PointerEvent){
canvas.addEventListener('pointerdown',beginPointer,{passive:false});canvas.addEventListener('pointermove',movePointer);
canvas.addEventListener('pointerleave',()=>{if(activePointer===null){inside=false;target.set(0,0);}});
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
}else{
const fromTouch=(t,e)=>({clientX:t.clientX,clientY:t.clientY,pointerId:t.identifier,pointerType:'touch',type:e.type,cancelable:e.cancelable,preventDefault:()=>e.preventDefault()});
canvas.addEventListener('touchstart',e=>{if(e.changedTouches.length)beginPointer(fromTouch(e.changedTouches[0],e));if(e.touches.length>1)activateHold();},{passive:false});
canvas.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===activePointer){if(e.cancelable)e.preventDefault();movePointer(fromTouch(t,e));}},{passive:false});
for(const type of ['touchend','touchcancel'])canvas.addEventListener(type,e=>{for(const t of e.changedTouches)endPointer(fromTouch(t,e));});
canvas.addEventListener('mousedown',e=>beginPointer({clientX:e.clientX,clientY:e.clientY,button:e.button,pointerId:-1,pointerType:'mouse'}));
canvas.addEventListener('mousemove',e=>movePointer({clientX:e.clientX,clientY:e.clientY,pointerId:-1,pointerType:'mouse'}));
window.addEventListener('mouseup',()=>endPointer({pointerId:-1,pointerType:'mouse',type:'pointerup'}));
canvas.addEventListener('mouseleave',()=>{if(activePointer===null){inside=false;target.set(0,0);}});
}
function cancelInteraction(){clearTap();activePointer=null;touchTiltOrigin=null;release();inside=false;target.set(0,0);}
addEventListener('blur',cancelInteraction);addEventListener('pagehide',cancelInteraction);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelInteraction();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
body('small radio',[-3.9,1.56,1.93],.7,[[[.38,.22,.2],[0,0,0]]],g=>{box(g,[.38,.22,.2],[0,0,0],wood);for(let i=0;i<8;i++)box(g,[.012,.14,.008],[-.14+i*.025,0,.105],dark);const dial=cylinder(g,.027,.027,.025,[.125,0,.12],metal);dial.rotation.x=Math.PI/2;});
body('plant pot',[3.12,.98,-2.95],.5,[[[.2,.25,.2],[0,0,0]]],g=>{cylinder(g,.12,.085,.25,[0,0,0],paper);for(let i=0;i<7;i++){const leaf=new T.Mesh(new T.SphereGeometry(1,12,8),wood);leaf.scale.set(.055,.22,.014);leaf.position.set(Math.sin(i*2.4)*.09,.25,Math.cos(i*2.4)*.08);leaf.rotation.z=Math.sin(i*2.4)*.7;leaf.rotation.y=i*2.4;g.add(leaf);}});
body('candle',[-.2,.65,.81],.18,[[[.12,.19,.12],[0,0,0]]],g=>{cylinder(g,.06,.06,.19,[0,0,0],paper);box(g,[.008,.016,.008],[0,.1,0],dark);});
// A freely swinging pendant on a fixed-length cord.
const lampAnchor=new C.Body({mass:0,position:new C.Vec3(-1.4,3.62,.8)});world.addBody(lampAnchor);
const pendant=body('pendant lamp',[-1.4,2.5,.8],1.5,[[[.65,.35,.65],[0,0,0]]],g=>{const shade=new T.Mesh(new T.CylinderGeometry(.12,.35,.32,36,1,true),new T.MeshStandardMaterial({color:0xcacaca,side:T.DoubleSide,roughness:.6}));shade.castShadow=shade.receiveShadow=true;g.add(shade);const bulb=new T.Mesh(new T.SphereGeometry(.065,16,12),new T.MeshBasicMaterial({color:0xffffff}));bulb.position.y=-.08;g.add(bulb);addLampLight(g,-.19,24);});
pendant.collisionFilterGroup=4;pendant.angularDamping=.3;pendant.linearDamping=.08;
// A tension-only tether cannot push the lamp down when the cable goes slack.
const cableBodies=[],cableCount=18,cableLength=1.32;
const tether=new C.DistanceConstraint(lampAnchor,pendant,cableLength,1e5);
tether.distanceEquation.maxForce=0;
const lampTopLocal=new C.Vec3(0,.16,0);
tether.update=function(){const eq=this.distanceEquation,top=pendant.quaternion.vmult(lampTopLocal);pendant.position.vadd(top,eq.ni);eq.ni.vsub(lampAnchor.position,eq.ni);eq.ni.normalize();eq.ni.scale(cableLength,eq.ri);eq.rj.copy(top);};
world.addConstraint(tether);
function keepShadeUpright(){
const up=new T.Vector3(0,1,0).applyQuaternion(pendant.quaternion),limit=Math.cos(Math.PI*.44);
if(up.y<limit){const attachment=pendant.pointToWorldFrame(lampTopLocal),target=up.clone();target.y=0;if(target.lengthSq()<1e-6)target.set(1,0,0);target.normalize().multiplyScalar(Math.sin(Math.PI*.44));target.y=limit;
const q=new T.Quaternion().setFromUnitVectors(up,target).multiply(new T.Quaternion(pendant.quaternion.x,pendant.quaternion.y,pendant.quaternion.z,pendant.quaternion.w));pendant.quaternion.set(q.x,q.y,q.z,q.w);const offset=pendant.quaternion.vmult(lampTopLocal);attachment.vsub(offset,pendant.position);pendant.angularVelocity.x*=.2;pendant.angularVelocity.z*=.2;pendant.aabbNeedsUpdate=true;}
}

const cableCurve=new T.CatmullRomCurve3(Array.from({length:cableCount+1},(_,i)=>new T.Vector3(-1.4,3.62-i/cableCount,.8)));
const cord=new T.Mesh(new T.TubeGeometry(cableCurve,40,.009,6,false),dark);room.add(cord);
function updateCable(){
const start=new T.Vector3().copy(lampAnchor.position),end=new T.Vector3(0,.16,0).applyQuaternion(new T.Quaternion(pendant.quaternion.x,pendant.quaternion.y,pendant.quaternion.z,pendant.quaternion.w)).add(new T.Vector3().copy(pendant.position));
const distance=start.distanceTo(end),slack=Math.sqrt(Math.max(0,cableLength*cableLength-distance*distance))*.48;
const down=new T.Vector3(world.gravity.x*.18,-9.8,world.gravity.z*.18).normalize();
for(let i=0;i<=cableCount;i++){const t=i/cableCount;cableCurve.points[i].lerpVectors(start,end,t).addScaledVector(down,Math.sin(Math.PI*t)*slack);cableCurve.points[i].y=Math.min(3.62,cableCurve.points[i].y);}
const attr=cord.geometry.attributes.position,normals=cord.geometry.attributes.normal;
for(let i=0;i<=40;i++){const t=i/40,p=cableCurve.getPoint(t),tangent=cableCurve.getTangent(t),normal=new T.Vector3().crossVectors(tangent,new T.Vector3(0,0,1)).normalize(),binormal=new T.Vector3().crossVectors(tangent,normal).normalize();for(let j=0;j<=6;j++){const angle=j/6*Math.PI*2,n=normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal,Math.sin(angle)),index=i*7+j;attr.setXYZ(index,p.x+n.x*.009,p.y+n.y*.009,p.z+n.z*.009);normals.setXYZ(index,n.x,n.y,n.z);}}attr.needsUpdate=normals.needsUpdate=true;cord.geometry.computeBoundingSphere();}
// Two gathered curtains, open at the centre. Each panel has its own cloth constraints.
const cols=24,rows=30,clothH=2.3,clothNodes=[],clothLinks=[],clothPanels=[];
const clothMat=new T.MeshPhysicalMaterial({color:0xb0b0b0,transparent:true,opacity:.88,roughness:.92,side:T.DoubleSide,depthWrite:false,bumpMap:weave,bumpScale:.018});
// Fine porous shadow mask transmits part of the window light through the weave.
const clothMaskCanvas=document.createElement('canvas');clothMaskCanvas.width=clothMaskCanvas.height=64;const maskCtx=clothMaskCanvas.getContext('2d'),maskPixels=maskCtx.createImageData(64,64);
for(let i=0;i<4096;i++){const v=((i*73+(i>>6)*151)%101)<58?255:0;maskPixels.data.set([v,v,v,255],i*4);}maskCtx.putImageData(maskPixels,0,0);
const clothMask=new T.CanvasTexture(clothMaskCanvas);clothMask.wrapS=clothMask.wrapT=T.RepeatWrapping;clothMask.repeat.set(6,8);
const clothShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,alphaMap:clothMask,alphaTest:.5,side:T.DoubleSide});
for(const startX of [-.65,3.35]){const offset=clothNodes.length,width=1.1;
for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const pos=new T.Vector3(startX+x/cols*width,3.45-y/rows*clothH,-3.32+Math.sin(x/cols*Math.PI*10)*.115);clothNodes.push({p:pos,old:pos.clone(),home:pos.clone(),pinned:y===0});}
for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const i=offset+y*(cols+1)+x;for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,1],[2,0],[0,2]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<=cols&&yy<=rows){const j=offset+yy*(cols+1)+xx;clothLinks.push([i,j,clothNodes[i].p.distanceTo(clothNodes[j].p),(dx===2||dy===2)?.075:(dx!==0&&dy!==0)?.48:1]);}}}
const geometry=new T.PlaneGeometry(width,clothH,cols,rows),curtain=new T.Mesh(geometry,clothMat);curtain.customDepthMaterial=clothShadow;curtain.castShadow=curtain.receiveShadow=true;room.add(curtain);const panel={geometry,offset,startX,width,rings:[]};clothPanels.push(panel);
for(let i=0;i<=7;i++){const ring=new T.Mesh(new T.TorusGeometry(.025,.006,6,16),metal);ring.rotation.y=Math.PI/2;ring.position.set(startX+i/7*width,3.46,-3.32);room.add(ring);panel.rings.push(ring);}}
const rail=cylinder(room,.015,.015,5.3,[1.9,3.49,-3.32],metal);rail.rotation.z=Math.PI/2;
function collideCurtain(){
const nearby=objects.filter(o=>{o.b.updateAABB();return o.b.aabb.lowerBound.z< -1.8&&o.b.aabb.upperBound.z> -3.65;});
for(const n of clothNodes){if(n.pinned)continue;for(const o of nearby){const b=o.b,a=b.aabb,p=n.p;if(p.x<a.lowerBound.x-.025||p.x>a.upperBound.x+.025||p.y<a.lowerBound.y-.025||p.y>a.upperBound.y+.025||p.z<a.lowerBound.z-.025||p.z>a.upperBound.z+.025)continue;
const inv=b.quaternion.conjugate(),local=inv.vmult(new C.Vec3(p.x-b.position.x,p.y-b.position.y,p.z-b.position.z));
for(let j=0;j<b.shapes.length;j++){const shape=b.shapes[j],orientation=b.shapeOrientations[j],qinv=orientation.conjugate(),v=qinv.vmult(local.vsub(b.shapeOffsets[j])),push=new C.Vec3();
if(shape.type===C.Shape.types.BOX){const h=shape.halfExtents,dx=h.x+.018-Math.abs(v.x),dy=h.y+.018-Math.abs(v.y),dz=h.z+.018-Math.abs(v.z);if(dx<=0||dy<=0||dz<=0)continue;if(dx<dy&&dx<dz)push.x=(v.x<0?-1:1)*dx;else if(dy<dz)push.y=(v.y<0?-1:1)*dy;else push.z=(v.z<0?-1:1)*dz;}
else if(shape.type===C.Shape.types.SPHERE){const r=shape.radius+.018,len=v.length();if(len>=r)continue;v.scale((r-len)/(len||1),push);}else continue;
const delta=b.quaternion.vmult(orientation.vmult(push));n.p.x+=delta.x;n.p.y+=delta.y;n.p.z+=delta.z;n.old.x+=delta.x;n.old.y+=delta.y;n.old.z+=delta.z;
if(delta.length()>.004&&b.sleepState!==C.Body.SLEEPING){const impulse=delta.scale(-.006);if(impulse.length()>.0005)impulse.scale(.0005/impulse.length(),impulse);b.applyImpulse(impulse);}break;
}}}
}
let clothAccumulator=0;
function updateCloth(dt){
// Outer hems stay at the rail ends; the inner rings slide towards the low side.
const slide=T.MathUtils.clamp(world.gravity.x/6,-1,1);
for(let pi=0;pi<clothPanels.length;pi++){const panel=clothPanels[pi],desired=1.1+(pi===0?slide:-slide)*(slide*(pi===0?1:-1)>0?1.45:.65);panel.width+=(desired-panel.width)*(1-Math.exp(-dt*1.6));const left=pi===0?-.65:4.45-panel.width;
for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const n=clothNodes[panel.offset+y*(cols+1)+x],u=x/cols;n.home.x=left+u*panel.width;n.home.z=-3.32+Math.sin(u*Math.PI*10)*(.035+.1*(1-panel.width/2.55));}
for(let i=0;i<panel.rings.length;i++)panel.rings[i].position.x=left+i/(panel.rings.length-1)*panel.width;
}
for(const link of clothLinks)link[2]=clothNodes[link[0]].home.distanceTo(clothNodes[link[1]].home);
canvas.dataset.curtainWidths=clothPanels.map(p=>p.width.toFixed(2)).join(',');
clothAccumulator=Math.min(clothAccumulator+dt,.08);const step=1/120;
while(clothAccumulator>=step){clothAccumulator-=step;
for(const n of clothNodes){if(n.pinned){n.p.copy(n.home);n.old.copy(n.home);continue;}const x=n.p.x,y=n.p.y,z=n.p.z;n.p.x+=(x-n.old.x)*.982+(world.gravity.x*.22+(n.home.x-x)*18)*step*step;n.p.y+=(y-n.old.y)*.982+world.gravity.y*step*step;n.p.z+=(z-n.old.z)*.982+(world.gravity.z*.3+(n.home.z-z)*3+Math.sin(time*.55+n.home.y*.65)*.035)*step*step;n.old.set(x,y,z);}
for(let k=0;k<9;k++)for(const [a,b,rest,stiffness] of clothLinks){const n=clothNodes[a],m=clothNodes[b],dx=m.p.x-n.p.x,dy=m.p.y-n.p.y,dz=m.p.z-n.p.z,len=Math.hypot(dx,dy,dz);if(len<1e-8)continue;const f=(len-rest)/len*stiffness,na=m.pinned?1:.5,mb=n.pinned?1:.5;if(!n.pinned){n.p.x+=dx*f*na;n.p.y+=dy*f*na;n.p.z+=dz*f*na;}if(!m.pinned){m.p.x-=dx*f*mb;m.p.y-=dy*f*mb;m.p.z-=dz*f*mb;}}
collideCurtain();
for(const n of clothNodes){if(n.p.z< -3.5){n.p.z=-3.5;n.old.z=n.p.z;}if(n.p.y<.03){n.p.y=.03;n.old.y=n.p.y;}}
}
for(const panel of clothPanels){for(let i=0;i<(cols+1)*(rows+1);i++){const p=clothNodes[panel.offset+i].p;panel.geometry.attributes.position.setXYZ(i,p.x,p.y,p.z);}panel.geometry.attributes.position.needsUpdate=true;panel.geometry.computeVertexNormals();panel.geometry.computeBoundingSphere();}}
// Lower friction only where requested; the rest of the room retains its current feel.
for(const b of world.bodies)if(!b.material)b.material=world.defaultMaterial;
const lampGlide=new C.Material('lamp glide');world.addContactMaterial(new C.ContactMaterial(lampGlide,world.defaultMaterial,{friction:.025,restitution:.04}));
const glide=new C.Material('furniture glide');world.addContactMaterial(new C.ContactMaterial(glide,world.defaultMaterial,{friction:.075,restitution:.04}));
for(const o of objects)if(o.name==='sofa'||o.name==='loose drawer'||o.name==='floor lamp'){o.b.material=glide;o.b.linearDamping=o.name==='sofa'?.24:.12;}
for(const o of objects)if(o.name==='floor lamp'){o.b.material=lampGlide;o.b.linearDamping=.07;o.b.angularDamping=.18;}
// Put the standing lamp's centre of mass in its stem, rather than at its base.
for(const o of objects)if(o.name==='floor lamp'){const shift=.95;o.b.position.y+=shift;o.home.y+=shift;for(const offset of o.b.shapeOffsets)offset.y-=shift;for(const child of o.group.children)child.position.y-=shift;o.b.updateMassProperties();}
objects.find(o=>o.name==='chest carcass').b.angularDamping=.82;
const drawerSlide=new C.Material('drawer runners');world.addContactMaterial(new C.ContactMaterial(drawerSlide,world.defaultMaterial,{friction:.018,restitution:.02}));world.addContactMaterial(new C.ContactMaterial(drawerSlide,glide,{friction:.018,restitution:.02}));
for(const o of objects)if(o.name==='loose drawer'){o.b.material=drawerSlide;o.b.linearDamping=.06;}
// Cache the visible geometry's support points. Thin detailing must never render below the floor.
for(const o of objects){o.floorSupports=[];o.group.traverse(m=>{if(!m.isMesh)return;m.updateMatrix();m.geometry.computeBoundingBox();const bounds=m.geometry.boundingBox;
if(m.geometry.type==='SphereGeometry'){const centre=new T.Vector3().applyMatrix4(m.matrix),radius=m.geometry.parameters.radius*Math.max(...m.scale.toArray());o.floorSupports.push({centre,radius});return;}
for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])o.floorSupports.push({centre:new T.Vector3(x,y,z).applyMatrix4(m.matrix),radius:0});});}
function protectVisibleFloor(o){const q=new T.Quaternion(o.b.quaternion.x,o.b.quaternion.y,o.b.quaternion.z,o.b.quaternion.w);let lowest=Infinity;for(const p of o.floorSupports)lowest=Math.min(lowest,p.centre.clone().applyQuaternion(q).y+o.b.position.y-p.radius);if(lowest<.004){o.b.position.y+=.004-lowest;if(o.b.velocity.y<0)o.b.velocity.y=0;o.b.aabbNeedsUpdate=true;}}
// Settle loose contents against fixed furniture before enabling interaction.
const anchoredForSetup=new Set(['sofa','coffee table','wooden chair','chest carcass','loose drawer','bookcase','side table','ottoman','floor lamp','record console','fruit bowl','hinged door','loose wall art','pendant lamp']);
const setupBodies=[];
const floorFurniture=new Set(['sofa','coffee table','wooden chair','chest carcass','bookcase','side table','ottoman','floor lamp','record console']);
for(const o of objects)if(floorFurniture.has(o.name)){const q=new T.Quaternion(o.b.quaternion.x,o.b.quaternion.y,o.b.quaternion.z,o.b.quaternion.w);let bottom=Infinity;for(const p of o.floorSupports)bottom=Math.min(bottom,p.centre.clone().applyQuaternion(q).y+o.b.position.y-p.radius);o.b.position.y+=.004-bottom;o.b.aabbNeedsUpdate=true;}
fruitBowl.position.y=objects.find(o=>o.name==='coffee table').b.position.y+.083;

for(const o of objects)if(anchoredForSetup.has(o.name)){setupBodies.push([o.b,o.b.mass]);o.b.mass=0;o.b.type=C.Body.STATIC;o.b.updateMassProperties();}
for(let step=0;step<240;step++){world.step(1/120);for(const o of objects)if(o.b.type===C.Body.DYNAMIC)protectVisibleFloor(o);}
for(const [b,mass] of setupBodies){b.mass=mass;b.type=C.Body.DYNAMIC;b.updateMassProperties();}
for(const o of objects){o.b.velocity.setZero();o.b.angularVelocity.setZero();o.b.force.setZero();o.b.torque.setZero();o.b.sleep();}
for(const b of cableBodies){b.velocity.setZero();b.angularVelocity.setZero();b.force.setZero();b.torque.setZero();b.sleep();}
const cableInitial=cableBodies.map(b=>b.position.clone());
const initial=objects.map(o=>({p:o.b.position.clone(),q:o.b.quaternion.clone()}));
function reset(){world.gravity.set(0,-9.8,0);cableBodies.forEach((b,i)=>{b.position.copy(cableInitial[i]);b.force.setZero();b.torque.setZero();b.velocity.setZero();b.angularVelocity.setZero();b.sleep();});if(artReleased){artHook=new C.PointToPointConstraint(wallArt,new C.Vec3(0,.85,0),artAnchor,new C.Vec3(),1e4);world.addConstraint(artHook);artReleased=false;}clothAccumulator=0;for(const panel of clothPanels){panel.width=1.1;for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const n=clothNodes[panel.offset+y*(cols+1)+x];n.home.x=panel.startX+x/cols*1.1;n.home.z=-3.32+Math.sin(x/cols*Math.PI*10)*.115;}}for(const n of clothNodes){n.p.copy(n.home);n.old.copy(n.home);}inside=false;target.set(0,0);pointer.set(0,0);drag=null;idle=0;objects.forEach((o,i)=>{o.b.position.copy(initial[i].p);o.b.quaternion.copy(initial[i].q);o.b.velocity.setZero();o.b.angularVelocity.setZero();o.b.force.setZero();o.b.torque.setZero();o.b.sleep();});}
canvas.addEventListener('keydown',e=>{if(e.key==='Enter'&&isThumbnail()){e.preventDefault();openRoomFullscreen();return;}if(e.key==='Escape'&&parent!==window){parent.postMessage({type:'living-close'},location.origin);return;}if(e.key.toLowerCase()==='r'){cancelInteraction();reset();}const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(dir){e.preventDefault();target.set(...dir);inside=true;idle=0;}});
// HDR highlight bloom: light spreads from bright surfaces, rather than a white overlay.
const hdr=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:2});
const bloomA=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
const bloomB=bloomA.clone();
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const vertexShader=`varying vec2 uvP;void main(){uvP=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:null},stepUV:{value:new T.Vector2()},extract:{value:1}},vertexShader,fragmentShader:`varying vec2 uvP;uniform sampler2D source;uniform vec2 stepUV;uniform float extract;
vec3 lightAt(vec2 p){vec3 c=texture2D(source,p).rgb;float l=max(c.r,max(c.g,c.b));return extract>.5?c*smoothstep(1.0,2.8,l):c;}
void main(){vec3 c=vec3(0.);float total=0.;for(int i=-6;i<=6;i++){float x=float(i),w=exp(-x*x/12.);c+=lightAt(uvP+stepUV*x)*w;total+=w;}gl_FragColor=vec4(c/total,1.);}`});
const finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:hdr.texture},bloom:{value:bloomB.texture}},vertexShader,fragmentShader:`varying vec2 uvP;uniform sampler2D source;uniform sampler2D bloom;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec2 fringe=(uvP-.5)*.0012;vec3 c=texture2D(source,uvP).rgb;c.r=texture2D(source,uvP+fringe).r;c.b=texture2D(source,uvP-fringe).b;c+=texture2D(bloom,uvP).rgb*.54;c=aces(c*1.55);c=mix(c,vec3(1.),.065);float coverage=texture2D(source,uvP).a;gl_FragColor=vec4(mix(vec3(1.),pow(c,vec3(1./2.2)),coverage),1.);}`});
const quad=new T.Mesh(new T.PlaneGeometry(2,2),blur);postScene.add(quad);
function renderArtwork(){renderer.setRenderTarget(hdr);renderer.render(scene,camera);quad.material=blur;blur.uniforms.source.value=hdr.texture;blur.uniforms.extract.value=1;blur.uniforms.stepUV.value.set(2.5/bloomA.width,0);renderer.setRenderTarget(bloomA);renderer.render(postScene,postCamera);blur.uniforms.source.value=bloomA.texture;blur.uniforms.extract.value=0;blur.uniforms.stepUV.value.set(0,2.5/bloomA.height);renderer.setRenderTarget(bloomB);renderer.render(postScene,postCamera);quad.material=finish;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const d=renderer.getPixelRatio();hdr.setSize(Math.round(w*d),Math.round(h*d));bloomA.setSize(Math.max(1,Math.round(w*d/3)),Math.max(1,Math.round(h*d/3)));bloomB.setSize(bloomA.width,bloomA.height);}addEventListener('resize',resize);resize();
function update(dt){time+=dt;idle+=dt;pointer.lerp(target,1-Math.exp(-dt*16));const active=inside;
const response=v=>Math.sign(v)*Math.pow(Math.abs(v),.8),rx=response(pointer.x),ry=response(pointer.y);
const tiltQ=new T.Quaternion().setFromEuler(new T.Euler(ry*.34,rx*.42,-rx*.38,'YXZ'));
const gravity=new T.Vector3(0,-9.8,0).applyQuaternion(tiltQ.clone().invert());
const gx=active?gravity.x*2.85:0,gz=active?gravity.z*2.85:0;
if(Math.abs(world.gravity.x-gx)+Math.abs(world.gravity.z-gz)>.08)for(const o of objects)o.b.wakeUp();world.gravity.set(gx,-9.8,gz);
// Larger pieces resist lateral acceleration; loose objects keep the lively response.
for(const o of objects){const b=o.b;if(b.mass>=7){const weight=Math.max(.42,1-Math.log2(b.mass/5)*.2);b.applyForce(new C.Vec3(-gx*b.mass*(1-weight),0,-gz*b.mass*(1-weight)));}}
// Unlatched runners let the trays travel freely in their opening direction.
const carcass=objects.find(o=>o.name==='chest carcass').b,runnerAxis=carcass.quaternion.vmult(new C.Vec3(1,0,0));
for(const o of objects)if(o.name==='loose drawer'){const offset=carcass.quaternion.conjugate().vmult(o.b.position.vsub(carcass.position));if(offset.x<1.15&&Math.abs(offset.y)<.85&&Math.abs(offset.z)<.3){const drive=Math.max(0,world.gravity.dot(runnerAxis));if(drive>.8){const f=runnerAxis.scale(o.b.mass*drive*3);o.b.applyForce(f);o.b.wakeUp();carcass.applyForce(f.scale(-1));}}}
// The suspended lamp keeps more swing momentum than floor furniture. Lateral
// acceleration lets it climb its arc; the longer, light cable can fold under slack.
const swing=Math.min(1,Math.hypot(gx,gz)/10);
pendant.applyForce(new C.Vec3(gx*pendant.mass*1.8,swing*swing*pendant.mass*8,gz*pendant.mass*1.8));
if(swing>.05){pendant.wakeUp();for(const link of cableBodies)link.wakeUp();}
if(drag){const b=drag,localDrag=room.worldToLocal(dragPoint.clone());localDrag.x=T.MathUtils.clamp(localDrag.x,-4.8,4.8);localDrag.y=T.MathUtils.clamp(localDrag.y,.12,3.4);localDrag.z=T.MathUtils.clamp(localDrag.z,-3.6,3.6);const offset=b.quaternion.vmult(dragOffset),grab=b.position.vadd(offset),velocity=new C.Vec3();b.getVelocityAtWorldPoint(grab,velocity);const strength=42/Math.max(1,Math.pow(b.mass/5,.16));const f=new C.Vec3((localDrag.x-grab.x)*b.mass*strength-velocity.x*b.mass*7,(localDrag.y-grab.y)*b.mass*strength-velocity.y*b.mass*7,(localDrag.z-grab.z)*b.mass*strength-velocity.z*b.mass*7);const maxForce=b.mass*48;if(f.length()>maxForce)f.scale(maxForce/f.length(),f);b.applyForce(f,offset);b.wakeUp();}
const hingeAngle=2*Math.atan2(door.quaternion.y,door.quaternion.w);
if(hingeAngle<-.015)door.torque.y+=(-.015-hingeAngle)*180-door.angularVelocity.y*12;
if(hingeAngle>1.75)door.torque.y+=(1.75-hingeAngle)*180-door.angularVelocity.y*12;
// Contact-aware settling prevents small stacked objects from chattering at rest.

for(const o of objects){const b=o.b,speed=b.velocity.length(),spin=b.angularVelocity.length();if(speed>6)b.velocity.scale(6/speed,b.velocity);if(spin>8)b.angularVelocity.scale(8/spin,b.angularVelocity);}
if(!artReleased&&Math.hypot(gx,gz)>5){world.removeConstraint(artHook);artReleased=true;wallArt.wakeUp();}
const shadeUp=pendant.quaternion.vmult(new C.Vec3(0,1,0));
pendant.torque.x+=-shadeUp.z*1.2-pendant.angularVelocity.x*.38;
pendant.torque.z+=shadeUp.x*1.2-pendant.angularVelocity.z*.38;
world.step(1/120,dt,10);
keepShadeUpright();
updateCloth(dt);
updateCable();
if(!active&&!drag&&idle>5){const touching=new Set();for(const c of world.contacts){touching.add(c.bi);touching.add(c.bj);}for(const o of objects){const b=o.b;if(touching.has(b)&&b.velocity.length()<.6&&b.angularVelocity.length()<.8)b.sleep();}}
for(const o of objects){protectVisibleFloor(o);o.group.position.copy(o.b.position);o.group.quaternion.copy(o.b.quaternion);}
const aspect=innerWidth/innerHeight,dist=aspect<1.2?13.4:10.0;camera.position.set(-3.4,3.45,dist);camera.lookAt(.1,1.45,-.15);
const suppressTilt=reduced&&!touchTiltOrigin;
if(suppressTilt)room.rotation.set(0,0,0);else room.quaternion.copy(tiltQ);
room.position.x=suppressTilt?0:rx*.3;room.position.y=suppressTilt?0:ry*.18;

canvas.dataset.shadeUp=pendant.quaternion.vmult(new C.Vec3(0,1,0)).y.toFixed(3);canvas.dataset.drawerSeparation=JSON.stringify(objects.filter(o=>o.name==='loose drawer').map(o=>o.b.position.distanceTo(objects.find(c=>c.name==='chest carcass').b.position).toFixed(2)));pendant.updateAABB();canvas.dataset.floorLampDisplacement=Math.hypot(objects.find(o=>o.name==='floor lamp').b.position.x-3.9,objects.find(o=>o.name==='floor lamp').b.position.z+2.95).toFixed(2);canvas.dataset.floorLampState=JSON.stringify((()=>{const b=objects.find(o=>o.name==='floor lamp').b;return {mass:b.mass,type:b.type,sleep:b.sleepState,pos:b.position,velocity:b.velocity,invMass:b.invMass,invSolve:b.invMassSolve};})());canvas.dataset.floorLampMotion=objects.find(o=>o.name==='floor lamp').b.velocity.length().toFixed(2);canvas.dataset.lampTop=pendant.aabb.upperBound.y.toFixed(3);canvas.dataset.lampHeight=pendant.position.y.toFixed(3);canvas.dataset.artReleased=String(artReleased);canvas.dataset.outside=String(objects.filter(o=>Math.abs(o.b.position.x)>5.3||Math.abs(o.b.position.z)>4.2||o.b.position.y<-.5).length);canvas.dataset.doorAngle=(2*Math.atan2(door.quaternion.y,door.quaternion.w)*180/Math.PI).toFixed(1);canvas.dataset.dragging=String(!!drag);canvas.dataset.sleeping=String(objects.filter(o=>o.b.sleepState===C.Body.SLEEPING).length);canvas.dataset.bodies=String(objects.length);canvas.dataset.motion=objects.reduce((sum,o)=>sum+o.b.velocity.length(),0).toFixed(2);canvas.dataset.active=String(activity?.running);
}
let activity=createActivityLoop({update,draw:renderArtwork,fps:60});
update(0);renderArtwork();document.querySelector('.loader').remove();// Safari may reload an iframe when moving it into the site's fullscreen viewer.
const stateBodies=[...objects.map(o=>o.b),...cableBodies];
const bodySnapshot=b=>({p:[b.position.x,b.position.y,b.position.z],q:[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w],v:[b.velocity.x,b.velocity.y,b.velocity.z],w:[b.angularVelocity.x,b.angularVelocity.y,b.angularVelocity.z],sleep:b.sleepState===C.Body.SLEEPING});
function snapshotRoom(){return {version:1,bodies:stateBodies.map(bodySnapshot),cloth:clothNodes.map(n=>[n.p.toArray(),n.old.toArray(),n.home.toArray()]),widths:clothPanels.map(p=>p.width),time,artReleased,clothAccumulator};}
function restoreRoom(s){if(s?.version!==1||s.bodies.length!==stateBodies.length||s.cloth.length!==clothNodes.length)return;cancelInteraction();pointer.set(0,0);time=s.time;idle=0;clothAccumulator=s.clothAccumulator;
if(s.artReleased!==artReleased){if(s.artReleased)world.removeConstraint(artHook);else{artHook=new C.PointToPointConstraint(wallArt,new C.Vec3(0,.85,0),artAnchor,new C.Vec3(),1e4);world.addConstraint(artHook);}artReleased=s.artReleased;}
stateBodies.forEach((b,i)=>{const v=s.bodies[i];b.position.set(...v.p);b.previousPosition.copy(b.position);b.interpolatedPosition.copy(b.position);b.quaternion.set(...v.q);b.previousQuaternion.copy(b.quaternion);b.interpolatedQuaternion.copy(b.quaternion);b.force.setZero();b.torque.setZero();b.aabbNeedsUpdate=true;if(v.sleep)b.sleep();else{b.wakeUp();b.velocity.set(...v.v);b.angularVelocity.set(...v.w);}});
clothNodes.forEach((n,i)=>{n.p.fromArray(s.cloth[i][0]);n.old.fromArray(s.cloth[i][1]);n.home.fromArray(s.cloth[i][2]);});clothPanels.forEach((panel,i)=>{panel.width=s.widths[i];});
update(0);renderArtwork();}
// Same-origin bridge receives normalized coordinates from the top-level touch surface.
let bridgedInteraction=false;
function roomInput(action,point){
if(action==='end'){if(bridgedInteraction){bridgedInteraction=false;cancelInteraction();}return;}
if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
if(action==='start'){cancelInteraction();bridgedInteraction=true;startTouchTilt(point.x,point.y);}
else if(action==='move'&&bridgedInteraction)moveTouchTilt(point.x,point.y);
}
window.livingArtwork={reset,getStats:()=>({bodies:objects.length}),snapshot:snapshotRoom,restore:restoreRoom,roomInput};
if(parent!==window)parent.postMessage({type:'living-ready'},location.origin);
addEventListener('pagehide',()=>{activity.stop();});
}catch(error){console.error(error);document.querySelector('.loader')?.remove();document.querySelector('#error').style.display='block';}

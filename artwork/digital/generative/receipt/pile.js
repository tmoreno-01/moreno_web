// Positions are measured across the slot (u), out of it (v), and down (y).
export const HEIGHT=720;
export const CROP_TOP=HEIGHT*.20;
export const VIEW_HEIGHT=HEIGHT-CROP_TOP;
export const STEP=1/120;
export const SLOPE=.29;
export const BODY_SCALE=.926;
export const CASE_DEPTH=.70;
const CASE_LEFT=.267,CASE_RIGHT=.262,CASE_BASE=.372;
const CASE_FRONT=.165*CASE_DEPTH,CASE_REAR=.347*CASE_DEPTH;
const ROOF_SLOPE=.25/CASE_DEPTH,BEVEL_SLOPE=.92/CASE_DEPTH;
export const FEED_LIFT=.005;
const AX=.761,AZ=Math.sqrt(1-AX*AX);
const FLOOR_STATIC=.49,FLOOR_KINETIC=.30;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function ease(value){
    const t=clamp(value,0,1);
    return t*t*(3-2*t);
}

export function cropTop(width){
    return CROP_TOP+(width<=520?16:0);
}

export function printerLayout(width,phone=width<=520){
    const previous=Math.min(HEIGHT*1.005,width*.855);
    const size=previous*BODY_SCALE;
    const x=(width-size)/2,y=HEIGHT*.475-size/2;
    const slotScale=phone?1.02:1.07;
    return {x,y,size,phone,slotScale,band:previous*.232/AX*slotScale,slot:{x:x+size*.439,y:y+size*.419}};
}

export function createPile(seed,width,phone){
    const layout=printerLayout(width,phone),band=layout.band;
    return {seed,width,layout,band,spacing:band/21,head:0,full:false,rows:[],
        layer:0,accumulator:0,nextRow:0,revision:0,load:0,clock:0,spread:0,
        radius:band*(.62+(seed%101)*.00045)};
}

function world(u,v,y){
    return {x:u*AX-v*AZ,y,z:u*AZ+v*AX};
}

function paperPoints(row,pile){
    return [-.5,0,.5].map(f=>world(row.u+pile.band*f,row.v,row.y));
}

// A short roller guide has one pose for the solver and the visible ribbon.
function feedPose(pile,distance){
    const bend=.033/pile.spacing,angle=-.14,turn=angle+bend*distance;
    return {u:0,v:(Math.sin(turn)-Math.sin(angle))/bend,
        y:(Math.cos(angle)-Math.cos(turn))/bend-pile.layout.size*FEED_LIFT};
}

function rowAt(pile,at){
    const {u,v,y}=feedPose(pile,pile.head-at);
    return {at,v,y,u,pu:u,ou:u,pv:v,py:y,ov:v,oy:y,w:0,quiet:0,sleeping:false,wake:false,crease:0,roll:0,spin:0,
        points:[],paperWidth:pile.band};
}

export function floorLevel(pile,z){
    // A level desk through the visible depth of the pile. The far
    // foreground is limited by the lower edge of the artwork.
    return HEIGHT-pile.layout.slot.y-6-SLOPE*Math.max(pile.band*.86,z);
}

function floorAt(pile,row){
    return floorLevel(pile,row.v*AX+(row.u+pile.band*.5)*AZ);
}

function caseTop(v,size){
    return Math.max(ROOF_SLOPE*v,BEVEL_SLOPE*v-size*.097);
}

function constrain(pile,p,friction){
    if(!p.w)return;
    const {size,slot}=pile.layout;
    const left=3+pile.band*.5*AX,right=pile.width-left;
    const screenX=slot.x+AX*p.u-AZ*p.v;
    const x=clamp(screenX,left,right);
    if(x!==screenX){
        p.u+=(x-screenX)*AX;
        p.v-=(x-screenX)*AZ;
        if(friction){p.pu=p.u;p.pv=p.v;}
    }
    const floor=floorAt(pile,p);
    const roof=CROP_TOP+5-slot.y-SLOPE*(p.v*AX+(p.u-pile.band*.5)*AZ);
    if(p.y>=floor){
        const penetration=p.y-floor;
        const du=p.u-p.ou,dv=p.v-p.ov,travel=Math.hypot(du,dv);
        // Resolve friction with the floor constraint. The normal correction
        // supplies the friction budget, including load from the strip above.
        const grip=travel<=penetration*FLOOR_STATIC?1:
            Math.min(1,penetration*FLOOR_KINETIC/Math.max(.0001,travel));
        p.u-=du*grip;
        p.v-=dv*grip;
        p.y=floorAt(pile,p);
        if(friction){
            p.py=p.y;
            p.pu=p.ou+(p.u-p.ou)*.22;p.pv=p.ov+(p.v-p.ov)*.22;
        }
    }else if(p.y<roof){
        p.y=roof;
        if(friction)p.py=p.y;
    }

    const min=-size*CASE_REAR,max=size*CASE_FRONT,bottom=size*CASE_BASE;
    const top=caseTop(p.v,size);
    const margin=pile.spacing*(.38+.89*clamp((pile.head-p.at)/pile.spacing-2,0,1));
    if(Math.abs(p.u)-pile.band*.5>size*CASE_LEFT+margin)return;
    if(p.v<min-margin||p.v>max+margin||p.y<top-margin||p.y>bottom+margin)return;
    const roofGap=p.y-top,rear=p.v-min,front=max-p.v,base=bottom-p.y;
    const nearest=Math.min(roofGap,rear,front,base);
    if(nearest===roofGap){
        p.y=top-margin;
        if(friction)p.py=p.y;
    }else if(nearest===base){
        p.y=bottom+margin;
        if(friction)p.py=p.y;
    }else{
        p.v=nearest===rear?min-margin:max+margin;
        if(friction)p.pv=p.v;
    }
}

function link(a,b,length){
    const w=a.w+b.w;
    if(!w)return;
    const du=b.u-a.u,dv=b.v-a.v,dy=b.y-a.y,d=Math.hypot(du,dv,dy);
    if(d<.001)return;
    const correction=(d-length)*.91/(d*w);
    a.u+=du*correction*a.w;a.v+=dv*correction*a.w;a.y+=dy*correction*a.w;
    b.u-=du*correction*b.w;b.v-=dv*correction*b.w;b.y-=dy*correction*b.w;
}

// Signed turning angle of consecutive links. Its gradients rotate the
// links directly, while the length solver keeps the paper inextensible.
function bendAngle(a,b,c,target,stiffness,angleLimit=0){
    const av=b.v-a.v,ay=b.y-a.y,bv=c.v-b.v,by=c.y-b.y;
    const aa=av*av+ay*ay,bb=bv*bv+by*by;
    if(Math.min(aa,bb)<1)return;
    const angle=Math.atan2(av*by-ay*bv,av*bv+ay*by);
    if(angleLimit){
        if(Math.abs(angle)<=angleLimit)return;
        target=Math.sign(angle)*angleLimit;
    }
    const gaV=-ay/aa,gaY=av/aa,gcV=-by/bb,gcY=bv/bb;
    const gbV=-gaV-gcV,gbY=-gaY-gcY;
    const mass=a.w/aa+c.w/bb+b.w*(gbV*gbV+gbY*gbY);
    if(mass<1e-8)return;
    const impulse=-clamp(angle-target,-.62,.62)*stiffness/mass;
    a.v+=gaV*impulse*a.w;a.y+=gaY*impulse*a.w;
    b.v+=gbV*impulse*b.w;b.y+=gbY*impulse*b.w;
    c.v+=gcV*impulse*c.w;c.y+=gcY*impulse*c.w;
}

function bend(pile,a,b,c,learn){
    const w=a.w+4*b.w+c.w;
    if(!w)return;
    const dv=a.v-c.v,dy=a.y-c.y,d=Math.hypot(dv,dy);
    if(d<.001)return;
    const nv=dy/d,ny=-dv/d;
    const amount=(a.v+c.v-2*b.v)*nv+(a.y+c.y-2*b.y)*ny;
    const {band,spacing}=pile,age=pile.head-b.at;
    const onFloor=b.y>floorAt(pile,b)-band*.67;
    const relaxed=clamp((age-band*.65)/(band*2),0,1);
    const release=pile.load*.26*Math.sin(pile.clock*1.6)*clamp(1-age/(band*2),0,1);
    const variance=1+.12*Math.sin(b.at/band*.39+(pile.seed%100)*.02)+release;
    const rest=spacing*spacing/(pile.radius*variance+band*.18*relaxed+band*pile.load*.17);
    if(learn&&onFloor&&Math.abs(amount)>spacing*.22){
        b.crease+=(clamp(amount,-spacing*.31,spacing*.31)-b.crease)*.042;
    }
    // Fresh paper relaxes after the rollers. Older paper retains its
    // curvature even when a fold is supported by the pile instead of the desk.
    const curl=ease((age/spacing-3)/6)*clamp((band*2.15-age)/(band*1.5),0,1);
    const landed=clamp((age/band-1.8)/1.6,0,1);
    const ripple=b.at/(band*1.12)+(pile.seed%277)*.024;
    const memory=(2.7-1.35*Math.sin(ripple)-.53*Math.sin(ripple*.47+1.7))*(.74+.26*pile.spread);
    // Let a congested incoming loop open under roller load. Older
    // folds retain their curvature while it works through the pile.
    const pressure=ease((pile.load-.13)/.58);
    const incoming=ease((age/band-1.3)/.75)*ease((6.2-age/band)/1.4);
    const retained=1-.76*pressure*incoming;
    const target=-rest*(curl+landed*memory*retained)+b.crease;
    const k=age<band*.95?.86:onFloor?.74:.59;
    const angular=ease((age/band-1.15)/1.25)*0.9;
    const easyBend=target*Math.cos(b.roll);
    const force=(amount-easyBend)*k*(1-angular)/w;
    if(angular)bendAngle(a,b,c,easyBend/spacing,k*angular);
    // Paper bends more readily through its face than sideways in its plane.
    // When a contact turns the strip, its easy bending axis turns with it.
    const side=a.u+c.u-2*b.u;
    const phase=b.at/(band*1.63)+(pile.seed%107)*.17;
    const asymmetry=Math.sin(phase)+.32*Math.sin(phase*1.81+1.7);
    const buckle=(onFloor?.58:.20)*rest*asymmetry*clamp((age-band*.18)/band,0,1);
    const lateral=(side+target*Math.sin(b.roll)-buckle)*.84/w;
    a.u-=lateral*a.w;b.u+=2*lateral*b.w;c.u-=lateral*c.w;
    a.v-=nv*force*a.w;a.y-=ny*force*a.w;
    b.v+=nv*force*2*b.w;b.y+=ny*force*2*b.w;
    c.v-=nv*force*c.w;c.y-=ny*force*c.w;
}

const key=(x,y)=>x+4096*y;
const caches=new WeakMap();
let stamp=0;
function segment(a,b){
    return {a,b,x0:Math.min(a.v,b.v),x1:Math.max(a.v,b.v),
        y0:Math.min(a.y,b.y),y1:Math.max(a.y,b.y),stamp:0};
}
function cells(s,cell,pad,visit){
    const x0=Math.floor((s.x0-pad)/cell),x1=Math.floor((s.x1+pad)/cell);
    const y0=Math.floor((s.y0-pad)/cell),y1=Math.floor((s.y1+pad)/cell);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)visit(key(x,y));
}
function insert(grid,s,cell){
    cells(s,cell,0,k=>{
        const list=grid.get(k);
        if(list)list.push(s);else grid.set(k,[s]);
    });
}
function coldGrid(pile,cell){
    let cache=caches.get(pile);
    if(!cache){
        cache={rev:-1,grid:new Map(),segments:new Map()};
        caches.set(pile,cache);
    }
    if(cache.rev===pile.revision)return cache.grid;
    const {grid,segments}=cache,keep=new Set();
    for(let i=1;i<pile.rows.length;i++){
        const a=pile.rows[i-1],b=pile.rows[i];
        if(!a.sleeping||!b.sleeping)continue;
        keep.add(b);
        if(segments.has(b))continue;
        const s=segment(a,b);
        segments.set(b,s);
        insert(grid,s,cell);
    }
    for(const [row,s] of segments){
        if(keep.has(row))continue;
        cells(s,cell,0,k=>{
            const list=grid.get(k);
            list.splice(list.indexOf(s),1);
            if(!list.length)grid.delete(k);
        });
        segments.delete(row);
    }
    cache.rev=pile.revision;
    return grid;
}

function move(p,v,y,amount){
    p.v+=v*amount;p.y+=y*amount;
    // Preserve incoming velocity across positional corrections. Tangential
    // damping comes from the physical contact, not from a bounce.
    p.pv+=v*amount;p.py+=y*amount;
}

function pointContact(p,a,b,margin){
    const vx=b.v-a.v,vy=b.y-a.y,qx=p.v-a.v,qy=p.y-a.y;
    const length=vx*vx+vy*vy;
    if(length<1e-6)return;
    const t=clamp((vx*qx+vy*qy)/length,0,1),s=1-t;
    const dx=qx-t*vx,dy=qy-t*vy;
    const square=dx*dx+dy*dy,reach=margin*1.65;
    if(square>reach*reach)return;
    const across=p.u-a.u*s-b.u*t;
    if(Math.abs(across)>p.paperWidth+margin)return;
    const d=Math.sqrt(square);
    const ox=p.ov-a.ov*s-b.ov*t,oy=p.oy-a.oy*s-b.oy*t;
    let nv,ny,distance=d;
    if(t>0&&t<1){
        const inverse=1/Math.sqrt(length);
        nv=-vy*inverse;ny=vx*inverse;
        const old=ox*nv+oy*ny;
        const sign=Math.abs(old)>.01?Math.sign(old):Math.sign(dx*nv+dy*ny)||1;
        nv*=sign;ny*=sign;
        distance=dx*nv+dy*ny;
    }else{
        if(d<.001)return;
        nv=dx/d;ny=dy/d;
    }
    if(distance>=margin)return;
    const w=p.w+a.w*s*s+b.w*t*t;
    if(!w)return;
    const edge=clamp((Math.abs(across)-p.paperWidth+margin*2)/(margin*2),0,1);
    const correction=Math.min(margin*2,margin-distance)*.81/w;
    const cap=margin*.68;
    move(p,nv,ny,Math.min(cap,correction*p.w));
    move(a,nv,ny,-Math.min(cap,correction*a.w*s));
    move(b,nv,ny,-Math.min(cap,correction*b.w*t));
    if(edge>0){
        const slide=clamp((p.paperWidth+margin*.22-Math.abs(across))*.40/w,0,cap)*edge*Math.sign(across);
        p.u+=slide*p.w;p.pu+=slide*p.w;
        a.u-=slide*a.w*s;a.pu-=slide*a.w*s;
        b.u-=slide*b.w*t;b.pu-=slide*b.w*t;
    }
    const relV=(p.v-p.pv)-(a.v-a.pv)*s-(b.v-b.pv)*t;
    const relY=(p.y-p.py)-(a.y-a.py)*s-(b.y-b.py)*t;
    const normal=relV*nv+relY*ny;
    const slip=(p.u-p.pu)-(a.u-a.pu)*s-(b.u-b.pu)*t;
    const normalDrag=clamp(normal*.48/w,-cap,0);
    const tangentV=relV-normal*nv,tangentY=relY-normal*ny;
    const speed=Math.hypot(tangentV,tangentY,slip);
    // The grip scales with contact pressure and releases at the edges.
    const grip=(correction-normalDrag)*(.53-.39*edge);
    const drag=Math.min(.40/w,grip/Math.max(.001,speed));
    const pushU=slip*drag,pushV=tangentV*drag+nv*normalDrag,pushY=tangentY*drag+ny*normalDrag;
    p.pu+=pushU*p.w;p.pv+=pushV*p.w;p.py+=pushY*p.w;
    a.pu-=pushU*a.w*s;a.pv-=pushV*a.w*s;a.py-=pushY*a.w*s;
    b.pu-=pushU*b.w*t;b.pv-=pushV*b.w*t;b.py-=pushY*b.w*t;
    const torque=clamp(normal/p.paperWidth*clamp(across/(p.paperWidth*.55),-1,1),-.14,.14);
    p.kick+=torque*p.w;
    a.kick-=torque*a.w*s;
    b.kick-=torque*b.w*t;
    if(distance<margin*.91&&(normal<-.035||distance<margin*.57)){
        if(p.sleeping)p.wake=true;
        if(a.sleeping)a.wake=true;
        if(b.sleeping)b.wake=true;
    }
}

function intersects(a,b,c,d,spacing){
    const vx=b.v-a.v,vy=b.y-a.y,wx=d.v-c.v,wy=d.y-c.y;
    const dx=c.v-a.v,dy=c.y-a.y,det=vx*wy-vy*wx;
    if(Math.abs(det)<1e-7){
        const length=vx*vx+vy*vy;
        if(length<1e-6||Math.abs(dx*vy-dy*vx)>spacing*.003)return false;
        const from=(dx*vx+dy*vy)/length,to=from+(wx*vx+wy*vy)/length;
        return (Math.min(1,Math.max(from,to))-Math.max(0,Math.min(from,to)))*Math.sqrt(length)>spacing*.13;
    }
    const t=(dx*wy-dy*wx)/det,u=(dx*vy-dy*vx)/det;
    return t>1e-5&&t<1-1e-5&&u>1e-5&&u<1-1e-5;
}

function contacts(pile,active,cold,repair=false){
    const spacing=pile.spacing,cell=spacing*2.8,margin=spacing*.74;
    const current=new Map(),blocked=repair?new Set():null;
    for(const index of active){
        const a=pile.rows[index-1],b=pile.rows[index],s=segment(a,b);
        const tag=++stamp;
        cells(s,cell,repair?0:margin,k=>{
            for(let layer=0;layer<2;layer++){
                const bucket=(layer?current:cold).get(k);
                if(!bucket)continue;
                for(const q of bucket){
                    if(q.stamp===tag||Math.abs(b.at-q.b.at)<spacing*1.45)continue;
                    q.stamp=tag;
                    const m=repair?0:margin;
                    if(s.x0-q.x1>m||q.x0-s.x1>m||s.y0-q.y1>m||q.y0-s.y1>m)continue;
                    const c=q.a,d=q.b;
                    if(repair){
                        if(Math.min(a.u,b.u)-Math.max(c.u,d.u)>pile.band||
                            Math.min(c.u,d.u)-Math.max(a.u,b.u)>pile.band||
                            !intersects(a,b,c,d,spacing))continue;
                        for(const row of [a,b,c,d]){
                            if(row.w)blocked.add(row);
                            if(row.sleeping)row.wake=true;
                        }
                    }else{
                        pointContact(a,c,d,margin);
                        pointContact(b,c,d,margin);
                        pointContact(c,a,b,margin);
                        pointContact(d,a,b,margin);
                    }
                }
            }
        });
        if(repair&&(a.w||b.w)){
            const limit=spacing*1.31;
            const du=a.u-b.u,dv=a.v-b.v,dy=a.y-b.y;
            if(du*du+dv*dv+dy*dy>limit*limit){
                if(a.w)blocked.add(a);
                if(b.w)blocked.add(b);
                if(a.sleeping)a.wake=true;
                if(b.sleeping)b.wake=true;
            }
        }
        insert(current,segment(a,b),cell);
    }
    return blocked;
}

function fixedStep(pile,speed){
    const {rows,spacing,band}=pile;
    const previousHead=pile.head,previousNext=pile.nextRow,previousCount=rows.length;
    pile.clock+=STEP;
    pile.head+=STEP*speed*(1-.86*pile.load);
    while(pile.nextRow<=pile.head){
        rows.push(rowAt(pile,pile.nextRow));
        pile.nextRow+=spacing;
    }
    const feed=pile.head-previousHead;
    // Read the lower footprint, including the leading end of the strip.
    // Redirect fresh slack into the nearest gap before allowing tall coils.
    const bins=12,footprint=new Float32Array(bins);
    const slotX=pile.layout.slot.x;
    let anchor=slotX;
    for(let i=0;i<rows.length;i+=4){
        const p=rows[i],age=pile.head-p.at;
        const x=slotX+AX*p.u-AZ*p.v;
        if(age>band*2.1&&age<band*2.4)anchor=x;
        if(age<band*2.4||floorAt(pile,p)-p.y>band*.8)continue;
        const bin=clamp(Math.floor(x/pile.width*bins),0,bins-1);
        footprint[bin]+=1;
        if(bin>0)footprint[bin-1]+=.36;
        if(bin+1<bins)footprint[bin+1]+=.36;
    }
    let destination=anchor,best=Infinity,filled=0;
    for(let bin=0;bin<bins;bin++){
        const x=(bin+.5)*pile.width/bins;
        const distance=Math.abs(anchor-x)/band;
        const cost=footprint[bin]*.18+distance*.78+Math.max(0,.37-distance)*1.6;
        if(footprint[bin]>=1.2)filled++;
        if(cost<best){best=cost;destination=x;}
    }
    const previousTarget=pile.spreadTarget??destination;
    const target=previousTarget+(destination-previousTarget)*.017;
    pile.spreadTarget=target;
    pile.spread=ease((filled/bins-.38)/.54);
    let changed=false;
    const moving=[],segments=[];
    const gravity=HEIGHT*1.62*STEP*STEP;
    // Only folds that have settled against the desk can rest. Nearby
    // moving segments and sustained contact pressure wake them again.
    for(let i=0;i<rows.length;i++){
        const r=rows[i],age=pile.head-r.at;
        const before=rows[i-1],after=rows[i+1];
        if(r.sleeping&&(r.wake||before?.wake||after?.wake)){
            r.sleeping=false;r.quiet=0;changed=true;
        }
        if(r.sleeping)continue;
        const motion=Math.hypot(r.u-r.pu,r.v-r.pv,r.y-r.py);
        const settled=age>band*3.8&&r.y>floorAt(pile,r)-band*.48;
        r.quiet=settled&&motion<spacing*.035&&!r.wake?r.quiet+1:0;
        if(r.quiet>78){sleep(r);changed=true;}
        else moving.push(r);
    }
    for(let i=0;i<rows.length;i++){
        const r=rows[i];
        r.wake=false;r.kick=0;
        if(!r.sleeping){
            const age=pile.head-r.at;
            r.ov=r.v;r.oy=r.y;r.ou=r.u;
            r.w=ease((age/spacing-2.65)/1.50);
            if(r.w){
                const u=r.u,v=r.v,y=r.y;
                const damping=age>band*4&&y>floorAt(pile,r)-band?.977:.988;
                const limit=spacing*.42;
                const guide=1-ease((age/spacing-2.65)/2.7);
                const rollerDrag=damping*(1-.46*guide);
                const feedV=feed*guide;
                const feedY=feed*(-.14+.033*age/spacing)*guide;
                r.u+=clamp((u-r.pu)*rollerDrag,-limit,limit);
                r.v+=clamp(feedV+(v-r.pv-feedV)*rollerDrag,-limit,limit);
                r.y+=clamp(feedY+(y-r.py-feedY)*rollerDrag,-limit,limit)+gravity*(1-.85*guide);
                const gap=floorAt(pile,r)-y;
                const close=ease(1-gap/(band*1.10))*ease(gap/(spacing*5));
                const fan=ease((age/band-1.17)/1.05)*ease((6.8-age/band)/2.0);
                const screenX=slotX+AX*u-AZ*v;
                const drift=clamp((target-screenX)/(band*.7),-1,1);
                const airborneForce=gravity*close*fan*drift*.88*(1-.42*pile.spread);
                r.u+=airborneForce*AX;
                r.v-=airborneForce*AZ;
                if(r.w<1){
                    const rail=feedPose(pile,age),hold=(1-r.w)*.45;
                    r.u*=1-hold;r.v+=(rail.v-r.v)*hold;r.y+=(rail.y-r.y)*hold;
                }

                r.pu=u;r.pv=v;r.py=y;
            }else{
                const rail=feedPose(pile,age),previous=feedPose(pile,Math.max(0,age-feed));
                r.v=rail.v;r.y=rail.y;
                r.pv=previous.v;r.py=previous.y;
                r.u=r.pu=0;
            }
        }
        if(i>0&&(!r.sleeping||!rows[i-1].sleeping))segments.push(i);
    }
    if(changed)pile.revision++;
    const cold=coldGrid(pile,spacing*2.8);
    for(let pass=0;pass<13;pass++){
        for(let k=0;k<segments.length;k++){
            const i=pass%2?segments[k]:segments[segments.length-1-k];
            const b=rows[i];
            const a=rows[i-1],c=rows[i+1];
            if(c&&pass<9)bend(pile,a,b,c,pass===0);
            if(c&&pass>=9&&b.y>floorAt(pile,b)-spacing*7){
                // Give impact a finite bend radius so feed pressure buckles
                // a run of paper instead of crumpling a single printed row.
                bendAngle(a,b,c,0,.48,.33);
            }
            link(a,b,spacing);
        }
        for(const r of moving)constrain(pile,r,pass===12);
        if(pass===2||pass===5||pass===8||pass===11)contacts(pile,segments,cold);
    }
    for(const r of moving)constrain(pile,r,false);
    let blocked=contacts(pile,segments,cold,true);
    for(let pass=0;pass<6&&blocked.size;pass++){
        retreat(blocked,pass<2?.30:0);
        blocked=contacts(pile,segments,cold,true);
    }
    if(blocked.size&&[...blocked].every(r=>pile.head-r.at>spacing*18)){
        // A contact deeper in the pile should not stall a free slot.
        const downstream=moving.filter(r=>!r.sleeping&&pile.head-r.at>spacing*12);
        retreat(downstream,0);
        blocked=contacts(pile,segments,cold,true);
    }
    const stalled=blocked.size>0;
    if(stalled){
        // Release the roller load while allowing already printed folds to
        // keep settling. A refused advance never removes visible paper.
        rows.length=previousCount;
        pile.head=previousHead;
        pile.nextRow=previousNext;
        while(segments.at(-1)>=rows.length)segments.pop();
        for(const r of moving){
            if(r.w||r.sleeping)continue;
            r.v=r.pv=r.ov;r.y=r.py=r.oy;r.u=r.pu=r.ou;
        }
        blocked=contacts(pile,segments,cold,true);
        for(let pass=0;pass<8&&blocked.size;pass++){
            retreat(blocked,0);
            blocked=contacts(pile,segments,cold,true);
        }
        if(blocked.size)retreat(moving.filter(r=>!r.sleeping),0);
    }
    let strained=0,tested=0;
    for(let i=Math.max(1,rows.length-50);i<rows.length-2;i++){
        const a=rows[i-1],b=rows[i],ratio=Math.hypot(a.u-b.u,a.v-b.v,a.y-b.y)/spacing;
        if(ratio<.71||ratio>1.29)strained++;
        tested++;
    }
    const load=stalled?1:clamp((strained/Math.max(1,tested)-.025)*3.6,0,1);
    pile.load+=(load-pile.load)*(load>pile.load?.053:.011);
    for(const i of segments){
        const a=rows[i-1],b=rows[i];
        if(!b)continue;
        if(a.sleeping!==b.sleeping&&Math.hypot(a.u-b.u,a.v-b.v,a.y-b.y)>spacing*1.18){
            (a.sleeping?a:b).wake=true;
        }
    }
    // Solve twist from uneven contact, local yaw, and a small amount of
    // residual torsion from the roll. Adjacent sections share the strain.
    for(const i of segments){
        const r=rows[i],before=rows[i-1],after=rows[i+1]??r;
        if(!r.w)continue;
        const age=(pile.head-r.at)/band;
        const release=clamp((age-.14)/.72,0,1);
        const phase=r.at/(band*1.8)+(pile.seed%211)*.059;
        const memory=.28*Math.sin(phase)+.13*Math.sin(phase*1.6+1.2);
        const yaw=clamp((after.u-before.u)/(spacing*1.65),-.68,.68);
        const torque=(before.roll+after.roll-2*r.roll)*38;
        const target=release*(memory-yaw*.57);
        r.spin=(r.spin+((target-r.roll)*8+torque)*STEP+clamp(r.kick,-.19,.19))*.96;
    }
    for(const r of moving){
        r.roll=r.w?clamp(r.roll+r.spin*STEP,-1.09,1.09):0;
        r.points=paperPoints(r,pile);
    }
    pile.layer=Math.min(17,Math.floor(rows.length/34));
}

function retreat(rows,keep){
    for(const r of rows){
        r.v=r.pv=r.ov+(r.v-r.ov)*keep;
        r.y=r.py=r.oy+(r.y-r.oy)*keep;
        r.u=r.pu=r.ou+(r.u-r.ou)*keep;
    }
}
function sleep(r){
    r.sleeping=true;r.spin=0;r.w=0;r.ov=r.pv=r.v;r.oy=r.py=r.y;r.ou=r.pu=r.u;
}

export function stepPile(pile,dt,speed){
    pile.accumulator+=dt;
    while(pile.accumulator>=STEP){
        fixedStep(pile,pile.full?0:speed);
        pile.accumulator-=STEP;
    }
}

export function mouth(pile){
    return {at:pile.head,points:paperPoints({v:0,y:-pile.layout.size*FEED_LIFT,u:0},pile)};
}

// Build a fixed-width material frame around the spatial tangent. Limit
// its excursions at contact so the edges respect the collision envelope.
export function paperSurface(pile){
    const {rows,band,spacing}=pile;
    const cell=band*.38;
    const grid=new Map();
    for(let i=1;i<rows.length;i++){
        const section=segment(rows[i-1],rows[i]);
        section.index=i;
        insert(grid,section,cell);
    }
    const clearanceAt=(row,index)=>{
        let distance=band*.82;
        const range=segment(row,row),seen=new Set();
        cells(range,cell,distance,k=>{
            if(distance<spacing*.85)return;
            const nearby=grid.get(k);
            if(!nearby)return;
            for(const other of nearby){
                const separation=Math.abs(other.index-index);
                if(separation<5||seen.has(other))continue;
                seen.add(other);
                const {a,b}=other,dv=b.v-a.v,dy=b.y-a.y;
                const square=dv*dv+dy*dy;
                const t=square>1e-8?clamp(((row.v-a.v)*dv+(row.y-a.y)*dy)/square,0,1):0;
                const gap=Math.hypot(row.v-a.v-t*dv,row.y-a.y-t*dy);
                if(separation<16&&gap>spacing*(separation-1)*.58)continue;
                distance=Math.min(distance,gap);
                if(distance<spacing*.85)break;
            }
        });
        return Math.max(0,(distance-spacing*3.7)*.22);
    };
    const bendRoom=rows.map((row,i)=>{
        if(i===0||i===rows.length-1)return Infinity;
        const a=rows[i-1],b=rows[i+1];
        const ux=row.u-a.u,vx=row.v-a.v,yx=row.y-a.y;
        const uy=b.u-row.u,vy=b.v-row.v,yy=b.y-row.y;
        const left=Math.hypot(ux,vx,yx),right=Math.hypot(uy,vy,yy);
        if(Math.min(left,right)<spacing*.75||ux*uy+vx*vy+yx*yy<left*right*.86)return 0;
        const turn=Math.hypot(vx*yy-yx*vy,yx*uy-ux*yy,ux*vy-vx*uy);
        if(turn<1e-5)return Infinity;
        const radius=left*right*Math.hypot(ux+uy,vx+vy,yx+yy)/(2*turn);
        return radius*.22;
    });
    const frames=rows.map((row,index)=>{
        const age=pile.head-row.at;
        const freedom=ease((age/spacing-16)/5.8)*ease((index-7)/8);
        if(!freedom)return {v:0,y:0};
        const before=rows[Math.max(0,index-2)],after=rows[Math.min(rows.length-1,index+2)];
        const du=after.u-before.u,dv=after.v-before.v,dy=after.y-before.y;
        const axial=Math.hypot(dv,dy),length=Math.hypot(du,axial);
        if(axial<spacing*.50||length<spacing)return {v:0,y:0};
        const yaw=-du/length*freedom;
        const roll=row.roll*freedom;
        const half=band*.5;
        const along=half*yaw*Math.cos(roll);
        const normal=half*Math.sin(roll);
        const driftV=(along*dv+normal*dy)/axial;
        const driftY=(along*dy-normal*dv)/axial;
        const drift=Math.hypot(driftV,driftY);
        if(drift<.12)return {v:0,y:0};
        const {size,slot}=pile.layout;
        const caseClearance=Math.max(row.v-size*CASE_FRONT,-size*CASE_REAR-row.v,
            caseTop(row.v,size)-row.y,row.y-size*CASE_BASE,
            Math.abs(row.u)-half-size*CASE_LEFT);
        let room=Math.max(0,caseClearance)*.72;
        for(let near=Math.max(0,index-4);near<=Math.min(rows.length-1,index+4);near++){
            room=Math.min(room,bendRoom[near]);
        }
        if(room<.12)return {v:0,y:0};
        room=Math.min(room,clearanceAt(row,index),drift);
        let tilt=room/drift;
        for(let pass=0;pass<5&&tilt>.008;pass++){
            const v=driftV*tilt,y=driftY*tilt,u=Math.sqrt(half*half-v*v-y*y);
            const points=[-1,0,1].map(f=>world(row.u+u*f,row.v+v*f,row.y+y*f));
            if(points.every(p=>slot.x+p.x>=2&&slot.x+p.x<=pile.width-2
                &&slot.y+p.y+SLOPE*p.z>=CROP_TOP+3&&slot.y+p.y+SLOPE*p.z<=HEIGHT-4))return {v,y};
            tilt*=.5;
        }
        return {v:0,y:0};
    });
    // A change in the cross-section frame is also a change in the edge
    // length. Limit that change along the material, including transitions
    // into the desk or another layer where the contact envelope narrows.
    const edgeStep=spacing*.14;
    for(let pass=0;pass<4;pass++){
        for(let j=1;j<frames.length;j++){
            const i=pass%2?frames.length-j:j;
            const a=frames[i-1],b=frames[i];
            const delta=Math.hypot(b.v-a.v,b.y-a.y);
            if(delta<=edgeStep)continue;
            const scale=edgeStep/delta;
            a.v*=scale;a.y*=scale;b.v*=scale;b.y*=scale;
        }
    }
    return rows.map((row,index)=>{
        const {v,y}=frames[index];
        if(!v&&!y)return row.points;
        const u=Math.sqrt(band*band*.25-v*v-y*y);
        return [-1,0,1].map(f=>world(row.u+u*f,row.v+v*f,row.y+y*f));
    });
}

function plane(nx,ny,nz,limit){
    const length=Math.hypot(nx,ny,nz);
    return {nx:nx/length,ny:ny/length,nz:nz/length,limit:limit/length};
}

export function casePlanes(size){
    return [
        plane(AX,0,AZ,CASE_RIGHT*size),plane(-AX,0,-AZ,CASE_LEFT*size),
        plane(-AZ,0,AX,CASE_FRONT*size),plane(AZ,0,-AX,CASE_REAR*size),
        plane(-ROOF_SLOPE*AZ,-1,ROOF_SLOPE*AX,0),plane(0,1,0,CASE_BASE*size),
        plane(-BEVEL_SLOPE*AZ,-1,BEVEL_SLOPE*AX,.097*size)
    ];
}

export function sourceCasePoint(x,y,z){
    const change=(z*AX-x*AZ)*(1/CASE_DEPTH-1);
    return {x:x-AZ*change,y,z:z+AX*change};
}

export function caseDepth(planes,x,y,slope){
    let enters=-Infinity,leaves=Infinity;
    for(const {nx,ny,nz,limit} of planes){
        const depth=nz-slope*ny,gap=limit-(x*nx+y*ny);
        if(Math.abs(depth)<1e-5){
            if(gap<0)return -Infinity;
            continue;
        }
        if(depth>0)leaves=Math.min(leaves,gap/depth);
        else enters=Math.max(enters,gap/depth);
        if(leaves<enters)return -Infinity;
    }
    return leaves;
}

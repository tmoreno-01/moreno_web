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
const MAX_FILL_ROWS=2450,MAX_PRINT_TIME=230;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function ease(value){
    const t=clamp(value,0,1);
    return t*t*(3-2*t);
}

export function cropTop(width){
    return CROP_TOP+(width<=520?16:0);
}

export function artworkScale(state,width,height){
    return Math.min(width/state.width,height/(HEIGHT-cropTop(state.width)))*(state.layout.phone?.98:.80);
}

export function printerLayout(width,phone=width<=520){
    const previous=Math.min(HEIGHT*1.005,width*.855);
    const size=previous*BODY_SCALE;
    const x=(width-size)/2,y=HEIGHT*.475-size/2-(phone?12:20);
    const slotScale=phone?1.02:1.07;
    return {x,y,size,phone,slotScale,band:previous*.232/AX*slotScale,slot:{x:x+size*.439,y:y+size*.419}};
}

export function createPile(seed,width,phone,timedFeed=false){
    const layout=printerLayout(width,phone),band=layout.band;
    return {seed,width,layout,band,timedFeed,spacing:band/21,head:0,full:false,rows:[],
        layer:0,accumulator:0,nextRow:0,revision:0,load:0,clock:0,spread:0,density:0,
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
    const du=b.u-a.u,dv=b.v-a.v,dy=b.y-a.y,d=Math.sqrt(du*du+dv*dv+dy*dy);
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

const curlMemory=new WeakMap();
function prepareBend(pile,b){
    const {band,spacing}=pile,age=pile.head-b.at;
    let material=curlMemory.get(b);
    if(!material){
        const ripple=b.at/(band*1.12)+(pile.seed%277)*.024;
        const phase=b.at/(band*1.63)+(pile.seed%107)*.17;
        material={
            variance:1+.12*Math.sin(b.at/band*.39+(pile.seed%100)*.02),
            memory:2.7-1.35*Math.sin(ripple)-.53*Math.sin(ripple*.47+1.7),
            asymmetry:Math.sin(phase)+.32*Math.sin(phase*1.81+1.7)
        };
        curlMemory.set(b,material);
    }
    const relaxed=clamp((age-band*.65)/(band*2),0,1);
    const release=age<band*2?pile.load*.26*Math.sin(pile.clock*1.6)*clamp(1-age/(band*2),0,1):0;
    const variance=material.variance+release;
    const rest=spacing*spacing/(pile.radius*variance+band*.18*relaxed+band*pile.load*.17);
    // Fresh paper relaxes after the rollers. Older paper retains its
    // curvature even when a fold is supported by the pile instead of the desk.
    const curl=ease((age/spacing-3)/6)*clamp((band*2.15-age)/(band*1.5),0,1);
    const landed=clamp((age/band-1.8)/1.6,0,1);
    const memory=material.memory*(.74+.26*pile.spread+.48*pile.density);
    // Let a congested incoming loop open under roller load. Older
    // folds retain their curvature while it works through the pile.
    const pressure=ease((pile.load-.13)/.58);
    const incoming=ease((age/band-1.3)/.75)*ease((6.2-age/band)/1.4);
    const retained=1-.66*pressure*incoming;
    b.naturalBend=-rest*(curl+landed*memory*retained);
    b.angular=ease((age/band-1.15)/1.25)*.9;
    b.rollCos=Math.cos(b.roll);
    b.rollSin=Math.sin(b.roll);
    b.buckle=rest*material.asymmetry*clamp((age-band*.18)/band,0,1);
}

function bend(pile,a,b,c,learn){
    const w=a.w+4*b.w+c.w;
    if(!w)return;
    if(learn)prepareBend(pile,b);
    const dv=a.v-c.v,dy=a.y-c.y,d=Math.sqrt(dv*dv+dy*dy);
    if(d<.001)return;
    const nv=dy/d,ny=-dv/d;
    const amount=(a.v+c.v-2*b.v)*nv+(a.y+c.y-2*b.y)*ny;
    const {band,spacing}=pile;
    const onFloor=b.y>floorAt(pile,b)-band*.67;
    if(learn&&onFloor&&Math.abs(amount)>spacing*.22){
        b.crease+=(clamp(amount,-spacing*.31,spacing*.31)-b.crease)*.042;
    }
    const target=b.naturalBend+b.crease;
    const k=pile.head-b.at<band*.95?.86:onFloor?.74:.59;
    const angular=b.angular;
    const easyBend=target*b.rollCos;
    const force=(amount-easyBend)*k*(1-angular)/w;
    if(angular)bendAngle(a,b,c,easyBend/spacing,k*angular);
    // Paper bends more readily through its face than sideways in its plane.
    // When a contact turns the strip, its easy bending axis turns with it.
    const side=a.u+c.u-2*b.u;
    const buckle=(onFloor?.58:.20)*b.buckle;
    const lateral=(side+target*b.rollSin-buckle)*.84/w;
    a.u-=lateral*a.w;b.u+=2*lateral*b.w;c.u-=lateral*c.w;
    a.v-=nv*force*a.w;a.y-=ny*force*a.w;
    b.v+=nv*force*2*b.w;b.y+=ny*force*2*b.w;
    c.v-=nv*force*c.w;c.y-=ny*force*c.w;
}

const key=(x,y)=>x+4096*y;
const caches=new WeakMap(),repairCaches=new WeakMap();
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
    const x0=Math.floor(s.x0/cell),x1=Math.floor(s.x1/cell);
    const y0=Math.floor(s.y0/cell),y1=Math.floor(s.y1/cell);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const k=key(x,y),list=grid.get(k);
        if(list)list.push(s);else grid.set(k,[s]);
    }
}
function coldGrid(pile,cell,cacheMap=caches){
    let cache=cacheMap.get(pile);
    if(!cache){
        cache={rev:-1,grid:new Map(),segments:new Map()};
        cacheMap.set(pile,cache);
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

function pointContact(p,a,b,margin,clock){
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
    if(ny<-.42)p.supportUntil=clock+.17;
    if(ny>.42){
        if(s>.18)a.supportUntil=clock+.17;
        if(t>.18)b.supportUntil=clock+.17;
    }
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
    const speed=Math.sqrt(tangentV*tangentV+tangentY*tangentY+slip*slip);
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
    if(distance<margin*.92&&(normal<-.22||distance<margin*.23)){
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

function block(row,blocked){
    if(row.w)blocked.add(row);
    if(row.sleeping)row.wake=true;
}

const contactWorkspaces=new WeakMap();
function contactWorkspace(pile){
    let work=contactWorkspaces.get(pile);
    if(!work){
        work={grid:new Map(),sections:[],buckets:[]};
        contactWorkspaces.set(pile,work);
    }
    return work;
}

function contacts(pile,active,cold){
    const {spacing,band,rows,clock}=pile,cell=spacing*2.8;
    const margin=spacing*(.74+.38*pile.density*(1-.76*(pile.recovery??0))),pad=margin;
    const reach=band+pad,separation=spacing*1.45;
    const {grid:current,sections,buckets}=contactWorkspace(pile);
    let used=0;
    for(const index of active){
        const a=rows[index-1],b=rows[index];
        const s=sections[used]??(sections[used]=segment(a,b));
        used++;
        s.a=a;s.b=b;
        s.x0=Math.min(a.v,b.v);s.x1=Math.max(a.v,b.v);
        s.y0=Math.min(a.y,b.y);s.y1=Math.max(a.y,b.y);
        const tag=++stamp;
        const x0=Math.floor((s.x0-pad)/cell),x1=Math.floor((s.x1+pad)/cell);
        const y0=Math.floor((s.y0-pad)/cell),y1=Math.floor((s.y1+pad)/cell);
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
            const k=key(x,y);
            for(let layer=0;layer<2;layer++){
                const bucket=(layer?current:cold).get(k);
                if(!bucket)continue;
                for(let i=0;i<bucket.length;i++){
                    const q=bucket[i];
                    if(q.stamp===tag||Math.abs(b.at-q.b.at)<separation)continue;
                    q.stamp=tag;
                    if(s.x0-q.x1>pad||q.x0-s.x1>pad||s.y0-q.y1>pad||q.y0-s.y1>pad)continue;
                    const c=q.a,d=q.b;
                    if(Math.min(a.u,b.u)-Math.max(c.u,d.u)>reach||
                        Math.min(c.u,d.u)-Math.max(a.u,b.u)>reach)continue;
                    pointContact(a,c,d,margin,clock);
                    pointContact(b,c,d,margin,clock);
                    pointContact(c,a,b,margin,clock);
                    pointContact(d,a,b,margin,clock);
                }
            }
        }
        s.x0=Math.min(a.v,b.v);s.x1=Math.max(a.v,b.v);
        s.y0=Math.min(a.y,b.y);s.y1=Math.max(a.y,b.y);
        const fromX=Math.floor(s.x0/cell),toX=Math.floor(s.x1/cell);
        const fromY=Math.floor(s.y0/cell),toY=Math.floor(s.y1/cell);
        for(let y=fromY;y<=toY;y++)for(let x=fromX;x<=toX;x++){
            const k=key(x,y);
            let bucket=current.get(k);
            if(!bucket){bucket=buckets.pop()??[];current.set(k,bucket);}
            bucket.push(s);
        }
    }
    for(const bucket of current.values()){
        bucket.length=0;
        buckets.push(bucket);
    }
    current.clear();
}

const repairWorkspaces=new WeakMap();
const REPAIR_CELL=1.45;

// Index the proposed geometry once per substep. Repair retries update only
// links incident to rows that retreated. Every movable endpoint of a
// previously rejected link is included, so it gets checked again.
function repairContacts(pile,active,cold,changed){
    const {spacing,band,rows}=pile,cell=spacing*REPAIR_CELL;
    const separation=spacing*1.45,limitSquared=(spacing*1.31)**2;
    let work=repairWorkspaces.get(pile);
    if(!work){
        work={grid:new Map(),sections:[],buckets:[],dirty:[],build:0,pass:0};
        repairWorkspaces.set(pile,work);
    }
    const {grid,sections,buckets,dirty}=work;
    const pass=++work.pass;
    dirty.length=0;
    if(!changed){
        for(const bucket of grid.values()){
            bucket.length=0;
            buckets.push(bucket);
        }
        grid.clear();
        work.build++;
        for(const i of active){
            const section=sections[i]??(sections[i]=segment(rows[i-1],rows[i]));
            section.a=rows[i-1];section.b=rows[i];
            section.build=work.build;
            section.pass=pass;
            dirty.push(section);
        }
    }else{
        for(const row of changed){
            // Each material row is exactly one spacing unit along the roll.
            const index=Math.round(row.at/spacing);
            for(let i=index;i<=index+1;i++){
                const section=sections[i];
                if(section?.build!==work.build||section.pass===pass)continue;
                section.pass=pass;
                dirty.push(section);
            }
        }
    }
    for(const s of dirty){
        if(changed){
            for(let y=s.row0;y<=s.row1;y++)for(let x=s.col0;x<=s.col1;x++){
                const k=key(x,y),bucket=grid.get(k);
                bucket.splice(bucket.indexOf(s),1);
                if(!bucket.length){grid.delete(k);buckets.push(bucket);}
            }
        }
        const {a,b}=s;
        s.x0=Math.min(a.v,b.v);s.x1=Math.max(a.v,b.v);
        s.y0=Math.min(a.y,b.y);s.y1=Math.max(a.y,b.y);
        s.u0=Math.min(a.u,b.u);s.u1=Math.max(a.u,b.u);
        s.col0=Math.floor(s.x0/cell);s.col1=Math.floor(s.x1/cell);
        s.row0=Math.floor(s.y0/cell);s.row1=Math.floor(s.y1/cell);
        for(let y=s.row0;y<=s.row1;y++)for(let x=s.col0;x<=s.col1;x++){
            const k=key(x,y);
            let bucket=grid.get(k);
            if(!bucket){bucket=buckets.pop()??[];grid.set(k,bucket);}
            bucket.push(s);
        }
    }
    const blocked=new Set();
    for(const s of dirty){
        const {a,b}=s,tag=++stamp;
        for(let y=s.row0;y<=s.row1;y++)for(let x=s.col0;x<=s.col1;x++){
            const k=key(x,y);
            for(let layer=0;layer<2;layer++){
                const bucket=(layer?grid:cold).get(k);
                if(!bucket)continue;
                for(let i=0;i<bucket.length;i++){
                    const q=bucket[i];
                    if(q.stamp===tag||Math.abs(b.at-q.b.at)<separation||
                        (layer&&q.pass===pass&&q.b.at>b.at))continue;
                    q.stamp=tag;
                    if(s.x0>q.x1||q.x0>s.x1||s.y0>q.y1||q.y0>s.y1)continue;
                    const c=q.a,d=q.b;
                    if(s.u0-(layer?q.u1:Math.max(c.u,d.u))>band||
                        (layer?q.u0:Math.min(c.u,d.u))-s.u1>band)continue;
                    const crossed=layer&&d.at>b.at?intersects(c,d,a,b,spacing):intersects(a,b,c,d,spacing);
                    if(!crossed)continue;
                    block(a,blocked);block(b,blocked);block(c,blocked);block(d,blocked);
                }
            }
        }
        const du=a.u-b.u,dv=a.v-b.v,dy=a.y-b.y;
        if(du*du+dv*dv+dy*dy>limitSquared){
            block(a,blocked);block(b,blocked);
        }
    }
    return blocked;
}

// The falling strip and any fast-moving folds get extra contact passes.
// The older pile still gets a full pass and the exact intersection check.
function focusContacts(pile,active,phase=-1){
    const {rows,spacing}=pile,cell=spacing*2.8;
    const focus=[],rest=new Map();
    const recent=rows.length-150;
    const fast=spacing*.18,fastSquared=fast*fast;
    let cursor=0;
    for(let i=1;i<rows.length;i++){
        const a=rows[i-1],b=rows[i];
        const moving=active[cursor]===i;
        if(moving)cursor++;
        const du=b.u-b.ou,dv=b.v-b.ov,dy=b.y-b.oy;
        if(moving&&(i>=recent||i%3===phase||du*du+dv*dv+dy*dy>fastSquared))focus.push(i);
        else insert(rest,segment(a,b),cell);
    }
    contacts(pile,focus,rest);
}

function updateSpread(pile){
    const {rows,band,width,layout:{slot}}=pile;
    pile.spreadCheck=pile.clock+.12;
    const wide=ease((rows.length-900)/670);
    const bins=14,lower=new Float32Array(bins),upper=new Float32Array(bins);
    let anchor=slot.x;
    for(let i=0;i<rows.length;i+=4){
        const p=rows[i],age=pile.head-p.at;
        const x=slot.x+AX*p.u-AZ*p.v;
        if(age>band*2.1&&age<band*2.4)anchor=x;
        if(age<band*2.4)continue;
        const gap=floorAt(pile,p)-p.y;
        const half=band*.5*AX;
        const from=clamp(Math.floor((x-half)/width*bins),0,bins-1);
        const to=clamp(Math.floor((x+half)/width*bins),0,bins-1);
        for(let j=from;j<=to;j++){
            if(gap<band*.80)lower[j]+=1;
            else if(gap<band*2.2)upper[j]+=1;
        }
    }
    let best=Infinity,destination=anchor,filled=0;
    for(let i=0;i<bins;i++){
        const x=(i+.5)*width/bins;
        const distance=Math.abs(anchor-x)/band;
        if(lower[i]>=2)filled++;
        const room=Math.min(1,x/(band*.45),(width-x)/(band*.45));
        const occupancy=Math.sqrt(lower[i]+upper[i]*.7);
        const cost=occupancy*(.21+.31*pile.density)+distance*(.85-.41*pile.density-.46*wide)
            +Math.max(0,.29-distance)*1.65+(1-room)*1.35;
        if(cost<best){best=cost;destination=x;}
    }
    pile.spread=ease((filled/bins-.43)/.51);
    pile.spreadDestination=destination;
}

function fixedStep(pile,speed,passes,step){
    const cadence=step/STEP;
    const lateSpread=ease((pile.rows.length-900)/670);
    const {rows,spacing,band}=pile;
    const previousHead=pile.head,previousNext=pile.nextRow,previousCount=rows.length;
    pile.clock+=step;
    pile.head+=step*speed*(1-.70*pile.load);
    while(pile.nextRow<=pile.head){
        rows.push(rowAt(pile,pile.nextRow));
        pile.nextRow+=spacing;
    }
    const feed=pile.head-previousHead;
    pile.density=ease((rows.length-500)/900);
    if(pile.clock>=(pile.spreadCheck??0))updateSpread(pile);
    const slotX=pile.layout.slot.x;
    const desired=pile.spreadDestination??slotX;
    const target=(pile.spreadTarget??slotX)+(desired-(pile.spreadTarget??slotX))*.023;
    pile.spreadTarget=target;
    let changed=false;
    const moving=[],segments=[];
    const gravity=HEIGHT*1.62*step*step*(1-.47*pile.density);
    const airDrag=.988**cadence,supportDrag=.91**cadence;
    const twistDrag=.96**cadence,groundDrag=.89**cadence;
    // Quiet sections can rest on the desk or a supporting layer. Impact
    // or tension wakes them and their immediate neighbors.
    for(let i=0;i<rows.length;i++){
        const r=rows[i],age=pile.head-r.at;
        const before=rows[i-1],after=rows[i+1];
        if(r.sleeping&&(r.wake||before?.wake||after?.wake)){
            r.sleeping=false;r.quiet=0;changed=true;
        }
        if(r.sleeping)continue;
        const motion=Math.hypot(r.u-r.ou,r.v-r.ov,r.y-r.oy);
        const supported=r.y>floorAt(pile,r)-band*.42||r.supportUntil>=pile.clock;
        const settled=age>band*5.5&&supported;
        r.quiet=settled&&motion<spacing*.087*cadence&&!r.wake
            ?r.quiet+cadence:Math.max(0,r.quiet-4*cadence);
        if(r.quiet>42){sleep(r);changed=true;}
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
                const supported=age>band*5&&(y>floorAt(pile,r)-band*.42||r.supportUntil>=pile.clock);
                const damping=supported?supportDrag:airDrag;
                const limit=spacing*.42;
                const guide=1-ease((age/spacing-2.65)/2.7);
                const rollerDrag=damping*(1-.46*guide);
                const feedV=feed*guide;
                const feedY=feed*(-.14+.033*age/spacing)*guide;
                r.u+=clamp((u-r.pu)*rollerDrag,-limit,limit);
                r.v+=clamp(feedV+(v-r.pv-feedV)*rollerDrag,-limit,limit);
                r.y+=clamp(feedY+(y-r.py-feedY)*rollerDrag,-limit,limit)+gravity*(1-.85*guide);
                const gap=floorAt(pile,r)-y;
                const close=ease(1-gap/(band*(1.10+.88*pile.density+.80*lateSpread)))*ease(gap/(spacing*5));
                const fan=ease((age/band-1.17)/1.05)*ease((6.8+1.8*pile.density+1.3*lateSpread-age/band)/2.0);
                const screenX=slotX+AX*u-AZ*v;
                const drift=clamp((target-screenX)/(band*.7),-1,1);
                const airborneForce=gravity*close*fan*drift*(.88+.52*pile.density)*(1-.28*pile.spread);
                const clear=ease((v-pile.layout.size*CASE_FRONT)/(spacing*4));
                const free=r.supportUntil>=pile.clock?.25:1;
                const spreadForce=gravity*lateSpread*fan*drift*2.0*clear*free
                    *ease(gap/(spacing*5));
                r.u+=airborneForce*AX+spreadForce;
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
    const flexPasses=passes-4;
    const dense=rows.length>720&&passes<=10;
    const contactInterval=passes===8?2:3;
    // Under heavy load, rotate the resting contacts across steps.
    // Fresh and moving folds stay in every pass, and the exact crossing
    // check still covers the full pile before committing a step.
    const stagger=passes===8&&step>=1/60&&rows.length>1100;
    if(stagger)pile.contactPhase=((pile.contactPhase??-1)+1)%3;
    for(let pass=0;pass<passes;pass++){
        for(let k=0;k<segments.length;k++){
            const i=pass%2?segments[k]:segments[segments.length-1-k];
            const b=rows[i];
            const a=rows[i-1],c=rows[i+1];
            if(c&&pass<flexPasses&&(!dense||i>=rows.length-160||pass%2===0)){
                bend(pile,a,b,c,pass===0);
            }
            if(c&&pass>=flexPasses&&b.y>floorAt(pile,b)-spacing*7){
                // Give impact a finite bend radius so feed pressure buckles
                // a run of paper instead of crumpling a single printed row.
                bendAngle(a,b,c,0,.48,.33);
            }
            link(a,b,spacing);
        }
        for(const r of moving)constrain(pile,r,pass===passes-1);
        if((pass+1)%contactInterval===0&&pass<passes-1){
            if(dense&&pass<passes-3){
                if(pass===contactInterval-1)focusContacts(pile,segments);
            }
            else if(stagger)focusContacts(pile,segments,pile.contactPhase);
            else contacts(pile,segments,cold);
        }
    }
    for(const r of moving)constrain(pile,r,false);
    const repairCold=coldGrid(pile,spacing*REPAIR_CELL,repairCaches);
    let blocked=repairContacts(pile,segments,repairCold);
    for(let pass=0;pass<6&&blocked.size;pass++){
        retreat(blocked,pass<2?.30:0);
        blocked=repairContacts(pile,segments,repairCold,blocked);
    }
    if(blocked.size&&[...blocked].every(r=>pile.head-r.at>spacing*18)){
        // A contact deeper in the pile should not stall a free slot.
        const downstream=moving.filter(r=>!r.sleeping&&pile.head-r.at>spacing*12);
        retreat(downstream,0);
        blocked=repairContacts(pile,segments,repairCold,new Set([...downstream,...blocked]));
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
        blocked=repairContacts(pile,segments,repairCold);
        for(let pass=0;pass<8&&blocked.size;pass++){
            retreat(blocked,0);
            blocked=repairContacts(pile,segments,repairCold,blocked);
        }
        if(blocked.size)retreat(moving.filter(r=>!r.sleeping),0);
    }
    let strained=0,tested=0;
    for(let i=Math.max(1,rows.length-50);i<rows.length-2;i++){
        const a=rows[i-1],b=rows[i],ratio=Math.hypot(a.u-b.u,a.v-b.v,a.y-b.y)/spacing;
        if(ratio<.71||ratio>1.29)strained++;
        tested++;
    }
    const printProgress=pile.head-previousHead;
    if(speed>0){
        const stuck=printProgress<speed*step*.17;
        pile.stallTime=Math.max(0,(pile.stallTime??0)+(stuck?step:-step*2));
        const release=ease(((pile.stallTime??0)-.45)/1.3);
        pile.recovery=(pile.recovery??0)+(release-(pile.recovery??0))*.035;
    }
    const load=stalled?1:clamp((strained/Math.max(1,tested)-.025)*3.6,0,1);
    pile.load+=(load-pile.load)*(load>pile.load?.053:.011);
    for(const i of segments){
        const a=rows[i-1],b=rows[i];
        if(!b)continue;
        if(a.sleeping!==b.sleeping&&Math.hypot(a.u-b.u,a.v-b.v,a.y-b.y)>spacing*1.12){
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
        const grounded=age>3.8&&(r.y>floorAt(pile,r)-band*.46||r.supportUntil>=pile.clock);
        const torque=(before.roll+after.roll-2*r.roll)*(grounded?54:38);
        const target=release*(memory-yaw*.57);
        const impulse=grounded?.085:.19;
        const drag=grounded?groundDrag:twistDrag;
        r.spin=(r.spin+((target-r.roll)*8+torque)*step+clamp(r.kick,-impulse,impulse))*drag;
    }
    for(const r of moving){
        r.roll=r.w?clamp(r.roll+r.spin*step,-1.09,1.09):0;
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

// Count occupied screen cells across the visible field. A narrow tower or a
// long fold across the bottom should not end the print by itself.
export function measureCoverage(pile){
    const cols=44,rows=28,mask=new Uint8Array(cols*rows);
    const crop=cropTop(pile.width),viewHeight=HEIGHT-crop;
    const minX=pile.width*.06,minY=crop+viewHeight*.16;
    const scaleX=cols/(pile.width*.88),scaleY=rows/(viewHeight*.84);
    const {slot}=pile.layout;
    const x=p=>(slot.x+p.x-minX)*scaleX;
    const y=p=>(slot.y+p.y+SLOPE*p.z-minY)*scaleY;
    function triangle(a,b,c){
        const ax=x(a),ay=y(a),bx=x(b),by=y(b),cx=x(c),cy=y(c);
        const ux=bx-ax,uy=by-ay,vx=cx-ax,vy=cy-ay;
        const det=ux*vy-uy*vx;
        if(Math.abs(det)<.0001)return;
        const fromX=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5));
        const toX=Math.min(cols-1,Math.floor(Math.max(ax,bx,cx)-.5));
        const fromY=Math.max(0,Math.ceil(Math.min(ay,by,cy)-.5));
        const toY=Math.min(rows-1,Math.floor(Math.max(ay,by,cy)-.5));
        for(let j=fromY;j<=toY;j++){
            const dy=j+.5-ay;
            for(let i=fromX;i<=toX;i++){
                if(mask[j*cols+i])continue;
                const dx=i+.5-ax;
                const u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
                if(u>=0&&v>=0&&u+v<=1)mask[j*cols+i]=1;
            }
        }
    }
    for(let i=1;i<pile.rows.length;i++){
        const [a,,b]=pile.rows[i-1].points,[c,,d]=pile.rows[i].points;
        if(!a||!c)continue;
        triangle(a,b,c);triangle(b,c,d);
    }
    let left=0,right=0;
    for(let j=0;j<rows;j++){
        for(let i=0;i<cols/2;i++){
            left+=mask[j*cols+i];
            right+=mask[j*cols+cols-1-i];
        }
    }
    const half=cols*rows*.5;
    return {left:left/half,right:right/half,area:(left+right)/(half*2)};
}

function hasFilledView(pile){
    if(pile.rows.length<1200||pile.clock<(pile.nextFillCheck??0))return false;
    pile.nextFillCheck=pile.clock+.75;
    const {area,left,right}=measureCoverage(pile);
    const target=pile.layout.phone?.61:.62;
    return area>=target&&Math.min(left,right)>=.46;
}

export function stepPile(pile,dt,speed,passes=13,step=STEP){
    const previousStep=pile.stepSize??STEP;
    if(step!==previousStep){
        const scale=step/previousStep;
        for(const row of pile.rows){
            row.pu=row.u-(row.u-row.pu)*scale;
            row.pv=row.v-(row.v-row.pv)*scale;
            row.py=row.y-(row.y-row.py)*scale;
        }
    }
    pile.stepSize=step;
    pile.accumulator+=dt;
    while(pile.accumulator>=step){
        fixedStep(pile,pile.full||(!pile.timedFeed&&pile.rows.length>=MAX_FILL_ROWS)?0:speed,passes,step);
        pile.accumulator-=step;
    }
    if(!pile.full&&!pile.timedFeed&&(hasFilledView(pile)||pile.rows.length>=MAX_FILL_ROWS||pile.clock>=MAX_PRINT_TIME))pile.full=true;
}

export function mouth(pile){
    return {at:pile.head,points:paperPoints({v:0,y:-pile.layout.size*FEED_LIFT,u:0},pile)};
}

// Build a fixed-width material frame around the spatial tangent. Limit
// its excursions at contact so the edges respect the collision envelope.
export function paperSurface(pile){
    const {rows,band,spacing}=pile;
    const cell=spacing*4;
    const grid=new Map();
    for(let i=1;i<rows.length;i++){
        const section=segment(rows[i-1],rows[i]);
        section.index=i;
        insert(grid,section,cell);
    }
    const seen=new Uint32Array(rows.length);
    const clearanceAt=(row,index,needed)=>{
        const mark=index+1;
        let distance=Math.min(band*.82,spacing*3.7+needed/.22);
        const x0=Math.floor((row.v-distance)/cell),x1=Math.floor((row.v+distance)/cell);
        const y0=Math.floor((row.y-distance)/cell),y1=Math.floor((row.y+distance)/cell);
        for(let y=y0;y<=y1&&distance>spacing*3.7;y++)for(let x=x0;x<=x1&&distance>spacing*3.7;x++){
            const nearby=grid.get(key(x,y));
            if(!nearby)continue;
            for(const other of nearby){
                const separation=Math.abs(other.index-index);
                if(separation<5||seen[other.index]===mark)continue;
                seen[other.index]=mark;
                const {a,b}=other,dv=b.v-a.v,dy=b.y-a.y;
                const square=dv*dv+dy*dy;
                const t=square>1e-8?clamp(((row.v-a.v)*dv+(row.y-a.y)*dy)/square,0,1):0;
                const gapV=row.v-a.v-t*dv,gapY=row.y-a.y-t*dy;
                const gap=Math.sqrt(gapV*gapV+gapY*gapY);
                if(separation<16&&gap>spacing*(separation-1)*.58)continue;
                distance=Math.min(distance,gap);
                if(distance<=spacing*3.7)break;
            }
        }
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
        const older=ease((age/band-2.6)/1.7);
        const adjacent=(rows[Math.max(0,index-1)].roll+rows[Math.min(rows.length-1,index+1)].roll)*.5;
        const roll=(row.roll+(adjacent-row.roll)*older*.52)*freedom;
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
        room=Math.min(room,drift);
        room=Math.min(room,clearanceAt(row,index,room));
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
            const limit=pile.head-rows[i].at>band*3.5?edgeStep*.72:edgeStep;
            if(delta<=limit)continue;
            const scale=limit/delta;
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

// Contacts between swept cross-sections of the paper, including the spans
// between mesh vertices. Each section is represented by two thin capsules.
const clamp01=x=>Math.max(0,Math.min(1,x));
const key=(x,y,z)=>x+1024*y+1048576*z;

function bounds(a,b){
    return [Math.min(a.x,b.x,a.ox,b.ox),Math.max(a.x,b.x,a.ox,b.ox),
        Math.min(a.y,b.y,a.oy,b.oy),Math.max(a.y,b.y,a.oy,b.oy),
        Math.min(a.z,b.z,a.oz,b.oz),Math.max(a.z,b.z,a.oz,b.oz)];
}

function gridRange(box,cell,pad){
    return box.map((value,i)=>Math.floor((value+(i%2?pad:-pad))/cell));
}

function eachCell(box,cell,pad,visit){
    const [x0,x1,y0,y1,z0,z1]=gridRange(box,cell,pad);
    for(let z=z0;z<=z1;z++)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)visit(key(x,y,z));
}

function insert(grid,section,cell){
    eachCell(section.box,cell,0,index=>{
        const bucket=grid.get(index);
        if(bucket)bucket.push(section);
        else grid.set(index,[section]);
    });
}

function remove(grid,section,cell){
    eachCell(section.box,cell,0,index=>{
        const bucket=grid.get(index);
        bucket.splice(bucket.indexOf(section),1);
        if(!bucket.length)grid.delete(index);
    });
}

function makeSection(a,b,row){
    return {a,b,row,box:bounds(a,b),stamp:0};
}

function offset(p,nx,ny,nz,amount){
    const x=nx*amount,y=ny*amount,z=nz*amount;
    p.x+=x;p.y+=y;p.z+=z;
    // Positional separation should not add a bounce to thermal paper.
    p.px+=x*.77;p.py+=y*.77;p.pz+=z*.77;
}

function collide(a,b,c,d,thickness,sleeping){
    const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z;
    const vx=d.x-c.x,vy=d.y-c.y,vz=d.z-c.z;
    const rx=a.x-c.x,ry=a.y-c.y,rz=a.z-c.z;
    const uu=ux*ux+uy*uy+uz*uz,vv=vx*vx+vy*vy+vz*vz;
    if(uu<1e-8||vv<1e-8)return;
    const uv=ux*vx+uy*vy+uz*vz,ur=ux*rx+uy*ry+uz*rz,vr=vx*rx+vy*ry+vz*rz;
    const det=uu*vv-uv*uv;
    // Also handle nearly parallel sections. Start in the overlap so the
    // correction is shared by the four nodes when strips land face to face.
    let s=det>uu*vv*1e-5?clamp01((uv*vr-ur*vv)/det):clamp01((uv*.5-ur)/uu);
    const t=clamp01((uv*s+vr)/vv);
    s=clamp01((uv*t-ur)/uu);
    const dx=rx+ux*s-vx*t,dy=ry+uy*s-vy*t,dz=rz+uz*s-vz*t;
    const distance2=dx*dx+dy*dy+dz*dz;
    const sweep=thickness*2.1;
    if(distance2>sweep*sweep)return;

    const px=a.ox+(b.ox-a.ox)*s-c.ox-(d.ox-c.ox)*t;
    const py=a.oy+(b.oy-a.oy)*s-c.oy-(d.oy-c.oy)*t;
    const pz=a.oz+(b.oz-a.oz)*s-c.oz-(d.oz-c.oz)*t;
    const oldDistance=Math.hypot(px,py,pz),distance=Math.sqrt(distance2);
    let nx,ny,nz,gap=distance;
    // Preserve the incoming side when a section steps through another
    // section. A nearest-point-only solve pushes it further through instead.
    if(oldDistance>thickness*.14&&oldDistance<sweep&&dx*px+dy*py+dz*pz<0){
        nx=px/oldDistance;ny=py/oldDistance;nz=pz/oldDistance;
        gap=dx*nx+dy*ny+dz*nz;
    }else{
        if(distance>=thickness)return;
        if(distance<1e-6){
            if(oldDistance<1e-6)return;
            nx=px/oldDistance;ny=py/oldDistance;nz=pz/oldDistance;
        }else{
            nx=dx/distance;ny=dy/distance;nz=dz/distance;
        }
    }
    const wa=a.w*(1-s),wb=b.w*s,wc=c.w*(1-t),wd=d.w*t;
    const w=wa*(1-s)+wb*s+wc*(1-t)+wd*t;
    if(!w)return;
    const correction=Math.min(thickness*1.65,thickness-gap)*.87/w;
    offset(a,nx,ny,nz,correction*wa);
    offset(b,nx,ny,nz,correction*wb);
    offset(c,nx,ny,nz,-correction*wc);
    offset(d,nx,ny,nz,-correction*wd);

    const relative=(left,right,p,q)=>left+(right-left)*s-p-(q-p)*t;
    const vxRel=relative(a.x-a.px,b.x-b.px,c.x-c.px,d.x-d.px);
    const vyRel=relative(a.y-a.py,b.y-b.py,c.y-c.py,d.y-d.py);
    const vzRel=relative(a.z-a.pz,b.z-b.pz,c.z-c.pz,d.z-d.pz);
    const vn=vxRel*nx+vyRel*ny+vzRel*nz;
    if(sleeping&&(gap<thickness*.36||(-vn>thickness*.135&&oldDistance-gap>thickness*.09)))sleeping.wake=true;
    const drag=.13/w;
    const fx=(vxRel-vn*nx)*drag,fy=(vyRel-vn*ny)*drag,fz=(vzRel-vn*nz)*drag;
    a.px+=fx*wa;a.py+=fy*wa;a.pz+=fz*wa;
    b.px+=fx*wb;b.py+=fy*wb;b.pz+=fz*wb;
    c.px-=fx*wc;c.py-=fy*wc;c.pz-=fz*wc;
    d.px-=fx*wd;d.py-=fy*wd;d.pz-=fz*wd;
}

const caches=new WeakMap();
function cachedGrid(pile,cell){
    let cache=caches.get(pile);
    if(!cache){
        cache={revision:-1,grid:new Map(),sections:new Map()};
        caches.set(pile,cache);
    }
    if(cache.revision===pile.sleepRevision)return cache.grid;
    const {grid,sections}=cache;
    const settled=new Set(pile.settled);
    for(const [row,parts] of sections){
        if(settled.has(row))continue;
        for(const part of parts)remove(grid,part,cell);
        sections.delete(row);
    }
    for(const row of settled){
        if(sections.has(row))continue;
        const {points}=row;
        const parts=[makeSection(points[0],points[1],row),makeSection(points[1],points[2],row)];
        for(const part of parts)insert(grid,part,cell);
        sections.set(row,parts);
    }
    cache.revision=pile.sleepRevision;
    return grid;
}

function near(a,b,margin){
    return a[0]-b[1]<=margin&&b[0]-a[1]<=margin&&
        a[2]-b[3]<=margin&&b[2]-a[3]<=margin&&
        a[4]-b[5]<=margin&&b[4]-a[5]<=margin;
}

let stamp=0;
export function solvePaperContacts(pile,active){
    const cell=pile.spacing*2.6;
    const thickness=pile.spacing*1.19;
    const minDistance=pile.spacing*2.4;
    const fixed=cachedGrid(pile,cell);
    const moving=new Map();
    for(const row of active){
        const {points,at}=row;
        for(let j=0;j<2;j++){
            const a=points[j],b=points[j+1];
            const box=bounds(a,b);
            const [x0,x1,y0,y1,z0,z1]=gridRange(box,cell,thickness);
            stamp++;
            for(let z=z0;z<=z1;z++)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
                const index=key(x,y,z);
                for(let source=0;source<2;source++){
                    const bucket=(source?moving:fixed).get(index);
                    if(!bucket)continue;
                    for(const section of bucket){
                        if(section.stamp===stamp||Math.abs(at-section.row.at)<minDistance)continue;
                        section.stamp=stamp;
                        if(near(box,section.box,thickness))collide(a,b,section.a,section.b,thickness,source?null:section.row);
                    }
                }
            }
            insert(moving,makeSection(a,b,row),cell);
        }
    }
}

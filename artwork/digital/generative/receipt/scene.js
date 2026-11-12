import {HEIGHT,cropTop,SLOPE,BODY_SCALE,mouth,paperSurface,floorLevel,casePlanes,caseDepth,sourceCasePoint} from './pile.js?edition=20';

export const INK_WIDTH=360;
const TILE=1024,TILE_PAD=18,TILE_HEIGHT=TILE+2*TILE_PAD,INK_STRIDE=INK_WIDTH+1;
const PHOTO_SLOPE=.52;
const PHOTO_TILT=-.053;
const mono='"Courier New", Courier, monospace';
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));

const INK_MARGIN=14;
function fontSize(kind){
    if(kind==='heading')return 29;
    if(kind==='total')return 27;
    return kind==='price'||kind==='continuation'?22:19;
}

export function layoutInk(lines){
    let cursor=9;
    const baselines=lines.map(line=>{
        const ascent=line.kind==='barcode'?13:Math.ceil(fontSize(line.kind)*.81);
        const depth=line.kind==='barcode'?6:Math.ceil(fontSize(line.kind)*.23);
        const gap=line.kind==='total'?11:line.kind==='barcode'?8:5;
        const baseline=cursor+ascent+gap;
        cursor=baseline+depth;
        return baseline;
    });
    return {baselines,height:cursor+9};
}

export function lineCapacity(line,withPrice=false){
    const cell=fontSize(line.kind)*.601;
    const price=withPrice&&line.value?line.value.length*cell+11:0;
    return Math.floor((INK_WIDTH-2*INK_MARGIN-price)/cell);
}

function print(ctx,line,y){
    const left=INK_MARGIN,right=INK_WIDTH-INK_MARGIN;
    ctx.fillStyle='#1d1b17';
    ctx.textAlign='left';
    ctx.textBaseline='alphabetic';
    if(line.kind==='barcode'){
        let x=left,n=line.value|0;
        for(let i=0;i<66;i++){
            n=(Math.imul(n,1664525)+1013904223)|0;
            const width=1+((n>>>29)&3);
            ctx.fillRect(x,y-13,width,19);
            x+=width+1;
        }
        return;
    }
    const bold=['heading','total','price','continuation'].includes(line.kind);
    ctx.font=(bold?'bold ':'')+fontSize(line.kind)+'px '+mono;
    if(line.kind==='note'||line.kind==='rule')ctx.fillStyle='#514d44';
    ctx.fillText(line.text,left,y);
    if(line.value){
        ctx.textAlign='right';
        ctx.fillText(line.value,right,y);
    }
}

function inkTiles(){
    let previousInk=null,lastEntry=null,lastScale=0;
    const tiles=new Map();
    return (index,scale,ink)=>{
        if(previousInk!==ink){
            if(scale!==lastScale||!lastEntry||!ink.includes(lastEntry))tiles.clear();
            else{
                const newInk=(lastEntry.at*scale+lastEntry.row.height);
                const visibleStart=(ink[0]?.at??0)*scale;
                for(const tile of tiles.keys()){
                    if(tile*TILE+TILE_PAD>newInk||(tile-1)*TILE<visibleStart-TILE)tiles.delete(tile);
                }
            }
            previousInk=ink;
            lastEntry=ink.at(-1);
            lastScale=scale;
        }
        if(tiles.has(index))return tiles.get(index);
        const canvas=document.createElement('canvas');
        canvas.width=INK_WIDTH;canvas.height=TILE_HEIGHT;
        const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
        ctx.fillStyle='#f9f6ed';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        for(const {at,row} of ink){
            const top=index*TILE-(at*scale+row.height)+TILE_PAD;
            if(top>TILE_HEIGHT||top+row.height<0)continue;
            const {baselines}=row.baselines?row:layoutInk(row.lines);
            row.lines.forEach((line,i)=>print(ctx,line,top+baselines[i]));
        }
        const edge=ctx.createLinearGradient(0,0,INK_WIDTH,0);
        edge.addColorStop(0,'#867e6929');edge.addColorStop(.07,'#fff0');
        edge.addColorStop(.93,'#fff0');edge.addColorStop(1,'#867e6924');
        ctx.fillStyle=edge;ctx.fillRect(0,0,canvas.width,canvas.height);
        const pixels=ctx.getImageData(0,0,INK_WIDTH,TILE_HEIGHT).data;
        const tones=new Uint8Array(INK_WIDTH*TILE_HEIGHT);
        for(let i=0;i<tones.length;i++)tones[i]=pixels[i*4];
        const integral=new Uint32Array(INK_STRIDE*(TILE_HEIGHT+1));
        for(let y=0;y<TILE_HEIGHT;y++){
            let sum=0;
            for(let x=0;x<INK_WIDTH;x++){
                sum+=tones[y*INK_WIDTH+x];
                const i=y*INK_STRIDE+x+1;
                integral[i+INK_STRIDE]=integral[i]+sum;
            }
        }
        const tile={tones,integral};
        tiles.set(index,tile);
        return tile;
    };
}

function inkIntegral(values,x,y){
    const ix=x|0,iy=y|0,dx=x-ix,dy=y-iy,i=iy*INK_STRIDE+ix;
    const lo=values[i]+(values[i+1]-values[i])*dx;
    const hi=values[i+INK_STRIDE]+(values[i+INK_STRIDE+1]-values[i+INK_STRIDE])*dx;
    return lo+(hi-lo)*dy;
}

function sampleInk(tile,u,v,footprintU,footprintV){
    const footprint=Math.max(footprintU,footprintV);
    let smooth;
    if(footprint>1.7){
        // Integrate the projected pixel in both material axes. On a low
        // fold a single pixel can cover parts of several adjacent glyphs.
        const radiusU=clamp(footprintU*.5,.5,17),radiusV=clamp(footprintV*.5,.5,17);
        const left=clamp(u-radiusU,0,INK_WIDTH-1),right=clamp(u+radiusU,left+.001,INK_WIDTH-.001);
        const top=clamp(v-radiusV,0,TILE_HEIGHT-1),bottom=clamp(v+radiusV,top+.001,TILE_HEIGHT-.001);
        const sum=inkIntegral(tile.integral,right,bottom)-inkIntegral(tile.integral,left,bottom)
            -inkIntegral(tile.integral,right,top)+inkIntegral(tile.integral,left,top);
        smooth=247+(sum/((right-left)*(bottom-top))-247)*clamp(18/footprint,0,1);
        if(footprint>=3.2)return smooth;
    }
    const sx=clamp(u-.5,0,INK_WIDTH-1.001),sy=clamp(v-.5,0,TILE_HEIGHT-1.001);
    const x=sx|0,y=sy|0,fx=sx-x,fy=sy-y,k=y*INK_WIDTH+x;
    const tex=tile.tones;
    const a=tex[k]+(tex[k+1]-tex[k])*fx;
    const b=tex[k+INK_WIDTH]+(tex[k+INK_WIDTH+1]-tex[k+INK_WIDTH])*fx;
    const sharp=a+(b-a)*fy;
    if(smooth===undefined)return sharp;
    const mix=(footprint-1.7)/1.5;
    return sharp+(smooth-sharp)*mix*mix*(3-2*mix);
}

function inkPatch(a,b,c,d,u,v,du,dv){
    const bx=b.x-a.x,by=b.y-a.y,dx=d.x-a.x,dy=d.y-a.y;
    const qx=c.x-b.x-d.x+a.x,qy=c.y-b.y-d.y+a.y;
    if(qx*qx+qy*qy<.04)return null;
    const det=bx*dy-by*dx;
    const d1=det+bx*qy-by*qx,d2=det+qx*dy-qy*dx;
    // Convex patches have one continuous inverse. A patch that doubles
    // back at the silhouette still needs separate depth-tested faces.
    const sign=Math.sign(det);
    if(Math.min(det*sign,d1*sign,d2*sign,(d1+d2-det)*sign)<.3)return null;
    return {x:a.x,y:a.y,bx,by,dx,dy,qx,qy,u,v,du,dv};
}

// Rasterise the same continuous UV surface as the physical mesh. Depth is
// resolved per pixel, so intersecting projections don't cut a printed line.
function raster(frame,a,b,c,u0,v0,u1,v1,u2,v2,ink,nextInk,shade0,shade1,shade2,inkWeight,patch){
    const {width,height,depth,mask,pixels}=frame;
    const dx1=b.x-a.x,dy1=b.y-a.y,dx2=c.x-a.x,dy2=c.y-a.y;
    const det=dx1*dy2-dy1*dx2;
    if(Math.abs(det)<.04)return;
    const inv=1/det;
    const gx=dy2*inv,gy=-dx2*inv,hx=-dy1*inv,hy=dx1*inv;
    const zu=b.z-a.z,zv=c.z-a.z;
    const du=(u1-u0)*gx+(u2-u0)*hx,dv=(v1-v0)*gx+(v2-v0)*hx;
    const footprintU=Math.hypot(du,(u1-u0)*gy+(u2-u0)*hy);
    const footprintV=Math.hypot(dv,(v1-v0)*gy+(v2-v0)*hy);
    const dz=zu*gx+zv*hx,ds=(shade1-shade0)*gx+(shade2-shade0)*hx;
    const edges=[[a,b],[b,c],[c,a]].filter(([p,q])=>Math.abs(p.y-q.y)>.0001)
        .map(([p,q])=>({min:Math.min(p.y,q.y),max:Math.max(p.y,q.y),x:p.x,y:p.y,m:(q.x-p.x)/(q.y-p.y)}));
    const from=Math.max(0,Math.ceil(Math.min(a.y,b.y,c.y)-.5));
    const to=Math.min(height-1,Math.floor(Math.max(a.y,b.y,c.y)-.5));
    for(let y=from;y<=to;y++){
        const fy=y+.5;
        let lo=Infinity,hi=-Infinity;
        for(const e of edges){
            if(fy<e.min||fy>e.max)continue;
            const x=e.x+(fy-e.y)*e.m;
            lo=Math.min(lo,x);hi=Math.max(hi,x);
        }
        const start=Math.max(0,Math.ceil(lo-.5)),end=Math.min(width-1,Math.floor(hi-.5));
        if(start>end)continue;
        const x0=start+.5-a.x,y0=fy-a.y;
        const s=gx*x0+gy*y0,t=hx*x0+hy*y0;
        let u=u0+(u1-u0)*s+(u2-u0)*t,v=v0+(v1-v0)*s+(v2-v0)*t;
        let z=a.z+zu*s+zv*t,shade=shade0+(shade1-shade0)*s+(shade2-shade0)*t;
        let i=y*width+start;
        for(let x=start;x<=end;x++,i++,u+=du,v+=dv,z+=dz,shade+=ds){
            if(z<=depth[i]||z<mask[i]-.4)continue;
            depth[i]=z;
            let value=235;
            if(inkWeight>0){
                let texU=u,texV=v,filterU=footprintU,filterV=footprintV;
                if(patch){
                    let s=(u-patch.u)/patch.du,t=(v-patch.v)/patch.dv;
                    let bx=0,by=0,dx=0,dy=0,jac=0;
                    const px=x+.5-patch.x,py=fy-patch.y;
                    for(let pass=0;pass<3;pass++){
                        bx=patch.bx+t*patch.qx;by=patch.by+t*patch.qy;
                        dx=patch.dx+s*patch.qx;dy=patch.dy+s*patch.qy;
                        jac=bx*dy-by*dx;
                        if(Math.abs(jac)<.08)break;
                        const rx=px-(patch.bx*s+dx*t),ry=py-(patch.by*s+dy*t);
                        if(rx*rx+ry*ry<.0025)break;
                        s+=(dy*rx-dx*ry)/jac;
                        t+=(bx*ry-by*rx)/jac;
                    }
                    if(s>=-.025&&s<=1.025&&t>=-.025&&t<=1.025&&Math.abs(jac)>=.08){
                        texU=patch.u+patch.du*clamp(s,0,1);
                        texV=patch.v+patch.dv*clamp(t,0,1);
                        filterU=Math.abs(patch.du/jac)*Math.hypot(dx,dy);
                        filterV=Math.abs(patch.dv/jac)*Math.hypot(bx,by);
                    }
                }
                const next=nextInk&&texV<TILE_PAD;
                value+=(sampleInk(next?nextInk:ink,texU,texV+(next?TILE:0),filterU,filterV)-value)*inkWeight;
            }
            const light=1-shade*(1.26-.26*inkWeight);
            const j=i*4;
            pixels[j]=value*light;pixels[j+1]=(value-3)*light;
            pixels[j+2]=(value-10)*light;pixels[j+3]=255;
        }
    }
}

function project(points,slot,frame){
    return points.map(p=>({
        x:frame.left+(slot.x+p.x)*frame.scale,
        y:frame.top+(slot.y+p.y+SLOPE*p.z)*frame.scale,
        z:p.z-SLOPE*p.y
    }));
}

function lighting(rows,i){
    const row=rows[i],before=rows[Math.max(0,i-1)][1],after=rows[Math.min(rows.length-1,i+1)][1];
    const wx=row[2].x-row[0].x,wy=row[2].y-row[0].y,wz=row[2].z-row[0].z;
    const tx=after.x-before.x,ty=after.y-before.y,tz=after.z-before.z;
    const nx=wy*tz-wz*ty,ny=wz*tx-wx*tz,nz=wx*ty-wy*tx;
    const length=Math.hypot(nx,ny,nz);
    if(length<1e-6)return .07;
    const light=Math.abs((-.35*nx-.63*ny+.69*nz)/length);
    return .027+.117*(1-clamp(light,0,1));
}

function drawPaper(frame,state,ink,texture){
    const rows=[...state.rows,mouth(state)];
    const surfaces=[...paperSurface(state),rows.at(-1).points];
    const projected=surfaces.map(points=>project(points,state.layout.slot,frame));
    const shades=surfaces.map((_,i)=>lighting(surfaces,i));
    const inkScale=INK_WIDTH/state.band;
    for(let i=1;i<rows.length;i++){
        const lower=rows[i-1].at*inkScale,upper=rows[i].at*inkScale;
        if(upper-lower<.001)continue;
        const a=projected[i-1],b=projected[i];
        const oldShade=shades[i-1],newShade=shades[i];
        const tile=Math.floor(lower/TILE)+1;
        const image=texture(tile,inkScale,ink);
        const next=upper>tile*TILE?texture(tile+1,inkScale,ink):null;
        const v0=tile*TILE-upper+TILE_PAD,v1=tile*TILE-lower+TILE_PAD;
        // Keep the face consistent across the two triangles on each
        // side of the centreline so the diagonal cannot cut a glyph.
        for(let j=0;j<2;j++){
            const acrossX=(b[j+1].x-b[j].x)+(a[j+1].x-a[j].x);
            const acrossY=(b[j+1].y-b[j].y)+(a[j+1].y-a[j].y);
            const alongX=(a[j].x-b[j].x)+(a[j+1].x-b[j+1].x);
            const alongY=(a[j].y-b[j].y)+(a[j+1].y-b[j+1].y);
            const acrossZ=(b[j+1].z-b[j].z+a[j+1].z-a[j].z)*frame.scale;
            const alongZ=(a[j].z-b[j].z+a[j+1].z-b[j+1].z)*frame.scale;
            const nx=acrossY*alongZ-acrossZ*alongY;
            const ny=acrossZ*alongX-acrossX*alongZ;
            const nz=acrossX*alongY-acrossY*alongX;
            const facing=clamp(nz/Math.max(.01,Math.hypot(nx,ny,nz))/.26,0,1);
            const inkWeight=facing*facing*(3-2*facing);
            const u0=j*INK_WIDTH*.5,u1=(j+1)*INK_WIDTH*.5;
            const patch=inkPatch(b[j],b[j+1],a[j+1],a[j],u0,v0,u1-u0,v1-v0);
            raster(frame,b[j],b[j+1],a[j],u0,v0,u1,v0,u0,v1,image,next,newShade,newShade,oldShade,inkWeight,patch);
            raster(frame,b[j+1],a[j+1],a[j],u1,v0,u1,v1,u0,v1,image,next,newShade,oldShade,oldShade,inkWeight,patch);
        }
    }
    return surfaces;
}

function drawPaperShadow(ctx,surfaces,pile,frame){
    const {band,layout:{slot}}=pile;
    const {left,top,scale,width}=frame;
    const offset=width+band*scale;
    const shadow=new Path2D();
    let previous=null,visible=false;
    for(const row of surfaces){
        const center=row[1];
        const centerFloor=floorLevel(pile,center.z);
        const gap=centerFloor-center.y;
        const section=gap<band*.67?row.filter((_,i)=>i!==1).map(p=>{
            const floor=floorLevel(pile,p.z);
            const distance=clamp(floor-p.y,0,band*.67);
            return [
                left+(slot.x+p.x+distance*.16)*scale-offset,
                top+(slot.y+floor+SLOPE*p.z+distance*.04+band*.012)*scale
            ];
        }):null;
        if(previous&&section){
            const polygon=[...previous,section[1],section[0]];
            const area=polygon.reduce((sum,[x,y],i)=>{
                const [nextX,nextY]=polygon[(i+1)%4];
                return sum+x*nextY-nextX*y;
            },0);
            if(area<0)polygon.reverse();
            shadow.moveTo(...polygon[0]);
            for(let i=1;i<4;i++)shadow.lineTo(...polygon[i]);
            shadow.closePath();
            visible=true;
        }
        previous=section;
    }
    if(!visible)return;
    ctx.save();
    ctx.fillStyle='#000';
    ctx.shadowOffsetX=offset;
    ctx.shadowBlur=band*scale*.095;
    ctx.shadowColor='#110e0a33';
    ctx.fill(shadow);
    ctx.restore();
}

function clearWhiteMatte(pixels,width,height){
    const count=width*height,distance=new Uint8Array(count),queue=new Int32Array(count);
    distance.fill(255);
    let head=0,end=0;
    const shade=i=>Math.min(pixels[i*4],pixels[i*4+1],pixels[i*4+2]);
    const visit=i=>{
        if(distance[i]===255&&shade(i)>=244){
            distance[i]=0;
            queue[end++]=i;
        }
    };
    for(let x=0;x<width;x++){visit(x);visit(count-width+x);}
    for(let y=1;y<height-1;y++){visit(y*width);visit(y*width+width-1);}
    const neighbors=(i,add)=>{
        if(i%width)add(i-1);
        if(i%width!==width-1)add(i+1);
        if(i>=width)add(i-width);
        if(i<count-width)add(i+width);
    };
    while(head<end)neighbors(queue[head++],visit);
    const backgroundEnd=end;
    head=0;
    while(head<end){
        const i=queue[head++],layer=distance[i]+1;
        if(layer>4)break;
        neighbors(i,next=>{
            if(distance[next]!==255)return;
            distance[next]=layer;
            queue[end++]=next;
        });
    }
    const original=new Uint8ClampedArray(pixels);
    for(let index=0;index<end;index++){
        const i=queue[index],at=i*4;
        if(index<backgroundEnd){pixels[at+3]=0;continue;}
        const white=shade(i);
        if(white<115)continue;
        const x=i%width,y=Math.floor(i/width);
        let reference=74,best=Infinity;
        for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){
            const xx=x+dx,yy=y+dy,score=dx*dx+dy*dy;
            if(xx<0||xx>=width||yy<0||yy>=height||score>=best)continue;
            const j=yy*width+xx;
            if(distance[j]!==255)continue;
            const tone=Math.min(original[j*4],original[j*4+1],original[j*4+2]);
            if(tone>145)continue;
            reference=tone;best=score;
        }
        const alpha=clamp((254-white)/(254-reference),0,1);
        pixels[at+3]=alpha*255;
        for(let c=0;c<3;c++)pixels[at+c]=alpha>0?(original[at+c]-254*(1-alpha))/alpha:0;
    }
}

function caseBaseContour(pixels,width,height){
    const edge=[];
    for(let x=0;x<width;x+=3){
        for(let y=height-1;y>=0;y--){
            if(pixels[(y*width+x)*4+3]<192)continue;
            edge.push([x/width,y/height]);
            break;
        }
    }
    return edge;
}

function drawCaseShadow(ctx,edge,x,y,size,scale){
    if(edge.length<2)return;
    const offscreen=ctx.canvas.width+size*scale;
    ctx.save();
    // Draw only the blurred shadow, using the case's actual lower edge.
    // The photographed silhouette differs slightly from its collision box.
    ctx.translate(x-offscreen/scale,y);
    ctx.shadowOffsetX=offscreen;
    ctx.fillStyle='#000';
    for(const {dx,dy,blur,depth,color} of [
        {dx:.018,dy:.020,blur:.074,depth:.031,color:'#110e0a32'},
        {dx:0,dy:.006,blur:.018,depth:.013,color:'#110e0a64'}
    ]){
        ctx.shadowOffsetX=offscreen+dx*size*scale;
        ctx.shadowOffsetY=dy*size*scale;
        ctx.shadowColor=color;
        ctx.shadowBlur=blur*size*scale;
        ctx.beginPath();
        ctx.moveTo(edge[0][0]*size,(edge[0][1]-depth)*size);
        for(const [u,v] of edge)ctx.lineTo(u*size,(v-depth)*size);
        for(let i=edge.length-1;i>=0;i--)ctx.lineTo(edge[i][0]*size,edge[i][1]*size);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function createFrame(width,height,state,photo,photoPixels,caseEdge){
    const crop=cropTop(state.width),viewHeight=HEIGHT-crop;
    const scale=Math.min(width/state.width,height/viewHeight)*(state.layout.phone?.98:.80);
    const left=(width-state.width*scale)/2,top=(height-viewHeight*scale)/2-crop*scale;
    const stage=document.createElement('canvas'),paper=document.createElement('canvas');
    stage.width=paper.width=width;stage.height=paper.height=height;
    const base=stage.getContext('2d'),paperCtx=paper.getContext('2d');
    const image=paperCtx.createImageData(width,height);
    const mask=new Float32Array(width*height);
    mask.fill(-Infinity);
    const {x,y,size,slot}=state.layout;
    const planes=casePlanes(size);
    const sourceWidth=photo.width,sourceHeight=photo.height;
    const startX=Math.max(0,Math.floor(left+x*scale)),endX=Math.min(width,Math.ceil(left+(x+size)*scale));
    const startY=Math.max(0,Math.floor(top+y*scale));
    const endY=Math.min(height,Math.ceil(top+(y+size)*scale));
    for(let py=startY;py<endY;py++){
        const sy=(py+.5-top)/scale,dy=sy-slot.y;
        for(let px=startX;px<endX;px++){
            const sx=(px+.5-left)/scale,ix=Math.floor((sx-x)*sourceWidth/size);
            const iy=Math.floor((sy-y)*sourceHeight/size);
            if(ix<0||ix>=sourceWidth||iy<0||iy>=sourceHeight||photoPixels[(iy*sourceWidth+ix)*4+3]<160)continue;
            const z=caseDepth(planes,sx-slot.x,dy,SLOPE);
            mask[py*width+px]=z*(1+SLOPE*SLOPE)-SLOPE*dy;
        }
    }
    base.setTransform(scale,0,0,scale,left,top);
    drawCaseShadow(base,caseEdge,x,y,size,scale);
    base.drawImage(photo,x,y,size,size);
    return {width,height,scale,left,top,depth:new Float32Array(width*height),mask,pixels:image.data,
        image,stage,paper,paperCtx,layout:state.layout};
}

export async function scene(canvas,slotScale){
    const ctx=canvas.getContext('2d');
    const photo=new Image();
    photo.src=new URL('./printer.webp',import.meta.url);
    await photo.decode();
    const printer=document.createElement('canvas');
    printer.width=photo.naturalWidth;printer.height=photo.naturalHeight;
    const printerCtx=printer.getContext('2d',{willReadFrequently:true});
    printerCtx.drawImage(photo,0,0);
    const data=printerCtx.getImageData(0,0,printer.width,printer.height);
    const source=new Uint8ClampedArray(data.data);
    const w=printer.width,h=printer.height;
    // Expand the slot along its long axis and blend the change into the
    // surrounding casing. The physical feed uses the same width factor.
    const widthInset=1-1/slotScale;
    for(let iy=Math.floor(h*.30);iy<h*.53;iy++){
        for(let ix=Math.floor(w*.28);ix<w*.60;ix++){
            const x=ix/w-.439,y=iy/h-.419;
            const across=Math.abs(x),along=Math.abs(y-x*.50);
            const blend=clamp((.159-across)/.036,0,1)*clamp((.038-along)/.024,0,1);
            if(!blend)continue;
            const bodyInset=(1-BODY_SCALE)*blend;
            const slotInset=x*widthInset*blend;
            const sx=Math.round(ix-(x*bodyInset+slotInset)*w);
            const sy=Math.round(iy-(y*bodyInset+slotInset*.50)*h);
            const from=(sy*w+sx)*4,to=(iy*w+ix)*4;
            for(let channel=0;channel<3;channel++)data.data[to+channel]=source[from+channel];
        }
    }
    clearWhiteMatte(data.data,w,h);
    // Reproject the three visible faces of the original photograph
    // through the same lower camera used by the receipt and depth mask.
    const projected=printerCtx.createImageData(w,h);
    const planes=casePlanes(1);
    for(let iy=0;iy<h;iy++){
        const y=(iy+.5)/h-.419;
        for(let ix=0;ix<w;ix++){
            const x=(ix+.5)/w-.439,z=caseDepth(planes,x,y,SLOPE);
            if(!Number.isFinite(z))continue;
            const sourcePoint=sourceCasePoint(x,y-SLOPE*z,z);
            const sourceX=(sourcePoint.x+.439)*w-.5;
            const sourceY=(sourcePoint.y+PHOTO_SLOPE*sourcePoint.z-PHOTO_TILT*sourcePoint.x+.419)*h-.5;
            if(sourceX<0||sourceX>=w-1||sourceY<0||sourceY>=h-1)continue;
            const row=Math.floor(sourceY),column=Math.floor(sourceX),mix=sourceY-row,side=sourceX-column;
            const from=(row*w+column)*4,to=(iy*w+ix)*4;
            // Interpolate premultiplied colour so transparent pixels
            // cannot reintroduce the white from the original photograph.
            const lower=from+w*4,rgba=data.data;
            const a0=rgba[from+3]*(1-side)*(1-mix),a1=rgba[from+7]*side*(1-mix);
            const a2=rgba[lower+3]*(1-side)*mix,a3=rgba[lower+7]*side*mix;
            const alpha=a0+a1+a2+a3;
            if(alpha<.5)continue;
            projected.data[to+3]=alpha;
            for(let c=0;c<3;c++){
                projected.data[to+c]=(rgba[from+c]*a0+rgba[from+4+c]*a1+
                    rgba[lower+c]*a2+rgba[lower+4+c]*a3)/alpha;
            }
        }
    }
    printerCtx.putImageData(projected,0,0);
    const caseEdge=caseBaseContour(projected.data,w,h);
    const texture=inkTiles();
    let frame;
    return (state,ink,measure=false)=>{
        const ratio=Math.min(1.55,devicePixelRatio||1,1580/Math.max(1,canvas.clientWidth));
        const width=Math.max(1,Math.round(canvas.clientWidth*ratio));
        const height=Math.max(1,Math.round(canvas.clientHeight*ratio));
        if(!frame||frame.width!==width||frame.height!==height||frame.layout!==state.layout){
            canvas.width=width;canvas.height=height;
            frame=createFrame(width,height,state,printer,projected.data,caseEdge);
        }
        frame.depth.fill(-Infinity);
        frame.pixels.fill(0);
        const surfaces=drawPaper(frame,state,ink,texture);
        frame.paperCtx.putImageData(frame.image,0,0);
        ctx.clearRect(0,0,width,height);
        drawPaperShadow(ctx,surfaces,state,frame);
        ctx.drawImage(frame.stage,0,0);
        ctx.drawImage(frame.paper,0,0);
        if(!measure)return 0;
        let visible=0,samples=0;
        const maxX=frame.left+state.width*frame.scale,maxY=frame.top+HEIGHT*frame.scale;
        const minY=frame.top+cropTop(state.width)*frame.scale;
        for(let y=Math.max(0,Math.floor(minY+4));y<maxY;y+=8){
            for(let x=Math.max(0,Math.floor(frame.left+4));x<maxX;x+=8){
                samples++;
                if(frame.pixels[(y*width+x)*4+3])visible++;
            }
        }
        return visible/Math.max(1,samples);
    };
}

import {unpackSurface} from './render-data.js?edition=27';
import {createActivityLoop} from '../activity.js?receipt=28';
import {createLoader} from '../assemblage/loader.js?edition=124';
import {makeEntry,random} from './lines.js?edition=8';
import {getEdition,CHECK_INTERVAL} from './news.js?edition=8';
import {scene,INK_WIDTH,lineCapacity,layoutInk} from './scene.js?edition=28';
import {createPile,stepPile,HEIGHT,VIEW_HEIGHT,cropTop} from './pile.js?edition=28';

document.title='Till Further Notice — Tyrone Moreno';
document.documentElement.style.background='transparent';
document.body.style.background='transparent';
const loading=createLoader();
loading.style.zIndex='2';
document.body.append(loading);
const canvas=document.createElement('canvas');
canvas.setAttribute('role','img');
canvas.setAttribute('aria-label','Till Further Notice. A receipt printer feeds paper into a growing pile.');
document.body.prepend(canvas);
const aspect=canvas.clientHeight ? canvas.clientWidth/canvas.clientHeight : 75/32;
const ratio=Math.max(.775,aspect);
const viewHeight=HEIGHT-cropTop(Math.round(VIEW_HEIGHT*ratio));
const width=Math.round(viewHeight*ratio);
const phone=width<=520||Math.min(screen.width,screen.height)<=600;
const seed=crypto.getRandomValues(new Uint32Array(1))[0];
const PRINT_SECONDS=50;
let pile=createPile(seed,width,phone,true);
const initialNews=getEdition();
const paint=await scene(canvas,pile.layout.slotScale);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,index=0,subtotal=0,saleItems=0,saleSize=9,edition=null;
let ink=[],inkEnd=0,recent=[],nextNewsAt=Date.now()+CHECK_INTERVAL,nextContextAt=0,nextLabelAt=0,context={};
function applyEdition(value){
    edition=value;
    nextNewsAt=value.expiry;
}
initialNews.then(applyEdition);
const localClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'numeric',hourCycle:'h23',
    weekday:'short',month:'numeric'});
const date=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Europe/London'});
function refreshContext(){
    const parts=Object.fromEntries(localClock.formatToParts(new Date()).map(p=>[p.type,p.value]));
    context={hour:Number(parts.hour),month:Number(parts.month),
        weekday:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday)};
}
function wrap(text,first,rest){
    const words=text.split(/\s+/);
    const lines=[];
    let line='',limit=first;
    for(let word of words){
        if(line&&line.length+word.length+1>limit){
            lines.push(line);
            line='';
            limit=rest;
        }
        while(word.length>limit){
            lines.push(word.slice(0,limit));
            word=word.slice(limit);
            limit=rest;
        }
        if(word)line+=(line?' ':'')+word;
    }
    if(line)lines.push(line);
    return lines;
}
function write(row){
    const lines=row.lines.flatMap(line=>{
        if(line.kind==='barcode')return [line];
        const parts=wrap(line.text,Math.max(1,lineCapacity(line,true)),lineCapacity(line));
        return parts.map((text,i)=>i===0?{...line,text}:{kind:line.kind==='price'||line.kind==='total'?'continuation':line.kind,text});
    });
    const layout=layoutInk(lines);
    const entry={...row,lines,baselines:layout.baselines,height:Math.max(row.height,layout.height)};
    ink=[...ink,{at:inkEnd,row:entry}];
    inkEnd+=entry.height*pile.band/INK_WIDTH;
}
function ensureInk(){
    while(inkEnd<pile.head+pile.band*.46){
        const closeSale=saleItems>=saleSize;
        const row=makeEntry(++index,pile.seed,edition,subtotal,recent,{...context,layer:pile.layer,closeSale});
        write(row);
        subtotal=row.subtotal;
        if(closeSale){
            saleItems=0;
            saleSize=7+Math.floor(random((pile.seed+index)|0)()*8);
        }else{
            saleItems++;
            recent=[row.storyKey??row.title,...recent].slice(0,12);
        }
        if(time>=nextLabelAt&&row.title){
            const item=row.lines[0];
            canvas.setAttribute('aria-label','Till Further Notice. Latest purchase: '+item.text+' '+item.value);
            nextLabelAt=time+1.5;
        }
    }
}
refreshContext();
write({height:104,lines:[
    {kind:'heading',text:'TILL FURTHER NOTICE'},
    {kind:'note',text:date.format(new Date())+'   CASH RECEIPT'},
    {kind:'rule',text:'----------------------------------------'}
]});
ensureInk();
// Start with a short leader already in the roller.
stepPile(pile,.52,pile.band*1.05);
ensureInk();

let geometry=null,worker=null,checkpoint=pile,inFlight=false;
const surface=[];
let renderer=null,renderReady=false,renderBusy=false,renderDisabled=false;
let renderInk=null,renderLayout=null;
let pending=0,workerSpeed=0,dirty=true,finished=false,settledAt=null,generation=0;
const drawnRows=[];
let snapshotPromise=null,resolveSnapshot=null;
function advanceWorker(){
    if(!worker||inFlight||finished||!activity.running||pending<1/120)return;
    const chunk=Math.min(pending,pile.stepWindow??.045);
    inFlight=true;
    pending-=chunk;
    worker.postMessage({type:'step',dt:chunk,speed:workerSpeed,stopFeed:time>=PRINT_SECONDS});
}
function receiveFrame({points,state,checkpoint:stateCheckpoint,generation:responseGeneration}){
    if(responseGeneration!==generation)return;
    inFlight=false;
    if(stateCheckpoint)checkpoint=stateCheckpoint;
    geometry=points;
    const count=points.length/9;
    drawnRows.length=Math.min(drawnRows.length,count);
    for(let i=drawnRows.length;i<count;i++)drawnRows.push({at:i*pile.spacing});
    pile={...pile,...state,rows:drawnRows};
    finished=state.ended;
    dirty=true;
    ensureInk();
    advanceWorker();
}
function startWorker(){
    try{
        worker=new Worker(new URL('./simulation.js?edition=28',import.meta.url),{type:'module'});
    }catch{return;}
    worker.onmessage=({data})=>{
        if(data.type==='frame')receiveFrame(data);
        if(data.type==='snapshot'){
            checkpoint=data.pile;
            resolveSnapshot?.(snapshot(checkpoint));
            snapshotPromise=resolveSnapshot=null;
        }
    };
    worker.onerror=()=>{
        worker.terminate();
        worker=null;
        pile=checkpoint;
        geometry=null;dirty=true;inFlight=false;pending=0;
        finished=false;settledAt=null;
        resolveSnapshot?.(snapshot(checkpoint));
        snapshotPromise=resolveSnapshot=null;
    };
    inFlight=true;
    worker.postMessage({type:'reset',pile,generation:++generation});
}
function update(dt,visibleElapsed){
    if(finished)return;
    time=Math.min(PRINT_SECONDS,time+visibleElapsed);
    if(time>=nextContextAt){
        refreshContext();
        nextContextAt=time+60;
    }
    const now=Date.now();
    if(now>=nextNewsAt&&time<PRINT_SECONDS){
        nextNewsAt=now+CHECK_INTERVAL;
        getEdition().then(applyEdition);
    }
    // Feed at a steady rate with short thermal-head slowdowns between batches.
    const phase=time%3.8;
    const speed=pile.band*.80*(.61+.18*Math.min(1,Math.abs(phase-3.53)/.16));
    if(worker){
        workerSpeed=speed;
        pending=Math.min(.09,pending+dt);
        advanceWorker();
        return;
    }
    const count=pile.rows.length;
    const passes=count>850?8:count>420?10:13;
    if(time>=PRINT_SECONDS)pile.full=true;
    stepPile(pile,dt,speed,passes,count>1150?1/60:count>650?1/90:undefined);
    ensureInk();
    dirty=true;
    if(pile.full){
        settledAt??=pile.clock;
        finished=pile.clock-settledAt>=3;
    }
}
function startRenderWorker(){
    if(renderDisabled||renderer||typeof OffscreenCanvas!=='function'||typeof createImageBitmap!=='function')return;
    function fallback(){
        renderer?.terminate();
        renderer=null;renderReady=false;renderBusy=false;renderDisabled=true;dirty=true;
        draw();
    }
    try{
        renderer=new Worker(new URL('./render-worker.js?edition=28',import.meta.url),{type:'module'});
        renderer.onerror=fallback;
        renderer.onmessage=({data})=>{
            if(data.type==='error'){fallback();return;}
            if(data.type==='ready'){
                renderReady=true;dirty=true;
                draw();
                return;
            }
            renderBusy=false;
            const {bitmap}=data;
            if(data.generation===generation&&geometry){
                if(canvas.width!==bitmap.width)canvas.width=bitmap.width;
                if(canvas.height!==bitmap.height)canvas.height=bitmap.height;
                const ctx=canvas.getContext('2d');
                ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.drawImage(bitmap,0,0);
                canvas.dataset.renderer='worker';
            }
            bitmap.close();
            if(dirty)draw();
        };
        renderer.postMessage({type:'init',slotScale:pile.layout.slotScale});
    }catch{fallback();}
}
let lastWidth=0,lastHeight=0;
function draw(){
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(!dirty&&width===lastWidth&&height===lastHeight)return;
    if(geometry&&pile.rows.length>=120)startRenderWorker();
    if(geometry&&renderReady){
        if(renderBusy){dirty=true;return;}
        const points=geometry.slice();
        renderer.postMessage({
            type:'draw',points,generation,width:pile.width,band:pile.band,spacing:pile.spacing,head:pile.head,
            layout:renderLayout!==pile.layout?pile.layout:undefined,
            ink:renderInk!==ink?ink:undefined,
            viewport:{width,height,ratio:devicePixelRatio||1}
        },[points.buffer]);
        renderLayout=pile.layout;renderInk=ink;renderBusy=true;
    }else{
        paint(pile,ink,geometry?unpackSurface(geometry,surface):null);
        canvas.dataset.renderer='main';
    }
    lastWidth=width;lastHeight=height;dirty=false;
    if(finished)activity.setLost(true);
}
function snapshot(state=pile){
    return {pile:state,time,index,subtotal,saleItems,saleSize,edition,ink,inkEnd,recent,nextNewsAt};
}
startWorker();
const activity=createActivityLoop({fps:()=>reduce.matches?18:40,update,draw});
new ResizeObserver(()=>{if(finished)draw();}).observe(canvas);
window.livingArtwork={
    backend:'canvas-receipt',
    snapshot:()=>snapshot(worker?checkpoint:pile),
    snapshotAsync(){
        if(!worker)return Promise.resolve(snapshot());
        if(!snapshotPromise){
            snapshotPromise=new Promise(resolve=>{resolveSnapshot=resolve;});
            worker.postMessage({type:'snapshot'});
        }
        return snapshotPromise;
    },
    restore(state){
        if(!Number.isFinite(state.pile?.revision))return;
        ({pile,time,index,subtotal,saleItems,saleSize,edition,ink,inkEnd,recent,nextNewsAt}=state);
        checkpoint=pile;
        if(!edition)nextNewsAt=0;
        activity.setLost(false);
        geometry=null;dirty=true;pending=0;finished=false;settledAt=null;drawnRows.length=0;
        if(worker){
            inFlight=true;
            worker.postMessage({type:'reset',pile,generation:++generation});
        }
        draw();
    }
};
draw();
loading.remove();
document.documentElement.dataset.artworkReady='true';
if(parent!==window)parent.postMessage({type:'living-ready'},location.origin);

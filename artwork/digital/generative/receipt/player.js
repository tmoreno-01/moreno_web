import {createActivityLoop} from '../activity.js';
import {createLoader} from '../assemblage/loader.js?edition=124';
import {makeEntry,random} from './lines.js?edition=8';
import {getEdition,CHECK_INTERVAL} from './news.js?edition=8';
import {scene,INK_WIDTH,lineCapacity,layoutInk} from './scene.js?edition=20';
import {createPile,stepPile,HEIGHT,VIEW_HEIGHT,cropTop} from './pile.js?edition=20';

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
let pile=createPile(seed,width,phone);
const initialNews=getEdition();
const [paint,firstEdition]=await Promise.all([
    scene(canvas,pile.layout.slotScale),
    Promise.race([initialNews,new Promise(resolve=>setTimeout(()=>resolve(null),850))])
]);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,index=0,subtotal=0,saleItems=0,saleSize=9,edition=firstEdition;
let ink=[],inkEnd=0,recent=[],nextNewsAt=firstEdition?.expiry??Date.now()+CHECK_INTERVAL,nextContextAt=0,nextLabelAt=0,context={};
function applyEdition(value){
    edition=value;
    nextNewsAt=value.expiry;
}
if(!firstEdition)initialNews.then(applyEdition);
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

function update(dt){
    const elapsed=dt*(reduce.matches ? .35 : 1);
    time+=elapsed;
    if(time>=nextContextAt){
        refreshContext();
        nextContextAt=time+60;
    }
    const now=Date.now();
    if(now>=nextNewsAt&&!pile.full){
        nextNewsAt=now+CHECK_INTERVAL;
        getEdition().then(applyEdition);
    }
    // Feed at a steady rate with short thermal-head slowdowns between batches.
    const phase=time%3.8;
    const speed=pile.band*.80*(.61+.18*Math.min(1,Math.abs(phase-3.53)/.16));
    stepPile(pile,elapsed,speed);
    ensureInk();
    const first=pile.rows[0]?.at??0;
    if(ink.length>12&&ink[1].at<first-2){
        ink=ink.filter(entry=>entry.at+entry.row.height*pile.band/INK_WIDTH>=first-2);
    }
}
let nextFillAt=0;
function draw(){
    const measure=!pile.full&&time>=nextFillAt&&pile.rows.length>=270;
    const coverage=paint(pile,ink,measure);
    if(measure){
        nextFillAt=time+1;
        if(coverage>=.90)pile.full=true;
    }
}
createActivityLoop({fps:()=>reduce.matches?18:40,update,draw});
window.livingArtwork={
    backend:'canvas-receipt',
    snapshot:()=>({pile,time,index,subtotal,saleItems,saleSize,edition,ink,inkEnd,recent,nextNewsAt}),
    restore(state){
        if(!Number.isFinite(state.pile?.revision))return;
        ({pile,time,index,subtotal,saleItems,saleSize,edition,ink,inkEnd,recent,nextNewsAt}=state);
        if(!edition)nextNewsAt=0;
        draw();
    }
};
draw();
loading.remove();
document.documentElement.dataset.artworkReady='true';
if(parent!==window)parent.postMessage({type:'living-ready'},location.origin);

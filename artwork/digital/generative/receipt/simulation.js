import {STEP,stepPile,paperSurface} from './pile.js?edition=28';

const DENSE_STEP=1/75,HEAVY_STEP=1/60;

let pile;
let settledAt;
let checkpointAt=0;
let generation=0;
let load=0,passes=13,step=STEP,stepWindow=.045;

function sendFrame(checkpoint=false){
    const surface=paperSurface(pile);
    const points=new Float32Array(surface.length*9);
    let cursor=0;
    for(const row of surface){
        for(const {x,y,z} of row){
            points[cursor++]=x;points[cursor++]=y;points[cursor++]=z;
        }
    }
    const {head,layer,full,clock}=pile;
    const state={head,layer,full,clock,stepWindow,ended:full&&clock-settledAt>=3};
    const save=checkpoint||clock>=checkpointAt;
    if(save)checkpointAt=clock+8;
    postMessage({type:'frame',points,state,generation,checkpoint:save?pile:undefined},[points.buffer]);
}

self.onmessage=({data})=>{
    switch(data.type){
    case 'reset':
        pile=data.pile;
        generation=data.generation;
        settledAt=pile.full?pile.clock:undefined;
        checkpointAt=0;
        load=0;passes=13;step=STEP;stepWindow=.045;
        sendFrame(true);
        break;
    case 'step': {
        const start=performance.now();
        if(data.stopFeed)pile.full=true;
        stepPile(pile,data.dt,data.speed,passes,step);
        if(pile.full&&settledAt===undefined)settledAt=pile.clock;
        sendFrame();
        const elapsed=performance.now()-start;
        const cost=elapsed/(data.dt*1000);
        const budget=Math.min(.045,Math.max(step,data.dt*25/Math.max(25,elapsed)));
        stepWindow+=(budget-stepWindow)*.27;
        if(elapsed<16)stepWindow=Math.min(.045,stepWindow+.002);
        load+=(cost-load)*.08;
        if(pile.rows.length>850&&load>1.38)passes=8;
        else if((passes===13&&pile.rows.length>420&&load>.72)||(passes===8&&load<1.08))passes=10;
        if(load<.42)passes=13;
        if(passes===8&&pile.rows.length>1150&&(load>2.05||(step===HEAVY_STEP&&load>1.48)))step=HEAVY_STEP;
        else if(pile.rows.length>1150&&(load>1.60||(step>=DENSE_STEP&&load>1.25)))step=DENSE_STEP;
        else if(pile.rows.length>600&&(load>1.02||(step!==STEP&&load>.66)))step=1/90;
        else step=STEP;
        break;
    }
    case 'snapshot':
        postMessage({type:'snapshot',pile});
        break;
    }
};

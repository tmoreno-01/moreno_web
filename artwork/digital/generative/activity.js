// A paused artwork has no scheduled animation frame and advances no simulation time.
export function createActivityLoop({update,draw,fps=30,embedded=window.parent!==window}){
 let active=!embedded,frame=0,previous=0,last=0,lost=false;
 function running(){return active&&!document.hidden&&!lost;}
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;previous=0;last=0;}
 function tick(now){frame=0;if(!running())return;
  const rate=typeof fps==='function'?fps():fps,interval=1000/rate;
  if(!last||now+.2-last>=interval){const dt=previous?Math.min(.08,(now-previous)/1000):0;previous=now;if(last)last+=Math.max(1,Math.floor((now-last+.2)/interval))*interval;else last=now;update(dt);draw();}
  frame=requestAnimationFrame(tick);
 }
 function sync(){if(!running())stop();else if(!frame)frame=requestAnimationFrame(tick);}
 const message=e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='living-active'){active=!!e.data.value;sync();}};
 addEventListener('message',message);document.addEventListener('visibilitychange',sync);
 addEventListener('pagehide',stop);addEventListener('pageshow',sync);sync();
 return {setLost(value){lost=value;sync();},stop, get running(){return running();}};
}

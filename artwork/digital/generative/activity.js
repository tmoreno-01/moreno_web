// A paused artwork has no scheduled animation frame and advances no simulation time.
export function createActivityLoop({update,draw,fps=30,embedded=window.parent!==window}){
 let active=!embedded,frame=0,previous=null,slot=null,lost=false,offset=0;
 function running(){return active&&!document.hidden&&!lost;}
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;previous=null;slot=null;}
 function tick(now){
  frame=0;
  if(!running())return;
  const rate=typeof fps==='function'?fps():fps,interval=1000/rate;
  const next=Math.floor((now-offset+.9)/interval);
  if(next!==slot){
   const dt=previous===null?0:Math.min(.08,(now-previous)/1000);
   previous=now;slot=next;
   update(dt);draw();
  }
  if(running()&&!frame)frame=requestAnimationFrame(tick);
 }
 function sync(){if(!running())stop();else if(!frame)frame=requestAnimationFrame(tick);}
 function message(event){
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='living-active')return;
  active=!!event.data.value;
  const phase=event.data.phase;
  if(Number.isFinite(phase)&&phase!==offset){offset=phase;slot=null;}
  sync();
 }
 addEventListener('message',message);document.addEventListener('visibilitychange',sync);
 addEventListener('pagehide',stop);addEventListener('pageshow',sync);sync();
 return {setLost(value){lost=value;sync();},stop,get running(){return running();}};
}

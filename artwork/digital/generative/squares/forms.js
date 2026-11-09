const square=[{x:-1,y:-1},{x:1,y:-1},{x:1,y:1},{x:-1,y:1}];
export function updateForm(s,dt){if(s.formKind===undefined){s.formKind=0;s.redraw=1;s.redrawSpeed=1;s.nextForm=Infinity;}s.redraw=Math.min(1,s.redraw+dt*s.redrawSpeed);s.outline=s.collisionOutline=square;s.areaFactor=s.formKind===1?Math.PI*1.12*1.12/4:1;s.inertiaFactor=s.formKind===1?.5*1.12*1.12:2/3;}

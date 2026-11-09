export function createLoader(){
 const status=document.createElement('div');status.setAttribute('role','status');status.setAttribute('aria-label','Loading artwork');
 let foreground='#d8e2df',background='#071214';try{const theme=getComputedStyle(parent.document.documentElement);foreground=theme.getPropertyValue('--text-color').trim()||foreground;background=theme.getPropertyValue('--bg-color').trim()||background;}catch{}
 status.style.cssText=`position:absolute;inset:0;display:grid;place-content:center;color:${foreground};background:${background};font:14px/1.7 Arial,sans-serif;text-align:center;padding:10%`;
 status.innerHTML='<div class="loader-bar-container" aria-hidden="true"><div class="loader-bar"></div></div>';
 const style=document.createElement('style');style.textContent='.loader-bar-container{width:140px;height:2px;background:rgba(128,128,128,.25);border-radius:2px;overflow:hidden;position:relative}.loader-bar{position:absolute;top:0;left:0;height:100%;width:40%;background:currentColor;border-radius:2px;animation:lb-loader-sweep 1s ease-in-out infinite}@keyframes lb-loader-sweep{0%{left:-40%}100%{left:100%}}';document.head.append(style);return status;
}

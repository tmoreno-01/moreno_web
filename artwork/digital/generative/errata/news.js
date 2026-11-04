// News is a small vocabulary influence. No article text or executable HTML is rendered.
const KEY='errata-news-v1';
export const londonDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const stop=new Set('about after again against almost also among another around back been before being between both breaking could daily down during each first from have here into just last latest live more most much news next only other over says said some than that their them then there these they this those through today under very video want were what when where which while will with would year years your update updates report reports'.split(' '));
export function extractWords(stories){const counts=new Map();for(const story of stories){const plain=String(story).replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').toLowerCase();for(const word of plain.match(/[a-z]{4,16}/g)||[]){if(!stop.has(word))counts.set(word,(counts.get(word)||0)+1);}}return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,180).map(([word])=>word);}
async function json(url){const response=await fetch(url,{signal:AbortSignal.timeout(9000),credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('News unavailable');return response.json();}
export async function refreshNews(onWords){
 const day=londonDay();let cached;
 try{cached=JSON.parse(localStorage.getItem(KEY));}catch{}
 if(cached?.day===day&&Array.isArray(cached.words)){onWords(cached.words,day,'cached');if(Date.now()-cached.fetched<1800000)return;}
 try{
  // Wikimedia's editorial current-events feed is public and needs no visitor account.
  const data=await json('https://en.wikipedia.org/api/rest_v1/feed/featured/'+day.replaceAll('-','/'));
  const stories=(data.news||[]).map(item=>item.story||'');
  const words=extractWords(stories);if(words.length<8)throw Error('No current stories');
  const result={day,words,fetched:Date.now(),source:'Wikimedia current events'};
  try{localStorage.setItem(KEY,JSON.stringify(result));}catch{}
  onWords(words,day,'live');
 }catch{
  // A failure never labels old words as today's headlines.
  if(cached?.day!==day)onWords([],day,'unavailable');
 }
}

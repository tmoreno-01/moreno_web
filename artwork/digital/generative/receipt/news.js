const cacheKey='till-further-notice-wire-v7';
const dateFormat=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'});
const shortDate=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',timeZone:'Europe/London'});

const topics=[
    ['data','DATA CENTRES',/\bdata cent(?:re|er)s?\b/i],
    ['ai','AI OVERSIGHT',/\b(?:artificial intelligence|AI safeguards|AI models?|ChatGPT|AI companies)\b/i],
    ['gold','GOLD RESERVES',/\b(?:gold reserve|gold bullion|wholesale gold)\b/i],
    ['finance','MARKETS',/\b(?:inflation|interest rates?|stock market|central bank|budget deficit|tariffs?|exchange rate)\b/i],
    ['power','ELECTRICITY',/\b(?:electricity|power grid|renewable energy|energy prices?)\b/i],
    ['climate','ENVIRONMENT',/\b(?:emissions|carbon dioxide|climate change|environmental regulations?)\b/i],
    ['space','SPACE PROGRAMME',/\b(?:spacecraft|satellites?|NASA|SpaceX|lunar|orbit)\b/i],
    ['sport','SPORT',/\b(?:football|rugby|cricket|Olympics?|World Cup|tournament)\b/i],
    ['travel','TRANSPORT',/\b(?:trains?|railway|aviation|airport|airline|flight delays?)\b/i],
    ['work','WORK & PAY',/\b(?:strike action|labou?r unions?|minimum wage|pay rises?|unemployment)\b/i],
    ['politics','GOVERNMENT',/\b(?:elections?|prime minister|parliament|cabinet|referendum|summit|vice president)\b/i],
    ['food','FOOD',/\b(?:food prices?|harvests?|supermarkets?|food supply|food safety|agriculture)\b/i],
    ['culture','CULTURE',/\b(?:museums?|film festivals?|exhibitions?|galleries|book prizes?|public art)\b/i],
    ['science','SCIENCE',/\b(?:researchers?|laborator(?:y|ies)|new species|scientific study|research team)\b/i],
    ['shipping','SHIPPING',/\b(?:shipping|cargo ships?|container ships?|freight|logistics)\b/i],
    ['court','REGULATION',/\b(?:court rules|supreme court|legislation|regulations?|licensing|judicial)\b/i],
    ['culture','MUSIC AND BOOKS',/\b(?:orchestra|novel|musician|publishing|literature|records?)\b/i],
    ['food','FARMING AND MARKETS',/\b(?:livestock|crops?|fishery|coffee|cocoa|grain|tea)\b/i],
    ['science','NATURAL HISTORY',/\b(?:archaeolog\w*|fossils?|wildlife|conservation|ecosystems?)\b/i]
];
const sensitive=/\b(?:killed|deaths?|dies|fatal|victims?|abuse|murder|rape|shooting|terroris\w*|missiles?|hostages?|war|bombing|injur\w*|accus\w*|allegations?|abortion|children|sexua\w*|LGBTQ|refugees?)\b/i;

function today(now) {
    const parts=Object.fromEntries(dateFormat.formatToParts(now).map(p=>[p.type,p.value]));
    return {key:dateFormat.format(now),title:`Portal:Current events/${parts.year} ${parts.month} ${parts.day}`};
}
async function fetchDay(now) {
    const {title}=today(now);
    const params=new URLSearchParams({action:'parse',page:title,prop:'text',format:'json',formatversion:'2',origin:'*',
        maxage:'300',smaxage:'300'});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5500);
    try {
        const response=await fetch('https://en.wikipedia.org/w/api.php?'+params,{credentials:'omit',signal:controller.signal});
        if(!response.ok)return [];
        const data=await response.json();
        if(typeof data.parse?.text!=='string')return [];
        const doc=new DOMParser().parseFromString(data.parse.text,'text/html');
        const items=[...doc.querySelectorAll('.current-events-content li')]
            .filter(li=>!li.querySelector('li')&&li.querySelector('a.external'));
        const day=shortDate.format(now).toUpperCase();
        const stories=[];
        for(const item of items){
            const copy=item.cloneNode(true);
            for(const node of copy.querySelectorAll('a.external,sup,.mw-cite-backlink'))node.remove();
            const text=copy.textContent.replace(/\s+/g,' ').replace(/\s*\(\s*\)\s*/g,' ').trim();
            if(text.length<32||sensitive.test(text))continue;
            const labels=[...new Set([...item.querySelectorAll('a:not(.external)')]
                .map(a=>a.textContent.trim()).filter(label=>label.length>=4&&label.length<=34&&
                    /^[\p{L}][\p{L}\p{N} &’'–-]+$/u.test(label)&&!sensitive.test(label)))];
            const label=labels.find(label=>!/^20\d\d\b|^(?:[A-Z][a-z]+day|United States|United Kingdom)$/i.test(label))
                ?? labels[0]??null;
            const category=topics.find(([, ,pattern])=>pattern.test(text))?.[0]??'general';
            stories.push({text,label,labels,category,day});
        }
        return stories;
    } finally {
        clearTimeout(timeout);
    }
}
let pending=null;
export function getEdition() {
    if(pending)return pending;
    pending=loadEdition().finally(()=>{pending=null;});
    return pending;
}
export const CHECK_INTERVAL=10*60*1000;

async function loadEdition() {
    const now=new Date(),{key}=today(now);
    let cached;
    try {
        cached=JSON.parse(localStorage.getItem(cacheKey));
        if(cached?.key===key&&cached.expiry>Date.now()&&Array.isArray(cached.stories)&&cached.stories.every(story=>Array.isArray(story.labels)))return cached;
    } catch {}
    const days=await Promise.all([0,1,2].map(daysAgo=>
        fetchDay(new Date(now.getTime()-daysAgo*86400000)).catch(()=>[])));
    const stories=[...new Map(days.flatMap((items,age)=>items.map(story=>({...story,age})))
        .reverse().map(story=>[story.text.toLowerCase(),story])).values()].reverse();
    const stamp=Date.now();
    const edition=stories.length
        ? {key,stories,expiry:stamp+CHECK_INTERVAL,received:stamp}
        : {key,stories:stamp-(cached?.received??0)<86400000?cached.stories:[],expiry:stamp+120000,received:cached?.received??0};
    try { localStorage.setItem(cacheKey,JSON.stringify(edition)); } catch {}
    return edition;
}

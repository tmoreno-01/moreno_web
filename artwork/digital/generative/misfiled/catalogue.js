import {BOOK_COUNT,hash,random} from './world.js?141';

// Drawn from the gallery's recurring objects, titles, materials and asides.
const objects=[
  'Telephone Box','Lighthouse','Meal Ticket','Plywood','Charcoal Dog','Dairy Pirate',
  'Seven Hearts','Mayonnaise','Peanut Butter','Midsummer','Splinter','Crossing',
  'Blood Bank','Indian Ink','Old Chest','Roof','Zennor','Day Off','Next Week','Oil Stick',
  'Mum’s Flowers','Green Grass','The Mist','False Spring','Red Pencil','Paper Ghost',
];
const forms=['Instructions for','Notes from','A Small Theory of','Index of','The Gospel of',
  'An Apology to','Lost Property of','Lessons in','An Inventory of','The Last','Catalogue of'];
const endings=['After Closing','in the Mist','on Wood','Before Dawn','with No Address','for Kenneth',
  'without a Door','Against All Odds','in the Wrong Light','from Memory','for Next Week',
  'under the Roof','in Full Fat','Out of Order','in Two Parts','for Nobody','Backwards'];
const oddities=['The Dog Before Dawn','Mayonnaise Futures','Kenneth at Low Tide','Borrowed Light',
  'Peanut Butter Luck','A Call from the Wood','Next Week Has Teeth','Acrylic for Ghosts',
  'Lighthouse in a Drawer','The Plywood Has a Pulse','Never Seen a Painting','Liminal Lunch',
  'Wrong Side of the Canvas','The Good Side of a Splinter','The Chest Has a Dial Tone',
  'Full Fat Apparition','How to Misplace a Summer','A Nice Day for Charcoal','Three Wrong Flowers',
  'The Grass Knows','A Door for the Mist','Do Not Return the Sun','Some Time, No Title',
  'Postcards from the Blood Bank','Dog with a Day Off','Nothing on the Other Side',
  'Wood with an Alibi','Seven of Hearts, No Heart','Dairy Pirates at Dawn'];
const choose=(r,list)=>list[Math.floor(r.next()*list.length)];
export function galleryTitles(doc){
  const titles=[];
  for(const item of doc.querySelectorAll('#page-works .work-item[data-slug]')){
    // Read the displayed title from the gallery's existing data without running its handler.
    const call=item.getAttribute('onclick')?.match(/openLightbox\(\s*'(?:\\.|[^'\\])*'\s*,\s*'((?:\\.|[^'\\])*)'/);
    const title=(item.getAttribute('data-title')||call?.[1]?.replace(/\\(['"\\])/g,'$1')||
      item.querySelector('img[alt],model-viewer[alt]')?.getAttribute('alt'))
      ?.replace(/\s+/g,' ').trim();
    if(title&&title.length<=100)titles.push(title);
  }
  return [...new Set(titles)];
}

export async function readGallery(){
  let embedded=[];
  try{
    if(parent!==window)embedded=galleryTitles(parent.document);
  }catch{ /* Standalone and cross-origin frames can read the site's public gallery. */ }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),1200);
  try{
    const page=await fetch('/',{cache:'no-cache',signal:controller.signal});
    if(!page.ok)return embedded;
    const current=galleryTitles(new DOMParser().parseFromString(await page.text(),'text/html'));
    return current.length?current:embedded;
  }catch{
    return embedded;
  }finally{
    clearTimeout(timeout);
  }
}

function shuffle(list,r){
  for(let i=list.length-1;i>0;i--){
    const j=Math.floor(r.next()*(i+1));
    [list[i],list[j]]=[list[j],list[i]];
  }
  return list;
}

const places=[
  'the Wrong Drawer','Low Tide','a Borrowed Room','the Last Bus','the Back Stair',
  'a Small Museum','the Attic','Tuesday','an Unmarked Island','the Lost Property Office',
  'the Roof of the Sea','the Wet Paint','the Dead Letter Room','a Pocket in the Weather',
];
const oddObjects=[
  'a Moth','a Receipt','a Spare Moon','an Unpaid Bill','a Missing Hour','Three Spoons',
  'a Failed Forecast','a Cardboard Tide','a Tooth','a Polite Ghost','a False Alarm',
  'a Very Small Storm','a Borrowed Shadow','an Invisible Dog','a Tin of Silence',
  'a Pigeon in Mourning','a Wet Stamp','a Cracked Bell','an Unsent Postcard',
];
const errors=['Filed Under Weather','in the Wrong Century','Returned Unopened','Withholding the Ending',
  'on Temporary Loan','as Recalled by a Dog','Recorded in Oil Stick','with the Middle Missing',
  'Unfit for Display','Corrected by the Tide','Reported Missing Twice','With No Known Original'];
const actions=['Shelving','Measuring','Returning','Misplacing','Forging','Counting','Borrowing','Painting'];
const records=[
  (r,t)=>t+', '+choose(r,errors),
  (r,t)=>'The Lost Property of '+t,
  (r,t)=>'What We Found Inside '+t,
  (r,t)=>'Notes on '+choose(r,actions)+' '+t,
  (r,t)=>t+' vs. '+choose(r,['the Weather','the Archive','Next Thursday','the Sea','Good Taste','the Borough']),
  (r,t)=>'How to Return '+t+' to '+choose(r,places),
  (r,t)=>'A Reply to '+t,
  (r,t)=>t+' and Other '+choose(r,['False Alarms','Unpaid Bills','Wrong Measurements','Indoor Storms','Small Mistakes']),
  (r,t)=>choose(r,['Receipt','Deposition','Incident Report','Inventory','Minutes'])+' for '+t,
  (r,t)=>t+' Found in '+choose(r,places),
  (r,t)=>'Instructions Left by '+t,
  (r,t)=>'Evidence of '+t+' in '+choose(r,places),
  (r,t)=>t+' Without '+choose(r,['a Tomorrow','the Original','an Outside','Witnesses','a Reply','a Horizon']),
  (r,t)=>'Borrowing '+t+' for '+choose(r,oddObjects),
  (r,t)=>'Letter from '+t+' to '+choose(r,oddObjects),
  (r,t)=>t+' Mistaken for '+choose(r,oddObjects),
  (r,t)=>'The Shape of '+t+' in Bad Light',
  (r,t)=>t+' in Exchange for '+choose(r,oddObjects),
  (r,t)=>'The Second Disappearance of '+t,
  (r,t)=>t+' and the Bureau of '+choose(r,['Small Tides','False Hours','Unsent Letters','Borrowed Light','Missing Corners']),
  (r,t)=>'Do Not Feed '+t+' After Closing',
  (r,t)=>'On Hearing '+t+' from '+choose(r,places),
  (r,t)=>'The Case of '+t+' and '+choose(r,oddObjects),
  (r,t)=>t+' as Measured in '+choose(r,['Teaspoons','Rain','Unopened Mail','Dog Years','Shadows','False Starts']),
];
const stopWords=new Set(['a','an','the','of','at','to','in','on','and','or','for','from','about','some','is']);
function fragments(works){
  const phrases=new Set();
  for(const work of works){
    for(const clause of work.split(/[,!?;:–—]/)){
      const words=clause.trim().split(/\s+/).filter(Boolean);
      if(words.length<=3)continue;
      for(let i=0;i<words.length-1;i++){
        const part=words.slice(i,i+2+(i%2));
        if(stopWords.has(part[0].toLowerCase())||stopWords.has(part.at(-1).toLowerCase()))continue;
        const phrase=part.join(' ');
        if(phrase.length>=7&&phrase.length<=27)phrases.add(phrase);
      }
    }
  }
  return [...phrases];
}

export function makeCatalogue(seed,works=[]){
  const r=random(hash(seed,0x7d48));
  const live=shuffle([...new Set(works.filter(name=>typeof name==='string'&&name.trim()))],r);
  const parts=fragments(live);
  const shortWorks=live.filter(title=>title.length<=36);
  const studio=[...objects,...parts];
  const names=new Set();
  // Full references make additions and renames visible, even when most titles are remixed.
  for(const title of live.slice(0,40)){
    names.add(r.next()<.5?choose(r,forms)+' '+title:title+' '+choose(r,endings));
  }
  while(names.size<BOOK_COUNT){
    const style=r.next();
    const topic=shortWorks.length&&r.next()<.28?choose(r,shortWorks):choose(r,studio);
    const name=style<.09?choose(r,oddities):style<.21
      ?topic+' '+choose(r,endings):choose(r,records)(r,topic);
    if(name.length<=64)names.add(name);
  }
  return shuffle([...names],r);
}

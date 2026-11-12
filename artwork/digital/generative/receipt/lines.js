import {makeCollage} from './material.js?edition=7';
import {price,reportedImpact} from './impact.js?edition=8';

const stock = {
    ai: [
        ['Someone else’s apology', 'Laminated. Signed by the kettle.'],
        ['An email that could have been nothing', 'Four paragraphs of warm regards'],
        ['Robot to click “I am not a robot”', 'Batteries sold to a different robot'],
        ['The wrong answer, in a nice font', 'Confidence included']
    ],
    data: [
        ['Drinking water for one email', 'Please mark this as low priority'],
        ['An ice pack for the internet', 'Keep frozen until the meeting ends'],
        ['USB stick full of someone’s shit', 'Found in the communal washing machine'],
        ['Password reset for the big light', 'We sent a code to your old number']
    ],
    gold: [
        ['Emergency ingot for under the bed', 'Do not tell the man fitting the carpet'],
        ['Gold-plated carrier bag', 'You did say you’d forgotten yours'],
        ['One reassuringly heavy object', 'Feel free to hold it during the news']
    ],
    finance: [
        ['Last week’s price, framed', 'Look at it whenever you like'],
        ['Half a loaf, full-size bag', 'Packaging contains the other half'],
        ['Small bag of emergency cash', 'Smells faintly of grandad’s wardrobe'],
        ['One pound, cut into eight fees', 'Please count your change']
    ],
    power: [
        ['Eight minutes of radiator', 'Only the bit behind the sofa'],
        ['AA batteries for the big light', 'Do not look directly at the meter'],
        ['A kettle’s worth of electricity', 'Enough for one cup and an argument']
    ],
    politics: [
        ['Envelope marked DEFINITELY NOT A GIFT', 'Please leave it under the cheese'],
        ['Three biscuits from a meeting', 'Nobody touched the shortbread'],
        ['A shovel for a slightly deeper hole', 'Return when you’ve explained yourself'],
        ['Another consultation on the bins', 'Black bin still not collected']
    ],
    court: [
        ['The word “allegedly”, in bulk', 'Best kept in a separate drawer'],
        ['An answer approved by six solicitors', 'Please allow six to eight years'],
        ['Someone to read the small print', 'They have started crying']
    ],
    climate: [
        ['A wet coat to carry all afternoon', 'Weather improved as soon as you bought it'],
        ['12 minutes of seasonal weather', 'Wrong season. Keep the receipt.'],
        ['Compostable bag of non-compost', 'Check with your local council']
    ],
    space: [
        ['Small bin for space junk', 'Collection on alternate Thursdays'],
        ['Moon rock from the garden centre', 'Suitable for a low-gravity border'],
        ['An orbit for two', 'One of you must stay in the car']
    ],
    sport: [
        ['Pint of VAR', 'Please wait before celebrating'],
        ['A seat behind a very tall bloke', 'Includes excellent view of his hood'],
        ['Shin pads for the pub', 'One size fits ninety minutes']
    ],
    travel: [
        ['A ticket to the station you just left', 'Change at the car park'],
        ['Seat reservation for a replacement bus', 'Seat currently on a train'],
        ['One mystery suitcase, medium', 'Contains a wet towel and no answers']
    ],
    work: [
        ['One spare lunch break', 'You can spend it replying to this'],
        ['Meeting to find the previous meeting', 'Forwarded to everyone, twice'],
        ['Colleague’s yoghurt, eaten by mistake', 'Please settle with Sharon']
    ],
    food: [
        ['Crisps from the bottom of the lorry', 'Already open for quality control'],
        ['Carrot with a delivery estimate', 'Please stay home between 8 and 8'],
        ['Loose supermarket grape, inspected', 'The rest were fine']
    ],
    culture: [
        ['Bench to look at a bench from', 'Exhibition closes when you sit down'],
        ['Small label for a large empty wall', 'The wall is on loan'],
        ['An artist’s sandwich, on loan', 'Please return in its original condition']
    ],
    science: [
        ['A second opinion from a worm', 'Peer review is still ongoing'],
        ['Control group for a bad haircut', 'Both groups asked for a hat'],
        ['One teaspoon of inconclusive results', 'Stir before replicating']
    ],
    shipping: [
        ['Your parcel’s empty seat on a boat', 'Tracking says it is with a neighbour'],
        ['A shipping container of coat hangers', 'Please keep upright'],
        ['Tiny pallet for one very heavy egg', 'Delivery to kerb only']
    ],
    general: [
        ['Avocado with a 40-minute window', 'Ready yesterday between 11:02 and 11:42'],
        ['Emergency supermarket trousers', 'Wear home. Bin originals. Tell nobody.'],
        ['Pint of tap water, opened by sommelier', 'Notes of hosepipe'],
        ['Big bag to put the little bag in', 'Little bag available at the next till'],
        ['Someone to take the spider outside', 'Spider has declined relocation'],
        ['One pair of wet socks', 'Second pair somehow also wet'],
        ['Replacement lid for a tub you binned', 'Fits the one you used to have'],
        ['Egg with a weird bit on it', 'That’s how they come'],
        ['Parmesan until someone says stop', 'No one said stop'],
        ['An extra “you too” for the waiter', 'You can think about it in the bath'],
        ['A slightly damp £5 note', 'Previous owner declined to elaborate'],
        ['Four loose ibuprofen from a handbag', 'Lint included'],
        ['Single drawstring, lost in waistband', 'Installation takes the afternoon'],
        ['An emergency toilet code', 'Valid at this branch until you need it'],
        ['Two minutes to put your coins away', 'Whole queue included'],
        ['Tomato that tastes like the fridge', 'Family pack'],
        ['A single croc from the beach', 'Other foot available at low tide'],
        ['Large bowl for a very small amount of dip', 'Dip sold separately']
    ]
};

export function random(seed) {
    let state=seed;
    return () => {
        state=(state+0x6d2b79f5)|0;
        let value=Math.imul(state^(state>>>15),1|state);
        value^=value+Math.imul(value^(value>>>7),61|value);
        return ((value^(value>>>14))>>>0)/4294967296;
    };
}

const currency=price;
const storyItems=[
    [/\b(?:strike|walkout|school closures?|closes? .*schools|suspends? .*services)\b/i,[
        'A timetable with everything crossed out','One school day, to be taken at home','Replacement service, collection only']],
    [/\b(?:evacuat\w*|bomb threats?|security alerts?)\b/i,[
        'One emergency notice, already out of date','A spare copy of the all-clear','Emergency timetable, amended by hand']],
    [/\b(?:protests?|demonstrat\w*|rall(?:y|ies)|march(?:es)?|procession|participate.*annual)\b/i,[
        'A commemorative flag with the date wrong','One pavement slot for the procession','Crowd barrier with the feet missing']],
    [/\b(?:discontinue|phases? out|replaces? .*software|ban.*phones?)\b/i,[
        'Return postage for the old equipment','A charger for a discontinued device','One last software update, sold separately']],
    [/\b(?:elect(?:ion|s|ed)|referendum|coalition|ballot)\b/i,[
        'A recount, by the carrier bag','A majority with the receipt missing','Coalition extension lead, three sockets']],
    [/\b(?:tariffs?|inflation|budget|prices?|rate cut|central bank|trade deal)\b/i,[
        'Yesterday’s price under glass','A surcharge for the surcharge','Half a shopping basket at full price']],
    [/\b(?:launch(?:es|ed)?|satellites?|spacecraft|lunar)\b/i,[
        'Excess baggage to low orbit','One launch window, frosted','Fuel for the trip home']],
    [/\b(?:signs?|agreement|summit|negotiations?|talks)\b/i,[
        'Pen on a chain for the signing','The last biscuit at the talks','Agreement in triplicate, one copy damp']],
    [/\b(?:ban(?:s|ned)?|ruling|regulations?|propos(?:es|al)|approves?)\b/i,[
        'A queue for the exemption desk','Small print sold by the metre','One approved exception, shop-soiled']],
    [/\b(?:win(?:s|ning)?|championship|cup|qualif(?:ies|ied)|defeats?)\b/i,[
        'The losing side of a commemorative mug','A replay with the sound off','Victory lap, return fare not included']],
    [/\b(?:open(?:s|ed)|unveils?|restor(?:es|ed|ation)|exhibition)\b/i,[
        'A bit of the ribbon after the opening','A viewing slot behind a tall bloke','Souvenir sold before the doors open']],
    [/\b(?:discover(?:s|ed|y)|study|fossils?|researchers?|species)\b/i,[
        'One control sample from the staff fridge','Deposit on a second opinion','The small print under the specimen']],
    [/\b(?:delay(?:s|ed)?|railway|airport|trains?|flights?)\b/i,[
        'A seat reservation for the replacement bus','Delay compensation in meal-deal vouchers','One hour waiting at the wrong gate']]
];
const defaultItems=['The small print at the bottom','A souvenir from before it happened',
    'Return postage for the whole thing','The bit they read out at the end','One spare chair at the briefing'];

function eventLine(story,pick){
    const match=storyItems.find(([pattern])=>pattern.test(story.text));
    const stockItems=story.category==='general'?[]:(stock[story.category]??[]).map(entry=>entry[0]);
    const label=story.label;
    const items=label?['A display copy of '+label,'A receipt for '+label,
        'A commemorative bag from '+label,...stockItems]:[...stockItems,...defaultItems];
    const title=pick(match?.[1]??items);
    const sentence=story.text.split(/(?<=[.!?])\s+(?=[A-Z])/)[0];
    const detail=sentence.length>144?sentence.slice(0,141).replace(/\s+\S*$/,'')+'…':sentence;
    return [title,story.day+' / '+detail];
}

export function makeEntry(index,seed,edition,subtotal,recentTitles,context={}){
    const salt=Math.imul(index,0x9e3779b1);
    const r=random((seed^salt)|0);
    const pick=list=>list[Math.floor(r()*list.length)];
    const {hour=12,weekday=2,month=11,layer=0,closeSale=false}=context;
    if(closeSale){
        const fee=29+Math.floor(r()*300)+layer*3;
        const feeName=layer>5?'Paper storage, by the metre':
            pick(['Putting it in a bag','Thinking about it later','Using the staff toilet','Finding the end of the tape']);
        return {height:124,subtotal:0,lines:[
            {kind:'rule',text:'----------------------------------------'},
            {kind:'price',text:feeName,value:currency(fee)},
            {kind:'total',text:'TOTAL',value:currency(subtotal+fee)},
            {kind:'barcode',value:(seed>>>0)^index},
            {kind:'note',text:pick(['Please keep for the argument later','Cashier has gone for a little walk',
                'Refunds at the till you just left','Your change is in the other pocket'])}
        ]};
    }
    const stories=edition?.stories??[];
    const latest=stories[0]?.age??0;
    const fresh=stories.filter(story=>story.age===latest&&!recentTitles.includes(story.text));
    const older=stories.filter(story=>story.age!==latest&&!recentTitles.includes(story.text));
    const candidates=fresh.length&&(!older.length||r()<.89)?fresh:older;
    const story=(candidates.length?pick(candidates):stories.length?pick(stories):null);
    const late=hour<7||hour>=21;
    const fromNews=story&&r()<.92;
    let [title,note]=fromNews?eventLine(story,pick)
        :r()<.65?makeCollage(r,null,context):pick(stock.general);
    const storyKey=fromNews?story.text:null;
    if(!storyKey&&recentTitles.includes(title)){
        title='Left in basket, aisle '+(index%18+1);
        note='Ask whoever was on the previous shift';
    }
    const impact=fromNews?reportedImpact(story.text):0;
    const quantity=impact||r()<.80?1:2+Math.floor(r()*3);
    const cents=pick([0,1,49,99,99,Math.floor(r()*99)]);
    const cost=impact||((Math.floor(r()*14)+1)*100+cents+(late?37:0))*quantity;
    const annotation=!!storyKey||r()<.64;
    return {height:annotation?59:35,subtotal:subtotal+cost,title,storyKey,lines:[
        {kind:'price',text:impact?'EST. COST / '+title:quantity+'  '+title,value:currency(cost,!!impact)},
        ...(annotation?[{kind:'note',text:note}]:[])
    ]};
}

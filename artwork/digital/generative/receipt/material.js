// Short fragments for fictional till items. The historical entries refer
// to real events and inventions, with the transactions supplied by the till.
const archive=[
    ['a Baghdad paper mill','watermarks'],['an Inca rope bridge','a spare knot'],
    ['a Benin bronze casting','the lost wax'],['a Viking sun compass','cloud cover'],
    ['a page of the Diamond Sutra','ink for the next copy'],['the Antikythera mechanism','the missing cog'],
    ['an Abbasid star chart','an unmarked star'],['a Timbuktu manuscript','a dust jacket'],
    ['a Mesoamerican ball court','a spare rubber ball'],['the Library of Alexandria','an overdue scroll'],
    ['a Polynesian stick chart','a side current'],['the first transatlantic cable','a short silence'],
    ['an early public lavatory','a penny refund'],['a Paris pneumatic post tube','a dented capsule'],
    ['the first photograph of a street','the man getting his shoes shined'],['a Pompeii bakery','the end of a loaf'],
    ['a Roman roadside inn','a room above the stables'],['a Han dynasty seismoscope','a bronze frog'],
    ['the first commercial typewriter','an unused letter'],['a public telephone box','an unclaimed coin'],
    ['a silent-film cinema','a missing intertitle'],['a lunar sample bag','one grain of dust'],
    ['a Second World War ration book','a butter coupon'],['the first barcode scan','a packet of chewing gum'],
    ['the 1851 Great Exhibition','an empty display case'],['a Silk Road caravanserai','the last available bed'],
    ['an early Japanese woodblock print','a crooked registration mark'],['a Māori waka','the spare paddle'],
    ['an Ottoman coffee house','the grounds left at the bottom'],['a Venetian quarantine station','the last day of waiting'],
    ['a Victorian lost property office','an unclaimed umbrella'],['a Peruvian quipu','a disputed knot'],
    ['a Berlin airlift parcel','a single stick of gum'],['a 1920s radio station','a pause between songs'],
    ['the first email','a test message'],['an Egyptian sundial','a few minutes of shade'],
    ['a Soviet arcade cabinet','a token stuck in the slot'],['a Johannesburg gold mine','a chipped assay weight'],
    ['the first freezer aisle','a fogged-up price tag'],['a medieval toll bridge','an exemption for a goose']
];
const objects=[
    'a false bottom','one shoelace','a bendy spoon','someone else’s password hint','a dead remote',
    'a spare breath','the ice under the peas','a rubber doorstop','a warm key','a photocopy of the back',
    'a coaster with a phone number','an empty perfume tester','the missing wheel','a folded bus timetable',
    'a phone on 1%','the foam from a cappuccino','a dented trophy','the corner of a mattress',
    'a blank luggage tag','the clean bit of the sponge','one office grape','a packet of wet matches',
    'a duvet in the wrong bag','a hand-written apology','a double-yolk egg','the underside of the till',
    'a biro from a betting shop','one warm sock','a missed call','a tissue through the wash',
    'a receipt from the wrong shop','a week-old voice note','a duplicate key','a cup with teeth marks'
];
const actions=[
    'Test charge for','Return postage on','Saturday hire of','Emergency replacement for',
    'Storage fee for','Three minutes with','Lost property charge for','A refund in the form of',
    'Witness fee for','A forwarding address for','Left in the basket with','Reserved next to',
    'Unwrapping fee for','An apology typed on','Buy one, inherit','The extended warranty on'
];
const notes=[
    'Was in the same bag when it happened','Taken out of the display model','Please unfold before returning',
    'Slightly warm on one side','Refund entered under the wrong name','Do not leave near the radiator',
    'Cashier was told this was normal','Sent to the other branch by mistake','Previously owned by the shop',
    'One per household, including ghosts','Check the smaller of the two pockets','Amount carried over by hand'
];

export function makeCollage(r,edition,context){
    const pick=items=>items[Math.floor(r()*items.length)];
    const [historical,fragment]=pick(archive);
    const signals=edition?.fragments??[];
    const source=r();
    const [place,thing]=source<.42&&signals.length?pick(signals):
        source<.77?[historical,fragment]:[pick(objects),pick(objects)];
    const other=pick(objects);
    const format=pick([
        ()=>[pick(actions)+' '+thing, 'Filed under '+place],
        ()=>[thing+' from '+place, pick(notes)],
        ()=>[pick(actions)+' '+place, 'Includes '+other],
        ()=>[other+' with '+thing, pick(notes)],
        ()=>[thing+' (display model)', 'Found next to '+place],
        ()=>[other+' left at '+place, 'This includes the '+fragment],
        ()=>[thing+' / '+other,context.layer>4?'Recovered from under the till':pick(notes)]
    ]);
    const [title,note]=format();
    return [title[0].toUpperCase()+title.slice(1),note];
}

// Only treat a dollar amount as an impact when the same sentence describes
// costs, losses or damage. Keep nominal sales, valuations and investment out.
const loss=/\b(?:economic losses?|economic costs?|economic damage|economic impact|damage|losses?|lost output|shortfall|cost(?:s|ing)?|repair bill|reconstruction bill|recovery cost)\b/i;
const amount=/(?:US\s*\$|USD\s+|U\.S\.\s+dollars?\s+|(?<![A-Z])\$)\s*(\d[\d,]*(?:\.\d+)?)(?:\s*(?:[–—-]|to)\s*(?:US\s*\$|\$)?\s*(\d[\d,]*(?:\.\d+)?))?\s*(trillion|billion|million|thousand|bn|mn|[tbmk]\b)?/gi;
const multipliers={trillion:1e12,billion:1e9,million:1e6,thousand:1e3,t:1e12,b:1e9,bn:1e9,m:1e6,mn:1e6,k:1e3};

export function reportedImpact(text){
    const american=/\b(?:United States|U\.S\.|US economy|U\.S\. economy|American)\b/i.test(text);
    for(const sentence of text.split(/(?<=[!?;]|\.(?!\d))\s+(?=[A-Z])/)){
        if(!loss.test(sentence))continue;
        for(const match of sentence.matchAll(amount)){
            const notation=match[0].trimStart();
            if(notation.startsWith('$')&&!american)continue;
            const nearby=sentence.slice(Math.max(0,match.index-70),match.index+notation.length+70);
            if(!loss.test(nearby)||/\b(?:profit|market value|market capitalization|valuation|invest(?:ment|s|ed)?|sales revenue|donat(?:ion|es|ed)|aid package|per barrel|per share)\b/i.test(nearby))continue;
            const first=Number(match[1].replaceAll(',',''));
            const last=match[2]?Number(match[2].replaceAll(',','')):first;
            const value=((first+last)*.5)*(multipliers[match[3]?.toLowerCase()]??1);
            if(!Number.isFinite(value)||value<1e5||value>1e12)continue;
            return Math.round(Number(value.toPrecision(2))*100);
        }
    }
    return 0;
}

const compact=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1});
const dollars=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
export const price=(cents,estimate=false)=>estimate||cents>=1e8?compact.format(cents/100):dollars.format(cents/100);

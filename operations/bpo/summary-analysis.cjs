'use strict';
const {poolClass,storyClass}=require('./adjustments.cjs');
const text=x=>String(x??'').trim(),number=x=>text(x)&&Number.isFinite(Number(text(x).replace(/[$,]/g,'')))?Number(text(x).replace(/[$,]/g,'')):null;
const money=x=>number(x)===null?'not reported':number(x).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const equal=(a,b)=>text(a)&&text(b)&&text(a).toLowerCase()===text(b).toLowerCase();
const list=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a.at(-1);
const sentence=x=>text(x)?text(x)+(/[.!?]$/.test(text(x))?'':'.'):'';
function warnings(v){const result=[];if(/\$[\d,]+\s*(?:pound|lb)/i.test(v._summaryNotes?.subject||''))result.push('The subject notes contain a dollar sign before a lift capacity. Confirm the capacity and units against the source; the draft omits that ambiguous quantity.');return result;}
function notesText(x){return text(x).replace(/with\s*\$[\d,]+\s*pound\s+lift/ig,'with a lift (capacity requires confirmation)').replace(/failed to sale/ig,'failed to sell').replace(/\bSubject has\b/ig,'The subject includes').replace(/\bHome is\b/g,'The home is').replace(/\bboat house\b/ig,'boathouse').replace(/\binlaw\b/ig,'in-law').replace(/(\d[\d,]*)\s*sf\b/ig,(_,n)=>Number(n.replace(/,/g,'')).toLocaleString('en-US')+' square feet');}
function comparisons(v,p){const g=k=>v[p+k],s=k=>v['sold.0.'+k],shared=[],differences=[];
 for(const [key,label] of [['condition','condition'],['quality','construction description'],['view','view'],['location','location']])if(equal(s(key),g(key)))shared.push(key==='condition'?text(g(key)).toLowerCase()+' condition':key==='quality'&&/block/i.test(g(key))?'block construction':key==='view'?text(g(key)).toLowerCase()+' view':label+' ('+text(g(key))+')');
 if(shared.length>0)differences.push('It shares the subject’s '+list(shared.slice(0,3))+'.');
 const sg=number(s('gla')),cg=number(g('gla')),sb=number(s('baths')),cb=number(g('baths'));
 const size=[];if(sg>0&&cg>0&&sg!==cg)size.push((cg>sg?'more':'less')+' living area');if(sb!==null&&cb!==null&&sb!==cb)size.push((cb>sb?'more':'fewer')+' bathrooms');
 if(size.length)differences.push('Because it offers '+size.join(' and ')+', its unadjusted price is not directly equivalent to the subject’s.');
 const sp=poolClass(s('pool')),cp=poolClass(g('pool'));
 if(sp!==null&&cp!==null&&sp!==cp)differences.push(sp>cp?(/above[- ]?ground/i.test(g('pool'))?'Its above-ground pool is treated as having no pool value, distinguishing it from the subject’s private pool.':'The absence of a valued private pool makes this a useful comparison for the subject’s pool advantage.'):'Its private pool offers an amenity the subject lacks.');
 else if(sp===1&&cp===1)differences.push('Both properties have a reported private pool, allowing comparison without a pool difference.');
 const ss=storyClass(s('design')),cs=storyClass(g('design'));
 if(ss!==null&&cs!==null&&ss!==cs&&number(v._adjustments?.globals?.design)>0&&v._adjustments?.generated?.[p+'adj_design']&&number(v[p+'adj_design'])===number(v._adjustments.generated[p+'adj_design'].value))differences.push(ss>cs?'The entered single-story preference adds to the inferior multistory/upper-floor comp; it is a preparer assumption, not a demonstrated market premium.':'The entered single-story preference deducts from the superior single-story comp; it is a preparer assumption, not a demonstrated market premium.');
 if(!differences.length)differences.push('The entered facts do not yet explain this property’s relative utility or suitability. Its price alone is insufficient to establish comparability.');
 if(/block/i.test(s('quality')||'')&&/frame/i.test(g('quality')||''))differences.push('Its frame construction differs from the subject’s block construction; newer age alone does not establish superior overall quality.');
 const hasLift=x=>/boat\s*lift|boathouse/i.test(x||'')&&!/\b(no|none|without)\b/i.test(x);if(hasLift(s('other'))&&hasLift(g('other')))differences.push('Its boating improvements also make it relevant to the subject’s recreational utility.');else if(hasLift(s('other'))&&/^(none|no)$/i.test(text(g('other'))))differences.push('It lacks the subject’s reported boating improvement, a distinction in recreational utility.');
 return differences.slice(0,5).join(' ');
}
function refine(v,original){const notes=v._summaryNotes||{},out=[],subject=original[0];
 const facts=[number(v['sold.0.gla'])>0?number(v['sold.0.gla']).toLocaleString('en-US')+' square feet':null,number(v['sold.0.beds'])!==null?number(v['sold.0.beds'])+' bedrooms':null,number(v['sold.0.baths'])!==null?number(v['sold.0.baths'])+' bathrooms':null].filter(Boolean);
 const overview=[];overview.push('The analysis uses '+(facts.length?list(facts):'the subject facts entered in the BPO')+' for the subject at '+(v.field_0008||v['sold.0.address']||'the reported address')+'.');
 if(notes.subject)overview.push(sentence(notesText(notes.subject)));
 const risks=[];
 if(/fail(?:ed)? to (?:sell|sale)|unsuccessful|withdrawn|expired/i.test(notes.subject||''))risks.push('The reported unsuccessful marketing history calls for caution about relying on earlier asking prices. It may indicate pricing resistance, but does not establish that price was the only reason a sale did not occur.');
 if(/(?:advertis|listing).*(?:sf|square feet).*(?:public record)|(?:public record).*(?:advertis|listing)|living.area discrepancy/i.test(notes.subject||''))risks.push('The discrepancy in reported living area requires verification before additional space is given the same weight as documented living area. Permitted use, finished quality and lender treatment may affect buyer expectations; none is established by the discrepancy alone.');
 if(notes.risks)risks.push(sentence(notes.risks));
 out.push({title:subject.title,body:overview.join('\n\n')});
 const oldMarket=original.find(s=>s.title==='Neighborhood and Market Conditions').body;
 // Keep the decision-driving trend, supply and exposure figures; area tables remain in Section I.
 let market=oldMarket.split(/(?:ZIP .*? reports|County area reports|[A-Za-z][A-Za-z ]* reports median|Reported neighborhood occupancy)/)[0].trim();
 if(notes.market&&market.includes(notes.market))market=market.replace(notes.market,'').trim();
 if(v.field_0033===true&&number(v.market_price_change_percent)>0)market+=' The reported decline favors caution about carrying older prices forward unchanged. The entered market trend alone does not establish a time adjustment for an individual comp.';
 else if(v.field_0036===true&&number(v.market_price_change_percent)>0)market+=' The reported increase provides context for sale timing, but does not establish that every property has appreciated at that rate.';
 if(number(v.market_months_supply)!==null)market+=' Inventory indicates the depth of competing supply at the reported date; a single reading does not show whether inventory is increasing or decreasing.';
 market+=' Broad ZIP and county statistics are not the subject’s value. The relevant comparable segment and observed marketing response matter more than applying an area median directly.';
 if(notes.market)market+=' '+sentence(notes.market);
 out.push({title:'Neighborhood and Market Conditions',body:market});
 const sold=[1,2,3].filter(i=>v['sold.'+i+'.address']).map(i=>number(v['sold.'+i+'.adjusted'])).filter(x=>x!==null),low=sold.length?Math.min(...sold):null,high=sold.length?Math.max(...sold):null;
 for(const kind of ['sold','active']){
  if(kind==='active'&&notes.competition)out.push({title:'Competitive Listings Context',body:sentence(notes.competition)});
  for(let i=1;i<=3;i++){const key=kind+'.'+i,p=key+'.',g=k=>text(v[p+k]);if(!g('address'))continue;
   const pending=kind==='active'&&/\bpending\b|under contract/i.test(g('status')+' '+g('source')),primary=(kind==='sold'?notes.primary:notes.primaryActive)===key;
   const body=[];body.push(kind==='sold'?(number(g('price'))!==null?'The closed sale at '+money(g('price'))+(g('date')?' on '+g('date'):'')+' provides evidence of an achieved transaction.':'A closed-sale price has not been supplied; this record cannot yet provide a priced sale indication.'):(pending?'This property is reported pending at a last asking price of ':'This property has a reported asking price of ')+money(g('price'))+'.');
   body.push(comparisons(v,p));
   const dom=number(g('dom')),typical=number(v.field_0053);
   if(dom!==null&&typical>0)body.push('Its '+dom+' reported days on market '+(dom>typical?'exceed':dom<typical?'are below':'match')+' the area’s '+typical+'-day benchmark. '+(kind==='sold'?'This places the completed transaction in the context of reported local exposure.':pending?'The pending status signals a reported contract, but neither the contract price nor a completed closing is established.':(dom>typical?'That extended exposure calls for caution about buyer acceptance at the asking price; the cause is not established.':'The shorter exposure does not yet establish acceptance at the asking price.')));
   const adj=number(g('adjusted'));
   if(adj!==null)body.push('The adjusted '+(kind==='sold'?'sale':'asking-price')+' indication is '+money(adj)+'. '+(kind==='sold'&&sold.length>1&&low!==high?(adj===low?'It anchors the lower end':adj===high?'It anchors the upper end':'It lies within the range')+' of the supplied adjusted sales.':kind==='sold'?'This is a comparison under the entered assumptions, not an independent verification of the subject’s value.':'It describes competitive positioning, not a verified closed-sale value.'));
   const reason=kind==='sold'?notes.primaryReason:notes.primaryActiveReason;
   if(primary)body.push('The preparer selected this as the primary '+(kind==='sold'?'sold comparable':'competitive listing')+(text(reason)?' because '+sentence(reason):'.'));
   if(notes[key])body.push(sentence(notes[key]));
   if(kind==='active'&&pending&&!(dom!==null&&typical>0))body.push('The contract price and concessions are unknown; the eventual closing should be checked before treating it as completed-sale evidence.');
   out.push({title:(kind==='sold'?'Sold':pending?'Pending':'Active')+' Comparable '+i+' - '+g('address'),body:body.slice(0,2).join(' ')+'\n\n'+body.slice(2).join(' ')});
  }
 }
 if(risks.length)out.push({title:'Listing History and Marketability',body:risks.join('\n\n')});
 const conclusion=[],value=number(v.field_0477),asking=number(v['active.0.price']);
 if(sold.length){conclusion.push('The supplied adjusted closed-sale evidence '+(low===high?'indicates '+money(low):'ranges from '+money(low)+' to '+money(high))+'. '+(value!==null?'The entered value of '+money(value)+(value<low||value>high?' falls outside that range and needs an explicit explanation for the departure.':' falls within that range; this is numerical consistency, not proof of market value.'):'A final value has not yet been entered.'));}
 else conclusion.push('No priced adjusted closed-sale evidence is available to reconcile the value. Active or pending asking prices alone do not establish an achieved market value.');
 if(notes.primary&&v[notes.primary+'.address'])conclusion.push('The selected primary sold reference is '+v[notes.primary+'.address']+(notes.primaryReason?' because '+sentence(notes.primaryReason):'. The conclusion considers the rest of the supplied sales alongside that reference.'));
 if(notes.primaryActive&&v[notes.primaryActive+'.address'])conclusion.push('The primary competitive listing, '+v[notes.primaryActive+'.address']+', informs positioning against available or pending alternatives rather than replacing closed-sale evidence.');
 if(notes.conclusion||v.field_0482)conclusion.push(sentence(notes.conclusion||v.field_0482));
 if(risks.length)conclusion.push('The marketing and verification concerns discussed above remain qualifications to the value opinion.');
 conclusion.push(value!==null?'The preparer’s concluded as-is value is '+money(value)+'.':'An as-is value opinion has not yet been finalized.');
 if(number(v.field_0478)!==null)conclusion.push('The recommended list price is '+money(v.field_0478)+'.');
 if(asking!==null&&value!==null)conclusion.push('The subject’s entered list price is '+(asking===value?'equal to the conclusion':money(Math.abs(asking-value))+(asking>value?' above':' below')+' the conclusion')+'; it is an asking price, not an achieved sale.');
 out.push({title:'Value Conclusion',body:conclusion.join(' ')});return out;
}
module.exports={refine,warnings};

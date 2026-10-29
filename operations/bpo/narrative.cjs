'use strict';
const t=x=>String(x??'').trim(),n=x=>t(x)&&Number.isFinite(Number(t(x).replace(/[$,]/g,'')))?Number(t(x).replace(/[$,]/g,'')):null;
const money=x=>n(x)===null?'not reported':n(x).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const num=x=>n(x)===null?t(x):n(x).toLocaleString('en-US',{maximumFractionDigits:2});
const labels={financing:'seller concessions',location:'location',tenure:'ownership',site:'site',view:'view',design:'design and appeal',quality:'construction quality',year:'age',condition:'condition',rooms:'room count',gla:'living area',basement:'basement',utility:'functional utility',hvac:'heating/cooling',energy:'energy efficiency',garage:'garage/carport',porches:'outdoor features',fireplace:'fireplace',fence:'fence',pool:'pool',other:'other differences'};
function sections(v){const notes=v._summaryNotes||{},subject=k=>t(v['sold.0.'+k]),out=[];
 const facts=[subject('gla')?`${num(subject('gla'))} square feet of living area`:'',subject('beds')?`${subject('beds')} bedrooms`:'',subject('baths')?`${subject('baths')} bathrooms`:''].filter(Boolean);
 let overview=`The subject at ${v.field_0008||subject('address')||'the reported address'}${subject('design')?' is described as '+subject('design')+(facts.length?'. It':''):''}${facts.length?' offers '+facts.join(', '):''}.${subject('year')?' Built in '+subject('year')+'.':''}`;
 if(notes.subject)overview+=' '+notes.subject;
 const details=['condition','garage','view','tenure'].filter(k=>subject(k)).map(k=>`${({condition:'Condition',garage:'Garage/carport',view:'View',tenure:'Ownership'})[k]}: ${subject(k)}`);
 if(details.length)overview+='\n\n'+details.join('; ')+'.';
 if(n(subject('price'))!==null)overview+=`\n\nThe subject’s reported asking price is ${money(subject('price'))}${subject('dom')?' with '+subject('dom')+' reported days on market':''}. This is an asking price, not evidence of an achieved sale price.`;
 out.push({title:'Subject Property',body:overview});
 const market=[];const trend=[[23,'depressed'],[24,'slow'],[25,'stable'],[26,'improving'],[27,'excellent']].find(([i])=>v['field_00'+i]===true);if(trend)market.push('The market is characterized as '+trend[1]+'.');if(t(v.field_0053))market.push('Typical marketing time is approximately '+v.field_0053+' days.');for(const [flag,pct,months,verb] of [[33,31,32,'decreased'],[36,34,35,'increased']])if(v['field_00'+flag]===true&&n(v.market_price_change_percent??v['field_00'+pct])!==null)market.push(`Reported prices have ${verb} ${num(v.market_price_change_percent??v['field_00'+pct])}%${t(v.market_price_change_months??v['field_00'+months])?' over '+(v.market_price_change_months??v['field_00'+months])+' months':''}.`);
 if(v.field_0037===true)market.push('Reported market prices are stable'+(t(v.market_price_change_months)?' over '+v.market_price_change_months+' months':'')+'.');
 if(n(v.market_months_supply)!==null)market.push('Reported inventory is '+num(v.market_months_supply)+' months of supply.');
 for(const [area,label] of [['zip','ZIP '+(t(v.market_zip)||'area')],['county',t(v.market_county)||'County area']]){
  const p='market_'+area+'_',stats=[];
  if(n(v[p+'median_home_value'])!==null)stats.push('median home value of '+money(v[p+'median_home_value']));
  if(n(v[p+'median_list_price'])!==null)stats.push('median list price of '+money(v[p+'median_list_price']));
  if(n(v[p+'list_price_12month_change'])!==null){const change=n(v[p+'list_price_12month_change']);stats.push('list prices '+(change===0?'unchanged':(change>0?'up ':'down ')+num(Math.abs(change))+'%')+' over 12 months');}
  if(n(v[p+'median_home_age'])!==null)stats.push('median home age of '+num(v[p+'median_home_age'])+' years');
  if(stats.length)market.push(label+' reports '+stats.join(', ')+'.');
 }
 const occupancy=[];if(n(v.field_0038)!==null)occupancy.push(num(v.field_0038)+'% owner occupied');if(n(v.field_0039)!==null)occupancy.push(num(v.field_0039)+'% renter occupied');if(occupancy.length)market.push('Reported neighborhood occupancy is '+occupancy.join(' and ')+'.');
 if(Object.keys(v).some(k=>/^market_(zip|county)_median/.test(k)&&n(v[k])!==null))market.push('These area-wide statistics provide market context; they are not the subject’s value or a substitute for comparable-property evidence.');
 if(notes.market)market.push(notes.market);if(!market.length)market.push('Market conditions and exposure time have not been established in the supplied BPO information.');
 out.push({title:'Neighborhood and Market Conditions',body:market.join(' ')});
 for(const kind of ['sold','active']){
 if(kind==='active'&&notes.competition)out.push({title:'Competitive Listings Context',body:notes.competition});
 for(let i=1;i<=3;i++){const p=kind+'.'+i+'.',g=k=>t(v[p+k]);if(!g('address'))continue;let body=kind==='sold'?`This property ${n(g('price'))!==null?'sold for '+money(g('price')):'has no reported sale price'}${g('date')?' on '+g('date'):''}${g('dom')?', after '+g('dom')+' days on market':''}.`:`This property is offered at ${money(g('price'))}${g('dom')?' with '+g('dom')+' reported days on market':''}.`;
 const descriptors=[g('gla')?num(g('gla'))+' square feet':'',g('beds')?g('beds')+' bedrooms':'',g('baths')?g('baths')+' bathrooms':'',g('year')?'built in '+g('year'):''].filter(Boolean);if(descriptors.length)body+=' It has '+descriptors.join(', ')+'.';
 if(g('financing'))body+=' Reported financing/concessions: '+g('financing')+'.';
 const delta=n(g('gla'))!==null&&n(subject('gla'))!==null?n(g('gla'))-n(subject('gla')):null;if(delta!==null)body+=delta===0?' Its living area matches the subject.':` It is ${num(Math.abs(delta))} square feet ${delta>0?'larger':'smaller'} than the subject.`;
 const adjustments=Object.entries(labels).filter(([k])=>n(g('adj_'+k))!==null&&n(g('adj_'+k))!==0).map(([k,label])=>`${label} (${n(g('adj_'+k))>0?'+':''}${money(g('adj_'+k))})`);
 if(adjustments.length)body+='\n\nThe BPO adjusts for '+adjustments.join(', ')+'.';
 if(g('design'))body+=' The comparable design is described as '+g('design')+'.';
 const designKey=p+'adj_design',generated=v._adjustments?.generated?.[designKey];
 if(generated&&n(v[designKey])===n(generated.value)&&n(g('adj_design'))!==null&&n(g('adj_design'))!==0&&n(v._adjustments?.globals?.design)>0){body+=' Under the preparer’s single-story preference, this '+(n(g('adj_design'))>0?'adds to the inferior multistory/upper-floor comparable to reflect the single-story subject':'deducts from the superior single-story comparable to reflect the multistory/upper-floor subject')+'.';}
 if(n(g('adjusted'))!==null)body+=` The resulting adjusted ${kind==='sold'?'sale-price':'asking-price'} indication is ${money(g('adjusted'))}.`;
 const key=kind+'.'+i;if(notes[key])body+='\n\n'+notes[key];
 if(notes.primary===key)body+=' This is the preparer’s selected primary sold comparable.';
 if(kind==='active'&&notes.primaryActive===key)body+=' The preparer selected this as the primary active/pending comparable'+(t(notes.primaryActiveReason)?' because '+notes.primaryActiveReason:'.')+(t(notes.primaryActiveReason)&&!/[.!?]$/.test(notes.primaryActiveReason)?'.':'');
 if(kind==='active')body+=' An active or pending asking price is not a closed-sale price; final contract terms and concessions remain unconfirmed.';
 out.push({title:`${kind==='sold'?'Sold':'Active / Pending'} Comparable ${i} - ${g('address')}`,body});
 }}
 let conclusion=t(notes.conclusion)||t(v.field_0482);if(!conclusion)conclusion='The value opinion below reflects the preparer’s judgment. Relative comparable weighting and its rationale have not been supplied.';
 if(notes.primary&&v[notes.primary+'.address'])conclusion+=` Greatest weight is assigned by the preparer to ${v[notes.primary+'.address']}${t(notes.primaryReason)?' because '+notes.primaryReason:'. The supporting rationale has not been supplied.'}${t(notes.primaryReason)&&!/[.!?]$/.test(notes.primaryReason)?'.':''}`;
 if(/^active\.[1-3]$/.test(notes.primaryActive||'')&&v[notes.primaryActive+'.address'])conclusion+=' The primary competitive listing is '+v[notes.primaryActive+'.address']+'. Its asking price provides competitive context, not a verified closed-sale value.';
 conclusion+=`\n\n${n(v.field_0477)!==null?'The concluded as-is market value is '+money(v.field_0477)+'.':'An as-is value opinion has not yet been finalized.'}${n(v.field_0478)!==null?' The suggested list price is '+money(v.field_0478)+'.':''}`;
 if(n(subject('price'))!==null&&n(v.field_0477)!==null){const d=n(subject('price'))-n(v.field_0477);conclusion+=d===0?' The reported asking price equals this opinion.':` The reported asking price is ${money(Math.abs(d))} ${d>0?'above':'below'} the concluded value.`;}
 out.push({title:'Value Conclusion',body:conclusion});return require('./summary-analysis.cjs').refine(v,out);
}
module.exports={sections};

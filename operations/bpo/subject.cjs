'use strict';
// General BPO entry order follows the descriptive rows on the approved form.
const subjectRows=[['location','Location'],['site','Site / lot size'],['view','View'],['design','Design and appeal'],['quality','Construction quality'],['year','Year built'],['condition','Condition'],['rooms','Total rooms'],['beds','Bedrooms'],['baths','Bathrooms'],['gla','Gross living area (sq. ft.)'],['basement','Basement / finished area'],['utility','Functional utility'],['hvac','Heating / cooling'],['energy','Energy efficient items'],['garage','Garage / carport'],['porches','Porch / patio / deck'],['fireplace','Fireplace'],['fence','Fence'],['pool','Pool'],['other','Other']];
function recentSale(v,now=new Date()) {
 const raw=String(v['sold.0.date']||'').trim();
 if(!/^(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})$/.test(raw))return false;
 const parts=raw.includes('/')?raw.split('/').map(Number):raw.split('-').map(Number);
 const [year,month,day]=raw.includes('/')?[parts[2],parts[0],parts[1]]:parts;
 const sale=new Date(Date.UTC(year,month-1,day));
 if(sale.getUTCFullYear()!==year||sale.getUTCMonth()!==month-1||sale.getUTCDate()!==day)return false;
 const cutoff=new Date(now);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-3);cutoff.setUTCHours(0,0,0,0);
 const evidence=v._aiFields?.['sold.0.date'];
 const doc=(v._attachments||[]).find(d=>d.path===evidence?.path);
 return sale>=cutoff&&sale<=now&&!!evidence&&!evidence.removed&&doc?.category==='subject'&&doc.sourceKind!=='tax'&&doc?.packageRole!=='tax'&&/MLS|sold|closed|closing|sale/i.test(evidence.evidence||'');
}
function defaults(input){
 if(input._clientTemplate==='rrr')return {...input};
 const v={...input,_generalDefaults:{...(input._generalDefaults||{})}};
 for(const p of ['sold','active']){
  for(let i=0;i<4;i++)if(v[`${p}.${i}.tenure`]===undefined||v[`${p}.${i}.tenure`]==='')v[`${p}.${i}.tenure`]='Fee Simple';
  const key=p+'.0.utility';if(v[key]===undefined){v[key]='Average';v._generalDefaults[key]='Average';}
 }
 return v;
}
function fields(v,schema,now){
 const byName=new Map(schema.map(f=>[f.name,f]));
 const rows=[['active.0.price','List / asking price']];
 if(recentSale(v,now))rows.push(['sold.0.price','Sale price'],['sold.0.date','Sale date']);
 rows.push(['sold.0.source','Data source'],['sold.0.dom','Days on market'],...subjectRows.map(([key,label])=>['sold.0.'+key,label]));
 return rows.map(([name,label])=>({...byName.get(name),label}));
}
module.exports={generalSubjectDefaults:defaults,generalSubjectFields:fields,recentSubjectSale:recentSale};

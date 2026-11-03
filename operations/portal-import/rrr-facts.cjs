'use strict';
// BPO Bathrooms uses whole/half counts, not MLS full.half shorthand (2.1).
function baths(value){
 const s=String(value??'').trim();
 const labeled=s.match(/^(\d+)\s*full(?:\s*baths?)?\s*[,/;+&-]?\s*(\d+)\s*half(?:\s*baths?)?$/i);
 if(labeled)return {full:+labeled[1],half:+labeled[2]};
 if(/^\d+(?:\.0+|\.5)?$/.test(s)){const n=Number(s);return {full:Math.floor(n),half:n%1===0.5?1:0};}
 return null;
}
function garage(value){
 const s=String(value??'').trim().toLowerCase().replace(/-/g,' ').replace(/\s+/g,' ');
 if(/^\d+$/.test(s))return {count:Number(s)};
 if(/^(none|no garage|no garage or carport)$/.test(s))return {type:'None',count:0};
 const m=s.match(/^(?:(\d+)\s*(?:car\s*)?)?(attached|detached|built in)(?:\s*garage)?$/)||s.match(/^(\d+)\s*car\s+(attached|detached|built in)\s+garage$/);
 if(m)return {type:{attached:'Attached',detached:'Detached','built in':'Built-in'}[m[2]],...(m[1]===undefined?{}:{count:Number(m[1])})};
 if(/^(?:\d+\s*(?:car\s*)?)?carport$/.test(s))return {type:'Carport'};
 return null;
}
function area(gla,basement){
 const s=String(gla??'').trim().replace(/,/g,'');
 const m=s.match(/^(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|sf)?(?:\s*(?:above[ -]grade))?$/i);
 const noBasement=/^(no|none|no basement|0(?:\s*(?:sf|sq\.?\s*ft))?)$/i.test(String(basement??'').trim());
 if(m&&+m[1]>0&&(noBasement||/above[ -]grade/i.test(s)))return {living:+m[1],...(noBasement?{basement:0}:{})};
 return null;
}
function mls(value){
 const s=String(value??'').trim();if(/^[A-Z]{1,4}\d{5,12}$/i.test(s))return s.toUpperCase();if(!/\bMLS\b/i.test(s))return null;
 const ids=[...s.matchAll(/\b[A-Z]{1,4}\d{5,12}\b/gi)].map(m=>m[0].toUpperCase());
 return new Set(ids).size===1?ids[0]:null;
}
function concession(value){const s=String(value??'').trim().replace(/[$,]/g,'');return /^\d+(?:\.0+)?$/.test(s)?Number(s):null;}
function propertyType(value){return /^single family (?:residence|reside\.\.\.)$/i.test(String(value??'').trim())?'Single Family':null;}
function airConditioning(value){return /\b(?:central air|air conditioning|a\/c)\b/i.test(String(value??''))&&!/\b(no|not|without|unknown)\b/i.test(String(value??''));}
function lotAcres(value){
 const s=String(value??'').replace(/,/g,'').trim();
 const single=s.match(/^(\d+(?:\.\d+)?)\s*(acres?|ac|sq\.?\s*ft\.?|sqft|sf)$/i);
 if(single)return Number(single[1])/(single[2].toLowerCase().startsWith('ac')?1:43560);
 const dual=s.match(/^(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|sqft|sf)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:sqm|sq\.?\s*m\.?|m2)$/i);
 if(dual&&Number(dual[1])>0&&Math.abs(Number(dual[1])*0.09290304-Number(dual[2]))<=Math.max(1,Number(dual[2])*0.01))return Number(dual[1])/43560;
 return null;
}
module.exports={lotAcres,baths,garage,area,mls,concession,propertyType,airConditioning};

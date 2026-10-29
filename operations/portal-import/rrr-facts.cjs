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
module.exports={baths,garage,area};

'use strict';
const rateKeys=['garageBayRate','detachedGarageBayRate','carportBayRate'];
const types={attached:'garageBayRate',detached:'detachedGarageBayRate',carport:'carportBayRate'};
function counts(value){
 const raw=String(value??'').trim().toLowerCase().replace(/[–—-]/g,' ').replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g,w=>String(['one','two','three','four','five','six','seven','eight','nine','ten'].indexOf(w)+1));
 if(!raw)return null;
 const result={attached:0,detached:0,carport:0,unspecified:0};
 if(/^(?:none|no(?: garage| carport| garage or carport)?|0)\.?$/.test(raw))return result;
 const seen=new Set();
 for(const part of raw.split(/\s*(?:[,;+\/]|\band\b)\s*/)){
  let n,type;
  let m=part.trim().match(/^(\d+)\s*(?:(?:car|bay|space|stall)s?\s*)?(?:(attached|detached)\s*(?:garage)?|garage(?:\s*(attached|detached))?|(carport))$/);
  if(m){n=+m[1];type=m[2]||m[3]||m[4]||'unspecified';}
  else{
   m=part.trim().match(/^(attached|detached|carport|garage)\s*(?:garage\s*)?(?:(?:spaces?|bays?|stalls?)\s*)?[:=]?\s*(\d+)\s*(?:(?:car|bay|space|stall)s?)?$/);
   if(!m)return null;n=+m[2];type=m[1]==='garage'?'unspecified':m[1];
  }
  if(!Number.isSafeInteger(n)||seen.has(type))return null;
  seen.add(type);result[type]=n;
 }
 return result;
}
function rateIssues(globals,number){
 const rates=Object.fromEntries(rateKeys.map(k=>[k,number(globals[k])]));
 const errors=[];
 if(rates.garageBayRate!==null&&rates.detachedGarageBayRate!==null&&rates.detachedGarageBayRate>rates.garageBayRate)errors.push('Detached garage value per bay must not exceed the attached garage value per bay.');
 for(const key of ['garageBayRate','detachedGarageBayRate'])if(rates.carportBayRate!==null&&rates[key]!==null&&rates.carportBayRate>rates[key])errors.push('Carport value per bay must not exceed the garage value per bay.');
 return [...new Set(errors)];
}
function adjustment(subject,comp,globals,number){
 const errors=rateIssues(globals,number);if(errors.length)return {reason:errors[0]};
 for(const key of rateKeys)if(String(globals[key]??'').trim()&&(number(globals[key])===null||number(globals[key])<0))return {reason:'Parking factors must be nonnegative dollar amounts per bay.'};
 const sub=counts(subject),other=counts(comp);
 if(!sub||!other||sub.unspecified||other.unspecified)return {reason:'Garage adjustment needs bay counts and types for both properties, such as 2 attached, 1 detached, 1 carport, or None. Review the garage / carport descriptions.'};
 let amount=0;
 for(const [type,key] of Object.entries(types)){
  const diff=sub[type]-other[type];if(!diff)continue;
  const rate=number(globals[key]);if(rate===null)return {reason:'Enter a '+type+' value per bay to account for the differing parking types/counts, or enter an individual garage adjustment.'};
  amount+=diff*rate;
 }
 return {amount};
}
module.exports={rateKeys,counts,rateIssues,adjustment};

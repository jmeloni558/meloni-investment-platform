'use strict';
const prefixes=['sold','active'].flatMap(k=>[0,1,2,3].map(i=>`${k}.${i}.`));
function mlsNumber(value){
 const s=String(value??'').trim();
 const labeled=s.match(/\bMLS\s*(?:number|no\.?|id|#)?\s*[:#-]?\s*([A-Z]*\d[A-Z0-9-]*)\b/i);
 if(labeled)return labeled[1];
 if(/^[A-Z]*\d[A-Z0-9-]*$/i.test(s))return s;
 const candidates=s.match(/\b[A-Z]{1,4}\d{5,12}\b/gi)||[];
 return candidates.length===1?candidates[0]:'';
}
function saleDate(value){
 const s=String(value??'').trim(),m=s.match(/^(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4}))$/);
 if(!m)return s;
 const year=m[1]?+m[1]:m[6].length===2?(+m[6]<70?2000:1900)+ +m[6]:+m[6],month=+(m[2]||m[4]),day=+(m[3]||m[5]);
 const d=new Date(Date.UTC(year,month-1,day));
 return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?`${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}/${String(year).slice(-2)}`:s;
}
function storyDesign(value,evidence=''){
 const s=String(value??'').trim();
 if(/^condo(?:minium)?$/i.test(s))return 'Condo';
 const text=s+' '+evidence;
 const one=/\b(?:one|1|single)[ -]?(?:stor(?:y|ies)|level)\b|\b(?:stories|levels|floors)\s*:\s*(?:1|one)\b/i.test(text);
 const two=/\b(?:two|2)[ -]?(?:stor(?:y|ies)|level)\b|\b(?:stories|levels|floors)\s*:\s*(?:2|two)\b/i.test(text);
 return one&&!two?'Ranch':two&&!one?'2 Story':s;
}
function lotSquareFeet(value,unit='sqft'){
 const s=String(value??'').trim().replace(/,/g,'');if(!s)return null;
 const explicit=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(acres?|ac\b|sq\.?\s*ft\.?|sf\b|square feet)/gi)];
 if(explicit.length){const amounts=explicit.map(m=>+m[1]*(/^ac/i.test(m[2])?43560:1));if(amounts.some(n=>Math.abs(n-amounts[0])>Math.max(1,amounts[0]*.01)))return null;return amounts.find((n,i)=>!/^ac/i.test(explicit[i][2]))??amounts[0];}
 return /^\d+(?:\.\d+)?$/.test(s)?Number(s)*(unit==='acres'?43560:1):null;
}
function lotDisplay(sqft,unit){return sqft===null?'':String(Number((unit==='acres'?sqft/43560:sqft).toFixed(2)));}
function generalFields(input){
 if(input._clientTemplate==='rrr')return {...input};
 const v={...input,_aiFields:{...(input._aiFields||{})},_generalDefaults:{...(input._generalDefaults||{})},_lotAreas:{...(input._lotAreas||{})},_lotUnit:input._lotUnit==='acres'?'acres':'sqft'};
 const set=(key,value)=>{const previous=v[key];v[key]=value;if(v._aiFields[key]&&v._aiFields[key].value===previous)v._aiFields[key]={...v._aiFields[key],value};};
 for(const p of prefixes){
  for(const key of ['condition','other']){const name=p+key;if(v._aiFields[name]&&v._aiFields[name].value===v[name])v[name]='';delete v._aiFields[name];}
  if(v[p+'source']!==undefined){if(!v[p+'status']&&/\bpending\b|under contract/i.test(v[p+'source']))v[p+'status']='Pending';set(p+'source',mlsNumber(v[p+'source']));}
  if(v[p+'date']!==undefined)set(p+'date',saleDate(v[p+'date']));
  const design=p+'design';if(v._aiFields[design]&&v._aiFields[design].value===v[design])set(design,storyDesign(v[design],v._aiFields[design].evidence));
  else if(v[design]===undefined&&v[p+'stories']!==undefined){v[design]=storyDesign(v[p+'stories']+' stories');v._generalDefaults[design]=v[design];}
  const energy=p+'energy';if(v[energy]===undefined||(!input._generalFieldDefaultsVersion&&v[energy]==='')){v[energy]='None';v._generalDefaults[energy]='None';}
  const key=p+'site',raw=String(v[key]??''),cached=v._lotAreas[key];
  const sqft=cached&&cached.display===raw?cached.sqft:lotSquareFeet(raw,v._lotUnit);
  const display=lotDisplay(sqft,v._lotUnit);if(v[key]!==undefined)set(key,display);v._lotAreas[key]={sqft,display};
 }
 for(const [key,value] of Object.entries({field_0015:'Meloni Realty, Inc.',field_0018:'Jamie Meloni',field_0019:'813-760-8516',field_0021:'jamie@melonirealty.com',field_0484:'Jamie Meloni'}))if(v[key]===undefined||(!input._generalFieldDefaultsVersion&&v[key]==='')){v[key]=value;v._generalDefaults[key]=value;}
 for(const [key,group] of [['bpo_type_desktop',['bpo_type_desktop','field_0007','bpo_type_interior','field_0005']],['field_0259',['field_0259','field_0260','field_0261']],['field_0262',['field_0262','field_0263']]])if(!input._generalFieldDefaultsVersion&&!group.some(n=>v[n]===true))v[key]=true;
 v._generalFieldDefaultsVersion=1;return v;
}
function setLotUnit(input,unit){
 if(input._clientTemplate==='rrr')return {...input};
 const v=generalFields(input),previousUnit=v._lotUnit;v._lotUnit=unit==='acres'?'acres':'sqft';
 const rate=String(v._adjustments?.globals?.siteRate??'').trim(),n=Number(rate.replace(/[$,]/g,''));
 if(previousUnit!==v._lotUnit&&rate&&Number.isFinite(n)&&n>=0){v._adjustments=structuredClone(v._adjustments);v._adjustments.globals.siteRate=String(v._lotUnit==='acres'?n*43560:n/43560);}
 for(const p of prefixes){const key=p+'site',area=v._lotAreas[key];if(v[key]!==undefined){const old=v[key];v[key]=lotDisplay(area.sqft,v._lotUnit);if(v._aiFields[key]&&v._aiFields[key].value===old)v._aiFields[key]={...v._aiFields[key],value:v[key]};}v._lotAreas[key]={...area,display:lotDisplay(area.sqft,v._lotUnit)};}
 return v;
}
module.exports={mlsNumber,saleDate,storyDesign,lotSquareFeet,generalFields,setLotUnit};

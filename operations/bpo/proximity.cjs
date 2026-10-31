'use strict';
const {splitAddress}=require('./form-v14.cjs');
const prefixes=['sold.1','sold.2','sold.3','active.1','active.2','active.3'];
const aliases={street:'st',avenue:'ave',road:'rd',drive:'dr',lane:'ln',court:'ct',circle:'cir',boulevard:'blvd',place:'pl',terrace:'ter',trail:'trl',parkway:'pkwy',highway:'hwy',north:'n',south:'s',east:'e',west:'w',northeast:'ne',northwest:'nw',southeast:'se',southwest:'sw',apartment:'unit',apt:'unit',suite:'unit',ste:'unit'};
function words(s){return String(s||'').toLowerCase().replace(/#/g,' unit ').replace(/[^a-z0-9\s]/g,' ').trim().split(/\s+/).map(w=>aliases[w]||w).join(' ');}
function addressKey(address){const p=splitAddress(address);if(!p.city||!p.state||!p.zip||!/^\d+[a-z]?\s/i.test(p.address||''))return '';return [words(p.address),words(p.city),p.state.toUpperCase(),p.zip.slice(0,5)].join('|');}
function fullAddress(v,p){const street=v[p+'.address']||'';if(splitAddress(street).city)return street;return [street,v[p+'.city'],[v[p+'.state'],v[p+'.zip']].filter(Boolean).join(' ')].filter(Boolean).join(', ');}
function subjectAddress(v){return v.field_0008||fullAddress(v,'sold.0');}
function coordinate(value,min,max){if(value===null||value===undefined||typeof value==='boolean'||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null;}
function point(p){if(!p)return null;const latitude=coordinate(p.latitude,-90,90),longitude=coordinate(p.longitude,-180,180);return latitude===null||longitude===null?null:{latitude,longitude};}
function matchedPoint(address,response){
 const key=addressKey(address);if(!key)return null;
 const candidates=Array.isArray(response?.candidates)&&response.candidates.length?response.candidates:[response?.property].filter(Boolean),matches=[];
 for(const p of candidates){const street=[p.addressLine1,p.addressLine2].filter(Boolean).join(' '),full=[street,p.city,[p.state,p.zipCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');if((addressKey(full)||addressKey(p.formattedAddress))!==key)continue;const pos=point(p);if(pos)matches.push({...pos,matchedAddress:p.formattedAddress||full,source:'RentCast property coordinates'});}
 if(!matches.length||matches.some(p=>p.latitude!==matches[0].latitude||p.longitude!==matches[0].longitude))return null;
 return matches[0];
}
function straightLineMiles(a,b){a=point(a);b=point(b);if(!a||!b)return null;const rad=x=>x*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;return 3958.7613*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
function formatMiles(miles){if(typeof miles!=='number'||!Number.isFinite(miles)||miles<0)return '';const rounded=Math.round((miles+Number.EPSILON)*10)/10;return (rounded<1?rounded.toFixed(1):String(rounded))+' mi';}
function applyProximity(input){
 if(input._clientTemplate==='rrr'||!input._proximity)return {...input};
 const v={...input},coordinates=input._proximity.coordinates||{},subjectKey=addressKey(subjectAddress(v)),a=coordinates[subjectKey];
 for(const p of prefixes){const key=addressKey(fullAddress(v,p)),b=coordinates[key];v[p+'.distance']=a&&b?formatMiles(straightLineMiles(a,b)):'';if(v._aiFields?.[p+'.distance']){v._aiFields={...v._aiFields};delete v._aiFields[p+'.distance'];}}
 return v;
}
async function resolveProximity(input,lookup){
 if(input._clientTemplate==='rrr')return {values:input,warnings:[]};
 const addresses=[subjectAddress(input),...prefixes.filter(p=>input[p+'.address']).map(p=>fullAddress(input,p))],coordinates={...(input._proximity?.coordinates||{})},warnings=[];
 if(!prefixes.some(p=>input[p+'.address']))return {values:applyProximity({...input,_proximity:{coordinates}}),warnings};
 const seen=new Set();
 for(const address of addresses){const key=addressKey(address);if(!key){warnings.push('Enter a full street address, city, state and ZIP to calculate proximity: '+(address||'subject'));continue;}if(seen.has(key))continue;seen.add(key);if(point(coordinates[key]))continue;
  try{const response=await lookup(address),p=matchedPoint(address,response);if(p)coordinates[key]=p;else warnings.push('Proximity left blank: no unique matching coordinates for '+address+'.');}catch{warnings.push('Proximity left blank: address lookup unavailable for '+address+'.');}
 }
 // Retain only coordinates for the current subject and comparable addresses.
 const current=Object.fromEntries(Object.entries(coordinates).filter(([key])=>seen.has(key)));
 return {values:applyProximity({...input,_proximity:{method:'straight-line',units:'miles',coordinates:current,warnings}}),warnings};
}
module.exports={addressKey,matchedPoint,straightLineMiles,formatMiles,applyProximity,resolveProximity};

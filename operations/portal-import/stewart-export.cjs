'use strict';
const {mls,baths,lotAcres}=require('./rrr-facts.cjs');
const remarks=require('./rrr-adjustment-remarks.cjs');
const clean=value=>String(value??'').trim();

function exportStewart(values){
  if(values._clientTemplate!=='stewart')throw Error('Choose Stewart before exporting.');
  const subject=Object.fromEntries(['address','city','state','zip'].map(key=>[key,clean(values['sold.0.'+key])]));
  if(Object.values(subject).some(value=>!value))throw Error('Complete the subject address, city, state and ZIP before exporting.');
  const comps=[];
  for(const kind of ['sold','active'])for(let slot=1;slot<=3;slot++){
    const prefix=kind+'.'+slot+'.';
    const address=clean(values[prefix+'address']);
    if(!address)continue;
    const comments=clean(values['stewart.'+prefix+'comments']);
    const fields={Comments:[comments,remarks(values,prefix)].filter(Boolean).join(' ')};
    const get=key=>clean(values[prefix+key]);
    const bath=baths(get('baths'));
    Object.assign(fields,{BedroomCount:get('beds'),BathroomCount:clean(bath?.full),HalfBathCount:clean(bath?.half),
      LivingArea:get('gla'),TotalRooms:get('rooms'),DaysOnMarket:get('dom'),YearBuilt:get('year'),
      [kind==='sold'?'SalePrice':'CurrentListPrice']:get('price')});
    const acres=lotAcres(get('site'));
    if(acres!==null)fields.LotSize=String(Math.round(acres*43560));
    const locality=['city','state','zip'].map(key=>clean(values[prefix+key])).filter(Boolean).join(' ');
    comps.push({kind,address,locality,zip:get('zip'),mls:mls(values[prefix+'source'])||'',fields:Object.fromEntries(Object.entries(fields).filter(([,value])=>value))});
  }
  if(!comps.length)throw Error('Prepare at least one comparable with a street address.');
  return {format:'propertythesis-stewart',version:1,subject,comps};
}
module.exports={exportStewart};

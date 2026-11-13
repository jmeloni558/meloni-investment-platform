'use strict';
const {saleDate,mlsNumber}=require('../bpo/general-fields.cjs');
const {baths,lotAcres,garage}=require('./rrr-facts.cjs');
const {concession}=require('../bpo/adjustments.cjs');
const neighborhood=require('./rrr-neighborhood.cjs').neighborhood;
const adjKeys={financing:'FinancingConcessions',location:'LocationType',site:'LotSize',view:'AdjustedViewPrice',year:'YearBuilt',condition:'ConditionType',gla:'LivingArea',garage:'GarageBayCount',pool:'AdjustedPoolAndSpaPrice'};
const {normalizeStewartComp}=require('./stewart/comp-address.js');
const clean=value=>String(value??'').trim();

function fannieFacts(values,prefix){
  const facts={};
  for(const key of ['FannieMaePropertyType','FnmaConditionType','FloorLocationIfCondoTownhouse','NumberOfFloorsInBuildingIfCondoTownhouse']){
    const v=clean(values['fnma.'+prefix+key]);if(v)facts[key]=v;
  }
  return facts;
}
function exportStewart(values){
  const fannie=values._clientTemplate==='stewart-fannie';
  if(!fannie&&values._clientTemplate!=='stewart')throw Error('Choose Stewart before exporting.');
  const subject=Object.fromEntries(['address','city','state','zip'].map(key=>[key,clean(values['sold.0.'+key])]));
  if(Object.values(subject).some(value=>!value))throw Error('Complete the subject address, city, state and ZIP before exporting.');
  const comps=[];
  for(const kind of ['sold','active'])for(let slot=1;slot<=3;slot++){
    const prefix=kind+'.'+slot+'.';
    const address=clean(values[prefix+'address']);
    if(!address)continue;
    const comments=clean(values['stewart.'+prefix+'comments']);
    const fields={Comments:comments};
    const get=key=>clean(values[prefix+key]);
    const bath=baths(get('baths'));
    Object.assign(fields,{BedroomCount:get('beds'),BathroomCount:clean(bath?.full),HalfBathCount:clean(bath?.half),
      LivingArea:get('gla'),TotalRooms:get('rooms'),DaysOnMarket:get('dom'),YearBuilt:get('year'),
      [kind==='sold'?'SalePrice':'CurrentListPrice']:get('price')});
    if(kind==='sold'){
      const amount=concession(get('financing'),Number(get('price').replace(/[$,]/g,''))).amount;
      if(amount!=null)fields.FinancingConcessions=String(amount);
    }
    const ratings=['Excellent','Good','Average','Fair','Poor'];
    for(const [key,target] of [['condition','ConditionType'],['location','LocationType'],['view','ViewType']]){
      const rating=ratings.find(r=>r.toLowerCase()===get(key).toLowerCase());
      if(rating)fields[target]=rating;
    }
    for(const [key,target] of [['stories','Stories'],['heating','HeatingType'],['cooling','CoolingType'],['fuel','FuelType'],['water','WaterSource'],['sewer','WasteDisposal'],['units','UnitsInProperty']]){
      if(get(key))fields[target]=get(key);
    }
    const parking=garage(get('garage'));
    if(parking){if(parking.type)fields.GarageType=parking.type.replace('Built-in','Built In');if(parking.count!=null)fields.GarageBayCount=String(parking.count);}
    const adjustments={},manualAdjustments=[];
    if(!fannie){
    for(const key of ['tenure','design','quality','rooms','basement','utility','hvac','energy','porches','fireplace','fence','other']){
      const raw=get('adj_'+key).replace(/[$,]/g,'');
      if(/^[+-]?\d+(?:\.\d+)?$/.test(raw)&&Number(raw)!==0)manualAdjustments.push(key+': '+raw);
    }
    for(const [key,target] of Object.entries(adjKeys)){
      const raw=get('adj_'+key).replace(/[$,]/g,'');
      if(/^[+-]?\d+(?:\.\d+)?$/.test(raw)&&Number(raw)!==0)adjustments[target]=String(Number(raw));
    }
    }else{
      for(const [old,key] of Object.entries({BedroomCount:'UnitBedroomCount_1',BathroomCount:'UnitBathCount_1',HalfBathCount:'UnitHalfBathCount_1',TotalRooms:'UnitRoomCount_1',FinancingConcessions:'SalesConcessions'})){
        if(fields[old])fields[key]=fields[old];delete fields[old];
      }
      for(const k of ['WaterSource','WasteDisposal','ConditionType'])delete fields[k];
      if(kind==='sold')fields.SaleDate=saleDate(get('date'));
      Object.assign(fields,fannieFacts(values,prefix));
    }
    const acres=lotAcres(get('site'));
    if(acres!==null)fields.LotSize=String(Math.round(acres*43560));
    const cached=values._lotAreas?.[prefix+'site'];
    if(cached?.display===get('site')&&Number.isFinite(cached.sqft))fields.LotSize=String(Math.round(cached.sqft));
    const locality=['city','state','zip'].map(key=>clean(values[prefix+key])).filter(Boolean).join(' ');
    comps.push({kind,...(fannie?{}:{adjustments,manualAdjustments}),address,locality,zip:get('zip'),mls:mlsNumber(values[prefix+'source'])||'',fields:Object.fromEntries(Object.entries(fields).filter(([,value])=>value))});
  }
  if(!comps.length)throw Error('Prepare at least one comparable with a street address.');
  const orderFields={};
  for(const [src,dest] of [['field_0038','Neighborhood_OwnerOccupancyPercentage'],['field_0039','Neighborhood_TenantOccupancyPercentage'],['field_0053','Neighborhood_AverageMarketingTime']]){
    if(clean(values[src]))orderFields[dest]=clean(values[src]);
  }
  const narrative=neighborhood(values);if(narrative)orderFields.Neighborhood_GeneralNeighborhoodComments=narrative;
  if(fannie){
    const s=k=>clean(values['sold.0.'+k]);
    const bath=baths(s('baths'));
    const facts={...fannieFacts(values,'sold.0.'),LivingArea:s('gla'),YearBuilt:s('year'),Stories:s('stories'),UnitBedroomCount_1:s('beds'),UnitRoomCount_1:s('rooms'),UnitBathCount_1:clean(bath?.full),UnitHalfBathCount_1:clean(bath?.half),HeatingType:s('heating'),CoolingType:s('cooling'),FuelType:s('fuel')};
    for(const [k,v] of Object.entries(facts))if(v)orderFields['Subject_'+k]=v;
  }
  return {orderFields,format:fannie?'propertythesis-stewart-fannie':'propertythesis-stewart',version:1,subject,comps:fannie?comps.map(normalizeStewartComp):comps};
}
module.exports={exportStewart};

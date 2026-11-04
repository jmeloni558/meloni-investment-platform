'use strict';
const {mls,baths,lotAcres,garage}=require('./rrr-facts.cjs');
const neighborhood=require('./rrr-neighborhood.cjs').neighborhood;
const adjKeys={financing:'SalesConcessions',location:'LocationType',site:'LotSize',view:'AdjustedViewPrice',year:'YearBuilt',condition:'ConditionType',gla:'LivingArea',garage:'GarageBayCount',pool:'AdjustedPoolAndSpaPrice'};
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
    const fields={Comments:comments};
    const get=key=>clean(values[prefix+key]);
    const bath=baths(get('baths'));
    Object.assign(fields,{BedroomCount:get('beds'),BathroomCount:clean(bath?.full),HalfBathCount:clean(bath?.half),
      LivingArea:get('gla'),TotalRooms:get('rooms'),DaysOnMarket:get('dom'),YearBuilt:get('year'),
      [kind==='sold'?'SalePrice':'CurrentListPrice']:get('price')});
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
    for(const key of ['tenure','design','quality','rooms','basement','utility','hvac','energy','porches','fireplace','fence','other']){
      const raw=get('adj_'+key).replace(/[$,]/g,'');
      if(/^[+-]?\d+(?:\.\d+)?$/.test(raw)&&Number(raw)!==0)manualAdjustments.push(key+': '+raw);
    }
    for(const [key,target] of Object.entries(adjKeys)){
      const raw=get('adj_'+key).replace(/[$,]/g,'');
      if(/^[+-]?\d+(?:\.\d+)?$/.test(raw)&&Number(raw)!==0)adjustments[target]=String(Number(raw));
    }
    const acres=lotAcres(get('site'));
    if(acres!==null)fields.LotSize=String(Math.round(acres*43560));
    const cached=values._lotAreas?.[prefix+'site'];
    if(cached?.display===get('site')&&Number.isFinite(cached.sqft))fields.LotSize=String(Math.round(cached.sqft));
    const locality=['city','state','zip'].map(key=>clean(values[prefix+key])).filter(Boolean).join(' ');
    comps.push({kind,adjustments,manualAdjustments,address,locality,zip:get('zip'),mls:mls(values[prefix+'source'])||'',fields:Object.fromEntries(Object.entries(fields).filter(([,value])=>value))});
  }
  if(!comps.length)throw Error('Prepare at least one comparable with a street address.');
  const orderFields={};
  for(const [src,dest] of [['field_0038','Neighborhood_OwnerOccupancyPercentage'],['field_0039','Neighborhood_TenantOccupancyPercentage'],['field_0053','Neighborhood_AverageMarketingTime']]){
    if(clean(values[src]))orderFields[dest]=clean(values[src]);
  }
  const narrative=neighborhood(values);if(narrative)orderFields.Neighborhood_GeneralNeighborhoodComments=narrative;
  return {orderFields,format:'propertythesis-stewart',version:1,subject,comps};
}
module.exports={exportStewart};

(() => {
'use strict';
const choices = {
  'Occupancy': {Owner:'OCCUPANT_OWNER',Tenant:'OCCUPANT_TENANT',Vacant:'OCCUPANT_VACANT'},
  'Property type': {SFR:'PROP_TYPE_SINGLE_FAM',Coop:'PROP_TYPE_COOP',PUD:'PROP_TYPE_PUD','Multi-unit':'PROP_TYPE_MULTI',Manufactured:'PROP_TYPE_MANUFACTURED','Vacant land':'PROP_TYPE_VACANT_LAND',Other:'PROP_TYPE_OTHER',Condo:'PROP_TYPE_CONDO'},
  'Building type': {Attached:'BUILD_TYPE_ATTACHED',Detached:'BUILD_TYPE_DETACHED'},
  'Listed over prior 12 months': {Yes:'HIST_LIST_LAST_12_YES',No:'HIST_LIST_LAST_12_NO'},
  'Currently listed': {Yes:'LISTED_YES',No:'LISTED_NO'},
  'Recommend repairs': {Yes:'RECOMMENDED_REPAIRS_YES',No:'RECOMMENDED_REPAIRS_NO'},
  'Overall condition': {Good:'PROP_CONDITION_GOOD',Average:'PROP_CONDITION_AVG',Fair:'PROP_CONDITION_FAIR',Poor:'PROP_CONDITION_POOR'},
  'Location': {Urban:'NBHD_LOCATION_URBAN',Suburban:'NBHD_LOCATION_SUBURBN',Rural:'NBHD_LOCATION_RURAL'},
  'Similarity': {'Very similar':'NBHD_SIMILAR_VERY','Somewhat similar':'NBHD_SIMILAR_SOMEWHAT','Not similar':'NBHD_SIMILAR_NOT'},
  'Built out': {'Under 25%':'NBHD_BUILT_UP_UNDER25','25–75%':'NBHD_BUILT_UP_25TO75','Over 75%':'NBHD_BUILT_UP_OVER_75'}
};
const entries = {
  'Unit number':'UNIT_NUMBER','Multi-unit count':'PROP_TYPE_MULTI_NUM_UNITS','Project unit count':'PROJ_TOTAL_UNITS','Monthly dues':'PROJ_MO_FEES',
  'Original list date':'ORIGINAL_LIST_DATE','Original list price':'ORIGINAL_LIST_PRICE','Current / last list price':'CURRENT_LIST_PRICE','Total days on market':'CURRENT_LIST_DAYS_ON_MKT',
  'Subject observations':'SUBJ_INFO_CMNTS','Exterior paint cost':'EXT_PAINT_REPAIR_COST','Structural cost':'EXT_STRUCT_REPAIR_COST','Landscaping cost':'LANDSCAPING_REPAIR_COST','Roof cost':'ROOF_REPAIR_COST','Windows cost':'WINDOW_REPAIR_COST','Other repair cost':'EXT_OTHER_REPAIR_COST','Total repair cost':'REPAIR_COST_TOTAL','Condition comments':'PROP_CONDITION_CMNTS',
  'Market trend source':'NBHD_PROP_VALUE_TREND_SOURCE','Neighborhood comments':'NBHD_COMMENTS'
};
const grid = {address:'ADDRESS',city:'CITY',state:'STATE',zip:'ZIP_CODE',source:'DATA_SOURCE',dom:'DAYS_ON_MARKET',tenure:'LSHLD_FEE_SMPL',year:'YEAR_BUILT',condition:'CONDITION',gla:'GLA_SQFT',beds:'BEDROOMS',baths:'BATHS',basement:'BASEMENT',garage:'GARAGE_CARPORT',other:'OTHER'};
const page1=new Set(['COUNTY','NBHD_PRICE_LOW','NBHD_PRICE_HIGH','NBHD_PROP_VALUE_INCR_X','NBHD_PROP_VALUE_DECL_X','NBHD_PROP_VALUE_STAB_X','NBHD_PROP_VALUE_TREND_PCT','NBHD_PROP_VALUE_TREND_PERIOD','NBHD_PROP_VALUE_TREND_MO_X',...Object.values(entries),...Object.values(choices).flatMap(g=>Object.values(g).map(t=>t+'_X'))]);
function allowed(page,group,tag){
  if(page===1)return group==='SUBJECT'&&page1.has(tag);
  if(page!==2)return false;
  const sale=tag.startsWith('GS_'), listing=tag.startsWith('GL_');
  if(!sale&&!listing||group!=='SUBJECT'&&!(sale?/^COMP_SALES_[1-3]$/:/^COMP_LIST_[1-3]$/).test(group))return false;
  return [...Object.values(grid),'PROP_TYPE','LOT_SIZE','AMENITIES','PROJ_SIZE','EXT_FINISH','REO_SHORT_SALE',...(sale?['LISTED','COMMENTS']:[]),...(group!=='SUBJECT'?['PROXIMITY','COMMENTS']:[]),...(sale?['SALE_PRICE','DATE_TIME_O_SALE']:['LIST_PRICE','LIST_DATE'])].includes(tag.slice(3));
}
const boaSchema={choices,entries,grid,allowed};
if(typeof module!=='undefined')module.exports=boaSchema;
else globalThis.PTBOASchema=boaSchema;
})();

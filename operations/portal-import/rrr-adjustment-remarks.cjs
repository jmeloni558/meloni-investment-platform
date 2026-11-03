 'use strict';
// Describe the final entered line adjustments, never rates or source concessions again.
const labels={financing:'Seller concessions',location:'Location',tenure:'Property rights',site:'Site',view:'View',design:'Design',quality:'Quality',year:'Year built',condition:'Condition',rooms:'Rooms / beds / baths',gla:'Living area',basement:'Basement',utility:'Functional utility',hvac:'Heating / cooling',energy:'Energy efficient items',garage:'Garage / carport',porches:'Porch / patio / deck',fireplace:'Fireplace',fence:'Fence',pool:'Pool',other:'Other'};
module.exports=function adjustmentRemarks(values,prefix){
 const items=[];
 for(const [key,label] of Object.entries(labels)){
  const raw=String(values[prefix+'adj_'+key]??'').trim().replace(/[$,]/g,'');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))continue;
  const amount=Number(raw);if(!Number.isFinite(amount)||amount===0)continue;
  items.push(label+' '+(amount<0?'-':'+')+'$'+Math.abs(amount).toLocaleString('en-US',{minimumFractionDigits:Number.isInteger(amount)?0:2,maximumFractionDigits:2}));
 }
 return items.join(', ');
};

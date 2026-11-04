'use strict';
// Legacy transfers stored these entered adjustments as a formatted comment list.
// Only accept a complete list in the exporter's exact format, never narrative fragments.
const adjustmentLabels={'Seller concessions':'SalesConcessions','Location':'LocationType','Site':'LotSize','View':'AdjustedViewPrice','Year built':'YearBuilt','Condition':'ConditionType','Living area':'LivingArea','Garage / carport':'GarageBayCount','Pool':'AdjustedPoolAndSpaPrice'};
const extraFacts=['ConditionType','LocationType','ViewType','Stories','GarageType','GarageBayCount','HeatingType','CoolingType','WaterSource','WasteDisposal','FuelType','UnitsInProperty'];
const orderKeys=['Neighborhood_OwnerOccupancyPercentage','Neighborhood_TenantOccupancyPercentage','Neighborhood_AverageMarketingTime','Neighborhood_GeneralNeighborhoodComments'];
function preparedStewart(payload){
  for(const c of payload.comps){
    delete c.legacyComment;
    if(c.adjustments)continue;
    const original=c.fields.Comments;
    if(!original)continue;
    const labels=[...Object.keys(adjustmentLabels),'Property rights','Design','Quality','Rooms / beds / baths','Basement','Functional utility','Heating / cooling','Energy efficient items','Porch / patio / deck','Fireplace','Fence','Other'];
    const token='('+labels.join('|')+') ([+-])\\$((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{2})?)';
    const tail=new RegExp('(?:^|\\s)('+token+'(?:, '+token+')*)$').exec(original);
    if(!tail)continue;
    const parsed=[...tail[1].matchAll(new RegExp(token,'g'))];
    if(new Set(parsed.map(m=>m[1])).size!==parsed.length)continue;
    c.legacyComment=original;
    const narrative=original.slice(0,tail.index).trimEnd();
    if(narrative)c.fields.Comments=narrative;else delete c.fields.Comments;
    c.adjustments=Object.fromEntries(parsed.filter(m=>Object.hasOwn(adjustmentLabels,m[1])).map(m=>[adjustmentLabels[m[1]],String(Number(m[2]+m[3].replaceAll(',','')))]));
    c.manualAdjustments=parsed.filter(m=>!Object.hasOwn(adjustmentLabels,m[1])).map(m=>m[0]);
  }
  return payload;
}
// Runs only when Jamie requests a preview. Read selected grid controls only.
function readStewartGrid(){
  const slots=[];
  for(const [kind,prefix] of [['sold','CompSale'],['active','CompListing']]){
    for(let slot=1;slot<=3;slot++){
      const read=key=>{
        const id=(key.startsWith('Adjustment:')?prefix+'Adjustments':prefix)+'_'+key.replace(/^Adjustment:/,'')+'_'+slot+'_field';
        const nodes=document.querySelectorAll('#'+id+', [name="'+id+'"]');
        if(nodes.length!==1)return null;
        const node=nodes[0].matches('input,textarea,select')?nodes[0]:nodes[0].querySelector('input:not([type=hidden]),textarea,select');
        if(!node||!node.getClientRects().length)return null;
        return node.tagName==='SELECT'?(node.selectedOptions[0]?.textContent||'').trim():typeof node.value==='string'?node.value:null;
      };
      const address=read('Address');
      if(address===null)continue;
      const fields={};
      for(const key of ['ConditionType','LocationType','ViewType','Stories','GarageType','GarageBayCount','HeatingType','CoolingType','WaterSource','WasteDisposal','FuelType','UnitsInProperty',...['SalesConcessions','LocationType','LotSize','AdjustedViewPrice','YearBuilt','ConditionType','LivingArea','GarageBayCount','AdjustedPoolAndSpaPrice'].map(k=>'Adjustment:'+k),'Comments','BedroomCount','BathroomCount','HalfBathCount','LivingArea','TotalRooms','DaysOnMarket','YearBuilt','LotSize'].concat(kind==='sold'?'SalePrice':'CurrentListPrice'))fields[key]=read(key);
      slots.push({kind,slot,address,address2:read('Address2'),mls:read('MlsNumber'),fields});
    }
  }
  if(!slots.length)throw Error('Open the Selected Comparables grid on the Stewart HomeSteps form.');
  return slots;
}
const canonical=value=>String(value??'').toLowerCase().trim().replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
const sharedFields=[...extraFacts,'Comments','BedroomCount','BathroomCount','HalfBathCount','LivingArea','TotalRooms','DaysOnMarket','YearBuilt','LotSize'];
const comparableFields={sold:[...sharedFields,'SalePrice'],active:[...sharedFields,'CurrentListPrice']};
function validateStewart(payload){
  if(payload?.format!=='propertythesis-stewart'||payload.version!==1||
    !['address','city','state','zip'].every(key=>typeof payload.subject?.[key]==='string'&&payload.subject[key].trim())||
    !Array.isArray(payload.comps)||!payload.comps.length||payload.comps.length>6)throw Error('Choose a Property Thesis Stewart transfer file.');
  if(payload.orderFields && !Object.entries(payload.orderFields).every(([k,v])=>orderKeys.includes(k)&&typeof v==='string'&&v.trim()))throw Error('Invalid Stewart order fields.');
  const seen=new Set();
  for(const comp of payload.comps){
    if(!comp||!Object.hasOwn(comparableFields,comp.kind)||typeof comp.address!=='string'||!canonical(comp.address)||
      typeof comp.locality!=='string'||typeof comp.mls!=='string'||!comp.fields||!Object.entries(comp.fields).every(([key,value])=>comparableFields[comp.kind].includes(key)&&typeof value==='string'&&value.trim()))
      throw Error('Invalid Stewart comparable in transfer file.');
    if(comp.manualAdjustments && (!Array.isArray(comp.manualAdjustments)||!comp.manualAdjustments.every(v=>typeof v==='string')))throw Error('Invalid review items.');
    if(comp.adjustments && !Object.entries(comp.adjustments).every(([k,v])=>Object.values(adjustmentLabels).includes(k)&&typeof v==='string'&&/^-?\d+(?:\.\d+)?$/.test(v)))throw Error('Invalid Stewart adjustments.');
    if(comp.zip && !/^\d{5}(?:-\d{4})?$/.test(comp.zip))throw Error('Invalid comp ZIP.');
    for(const id of [canonical(comp.address),canonical(comp.mls)].filter(Boolean)){
      const k=comp.kind+'|'+id; if(seen.has(k))throw Error('Duplicate comparable in transfer: '+comp.address); seen.add(k);
    }
  }
}
function candidatesFor(slot,comps){
  const address=canonical(slot.address),full=canonical([slot.address,slot.address2].filter(Boolean).join(' '));
  const mls=canonical(slot.mls);
  return comps.filter(comp=>comp.kind===slot.kind&&(
    canonical(comp.address)===address||canonical(comp.address)===full||(mls&&canonical(comp.mls)===mls)
  ));
}
function reviewStewart(payload,slots){
  validateStewart(payload);
  const rows=[];
  const matched=new Set();
  for(const slot of slots){
    const address=canonical(slot.address),mls=canonical(slot.mls);
    const label=(slot.kind==='sold'?'Sale ':'Listing ')+slot.slot;
    const candidates=candidatesFor(slot,payload.comps);
    const comp=candidates[0];
    const duplicates=comp&&slots.some(other=>other!==slot&&candidatesFor(other,payload.comps).includes(comp));
    const full=canonical(slot.address+' '+(slot.address2||''));
    // Without a verified meaning for Address2, require it to corroborate the street
    // (including unit) or the prepared comp's locality. Otherwise require manual review.
    const matches=comp&&(canonical(comp.address)===full||
      (canonical(comp.address)===address&&canonical(comp.locality)===canonical(slot.address2)));
    if(!address||duplicates||candidates.length!==1||!matches||mls&&comp.mls&&canonical(comp.mls)!==mls){
      rows.push(label+' · '+(!address?'Use Add Address and wait for listing data.':
        'Review identity · Stewart: '+[slot.address,slot.address2,slot.mls].filter(Boolean).join(' / ')+
        ' · Property Thesis: '+(candidates.map(c=>[c.address,c.mls].filter(Boolean).join(' / ')).join('; ')||'no matching comp')));
      continue;
    }
    matched.add(comp);
    if(comp.legacyComment && slot.fields.Comments===comp.legacyComment)rows.push(label+' · remove previously imported adjustment text from comments');
    for(const item of comp.manualAdjustments||[])rows.push(label+' · review unmapped adjustment: '+item);
    rows.push(label+' · '+comp.address+' · matched');
    for(const [key,prepared] of Object.entries({...comp.fields,...Object.fromEntries(Object.entries(comp.adjustments||{}).map(([k,v])=>['Adjustment:'+k,v]))})){
      const existing=slot.fields[key];
      const numeric=key!=='Comments'&&[existing,prepared].every(v=>/^\d+(?:,\d{3})*(?:\.\d+)?$/.test(String(v).trim()));
      const same=numeric?Number(existing.replaceAll(',',''))===Number(prepared.replaceAll(',','')):existing?.trim()===prepared.trim();
      const status=existing==null?'Unavailable':!existing.trim()?'Blank — ready to fill':same?'Matches':'Mismatch — Stewart value preserved';
      rows.push(label+' '+key+' · '+status+' · Stewart: '+(existing??'unavailable')+' · Property Thesis: '+prepared);
    }
  }
  for(const comp of payload.comps)if(!matched.has(comp))rows.push('Prepared '+comp.kind+' comp awaiting match: '+comp.address);
  return rows;
}
if(typeof module!=='undefined')module.exports={preparedStewart,validateStewart,readStewartGrid,reviewStewart};

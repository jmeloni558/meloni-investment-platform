 'use strict';
const clientOf=v=>v._clientTemplate==='rrr'?'rrr':'general';
function exportRRR(v){
 if(clientOf(v)!=='rrr')throw Error('Choose RRR as the client before exporting.');
 const subject={address:v['sold.0.address']||v['active.0.address'],city:v['sold.0.city'],state:v['sold.0.state'],zip:v['sold.0.zip']};
 if(Object.values(subject).some(x=>!String(x||'').trim()))throw Error('Complete the subject street address, city, state and ZIP before exporting to RRR.');
 const fields=[],warnings=[];const add=(section,id,value,label)=>{if(value!==undefined&&value!==null&&String(value).trim()!=='')fields.push({section,id,value:String(value),label});};
 const num=x=>{const s=String(x??'').trim().replace(/[$,]/g,'');return s!==''&&/^-?\d+(\.\d+)?$/.test(s)?Number(s):null;};
 const maps={view:{canal:'Water',water:'Water',waterfront:'Water',golf:'Golf Course','golf course':'Golf Course',neighborhood:'Neighborhood',wooded:'Wooded',park:'Park',city:'City',mountain:'Mountain'},condition:{excellent:'Excellent',good:'Good',average:'Average',fair:'Fair',poor:'Poor'},design:{ranch:'Rambler/Ranch',rambler:'Rambler/Ranch','2 story':'2 Story','two story':'2 Story'},garage:{attached:'Attached',detached:'Detached',carport:'Carport',none:'None'},tenure:{'fee simple':'Fee-simple','fee-simple':'Fee-simple',leasehold:'Leasehold'}};
 const choice=(key,val,label)=>{if(!String(val||'').trim())return undefined;const mapped=maps[key]?.[String(val).trim().toLowerCase()];if(!mapped)warnings.push(label+': select the RRR category manually ('+val+').');return mapped;};
 add('subject','ddlOwnershipType',choice('tenure',v['sold.0.tenure'],'Subject property rights'),'Property rights');
 add('subject','ddlStyleType',choice('design',v['sold.0.design'],'Subject style'),'Subject style');
 add('subject','txtCounty',v.market_county,'County');
 for(const [key,id,label] of [['field_0053','txtMarketTimes','Typical marketing days'],['field_0047','txtListingPriceLow','Neighborhood low price'],['field_0048','txtListingPriceHigh','Neighborhood high price']]){const n=num(v[key]);if(n!==null)add('subject',id,n,label);}
 const trends=[['field_0033','Declining'],['field_0036','Improving'],['field_0037','Stable']].filter(([k])=>v[k]===true);if(trends.length===1)add('subject','ddlPropertyValues',trends[0][1],'Property values');
 warnings.push('Review subject occupancy, inspection date, utilities, tax/parcel facts, original listing history, inventory trend and REO percentage manually. Blank data is not assumed to be zero or No.');
 for(const group of ['sold','active'])for(let i=group==='sold'?0:1;i<=3;i++){
 const p=group+'.'+i+'.',pre=i===0?'rrrSubject_':group==='sold'?'rrrSale'+i+'_':'rrrListing'+i+'_',label=i===0?'Subject':group+' comp '+i;
 if(!v[p+'address'])continue;
 for(const [key,id] of Object.entries({address:'txtAddress',city:'txtCity',state:'ddlState',zip:'txtZip',year:'txtYearBuilt',rooms:'txtRooms',beds:'txtBeds'}))if(i||!['address','city','state','zip'].includes(key))add('comparables',pre+id,v[p+key],label+' '+key);
 if(i){const price=num(v[p+'price']);if(price!==null)add('comparables',pre+(group==='sold'?'txtSalePrice':'txtCurrentListPrice'),price,label+' price');if(group==='sold')add('comparables',pre+'txtSaleDate',v[p+'date'],label+' sale date');}
 for(const [key,id] of [['view','ddlView'],['condition','ddlConditionType'],['garage','ddlGarageType']])add('comparables',pre+id,choice(key,v[p+key],label+' '+key),label+' '+key);
 if(i)add('comparables',pre+'ddlStyle',choice('design',v[p+'design'],label+' style'),label+' style');
 if(/\bMLS\b/i.test(v[p+'source']||''))add('comparables',pre+'ddlDataSource','MLS',label+' source');else if(/tax records?/i.test(v[p+'source']||''))add('comparables',pre+'ddlDataSource','Tax Records',label+' source');
 const site=String(v[p+'site']||'').replace(/,/g,'').match(/^\s*(\d+(?:\.\d+)?)\s*(acres?|ac|sq\.?\s*ft|sf)\s*$/i);if(site)add('comparables',pre+'txtLotSizeAcres',Number((Number(site[1])/(site[2].toLowerCase().startsWith('ac')?1:43560)).toFixed(4)),label+' acres');else if(v[p+'site'])warnings.push(label+': verify lot area and units.');
 if(v[p+'gla'])warnings.push(label+': confirm above-grade versus basement area before entering '+v[p+'gla']+' square feet.');
 if(v[p+'baths'])warnings.push(label+': separate full and half baths from the source ('+v[p+'baths']+').');
 if(v[p+'pool'])warnings.push(label+': review physical Pool/Spa presence; zero contributory value does not mean no pool.');
 if(i){const n=num(v[p+'net']);if(n!==null){add('comparables',pre+'ddlPositiveNegativeSign',n<0?'-':'+',label+' adjustment sign');add('comparables',pre+'txtAdjustment',Math.abs(n),label+' net adjustment');}
 if(v[p+'financing'])warnings.push(label+': enter concessions and financing separately and verify RRR does not deduct concessions twice.');
 const primary=v[group==='sold'?'primary_sold_comp':'primary_active_comp'];if(primary==='Comp '+i)add('comparables',pre+'chkBestSaleList','true',label+' primary');
 }
 }
 warnings.push('Review RRR adjusted prices against PropertyThesis after filling. 30-day and 90–120-day value fields remain manual because the valuation horizons must match. Review all comments, price opinions, derived fields and missing facts before saving.');
 return {format:'propertythesis-rrr',version:1,client:'rrr',subject,fields,warnings:[...new Set(warnings)]};
}
module.exports={clientOf,exportRRR};

 'use strict';
const facts=require('./rrr-facts.cjs');
const source=require('./rrr-source.cjs');
const clientOf=v=>v._clientTemplate==='rrr'?'rrr':'general';
function exportRRR(v,sourceRows=[]){
 if(clientOf(v)!=='rrr')throw Error('Choose RRR as the client before exporting.');
 const subject={address:v['sold.0.address']||v['active.0.address'],city:v['sold.0.city'],state:v['sold.0.state'],zip:v['sold.0.zip']};
 if(Object.values(subject).some(x=>!String(x||'').trim()))throw Error('Complete the subject street address, city, state and ZIP before exporting to RRR.');
 const fields=[],warnings=[];const add=(section,id,value,label)=>{if(value!==undefined&&value!==null&&String(value).trim()!=='')fields.push({section,id,value:String(value),label});};
 const num=x=>{const s=String(x??'').trim().replace(/[$,]/g,'');return s!==''&&/^-?\d+(\.\d+)?$/.test(s)?Number(s):null;};
 const maps={view:{pond:'Water',lake:'Water',canal:'Water',water:'Water',waterfront:'Water',golf:'Golf Course','golf course':'Golf Course',neighborhood:'Neighborhood',wooded:'Wooded',park:'Park',city:'City',mountain:'Mountain'},condition:{excellent:'Excellent',good:'Good',average:'Average',fair:'Fair',poor:'Poor'},design:{ranch:'Rambler/Ranch',rambler:'Rambler/Ranch','2 story':'2 Story','two story':'2 Story'},garage:{attached:'Attached',detached:'Detached',carport:'Carport',none:'None'},tenure:{'fee simple':'Fee-simple','fee-simple':'Fee-simple',leasehold:'Leasehold'}};
 const choice=(key,val,label)=>{if(!String(val||'').trim())return undefined;const mapped=maps[key]?.[String(val).trim().toLowerCase()];if(!mapped)warnings.push(label+': select the RRR category manually ('+val+').');return mapped;};
 add('subject','ddlOwnershipType',choice('tenure',v['sold.0.tenure'],'Subject property rights'),'Property rights');
 add('subject','ddlStyleType',source.style(v['sold.0.design'])||source.matching(sourceRows,v,'sold.0.').style||choice('design',v['sold.0.design'],'Subject style'),'Subject style');
 add('subject','txtCounty',v.market_county,'County');
 for(const [key,id,label] of [['field_0053','txtMarketTimes','Typical marketing days'],['field_0047','txtListingPriceLow','Neighborhood low price'],['field_0048','txtListingPriceHigh','Neighborhood high price']]){const n=num(v[key]);if(n!==null)add('subject',id,n,label);}
 const trends=[['field_0033','Declining'],['field_0036','Improving'],['field_0037','Stable']].filter(([k])=>v[k]===true);if(trends.length===1)add('subject','ddlPropertyValues',trends[0][1],'Property values');
 const market=[];
 if(trends.length===1&&num(v.market_price_change_percent)!==null&&num(v.market_price_change_months)>0)market.push('Entered market price trend: '+trends[0][1].toLowerCase()+' '+Math.abs(num(v.market_price_change_percent))+'% over '+num(v.market_price_change_months)+' months.');
 if(num(v.market_months_supply)!==null)market.push('Entered inventory: '+num(v.market_months_supply)+' months of supply. This is a supply level, not an inventory trend.');
 for(const area of ['zip','county']){const name=v['market_'+area];if(!name)continue;for(const [key,label] of [['median_home_value','median home value'],['median_list_price','median list price']]){const n=num(v['market_'+area+'_'+key]);if(n!==null)market.push((area==='zip'?'ZIP ':'County ')+name+' '+label+': $'+n.toLocaleString('en-US')+'.');}}
 if(market.length)add('subject','txtNeighborhoodComments',market.join(' ')+' Source: entered BPO market assumptions; confirm report date and geographic applicability.','Market context');
 warnings.push('Review subject occupancy, inspection date, utilities, tax/parcel facts, original listing history, inventory trend and REO percentage manually. Blank data is not assumed to be zero or No.');
 for(const group of ['sold','active'])for(let i=group==='sold'?0:1;i<=3;i++){
 const p=group+'.'+i+'.',pre=i===0?'rrrSubject_':group==='sold'?'rrrSale'+i+'_':'rrrListing'+i+'_',label=i===0?'Subject':group+' comp '+i;
 if(!v[p+'address'])continue;
 const extra=source.matching(sourceRows,v,p);
 for(const [key,id] of Object.entries({address:'txtAddress',city:'txtCity',state:'ddlState',zip:'txtZip',year:'txtYearBuilt',rooms:'txtRooms',beds:'txtBeds'}))if(i||!['address','city','state','zip'].includes(key))add('comparables',pre+id,v[p+key],label+' '+key);
 if(i){const price=num(v[p+'price']);if(price!==null)add('comparables',pre+(group==='sold'?'txtSalePrice':'txtCurrentListPrice'),price,label+' price');if(group==='sold')add('comparables',pre+'txtSaleDate',v[p+'date'],label+' sale date');}
 for(const [key,id] of [['view','ddlView'],['condition','ddlConditionType']])add('comparables',pre+id,choice(key,v[p+key],label+' '+key),label+' '+key);
 if(i){add('comparables',pre+'ddlStyle',source.style(v[p+'design'])||extra.style||choice('design',v[p+'design'],label+' style'),label+' style');
 add('comparables',pre+'txtNoUnits','1',label+' units (owner default)');
 add('comparables',pre+'txtListPrice',extra.originalPrice,label+' original list price (MLS)');
 add('comparables',pre+'txtOrigListDate',extra.originalDate,label+' original list date (MLS on-market date)');
 add('comparables',pre+'ddlSaleType',extra.saleType,label+' sale type (MLS special-sale classification)');
 if(group==='sold')add('comparables',pre+'ddlFinancingType',extra.financing,label+' closed financing terms (MLS)');
 }
 if(/\bMLS\b/i.test(v[p+'source']||''))add('comparables',pre+'ddlDataSource','MLS',label+' source');else if(/tax records?/i.test(v[p+'source']||''))add('comparables',pre+'ddlDataSource','Tax Records',label+' source');
 // Read source facts; only units and A/C use the owner's explicit defaults.
 const mls=facts.mls(v[p+'source']);
 if(mls)add('comparables',pre+'txtMLSNumber',mls,label+' MLS number');
 add('comparables',pre+'ddlPropertyType',facts.propertyType(v[p+'design']),label+' property type');
 add('comparables',pre+'lbAmenities_0','true',label+' A/C (owner default)');
 const pool=extra.pool||source.pool(v[p+'pool']);add('comparables',pre+'ddlPoolSpa',pool,label+' private inground pool');
 if(group==='sold'&&i){const concessions=facts.concession(v[p+'financing']);if(concessions!==null)add('comparables',pre+'txtConcessionsAmount',concessions,label+' seller concessions');}
 const bath=facts.baths(v[p+'baths']);
 if(bath){add('comparables',pre+'txtFullBaths',bath.full,label+' full baths');add('comparables',pre+'txtHalfBaths',bath.half,label+' half baths');}
 const garage=facts.garage(v[p+'garage']);
 if(garage){add('comparables',pre+'ddlGarageType',garage.type,label+' garage type');add('comparables',pre+'txtGarages',garage.count,label+' garage spaces');}
 else if(v[p+'garage'])warnings.push(label+': verify garage type and count ('+v[p+'garage']+').');
 const area=facts.area(v[p+'gla'],v[p+'basement']);
 if(area){add('comparables',pre+'txtSqFtLiving',area.living,label+' above-grade living area');add('comparables',pre+'txtBasementSqFt',area.basement,label+' basement square feet');}
 const dom=num(v[p+'dom']);if(dom!==null&&Number.isInteger(dom)&&dom>=0)add('comparables',pre+'txtDOM',dom,label+' days on market');
 const site=String(v[p+'site']||'').replace(/,/g,'').match(/^\s*(\d+(?:\.\d+)?)\s*(acres?|ac|sq\.?\s*ft|sf)\s*$/i);if(site)add('comparables',pre+'txtLotSizeAcres',Number((Number(site[1])/(site[2].toLowerCase().startsWith('ac')?1:43560)).toFixed(4)),label+' acres');else if(v[p+'site'])warnings.push(label+': verify lot area and units.');
 if(v[p+'gla']&&!area)warnings.push(label+': confirm above-grade versus basement area before entering '+v[p+'gla']+' square feet.');
 if(v[p+'baths']&&!bath)warnings.push(label+': separate full and half baths from the source ('+v[p+'baths']+').');
 if(!pool)warnings.push(label+': verify private inground pool; unknown pool facts remain blank.');
 if(i){const n=num(v[p+'net']);if(n!==null){add('comparables',pre+'ddlPositiveNegativeSign',n<0?'-':'+',label+' adjustment sign');add('comparables',pre+'txtAdjustment',Math.abs(n),label+' net adjustment');}
 if(v[p+'financing'])warnings.push(label+': verify the disclosed concession is included once in the net adjustment.');
 const primary=v[group==='sold'?'primary_sold_comp':'primary_active_comp'];if(primary==='Comp '+i)add('comparables',pre+'chkBestSaleList','true',label+' primary');
 }
 }
 warnings.push('Owner defaults: one unit per comp and A/C checked. One-story maps to ranch; two-story maps to 2 Story. Only private inground pools count. MLS Special Sale: None maps to Arms Length for review; this is not independent transaction verification. Active financing stays blank.');
 warnings.push('Review RRR adjusted prices against PropertyThesis after filling. 30-day and 90–120-day value fields remain manual because the valuation horizons must match. Review all comments, price opinions, derived fields and missing facts before saving.');
 return {format:'propertythesis-rrr',version:1,client:'rrr',subject,fields,warnings:[...new Set(warnings)]};
}
module.exports={clientOf,exportRRR,parseRRRSources:source.parse};

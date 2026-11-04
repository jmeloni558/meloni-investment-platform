'use strict';
const {choices,entries,grid,allowed}=require('./boa/schema');
const {neighborhood}=require('./rrr-neighborhood.cjs');
const {lotSquareFeet}=require('../bpo/general-fields.cjs');
const {matching}=require('./rrr-source.cjs');
const remarks=require('./rrr-adjustment-remarks.cjs');
const {privatePool}=require('../bpo/boa-pool.cjs');
function boaDetails(v){
  const defaults={'Overall condition':v['sold.0.condition'],'Property type':v['sold.0.design'],'Current / last list price':v['active.0.price'],'Neighborhood comments':neighborhood(v)};
  return Object.fromEntries([...Object.keys(choices),...Object.keys(entries)].map(label=>{
    let value=v['boa.'+label]??defaults[label]??'';
    if(choices[label])value=Object.keys(choices[label]).find(k=>k.toLowerCase()===String(value).toLowerCase())||'';
    return [label,value];
  }));
}
const boaGridDetails = {PROP_TYPE:'Property type',PROJ_SIZE:'Project size',EXT_FINISH:'Exterior construction / finish',REO_SHORT_SALE:'REO / short sale (yes or no)',LISTED:'Currently for sale?',COMMENTS:'Comparison / sales history comments'};
function boaAdjustmentNotes(values,prefix){
  const adjustments=remarks(values,prefix);
  const adjusted=String(values[prefix+'adjusted']??'').trim();
  return [adjustments&&'Adjustments: '+adjustments+'.',adjusted&&'Adjusted value: $'+adjusted+'.'].filter(Boolean).join(' ');
}
function addBoaPoolFacts(values,sourceRows){
  const v={...values};
  for(const kind of ['sold','active'])for(let i=0;i<=3;i++){
    const p=kind+'.'+i+'.';
    if(!String(v[p+'pool']??'').trim()&&v[p+'address']){
      const fact=matching(sourceRows,v,p).boaPool;
      if(fact)v[p+'pool']=fact;
    }
  }
  return v;
}
function exportBOA(v,sourceRows=[]){
  if(v._clientTemplate!=='boa')throw Error('Choose Service Link - BOA before exporting.');
  const subject=Object.fromEntries(['address','city','state','zip'].map(k=>[k,String(v['sold.0.'+k]??'').trim()]));
  if(Object.values(subject).some(x=>!x))throw Error('Complete the subject street address, city, state and ZIP before exporting.');
  const fields=[];
  const details=boaDetails(v);
  function add(page,group,tag,raw){
    const value=String(raw??'').trim();
    if(!value)return;
    if(!allowed(page,group,tag))throw Error('Unexpected BOA field '+tag);
    fields.push({page,group,tag,value});
  }
  const first=(tag,value)=>add(1,'SUBJECT',tag,value);
  const subjectSource=matching(sourceRows,v,'sold.0.');
  for(const [label,key] of [['Original list date','originalDate'],['Original list price','originalPrice']]){
    if(v['boa.'+label]===undefined&&!details[label])details[label]=subjectSource[key];
  }
  for(const [label,value] of Object.entries(details)){
    if(choices[label]){if(value)first(choices[label][value]+'_X','X');}
    else first(entries[label],value);
  }
  for(const [tag,key] of Object.entries({COUNTY:'market_county',NBHD_PRICE_LOW:'field_0047',NBHD_PRICE_HIGH:'field_0048',NBHD_PROP_VALUE_TREND_PCT:'market_price_change_percent',NBHD_PROP_VALUE_TREND_PERIOD:'market_price_change_months'}))first(tag,v[key]);
  if(Number(v.market_price_change_months)>0)first('NBHD_PROP_VALUE_TREND_MO_X','X');
  const trends=[['field_0033','DECL'],['field_0036','INCR'],['field_0037','STAB']].filter(([k])=>v[k]===true);
  if(trends.length===1)first('NBHD_PROP_VALUE_'+trends[0][1]+'_X','X');
  for(const kind of ['sold','active'])for(let i=0;i<=3;i++){
    const sale=kind==='sold',p=kind+'.'+i+'.';
    if(!v[p+'address']&&i)continue;
    const group=i?(sale?'COMP_SALES_':'COMP_LIST_')+i:'SUBJECT';
    const extra=matching(sourceRows,v,p);
    const put=(tag,value)=>add(2,group,(sale?'GS_':'GL_')+tag,value);
    for(const [key,tag] of Object.entries(grid)){
      const name=p+key;
      if(i&&(key==='tenure'||key==='basement'))put(tag,String(v[name]??'').trim()||(key==='tenure'?'Fee Simple':'None'));
      else if(v[name]!==v._generalDefaults?.[name])put(tag,v[name]);
    }
    put(sale?'SALE_PRICE':'LIST_PRICE',v[p+'price']);
    // Subject dates are mirrored between the base grids. Use an explicit subject list date.
    put(sale?'DATE_TIME_O_SALE':'LIST_DATE',sale?v[p+'date']:i?extra.originalDate||v[p+'date']:details['Original list date']);
    const sqft=lotSquareFeet(v[p+'site'],v._lotUnit);
    if(sqft!==null)put('LOT_SIZE',(sqft/43560).toFixed(2));
    if(privatePool(v[p+'pool'])===1)put('AMENITIES','Private');
    if(i)put('PROXIMITY',v[p+'distance']);
    for(const tag of Object.keys(boaGridDetails)){
      if(!allowed(2,group,(sale?'GS_':'GL_')+tag))continue;
      let fallback='';
      if(tag==='PROJ_SIZE'&&i){put(tag,String(v['boa.'+p+tag]??'').trim()||'N/A');continue;}
      if(tag==='REO_SHORT_SALE'&&extra.saleType)fallback=['REO','Short Sale'].includes(extra.saleType)?'Yes':'No';
      if(tag==='LISTED'&&!i)fallback=details['Currently listed'];
      if(tag==='PROP_TYPE'){
        const type=i?v[p+'design']:details['Property type'];
        if(/^(SFR|single family|condo|PUD|manufactured|multi-unit|coop|vacant land)$/i.test(type||''))fallback=type;
      }
      if(tag==='COMMENTS'&&i){
        const manual=String(v['boa.'+p+tag]??'').trim();
        put(tag,[manual,boaAdjustmentNotes(v,p)].filter(Boolean).join(' '));
        continue;
      }
      put(tag,v['boa.'+p+tag]??fallback);
    }
  }
  return {format:'propertythesis-boa',version:1,subject,fields};
}
module.exports={exportBOA,boaDetails,boaChoices:choices,boaGridDetails,boaAdjustmentNotes,addBoaPoolFacts};

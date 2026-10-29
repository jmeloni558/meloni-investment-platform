'use strict';
// Explicit facts only: never turn an unknown concession into zero or infer a financing rate.
function concession(text,price){
 const s=String(text??'').trim();
 if(/^\$?\d[\d,]*$/.test(s)){const amount=Number(s.replace(/[$,]/g,''));return Number.isFinite(price)&&amount<=price?{amount}:{reason:'Review concession amount and price.'};}
 if(/^(?:none|no|0|\$0(?:\.00)?|no (?:seller )?(?:concessions|closing costs)(?: paid)?)\.?$/i.test(s))return {amount:0};
 if(!s)return {reason:'Concessions not reported. Review the source or enter a dollar adjustment.'};
 const nums=s.match(/\$\s*\d[\d,]*(?:\.\d+)?|\d+(?:\.\d+)?\s*%/g)||[];
 if(nums.length!==1||!/(concession|closing costs?|seller paid|seller credit)/i.test(s)||/\b(?:unknown|not reported|up to|estimated|requested)\b/i.test(s))return {reason:'Review the concessions text; no unambiguous paid amount was found.'};
 const amountToken='(?:\\$\\s*\\d[\\d,]*(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s*%)';
 const explicit=new RegExp('(?:concessions?|closing costs?|seller credit)\\s*[:=]?\\s*'+amountToken+'|'+amountToken+'\\s*(?:in\\s+)?(?:seller concessions?|closing costs?)','i');
 if(!explicit.test(s))return {reason:'Review the source: the number is not clearly tied to paid closing-cost concessions.'};
 const n=Number(nums[0].replace(/[$,%\s]/g,''));
 const amount=nums[0].includes('%')?(Number.isFinite(price)&&price>0?price*n/100:NaN):n;
 if(!Number.isFinite(amount)||amount<0||!Number.isFinite(price)||price<=0||amount>price)return {reason:'Review the concession amount and sold price.'};
 return {amount:Math.round(amount*100)/100};
}
const parts={rooms:['beds','baths'],porches:['porch','patio','deck'],fireplace:['fireplace'],fence:['fence'],pool:['pool']};
function storyClass(raw){
 const s=String(raw??'').toLowerCase().replace(/[–—-]/g,' ');
 if(!s||/\b(split|raised|bi level|tri level|unknown|not reported)\b/.test(s))return null;
 const single=/\b(ranch|single (?:story|storey|level)|one (?:story|storey|level)|1 (?:story|storey|level)|ground floor|first floor|1st floor)\b/.test(s);
 const multi=/\b(two|three|four|five|multi|multiple|[2-9]|\d{2,}|1\.5)\s*(?:story|storey|stories|storeys|level|levels|floor|floors)\b|\b(second|third|fourth|[2-9](?:nd|rd|th)|upper) floor\b/.test(s);
 return single===multi?null:single?1:0;
}
function poolClass(raw){const s=String(raw??'').toLowerCase().replace(/[-–—]/g,' ');if(/above\s*ground|\b(no|none|community)\b/.test(s))return 0;if(/in\s*ground|\b(private|yes|gunite|concrete|fiberglass)\b/.test(s))return 1;return null;}
const blanketFields=[
 ['location','Location'],['site','Site'],['view','View'],['design','Design and appeal','story'],['quality','Quality of construction'],['year','Year built','difference'],['condition','Condition'],['beds','Bedrooms','difference','rooms'],['baths','Bathrooms','difference','rooms'],['basement','Basement'],['utility','Functional utility'],['hvac','Heating / cooling'],['energy','Energy efficient items'],['garage','Garage / carport'],['porch','Porches','flat','porches'],['patio','Patio','flat','porches'],['deck','Deck','flat','porches'],['fireplace','Fireplace'],['fence','Fence'],['pool','Pool','pool'],['other','Other']
];
function apply(input,number,money,overwrite=false){
 const v={...input},state=structuredClone(input._adjustments||{rate:'',generated:{},parts:{}});state.generated||={};state.parts||={};state.manual||={};const warnings=[];let preserved=0;
 const same=(a,b)=>number(a)!==null&&number(a)===number(b);
 const put=(key,n,blanket=false)=>{if(state.manual[key]){if(blanket&&overwrite)delete state.manual[key];else return false;}const prior=state.generated[key],current=v[key];if(!(blanket&&overwrite)&&String(current??'').trim()&&(!prior||!same(current,prior.value))){if(blanket)preserved++;return false;}v[key]=money(n);state.generated[key]={value:v[key],...(blanket?{blanket:true}:{})};return true;};
 for(const kind of ['sold','active'])for(let i=1;i<=3;i++){
  const p=kind+'.'+i+'.';if(!v[p+'address'])continue;
  if(kind==='sold'){
   const c=concession(v[p+'financing'],number(v[p+'price']));
   if(c.amount!==undefined)put(p+'adj_financing',-c.amount);
   else {warnings.push({prefix:p,message:c.reason});const k=p+'adj_financing',old=state.generated[k];if(old&&same(v[k],old.value)){v[k]='';delete state.generated[k];}}
  }
  const rate=number(state.rate),subject=number(v['sold.0.gla']),comp=number(v[p+'gla']);
  if(String(state.rate??'').trim()){
   if(rate!==null&&rate>=0&&subject>0&&comp>0)put(p+'adj_gla',Math.round((subject-comp)*rate*100)/100,true);
   else {warnings.push({prefix:p,message:'A valid rate and both living areas are needed for the size adjustment.'});const k=p+'adj_gla',old=state.generated[k];if(old&&same(v[k],old.value)){v[k]='';delete state.generated[k];}}
  }else {const k=p+'adj_gla',old=state.generated[k];if(old&&same(v[k],old.value)){v[k]='';delete state.generated[k];}}
  const globals=state.globals||{},managed=new Set();
  for(const target of new Set(blanketFields.map(f=>f[3]||f[0]))){
   const fields=blanketFields.filter(f=>(f[3]||f[0])===target),touched=fields.some(f=>Object.hasOwn(globals,f[0]));
   if(!touched)continue;managed.add(target);
   const key=p+'adj_'+target,entered=fields.filter(f=>String(globals[f[0]]??'').trim());let sum=0,valid=true;
   for(const [name,label,mode] of entered){const factor=number(globals[name]);if(factor===null||(['difference','story','pool'].includes(mode)&&factor<0)){valid=false;continue;}
    if(mode==='story'){const sub=storyClass(v['sold.0.design']),comp=storyClass(v[p+'design']);if(sub===null||comp===null){valid=false;warnings.push({prefix:p,message:'Design and appeal needs an explicit single-story/ranch or multistory description for both properties. Review Step 5.'});}else sum+=(sub-comp)*factor;}
    else if(mode==='pool'){const sub=poolClass(v['sold.0.pool']),comp=poolClass(v[p+'pool']);if(sub===null||comp===null){valid=false;warnings.push({prefix:p,message:'Pool adjustment needs known pool types for both properties. Above-ground and community pools receive no private-pool value.'});}else sum+=(sub-comp)*Math.abs(factor);}
    else if(mode==='difference'){const sub=number(v['sold.0.'+name]),comp=number(v[p+name]);if(sub===null||comp===null||sub<0||comp<0){valid=false;warnings.push({prefix:p,message:label+' difference needs numeric subject and comparable facts. Review Step 5.'});}else sum+=(sub-comp)*factor;}
    else sum+=factor;
   }
   if(entered.length&&valid)put(key,Math.round(sum*100)/100,true);
   else {const old=state.generated[key];if(old?.blanket&&same(v[key],old.value)){v[key]='';delete state.generated[key];}}
  }
  for(const [group,keys] of Object.entries(parts)){
   if(managed.has(group))continue;
   const values=state.parts[p+group];if(!values)continue;
   const ns=keys.map(k=>String(values[k]??'').trim()?number(values[k]):0);
   // Manual combined form values override helpers until the user edits a component again.
   if(ns.every(n=>n!==null))put(p+'adj_'+group,Math.round(ns.reduce((a,b)=>a+b,0)*100)/100);
  }
 }
 v._adjustments=state;return {values:v,warnings,preserved};
}
module.exports={poolClass,concession,parts,blanketFields,apply,storyClass};

'use strict';
// Explicit facts only: never turn an unknown concession into zero or infer a financing rate.
function concession(text,price){
 const s=String(text??'').trim();
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
const parts={rooms:['beds','baths'],porches:['porch','patio','deck','fireplace'],pool:['fence','pool']};
function apply(input,number,money){
 const v={...input},state=structuredClone(input._adjustments||{rate:'',generated:{},parts:{}});state.generated||={};state.parts||={};const warnings=[];
 const put=(key,n)=>{const prior=state.generated[key],current=v[key];if(String(current??'').trim()&&(!prior||String(current)!==String(prior.value)))return false;v[key]=money(n);state.generated[key]={value:v[key]};return true;};
 for(const kind of ['sold','active'])for(let i=1;i<=3;i++){
  const p=kind+'.'+i+'.';if(!v[p+'address'])continue;
  if(kind==='sold'){
   const c=concession(v[p+'financing'],number(v[p+'price']));
   if(c.amount!==undefined)put(p+'adj_financing',-c.amount);
   else {warnings.push({prefix:p,message:c.reason});const k=p+'adj_financing',old=state.generated[k];if(old&&v[k]===old.value){v[k]='';delete state.generated[k];}}
  }
  const rate=number(state.rate),subject=number(v['sold.0.gla']),comp=number(v[p+'gla']);
  if(String(state.rate??'').trim()){
   if(rate!==null&&rate>=0&&subject>0&&comp>0)put(p+'adj_gla',Math.round((subject-comp)*rate*100)/100);
   else {warnings.push({prefix:p,message:'A valid rate and both living areas are needed for the size adjustment.'});const k=p+'adj_gla',old=state.generated[k];if(old&&v[k]===old.value){v[k]='';delete state.generated[k];}}
  }else {const k=p+'adj_gla',old=state.generated[k];if(old&&v[k]===old.value){v[k]='';delete state.generated[k];}}
  for(const [group,keys] of Object.entries(parts)){
   const values=state.parts[p+group];if(!values)continue;
   const ns=keys.map(k=>String(values[k]??'').trim()?number(values[k]):0);
   // Manual combined form values override helpers until the user edits a component again.
   if(ns.every(n=>n!==null))put(p+'adj_'+group,Math.round(ns.reduce((a,b)=>a+b,0)*100)/100);
  }
 }
 v._adjustments=state;return {values:v,warnings};
}
module.exports={concession,parts,apply};

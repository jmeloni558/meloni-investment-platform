import {selectedCondition} from './completion.mjs';
// AI-only valuation policy. These are broker conventions, not measured market rates.
export const brokerRates={gla:75,beds:3000,baths:5000};
export const valuationInstructions=`VALUATION METHOD:
When valuationPolicy.subjectCondition is supplied, use that exact user-selected condition for the subject form and valuation. It supersedes historic source condition and any earlier renovation assumption. It is a user-provided rating, not a verified inspection or proof of renovations, HVAC replacement, repair cost, or a fixed dollar adjustment. Explain material source conflicts without replacing this rating. Quote "User-selected subject condition: [rating]." as its formEvidence. Evaluate comparable condition differences using supported market evidence; never invent a dollar amount from the rating alone.
Establish the subject's valuation condition before choosing adjustments. An explicit assignment assumption of completed renovation is a hypothetical renovated scenario, not proof of completed work. Honor it and disclose it in the existing Comments and conclusion. For the subject condition and HVAC form fields only, an explicit assignment statement in valuationPolicy.assignment is also permissible evidence: quote it exactly in formEvidence and label the short display value '(assumed)'. Do not infer unspecified renovation scope. Old fixer-upper MLS remarks, tax-record HVAC and acquisition prices describe the earlier state; do not use them to discount a renovated scenario. Without an explicit renovation assumption or current evidence, do not presume renovation. Preserve historical prices as history, not current asking prices or automatic value anchors. Do not make time adjustments merely because today's date is later than the supplied market evidence; identify stale evidence and the valuation's limitations.
Apply the supplied broker convention of $75/SF of living area, $3,000 per bedroom and $5,000 per bathroom when no explicit market-supported marginal rates are provided. Identify these as broker conventions, not paired-sale findings. valuationPolicy.baselineAdjustments supplies the exact precomputed schedule from the extracted facts. Copy every nonzero entry into adjustments with an explanation. If explicit source evidence supports different marginal rates, recalculate GLA/rooms consistently; seller-credit deductions remain mandatory and unchanged. An explicit supported marginal rate in the source takes precedence; quote that evidence in valuation.rateEvidence. Never use total sale price/SF as the marginal GLA rate. Apply the same rates consistently to all sold and active comps. Calculate GLA as (subject GLA minus comp GLA) times the rate; calculate rooms as bedroom difference times bedroom rate plus bathroom difference times bathroom rate. Keep these in adj_gla and adj_rooms respectively, without double counting. Deduct explicit paid seller credits from closed sales. Missing amounts are unknown, not proof of zero. Include every nonzero calculated adjustment in adjustments; prose alone never constitutes an adjustment.
Other differences require support for their dollar contribution. Do not invent a catch-all condition, HVAC, utility or other discount to force an indication toward a historical purchase price. Never deduct the same renovation deficiency through both condition and repair/system adjustments. If material current-condition differences cannot be quantified sufficiently to support a value, return canValue false rather than inventing a distressed value.
Reconcile from the adjusted CLOSED sales, within their indicated range. Identify the primary comp using recency, proximity, condition, similarity and gross adjustment burden; discuss the support and limitations of the others. A rounded central indication may corroborate the conclusion when the comps are comparable; a blind average is not a substitute for analysis. Active and pending ASKING prices constrain the marketing strategy and recommended list price, not the closed-sale calculation. A pending price is not a known contract price. Do not copy the subject's old list price as the recommended list price. Explain any listing premium using competing inventory and exposure, not an arbitrary percentage. The reported value, adjustment grid and existing narrative sections must describe the same scenario and arithmetic. Do not change the summary format.`;

export const valuationSchema={type:'object',additionalProperties:false,required:['basis','basisEvidence','rates','rateEvidence','reconciliation'],properties:{basis:{type:'string',enum:['current','assumed-renovated']},basisEvidence:{type:'string',minLength:1,maxLength:1500},rates:{type:'object',additionalProperties:false,required:['gla','beds','baths'],properties:Object.fromEntries(Object.keys(brokerRates).map(k=>[k,{type:'number',minimum:0,maximum:1000000}]))},rateEvidence:{type:'string',minLength:1,maxLength:1500},reconciliation:{type:'string',minLength:1,maxLength:2000}}};
const number=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(String(x).replace(/[$,]/g,''));return Number.isFinite(n)?n:null;};
export function valuationInput(values){
 const context=values._aiValuationContext,subjectCondition=selectedCondition(values);
 return {subjectCondition,brokerRates,baselineAdjustments:calculatedAdjustments(values,brokerRates),assignment:!subjectCondition&&context&&context.address===values.field_0008&&context.basis==='assumed-renovated'?{basis:context.basis,evidence:String(context.evidence||'').slice(0,1500)}:null};
}
export function calculatedAdjustments(facts,rates){
 const out=[];
 for(const kind of ['sold','active'])for(let i=1;i<=3;i++){
  const p=kind+'.'+i;if(!facts[p+'.address'])continue;
  const s=k=>number(facts['sold.0.'+k]),c=k=>number(facts[p+'.'+k]);
  if(s('gla')>0&&c('gla')>0)out.push({name:p+'.adj_gla',amount:Math.round((s('gla')-c('gla'))*rates.gla)});
  if(['beds','baths'].every(k=>s(k)!==null&&c(k)!==null&&s(k)>=0&&c(k)>=0))out.push({name:p+'.adj_rooms',amount:Math.round((s('beds')-c('beds'))*rates.beds+(s('baths')-c('baths'))*rates.baths)});
  // Only unambiguous paid concessions: never infer an amount from loan terms.
  const raw=String(facts[p+'.financing']??'').trim(),paid=number(raw);
  if(kind==='sold'&&paid!==null&&paid>=0&&paid<=c('price'))out.push({name:p+'.adj_financing',amount:-paid});
 }
 return out;
}
export function validateValuation(result,input){
 const v=result.valuation;
 if(!v||!['current','assumed-renovated'].includes(v.basis)||!v.rates||Object.keys(brokerRates).some(k=>typeof v.rates[k]!=='number'||!Number.isFinite(v.rates[k])||v.rates[k]<0||v.rates[k]>1000000)||['basisEvidence','rateEvidence','reconciliation'].some(k=>typeof v[k]!=='string'||!v[k].trim()))throw Error('Supply a valuation basis, consistent marginal rates, supporting evidence and reconciliation.');
 if(input.valuationPolicy.assignment&&v.basis!==input.valuationPolicy.assignment.basis)throw Error('Value the explicitly assigned renovated scenario, not the historic fixer-upper condition.');
 if(input.valuationPolicy.subjectCondition&&v.basis!=='current')throw Error('Use the current user-selected subject condition, not a previous renovation assumption.');
 if(Object.keys(brokerRates).some(k=>v.rates[k]!==brokerRates[k])&&/^(?:broker convention|default|none|n\/a)$/i.test(v.rateEvidence.trim()))throw Error('Different marginal rates require explicit supporting source evidence.');
 const facts={...Object.fromEntries(input.facts.map(f=>[f.key,f.value])),...result.formFields};
 const mismatches=[];
 for(const expected of calculatedAdjustments(facts,v.rates)){
  const actual=result.adjustments.find(a=>a.name===expected.name)?.amount||0;
  if(actual!==expected.amount)mismatches.push(expected.name+' = '+expected.amount);
 }
 if(mismatches.length)throw Error('The adjustment grid must include all of these calculated amounts: '+mismatches.join('; ')+'. Reconcile value and narrative to the corrected grid.');
 const prices=input.sold.map(p=>{const price=number(facts[p+'.price']);return price>0?price+result.adjustments.filter(a=>a.name.startsWith(p+'.')).reduce((sum,a)=>sum+a.amount,0):null;}).filter(n=>n!==null);
 if(!prices.length||prices.some(n=>n<=0)||result.asIs<Math.min(...prices)-500||result.asIs>Math.max(...prices)+500)throw Error('Reconcile the value within the adjusted closed-sale range (allowing at most $500 rounding); a historical subject price cannot replace comparable reconciliation.');
 return {...v,adjustedSold:Object.fromEntries(input.sold.map(p=>[p,number(facts[p+'.price'])+result.adjustments.filter(a=>a.name.startsWith(p+'.')).reduce((sum,a)=>sum+a.amount,0)]))};
}

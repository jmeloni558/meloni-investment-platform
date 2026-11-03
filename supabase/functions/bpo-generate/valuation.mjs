import {selectedCondition} from './completion.mjs';
// Rates are derived from the current documents, never from a reference BPO.
const rateKeys=['gla','beds','baths'];
export const valuationInstructions=`VALUATION METHOD:
When valuationPolicy.subjectCondition is supplied, use that exact user-selected condition for the subject form and valuation. It supersedes historic source condition and any earlier renovation assumption. It is a user-provided rating, not a verified inspection or proof of renovations, HVAC replacement, repair cost, or a fixed dollar adjustment. Explain material source conflicts without replacing this rating. Quote "User-selected subject condition: [rating]." as its formEvidence. Evaluate comparable condition differences using supported market evidence; never invent a dollar amount from the rating alone.
Establish the subject's valuation condition before choosing adjustments. An explicit assignment assumption of completed renovation is a hypothetical renovated scenario, not proof of completed work. Honor it and disclose it in the existing Comments and conclusion. For the subject condition and HVAC form fields only, an explicit assignment statement in valuationPolicy.assignment is also permissible evidence: quote it exactly in formEvidence and label the short display value '(assumed)'. Do not infer unspecified renovation scope. Old fixer-upper MLS remarks, tax-record HVAC and acquisition prices describe the earlier state; do not use them to discount a renovated scenario. Without an explicit renovation assumption or current evidence, do not presume renovation. Preserve historical prices as history, not current asking prices or automatic value anchors. Do not make time adjustments merely because today's date is later than the supplied market evidence; identify stale evidence and the valuation's limitations.
Derive marginal GLA, bedroom and bathroom rates case by case from the original evidence. There are NO default rates, including $75/SF, $350/SF or a standard condition deduction. Prefer credible paired sales or a supported source-specific marginal rate; distinguish a reasoned estimate from a measured rate. Explain the compared properties, calculation, confounding building/condition/view differences and uncertainty in rateEvidence. Sale price/SF is a total-property ratio, not a marginal GLA rate. If the evidence cannot quantify a difference, use rate zero, explicitly disclose that it is unquantified (not equal), and reduce reliance on affected comps; use an adequately comparable unadjusted sale if available or return canValue false. Do not choose rates to hit a target value. Apply the chosen rates consistently: GLA=(subject GLA-comp GLA)*rate; rooms=(subject bedrooms-comp bedrooms)*bedroom rate+(subject baths-comp baths)*bathroom rate. Deduct documented paid seller credits. Include every nonzero amount in the grid. Excellent versus Good and new construction may warrant a deduction, but neither label supplies its dollar amount. Require property-specific support, do not double-count condition/building/year/quality premiums, and reduce weight when the premium cannot be quantified.
Other differences require support for their dollar contribution. Do not invent a catch-all condition, HVAC, utility or other discount to force an indication toward a historical purchase price. Never deduct the same renovation deficiency through both condition and repair/system adjustments. If material current-condition differences cannot be quantified sufficiently to support a value, return canValue false rather than inventing a distressed value.
Reconcile from adjusted CLOSED sales using explicit weights in valuation.weights (sold.1, sold.2, sold.3; absent slots zero; sum=1). The primary sale must have the highest weight. As-is value must equal their weighted indication rounded to the nearest $1,000 (or less). Explain each weight using similarity, building/project, floor plan, condition, view/floor, concessions, age and gross adjustment burden. For condos, prioritize a same-building, near-identical-size/layout sale as the most direct anchor, even when older, unless specific evidence explains why another comp is more reliable. valuationPolicy.sameBuildingMatches flags address/size/layout matches, not verified equivalence of condition or view. When a same-building model match is available, competing sales with material unquantified size or condition differences must collectively receive less weight than the same-building matches, and cannot be primary. Recency and broad ZIP appreciation do not override this rule. Address floor/view differences explicitly; 6th and 14th floors are not the same. Newer branded projects and repeated sales from one different project are corroboration, not independent votes that overwhelm the model match merely through recency or averaging. Explain a departure from the same-building anchor in primaryReason. Use the same sourced dates, geographic scope, statistic definitions and rounded values in the form and narrative. Do not claim a building sales count or few pendings without documentary support. ZIP-wide statistics are context, not a condo-project appreciation rate or proof of strong demand. Assess absorption using segment-specific listings, pendings and exposure; distinguish preconstruction DOM from resale exposure. Never infer a pending contract price or willingness to pay the asking price.
Choose ONE recommended list price consistent with the reconciled value and supported exposure/competition; explain the premium in listReason, including long DOM and competing project differences. Do not offer an unsupported aspirational price or alternative list prices. Preserve factual differences from the manual examples; do not copy their conclusions. Use the existing summary format and conversational broker prose, without repeated section headings, source-quote dumps, schema names or implementation terminology. Original filenames/page citations may support key facts. Do not write arithmetic equations in narrative. Each sold/active section must include exactly one canonical sentence: "Adjusted sale indication: $X." or "Adjusted asking indication: $X." using sale/list price PLUS all signed adjustments, formatted with commas and no decimals. Explain adjustment direction correctly. The conclusion must match the grid, primary choice, weights, as-is value and single recommended list price.`;

export const valuationSchema={type:'object',additionalProperties:false,required:['basis','basisEvidence','rates','rateEvidence','reconciliation','weights','primaryReason','listReason'],properties:{weights:{type:'object',additionalProperties:false,required:['sold.1','sold.2','sold.3'],properties:Object.fromEntries(['sold.1','sold.2','sold.3'].map(p=>[p,{type:'number',minimum:0,maximum:1}]))},primaryReason:{type:'string',minLength:1,maxLength:1800},listReason:{type:'string',minLength:1,maxLength:1800},basis:{type:'string',enum:['current','assumed-renovated']},basisEvidence:{type:'string',minLength:1,maxLength:1500},rates:{type:'object',additionalProperties:false,required:['gla','beds','baths'],properties:Object.fromEntries(rateKeys.map(k=>[k,{type:'number',minimum:0,maximum:1000000}]))},rateEvidence:{type:'string',minLength:1,maxLength:1500},reconciliation:{type:'string',minLength:1,maxLength:2000}}};
const number=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(String(x).replace(/[$,]/g,''));return Number.isFinite(n)?n:null;};
export function valuationInput(values){
 const context=values._aiValuationContext,subjectCondition=selectedCondition(values);
 return {subjectCondition,ratePolicy:"case-by-case; no default rates",sameBuildingMatches:sameBuildingMatches(values),assignment:!subjectCondition&&context&&context.address===values.field_0008&&context.basis==='assumed-renovated'?{basis:context.basis,evidence:String(context.evidence||'').slice(0,1500)}:null};
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
 if(!v||!['current','assumed-renovated'].includes(v.basis)||!v.rates||rateKeys.some(k=>typeof v.rates[k]!=='number'||!Number.isFinite(v.rates[k])||v.rates[k]<0||v.rates[k]>1000000)||['basisEvidence','rateEvidence','reconciliation'].some(k=>typeof v[k]!=='string'||!v[k].trim()))throw Error('Supply a valuation basis, consistent marginal rates, supporting evidence and reconciliation.');
 if(input.valuationPolicy.assignment&&v.basis!==input.valuationPolicy.assignment.basis)throw Error('Value the explicitly assigned renovated scenario, not the historic fixer-upper condition.');
 if(input.valuationPolicy.subjectCondition&&v.basis!=='current')throw Error('Use the current user-selected subject condition, not a previous renovation assumption.');
 if(/^(?:broker convention|default|none|n\/a)$/i.test(v.rateEvidence.trim()))throw Error('Explain case-specific rate support or explicitly describe unquantified differences; no default rates are permitted.');
 const facts={...Object.fromEntries(input.facts.map(f=>[f.key,f.value])),...result.formFields};
 const mismatches=[];
 for(const expected of calculatedAdjustments(facts,v.rates)){
  const actual=result.adjustments.find(a=>a.name===expected.name)?.amount||0;
  if(actual!==expected.amount)mismatches.push(expected.name+' = '+expected.amount);
 }
 if(mismatches.length)throw Error('The adjustment grid must include all of these calculated amounts: '+mismatches.join('; ')+'. Reconcile value and narrative to the corrected grid.');
 const prices=input.sold.map(p=>{const price=number(facts[p+'.price']);return price>0?price+result.adjustments.filter(a=>a.name.startsWith(p+'.')).reduce((sum,a)=>sum+a.amount,0):null;}).filter(n=>n!==null);
 if(!prices.length||prices.some(n=>n<=0)||result.asIs<Math.min(...prices)-500||result.asIs>Math.max(...prices)+500)throw Error('Reconcile the value within the adjusted closed-sale range (allowing at most $500 rounding); a historical subject price cannot replace comparable reconciliation.');
 validateReconciliation(result,input,facts);
 return {...v,adjustedSold:Object.fromEntries(input.sold.map(p=>[p,number(facts[p+'.price'])+result.adjustments.filter(a=>a.name.startsWith(p+'.')).reduce((sum,a)=>sum+a.amount,0)]))};
}

export function sameBuildingMatches(facts){
 const street=x=>String(x||'').toLowerCase().split(/\b(?:unit|apt|suite)\b|#|,/)[0].replace(/\bstreet\b/g,'st').replace(/\bavenue\b/g,'ave').replace(/\bboulevard\b/g,'blvd').replace(/[^a-z0-9]/g,'');
 const subject=street(facts['sold.0.address']||facts.field_0008),gla=number(facts['sold.0.gla']);
 return ['sold.1','sold.2','sold.3'].filter(p=>subject&&street(facts[p+'.address'])===subject&&gla>0&&Math.abs(number(facts[p+'.gla'])-gla)/gla<=0.02&&['beds','baths'].every(k=>number(facts['sold.0.'+k])!==null&&number(facts[p+'.'+k])===number(facts['sold.0.'+k])));
}
export function validateReconciliation(result,input,facts){
 const v=result.valuation,w=v.weights,slots=['sold.1','sold.2','sold.3'];
 if(!w||slots.some(p=>typeof w[p]!=='number'||!Number.isFinite(w[p])||w[p]<0||w[p]>1||(!input.sold.includes(p)&&w[p]!==0))||Math.abs(slots.reduce((n,p)=>n+w[p],0)-1)>0.0001)throw Error('Provide closed-sale weights totaling one; absent slots must have zero weight.');
 if(!input.sold.includes(result.primarySold)||input.sold.some(p=>w[p]>w[result.primarySold]))throw Error('The primary sold comparable must carry the highest reconciliation weight.');
 if(!v.primaryReason?.trim()||!v.listReason?.trim())throw Error('Explain primary-comp weighting and the single recommended list price.');
 const matches=sameBuildingMatches(facts).filter(p=>input.sold.includes(p));
 const subjectArea=number(facts['sold.0.gla']),subjectCondition=input.valuationPolicy?.subjectCondition||facts['sold.0.condition'];
 const knownCondition=x=>['poor','fair','average','good','excellent'].includes(String(x||'').toLowerCase());
 const unquantified=input.sold.filter(p=>!matches.includes(p)&&((subjectArea>0&&number(facts[p+'.gla'])>0&&Math.abs(number(facts[p+'.gla'])-subjectArea)/subjectArea>0.02&&v.rates?.gla===0)||(knownCondition(subjectCondition)&&knownCondition(facts[p+'.condition'])&&String(subjectCondition).toLowerCase()!==String(facts[p+'.condition']).toLowerCase()&&!result.adjustments.some(a=>a.name===p+'.adj_condition'&&a.amount!==0))));
 if(matches.length&&unquantified.length&&(unquantified.includes(result.primarySold)||unquantified.reduce((n,p)=>n+w[p],0)>=matches.reduce((n,p)=>n+w[p],0)))throw Error('Same-building model matches '+matches.join(', ')+' must collectively outweigh sales with unquantified size/condition differences '+unquantified.join(', ')+'. Do not select an unquantified different-project sale as primary based only on recency or broad market trends. Revise weights, value, listing strategy and narrative consistently.');
 const total=p=>number(facts[p+'.price'])+result.adjustments.filter(a=>a.name.startsWith(p+'.')).reduce((sum,a)=>sum+a.amount,0);
 const weighted=input.sold.reduce((n,p)=>n+total(p)*w[p],0);
 if(Math.abs(result.asIs-weighted)>500)throw Error('Reconcile as-is value to the explicit weighted closed-sale indication '+Math.round(weighted)+' (maximum $500 rounding).');
 for(const section of result.sections||[]){
  if(/\$[\d,]+(?:\.\d+)?\s*[+−-]\s*\$?[\d,]+/.test(section.body))throw Error('Do not write monetary arithmetic equations in narrative; use the verified adjusted indication.');
  if(!/^(sold|active)\.[1-3]$/.test(section.id))continue;
  const expected=total(section.id),label=section.id.startsWith('sold.')?'sale':'asking',sentence='Adjusted '+label+' indication: $'+Math.round(expected).toLocaleString('en-US')+'.';
  if(!section.body.includes(sentence))throw Error('Include this exact grid-consistent sentence in '+section.id+': '+sentence);
  const mentions=[...section.body.matchAll(/adjusted (?:sale |asking |list |closed-sale )?(?:price|indication|value|sale)(?:[^$.\n]{0,60})\$([\d,]+)/gi)];
  if(mentions.some(m=>number(m[1])!==Math.round(expected)))throw Error('Narrative adjusted amounts must match the grid in '+section.id+'.');
 }
}

// Shared by the endpoint and browser: every applicable unfilled form control
// must be considered, independently of the manual extraction restrictions.
const protectedNames=new Set(['field_0002','field_0008','field_0015','field_0018','field_0019','field_0021','field_0477','field_0478','field_0483','field_0484']);
const numericField=name=>/\.(price|gla)$/.test(name)||['field_0479','field_0480','market_months_supply'].includes(name);
const metricField=name=>name.startsWith('market_')&&!['market_zip','market_county'].includes(name)||['field_0038','field_0039'].includes(name);
const evidenceField=name=>metricField(name)||name==='market_county'||name==='sold.0.price'||/\.(rooms|basement|energy|utility|tenure|condition|quality|hvac|porches|fireplace|fence)$/.test(name);
export const evidenceNames=plan=>plan.fields.filter(f=>evidenceField(f.name)).map(f=>f.name);
export function completionPlan(values,schema){
 const active=['active.1','active.2','active.3'].filter(p=>values[p+'.address']);
 const assumedRenovated=values._aiValuationContext?.basis==='assumed-renovated'&&values._aiValuationContext.address===values.field_0008;
 const fields=schema.filter(f=>{
  if(protectedNames.has(f.name)||f.readonly||f.group||f.kind==='select'||f.name.includes('.adj_')||/\.(ppsf|net|adjusted)$/.test(f.name)||f.name.startsWith('repair.'))return false;
  const m=f.name.match(/^(sold|active)\.(\d)\.(.+)$/);
  if(m&&((m[2]!=='0'&&!values[m[1]+'.'+m[2]+'.address'])||(m[1]==='active'&&m[2]==='0'&&m[3]!=='price')))return false;
  if(['field_0479','field_0480','field_0482'].includes(f.name))return true;
  if(assumedRenovated&&['sold.0.condition','sold.0.hvac'].includes(f.name))return true;
  const value=values[f.name],sourced=values._aiFields?.[f.name];
  return value===undefined||value===null||value===''||(!sourced&&f.kind==='check')||values._generalDefaults?.[f.name]===value||values._roomDefaults?.[f.name]===value||/not (?:explicit|listed|provided)|\bdefault\b|no total rooms/i.test(sourced?.evidence||'');
 }).map(f=>({name:f.name,label:f.label,kind:f.kind,maxChars:f.kind==='textarea'?420:Math.max(2,Math.floor((f.w-4)/3))}));
 const choices=[...new Set(schema.map(f=>f.group).filter(g=>g&&g!=='header_bpo_type'))].map(group=>({group,options:schema.filter(f=>f.group===group).map(f=>({name:f.name,label:f.option||f.label}))}));
 return {fields,choices,active};
}
export function completionSchema(plan){return {
 formEvidence:{type:'object',additionalProperties:false,required:evidenceNames(plan),properties:Object.fromEntries(evidenceNames(plan).map(name=>[name,{type:['string','null'],maxLength:500}]))},
 formFields:{description:'Short display values only, such as Average or Fee Simple. Never put citations or evidence in a value. Quotes belong only in formEvidence.',type:'object',additionalProperties:false,required:plan.fields.map(f=>f.name),properties:Object.fromEntries(plan.fields.map(f=>[f.name,f.kind==='check'?{type:['boolean','null']}:{type:['string','null'],minLength:1,maxLength:f.maxChars,description:f.kind==='textarea'?'Concise report comments.':'Only the field value. No source quotes, document/page references, or explanations.',pattern:numericField(f.name)?'^(?:N/A|[0-9]+(?:\\.[0-9]+)?)$':f.kind==='textarea'?'^[ -~\\n]+$':"^[A-Za-z0-9 $%.,()/+&'-]+$"}]))},
 choices:{type:'object',additionalProperties:false,required:plan.choices.map(g=>g.group),properties:Object.fromEntries(plan.choices.map(g=>[g.group,{type:['string','null'],enum:[...g.options.map(o=>o.name),null]}]))},
 primaryActive:{type:'string',enum:plan.active.length?plan.active:['']},
 repairs:{type:'array',maxItems:10,items:{type:'object',additionalProperties:false,required:['description','cost'],properties:{description:{type:'string',maxLength:35},cost:{type:['number','null'],minimum:0,maximum:1e9}}}},
 repairStatus:{type:'string',enum:['none_reported','documented','unknown']}
};}
export function validateCompletion(result,plan){
 for(const [key,entries] of [['formFields',plan.fields.map(f=>f.name)],['choices',plan.choices.map(g=>g.group)]]){
  const obj=result[key];if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).length!==entries.length||entries.some(n=>!Object.hasOwn(obj,n)))throw Error('Complete every requested '+key+' entry; use null only when the sources do not supply it.');
 }
 for(const name of ['field_0014','header_client_phone'])if(Object.hasOwn(result.formFields,name))result.formFields[name]=null; // Missing client identity cannot be borrowed from brokerage branding.
 const metrics=plan.fields.filter(f=>evidenceField(f.name));
 if(!result.formEvidence||typeof result.formEvidence!=='object'||Array.isArray(result.formEvidence)||Object.keys(result.formEvidence).length!==metrics.length||metrics.some(f=>!Object.hasOwn(result.formEvidence,f.name)))throw Error('Account for each requested fact with an exact source quote or null.');
 for(const f of metrics){const quote=result.formEvidence[f.name];if(quote!==null&&(typeof quote!=='string'||quote.length>500))throw Error('Invalid form source quote.');
  const value=result.formFields[f.name],number=Number(String(value??'').replace(/[$,%]/g,''));
  const numbers=typeof quote==='string'?(quote.replace(/,/g,'').match(/-?\d+(?:\.\d+)?/g)||[]).map(Number):[];
  const propertyLabels={rooms:/\btotal\s+rooms|\brooms\s*[:=]/i,basement:/basement/i,energy:/energy|efficient|solar|insulat|green feature/i,utility:/functional|utility|layout|floor plan/i,tenure:/tenure|fee simple|leasehold|property rights/i,condition:/condition/i,quality:/quality|construction/i,hvac:/heating|cooling|hvac|air condition/i,porches:/porch|patio|deck/i,fireplace:/fireplace/i,fence:/fence|fencing/i};
  const labels=f.name==='market_county'?/\bcounty\b/i:f.name==='sold.0.price'?/\b(?:sold|sale|closed|closing)\s+price/i:propertyLabels[f.name.split('.').pop()]|| (f.name==='market_months_supply'?/months?\s+(?:of\s+)?(?:supply|inventory)|(?:supply|inventory).{0,25}months?/i:f.name.includes('median_home_value')?/median.{0,25}(?:home|property).{0,15}value/i:f.name.includes('median_list_price')?/median.{0,25}(?:list|asking).{0,15}price/i:f.name.includes('median_home_age')?/median.{0,25}(?:home|property).{0,15}age|median\s+age/i:f.name==='field_0038'?/owner.{0,15}occup/i:f.name==='field_0039'?/rent(?:er|al).{0,15}occup/i:/price.{0,35}chang|chang.{0,35}price/i);
  if(value!==null&&(!quote||/\b(?:not|none|no)\b[^.;]{0,80}(?:provid|specif|document|stat|list|report|avail|given|explicit|mention|suppli|information|details)|\bdefault\b/i.test(quote)||!labels.test(quote)||((metricField(f.name)||f.name==='sold.0.price'||f.name.endsWith('.rooms'))&&!numbers.includes(number))))result.formFields[f.name]=null;
 }
 for(const f of plan.fields){let v=result.formFields[f.name];if(typeof v==='string'){
   v=v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2010-\u2015\u2212]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,'...').replace(/\r\n?/g,'\n').trim();if(!v||/^(?:N\/P|unknown|not (?:provided|supplied|reported|documented|available|stated|specified))$/i.test(v))v=null;
   else if(/^(?:n\/a|not applicable)$/i.test(v))v='N/A';
   else if(numericField(f.name))v=v.replace(/[$,\s]/g,'');
   result.formFields[f.name]=v;
  }if(v===null)continue;if(f.kind!=='check'&&f.kind!=='textarea'&&(/[\":\n]/.test(v)||/\bDoc(?:ument)?\s*(?:\d|Active|Sold)\b/i.test(v)))throw Error('Return only the short display value for '+f.name+'; put source quotes exclusively in formEvidence.');if(f.kind==='check'?typeof v!=='boolean':typeof v!=='string'||!v.trim()||v.length>f.maxChars||/[^\x20-\x7e\n]/.test(v))throw Error('Invalid or oversized form value: '+f.name);if(f.kind!=='check'&&v!=='N/A'&&numericField(f.name)&&!/^\d+(?:\.\d+)?$/.test(v))throw Error('Use numeric digits without currency symbols for '+f.name);}
 for(const g of plan.choices)if(result.choices[g.group]!==null&&!g.options.some(o=>o.name===result.choices[g.group]))throw Error('Invalid form choice: '+g.group);
 if(!(plan.active.length?plan.active:['']).includes(result.primaryActive))throw Error('Select an existing primary active comparable.');
 if(!['none_reported','documented','unknown'].includes(result.repairStatus)||!Array.isArray(result.repairs)||result.repairs.length>10||result.repairs.some(r=>typeof r.description!=='string'||!r.description.trim()||r.description.length>35||/[^\x20-\x7e]/.test(r.description)||(r.cost!==null&&(!Number.isFinite(r.cost)||r.cost<0||r.cost>1e9)))||(result.repairStatus==='documented')!==!!result.repairs.length)throw Error('Return the documented repair items, or an explicit no-report/unknown repair status.');
 if(!result.formFields.field_0482||result.formFields.field_0482==='N/A')throw Error('Complete the form Comments with a concise valuation rationale.');
 return {formFields:result.formFields,formEvidence:result.formEvidence,choices:result.choices,primaryActive:result.primaryActive,repairs:result.repairs,repairStatus:result.repairStatus};
}

// Shared by the endpoint and browser: every applicable unfilled form control
// must be considered, independently of the manual extraction restrictions.
const protectedNames=new Set(['field_0002','field_0008','field_0015','field_0018','field_0019','field_0021','field_0477','field_0478','field_0483','field_0484']);
export function completionPlan(values,schema){
 const active=['active.1','active.2','active.3'].filter(p=>values[p+'.address']);
 const fields=schema.filter(f=>{
  if(protectedNames.has(f.name)||f.readonly||f.group||f.kind==='select'||f.name.includes('.adj_')||/\.(ppsf|net|adjusted)$/.test(f.name)||f.name.startsWith('repair.'))return false;
  const m=f.name.match(/^(sold|active)\.(\d)\.(.+)$/);
  if(m&&((m[2]!=='0'&&!values[m[1]+'.'+m[2]+'.address'])||(m[1]==='active'&&m[2]==='0'&&m[3]!=='price')))return false;
  if(['field_0479','field_0480','field_0482'].includes(f.name))return true;
  const value=values[f.name],sourced=values._aiFields?.[f.name];
  return value===undefined||value===null||value===''||(!sourced&&f.kind==='check')||values._generalDefaults?.[f.name]===value||values._roomDefaults?.[f.name]===value||/not (?:explicit|listed|provided)|default convention/i.test(sourced?.evidence||'');
 }).map(f=>({name:f.name,label:f.label,kind:f.kind,maxChars:f.kind==='textarea'?420:Math.max(2,Math.floor((f.w-4)/3)),current:values[f.name]??null}));
 const choices=[...new Set(schema.map(f=>f.group).filter(g=>g&&g!=='header_bpo_type'))].map(group=>({group,options:schema.filter(f=>f.group===group).map(f=>({name:f.name,label:f.option||f.label}))}));
 return {fields,choices,active};
}
export function completionSchema(plan){return {
 formFields:{type:'object',additionalProperties:false,required:plan.fields.map(f=>f.name),properties:Object.fromEntries(plan.fields.map(f=>[f.name,f.kind==='check'?{type:['boolean','null']}:{type:['string','null'],maxLength:f.maxChars}]))},
 choices:{type:'object',additionalProperties:false,required:plan.choices.map(g=>g.group),properties:Object.fromEntries(plan.choices.map(g=>[g.group,{type:['string','null'],enum:[...g.options.map(o=>o.name),null]}]))},
 primaryActive:{type:'string',enum:plan.active.length?plan.active:['']},
 repairs:{type:'array',maxItems:10,items:{type:'object',additionalProperties:false,required:['description','cost'],properties:{description:{type:'string',maxLength:35},cost:{type:['number','null'],minimum:0,maximum:1e9}}}},
 repairStatus:{type:'string',enum:['none_reported','documented','unknown']}
};}
export function validateCompletion(result,plan){
 for(const [key,entries] of [['formFields',plan.fields.map(f=>f.name)],['choices',plan.choices.map(g=>g.group)]]){
  const obj=result[key];if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).length!==entries.length||entries.some(n=>!Object.hasOwn(obj,n)))throw Error('Complete every requested '+key+' entry; use null only when the sources do not supply it.');
 }
 for(const f of plan.fields){const v=result.formFields[f.name];if(v===null)continue;if(f.kind==='check'?typeof v!=='boolean':typeof v!=='string'||!v.trim()||v.length>f.maxChars||/[^\x20-\x7e\n]/.test(v))throw Error('Invalid or oversized form value: '+f.name);if(f.kind!=='check'&&v!=='N/A'&&(/\.(price|gla)$/.test(f.name)||['field_0479','field_0480','market_months_supply'].includes(f.name))&&!/^\d+(?:\.\d+)?$/.test(v))throw Error('Use numeric digits without currency symbols for '+f.name);}
 for(const g of plan.choices)if(result.choices[g.group]!==null&&!g.options.some(o=>o.name===result.choices[g.group]))throw Error('Invalid form choice: '+g.group);
 if(!(plan.active.length?plan.active:['']).includes(result.primaryActive))throw Error('Select an existing primary active comparable.');
 if(!['none_reported','documented','unknown'].includes(result.repairStatus)||!Array.isArray(result.repairs)||result.repairs.length>10||result.repairs.some(r=>typeof r.description!=='string'||!r.description.trim()||r.description.length>35||/[^\x20-\x7e]/.test(r.description)||(r.cost!==null&&(!Number.isFinite(r.cost)||r.cost<0||r.cost>1e9)))||(result.repairStatus==='documented')!==!!result.repairs.length)throw Error('Return the documented repair items, or an explicit no-report/unknown repair status.');
 if(!result.formFields.field_0482||result.formFields.field_0482==='N/A')throw Error('Complete the form Comments with a concise valuation rationale.');
 return {formFields:result.formFields,choices:result.choices,primaryActive:result.primaryActive,repairs:result.repairs,repairStatus:result.repairStatus};
}

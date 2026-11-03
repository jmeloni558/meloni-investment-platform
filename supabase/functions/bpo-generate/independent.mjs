import {cleanExtraction, schemaFor, instructions, v14Instructions, generalSubjectInstructions} from '../bpo-extract/contract.mjs';
import {selectedCondition} from './completion.mjs';

export const sourceDocuments = values => (values._attachments || []).filter(d => d.extract !== false && d.sourceKind !== 'tax' && d.category !== 'tax');
export function sourceAssignment(values) {
 return {_clientTemplate:'general',_lotUnit:'sqft',_aiSubjectCondition:selectedCondition(values),
  _attachments:sourceDocuments(values).map(d=>({path:d.path,category:d.category,sourceKind:d.sourceKind,name:d.name}))};
}
// Always reread the original documents. Stored extraction also received existing
// manual values in older releases and therefore is not an independent input.
export async function readIndependentFacts({values,schema,documents,key,model,fetchImpl}) {
 const assignment=sourceAssignment(values);
 const fields=schema.filter(f=>f.name==='field_0008'||/^(sold|active)\.[0-3]\.(address|city|state|zip|price|gla|beds|baths|date|financing)$/.test(f.name));
 const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({model,store:false,
  instructions:instructions+'\n'+v14Instructions+'\n'+generalSubjectInstructions+'\nRead only original property source evidence. Ignore any completed broker opinion, adjustment grid, recommended price or narrative found in an uploaded BPO. Do not use those conclusions as evidence. Identify the subject from subject-group documents and comparable properties from sold/active-group documents. Do not invent missing facts.',
  input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({fields:fields.map(f=>({name:f.name,label:f.label,type:f.kind}))})},...documents]}],reasoning:{effort:'low'},max_output_tokens:7000,text:{format:{type:'json_schema',name:'independent_source_facts',strict:true,schema:schemaFor(fields)}}})});
 const payload=await response.json();
 if(!response.ok||payload.status!=='completed')throw Error('Independent source reading did not finish.');
 const text=payload.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('')||'';
 const extracted=cleanExtraction(JSON.parse(text),fields,assignment._attachments,{general:true});
 const fresh={...assignment,_aiFields:{},_aiReview:{at:'independent-source-read'}};
 for(const f of extracted.fields){fresh[f.name]=f.value;fresh._aiFields[f.name]=f;}
 return fresh;
}

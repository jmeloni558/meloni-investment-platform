'use strict';
const {completionPlan,validateCompletion}=require('../../supabase/functions/bpo-generate/completion.mjs');
function sourceKey(v){return JSON.stringify((v._attachments||[]).map(d=>[d.path,d.category,d.sourceKind,d.extract]));}
function fingerprint(v,C){return JSON.stringify([C.summaryFingerprint(v),sourceKey(v),v._lotUnit,v._aiReview?.at]);}
function ready(v,C){return v._clientTemplate!=='rrr'&&C.validAddress(v.field_0008)&&C.number(v['sold.0.gla'])>0&&[1,2,3].some(i=>v['sold.'+i+'.address']&&C.number(v['sold.'+i+'.price'])>0&&C.number(v['sold.'+i+'.gla'])>0)&&!!v._aiReview?.at&&(v._aiSourceKey===sourceKey(v)||(!v._aiSourceKey&&(v._attachments||[]).filter(d=>d.extract!==false&&d.sourceKind!=='tax').length>0&&(v._attachments||[]).filter(d=>d.extract!==false&&d.sourceKind!=='tax').every(d=>Object.values(v._aiFields||{}).some(s=>!s.removed&&s.path===d.path))));}
function accept(v,result,C){
 if(result?.aiBpoVersion!==2||![result.asIs,result.listPrice].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<1e10)||!/^sold\.[1-3]$/.test(result.primarySold)||!v[result.primarySold+'.address']||!Array.isArray(result.adjustments))throw Error('The AI BPO response was incomplete. Please refresh and generate again.');
 const plan=completionPlan(v,C.schema);validateCompletion(result,plan);
 const snapshot=structuredClone(v);delete snapshot._aiBpo;delete snapshot._summary;delete snapshot._adjustments;delete snapshot._summaryNotes;
 for(const f of C.schema)if(f.name.includes('.adj_')||/^field_047[7-9]$|^field_048[0234]$|^primary_/.test(f.name))delete snapshot[f.name];
 const missing=[],notApplicable=[],unused=['sold','active'].flatMap(k=>[1,2,3].map(i=>k+'.'+i)).filter(p=>!v[p+'.address']);
 for(const f of plan.fields){const x=result.formFields[f.name];snapshot[f.name]=x===null||x==='N/A'?'':x;delete snapshot._aiFields?.[f.name];delete snapshot._roomDefaults?.[f.name];if(x===null)missing.push(f.name);if(x==='N/A')notApplicable.push(f.name);
  const peer=f.name.match(/^sold\.0\.(.+)$/);if(peer&&!['price','date'].includes(peer[1])){const name='active.0.'+peer[1];snapshot[name]=snapshot[f.name];delete snapshot._aiFields?.[name];delete snapshot._roomDefaults?.[name];if(x===null)missing.push(name);if(x==='N/A')notApplicable.push(name);}
 }
 for(const group of plan.choices)for(const option of group.options)snapshot[option.name]=result.choices[group.group]===option.name;
 for(const f of C.schema){if(f.name.startsWith('repair.'))snapshot[f.name]=f.kind==='check'?false:'';if(f.name.includes('.adj_')&&!unused.some(p=>f.name.startsWith(p+'.')))snapshot[f.name]='0';}
 result.repairs.forEach((r,i)=>{snapshot[`repair.${i}.description`]=r.description;snapshot[`repair.${i}.cost`]=r.cost===null?'':String(r.cost);snapshot[`repair.${i}.recommended`]=true;if(r.cost===null)missing.push(`repair.${i}.cost`);});
 snapshot._aiCompletion={version:2,missing,notApplicable,unused,repairStatus:result.repairStatus,repairCount:result.repairs.length,unpricedRepairs:result.repairStatus==='unknown'||result.repairs.some(r=>r.cost===null),unverifiedChoices:plan.choices.filter(g=>result.choices[g.group]===null).map(g=>g.group)};
 snapshot.field_0482=result.formFields.field_0482+'\nN/P = not provided; N/A = not applicable. Unmarked choices are unverified. $0 adjustments mean no supported dollar change.';
 const seen=new Set();for(const a of result.adjustments){const p=a.name?.match(/^(sold|active)\.[1-3]/)?.[0];if(!C.byName.has(a.name)||!a.name.includes('.adj_')||!p||!v[p+'.address']||seen.has(a.name)||!Number.isFinite(a.amount)||Math.abs(a.amount)>1e9||typeof a.reason!=='string'||!a.reason.trim())throw Error('Invalid AI adjustment.');seen.add(a.name);snapshot[a.name]=String(a.amount);}
 snapshot.field_0484='';snapshot._generalFieldDefaultsVersion=1;
 snapshot.field_0477=String(result.asIs);snapshot.field_0478=String(result.listPrice);snapshot.primary_sold_comp='Comp '+result.primarySold.split('.').pop();
 snapshot.primary_active_comp=result.primaryActive?'Comp '+result.primaryActive.split('.').pop():'';
 snapshot._summaryNotes={primary:result.primarySold,primaryActive:result.primaryActive};
 const calculated=C.recalculate(snapshot);calculated._summary=C.acceptSynthesizedSummary(calculated,result);
 calculated._summary.generation='ai-bpo'; // Never marks an AI result as human-reviewed.
 C.validateSummary(calculated);const errors=C.issues(calculated);if(errors.length)throw Error(errors[0]);
 const fit=C.fitIssues(calculated);if(fit.length)throw Error(fit[0].message);
 return {version:2,source:fingerprint(v,C),generatedAt:new Date().toISOString(),values:calculated,adjustments:result.adjustments};
}
function displayValue(v,f,value){
 const c=v._aiCompletion;if(c?.version!==2||f.kind==='check'||f.kind==='select')return value;
 if(c.unused.some(p=>f.name.startsWith(p+'.')))return f.name.endsWith('.address')?'Not supplied':'N/A';
 if(c.missing.includes(f.name))return 'N/P';if(c.notApplicable.includes(f.name))return 'N/A';
 if(f.name==='repair.total'&&c.unpricedRepairs)return 'N/P';
 const repair=f.name.match(/^repair\.(\d)\.(description|cost)$/);if(repair&&+repair[1]>=c.repairCount)return +repair[1]===0&&repair[2]==='description'?(c.repairStatus==='none_reported'?'No repairs reported':'Repairs not documented'):'N/A';
 if(/\.ppsf$/.test(f.name)&&!String(value??'').trim())return c.notApplicable.includes(f.name.replace(/ppsf$/,'price'))?'N/A':'N/P';
 return value;
}
module.exports={aiBpoDisplayValue:displayValue,aiBpoSourceKey:sourceKey,aiBpoFingerprint:fingerprint,aiBpoReady:ready,acceptAiBpo:accept};

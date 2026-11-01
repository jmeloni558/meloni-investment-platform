'use strict';
function sourceKey(v){return JSON.stringify((v._attachments||[]).map(d=>[d.path,d.category,d.sourceKind,d.extract]));}
function fingerprint(v,C){return JSON.stringify([C.summaryFingerprint(v),sourceKey(v),v._lotUnit,v._aiReview?.at]);}
function ready(v,C){return v._clientTemplate!=='rrr'&&C.validAddress(v.field_0008)&&C.number(v['sold.0.gla'])>0&&[1,2,3].some(i=>v['sold.'+i+'.address']&&C.number(v['sold.'+i+'.price'])>0&&C.number(v['sold.'+i+'.gla'])>0)&&!!v._aiReview?.at&&(v._aiSourceKey===sourceKey(v)||(!v._aiSourceKey&&(v._attachments||[]).filter(d=>d.extract!==false&&d.sourceKind!=='tax').length>0&&(v._attachments||[]).filter(d=>d.extract!==false&&d.sourceKind!=='tax').every(d=>Object.values(v._aiFields||{}).some(s=>!s.removed&&s.path===d.path))));}
function accept(v,result,C){
 if(result?.aiBpoVersion!==1||![result.asIs,result.listPrice].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<1e10)||!/^sold\.[1-3]$/.test(result.primarySold)||!v[result.primarySold+'.address']||!Array.isArray(result.adjustments))throw Error('The AI BPO response was incomplete. Please retry.');
 const snapshot=structuredClone(v);delete snapshot._aiBpo;delete snapshot._summary;delete snapshot._adjustments;delete snapshot._summaryNotes;
 for(const f of C.schema)if(f.name.includes('.adj_')||/^field_047[7-9]$|^field_048[0234]$|^primary_/.test(f.name))delete snapshot[f.name];
 const seen=new Set();for(const a of result.adjustments){const p=a.name?.match(/^(sold|active)\.[1-3]/)?.[0];if(!C.byName.has(a.name)||!a.name.includes('.adj_')||!p||!v[p+'.address']||seen.has(a.name)||!Number.isFinite(a.amount)||Math.abs(a.amount)>1e9||typeof a.reason!=='string'||!a.reason.trim())throw Error('Invalid AI adjustment.');seen.add(a.name);snapshot[a.name]=String(a.amount);}
 snapshot.field_0484='';snapshot._generalFieldDefaultsVersion=1;
 snapshot.field_0477=String(result.asIs);snapshot.field_0478=String(result.listPrice);snapshot.primary_sold_comp='Comp '+result.primarySold.split('.').pop();
 snapshot._summaryNotes={primary:result.primarySold};
 const calculated=C.recalculate(snapshot);calculated._summary=C.acceptSynthesizedSummary(calculated,result);
 calculated._summary.generation='ai-bpo'; // Never marks an AI result as human-reviewed.
 C.validateSummary(calculated);const errors=C.issues(calculated);if(errors.length)throw Error(errors[0]);
 return {version:1,source:fingerprint(v,C),generatedAt:new Date().toISOString(),values:calculated,adjustments:result.adjustments};
}
module.exports={aiBpoSourceKey:sourceKey,aiBpoFingerprint:fingerprint,aiBpoReady:ready,acceptAiBpo:accept};

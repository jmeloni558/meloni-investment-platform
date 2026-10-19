'use strict';
// Read-only restore gate. The deletion list must come from outside the restored
// database. This does not delete data or certify Storage/provider erasure.
const TABLES=Object.freeze(['account_access_overrides','analyses','analysis_versions','billing_checkout_attempts',
  'billing_customers','billing_plan_change_operations','billing_subscriptions','clients','edge_rate_limits',
  'external_api_usage','letters_of_intent','mobile_places_usage','mobile_shared_analyses','mobile_streetview_usage',
  'profiles','properties','property_entitlements','saved_listing_shortlist','scenarios']);
const INVENTORY_SQL=`select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and column_name in ('user_id','account_id','owner_id') order by table_name,column_name`;
const PRODUCTION_TABLES=Object.freeze(TABLES.filter(t=>!['mobile_places_usage','mobile_streetview_usage'].includes(t)).concat('google_account_daily_usage').sort());
// A reviewed optional migration table is checked when present. Unknown tables still block.
function tablesForProject(project,inventory=[]){
 const base=project==='lmaiqpkogmmsldkziggy'?PRODUCTION_TABLES:TABLES;
 return inventory.some(r=>r.table_name==='property_income_comparables')?[...base,'property_income_comparables'].sort():base;
}
function findingsSql(tables){return [
  `select 'auth.users' as source,count(*)::int as matches from auth.users where id=any($1::uuid[])`,
  ...tables.map(t=>`select 'public.${t}',count(*)::int from public.${t} where user_id=any($1::uuid[])`),
  `select 'storage.objects',count(*)::int from storage.objects where owner=any($1::uuid[])
or owner_id=any($1::text[]) or (bucket_id='report-brand-assets' and split_part(name,'/',1)=any($1::text[]))`
].join('\nunion all\n');}
const FINDINGS_SQL=findingsSql(TABLES);
function instant(v) {if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('UTC timestamp required');return Date.parse(v);}
function validateManifest(m,{expectedProject,restorePointAt,cutoverAt,now}) {
  if(!m||m.version!==1||m.project!==expectedProject||!expectedProject||m.source!=='independent-deletion-ledger'||m.inventoryComplete!==true)
    throw Error('Independent complete deletion ledger required');
  if(typeof m.evidenceReference!=='string'||!m.evidenceReference.trim())throw Error('Ledger verification evidence required');
  const through=instant(m.verifiedThrough),cutoff=instant(cutoverAt),clock=instant(now);
  if(through<cutoff||through>clock||cutoff>clock)throw Error('Deletion ledger does not cover cutover');
  const start=instant(m.coverageStartedAt),restore=instant(restorePointAt);
  if(start>restore||restore>cutoff||start>through)throw Error('Restore point outside deletion-ledger coverage');
  if(!Array.isArray(m.accountIds)||m.accountIds.length>10000)throw Error('Bounded account inventory required');
  const ids=m.accountIds.map(id=>{
    if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('Invalid account identifier');
    return id.toLowerCase();
  });
  if(new Set(ids).size!==ids.length)throw Error('Duplicate account identifiers');
  return ids;
}
async function checkRestore({query,manifest,expectedProject,restorePointAt,cutoverAt,now}) {
  const ids=validateManifest(manifest,{expectedProject,restorePointAt,cutoverAt,now});
  // Caller must independently verify ledger provenance and destination project.
  // Query must execute against a quarantined restore with sufficient read access.
  const inventory=await query(INVENTORY_SQL,[]);
  const tables=tablesForProject(expectedProject,inventory.rows);
  const expected=tables.map(table_name=>({table_name,column_name:'user_id',data_type:'uuid'}));
  const key=r=>`${r.table_name}:${r.column_name}:${r.data_type}`;
  if(inventory.rows.length!==expected.length||inventory.rows.some(r=>!expected.some(e=>key(e)===key(r)))||new Set(inventory.rows.map(key)).size!==expected.length)
    return {status:'blocked-schema-drift',releaseAllowed:false};
  const {rows}=await query(findingsSql(tables),[ids]);
  const sources=['auth.users',...tables.map(t=>'public.'+t),'storage.objects'];
  if(rows.length!==sources.length||new Set(rows.map(r=>r.source)).size!==sources.length||rows.some(r=>!sources.includes(r.source)||!Number.isSafeInteger(r.matches)||r.matches<0))
    throw Error('Incomplete restore inspection');
  const findings=rows.filter(r=>r.matches>0).map(r=>({source:r.source,matches:r.matches}));
  return {status:findings.length?'blocked-restored-data':'database-sample-clear',releaseAllowed:false,findings,
    checkedAccounts:ids.length,limitation:'Read-only database check. Independent ledger provenance, schema coverage, Storage bytes/CDN, sessions, providers and restore admission controls require separate verification.'};
}
module.exports={TABLES,PRODUCTION_TABLES,tablesForProject,findingsSql,INVENTORY_SQL,FINDINGS_SQL,validateManifest,checkRestore};

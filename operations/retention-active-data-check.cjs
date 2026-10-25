'use strict';
const {TABLES,INVENTORY_SQL,findingsSql,tablesForProject}=require('./retention-restore-preflight.cjs');
const activeSql=tables=>findingsSql(tables)+`
union all select 'auth.sessions',count(*)::int from auth.sessions where user_id=any($1::uuid[])
union all select 'auth.identities',count(*)::int from auth.identities where user_id=any($1::uuid[])`;
const ACTIVE_SQL=activeSql(TABLES);
// The query adapter must use one consistent read-only transaction and a trusted
// project binding. This checks database state, not remote bytes or token expiry.
async function checkActiveData({query,accountId,projectRef}) {
 if(typeof query!=='function'||typeof accountId!=='string'||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(accountId))throw Error('Exact account and private query adapter required');
 const inventory=await query(INVENTORY_SQL,[]);
 const tables=tablesForProject(projectRef,inventory.rows);
 const keys=inventory.rows.map(r=>`${r.table_name}:${r.column_name}:${r.data_type}`);
 if(keys.length!==tables.length || new Set(keys).size!==keys.length || tables.some(t=>!keys.includes(`${t}:user_id:uuid`)))
  return {status:'schema-review-required',activeDeletionVerified:false};
 const {rows}=await query(activeSql(tables),[[accountId]]);
 const expected=['auth.users',...tables.map(t=>'public.'+t),'storage.objects','auth.sessions','auth.identities'];
 if(rows.length!==expected.length||new Set(rows.map(r=>r.source)).size!==expected.length||
  rows.some(r=>!expected.includes(r.source)||!Number.isSafeInteger(r.matches)||r.matches<0))throw Error('Incomplete active-data inspection');
 const findings=rows.filter(r=>r.matches>0);
 return {status:findings.length?'active-data-remains':'database-clear',findings,
  activeDeletionVerified:false,limitation:'Storage bytes, cached/signed access and external providers still require evidence.'};
}
module.exports={checkActiveData,ACTIVE_SQL};

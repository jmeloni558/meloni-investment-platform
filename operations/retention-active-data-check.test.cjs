'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {checkActiveData,ACTIVE_SQL}=require('./retention-active-data-check.cjs');
const {TABLES,INVENTORY_SQL}=require('./retention-restore-preflight.cjs');
const accountId='00000000-0000-4000-8000-000000000001';
const sources=['auth.users',...TABLES.map(t=>'public.'+t),'storage.objects','auth.sessions','auth.identities'];
const inventory=TABLES.map(table_name=>({table_name,column_name:'user_id',data_type:'uuid'}));
test('production checks consolidated Google usage and still rejects unknown ownership tables',async()=>{
 const {PRODUCTION_TABLES}=require('./retention-restore-preflight.cjs');
 const columns=PRODUCTION_TABLES.map(table_name=>({table_name,column_name:'user_id',data_type:'uuid'}));
 const query=async sql=>{
  if(sql===INVENTORY_SQL)return {rows:columns};
  assert.ok(sql.includes('public.google_account_daily_usage'));
  assert.ok(!sql.includes('public.mobile_places_usage'));
  assert.ok(!sql.includes('public.mobile_streetview_usage'));
  return {rows:['auth.users',...PRODUCTION_TABLES.map(t=>'public.'+t),'storage.objects','auth.sessions','auth.identities'].map(source=>({source,matches:source==='public.google_account_daily_usage'?1:0}))};
 };
 const r=await checkActiveData({accountId,projectRef:'lmaiqpkogmmsldkziggy',query});
 assert.equal(r.status,'active-data-remains');
 assert.deepEqual(r.findings,[{source:'public.google_account_daily_usage',matches:1}]);
 columns.push({table_name:'new_account_data',column_name:'user_id',data_type:'uuid'});
 assert.equal((await checkActiveData({accountId,projectRef:'lmaiqpkogmmsldkziggy',query})).status,'schema-review-required');
});
function query(rows,columns=inventory){return async(sql,params)=>{
 if(sql===INVENTORY_SQL)return {rows:columns};assert.equal(sql,ACTIVE_SQL);assert.deepEqual(params,[[accountId]]);return {rows};};}
test('any surviving session, identity, storage or application row blocks database clearance',async()=>{
 for(const source of sources){const rows=sources.map(s=>({source:s,matches:s===source?1:0}));
 assert.equal((await checkActiveData({accountId,query:query(rows)})).status,'active-data-remains');}
});
test('zero database rows does not certify external data deletion',async()=>{
 const r=await checkActiveData({accountId,query:query(sources.map(source=>({source,matches:0})))});
 assert.equal(r.status,'database-clear');assert.equal(r.activeDeletionVerified,false);
});
test('missing result and changed schema fail closed',async()=>{
 await assert.rejects(checkActiveData({accountId,query:query([])}));
 assert.equal((await checkActiveData({accountId,query:query([],inventory.slice(1))})).status,'schema-review-required');
});

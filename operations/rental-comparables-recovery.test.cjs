const {test}=require('node:test'),assert=require('node:assert/strict');
const {checkActiveData}=require('./retention-active-data-check.cjs');
const {checkRestore,TABLES,INVENTORY_SQL}=require('./retention-restore-preflight.cjs');
const id='11111111-1111-4111-8111-111111111111';
const tables=[...TABLES,'property_rental_comparables'];
function query(extra=false){return async(sql)=>{
 if(sql===INVENTORY_SQL)return {rows:tables.map(table_name=>({table_name,column_name:'user_id',data_type:'uuid'})).concat(extra?[{table_name:'unreviewed_data',column_name:'user_id',data_type:'uuid'}]:[])};
 assert.match(sql,/public\.property_rental_comparables/);
 const sources=['auth.users',...tables.map(t=>'public.'+t),'storage.objects'];
 if(sql.includes('auth.sessions'))sources.push('auth.sessions','auth.identities');
 return {rows:sources.map(source=>({source,matches:source==='public.property_rental_comparables'?1:0}))};
};}
test('surviving rental comp blocks active deletion verification',async()=>{
 const r=await checkActiveData({accountId:id,query:query()});
 assert.equal(r.status,'active-data-remains');assert.deepEqual(r.findings,[{source:'public.property_rental_comparables',matches:1}]);
});
test('restored rental comps block reopening; unrelated schema drift still blocked',async()=>{
 const opts={expectedProject:'staging',restorePointAt:'2026-10-19T12:00:00Z',cutoverAt:'2026-10-19T13:00:00Z',now:'2026-10-19T14:00:00Z',manifest:{version:1,project:'staging',source:'independent-deletion-ledger',inventoryComplete:true,evidenceReference:'synthetic',coverageStartedAt:'2026-10-19T11:00:00Z',verifiedThrough:'2026-10-19T13:30:00Z',accountIds:[id]}};
 const r=await checkRestore({...opts,query:query()});assert.equal(r.status,'blocked-restored-data');assert.equal(r.releaseAllowed,false);
 assert.equal((await checkRestore({...opts,query:query(true)})).status,'blocked-schema-drift');
});

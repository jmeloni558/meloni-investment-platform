'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {TABLES,validateManifest,checkRestore}=require('./retention-restore-preflight.cjs');
const id='11111111-1111-4111-8111-111111111111';
const opts={expectedProject:'staging',restorePointAt:'2026-09-26T21:00:00Z',cutoverAt:'2026-09-26T22:00:00Z',now:'2026-09-26T23:00:00Z'};
const manifest={version:1,project:'staging',source:'independent-deletion-ledger',inventoryComplete:true,
  evidenceReference:'synthetic-external-ledger',coverageStartedAt:'2026-09-26T20:00:00Z',verifiedThrough:'2026-09-26T22:30:00Z',accountIds:[id]};
function setup(hit=null,drift=false){let count=0;return async(sql,params)=>{
  count++;assert.ok(!/\b(delete|insert|update|truncate|alter|drop)\b/i.test(sql));
  if(count===1)return {rows:TABLES.map(table_name=>({table_name,column_name:'user_id',data_type:'uuid'})).concat(drift?[{table_name:'new_workspace',column_name:'owner_id',data_type:'uuid'}]:[])};
  assert.deepEqual(params,[[id]]);assert.ok(!sql.includes(id));
  return {rows:['auth.users',...TABLES.map(t=>'public.'+t),'storage.objects'].map(source=>({source,matches:source===hit?1:0}))};
};}
test('restored Auth, orphan workspace and Storage metadata independently block reopening',async()=>{
  for(const source of ['auth.users','public.properties','storage.objects']){
    const result=await checkRestore({...opts,manifest,query:setup(source)});
    assert.equal(result.status,'blocked-restored-data');assert.equal(result.releaseAllowed,false);
    assert.deepEqual(result.findings,[{source,matches:1}]);assert.ok(!JSON.stringify(result).includes(id));
  }
});
test('schema drift blocks before incomplete data inspection',async()=>{
  assert.equal((await checkRestore({...opts,manifest,query:setup(null,true)})).status,'blocked-schema-drift');
});
test('stale, wrong-project, incomplete and duplicate inventories are rejected',()=>{
  for(const patch of [{verifiedThrough:'2026-09-26T21:00:00Z'},{verifiedThrough:'2026-09-27T00:00:00Z'},
    {verifiedThrough:'2026-02-30T22:30:00Z'},{project:'production'},{source:'restored-database'},{inventoryComplete:false},{evidenceReference:''},{accountIds:[id,id]},{accountIds:["x');delete from auth.users;--"]}])
    assert.throws(()=>validateManifest({...manifest,...patch},opts));
});
test('clear database cannot itself authorize reopening',async()=>{
  const r=await checkRestore({...opts,manifest,query:setup()});assert.equal(r.status,'database-sample-clear');assert.equal(r.releaseAllowed,false);
});
test('inspection errors cannot become a clear result',async()=>{
  await assert.rejects(checkRestore({...opts,manifest,query:async()=>{throw Error('read unavailable');}}));
});
test('backups predating tracking or taken after cutover cannot pass',()=>{
  assert.throws(()=>validateManifest(manifest,{...opts,restorePointAt:'2026-09-26T19:00:00Z'}));
  assert.throws(()=>validateManifest(manifest,{...opts,restorePointAt:'2026-09-26T23:00:00Z'}));
  assert.throws(()=>validateManifest({...manifest,coverageStartedAt:undefined},opts));
});

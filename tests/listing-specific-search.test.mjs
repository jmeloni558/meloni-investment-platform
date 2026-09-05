import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/rentcast-sale-listings/index.ts',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export default','return');
function fixture(options={}) {
  const urls=[],cache=new Map(),quotaCalls=[]; let quota=0;
  class Query {
    constructor(table){this.table=table;}
    select(){return this;} eq(key,value){if(key==='cache_key')this.key=value;return this;} in(){return this;} gt(){return this;} gte(){return this;}
    upsert(row){cache.set(row.cache_key,row);return Promise.resolve({error:null});}
    maybeSingle(){return Promise.resolve({data:this.table==='external_api_cache'?cache.get(this.key):null,error:null});}
    then(resolve,reject){return Promise.resolve({count:0,error:null}).then(resolve,reject);}
  }
  const db={from:t=>new Query(t),auth:{getUser:async()=>({data:{user:options.guest?null:{id:'test-user'}}})},rpc:async(name,args)=>{quota++;quotaCalls.push({name,args});return {data:{allowed:options.allowed!==false,reason:'DAILY_LIMIT'},error:null};}};
  const fetcher=async url=>{urls.push(url);return Response.json(options.payload??[{id:'test-property',formattedAddress:'100 Main St, Tampa, FL 33602',propertyType:'Single Family',status:'Active',price:400000}],{status:options.status??200});};
  const handler=new Function('withSupabase','corsHeaders','json','rejectDisallowedOrigin','Deno','fetch',source)((opts,fn)=>req=>fn(req,{supabaseAdmin:db}),{},(v,s=200)=>Response.json(v,{status:s}),()=>null,{env:{get:k=>({RENTCAST_API_KEY:'test',RENTCAST_GUEST_HASH_SALT:'test-salt'})[k]}},fetcher).fetch;
  return {urls,quotaCalls,quota:()=>quota,async call(body){const response=await handler(new Request('https://test.example',{method:'POST',headers:{...(options.guest?{}:{authorization:'Bearer eyJtest'}),...(options.noIp?{}:{'x-forwarded-for':'192.0.2.20'})},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};}};
}
const address='100 Main St, Tampa, FL 33602';
test('exact lookup sends only the address and ignores all broad filters',async()=>{
  const f=fixture(),r=await f.call({action:'find-address',address,radius:50,propertyTypes:['Apartment'],minPrice:900000,maxPrice:1});
  assert.equal(r.status,200);assert.equal(r.data.listings.length,1);assert.deepEqual([...new URL(f.urls[0]).searchParams],[['address',address]]);assert.equal(r.data.hasMore,false);
});
test('exact lookup reuses cache and charges quota only once',async()=>{
  const f=fixture();await f.call({action:'find-address',address});const r=await f.call({action:'find-address',address});assert.equal(r.data.cached,true);assert.equal(f.urls.length,1);assert.equal(f.quota(),1);
});
test('exact lookup requires a meaningful address before provider use',async()=>{
  const f=fixture();assert.equal((await f.call({action:'find-address',address:' '})).status,400);assert.equal(f.urls.length,0);
});
test('guest exact and area searches use the same quota bucket and five-call limit',async()=>{
  const f=fixture({guest:true});assert.equal((await f.call({action:'find-address',address})).status,200);
  assert.equal((await f.call({zipCode:'33602'})).status,200);
  assert.deepEqual(f.quotaCalls[0],f.quotaCalls[1]);
  assert.equal(f.quotaCalls[0].name,'consume_external_api_quota');
  assert.equal(f.quotaCalls[0].args.p_daily_limit,5);assert.equal(f.quotaCalls[0].args.p_user_id,null);
  assert.match(f.quotaCalls[0].args.p_guest_key_hash,/^[a-f0-9]{64}$/);
  const cached=await f.call({action:'find-address',address});assert.equal(cached.data.cached,true);assert.equal(f.quota(),2);
});
test('guest exact search respects quota failures and preserves feature and rent gates',async()=>{
  const f=fixture({guest:true,allowed:false}),r=await f.call({action:'find-address',address});assert.equal(r.status,429);assert.equal(r.data.authRequired,true);assert.equal(f.urls.length,0);
  for(const action of ['property-features','rent-estimate'])assert.equal((await fixture({guest:true}).call({action,address,propertyId:'test'})).status,401);
  assert.equal((await fixture({guest:true,noIp:true}).call({action:'find-address',address})).status,503);
});
test('exact listing form is not hidden or blocked for guests',()=>{
  const ui=readFileSync(new URL('../rentcast-listing-search.js',import.meta.url),'utf8');assert.doesNotMatch(ui,/specific.hidden=!signedIn|Sign in to find a specific listing/);assert.match(ui,/const userId=signedIn\(\)\?cloudUser.id:'guest'/);
});
test('exact lookup handles missing and inactive listings without nearby substitutes',async()=>{
  for(const options of [{status:404,payload:{}},{payload:[{status:'Inactive'}]},{payload:[]}]) {const f=fixture(options),r=await f.call({action:'find-address',address});assert.equal(r.status,200);assert.deepEqual(r.data.listings,[]);assert.equal(f.urls.length,1);}
});
test('quota denials and provider failures remain errors',async()=>{
  const f=fixture({allowed:false});assert.equal((await f.call({action:'find-address',address})).status,429);assert.equal(f.urls.length,0);
  assert.equal((await fixture({status:500}).call({action:'find-address',address})).status,502);
});
test('broad radius searches keep their original filters',async()=>{
  const f=fixture();await f.call({address,radius:10,propertyTypes:['Apartment'],minPrice:100000});const p=new URL(f.urls[0]).searchParams;assert.equal(p.get('radius'),'10');assert.equal(p.get('propertyType'),'Apartment');assert.equal(p.get('price'),'100000:1000000000');
});
test('broad form references do not accidentally select the new exact-address form',()=>{
  const ui=readFileSync(new URL('../rentcast-listing-search.js',import.meta.url),'utf8');assert.match(ui,/body:\{action:'find-address',address\}/);assert.match(ui,/const form=panel.querySelector\('\.pt-listings-search'\)/);assert.match(ui,/data-specific-open/);
});

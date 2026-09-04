import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import * as core from '../supabase/functions/letter-of-intent/letter.mjs';

const USER='11111111-1111-4111-8111-111111111111', ANALYSIS='22222222-2222-4222-8222-222222222222', PROPERTY='33333333-3333-4333-8333-333333333333';
const terms=()=>({buyer:'Example Buyer LLC',sender:'Owner',role:'Buyer / investor',brokerage:'',recipientName:'Owner Test',recipientEmail:'owner@example.com',price:425000,deposit:5000,financing:'Cash',diligenceDays:15,closingDays:30,test:true});
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/letter-of-intent/index.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export default','return');
function fixture(options={}) {
  const store={analyses:[{id:ANALYSIS,user_id:USER,property_id:PROPERTY,name:'Test',assumptions:{price:500000,rent:4000,address:'100 Test Ave'},outputs:{year1_noi:25920,irr:0.08},updated_at:'2026-09-04T12:00:00+00:00'}],properties:[{id:PROPERTY,user_id:USER,address:'100 Test Ave'}],letters_of_intent:[]};
  let providerCalls=0;
  class Query {
    constructor(table){this.table=table;this.filters=[];this.op='select';}
    select(){return this;} eq(k,v){this.filters.push([k,v]);return this;} order(){return this;} limit(){return this;}
    insert(row){this.op='insert';this.row=row;return this;} update(row){this.op='update';this.row=row;return this;}
    async run(single=false){
      let rows=store[this.table].filter(r=>this.filters.every(([k,v])=>r[k]===v));
      if(this.op==='insert'){
        if(store[this.table].some(r=>r.user_id===this.row.user_id&&r.fingerprint===this.row.fingerprint)) return {data:null,error:{code:'23505'}};
        const row={id:crypto.randomUUID(),status:'prepared',created_at:new Date().toISOString(),...this.row};store[this.table].push(row);rows=[row];
      }
      if(this.op==='update') rows.forEach(r=>Object.assign(r,this.row));
      return {data:structuredClone(single?(rows[0]||null):rows),error:null};
    }
    single(){return this.run(true);} maybeSingle(){return this.run(true);} then(resolve,reject){return this.run().then(resolve,reject);}
  }
  const db={from:t=>new Query(t),rpc:async name=>({data:name==='get_account_access'?{owner:options.owner!==false}:{allowed:options.quota!==false},error:null}),auth:{admin:{getUserById:async()=>({data:{user:{email:'owner@example.com',email_confirmed_at:options.verified===false?null:'2026-01-01'}},error:null})}}};
  const json=(value,status=200)=>Response.json(value,{status});
  const env={RESEND_API_KEY:'fake-unit-test-key',...options.env};
  const provider=async(_url,init)=>{providerCalls++; if(options.timeout) throw new Error('timeout');await new Promise(r=>setTimeout(r,10));if(options.providerStatus) return Response.json({}, {status:options.providerStatus});return Response.json({id:'provider-test'});};
  const keys=Object.keys(core), factory=new Function('withSupabase','corsHeaders','json','rejectDisallowedOrigin','Deno','fetch',...keys,source);
  const handler=factory((_opts,fn)=>req=>fn(req,{supabase:db,supabaseAdmin:db,userClaims:{id:USER}}),{},json,req=>req.headers.get('origin')==='https://evil.example'?json({},403):null,{env:{get:key=>env[key]}},provider,...keys.map(k=>core[k])).fetch;
  const call=async body=>{const response=await handler(new Request('https://api.example/letter-of-intent',{method:'POST',headers:{origin:'https://propertythesis.com'},body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};};
  const prepare=(overrides={})=>call({action:'prepare',analysisId:ANALYSIS,terms:{...terms(),...overrides}});
  const send=letter=>call({action:'send',id:letter.id,documentHash:letter.document_hash,confirmed:true});
  return {store,call,prepare,send,calls:()=>providerCalls};
}
test('nonowner and unverified users cannot prepare',async()=>{
  assert.equal((await fixture({owner:false}).prepare()).status,403);
  assert.equal((await fixture({verified:false}).prepare()).status,403);
});
test('self-only pilot rejects external addresses and unlabeled real proposals',async()=>{
  const f=fixture();assert.equal((await f.prepare({recipientEmail:'agent@example.com'})).status,403);assert.equal((await f.prepare({test:false})).status,403);assert.equal(f.calls(),0);
});
test('another user analysis and property are not accessible',async()=>{
  const f=fixture();f.store.analyses[0].user_id='someone-else';assert.equal((await f.prepare()).status,409);
  const g=fixture();g.store.properties[0].user_id='someone-else';assert.equal((await g.prepare()).status,404);
});
test('preview is immutable, deduplicated, and never sends on prepare',async()=>{
  const f=fixture(),first=await f.prepare(),second=await f.prepare();assert.equal(first.status,200);assert.equal(first.data.letter.id,second.data.letter.id);assert.equal(f.calls(),0);assert.equal(f.store.letters_of_intent.length,1);
});
test('send requires confirmation and matching preview hash',async()=>{
  const f=fixture(),{data:{letter}}=await f.prepare();
  assert.equal((await f.call({action:'send',id:letter.id,documentHash:letter.document_hash})).status,400);
  assert.equal((await f.call({action:'send',id:letter.id,documentHash:'wrong',confirmed:true})).status,409);assert.equal(f.calls(),0);
});
test('saved analysis edits and deletion prevent stale sends',async()=>{
  const f=fixture(),{data:{letter}}=await f.prepare();f.store.analyses[0].updated_at='2026-09-04T13:00:00+00:00';assert.equal((await f.send(letter)).status,409);assert.equal(f.calls(),0);
  f.store.analyses=[];assert.equal((await f.send(letter)).status,409);
});
test('concurrent sends contact provider only once',async()=>{
  const f=fixture(),{data:{letter}}=await f.prepare();const responses=await Promise.all([f.send(letter),f.send(letter)]);
  assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);assert.equal(f.calls(),1);assert.equal(f.store.letters_of_intent[0].status,'submitted');
  assert.equal((await f.send(letter)).status,409);assert.equal(f.calls(),1);
});
test('ambiguous provider outcome locks the letter and never retries',async()=>{
  const f=fixture({timeout:true}),{data:{letter}}=await f.prepare();assert.equal((await f.send(letter)).status,502);assert.equal(f.store.letters_of_intent[0].status,'unknown');assert.equal((await f.send(letter)).status,409);assert.equal(f.calls(),1);
});
test('provider rejection and missing configuration have accurate statuses',async()=>{
  const f=fixture({providerStatus:422}),{data:{letter}}=await f.prepare();assert.equal((await f.send(letter)).status,502);assert.equal(f.store.letters_of_intent[0].status,'failed');
  const g=fixture({env:{RESEND_API_KEY:''}}),{data:{letter:other}}=await g.prepare();assert.equal((await g.send(other)).status,503);assert.equal(g.store.letters_of_intent[0].status,'prepared');assert.equal(g.calls(),0);
});

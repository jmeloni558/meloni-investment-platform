import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {incomeListing} from '../stellar-income-record.mjs';
import {mount} from '../stellar-income-picker.mjs';
const require = createRequire(import.meta.url), {JSDOM} = require('jsdom');
const proposal = {isDemo:true,provider:'MLS Grid',listingKey:'synthetic',group:'sold',
 fields:{address:'100 Synthetic St',status:'Closed',source:'Stellar MLS demo / MLS test',gla:1200,beds:2,baths:1},
 facts:{propertyType:'Residential Income',salePrice:200000,listPrice:225000,saleDate:'2026-01-01',units:2},warnings:[]};
test('income mapping uses closed price, leaves rent blank and preserves source and unknown period',()=>{
 const before=JSON.stringify(proposal), r=incomeListing(proposal,'income');
 assert.equal(r.draft.assumptions.price,200000);assert.equal(r.draft.assumptions.rent,'');assert.equal(r.draft.assumptions.units,2);
 assert.equal(r.draft.evidence.period,'Period not specified by source');assert.equal(JSON.stringify(proposal),before);
 const missing=structuredClone(proposal);missing.facts.units=null;assert.equal(incomeListing(missing).units,'');
});
test('active asking prices and malformed sales cannot become income or sales comps',()=>{
 for(const purpose of ['sales','income']){
  assert.throws(()=>incomeListing({...proposal,group:'active'},purpose),/closed sale/);
  assert.throws(()=>incomeListing({...proposal,facts:{...proposal.facts,salePrice:null}},purpose),/closed sale/);
  assert.throws(()=>incomeListing({...proposal,facts:{...proposal.facts,saleDate:'2026-02-30'}},purpose),/valid date/);
 }
 assert.throws(()=>incomeListing({...proposal,isDemo:false}),/demo/);
 assert.throws(()=>incomeListing({...proposal,facts:{propertyType:'Commercial'}}),/eligible/);
});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const dom=new JSDOM('<div id="host"></div>'),host=dom.window.document.querySelector('div');let allowed=true,current=true,previews=0,queries=0,filters=[];
 const client={rpc:async()=>({data:allowed}),from(name){assert.equal(name,'mls_grid_demo_catalog');queries++;return{select(){return this},order(){return this},limit(){return this},or(){return this},eq(k,v){filters.push([k,v]);return this},then(resolve){return Promise.resolve({data:[{proposal}],count:1}).then(resolve)}}}};
 mount({host,client,isCurrent:()=>current,subjectName:'Saved subject',previewIncome:d=>{previews++;assert.equal(d.assumptions.price,200000)}});
 return {dom,host,set allowed(v){allowed=v},set current(v){current=v},get previews(){return previews},get queries(){return queries},filters};
}
test('only closed comps are searched and revoked access blocks preview and subsequent queries',async()=>{
 const t=setup();try{const select=t.host.querySelector('select');select.value='income';select.dispatchEvent(new t.dom.window.Event('change'));
 t.host.querySelector('button').click();await tick();assert.deepEqual(t.filters,[['comp_group','sold']]);
 t.host.querySelector('article button').click();t.allowed=false;
 t.host.querySelector('section button').click();await tick();assert.equal(t.previews,0);assert.match(t.host.textContent,/no longer enabled/);
 t.host.querySelector('button').click();await tick();assert.equal(t.queries,1);
 }finally{t.dom.window.close()}
});
test('normal preview passes draft without writing and stale context cannot preview',async()=>{
 const t=setup();try{t.host.querySelector('select').value='income';t.host.querySelector('button').click();await tick();
 t.host.querySelector('article button').click();t.host.querySelector('section button').click();await tick();assert.equal(t.previews,1);
 t.current=false;t.host.querySelector('article button').click();assert.equal(t.previews,1);
 }finally{t.dom.window.close()}
});
test('saved-property action is account-gated and removed on sign-out',async()=>{
 const dom=new JSDOM('<div id="propertyhub"><div class="hub-card"><div class="hub-actions"><button data-hub-open="saved">Open</button></div></div></div>',{runScripts:'outside-only'}),w=dom.window;
 try{
  w.cloudUser={id:'owner'};w.cloudClient={rpc:async()=>({data:true})};
  w.eval(fs.readFileSync(new URL('../stellar-income-workspace.js',import.meta.url),'utf8'));
  await new Promise(r=>setTimeout(r,400));assert.equal(w.document.querySelectorAll('[data-stellar-income]').length,1);
  w.cloudUser=null;w.document.dispatchEvent(new w.Event('click'));await new Promise(r=>setTimeout(r,400));
  assert.equal(w.document.querySelector('[data-stellar-income]'),null);
  w.cloudUser={id:'subscriber'};w.cloudClient={rpc:async()=>({data:false})};w.document.dispatchEvent(new w.Event('click'));
  await new Promise(r=>setTimeout(r,400));assert.equal(w.document.querySelector('[data-stellar-income]'),null);
 }finally{w.close()}
});

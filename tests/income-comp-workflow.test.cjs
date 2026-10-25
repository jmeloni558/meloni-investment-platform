const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const wait=()=>new Promise(r=>setTimeout(r,180));
function setup(){
 const dom=new JSDOM('<body><div id="propertyhub"></div><div id="dashboard"><div class="grid"></div></div><div id="clientReport"><div class="rb-report"></div></div></body>',{url:'https://fixture.invalid',runScripts:'outside-only'}),w=dom.window;
 w.structuredClone=structuredClone;w.confirm=()=>true;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.cloudUser={id:'user'};w.selectedPropertyId='subject';w.state={address:'Untouched subject',price:800000,desiredCap:.06};w.cloudProperties=[{id:'subject',address:'Subject address'}];w.cloudAnalyses=[];
 let stored=null,reject=false,calls=0;
 w.PropertyThesisIncomeEngineBridge={requestServer:async a=>{calls++;assert.equal(a.address,'100 Test Comp');return {engineVersion:4,IRR:.11,NPV:1000,years:[{pgi:72000,vac:3600,egi:68400,opex:20520,noi:47880,atcf:40000,dcr:2}]};},current:()=>({years:[{noi:60000}]})};
 w.cloudClient={from(table){assert.equal(table,'property_income_comparables','must never create a standalone property/analysis');let op='read',payload,filters={};return{select(){return this;},eq(k,v){filters[k]=v;return this;},insert(p){op='insert';payload=p;return this;},update(p){op='update';payload=p;return this;},async maybeSingle(){if(op!=='read'){if(reject)return{error:{message:'conflict'}};if(op==='update'&&stored.revision!==filters.revision)return{data:null};stored={...stored,...structuredClone(payload)};}return{data:stored?structuredClone(stored):null};}};}};
 for(const f of ['income-comparables-model.js','income-comparable-analysis.js','income-comparables.js'])w.eval(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
 return {dom,w,get stored(){return stored;},set reject(v){reject=v;},get calls(){return calls;}};
}
function fill(w,values){for(const [name,value] of Object.entries(values)){const el=w.document.querySelector(`[data-comp-form] [name="${name}"]`);assert.ok(el,name);el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));}}
async function submit(w){w.document.querySelector('[data-comp-form]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();}
async function complete(w){
 fill(w,{address:'100 Test Comp',price:600000,land:100000,units:4,hold:7,initialRepairs:0,saleDate:'2026-09-01'});await submit(w);
 fill(w,{rent:1500,vacancy:5,rentGrowth:2,period:'T12 September',source:'Seller records.'});await submit(w);
 fill(w,{opEx:30});await submit(w);await submit(w);await submit(w);await submit(w);
}
test('new comp follows six steps, calculates cap first, saves under subject, edits and preserves subject',async()=>{
 const x=setup(),w=x.w;try{
 const subject=JSON.stringify(w.state);await w.PropertyThesisIncomeComps.open('subject');
 assert.ok(w.document.querySelector('[data-comp-form]'));assert.doesNotMatch(w.document.querySelector('[data-comp-form]').textContent,/comparable rental|comparable sales/i);
 await complete(w);assert.equal(x.stored,null);assert.match(w.document.querySelector('.ic-cap-result').textContent,/7.98%/);await submit(w);
 assert.equal(x.stored.property_id,'subject');assert.equal(x.stored.evidence.items.length,1);assert.equal(x.stored.evidence.items[0].origin,'subject-owned');assert.equal(x.stored.evidence.items[0].capRate,.0798);assert.equal(x.stored.evidence.items[0].assumptions.vacancy,.05);assert.equal(JSON.stringify(w.state),subject);assert.equal(w.selectedPropertyId,'subject');assert.equal(w.cloudProperties.length,1);
 await w.PropertyThesisIncomeComps.open('subject');assert.doesNotMatch(w.document.querySelector('[data-ic-body]').textContent,/Source changed or unavailable/);
 w.document.querySelector('[data-ic-edit]').click();assert.equal(w.document.querySelector('[name="address"]').value,'100 Test Comp');assert.equal(w.document.querySelector('[name="price"]').value,'600000');
 fill(w,{price:650000});for(let i=0;i<6;i++)await submit(w);await submit(w);assert.equal(x.stored.evidence.items.length,1);assert.equal(x.stored.evidence.items[0].capRate,47880/650000);assert.equal(x.stored.evidence.reconciliation,null);assert.equal(JSON.stringify(w.state),subject);
 await w.PropertyThesisIncomeComps.prepareReport();assert.match(w.document.querySelector('[data-rb-section="incomeComparables"]').textContent,/subject-owned comp revision 2/);
 }finally{x.dom.window.close();}
});
test('invalid inputs, account change, failed save and cancellation do not save or overwrite subject',async()=>{
 const x=setup(),w=x.w;try{
 await w.PropertyThesisIncomeComps.open('subject');await submit(w);assert.match(w.document.querySelector('[data-comp-status]').textContent,/address/);assert.equal(x.calls,0);
 await complete(w);x.reject=true;await submit(w);assert.equal(x.stored,null);assert.match(w.document.querySelector('[data-comp-status]').textContent,/save could not be confirmed/);assert.ok(w.document.querySelector('[data-comp-form]'));
 w.cloudUser={id:'other'};await submit(w);assert.match(w.document.querySelector('[data-comp-status]').textContent,/sign-in changed/);assert.equal(x.stored,null);
 w.confirm=()=>false;w.document.querySelector('[data-comp-cancel]').click();assert.ok(w.document.querySelector('[data-comp-form]'));assert.equal(w.state.address,'Untouched subject');
 }finally{x.dom.window.close();}
});

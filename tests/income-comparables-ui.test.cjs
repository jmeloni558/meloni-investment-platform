// Requires jsdom 26.1.0 in the test runtime (no production dependency).
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {JSDOM}=require('jsdom');
const pause=()=>new Promise(r=>setTimeout(r,160));
test('property comp save/reopen, subject-rate notes, report, refresh and account isolation',async()=>{
 const dom=new JSDOM('<body><div id="propertyhub"><div class="hub-card"><button data-hub-open="subject"></button><div class="hub-actions"></div></div></div><div id="dashboard"><div class="grid"></div></div><input id="f_desiredCap"><div id="clientReport"><div class="rb-report"><section data-rb-section="valuation"></section><div class="rb-footer"></div></div></div></body>',{runScripts:'outside-only',url:'https://fixture.invalid'}),w=dom.window;
 try{
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.cloudUser={id:'owner'};w.selectedPropertyId='subject';w.state={desiredCap:.06};w.cloudProperties=[{id:'subject',name:'Subject'},{id:'comp',address:'100 Example Street'}];
 w.cloudAnalyses=[{id:'a',property_id:'comp',name:'T12',revision:1,updated_at:'2026-10-01',assumptions:{price:500000,units:4,rent:1500,vacancy:.05,opEx:.3}}];let stored=null,dirty=false;
 w.UnsavedChangeProtection={markDirty(){dirty=true;}};w.PropertyThesisSecondaryEngine={clearCache(){}};
 w.PropertyThesisIncomeEngineBridge={async requestServer(s){assert.equal(s.rent,1500);return{engineVersion:4,years:[{pgi:72000,vac:3600,egi:68400,opex:20520,noi:47880}]};},current(){return{years:[{noi:80000}]};},refreshCurrent(){}};
 w.cloudClient={from(table){let op='read',payload,filters={};return{select(){return this;},eq(k,v){filters[k]=v;return this;},insert(p){op='insert';payload=p;return this;},update(p){op='update';payload=p;return this;},async single(){return{data:structuredClone(w.cloudAnalyses.find(x=>x.id===filters.id))};},async maybeSingle(){assert.equal(table,'property_income_comparables');if(op==='insert')stored=structuredClone(payload);if(op==='update'){if(stored.revision!==filters.revision)return{data:null};stored={...stored,...structuredClone(payload)};}return{data:stored?structuredClone(stored):null};}};}};
 for(const f of ['income-comparables-model.js','income-comparables.js'])w.eval(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
 await pause();assert.ok(w.document.querySelector('[data-ic-open="subject"]'));
 await w.PropertyThesisIncomeComps.open('subject');const f=w.document.querySelector('[data-ic-add]');
 for(const [k,v] of Object.entries({analysis:'a',salePrice:600000,saleDate:'2026-09-01',incomeBasis:'actual',period:'Past 12 months',source:'Seller records'}))f.elements[k].value=v;
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();assert.equal(stored.evidence.items.length,1);assert.equal(stored.evidence.items[0].capRate,.0798);
 await w.PropertyThesisIncomeComps.open('subject');assert.match(w.document.querySelector('[data-ic-body]').textContent,/7.98%/);
 w.cloudAnalyses[0].revision=0;await w.PropertyThesisIncomeComps.open('subject');assert.doesNotMatch(w.document.querySelector('[data-ic-body]').textContent,/Source changed or unavailable/);
 w.cloudAnalyses[0].revision=2;await w.PropertyThesisIncomeComps.open('subject');assert.match(w.document.querySelector('[data-ic-body]').textContent,/Source changed or unavailable/);
 w.cloudAnalyses[0].revision=1;
 stored.evidence.items[0].period='T12 ending September 2026';await w.PropertyThesisIncomeComps.open('subject');w.document.querySelector('[data-ic-edit]').click();assert.equal(w.document.querySelector('[data-ic-add]').elements.period.value,'T12 ending September 2026');

 assert.equal(w.document.querySelector('[data-ic-valuation]').open,false);assert.equal(w.document.querySelector('[data-ic-adopt]'),null);assert.equal(w.document.querySelector('[data-ic-reconcile] [name=rate]'),null);w.state.desiredCap=.08;await w.PropertyThesisIncomeComps.open('subject');assert.match(w.document.querySelector('[data-ic-valuation]').textContent,/8.00%/);
 let rec=w.document.querySelector('[data-ic-reconcile]');rec.elements.rationale.value='Similar tenancy; conservative reconciliation';rec.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();assert.equal(stored.revision,2);
 await w.PropertyThesisIncomeComps.prepareReport();assert.match(w.document.querySelector('[data-rb-section="incomeComparables"]').textContent,/\$1,000,000/);
 assert.equal(stored.evidence.reconciliation.rate,.08);assert.equal(w.state.desiredCap,.08);assert.equal(dirty,false);
 w.state.desiredCap=.075;await w.PropertyThesisIncomeComps.open('subject');assert.match(w.document.querySelector('[data-ic-valuation]').textContent,/rate has changed/);
 w.cloudAnalyses.push({id:'subject-old',property_id:'subject',name:'Older subject',updated_at:'2026-10-01',assumptions:{desiredCap:.09}},{id:'subject-new',property_id:'subject',name:'Current subject',updated_at:'2026-10-25',assumptions:{desiredCap:.065}});w.selectedPropertyId='other';w.state.desiredCap=.12;await w.PropertyThesisIncomeComps.open('subject');assert.match(w.document.querySelector('[data-ic-valuation]').textContent,/6.50%/);assert.match(w.document.querySelector('[data-ic-valuation]').textContent,/Current subject/);rec=w.document.querySelector('[data-ic-reconcile]');rec.elements.rationale.value='Supported by similar sales';rec.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();assert.equal(stored.evidence.reconciliation.rate,.065);assert.equal(w.state.desiredCap,.12);
 w.document.querySelector('[data-ic-toggle]').click();await pause();assert.equal(stored.evidence.reconciliation,null);assert.equal(stored.evidence.items[0].included,false);
 // A concurrent update must not be overwritten by this session.
 stored.revision++;w.document.querySelector('[data-ic-toggle]').click();await pause();assert.match(w.document.querySelector('[data-ic-status]').textContent,/another session/);assert.equal(stored.evidence.items[0].included,false);
 w.cloudUser=null;w.PropertyThesisIncomeComps.applyReport();assert.equal(w.document.querySelector('[data-rb-section="incomeComparables"]'),null);
 }finally{dom.window.close();}
});

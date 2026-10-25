const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
function fixture(){const d=new JSDOM('<body><div id="propertyhub"><div class="hub-card"><button data-hub-open="p"></button><div class="hub-actions"></div></div></div><div id="dashboard"><div class="grid"></div></div><div id="clientReport"><div class="rb-report"><section data-rb-section="valuation"></section></div></div></body>',{url:'https://fixture.invalid',runScripts:'outside-only'}),w=d.window,rows=new Map(),observers=[];const MO=w.MutationObserver;w.MutationObserver=class extends MO{constructor(fn){super(fn);observers.push(this);}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.confirm=()=>true;w.cloudUser={id:'u'};w.selectedPropertyId='p';w.state={units:4};let legacy=[];
 w.cloudClient={from(table){let op='read',payload,filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},order(){return q;},limit(){return q;},insert(p){op='insert';payload=p;return q;},update(p){op='update';payload=p;return q;},single:async()=>({data:{id:filters.id,address:'100 Subject St'}}),maybeSingle:async()=>{let row=rows.get(filters.property_id||payload?.property_id);if(op==='insert'){if(row)return {error:{message:'conflict'}};row=structuredClone(payload);rows.set(row.property_id,row);}if(op==='update'){if(row?.revision!==filters.revision)return {data:null};row={...row,...structuredClone(payload)};rows.set(row.property_id,row);}return {data:row?structuredClone(row):null};},then(resolve,reject){return Promise.resolve({data:legacy}).then(resolve,reject);}};return q;}};
 for(const n of ['property-sales-comparables.js','market-evidence-sales-comps-v3.js','report-sales-comparables-v2.js'])w.eval(read(n));return {w,rows,setLegacy:x=>legacy=x,close:()=>{observers.forEach(x=>x.disconnect());w.close();}};}
test('property sales save/reopen, report, empty selection, conflict and account isolation',async()=>{const f=fixture(),w=f.w,a=w.PropertyThesisPropertySales;try{await a.open('p');const set=(k,v)=>w.document.querySelector('[data-manual="'+k+'"]').value=v;set('address','200 Comp St');set('price','400000');set('date','2026-01-02');set('source','Stellar MLS synthetic');w.PropertyThesisSalesComps.addManual();const cb=w.document.querySelector('[data-se-select]');cb.checked=true;cb.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(a.reportComps().length,0,'unsaved draft does not leak into report');await a.save();assert.equal(f.rows.get('p').evidence.selectedComps.length,1);assert.equal(a.reportComps().length,1);assert.match(w.document.querySelector('#clientReport').textContent,/Stellar MLS synthetic/);a.close();await a.open('p');assert.equal(w.PropertyThesisSalesComps.getSelected().length,1);const cb2=w.document.querySelector('[data-se-select]');cb2.checked=false;cb2.dispatchEvent(new w.Event('change',{bubbles:true}));await a.save();assert.equal(a.reportComps().length,0);assert.equal(f.rows.get('p').revision,2);f.rows.get('p').revision=3;await assert.rejects(a.save(),/not confirmed/);w.cloudUser={id:'other'};assert.equal(a.reportComps().length,0);}finally{f.close();}});
test('existing analysis selections remain available until explicitly saved to the property',async()=>{const f=fixture();try{f.setLegacy([{name:'Old analysis',assumptions:{marketEvidence:{salesComps:{selectedIds:['c'],candidates:[{id:'c',formattedAddress:'Legacy sale',lastSaleDate:'2026-01-02',lastSalePrice:100000}]}}}}]);await f.w.PropertyThesisPropertySales.open('p');assert.equal(f.w.PropertyThesisSalesComps.getSelected().length,1);assert.equal(f.rows.size,0);await f.w.PropertyThesisPropertySales.save();assert.equal(f.rows.get('p').evidence.selectedComps[0].id,'c');}finally{f.close();}});
test('guided flow skips comparable sales in both directions and shows six steps',async()=>{const d=new JSDOM('<section id="assumptions"><div class="grid"></div></section>',{url:'https://fixture.invalid',runScripts:'outside-only'}),w=d.window;try{w.scrollTo=()=>{};w.state={unitRents:[]};w.eval(read('guided-analysis-unit-rents.js'));await new Promise(r=>setTimeout(r,200));assert.equal(w.document.querySelectorAll('.gw-step').length,6);w.GuidedAnalysisSetup.go(4);w.GuidedAnalysisSetup.go(5);assert.equal(w.GuidedAnalysisSetup.getStep(),6);assert.match(w.document.querySelector('#gwEye').textContent,/Step 6 of 6/);assert.equal(w.document.querySelector('#ptSalesCompsStepHost'),null);w.document.querySelector('#gwBack').click();assert.equal(w.GuidedAnalysisSetup.getStep(),4);}finally{w.close();}});


test('six saved property comps survive a fresh session and populate the actual PDF renderer',async()=>{
 const f=fixture();try{
  const w=f.w,api=w.PropertyThesisPropertySales;
  await api.open('p');
  for(let i=0;i<6;i++){
   const set=(k,v)=>w.document.querySelector('[data-manual="'+k+'"]').value=v;
   set('address',(201+i)+' Synthetic Comparable Avenue, Tampa, FL');set('price',String(400000+i*10000));set('date','2026-01-0'+(i+2));set('source','Stellar MLS synthetic TB'+(100+i));set('units','4');set('area','2400');
   w.PropertyThesisSalesComps.addManual();
   const cb=[...w.document.querySelectorAll('[data-se-select]')].find(c=>!c.checked);cb.checked=true;cb.dispatchEvent(new w.Event('change',{bubbles:true}));
  }
  await api.save();api.close();
  const persisted=structuredClone(f.rows.get('p'));
  const fresh=fixture();try{
   fresh.rows.set('p',persisted);fresh.w.state={units:4,marketEvidence:{salesComps:{selectedComps:[{id:'stale',formattedAddress:'STALE ANALYSIS COMP'}]}}};
   await fresh.w.PropertyThesisPropertySales.prepareReport();
   const report=fresh.w.document.querySelector('.rb-report');
   assert.equal(report.querySelectorAll('tbody tr').length,6);assert.doesNotMatch(report.textContent,/STALE ANALYSIS COMP/);
   for(let i=0;i<6;i++){assert.match(report.textContent,new RegExp((201+i)+' Synthetic'));assert.match(report.textContent,new RegExp('TB'+(100+i)));}
   const vm=require('node:vm');const sandbox={window:{},console,TextEncoder,TextDecoder,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,DataView,Buffer,atob,btoa};
   vm.runInNewContext(read('website-report-pdf.reader-20261025.js'),sandbox);
   const renderer=sandbox.window.PropertyThesisTextPdf,model=renderer.reportModel(report,{}),table=model.blocks.find(b=>b.kind==='table');
   assert.equal(table.rows.length,10);assert.equal(table.rows[0].length,7);
   const all=JSON.stringify(model);for(let i=0;i<6;i++){assert.ok(all.includes((201+i)+' Synthetic'));assert.ok(all.includes('TB'+(100+i)));assert.ok(all.includes((400+i*10)+',000'));}
   const pdf=await renderer.build(report,{},new Uint8Array(fs.readFileSync(path.join(__dirname,'../assets/report-NotoSans-Regular.ttf'))));
   fs.mkdirSync(path.join(__dirname,'../output/pdf'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../output/pdf/saved-sales-comps-verification.pdf'),Buffer.from(pdf,'base64'));
   fresh.w.selectedPropertyId='other';await fresh.w.PropertyThesisPropertySales.prepareReport();assert.equal(report.querySelectorAll('[data-rb-section="salesComparables"]').length,0,'switching to a property without comps clears the report');
  }finally{fresh.close();}
 }finally{f.close();}
});


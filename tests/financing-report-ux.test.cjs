const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const load=(w,f)=>w.eval(read(f));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('new analysis defaults are 6.5%, 30 years and amortizing',()=>{
 const source=read('app.js'), defaults=Function('return '+source.match(/const defaults=(\{[^;]+\});/)[1])();
 assert.equal(defaults.mortRate,.065);assert.equal(defaults.interestOnly,false);assert.equal(defaults.loanYears,30);
});
test('visible financing defaults update once and preserve deliberate zero-rate and interest-only edits',async()=>{
 const d=new JSDOM('<section id="assumptions"><div class="grid"></div></section>',{runScripts:'outside-only',url:'https://fixture.invalid'}),w=d.window;
 try{
 w.scrollTo=()=>{};w.state={};
 for(const [k,v] of Object.entries({price:400000,mortgage:0,mortRate:0,loanYears:30,interestOnly:'true'})){
 const e=w.document.createElement('input');e.id='f_'+k;e.value=v;w.document.body.append(e);
 }
 load(w,'guided-analysis-unit-rents.js');load(w,'guided-financing-defaults-v3.js');await wait(200);
 w.GuidedAnalysisSetup.go(3);w.PropertyThesisGuidedFinancingDefaults.apply();await wait(200);
 assert.equal(w.document.querySelector('[data-src="f_mortRate"]').value,'6.5');
 assert.equal(w.document.querySelector('[data-src="f_interestOnly"]').value,'false');
 const rate=w.document.querySelector('[data-src="f_mortRate"]');rate.value='0';rate.dispatchEvent(new w.Event('input',{bubbles:true}));
 const structure=w.document.querySelector('[data-src="f_interestOnly"]');structure.value='true';structure.dispatchEvent(new w.Event('change',{bubbles:true}));
 w.GuidedAnalysisSetup.go(4);w.GuidedAnalysisSetup.go(3);w.PropertyThesisGuidedFinancingDefaults.schedule();await wait(650);
 assert.equal(w.document.querySelector('[data-src="f_mortRate"]').value,'0');assert.equal(w.document.querySelector('[data-src="f_interestOnly"]').value,'true');
 w.selectedAnalysisId='saved';w.document.dispatchEvent(new w.Event('propertythesis:analysis-loaded'));w.PropertyThesisGuidedFinancingDefaults.apply();await wait(100);
 assert.equal(w.document.getElementById('f_mortRate').value,'0');
 }finally{w.close();}
});
test('report recipient and sections update immediately; presets never restore refresh or LOI controls',async()=>{
 const d=new JSDOM('<section id="report"><div id="clientReport"></div></section>',{runScripts:'outside-only',url:'https://fixture.invalid'}),w=d.window;
 try{
 w.state={address:'Synthetic',price:100000,units:1,rent:1000,hold:1,mortgage:0};
 w.result={years:[{year:1,noi:8000,atcf:8000}],cfs:[-100000,108000],initial:-100000};
 load(w,'report-builder-v1.income-comps-6a6db261a34d.js');w.ReportBuilderV1.apply();
 load(w,'report-builder-v9-controls.js');load(w,'letter-of-intent-launcher.js');w.ReportBuilderV9Controls.apply();
 const field=w.document.getElementById('rbPreparedFor');field.focus();field.value='Current client';field.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.match(w.document.getElementById('clientReport').textContent,/Current client/);assert.equal(w.document.activeElement===field,true);
 const toggle=w.document.querySelector('[data-rb-pref="includeFinancing"]');toggle.checked=false;toggle.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(w.document.querySelector('[data-rb-section="financing"]'),null);
 w.document.getElementById('rbSelectCore').click();await wait(800);
 assert.ok(w.document.querySelector('[data-rb-section="financing"]'));
 assert.equal(w.document.getElementById('rbRefresh'),null);assert.equal(w.document.getElementById('ptLoiLaunch'),null);
 assert.match(w.document.querySelector('.rb-export-panel').textContent,/updates automatically/);
 }finally{w.close();}
});


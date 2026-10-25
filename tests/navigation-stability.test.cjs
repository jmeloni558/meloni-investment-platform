const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const load=(w,f)=>w.eval(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
test('repeated property decoration preserves expanded actions, focus and DOM nodes',()=>{
 const dom=new JSDOM('<div id="propertyhub"><div class="hub-card"><div class="hub-actions"><button data-stage7-file="p">Open</button><button data-hub-report="p">Report</button><button data-pt-manage="p">Manage</button><button data-hub-archive="p">Archive</button></div></div></div>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
 try{load(w,'guided-save-existing-workflow-v8.js');const api=w.PropertyThesisGuidedSaveExistingWorkflow;api.modernizeHub();const more=d.querySelector('details'),button=d.querySelector('[data-pt-manage]');more.open=true;button.focus();const observer=new w.MutationObserver(()=>{});observer.observe(d.getElementById('propertyhub'),{childList:true,subtree:true});for(let i=0;i<5;i++)api.modernizeHub();assert.equal(d.querySelector('details'),more);assert.equal(more.open,true);assert.equal(d.activeElement,button);assert.equal(observer.takeRecords().length,0);}finally{w.close();}
});
test('unchanged report branding does not repeatedly replace the header or footer',()=>{
 const dom=new JSDOM('<div id="clientReport"><div class="rb-report"><div class="rb-cover"><div class="rb-brand">Brand</div><p class="address">Test property</p><div class="rb-meta"><span>Prepared for: Test client</span></div></div><div class="rb-footer"></div></div></div>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
 try{w.state={price:300000,hold:10};let profile={company_name:'Test Company'};w.UserBranding={getProfile:()=>profile};load(w,'report-branding-reader.js');w.PropertyThesisReportBranding.apply();const head=d.querySelector('.pt-master-header'),first=head.firstChild;const observer=new w.MutationObserver(()=>{});observer.observe(d.getElementById('clientReport'),{childList:true,subtree:true,attributes:true});for(let i=0;i<5;i++)w.PropertyThesisReportBranding.apply();assert.equal(head.firstChild,first);assert.equal(observer.takeRecords().length,0);profile={company_name:'Updated Company'};w.PropertyThesisReportBranding.apply();assert.match(head.textContent,/Updated Company/);}finally{w.close();}
});
test('opening Saved Properties does not start account-wide QA calculations',async()=>{
 const dom=new JSDOM('<button class="tab" data-tab="propertyhub">Saved</button><div id="propertyhub"><div class="hub-toolbar"></div><div id="hubCards"></div></div>',{runScripts:'outside-only'}),w=dom.window;
 try{let calls=0;w.cloudAnalyses=[{id:'a',assumptions:{}}];w.PropertyThesisIncomeEngineBridge={requestServer:async()=>{calls++;return{years:[{}]};}};load(w,'analysis-regression-checker.js');w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.document.querySelector('.tab').click();await new Promise(r=>setTimeout(r,300));assert.equal(calls,0);w.document.getElementById('qaRunRegression').click();await new Promise(r=>setTimeout(r,20));assert.equal(calls,1);}finally{w.close();}
});

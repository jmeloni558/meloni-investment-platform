// Synthetic browser fixture: no account, network requests, or production writes.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const baseline of [true,false]){
 const page=await browser.newPage({viewport:{width:1280,height:800}});await page.route('**/*',r=>r.abort());
 const cards=Array.from({length:17},(_,i)=>`<div class="hub-card"><h2>Synthetic property ${i+1}</h2><div class="hub-actions"><button data-stage7-file="p${i}">Open</button><button data-hub-report="p${i}">Report</button><button data-pt-manage="p${i}">Manage</button><button data-hub-archive="p${i}">Archive</button></div></div>`).join('');
 await page.setContent(`<style>.section{display:none}.section.active{display:block}.hub-card{height:220px;padding:20px;border:1px solid #ddd}.hidden{display:none}</style><div class="top"><div class="topactions"></div></div><section id="propertyhub" class="section active">${cards}</section><section id="report" class="section"><div id="clientReport"><div class="rb-report"><div class="rb-cover"><div class="rb-brand">Brand</div><p class="address">Synthetic subject</p><div class="rb-meta"><span>Prepared by: Tester</span></div></div><section data-rb-section="snapshot"><div class="rb-stat"><span>Acquisition Price</span><b>$300,000</b></div></section><div style="height:2000px"></div><div class="rb-footer"></div></div></div></section>`);
 await page.evaluate(()=>{window.state={price:300000,hold:10};window.cloudUser={id:'synthetic'};});
 for(const f of ['guided-save-existing-workflow-v8.js','profile-system.js','report-branding-reader.js','report-branding-stability.js','report-reader-presentation.js']){
 const content=baseline?execFileSync('git',['show','origin/main:'+f],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,f),'utf8');await page.addScriptTag({content});}
 await page.waitForTimeout(1600);
 await page.evaluate(()=>{window.mutations=0;new MutationObserver(records=>window.mutations+=records.length).observe(document.getElementById('clientReport'),{childList:true,subtree:true});});
 await page.waitForTimeout(2600);const mutations=await page.evaluate(()=>window.mutations);
 await page.evaluate(()=>{const m=document.querySelector('.pt-hub-more');m.open=true;window.savedMore=m;window.scrollTo(0,1200);});
 await page.waitForTimeout(50);const before=await page.evaluate(()=>scrollY);
 await page.evaluate(()=>{for(let i=0;i<5;i++)PropertyThesisGuidedSaveExistingWorkflow.modernizeHub();});await page.waitForTimeout(250);
 const result=await page.evaluate(()=>({scrollY,expanded:document.querySelector('.pt-hub-more').open,sameNode:window.savedMore===document.querySelector('.pt-hub-more')}));
 console.log(JSON.stringify({baseline,reportMutations:mutations,before,...result}));
 if(!baseline){assert.equal(mutations,0);assert.ok(result.expanded&&result.sameNode);assert.equal(result.scrollY,before);
 for(const width of [1280,390]){await page.setViewportSize({width,height:800});await page.evaluate(()=>{document.getElementById('propertyhub').classList.remove('active');document.getElementById('report').classList.add('active');window.scrollTo(0,700);});await page.waitForTimeout(250);const y=await page.evaluate(()=>scrollY);await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>scrollY),y);console.log('Stable report scroll at width '+width);}}
 await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

// Render real UI modules with synthetic local data only; no service requests.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
 await page.route('**/*',r=>r.abort());
 const base='<style>body{margin:0;padding:22px;box-sizing:border-box;background:#f2f7fa;color:#18364a;font:15px Arial,sans-serif}*{box-sizing:border-box}.example{font-size:12px;letter-spacing:.08em;font-weight:bold;margin-bottom:16px;color:#087d69}.btn{border:1px solid #cbdde4;background:white;border-radius:7px;padding:10px;color:#18364a}.primary{background:#17689f;color:white}h2{font-size:21px}</style><div class="example">PROPERTYTHESIS · ILLUSTRATIVE EXAMPLE DATA</div>';
 await page.setContent(base+'<section id="assumptions"><div class="grid" hidden></div></section><div id="fixtureSources" hidden></div>');
 await page.evaluate(()=>{
 window.state={units:2,rent:1650,unitRents:[1500,1800]};window.scrollTo=()=>{};
 for(const [k,v] of Object.entries({units:2,rent:1650,address:'Example Duplex',price:400000,hold:7,vacancy:5,rentGrowth:2,opEx:30})){const e=document.createElement('input');e.id='f_'+k;e.value=v;document.getElementById('fixtureSources').append(e);}
 });
 for(const f of ['unit-rents.js','guided-analysis-unit-rents.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,f),'utf8')});
 await page.waitForFunction(()=>document.querySelector('#gwBody'));
 await page.evaluate(()=>GuidedAnalysisSetup.go(1));
 await page.screenshot({path:path.join(root,'tests/workflow-subject-income.png')});
 await sharp(path.join(root,'tests/workflow-subject-income.png')).webp({quality:90}).toFile(path.join(root,'assets/workflow-subject-income.webp'));
 await page.setContent(base+'<div id="propertyhub"></div>');
 await page.evaluate(()=>{
 window.cloudUser={id:'synthetic'};window.selectedPropertyId='subject';window.state={address:'Example Duplex',desiredCap:.065};window.cloudProperties=[{id:'subject',address:'Example Duplex'}];window.cloudAnalyses=[];
 const record={property_id:'subject',revision:1,evidence:{version:1,reconciliation:null,items:[{id:'c1',address:'Example Sale A',salePrice:320000,saleDate:'2026-07-15',incomeBasis:'mls',period:'Past 12 months',source:'Illustrative MLS figures',included:true,origin:'subject-owned',operating:{noi:20800}},{id:'c2',address:'Example Sale B',salePrice:400000,saleDate:'2026-08-20',incomeBasis:'mls',period:'Past 12 months',source:'Illustrative MLS figures',included:true,origin:'subject-owned',operating:{noi:24000}}]}};
 window.cloudClient={from(){return{select(){return this;},eq(){return this;},async maybeSingle(){return {data:record};}};}};
 });
 for(const f of ['income-comparables-model.js','income-comparables.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,f),'utf8')});
 await page.evaluate(()=>PropertyThesisIncomeComps.open('subject'));
 await page.locator('#ptIncomeCompsDialog').waitFor({state:'visible'});
 await page.screenshot({path:path.join(root,'tests/workflow-income-comps.png')});
 await sharp(path.join(root,'tests/workflow-income-comps.png')).webp({quality:90}).toFile(path.join(root,'assets/workflow-income-comps.webp'));
 await browser.close();console.log('Two current-interface screenshots generated with synthetic data.');
})().catch(e=>{console.error(e);process.exitCode=1;});

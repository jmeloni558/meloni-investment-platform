const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=fs.readFileSync('order-dashboard.js','latin1');
async function scenario(browser,mobile){
 const page=await browser.newPage({viewport:{width:mobile?390:1280,height:850}});
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.route('http://localhost/autosave-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html>'}));
 await page.goto('http://localhost/autosave-fixture');
 await page.setContent('<div id="appNavShell"><button id="appNavNew"></button></div><nav id="fieldViews"><button id="fieldPhotos">Photos</button></nav><div id="fieldDashboardHost"></div>');
 await page.evaluate(mobile=>{
  const row={id:'one',address:'Test address',kind:'Marketing Photos',client:'Client',due:'2026-11-12',notes:'',updated_at:'1'};
  window.writes=[];window.inserts=[];window.testRow=row;
  function builder(table){
   let patch,conditions={};
   const q={select(){return q},eq(k,v){conditions[k]=v;return q},is(){return q},order(){return q},in(){return q},update(v){patch=v;return q},range:async()=>({data:[{...row}]}),
    insert:async v=>{inserts.push(v);return{}},maybeSingle:async()=>{
     if(table==='order_members')return {data:{photo_owner:'u'}};
     if(!patch)return {data:{...row}};
     writes.push(patch);await new Promise(r=>setTimeout(r,300));
     if(conditions.updated_at!==row.updated_at)return {data:null};
     Object.assign(row,patch,{updated_at:String(+row.updated_at+1)});return {data:{...row}};
    },
    then(resolve){resolve({data:table==='order_clients'?[{name:'Client',listed:true}]:[],count:0})}};
   return q;
  }
  window.PropertyThesisSession={getClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'u'}}}}),onAuthStateChange(){}},from:builder,rpc:name=>name==='issue_bpo_setup_ticket'?(window.setupCalls=(window.setupCalls||0)+1,Promise.resolve({data:'test-ticket'})):({maybeSingle:async()=>({data:{pending:false}})})})};
  if(mobile)window.PropertyThesisFieldApp={canShowDashboard:()=>true,startOnDashboard:true,recordView(){}};
 },mobile);
 if(mobile){
  await page.addStyleTag({content:fs.readFileSync('photos.css','utf8')});
  }
 await page.addStyleTag({content:fs.readFileSync('order-dashboard.css','utf8')});
 await page.addScriptTag({content:source});await page.locator('[data-order]').first().waitFor();
 assert.equal(await page.locator('#od-setup-folders').count(),mobile?0:1);
 if(!mobile){
   assert.equal(await page.locator('#od-calendar').evaluate(e=>e.nextElementSibling.id),'od-setup-folders');
   await page.evaluate(()=>{
     window.__ptSharedSupabaseClient={rpc:async()=>({data:true}),auth:{getSession:async()=>({data:{session:{user:{id:'u'}}}}),onAuthStateChange(){}}};
   });
   await page.addScriptTag({content:fs.readFileSync('photo-library-launcher.js','latin1')});
   await page.locator('#ptPhotoLibrary').waitFor();
   assert.equal(await page.locator('#od-setup-folders').evaluate(e=>e.nextElementSibling.id),'ptPhotoLibrary');
   assert.equal(await page.evaluate(()=>window.setupCalls||0),0);

 }
 assert.deepEqual(errors,[]);await page.close();
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{await scenario(browser,false);await scenario(browser,true);console.log('PASS: Setup Folders between Calendar and Photos on desktop, absent Field App');}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});

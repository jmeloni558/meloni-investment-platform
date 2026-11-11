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
   const q={select(){return q},eq(k,v){conditions[k]=v;return q},is(){return q},order(){return q},update(v){patch=v;return q},range:async()=>({data:[{...row}]}),
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
  window.PropertyThesisSession={getClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'u'}}}}),onAuthStateChange(){}},from:builder,rpc:()=>({maybeSingle:async()=>({data:{pending:false}})})})};
  if(mobile)window.PropertyThesisFieldApp={canShowDashboard:()=>true,startOnDashboard:true,recordView(){}};
 },mobile);
 if(mobile){
  await page.addStyleTag({content:fs.readFileSync('photos.css','utf8')});
  }
 await page.addStyleTag({content:fs.readFileSync('order-dashboard.css','utf8')});
 await page.addScriptTag({content:source});await page.locator('[data-order]').first().click();
 assert.ok(await page.locator('#od-save').isHidden());
 await page.locator('#od-notes').fill('First');await page.waitForFunction(()=>writes.length===1);
 await page.locator('#od-notes').fill('Final');await page.locator('#od-showingtime-requested').check();
 await page.waitForFunction(()=>testRow.notes==='Final' && testRow.showingtime_requested===true);
 assert.ok(await page.locator('#od-details').isVisible());
 const flags=page.locator('.od-summary .od-order-flag');
 assert.equal(await flags.count(),0);
 const flagBoxes=await Promise.all(['photos','appointment-needed','vacant','velocity'].map(id=>page.locator('#od-'+id).boundingBox()));
 assert.equal(flagBoxes[2].y,flagBoxes[3].y);assert.ok(flagBoxes[2].y>flagBoxes[0].y);
 await page.locator('#od-vacant').check();await page.locator('#od-velocity').check();
 await page.waitForFunction(()=>testRow.vacant && testRow.velocity);
 assert.deepEqual(await flags.allTextContents(),['Vacant','Velocity']);
 assert.equal(await flags.first().evaluate(e=>getComputedStyle(e).color),'rgb(171, 24, 38)');
 await page.locator('#od-velocity').uncheck();await page.waitForFunction(()=>testRow.velocity===false);
 assert.deepEqual(await flags.allTextContents(),['Vacant']);
 await page.locator('#od-gate-code').fill('1234');
 if(mobile){
   assert.ok(await page.locator('#od-main-open').isHidden());
   assert.ok(await page.locator('#od-search').isHidden());
   await page.locator('#od-notes').scrollIntoViewIfNeeded();
   assert.ok(Math.abs((await page.locator('.od-address-row').boundingBox()).y)<2);
   await page.locator('#ptOrderNav').click();
   await page.locator('#od-search').waitFor({state:'visible'});
 }else await page.locator('#od-cancel').click();
 await page.locator('#od-details').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>testRow.gate_code),'1234');
 await page.locator('[data-order]').first().click();assert.equal(await page.locator('#od-notes').inputValue(),'Final');assert.deepEqual(await page.evaluate(()=>Object.keys(writes[0])),['notes']);
 await page.locator('#od-contact-0-phone1').fill('5551234567');await page.locator('#od-contact-0-phone1').press('Tab');
 await page.getByRole('button',{name:/POC 1 Phone 1 attempt 1:/}).click();await page.locator('#od-attempt-text').click();
 await page.waitForFunction(()=>testRow.points_of_contact?.[0]?.phone1.attemptTypes[0]==='Text');
 await page.evaluate(()=>{testRow.updated_at='other-device';testRow.notes='Other device note'});
 await page.locator('#od-notes').fill('Conflicting edit');await page.locator('#od-retry-save').waitFor();
 assert.equal(await page.evaluate(()=>testRow.notes),'Other device note');
 page.once('dialog',dialog=>dialog.accept());await page.locator('#od-cancel').click();await page.locator('#od-details').waitFor({state:'hidden'});
 await page.locator('#od-new').click();await page.locator('#od-save').waitFor({state:'visible'});await page.locator('#od-address').fill('New address');
 await page.locator('#od-kind').selectOption('Marketing Photos');await page.locator('#od-client').selectOption('Client');await page.locator('#od-due').fill('2026-11-13');await page.waitForTimeout(950);
 assert.equal(await page.evaluate(()=>inserts.length),0);
 assert.equal(await page.locator('#od-vacant').isChecked(),false);await page.locator('#od-velocity').check();
 await page.locator('#od-save').click();await page.waitForFunction(()=>inserts.length===1);
 assert.deepEqual(await page.evaluate(()=>[inserts[0].vacant,inserts[0].velocity]),[false,true]);
 assert.deepEqual(errors,[]);await page.close();
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{await scenario(browser,false);await scenario(browser,true);console.log('PASS: desktop and Field App autosave, rapid edits, immediate Close, and manual new order creation');}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1});

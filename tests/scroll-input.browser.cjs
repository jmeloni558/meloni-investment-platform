// Real wheel/key events against public pages; no sign-in or customer-data writes.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const patch=fs.readFileSync(path.join(__dirname,'../page-refresh-top.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const patched of [false,true])for(const route of ['','guides.html','pricing.html']){
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  if(patched)await page.route('**/page-refresh-top.js*',r=>r.fulfill({contentType:'text/javascript',body:patch}));
  await page.goto('https://propertythesis.com/'+route,{waitUntil:'networkidle'});
  await page.waitForTimeout(1800);
  await page.evaluate(()=>{
   window.scrollWrites=0;window.scrollEvents=0;const original=history.replaceState.bind(history);
   history.replaceState=(...args)=>{window.scrollWrites++;return original(...args);};
   addEventListener('scroll',()=>window.scrollEvents++,{passive:true});
  });
  await page.mouse.move(550,500);
  for(let i=0;i<6;i++){await page.mouse.wheel(0,140);await page.waitForTimeout(80);}
  await page.waitForTimeout(500);
  const wheel=await page.evaluate(()=>({y:scrollY,writes:scrollWrites,events:scrollEvents}));
  for(let i=0;i<8;i++){await page.keyboard.press('ArrowDown');await page.waitForTimeout(60);}
  await page.waitForTimeout(500);
  const down=await page.evaluate(()=>({y:scrollY,writes:scrollWrites,events:scrollEvents}));
  for(let i=0;i<8;i++){await page.keyboard.press('ArrowUp');await page.waitForTimeout(60);}
  await page.waitForTimeout(500);
  const up=await page.evaluate(()=>({y:scrollY,writes:scrollWrites,events:scrollEvents}));
  console.log(JSON.stringify({patched,route:route||'home',wheel,down,up}));
  assert.ok(wheel.y>0);assert.ok(down.y>wheel.y);assert.ok(up.y<down.y);
  if(patched)assert.equal(up.writes,0,'Scrolling must not write browser history');
  await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

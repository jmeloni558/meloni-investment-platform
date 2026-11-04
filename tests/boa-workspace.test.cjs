'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
test('Comparable Sales saves a BOA report and downloads the reviewed transfer',async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    page.setDefaultTimeout(10000);
    const workspace=fs.readFileSync('app-core.html','utf8').match(/src="(bpo-workspace\.[a-z]+-[^"]+)"/)[1];
    const mock=`let cloudUser={id:'owner'},report;
    const cloudClient={rpc:async()=>({data:true}),from:()=>{const q={select:()=>q,eq:()=>q,order:()=>({data:[]}),
      insert:r=>(report={...r,revision:1},q),update:r=>(Object.assign(report,r),q),maybeSingle:()=>({data:structuredClone(report)})};return q;}};`;
    await page.route('https://fixture.test/**',r=>{
      const path=new URL(r.request().url()).pathname.slice(1);
      return path?r.fulfill({path,contentType:'text/javascript'}):r.fulfill({body:'<main></main><script>'+mock+'</script><script src="'+workspace+'"></script>',contentType:'text/html'});
    });
    await page.goto('https://fixture.test/');
    await page.evaluate(()=>PropertyThesisBPO.open('library'));
    await page.selectOption('[data-client-filter]','boa');
    await page.click('[data-new]');
    assert.equal(await page.locator('[data-step]').count(),5);
    await page.click('[data-step="2"]');
    await page.fill('[data-address]','100 Example St, Tampa, FL 33601');
    await page.selectOption('[data-boa-detail="Occupancy"]','Tenant');
    await page.click('[data-step="4"]');
    await page.fill('[data-boa-detail="Neighborhood comments"]','Synthetic market review');
    const dl=page.waitForEvent('download');
    await page.click('[data-export-boa]');
    const transfer=JSON.parse(fs.readFileSync(await (await dl).path(),'utf8'));
    assert.equal(transfer.format,'propertythesis-boa');
    assert.ok(transfer.fields.some(f=>f.tag==='OCCUPANT_TENANT_X'));
    assert.ok(transfer.fields.some(f=>f.value==='Synthetic market review'));
    assert.equal(await page.evaluate(()=>report.field_values._clientTemplate),'boa');
  }finally{await browser.close();}
});

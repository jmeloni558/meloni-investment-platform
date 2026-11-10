'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('Stewart workspace exports a saved comp and the packaged popup previews the synthetic grid',async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    page.setDefaultTimeout(10000);
    const workspace=fs.readFileSync('app-core.html','utf8').match(/src="(bpo-workspace\.[^"]+)"/)[1];
    const mock=`let cloudUser={id:'owner'},report={id:'fixture',address:'1 Main St, Tampa, FL 33601',revision:1,field_values:{
      _clientTemplate:'stewart',field_0008:'1 Main St, Tampa, FL 33601','sold.0.address':'1 Main St','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33601',
      'active.1.address':'5 First St','active.1.source':'MLS A123456','active.1.beds':'3','stewart.active.1.comments':'Prepared note.'}};
      const cloudClient={rpc:async()=>({data:true}),from:()=>{const q={select:()=>q,eq:()=>q,single:()=>({data:structuredClone(report)}),
      update:r=>(Object.assign(report,r),q),maybeSingle:()=>({data:structuredClone(report)})};return q;}};`;
    await page.route('https://fixture.test/**',r=>{
      const file=new URL(r.request().url()).pathname.slice(1);
      return file?r.fulfill({path:file,contentType:'text/javascript'}):r.fulfill({body:'<main></main><script>'+mock+'</script><script src="'+workspace+'"></script>',contentType:'text/html'});
    });
    await page.goto('https://fixture.test/');
    await page.evaluate(()=>PropertyThesisBPO.open('fixture'));
    assert.equal(await page.locator('[data-step]').count(),5);
    const photoURL=new URL(await page.getByRole('link',{name:'Upload photos to Stewart'}).getAttribute('href'),'https://fixture.test');
    assert.equal(photoURL.searchParams.get('address'),'1 Main St, Tampa, FL 33601');assert.equal(photoURL.searchParams.get('transfer'),'1');
    const dl=page.waitForEvent('download');
    await page.click('[data-export-stewart]');
    const transfer=await (await dl).path();
    assert.equal(JSON.parse(fs.readFileSync(transfer)).format,'propertythesis-stewart');
    const grid=await browser.newPage();
    await grid.setContent('<input id="CompListing_Address_3_field" value="5 First St"><input id="CompListing_MlsNumber_3_field" value="A123456"><input id="CompListing_BedroomCount_3_field" value="2"><textarea id="CompListing_Comments_3_field"></textarea>');
    const before=await grid.locator('input,textarea').evaluateAll(nodes=>nodes.map(n=>n.value));
    const popup=await browser.newPage();
    await popup.exposeFunction('runPreview',async source=>grid.evaluate('('+source+')()'));
    await popup.addInitScript(()=>{
      window.chrome={tabs:{query:()=>[{id:1,url:'https://fixture.test/'}]},scripting:{
        executeScript:async({func})=>[{result:await window.runPreview(func.toString())}]}};
    });
    await popup.goto('file:///'+path.resolve('operations/portal-import/stewart/popup.html').replaceAll('\\','/'));
    await popup.locator('#file').setInputFiles({name:'transfer.json',mimeType:'application/json',buffer:fs.readFileSync(transfer)});
    await popup.click('#preview');
    await popup.getByText(/Mismatch — Stewart value preserved/).waitFor();
    assert.match(await popup.locator('#rows').innerText(),/Blank — enter manually.*Prepared note/);
    assert.deepEqual(await grid.locator('input,textarea').evaluateAll(nodes=>nodes.map(n=>n.value)),before);
  }finally{await browser.close();}
});

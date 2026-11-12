'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('Fannie Mae workspace exports without adjustments and fills only blanks on its matching order',async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    page.setDefaultTimeout(10000);
    const workspace=fs.readFileSync('app-core.html','utf8').match(/src="(bpo-workspace\.[^"]+)"/)[1];
    const mock=`let cloudUser={id:'owner'},report={id:'fixture',address:'1 Main St, Tampa, FL 33601',revision:1,field_values:{
      _clientTemplate:'stewart-fannie','active.1.adj_gla':'1000',field_0008:'1 Main St, Tampa, FL 33601','sold.0.address':'1 Main St','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33601',
      'active.1.address':'5 First St','active.1.source':'MLS A123456','active.1.beds':'3','stewart.active.1.comments':'Prepared note.'}};
      const cloudClient={rpc:async()=>({data:true}),from:()=>{const q={select:()=>q,eq:()=>q,single:()=>({data:structuredClone(report)}),
      update:r=>(Object.assign(report,r),q),maybeSingle:()=>({data:structuredClone(report)})};return q;}};`;
    await page.route('https://fixture.test/**',r=>{
      const file=new URL(r.request().url()).pathname.slice(1);
      return file?r.fulfill({path:file,contentType:'text/javascript'}):r.fulfill({body:'<main></main><script>'+mock+'</script><script src="'+workspace+'"></script>',contentType:'text/html'});
    });
    await page.goto('https://fixture.test/');
    await page.evaluate(()=>PropertyThesisBPO.open('fixture'));
    assert.equal(await page.locator('[data-step]').count(),4);
    const photoURL=new URL(await page.getByRole('link',{name:'Upload photos to Stewart'}).getAttribute('href'),'https://fixture.test');
    assert.equal(photoURL.searchParams.get('address'),'1 Main St, Tampa, FL 33601');assert.equal(photoURL.searchParams.get('transfer'),'1');
    const dl=page.waitForEvent('download');
    await page.click('[data-export-stewart]');
    const transfer=await (await dl).path();
    assert.equal(JSON.parse(fs.readFileSync(transfer)).format,'propertythesis-stewart-fannie');
    const data=JSON.parse(fs.readFileSync(transfer));
    assert.equal(data.comps[0].fields.UnitBedroomCount_1,'3');
    assert.ok(!('adjustments' in data.comps[0]));
    assert.ok(!('manualAdjustments' in data.comps[0]));
    const grid=await browser.newPage();
    await grid.route('https://www.protk.com/**',r=>r.fulfill({contentType:'text/html',body:'<h1>1 Main St 2 Tampa, FL 33601 (Case #123)</h1><h2>FM MIT Interior BPO</h2><input id="CompListing_Address_1_field" value="5 First St"><input id="CompListing_YearBuilt_1_field" value="1970"><input id="CompListing_UnitBedroomCount_1_1_field"><textarea id="CompListing_Comments_1_field">MLS note</textarea>'}));
    await grid.goto('https://www.protk.com/ProTeck.Fulfillment.Case.Forms/CaseFormPortal/DataEntry/123');
    const portal=require('../operations/portal-import/stewart/import.js').importStewartComps;
    assert.match((await grid.evaluate(portal,data)).join(' '),/Check the subject address/);
    await grid.locator('h1').evaluate(el=>el.textContent='1 Main St Tampa, FL 33601 (Case #123)');
    assert.match((await grid.evaluate(portal,{...data,format:'propertythesis-stewart'})).join(' '),/does not match the selected importer/);
    assert.match((await grid.evaluate(portal,data)).join(' '),/Matched in active 1/);
    assert.equal(await grid.locator('#CompListing_UnitBedroomCount_1_1_field').inputValue(),'3');
    assert.equal(await grid.locator('textarea').inputValue(),'MLS note');
    await grid.locator('body').evaluate(body=>body.insertAdjacentHTML('beforeend','<select id="SubjectCondition_ConditionType_field"><option></option><option>Average (Adequately Maintained)</option></select>'));
    const blocked={...data,orderFields:{Subject_FnmaConditionType:'Average (Adequately Maintained)'},comps:[{...data.comps[0],address:'99 Another Street'}]};
    assert.match((await grid.evaluate(portal,blocked)).join(' '),/No empty/);
    assert.equal(await grid.locator('#SubjectCondition_ConditionType_field').inputValue(),'Average (Adequately Maintained)');
    await grid.locator('body').evaluate(body=>body.insertAdjacentHTML('beforeend','<input id="CompListing_Address_2_field" value="22 Pine Dr"><input id="CompListing_UnitNumber_2_field" value="7"><input id="CompListing_MlsNumber_2_field" value="MLS789"><input id="CompListing_Zip_2_field" value="33601"><input id="CompListing_YearBuilt_2_field" value="1970"><input id="CompListing_UnitBedroomCount_2_1_field"><input id="CompListing_UnitBedroomCount_1_2_field">'));
    const directional={...data,comps:[{...data.comps[0],address:'22 N Pine Dr #7',zip:'33601',mls:'MLS789'}]};
    assert.match((await grid.evaluate(portal,directional)).join(' '),/Matched in active 2/);
    assert.equal(await grid.inputValue('#CompListing_UnitBedroomCount_2_1_field'),'3');
    assert.equal(await grid.inputValue('#CompListing_UnitBedroomCount_1_2_field'),'');
    const wrongUnit={...directional,comps:[{...directional.comps[0],address:'22 N Pine Dr #8'}]};
    assert.match((await grid.evaluate(portal,wrongUnit)).join(' '),/ambiguous/);
    await grid.locator('h1').evaluate(el=>el.textContent='42 Example TRL Oldsmar, FL 34677 (Case #123)');
    const streetTransfer={...data,subject:{address:'42 Example Trail Oldsmar, FL 34677',city:'Oldsmar',state:'FL',zip:'34677'}};
    assert.match((await grid.evaluate(portal,streetTransfer)).join(' '),/Matched in active 1/);
    for(const address of ['42 Example Trail #42 Oldsmar, FL 34677','43 Example Trail','42 Example Trail Other City, FL 34677']){
      assert.match((await grid.evaluate(portal,{...streetTransfer,subject:{...streetTransfer.subject,address}})).join(' '),/Check the subject address/);
    }
    const {validateStewart}=require('../operations/portal-import/stewart/adapter.js');
    validateStewart(data,true);
    assert.throws(()=>validateStewart(data,false));
  }finally{await browser.close();}
});

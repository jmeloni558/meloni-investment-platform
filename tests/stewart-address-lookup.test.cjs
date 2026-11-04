'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {importStewartComps}=require('../operations/portal-import/stewart/import');
const {exportStewart}=require('../operations/portal-import/stewart-export.cjs');
const transfer=exportStewart({_clientTemplate:'stewart','sold.0.address':'10 Oak Street','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33617',
  'sold.1.address':'20 Maple Rd','sold.1.zip':'33618','sold.1.source':'MLS A123456','sold.1.beds':4,'sold.1.baths':2.5,'sold.1.gla':1300,'stewart.sold.1.comments':'Similar site.',
  'active.1.address':'30 Pine Rd','active.1.zip':'33619','active.1.beds':2,'active.1.gla':900});
test('adds sale and listing through their lookup dialogs, preserves late listing data and reuses populated slots',async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage();
    const groups=[['saleCompsSection','CompSale'],['listingCompsSection','CompListing']];
    const html=groups.map(([section,group])=>'<section id="'+section+'"><a href="#">Add Address</a>'+
      ['Address','Zip','MlsNumber','LivingArea','BedroomCount','BathroomCount','HalfBathCount','Comments'].map(k=>'<input id="'+group+'_'+k+'_1_field">').join('')+'</section>').join('');
    const url='https://www.protk.com/ProTeck.Fulfillment.Case.Forms/CaseFormPortal/DataEntry/123';
    await page.route(url,r=>r.fulfill({contentType:'text/html',body:'<h1>10 OAK ST TAMPA, FL 33617 (Case #123)</h1>'+html+
      '<div id="manual-comparable-select-modal" hidden><select id="ComparableSlot"></select><input id="ComparableZipCode"><input id="ComparableMlsNumber"><input id="ComparableAddress"><button id="addComparableBtn">Add Comparable</button></div>'}));
    await page.goto(url);
    await page.evaluate(()=>{
      window.calls=[];
      const dialog=document.querySelector('#manual-comparable-select-modal');
      let prefix;
      for(const a of document.querySelectorAll('section a'))a.onclick=e=>{
        e.preventDefault();prefix=a.closest('section').id==='saleCompsSection'?'CompSale':'CompListing';
        ComparableSlot.innerHTML='<option></option><option value="x">'+(prefix==='CompSale'?'Sales 1':'Listing 1')+'</option>';
        dialog.hidden=false;
      };
      addComparableBtn.onclick=()=>{
        window.calls.push([ComparableSlot.value,ComparableZipCode.value,ComparableMlsNumber.value,ComparableAddress.value]);
        dialog.hidden=true;
        const set=(k,v)=>document.querySelector('#'+prefix+'_'+k+'_1_field').value=v;
        set('Address',prefix==='CompSale'?'20 Maple Road':'30 Pine Rd');
        set('Zip',ComparableZipCode.value);set('MlsNumber',ComparableMlsNumber.value);set('LivingArea','1500');
        setTimeout(()=>set('BedroomCount','0'),550);
      };
    });
    const result=await page.evaluate(importStewartComps,transfer);
    assert.ok(!result.some(s=>s.startsWith('Stopped')),result.join('\n'));
    assert.deepEqual(await page.evaluate(()=>calls),[['x','33618','A123456',''],['x','33619','','30 Pine Rd']]);
    assert.equal(await page.inputValue('#CompSale_Comments_1_field'),'Similar site.');
    assert.equal(await page.inputValue('#CompSale_BedroomCount_1_field'),'0');
    assert.equal(await page.inputValue('#CompListing_LivingArea_1_field'),'1500');
    assert.equal(await page.inputValue('#CompSale_HalfBathCount_1_field'),'1');
    assert.match((await page.evaluate(importStewartComps,transfer)).join('\n'),/0 blank fields filled/);
    assert.equal(await page.evaluate(()=>calls.length),2);
    const wrong={...transfer,subject:{...transfer.subject,address:'12 Oak St'}};
    assert.match((await page.evaluate(importStewartComps,wrong)).join('\n'),/does not match/);
  }finally{await browser.close();}
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {exportBOA}=require('../operations/portal-import/boa-export.cjs');
const {allowed}=require('../operations/portal-import/boa/schema');
const {chromium}=require('playwright');
const fs=require('node:fs');
const v={_clientTemplate:'boa','sold.0.address':'100 Example St','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33601','boa.Occupancy':'Tenant',market_county:'Example County',field_0037:true,market_price_change_months:6,field_0047:180000,'boa.Neighborhood comments':'Reviewed market conditions.'};
for(const kind of ['sold','active'])for(let i=1;i<=3;i++)Object.assign(v,{[kind+'.'+i+'.address']:i+' Example Way',[kind+'.'+i+'.price']:100000+i,[kind+'.'+i+'.site']:'4356 sq ft',[kind+'.'+i+'.beds']:3});
const {recalculate}=require('../operations/bpo/core.cjs');
Object.assign(v,{'sold.1.adj_gla':'2,000','sold.1.adj_condition':'-500','boa.sold.1.COMMENTS':'Prior sale verified.','active.1.adj_location':'-2,000','boa.active.1.COMMENTS':''});
const payload=exportBOA(recalculate(v),[{category:'active',address:'1 Example Way, Tampa, FL 33601',originalDate:'10/12/2026',saleType:'Short Sale'}]);
test('export keeps all six comp slots separate, uses acre units and source-matched listing facts',()=>{
  assert.throws(()=>exportBOA({...v,_clientTemplate:'rrr'}));
  assert.throws(()=>exportBOA({...v,'sold.0.zip':''}));
  assert.ok(payload.fields.every(f=>allowed(f.page,f.group,f.tag)));
  for(const [kind,pre,price] of [['SALES','GS','SALE_PRICE'],['LIST','GL','LIST_PRICE']])for(let i=1;i<=3;i++){
    const f=payload.fields.filter(x=>x.group==='COMP_'+kind+'_'+i);
    assert.equal(f.find(x=>x.tag===pre+'_'+price).value,String(100000+i));
    assert.equal(f.find(x=>x.tag===pre+'_LOT_SIZE').value,'0.10');
    for(const [tag,value] of [['PROJ_SIZE','N/A'],['LSHLD_FEE_SMPL','Fee Simple'],['BASEMENT','None']])assert.equal(f.find(x=>x.tag===pre+'_'+tag).value,value);
  }
  assert.ok(payload.fields.some(x=>x.group==='COMP_LIST_1'&&x.tag==='GL_LIST_DATE'&&x.value==='10/12/2026'));
  assert.ok(payload.fields.some(x=>x.tag==='NBHD_PROP_VALUE_STAB_X'));
  assert.ok(payload.fields.some(x=>x.tag==='NBHD_COMMENTS'&&x.value==='Reviewed market conditions.'));
});
test('BOA compares private pools, retains overrides and replaces old generated pool deductions',()=>{
  const C=require('../operations/bpo/core.cjs');
  const data={...v,'sold.0.pool':'Private, Community','sold.1.pool':'Private','sold.1.adj_pool':'-50,000','active.1.pool':'Community','active.2.pool':'None','boa.sold.1.PROJ_SIZE':'20 units','sold.1.basement':'Finished','sold.1.tenure':'Leasehold',_adjustments:{globals:{pool:50000},generated:{'sold.1.adj_pool':{value:'-50,000',blanket:true}}}};
  const withPools=C.addBoaPoolFacts(data,[{category:'sold',address:'3 Example Way, Tampa, FL 33601',boaPool:'Private'}]);
  const corrected=C.applyAdjustments(withPools).values;
  assert.equal(corrected['sold.1.adj_pool'],'0');
  assert.equal(corrected['sold.3.adj_pool'],'0');
  assert.equal(corrected['active.1.adj_pool'],'50,000');
  assert.equal(corrected['active.2.adj_pool'],'50,000');
  const fields=exportBOA(corrected).fields;
  assert.deepEqual(fields.filter(f=>f.tag.endsWith('_AMENITIES')).map(f=>f.value),['Private','Private','Private']);
  for(const [tag,value] of [['GS_PROJ_SIZE','20 units'],['GS_BASEMENT','Finished'],['GS_LSHLD_FEE_SMPL','Leasehold']])assert.equal(fields.find(f=>f.group==='COMP_SALES_1'&&f.tag===tag).value,value);
});
test('packaged workflow fills only previewed blank fields on matching BOA pages',async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const p=await browser.newPage();
    await p.route('https://www.acisky.com/**',r=>r.fulfill({contentType:'text/html',body:'<main></main>'}));
    await p.goto('https://www.acisky.com/formlayout/index?id=fixture');
    const workspace=fs.readFileSync('app-core.html','utf8').match(/src="(bpo-workspace\.[a-z]+-[^"]+)"/)[1];
    const core=fs.readFileSync(workspace,'utf8').match(/s.src="(bpo-core\.[a-z]+-[^"]+)"/)[1];
    await p.addScriptTag({path:core});
    assert.deepEqual(await p.evaluate(v=>[PropertyThesisBPOCore.clientOf(v),PropertyThesisBPOCore.exportBOA(v).format],v),['boa','propertythesis-boa']);
    async function show(page){
      const ids=page===1?['SUBJ_PROPERTY_ADDRESS','CITY','STATE','ZIP_CODE']:['GS_ADDRESS','GS_CITY','GS_STATE','GS_ZIP_CODE'];
      const inputs=(group,tag,attrs='')=>'<input class="reportField" data-tag="SLBOABPODB_23&#92;'+group+'&#92;'+tag+'.1" '+attrs+'>';
      const html='<div class="formLabel"><span>Page '+page+' of 3</span></div>'+ids.map((tag,i)=>inputs('SUBJECT',tag,'readonly value="'+Object.values(payload.subject)[i]+'"')).join('')+
        inputs('SUBJECT','NBHD_COMMENTS')+inputs('SUBJECT','COUNTY','value="Keep"')+
        inputs('SUBJECT','OCCUPANT_TENANT_X','data-checkbox-type="StandardCheckBox" onclick="this.value=\'X\'"')+
        ['COMP_SALES_1','COMP_LIST_1'].map(g=>{const pre=g.includes('SALES')?'GS_':'GL_';return inputs(g,pre+'ADDRESS')+inputs(g,pre+(pre==='GS_'?'SALE_PRICE':'LIST_PRICE'))+inputs(g,pre+'COMMENTS');}).join('')+
        (page===2?'<input class="reportField picklist" readonly data-tag="SLBOABPODB_23&#92;COMP_SALES_1&#92;GS_LSHLD_FEE_SMPL.1" onclick="document.querySelector(\'.picklist-displayed-text\').hidden=false"><div hidden class="picklist-displayed-text" ondblclick="document.querySelector(\'.picklist\').value=\'Fee Simple\'">2-Fee Simple</div>':'');
      await p.setContent(html);
      for(const script of ['schema','adapter'])await p.addScriptTag({path:'operations/portal-import/boa/'+script+'.js'});
    }
    const preview=()=>p.evaluate(p=>inspectBOA(p,null),payload);
    const apply=r=>p.evaluate(([p,r])=>inspectBOA(p,r),[payload,r]);
    await show(1);
    let review=await preview();
    assert.equal(review.rows.find(f=>f.tag==='COUNTY').status,'existing entry preserved');
    await p.locator('[data-tag*="NBHD_COMMENTS"]').fill('Manual edit');
    await assert.rejects(apply(review),/changed/);
    review=await preview();
    const first=await apply(review);
    assert.equal(first.rows.find(f=>f.tag==='OCCUPANT_TENANT_X').status,'filled');
    assert.equal(await p.locator('[data-tag*="NBHD_COMMENTS"]').inputValue(),'Manual edit');
    await show(2);
    await assert.rejects(apply(review),/changed/);
    const pageTwo=await preview();
    await p.evaluate(()=>history.replaceState(null,'','?id=other'));
    await assert.rejects(apply(pageTwo),/order or page changed/);
    await p.evaluate(()=>history.replaceState(null,'','?id=fixture#page2'));
    // Extension message serialization may return object keys in a different order.
    pageTwo.rows=pageTwo.rows.map(({status,tag,value,group,page})=>({group,page,status,tag,value}));
    const second=await apply(pageTwo);
    assert.equal(second.rows.filter(f=>f.status==='filled').length,7);
    assert.equal(await p.locator('.picklist').inputValue(),'Fee Simple');
    assert.equal(await p.locator('[data-tag*="GS_COMMENTS"]').inputValue(),'Prior sale verified. Adjustments: Condition -$500, Living area +$2,000. Adjusted value: $101,501.');
    assert.equal(await p.locator('[data-tag*="GL_COMMENTS"]').inputValue(),'Adjustments: Location -$2,000. Adjusted value: $98,001.');
    assert.equal(await p.locator('[data-tag*="GL_LIST_PRICE"]').inputValue(),'100001');
    await assert.rejects(p.evaluate(p=>inspectBOA({...p,subject:{...p.subject,zip:'99999'}},null),payload),/does not match/);
    await assert.rejects(p.evaluate(p=>inspectBOA({...p,fields:[{page:3,group:'SUBJECT',tag:'ORDER_NUMBER',value:'bad'}]},null),payload),/Unexpected/);
    await show(3);
    await assert.rejects(preview(),/page 1 or page 2/);
  }finally{await browser.close();}
});

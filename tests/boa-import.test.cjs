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
    assert.equal(f.find(x=>x.tag===pre+'_LOT_SIZE').value,'0.1');
  }
  assert.ok(payload.fields.some(x=>x.group==='COMP_LIST_1'&&x.tag==='GL_LIST_DATE'&&x.value==='10/12/2026'));
  assert.ok(payload.fields.some(x=>x.tag==='NBHD_PROP_VALUE_STAB_X'));
  assert.ok(payload.fields.some(x=>x.tag==='NBHD_COMMENTS'&&x.value==='Reviewed market conditions.'));
});
test('packaged workflow fills only previewed blank fields on matching BOA pages',async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const p=await browser.newPage();
    await p.route('https://www.acisky.com/**',r=>r.fulfill({contentType:'text/html',body:'<main></main>'}));
    await p.goto('https://www.acisky.com/formlayout/index?id=fixture');
    const workspace=fs.readFileSync('app-core.html','utf8').match(/src="(bpo-workspace\.boa-[^"]+)"/)[1];
    const core=fs.readFileSync(workspace,'utf8').match(/s.src="(bpo-core\.boa-[^"]+)"/)[1];
    await p.addScriptTag({path:core});
    assert.deepEqual(await p.evaluate(v=>[PropertyThesisBPOCore.clientOf(v),PropertyThesisBPOCore.exportBOA(v).format],v),['boa','propertythesis-boa']);
    async function show(page){
      const ids=page===1?['SUBJ_PROPERTY_ADDRESS','CITY','STATE','ZIP_CODE']:['GS_ADDRESS','GS_CITY','GS_STATE','GS_ZIP_CODE'];
      const inputs=(group,tag,attrs='')=>'<input class="reportField" data-tag="SLBOABPODB_23&#92;'+group+'&#92;'+tag+'.1" '+attrs+'>';
      const html='<div class="formLabel"><span>Page '+page+' of 3</span></div>'+ids.map((tag,i)=>inputs('SUBJECT',tag,'readonly value="'+Object.values(payload.subject)[i]+'"')).join('')+
        inputs('SUBJECT','NBHD_COMMENTS')+inputs('SUBJECT','COUNTY','value="Keep"')+
        inputs('SUBJECT','OCCUPANT_TENANT_X','data-checkbox-type="StandardCheckBox" onclick="this.value=\'X\'"')+
        ['COMP_SALES_1','COMP_LIST_1'].map(g=>{const pre=g.includes('SALES')?'GS_':'GL_';return inputs(g,pre+'ADDRESS')+inputs(g,pre+(pre==='GS_'?'SALE_PRICE':'LIST_PRICE'))+inputs(g,pre+'COMMENTS');}).join('');
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
    const second=await apply(await preview());
    assert.equal(second.rows.filter(f=>f.status==='filled').length,6);
    assert.equal(await p.locator('[data-tag*="GS_COMMENTS"]').inputValue(),'Prior sale verified. Adjustments: Condition -$500, Living area +$2,000. Adjusted value: $101,501.');
    assert.equal(await p.locator('[data-tag*="GL_COMMENTS"]').inputValue(),'Adjustments: Location -$2,000. Adjusted value: $98,001.');
    assert.equal(await p.locator('[data-tag*="GL_LIST_PRICE"]').inputValue(),'100001');
    await assert.rejects(p.evaluate(p=>inspectBOA({...p,subject:{...p.subject,zip:'99999'}},null),payload),/does not match/);
    await assert.rejects(p.evaluate(p=>inspectBOA({...p,fields:[{page:3,group:'SUBJECT',tag:'ORDER_NUMBER',value:'bad'}]},null),payload),/Unexpected/);
    await show(3);
    await assert.rejects(preview(),/page 1 or page 2/);
  }finally{await browser.close();}
});

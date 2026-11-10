'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {exportStewart}=require('../operations/portal-import/stewart-export.cjs');
const {readStewartGrid,reviewStewart}=require('../operations/portal-import/stewart/adapter');
const {clientOf}=require('../operations/portal-import/rrr-export.cjs');
const values={_clientTemplate:'stewart','sold.0.address':'1 Main St','sold.0.city':'Town','sold.0.state':'FL','sold.0.zip':'12345',
  'active.1.address':'5 First St Unit 2','active.1.city':'Town','active.1.state':'FL','active.1.zip':'12345',
  'active.1.source':'MLS A123456','active.1.beds':3,'active.1.baths':2,'active.1.gla':'1,200',
  'stewart.active.1.comments':'Similar location.','active.1.adj_site':500,'sold.2.address':'7 First St'};
const payload=exportStewart(values);
const slot={kind:'active',slot:3,address:'5 First St',address2:'Unit 2',mls:'A123456',
  fields:{BedroomCount:'2',LivingArea:'1200',HalfBathCount:'0',Comments:''}};

test('uses the five-step client identity and exports only prepared comps',()=>{
  assert.equal(clientOf(values),'stewart');
  assert.deepEqual(payload.comps.map(c=>c.kind),['sold','active']);
  assert.equal(payload.comps[1].fields.Comments,'Similar location.');
  assert.equal(payload.comps[1].adjustments.LotSize,'500');
  assert.throws(()=>exportStewart({...values,'sold.0.zip':''}),/subject/);
  assert.throws(()=>exportStewart({...values,'sold.2.address':'','active.1.address':''}),/comparable/);
});
test('reviews reordered slots, preserves service values and shows manual completion',()=>{
  const slots=[slot,{kind:'sold',slot:1,address:'',fields:{}}],before=structuredClone(slots);
  const report=reviewStewart(payload,slots).join('\n');
  assert.match(report,/Listing 3 .* matched/);
  assert.match(report,/BedroomCount · Mismatch.*Stewart: 2 · Property Thesis: 3/);
  assert.match(report,/Comments · Blank.*Similar location/);
  assert.match(report,/LivingArea · Matches/);
  assert.match(report,/HalfBathCount · Matches/);
  assert.match(report,/Use Add Address/);
  assert.deepEqual(slots,before);
});
test('conflicting identity, duplicate slots and unknown group never produce field suggestions',()=>{
  for(const slots of [[{...slot,mls:'B222222'}],[{...slot,address2:'Unit 3'}],[slot,{...slot,slot:1}],
    [{...slot,kind:'sold'}],[{...slot,address:''}]]){
    assert.doesNotMatch(reviewStewart(payload,slots).join('\n'),/BedroomCount|Comments ·/);
  }
  assert.throws(()=>reviewStewart({...payload,format:'propertythesis-boa'},[slot]),/Stewart/);
});
test('grid reader ignores unrelated fields and does not modify the page',()=>{
  const ids={CompListing_Address_2_field:'5 First St Unit 2',CompListing_MlsNumber_2_field:'A123456',
    CompListing_BedroomCount_2_field:'0',SearchResult_Address_1_field:'Unselected address'};
  global.document={querySelectorAll(selector){
    if(selector==="h1,h2,h3")return [];
    const id=selector.match(/^#(\w+),/)[1];
    return Object.hasOwn(ids,id)?[Object.freeze({value:ids[id],matches:()=>true,getClientRects:()=>[{}]})]:[];
  }};
  try{
    const selected=readStewartGrid();
    assert.equal(selected.length,1);
    assert.equal(selected[0].slot,2);
    assert.match(reviewStewart(payload,selected).join('\n'),/Mismatch.*Stewart: 0 · Property Thesis: 3/);
  }finally{delete global.document;}
});

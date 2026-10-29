const test=require('node:test'),assert=require('node:assert/strict');
const {baths,garage,area}=require('../operations/portal-import/rrr-facts.cjs');
const {exportRRR}=require('../operations/portal-import/rrr-export.cjs');
test('bath notation splits whole and half counts without interpreting MLS shorthand',()=>{
 assert.deepEqual(baths('3'),{full:3,half:0});assert.deepEqual(baths('2.5'),{full:2,half:1});
 assert.deepEqual(baths('2 full / 2 half'),{full:2,half:2});
 for(const s of ['2.1','2 full','3 total','',null,'-1','2.25'])assert.equal(baths(s),null);
});
test('garage shorthand supplies count and type, carports remain separate',()=>{
 assert.deepEqual(garage('2 attached'),{type:'Attached',count:2});
 assert.deepEqual(garage('2-car detached garage'),{type:'Detached',count:2});
 assert.deepEqual(garage('None'),{type:'None',count:0});
 assert.deepEqual(garage('2 car carport'),{type:'Carport'});
 assert.equal(garage('2 attached plus 1 carport'),null);
});
test('living area transfers when no basement is explicit, not assumed',()=>{
 assert.deepEqual(area('2,605','No'),{living:2605,basement:0});
 assert.deepEqual(area('2,605 sf above-grade','Finished'),{living:2605});
 for(const b of ['',undefined,'Finished','500 sf'])assert.equal(area('2605',b),null);
 assert.equal(area('0','No'),null);
});
test('export includes actual Sunrise-style facts and no calculated output cells',()=>{
 const p=exportRRR({_clientTemplate:'rrr','sold.0.address':'100 Test Ave','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33603','active.1.address':'102 Test Ave','active.1.baths':'2.5','active.1.gla':'2305','active.1.basement':'No','active.1.garage':'2 attached','active.1.dom':'17'});
 const f=id=>p.fields.find(x=>x.id==='rrrListing1_'+id)?.value;
 assert.equal(f('txtFullBaths'),'2');assert.equal(f('txtHalfBaths'),'1');assert.equal(f('txtSqFtLiving'),'2305');assert.equal(f('txtBasementSqFt'),'0');assert.equal(f('ddlGarageType'),'Attached');assert.equal(f('txtGarages'),'2');assert.equal(f('txtDOM'),'17');
 assert.equal(f('txtTotalGLA'),undefined);assert.equal(f('txtSpGla'),undefined);
});

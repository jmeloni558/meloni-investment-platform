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

test('MLS dual-unit lots, count-only garages and labeled water views retain only supported facts',()=>{
 const f=require('../operations/portal-import/rrr-facts.cjs');assert.equal(Number(f.lotAcres('7,224 SqFt / 671 SqM').toFixed(4)),0.1658);assert.equal(f.lotAcres('7,224 SqFt / 100 SqM'),null);assert.equal(f.lotAcres('0.17'),null);assert.deepEqual(f.garage('2'),{count:2});assert.equal(f.garage('2.5'),null);assert.equal(f.mls('T3502012'),'T3502012');
 const {exportRRR}=require('../operations/portal-import/rrr-export.cjs');const p=exportRRR({_clientTemplate:'rrr','sold.0.address':'100 Test Ave','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33603','sold.0.site':'7,224 SqFt / 671 SqM','sold.0.view':'Water View: Pond','sold.0.source':'T3502012','active.1.address':'200 Test Ave','active.1.garage':'2'});const get=id=>p.fields.find(f=>f.id===id)?.value;assert.equal(get('rrrSubject_txtLotSizeAcres'),'0.17');assert.equal(get('rrrSubject_ddlView'),'Water');assert.equal(get('rrrSubject_ddlDataSource'),'MLS');assert.equal(get('rrrListing1_txtGarages'),'2');assert.equal(get('rrrListing1_ddlGarageType'),undefined);
});

 test('RRR exports subject and all comparable acreages with at most two decimals',()=>{
 const values={_clientTemplate:'rrr','sold.0.address':'100 Test Ave','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33603'};
 const sites=['0.1658 acres','0.1141 acres','0.1781 acres','0.1263 acres','0.124 acres','0.1687 acres','0.1922 acres'];
 const keys=['sold.0','sold.1','sold.2','sold.3','active.1','active.2','active.3'];
 keys.forEach((k,i)=>{values[k+'.address']=(100+i)+' Test Ave';values[k+'.site']=sites[i];});
 const lots=exportRRR(values).fields.filter(f=>f.id.endsWith('_txtLotSizeAcres'));
 assert.equal(lots.length,7);assert.deepEqual(lots.map(f=>f.value),['0.17','0.11','0.18','0.13','0.12','0.17','0.19']);
 });

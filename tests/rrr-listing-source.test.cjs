const test=require('node:test'),assert=require('node:assert/strict');
const source=require('../operations/portal-import/rrr-source.cjs');
const {exportRRR}=require('../operations/portal-import/rrr-export.cjs');
const header='TB1234567 100 Test Ave, Tampa, FL 33603\n';
const text=header+'Original Price: $399,900\nOn Market Date: 01/15/2026\nFloors in Unit/Home: Two\nPool: Community\nSpecial Sale: None\nTerms: FHA Seller Credit: $5,000\n';
const base={_clientTemplate:'rrr','sold.0.address':'200 Test Ave','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33603','sold.1.address':'100 Test Ave','sold.1.city':'Tampa','sold.1.zip':'33603','sold.1.source':'MLS TB1234567'};
test('MLS history and closed financing are distinct from offered financing',()=>{
 const r=source.parse(text,'sold')[0];assert.deepEqual([r.originalPrice,r.originalDate,r.style,r.pool,r.saleType,r.financing],[399900,'01/15/2026','2 Story','No','Arms Length','FHA']);
 assert.equal(source.parse(text.replace('Terms: FHA Seller Credit: $5,000','Financing Avail: Cash, Conventional, FHA'),'sold')[0].financing,undefined);
 assert.equal(source.parse(text,'active')[0].financing,undefined);
});
test('separate listings cannot leak facts and conflicting PDFs stay unresolved',()=>{
 const rows=source.parse(text+'L7654321 300 Third St, Tampa, FL 33603\nOriginal Price: $500,000\n','sold');assert.equal(rows.length,2);assert.equal(rows[1].financing,undefined);
 assert.equal(source.matching(rows,base,'sold.1.').originalPrice,399900);
 assert.deepEqual(source.matching(rows,{...base,'sold.1.address':'999 Wrong Ave'},'sold.1.'),{});
 assert.equal(source.matching([...rows,{...rows[0],originalPrice:400000}],base,'sold.1.').originalPrice,undefined);
});
test('style and pool follow owner rules without guessing unknown pools',()=>{
 assert.equal(source.style('One'),'Rambler/Ranch');assert.equal(source.style('single story'),'Rambler/Ranch');assert.equal(source.style('Two'),'2 Story');assert.equal(source.style('Three'),undefined);
 assert.equal(source.pool('Private','In Ground'),'Yes');assert.equal(source.pool('Private','Above Ground'),'No');assert.equal(source.pool('Community','In Ground'),'No');assert.equal(source.pool('Private'),undefined);assert.equal(source.pool(''),undefined);
});
test('export applies defaults and source facts but keeps subject historical listing out of current fields',()=>{
 const p=exportRRR(base,source.parse(text,'sold'));const f=id=>p.fields.find(f=>f.id===id)?.value;
 assert.equal(f('rrrSale1_txtListPrice'),'399900');assert.equal(f('rrrSale1_txtOrigListDate'),'01/15/2026');assert.equal(f('rrrSale1_ddlFinancingType'),'FHA');assert.equal(f('rrrSale1_txtNoUnits'),'1');assert.equal(f('rrrSubject_lbAmenities_0'),'true');
 assert.ok(!p.fields.some(f=>/^rrrSubject_(txtListPrice|txtOrigListDate|ddlFinancingType)$/.test(f.id)));
});

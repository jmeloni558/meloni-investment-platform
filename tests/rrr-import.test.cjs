const test=require('node:test'),assert=require('node:assert/strict');const {exportRRR,clientOf}=require('../operations/portal-import/rrr-export.cjs');
const base=()=>({_clientTemplate:'rrr','sold.0.address':'100 Test Ave','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33603','sold.1.address':'102 Test Ave','sold.1.price':'$350,000','sold.1.net':'-5,000','sold.1.site':'4356 sq ft','sold.1.baths':'2.1','sold.1.pool':'above ground','sold.1.financing':'5000','active.1.address':'104 Test Ave','active.1.price':400000});
test('clients are separate and general cannot export RRR',()=>{assert.equal(clientOf({}),'general');assert.throws(()=>exportRRR({}),/Choose RRR/);});
test('macro-derived fields use explicit facts and preserve zero half baths',()=>{
 const p=exportRRR({...base(),'sold.1.source':'Stellar MLS # TB1234567','sold.1.baths':'2 full / 0 half','sold.1.garage':'2 car attached garage'});
 const f=id=>p.fields.find(x=>x.id===id)?.value;
 assert.equal(f('rrrSale1_txtMLSNumber'),'TB1234567');assert.equal(f('rrrSale1_txtFullBaths'),'2');assert.equal(f('rrrSale1_txtHalfBaths'),'0');assert.equal(f('rrrSale1_txtGarages'),'2');
 assert.ok(!p.fields.some(x=>/txtHOA|txtBasementSqFt|ddlZoning/.test(x.id)));
});
test('unlabeled sources, partial bath counts and carports are not invented',()=>{
 const p=exportRRR({...base(),'sold.1.source':'Uploaded PDF 1234567','sold.1.baths':'2 full','sold.1.garage':'2 car carport'});
 assert.ok(!p.fields.some(x=>/txtMLSNumber|txtFullBaths|txtHalfBaths|txtGarages/.test(x.id)));
});
test('identity required; no transfer of account metadata or attachments',()=>{assert.throws(()=>exportRRR({_clientTemplate:'rrr'}),/Complete/);const p=exportRRR({...base(),_attachments:[{path:'DO-NOT-TRANSFER-PRIVATE-PATH'}],email:'secret'});assert.ok(!JSON.stringify(p).includes('DO-NOT-TRANSFER-PRIVATE-PATH'));assert.equal(p.subject.address,'100 Test Ave');});
test('signed adjustments and explicit acre conversion, separate sale and ask',()=>{const p=exportRRR(base()),f=id=>p.fields.find(x=>x.id===id)?.value;assert.equal(f('rrrSale1_txtSalePrice'),'350000');assert.equal(f('rrrSale1_txtAdjustment'),'5000');assert.equal(f('rrrSale1_ddlPositiveNegativeSign'),'-');assert.equal(f('rrrSale1_txtLotSizeAcres'),'0.1');assert.equal(f('rrrListing1_txtCurrentListPrice'),'400000');assert.equal(f('rrrListing1_txtListPrice'),undefined);});
test('ambiguous baths/pool/area are flagged instead of invented, identity and calculated cells skipped',()=>{const p=exportRRR(base());assert.ok(p.warnings.some(s=>s.includes('full and half')));assert.equal(p.fields.find(f=>f.id==='rrrSale1_ddlPoolSpa').value,'No');assert.ok(!p.fields.some(f=>/txtFullBaths|txtHalfBaths|txtAdjustedValue|rrrSubject_txtAddress/.test(f.id)));});

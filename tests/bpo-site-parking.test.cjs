const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../operations/bpo/core.cjs'),parking=require('../operations/bpo/parking.cjs');
function fixture(){
 const v={_clientTemplate:'general',_lotUnit:'acres','sold.0.site':'1.63','sold.0.garage':'2 attached','sold.0.pool':'None',_adjustments:{globals:{siteRate:'75000',garageBayRate:'5000',pool:'50000'}}};
 const lots=[.74,1.04,.93,2.45,.8,1.99],bays=[2,3,4,2,3,2],pools=['None','Private','None','Pool','Pool','None'];
 for(const [j,p] of ['sold.1','sold.2','sold.3','active.1','active.2','active.3'].entries())Object.assign(v,{[p+'.address']:(j+1)+' Synthetic Comp Lane',[p+'.site']:String(lots[j]),[p+'.garage']:bays[j]+' attached',[p+'.pool']:pools[j],[p+'.price']:'500000'});
 return v;
}
test('site factor reproduces the six lot differences and garage bays and pools flow to both grids',()=>{
 const v=C.applyAdjustments(fixture()).values;
 for(const [j,p] of ['sold.1','sold.2','sold.3','active.1','active.2','active.3'].entries()){
  assert.equal(C.number(v[p+'.adj_site']),[66750,44250,52500,-61500,62250,-27000][j]);
  assert.equal(C.number(v[p+'.adj_garage']),[0,-5000,-10000,0,-5000,0][j]);
  assert.equal(C.number(v[p+'.adj_pool']),[0,-50000,0,-50000,-50000,0][j]);
  assert.equal(C.number(v[p+'.net']),C.number(v[p+'.adj_site'])+C.number(v[p+'.adj_garage'])+C.number(v[p+'.adj_pool']));
 }
 assert.deepEqual(C.applyAdjustments(v).values,v);
});
test('all acreage fields display at most two decimals and repeated conversions retain source area',()=>{
 let v={};for(const k of ['sold','active'])for(let i=0;i<4;i++)v[k+'.'+i+'.site']=String(6001+i*100);
 v=C.recalculate(v);
 for(let n=0;n<8;n++){
  v=C.setLotUnit(v,'acres');v=C.applyAdjustments(v).values;
  for(const k of ['sold','active'])for(let i=0;i<4;i++)assert.match(v[k+'.'+i+'.site'],/^\d+(?:\.\d{1,2})?$/);
  v=C.setLotUnit(v,'sqft');for(const k of ['sold','active'])for(let i=0;i<4;i++)assert.equal(v[k+'.'+i+'.site'],String(6001+i*100));
 }
});
test('site rate follows the selected unit and empty lot facts never become zero',()=>{
 let v=C.setLotUnit(fixture(),'sqft');assert.equal(Number(v._adjustments.globals.siteRate),75000/43560);
 v=C.applyAdjustments(v).values;assert.equal(C.number(v['sold.1.adj_site']),66750);
 v=C.setLotUnit(v,'acres');assert.ok(Math.abs(Number(v._adjustments.globals.siteRate)-75000)<.00001);
 v['sold.1.site']='';let r=C.applyAdjustments(v);assert.equal(r.values['sold.1.adj_site'],'');assert.ok(r.warnings.some(x=>x.prefix==='sold.1.'&&/lot sizes/.test(x.message)));
 v['sold.1.site']='1.63';assert.equal(C.applyAdjustments(v).values['sold.1.adj_site'],'0');
 v._adjustments.globals.siteRate='-1';assert.ok(C.issues(v).some(x=>/Site/.test(x)));
});
test('parking values combine attached, detached and carport bays without double counting',()=>{
 const rates={garageBayRate:'5000',detachedGarageBayRate:'3000',carportBayRate:'1000'};
 for(const [subject,comp,amount] of [['2 attached','3 attached',-5000],['2 attached','2 detached',4000],['2 attached','2 carport',8000],['2 attached / 1 carport','1 attached / 1 detached',3000],['None','2 detached',-6000],['2 detached','None',6000],['2 attached','2 attached',0]]){
  const v=C.applyAdjustments({'sold.0.garage':subject,'sold.1.address':'Sold','sold.1.garage':comp,'active.1.address':'Active','active.1.garage':comp,_adjustments:{globals:rates}}).values;
  assert.equal(C.number(v['sold.1.adj_garage']),amount);assert.equal(C.number(v['active.1.adj_garage']),amount);
 }
 assert.deepEqual(parking.counts('Two-car attached garage + 1-car detached garage + 1 carport'),{attached:2,detached:1,carport:1,unspecified:0});
});
test('missing parking types or rates are flagged; higher carport/detached values are rejected',()=>{
 for(const description of ['', 'Garage', '2 car garage','2 attached and detached','2.5 attached']){
  const r=C.applyAdjustments({'sold.0.garage':'2 attached','sold.1.address':'Comp','sold.1.garage':description,_adjustments:{globals:{garageBayRate:'5000'}}});
  assert.equal(r.values['sold.1.adj_garage'],undefined);assert.ok(r.warnings.some(x=>/Garage adjustment/.test(x.message)));
 }
 assert.match(parking.adjustment('2 attached','2 detached',{garageBayRate:'5000'},C.number).reason,/detached value/);
 for(const rates of [{garageBayRate:'5000',detachedGarageBayRate:'6000'},{garageBayRate:'5000',carportBayRate:'6000'},{garageBayRate:'5000',detachedGarageBayRate:'3000',carportBayRate:'4000'},{garageBayRate:'-1'}])assert.ok(C.issues({_adjustments:{globals:rates}}).length);
});
test('saved flat factors and manual exceptions survive; new factors explicitly replace legacy factors',()=>{
 const old=fixture();old._adjustments={globals:{site:'1234',garage:'5678'}};
 let v=C.applyAdjustments(old).values;assert.equal(v['sold.1.adj_site'],'1,234');assert.equal(v['sold.1.adj_garage'],'5,678');
 v=C.setAdjustmentFactor(v,'siteRate','75000');v=C.setAdjustmentFactor(v,'garageBayRate','5000');assert.equal(v._adjustments.globals.site,undefined);assert.equal(v._adjustments.globals.garage,undefined);
 v=C.applyAdjustments(v).values;assert.equal(v['sold.1.adj_site'],'66,750');assert.equal(v['sold.1.adj_garage'],'0');
 v['active.1.adj_pool']='-$50,000';v['sold.1.adj_site']='123';v['sold.1.adj_garage']='';v._adjustments.manual={'active.1.adj_pool':true,'sold.1.adj_site':true,'sold.1.adj_garage':true};v._adjustments.globals.pool='60000';v=C.applyAdjustments(v).values;
 assert.equal(v['active.1.adj_pool'],'-$50,000');assert.equal(v['sold.1.adj_site'],'123');assert.equal(v['sold.1.adj_garage'],'');
 v=C.applyAdjustments(v,true).values;assert.equal(v['active.1.adj_pool'],'-60,000');assert.equal(v['sold.1.adj_site'],'66,750');assert.equal(v['sold.1.adj_garage'],'0');
 const rrr=C.applyAdjustments({...old,_clientTemplate:'rrr'}).values;assert.equal(rrr['sold.1.adj_site'],'1,234');assert.equal(rrr['sold.1.adj_garage'],'5,678');
});
test('Pool is recognized without treating unknown or community/above-ground descriptions as private',()=>{
 const classify=require('../operations/bpo/adjustments.cjs').poolClass;
 for(const x of ['Pool','POOL','Swimming pool','Private'])assert.equal(classify(x),1);
 for(const x of ['None','No pool','Above-ground pool','Community pool'])assert.equal(classify(x),0);
 for(const x of ['','Unknown pool type','Pool not reported'])assert.equal(classify(x),null);
});
test('unplatted locations are described as county areas in subject and individual comp discussions',()=>{
 const v=C.applyAdjustments({...fixture(),'sold.0.location':'UNPLATTED','sold.0.gla':'2000','active.1.location':'Unplatted','active.1.distance':'1.2'}).values,s=C.draftSummary(v);
 assert.match(s.sections[0].body,/subject property is located in an unplatted area of the county/);
 assert.match(s.sections.find(x=>x.title.startsWith('Active Comparable 1')).body,/in an unplatted area of the county/);
 assert.doesNotMatch(JSON.stringify(s.sections),/in Unplatted/);
 assert.match(s.sections.find(x=>x.title.startsWith('Active Comparable 1')).body,/\$50,000 downward adjustment for pool/);
});
test('factor UI uses shared lot unit, three parking controls and keeps legacy factors out of new flat controls',()=>{
 const src=fs.readFileSync('bpo-workspace.js','utf8'),ctx={window:{PropertyThesisBPOCore:C},values:fixture(),esc:x=>String(x??'')};vm.createContext(ctx);
 vm.runInContext(src.slice(src.indexOf('function adjustmentPanel()'),src.indexOf('function bindAdjustments()')),ctx);
 let html=ctx.adjustmentPanel();assert.match(html,/Site \(\$ per acre difference\)/);for(const key of parking.rateKeys)assert.match(html,new RegExp('data-blanket-adjustment="'+key+'"'));
 assert.doesNotMatch(html,/data-blanket-adjustment="(?:site|garage)"/);
 ctx.values=C.setLotUnit(ctx.values,'sqft');assert.match(ctx.adjustmentPanel(),/Site \(\$ per sq ft difference\)/);
 ctx.values={_clientTemplate:'rrr'};html=ctx.adjustmentPanel();assert.doesNotMatch(html,/data-blanket-adjustment="siteRate"|Garage and carport bay differences/);assert.match(html,/data-blanket-adjustment="garage"/);
});
test('two-page editable PDF carries two-decimal acres, site/garage factors and active pool deductions',async()=>{
 const {PDFDocument}=require('pdf-lib'),v=C.applyAdjustments(fixture()).values,bytes=await C.exportPDF(fs.readFileSync('assets/bpo/template.pdf'),v),doc=await PDFDocument.load(bytes),f=doc.getForm();assert.equal(doc.getPageCount(),2);
 for(const p of ['sold.1','sold.2','sold.3','active.1','active.2','active.3']){
  assert.equal(f.getTextField(C.byName.get(p+'.site').pdfName).getText(),v[p+'.site']);
  for(const key of ['adj_site','adj_garage','adj_pool'])assert.equal(f.getTextField(C.byName.get(p+'.'+key).pdfName).getText(),C.formatValue(p+'.'+key,v[p+'.'+key]));
 }
 fs.mkdirSync('output/pdf',{recursive:true});fs.writeFileSync('output/pdf/site-parking-pool-verification.pdf',bytes);
});


test('MLS/AI lot imports keep source square feet beneath the two-decimal acreage display',()=>{
 const source=(name,value)=>({name,value,path:'source.pdf',filename:'source.pdf',page:1,evidence:String(value)});
 let v=C.applyAI({_lotUnit:'acres'},{fields:[source('sold.0.site','6001 sq ft'),source('active.1.address','100 Synthetic Comp Lane'),source('active.1.site','6002 sq ft')]}).values;
 assert.equal(v['sold.0.site'],'0.14');assert.equal(v['active.1.site'],'0.14');v=C.setLotUnit(v,'sqft');assert.equal(v['sold.0.site'],'6001');assert.equal(v['active.0.site'],'6001');assert.equal(v['active.1.site'],'6002');
 v=C.applyRecord({_lotUnit:'acres'},{address:'101 Example Lane',site:'6003 sf'},'subject');assert.equal(v['sold.0.site'],'0.14');v=C.setLotUnit(v,'sqft');assert.equal(v['sold.0.site'],'6003');assert.equal(v['active.0.site'],'6003');
});

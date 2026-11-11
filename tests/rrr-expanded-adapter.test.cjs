const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {exportRRR}=require('../operations/portal-import/rrr-export.cjs');
function fixture(){
 const context={Event:class{constructor(type){this.type=type;}}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../operations/portal-import/extension/adapter.js'),'utf8'),context);
 const payload=exportRRR({_clientTemplate:'rrr','sold.0.address':'100 Test Ave','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33603','sold.1.address':'102 Test Ave','sold.1.source':'MLS TB1234567','sold.1.baths':'3 full / 1 half','sold.1.garage':'2 car detached garage'});
 const nodes=Object.fromEntries(payload.fields.map(f=>[f.id,{tagName:'INPUT',type:'text',value:'',maxLength:-1,isConnected:true,getClientRects:()=>[{}],events:[],dispatchEvent(e){this.events.push(e.type);}}]));
 const doc={getElementById:id=>nodes[id]||null};return {api:context.PTRRR,payload,nodes,doc};
}
test('expanded adapter fills explicit facts with input/change/blur and validates payload',()=>{
 const {api,payload,nodes,doc}=fixture();api.validate(payload);const plan=api.plan(doc,payload,'comparables');api.apply(doc,payload,'comparables',plan,false);
 for(const [id,value] of [['txtMLSNumber','TB1234567'],['txtFullBaths','3'],['txtHalfBaths','1'],['txtGarages','2']]){const n=nodes['rrrSale1_'+id];assert.equal(n.value,value);assert.deepEqual(n.events,['input','change','blur']);}
});
test('expanded fields preserve existing values and skip changes after preview',()=>{
 const {api,payload,nodes,doc}=fixture();nodes.rrrSale1_txtMLSNumber.value='Existing';const plan=api.plan(doc,payload,'comparables');assert.equal(plan.find(x=>x.id==='rrrSale1_txtMLSNumber').status,'existing entry — preserved');nodes.rrrSale1_txtFullBaths.value='4';api.apply(doc,payload,'comparables',plan,false);assert.equal(nodes.rrrSale1_txtFullBaths.value,'4');assert.equal(nodes.rrrSale1_txtMLSNumber.value,'Existing');
});
test('address conflicts prevent expanded facts from filling the wrong comp',()=>{
 const {api,payload,nodes,doc}=fixture();nodes.rrrSale1_txtAddress.value='999 Different Ave';const plan=api.plan(doc,payload,'comparables');api.apply(doc,payload,'comparables',plan,false);assert.equal(nodes.rrrSale1_txtMLSNumber.value,'');assert.equal(nodes.rrrSale1_txtFullBaths.value,'');
});
test('unapproved macro defaults and submit controls remain rejected',()=>{
 const {api,payload}=fixture();for(const id of ['submitorderbutton','rrrSale1_txtHOA','rrrSale1_txtMarketRent'])assert.throws(()=>api.validate({...payload,fields:[{section:'comparables',id,value:'0'}]}));
});

test('RRR currency formatting is a successful fill and matches on a later preview',()=>{
 const {api,payload,nodes,doc}=fixture();const id='rrrSale1_txtSalePrice';payload.fields.push({section:'comparables',id,value:'379990',label:'Sale price'});
 nodes[id]={id,tagName:'INPUT',type:'text',value:'',isConnected:true,maxLength:-1,getClientRects:()=>[{}],dispatchEvent(e){if(e.type==='blur')this.value='$379,990';}};
 const results=api.apply(doc,payload,'comparables',api.plan(doc,payload,'comparables'),false);
 assert.equal(results.find(x=>x.id===id).status,'filled');assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id===id).status,'already matches');
 nodes[id].value='$379,991';assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id===id).status,'existing entry — preserved');
});
test('blank RRR dropdown with underlying zero is fillable but a real choice is preserved',()=>{
 const {api,payload,nodes,doc}=fixture();const id='rrrSale1_ddlDataSource';const field=payload.fields.find(x=>x.id===id);assert.ok(field);
 const n=nodes[id]={id,tagName:'SELECT',type:'select-one',value:'0',selectedOptions:[{text:''}],options:[{text:'',value:'0'},{text:'MLS',value:'1'}],isConnected:true,getClientRects:()=>[{}]};
 assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id===id).status,'ready');n.selectedOptions=[{text:'Tax Records'}];assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id===id).status,'existing entry — preserved');
});
test('default plus sign can change only with a new blank adjustment amount',()=>{
 const {api,payload,nodes,doc}=fixture();
 for(const [key,value] of [['txtSalePrice','379990'],['ddlPositiveNegativeSign','-'],['txtAdjustment','18895']]){const id='rrrSale1_'+key;payload.fields.push({section:'comparables',id,value,label:key});nodes[id]={id,tagName:key.startsWith('ddl')?'SELECT':'INPUT',type:'text',value:key.startsWith('ddl')?'0':'',selectedOptions:[{text:'+'}],options:[{text:'+',value:'0'},{text:'-',value:'1'}],isConnected:true,getClientRects:()=>[{}]};}
 assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id==='rrrSale1_ddlPositiveNegativeSign').status,'ready');
 nodes.rrrSale1_txtAdjustment.value='$100';assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id==='rrrSale1_ddlPositiveNegativeSign').status,'existing entry — preserved');
});
test('explicit A/C checks an empty checkbox and concession dependencies preserve unrelated amounts',()=>{
 const {api,payload,nodes,doc}=fixture();
 const id='rrrSale1_lbAmenities_0';assert.equal(payload.fields.find(f=>f.id===id).value,'true');
 nodes[id]={id,tagName:'INPUT',type:'checkbox',checked:false,isConnected:true,getClientRects:()=>[{}],dispatchEvent(){}};
 const plan=api.plan(doc,payload,'comparables');assert.equal(plan.find(x=>x.id===id).status,'ready');api.apply(doc,payload,'comparables',plan,false);assert.equal(nodes[id].checked,true);
});
test('net adjustments permit matching disclosed concessions but block unrelated existing concessions',()=>{
 const {api,payload,nodes,doc}=fixture();
 for(const [key,value] of [['txtSalePrice','350000'],['txtConcessionsAmount','5000'],['ddlPositiveNegativeSign','-'],['txtAdjustment','5000']]){const id='rrrSale1_'+key;payload.fields.push({section:'comparables',id,value,label:key});nodes[id]={id,tagName:'INPUT',type:'text',value:'',isConnected:true,getClientRects:()=>[{}]};}
 nodes.rrrSale1_txtConcessionsAmount.value='$5,000';assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id==='rrrSale1_txtAdjustment').status,'ready');
 nodes.rrrSale1_txtConcessionsAmount.value='$6,000';assert.equal(api.plan(doc,payload,'comparables').find(x=>x.id==='rrrSale1_txtAdjustment').status,'adjustment dependency — review manually');
});

test('zero placeholders fill for original list price and owner unit default, real entries are preserved',()=>{
 const {api,payload,nodes,doc}=fixture();
 const price='rrrSale1_txtListPrice',units='rrrSale1_txtNoUnits';payload.fields.push({section:'comparables',id:price,value:'400000',label:'Original list'});
 for(const id of [price,units])nodes[id]={id,tagName:'INPUT',type:'text',value:id===price?'$0':'0',isConnected:true,getClientRects:()=>[{}]};
 let plan=api.plan(doc,payload,'comparables');assert.equal(plan.find(x=>x.id===price).status,'ready');assert.equal(plan.find(x=>x.id===units).status,'ready');
 nodes[price].value='$399,000';nodes[units].value='2';plan=api.plan(doc,payload,'comparables');assert.equal(plan.find(x=>x.id===price).status,'existing entry — preserved');assert.equal(plan.find(x=>x.id===units).status,'existing entry — preserved');
});

test('RRR zero-initialized property facts fill without replacing real entries or zero adjustments',()=>{
 const {api,payload,nodes,doc}=fixture();
 for(const suffix of ['txtYearBuilt','txtRooms','txtBeds','txtFullBaths','txtHalfBaths','txtSqFtLiving','txtGarages','txtLotSizeAcres']){
  const id='rrrSale1_'+suffix;payload.fields=payload.fields.filter(f=>f.id!==id);payload.fields.push({section:'comparables',id,value:suffix==='txtYearBuilt'?'2020':suffix==='txtLotSizeAcres'?'0.15':'2'});nodes[id]={id,tagName:'INPUT',type:'text',value:'0',maxLength:-1,isConnected:true,getClientRects:()=>[{}],dispatchEvent(){}};
 }
 let plan=api.plan(doc,payload,'comparables');for(const suffix of ['txtYearBuilt','txtRooms','txtBeds','txtFullBaths','txtHalfBaths','txtSqFtLiving','txtGarages','txtLotSizeAcres'])assert.equal(plan.find(f=>f.id==='rrrSale1_'+suffix).status,'ready');
 nodes.rrrSale1_txtRooms.value='8';api.apply(doc,payload,'comparables',plan,false);assert.equal(nodes.rrrSale1_txtYearBuilt.value,'2020');assert.equal(nodes.rrrSale1_txtRooms.value,'8');
 nodes.rrrSale1_txtGarages.value='3';assert.equal(api.plan(doc,payload,'comparables').find(f=>f.id==='rrrSale1_txtGarages').status,'existing entry — preserved');
 const id='rrrSale1_txtAdjustment';payload.fields.push({section:'comparables',id,value:'1000'});nodes[id]={id,tagName:'INPUT',type:'text',value:'0',maxLength:-1,getClientRects:()=>[{}]};assert.equal(api.plan(doc,payload,'comparables').find(f=>f.id===id).status,'existing entry — preserved');
});

test('legacy JSON acreage is rounded in preview and every transmitted event',()=>{
 for(const prefix of ['rrrSubject','rrrSale1','rrrListing1']){
 const {api,payload,nodes,doc}=fixture();const id=prefix+'_txtLotSizeAcres';
 payload.fields=payload.fields.filter(f=>f.id!==id);payload.fields.push({section:'comparables',id,value:'0.1658'});
 if(prefix==='rrrListing1'){payload.fields.push({section:'comparables',id:prefix+'_txtAddress',value:'102 Test Ave'});nodes[prefix+'_txtAddress']={id:prefix+'_txtAddress',tagName:'INPUT',type:'text',value:'102 Test Ave',getClientRects:()=>[{}]};}
 const events=[];nodes[id]={id,tagName:'INPUT',type:'text',value:'0',maxLength:-1,isConnected:true,getClientRects:()=>[{}],dispatchEvent(){events.push(this.value);}};
 let plan=api.plan(doc,payload,'comparables');assert.equal(plan.find(f=>f.id===id).value,'0.17');
 assert.equal(api.apply(doc,payload,'comparables',plan,false).find(f=>f.id===id).status,'filled');assert.deepEqual(events,['0.17','0.17','0.17']);
 assert.equal(api.plan(doc,payload,'comparables').find(f=>f.id===id).status,'already matches');
 nodes[id].value='0.25';assert.equal(api.plan(doc,payload,'comparables').find(f=>f.id===id).status,'existing entry \u2014 preserved');
 }
});

test('Petersburg city spellings match only when the rest of the order matches',()=>{
 const {api}=fixture();
 const subject={address:'100 Test Ave S',state:'FL',zip:'33705'};
 const cities=['St Petersburg','St. Petersburg','Saint Petersburg'];
 for(const city of cities){
  const file={...subject,city};
  for(const other of cities)assert.equal(api.matches(file,{...subject,city:other.toUpperCase()}),true);
  for(const mismatch of [{address:'100 Test Ave N'},{state:'VA'},{zip:'33706'},{city:'St Petersburg Beach'},{city:''}]){
   assert.equal(api.matches(file,{...subject,city:'Saint Petersburg',...mismatch}),false);
  }
 }
});

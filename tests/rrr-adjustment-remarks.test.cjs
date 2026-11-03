const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {exportRRR}=require('../operations/portal-import/rrr-export.cjs');
const base={_clientTemplate:'rrr','sold.0.address':'100 Test Ave','sold.0.city':'Tampa','sold.0.state':'FL','sold.0.zip':'33603'};
function fixture(){
 const values={...base};for(const group of ['sold','active'])for(let i=1;i<=3;i++){const p=group+'.'+i+'.';values[p+'address']=i+' '+group+' Ave';values[p+'adj_financing']='-5,000';values[p+'adj_gla']='+12500';values[p+'adj_pool']='-20000';values[p+'net']='-12500';}
 const payload=exportRRR(values),context={Event:class{constructor(type){this.type=type;}}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../operations/portal-import/extension/adapter.js'),'utf8'),context);
 const nodes=Object.fromEntries(payload.fields.map(f=>[f.id,{id:f.id,tagName:f.id.includes('PropertyDataComments')?'TEXTAREA':'INPUT',value:'',isConnected:true,maxLength:-1,getClientRects:()=>[{}],dispatchEvent(){}}]));
 return {payload,nodes,doc:{getElementById:id=>nodes[id]},api:context.PTRRR};
}
test('all six comp remarks contain signed comma-separated final adjustments once',()=>{
 const {payload,api}=fixture();api.validate(payload);const remarks=payload.fields.filter(f=>f.id.includes('PropertyDataComments'));assert.equal(remarks.length,6);
 for(const f of remarks)assert.equal(f.value,'Seller concessions -$5,000, Living area +$12,500, Pool -$20,000');
 assert.equal(payload.fields.find(f=>f.id==='rrrSale1_txtAdjustment').value,'12500');
});
test('blank, zero and invalid adjustments do not invent remarks or duplicate helper totals',()=>{
 const p=exportRRR({...base,'sold.1.address':'101 Test Ave','sold.1.adj_rooms':'2500.50','sold.1.adj_pool':'0','sold.1.adj_gla':'invalid','sold.1.financing':'$5000','sold.1.net':'2500.50',_adjustments:{parts:{'sold.1.rooms':{beds:1000,baths:1500.5}}},'active.1.address':'102 Test Ave','active.1.adj_pool':'0'});
 assert.equal(p.fields.find(f=>f.id==='txtSale1PropertyDataComments').value,'Rooms / beds / baths +$2,500.50');assert.ok(!p.fields.some(f=>f.id==='txtListing_1_PropertyDataComments'));
});
test('remarks fill and are idempotent; existing notes and stale edits remain protected',()=>{
 const {api,payload,doc,nodes}=fixture();let review=api.plan(doc,payload,'comparables');api.apply(doc,payload,'comparables',review,false);
 for(const f of payload.fields.filter(f=>f.id.includes('PropertyDataComments'))){assert.equal(nodes[f.id].value,f.value);assert.equal(api.plan(doc,payload,'comparables').find(r=>r.id===f.id).status,'already matches');}
 const id='txtSale1PropertyDataComments';nodes[id].value='My notes';assert.match(api.plan(doc,payload,'comparables').find(r=>r.id===id).status,/preserved/);
 nodes[id].value='';review=api.plan(doc,payload,'comparables');nodes[id].value='New notes';api.apply(doc,payload,'comparables',review,false);assert.equal(nodes[id].value,'New notes');
});
test('remark fields require the matching comp address and reject unrelated controls',()=>{
 const {api,payload,doc,nodes}=fixture();nodes.rrrSale1_txtAddress.value='Different comp';nodes.rrrListing2_txtAddress.value='Different listing';const review=api.plan(doc,payload,'comparables');
 for(const id of ['txtSale1PropertyDataComments','txtListing_2_PropertyDataComments'])assert.match(review.find(r=>r.id===id).status,/address conflict/);
 const noAddress={...payload,fields:payload.fields.filter(f=>f.id!=='rrrSale3_txtAddress')};assert.match(api.plan(doc,noAddress,'comparables').find(r=>r.id==='txtSale3PropertyDataComments').status,/address conflict/);
 for(const id of ['txtSubjectComments','txtSale4PropertyDataComments','SaveCompInfoButton'])assert.throws(()=>api.validate({...payload,fields:[{section:'comparables',id,value:'test'}]}));
});

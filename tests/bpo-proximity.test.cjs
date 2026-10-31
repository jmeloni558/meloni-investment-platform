const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../operations/bpo/proximity.cjs'),C=require('../operations/bpo/core.cjs');
const subject='100 Example Lane, Lutz, FL 33548',sold='102 Example Lane, Lutz, FL 33548',active='104 Example Lane, Lutz, FL 33548';
const base={field_0008:subject,'sold.1.address':sold,'active.1.address':active};
function lookup(address){return {property:{formattedAddress:address,latitude:address===subject?28:address===sold?28.01:28.026,longitude:-82}};}
test('great-circle distance uses coordinates, not road distance or whole-mile rounding',()=>{
 assert.ok(Math.abs(P.straightLineMiles({latitude:0,longitude:0},{latitude:0,longitude:1})-69.0934)<.001);
 assert.equal(P.formatMiles(P.straightLineMiles({latitude:28,longitude:-82},{latitude:28.01,longitude:-82})),'0.7 mi');
 for(const [n,s]of [[.04,'0.0 mi'],[.74,'0.7 mi'],[1,'1 mi'],[1.8,'1.8 mi'],[2.26,'2.3 mi']])assert.equal(P.formatMiles(n),s);
 assert.equal(P.straightLineMiles({latitude:null,longitude:0},{latitude:0,longitude:0}),null);
 assert.equal(P.formatMiles(null),'');assert.equal(P.formatMiles(NaN),'');
});
test('addresses require full matching identity and unambiguous valid coordinates',()=>{
 assert.equal(P.addressKey(subject),P.addressKey('100 Example Ln, LUTZ, FL 33548-1234'));
 assert.equal(P.addressKey('100 Example Lane'),'');
 assert.equal(P.matchedPoint(subject,lookup(sold)),null);
 assert.equal(P.matchedPoint(subject,{candidates:[lookup(subject).property,{...lookup(subject).property,latitude:29}]}),null);
 assert.equal(P.matchedPoint(subject,{property:{...lookup(subject).property,latitude:91}}),null);
 assert.equal(P.matchedPoint(subject,{property:{...lookup(subject).property,longitude:''}}),null);
 assert.equal(P.matchedPoint(subject,{property:{...lookup(subject).property,addressLine1:'100 Example Ln',addressLine2:'Unit 2',city:'Lutz',state:'FL',zipCode:'33548'}}),null);
});
test('all six comp slots populate and unchanged address coordinates are reused',async()=>{
 let calls=0;let input={...base};for(const k of ['sold','active'])for(let i=1;i<=3;i++)input[k+'.'+i+'.address']=k==='sold'?sold:active;
 const r=await P.resolveProximity(input,async a=>{calls++;return lookup(a);});assert.equal(calls,3);
 for(let i=1;i<=3;i++){assert.equal(r.values['sold.'+i+'.distance'],'0.7 mi');assert.equal(r.values['active.'+i+'.distance'],'1.8 mi');}
 const again=await P.resolveProximity(r.values,async()=>{throw Error('cache must avoid requests');});assert.deepEqual(again.values,r.values);assert.deepEqual(again.warnings,[]);
});
test('changed or removed addresses invalidate old distances and unmatched addresses remain blank',async()=>{
 const {values}=await P.resolveProximity(base,lookup);
 const edited=C.recalculate({...values,'sold.1.address':'999 Missing Lane, Lutz, FL 33548'});assert.equal(edited['sold.1.distance'],'');assert.equal(edited['active.1.distance'],'1.8 mi');
 const r=await P.resolveProximity(edited,()=>({matched:false}));assert.equal(r.values['sold.1.distance'],'');assert.ok(r.warnings.length);
 const changed=C.recalculate({...values,field_0008:'999 Missing Lane, Lutz, FL 33548'});assert.equal(changed['sold.1.distance'],'');assert.equal(changed['active.1.distance'],'');
 const removed=C.recalculate({...values,'sold.1.address':''});assert.equal(removed['sold.1.distance'],'');
 const fail=await P.resolveProximity({...base,'sold.1.distance':'99 mi'},()=>{throw Error('Unavailable');});assert.equal(fail.values['sold.1.distance'],'');
 const recovered=await P.resolveProximity(fail.values,lookup);assert.equal(recovered.values['sold.1.distance'],'0.7 mi');
});
test('RRR does not invoke coordinate lookups or change its source proximity',async()=>{
 const input={...base,_clientTemplate:'rrr','sold.1.distance':'Source distance'};
 const r=await P.resolveProximity(input,()=>{throw Error('RRR must not call lookup');});assert.deepEqual(r.values,input);assert.equal(C.recalculate(input)['sold.1.distance'],'Source distance');
});
test('AI proximity cannot replace the calculated distance or retain a misleading citation',async()=>{
 const {values}=await P.resolveProximity(base,lookup);
 const updated=C.applyAI(values,{fields:[{name:'sold.1.address',value:'102 Example Lane'},{name:'sold.1.distance',value:'99 mi',path:'comp.pdf',filename:'Comp.pdf',page:1,evidence:'Distance 99 mi'}]}).values;
 assert.equal(updated['sold.1.distance'],'0.7 mi');assert.equal(updated._aiFields['sold.1.distance'],undefined);
});
test('workspace saves computed proximity after lookup and synchronizes rendered inputs',async()=>{
 const vm=require('node:vm'),source=fs.readFileSync('bpo-workspace.js','utf8');let patch,lookups=0,shown=0;
 const db={functions:{invoke:async(name,{body})=>{assert.equal(name,'rentcast-property-lookup');lookups++;return {data:lookup(body.address)};}},from:()=>({insert:p=>{patch=structuredClone(p);return {select:()=>({maybeSingle:async()=>({data:{...patch,revision:1}})})};}})};
 const ctx={window:{PropertyThesisBPOCore:C},values:{...base},epoch:1,record:null,dirty:true,dialog:{querySelector:()=>null,querySelectorAll:()=>[],dataset:{}},user:()=> 'owner',client:()=>db,access:async()=>true,collect:()=>{},showValues:()=>{shown++;},renderAI:()=>{},refreshClientForm:()=>{},status:()=>{},route:()=>{},crypto:require('node:crypto').webcrypto};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function hasProximityComps('),source.indexOf('async function findListing(')),ctx);
 assert.equal(await ctx.save(),true);assert.equal(lookups,3);assert.equal(shown,1);assert.equal(patch.field_values['sold.1.distance'],'0.7 mi');assert.equal(patch.field_values['active.1.distance'],'1.8 mi');
});
test('editable BPO PDF preserves tenth-mile values in sold and active proximity boxes',async()=>{
 const {PDFDocument}=require('pdf-lib'),r=await P.resolveProximity(base,lookup);
 const pdf=await PDFDocument.load(await C.exportPDF(fs.readFileSync('assets/bpo/template.pdf'),r.values));
 assert.equal(pdf.getPageCount(),2);assert.equal(pdf.getForm().getTextField('sold.1.proximity').getText(),'0.7 mi');assert.equal(pdf.getForm().getTextField('active.1.proximity').getText(),'1.8 mi');assert.equal(pdf.getForm().getTextField('sold.2.proximity').getText()||'','');
});

test('duplicate street-number units retry a precise base address on 404 and cache the verified result',async()=>{
 const address='7727 DANUBE DR, #7727, HUDSON, FL 34667',calls=[];
 const response=await P.resolveProximity({field_0008:subject,'sold.1.address':address},async a=>{calls.push(a);if(a===subject)return lookup(a);if(a===address)throw Object.assign(Error('Not found'),{status:404});return {property:{formattedAddress:'7727 Danube Drive, Hudson, FL 34667',latitude:28.01,longitude:-82}};});
 assert.equal(calls.length,3);assert.equal(response.values['sold.1.distance'],'0.7 mi');assert.deepEqual(response.warnings,[]);
 assert.equal(response.values['sold.1.address'],address);assert.equal(response.values._proximity.coordinates[P.addressKey(address)].matchMethod,'duplicate-unit-number');
 const again=await P.resolveProximity(response.values,()=>{throw Error('cached');});assert.deepEqual(again.warnings,[]);
});
test('duplicate-unit fallback never drops ordinary units, bypasses errors, or accepts a different or ambiguous property',async()=>{
 assert.equal(P.redundantUnitAddress('12125 Spartan Way, Apt 104, Hudson, FL 34667'),null);
 const address='7727 Danube Dr #7727, Hudson, FL 34667';let calls=0;
 const rate=await P.resolveProximity({field_0008:subject,'sold.1.address':address},async a=>{if(a===subject)return lookup(a);calls++;throw Object.assign(Error('Rate limit'),{status:429});});
 assert.equal(calls,1);assert.equal(rate.values['sold.1.distance'],'');
 for(const candidates of [[{formattedAddress:'7729 Danube Dr, Hudson, FL 34667',latitude:28.01,longitude:-82}],[{formattedAddress:'7727 Danube Dr, Hudson, FL 34667',latitude:28.01,longitude:-82},{formattedAddress:'7727 Danube Dr, Hudson, FL 34667',latitude:28.02,longitude:-82}]]){
 const r=await P.resolveProximity({field_0008:subject,'sold.1.address':address},async a=>a===subject?lookup(a):a===address?{matched:false}:{candidates});assert.equal(r.values['sold.1.distance'],'');assert.ok(r.warnings.length);
 }
});

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../operations/bpo/core.cjs');
const base=()=>({'sold.0.view':'Neighborhood','sold.1.address':'100 Test St','sold.1.view':'Golf','sold.1.price':'100000','active.1.address':'102 Test St','active.1.view':'Custom view',_adjustments:{globals:{view:'5000'}}});
test('view comparison uses the entered factor with correct signs in both comp grids',()=>{
 for(const p of ['sold.1','active.1'])for(const [choice,sign] of [['superior',-1],['similar',0],['inferior',1]])for(const factor of [0,5000,12500]){
 let v=base();v._adjustments.globals.view=String(factor);v=C.setViewComparison(v,p,choice);v=C.applyAdjustments(v).values;
 assert.equal(C.number(v[p+'.adj_view']),sign*factor||0);assert.deepEqual(C.applyAdjustments(v).values,v);
 }
});
test('view types never imply a ranking, and changing the description or identity requires a fresh comparison',()=>{
 let v=base(),r=C.applyAdjustments(v);assert.equal(r.values['sold.1.adj_view'],undefined);assert.ok(r.warnings.some(w=>w.message.includes('Choose Superior')));
 v=C.applyAdjustments(C.setViewComparison(v,'sold.1','superior')).values;assert.equal(v['sold.1.adj_view'],'-5,000');
 for(const key of ['sold.0.view','sold.1.view','sold.1.address']){const changed={...v,[key]:'Different'};assert.equal(C.viewComparison(changed,'sold.1'),'');assert.equal(C.applyAdjustments(changed).values['sold.1.adj_view'],'');}
});
test('explicit comparison replaces only its own view override; other manual exceptions remain protected',()=>{
 let v=base();v['sold.1.adj_view']='-10000';v['sold.1.adj_garage']='1000';v._adjustments.manual={'sold.1.adj_view':true,'sold.1.adj_garage':true};
 assert.equal(C.applyAdjustments(v).values['sold.1.adj_view'],'-10000');
 v=C.applyAdjustments(C.setViewComparison(v,'sold.1','superior')).values;assert.equal(v['sold.1.adj_view'],'-5,000');assert.equal(v['sold.1.adj_garage'],'1000');assert.equal(v._adjustments.manual['sold.1.adj_garage'],true);
 v['sold.1.adj_view']='-7500';v._adjustments.manual['sold.1.adj_view']=true;assert.equal(C.applyAdjustments(v).values['sold.1.adj_view'],'-7500');
 v=C.applyAdjustments(C.setViewComparison(v,'sold.1','similar')).values;assert.equal(v['sold.1.adj_view'],'0');
 v._adjustments.globals.view='-5000';assert.ok(C.issues(v).some(x=>x.startsWith('View:')));
});
test('comparison picker appears beside each comp view, never the subject view',()=>{
 const source=fs.readFileSync('bpo-workspace.view-v1.js','utf8'),ctx={values:base(),window:{PropertyThesisBPOCore:C},esc:s=>s};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function fieldControl('),source.indexOf('function marketPanel(')),ctx);
 assert.ok(!ctx.formFields([{name:'sold.0.view',label:'View'}]).includes('data-view-comparison'));
 for(const kind of ['sold','active'])for(let i=1;i<4;i++){const html=ctx.formFields([{name:kind+'.'+i+'.view',label:'View'}]);assert.match(html,/<input.*<select data-view-comparison/);for(const x of ['Superior','Similar','Inferior'])assert.ok(html.includes('>'+x+'</option>'));}
});
test('view comparison persists across serialization and signed adjustment reaches PDF and totals',async()=>{
 let v=C.applyAdjustments(C.setViewComparison(base(),'sold.1','superior')).values;v=JSON.parse(JSON.stringify(v));assert.equal(C.viewComparison(v,'sold.1'),'superior');assert.equal(v['sold.1.adjusted'],'95,000');
 const {PDFDocument}=require('pdf-lib'),pdf=await PDFDocument.load(await C.exportPDF(fs.readFileSync('assets/bpo/template.pdf'),v));
 assert.equal(pdf.getForm().getTextField(C.byName.get('sold.1.adj_view').pdfName).getText(),'-$5,000');
});
test('comparison selection updates the comp adjustment immediately through the UI handler',()=>{
 let handler;const el={value:'superior',dataset:{viewComparison:'sold.1'},addEventListener:(_,fn)=>handler=fn};
 const source=fs.readFileSync('bpo-workspace.view-v1.js','utf8'),ctx={values:base(),window:{PropertyThesisBPOCore:C},dialog:{querySelectorAll:()=>[el]},collect:()=>{},modified:()=>{},showValues:()=>{},validateForm:()=>{}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function syncViewComparisons('),source.indexOf('function lotUnitControl(')),ctx);
 ctx.bindViewComparisons();handler();assert.equal(ctx.values['sold.1.adj_view'],'-5,000');
 el.value='inferior';handler();assert.equal(ctx.values['sold.1.adj_view'],'5,000');
 ctx.values['sold.1.view']='Different';ctx.syncViewComparisons();assert.equal(el.value,'');
});

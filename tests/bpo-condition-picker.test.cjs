const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('bpo-workspace.condition-v1.js','utf8');
test('condition picker retains every grade after typed or selected values, including RRR',()=>{
 const fn=source.slice(source.indexOf('function fieldControl('),source.indexOf('function lotUnitControl('));
 for(const client of ['general','rrr'])for(const value of ['Good','Average','Custom condition','']){
 const ctx={values:{_clientTemplate:client,'sold.1.condition':value},window:{PropertyThesisBPOCore:{}}};vm.createContext(ctx);vm.runInContext(fn,ctx);
 const html=ctx.fieldControl({name:'sold.1.condition'},'data-bpo-field="sold.1.condition"');
 assert.ok(!html.includes('list="'));for(const grade of ['Poor','Fair','Average','Good','Excellent'])assert.ok(html.includes('>'+grade+'</option>'));assert.match(html,/type="text"/);
 }
});
test('choosing a grade updates the editable field and emits its normal save/recalculation event',()=>{
 let handler,emitted,focused=false;const input={value:'Custom',dispatchEvent:e=>{emitted=e;},focus:()=>focused=true},select={value:'Average',parentElement:{querySelector:()=>input},addEventListener:(_,fn)=>handler=fn};
 const ctx={dialog:{querySelectorAll:()=>[select]},Event:class{constructor(type,options){this.type=type;Object.assign(this,options);}}};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function bindConditionPickers('),source.indexOf('function fieldControl(')),ctx);ctx.bindConditionPickers();handler();
 assert.equal(input.value,'Average');assert.equal(select.value,'');assert.equal(emitted.type,'input');assert.equal(emitted.bubbles,true);assert.equal(focused,true);
 select.value='Excellent';handler();assert.equal(input.value,'Excellent');assert.equal(select.value,'');
});

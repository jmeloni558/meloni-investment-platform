const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../operations/bpo/core.cjs');
const source=fs.readFileSync('bpo-workspace.js','utf8');
function context(template='general',unit='sqft'){
 const ctx={window:{PropertyThesisBPOCore:C},values:C.recalculate({_clientTemplate:template,_lotUnit:unit}),esc:s=>String(s??''),proximityNote:()=>''};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function fieldControl('),source.indexOf('function marketPanel('))+source.slice(source.indexOf('function reportForm('),source.indexOf('function generalCompEditor(')),ctx);return ctx;
}
test('report preview has no condition or lot-unit picker and keeps all condition fields positioned',()=>{
 for(const template of ['general','rrr'])for(const unit of ['sqft','acres']){
  const ctx=context(template,unit),html=ctx.reportForm(C);
  assert.doesNotMatch(html,/data-condition-picker|data-lot-unit/);
  assert.equal((html.match(/class="pt-bpo-page"/g)||[]).length,2);
  for(const f of C.schema.filter(f=>/\.condition$/.test(f.name))){
   const tag=html.match(new RegExp('<input[^>]*data-bpo-field="'+f.name.replaceAll('.','\\.')+'"[^>]*>'))?.[0];assert.ok(tag,f.name);
   assert.match(tag,/style="left:[^;]+%;top:[^;]+%;width:[^;]+%;height:/);assert.doesNotMatch(tag,/readonly/);
  }
  if(template==='general')assert.ok(html.includes(unit==='acres'?'(acres)':'(sq. ft.)'));
 }
});
test('subject and comparable data entry retain editable condition pickers and lot conversion selectors',()=>{
 const ctx=context();for(const name of ['sold.0.condition','sold.1.condition','active.3.condition']){
  const html=ctx.formFields([C.schema.find(f=>f.name===name)]);assert.match(html,/data-condition-picker/);assert.match(html,/type="text"/);
 }
 for(const name of ['sold.0.site','sold.1.site','active.3.site'])assert.match(ctx.formFields([C.schema.find(f=>f.name===name)]),/data-lot-unit/);
});
test('published workspace uses the same corrected source',()=>{
 assert.equal(fs.readFileSync('bpo-workspace.ai-bpo-v1.js','utf8'),source);
 assert.match(fs.readFileSync('app-core.html','utf8'),/bpo-workspace\.ai-bpo-v1\.js\?release=20261101-ai-bpo-condition12/);
});

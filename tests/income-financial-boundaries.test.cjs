const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/propertythesis-income-engine/index.ts'),'utf8');
const analyze=vm.runInNewContext(stripTypeScriptTypes(source.slice(source.indexOf('const finite='),source.indexOf('Deno.serve(')))+';analyze');
const base={price:300000,land:60000,rent:3000,units:1,depLife:27.5,hold:5,loanYears:5,mortgage:240000,interestOnly:true,mortRate:.06};
test('interest-only principal is paid exactly once before, at and after maturity',()=>{
 for(const hold of [4,5,6]){
  const r=analyze({...base,hold});
  assert.equal(r.loanPayoff+r.years.reduce((s,y)=>s+y.principal,0),240000);
  assert.equal(r.loanPayoff,hold<=5?240000:0);
  assert.equal(r.ater,hold<=5?60000:300000);
  if(hold>5){assert.equal(r.amort.at(-1).principal,240000);assert.equal(r.years[4].debt,254400);}
 }
});
test('zero-rate amortization remains finite and pays principal normally',()=>{
 const r=analyze({...base,interestOnly:false,mortRate:0,hold:3});
 assert.equal(r.loanPayoff,96000);assert.equal(r.ater,204000);
 assert.ok(r.years.every(y=>y.interest===0&&Number.isFinite(y.atcf)));
});
test('depreciation stops at basis including fractional final year',()=>{
 for(const depLife of [1,5,27.5]){
  const r=analyze({...base,mortgage:0,hold:40,depLife,ordinaryTax:.24});
  assert.equal(r.accDep,240000);assert.equal(r.book,60000);
  assert.ok(Math.abs(r.years.reduce((s,y)=>s+y.depreciation,0)-240000)<.00001);
  assert.equal(r.years[39].depreciation,0);assert.equal(r.years[39].taxable,r.years[39].noi);
 }
});

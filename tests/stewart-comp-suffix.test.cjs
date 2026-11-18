'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {importStewartComps}=require('../operations/portal-import/stewart/import.js');
test('missing comp suffix needs matching MLS, ZIP and no conflicting unit or street',()=>{
 const source=importStewartComps.toString().split('  function set(')[0]+'return matches;}';
 for(const fannie of [false,true]){
  const context=vm.createContext({location:{origin:'https://www.protk.com',pathname:'/ProTeck.Fulfillment.Case.Forms/CaseFormPortal/DataEntry/123'}});
  const factory=vm.runInContext('('+source.replace('async function','function')+')',context);
  const match=factory({format:fannie?'propertythesis-stewart-fannie':'propertythesis-stewart',subject:{}});
  const c={address:'7604 MAKO',locality:'HUDSON FL 34667',zip:'34667',mls:'W7885210'};
  const s={address:'7604 Mako Dr',zip:'34667',mls:'W7885210',unit:'',second:''};
  assert.equal(match(c,s),true);
  assert.equal(match({...c,address:s.address},{...s,address:c.address}),true);
  for(const change of [{mls:''},{mls:'W7885211'},{zip:''},{zip:'34668'},{unit:'2'},{address:'7605 Mako Dr'},{address:'7604 N Mako Dr'},{address:'7604 Other Dr'},{second:'Unit 2'}])
   assert.equal(!!match(c,{...s,...change}),false,JSON.stringify(change));
  assert.equal(!!match({...c,address:'7604 Mako Ct'},s),false);
  assert.equal(!!match({...c,address:'7604 Mako #2'},s),false);
  const typo={address:'5461 MAGDALENE WAY',locality:'ZEPHYRHILLS FL 33541',zip:'33541',mls:'TB8490515'};
  const loaded={address:'5461 Magdelene Way',zip:'33541',mls:'TB8490515',unit:'',second:''};
  assert.equal(match(typo,loaded),true);
  for(const change of [{mls:''},{mls:'TB8490516'},{zip:''},{zip:'33542'},{unit:'2'},{address:'5462 Magdelene Way'},{address:'5461 Magdelene Dr'},{address:'5461 N Magdelene Way'},{address:'5461 Magdolena Way'},{second:'Unit 2'}])
   assert.equal(!!match(typo,{...loaded,...change}),false,JSON.stringify(change));

 }
});

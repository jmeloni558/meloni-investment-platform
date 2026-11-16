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
 }
});

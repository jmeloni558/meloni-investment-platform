'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {importStewartComps}=require('../operations/portal-import/stewart/import.js');
test('both Stewart forms accept ZIP+4 formatting without accepting a different property',async()=>{
  const source=importStewartComps.toString().split('  function control(')[0]+'checkOrder(); return true;}';
  for(const fannie of [false,true]){
    for(const [transferZip,portalZip] of [['34667-3963','34667'],['34667','34667-3963'],['34667-3963','34667-3963']]){
      const subject={address:'7637 HATTERAS DR',city:'HUDSON',state:'FL',zip:transferZip};
      const run=(subject,heading)=>{
        const context=vm.createContext({location:{origin:'https://www.protk.com',pathname:'/ProTeck.Fulfillment.Case.Forms/CaseFormPortal/DataEntry/123'},document:{querySelectorAll:selector=>selector==='h1'?[{textContent:heading}]:fannie?[{textContent:'FM MIT Interior BPO'}]:[]}});
        return vm.runInContext('('+source+')',context)({format:fannie?'propertythesis-stewart-fannie':'propertythesis-stewart',subject});
      };
      const heading='7637 HATTERAS DR HUDSON, FL '+portalZip+' (Case #123)';
      assert.equal(await run(subject,heading),true);
      for(const change of [{address:'7638 HATTERAS DR'},{state:'GA'},{zip:'34668-3963'},{address:'7637 HATTERAS DR #2'}])
        await assert.rejects(run({...subject,...change},heading),/subject/);
      if(fannie)assert.equal(await run({...subject,address:subject.address+' HUDSON, FL '+transferZip},heading),true);
    }
  }
});

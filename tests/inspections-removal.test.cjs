const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),vm=require('node:vm');
const source=readFileSync('operations/portal-import/propertythesis/inspection-worker.js','utf8').split('const delay=')[0];
test('removes only full address from named list and checks again after reload',async()=>{
  const job={address:'123 Example Loop Tampa, FL 33601',account:'test@example.com',listName:'Inspections',listUrl:'https://www.google.com/maps/list/!2sabc!'};
  const rows=[];
  const make=t=>{
    const button={innerText:t,getAttribute:()=>null};
    const del={click(){rows.splice(rows.indexOf(button),1)}};
    button.parentElement={parentElement:{querySelector:()=>del,querySelectorAll:()=>[del]}};
    return button;
  };
  const target=make('123 Example Lp\nTampa, FL 33601'),other=make('123 Example Lp\nOther, FL 33602');
  rows.push(target,other);
  const main={contains:b=>rows.includes(b),querySelectorAll:s=>s==='button'?rows:[{textContent:'Private ? '+rows.length+' places'}]};
  const document={querySelector:s=>s.startsWith('main')?main:{getAttribute:()=>'(test@example.com)'},querySelectorAll:()=>[{textContent:'Inspections'}]};
  const maps=vm.runInNewContext(source+';mapsPage',{document,location:new URL(job.listUrl),URL,setTimeout});
  const condo=make('The Fountains at Countryside\n2500 Winding Creek Blvd\nClearwater, FL 33761');
  const cambio=make('4350 Cambio Gdns Ct\nTampa, FL 33610');
  rows.push(condo,cambio);
  for(const address of ['2500 Winding Creek Blvd Condo I-106 Clearwater, FL 33761','4350 Cambio Gardens Court Tampa, FL 33610']){
    assert.equal((await maps({...job,address},'membership')).found,true);
  }
  assert.equal((await maps({...job,address:'4350 Cambio Gardens Court Tampa, FL 33611'},'membership')).found,undefined);
  const cooper=make('4519 S Cooper Pl\nTampa, FL 33611');
  rows.push(cooper);
  for(const address of ['4350 Cambio Gardens Ct Tampa, FL 33610','4519 S Cooper Pl Tampa, FL 33611','2500 Winding Creek Blvd Condo I-106 Clearwater, FL 33761']){
    assert.equal((await maps({...job,address},'remove')).ok,true);
    assert.equal((await maps({...job,address},'confirmRemoval')).missing,true);
  }
  assert.deepEqual(rows,[target,other]);
  assert.match((await maps(job,'confirmRemoval')).error,/not confirmed/);
  assert.equal((await maps(job,'remove')).ok,true);
  assert.deepEqual(rows,[other]);
  assert.equal((await maps(job,'confirmRemoval')).missing,true);
  assert.match((await maps({...job,account:'other@example.com'},'remove')).error,/account/);
});

test('tries unique building-address variants and rejects unverified results before opening Save',async()=>{
  const job={address:'4519 South Cooper Place Apt. 8, Tampa, FL 33611',account:'test@example.com'};
  let displayed;
  const document={querySelector(selector){
    if(selector.includes('Google Account'))return {getAttribute:()=>'(test@example.com)'};
    if(selector.includes('data-item-id'))return {getAttribute:()=>displayed};
    throw Error('Reached save controls');
  }};
  const maps=vm.runInNewContext(source+';mapsPage',{document,location:new URL('https://www.google.com/maps/search/'),URL,setTimeout});
  const queries=Array.from(await maps(job,'queries'));
  assert.deepEqual(queries,[job.address,'4519 South Cooper Place, Tampa, FL 33611','4519 s Cooper pl, Tampa, FL 33611']);
  for(displayed of ['4518 S Cooper Pl Tampa FL 33611','4519 S Cooper Pl Tampa FL 33610','4519 S Copper Pl Tampa FL 33611','4519 S Cooper Pl Tampa FL']){
    assert.equal((await maps(job,'sync')).retryAddress,true);
  }
  displayed='4519 S Cooper Pl, Tampa FL 33611-1234';
  assert.equal((await maps(job,'sync')).error,'Reached save controls');
  await assert.rejects(maps({...job,address:'4519 S Cooper Pl Tampa FL'},'queries'),/ZIP/);
});

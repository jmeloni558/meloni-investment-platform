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
  assert.match((await maps(job,'confirmRemoval')).error,/not confirmed/);
  assert.equal((await maps(job,'remove')).ok,true);
  assert.deepEqual(rows,[other]);
  assert.equal((await maps(job,'confirmRemoval')).missing,true);
  assert.match((await maps({...job,account:'other@example.com'},'remove')).error,/account/);
});

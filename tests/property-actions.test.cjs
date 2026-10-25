const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
test('property actions retain handlers and income comps across repeated rendering',()=>{
 const dom=new JSDOM(`<div id="propertyhub"><div class="hub-card"><div class="hub-actions"><button data-stage7-file="p">Open</button><button data-hub-edit="p">Edit</button><button data-hub-report="p">Report</button><button data-pt-manage="p">Manage</button><button data-hub-archive="p">Archive</button><button data-hub-delete="p">Delete</button><button data-ic-open="p">Income Comps</button></div></div></div>`,{runScripts:'outside-only'});
 const w=dom.window,d=w.document;let opened=0;d.querySelector('[data-stage7-file]').onclick=()=>opened++;
 w.eval(fs.readFileSync(path.join(__dirname,'../guided-save-existing-workflow-v8.js'),'utf8'));
 for(let i=0;i<3;i++)w.PropertyThesisGuidedSaveExistingWorkflow.modernizeHub();
 assert.equal(d.querySelector('[data-hub-edit]'),null);
 assert.equal(d.querySelectorAll('[data-stage7-file]').length,1);
 d.querySelector('[data-stage7-file]').click();assert.equal(opened,1);
 assert.equal(d.querySelector('[data-pt-manage]').textContent,'Analysis versions');
 for(const s of ['[data-pt-manage]','[data-pt-new]','[data-hub-delete]','[data-hub-archive]'])assert.ok(d.querySelector('.pt-hub-more '+s));
 assert.ok(d.querySelector('.pt-hub-primary-flow [data-ic-open]'));
 assert.equal(d.querySelectorAll('.pt-hub-more').length,1);
 dom.window.close();
});

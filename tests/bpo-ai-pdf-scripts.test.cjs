'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {PDFDocument,PDFName}=require('pdf-lib');
const {adaptAiPdfScripts}=require('../operations/bpo/ai-pdf-scripts.cjs');
function actions(pdf){return pdf.getForm().getFields().flatMap(f=>f.acroField.getWidgets().map(w=>({name:f.getName(),aa:w.dict.lookup(PDFName.of('AA'))}))).filter(x=>x.aa);}
function source(aa,key){return aa.lookup(PDFName.of(key))?.lookup(PDFName.of('JS'))?.decodeText();}
function run(script,fields,name,value){const alerts=[],event={target:fields[name],source:null,value,rc:true};vm.runInNewContext(script,{event,app:{alert:m=>alerts.push(m)},getField:n=>fields[n]},{timeout:1000});return {event,alerts};}
test('AI missing-data labels survive PDF open calculations without dollar alerts; numeric validation remains active',async()=>{
 const pdf=await PDFDocument.load(fs.readFileSync('assets/bpo/template.pdf'));
 const fields=Object.fromEntries(pdf.getForm().getFields().map(f=>[f.getName(),{name:f.getName(),value:''}]));
 for(const [name,value] of Object.entries({'sold.0.price':'N/P','sold.0.ppsf':'N/P','subject_shared.gla':'1500','active.2.price':'N/A','active.2.gla':'N/A','active.2.ppsf':'N/A','active.3.price':'N/A','active.3.gla':'N/A','active.3.ppsf':'N/A','value_repaired':'N/P'}))fields[name].value=value;
 const original=actions(pdf),ppsf=original.find(a=>a.name==='sold.0.ppsf');
 const bad=run(source(ppsf.aa,'C'),fields,ppsf.name,fields[ppsf.name].value);
 assert.ok(Number.isNaN(bad.event.value));assert.equal(run(source(ppsf.aa,'V'),fields,ppsf.name,bad.event.value).alerts.length,1);
 adaptAiPdfScripts(pdf);
 const reopened=await PDFDocument.load(await pdf.save()),fixed=actions(reopened);
 for(const a of fixed){for(const marker of ['N/P','N/A'])if(source(a.aa,'V')){const r=run(source(a.aa,'V'),fields,a.name,marker);assert.equal(r.alerts.length,0,a.name);assert.equal(r.event.rc,true);}}
 for(const name of ['sold.0.ppsf','active.2.ppsf','active.3.ppsf']){
  const a=fixed.find(a=>a.name===name),r=run(source(a.aa,'C'),fields,name,fields[name].value);assert.equal(r.event.value,fields[name].value);assert.equal(run(source(a.aa,'V'),fields,name,r.event.value).alerts.length,0);
 }
 const a=fixed.find(a=>a.name==='sold.0.price');assert.equal(run(source(a.aa,'V'),fields,a.name,'123.45').event.rc,false);assert.equal(run(source(a.aa,'V'),fields,a.name,'300000').event.rc,true);
 fields['sold.0.price'].value='300000';const calc=fixed.find(a=>a.name==='sold.0.ppsf');assert.equal(run(source(calc.aa,'C'),fields,calc.name,'N/P').event.value,200);
 assert.equal(reopened.getForm().getFields().length,pdf.getForm().getFields().length);
});

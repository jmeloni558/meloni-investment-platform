'use strict';
const {PDFDict,PDFName,PDFHexString}=require('pdf-lib');
// AI reports use explicit missing-data labels in otherwise numeric form fields.
// Keep the template's numeric validation and calculations, but treat these labels
// as missing inputs instead of allowing Number('N/P') to become NaN on open.
function adaptAiPdfScripts(doc){
 for(const [,object] of doc.context.enumerateIndirectObjects()){
  if(!(object instanceof PDFDict))continue;
  const actions=object.lookup(PDFName.of('AA'));if(!(actions instanceof PDFDict))continue;
  for(const kind of ['V','C']){
   const action=actions.lookup(PDFName.of(kind));if(!(action instanceof PDFDict))continue;
   const js=action.lookup(PDFName.of('JS'));if(!js?.decodeText)continue;
   const source=js.decodeText();if(source.includes('PTAI_MISSING_VALUE'))continue;
   const marker='/^(?:N\\/P|N\\/A)$/';
   const wrapped=kind==='V'
    ? '/* PTAI_MISSING_VALUE */ if('+marker+'.test(String(event.value))){event.rc=true;}else{'+source+'\n}'
    : '/* PTAI_MISSING_VALUE */ (function(){var ptDoc=this,ptBefore=event.target.value; (function(){'+source+'\n}).call({getField:function(name){var field=ptDoc.getField(name);return field&&'+marker+'.test(String(field.value))?{name:field.name,value:""}:field;}});if(event.value===""&&('+marker+'.test(String(ptBefore))||(event.target.name==="repairs_total"&&String(ptBefore).replace(/[$,\\s]/g,"")==="0")))event.value=ptBefore;}).call(this);';
   action.set(PDFName.of('JS'),PDFHexString.fromText(wrapped));
  }
 }
}
module.exports={adaptAiPdfScripts};

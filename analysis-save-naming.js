'use strict';
(()=>{
  const VERSION=1;
  if((window.__analysisSaveNamingVersion||0)>=VERSION)return;
  window.__analysisSaveNamingVersion=VERSION;

  const original=window.saveCurrentCloud;
  if(typeof original!=='function')return;

  function propertyLabel(){
    try{
      const p=(cloudProperties||[]).find(x=>x.id===selectedPropertyId);
      return p?.name||p?.address||state?.address||'this property';
    }catch(_e){return 'this property';}
  }

  function suggestedName(){
    try{
      const count=(cloudAnalyses||[]).filter(a=>a.property_id===selectedPropertyId).length;
      return count===0?'Base Case':`Analysis ${count+1}`;
    }catch(_e){return 'Base Case';}
  }

  window.saveCurrentCloud=async function(clone=false){
    let isNew=false;
    try{isNew=!clone&&!!cloudUser&&!!selectedPropertyId&&!selectedAnalysisId;}catch(_e){}
    if(!isNew)return original.apply(this,arguments);

    const name=window.prompt(`Name this new analysis for ${propertyLabel()}:`,suggestedName());
    if(name===null){
      try{setStatus('Save canceled — the new analysis is still unsaved.');}catch(_e){}
      return;
    }
    const trimmed=name.trim();
    if(!trimmed){
      try{setStatus('Enter an analysis name before saving.');}catch(_e){}
      return;
    }

    const beforeId=selectedAnalysisId;
    await original.call(this,false);
    const newId=selectedAnalysisId;
    if(!newId||newId===beforeId)return;

    try{
      const {error}=await cloudClient.from('analyses').update({name:trimmed,updated_at:new Date().toISOString()}).eq('id',newId).eq('user_id',cloudUser.id);
      if(error)throw error;
      if(typeof refreshCloud==='function')await refreshCloud();
      try{window.UnsavedChangeProtection?.markClean?.();}catch(_e){}
      try{window.NewAnalysisSaveGuidance?.refresh?.();}catch(_e){}
      try{setStatus(`Analysis saved as “${trimmed}”.`);}catch(_e){}
    }catch(e){
      try{setStatus('Analysis saved, but its name could not be updated: '+e.message);}catch(_e){}
    }
  };
})();

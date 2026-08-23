'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisProtectedCloudSaveBridgeV||0)>=VERSION)return;
  window.__propertyThesisProtectedCloudSaveBridgeV=VERSION;

  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};
  const clone=v=>{try{return structuredClone(v);}catch(_e){return JSON.parse(JSON.stringify(v));}};

  function existingAnalysis(){
    try{return (cloudAnalyses||[]).find(a=>a.id===selectedAnalysisId)||null;}catch(_e){return null;}
  }
  function propertyLabel(){
    try{
      const p=(cloudProperties||[]).find(x=>x.id===selectedPropertyId);
      return p?.name||p?.address||state?.address||'this property';
    }catch(_e){return state?.address||'this property';}
  }
  function suggestedName(){
    try{
      const count=(cloudAnalyses||[]).filter(a=>a.property_id===selectedPropertyId).length;
      return count===0?'Base Case':`Analysis ${count+1}`;
    }catch(_e){return 'Base Case';}
  }
  function chooseName(cloneMode){
    const current=existingAnalysis();
    if(cloneMode)return (current?.name||state?.name||'Base Analysis')+' — Copy';
    if(current)return current.name||state?.name||'Base Analysis';
    const name=window.prompt(`Name this new analysis for ${propertyLabel()}:`,suggestedName());
    if(name===null)return null;
    return name.trim()||'';
  }
  function outputsFrom(r){
    const y=r?.years?.[0]||{};
    return {
      cap:r?.cap,grm:r?.grm,irr:r?.IRR,npv:r?.NPV,
      year1_noi:y.noi,year1_atcf:y.atcf,year1_dscr:y.dcr,
      taxes_due_sale:r?.saleTax,after_tax_reversion:r?.ater
    };
  }
  async function ensureProperty(){
    if(selectedPropertyId)return selectedPropertyId;
    const name=state?.name||state?.address||'Untitled Property';
    const {data,error}=await cloudClient.from('properties').insert({
      user_id:cloudUser.id,client_id:selectedClientId||null,name,
      address:state?.address||null,state:'FL',updated_at:new Date().toISOString()
    }).select().single();
    if(error)throw error;
    selectedPropertyId=data.id;
    return data.id;
  }
  async function protectedResult(){
    try{if(typeof readFields==='function')readFields();}catch(_e){}
    const bridge=window.PropertyThesisIncomeEngineBridge;
    if(!bridge?.requestServer)throw new Error('Calculation service is not ready.');
    const r=await bridge.requestServer({...state},{refresh:false});
    if(!r?.years?.length)throw new Error(bridge.status?.().lastError||'The calculation service did not return a complete analysis.');
    result=r;
    return r;
  }
  async function saveProtectedScenarios(analysisId){
    try{
      const secondary=window.PropertyThesisSecondaryEngine;
      const data=await secondary?.request?.({refresh:false});
      const rows=data?.scenarios;
      if(!Array.isArray(rows)||!rows.length)return;
      for(const row of rows){
        const key=String(row.key||'').toUpperCase();
        if(!['A','B','C'].includes(key))continue;
        let assumptions={};
        try{assumptions=typeof getScenarioState==='function'?clone(getScenarioState(key)):{};}catch(_e){}
        const payload={
          user_id:cloudUser.id,analysis_id:analysisId,name:'Scenario '+key,
          assumptions,
          outputs:{irr:row.IRR,npv:row.NPV,monthly_payment:row.monthlyPayment,year1_dscr:row.dcr},
          updated_at:new Date().toISOString()
        };
        const existing=(cloudScenarios||[]).find(x=>x.analysis_id===analysisId&&x.name==='Scenario '+key);
        const q=existing?cloudClient.from('scenarios').update(payload).eq('id',existing.id):cloudClient.from('scenarios').insert(payload);
        const {error}=await q;if(error)throw error;
      }
    }catch(e){console.warn('Protected scenario save skipped:',e);}
  }

  window.saveCurrentCloud=async function(cloneMode=false){
    try{
      if(typeof ensureCloud==='function'&&!ensureCloud())return;
      if(!cloudUser)throw new Error('Sign in before saving an analysis.');
      window.SaveStateFeedback?.saving?.();
      status('Saving analysis…');

      const r=await protectedResult();
      const pid=await ensureProperty();
      const name=chooseName(!!cloneMode);
      if(name===null){status('Save canceled — the analysis remains unsaved.');window.SaveStateFeedback?.unsaved?.();return;}
      if(!name){status('Enter an analysis name before saving.');window.SaveStateFeedback?.unsaved?.();return;}

      const payload={
        user_id:cloudUser.id,property_id:pid,name,
        assumptions:{...state,buyState:typeof buyState==='object'?clone(buyState):{}},
        outputs:outputsFrom(r),
        report_meta:{prepared_by:'Jamie Meloni',brokerage:'Meloni Realty'},
        updated_at:new Date().toISOString()
      };
      const currentId=!cloneMode?selectedAnalysisId:null;
      const q=currentId
        ?cloudClient.from('analyses').update(payload).eq('id',currentId).eq('user_id',cloudUser.id).select().single()
        :cloudClient.from('analyses').insert(payload).select().single();
      const {data,error}=await q;if(error)throw error;
      selectedAnalysisId=data.id;

      await saveProtectedScenarios(data.id);
      if(typeof refreshCloud==='function')await refreshCloud();
      try{window.UnsavedChangeProtection?.markClean?.();}catch(_e){}
      try{window.NewAnalysisSaveGuidance?.refresh?.();}catch(_e){}
      window.SaveStateFeedback?.saved?.();
      status(cloneMode?'Analysis copy saved.':`Analysis saved as “${name}”.`);
      return data;
    }catch(e){
      console.error(e);window.SaveStateFeedback?.error?.();
      status('Analysis save failed: '+String(e?.message||e));
      return null;
    }
  };

  window.PropertyThesisProtectedCloudSaveBridge={version:VERSION};
})();

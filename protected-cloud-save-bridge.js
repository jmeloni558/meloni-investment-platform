'use strict';
(()=>{
  const VERSION=4;
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
  function ensureNamingDialog(){
    let modal=document.getElementById('ptAnalysisNameModal');
    if(modal)return modal;
    const style=document.createElement('style');
    style.id='ptAnalysisNameModalStyles';
    style.textContent=`#ptAnalysisNameModal{position:fixed;inset:0;z-index:10120;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,35,55,.62)}#ptAnalysisNameModal.hidden{display:none}#ptAnalysisNameModal .pt-name-shell{width:min(460px,100%);background:#fff;border:1px solid #cbd9e5;border-radius:15px;box-shadow:0 24px 70px rgba(15,35,55,.32);padding:22px}#ptAnalysisNameModal h3{margin:0 0 6px;color:#17395d;font-size:20px}#ptAnalysisNameModal p{margin:0 0 16px;color:#5d6f82;font-size:12px;line-height:1.5}#ptAnalysisNameModal label{display:block;margin-bottom:6px;color:#263b52;font-size:11px;font-weight:800}#ptAnalysisNameModal input{width:100%;box-sizing:border-box;min-height:44px;border:1px solid #b8cad9;border-radius:9px;padding:10px 12px;font:inherit}#ptAnalysisNameModal input:focus{outline:3px solid rgba(22,137,142,.18);border-color:#16898e}#ptAnalysisNameModal .pt-name-error{min-height:18px;margin:7px 0 4px;color:#b42318;font-size:11px;font-weight:700}#ptAnalysisNameModal .pt-name-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:10px}`;
    document.head.appendChild(style);
    modal=document.createElement('div');
    modal.id='ptAnalysisNameModal';modal.className='hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','ptAnalysisNameTitle');
    modal.innerHTML=`<div class="pt-name-shell"><h3 id="ptAnalysisNameTitle">Name this analysis</h3><p id="ptAnalysisNameProperty"></p><label for="ptAnalysisNameInput">Scenario name</label><input id="ptAnalysisNameInput" maxlength="80" autocomplete="off"><div id="ptAnalysisNameError" class="pt-name-error" role="alert"></div><div class="pt-name-actions"><button type="button" class="btn ghost" data-pt-name-cancel>Cancel</button><button type="button" class="btn primary" data-pt-name-save>Save Analysis</button></div></div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function requestAnalysisName(){
    const modal=ensureNamingDialog(),input=modal.querySelector('#ptAnalysisNameInput'),error=modal.querySelector('#ptAnalysisNameError');
    modal.querySelector('#ptAnalysisNameProperty').textContent=`Create a distinct scenario for ${propertyLabel()}.`;
    input.value=suggestedName();error.textContent='';modal.classList.remove('hidden');
    return new Promise(resolve=>{
      const finish=value=>{modal.classList.add('hidden');document.removeEventListener('keydown',onKey,true);resolve(value);};
      const validate=()=>{const value=input.value.trim();if(!value){error.textContent='Enter an analysis name.';input.focus();return;}const duplicate=(cloudAnalyses||[]).some(a=>a.property_id===selectedPropertyId&&String(a.name||'').trim().toLowerCase()===value.toLowerCase());if(duplicate){error.textContent='That scenario name already exists for this property. Choose a different name.';input.focus();input.select();return;}finish(value);};
      const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(null);}else if(e.key==='Enter'){e.preventDefault();validate();}};
      modal.querySelector('[data-pt-name-cancel]').onclick=()=>finish(null);
      modal.querySelector('[data-pt-name-save]').onclick=validate;
      document.addEventListener('keydown',onKey,true);setTimeout(()=>{input.focus();input.select();},0);
    });
  }
  async function chooseName(cloneMode){
    const current=existingAnalysis();
    if(cloneMode)return (current?.name||state?.name||'Base Analysis')+' — Copy';
    if(current)return current.name||state?.name||'Base Analysis';
    try{if((cloudAnalyses||[]).filter(a=>a.property_id===selectedPropertyId).length===0)return 'Base Case';}catch(_e){}
    if(localStorage.getItem('ptBillingResumeV1')==='1')return suggestedName();
    return requestAnalysisName();
  }
  function syncInitialRepairs(){
    const source=document.getElementById('f_initialRepairs');
    const guided=document.querySelector('#guidedSetup [data-src="f_initialRepairs"]');
    const raw=guided?.value!==undefined?guided.value:source?.value;
    if(typeof state==='object'&&state)state.initialRepairs=Math.max(0,Number(raw)||0);
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

      syncInitialRepairs();
      const r=await protectedResult();
      const pid=await ensureProperty();
      const name=await chooseName(!!cloneMode);
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

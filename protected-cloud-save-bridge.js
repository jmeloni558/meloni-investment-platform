'use strict';
(()=>{
  const VERSION=14;
  let sharedSaveClient=null;
  if((window.__propertyThesisProtectedCloudSaveBridgeV||0)>=VERSION)return;
  window.__propertyThesisProtectedCloudSaveBridgeV=VERSION;

  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);if(typeof document.createElement==='function'&&!document.getElementById('saveStatus')){let el=document.getElementById('ptProtectedSaveStatus');if(!el){el=document.createElement('p');el.id='ptProtectedSaveStatus';el.setAttribute('role','status');el.style.cssText='position:fixed;bottom:80px;left:12px;max-width:520px;padding:12px;background:#fff4cc;color:#18334d;z-index:30001';document.body.appendChild(el);}el.textContent=t;}}catch(_e){}};
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
    const raw=guided?.value!==undefined?guided.value:(source?.value!==''?source?.value:undefined);
    if(raw!==undefined&&typeof state==='object'&&state)state.initialRepairs=Math.max(0,Number(raw)||0);
  }
  function captureInitialRepairs(e){
    const input=e.target?.closest?.('[data-src="f_initialRepairs"]');if(!input)return;
    const value=Math.max(0,Number(input.value)||0),source=document.getElementById('f_initialRepairs');
    if(source)source.value=input.value;
    if(typeof state==='object'&&state)state.initialRepairs=value;
  }
  document.addEventListener('input',captureInitialRepairs,true);
  document.addEventListener('change',captureInitialRepairs,true);
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

  async function sharedScenarioPayload(analysisId){
    if(typeof readScenarioInputs==='function')readScenarioInputs();
    const data=await window.PropertyThesisSecondaryEngine?.request?.({refresh:false});
    if(!Array.isArray(data?.scenarios))throw Error('Scenario calculation is not ready. Nothing was saved.');
    return data.scenarios.filter(row=>['A','B','C'].includes(String(row.key||'').toUpperCase())).map(row=>{
      const key=String(row.key).toUpperCase(),name='Scenario '+key;
      const existing=(cloudScenarios||[]).find(x=>x.analysis_id===analysisId&&x.name===name);
      return {id:existing?.id||crypto.randomUUID(),name,
        assumptions:typeof getScenarioState==='function'?clone(getScenarioState(key)):{},
        outputs:{irr:row.IRR,npv:row.NPV,monthly_payment:row.monthlyPayment,year1_dscr:row.dcr}};
    });
  }

  window.saveCurrentCloud=async function(cloneMode=false){
    try{
      if(typeof ensureCloud==='function'&&!ensureCloud())return;
      if(!cloudUser)throw new Error('Sign in before saving an analysis.');
      window.SaveStateFeedback?.saving?.();
      status('Saving analysis…');

      syncInitialRepairs();
      const r=await protectedResult();
      const pid=sharedSaveClient?selectedPropertyId:await ensureProperty();
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
      // The guided website asks for an address, not a separate property name.
      // Match legacy property creation while meeting the shared API contract.
      if(sharedSaveClient&&!pid&&!String(payload.assumptions.name||'').trim()){
        payload.assumptions.name=String(payload.assumptions.address||'').trim().slice(0,100);
      }
      const q=sharedSaveClient
        ?(currentId?sharedSaveClient.save({id:currentId,name,assumptions:payload.assumptions,outputs:payload.outputs,
          reportMeta:{},scenarios:await sharedScenarioPayload(currentId)}):sharedSaveClient.create({propertyId:pid,sourceId:cloneMode?selectedAnalysisId:null,
          name,assumptions:payload.assumptions,outputs:payload.outputs,reportMeta:cloneMode?{}:payload.report_meta,
          scenarios:await sharedScenarioPayload(cloneMode?selectedAnalysisId:null)})).then(data=>({data,error:null}))
        :currentId
        ?cloudClient.from('analyses').update(payload).eq('id',currentId).eq('user_id',cloudUser.id).select().single()
        :cloudClient.from('analyses').insert(payload).select().single();
      const {data,error}=await q;if(error)throw error;
      selectedAnalysisId=data.id;
      if(sharedSaveClient)selectedPropertyId=data.property_id;

      if(!sharedSaveClient)await saveProtectedScenarios(data.id);
      if(typeof refreshCloud==='function')await refreshCloud();
      try{window.UnsavedChangeProtection?.markClean?.();}catch(_e){}
      try{window.NewAnalysisSaveGuidance?.refresh?.();}catch(_e){}
      window.SaveStateFeedback?.saved?.();
      status(cloneMode?'Analysis copy saved.':`Analysis saved as “${name}”.`);
      return data;
    }catch(e){
      console.error(e);window.SaveStateFeedback?.error?.();
      const deniedLegacySave=!sharedSaveClient&&(e?.code==='42501'||/permission denied for table/i.test(String(e?.message||e)));
      status(deniedLegacySave
        ?'Analysis save failed: this page cannot save using its current connection. Your edits are still on this page but are not saved. Copy any changed values before refreshing, then reopen the saved analysis. If saving remains blocked, contact support.'
        :'Analysis save failed: '+String(e?.message||e));
      return null;
    }
  };

  let recordActionBusy=false;
  window.PropertyThesisProtectedCloudSaveBridge={version:VERSION,isSharedSaving:()=>!!sharedSaveClient,
  async restoreVersion(record,versionId){
    if(!sharedSaveClient)throw Error('Shared saving is not enabled.');
    return sharedSaveClient.restoreVersion(record,versionId);
  },
  async saveMarketRentSupport(id,support){
    if(!sharedSaveClient)throw Error('Shared saving is not enabled.');
    const data=await sharedSaveClient.save({id,assumptions:{marketRentSupport:clone(support)}});
    const index=(cloudAnalyses||[]).findIndex(row=>row.id===data.id);
    if(index>=0)cloudAnalyses[index]=data;
    return data;
  },
  async saveReportSettings(id,prefs){
    if(!sharedSaveClient)throw Error('Shared saving is not enabled.');
    const data=await sharedSaveClient.saveReportSettings(id,prefs);
    const index=(cloudAnalyses||[]).findIndex(row=>row.id===data.id);
    if(index>=0)cloudAnalyses[index]=data;
    return data;
  },
  async saveClient(record,patch){
    if(!sharedSaveClient)throw Error('Shared saving is not enabled.');
    return sharedSaveClient.saveClient(record,patch);
  },
  async saveProperty(record,patch,assignment){
    if(!sharedSaveClient)throw Error('Shared saving is not enabled.');
    return sharedSaveClient.saveProperty(record,patch,assignment);
  },
  async mutateRecord(action,record,name){
    if(!sharedSaveClient)throw Error('Shared saving is not enabled.');
    if(recordActionBusy)throw Error('Wait for the current property-file action to finish.');
    recordActionBusy=true;
    try{
      const client=sharedSaveClient.forRecord(record);
      if(action==='rename')return await client.save({id:record.id,name});
      if(action==='duplicate')return await client.create({sourceId:record.id,propertyId:record.property_id,name:name||record.name+' — Copy'});
      if(action==='delete')return await client.remove(record.id);
      throw Error('Unknown property-file action.');
    }finally{recordActionBusy=false;}
  },enableSharedSaving(client){
    throw Error('Production shared saving is not activated in this review build.');
    // Explicit nonproduction opt-in; production remains blocked until coordinated rollout.
    const previewProjects={'https://lmaiqpkogmmsldkziggy.supabase.co':'lmaiqpkogmmsldkziggy'};
    const project=Object.hasOwn(previewProjects,cloudClient?.supabaseUrl)?previewProjects[cloudClient.supabaseUrl]:null;
    if(!project)throw Error('Shared save preview requires the development or staging project.');
    if(sharedSaveClient)throw Error('Shared saving is already enabled.');
    if(!client){
      const factory=window.PropertyThesisSharedSaveFactory;
      if(!factory||!cloudUser?.id)throw Error('Sign in before enabling shared saving.');
      client=factory.createSharedSaveClient((name,args)=>cloudClient.rpc(name,args),{
        pendingStore:factory.createPendingStore(window.localStorage,project,cloudUser.id),getAccountId:()=>cloudUser?.id});
    }
    const original=window.loadSelectedCloud;
    const originalScenarioLoader=window.loadSelectedScenarioCloud;
    let openedAnalysisId=null;
    if(typeof original!=='function'||typeof client?.capture!=='function'||typeof client?.save!=='function')throw Error('Shared save client is not ready.');
    window.loadSelectedCloud=async function(){
      const record=existingAnalysis();
      if(!record)throw Error('Select an analysis to open.');
      const opened=clone(record),account=cloudUser?.id;
      const sameSelection=()=>cloudUser?.id===account&&selectedAnalysisId===opened.id;
      const engine=window.PropertyThesisIncomeEngineBridge;
      if(engine?.requestServer){
        const assumptions={...(typeof defaults==='object'?defaults:{}),...(opened.assumptions||{})};
        const calculated=await engine.requestServer(assumptions,{refresh:false});
        if(!calculated?.years?.length)throw Error(engine.status?.().lastError||'The calculation service did not return a complete analysis.');
      }
      if(!sameSelection())throw Error('The selected analysis or account changed while loading. Reopen the analysis.');
      await original.apply(this,arguments);
      if(!sameSelection())throw Error('The selected analysis or account changed while loading. Reopen the analysis.');
      client.capture(opened);
      openedAnalysisId=opened.id;
      window.ReportBuilderV1?.setSharedPreferences?.(opened.report_meta?.client_report_options||{},sameSelection,async options=>{
        if(!sameSelection())throw Error('The selected analysis or account changed. Reopen the report.');
        const data=await client.save({id:opened.id,reportMeta:{client_report_options:{...opened.report_meta?.client_report_options,...options}}});
        const index=(cloudAnalyses||[]).findIndex(row=>row.id===data.id);
        if(index>=0)cloudAnalyses[index]=data;
        return data;
      });
    };
    const loadButton=document.getElementById('loadCloudAnalysis');
    if(loadButton)loadButton.onclick=window.loadSelectedCloud;
    // The separate scenario-save control must use the same transaction/revision.
    window.saveScenarioSetCloud=()=>window.saveCurrentCloud(false);
    window.loadSelectedScenarioCloud=()=>{
      const scenario=(cloudScenarios||[]).find(row=>row.id===selectedScenarioId&&row.analysis_id===selectedAnalysisId);
      if(!scenario)return status('Select a saved scenario first.');
      if(openedAnalysisId!==selectedAnalysisId)return status('Open this analysis before loading its scenarios.');
      if(['Scenario A','Scenario B','Scenario C'].includes(scenario.name)){
        if(typeof originalScenarioLoader!=='function')return status('Scenario editor is not ready.');
        originalScenarioLoader();
      }else{
        // App scenarios may have any name. Apply their assumptions to the main editor.
        const assumptions=clone(scenario.assumptions||{});
        const embeddedBuy=assumptions.buyState;
        delete assumptions.buyState;delete assumptions.mobile_scenarios;
        state={...state,...assumptions};
        if(embeddedBuy&&typeof embeddedBuy==='object')buyState={...buyState,...embeddedBuy};
        if(typeof renderFields==='function')renderFields();
        if(typeof render==='function')render();
        if(typeof renderScenarios==='function')renderScenarios();
        if(typeof switchTab==='function')switchTab('dashboard');
        status(scenario.name+' loaded into the analysis. Save to keep these changes.');
      }
      window.UnsavedChangeProtection?.markDirty?.();
    };
    const scenarioLoadButton=document.getElementById('loadScenarioSetBtn');
    if(scenarioLoadButton)scenarioLoadButton.onclick=window.loadSelectedScenarioCloud;
    window.deleteAnalysisCloud=async()=>{
      if(!selectedAnalysisId)return status('Open an analysis before deleting it.');
      if(!window.confirm('Delete this saved analysis and its scenarios? Its property unlock will remain available.'))return;
      try{await client.remove(selectedAnalysisId);selectedAnalysisId=null;selectedScenarioId=null;openedAnalysisId=null;cloudScenarios=[];if(typeof renderCloudScenarios==='function')renderCloudScenarios();await refreshCloud();status('Analysis deleted. Property access retained.');}
      catch(e){status('Delete failed: '+String(e?.message||e));}
    };
    window.deleteScenarioCloud=async()=>{
      if(!selectedAnalysisId||!selectedScenarioId)return status('Select a saved scenario first.');
      if(!window.confirm('Delete this saved scenario?'))return;
      try{await client.remove(selectedAnalysisId,selectedScenarioId);selectedScenarioId=null;await refreshCloud();status('Scenario deleted.');}
      catch(e){status('Delete failed: '+String(e?.message||e));}
    };
    window.deletePropertyCloud=()=>status('Property deletion is not available in the shared preview. You can delete an analysis while keeping its property access.');
    for(const [id,handler] of [['deleteCloudAnalysis',window.deleteAnalysisCloud],['deleteScenarioBtn',window.deleteScenarioCloud],['deletePropertyBtn',window.deletePropertyCloud]]){
      const button=document.getElementById(id);if(button)button.onclick=handler;
    }
    window.recoverSharedCreation=async()=>{
      try{const data=await client.resumeCreation();selectedAnalysisId=data.id;selectedPropertyId=data.property_id;await refreshCloud();status('Creation recovered. Open the saved analysis to continue.');return data;}
      catch(e){status('Recovery failed: '+String(e?.message||e));return null;}
    };
    const saveButton=document.getElementById('cloudSaveCurrent');
    if(saveButton&&!document.getElementById('recoverSharedCreation')){
      const recover=document.createElement('button');recover.id='recoverSharedCreation';recover.type='button';recover.className='btn ghost';recover.textContent='Recover unfinished creation';recover.onclick=window.recoverSharedCreation;saveButton.after(recover);
    }
    sharedSaveClient=client;
  }};
})();

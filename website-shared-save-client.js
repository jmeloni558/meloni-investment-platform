(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.PropertyThesisSharedSaveFactory=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 function createPendingStore(storage,project,userId){
  if(!/^[a-z0-9]{20}$/.test(project)||!userId)throw Error('A signed-in account is required for recovery storage.');
  const key='pt-shared-create-v1:'+project+':'+userId;
  return {get(){const raw=storage.getItem(key);return raw?JSON.parse(raw):null;},set(value){storage.setItem(key,JSON.stringify(value));},clear(){storage.removeItem(key);}};
 }
 function createSharedSaveClient(rpc,options={}){
  let opened=null,busy=false,pendingCreate=null;
  const identity=options.getAccountId?.();
  const guard=()=>{if(options.getAccountId&&(!identity||identity!==options.getAccountId()))throw Error('Your account changed. Reload before continuing.');};
  const persist=()=>{if(pendingCreate)options.pendingStore?.set(pendingCreate);else options.pendingStore?.clear();};
  function restore(){guard();if(!pendingCreate)pendingCreate=options.pendingStore?.get()||null;if(pendingCreate&&(!/^[0-9a-f-]{36}$/i.test(pendingCreate.id||'')||!pendingCreate.body||pendingCreate.fingerprint!==JSON.stringify(pendingCreate.body)))throw Error('Creation recovery data is invalid. Contact support before creating another copy.');}
  async function submitCreate(){
   persist();
   const {data,error}=await rpc('website_shared_create',{...pendingCreate.body,p_request_id:pendingCreate.id});
   guard();
   if(error){if(/^[0-9A-Z]{5}$/.test(error.code||'')){pendingCreate=null;persist();}throw error;}
   if(!data?.id||!Number.isInteger(data.revision)||data.revision<1)throw Error('Could not confirm creation. Retry with the same inputs.');
   opened=clone(data);pendingCreate=null;persist();return data;
  }
  return {
   forRecord(record){guard();const child=createSharedSaveClient(rpc,options);child.capture(record);return child;},
   async restoreVersion(record,versionId){
    guard();if(busy)throw Error('A save is already in progress.');
    if(!record?.id||!Number.isInteger(record.revision))throw Error('Reopen history before restoring.');
    busy=true;try{const {data,error}=await rpc('website_shared_restore',{p_id:record.id,p_revision:record.revision,p_version_id:versionId});guard();if(error)throw Error(error.message||'Restore failed');if(data?.id!==record.id||data.revision!==record.revision+1)throw Error('Could not confirm restoration. Reopen history.');return data;}finally{busy=false;}
   },
   async saveReportSettings(id,prefs){
    guard();if(!opened||opened.id!==id)throw Error('Reopen this analysis before saving report settings.');
    return this.save({id,reportMeta:{stage5:{...(opened.report_meta?.stage5||{}),...clone(prefs)},report_updated_at:new Date().toISOString()}});
   },
   async saveClient(record,patch){
    guard();if(busy)throw Error('A save is already in progress.');
    if(!record?.id||!Number.isInteger(record.revision))throw Error('Reopen the client before saving.');
    busy=true;try{const {data,error}=await rpc('website_shared_client_save',{p_id:record.id,p_revision:record.revision,p_patch:patch});guard();if(error)throw Error(error.message||'Client save failed.');if(data?.id!==record.id||data.revision!==record.revision+1)throw Error('Could not confirm client save. Reopen it before retrying.');return data;}finally{busy=false;}
   },
   async saveProperty(record,patch,assignment){
    guard();if(busy)throw Error('A save is already in progress.');
    if(!record?.id||!Number.isInteger(record.revision))throw Error('Reopen the property before saving.');
    busy=true;try{
     const {data,error}=await rpc('website_shared_property_save',{p_id:record.id,p_revision:record.revision,p_patch:patch||{},p_assign:!!assignment,p_client_id:assignment?.id||null,p_client_revision:assignment?.revision??null,p_client_patch:assignment?.patch??null});
     guard();if(error)throw Error(error.message||'Property save failed.');
     if(data?.property?.id!==record.id||data.property.revision!==record.revision+1)throw Error('Could not confirm the property save. Reopen it before retrying.');
     return data;
    }finally{busy=false;}
   },
   capture(record){guard();if(busy)throw Error('Wait for the current save to finish.');if(!record?.id||!Number.isInteger(record.revision))throw Error('Reopen this analysis before saving.');opened=clone(record);},
   clear(){if(busy)throw Error('Wait for the current save to finish.');opened=null;},
   hasPendingCreation(){restore();return !!pendingCreate;},
   async resumeCreation(){if(busy)throw Error('A save is already in progress.');restore();if(!pendingCreate)throw Error('No unfinished creation to recover.');busy=true;try{return await submitCreate();}finally{busy=false;}},
   async create(payload){
    restore();
    if(busy)throw Error('A save is already in progress.');
    if(payload.sourceId&&(!opened||opened.id!==payload.sourceId))throw Error('Reopen the source analysis before copying.');
    const body={p_property_id:payload.propertyId||null,p_source_id:payload.sourceId||null,p_source_revision:payload.sourceId?opened.revision:null,
     p_name:payload.name,p_assumptions:payload.assumptions||{},p_outputs:payload.outputs||{},p_report_meta:payload.reportMeta||{},p_scenarios:(payload.scenarios||[]).map(({id,...scenario})=>scenario)};
    const fingerprint=JSON.stringify(body);
    if(pendingCreate&&pendingCreate.fingerprint!==fingerprint)throw Error('The previous creation could not be confirmed. Retry it without changing the inputs first.');
    pendingCreate??={fingerprint,body:clone(body),id:crypto.randomUUID()};
    busy=true;
    try{
     return await submitCreate();
    }finally{busy=false;}
   },
   async remove(id,scenarioId=null){
    guard();if(busy)throw Error('A save is already in progress.');if(!opened||opened.id!==id)throw Error('Reopen this analysis before deleting.');
    busy=true;try{const {data,error}=await rpc('website_shared_delete',{p_id:id,p_revision:opened.revision,p_scenario_id:scenarioId});
     guard();
     if(error)throw error;
     if(scenarioId){if(data?.id!==id||data.revision!==opened.revision+1)throw Error('Could not confirm deletion. Reopen the analysis.');opened=clone(data);}
     else{if(data?.deleted!==true)throw Error('Could not confirm deletion. Refresh your saved analyses.');opened=null;}
     return data;
    }finally{busy=false;}
   },
   async save(payload){
    guard();
    if(busy)throw Error('A save is already in progress.');
    if(!opened||payload.id!==opened.id)throw Error('Reopen this analysis before saving.');
    busy=true;
    try{
     const patch={};
     for(const [key,value] of Object.entries(payload.assumptions||{})){
      if(key==='mobile_scenarios'||value===undefined)continue;
      if(JSON.stringify(value)!==JSON.stringify(opened.assumptions?.[key]))patch[key]=clone(value);
     }
     const {data,error}=await rpc('website_shared_save',{p_id:opened.id,p_revision:opened.revision,p_patch:patch,
      p_outputs:payload.outputs||{},p_report_meta:payload.reportMeta||{},p_name:payload.name||opened.name,p_scenarios:payload.scenarios||[]});
     guard();
     if(error){if(error.code==='P0001')throw Error('This analysis changed on another device. Your inputs are still here. Reopen the saved analysis before saving again.');throw error;}
     if(!data?.id||data.id!==opened.id||data.revision!==opened.revision+1)throw Error('Could not confirm this save. Reopen the saved analysis before retrying.');
     opened=clone(data);return data;
    }finally{busy=false;}
   }
  };
 }
 return {createSharedSaveClient,createPendingStore};
});

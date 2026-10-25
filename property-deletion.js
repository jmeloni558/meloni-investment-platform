'use strict';
(()=>{
 const pending=new Set();
 async function remove(id){
  if(!cloudUser){showAuth();return false;}
  const uid=cloudUser.id,p=(cloudProperties||[]).find(x=>x.id===id);
  if(!p||pending.has(id))return false;
  if(!confirm(`Permanently delete ${p.name||p.address||'this property'}? Its saved analyses, scenarios and income comps will also be deleted. Saved letters remain, but their property link is removed. This cannot be undone. Use Archive if you want to keep the records.`))return false;
  pending.add(id);
  try{
   setStatus('Deleting property…');
   const {data,error}=await cloudClient.rpc('website_shared_property_delete',{p_id:id,p_revision:p.revision});
   if(error)throw error;
   if(!data?.deleted||data.id!==id)throw Error('The server did not confirm deletion. Refresh and try again.');
   if(cloudUser?.id!==uid)return false;
   cloudProperties=cloudProperties.filter(x=>x.id!==id);cloudAnalyses=(cloudAnalyses||[]).filter(x=>x.property_id!==id);
   if(selectedPropertyId===id){selectedPropertyId=null;selectedAnalysisId=null;selectedScenarioId=null;cloudScenarios=[];}
   await refreshCloud();
   if(typeof switchTab==='function')switchTab('propertyhub');
   window.Stage6Dashboard?.render?.();setStatus('Property permanently deleted');return true;
  }catch(e){if(cloudUser?.id===uid){const message='Property could not be deleted: '+(e.message||e);setStatus(message);alert(message);}return false;}
  finally{pending.delete(id);}
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-hub-delete],#pfDelete,#deletePropertyBtn');
  if(!b||!window.PropertyThesisProtectedCloudSaveBridge?.isSharedSaving?.())return;
  e.preventDefault();e.stopImmediatePropagation();
  const id=b.dataset.hubDelete||selectedPropertyId;
  if(id)void remove(id);else alert('Open a saved property before deleting it.');
 },true);
 window.PropertyThesisPropertyDeletion={remove};
})();

'use strict';
(()=>{
  const VERSION=6;
  if((window.__reportProtectedEngineGateVersion||0)>=VERSION)return;
  window.__reportProtectedEngineGateVersion=VERSION;

  let lastReadyAt=null,lastError='';

  async function ensureProtected(){
    try{
      const base=window.PropertyThesisIncomeEngineBridge;
      const secondary=window.PropertyThesisSecondaryEngine;
      if(!base?.requestServer)throw new Error('Protected base engine is unavailable.');
      if(!secondary?.request)throw new Error('Protected secondary engine is unavailable.');
      const snapshot=typeof state==='object'&&state?{...state}:{};
      const [baseResult,secondaryResult]=await Promise.all([
        base.requestServer(snapshot,{refresh:false}),
        secondary.request({refresh:false})
      ]);
      if(!baseResult?.years?.length)throw new Error('Protected base engine did not return a complete result.');
      if(!secondaryResult?.offer||!secondaryResult?.sensitivity||!Array.isArray(secondaryResult?.scenarios))throw new Error('Protected secondary engine did not return a complete result.');
      lastReadyAt=new Date();lastError='';
      return {base:baseResult,secondary:secondaryResult};
    }catch(e){lastError=String(e?.message||e);throw e;}
  }

  // Verification API only. PDF generation remains on the established single
  // UserBrandedPdf click path to avoid duplicate handlers or report re-renders.
  window.PropertyThesisReportEngineGate={
    version:VERSION,
    ensureProtected,
    status:()=>({lastReadyAt,lastError})
  };
})();

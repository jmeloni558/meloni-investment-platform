'use strict';
(()=>{
  const VERSION=1;
  if((window.__marketRentCloudPersistenceVersion||0)>=VERSION)return;
  window.__marketRentCloudPersistenceVersion=VERSION;

  let timer=null,lastSignature='';

  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_e){return v;}}
  function support(){try{return (typeof state!=='undefined'&&state)?state.marketRentSupport:null;}catch(_e){return null;}}
  function hasSupport(s){return !!(s&&(Array.isArray(s.comparables)&&s.comparables.length||Number.isFinite(Number(s.estimate))||Number.isFinite(Number(s.concludedRent))||s.analystNote));}

  function restore(){
    try{
      if(typeof selectedAnalysisId==='undefined'||!selectedAnalysisId)return null;
      if(typeof cloudAnalyses==='undefined'||!Array.isArray(cloudAnalyses))return null;
      const row=cloudAnalyses.find(x=>x?.id===selectedAnalysisId);
      const saved=row?.assumptions?.marketRentSupport;
      if(hasSupport(saved)&&typeof state!=='undefined'&&state&&!hasSupport(state.marketRentSupport))state.marketRentSupport=clone(saved);
      return state?.marketRentSupport||null;
    }catch(_e){return null;}
  }

  async function persistNow(){
    try{
      if(typeof selectedAnalysisId==='undefined'||!selectedAnalysisId)return false;
      if(typeof cloudClient==='undefined'||!cloudClient)return false;
      if(typeof cloudUser==='undefined'||!cloudUser)return false;
      const s=support();if(!hasSupport(s))return false;
      const signature=JSON.stringify(s);if(signature===lastSignature)return true;
      let row=null;
      if(typeof cloudAnalyses!=='undefined'&&Array.isArray(cloudAnalyses))row=cloudAnalyses.find(x=>x?.id===selectedAnalysisId)||null;
      if(!row){const q=await cloudClient.from('analyses').select('id,assumptions').eq('id',selectedAnalysisId).single();if(q.error)throw q.error;row=q.data;}
      const assumptions={...(row?.assumptions||{}),marketRentSupport:clone(s)};
      const updatedAt=new Date().toISOString();
      const {error}=await cloudClient.from('analyses').update({assumptions,updated_at:updatedAt}).eq('id',selectedAnalysisId);
      if(error)throw error;
      if(typeof cloudAnalyses!=='undefined'&&Array.isArray(cloudAnalyses)){
        const i=cloudAnalyses.findIndex(x=>x?.id===selectedAnalysisId);
        if(i>=0)cloudAnalyses[i]={...cloudAnalyses[i],assumptions,updated_at:updatedAt};
      }
      lastSignature=signature;
      return true;
    }catch(e){try{if(typeof setStatus==='function')setStatus('Market rent support save failed: '+(e?.message||e));}catch(_e){}return false;}
  }

  function schedule(ms=500){clearTimeout(timer);timer=setTimeout(persistNow,ms);}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-ptr-open]'))restore();
    if(e.target?.closest?.('[data-ptr-run]')){
      const before=support()?.researchedAt||'';let tries=0;
      const check=()=>{tries++;const now=support()?.researchedAt||'';if(now&&now!==before){schedule(0);return;}if(tries<40)setTimeout(check,250);};
      setTimeout(check,250);
    }
    if(e.target?.closest?.('[data-ptr-save-support],[data-ptr-use]'))schedule(50);
  },true);

  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-ptr-comp-toggle]'))schedule(250);},true);
  document.addEventListener('input',e=>{if(e.target?.matches?.('[data-ptr-conclusion],[data-ptr-note]'))schedule(700);},true);

  window.MarketRentCloudPersistence={persist:persistNow,restore};
})();

'use strict';
(()=>{
  const VERSION=3;
  if((window.__incomeServerEngineBridgeVersion||0)>=VERSION)return;
  window.__incomeServerEngineBridgeVersion=VERSION;

  const browserRender=window.render;
  if(typeof browserRender!=='function')return;

  const KEYS=['price','land','units','rent','rentGrowth','vacancy','opEx','depLife','appreciation','hold','sellCost','mortgage','interestOnly','mortRate','loanYears','points','origFee','ordinaryTax','depTax','capGainsTax','requiredReturn','desiredCap','desiredGrm','initialRepairs'];
  const cache=new Map(),pending=new Map(),failedAt=new Map();
  let lastSource='protected-required',lastServerAt=null,lastError='';

  function normalizedState(s){const out={};for(const k of KEYS){let v=s?.[k];if(k==='interestOnly')v=!!v;else if(v!==undefined&&v!==null&&v!==''){const num=Number(v);v=Number.isFinite(num)?num:v;}out[k]=v;}return out;}
  function signature(s){return JSON.stringify(normalizedState(s));}
  function clone(v){try{return structuredClone(v);}catch(_e){return JSON.parse(JSON.stringify(v));}}

  function ensureBadge(){let badge=document.getElementById('ptEngineSourceStatus');if(badge)return badge;const host=document.querySelector('.topactions');if(!host)return null;badge=document.createElement('span');badge.id='ptEngineSourceStatus';badge.className='pill';badge.style.fontSize='10px';badge.style.fontWeight='800';badge.style.letterSpacing='.01em';const save=document.getElementById('saveStatus');if(save)host.insertBefore(badge,save);else host.appendChild(badge);return badge;}
  function paintStatus(mode,message=''){
    lastSource=mode;const b=ensureBadge();if(!b)return;
    if(mode==='server'){b.textContent='Protected Engine';b.title='Base Income Approach calculations are supplied by the authenticated PropertyThesis server engine.';b.style.background='#ecfdf3';b.style.borderColor='#a6f4c5';b.style.color='#067647';}
    else if(mode==='checking'){b.textContent='Protected Engine…';b.title='Requesting the current analysis from the protected PropertyThesis server engine.';b.style.background='#eff8ff';b.style.borderColor='#b2ddff';b.style.color='#175cd3';}
    else{b.textContent='Engine Unavailable';b.title=message||'Protected calculations are required. No browser calculation fallback is installed.';b.style.background='#fef3f2';b.style.borderColor='#fecdca';b.style.color='#b42318';}
  }
  function showUnavailable(message){lastError=message||lastError||'Protected calculation engine unavailable';paintStatus('unavailable',lastError);try{if(typeof setStatus==='function')setStatus(lastError);}catch(_e){}}

  async function currentSession(){if(typeof cloudClient==='undefined'||!cloudClient?.auth)return null;try{const {data,error}=await cloudClient.auth.getSession();if(error)throw error;return data?.session||null;}catch(e){lastError=String(e?.message||e);return null;}}
  async function callServer(s){if(typeof cloudClient==='undefined'||!cloudClient)throw new Error('Supabase client unavailable');const session=await currentSession();if(!session?.access_token)throw new Error('Sign-in session is required for protected calculations');const invoke=cloudClient.functions.invoke('propertythesis-income-engine',{body:{action:'analyze',state:s},headers:{Authorization:`Bearer ${session.access_token}`}});const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('Protected calculation engine timed out')),8000));const {data,error}=await Promise.race([invoke,timeout]);if(error)throw error;if(data?.error)throw new Error(data.error+(data?.details?' — '+data.details:''));if(!data?.result?.years?.length)throw new Error('Protected engine returned an incomplete result');return data.result;}

  async function requestServer(s,{refresh=true}={}){
    const snapshot={...s},sig=signature(snapshot);
    if(cache.has(sig)){paintStatus('server');return cache.get(sig);}
    if(pending.has(sig))return pending.get(sig);
    if(Date.now()-(failedAt.get(sig)||0)<3000)return null;
    const session=await currentSession();if(!session?.access_token){showUnavailable('Sign in to use PropertyThesis protected calculations.');return null;}
    paintStatus('checking');
    const job=(async()=>{try{const server=await callServer(snapshot);cache.set(sig,server);failedAt.delete(sig);lastServerAt=new Date();lastError='';paintStatus('server');if(refresh&&signature(typeof state==='object'?state:{})===sig)browserRender();return server;}catch(e){failedAt.set(sig,Date.now());showUnavailable(String(e?.message||e));return null;}finally{pending.delete(sig);}})();
    pending.set(sig,job);return job;
  }

  const protectedAnalyze=function(s){const hit=cache.get(signature(s));if(hit){lastSource='server';return clone(hit);}throw new Error('Protected calculation result is not loaded for this assumption set');};
  protectedAnalyze.__propertyThesisServerBridge=true;window.analyze=protectedAnalyze;

  const protectedRender=function(){const snapshot={...(typeof state==='object'?state:{})},sig=signature(snapshot);if(cache.has(sig)){paintStatus('server');return browserRender.apply(this,arguments);}requestServer(snapshot,{refresh:true});return null;};
  protectedRender.__propertyThesisServerBridge=true;protectedRender.__browserRender=browserRender;window.render=protectedRender;

  function refreshCurrent(){if(typeof state!=='object'||!state)return Promise.resolve(null);return requestServer({...state},{refresh:true});}
  window.PropertyThesisIncomeEngineBridge={version:VERSION,refreshCurrent,requestServer,signature,browserRender,clearCache:()=>cache.clear(),current:()=>cache.get(signature(typeof state==='object'?state:{}))||null,status:()=>({source:lastSource,lastServerAt,lastError,cachedStates:cache.size,pending:pending.size})};

  async function boot(){ensureBadge();const session=await currentSession();if(session?.access_token)refreshCurrent();else showUnavailable('Sign in to use PropertyThesis protected calculations.');try{cloudClient?.auth?.onAuthStateChange?.((_event,newSession)=>{if(newSession?.access_token){failedAt.clear();setTimeout(refreshCurrent,0);}else showUnavailable('Sign in to use PropertyThesis protected calculations.');});}catch(_e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
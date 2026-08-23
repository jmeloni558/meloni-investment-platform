'use strict';
(()=>{
  const VERSION=2;
  if((window.__serverEngineParityVersion||0)>=VERSION)return;
  window.__serverEngineParityVersion=VERSION;

  const METRICS=[
    ['cap','Cap Rate','rate',r=>r.cap],['grm','GRM','ratio',r=>r.grm],['irr','IRR','rate',r=>r.IRR],['npv','NPV','money',r=>r.NPV],
    ['noi','Year 1 NOI','money',r=>r.years?.[0]?.noi],['atcf','Year 1 After-Tax Cash Flow','money',r=>r.years?.[0]?.atcf],['dscr','Year 1 DSCR','ratio',r=>r.years?.[0]?.dcr],
    ['saleTax','Taxes Due on Sale','money',r=>r.saleTax],['ater','After-Tax Equity Reversion','money',r=>r.ater]
  ];
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:NaN};
  const tol=k=>k==='money'?.01:.000001;
  const same=(a,b,k)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol(k);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const fmt=(v,k)=>!Number.isFinite(v)?'Missing':k==='money'?(typeof fmtC==='function'?fmtC(v):v.toFixed(2)):k==='rate'?(typeof fmtP==='function'?fmtP(v):(v*100).toFixed(4)+'%'):v.toFixed(6);

  function ensureStyles(){if(document.getElementById('serverEngineParityStyles'))return;const s=document.createElement('style');s.id='serverEngineParityStyles';s.textContent=`#serverEngineParityPanel{margin:0 0 14px}#serverEngineParityPanel .sep-box{border:1px solid #d0d5dd;border-radius:10px;background:#fff;padding:13px 15px;font-size:12px;color:#475467}#serverEngineParityPanel .sep-box.pass{border-color:#9fd8bb;background:#f2fbf6;color:#205f3c}#serverEngineParityPanel .sep-box.fail{border-color:#efb3b3;background:#fff6f6;color:#842929}#serverEngineParityPanel .sep-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.sep-title{font-weight:850;font-size:13px}.sep-sub{margin-top:3px;font-size:10.5px;line-height:1.45;opacity:.88}#serverEngineParityPanel table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff}#serverEngineParityPanel th,#serverEngineParityPanel td{text-align:left;padding:6px 7px;border-bottom:1px solid #eaecf0;font-size:10px}#serverEngineParityPanel th{background:#f9fafb;color:#475467}#qaServerEngine{white-space:nowrap}`;document.head.appendChild(s);}
  function ensureUi(){const hub=document.getElementById('propertyhub'),toolbar=hub?.querySelector('.hub-toolbar'),cards=document.getElementById('hubCards');if(!hub||!toolbar||!cards)return false;ensureStyles();if(!document.getElementById('qaServerEngine')){const b=document.createElement('button');b.id='qaServerEngine';b.type='button';b.className='btn ghost';b.textContent='Check Server Engine';b.onclick=run;toolbar.appendChild(b);}if(!document.getElementById('serverEngineParityPanel')){const p=document.createElement('div');p.id='serverEngineParityPanel';p.className='span-12';const qa=document.getElementById('qaRegressionPanel');if(qa)qa.insertAdjacentElement('afterend',p);else cards.parentNode.insertBefore(p,cards);}return true;}

  function testState(){
    const base=typeof defaults==='object'&&defaults?{...defaults}:{};
    let saved=null;
    try{if(typeof selectedAnalysisId!=='undefined'&&selectedAnalysisId&&Array.isArray(cloudAnalyses))saved=cloudAnalyses.find(x=>x.id===selectedAnalysisId)||null;}catch(_e){}
    if(!saved){try{if(Array.isArray(cloudAnalyses)&&cloudAnalyses.length===1)saved=cloudAnalyses[0];}catch(_e){}}
    const current=typeof state==='object'&&state?state:{};
    const assumptions=saved?.assumptions&&typeof saved.assumptions==='object'?saved.assumptions:{};
    const s={...base,...current,...assumptions};
    delete s.buyState;
    if(!Number.isFinite(Number(s.hold))||Number(s.hold)<1)s.hold=Number(base.hold)||7;
    if(!Number.isFinite(Number(s.loanYears))||Number(s.loanYears)<1)s.loanYears=Number(base.loanYears)||30;
    if(!Number.isFinite(Number(s.units))||Number(s.units)<1)s.units=Number(base.units)||1;
    return {state:s,label:saved?.name||s.address||s.name||'current analysis'};
  }

  async function callServer(s){if(typeof cloudClient==='undefined'||!cloudClient)throw new Error('Supabase client is unavailable.');if(typeof cloudUser==='undefined'||!cloudUser)throw new Error('Sign in before running the protected engine check.');const {data,error}=await cloudClient.functions.invoke('propertythesis-income-engine',{body:{action:'analyze',state:s}});if(error)throw error;if(data?.error)throw new Error(data.error+(data?.details?' — '+data.details:''));if(!data?.result)throw new Error('Server engine returned no result.');return data.result;}

  async function run(){if(!ensureUi())return;const host=document.getElementById('serverEngineParityPanel'),btn=document.getElementById('qaServerEngine');if(btn){btn.disabled=true;btn.textContent='Checking…';}host.innerHTML='<div class="sep-box"><div class="sep-title">Protected Server Engine</div><div class="sep-sub">Comparing a complete saved-analysis state with the authenticated Supabase calculation engine…</div></div>';
    try{
      if(typeof analyze!=='function')throw new Error('Current browser engine is unavailable.');
      const test=testState(),s=test.state,local=analyze(s);
      if(!local?.years?.length)throw new Error('The browser comparison state did not produce a Year 1 result. Open a saved analysis and run the check again.');
      const server=await callServer(s);if(!server?.years?.length)throw new Error('The server comparison state did not produce a Year 1 result.');
      const rows=[];let mismatches=0;
      for(const [,label,kind,get] of METRICS){const a=num(get(local)),b=num(get(server)),ok=same(a,b,kind);if(!ok)mismatches++;rows.push(`<tr><td>${esc(label)}</td><td>${esc(fmt(a,kind))}</td><td>${esc(fmt(b,kind))}</td><td>${ok?'Match':'Mismatch'}</td></tr>`);}
      const ok=mismatches===0;
      host.innerHTML=`<div class="sep-box ${ok?'pass':'fail'}"><div class="sep-head"><div><div class="sep-title">${ok?'✓ Protected Server Engine PASS':'⚠ Protected Server Engine MISMATCH'}</div><div class="sep-sub">${esc(test.label)} — ${ok?'all 9 core outputs match the current production browser engine.':`${mismatches} output(s) differ. Production calculations have not been switched.`}</div></div><button type="button" class="btn ghost" id="qaServerAgain">Run Again</button></div><table><thead><tr><th>Metric</th><th>Browser</th><th>Server</th><th>Status</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
      document.getElementById('qaServerAgain')?.addEventListener('click',run);return {ok,local,server};
    }catch(e){host.innerHTML=`<div class="sep-box fail"><div class="sep-title">Protected Server Engine Check Failed</div><div class="sep-sub">${esc(e?.message||e)} Production calculations remain unchanged.</div></div>`;}finally{if(btn){btn.disabled=false;btn.textContent='Check Server Engine';}}
  }
  function start(){let tries=0;const t=setInterval(()=>{if(ensureUi()||++tries>60)clearInterval(t)},125);document.addEventListener('click',e=>{if(e.target?.closest?.('.tab[data-tab="propertyhub"]'))setTimeout(ensureUi,180)},false);}
  window.PropertyThesisServerEngineParity={run,testState};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

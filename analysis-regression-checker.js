'use strict';
(()=>{
  const VERSION=3;
  if((window.__analysisRegressionCheckerVersion||0)>=VERSION)return;
  window.__analysisRegressionCheckerVersion=VERSION;

  const METRICS=[
    {key:'cap',label:'Cap Rate',kind:'rate',saved:a=>a.outputs?.cap,fresh:r=>r.cap},
    {key:'grm',label:'GRM',kind:'ratio',saved:a=>a.outputs?.grm,fresh:r=>r.grm},
    {key:'irr',label:'IRR',kind:'rate',saved:a=>a.outputs?.irr,fresh:r=>r.IRR},
    {key:'npv',label:'NPV',kind:'money',saved:a=>a.outputs?.npv,fresh:r=>r.NPV},
    {key:'year1_noi',label:'Year 1 NOI',kind:'money',saved:a=>a.outputs?.year1_noi,fresh:r=>r.years?.[0]?.noi},
    {key:'year1_atcf',label:'Year 1 After-Tax Cash Flow',kind:'money',saved:a=>a.outputs?.year1_atcf,fresh:r=>r.years?.[0]?.atcf},
    {key:'year1_dscr',label:'Year 1 DSCR',kind:'ratio',saved:a=>a.outputs?.year1_dscr,fresh:r=>r.years?.[0]?.dcr},
    {key:'taxes_due_sale',label:'Taxes Due on Sale',kind:'money',saved:a=>a.outputs?.taxes_due_sale,fresh:r=>r.saleTax},
    {key:'after_tax_reversion',label:'After-Tax Equity Reversion',kind:'money',saved:a=>a.outputs?.after_tax_reversion,fresh:r=>r.ater}
  ];

  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:NaN};
  const tol=kind=>kind==='money'?0.01:0.000001;
  const same=(a,b,kind)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol(kind);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  function fmt(v,kind){
    if(!Number.isFinite(v))return 'Missing';
    if(kind==='money')return typeof fmtC==='function'?fmtC(v):v.toLocaleString('en-US',{style:'currency',currency:'USD'});
    if(kind==='rate')return typeof fmtP==='function'?fmtP(v):(v*100).toFixed(2)+'%';
    return v.toFixed(2)+'x';
  }
  function propertyName(a){
    const p=(typeof cloudProperties!=='undefined'?cloudProperties:[]).find(x=>x.id===a.property_id);
    return p?.name||p?.address||a.name||'Saved analysis';
  }
  function freshResult(a){
    const assumptions={...(a.assumptions||{})};
    delete assumptions.buyState;
    const base=typeof defaults!=='undefined'?defaults:{};
    return analyze({...base,...assumptions});
  }
  function checkOne(a){
    const out={analysis:a,property:propertyName(a),mismatches:[],missing:[],checked:0,pass:false,error:null};
    try{
      if(typeof analyze!=='function')throw new Error('Calculation engine is unavailable.');
      const fresh=freshResult(a);
      for(const m of METRICS){
        const saved=num(m.saved(a)),current=num(m.fresh(fresh));
        if(!Number.isFinite(saved)||!Number.isFinite(current)){
          out.missing.push({metric:m,saved,current});
          continue;
        }
        out.checked++;
        if(!same(saved,current,m.kind))out.mismatches.push({metric:m,saved,current,diff:current-saved});
      }
      out.pass=out.checked>0&&out.mismatches.length===0&&out.missing.length===0;
    }catch(e){out.error=e?.message||String(e);}
    return out;
  }
  function run(){
    const analyses=(typeof cloudAnalyses!=='undefined'?cloudAnalyses:[])||[];
    const results=analyses.map(checkOne);
    return {
      results,
      total:results.length,
      passed:results.filter(x=>x.pass).length,
      failed:results.filter(x=>!x.pass).length,
      mismatches:results.reduce((n,x)=>n+x.mismatches.length,0),
      missing:results.reduce((n,x)=>n+x.missing.length,0),
      timestamp:new Date()
    };
  }
  function ensureStyles(){
    if(document.getElementById('analysisRegressionCheckerStyles'))return;
    const s=document.createElement('style');s.id='analysisRegressionCheckerStyles';s.textContent=`
      #qaRegressionPanel{margin:0 0 14px}#qaRegressionPanel .qa-box{border:1px solid #d0d5dd;border-radius:10px;background:#fff;padding:13px 15px;font-size:12px;color:#475467}
      #qaRegressionPanel .qa-box.pass{border-color:#a6d8bd;background:#f4fbf7;color:#24613d}#qaRegressionPanel .qa-box.fail{border-color:#efb3b3;background:#fff6f6;color:#842929}
      #qaRegressionPanel .qa-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.qa-title{font-weight:800;font-size:13px}.qa-sub{margin-top:3px;font-size:11px;opacity:.85}
      #qaRegressionPanel details{margin-top:10px}#qaRegressionPanel table{width:100%;border-collapse:collapse;margin-top:8px;background:#fff}#qaRegressionPanel th,#qaRegressionPanel td{text-align:left;padding:6px 7px;border-bottom:1px solid #eaecf0;font-size:10px}#qaRegressionPanel th{font-weight:800;color:#475467;background:#f9fafb}
      #qaRunRegression{white-space:nowrap}
    `;document.head.appendChild(s);
  }
  function ensureUi(){
    const hub=document.getElementById('propertyhub');
    const toolbar=hub?.querySelector('.hub-toolbar');
    const cards=document.getElementById('hubCards');
    if(!hub||!toolbar||!cards)return false;
    ensureStyles();
    if(!document.getElementById('qaRunRegression')){
      const b=document.createElement('button');b.id='qaRunRegression';b.type='button';b.className='btn ghost';b.textContent='Run QA Check';b.onclick=()=>render(run());
      toolbar.appendChild(b);
    }
    if(!document.getElementById('qaRegressionPanel')){
      const p=document.createElement('div');p.id='qaRegressionPanel';p.className='span-12';cards.parentNode.insertBefore(p,cards);
    }
    return true;
  }
  function render(report){
    if(!ensureUi())return report;
    const host=document.getElementById('qaRegressionPanel');
    if(!report.total){host.innerHTML='<div class="qa-box"><div class="qa-title">Calculation QA</div><div class="qa-sub">No saved analyses are available to test.</div></div>';return report;}
    const ok=report.failed===0;
    let detail='';
    if(!ok){
      const rows=[];
      for(const r of report.results){
        if(r.error)rows.push(`<tr><td>${esc(r.property)}</td><td>Engine error</td><td colspan="2">${esc(r.error)}</td></tr>`);
        for(const x of r.mismatches)rows.push(`<tr><td>${esc(r.property)}</td><td>${esc(x.metric.label)}</td><td>${esc(fmt(x.saved,x.metric.kind))}</td><td>${esc(fmt(x.current,x.metric.kind))}</td></tr>`);
        for(const x of r.missing)rows.push(`<tr><td>${esc(r.property)}</td><td>${esc(x.metric.label)}</td><td>${esc(fmt(x.saved,x.metric.kind))}</td><td>${esc(fmt(x.current,x.metric.kind))}</td></tr>`);
      }
      detail=`<details open><summary>Show ${report.mismatches+report.missing+(report.results.filter(x=>x.error).length)} issue(s)</summary><table><thead><tr><th>Property</th><th>Metric</th><th>Saved</th><th>Recalculated</th></tr></thead><tbody>${rows.join('')}</tbody></table></details>`;
    }
    host.innerHTML=`<div class="qa-box ${ok?'pass':'fail'}"><div class="qa-head"><div><div class="qa-title">${ok?'✓ Calculation QA PASS':'⚠ Calculation QA FAILED'}</div><div class="qa-sub">${report.passed} of ${report.total} saved analyses match a fresh recalculation${ok?' with no output drift':`; ${report.mismatches} mismatch(es), ${report.missing} missing value(s)`}. Checked ${report.timestamp.toLocaleTimeString()}.</div></div><button class="btn ghost" type="button" id="qaRunAgain">Run Again</button></div>${detail}</div>`;
    document.getElementById('qaRunAgain')?.addEventListener('click',()=>render(run()));
    return report;
  }
  function autoRun(){
    if(!ensureUi())return false;
    try{render(run());}catch(e){console.error('Calculation QA failed',e);}
    return true;
  }
  function start(){
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('.tab[data-tab="propertyhub"]'))setTimeout(autoRun,220);
    },false);
    let tries=0;
    const timer=setInterval(()=>{
      if(document.getElementById('propertyhub')){ensureUi();clearInterval(timer);}
      else if(++tries>50)clearInterval(timer);
    },125);
  }

  window.PropertyThesisRegressionChecker={run,checkOne,render,autoRun,metrics:METRICS};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

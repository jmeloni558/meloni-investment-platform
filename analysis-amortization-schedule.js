'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptAnalysisAmortizationScheduleV||0)>=VERSION)return;
  window.__ptAnalysisAmortizationScheduleV=VERSION;

  const money=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const ratio=v=>Number.isFinite(Number(v))?Number(v).toFixed(2)+'x':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  function financed(){try{return Number(state?.mortgage)>0&&Array.isArray(result?.amort)&&result.amort.length>0;}catch(_e){return false;}}
  function analysisLabel(){try{return state?.address||state?.name||'Current Analysis';}catch(_e){return 'Current Analysis';}}

  function styles(){
    if(document.getElementById('ptAmortScheduleStyles'))return;
    const s=document.createElement('style');s.id='ptAmortScheduleStyles';s.textContent=`
      .pt-amort-action{white-space:nowrap}
      #ptAmortScheduleModal{position:fixed;inset:0;z-index:10240;background:rgba(15,23,42,.56);display:flex;align-items:flex-start;justify-content:center;padding:34px 14px;overflow:auto}
      #ptAmortScheduleModal.hidden{display:none}
      #ptAmortScheduleModal .pta-shell{width:min(1180px,100%);background:#f7f9fc;border:1px solid #d7e0e8;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.32);overflow:hidden}
      .pta-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px;background:#fff;border-bottom:1px solid #e3e9ef}.pta-head h2{margin:2px 0 4px;font-size:20px}.pta-head p{margin:0;color:#667085;font-size:10px}.pta-eye{font-size:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#175c92}.pta-close{border:0;width:34px;height:34px;border-radius:999px;background:#eef2f6;font-size:20px;cursor:pointer}
      .pta-body{padding:16px 20px 22px}.pta-section{background:#fff;border:1px solid #dfe6ed;border-radius:11px;padding:13px;margin-bottom:13px}.pta-section:last-child{margin-bottom:0}.pta-sectionhead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:9px}.pta-sectionhead h3{margin:0;font-size:14px}.pta-sectionhead p{margin:2px 0 0;color:#667085;font-size:9px}.pta-tablewrap{overflow:auto;max-width:100%}.pta-table{width:100%;border-collapse:collapse;font-size:9px}.pta-table th,.pta-table td{padding:7px 8px;border-bottom:1px solid #edf1f5;text-align:right;white-space:nowrap}.pta-table th:first-child,.pta-table td:first-child{text-align:left}.pta-table th{background:#f8fafc;color:#475467;font-weight:800;position:sticky;top:0}.pta-amort-wrap{max-height:560px}.pta-actions{display:flex;gap:7px;flex-wrap:wrap}.pta-empty{padding:18px;border:1px dashed #cbd5e1;border-radius:9px;color:#667085;text-align:center;background:#fff}
      #reviewFinancingSummary .fin-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
      @media(max-width:700px){#ptAmortScheduleModal{padding:8px 5px}.pta-head,.pta-body{padding-left:12px;padding-right:12px}.pta-sectionhead{display:block}.pta-actions{margin-top:8px}.pt-amort-action{width:100%}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    styles();let m=document.getElementById('ptAmortScheduleModal');if(m)return m;
    m=document.createElement('div');m.id='ptAmortScheduleModal';m.className='hidden screen-only';m.innerHTML='<div class="pta-shell"><div id="ptAmortScheduleContent"></div></div>';document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.classList.contains('hidden'))close();});
    return m;
  }

  function annualRows(){
    const yrs=Array.isArray(result?.years)?result.years:[];
    return yrs.map(y=>`<tr><td>Year ${y.year}</td><td>${money(y.debt,0)}</td><td>${money(y.interest,0)}</td><td>${money(y.principal,0)}</td><td>${money(y.endBalance,0)}</td><td>${ratio(y.dcr)}</td></tr>`).join('');
  }
  function monthlyRows(){
    const rows=Array.isArray(result?.amort)?result.amort:[];
    return rows.map(a=>`<tr><td>${a.year}</td><td>${a.month}</td><td>${money(a.payment)}</td><td>${money(a.interest)}</td><td>${money(a.principal)}</td><td>${money(a.balance)}</td></tr>`).join('');
  }

  function draw(){
    const host=document.getElementById('ptAmortScheduleContent');if(!host)return false;
    const title=esc(analysisLabel());
    if(!financed()){
      host.innerHTML=`<div class="pta-head"><div><div class="pta-eye">Analysis Financing Detail</div><h2>Amortization Schedule</h2><p>${title}</p></div><button class="pta-close" type="button">×</button></div><div class="pta-body"><div class="pta-empty">This analysis does not contain an amortizing or interest-only mortgage schedule.</div></div>`;
      host.querySelector('.pta-close').onclick=close;return true;
    }
    host.innerHTML=`<div class="pta-head"><div><div class="pta-eye">Analysis Financing Detail</div><h2>Amortization Schedule</h2><p>${title} • ${money(state.mortgage,0)} loan • ${(Number(state.mortRate||0)*100).toFixed(2)}% • ${state.interestOnly?'Interest Only':'Amortizing'}</p></div><button class="pta-close" type="button">×</button></div>
      <div class="pta-body">
        <div class="pta-section"><div class="pta-sectionhead"><div><h3>Annual Debt Service & Coverage</h3><p>Annual payment, interest, principal, ending balance and DSCR for the current analysis.</p></div></div><div class="pta-tablewrap"><table class="pta-table"><thead><tr><th>Year</th><th>Debt Service</th><th>Interest</th><th>Principal</th><th>Ending Balance</th><th>DSCR</th></tr></thead><tbody>${annualRows()}</tbody></table></div></div>
        <div class="pta-section"><div class="pta-sectionhead"><div><h3>Monthly Amortization Schedule</h3><p>Monthly payment allocation and remaining loan balance.</p></div><div class="pta-actions"><button class="btn secondary" type="button" data-pta-csv>Download CSV</button></div></div><div class="pta-tablewrap pta-amort-wrap"><table class="pta-table"><thead><tr><th>Year</th><th>Month</th><th>Payment</th><th>Interest</th><th>Principal</th><th>Balance</th></tr></thead><tbody>${monthlyRows()}</tbody></table></div></div>
      </div>`;
    host.querySelector('.pta-close').onclick=close;host.querySelector('[data-pta-csv]').onclick=downloadCsv;return true;
  }

  function open(){const m=ensureModal();draw();m.classList.remove('hidden');document.body.style.overflow='hidden';}
  function close(){const m=document.getElementById('ptAmortScheduleModal');if(m)m.classList.add('hidden');document.body.style.overflow='';}
  function downloadCsv(){
    if(!financed())return;
    const rows=[['Year','Month','Payment','Interest','Principal','Balance'],...(result.amort||[]).map(a=>[a.year,a.month,a.payment,a.interest,a.principal,a.balance])];
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PropertyThesis-Amortization-Schedule.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),250);
  }

  function decorateReview(){
    styles();const card=document.getElementById('reviewFinancingSummary');if(!card)return false;
    card.querySelectorAll('[data-pta-open-review]').forEach(x=>x.remove());
    if(!financed())return true;
    const foot=card.querySelector('.fin-foot')||card;
    const b=document.createElement('button');b.type='button';b.className='btn secondary pt-amort-action';b.dataset.ptaOpenReview='1';b.textContent='View Amortization Schedule';b.onclick=open;foot.appendChild(b);return true;
  }

  function decorateManager(){
    styles();const host=document.getElementById('ptAnalysisContent');if(!host)return false;
    host.querySelectorAll('.pt-row').forEach(row=>{
      const openBtn=row.querySelector('[data-pt-open]'),actions=row.querySelector('.pt-actions');if(!openBtn||!actions)return;
      const id=openBtn.dataset.ptOpen;if(actions.querySelector(`[data-pta-analysis="${CSS.escape(id)}"]`))return;
      const b=document.createElement('button');b.type='button';b.className='btn ghost pt-amort-action';b.dataset.ptaAnalysis=id;b.textContent='Amortization Schedule';
      b.onclick=()=>openSaved(id,openBtn);actions.insertBefore(b,actions.querySelector('[data-pt-rename]')||null);
    });return true;
  }

  function openSaved(id,openBtn){
    try{openBtn.click();}catch(_e){return;}
    let tries=0;const timer=setInterval(()=>{
      let ready=false;try{ready=selectedAnalysisId===id&&Array.isArray(result?.years)&&result.years.length>0;}catch(_e){}
      if(ready){clearInterval(timer);setTimeout(open,80);return;}
      if(++tries>50)clearInterval(timer);
    },120);
  }

  function refresh(){decorateReview();decorateManager();}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-pt-manage],#appNavExisting,[data-hub-open],[data-pt-open],#s10ReviewResults,[data-s8-tab="dashboard"]'))[80,220,500].forEach(ms=>setTimeout(refresh,ms));},true);
  window.PropertyThesisAmortizationSchedule={version:VERSION,open,close,refresh,decorateReview,decorateManager};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,250),{once:true});else setTimeout(refresh,250);
})();
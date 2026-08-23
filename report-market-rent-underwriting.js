'use strict';
(()=>{
  const VERSION=1;
  if((window.__reportMarketRentUnderwritingV||0)>=VERSION)return;
  window.__reportMarketRentUnderwritingV=VERSION;
  const finite=v=>Number.isFinite(Number(v));
  const n=v=>Number(v);
  const money=v=>finite(v)?n(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const pct=v=>finite(v)?(n(v)*100).toFixed(2)+'%':'—';
  const ratio=v=>finite(v)?n(v).toFixed(2)+'x':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  function support(){try{return state?.marketRentSupport||null;}catch(_e){return null;}}
  function values(s){let current=finite(s?.currentRent)?n(s.currentRent):NaN;try{if(!finite(current)&&finite(state?.rent))current=n(state.rent);}catch(_e){}const expected=finite(s?.expectedRent)?n(s.expectedRent):finite(s?.concludedRent)?n(s.concludedRent):finite(s?.estimate)?n(s.estimate):current;const low=finite(s?.lowRent)?n(s.lowRent):finite(s?.rangeLow)?n(s.rangeLow):NaN;const high=finite(s?.highRent)?n(s.highRent):finite(s?.rangeHigh)?n(s.rangeHigh):NaN;return{current,low,expected,high};}
  function rows(s){return Array.isArray(s?.rentScenarioImpacts?.rows)?s.rentScenarioImpacts.rows:[];}
  function ensureStyles(){if(document.getElementById('ptReportRentUnderwritingStyles'))return;const st=document.createElement('style');st.id='ptReportRentUnderwritingStyles';st.textContent=`#clientReport .pt-report-rent-range{margin-top:12px}#clientReport .pt-report-rent-impact{margin-top:12px}#clientReport .pt-report-rent-impact table{width:100%;border-collapse:collapse}#clientReport .pt-report-rent-impact th,#clientReport .pt-report-rent-impact td{padding:7px 8px;border-bottom:1px solid #e1e8ee;text-align:right;font-size:8.5px}#clientReport .pt-report-rent-impact th:first-child,#clientReport .pt-report-rent-impact td:first-child{text-align:left}#clientReport .pt-report-rent-impact th{font-size:7px;text-transform:uppercase;color:#667085}@media print{#clientReport .pt-report-rent-impact th,#clientReport .pt-report-rent-impact td{font-size:6.8pt!important}}`;document.head.appendChild(st);}
  function apply(){ensureStyles();const section=document.querySelector('#clientReport .pt-market-rent-report');if(!section)return false;const s=support();if(!s)return false;section.querySelector('.pt-report-rent-range')?.remove();section.querySelector('.pt-report-rent-impact')?.remove();const v=values(s),stats=section.querySelector('.rb-stats');if(stats){const wrap=document.createElement('div');wrap.className='rb-stats pt-report-rent-range';wrap.innerHTML=`<div class="rb-stat"><span>Current / Asking Rent</span><b>${money(v.current)}</b><small>Current or advertised monthly rent</small></div><div class="rb-stat"><span>Low Market Rent</span><b>${money(v.low)}</b><small>Downside underwriting case</small></div><div class="rb-stat"><span>Expected Market Rent</span><b>${money(v.expected)}</b><small>Analyst-concluded underwriting rent</small></div><div class="rb-stat"><span>High Market Rent</span><b>${money(v.high)}</b><small>Upside underwriting case</small></div>`;stats.insertAdjacentElement('afterend',wrap);}
    const r=rows(s);if(r.length){const box=document.createElement('div');box.className='rb-tablewrap pt-report-rent-impact';box.innerHTML=`<table><thead><tr><th>Rent Scenario</th><th>Rent / Mo.</th><th>Year 1 NOI</th><th>Cap Rate</th><th>DSCR</th><th>Cap-Supported Value</th><th>IRR</th></tr></thead><tbody>${r.map(x=>`<tr><td><b>${esc(x.label)}</b></td><td>${money(x.rent)}</td><td>${money(x.noi)}</td><td>${pct(x.cap)}</td><td>${ratio(x.dcr)}</td><td>${money(x.capValue)}</td><td>${pct(x.irr)}</td></tr>`).join('')}</tbody></table>`;const note=section.querySelector('.pt-rent-source');if(note)note.insertAdjacentElement('beforebegin',box);else section.appendChild(box);}return true;}
  function schedule(){[0,100,260].forEach(ms=>setTimeout(apply,ms));}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbDownloadPdf,[data-hub-report],[data-pt-report]'))schedule();},true);
  window.ReportMarketRentUnderwriting={version:VERSION,apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();

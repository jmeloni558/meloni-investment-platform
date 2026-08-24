'use strict';
(()=>{
  const VERSION=1;
  if((window.__reportProFormaRestoreV||0)>=VERSION)return;
  window.__reportProFormaRestoreV=VERSION;

  const money=v=>typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');
  const pct=(v,d=2)=>Number.isFinite(v)?((v||0)*100).toFixed(d)+'%':'N/A';
  const mult=v=>Number.isFinite(v)?v.toFixed(2)+'x':'N/A';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  function styles(){
    let s=document.getElementById('reportProFormaRestoreStyles');
    if(!s){s=document.createElement('style');s.id='reportProFormaRestoreStyles';document.head.appendChild(s);}
    s.textContent=`
      #clientReport .rb-proforma-section{border-left:6px solid #13a59a!important;background:linear-gradient(145deg,#ffffff,#f5fbfb)!important;position:relative;overflow:hidden!important}
      #clientReport .rb-proforma-section:before{content:"";position:absolute;right:-80px;top:-100px;width:240px;height:240px;border-radius:999px;background:rgba(19,165,154,.08);pointer-events:none}
      #clientReport .rb-proforma-brandbar{display:flex;justify-content:space-between;gap:18px;align-items:center;margin:0 0 18px;padding:15px 17px;border:1px solid #d7ebe8;border-radius:12px;background:linear-gradient(120deg,#f0fbfa,#ffffff);position:relative;z-index:1}
      #clientReport .rb-proforma-brand-left{display:flex;gap:12px;align-items:center;min-width:0}
      #clientReport .rb-proforma-logo{max-width:112px;max-height:42px;object-fit:contain;background:#fff;border:1px solid #d8e4ef;border-radius:8px;padding:4px}
      #clientReport .rb-proforma-kicker{font-size:9px;font-weight:900;letter-spacing:.13em;color:#13a59a;text-transform:uppercase;margin-bottom:3px}
      #clientReport .rb-proforma-company{font-size:14px;font-weight:900;color:#173f66;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px}
      #clientReport .rb-proforma-contact{font-size:10px;color:#667085;line-height:1.35;text-align:right;max-width:340px}
      #clientReport .rb-proforma-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 15px;position:relative;z-index:1}
      #clientReport .rb-proforma-tile{border:1px solid #dce8ef;background:#fff;border-radius:11px;padding:12px;box-shadow:0 6px 16px rgba(23,63,102,.04)}
      #clientReport .rb-proforma-tile span{display:block;font-size:9px;color:#667085;font-weight:800;text-transform:uppercase;letter-spacing:.04em;line-height:1.25}
      #clientReport .rb-proforma-tile b{display:block;margin-top:6px;color:#174f83;font-size:16px;line-height:1.2}
      #clientReport .rb-proforma-tile small{display:block;margin-top:3px;color:#7a8699;font-size:9px;line-height:1.3}
      #clientReport .rb-proforma-note{margin:0 0 15px;padding:15px 17px;border-radius:10px;border:1px solid #d7e8f4;background:#f2f8fc;color:#405269;font-size:12.5px;line-height:1.65;position:relative;z-index:1}
      #clientReport .rb-proforma-note strong{color:#173f66}
      #clientReport .rb-proforma-tablewrap{overflow:auto;border:1px solid #dbe6ee;border-radius:12px;background:#fff;position:relative;z-index:1}
      #clientReport .rb-proforma-table{width:100%;border-collapse:collapse;font-size:10px}
      #clientReport .rb-proforma-table th{background:#eaf4f6!important;color:#24465e!important;font-weight:900;padding:8px 7px!important;text-align:right;white-space:nowrap}
      #clientReport .rb-proforma-table td{padding:8px 7px!important;border-bottom:1px solid #edf2f5;text-align:right;white-space:nowrap}
      #clientReport .rb-proforma-table th:first-child,#clientReport .rb-proforma-table td:first-child{text-align:left;font-weight:800;color:#24465e}
      #clientReport .rb-proforma-table tbody tr:nth-child(even){background:#fbfdfd}
      #clientReport .rb-proforma-table .good{color:#047857;font-weight:900}.rb-proforma-table .bad{color:#b42318;font-weight:900}
      #clientReport .rb-proforma-footer{margin-top:10px;font-size:9px;color:#7a8699;line-height:1.45;position:relative;z-index:1}
      @media(max-width:760px){#clientReport .rb-proforma-brandbar{display:block}#clientReport .rb-proforma-contact{text-align:left;margin-top:8px}.rb-proforma-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:520px){#clientReport .rb-proforma-grid{grid-template-columns:1fr!important}}
    `;
  }

  function profileFromReport(){
    const cover=document.querySelector('#clientReport .rb-cover');
    const brand=(cover?.querySelector('.rb-brand')?.textContent||'').trim();
    const logo=cover?.querySelector('.rb-brand-logo')?.getAttribute('src')||'';
    const contact=(cover?.querySelector('.rb-profile-contact')?.textContent||'').replace(/^\s*Contact:\s*/i,'').trim();
    const prepared=[...cover?.querySelectorAll('.rb-meta span')||[]].find(x=>/Prepared by:/i.test(x.textContent||''));
    const who=(prepared?.textContent||'').replace(/^\s*Prepared by:\s*/i,'').trim();
    return {brand:brand&&brand!=='MELONI REALTY'?brand:'Meloni Realty',logo,contact,who};
  }

  function proFormaRows(){
    const years=result?.years||[];
    return years.map(y=>{
      const dscr=Number(y.dcr);
      const cf=Number(y.atcf);
      return `<tr><td>Year ${esc(y.year)}</td><td>${money(y.pgi)}</td><td>${money(y.egi)}</td><td>${money(y.opex)}</td><td>${money(y.noi)}</td><td>${money(y.debt)}</td><td class="${cf>=0?'good':'bad'}">${money(cf)}</td><td>${Number.isFinite(dscr)?mult(dscr):'N/A'}</td></tr>`;
    }).join('');
  }

  function addProForma(){
    const report=document.querySelector('#clientReport .rb-report');
    if(!report||!result?.years?.length||!state)return false;
    report.querySelector('[data-rb-section="proformaRestored"]')?.remove();

    const p=profileFromReport();
    const y1=result.years[0];
    const last=result.years[result.years.length-1]||y1;
    const noiGrowth=(y1?.noi&&last?.noi&&last.year>1)?((last.noi/y1.noi)-1):NaN;
    const cfGrowth=(Number(last?.atcf)-Number(y1?.atcf));
    const section=document.createElement('section');
    section.className='rb-section rb-proforma-section';
    section.dataset.rbSection='proformaRestored';
    section.innerHTML=`
      <div class="rb-section-head"><h2>Pro Forma Report</h2><p>Forward-looking operating projection with user-branded presentation and annual income, expense, NOI, debt-service and cash-flow detail.</p></div>
      <div class="rb-proforma-brandbar">
        <div class="rb-proforma-brand-left">${p.logo?`<img class="rb-proforma-logo" src="${esc(p.logo)}" alt="${esc(p.brand)} logo">`:''}<div><div class="rb-proforma-kicker">Prepared Pro Forma</div><div class="rb-proforma-company">${esc(p.brand)}</div>${p.who?`<div class="rb-proforma-footer">${esc(p.who)}</div>`:''}</div></div>
        <div class="rb-proforma-contact">${esc(p.contact||'Investment Property Analysis • PropertyThesis')}</div>
      </div>
      <div class="rb-proforma-grid">
        <div class="rb-proforma-tile"><span>Year 1 EGI</span><b>${money(y1.egi)}</b><small>Effective gross income</small></div>
        <div class="rb-proforma-tile"><span>Year 1 NOI</span><b>${money(y1.noi)}</b><small>${pct(result.cap)} cap rate</small></div>
        <div class="rb-proforma-tile"><span>Year 1 Cash Flow</span><b>${money(y1.atcf)}</b><small>After tax / after financing</small></div>
        <div class="rb-proforma-tile"><span>Final-Year Cash Flow</span><b>${money(last.atcf)}</b><small>Year ${esc(last.year)} projection</small></div>
        <div class="rb-proforma-tile"><span>Rent Growth</span><b>${pct(state.rentGrowth)}</b><small>Starting Year 2</small></div>
        <div class="rb-proforma-tile"><span>Expense Ratio</span><b>${pct(state.opEx)}</b><small>Operating expenses / EGI</small></div>
        <div class="rb-proforma-tile"><span>NOI Growth</span><b>${Number.isFinite(noiGrowth)?pct(noiGrowth):'N/A'}</b><small>Modeled hold period</small></div>
        <div class="rb-proforma-tile"><span>Cash Flow Change</span><b>${money(cfGrowth)}</b><small>Year ${esc(y1.year)} to Year ${esc(last.year)}</small></div>
      </div>
      <div class="rb-proforma-note"><strong>Pro Forma Interpretation:</strong> This section restores the Step 3 pro-forma presentation inside the client report. It is intended to show how rental income, vacancy, operating expenses, NOI, debt service and after-tax cash flow are projected across the selected holding period. The section uses the same user branding applied to the main report so the pro forma reads as part of the finished client deliverable rather than a separate worksheet.</div>
      <div class="rb-proforma-tablewrap"><table class="rb-proforma-table"><thead><tr><th>Period</th><th>PGI</th><th>EGI</th><th>Operating Expenses</th><th>NOI</th><th>Debt Service</th><th>After-Tax CF</th><th>DSCR</th></tr></thead><tbody>${proFormaRows()}</tbody></table></div>
      <div class="rb-proforma-footer">Forward-looking projections are based on the assumptions entered in the analysis. Actual rents, vacancy, expenses, financing, taxes and sale results may differ.</div>`;

    const operating=report.querySelector('[data-rb-section="operating"]');
    const disposition=report.querySelector('[data-rb-section="disposition"]');
    if(operating)operating.insertAdjacentElement('afterend',section);
    else if(disposition)disposition.insertAdjacentElement('beforebegin',section);
    else report.appendChild(section);
    return true;
  }

  function apply(){styles();addProForma();return true;}
  function schedule(){setTimeout(apply,0);setTimeout(apply,120);setTimeout(apply,350);setTimeout(apply,900);}

  const old=window.ReportBuilderV1?.render;
  if(typeof old==='function'&&!old.__proformaRestored){
    const wrapped=function(...args){const out=old.apply(this,args);schedule();return out;};
    wrapped.__proformaRestored=true;
    window.ReportBuilderV1.render=wrapped;
  }
  const oldApply=window.ReportBuilderV1?.apply;
  if(typeof oldApply==='function'&&!oldApply.__proformaRestored){
    const wrappedApply=function(...args){const out=oldApply.apply(this,args);schedule();return out;};
    wrappedApply.__proformaRestored=true;
    window.ReportBuilderV1.apply=wrappedApply;
  }

  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#refreshReportBtn'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.ReportProFormaRestore={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();

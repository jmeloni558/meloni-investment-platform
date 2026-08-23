'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV1Version||0)>=VERSION)return;
  window.__reportBuilderV1Version=VERSION;

  const PREF_KEY='meloni-report-builder-v1';
  const RECON_KEY='meloni-review-reconciliation-v1';
  const defaults={
    preparedFor:'',
    includeAssumptions:true,
    includeValuation:true,
    includeFinancing:true,
    includeOperating:true,
    includeDisposition:true,
    includeReturns:true,
    includeDetailedCashflow:true,
    includeTaxOperations:false,
    includeSaleTax:false,
    includeInvestmentCashflow:true,
    includeSensitivity:false
  };
  let prefs={...defaults};

  function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
  function money(v){return typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');}
  function pct(v){return typeof fmtP==='function'?fmtP(v):(Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A');}
  function mult(v){return typeof fmtX==='function'?fmtX(v):(Number.isFinite(v)?v.toFixed(2)+'x':'N/A');}
  function loadPrefs(){try{prefs={...defaults,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch(e){prefs={...defaults}}}
  function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch(e){}}
  function analysisKey(){const address=(state?.address||'').trim(),name=(state?.name||'').trim();return address||name||'current-analysis';}
  function reconData(){try{return (JSON.parse(localStorage.getItem(RECON_KEY)||'{}')||{})[analysisKey()]||{};}catch(e){return {};}}
  function valueBox(label,value,sub=''){return `<div class="rb-stat"><span>${esc(label)}</span><b>${esc(value)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div>`;}
  function row(label,value){return `<div class="rb-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;}
  function section(id,title,body,subtitle=''){return `<section class="rb-section" data-rb-section="${id}"><div class="rb-section-head"><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${body}</section>`;}

  function injectStyles(){
    if(document.getElementById('reportBuilderV1Styles'))return;
    const st=document.createElement('style');
    st.id='reportBuilderV1Styles';
    st.textContent=`
      #report #stage5ReportControls{display:none!important}
      #report .toolbar{display:none!important}
      #rbControls{margin-bottom:14px}
      #rbControls .rb-control-grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,2.2fr);gap:16px;align-items:start}
      #rbControls .rb-toggle-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #rbControls .rb-toggle{display:flex;gap:7px;align-items:flex-start;border:1px solid #e1e6ed;border-radius:8px;padding:8px;background:#fafbfd;font-size:10px;color:#475467;line-height:1.35}
      #rbControls .rb-toggle input{margin-top:1px}
      #rbControls .rb-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
      #clientReport{padding:0!important;background:transparent!important;border:none!important;box-shadow:none!important}
      #clientReport .rb-report{background:#fff;border:1px solid #dfe5ec;border-radius:12px;overflow:hidden;color:#25324a}
      #clientReport .rb-cover{padding:28px 30px 22px;background:linear-gradient(180deg,#f8fafc,#fff);border-bottom:1px solid #e4e9ef}
      #clientReport .rb-brand{font-size:11px;font-weight:800;letter-spacing:.14em;color:#174f83}
      #clientReport .rb-cover h1{font-size:28px;line-height:1.08;margin:8px 0 6px;color:#172033}
      #clientReport .rb-cover .address{font-size:13px;color:#667085;margin:0}
      #clientReport .rb-meta{display:flex;flex-wrap:wrap;gap:7px 18px;margin-top:16px;font-size:10px;color:#667085}
      #clientReport .rb-meta b{color:#344054}
      #clientReport .rb-conclusion{margin:18px 30px 0;padding:16px 18px;border-left:4px solid #174f83;border-radius:8px;background:#f5f8fb}
      #clientReport .rb-conclusion h2{font-size:14px;margin:0 0 7px;color:#172033}
      #clientReport .rb-conclusion p{font-size:11px;line-height:1.65;margin:0;color:#475467}
      #clientReport .rb-section{padding:22px 30px;border-top:1px solid #e8edf2}
      #clientReport .rb-section-head{margin-bottom:12px}
      #clientReport .rb-section-head h2{font-size:15px;margin:0;color:#172033}
      #clientReport .rb-section-head p{font-size:10px;color:#667085;margin:4px 0 0}
      #clientReport .rb-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      #clientReport .rb-stat{border:1px solid #e2e7ed;border-radius:9px;padding:10px;background:#fafbfd;min-width:0}
      #clientReport .rb-stat span{display:block;font-size:9px;color:#667085;font-weight:700;line-height:1.3}
      #clientReport .rb-stat b{display:block;font-size:15px;color:#174f83;margin-top:4px;line-height:1.25}
      #clientReport .rb-stat small{display:block;font-size:8px;color:#667085;margin-top:3px;line-height:1.35}
      #clientReport .rb-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      #clientReport .rb-panel{border:1px solid #e2e7ed;border-radius:9px;padding:12px;background:#fff}
      #clientReport .rb-panel h3{font-size:11px;margin:0 0 8px;color:#344054}
      #clientReport .rb-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #eef1f4;font-size:9.5px}
      #clientReport .rb-row:last-child{border-bottom:none}
      #clientReport .rb-row span{color:#667085}
      #clientReport .rb-row b{color:#344054;text-align:right}
      #clientReport .rb-tablewrap{overflow:auto;border:1px solid #e2e7ed;border-radius:9px}
      #clientReport table{width:100%;border-collapse:collapse;font-size:9px}
      #clientReport th,#clientReport td{padding:7px 8px;border-bottom:1px solid #eef1f4;text-align:right;white-space:nowrap}
      #clientReport th:first-child,#clientReport td:first-child{text-align:left}
      #clientReport th{background:#f7f9fb;color:#475467;font-weight:800}
      #clientReport .rb-footer{padding:16px 30px 22px;font-size:8.5px;line-height:1.5;color:#7a8699;border-top:1px solid #e8edf2;background:#fafbfd}
      @media(max-width:900px){#rbControls .rb-control-grid{grid-template-columns:1fr}#rbControls .rb-toggle-grid{grid-template-columns:repeat(2,1fr)}#clientReport .rb-stats{grid-template-columns:repeat(2,1fr)}#clientReport .rb-two{grid-template-columns:1fr}}
      @media(max-width:600px){#rbControls .rb-toggle-grid{grid-template-columns:1fr}#clientReport .rb-stats{grid-template-columns:1fr}#clientReport .rb-cover,#clientReport .rb-section{padding-left:18px;padding-right:18px}#clientReport .rb-conclusion{margin-left:18px;margin-right:18px}}
    `;
    document.head.appendChild(st);
  }

  const toggleDefs=[
    ['includeAssumptions','Acquisition & Operating Assumptions'],
    ['includeValuation','Income-Based Valuation'],
    ['includeFinancing','Financing Summary'],
    ['includeOperating','Projected Operating Performance'],
    ['includeDisposition','Disposition & Tax Summary'],
    ['includeReturns','Investment Return Analysis'],
    ['includeDetailedCashflow','Detailed Cash Flow Table'],
    ['includeTaxOperations','Detailed Taxes From Operations'],
    ['includeSaleTax','Detailed Taxes Due on Sale'],
    ['includeInvestmentCashflow','Total Investment Cash Flow / IRR'],
    ['includeSensitivity','Sensitivity Analysis (reserved)']
  ];

  function injectControls(){
    const report=document.getElementById('report');
    if(!report)return false;
    let box=document.getElementById('rbControls');
    if(!box){
      box=document.createElement('div');
      box.id='rbControls';
      box.className='card span-12 screen-only';
      const host=document.getElementById('clientReport');
      host?.insertAdjacentElement('beforebegin',box);
    }
    box.innerHTML=`<div class="sectionhead"><div><h2>Client Report Builder</h2><p>Select the sections to include in the client-facing report preview. These controls do not change the underlying analysis.</p></div><span class="badge">Page 3 • First Pass</span></div><div class="rb-control-grid"><div><div class="field"><label>Prepared For</label><input id="rbPreparedFor" value="${esc(prefs.preparedFor)}" placeholder="Client name (optional)"></div><div class="rb-actions"><button type="button" class="btn primary" id="rbRefresh">Refresh Report Preview</button><button type="button" class="btn secondary" id="rbSelectCore">Core Client Report</button><button type="button" class="btn ghost" id="rbSelectAll">Include All Details</button></div></div><div class="rb-toggle-grid">${toggleDefs.map(([key,label])=>`<label class="rb-toggle"><input type="checkbox" data-rb-pref="${key}" ${prefs[key]?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div></div>`;
    const prepared=box.querySelector('#rbPreparedFor');
    prepared?.addEventListener('input',()=>{prefs.preparedFor=prepared.value;savePrefs();});
    box.querySelectorAll('[data-rb-pref]').forEach(el=>el.addEventListener('change',()=>{prefs[el.dataset.rbPref]=el.checked;savePrefs();renderReport();}));
    box.querySelector('#rbRefresh')?.addEventListener('click',()=>{prefs.preparedFor=prepared?.value||'';savePrefs();renderReport();});
    box.querySelector('#rbSelectCore')?.addEventListener('click',()=>{Object.assign(prefs,{includeAssumptions:true,includeValuation:true,includeFinancing:true,includeOperating:true,includeDisposition:true,includeReturns:true,includeDetailedCashflow:true,includeTaxOperations:false,includeSaleTax:false,includeInvestmentCashflow:true,includeSensitivity:false});savePrefs();injectControls();renderReport();});
    box.querySelector('#rbSelectAll')?.addEventListener('click',()=>{toggleDefs.forEach(([k])=>prefs[k]=k!=='includeSensitivity');savePrefs();injectControls();renderReport();});
    return true;
  }

  function operatingTable(){
    const years=result?.years||[];
    if(!years.length)return '';
    return `<div class="rb-tablewrap"><table><thead><tr><th>Year</th><th>PGI</th><th>EGI</th><th>NOI</th><th>Debt Service</th><th>After-Tax CF</th></tr></thead><tbody>${years.map(y=>`<tr><td>${y.year}</td><td>${money(y.pgi)}</td><td>${money(y.egi)}</td><td>${money(y.noi)}</td><td>${money(y.debt)}</td><td>${money(y.atcf)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function taxOpsTable(){
    const years=result?.years||[],ap=state.loanYears?result.pointCost/state.loanYears:0,ao=state.loanYears?state.origFee/state.loanYears:0;
    return `<div class="rb-tablewrap"><table><thead><tr><th>Year</th><th>NOI</th><th>Interest</th><th>Depreciation</th><th>Taxable Income</th><th>Taxes From Operations</th></tr></thead><tbody>${years.map(y=>`<tr><td>${y.year}</td><td>${money(y.noi)}</td><td>${money(y.interest)}</td><td>${money(result.depreciation)}</td><td>${money(y.taxable)}</td><td>${money(y.opTax)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function investmentCashflowTable(){
    const headers=['Year 0',...(result?.years||[]).map(y=>'Year '+y.year)];
    const atcf=[0,...(result?.years||[]).map(y=>y.atcf)];
    const reversion=[0,...(result?.years||[]).map((y,i)=>i===result.years.length-1?result.ater:0)];
    return `<div class="rb-tablewrap"><table><thead><tr><th>Cash Flow Component</th>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody><tr><td>Initial Investment</td>${result.cfs.map((v,i)=>`<td>${i===0?money(v):money(0)}</td>`).join('')}</tr><tr><td>After-Tax Operating Cash Flow</td>${atcf.map(v=>`<td>${money(v)}</td>`).join('')}</tr><tr><td>After-Tax Equity Reversion</td>${reversion.map(v=>`<td>${money(v)}</td>`).join('')}</tr><tr><td><strong>Total Investment Cash Flow</strong></td>${result.cfs.map(v=>`<td><strong>${money(v)}</strong></td>`).join('')}</tr></tbody></table></div>`;
  }

  function renderReport(){
    const host=document.getElementById('clientReport');
    if(!host||!result||!state||!result.years?.length)return false;
    const y1=result.years[0],eq=-result.initial,coc=eq?y1.atcf/eq:NaN;
    const recon=reconData(),reconciled=Number(recon.reconciled),hasRecon=Number.isFinite(reconciled)&&reconciled>0;
    const support=[result.capValue,result.grmValue].filter(Number.isFinite),low=support.length?Math.min(...support):NaN,high=support.length?Math.max(...support):NaN;
    const diff=hasRecon?state.price-reconciled:NaN, diffPct=hasRecon&&reconciled?diff/reconciled:NaN;
    const conclusion=(recon.conclusion||'').trim()||`The analysis produces a Year 1 capitalization rate of ${pct(result.cap)}, projected IRR of ${pct(result.IRR)}, and NPV of ${money(result.NPV)} at the selected ${pct(state.requiredReturn)} required return. Review the acquisition terms in conjunction with the investor’s objectives and property-specific considerations.`;
    const totalPrincipal=(result.years||[]).reduce((s,y)=>s+(Number.isFinite(y.principal)?y.principal:0),0);
    const structure=state.mortgage<=0?'All Cash':(state.interestOnly?'Interest Only':'Amortizing');

    let html=`<div class="rb-report"><header class="rb-cover"><div class="rb-brand">MELONI REALTY</div><h1>Investment Property Analysis</h1><p class="address">${esc(state.address||state.name||'Income-Producing Property')}</p><div class="rb-meta"><span><b>Acquisition Price:</b> ${money(state.price)}</span><span><b>Holding Period:</b> ${state.hold} years</span><span><b>Prepared by:</b> Jamie Meloni, Meloni Realty</span>${prefs.preparedFor?`<span><b>Prepared for:</b> ${esc(prefs.preparedFor)}</span>`:''}</div></header><div class="rb-conclusion"><h2>Executive Investment Conclusion</h2><p>${esc(conclusion)}</p></div>`;

    html+=section('snapshot','Investment Snapshot',`<div class="rb-stats">${valueBox('Acquisition Price',money(state.price))}${valueBox('Year 1 NOI',money(y1.noi))}${valueBox('Capitalization Rate',pct(result.cap),`Target ${pct(state.desiredCap)}`)}${valueBox('Gross Rent Multiplier',mult(result.grm),`Target ${mult(state.desiredGrm)}`)}${valueBox('Cash-on-Cash Return',pct(coc))}${valueBox('Year 1 DSCR',Number.isFinite(y1.dcr)?mult(y1.dcr):'N/A')}${valueBox('Internal Rate of Return',pct(result.IRR),`Required ${pct(state.requiredReturn)}`)}${valueBox('Net Present Value',money(result.NPV))}</div>`);

    if(prefs.includeAssumptions)html+=section('assumptions','Acquisition & Operating Assumptions',`<div class="rb-two"><div class="rb-panel"><h3>Property & Operations</h3>${row('Acquisition Price',money(state.price))}${row('Land Value',money(state.land))}${row('Units / Apartments',state.units)}${row('Monthly Rent',money(state.rent))}${row('Rent Growth Starting Year 2',pct(state.rentGrowth))}${row('Vacancy & Credit Loss',pct(state.vacancy))}${row('Operating Expenses as % of EGI',pct(state.opEx))}</div><div class="rb-panel"><h3>Long-Term Assumptions</h3>${row('Depreciable Life',state.depLife+' years')}${row('Annual Property Value Increase',pct(state.appreciation))}${row('Expected Holding Period',state.hold+' years')}${row('Selling Expenses',pct(state.sellCost))}${row('Ordinary Income Tax Rate',pct(state.ordinaryTax))}${row('Depreciation Tax Rate',pct(state.depTax))}${row('Capital Gains Tax Rate',pct(state.capGainsTax))}</div></div>`);

    if(prefs.includeValuation)html+=section('valuation','Income-Based Valuation',`<div class="rb-stats">${valueBox('Direct Capitalization Value',money(result.capValue),`Desired cap ${pct(state.desiredCap)}`)}${valueBox('GRM Value',money(result.grmValue),`Desired GRM ${mult(state.desiredGrm)}`)}${valueBox('Income-Supported Range',Number.isFinite(low)?money(low)+' – '+money(high):'N/A')}${valueBox('Reconciled Investment Value',hasRecon?money(reconciled):'Not entered')}${valueBox('Acquisition Price vs. Reconciled Value',hasRecon?money(Math.abs(diff)):'N/A',hasRecon?(diff===0?'Equal to reconciled value':`${Math.abs(diffPct*100).toFixed(1)}% ${diff>0?'premium':'discount'}`):'Enter on Page 2')}</div>`,'Calculated income approaches plus professional reconciliation from Review Results.');

    if(prefs.includeFinancing)html+=section('financing','Financing Summary',`<div class="rb-stats">${valueBox('Loan Amount',money(state.mortgage))}${valueBox('Loan Structure',structure)}${valueBox('Mortgage Rate',state.mortgage>0?pct(state.mortRate):'N/A')}${valueBox('Monthly Payment',state.mortgage>0?money(result.monthlyPayment):'N/A')}${valueBox('Year 1 Debt Service',money(y1.debt))}${valueBox('Year 1 Interest',money(y1.interest))}${valueBox('Year 1 Principal',money(y1.principal))}${valueBox('Loan Balance at Sale',money(result.loanPayoff))}${valueBox('Total Principal Paid During Hold',money(totalPrincipal))}</div>`);

    if(prefs.includeOperating)html+=section('operating','Projected Operating Performance',`<div class="rb-stats">${valueBox('Year 1 Potential Gross Income',money(y1.pgi))}${valueBox('Year 1 Effective Gross Income',money(y1.egi))}${valueBox('Year 1 Operating Expenses',money(y1.opex))}${valueBox('Year 1 NOI',money(y1.noi))}${valueBox('Year 1 After-Tax Cash Flow',money(y1.atcf))}${valueBox('Final-Year After-Tax Cash Flow',money(result.years.at(-1).atcf))}</div>${prefs.includeDetailedCashflow?`<div style="margin-top:12px">${operatingTable()}</div>`:''}`);

    if(prefs.includeDisposition)html+=section('disposition','Disposition & Tax Summary',`<div class="rb-stats">${valueBox('Projected Gross Sale Price',money(result.grossSale))}${valueBox('Selling Expenses',money(result.selling))}${valueBox('Net Sale Price',money(result.netSale))}${valueBox('Loan Payoff',money(result.loanPayoff))}${valueBox('Taxes Due on Sale',money(result.saleTax))}${valueBox('After-Tax Equity Reversion',money(result.ater))}</div>${prefs.includeTaxOperations?`<div style="margin-top:12px"><h3>Detailed Taxes From Operations</h3>${taxOpsTable()}</div>`:''}${prefs.includeSaleTax?`<div class="rb-two" style="margin-top:12px"><div class="rb-panel"><h3>Taxes Due on Sale</h3>${row('Net Sales Price',money(result.netSale))}${row('Book Value',money(result.book))}${row('Gain / Loss on Sale',money(result.gain))}${row('Accumulated Depreciation',money(result.accDep))}${row('Total Taxes Due on Sale',money(result.saleTax))}</div></div>`:''}`);

    if(prefs.includeReturns)html+=section('returns','Investment Return Analysis',`<div class="rb-stats">${valueBox('Initial Cash Investment',money(eq))}${valueBox('Required Rate of Return',pct(state.requiredReturn))}${valueBox('Calculated IRR',pct(result.IRR))}${valueBox('NPV',money(result.NPV))}${valueBox('Year 1 Cash-on-Cash Return',pct(coc))}${valueBox('After-Tax Equity Reversion',money(result.ater))}</div>${prefs.includeInvestmentCashflow?`<div style="margin-top:12px">${investmentCashflowTable()}</div>`:''}`,'Return metrics are calculated from the audited investment cash-flow series.');

    if(prefs.includeSensitivity)html+=section('sensitivity','Sensitivity Analysis',`<div class="rb-panel"><h3>Reserved for the next report-builder pass</h3><div class="mini">This toggle is included now so the report structure is ready for the existing price/rent sensitivity model without duplicating its calculations.</div></div>`);

    html+=`<div class="rb-footer">This analysis is an investment decision-support model based on the assumptions entered by the analyst/user. Actual rents, expenses, financing, taxes, resale proceeds and returns may differ. This report is not an appraisal, tax opinion, legal opinion or guarantee of investment performance.</div></div>`;
    host.innerHTML=html;
    return true;
  }

  function apply(){
    injectStyles();
    loadPrefs();
    const ok=injectControls();
    renderReport();
    return ok;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reportBuilderV1Wrapped){
    const wrapped=function(...args){const out=originalRender.apply(this,args);setTimeout(()=>{loadPrefs();injectControls();renderReport();},0);return out;};
    wrapped.__reportBuilderV1Wrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="report"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReportBuilderV1={apply,render:renderReport};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

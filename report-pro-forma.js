'use strict';
(()=>{
  const VERSION=2;
  if((window.__propertyThesisReportProFormaV||0)>=VERSION)return;
  window.__propertyThesisReportProFormaV=VERSION;

  const PREF_KEY='propertythesis-report-pro-forma-v1';
  const XLSX_SRC='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const finite=v=>Number.isFinite(Number(v));
  const n=v=>Number(v);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const money=v=>finite(v)?n(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';

  function loadPref(){try{const x=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');return x.include!==false;}catch(_e){return true;}}
  function savePref(include){try{localStorage.setItem(PREF_KEY,JSON.stringify({include:!!include}));}catch(_e){}}
  function years(limit){try{const a=Array.isArray(result?.years)?result.years:[];return limit?a.slice(0,limit):a.slice();}catch(_e){return [];}}
  function pointsAmort(y){try{return state?.loanYears&&y.year<=state.loanYears?(result?.pointCost||0)/state.loanYears:0;}catch(_e){return 0;}}
  function origAmort(y){try{return state?.loanYears&&y.year<=state.loanYears?(state?.origFee||0)/state.loanYears:0;}catch(_e){return 0;}}
  function endingBalance(y){try{if(!finite(state?.mortgage)||n(state.mortgage)<=0)return 0;const paid=years().filter(x=>x.year<=y.year).reduce((s,x)=>s+(finite(x.principal)?n(x.principal):0),0);return Math.max(0,n(state.mortgage)-paid);}catch(_e){return NaN;}}

  function ensureStyles(){if(document.getElementById('ptProFormaStyles'))return;const st=document.createElement('style');st.id='ptProFormaStyles';st.textContent=`
    #clientReport [data-rb-section="proForma"] .ptpf-table th:first-child,#clientReport [data-rb-section="proForma"] .ptpf-table td:first-child{width:30%;text-align:left;font-weight:700}
    #clientReport [data-rb-section="proForma"] .ptpf-table td{font-variant-numeric:tabular-nums}
    #clientReport [data-rb-section="proForma"] .ptpf-total td{font-weight:900;color:#173f66;background:#f5f9fc}
    #rbDownloadProForma{min-width:150px}
  `;document.head.appendChild(st);}

  function proFormaRows(ys){const row=(label,getter,cls='')=>({label,values:ys.map(getter),cls});return[
    row('Potential Gross Income',y=>y.pgi),
    row('Vacancy & Credit Loss',y=>finite(y.pgi)&&finite(y.egi)?n(y.pgi)-n(y.egi):NaN),
    row('Effective Gross Income',y=>y.egi),
    row('Operating Expenses',y=>finite(y.egi)&&finite(y.noi)?n(y.egi)-n(y.noi):NaN),
    row('Net Operating Income',y=>y.noi,'ptpf-total'),
    row('Debt Service',y=>y.debt),
    row('Interest',y=>y.interest),
    row('Principal Reduction',y=>y.principal),
    row('Taxable Income',y=>y.taxable),
    row('Taxes From Operations',y=>y.opTax),
    row('After-Tax Operating Cash Flow',y=>y.atcf,'ptpf-total'),
    row('Ending Loan Balance',y=>endingBalance(y))
  ];}

  function buildReportSection(){const ys=years(5);if(!ys.length)return null;const section=document.createElement('section');section.className='rb-section';section.dataset.rbSection='proForma';const rows=proFormaRows(ys);section.innerHTML=`<div class="rb-section-head"><h2>5-Year Pro Forma</h2><p>Consolidated operating, financing, and tax outlook from the protected PropertyThesis calculation engine.</p></div><div class="rb-tablewrap"><table class="ptpf-table"><thead><tr><th>Pro Forma</th>${ys.map(y=>`<th>Year ${y.year}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.cls}"><td>${esc(r.label)}</td>${r.values.map(v=>`<td>${money(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;return section;}

  function applyReport(){ensureStyles();const report=document.querySelector('#clientReport .rb-report');if(!report)return false;report.querySelector('[data-rb-section="proForma"]')?.remove();if(!loadPref())return true;const section=buildReportSection();if(!section)return false;const sections=[...report.querySelectorAll(':scope > .rb-section')];const operating=sections.find(s=>/Projected Operating Performance/i.test(s.querySelector('.rb-section-head h2')?.textContent||''));const disposition=sections.find(s=>/Disposition & Tax Summary/i.test(s.querySelector('.rb-section-head h2')?.textContent||''));if(operating)operating.insertAdjacentElement('afterend',section);else if(disposition)disposition.insertAdjacentElement('beforebegin',section);else report.querySelector('.rb-footer')?.insertAdjacentElement('beforebegin',section);return true;}

  function injectControls(){ensureStyles();const controls=document.getElementById('rbControls');if(!controls)return false;const toggles=controls.querySelector('.rb-toggle-grid');if(toggles&&!document.getElementById('ptIncludeProForma')){const label=document.createElement('label');label.className='rb-toggle';label.innerHTML=`<input type="checkbox" id="ptIncludeProForma" ${loadPref()?'checked':''}><span>5-Year Pro Forma</span>`;toggles.appendChild(label);label.querySelector('input')?.addEventListener('change',e=>{savePref(e.target.checked);applyReport();});}const actions=controls.querySelector('.rb-actions');if(actions&&!document.getElementById('rbDownloadProForma')){const b=document.createElement('button');b.type='button';b.id='rbDownloadProForma';b.className='btn secondary';b.textContent='Download Pro Forma Excel';actions.appendChild(b);}return true;}

  function ensureXlsx(){if(window.XLSX)return Promise.resolve(window.XLSX);if(window.__ptXlsxPromise)return window.__ptXlsxPromise;window.__ptXlsxPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=XLSX_SRC;s.async=true;s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Excel export library did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the Excel export library.'));document.head.appendChild(s);});return window.__ptXlsxPromise;}
  function safeName(){try{return ((state?.address||state?.name||'PropertyThesis').trim().replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,65)||'PropertyThesis')+'-Pro-Forma.xlsx';}catch(_e){return'PropertyThesis-Pro-Forma.xlsx';}}
  function sheetTitleRows(title){return [[title],[state?.address||state?.name||'Income-Producing Property'],['Source','PropertyThesis protected calculation engine outputs'],['Acquisition Price',finite(state?.price)?n(state.price):''],['Holding Period (Years)',finite(state?.hold)?n(state.hold):''],[]];}
  function applyCurrencyFormat(ws,range){const XLSX=window.XLSX;if(!XLSX||!range)return;const r=XLSX.utils.decode_range(range);for(let R=r.s.r;R<=r.e.r;R++)for(let C=r.s.c;C<=r.e.c;C++){const cell=ws[XLSX.utils.encode_cell({r:R,c:C})];if(cell&&cell.t==='n')cell.z='$#,##0;[Red]($#,##0);-';}}
  function styleWorksheet(ws,widths){ws['!cols']=widths.map(w=>({wch:w}));}

  function operatingSheet(XLSX){const ys=years(),rows=proFormaRows(ys),aoa=sheetTitleRows('PropertyThesis Operating Pro Forma');aoa.push(['Metric',...ys.map(y=>'Year '+y.year)]);rows.forEach(r=>aoa.push([r.label,...r.values.map(v=>finite(v)?n(v):'')]));const ws=XLSX.utils.aoa_to_sheet(aoa);styleWorksheet(ws,[34,...ys.map(()=>15)]);applyCurrencyFormat(ws,`B8:${XLSX.utils.encode_col(ys.length)}${7+rows.length}`);return ws;}
  function taxesSheet(XLSX){const ys=years(),aoa=sheetTitleRows('PropertyThesis Taxes From Operations');aoa.push(['Year','NOI','Interest','Depreciation','Points Amortization','Origination Fee Amortization','Taxable Income','Taxes From Operations','After-Tax Operating Cash Flow']);ys.forEach(y=>aoa.push([y.year,y.noi,y.interest,result?.depreciation,pointsAmort(y),origAmort(y),y.taxable,y.opTax,y.atcf].map((v,i)=>i===0?v:(finite(v)?n(v):''))));const ws=XLSX.utils.aoa_to_sheet(aoa);styleWorksheet(ws,[10,16,16,16,20,22,17,20,23]);applyCurrencyFormat(ws,`B8:I${7+ys.length}`);return ws;}
  function dispositionSheet(XLSX){const hold=Math.max(1,Math.round(n(state?.hold)||1));const gainRate=hold===1?n(state?.ordinaryTax||0):n(state?.capGainsTax||0);const netSale=finite(result?.netSale)?n(result.netSale):NaN;const sellCost=finite(state?.sellCost)?n(state.sellCost):NaN;const grossSale=finite(netSale)&&finite(sellCost)&&sellCost<1?netSale/(1-sellCost):NaN;const sellingExpenses=finite(grossSale)&&finite(netSale)?grossSale-netSale:NaN;const taxesGain=finite(result?.gain)?n(result.gain)*gainRate:NaN;const depTax=finite(result?.accDep)&&finite(state?.depTax)?n(result.accDep)*n(state.depTax):NaN;const aoa=sheetTitleRows('PropertyThesis Disposition & Taxes on Sale');aoa.push(['Disposition Metric','Value']);[['Year of Sale',hold],['Projected Gross Sale Price',grossSale],['Selling Expenses',sellingExpenses],['Net Sales Price',result?.netSale],['Loan Payoff',result?.loanPayoff],['Book Value',result?.book],['Gain / Loss on Sale',result?.gain],['Applicable Gain Tax Rate',gainRate],['Taxes Due on Gain / Loss',taxesGain],['Accumulated Depreciation',result?.accDep],['Depreciation Tax Rate',state?.depTax],['Taxes Due on Depreciation',depTax],['Total Taxes Due on Sale',result?.saleTax],['After-Tax Equity Reversion',result?.ater]].forEach(r=>aoa.push(r.map((v,i)=>i===0?v:(finite(v)?n(v):v??''))));const ws=XLSX.utils.aoa_to_sheet(aoa);styleWorksheet(ws,[34,20]);for(let R=7;R<aoa.length;R++){const label=aoa[R]?.[0]||'',cell=ws[`B${R+1}`];if(!cell||cell.t!=='n')continue;if(/Rate/.test(label))cell.z='0.00%;[Red](0.00%);-';else if(label!=='Year of Sale')cell.z='$#,##0;[Red]($#,##0);-';}return ws;}

  async function downloadExcel(){const btn=document.getElementById('rbDownloadProForma');if(btn){btn.disabled=true;btn.textContent='Preparing Excel...';}try{if(!result?.years?.length)throw new Error('Run the protected analysis before exporting the pro forma.');const XLSX=await ensureXlsx(),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,operatingSheet(XLSX),'Operating Pro Forma');XLSX.utils.book_append_sheet(wb,taxesSheet(XLSX),'Taxes From Operations');XLSX.utils.book_append_sheet(wb,dispositionSheet(XLSX),'Disposition & Sale Tax');wb.Props={Title:'PropertyThesis Pro Forma',Subject:state?.address||state?.name||'Investment Property',Author:'PropertyThesis',Company:'PropertyThesis'};XLSX.writeFile(wb,safeName(),{compression:true});try{if(typeof setStatus==='function')setStatus('Pro forma Excel export generated');}catch(_e){}}catch(e){console.error(e);alert(e?.message||'Unable to generate the pro forma Excel export.');}finally{if(btn){btn.disabled=false;btn.textContent='Download Pro Forma Excel';}}}

  function wrapReport(){const api=window.ReportBuilderV1,fn=api?.renderReport;if(typeof fn!=='function'||fn.__ptProFormaWrapped)return false;const wrapped=function(){const out=fn.apply(this,arguments);setTimeout(()=>{injectControls();applyReport();},0);return out;};wrapped.__ptProFormaWrapped=true;wrapped.__original=fn;api.renderReport=wrapped;if(api.render===fn)api.render=wrapped;return true;}
  function schedule(){[0,80,220].forEach(ms=>setTimeout(()=>{wrapReport();injectControls();applyReport();},ms));}
  function start(){schedule();document.addEventListener('click',e=>{if(e.target?.closest?.('#rbDownloadProForma')){e.preventDefault();e.stopPropagation();downloadExcel();return;}if(e.target?.closest?.('#rbSelectCore,#rbSelectAll')){savePref(true);setTimeout(()=>{const x=document.getElementById('ptIncludeProForma');if(x)x.checked=true;applyReport();},20);}if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbDownloadPdf,[data-hub-report],[data-pt-report]'))schedule();},true);}

  window.PropertyThesisReportProForma={version:VERSION,apply:applyReport,injectControls,downloadExcel,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

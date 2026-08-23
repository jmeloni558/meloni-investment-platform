'use strict';
(()=>{
  const VERSION=3;
  if((window.__propertyThesisReportProFormaV||0)>=VERSION)return;
  window.__propertyThesisReportProFormaV=VERSION;

  const PREF_KEY='propertythesis-report-pro-forma-v1';
  const XLSX_SRC='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const finite=v=>Number.isFinite(Number(v));
  const n=v=>Number(v);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const money=v=>finite(v)?n(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const percent=v=>finite(v)?(n(v)*100).toFixed(2)+'%':'—';

  function loadPref(){try{const x=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');return x.include!==false;}catch(_e){return true;}}
  function savePref(include){try{localStorage.setItem(PREF_KEY,JSON.stringify({include:!!include}));}catch(_e){}}
  function years(limit){try{const a=Array.isArray(result?.years)?result.years:[];return limit?a.slice(0,limit):a.slice();}catch(_e){return [];}}
  function pointsAmort(y){try{return state?.loanYears&&y.year<=state.loanYears?(result?.pointCost||0)/state.loanYears:0;}catch(_e){return 0;}}
  function origAmort(y){try{return state?.loanYears&&y.year<=state.loanYears?(state?.origFee||0)/state.loanYears:0;}catch(_e){return 0;}}

  function cashFlowRows(ys){
    const row=(label,getter,cls='')=>({label,values:ys.map(getter),cls});
    return [
      row('Potential Gross Income',y=>y.pgi),
      row('− Vacancy and Credit Losses',y=>y.vac),
      row('= Effective Gross Income',y=>y.egi,'ptpf-subtotal'),
      row('− Operating Expenses',y=>y.opex),
      row('= Net Operating Income',y=>y.noi,'ptpf-subtotal'),
      row('− Debt Service',y=>y.debt),
      row('= Before-Tax Cash Flow',y=>n(y.noi)-n(y.debt),'ptpf-subtotal'),
      row('− Taxes from Operations',y=>y.opTax),
      row('= After-Tax Cash Flow',y=>y.atcf,'ptpf-total')
    ];
  }

  function taxOperationRows(ys){
    const row=(label,getter)=>({label,values:ys.map(getter)});
    return [
      row('Net Operating Income',y=>y.noi),
      row('− Interest',y=>y.interest),
      row('− Depreciation',()=>result?.depreciation),
      row('− Amortization of Points',y=>pointsAmort(y)),
      row('− Amortization of Origination Fee',y=>origAmort(y)),
      row('= Taxable Income',y=>y.taxable),
      row('× Ordinary Income Tax Rate',()=>state?.ordinaryTax),
      row('= Taxes from Operations',y=>y.opTax)
    ];
  }

  function saleRows(){
    const hold=Math.max(1,Math.round(n(state?.hold)||1));
    const gainRate=hold===1?n(state?.ordinaryTax||0):n(state?.capGainsTax||0);
    const taxesGain=finite(result?.gain)?n(result.gain)*gainRate:NaN;
    const depTax=finite(result?.accDep)&&finite(state?.depTax)?n(result.accDep)*n(state.depTax):NaN;
    return {hold,rows:[
      ['Net Sales Price',result?.netSale,'money'],
      ['− Book Value',result?.book,'money'],
      ['= Gain (Loss) on Sale',result?.gain,'money'],
      ['× Applicable Gain Tax Rate',gainRate,'percent'],
      ['= Taxes Due on Gain/Loss',taxesGain,'money'],
      ['Accumulated Depreciation',result?.accDep,'money'],
      ['× Depreciation Tax Rate',state?.depTax,'percent'],
      ['= Taxes Due on Depreciation',depTax,'money'],
      ['Taxes Due on Sale',result?.saleTax,'money']
    ]};
  }

  function ensureStyles(){
    if(document.getElementById('ptProFormaStyles'))return;
    const st=document.createElement('style');st.id='ptProFormaStyles';st.textContent=`
      #clientReport [data-rb-section="proForma"] .ptpf-table th:first-child,#clientReport [data-rb-section="proForma"] .ptpf-table td:first-child{width:32%;text-align:left;font-weight:700}
      #clientReport [data-rb-section="proForma"] .ptpf-table td{font-variant-numeric:tabular-nums}
      #clientReport [data-rb-section="proForma"] .ptpf-subtotal td{font-weight:800;color:#314a64;background:#fafcfe}
      #clientReport [data-rb-section="proForma"] .ptpf-total td{font-weight:900;color:#173f66;background:#f1f7fc}
      #rbDownloadProForma{min-width:150px}
      #rbControls .pt-hide-tax-detail{display:none!important}
    `;document.head.appendChild(st);
  }

  function removeDetailedTaxReportSections(report){
    if(!report)return;
    for(const section of report.querySelectorAll(':scope > .rb-section')){
      const title=(section.querySelector('.rb-section-head h2')?.textContent||'').replace(/\s+/g,' ').trim();
      if(/^(Detailed )?Taxes From Operations$/i.test(title)||/^(Detailed )?Taxes Due on Sale$/i.test(title))section.remove();
    }
  }

  function buildReportSection(){
    const ys=years(5);if(!ys.length)return null;
    const section=document.createElement('section');section.className='rb-section';section.dataset.rbSection='proForma';
    const rows=cashFlowRows(ys);
    section.innerHTML=`<div class="rb-section-head"><h2>5-Year Projected After-Tax Cash Flow</h2><p>Five-year income statement excerpt from the full holding-period projection. The complete projection and tax schedules are available in the Pro Forma Excel export.</p></div><div class="rb-tablewrap"><table class="ptpf-table"><thead><tr><th>After-Tax Cash Flow (ATCF)</th>${ys.map(y=>`<th>Year ${y.year}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.cls}"><td>${esc(r.label)}</td>${r.values.map(v=>`<td>${money(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return section;
  }

  function applyReport(){
    ensureStyles();
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    removeDetailedTaxReportSections(report);
    report.querySelector('[data-rb-section="proForma"]')?.remove();
    if(!loadPref())return true;
    const section=buildReportSection();if(!section)return false;
    const sections=[...report.querySelectorAll(':scope > .rb-section')];
    const operating=sections.find(s=>/Projected Operating Performance/i.test(s.querySelector('.rb-section-head h2')?.textContent||''));
    const disposition=sections.find(s=>/Disposition & Tax Summary/i.test(s.querySelector('.rb-section-head h2')?.textContent||''));
    if(operating)operating.insertAdjacentElement('afterend',section);
    else if(disposition)disposition.insertAdjacentElement('beforebegin',section);
    else report.querySelector('.rb-footer')?.insertAdjacentElement('beforebegin',section);
    return true;
  }

  function injectControls(){
    ensureStyles();const controls=document.getElementById('rbControls');if(!controls)return false;
    for(const key of ['includeTaxOperations','includeSaleTax']){
      const input=controls.querySelector(`[data-rb-pref="${key}"]`);
      if(input){input.checked=false;input.closest('.rb-toggle')?.classList.add('pt-hide-tax-detail');}
    }
    const toggles=controls.querySelector('.rb-toggle-grid');
    if(toggles&&!document.getElementById('ptIncludeProForma')){
      const label=document.createElement('label');label.className='rb-toggle';label.innerHTML=`<input type="checkbox" id="ptIncludeProForma" ${loadPref()?'checked':''}><span>5-Year Projected After-Tax Cash Flow</span>`;
      toggles.appendChild(label);label.querySelector('input')?.addEventListener('change',e=>{savePref(e.target.checked);applyReport();});
    }
    const actions=controls.querySelector('.rb-actions');
    if(actions&&!document.getElementById('rbDownloadProForma')){
      const b=document.createElement('button');b.type='button';b.id='rbDownloadProForma';b.className='btn secondary';b.textContent='Download Pro Forma Excel';actions.appendChild(b);
    }
    return true;
  }

  function ensureXlsx(){
    if(window.XLSX)return Promise.resolve(window.XLSX);if(window.__ptXlsxPromise)return window.__ptXlsxPromise;
    window.__ptXlsxPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=XLSX_SRC;s.async=true;s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Excel export library did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the Excel export library.'));document.head.appendChild(s);});return window.__ptXlsxPromise;
  }
  function safeName(){try{return ((state?.address||state?.name||'PropertyThesis').trim().replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,65)||'PropertyThesis')+'-Pro-Forma.xlsx';}catch(_e){return'PropertyThesis-Pro-Forma.xlsx';}}
  function sheetTitleRows(title){return [[title],[state?.address||state?.name||'Income-Producing Property'],['Source','PropertyThesis protected calculation engine outputs'],['Acquisition Price',finite(state?.price)?n(state.price):''],['Holding Period (Years)',finite(state?.hold)?n(state.hold):''],[]];}
  function styleWorksheet(ws,widths){ws['!cols']=widths.map(w=>({wch:w}));}
  function formatCurrencyRange(XLSX,ws,range){const r=XLSX.utils.decode_range(range);for(let R=r.s.r;R<=r.e.r;R++)for(let C=r.s.c;C<=r.e.c;C++){const cell=ws[XLSX.utils.encode_cell({r:R,c:C})];if(cell&&cell.t==='n')cell.z='$#,##0;[Red]($#,##0);-';}}

  function cashFlowSheet(XLSX){
    const ys=years(),rows=cashFlowRows(ys),aoa=sheetTitleRows('Projected After-Tax Cash Flow');
    aoa.push(['After-Tax Cash Flow (ATCF)',...ys.map(y=>'Year '+y.year)]);
    rows.forEach(r=>aoa.push([r.label,...r.values.map(v=>finite(v)?n(v):'')]));
    const ws=XLSX.utils.aoa_to_sheet(aoa);styleWorksheet(ws,[34,...ys.map(()=>15)]);formatCurrencyRange(XLSX,ws,`B8:${XLSX.utils.encode_col(ys.length)}${7+rows.length}`);return ws;
  }

  function taxesSheet(XLSX){
    const ys=years(),rows=taxOperationRows(ys),aoa=sheetTitleRows('Taxes From Operations');
    aoa.push(['Taxes From Operations',...ys.map(y=>'Year '+y.year)]);
    rows.forEach(r=>aoa.push([r.label,...r.values.map(v=>finite(v)?n(v):'')]));
    const ws=XLSX.utils.aoa_to_sheet(aoa);styleWorksheet(ws,[38,...ys.map(()=>15)]);
    const start=8,end=7+rows.length,lastCol=XLSX.utils.encode_col(ys.length);
    formatCurrencyRange(XLSX,ws,`B${start}:${lastCol}${end}`);
    const rateRow=7+rows.findIndex(r=>/^× Ordinary Income Tax Rate/.test(r.label))+1;
    for(let C=1;C<=ys.length;C++){const cell=ws[XLSX.utils.encode_cell({r:rateRow-1,c:C})];if(cell&&cell.t==='n')cell.z='0.00%';}
    return ws;
  }

  function saleSheet(XLSX){
    const data=saleRows(),aoa=sheetTitleRows('Taxes Due on Sale');
    aoa.push(['Taxes Due on Sale',`Year ${data.hold} of Ownership`]);
    data.rows.forEach(([label,value])=>aoa.push([label,finite(value)?n(value):'']));
    const ws=XLSX.utils.aoa_to_sheet(aoa);styleWorksheet(ws,[40,22]);
    data.rows.forEach(([label,_value,type],i)=>{const cell=ws[`B${8+i}`];if(!cell||cell.t!=='n')return;cell.z=type==='percent'?'0.00%':'$#,##0;[Red]($#,##0);-';});
    return ws;
  }

  async function downloadExcel(){
    const btn=document.getElementById('rbDownloadProForma');if(btn){btn.disabled=true;btn.textContent='Preparing Excel...';}
    try{
      if(!result?.years?.length)throw new Error('Run the protected analysis before exporting the pro forma.');
      const XLSX=await ensureXlsx(),wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,cashFlowSheet(XLSX),'Projected After-Tax CF');
      XLSX.utils.book_append_sheet(wb,taxesSheet(XLSX),'Taxes From Operations');
      XLSX.utils.book_append_sheet(wb,saleSheet(XLSX),'Taxes Due on Sale');
      wb.Props={Title:'PropertyThesis Pro Forma',Subject:state?.address||state?.name||'Investment Property',Author:'PropertyThesis',Company:'PropertyThesis'};
      XLSX.writeFile(wb,safeName(),{compression:true});
      try{if(typeof setStatus==='function')setStatus('Pro forma Excel export generated');}catch(_e){}
    }catch(e){console.error(e);alert(e?.message||'Unable to generate the pro forma Excel export.');}
    finally{if(btn){btn.disabled=false;btn.textContent='Download Pro Forma Excel';}}
  }

  function wrapReport(){const api=window.ReportBuilderV1,fn=api?.renderReport;if(typeof fn!=='function'||fn.__ptProFormaWrapped)return false;const wrapped=function(){const out=fn.apply(this,arguments);setTimeout(()=>{injectControls();applyReport();},0);return out;};wrapped.__ptProFormaWrapped=true;wrapped.__original=fn;api.renderReport=wrapped;if(api.render===fn)api.render=wrapped;return true;}
  function schedule(){[0,80,220].forEach(ms=>setTimeout(()=>{wrapReport();injectControls();applyReport();},ms));}
  function start(){schedule();document.addEventListener('click',e=>{
    if(e.target?.closest?.('#rbDownloadProForma')){e.preventDefault();e.stopPropagation();downloadExcel();return;}
    if(e.target?.closest?.('#rbSelectCore,#rbSelectAll')){savePref(true);setTimeout(()=>{const x=document.getElementById('ptIncludeProForma');if(x)x.checked=true;injectControls();applyReport();},20);}
    if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbDownloadPdf,[data-hub-report],[data-pt-report]'))schedule();
  },true);}

  window.PropertyThesisReportProForma={version:VERSION,apply:applyReport,injectControls,downloadExcel,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

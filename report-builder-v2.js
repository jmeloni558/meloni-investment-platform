'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV2Version||0)>=VERSION)return;
  window.__reportBuilderV2Version=VERSION;

  function injectStyles(){
    if(document.getElementById('reportBuilderV2Styles'))return;
    const st=document.createElement('style');
    st.id='reportBuilderV2Styles';
    st.textContent=`
      #rbControls .rb-export-note{margin-top:8px;font-size:9px;line-height:1.45;color:#667085}
      #rbControls .rb-pass2-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      #clientReport .rb-report{box-shadow:0 10px 30px rgba(23,79,131,.06)}
      #clientReport .rb-cover{position:relative}
      #clientReport .rb-cover:after{content:'';position:absolute;left:30px;right:30px;bottom:0;height:3px;background:#174f83;border-radius:3px}
      #clientReport .rb-brand{letter-spacing:.16em}
      #clientReport .rb-conclusion{border-left-width:5px}
      #clientReport .rb-section-head h2{letter-spacing:-.01em}
      #clientReport .rb-footer{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
      #clientReport .rb-footer .rb-footer-brand{font-weight:800;color:#475467;white-space:nowrap}
      @media print{
        @page{size:Letter portrait;margin:.46in .48in .5in}
        html,body{background:#fff!important}
        body{margin:0!important;padding:0!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        body *{visibility:hidden!important}
        #report,#report *{visibility:visible!important}
        #report{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;margin:0!important;padding:0!important}
        #report.section{display:block!important}
        #report .screen-only,#report #rbControls,#report .toolbar,#report #stage5ReportControls{display:none!important}
        #clientReport{display:block!important;width:100%!important;margin:0!important;padding:0!important}
        #clientReport .rb-report{border:none!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;width:100%!important}
        #clientReport .rb-cover{padding:18pt 20pt 15pt!important;background:#f7f9fb!important;border-bottom:1px solid #d9e1ea!important}
        #clientReport .rb-cover:after{left:20pt!important;right:20pt!important;height:2pt!important;background:#174f83!important}
        #clientReport .rb-cover h1{font-size:21pt!important;margin:6pt 0 4pt!important}
        #clientReport .rb-cover .address{font-size:10pt!important}
        #clientReport .rb-brand{font-size:8pt!important}
        #clientReport .rb-meta{font-size:7.5pt!important;gap:4pt 12pt!important;margin-top:10pt!important}
        #clientReport .rb-conclusion{margin:12pt 20pt 0!important;padding:10pt 12pt!important;background:#f4f7fa!important;break-inside:avoid!important;page-break-inside:avoid!important}
        #clientReport .rb-conclusion h2{font-size:10.5pt!important}
        #clientReport .rb-conclusion p{font-size:8.5pt!important;line-height:1.45!important}
        #clientReport .rb-section{padding:13pt 20pt!important;border-top:1px solid #e6ebf0!important;break-inside:auto!important}
        #clientReport .rb-section-head{margin-bottom:8pt!important;break-after:avoid!important;page-break-after:avoid!important}
        #clientReport .rb-section-head h2{font-size:11pt!important}
        #clientReport .rb-section-head p{font-size:7.5pt!important}
        #clientReport .rb-stats{grid-template-columns:repeat(4,1fr)!important;gap:5pt!important}
        #clientReport .rb-stat{padding:6pt!important;border-radius:5pt!important;break-inside:avoid!important;page-break-inside:avoid!important}
        #clientReport .rb-stat span{font-size:6.7pt!important}
        #clientReport .rb-stat b{font-size:10.5pt!important;margin-top:2pt!important}
        #clientReport .rb-stat small{font-size:6.2pt!important}
        #clientReport .rb-two{gap:8pt!important}
        #clientReport .rb-panel{padding:8pt!important;border-radius:5pt!important;break-inside:avoid!important;page-break-inside:avoid!important}
        #clientReport .rb-panel h3{font-size:8.5pt!important}
        #clientReport .rb-row{font-size:7.2pt!important;padding:4pt 0!important}
        #clientReport .rb-tablewrap{overflow:visible!important;border-radius:4pt!important}
        #clientReport table{font-size:6.7pt!important;width:100%!important}
        #clientReport thead{display:table-header-group!important}
        #clientReport tr{break-inside:avoid!important;page-break-inside:avoid!important}
        #clientReport th,#clientReport td{padding:4pt 4.5pt!important;white-space:nowrap!important}
        #clientReport .rb-footer{padding:10pt 20pt 12pt!important;font-size:6.5pt!important;background:#fafbfd!important;break-inside:avoid!important;page-break-inside:avoid!important}
        #clientReport [data-rb-section="detailedCashflow"],
        #clientReport [data-rb-section="taxOperations"],
        #clientReport [data-rb-section="saleTax"],
        #clientReport [data-rb-section="investmentCashflow"]{break-before:page!important;page-break-before:always!important}
        #clientReport [data-rb-section="investmentCashflow"] table{font-size:5.8pt!important}
      }
    `;
    document.head.appendChild(st);
  }

  function decorateFooter(){
    const footer=document.querySelector('#clientReport .rb-footer');
    if(!footer||footer.dataset.v2==='1')return;
    footer.dataset.v2='1';
    const current=footer.innerHTML;
    footer.innerHTML=`<div>${current}</div><div class="rb-footer-brand">Meloni Realty</div>`;
  }

  function addExportControls(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    const badge=controls.querySelector('.badge');
    if(badge)badge.textContent='Page 3 • Pass 2';
    if(document.getElementById('rbPrintReport'))return true;
    const actions=controls.querySelector('.rb-actions')||controls;
    const row=document.createElement('div');
    row.className='rb-pass2-actions';
    row.innerHTML=`<button type="button" class="btn primary" id="rbPrintReport">Print / Save PDF</button><button type="button" class="btn secondary" id="rbRefreshExport">Refresh & Print</button>`;
    actions.insertAdjacentElement('afterend',row);
    const note=document.createElement('div');
    note.className='rb-export-note';
    note.textContent='Print / Save PDF uses the current report-section selections. In the browser print dialog, choose Save as PDF for a client-ready PDF file.';
    row.insertAdjacentElement('afterend',note);
    document.getElementById('rbPrintReport').addEventListener('click',()=>window.print());
    document.getElementById('rbRefreshExport').addEventListener('click',()=>{
      if(window.ReportBuilderV1?.renderReport)window.ReportBuilderV1.renderReport();
      setTimeout(()=>window.print(),40);
    });
    return true;
  }

  function apply(){
    injectStyles();
    addExportControls();
    decorateFooter();
    return true;
  }

  const oldRender=window.ReportBuilderV1?.renderReport;
  if(typeof oldRender==='function'&&!oldRender.__pass2Wrapped){
    const wrapped=function(...args){
      const out=oldRender.apply(this,args);
      setTimeout(apply,0);
      return out;
    };
    wrapped.__pass2Wrapped=true;
    window.ReportBuilderV1.renderReport=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="report"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReportBuilderV2={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

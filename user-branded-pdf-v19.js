'use strict';
(()=>{
  const VERSION=19;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis';
  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const CAPTURE_WIDTH=816,PAGE_W=612,PAGE_H=792,MARGIN_X=24,TOP=24,FOOTER=44,BOTTOM=10;
  let running=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};
  const withTimeout=(promise,ms,msg)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(msg)),ms))]);
  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}
  async function ensureHtml2Canvas(){
    if(window.html2canvas)return window.html2canvas;
    if(!window.__ptHtml2CanvasPromise){window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF renderer.'));document.head.appendChild(s);});}
    return withTimeout(window.__ptHtml2CanvasPromise,15000,'PDF renderer load timed out.');
  }
  async function prepare(){
    status('Preparing report for PDF…');
    try{window.ReportBuilderV1?.renderReport?.();}catch(_e){}
    await sleep(120);
    const calls=[
      ()=>window.ReportBuilderV8?.apply?.(),
      ()=>window.ReportBuilderV8Presentation?.apply?.(),
      ()=>window.ReportAssumptionsNarrative?.apply?.(),
      ()=>window.ReportDetailOrder?.apply?.(),
      ()=>window.ReportSensitivityAnalysis?.apply?.(),
      ()=>window.ReportInvestmentOfferAnalysis?.apply?.(),
      ()=>window.ReportMarketRentSupport?.apply?.(),
      ()=>window.ReportMarketRentUnderwriting?.apply?.(),
      ()=>window.ReportExecutiveConclusionCurrent?.apply?.(),
      ()=>window.PropertyThesisMarketRentConclusion?.enhanceReport?.(),
      ()=>window.UserBranding?.applyReportBranding?.(),
      ()=>window.PropertyThesisReportBranding?.apply?.()
    ];
    calls.forEach(fn=>{try{fn();}catch(_e){}});
    await sleep(220);
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)throw new Error('Report preview is not available.');
    return report;
  }
  function makeClone(source){
    const host=document.getElementById('clientReport');if(!host)throw new Error('Client report container is unavailable.');
    const c=source.cloneNode(true);c.classList.add('pt-pdf-capture-v19');c.setAttribute('aria-hidden','true');
    Object.assign(c.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',margin:'0',zIndex:'-1',background:'#fff',boxShadow:'none',borderRadius:'0',overflow:'visible'});
    c.querySelector(':scope > .rb-footer')?.remove();
    c.querySelectorAll('.rb-tablewrap').forEach(x=>{x.style.overflow='visible';x.style.maxWidth='100%';});
    c.querySelectorAll('table').forEach(x=>{x.style.width='100%';x.style.tableLayout='fixed';});
    c.querySelectorAll('th,td').forEach(x=>{x.style.whiteSpace='normal';x.style.overflowWrap='anywhere';});
    host.appendChild(c);return c;
  }
  function addFooter(doc,page,total,p){
    const company=(p.company_name||p.full_name||'').trim(),y=PAGE_H-30;
    doc.setFillColor(255,255,255);doc.rect(0,PAGE_H-FOOTER,PAGE_W,FOOTER,'F');
    doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-8,PAGE_W-28,y-8);
    doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+4);
    doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,PAGE_W-28,y+4,{align:'right'});
  }
  function sliceIntoPdf(doc,canvas){
    const usableW=PAGE_W-MARGIN_X*2,usableH=PAGE_H-TOP-FOOTER-BOTTOM,ptPerPx=usableW/canvas.width,slicePx=Math.max(1,Math.floor(usableH/ptPerPx));
    const total=Math.ceil(canvas.height/slicePx);
    for(let i=0;i<total;i++){
      if(i>0)doc.addPage();
      const sy=i*slicePx,sh=Math.min(slicePx,canvas.height-sy),part=document.createElement('canvas');part.width=canvas.width;part.height=sh;
      const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);ctx.drawImage(canvas,0,sy,canvas.width,sh,0,0,canvas.width,sh);
      doc.addImage(part.toDataURL('image/jpeg',0.96),'JPEG',MARGIN_X,TOP,usableW,sh*ptPerPx,undefined,'FAST');
    }
    return total;
  }
  async function generate(){
    if(running)return false;running=true;
    const btn=document.getElementById('rbDownloadPdf'),old=btn?.textContent||'Download PDF';let clone=null;
    if(btn){btn.disabled=true;btn.textContent='Generating PDF…';}
    try{
      const source=await withTimeout(prepare(),5000,'Report preparation timed out.');
      await ensureHtml2Canvas();
      const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');
      clone=makeClone(source);await sleep(120);
      const r=clone.getBoundingClientRect(),scale=r.height>12000?1:1.35;
      status('Rendering report image…');
      const canvas=await withTimeout(window.html2canvas(clone,{scale,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:Math.ceil(r.width),height:Math.ceil(r.height),windowWidth:CAPTURE_WIDTH}),45000,'PDF rendering timed out. Please reduce report detail and try again.');
      if(!canvas?.width||!canvas?.height)throw new Error('PDF renderer returned an empty report image.');
      status('Building PDF pages…');
      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true}),p=profile();
      doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      const total=sliceIntoPdf(doc,canvas);for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}doc.save(filename());status('PDF generated successfully.');return true;
    }catch(e){console.error('PropertyThesis PDF export failed',e);status(e?.message||'Unable to generate PDF.');try{alert(e?.message||'Unable to generate PDF.');}catch(_e){}return false;
    }finally{clone?.remove();running=false;if(btn){btn.disabled=false;btn.textContent=old==='Generating PDF…'?'Download PDF':old;}}
  }
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate,version:VERSION};
})();
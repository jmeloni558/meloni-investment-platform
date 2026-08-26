'use strict';
(() => {
  const VERSION=29;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;

  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis';
  const CAPTURE_WIDTH=816,CAPTURE_SCALE=1.35,JPEG_QUALITY=.94,FOOTER_H=48,TOP_PAD=24,BOTTOM_PAD=10,PAGE_GAP=10,SIDE_PAD=22,ROW_PAD=30,ROW_BLEED=5;

  function prof(){return window.UserBranding?.getProfile?.()||{};}
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}
  function status(msg){if(typeof setStatus==='function')setStatus(msg);}
  function ensureHtml2Canvas(){if(window.html2canvas)return Promise.resolve(window.html2canvas);if(window.__ptHtml2CanvasPromise)return window.__ptHtml2CanvasPromise;window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF preview renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF preview renderer.'));document.head.appendChild(s);});return window.__ptHtml2CanvasPromise;}

  function ensureCaptureStyles(){let s=document.getElementById('ptPdfCaptureStyles');if(!s){s=document.createElement('style');s.id='ptPdfCaptureStyles';document.head.appendChild(s);}s.textContent=`
    #clientReport .pt-pdf-capture{overflow:visible!important;background:#fff!important}
    #clientReport .pt-pdf-capture>.rb-footer{display:none!important}
    #clientReport .pt-pdf-capture .rb-section{box-shadow:none!important;border-color:transparent!important;border-radius:0!important}
    #clientReport .pt-pdf-capture .rb-analysis-summary,#clientReport .pt-pdf-capture .rb-final-conclusion{border-left-color:inherit!important}
    #clientReport .pt-pdf-capture .rb-tablewrap{display:block!important;width:100%!important;max-width:100%!important;overflow:visible!important;position:static!important;transform:none!important}
    #clientReport .pt-pdf-capture table{display:table!important;width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;position:static!important;transform:none!important;margin:0!important}
    #clientReport .pt-pdf-capture thead{display:table-header-group!important}#clientReport .pt-pdf-capture tbody{display:table-row-group!important}#clientReport .pt-pdf-capture tr{display:table-row!important;position:static!important;transform:none!important}
    #clientReport .pt-pdf-capture th,#clientReport .pt-pdf-capture td{display:table-cell!important;position:static!important;left:auto!important;right:auto!important;float:none!important;transform:none!important;min-width:0!important;max-width:none!important;width:auto!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;padding:6px 4px!important;font-size:8.5px!important;line-height:1.22!important;vertical-align:middle!important}
    #clientReport .pt-pdf-row-capture{box-sizing:border-box!important;overflow:visible!important;background:#fff!important}
    #clientReport .pt-pdf-row-capture>*{box-sizing:border-box!important;margin:0!important}
  `;}

  async function preparePreview(){
    window.ReportBuilderV1?.renderReport?.();
    await new Promise(r=>setTimeout(r,180));
    window.ReportBuilderV8?.apply?.();
    window.ReportAssumptionsNarrative?.apply?.();
    window.ReportMarketRentSupport?.apply?.();
    window.ReportMarketRentUnderwriting?.apply?.();
    window.ReportExecutiveConclusionCurrent?.apply?.();
    window.PropertyThesisMarketRentConclusion?.enhanceReport?.();
    window.ReportSalesComparables?.apply?.();
    window.UserBranding?.applyReportBranding?.();
    window.PropertyThesisReportBranding?.apply?.();
    await new Promise(r=>setTimeout(r,160));
    window.ReportMarketRentSupport?.apply?.();
    window.ReportMarketRentUnderwriting?.apply?.();
    window.ReportExecutiveConclusionCurrent?.apply?.();
    window.PropertyThesisMarketRentConclusion?.enhanceReport?.();
    window.ReportSalesComparables?.apply?.();
    await new Promise(r=>setTimeout(r,220));
  }
  function makeClone(source){ensureCaptureStyles();const host=document.getElementById('clientReport');if(!host)throw new Error('Client report container is unavailable.');const clone=source.cloneNode(true);clone.classList.add('pt-pdf-capture');clone.setAttribute('aria-hidden','true');Object.assign(clone.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',zIndex:'-1',transform:'none',overflow:'visible'});host.appendChild(clone);return clone;}

  function visualRows(elements){const items=[...elements].map(el=>({el,r:el.getBoundingClientRect()})).sort((a,b)=>a.r.top-b.r.top||a.r.left-b.r.left),rows=[];let row=[];for(const item of items){if(!row.length||Math.abs(item.r.top-row[0].r.top)<8)row.push(item);else{rows.push(row.map(x=>x.el));row=[item];}}if(row.length)rows.push(row.map(x=>x.el));return rows;}
  function statRows(section){return visualRows(section.querySelectorAll('.rb-stat'));}

  function items(report){const out=[];const add=(kind,els,gap=10,keepNext=false)=>{const arr=(Array.isArray(els)?els:[els]).filter(Boolean);if(arr.length)out.push({kind,els:arr,gap,keepNext});};
    add('full',report.querySelector(':scope > .rb-cover'),0);
    add('full',report.querySelector(':scope > .rb-conclusion'),12);
    add('full',report.querySelector(':scope > .rb-findings'),12);
    for(const section of report.querySelectorAll(':scope > .rb-section')){
      const head=section.querySelector(':scope > .rb-section-head');add('full',head,18,true);
      if(section.matches('.rb-analysis-summary,[data-rb-section="analysisSummary"]')){
        for(const el of section.querySelectorAll(':scope > .rb-summary-block'))add('full',el,10);
        add('full',section.querySelector(':scope > .rb-conclusion-box'),10);continue;
      }
      if(section.matches('.rb-final-conclusion,[data-rb-section="finalConclusion"]')){
        const ps=[...section.querySelectorAll('.rb-final-copy > p')];if(ps.length){for(const p of ps)add('full',p,12);}else add('full',section.querySelector('.rb-final-copy'),10);continue;
      }
      add('full',section.querySelector('.rb-analysis-copy'),10);
      add('full',section.querySelector('.ptmri-report-conclusion'),10);
      for(const row of statRows(section))add('row',row,9);
      const tables=[...section.querySelectorAll('.rb-tablewrap')];
      const panels=[...section.querySelectorAll('.rb-panel')].filter(panel=>!tables.some(table=>panel.contains(table)));
      if(panels.length){for(const row of visualRows(panels))add('row',row,10);}
      for(const table of tables)add('full',table,10);
    }
    return out;
  }

  async function snap(el){const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return null;return window.html2canvas(el,{scale:CAPTURE_SCALE,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:Math.ceil(r.width),height:Math.ceil(r.height),windowWidth:CAPTURE_WIDTH});}

  async function snapRow(els){
    const rects=els.map(el=>el.getBoundingClientRect()),left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top)),right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
    const width=Math.ceil(right-left),height=Math.ceil(bottom-top),host=document.getElementById('clientReport');
    const wrap=document.createElement('div');wrap.className='pt-pdf-row-capture';wrap.setAttribute('aria-hidden','true');
    Object.assign(wrap.style,{position:'fixed',left:'-14000px',top:'0',width:(width+ROW_BLEED*2)+'px',height:(height+ROW_BLEED*2)+'px',zIndex:'-2',overflow:'visible',background:'#fff'});
    els.forEach((el,i)=>{const r=rects[i],c=el.cloneNode(true);Object.assign(c.style,{position:'absolute',left:(r.left-left+ROW_BLEED)+'px',top:(r.top-top+ROW_BLEED)+'px',width:r.width+'px',height:r.height+'px',margin:'0',transform:'none'});wrap.appendChild(c);});
    host.appendChild(wrap);
    try{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const canvas=await window.html2canvas(wrap,{scale:CAPTURE_SCALE,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:width+ROW_BLEED*2,height:height+ROW_BLEED*2,windowWidth:CAPTURE_WIDTH});return{canvas,left,top,right,bottom,width,height};}finally{wrap.remove();}
  }

  function addFooter(doc,page,total,p){const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),y=h-34,company=(p.company_name||p.full_name||'').trim();doc.setFillColor(255,255,255);doc.rect(0,h-FOOTER_H,w,FOOTER_H,'F');doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-5,w-28,y-5);doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+8);doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,w-28,y+8,{align:'right'});}

  async function render(doc,report,list){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),reportRect=report.getBoundingClientRect(),reportW=reportRect.width;
    const scalePt=(pageW-(SIDE_PAD*2))/reportW,bodyBottom=pageH-FOOTER_H-BOTTOM_PAD;let page=1,y=0;
    const baseX=SIDE_PAD;
    const newPage=()=>{doc.addPage();page++;y=TOP_PAD;};
    const BATCH_SIZE=6;
    for(let start=0;start<list.length;start+=BATCH_SIZE){
      const batch=list.slice(start,start+BATCH_SIZE);
      const captured=await Promise.all(batch.map(async it=>{
        if(it.kind==='row')return{it,row:await snapRow(it.els)};
        const el=it.els[0],rect=el.getBoundingClientRect();
        return{it,rect,canvas:await snap(el)};
      }));
      for(let offset=0;offset<captured.length;offset++){
      const i=start+offset,{it,row,rect:r,canvas:c}=captured[offset];
      if(it.kind==='row'){
        if(!row)continue;
        const rightExtent=Math.max(1,row.right-reportRect.left+ROW_BLEED),rowScale=Math.min(scalePt,(pageW-(ROW_PAD*2))/rightExtent),hPt=(row.height+ROW_BLEED*2)*rowScale,gapPt=it.gap;
        let nextExtra=0;if(it.keepNext&&list[i+1]){const nr=list[i+1].els[0].getBoundingClientRect();nextExtra=(nr.height*scalePt)+PAGE_GAP;}
        if(y+gapPt+hPt+nextExtra>bodyBottom&&y>TOP_PAD+4)newPage();y+=gapPt;
        const x=ROW_PAD+(row.left-reportRect.left-ROW_BLEED)*rowScale,w=(row.width+ROW_BLEED*2)*rowScale;
        doc.addImage(row.canvas.toDataURL('image/jpeg',JPEG_QUALITY),'JPEG',x,y,w,hPt,undefined,'FAST');
        row.canvas.width=row.canvas.height=1;
        y+=hPt;continue;
      }
      if(!c)continue;
      const wPt=r.width*scalePt,hPt=r.height*scalePt,xPt=baseX+(r.left-reportRect.left)*scalePt,gapPt=it.gap;
      let nextExtra=0;if(it.keepNext&&list[i+1]){const nr=list[i+1].els[0].getBoundingClientRect();nextExtra=(nr.height*scalePt)+PAGE_GAP;}
      const fullPageCapacity=bodyBottom-TOP_PAD;
      if(hPt<=fullPageCapacity){if(y+gapPt+hPt+nextExtra>bodyBottom&&y>TOP_PAD+4)newPage();y+=gapPt;doc.addImage(c.toDataURL('image/jpeg',JPEG_QUALITY),'JPEG',xPt,y,wPt,hPt,undefined,'FAST');y+=hPt;}
      else{
        let sy=0;const pxPerPt=c.width/wPt;
        while(sy<c.height-1){if(y>TOP_PAD+4)newPage();const avail=bodyBottom-y;const take=Math.min(c.height-sy,Math.floor(avail*pxPerPt));if(take<10){newPage();continue;}const part=document.createElement('canvas');part.width=c.width;part.height=take;const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);ctx.drawImage(c,0,sy,c.width,take,0,0,c.width,take);const ph=take/pxPerPt;doc.addImage(part.toDataURL('image/jpeg',JPEG_QUALITY),'JPEG',xPt,y,wPt,ph,undefined,'FAST');y+=ph;sy+=take;if(sy<c.height)newPage();}
      }
      c.width=c.height=1;
      }
    }
  }

  async function generate(){const btn=document.getElementById('rbDownloadPdf');if(btn){btn.disabled=true;btn.textContent='Generating PDF...';}let clone=null;try{await preparePreview();await ensureHtml2Canvas();const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');const source=document.querySelector('#clientReport .rb-report');if(!source)throw new Error('Report preview is not available.');clone=makeClone(source);await new Promise(r=>setTimeout(r,260));const list=items(clone);if(!list.length)throw new Error('Report components could not be prepared.');const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true}),p=prof();doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});await render(doc,clone,list);const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}doc.save(filename());status('PDF generated with historical row renderer');}catch(e){console.error(e);status(e?.message||'Unable to generate PDF');alert(e?.message||'Unable to generate PDF.');}finally{clone?.remove();if(btn){btn.disabled=false;btn.textContent='Download PDF';}}}

  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"]'))ensureHtml2Canvas().catch(()=>{});},true);
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate,version:VERSION};
})();

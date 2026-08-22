'use strict';
(() => {
  const VERSION=13;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;

  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis';
  const CAPTURE_WIDTH=816,FOOTER_H=48,TOP_PAD=24,BOTTOM_PAD=10,PAGE_GAP=10,SIDE_PAD=28;

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
  `;}

  async function preparePreview(){window.ReportBuilderV1?.renderReport?.();await new Promise(r=>setTimeout(r,180));window.ReportBuilderV8?.apply?.();window.ReportAssumptionsNarrative?.apply?.();window.UserBranding?.applyReportBranding?.();window.PropertyThesisReportBranding?.apply?.();await new Promise(r=>setTimeout(r,220));}
  function makeClone(source){ensureCaptureStyles();const host=document.getElementById('clientReport');if(!host)throw new Error('Client report container is unavailable.');const clone=source.cloneNode(true);clone.classList.add('pt-pdf-capture');clone.setAttribute('aria-hidden','true');Object.assign(clone.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',zIndex:'-1',transform:'none',overflow:'visible'});host.appendChild(clone);return clone;}

  function statRows(section){const stats=[...section.querySelectorAll('.rb-stat')].map(el=>({el,r:el.getBoundingClientRect()})).sort((a,b)=>a.r.top-b.r.top||a.r.left-b.r.left);const rows=[];let row=[];for(const item of stats){if(!row.length||Math.abs(item.r.top-row[0].r.top)<8)row.push(item);else{rows.push(row.map(x=>x.el));row=[item];}}if(row.length)rows.push(row.map(x=>x.el));return rows;}

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
      for(const row of statRows(section))add('row',row,9);
      const tables=[...section.querySelectorAll('.rb-tablewrap')];
      const panels=[...section.querySelectorAll('.rb-panel')].filter(panel=>!tables.some(table=>panel.contains(table)));
      for(const panel of panels)add('full',panel,10);
      for(const table of tables)add('full',table,10);
    }
    return out;
  }

  async function snap(el){const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return null;return window.html2canvas(el,{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:Math.ceil(r.width),height:Math.ceil(r.height),windowWidth:CAPTURE_WIDTH});}

  function addFooter(doc,page,total,p){const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),y=h-34,company=(p.company_name||p.full_name||'').trim();doc.setFillColor(255,255,255);doc.rect(0,h-FOOTER_H,w,FOOTER_H,'F');doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-5,w-28,y-5);doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+8);doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,w-28,y+8,{align:'right'});}

  async function render(doc,report,list){const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),reportRect=report.getBoundingClientRect(),reportW=reportRect.width,scalePt=pageW/reportW,contentW=pageW-(SIDE_PAD*2),bodyBottom=pageH-FOOTER_H-BOTTOM_PAD;let page=1,y=0;
    const newPage=()=>{doc.addPage();page++;y=TOP_PAD;};
    for(let i=0;i<list.length;i++){
      const it=list[i];
      if(it.kind==='row'){
        const rects=it.els.map(el=>el.getBoundingClientRect());const rowTop=Math.min(...rects.map(r=>r.top)),rowBottom=Math.max(...rects.map(r=>r.bottom)),rowLeft=Math.min(...rects.map(r=>r.left)),rowRight=Math.max(...rects.map(r=>r.right)),rowWidth=Math.max(1,rowRight-rowLeft),rowScale=contentW/rowWidth;const hPt=(rowBottom-rowTop)*rowScale,gapPt=it.gap;
        let nextExtra=0;if(it.keepNext&&list[i+1]){const nr=list[i+1].els[0].getBoundingClientRect();nextExtra=(nr.height*scalePt)+PAGE_GAP;}
        if(y+gapPt+hPt+nextExtra>bodyBottom&&y>TOP_PAD+4)newPage();y+=gapPt;
        for(let j=0;j<it.els.length;j++){const el=it.els[j],r=rects[j],c=await snap(el);if(!c)continue;const x=SIDE_PAD+(r.left-rowLeft)*rowScale,w=r.width*rowScale,h=r.height*rowScale;doc.addImage(c.toDataURL('image/jpeg',0.98),'JPEG',x,y+(r.top-rowTop)*rowScale,w,h,undefined,'FAST');}
        y+=hPt;continue;
      }
      const el=it.els[0],r=el.getBoundingClientRect();let wPt=r.width*scalePt,hPt=r.height*scalePt,xPt=(r.left-reportRect.left)*scalePt,gapPt=it.gap;
      if(xPt<SIDE_PAD)xPt=SIDE_PAD;
      const maxRight=pageW-SIDE_PAD;
      if(xPt+wPt>maxRight){const ratio=Math.max(.1,(maxRight-xPt)/wPt);wPt*=ratio;hPt*=ratio;}
      let nextExtra=0;if(it.keepNext&&list[i+1]){const nr=list[i+1].els[0].getBoundingClientRect();nextExtra=(nr.height*scalePt)+PAGE_GAP;}
      const fullPageCapacity=bodyBottom-TOP_PAD;
      if(hPt<=fullPageCapacity){if(y+gapPt+hPt+nextExtra>bodyBottom&&y>TOP_PAD+4)newPage();y+=gapPt;const c=await snap(el);if(c)doc.addImage(c.toDataURL('image/jpeg',0.98),'JPEG',xPt,y,wPt,hPt,undefined,'FAST');y+=hPt;}
      else{
        const c=await snap(el);if(!c)continue;let sy=0;const pxPerPt=c.width/wPt;
        while(sy<c.height-1){if(y>TOP_PAD+4)newPage();const avail=bodyBottom-y;const take=Math.min(c.height-sy,Math.floor(avail*pxPerPt));if(take<10){newPage();continue;}const part=document.createElement('canvas');part.width=c.width;part.height=take;const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);ctx.drawImage(c,0,sy,c.width,take,0,0,c.width,take);const ph=take/pxPerPt;doc.addImage(part.toDataURL('image/jpeg',0.98),'JPEG',xPt,y,wPt,ph,undefined,'FAST');y+=ph;sy+=take;if(sy<c.height)newPage();}
      }
    }
  }

  async function generate(){const btn=document.getElementById('rbDownloadPdf');if(btn){btn.disabled=true;btn.textContent='Generating PDF...';}let clone=null;try{await preparePreview();await ensureHtml2Canvas();const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');const source=document.querySelector('#clientReport .rb-report');if(!source)throw new Error('Report preview is not available.');clone=makeClone(source);window.ReportAssumptionsNarrative?.apply?.();await new Promise(r=>setTimeout(r,260));const list=items(clone);if(!list.length)throw new Error('Report components could not be prepared.');const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true}),p=prof();doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});await render(doc,clone,list);const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}doc.save(filename());status('PDF generated with direct component rendering');}catch(e){console.error(e);status(e?.message||'Unable to generate PDF');alert(e?.message||'Unable to generate PDF.');}finally{clone?.remove();if(btn){btn.disabled=false;btn.textContent='Download PDF';}}}

  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate};
})();
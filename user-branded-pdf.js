'use strict';
(() => {
  const VERSION=9;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;
  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis',CAPTURE_WIDTH=816;
  const FOOTER_H=46,NEXT_TOP=18;
  function prof(){return window.UserBranding?.getProfile?.()||{};}
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}
  function ensureHtml2Canvas(){if(window.html2canvas)return Promise.resolve(window.html2canvas);if(window.__ptHtml2CanvasPromise)return window.__ptHtml2CanvasPromise;window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF preview renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF preview renderer.'));document.head.appendChild(s);});return window.__ptHtml2CanvasPromise;}
  function status(msg){if(typeof setStatus==='function')setStatus(msg);}

  function ensureCaptureStyles(){
    let s=document.getElementById('ptPdfCaptureStyles');
    if(!s){s=document.createElement('style');s.id='ptPdfCaptureStyles';document.head.appendChild(s);}
    s.textContent=`
      #clientReport .pt-pdf-capture{overflow:visible!important;background:#fff!important}
      #clientReport .pt-pdf-capture>.rb-footer{display:none!important}
      #clientReport .pt-pdf-capture .rb-section{box-shadow:none!important;border-color:transparent!important;border-radius:0!important}
      #clientReport .pt-pdf-capture .rb-analysis-summary,#clientReport .pt-pdf-capture .rb-final-conclusion{border-left-color:inherit!important}
      #clientReport .pt-pdf-capture .rb-tablewrap{display:block!important;width:100%!important;max-width:100%!important;overflow:visible!important;position:static!important;transform:none!important}
      #clientReport .pt-pdf-capture table{display:table!important;width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;position:static!important;transform:none!important;margin:0!important}
      #clientReport .pt-pdf-capture thead{display:table-header-group!important}
      #clientReport .pt-pdf-capture tbody{display:table-row-group!important}
      #clientReport .pt-pdf-capture tr{display:table-row!important;position:static!important;transform:none!important}
      #clientReport .pt-pdf-capture th,#clientReport .pt-pdf-capture td{display:table-cell!important;position:static!important;left:auto!important;right:auto!important;float:none!important;transform:none!important;min-width:0!important;max-width:none!important;width:auto!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;word-break:normal!important;padding:6px 4px!important;font-size:8.4px!important;line-height:1.22!important;vertical-align:middle!important}
      #clientReport .pt-pdf-capture .rb-row,#clientReport .pt-pdf-capture .rb-stat,#clientReport .pt-pdf-capture .rb-panel,#clientReport .pt-pdf-capture .rb-analysis-copy,#clientReport .pt-pdf-capture .rb-conclusion-box,#clientReport .pt-pdf-capture .rb-summary-block{break-inside:avoid!important}
    `;
  }

  function addCandidate(set,y,total){y=Math.round(y);if(y>8&&y<total-8)set.add(y);}
  function naturalBreaks(report,scale,total){
    const root=report.getBoundingClientRect(),set=new Set();
    const relY=(el,edge='bottom')=>{const r=el.getBoundingClientRect();return ((edge==='top'?r.top:r.bottom)-root.top)*scale;};
    const selectors=[
      ':scope > .rb-cover',':scope > .rb-conclusion',':scope > .rb-findings',':scope > .rb-section',
      '.rb-section-head','.rb-summary-block','.rb-conclusion-box','.rb-analysis-copy','.rb-analysis-copy p',
      '.rb-panel','.rb-final-copy p','.rb-tablewrap','thead','tbody tr'
    ].join(',');
    const nodes=[...report.querySelectorAll(selectors)];
    for(const el of nodes){addCandidate(set,relY(el,'top')-2*scale,total);addCandidate(set,relY(el,'bottom')+2*scale,total);}

    const stats=[...report.querySelectorAll('.rb-stat')].map(el=>({el,r:el.getBoundingClientRect()})).sort((a,b)=>a.r.top-b.r.top||a.r.left-b.r.left);
    let group=[];
    const flush=()=>{if(!group.length)return;const top=Math.min(...group.map(x=>x.r.top)),bottom=Math.max(...group.map(x=>x.r.bottom));addCandidate(set,(top-root.top)*scale-2*scale,total);addCandidate(set,(bottom-root.top)*scale+2*scale,total);group=[];};
    for(const item of stats){if(!group.length||Math.abs(item.r.top-group[0].r.top)<8)group.push(item);else{flush();group.push(item);}}flush();
    return [...set].sort((a,b)=>a-b);
  }

  function chooseBreak(start,maxEnd,breaks,total){
    if(maxEnd>=total)return total;
    const capacity=maxEnd-start;
    const preferredMin=start+capacity*0.68;
    const acceptableMin=start+capacity*0.40;
    let options=breaks.filter(y=>y>preferredMin&&y<=maxEnd);
    if(!options.length)options=breaks.filter(y=>y>acceptableMin&&y<=maxEnd);
    if(!options.length)options=breaks.filter(y=>y>start+40&&y<=maxEnd);
    return options.length?options[options.length-1]:maxEnd;
  }

  async function preparePreview(){window.ReportBuilderV1?.renderReport?.();await new Promise(r=>setTimeout(r,180));window.ReportBuilderV8?.apply?.();window.UserBranding?.applyReportBranding?.();window.PropertyThesisReportBranding?.apply?.();await new Promise(r=>setTimeout(r,180));}
  function makeCaptureClone(source){ensureCaptureStyles();const host=document.getElementById('clientReport');if(!host)throw new Error('Client report container is unavailable.');const clone=source.cloneNode(true);clone.classList.add('pt-pdf-capture');clone.setAttribute('aria-hidden','true');Object.assign(clone.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',zIndex:'-1',transform:'none',overflow:'visible'});host.appendChild(clone);return clone;}

  function addFooter(doc,page,total,p){
    const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),y=h-34;
    const company=(p.company_name||p.full_name||'').trim();
    doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-5,w-28,y-5);
    doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);
    doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+8);
    doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);
    doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,w-28,y+8,{align:'right'});
  }

  async function generate(){const btn=document.getElementById('rbDownloadPdf');if(btn){btn.disabled=true;btn.textContent='Generating PDF...';}let clone=null;try{
      await preparePreview();await ensureHtml2Canvas();
      const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');
      const source=document.querySelector('#clientReport .rb-report');if(!source)throw new Error('Report preview is not available.');
      clone=makeCaptureClone(source);await new Promise(r=>setTimeout(r,240));
      const canvas=await window.html2canvas(clone,{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:CAPTURE_WIDTH,windowWidth:CAPTURE_WIDTH});
      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true});
      const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
      const p=prof();doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      const pxPerPt=canvas.width/pageW,scale=canvas.width/clone.getBoundingClientRect().width,breaks=naturalBreaks(clone,scale,canvas.height);
      let start=0,page=0;
      while(start<canvas.height-1){
        const topPt=page===0?0:NEXT_TOP;
        const usablePt=pageH-topPt-FOOTER_H;
        const maxSlice=Math.floor(usablePt*pxPerPt);
        const maxEnd=Math.min(canvas.height,start+maxSlice);
        let end=chooseBreak(start,maxEnd,breaks,canvas.height);
        if(end<=start+40)end=maxEnd;
        const h=Math.max(1,Math.round(end-start));
        const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=h;
        const ctx=slice.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,slice.width,slice.height);ctx.drawImage(canvas,0,start,canvas.width,h,0,0,canvas.width,h);
        if(page>0)doc.addPage();
        const imgH=h/pxPerPt;doc.addImage(slice.toDataURL('image/jpeg',0.97),'JPEG',0,topPt,pageW,imgH,undefined,'FAST');
        start=end;page++;
      }
      const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}
      doc.save(filename());status('PDF generated with protected pagination and page footers');
    }catch(e){console.error(e);status(e?.message||'Unable to generate PDF');alert(e?.message||'Unable to generate PDF.');}finally{clone?.remove();if(btn){btn.disabled=false;btn.textContent='Download PDF';}}
  }
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate};
})();
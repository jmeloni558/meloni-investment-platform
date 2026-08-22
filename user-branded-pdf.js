'use strict';
(() => {
  const VERSION=6;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;
  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PRODUCT='PropertyThesis',REPORT_TYPE='Investment Property Analysis';
  function prof(){return window.UserBranding?.getProfile?.()||{};}
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}
  function ensureHtml2Canvas(){if(window.html2canvas)return Promise.resolve(window.html2canvas);if(window.__ptHtml2CanvasPromise)return window.__ptHtml2CanvasPromise;window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF preview renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF preview renderer.'));document.head.appendChild(s);});return window.__ptHtml2CanvasPromise;}
  function status(msg){if(typeof setStatus==='function')setStatus(msg);}
  function naturalBreaks(report,scale,total){const top=report.getBoundingClientRect().top;const nodes=[...report.querySelectorAll(':scope > .rb-cover,:scope > .rb-conclusion,:scope > .rb-findings,:scope > .rb-section,:scope > .rb-footer')];const ys=nodes.map(el=>(el.getBoundingClientRect().bottom-top)*scale).filter(y=>y>0&&y<total);return [...new Set(ys.map(Math.round))].sort((a,b)=>a-b);}
  function chooseBreak(start,maxEnd,breaks,total){if(maxEnd>=total)return total;const minUseful=start+(maxEnd-start)*0.55;const options=breaks.filter(y=>y>minUseful&&y<=maxEnd);return options.length?options[options.length-1]:maxEnd;}
  async function preparePreview(){window.ReportBuilderV1?.renderReport?.();await new Promise(r=>setTimeout(r,180));window.ReportBuilderV8?.apply?.();window.UserBranding?.applyReportBranding?.();window.PropertyThesisReportBranding?.apply?.();await new Promise(r=>setTimeout(r,140));}
  async function generate(){const btn=document.getElementById('rbDownloadPdf');if(btn){btn.disabled=true;btn.textContent='Generating PDF...';}try{
      await preparePreview();await ensureHtml2Canvas();
      const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');
      const report=document.querySelector('#clientReport .rb-report');if(!report)throw new Error('Report preview is not available.');
      const canvas=await window.html2canvas(report,{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:-window.scrollY,windowWidth:document.documentElement.clientWidth});
      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true});
      const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
      const p=prof();doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      const pxPerPt=canvas.width/pageW,maxSlice=Math.floor(pageH*pxPerPt),scale=canvas.width/report.getBoundingClientRect().width,breaks=naturalBreaks(report,scale,canvas.height);
      let start=0,page=0;
      while(start<canvas.height-1){const maxEnd=Math.min(canvas.height,start+maxSlice);let end=chooseBreak(start,maxEnd,breaks,canvas.height);if(end<=start+20)end=maxEnd;const h=Math.max(1,Math.round(end-start));const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=h;const ctx=slice.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,slice.width,slice.height);ctx.drawImage(canvas,0,start,canvas.width,h,0,0,canvas.width,h);if(page>0)doc.addPage();const imgH=h/pxPerPt;doc.addImage(slice.toDataURL('image/jpeg',0.96),'JPEG',0,0,pageW,imgH,undefined,'FAST');start=end;page++;}
      doc.save(filename());status('PDF generated from report preview');
    }catch(e){console.error(e);status(e?.message||'Unable to generate PDF');alert(e?.message||'Unable to generate PDF.');}finally{if(btn){btn.disabled=false;btn.textContent='Download PDF';}}
  }
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate};
})();
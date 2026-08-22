'use strict';
(() => {
  const VERSION=10;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;
  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis',CAPTURE_WIDTH=816;
  const FOOTER_H=48,NEXT_TOP=20;
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
  function geometry(report,scale,total,maxSlice){
    const root=report.getBoundingClientRect(),points=new Set(),protectedRanges=[];
    const rel=(r,v)=>(v-root.top)*scale;
    const rectOf=el=>{const r=el.getBoundingClientRect();return{top:rel(r,r.top),bottom:rel(r,r.bottom),height:r.height*scale};};
    const addRange=(top,bottom)=>{top=Math.max(0,Math.round(top-3*scale));bottom=Math.min(total,Math.round(bottom+3*scale));if(bottom-top>12&&bottom-top<maxSlice*0.96)protectedRanges.push({top,bottom});};

    // Useful break candidates at major section boundaries and paragraph boundaries.
    const pointNodes=[...report.querySelectorAll(':scope > .rb-cover,:scope > .rb-conclusion,:scope > .rb-findings,:scope > .rb-section,.rb-section-head,.rb-summary-block,.rb-conclusion-box,.rb-analysis-copy p,.rb-final-copy p,.rb-panel,.rb-tablewrap,tbody tr')];
    for(const el of pointNodes){const g=rectOf(el);addCandidate(points,g.top-2*scale,total);addCandidate(points,g.bottom+2*scale,total);}

    // Protect whole short narrative boxes, panels and conclusion boxes. If a narrative box is
    // unusually tall, its paragraph endpoints remain available instead of protecting the whole box.
    for(const el of report.querySelectorAll('.rb-conclusion,.rb-panel,.rb-conclusion-box,.rb-analysis-copy')){
      const g=rectOf(el);if(g.height<maxSlice*0.82)addRange(g.top,g.bottom);
    }

    // Protect each complete visual row of metric cards rather than individual cards.
    const stats=[...report.querySelectorAll('.rb-stat')].map(el=>({el,r:el.getBoundingClientRect()})).sort((a,b)=>a.r.top-b.r.top||a.r.left-b.r.left);
    let group=[];
    const flush=()=>{if(!group.length)return;const top=Math.min(...group.map(x=>rel(x.r,x.r.top))),bottom=Math.max(...group.map(x=>rel(x.r,x.r.bottom)));addCandidate(points,top-2*scale,total);addCandidate(points,bottom+2*scale,total);addRange(top,bottom);group=[];};
    for(const item of stats){if(!group.length||Math.abs(item.r.top-group[0].r.top)<8)group.push(item);else{flush();group.push(item);}}flush();

    // Keep a table together whenever the whole table fits inside the usable page body.
    for(const el of report.querySelectorAll('.rb-tablewrap')){const g=rectOf(el);if(g.height<maxSlice*0.92)addRange(g.top,g.bottom);}

    protectedRanges.sort((a,b)=>a.top-b.top);
    return{breaks:[...points].sort((a,b)=>a-b),protectedRanges};
  }

  function coveringRange(y,ranges){return ranges.find(r=>y>r.top&&y<r.bottom);}
  function chooseBreak(start,maxEnd,breaks,ranges,total){
    if(maxEnd>=total)return total;
    const capacity=maxEnd-start;
    const candidates=breaks.filter(y=>y>start+36&&y<=maxEnd).sort((a,b)=>b-a);
    const tiers=[start+capacity*0.66,start+capacity*0.42,start+36];
    for(const min of tiers){
      for(const y of candidates){if(y<min)continue;if(!coveringRange(y,ranges))return y;}
    }
    // If the physical page edge lands inside a protected block, move the break to just before it.
    const hit=coveringRange(maxEnd,ranges);
    if(hit&&hit.top>start+36)return hit.top;
    return maxEnd;
  }

  async function preparePreview(){window.ReportBuilderV1?.renderReport?.();await new Promise(r=>setTimeout(r,180));window.ReportBuilderV8?.apply?.();window.UserBranding?.applyReportBranding?.();window.PropertyThesisReportBranding?.apply?.();await new Promise(r=>setTimeout(r,180));}
  function makeCaptureClone(source){ensureCaptureStyles();const host=document.getElementById('clientReport');if(!host)throw new Error('Client report container is unavailable.');const clone=source.cloneNode(true);clone.classList.add('pt-pdf-capture');clone.setAttribute('aria-hidden','true');Object.assign(clone.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',zIndex:'-1',transform:'none',overflow:'visible'});host.appendChild(clone);return clone;}

  function addFooter(doc,page,total,p){
    const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),y=h-34;
    const company=(p.company_name||p.full_name||'').trim();
    doc.setFillColor(255,255,255);doc.rect(0,h-FOOTER_H,w,FOOTER_H,'F');
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
      clone=makeCaptureClone(source);await new Promise(r=>setTimeout(r,260));
      const canvas=await window.html2canvas(clone,{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:CAPTURE_WIDTH,windowWidth:CAPTURE_WIDTH});
      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true});
      const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
      const p=prof();doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      const pxPerPt=canvas.width/pageW,scale=canvas.width/clone.getBoundingClientRect().width;
      const largestUsablePt=pageH-FOOTER_H;
      const geom=geometry(clone,scale,canvas.height,Math.floor(largestUsablePt*pxPerPt));
      let start=0,page=0;
      while(start<canvas.height-1){
        const topPt=page===0?0:NEXT_TOP;
        const usablePt=pageH-topPt-FOOTER_H;
        const maxSlice=Math.floor(usablePt*pxPerPt);
        const maxEnd=Math.min(canvas.height,start+maxSlice);
        let end=chooseBreak(start,maxEnd,geom.breaks,geom.protectedRanges,canvas.height);
        if(end<=start+30)end=maxEnd;
        const h=Math.max(1,Math.round(end-start));
        const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=h;
        const ctx=slice.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,slice.width,slice.height);ctx.drawImage(canvas,0,start,canvas.width,h,0,0,canvas.width,h);
        if(page>0)doc.addPage();
        const imgH=h/pxPerPt;doc.addImage(slice.toDataURL('image/jpeg',0.97),'JPEG',0,topPt,pageW,imgH,undefined,'FAST');
        start=end;page++;
      }
      const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}
      doc.save(filename());status('PDF generated with protected blocks and page footers');
    }catch(e){console.error(e);status(e?.message||'Unable to generate PDF');alert(e?.message||'Unable to generate PDF.');}finally{clone?.remove();if(btn){btn.disabled=false;btn.textContent='Download PDF';}}
  }
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate};
})();
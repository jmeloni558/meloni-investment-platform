'use strict';
(()=>{
  const VERSION=27;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;

  const PRODUCT='PropertyThesis';
  const TAGLINE='Know the Numbers. Build the Case.';
  const REPORT_TYPE='Investment Property Analysis';
  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PAGE_W=612,PAGE_H=792,MARGIN_X=24,TOP=24,FOOTER=44,BOTTOM=10;
  let running=false;

  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const withTimeout=(p,ms,msg)=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(new Error(msg)),ms))]);
  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};

  function filename(){
    const raw=(state?.address||state?.name||REPORT_TYPE).trim();
    return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';
  }

  async function ensureHtml2Canvas(){
    if(window.html2canvas)return window.html2canvas;
    if(!window.__ptHtml2CanvasPromise){
      window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src=HTML2CANVAS_SRC;s.async=true;
        s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF renderer did not initialize.'));
        s.onerror=()=>reject(new Error('Unable to load the PDF renderer.'));
        document.head.appendChild(s);
      });
    }
    return withTimeout(window.__ptHtml2CanvasPromise,12000,'PDF renderer load timed out.');
  }

  function addFooter(doc,page,total,p){
    const company=(p.company_name||p.full_name||'').trim(),y=PAGE_H-30;
    doc.setFillColor(255,255,255);doc.rect(0,PAGE_H-FOOTER,PAGE_W,FOOTER,'F');
    doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-8,PAGE_W-28,y-8);
    doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);
    doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+4);
    doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);
    doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,PAGE_W-28,y+4,{align:'right'});
  }

  function visualRowBottoms(elements,rootTop){
    const rows=[...elements].map(el=>el.getBoundingClientRect()).filter(r=>r.height>1).sort((a,b)=>a.top-b.top||a.left-b.left);
    const out=[];let rowTop=null,rowBottom=0;
    for(const r of rows){
      if(rowTop===null||Math.abs(r.top-rowTop)<8){if(rowTop===null)rowTop=r.top;rowBottom=Math.max(rowBottom,r.bottom);}
      else{out.push(rowBottom-rootTop);rowTop=r.top;rowBottom=r.bottom;}
    }
    if(rowTop!==null)out.push(rowBottom-rootTop);
    return out;
  }

  function safeBreaks(report){
    const rr=report.getBoundingClientRect(),top=rr.top,vals=[0,rr.height];
    const add=v=>{if(Number.isFinite(v)&&v>2&&v<rr.height-2)vals.push(v);};
    for(const el of report.querySelectorAll(':scope > .rb-cover,:scope > .rb-conclusion,:scope > .rb-findings,:scope > .rb-section')){
      const r=el.getBoundingClientRect();add(r.top-top);add(r.bottom-top);
      for(const child of [...el.children]){const cr=child.getBoundingClientRect();add(cr.top-top);add(cr.bottom-top);}
      for(const grid of el.querySelectorAll('.rb-stats,.rb-two'))visualRowBottoms(grid.children,top).forEach(add);
      for(const table of el.querySelectorAll('.rb-tablewrap')){
        const tr=table.getBoundingClientRect();add(tr.top-top);add(tr.bottom-top);
        for(const row of table.querySelectorAll('tr'))add(row.getBoundingClientRect().bottom-top);
      }
    }
    return [...new Set(vals.map(v=>Math.round(v)))].sort((a,b)=>a-b);
  }

  function chooseBreak(breaks,start,target,max){
    const minimum=start+Math.min(180,Math.max(90,(target-start)*0.45));
    const before=breaks.filter(v=>v>=minimum&&v<=target);
    if(before.length)return before[before.length-1];
    const after=breaks.find(v=>v>target&&v<=max);
    return after||target;
  }

  function buildPages(doc,canvas,cssHeight,breaks){
    const usableW=PAGE_W-MARGIN_X*2;
    const usableH=PAGE_H-TOP-FOOTER-BOTTOM;
    const cssWidth=canvas.__ptCssWidth||canvas.width;
    const ptPerCss=usableW/cssWidth;
    const cssPerPage=usableH/ptPerCss;
    const pxPerCss=canvas.height/cssHeight;
    let start=0,page=0;

    while(start<cssHeight-1){
      const target=Math.min(cssHeight,start+cssPerPage);
      const max=Math.min(cssHeight,start+cssPerPage*1.08);
      let end=chooseBreak(breaks,start,target,max);
      if(end<=start+20)end=target;
      if(end>cssHeight)end=cssHeight;

      const sy=Math.max(0,Math.floor(start*pxPerCss));
      const ey=Math.min(canvas.height,Math.ceil(end*pxPerCss));
      const sh=Math.max(1,ey-sy);
      const part=document.createElement('canvas');
      part.width=canvas.width;part.height=sh;
      const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);
      ctx.drawImage(canvas,0,sy,canvas.width,sh,0,0,canvas.width,sh);

      if(page>0)doc.addPage();page++;
      const hPt=(end-start)*ptPerCss;
      doc.addImage(part.toDataURL('image/jpeg',0.96),'JPEG',MARGIN_X,TOP,usableW,hPt,undefined,'FAST');
      start=end;
    }
    return page;
  }

  async function generate(){
    if(running)return false;
    running=true;
    const btn=document.getElementById('rbDownloadPdf');
    if(btn){btn.disabled=true;btn.textContent='Generating PDF…';}
    try{
      const report=document.querySelector('#clientReport .rb-report');
      if(!report)throw new Error('Report preview is not available. Refresh Preview first.');
      await ensureHtml2Canvas();
      await wait(80);

      const rect=report.getBoundingClientRect();
      const cssWidth=Math.max(report.scrollWidth,Math.ceil(rect.width));
      const cssHeight=Math.max(report.scrollHeight,Math.ceil(rect.height));
      if(cssWidth<2||cssHeight<2)throw new Error('Report preview could not be measured for PDF.');

      const breaks=safeBreaks(report);
      status('Rendering current report preview…');
      const canvas=await withTimeout(window.html2canvas(report,{
        scale:1.15,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,
        scrollX:0,scrollY:0,width:cssWidth,height:cssHeight,windowWidth:cssWidth
      }),45000,'PDF rendering timed out. Please refresh the report preview and try again.');
      canvas.__ptCssWidth=cssWidth;

      const jsPDF=window.jspdf?.jsPDF;
      if(!jsPDF)throw new Error('PDF library unavailable.');
      const p=profile();
      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true});
      doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      status('Building PDF pages…');
      const total=buildPages(doc,canvas,cssHeight,breaks);
      for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}
      doc.save(filename());
      status('PDF generated from current preview.');
      return true;
    }catch(e){
      console.error('PropertyThesis PDF export failed',e);
      status(e?.message||'Unable to generate PDF.');
      try{alert(e?.message||'Unable to generate PDF.');}catch(_e){}
      return false;
    }finally{
      running=false;
      if(btn){btn.disabled=false;btn.textContent='Download PDF';}
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();generate();
  },true);

  window.UserBrandedPdf={generate,version:VERSION};
})();
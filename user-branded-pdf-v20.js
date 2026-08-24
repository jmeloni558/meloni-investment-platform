'use strict';
(()=>{
  const VERSION=26;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;

  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis';
  const CAPTURE_WIDTH=816,FOOTER_H=48,TOP_PAD=24,BOTTOM_PAD=10,PAGE_GAP=10,SIDE_PAD=22,ROW_PAD=30,ROW_BLEED=5;
  let running=false;

  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};
  const status=msg=>{try{if(typeof setStatus==='function')setStatus(msg);}catch(_e){}};
  const withTimeout=(p,ms,msg)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(msg)),ms))]);
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return(raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}

  async function ensureHtml2Canvas(){
    if(window.html2canvas)return window.html2canvas;
    if(!window.__ptHtml2CanvasPromise){window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF preview renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF preview renderer.'));document.head.appendChild(s);});}
    return withTimeout(window.__ptHtml2CanvasPromise,15000,'PDF renderer load timed out.');
  }

  function currentPreview(){
    status('Preparing current report preview…');
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)throw new Error('Report preview is not available. Refresh Preview first.');
    return report;
  }

  function ensureCaptureStyles(){
    let s=document.getElementById('ptPdfCaptureStylesV26');if(s)return;
    s=document.createElement('style');s.id='ptPdfCaptureStylesV26';
    s.textContent=`
      .pt-pdf-capture-v26{overflow:visible!important;background:#fff!important;width:${CAPTURE_WIDTH}px!important;max-width:${CAPTURE_WIDTH}px!important;height:auto!important;max-height:none!important}
      .pt-pdf-capture-v26>.rb-footer{display:none!important}
      .pt-pdf-capture-v26 .rb-section,.pt-pdf-capture-v26 .rb-cover,.pt-pdf-capture-v26 .rb-conclusion,.pt-pdf-capture-v26 .rb-findings{height:auto!important;max-height:none!important;overflow:visible!important}
      .pt-pdf-capture-v26 .rb-stats,.pt-pdf-capture-v26 .rb-two,.pt-pdf-capture-v26 .rb-panel{height:auto!important;max-height:none!important;overflow:visible!important}
      .pt-pdf-capture-v26 .rb-tablewrap{display:block!important;width:100%!important;max-width:100%!important;overflow:visible!important;position:static!important;transform:none!important}
      .pt-pdf-capture-v26 table{display:table!important;width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;position:static!important;transform:none!important;margin:0!important}
      .pt-pdf-capture-v26 thead{display:table-header-group!important}.pt-pdf-capture-v26 tbody{display:table-row-group!important}.pt-pdf-capture-v26 tr{display:table-row!important;position:static!important;transform:none!important}
      .pt-pdf-capture-v26 th,.pt-pdf-capture-v26 td{display:table-cell!important;position:static!important;left:auto!important;right:auto!important;float:none!important;transform:none!important;min-width:0!important;max-width:none!important;width:auto!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;padding:6px 4px!important;font-size:8.5px!important;line-height:1.22!important;vertical-align:middle!important}
      .pt-pdf-row-capture-v26{box-sizing:border-box!important;overflow:visible!important;background:#fff!important}
      .pt-pdf-row-capture-v26>*{box-sizing:border-box!important;margin:0!important}
    `;
    document.head.appendChild(s);
  }

  function makeClone(source){
    ensureCaptureStyles();
    const clone=source.cloneNode(true);clone.classList.add('pt-pdf-capture-v26');clone.setAttribute('aria-hidden','true');
    Object.assign(clone.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',maxHeight:'none',zIndex:'-100000',transform:'none',overflow:'visible',pointerEvents:'none'});
    document.body.appendChild(clone);return clone;
  }

  function visualRows(elements){
    const items=[...elements].map(el=>({el,r:el.getBoundingClientRect()})).filter(x=>x.r.width>1&&x.r.height>1).sort((a,b)=>a.r.top-b.r.top||a.r.left-b.r.left),rows=[];let row=[];
    for(const item of items){if(!row.length||Math.abs(item.r.top-row[0].r.top)<8)row.push(item);else{rows.push(row.map(x=>x.el));row=[item];}}
    if(row.length)rows.push(row.map(x=>x.el));return rows;
  }
  function statRows(section){return visualRows(section.querySelectorAll('.rb-stat'));}

  function items(report){
    const out=[];const add=(kind,els,gap=10,keepNext=false)=>{const arr=(Array.isArray(els)?els:[els]).filter(Boolean);if(arr.length)out.push({kind,els:arr,gap,keepNext});};
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
      add('full',section.querySelector(':scope > .rb-analysis-copy'),10);
      add('full',section.querySelector(':scope > .ptmri-report-conclusion'),10);
      add('full',section.querySelector(':scope > .pt-sc-note'),10);
      for(const row of statRows(section))add('row',row,9);
      const tables=[...section.querySelectorAll(':scope > .rb-tablewrap')];
      const panels=[...section.querySelectorAll(':scope > .rb-panel')].filter(panel=>!tables.some(table=>panel.contains(table)));
      if(panels.length){for(const row of visualRows(panels))add('row',row,10);}
      for(const table of tables)add('full',table,10);
      add('full',section.querySelector(':scope > .pt-sc-source'),10);
    }
    return out;
  }

  async function snap(el){
    const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return null;
    return withTimeout(window.html2canvas(el,{scale:1.5,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:Math.ceil(r.width),height:Math.ceil(r.height),windowWidth:CAPTURE_WIDTH}),18000,'PDF capture timed out on a report block.');
  }

  async function snapRow(els){
    const rects=els.map(el=>el.getBoundingClientRect()),left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top)),right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
    const width=Math.ceil(right-left),height=Math.ceil(bottom-top),wrap=document.createElement('div');wrap.className='pt-pdf-row-capture-v26';wrap.setAttribute('aria-hidden','true');
    Object.assign(wrap.style,{position:'fixed',left:'-14000px',top:'0',width:(width+ROW_BLEED*2)+'px',height:(height+ROW_BLEED*2)+'px',zIndex:'-100001',overflow:'visible',background:'#fff',pointerEvents:'none'});
    els.forEach((el,i)=>{const r=rects[i],c=el.cloneNode(true);Object.assign(c.style,{position:'absolute',left:(r.left-left+ROW_BLEED)+'px',top:(r.top-top+ROW_BLEED)+'px',width:r.width+'px',height:r.height+'px',margin:'0',transform:'none'});wrap.appendChild(c);});
    document.body.appendChild(wrap);
    try{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const canvas=await withTimeout(window.html2canvas(wrap,{scale:1.5,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:width+ROW_BLEED*2,height:height+ROW_BLEED*2,windowWidth:CAPTURE_WIDTH}),18000,'PDF capture timed out on a metric row.');return{canvas,left,top,right,bottom,width,height};}finally{wrap.remove();}
  }

  function addFooter(doc,page,total,p){
    const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),y=h-34,company=(p.company_name||p.full_name||'').trim();
    doc.setFillColor(255,255,255);doc.rect(0,h-FOOTER_H,w,FOOTER_H,'F');doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-5,w-28,y-5);doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+8);doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,w-28,y+8,{align:'right'});
  }

  async function render(doc,report,list){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),reportRect=report.getBoundingClientRect(),reportW=reportRect.width;
    const scalePt=(pageW-(SIDE_PAD*2))/reportW,bodyBottom=pageH-FOOTER_H-BOTTOM_PAD;let page=1,y=TOP_PAD;
    const baseX=SIDE_PAD,newPage=()=>{doc.addPage();page++;y=TOP_PAD;};
    for(let i=0;i<list.length;i++){
      const it=list[i];
      if(it.kind==='row'){
        const row=await snapRow(it.els);if(!row)continue;
        const rightExtent=Math.max(1,row.right-reportRect.left+ROW_BLEED),rowScale=Math.min(scalePt,(pageW-(ROW_PAD*2))/rightExtent),hPt=(row.height+ROW_BLEED*2)*rowScale,gapPt=it.gap;
        let nextExtra=0;if(it.keepNext&&list[i+1]){const nr=list[i+1].els[0].getBoundingClientRect();nextExtra=(nr.height*scalePt)+PAGE_GAP;}
        if(y+gapPt+hPt+nextExtra>bodyBottom&&y>TOP_PAD+4)newPage();y+=gapPt;
        const x=ROW_PAD+(row.left-reportRect.left-ROW_BLEED)*rowScale,w=(row.width+ROW_BLEED*2)*rowScale;
        doc.addImage(row.canvas.toDataURL('image/jpeg',0.98),'JPEG',x,y,w,hPt,undefined,'FAST');y+=hPt;continue;
      }
      const el=it.els[0],r=el.getBoundingClientRect(),c=await snap(el);if(!c)continue;
      const wPt=r.width*scalePt,hPt=r.height*scalePt,xPt=baseX+(r.left-reportRect.left)*scalePt,gapPt=it.gap;
      let nextExtra=0;if(it.keepNext&&list[i+1]){const nr=list[i+1].els[0].getBoundingClientRect();nextExtra=(nr.height*scalePt)+PAGE_GAP;}
      const fullPageCapacity=bodyBottom-TOP_PAD;
      if(hPt<=fullPageCapacity){if(y+gapPt+hPt+nextExtra>bodyBottom&&y>TOP_PAD+4)newPage();y+=gapPt;doc.addImage(c.toDataURL('image/jpeg',0.98),'JPEG',xPt,y,wPt,hPt,undefined,'FAST');y+=hPt;}
      else{
        let sy=0;const pxPerPt=c.width/wPt;
        while(sy<c.height-1){if(y>TOP_PAD+4)newPage();const avail=bodyBottom-y,take=Math.min(c.height-sy,Math.floor(avail*pxPerPt));if(take<10){newPage();continue;}const part=document.createElement('canvas');part.width=c.width;part.height=take;const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);ctx.drawImage(c,0,sy,c.width,take,0,0,c.width,take);const ph=take/pxPerPt;doc.addImage(part.toDataURL('image/jpeg',0.98),'JPEG',xPt,y,wPt,ph,undefined,'FAST');y+=ph;sy+=take;if(sy<c.height)newPage();}
      }
    }
    return page;
  }

  async function generate(){
    if(running)return false;running=true;const btn=document.getElementById('rbDownloadPdf');let clone=null;if(btn){btn.disabled=true;btn.textContent='Generating PDF…';}
    try{
      const source=currentPreview();await ensureHtml2Canvas();clone=makeClone(source);await new Promise(r=>setTimeout(r,180));
      const list=items(clone);if(!list.length)throw new Error('Report components could not be prepared.');
      const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true}),p=profile();
      doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      status('Building PDF from current preview…');await withTimeout(render(doc,clone,list),55000,'PDF generation timed out.');
      const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}doc.save(filename());status('PDF generated from current preview.');return true;
    }catch(e){console.error('PropertyThesis PDF export failed',e);status(e?.message||'Unable to generate PDF.');try{alert(e?.message||'Unable to generate PDF.');}catch(_e){}return false;}
    finally{clone?.remove();running=false;if(btn){btn.disabled=false;btn.textContent='Download PDF';}}
  }

  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate,version:VERSION};
})();
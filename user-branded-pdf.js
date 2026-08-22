'use strict';
(() => {
  const VERSION=11;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;

  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis';
  const CAPTURE_WIDTH=816,FOOTER_H=48,NEXT_TOP=20,BOTTOM_PAD=9;

  function prof(){return window.UserBranding?.getProfile?.()||{};}
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}
  function status(msg){if(typeof setStatus==='function')setStatus(msg);}
  function ensureHtml2Canvas(){if(window.html2canvas)return Promise.resolve(window.html2canvas);if(window.__ptHtml2CanvasPromise)return window.__ptHtml2CanvasPromise;window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF preview renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF preview renderer.'));document.head.appendChild(s);});return window.__ptHtml2CanvasPromise;}

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
    `;
  }

  async function preparePreview(){window.ReportBuilderV1?.renderReport?.();await new Promise(r=>setTimeout(r,180));window.ReportBuilderV8?.apply?.();window.UserBranding?.applyReportBranding?.();window.PropertyThesisReportBranding?.apply?.();await new Promise(r=>setTimeout(r,180));}
  function makeCaptureClone(source){ensureCaptureStyles();const host=document.getElementById('clientReport');if(!host)throw new Error('Client report container is unavailable.');const clone=source.cloneNode(true);clone.classList.add('pt-pdf-capture');clone.setAttribute('aria-hidden','true');Object.assign(clone.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',zIndex:'-1',transform:'none',overflow:'visible'});host.appendChild(clone);return clone;}

  function unionRect(elements,root){const arr=elements.filter(Boolean).map(el=>el.getBoundingClientRect());if(!arr.length)return null;const rr=root.getBoundingClientRect();const left=Math.min(...arr.map(r=>r.left))-rr.left,top=Math.min(...arr.map(r=>r.top))-rr.top,right=Math.max(...arr.map(r=>r.right))-rr.left,bottom=Math.max(...arr.map(r=>r.bottom))-rr.top;return{x:left,y:top,w:right-left,h:bottom-top};}
  function oneRect(el,root){return unionRect([el],root);}
  function pushBlock(blocks,els,root,type='body',keepNext=false){const list=(Array.isArray(els)?els:[els]).filter(Boolean);const rect=unionRect(list,root);if(rect&&rect.w>3&&rect.h>3)blocks.push({rect,type,keepNext});}

  function statRows(section){const stats=[...section.querySelectorAll('.rb-stat')].map(el=>({el,r:el.getBoundingClientRect()})).sort((a,b)=>a.r.top-b.r.top||a.r.left-b.r.left);const rows=[];let row=[];for(const item of stats){if(!row.length||Math.abs(item.r.top-row[0].r.top)<8)row.push(item);else{rows.push(row.map(x=>x.el));row=[item];}}if(row.length)rows.push(row.map(x=>x.el));return rows;}

  function buildBlocks(report){
    const blocks=[];
    pushBlock(blocks,report.querySelector(':scope > .rb-cover'),report,'cover');
    pushBlock(blocks,report.querySelector(':scope > .rb-conclusion'),report,'body');
    pushBlock(blocks,report.querySelector(':scope > .rb-findings'),report,'body');

    for(const section of report.querySelectorAll(':scope > .rb-section')){
      const head=section.querySelector(':scope > .rb-section-head');
      pushBlock(blocks,head,report,'heading',true);

      if(section.matches('.rb-analysis-summary,[data-rb-section="analysisSummary"]')){
        for(const el of section.querySelectorAll(':scope > .rb-summary-block'))pushBlock(blocks,el,report,'body');
        pushBlock(blocks,section.querySelector(':scope > .rb-conclusion-box'),report,'body');
        continue;
      }
      if(section.matches('.rb-final-conclusion,[data-rb-section="finalConclusion"]')){
        const ps=[...section.querySelectorAll('.rb-final-copy > p')];
        if(ps.length)for(const p of ps)pushBlock(blocks,p,report,'body');
        else pushBlock(blocks,section.querySelector('.rb-final-copy'),report,'body');
        continue;
      }

      const analysis=section.querySelector(':scope > .rb-analysis-copy');
      pushBlock(blocks,analysis,report,'body');
      for(const row of statRows(section))pushBlock(blocks,row,report,'body');
      for(const panel of section.querySelectorAll(':scope > .rb-panel'))pushBlock(blocks,panel,report,'body');
      for(const table of section.querySelectorAll(':scope > .rb-tablewrap'))pushBlock(blocks,table,report,'table');
    }
    return blocks;
  }

  function cropCanvas(source,rect,scale){const x=Math.max(0,Math.floor(rect.x*scale)),y=Math.max(0,Math.floor(rect.y*scale)),w=Math.min(source.width-x,Math.ceil(rect.w*scale)),h=Math.min(source.height-y,Math.ceil(rect.h*scale));const out=document.createElement('canvas');out.width=Math.max(1,w);out.height=Math.max(1,h);const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(source,x,y,w,h,0,0,w,h);return out;}

  function addFooter(doc,page,total,p){const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),y=h-34,company=(p.company_name||p.full_name||'').trim();doc.setFillColor(255,255,255);doc.rect(0,h-FOOTER_H,w,FOOTER_H,'F');doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-5,w-28,y-5);doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+8);doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,w-28,y+8,{align:'right'});}

  function renderBlocks(doc,fullCanvas,report,blocks){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
    const rootW=report.getBoundingClientRect().width,pxPerPt=rootW/pageW,canvasScale=fullCanvas.width/rootW;
    let page=0,yPt=0,prevBottomPx=0;
    const bodyBottom=()=>pageH-FOOTER_H-BOTTOM_PAD;
    const startPage=()=>{if(page>0)doc.addPage();yPt=page===0?0:NEXT_TOP;prevBottomPx=0;page++;};
    startPage();

    for(let i=0;i<blocks.length;i++){
      const b=blocks[i],r=b.rect;
      let gapPx=prevBottomPx?Math.max(0,r.y-prevBottomPx):0;
      gapPx=Math.min(gapPx,b.type==='heading'?34:24);
      let gapPt=gapPx/pxPerPt;
      const hPt=r.h/pxPerPt,wPt=r.w/pxPerPt,xPt=r.x/pxPerPt;
      const remaining=bodyBottom()-yPt;

      let required=hPt+gapPt;
      if(b.keepNext&&blocks[i+1]){
        const n=blocks[i+1],nextGap=Math.min(Math.max(0,n.rect.y-(r.y+r.h)),24)/pxPerPt;
        required+=nextGap+n.rect.h/pxPerPt;
      }
      if(required>remaining&&yPt>(page===1?0:NEXT_TOP)+8){startPage();gapPt=0;}

      const usable=bodyBottom()-yPt;
      const blockCanvas=cropCanvas(fullCanvas,r,canvasScale);
      if(hPt<=usable+0.5){
        doc.addImage(blockCanvas.toDataURL('image/jpeg',0.97),'JPEG',xPt,yPt+gapPt,wPt,hPt,undefined,'FAST');
        yPt+=gapPt+hPt;
      }else if(hPt<=pageH-FOOTER_H-NEXT_TOP-BOTTOM_PAD){
        startPage();
        doc.addImage(blockCanvas.toDataURL('image/jpeg',0.97),'JPEG',xPt,yPt,wPt,hPt,undefined,'FAST');
        yPt+=hPt;
      }else{
        // Rare fallback for a single component taller than one page. Split only that component.
        let sy=0;const sliceCapacity=(pageH-FOOTER_H-NEXT_TOP-BOTTOM_PAD)*pxPerPt*canvasScale;
        while(sy<blockCanvas.height-1){if(yPt>(page===1?0:NEXT_TOP)+8)startPage();const take=Math.min(blockCanvas.height-sy,Math.floor(sliceCapacity));const part=document.createElement('canvas');part.width=blockCanvas.width;part.height=take;const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);ctx.drawImage(blockCanvas,0,sy,blockCanvas.width,take,0,0,blockCanvas.width,take);const partHPt=(take/canvasScale)/pxPerPt;doc.addImage(part.toDataURL('image/jpeg',0.97),'JPEG',xPt,yPt,wPt,partHPt,undefined,'FAST');yPt+=partHPt;sy+=take;if(sy<blockCanvas.height)startPage();}
      }
      prevBottomPx=r.y+r.h;
    }
  }

  async function generate(){const btn=document.getElementById('rbDownloadPdf');if(btn){btn.disabled=true;btn.textContent='Generating PDF...';}let clone=null;try{
      await preparePreview();await ensureHtml2Canvas();
      const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');
      const source=document.querySelector('#clientReport .rb-report');if(!source)throw new Error('Report preview is not available.');
      clone=makeCaptureClone(source);await new Promise(r=>setTimeout(r,260));
      const canvas=await window.html2canvas(clone,{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:CAPTURE_WIDTH,windowWidth:CAPTURE_WIDTH});
      const blocks=buildBlocks(clone);if(!blocks.length)throw new Error('Report components could not be prepared.');
      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true}),p=prof();
      doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      renderBlocks(doc,canvas,clone,blocks);
      const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}
      doc.save(filename());status('PDF generated with component-based pagination');
    }catch(e){console.error(e);status(e?.message||'Unable to generate PDF');alert(e?.message||'Unable to generate PDF.');}finally{clone?.remove();if(btn){btn.disabled=false;btn.textContent='Download PDF';}}
  }

  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate};
})();
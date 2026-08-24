'use strict';
(()=>{
  const VERSION=24;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis';
  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const CAPTURE_WIDTH=816,PAGE_W=612,PAGE_H=792,MARGIN_X=24,TOP=24,FOOTER=44,BOTTOM=10;
  let running=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};
  const withTimeout=(p,ms,msg)=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(new Error(msg)),ms))]);
  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}
  async function ensureHtml2Canvas(){if(window.html2canvas)return window.html2canvas;if(!window.__ptHtml2CanvasPromise){window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF renderer.'));document.head.appendChild(s);});}return withTimeout(window.__ptHtml2CanvasPromise,12000,'PDF renderer load timed out.');}
  function normalize(root){
    root.style.setProperty('width',CAPTURE_WIDTH+'px','important');root.style.setProperty('max-width',CAPTURE_WIDTH+'px','important');root.style.setProperty('height','auto','important');root.style.setProperty('max-height','none','important');root.style.setProperty('overflow','visible','important');root.style.setProperty('box-shadow','none','important');
    root.querySelector(':scope > .rb-footer')?.remove();
    root.querySelectorAll('*').forEach(x=>{x.style.setProperty('box-sizing','border-box','important');x.style.setProperty('max-width','100%','important');x.style.setProperty('min-width','0','important');x.style.setProperty('max-height','none','important');x.style.setProperty('overflow','visible','important');});
    root.querySelectorAll('.rb-tablewrap').forEach(x=>{x.style.setProperty('width','100%','important');x.style.setProperty('max-width','100%','important');x.style.setProperty('min-width','0','important');x.style.setProperty('overflow','visible','important');});
    root.querySelectorAll('table').forEach(x=>{x.style.setProperty('width','100%','important');x.style.setProperty('max-width','100%','important');x.style.setProperty('min-width','0','important');x.style.setProperty('table-layout','fixed','important');});
    root.querySelectorAll('th,td').forEach(x=>{x.style.setProperty('white-space','normal','important');x.style.setProperty('overflow-wrap','anywhere','important');x.style.setProperty('word-break','break-word','important');x.style.setProperty('font-size','8px','important');x.style.setProperty('padding','5px 3px','important');});
  }
  function makeClone(source){const c=source.cloneNode(true);c.classList.add('pt-pdf-v24-clone');c.setAttribute('aria-hidden','true');Object.assign(c.style,{position:'fixed',left:'-12000px',top:'0',zIndex:'-100000',pointerEvents:'none',background:'#fff',margin:'0'});normalize(c);document.body.appendChild(c);return c;}
  function rowBottoms(container,rootTop){const els=[...container.querySelectorAll(':scope > .rb-stat,:scope > .rb-panel,:scope > *')].filter(el=>el.offsetParent!==null);if(!els.length)return[];const items=els.map(el=>el.getBoundingClientRect()).sort((a,b)=>a.top-b.top||a.left-b.left),out=[];let top=null,bottom=0;for(const r of items){if(top===null||Math.abs(r.top-top)<8){if(top===null)top=r.top;bottom=Math.max(bottom,r.bottom);}else{out.push(bottom-rootTop);top=r.top;bottom=r.bottom;}}if(top!==null)out.push(bottom-rootTop);return out;}
  function safeBreaks(root){
    const rr=root.getBoundingClientRect(),top=rr.top,vals=[0,rr.height];
    for(const el of root.querySelectorAll(':scope > .rb-cover,:scope > .rb-conclusion,:scope > .rb-findings,:scope > .rb-section')){
      const r=el.getBoundingClientRect();vals.push(r.top-top,r.bottom-top);
      const head=el.querySelector(':scope > .rb-section-head');if(head){const hr=head.getBoundingClientRect();vals.push(hr.bottom-top);}
      for(const child of [...el.children]){
        const cr=child.getBoundingClientRect();vals.push(cr.bottom-top);
        if(child.matches('.rb-stats,.rb-two'))vals.push(...rowBottoms(child,top));
      }
      for(const t of el.querySelectorAll('.rb-tablewrap')){const tr=t.getBoundingClientRect();vals.push(tr.top-top,tr.bottom-top);}
    }
    return [...new Set(vals.filter(v=>Number.isFinite(v)&&v>=0&&v<=rr.height).map(v=>Math.round(v)))].sort((a,b)=>a-b);
  }
  function chooseBreak(breaks,start,target,max){
    const min=start+Math.min(180,Math.max(80,(target-start)*0.35));
    const candidates=breaks.filter(v=>v>min&&v<=target);
    if(candidates.length)return candidates[candidates.length-1];
    const forward=breaks.find(v=>v>target&&v<=max);
    return forward||target;
  }
  function addFooter(doc,page,total,p){const company=(p.company_name||p.full_name||'').trim(),y=PAGE_H-30;doc.setFillColor(255,255,255);doc.rect(0,PAGE_H-FOOTER,PAGE_W,FOOTER,'F');doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-8,PAGE_W-28,y-8);doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+4);doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,PAGE_W-28,y+4,{align:'right'});}
  function buildPages(doc,canvas,cloneHeight,breaksCss){
    const usableW=PAGE_W-MARGIN_X*2,usableH=PAGE_H-TOP-FOOTER-BOTTOM,ptPerCss=usableW/CAPTURE_WIDTH,cssPerPage=usableH/ptPerCss,pxPerCss=canvas.height/cloneHeight;
    let start=0,page=0;
    while(start<cloneHeight-1){
      const target=Math.min(cloneHeight,start+cssPerPage),max=Math.min(cloneHeight,start+cssPerPage*1.12);
      let end=chooseBreak(breaksCss,start,target,max);if(end<=start+20)end=target;if(end>cloneHeight)end=cloneHeight;
      const sy=Math.max(0,Math.floor(start*pxPerCss)),ey=Math.min(canvas.height,Math.ceil(end*pxPerCss)),sh=Math.max(1,ey-sy);
      const part=document.createElement('canvas');part.width=canvas.width;part.height=sh;const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);ctx.drawImage(canvas,0,sy,canvas.width,sh,0,0,canvas.width,sh);
      if(page>0)doc.addPage();page++;
      const hPt=(end-start)*ptPerCss;doc.addImage(part.toDataURL('image/jpeg',0.96),'JPEG',MARGIN_X,TOP,usableW,hPt,undefined,'FAST');
      start=end;
    }
    return page;
  }
  async function generate(){
    if(running)return false;running=true;const btn=document.getElementById('rbDownloadPdf');let clone=null;if(btn){btn.disabled=true;btn.textContent='Generating PDF…';}
    try{
      status('Preparing current report preview…');const source=document.querySelector('#clientReport .rb-report');if(!source)throw new Error('Report preview is not available. Refresh Preview first.');
      await ensureHtml2Canvas();clone=makeClone(source);await sleep(160);
      const rect=clone.getBoundingClientRect();if(rect.width<2||rect.height<2)throw new Error('Report preview could not be measured for PDF.');
      const breaks=safeBreaks(clone);status('Rendering report image…');
      const canvas=await withTimeout(window.html2canvas(clone,{scale:1.15,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:CAPTURE_WIDTH,height:Math.ceil(rect.height),windowWidth:CAPTURE_WIDTH}),40000,'PDF rendering timed out. Please refresh the report preview and try again.');
      const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');
      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true}),p=profile();doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      status('Building PDF pages…');const total=buildPages(doc,canvas,rect.height,breaks);for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}doc.save(filename());status('PDF generated from current preview.');return true;
    }catch(e){console.error('PropertyThesis PDF export failed',e);status(e?.message||'Unable to generate PDF.');try{alert(e?.message||'Unable to generate PDF.');}catch(_e){}return false;}
    finally{clone?.remove();running=false;if(btn){btn.disabled=false;btn.textContent='Download PDF';}}
  }
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate,version:VERSION};
})();
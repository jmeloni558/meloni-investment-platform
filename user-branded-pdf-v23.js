'use strict';
(()=>{
  const VERSION=23;
  if((window.__userBrandedPdfVersion||0)>=VERSION)return;
  window.__userBrandedPdfVersion=VERSION;
  const PRODUCT='PropertyThesis',TAGLINE='Know the Numbers. Build the Case.',REPORT_TYPE='Investment Property Analysis';
  const HTML2CANVAS_SRC='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const CAPTURE_WIDTH=816,PAGE_W=612,PAGE_H=792,MARGIN_X=24,TOP=24,FOOTER=44,BOTTOM=10,GAP=9;
  let running=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const status=t=>{try{if(typeof setStatus==='function')setStatus(t);}catch(_e){}};
  const withTimeout=(p,ms,msg)=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(new Error(msg)),ms))]);
  const profile=()=>{try{return window.UserBranding?.getProfile?.()||{};}catch(_e){return {};}};
  function filename(){const raw=(state?.address||state?.name||REPORT_TYPE).trim();return (raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'PropertyThesis')+'-Investment-Analysis.pdf';}
  async function ensureHtml2Canvas(){
    if(window.html2canvas)return window.html2canvas;
    if(!window.__ptHtml2CanvasPromise){window.__ptHtml2CanvasPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=HTML2CANVAS_SRC;s.async=true;s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('PDF renderer did not initialize.'));s.onerror=()=>reject(new Error('Unable to load the PDF renderer.'));document.head.appendChild(s);});}
    return withTimeout(window.__ptHtml2CanvasPromise,12000,'PDF renderer load timed out.');
  }
  async function currentPreview(){
    status('Preparing current preview for PDF…');
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)throw new Error('Report preview is not available. Refresh Preview first.');
    await sleep(60);return report;
  }
  function normalize(root){
    root.querySelectorAll('*').forEach(x=>{x.style.setProperty('box-sizing','border-box','important');x.style.setProperty('max-width','100%','important');x.style.setProperty('min-width','0','important');x.style.setProperty('height','auto','important');x.style.setProperty('max-height','none','important');});
    root.style.setProperty('height','auto','important');root.style.setProperty('max-height','none','important');root.style.setProperty('overflow','visible','important');
    root.querySelectorAll('.rb-tablewrap').forEach(x=>{x.style.setProperty('overflow','visible','important');x.style.setProperty('width','100%','important');x.style.setProperty('height','auto','important');});
    root.querySelectorAll('table').forEach(x=>{x.style.setProperty('width','100%','important');x.style.setProperty('max-width','100%','important');x.style.setProperty('min-width','0','important');x.style.setProperty('table-layout','fixed','important');x.style.setProperty('height','auto','important');});
    root.querySelectorAll('th,td').forEach(x=>{x.style.setProperty('white-space','normal','important');x.style.setProperty('overflow-wrap','anywhere','important');x.style.setProperty('word-break','break-word','important');x.style.setProperty('font-size','8px','important');x.style.setProperty('padding','5px 3px','important');x.style.setProperty('height','auto','important');});
  }
  function makeStage(){
    const stage=document.createElement('div');stage.className='pt-pdf-stage-v23';stage.setAttribute('aria-hidden','true');
    Object.assign(stage.style,{position:'fixed',left:'-12000px',top:'0',width:CAPTURE_WIDTH+'px',maxWidth:CAPTURE_WIDTH+'px',height:'auto',zIndex:'-100000',background:'#fff',overflow:'visible',pointerEvents:'none'});
    // Keep PDF capture completely outside #clientReport so report observers and
    // branding rebuilds cannot react to each temporary capture block.
    document.body.appendChild(stage);return stage;
  }
  const nodeBlock=(node,kind='block',label='Report block',keepNext=false)=>({type:'node',node,kind,label,keepNext});
  const rowBlock=(nodes,label='Metric row')=>({type:'row',nodes,label,kind:'section-child',keepNext:false});
  function statRows(container,title){const stats=[...container.querySelectorAll(':scope > .rb-stat')];if(!stats.length)return[nodeBlock(container,'section-child',title)];const rows=[];for(let i=0;i<stats.length;i+=2)rows.push(rowBlock(stats.slice(i,i+2),title+' metrics'));return rows;}
  function logicalBlocks(report){
    const out=[],push=x=>{if(x)out.push(x);};
    push(nodeBlock(report.querySelector(':scope > .rb-cover'),'major','Cover'));
    push(nodeBlock(report.querySelector(':scope > .rb-conclusion'),'major','Property Thesis'));
    push(nodeBlock(report.querySelector(':scope > .rb-findings'),'major','Key findings'));
    for(const section of report.querySelectorAll(':scope > .rb-section')){
      const title=(section.querySelector(':scope > .rb-section-head h2')?.textContent||section.dataset.rbSection||'Report section').trim();
      const head=section.querySelector(':scope > .rb-section-head');if(head)push(nodeBlock(head,'section-child',title+' heading',true));
      for(const child of [...section.children]){
        if(child===head)continue;
        if(child.matches('.rb-stats')){statRows(child,title).forEach(push);continue;}
        if(child.matches('.rb-two')){const kids=[...child.children].filter(Boolean);if(kids.length){for(let i=0;i<kids.length;i+=2)push(rowBlock(kids.slice(i,i+2),title+' panels'));continue;}}
        if(child.matches('.rb-tablewrap,.rb-analysis-copy,.rb-summary-block,.rb-conclusion-box,.rb-final-copy,.ptmri-report-conclusion,.pt-sc-note,.pt-sc-source,.rb-panel')){push(nodeBlock(child,'section-child',title));continue;}
        if(child.matches('h3,p')){push(nodeBlock(child,'section-child',title));continue;}
        const tables=[...child.querySelectorAll(':scope > .rb-tablewrap')];if(tables.length){tables.forEach(t=>push(nodeBlock(t,'section-child',title+' table')));continue;}
        if(child.children.length)push(nodeBlock(child,'section-child',title));
      }
    }
    return out.filter(x=>x.node||x.nodes?.length);
  }
  function wrapItem(item){
    const w=document.createElement('div');Object.assign(w.style,{width:CAPTURE_WIDTH+'px',height:'auto',overflow:'visible',background:'#fff',boxSizing:'border-box',padding:'0',margin:'0'});
    if(item.type==='row'){
      const grid=document.createElement('div');Object.assign(grid.style,{display:'grid',gridTemplateColumns:item.nodes.length>1?'1fr 1fr':'1fr',gap:'10px',margin:'0 30px',width:'calc(100% - 60px)',maxWidth:'calc(100% - 60px)',height:'auto',overflow:'visible'});
      item.nodes.forEach(n=>{const c=n.cloneNode(true);Object.assign(c.style,{margin:'0',width:'100%',maxWidth:'100%',height:'auto'});grid.appendChild(c);});w.appendChild(grid);
    }else{
      const c=item.node.cloneNode(true);if(item.kind==='section-child')Object.assign(c.style,{margin:'0 30px',width:'calc(100% - 60px)',maxWidth:'calc(100% - 60px)',height:'auto'});else Object.assign(c.style,{margin:'0',width:'100%',maxWidth:'100%',height:'auto'});w.appendChild(c);
    }
    normalize(w);return w;
  }
  async function snapItem(stage,item,index,total){
    stage.replaceChildren();const wrap=wrapItem(item);stage.appendChild(wrap);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=wrap.getBoundingClientRect();if(rect.width<2||rect.height<2)return null;
    status(`Rendering PDF block ${index+1} of ${total}…`);
    return withTimeout(window.html2canvas(wrap,{scale:1.2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:Math.ceil(rect.width),height:Math.ceil(rect.height),windowWidth:CAPTURE_WIDTH}),10000,`PDF capture timed out on ${item.label}.`);
  }
  function addFooter(doc,page,total,p){const company=(p.company_name||p.full_name||'').trim(),y=PAGE_H-30;doc.setFillColor(255,255,255);doc.rect(0,PAGE_H-FOOTER,PAGE_W,FOOTER,'F');doc.setDrawColor(205,217,229);doc.setLineWidth(.7);doc.line(28,y-8,PAGE_W-28,y-8);doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(34,76,111);doc.text(company?`${company}  |  ${PRODUCT}`:PRODUCT,28,y+4);doc.setFont('helvetica','normal');doc.setTextColor(105,119,137);doc.text(`${TAGLINE}  |  Page ${page} of ${total}`,PAGE_W-28,y+4,{align:'right'});}
  function addTall(doc,canvas,widthPt,startY){const usableBottom=PAGE_H-FOOTER-BOTTOM,ptPerPx=widthPt/canvas.width;let sy=0,y=startY,pagesAdded=0;while(sy<canvas.height-1){let avail=usableBottom-y;if(avail<40){doc.addPage();pagesAdded++;y=TOP;avail=usableBottom-y;}const take=Math.min(canvas.height-sy,Math.max(1,Math.floor(avail/ptPerPx)));const part=document.createElement('canvas');part.width=canvas.width;part.height=take;const ctx=part.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,part.width,part.height);ctx.drawImage(canvas,0,sy,canvas.width,take,0,0,canvas.width,take);const h=take*ptPerPx;doc.addImage(part.toDataURL('image/jpeg',0.96),'JPEG',MARGIN_X,y,widthPt,h,undefined,'FAST');y+=h;sy+=take;if(sy<canvas.height){doc.addPage();pagesAdded++;y=TOP;}}return{y,pagesAdded};}
  async function build(doc,report,stage){
    const blocks=logicalBlocks(report),usableW=PAGE_W-MARGIN_X*2,usableBottom=PAGE_H-FOOTER-BOTTOM,fullH=usableBottom-TOP;let y=TOP,page=1;
    for(let i=0;i<blocks.length;i++){
      const item=blocks[i],canvas=await snapItem(stage,item,i,blocks.length);if(!canvas)continue;const h=canvas.height*(usableW/canvas.width);
      if(h<=fullH){const headingReserve=item.keepNext?90:0,need=(y>TOP?GAP:0)+h+headingReserve;if(y>TOP&&y+need>usableBottom){doc.addPage();page++;y=TOP;}if(y>TOP)y+=GAP;doc.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',MARGIN_X,y,usableW,h,undefined,'FAST');y+=h;}
      else{if(y>TOP){doc.addPage();page++;y=TOP;}const r=addTall(doc,canvas,usableW,y);page+=r.pagesAdded;y=r.y;}
    }
    return page;
  }
  async function generate(){
    if(running)return false;running=true;const btn=document.getElementById('rbDownloadPdf');let stage=null;if(btn){btn.disabled=true;btn.textContent='Generating PDF…';}
    try{
      const source=await currentPreview();await ensureHtml2Canvas();const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('PDF library unavailable.');
      stage=makeStage();const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true}),p=profile();doc.setProperties({title:`${PRODUCT} | ${REPORT_TYPE}`,author:[p.full_name,p.company_name].filter(Boolean).join(' - ')||PRODUCT,subject:state?.address||state?.name||REPORT_TYPE,creator:PRODUCT});
      await withTimeout(build(doc,source,stage),55000,'PDF generation timed out. Please try again after refreshing the report preview.');
      const total=doc.getNumberOfPages();for(let i=1;i<=total;i++){doc.setPage(i);addFooter(doc,i,total,p);}doc.save(filename());status('PDF generated from current preview.');return true;
    }catch(e){console.error('PropertyThesis PDF export failed',e);status(e?.message||'Unable to generate PDF.');try{alert(e?.message||'Unable to generate PDF.');}catch(_e){}return false;}
    finally{stage?.remove();running=false;if(btn){btn.disabled=false;btn.textContent='Download PDF';}}
  }
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#rbDownloadPdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();generate();},true);
  window.UserBrandedPdf={generate,version:VERSION};
})();

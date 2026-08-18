'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV4Version||0)>=VERSION)return;
  window.__reportBuilderV4Version=VERSION;

  const AUTO_TABLE_SRC='https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';

  function clean(v){
    return String(v??'')
      .replace(/\u2013|\u2014/g,'-')
      .replace(/\u2018|\u2019/g,"'")
      .replace(/\u201c|\u201d/g,'"')
      .replace(/\u00a0/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function filename(){
    const raw=(state?.address||state?.name||'Investment Property Analysis').trim();
    const safe=raw.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,70)||'Investment-Property-Analysis';
    return `${safe}-Investment-Analysis.pdf`;
  }
  function setMessage(msg){
    if(typeof setStatus==='function')setStatus(msg);
    const btn=document.getElementById('rbDownloadPdf');
    if(btn)btn.dataset.status=msg;
  }
  function ensureAutoTable(){
    const jsPDF=window.jspdf?.jsPDF;
    if(jsPDF?.API?.autoTable)return Promise.resolve();
    if(window.__rbAutoTablePromise)return window.__rbAutoTablePromise;
    window.__rbAutoTablePromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=AUTO_TABLE_SRC;
      s.async=true;
      s.onload=()=>window.jspdf?.jsPDF?.API?.autoTable?resolve():reject(new Error('PDF table helper did not initialize.'));
      s.onerror=()=>reject(new Error('Unable to load the PDF table helper.'));
      document.head.appendChild(s);
    });
    return window.__rbAutoTablePromise;
  }

  function pdfText(doc,text,x,y,width,size=9,style='normal',color=[71,84,103]){
    doc.setFont('helvetica',style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines=doc.splitTextToSize(clean(text),width);
    doc.text(lines,x,y);
    return y+lines.length*(size*1.18);
  }

  function makeRenderer(doc){
    const margin=42;
    const pageW=doc.internal.pageSize.getWidth();
    const pageH=doc.internal.pageSize.getHeight();
    const contentW=pageW-margin*2;
    let y=48;
    const bottom=pageH-48;

    function newPage(){doc.addPage();y=48;}
    function need(h){if(y+h>bottom)newPage();}
    function heading(title,subtitle=''){
      need(subtitle?42:28);
      doc.setDrawColor(220,228,236);
      doc.setLineWidth(.6);
      if(y>54){doc.line(margin,y-10,pageW-margin,y-10);}
      y=pdfText(doc,title,margin,y,contentW,13,'bold',[23,50,77]);
      if(subtitle)y=pdfText(doc,subtitle,margin,y+2,contentW,8,'normal',[102,112,133]);
      y+=8;
    }
    function paragraph(text){need(45);y=pdfText(doc,text,margin,y,contentW,9,'normal',[71,84,103])+8;}
    function pairs(items){
      const colW=(contentW-12)/2;
      for(let i=0;i<items.length;i+=2){
        need(34);
        const row=items.slice(i,i+2);
        row.forEach((it,j)=>{
          const x=margin+j*(colW+12);
          doc.setDrawColor(226,231,237);doc.setFillColor(250,251,253);
          doc.roundedRect(x,y-10,colW,28,4,4,'FD');
          pdfText(doc,it.label,x+7,y-1,colW-14,7,'bold',[102,112,133]);
          pdfText(doc,it.value,x+7,y+11,colW-14,10,'bold',[23,79,131]);
        });
        y+=36;
      }
      y+=2;
    }
    function table(el,title=''){
      if(!el)return;
      const headers=[...el.querySelectorAll('thead th')].map(th=>clean(th.textContent));
      const body=[...el.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(td=>clean(td.textContent)));
      if(!headers.length&&!body.length)return;
      need(42);
      doc.autoTable({
        startY:y,
        head:headers.length?[headers]:undefined,
        body,
        margin:{left:margin,right:margin,top:48,bottom:44},
        theme:'grid',
        styles:{font:'helvetica',fontSize:6.8,cellPadding:3.5,textColor:[52,64,84],lineColor:[229,234,240],lineWidth:.35,overflow:'linebreak'},
        headStyles:{fillColor:[247,249,251],textColor:[71,84,103],fontStyle:'bold'},
        alternateRowStyles:{fillColor:[252,253,254]},
        columnStyles:{0:{halign:'left'}},
        horizontalPageBreak:true,
        horizontalPageBreakRepeat:0,
        didDrawPage:()=>{},
      });
      y=(doc.lastAutoTable?.finalY||y)+10;
    }
    return {margin,pageW,pageH,contentW,getY:()=>y,setY:v=>{y=v},newPage,need,heading,paragraph,pairs,table};
  }

  function addPageDecorations(doc){
    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p);
      const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
      doc.setDrawColor(220,228,236);doc.setLineWidth(.5);doc.line(42,h-30,w-42,h-30);
      doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(71,84,103);doc.text('MELONI REALTY',42,h-18);
      doc.setFont('helvetica','normal');doc.setTextColor(122,134,153);doc.text(`Investment Property Analysis  |  Page ${p} of ${pages}`,w-42,h-18,{align:'right'});
    }
  }

  function renderCover(doc,r){
    const report=document.querySelector('#clientReport .rb-report');
    const cover=report?.querySelector('.rb-cover');
    const conclusion=report?.querySelector('.rb-conclusion p')?.textContent||'';
    const findings=[...report?.querySelectorAll('.rb-finding')||[]].map(el=>({
      label:clean(el.querySelector('span')?.textContent),
      value:clean(el.querySelector('b')?.textContent),
      sub:clean(el.querySelector('small')?.textContent)
    }));
    doc.setFillColor(247,249,251);doc.rect(0,0,r.pageW,160,'F');
    doc.setFillColor(23,79,131);doc.rect(0,157,r.pageW,3,'F');
    pdfText(doc,'MELONI REALTY',r.margin,55,r.contentW,9,'bold',[23,79,131]);
    pdfText(doc,'Investment Property Analysis',r.margin,82,r.contentW,23,'bold',[23,32,51]);
    const addr=clean(cover?.querySelector('.address')?.textContent||state?.address||state?.name||'Income-Producing Property');
    pdfText(doc,addr,r.margin,112,r.contentW,11,'normal',[102,112,133]);
    const meta=[...cover?.querySelectorAll('.rb-meta span')||[]].map(x=>clean(x.textContent)).filter(Boolean);
    pdfText(doc,meta.join('   |   '),r.margin,137,r.contentW,7.5,'normal',[102,112,133]);
    r.setY(190);
    r.heading('Executive Investment Conclusion');
    r.paragraph(conclusion||'No investment conclusion has been entered.');
    if(findings.length){
      r.heading('Key Investment Findings');
      r.pairs(findings.map(f=>({label:f.label,value:f.value+(f.sub?` - ${f.sub}`:'')})));
    }
  }

  function renderSection(doc,r,section){
    const title=clean(section.querySelector('.rb-section-head h2')?.textContent||section.querySelector('h2')?.textContent||'');
    const subtitle=clean(section.querySelector('.rb-section-head p')?.textContent||'');
    if(!title)return;
    r.heading(title,subtitle);

    const stats=[...section.querySelectorAll('.rb-stat')].map(el=>({
      label:clean(el.querySelector('span')?.textContent),
      value:clean(el.querySelector('b')?.textContent),
      sub:clean(el.querySelector('small')?.textContent)
    }));
    if(stats.length)r.pairs(stats.map(s=>({label:s.label,value:s.value+(s.sub?` - ${s.sub}`:'')})));

    const panels=[...section.querySelectorAll('.rb-panel')];
    for(const panel of panels){
      const name=clean(panel.querySelector('h3')?.textContent||'');
      const rows=[...panel.querySelectorAll('.rb-row')].map(el=>({label:clean(el.querySelector('span')?.textContent),value:clean(el.querySelector('b')?.textContent)}));
      if(name){r.need(28);r.setY(pdfText(doc,name,r.margin,r.getY(),r.contentW,9,'bold',[52,64,84])+5);}
      if(rows.length)r.pairs(rows);
    }

    const tables=[...section.querySelectorAll('table')];
    for(const table of tables)r.table(table,title);

    const note=[...section.querySelectorAll('p')].map(p=>clean(p.textContent)).find(t=>t&&t!==subtitle&&pIsStandalone(section,t));
    if(note)r.paragraph(note);
  }
  function pIsStandalone(section,text){
    return ![...section.querySelectorAll('.rb-section-head p')].some(p=>clean(p.textContent)===text);
  }

  async function generatePdf(){
    const btn=document.getElementById('rbDownloadPdf');
    if(btn){btn.disabled=true;btn.textContent='Generating PDF...';}
    try{
      if(window.ReportBuilderV1?.renderReport)window.ReportBuilderV1.renderReport();
      await new Promise(r=>setTimeout(r,80));
      await ensureAutoTable();
      const jsPDF=window.jspdf?.jsPDF;
      if(!jsPDF)throw new Error('PDF library is unavailable.');
      const report=document.querySelector('#clientReport .rb-report');
      if(!report)throw new Error('Report preview is not available.');

      const doc=new jsPDF({unit:'pt',format:'letter',orientation:'portrait',compress:true});
      doc.setProperties({title:'Investment Property Analysis',author:'Jamie Meloni - Meloni Realty',subject:state?.address||state?.name||'Investment Property Analysis',creator:'Meloni Realty Investment Property Analyzer'});
      const r=makeRenderer(doc);
      renderCover(doc,r);
      const sections=[...report.querySelectorAll('.rb-section')];
      for(const section of sections){renderSection(doc,r,section);}
      addPageDecorations(doc);
      doc.save(filename());
      setMessage('PDF generated');
    }catch(err){
      console.error(err);
      setMessage(err?.message||'Unable to generate PDF');
      alert(err?.message||'Unable to generate PDF.');
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Download PDF';}
    }
  }

  function addControls(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    const badge=controls.querySelector('.badge');
    if(badge)badge.textContent='Page 3 • PDF Export';
    if(document.getElementById('rbDownloadPdf'))return true;
    const pass2=document.querySelector('#rbControls .rb-pass2-actions');
    const host=pass2||controls.querySelector('.rb-actions')||controls;
    const btn=document.createElement('button');
    btn.type='button';btn.id='rbDownloadPdf';btn.className='btn primary';btn.textContent='Download PDF';
    if(pass2){pass2.prepend(btn);}else{host.appendChild(btn);}
    btn.addEventListener('click',generatePdf);
    const note=controls.querySelector('.rb-export-note');
    if(note)note.textContent='Download PDF creates a client-ready PDF directly from the current report selections. Print / Save PDF remains available as a browser-print fallback.';
    return true;
  }

  function apply(){addControls();return true;}
  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="report"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReportBuilderV4={apply,generatePdf};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

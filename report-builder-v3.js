'use strict';
(() => {
  const VERSION=1;
  if((window.__reportBuilderV3Version||0)>=VERSION)return;
  window.__reportBuilderV3Version=VERSION;

  const PREF_KEY='meloni-report-builder-v1';
  const RECON_KEY='meloni-review-reconciliation-v1';

  function money(v){return typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');}
  function pct(v){return typeof fmtP==='function'?fmtP(v):(Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A');}
  function mult(v){return typeof fmtX==='function'?fmtX(v):(Number.isFinite(v)?v.toFixed(2)+'x':'N/A');}
  function esc(v){return String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
  function prefs(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){return {};}}
  function savePrefs(p){try{localStorage.setItem(PREF_KEY,JSON.stringify(p));}catch(e){}}
  function analysisKey(){const address=(state?.address||'').trim(),name=(state?.name||'').trim();return address||name||'current-analysis';}
  function recon(){try{return (JSON.parse(localStorage.getItem(RECON_KEY)||'{}')||{})[analysisKey()]||{};}catch(e){return {};}}

  function injectStyles(){
    if(document.getElementById('reportBuilderV3Styles'))return;
    const st=document.createElement('style');
    st.id='reportBuilderV3Styles';
    st.textContent=`
      #clientReport .rb-findings{padding:16px 30px 20px;border-top:1px solid #e8edf2}
      #clientReport .rb-findings h2{font-size:15px;margin:0 0 10px;color:#172033}
      #clientReport .rb-findings-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      #clientReport .rb-finding{border:1px solid #e2e7ed;border-radius:9px;background:#fafbfd;padding:10px;min-width:0}
      #clientReport .rb-finding span{display:block;font-size:9px;color:#667085;font-weight:750;line-height:1.3}
      #clientReport .rb-finding b{display:block;font-size:14px;color:#174f83;margin-top:4px;line-height:1.25}
      #clientReport .rb-finding small{display:block;font-size:8px;color:#667085;margin-top:4px;line-height:1.4}
      #clientReport .rb-finding.good{background:#f4faf6;border-color:#cbe8d8}
      #clientReport .rb-finding.warn{background:#fffaf3;border-color:#fed7aa}
      #clientReport .rb-sensitivity-note{font-size:8.5px;line-height:1.5;color:#667085;margin:8px 0 0}
      #clientReport .rb-sensitivity-table td.current,#clientReport .rb-sensitivity-table th.current{font-weight:800;background:#eef4fa;color:#174f83}
      #clientReport .rb-sensitivity-table td.meets{background:#f4faf6}
      #clientReport .rb-sensitivity-table td.below{background:#fffaf3}
      #rbControls .rb-pass3-note{margin-top:8px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid #e1e6ed;font-size:9px;line-height:1.45;color:#667085}
      @media(max-width:900px){#clientReport .rb-findings-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:600px){#clientReport .rb-findings-grid{grid-template-columns:1fr}}
      @media print{
        #clientReport .rb-findings{padding:10pt 20pt 12pt!important;break-inside:avoid!important;page-break-inside:avoid!important}
        #clientReport .rb-findings h2{font-size:11pt!important;margin-bottom:7pt!important}
        #clientReport .rb-findings-grid{grid-template-columns:repeat(4,1fr)!important;gap:5pt!important}
        #clientReport .rb-finding{padding:6pt!important;border-radius:5pt!important;break-inside:avoid!important;page-break-inside:avoid!important}
        #clientReport .rb-finding span{font-size:6.7pt!important}
        #clientReport .rb-finding b{font-size:9.5pt!important;margin-top:2pt!important}
        #clientReport .rb-finding small{font-size:6.1pt!important}
        #clientReport [data-rb-section="sensitivity"]{break-before:page!important;page-break-before:always!important}
        #clientReport .rb-sensitivity-table{font-size:6.6pt!important}
      }
    `;
    document.head.appendChild(st);
  }

  function positionText(price,low,high,reconciled){
    if(Number.isFinite(reconciled)&&reconciled>0){
      const d=price-reconciled,p=Math.abs(d/reconciled);
      if(Math.abs(d)<1)return {value:'At Reconciled Value',sub:`Reconciled value ${money(reconciled)}`,tone:'good'};
      return {value:`${pct(p)} ${d>0?'Premium':'Discount'}`,sub:`Reconciled value ${money(reconciled)}`,tone:d<=0?'good':'warn'};
    }
    if(Number.isFinite(low)&&Number.isFinite(high)){
      if(price<low)return {value:'Below Income Range',sub:`Support ${money(low)} – ${money(high)}`,tone:'good'};
      if(price<=high)return {value:'Within Income Range',sub:`Support ${money(low)} – ${money(high)}`,tone:'good'};
      return {value:'Above Income Range',sub:`Support ${money(low)} – ${money(high)}`,tone:'warn'};
    }
    return {value:'Review Valuation',sub:'Income support unavailable',tone:''};
  }

  function addFindings(){
    const report=document.querySelector('#clientReport .rb-report');
    const conclusion=report?.querySelector('.rb-conclusion');
    if(!report||!conclusion||!result||!state||!result.years?.length)return false;
    report.querySelector('.rb-findings')?.remove();
    const y1=result.years[0],eq=-result.initial,coc=eq?y1.atcf/eq:NaN;
    const support=[result.capValue,result.grmValue].filter(Number.isFinite);
    const low=support.length?Math.min(...support):NaN,high=support.length?Math.max(...support):NaN;
    const rd=recon(),rv=Number(rd.reconciled);
    const pos=positionText(state.price,low,high,rv);
    const irrMeets=Number.isFinite(result.IRR)&&result.IRR>=state.requiredReturn;
    const dscrMeets=!Number.isFinite(y1.dcr)||y1.dcr>=1.25;
    const cashTone=Number.isFinite(coc)?(coc>=.08?'good':coc>=0?'':'warn'):'';
    const findings=document.createElement('section');
    findings.className='rb-findings';
    findings.innerHTML=`<h2>Key Investment Findings</h2><div class="rb-findings-grid">
      <div class="rb-finding ${pos.tone}"><span>Acquisition Position</span><b>${esc(pos.value)}</b><small>${esc(pos.sub)}</small></div>
      <div class="rb-finding ${irrMeets?'good':'warn'}"><span>Return Requirement</span><b>${pct(result.IRR)} IRR</b><small>${irrMeets?'Meets or exceeds':'Below'} ${pct(state.requiredReturn)} required return</small></div>
      <div class="rb-finding ${dscrMeets?'good':'warn'}"><span>Debt Coverage</span><b>${Number.isFinite(y1.dcr)?mult(y1.dcr):'All Cash'}</b><small>${Number.isFinite(y1.dcr)?`${dscrMeets?'At or above':'Below'} 1.25x reference coverage`:'No debt service modeled'}</small></div>
      <div class="rb-finding ${cashTone}"><span>Year 1 Cash Yield</span><b>${pct(coc)}</b><small>After-tax cash-on-cash return on ${money(eq)} initial cash investment</small></div>
    </div>`;
    conclusion.insertAdjacentElement('afterend',findings);
    return true;
  }

  function sensitivityState(priceFactor,rentFactor){
    const basePrice=state.price||0;
    const price=basePrice*priceFactor;
    const ltv=basePrice?state.mortgage/basePrice:0;
    const landRatio=basePrice?state.land/basePrice:0;
    return {...state,price,rent:state.rent*rentFactor,land:Math.max(0,Math.min(price,price*landRatio)),mortgage:state.mortgage>0?price*ltv:0};
  }

  function sensitivitySection(){
    const factors=[.90,.95,1,1.05,1.10];
    const labels=factors.map(f=>(f*100-100>=0?'+':'')+(f*100-100).toFixed(0)+'%');
    const rows=factors.map((rf,ri)=>{
      const cells=factors.map((pf,pi)=>{
        const rr=analyze(sensitivityState(pf,rf));
        const irr=rr.IRR;
        const cls=(ri===2&&pi===2?'current ':'')+(Number.isFinite(irr)&&(irr>=state.requiredReturn)?'meets':'below');
        return `<td class="${cls.trim()}">${pct(irr)}</td>`;
      }).join('');
      return `<tr><th class="${ri===2?'current':''}">${labels[ri]}</th>${cells}</tr>`;
    }).join('');
    return `<section class="rb-section" data-rb-section="sensitivity"><div class="rb-section-head"><h2>IRR Sensitivity — Purchase Price × Monthly Rent</h2><p>Shows how modeled IRR changes when acquisition price and starting rent move around the current assumptions.</p></div><div class="rb-tablewrap"><table class="rb-sensitivity-table"><thead><tr><th>Rent Change ↓ / Price Change →</th>${labels.map((l,i)=>`<th class="${i===2?'current':''}">${l}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="rb-sensitivity-note">The center cell is the current analysis. Purchase-price scenarios preserve the current loan-to-value ratio and land-value ratio so leverage remains comparable across the matrix. Green cells meet or exceed the selected ${pct(state.requiredReturn)} required return.</p></section>`;
  }

  function addSensitivity(){
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)return false;
    report.querySelector('[data-rb-section="sensitivity"]')?.remove();
    if(!prefs().includeSensitivity)return true;
    const footer=report.querySelector('.rb-footer');
    if(footer)footer.insertAdjacentHTML('beforebegin',sensitivitySection());
    else report.insertAdjacentHTML('beforeend',sensitivitySection());
    return true;
  }

  function refineControls(){
    const controls=document.getElementById('rbControls');
    if(!controls)return false;
    const badge=controls.querySelector('.badge');
    if(badge)badge.textContent='Page 3 • Pass 3';
    controls.querySelectorAll('.rb-toggle span').forEach(span=>{
      if(span.textContent.includes('Sensitivity Analysis'))span.textContent='IRR Sensitivity — Price × Rent';
    });
    if(!controls.querySelector('.rb-pass3-note')){
      const note=document.createElement('div');
      note.className='rb-pass3-note';
      note.textContent='Core Client Report keeps the executive, valuation, financing, operating, disposition and return sections concise. Detailed schedules and sensitivity can be added only when they improve the client discussion.';
      controls.appendChild(note);
    }
    const core=document.getElementById('rbSelectCore');
    if(core&&!core.dataset.pass3){
      core.dataset.pass3='1';
      core.addEventListener('click',()=>{
        const p={...prefs(),includeAssumptions:true,includeValuation:true,includeFinancing:true,includeOperating:true,includeDisposition:true,includeReturns:true,includeDetailedCashflow:false,includeTaxOperations:false,includeSaleTax:false,includeInvestmentCashflow:false,includeSensitivity:false};
        savePrefs(p);
        setTimeout(()=>{
          document.querySelectorAll('[data-rb-pref]').forEach(el=>{if(Object.prototype.hasOwnProperty.call(p,el.dataset.rbPref))el.checked=!!p[el.dataset.rbPref];});
          if(window.ReportBuilderV1?.renderReport)window.ReportBuilderV1.renderReport();
        },0);
      });
    }
    return true;
  }

  function apply(){
    injectStyles();
    refineControls();
    addFindings();
    addSensitivity();
    return true;
  }

  const oldRender=window.ReportBuilderV1?.renderReport;
  if(typeof oldRender==='function'&&!oldRender.__pass3Wrapped){
    const wrapped=function(...args){
      const out=oldRender.apply(this,args);
      setTimeout(apply,0);
      return out;
    };
    wrapped.__pass3Wrapped=true;
    window.ReportBuilderV1.renderReport=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="report"]')?.addEventListener('click',()=>setTimeout(apply,0));
    document.getElementById('report')?.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))setTimeout(apply,0);});
  }

  window.ReportBuilderV3={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

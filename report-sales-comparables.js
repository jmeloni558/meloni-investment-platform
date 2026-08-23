'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptReportSalesComparablesV||0)>=VERSION)return;
  window.__ptReportSalesComparablesV=VERSION;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const number=v=>Number.isFinite(Number(v))?Number(v):null;
  const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
  const med=a=>{const x=a.filter(Number.isFinite).sort((a,b)=>a-b);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;};
  const date=v=>{try{return v?new Date(v).toLocaleDateString():'—';}catch(_e){return '—';}};

  function selected(){
    try{
      const s=state?.marketEvidence?.salesComps;
      if(Array.isArray(s?.selectedComps))return s.selectedComps.filter(Boolean);
      if(Array.isArray(s?.candidates)&&Array.isArray(s?.selectedIds)){
        const ids=new Set(s.selectedIds.map(String));
        return s.candidates.filter(c=>ids.has(String(c?.id)));
      }
    }catch(_e){}
    return [];
  }

  function pool(c){
    if(c?.hasPool===true)return c.poolType?`Yes — ${c.poolType}`:'Yes';
    if(c?.hasPool===false)return 'No';
    return 'Unknown';
  }

  function ensureStyles(){
    let s=document.getElementById('ptReportSalesComparablesStyles');
    if(!s){s=document.createElement('style');s.id='ptReportSalesComparablesStyles';document.head.appendChild(s);}
    s.textContent=`
      #clientReport [data-rb-section="salesComparables"] .pt-sc-note{margin:0 0 14px;padding:13px 15px;border:1px solid #dbe5ed;border-left:4px solid #175c92;border-radius:8px;background:#f7fbfe;color:#475467;font-size:11.5px;line-height:1.6}
      #clientReport [data-rb-section="salesComparables"] .pt-sc-source{margin-top:9px;color:#7a8699;font-size:9px;line-height:1.45}
      #clientReport [data-rb-section="salesComparables"] .pt-sc-address{font-weight:700;color:#344054;white-space:normal}
      #clientReport [data-rb-section="salesComparables"] td,#clientReport [data-rb-section="salesComparables"] th{white-space:normal!important;vertical-align:middle}
      #clientReport [data-rb-section="salesComparables"] td:first-child{min-width:170px}
      #clientReport .pt-pdf-capture [data-rb-section="salesComparables"] .pt-sc-note{font-size:10px!important;line-height:1.45!important}
      #clientReport .pt-pdf-capture [data-rb-section="salesComparables"] td,#clientReport .pt-pdf-capture [data-rb-section="salesComparables"] th{font-size:7.7px!important;padding:5px 3px!important}
    `;
  }

  function build(comps){
    const prices=comps.map(c=>number(c.lastSalePrice)).filter(v=>v!=null);
    const ppsf=comps.map(c=>number(c.pricePerSquareFoot)).filter(v=>v!=null);
    const distances=comps.map(c=>number(c.distanceMiles)).filter(v=>v!=null);
    const lo=prices.length?Math.min(...prices):null,hi=prices.length?Math.max(...prices):null;
    const units=Math.max(1,Math.round(Number(state?.units)||1));
    const emphasis=units<=4
      ?`For this ${units===1?'1-unit property':units+'-unit property'}, selected comparable sales provide useful market evidence alongside the income approaches. They should be considered together with differences in size, age, condition, location, amenities and income performance rather than treated as an automatic value conclusion.`
      :`This analysis contains ${units} units. For properties above 4 units, the income approach is generally the primary valuation method. The selected transactions below are presented as secondary market evidence to benchmark pricing and investor behavior rather than as the primary basis for value.`;

    const stat=(label,value,sub='')=>`<div class="rb-stat"><span>${esc(label)}</span><b>${esc(value)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div>`;
    const rows=comps.map(c=>`<tr><td><div class="pt-sc-address">${esc(c.formattedAddress||'Unknown address')}</div>${c.subdivision?`<div style="font-size:8px;color:#7a8699">${esc(c.subdivision)}</div>`:''}</td><td>${esc(date(c.lastSaleDate))}</td><td>${esc(money(c.lastSalePrice))}</td><td>${c.pricePerSquareFoot!=null?'$'+Number(c.pricePerSquareFoot).toFixed(0):'—'}</td><td>${c.squareFootage?Number(c.squareFootage).toLocaleString():'—'}</td><td>${c.yearBuilt||'—'}</td><td>${c.bedrooms??'—'} / ${c.bathrooms??'—'}</td><td>${esc(pool(c))}</td><td>${c.distanceMiles!=null?Number(c.distanceMiles).toFixed(2)+' mi':'—'}</td><td>${c.similarityScore??'—'}</td></tr>`).join('');

    return `<section class="rb-section" data-rb-section="salesComparables"><div class="rb-section-head"><h2>Comparable Sales / Market Evidence</h2><p>Selected recent sales used as market support for the investment and valuation analysis.</p></div><div class="pt-sc-note">${esc(emphasis)}</div><div class="rb-stats">${stat('Selected Comparables',String(comps.length))}${stat('Median Sale Price',money(med(prices)))}${stat('Average Sale $/SF',ppsf.length?'$'+avg(ppsf).toFixed(0):'—')}${stat('Sale Price Range',prices.length?money(lo)+' – '+money(hi):'—')}${stat('Average Distance',distances.length?avg(distances).toFixed(2)+' mi':'—')}</div><div class="rb-tablewrap" style="margin-top:14px"><table><thead><tr><th>Comparable</th><th>Sale Date</th><th>Sale Price</th><th>$/SF</th><th>GLA</th><th>Year</th><th>Bed/Bath</th><th>Pool</th><th>Distance</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></div><div class="pt-sc-source">Comparable property data was retrieved through PropertyThesis market-data services. Selection and reconciliation remain the responsibility of the analyst/user; the similarity score is a screening aid and is not an appraisal adjustment or automated value conclusion.</div></section>`;
  }

  function apply(){
    ensureStyles();
    const report=document.querySelector('#clientReport .rb-report');
    if(!report)return false;
    report.querySelector(':scope > [data-rb-section="salesComparables"]')?.remove();
    const comps=selected();
    if(!comps.length)return true;
    const wrap=document.createElement('div');wrap.innerHTML=build(comps);const section=wrap.firstElementChild;
    const valuation=report.querySelector(':scope > [data-rb-section="valuation"]');
    const assumptions=report.querySelector(':scope > [data-rb-section="assumptions"]');
    const snapshot=report.querySelector(':scope > [data-rb-section="snapshot"]');
    const anchor=valuation||assumptions||snapshot;
    if(anchor)anchor.insertAdjacentElement('afterend',section);else report.querySelector(':scope > .rb-footer')?.insertAdjacentElement('beforebegin',section)||report.appendChild(section);
    return true;
  }

  let pending=false;
  function schedule(){if(pending)return;pending=true;setTimeout(()=>{pending=false;apply();},60);}
  function start(){
    apply();
    const host=document.getElementById('clientReport');
    if(host)new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n?.nodeType===1&&n.matches?.('.rb-report'))))schedule();}).observe(host,{childList:true});
    document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#rbDownloadPdf'))schedule();},true);
    document.addEventListener('propertythesis:analysis-loaded',schedule);
  }

  window.ReportSalesComparables={version:VERSION,apply,selected};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
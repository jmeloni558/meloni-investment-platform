'use strict';
(()=>{
  const VERSION=2;
  if((window.__reportInvestmentOfferAnalysisVersion||0)>=VERSION)return;
  window.__reportInvestmentOfferAnalysisVersion=VERSION;

  const PREF_KEY='propertythesis-report-offer-analysis-v1';
  const finite=v=>Number.isFinite(Number(v));
  const money=v=>finite(v)?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const pct=(v,d=2)=>finite(v)?(Number(v)*100).toFixed(d)+'%':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  function enabled(){try{const raw=localStorage.getItem(PREF_KEY);return raw===null?true:raw==='1';}catch(_e){return true;}}
  function setEnabled(v){try{localStorage.setItem(PREF_KEY,v?'1':'0');}catch(_e){}}
  function calc(){try{return window.InvestmentOfferAnalysis?.calculate?.()||null;}catch(_e){return null;}}

  function ensureStyles(){if(document.getElementById('ptReportOfferStyles'))return;const s=document.createElement('style');s.id='ptReportOfferStyles';s.textContent=`
    #clientReport .pt-offer-whole{margin:0!important;padding:0!important;background:transparent!important;border:0!important;border-radius:0!important;color:inherit!important}
    #clientReport .pt-offer-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    #clientReport .pt-offer-stat{background:#f8fafc;border:1px solid #e1e7ed;border-radius:9px;padding:12px;min-height:62px}
    #clientReport .pt-offer-stat span{display:block;font-size:10px;color:#667085;font-weight:750;line-height:1.3}
    #clientReport .pt-offer-stat b{display:block;font-size:16px;color:#174f83;margin-top:4px;line-height:1.2}
    #clientReport .pt-offer-stat small{display:block;font-size:9px;color:#667085;margin-top:4px;line-height:1.35}
    #clientReport .pt-offer-recommendation{margin-top:12px;padding:12px 14px;border-left:4px solid #14b8a6;background:#f3fbfa;border-radius:8px;color:#405269;font-size:10.5px;line-height:1.55}
    #clientReport .pt-offer-recommendation b{color:#173f66}
    #clientReport .pt-offer-ladder{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
    #clientReport .pt-offer-ladder>div{border:1px solid #e1e7ed;border-radius:9px;padding:9px;background:#fafbfd;text-align:center}
    #clientReport .pt-offer-ladder span{display:block;font-size:9px;color:#667085;font-weight:700}
    #clientReport .pt-offer-ladder b{display:block;font-size:13px;color:#174f83;margin-top:3px}
    #clientReport .pt-offer-method{margin-top:9px;font-size:8.5px;line-height:1.45;color:#7a8699}
    #rbControls .pt-offer-report-toggle{display:flex;gap:7px;align-items:flex-start;border:1px solid #e1e6ed;border-radius:8px;padding:8px;background:#fafbfd;font-size:10px;color:#475467;line-height:1.35}
    #rbControls .pt-offer-report-toggle input{margin-top:1px}
    @media(max-width:700px){#clientReport .pt-offer-grid,#clientReport .pt-offer-ladder{grid-template-columns:repeat(2,1fr)}}
    @media print{#clientReport .pt-offer-stat{padding:7pt!important;min-height:0!important}#clientReport .pt-offer-stat span{font-size:6.8pt!important}#clientReport .pt-offer-stat b{font-size:10pt!important}#clientReport .pt-offer-stat small{font-size:6.2pt!important}#clientReport .pt-offer-recommendation{font-size:7.7pt!important}#clientReport .pt-offer-method{font-size:6.2pt!important}}
  `;document.head.appendChild(s);}

  function recommendation(d){if(!d||!finite(d.maxSupported))return'';const gap=Number(d.price)-Number(d.maxSupported);if(gap>1)return `The current acquisition price of ${money(d.price)} is ${money(gap)} above the maximum modeled price that satisfies both the selected ${pct(d.desiredCap)} capitalization-rate target and ${pct(d.requiredReturn)} required IRR. PropertyThesis indicates a maximum supported price of approximately ${money(d.maxSupported)} and, using the selected ${pct(d.openingDiscount,0)} negotiation discount, a suggested opening offer of approximately ${money(d.opening)}.`;if(gap<-1)return `The current acquisition price of ${money(d.price)} is ${money(Math.abs(gap))} below the maximum modeled price that satisfies both the selected ${pct(d.desiredCap)} capitalization-rate target and ${pct(d.requiredReturn)} required IRR. PropertyThesis indicates a maximum supported price of approximately ${money(d.maxSupported)} and, using the selected ${pct(d.openingDiscount,0)} negotiation discount, a suggested opening offer of approximately ${money(d.opening)}.`;return `The current acquisition price of ${money(d.price)} is approximately equal to the maximum modeled price that satisfies both the selected ${pct(d.desiredCap)} capitalization-rate target and ${pct(d.requiredReturn)} required IRR. Using the selected ${pct(d.openingDiscount,0)} negotiation discount, the suggested opening offer is approximately ${money(d.opening)}.`;}
  function stat(label,value,sub=''){return `<div class="pt-offer-stat"><span>${label}</span><b>${value}</b>${sub?`<small>${sub}</small>`:''}</div>`;}
  function sectionHtml(d){const gap=finite(d.gap)?Number(d.gap):NaN,gapSub=finite(d.gapPct)?`${Math.abs(Number(d.gapPct)*100).toFixed(1)}% ${gap>0?'above':'below'} maximum support`:'';return `<section class="rb-section pt-offer-report" data-rb-section="offerAnalysis"><div class="rb-section-head"><h2>Investment Recommendation / Offer Analysis</h2><p>Acquisition guidance based on the selected capitalization-rate and required-return benchmarks.</p></div><div class="rb-analysis-copy pt-offer-whole"><div class="pt-offer-grid">${stat('Current Acquisition Price',money(d.price),`Cap ${pct(result?.cap)} • IRR ${pct(result?.IRR)}`)}${stat('Price Supported by Target Cap',money(d.capPrice),`Maximum at ${pct(d.desiredCap)} Year 1 cap`)}${stat('Price Supported by Required IRR',money(d.irrPrice),`Maximum at ${pct(d.requiredReturn)} modeled IRR`)}${stat('Maximum Price Meeting Both',money(d.maxSupported),'Lower of cap- and IRR-supported prices')}${stat('Suggested Opening Offer',money(d.opening),`${pct(d.openingDiscount,0)} below maximum supported price`)}${stat('Price Gap to Maximum Support',finite(gap)?money(Math.abs(gap)):'—',esc(gapSub))}${stat('Rent Needed for Target Cap',money(d.capRent),'Monthly rent at current acquisition price')}${stat('Rent Needed for Required IRR',money(d.irrRent),'Monthly rent at current acquisition price')}</div><div class="pt-offer-recommendation"><b>PropertyThesis Acquisition Guidance:</b> ${esc(recommendation(d))}</div><div class="pt-offer-ladder">${(d.ladder||[]).map(x=>`<div><span>${pct(x.rate,0)} Cap Purchase Price</span><b>${money(x.price)}</b></div>`).join('')}</div><div class="pt-offer-method">Methodology: price scenarios preserve the current loan-to-value and land-value ratios. The maximum supported price is the lower of the price satisfying the selected cap-rate target and the price satisfying the selected required IRR. The opening offer discount is a negotiation preference and does not change the underlying valuation assumptions.</div></div></section>`;}

  function injectToggle(){const grid=document.querySelector('#rbControls .rb-toggle-grid');if(!grid)return false;let label=grid.querySelector('.pt-offer-report-toggle');if(!label){label=document.createElement('label');label.className='pt-offer-report-toggle';label.innerHTML=`<input type="checkbox" data-pt-offer-report><span>Investment Recommendation / Offer Analysis</span>`;grid.appendChild(label);label.querySelector('input').addEventListener('change',e=>{setEnabled(e.target.checked);apply();});}label.querySelector('input').checked=enabled();return true;}
  function apply(){ensureStyles();injectToggle();const report=document.querySelector('#clientReport .rb-report');if(!report)return false;report.querySelector(':scope > .pt-offer-report')?.remove();if(!enabled())return true;const d=calc();if(!d)return false;const wrap=document.createElement('div');wrap.innerHTML=sectionHtml(d);const sec=wrap.firstElementChild,returns=report.querySelector(':scope > [data-rb-section="returns"]'),valuation=report.querySelector(':scope > [data-rb-section="valuation"]'),summary=report.querySelector(':scope > [data-rb-section="analysisSummary"]');if(returns)returns.insertAdjacentElement('afterend',sec);else if(valuation)valuation.insertAdjacentElement('afterend',sec);else if(summary)summary.insertAdjacentElement('afterend',sec);else report.appendChild(sec);return true;}
  function schedule(){setTimeout(apply,0);setTimeout(apply,100);setTimeout(apply,260);}
  const branding=window.PropertyThesisReportBranding;if(branding?.apply&&!branding.__offerAnalysisV2Wrapped){const original=branding.apply.bind(branding);branding.apply=function(){const out=original();try{apply();}catch(_e){}return out;};branding.__offerAnalysisV2Wrapped=true;}
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectCore,#rbSelectAll,#rbDownloadPdf'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);
  window.ReportInvestmentOfferAnalysis={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();

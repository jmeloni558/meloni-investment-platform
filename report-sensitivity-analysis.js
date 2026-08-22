'use strict';
(()=>{
  const VERSION=1;
  if((window.__reportSensitivityAnalysisVersion||0)>=VERSION)return;
  window.__reportSensitivityAnalysisVersion=VERSION;

  const priceFactors=[0.90,0.95,1.00,1.05,1.10];
  const rentFactors=[0.90,0.95,1.00,1.05,1.10];

  const money=v=>typeof fmtC==='function'?fmtC(v):(Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A');
  const pct=v=>typeof fmtP==='function'?fmtP(v):(Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A');

  function scenarioState(priceFactor,rentFactor){
    const basePrice=Number(state?.price)||0;
    const baseMortgage=Number(state?.mortgage)||0;
    const baseLand=Number(state?.land)||0;
    const ltv=basePrice>0?baseMortgage/basePrice:0;
    const landRatio=basePrice>0?baseLand/basePrice:0;
    const price=basePrice*priceFactor;
    return {
      ...state,
      price,
      rent:(Number(state?.rent)||0)*rentFactor,
      land:Math.max(0,Math.min(price,price*landRatio)),
      mortgage:baseMortgage>0?price*ltv:0
    };
  }

  function calc(priceFactor,rentFactor){
    try{
      const rr=analyze(scenarioState(priceFactor,rentFactor));
      return {irr:rr?.IRR,npv:rr?.NPV,cap:rr?.cap,atcf:rr?.years?.[0]?.atcf};
    }catch(_e){return {irr:NaN,npv:NaN,cap:NaN,atcf:NaN};}
  }

  function matrix(metric,formatter){
    const basePrice=Number(state?.price)||0;
    const baseRent=Number(state?.rent)||0;
    const head=`<thead><tr><th>Purchase Price</th>${rentFactors.map(rf=>`<th>${money(baseRent*rf)}/mo<br><small>${Math.round(rf*100)}% rent</small></th>`).join('')}</tr></thead>`;
    const body=priceFactors.map(pf=>{
      const cells=rentFactors.map(rf=>{
        const v=calc(pf,rf)[metric];
        const base=pf===1&&rf===1;
        return `<td${base?' class="rb-sens-base"':''}>${formatter(v)}</td>`;
      }).join('');
      return `<tr><td><strong>${money(basePrice*pf)}</strong><br><small>${Math.round(pf*100)}% price</small></td>${cells}</tr>`;
    }).join('');
    return `<div class="rb-tablewrap rb-sens-table"><table>${head}<tbody>${body}</tbody></table></div>`;
  }

  function ensureStyles(){
    let st=document.getElementById('reportSensitivityStyles');
    if(!st){st=document.createElement('style');st.id='reportSensitivityStyles';document.head.appendChild(st);}
    st.textContent=`
      #clientReport [data-rb-section="sensitivity"] .rb-sens-intro{margin:0 0 14px;color:#526173;font-size:12.5px;line-height:1.65}
      #clientReport [data-rb-section="sensitivity"] .rb-sens-block{margin-top:15px}
      #clientReport [data-rb-section="sensitivity"] .rb-sens-block h3{margin:0 0 7px;color:#31465d;font-size:12px}
      #clientReport [data-rb-section="sensitivity"] .rb-sens-base{background:#eaf3fb!important;font-weight:800;color:#174f83}
      #clientReport [data-rb-section="sensitivity"] .rb-sens-table th,#clientReport [data-rb-section="sensitivity"] .rb-sens-table td{text-align:center!important;white-space:normal!important;min-width:82px}
      #clientReport [data-rb-section="sensitivity"] .rb-sens-table th:first-child,#clientReport [data-rb-section="sensitivity"] .rb-sens-table td:first-child{text-align:left!important;min-width:105px}
      #clientReport [data-rb-section="sensitivity"] .rb-sens-note{margin-top:10px;font-size:10.5px;line-height:1.55;color:#667085}
    `;
  }

  function apply(){
    const section=document.querySelector('#clientReport [data-rb-section="sensitivity"]');
    if(!section||!window.state||typeof analyze!=='function')return false;
    ensureStyles();
    const head=section.querySelector('.rb-section-head');
    if(head){
      const sub=head.querySelector('p');
      if(sub)sub.textContent='Purchase-price and monthly-rent sensitivity using the same underwriting assumptions and calculation engine as the primary analysis.';
    }
    const body=`
      <p class="rb-sens-intro">The tables below show how the modeled return changes when acquisition price and initial monthly rent vary by ±5% and ±10%. Financing is adjusted at the same loan-to-value ratio as the base analysis, while all other assumptions remain unchanged. The highlighted center cell is the current modeled scenario.</p>
      <div class="rb-sens-block"><h3>Internal Rate of Return (IRR)</h3>${matrix('irr',pct)}</div>
      <div class="rb-sens-block"><h3>Net Present Value (NPV)</h3>${matrix('npv',money)}</div>
      <div class="rb-sens-note">Sensitivity results are scenario tests, not forecasts. They illustrate how changes in purchase price and rent affect modeled returns while holding vacancy, operating expenses, financing rate, appreciation, taxes, holding period and selling costs constant.</div>`;
    [...section.children].forEach(el=>{if(!el.classList.contains('rb-section-head'))el.remove();});
    section.insertAdjacentHTML('beforeend',body);
    return true;
  }

  function schedule(){setTimeout(apply,0);setTimeout(apply,60);setTimeout(apply,180);}
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-s8-tab="report"],[data-tab="report"],#rbRefresh,#rbSelectAll,#rbDownloadPdf')){
      apply();schedule();
    }
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-rb-pref]'))schedule();},true);

  const host=document.getElementById('clientReport');
  if(host&&window.MutationObserver){
    const obs=new MutationObserver(()=>{if(document.querySelector('#clientReport [data-rb-section="sensitivity"]'))setTimeout(apply,0);});
    obs.observe(host,{childList:true,subtree:true});
  }

  window.ReportSensitivityAnalysis={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();

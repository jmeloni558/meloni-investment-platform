'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisAssumptionIntelligenceV||0)>=VERSION)return;
  window.__propertyThesisAssumptionIntelligenceV=VERSION;

  const n=v=>Number(v);
  const finite=v=>Number.isFinite(n(v));
  const pct=v=>finite(v)?(n(v)*100).toFixed(1).replace(/\.0$/,'')+'%':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const analyses=()=>{try{return cloudAnalyses||[];}catch(_e){return [];}};

  function item(key,label,value,rating,reason){return {key,label,value,rating,reason};}
  function rateAssumptions(s={}){
    const out=[];
    const vacancy=n(s.vacancy);
    if(!finite(vacancy)) out.push(item('vacancy','Vacancy & Credit Loss','—','Needs Support','Enter a vacancy assumption supported by operating history or market evidence.'));
    else if(vacancy<.04) out.push(item('vacancy','Vacancy & Credit Loss',pct(vacancy),'Aggressive','Below 4% leaves little allowance for turnover or credit loss unless the property history strongly supports it.'));
    else if(vacancy<=.08) out.push(item('vacancy','Vacancy & Credit Loss',pct(vacancy),'Reasonable','Falls within a moderate underwriting range; property and local vacancy evidence should still be considered.'));
    else out.push(item('vacancy','Vacancy & Credit Loss',pct(vacancy),'Conservative','Provides a larger allowance for vacancy and collection loss, reducing modeled income.'));

    const op=n(s.opEx);
    if(!finite(op)||op<=0) out.push(item('opEx','Operating Expenses','—','Needs Support','Operating expenses materially affect NOI and should be supported by a budget or operating history.'));
    else if(op<.25) out.push(item('opEx','Operating Expenses',pct(op)+' of EGI','Aggressive','Below 25% of EGI can understate taxes, insurance, repairs, management, utilities or reserves for many properties.'));
    else if(op<=.45) out.push(item('opEx','Operating Expenses',pct(op)+' of EGI','Reasonable','Falls within a broad screening range, but the actual property expense budget remains more important than the percentage alone.'));
    else out.push(item('opEx','Operating Expenses',pct(op)+' of EGI','Conservative','A higher expense load reduces NOI and may be appropriate for expense-heavy properties.'));

    const rg=n(s.rentGrowth);
    if(!finite(rg)) out.push(item('rentGrowth','Annual Rent Growth','—','Needs Support','Use local rent trends and the property’s competitive position.'));
    else if(rg>0.04) out.push(item('rentGrowth','Annual Rent Growth',pct(rg),'Aggressive','Growth above 4% compounds quickly and should be supported by strong market evidence.'));
    else if(rg>=.02) out.push(item('rentGrowth','Annual Rent Growth',pct(rg),'Reasonable','A moderate long-term growth assumption that should still be checked against local rent trends.'));
    else out.push(item('rentGrowth','Annual Rent Growth',pct(rg),'Conservative','Lower rent growth reduces reliance on future increases to produce the modeled return.'));

    const app=n(s.appreciation);
    if(!finite(app)) out.push(item('appreciation','Property Appreciation','—','Needs Support','Future appreciation is uncertain and should be based on a supportable long-term view.'));
    else if(app>0.05) out.push(item('appreciation','Property Appreciation',pct(app),'Aggressive','Appreciation above 5% can make projected returns heavily dependent on resale growth.'));
    else if(app>=.02&&app<=.04) out.push(item('appreciation','Property Appreciation',pct(app),'Reasonable','A moderate long-term assumption; local price history and property type should still be considered.'));
    else if(app<.02) out.push(item('appreciation','Property Appreciation',pct(app),'Conservative','Places less reliance on future price growth to support the investment case.'));
    else out.push(item('appreciation','Property Appreciation',pct(app),'Needs Support','This assumption is above a moderate range and should be supported by local long-term price evidence.'));

    const req=n(s.requiredReturn);
    if(!finite(req)||req<=0) out.push(item('requiredReturn','Required Return','—','Needs Support','Set a hurdle rate that reflects the investor’s risk tolerance and alternatives.'));
    else if(req<.07) out.push(item('requiredReturn','Required Return',pct(req),'Aggressive','A low hurdle rate can make weaker investments appear acceptable and should reflect the investor’s actual opportunity cost.'));
    else if(req<=.12) out.push(item('requiredReturn','Required Return',pct(req),'Reasonable','Falls within a moderate screening range for a required return; investor-specific risk tolerance controls.'));
    else out.push(item('requiredReturn','Required Return',pct(req),'Conservative','A higher hurdle rate demands more return before the investment is considered acceptable.'));

    const cap=n(s.desiredCap);
    if(!finite(cap)||cap<=0) out.push(item('desiredCap','Desired Cap Rate','—','Needs Support','Cap rate should be derived from comparable investment sales and current market expectations.'));
    else out.push(item('desiredCap','Desired Cap Rate',pct(cap),'Needs Support','Cap rate is market-derived. Confirm it with comparable investment sales rather than relying on a generic range.'));

    const grm=n(s.desiredGrm);
    if(!finite(grm)||grm<=0) out.push(item('desiredGrm','Desired GRM','—','Needs Support','GRM should be supported by comparable rental-property sales.'));
    else out.push(item('desiredGrm','Desired GRM',grm.toFixed(2).replace(/\.00$/,'')+'x','Needs Support','GRM is market-derived and should be reconciled with comparable rental-property sales.'));

    const sell=n(s.sellCost);
    if(!finite(sell)) out.push(item('sellCost','Selling Costs','—','Needs Support','Estimate disposition costs appropriate to the market and planned sale.'));
    else if(sell<.05) out.push(item('sellCost','Selling Costs',pct(sell),'Aggressive','Below 5% leaves a narrow allowance for brokerage and other disposition costs.'));
    else if(sell<=.08) out.push(item('sellCost','Selling Costs',pct(sell),'Reasonable','Falls within a moderate screening range for total disposition costs.'));
    else out.push(item('sellCost','Selling Costs',pct(sell),'Conservative','A higher selling-cost allowance reduces modeled sale proceeds.'));

    const price=n(s.price),mort=n(s.mortgage),rate=n(s.mortRate);
    if(finite(price)&&price>0&&finite(mort)&&mort>0){
      const ltv=mort/price;
      if(ltv>.80) out.push(item('leverage','Acquisition Leverage',pct(ltv),'Aggressive','Leverage above 80% increases debt-service and equity risk.'));
      else if(ltv>=.65) out.push(item('leverage','Acquisition Leverage',pct(ltv),'Reasonable','Moderate leverage; confirm the structure against lender terms and cash-flow coverage.'));
      else out.push(item('leverage','Acquisition Leverage',pct(ltv),'Conservative','Lower leverage reduces debt risk but requires more investor equity.'));
      if(finite(rate)&&rate>0) out.push(item('mortRate','Mortgage Rate',pct(rate),'Needs Support','Financing cost is quote-specific. Confirm the modeled rate with current lender terms.'));
    }
    return out;
  }

  function summary(items){
    const c={Reasonable:0,Conservative:0,Aggressive:0,'Needs Support':0};
    items.forEach(x=>{if(c[x.rating]!==undefined)c[x.rating]++;});
    let rating='Balanced';
    if(c.Aggressive>=2||c['Needs Support']>=5)rating='Review Assumptions';
    else if(c.Aggressive===1||c['Needs Support']>=3)rating='Some Support Needed';
    else if(c.Conservative>c.Reasonable&&c.Aggressive===0)rating='Conservative';
    return {rating,counts:c,total:items.length};
  }

  function styles(){
    if(document.getElementById('ptAssumptionIntelligenceStyle'))return;
    const s=document.createElement('style');s.id='ptAssumptionIntelligenceStyle';s.textContent=`
      .pt-ai-panel{border:1px solid #dce5ed;border-radius:12px;background:#fbfdff;margin:0 0 14px;overflow:hidden}.pt-ai-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:13px 14px;border-bottom:1px solid #e6edf3;background:#f7fafc}.pt-ai-head h3{margin:0;font-size:13px}.pt-ai-head p{margin:3px 0 0;color:#667085;font-size:8.7px;line-height:1.45}.pt-ai-overall{font-size:8px;font-weight:900;border-radius:999px;padding:5px 8px;white-space:nowrap;background:#eef4fb;color:#175c92}.pt-ai-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px;padding:6px 14px 10px}.pt-ai-item{padding:9px 0;border-bottom:1px solid #edf1f5}.pt-ai-line{display:flex;justify-content:space-between;gap:8px;align-items:center}.pt-ai-line b{font-size:9.5px}.pt-ai-value{color:#344054;font-size:8.7px;font-weight:800;margin-left:auto}.pt-ai-rating{font-size:6.8px;font-weight:900;text-transform:uppercase;border-radius:999px;padding:2px 6px;white-space:nowrap}.pt-ai-reason{font-size:8px;color:#667085;line-height:1.45;margin-top:4px}.pt-ai-reasonable{background:#ecfdf3;color:#067647}.pt-ai-conservative{background:#eff8ff;color:#175cd3}.pt-ai-aggressive{background:#fff1f3;color:#c01048}.pt-ai-needs-support{background:#fffaeb;color:#b54708}
      #propertyhub .pt-ai-hub{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:8px 0 11px;padding:7px 9px;border:1px solid #e3e9ef;border-radius:8px;background:#fafcfd;font-size:8px;color:#667085}.pt-ai-hub b{color:#344054}.pt-ai-hub .pt-ai-rating{font-size:6.5px}.pt-ai-hub-detail{margin-left:auto;color:#667085}
      @media(max-width:700px){.pt-ai-grid{grid-template-columns:1fr}.pt-ai-head{display:block}.pt-ai-overall{display:inline-block;margin-top:7px}.pt-ai-hub-detail{width:100%;margin-left:0}}
    `;document.head.appendChild(s);
  }
  const cls=r=>'pt-ai-'+String(r).toLowerCase().replace(/\s+/g,'-');
  function ratingBadge(r){return `<span class="pt-ai-rating ${cls(r)}">${esc(r)}</span>`;}

  function guided(){
    styles();
    const active=document.querySelector('#gwSteps .gw-step.active[data-step]');
    const step=active?Number(active.dataset.step):0;
    const body=document.getElementById('gwBody');if(!body)return false;
    let panel=document.getElementById('ptAssumptionQualityPanel');
    if(step!==5){panel?.remove();return false;}
    let current={};try{current={...state};}catch(_e){}
    try{document.querySelectorAll('#gwBody [data-src]').forEach(el=>{const id=el.dataset.src?.replace(/^f_/,'');if(!id)return;const raw=el.value;if(raw==='')return;current[id]=Number(raw);});}catch(_e){}
    // Visible percentage fields are displayed as percentages, while saved state uses decimal rates.
    ['vacancy','opEx','rentGrowth','appreciation','requiredReturn','desiredCap','sellCost','mortRate'].forEach(k=>{
      const el=document.querySelector(`#gwBody [data-src="f_${k}"]`)||document.getElementById('f_'+k);
      if(el&&el.value!=='')current[k]=Number(el.value)/100;
    });
    const items=rateAssumptions(current),sum=summary(items);
    if(!panel){panel=document.createElement('div');panel.id='ptAssumptionQualityPanel';panel.className='pt-ai-panel';const goal=document.getElementById('ptGwStepGoal');if(goal)goal.insertAdjacentElement('afterend',panel);else body.prepend(panel);}
    panel.innerHTML=`<div class="pt-ai-head"><div><h3>Assumption Quality</h3><p>Underwriting screen only. Market-derived assumptions still require property-specific or comparable-market support.</p></div><span class="pt-ai-overall">${esc(sum.rating)}</span></div><div class="pt-ai-grid">${items.map(x=>`<div class="pt-ai-item"><div class="pt-ai-line"><b>${esc(x.label)}</b><span class="pt-ai-value">${esc(x.value)}</span>${ratingBadge(x.rating)}</div><div class="pt-ai-reason">${esc(x.reason)}</div></div>`).join('')}</div>`;
    return true;
  }

  function latestFor(pid){return analyses().filter(a=>a.property_id===pid).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0]||null;}
  function hub(){
    styles();const root=document.getElementById('propertyhub');if(!root)return false;
    root.querySelectorAll('.hub-card').forEach(card=>{
      const any=card.querySelector('[data-hub-open],[data-hub-edit],[data-pt-manage]');
      const pid=any?.dataset?.hubOpen||any?.dataset?.hubEdit||any?.dataset?.ptManage;if(!pid)return;
      const a=latestFor(pid),existing=card.querySelector('.pt-ai-hub');
      if(!a){existing?.remove();return;}
      const items=rateAssumptions(a.assumptions||{}),sum=summary(items);
      const counts=sum.counts;
      const el=existing||document.createElement('div');el.className='pt-ai-hub';
      el.innerHTML=`<b>Assumption Quality</b>${ratingBadge(sum.rating==='Review Assumptions'?'Needs Support':sum.rating==='Some Support Needed'?'Needs Support':sum.rating)}<span class="pt-ai-hub-detail">${counts.Aggressive?counts.Aggressive+' aggressive • ':''}${counts['Needs Support']} need support</span>`;
      if(!existing){const meta=card.querySelector('.hub-meta');if(meta)meta.insertAdjacentElement('afterend',el);else card.querySelector('.hub-actions')?.insertAdjacentElement('beforebegin',el);}
    });return true;
  }

  function hookStage6(){const api=window.Stage6Dashboard;if(!api||typeof api.render!=='function')return false;if(api.render.__ptAssumptionIntelligenceWrapped)return true;const orig=api.render;const wrapped=function(){const out=orig.apply(this,arguments);setTimeout(hub,0);setTimeout(hub,80);return out;};wrapped.__ptAssumptionIntelligenceWrapped=true;api.render=wrapped;return true;}
  function apply(){hookStage6();guided();hub();}
  function schedule(){[0,50,140].forEach(ms=>setTimeout(apply,ms));}
  function start(){hookStage6();schedule();document.addEventListener('click',e=>{if(e.target.closest('#guidedSetup,[data-tab="propertyhub"],[data-pt-cloud-refresh],[data-hub-edit],[data-pt-new]'))schedule();},true);document.addEventListener('input',e=>{if(e.target.closest('#guidedSetup'))setTimeout(guided,20);},true);document.addEventListener('change',e=>{if(e.target.closest('#guidedSetup'))setTimeout(guided,20);},true);}

  window.PropertyThesisAssumptionIntelligence={version:VERSION,evaluate:rateAssumptions,summarize:summary,apply,guided,hub};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

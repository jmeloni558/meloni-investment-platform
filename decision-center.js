'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisDecisionCenterV||0)>=VERSION)return;
  window.__propertyThesisDecisionCenterV=VERSION;

  const finite=v=>Number.isFinite(Number(v));
  const num=v=>Number(v);
  const money=v=>finite(v)?num(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const pct=v=>finite(v)?(num(v)*100).toFixed(2)+'%':'—';
  const ratio=v=>finite(v)?num(v).toFixed(2)+'x':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const analyses=()=>{try{return cloudAnalyses||[];}catch(_e){return [];}};

  function styles(){
    if(document.getElementById('ptDecisionCenterStyles'))return;
    const s=document.createElement('style');s.id='ptDecisionCenterStyles';s.textContent=`
      #ptDecisionCenter{grid-column:span 12;border:1px solid #cfdae5;background:#fff;overflow:hidden}
      #ptDecisionCenter .ptdc-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:17px 18px 14px;border-bottom:1px solid #e5ebf0;background:linear-gradient(180deg,#fbfdff,#f7fafc)}
      #ptDecisionCenter .ptdc-eyebrow{font-size:8px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#52708d;margin-bottom:4px}
      #ptDecisionCenter h2{margin:0 0 4px;font-size:20px;color:#173f66}#ptDecisionCenter .ptdc-head p{margin:0;color:#667085;font-size:10px;line-height:1.45;max-width:690px}
      #ptDecisionCenter .ptdc-verdict{border-radius:999px;padding:7px 11px;font-size:9px;font-weight:900;white-space:nowrap;border:1px solid #d0d5dd;background:#f2f4f7;color:#475467}
      #ptDecisionCenter .ptdc-verdict.good{background:#ecfdf3;border-color:#abefc6;color:#067647}.ptdc-verdict.warn{background:#fffaeb!important;border-color:#fedf89!important;color:#b54708!important}.ptdc-verdict.bad{background:#fff1f3!important;border-color:#fecdd6!important;color:#c01048!important}
      #ptDecisionCenter .ptdc-body{padding:14px 18px 17px}.ptdc-thesis{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.75fr);gap:12px;margin-bottom:13px}.ptdc-answer,.ptdc-constraint{border-radius:11px;padding:13px 14px;border:1px solid #e1e8ee;background:#fafcfd}.ptdc-answer strong,.ptdc-constraint strong{display:block;font-size:9px;color:#667085;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}.ptdc-answer b{font-size:16px;color:#173f66}.ptdc-answer p,.ptdc-constraint p{margin:5px 0 0;color:#526274;font-size:9.5px;line-height:1.5}.ptdc-constraint b{font-size:13px;color:#344054}
      #ptDecisionCenter .ptdc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.ptdc-metric{border:1px solid #e2e8ef;border-radius:10px;padding:11px;background:#fafbfd}.ptdc-metric.primary{background:#f2f9f5;border-color:#bfe2cf}.ptdc-metric.warn{background:#fffaf3;border-color:#fed7aa}.ptdc-metric span{display:block;font-size:8px;font-weight:800;color:#667085;line-height:1.3}.ptdc-metric b{display:block;font-size:17px;color:#173f66;margin-top:4px;line-height:1.15}.ptdc-metric small{display:block;font-size:8px;color:#667085;line-height:1.4;margin-top:4px}
      #ptDecisionCenter .ptdc-change{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:11px}.ptdc-changebox{border:1px solid #e4e9ef;border-radius:10px;padding:11px 12px;background:#fff}.ptdc-changebox strong{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.04em;color:#667085}.ptdc-changebox b{display:block;margin-top:4px;font-size:14px;color:#344054}.ptdc-changebox p{margin:4px 0 0;font-size:8.5px;color:#667085;line-height:1.4}
      #ptDecisionCenter .ptdc-confidence{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:11px;padding:9px 11px;border-radius:9px;background:#f8fafc;border:1px solid #e4e9ef;font-size:8.5px;color:#667085}.ptdc-confidence b{color:#344054}.ptdc-confidence .tag{border-radius:999px;padding:3px 7px;font-weight:900;background:#eef4fb;color:#175c92}
      #reviewDecisionSummary{display:none!important}
      #propertyhub .ptdc-hub{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:7px 0 10px;font-size:8px;color:#667085}.ptdc-hub b{color:#344054}.ptdc-hub-badge{border-radius:999px;padding:3px 7px;font-size:7px;font-weight:900}.ptdc-hub-badge.good{background:#ecfdf3;color:#067647}.ptdc-hub-badge.warn{background:#fffaeb;color:#b54708}.ptdc-hub-badge.bad{background:#fff1f3;color:#c01048}
      @media(max-width:1000px){#ptDecisionCenter .ptdc-grid{grid-template-columns:repeat(2,1fr)}#ptDecisionCenter .ptdc-thesis{grid-template-columns:1fr}}
      @media(max-width:680px){#ptDecisionCenter .ptdc-grid,#ptDecisionCenter .ptdc-change{grid-template-columns:1fr}#ptDecisionCenter .ptdc-head{display:block}.ptdc-verdict{display:inline-block;margin-top:9px}}
    `;document.head.appendChild(s);
  }

  function assumptionSummary(s){
    try{
      const api=window.PropertyThesisAssumptionIntelligence;
      if(!api?.evaluate||!api?.summarize)return null;
      return api.summarize(api.evaluate(s||{}));
    }catch(_e){return null;}
  }

  function decision(base,offer,s){
    const irr=base?.IRR, npv=base?.NPV, dcr=base?.years?.[0]?.dcr, cap=base?.cap;
    const irrOk=finite(irr)&&finite(s.requiredReturn)&&num(irr)>=num(s.requiredReturn);
    const npvOk=finite(npv)&&num(npv)>=0;
    const capOk=finite(cap)&&finite(s.desiredCap)&&num(cap)>=num(s.desiredCap);
    const debtOk=!finite(dcr)||!finite(s.mortgage)||num(s.mortgage)<=0||num(dcr)>=1.20;
    const priceOk=finite(offer?.maxSupported)&&finite(offer?.price)?num(offer.price)<=num(offer.maxSupported)+1:(irrOk&&capOk);
    let label='Review Investment',tone='warn';
    if(priceOk&&irrOk&&npvOk&&debtOk){label='Meets Selected Benchmarks';tone='good';}
    else if((!irrOk&&!npvOk)||(!priceOk&&finite(offer?.gapPct)&&num(offer.gapPct)>.10)||(!debtOk&&finite(dcr)&&num(dcr)<1)){label='Does Not Meet Selected Benchmarks';tone='bad';}
    else {label='Borderline / Needs Adjustment';tone='warn';}

    const issues=[];
    if(!priceOk)issues.push({key:'price',severity:finite(offer?.gapPct)?Math.abs(num(offer.gapPct)):1,label:'Acquisition pricing'});
    if(!irrOk)issues.push({key:'irr',severity:finite(irr)&&finite(s.requiredReturn)?Math.max(0,num(s.requiredReturn)-num(irr)):1,label:'Return shortfall'});
    if(!capOk)issues.push({key:'cap',severity:finite(cap)&&finite(s.desiredCap)?Math.max(0,num(s.desiredCap)-num(cap)):1,label:'Income yield'});
    if(!debtOk)issues.push({key:'debt',severity:finite(dcr)?Math.max(0,1.2-num(dcr)):1,label:'Debt coverage'});
    if(!npvOk)issues.push({key:'npv',severity:finite(npv)?Math.abs(num(npv)):1,label:'Required-return economics'});
    issues.sort((a,b)=>b.severity-a.severity);
    const primary=issues[0]?.key||'none';
    const primaryLabel=issues[0]?.label||'No single constraint';
    return {label,tone,primary,primaryLabel,irrOk,npvOk,capOk,debtOk,priceOk};
  }

  function thesisText(d,base,offer,s){
    const price=offer?.price??s.price;
    if(d.tone==='good')return `At ${money(price)}, the property satisfies the selected return and pricing benchmarks under the current assumptions. The investment case is supported without requiring a modeled price reduction.`;
    if(d.primary==='price')return `Pricing is the primary constraint. The current acquisition price exceeds the maximum modeled price that satisfies both the selected capitalization-rate and required-return targets.`;
    if(d.primary==='debt')return `Debt coverage is the primary constraint. Current NOI does not provide the preferred margin above annual debt service, increasing financing risk even if the long-term return remains acceptable.`;
    if(d.primary==='irr'||d.primary==='npv')return `Return performance is the primary constraint. The modeled cash flows do not currently satisfy the selected required return at the proposed acquisition terms.`;
    if(d.primary==='cap')return `Current income yield is the primary constraint. Year 1 NOI is too low relative to the acquisition price to meet the selected capitalization-rate target.`;
    return `The investment produces mixed results under the selected assumptions. Review pricing, income, financing and return targets before reaching a final acquisition conclusion.`;
  }

  function metric(label,value,sub,cls=''){return `<div class="ptdc-metric ${cls}"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(sub)}</small></div>`;}
  function change(label,value,text){return `<div class="ptdc-changebox"><strong>${esc(label)}</strong><b>${esc(value)}</b><p>${esc(text)}</p></div>`;}

  function apply(){
    styles();
    const dashboard=document.getElementById('dashboard'),grid=dashboard?.querySelector('.grid');
    const setup=document.getElementById('reviewAnalysisSetup');if(!dashboard||!grid||!setup||!result?.years?.length||!state)return false;
    const offer=window.PropertyThesisSecondaryEngine?.getOffer?.();
    if(!offer){try{window.PropertyThesisSecondaryEngine?.request?.();}catch(_e){}return false;}
    const base=window.PropertyThesisIncomeEngineBridge?.current?.()||result;
    const d=decision(base,offer,state),as=assumptionSummary(state),y1=base.years?.[0]||{};
    const maxRent=Math.max(...[offer.capRent,offer.irrRent].filter(finite).map(num));
    const requiredRent=Number.isFinite(maxRent)?maxRent:NaN;
    const rentGap=finite(requiredRent)&&finite(offer.rent)?Math.max(0,requiredRent-num(offer.rent)):NaN;
    const priceCut=finite(offer.price)&&finite(offer.maxSupported)?Math.max(0,num(offer.price)-num(offer.maxSupported)):NaN;
    const gapPct=finite(offer.gapPct)?Math.abs(num(offer.gapPct)):NaN;

    let card=document.getElementById('ptDecisionCenter');
    if(!card){card=document.createElement('div');card.id='ptDecisionCenter';card.className='card span-12';setup.insertAdjacentElement('afterend',card);}
    else if(card.previousElementSibling!==setup)setup.insertAdjacentElement('afterend',card);

    const answer=d.tone==='good'?'Yes — under the selected assumptions.':d.tone==='bad'?'No — not at the current terms.':'Not yet — one or more targets need adjustment.';
    const confidence=as?.rating||'Not Rated';
    const counts=as?.counts||{};
    card.innerHTML=`<div class="ptdc-head"><div><div class="ptdc-eyebrow">PropertyThesis Decision Center</div><h2>Does This Investment Work?</h2><p>Decision summary based on the protected income model, selected return benchmarks and current underwriting assumptions.</p></div><div class="ptdc-verdict ${d.tone}">${esc(d.label)}</div></div><div class="ptdc-body"><div class="ptdc-thesis"><div class="ptdc-answer"><strong>Decision</strong><b>${esc(answer)}</b><p>${esc(thesisText(d,base,offer,state))}</p></div><div class="ptdc-constraint"><strong>Primary Constraint</strong><b>${esc(d.primaryLabel)}</b><p>${d.primary==='none'?'Current pricing, income and return benchmarks are generally aligned.':'This is the factor currently exerting the greatest pressure on the investment conclusion.'}</p></div></div><div class="ptdc-grid">${metric('Current Acquisition Price',money(offer.price),`Maximum supported: ${money(offer.maxSupported)}`,d.priceOk?'primary':'warn')}${metric('Maximum Price Meeting Both Targets',money(offer.maxSupported),`Cap support ${money(offer.capPrice)} • IRR support ${money(offer.irrPrice)}`,'primary')}${metric('Modeled IRR',pct(base.IRR),`Required return: ${pct(state.requiredReturn)}`,d.irrOk?'primary':'warn')}${metric('Year 1 Cap Rate',pct(base.cap),`Desired cap: ${pct(state.desiredCap)}`,d.capOk?'primary':'warn')}${metric('Year 1 DSCR',ratio(y1.dcr),finite(state.mortgage)&&num(state.mortgage)>0?'1.20x+ used as the preferred coverage screen.':'No material debt modeled.',d.debtOk?'':'warn')}${metric('Net Present Value',money(base.NPV),`At required return of ${pct(state.requiredReturn)}`,d.npvOk?'primary':'warn')}${metric('Suggested Opening Offer',money(offer.opening),`Based on the selected negotiation discount below maximum support.`,'primary')}${metric('Year 1 NOI',money(y1.noi),'Income after vacancy and operating expenses, before debt service.')}</div><div class="ptdc-change">${change('If Price Changes',finite(priceCut)&&priceCut>0?money(offer.maxSupported):'No reduction required',finite(priceCut)&&priceCut>0?`${money(priceCut)} reduction (${finite(gapPct)?(gapPct*100).toFixed(1)+'%':''}) brings price to the modeled maximum meeting both targets.`:'Current price is within modeled support under the selected benchmarks.')}${change('If Rent Changes',finite(rentGap)&&rentGap>0?money(requiredRent)+'/mo':'Current rent is sufficient',finite(rentGap)&&rentGap>0?`Approximately ${money(rentGap)}/month additional rent is required to satisfy the more demanding of the cap-rate and IRR targets at the current price.`:'Modeled rent satisfies the current cap-rate and IRR requirements at this price.')}${change('If Financing Changes',d.debtOk?'Coverage acceptable':ratio(y1.dcr)+' DSCR',d.debtOk?'Current debt structure clears the preferred coverage screen.':'Lower leverage, a lower rate, or stronger NOI would improve debt-service coverage.')}</div><div class="ptdc-confidence"><b>Underwriting confidence:</b><span class="tag">${esc(confidence)}</span><span>${counts.Aggressive?counts.Aggressive+' aggressive assumption'+(counts.Aggressive===1?'':'s')+' • ':''}${counts['Needs Support']||0} assumption${counts['Needs Support']===1?'':'s'} still need support.</span><span>Market-derived inputs remain subject to comparable and property-specific evidence.</span></div></div>`;
    card.dataset.engineSource='protected-server';
    return true;
  }

  function savedDecision(a){
    const s=a?.assumptions||{},o=a?.outputs||{};
    const irrOk=finite(o.irr)&&finite(s.requiredReturn)&&num(o.irr)>=num(s.requiredReturn);
    const npvOk=finite(o.npv)&&num(o.npv)>=0;
    const capOk=finite(o.cap)&&finite(s.desiredCap)&&num(o.cap)>=num(s.desiredCap);
    const dscrOk=!finite(s.mortgage)||num(s.mortgage)<=0||!finite(o.year1_dscr)||num(o.year1_dscr)>=1.2;
    if(irrOk&&npvOk&&capOk&&dscrOk)return {label:'Meets Benchmarks',tone:'good'};
    const failures=[irrOk,npvOk,capOk,dscrOk].filter(x=>!x).length;
    if(failures>=3||(finite(o.year1_dscr)&&num(o.year1_dscr)<1))return {label:'Needs Material Adjustment',tone:'bad'};
    return {label:'Review / Adjust',tone:'warn'};
  }
  function latestFor(pid){return analyses().filter(a=>a.property_id===pid).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0]||null;}
  function hub(){
    styles();const root=document.getElementById('propertyhub');if(!root)return false;
    root.querySelectorAll('.hub-card').forEach(card=>{
      const any=card.querySelector('[data-hub-open],[data-hub-edit],[data-pt-manage]');const pid=any?.dataset?.hubOpen||any?.dataset?.hubEdit||any?.dataset?.ptManage;if(!pid)return;
      const a=latestFor(pid);let row=card.querySelector('.ptdc-hub');if(!a){row?.remove();return;}
      const d=savedDecision(a);if(!row){row=document.createElement('div');row.className='ptdc-hub';const ai=card.querySelector('.pt-ai-hub');if(ai)ai.insertAdjacentElement('afterend',row);else card.querySelector('.hub-actions')?.insertAdjacentElement('beforebegin',row);}
      row.innerHTML=`<b>Investment Decision</b><span class="ptdc-hub-badge ${d.tone}">${esc(d.label)}</span><span>IRR ${pct(a.outputs?.irr)} • Cap ${pct(a.outputs?.cap)} • DSCR ${ratio(a.outputs?.year1_dscr)}</span>`;
    });return true;
  }
  function hookStage6(){const api=window.Stage6Dashboard;if(!api||typeof api.render!=='function')return false;if(api.render.__ptDecisionCenterWrapped)return true;const orig=api.render;const wrapped=function(){const out=orig.apply(this,arguments);setTimeout(hub,0);setTimeout(hub,90);return out;};wrapped.__ptDecisionCenterWrapped=true;api.render=wrapped;return true;}
  function schedule(){[0,80,220].forEach(ms=>setTimeout(()=>{apply();hub();},ms));}
  function start(){hookStage6();schedule();document.addEventListener('click',e=>{if(e.target.closest('[data-s8-tab="dashboard"],[data-tab="dashboard"],#appNavReview,[data-app-review],[data-tab="propertyhub"],[data-pt-cloud-refresh],[data-hub-open]'))schedule();},true);}

  window.PropertyThesisDecisionCenter={version:VERSION,apply,hub,decision};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

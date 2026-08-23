'use strict';
(()=>{
  const VERSION=1;
  if((window.__propertyThesisInvestmentThesisV||0)>=VERSION)return;
  window.__propertyThesisInvestmentThesisV=VERSION;

  const finite=v=>Number.isFinite(Number(v));
  const n=v=>Number(v);
  const money=v=>finite(v)?n(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const pct=v=>finite(v)?(n(v)*100).toFixed(2)+'%':'—';
  const ratio=v=>finite(v)?n(v).toFixed(2)+'x':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));

  function assumptionSummary(){try{const a=window.PropertyThesisAssumptionIntelligence;return a?.summarize?.(a.evaluate?.(state||{}))||null;}catch(_e){return null;}}
  function current(){
    let s=null;try{s=state;}catch(_e){}
    const base=window.PropertyThesisIncomeEngineBridge?.current?.();
    const offer=window.PropertyThesisSecondaryEngine?.getOffer?.();
    const valid=window.PropertyThesisDecisionCenterStability?.matchesCurrent?.(offer) ?? window.PropertyThesisDecisionCenter?.offerMatchesState?.(offer,s);
    if(!s||!base?.years?.length||!offer||!valid)return null;
    return {s,base,offer,y1:base.years[0],assumptions:assumptionSummary()};
  }

  function build(){
    const x=current();if(!x)return null;
    const {s,base,offer,y1,assumptions}=x;
    const irrOk=finite(base.IRR)&&finite(s.requiredReturn)&&n(base.IRR)>=n(s.requiredReturn);
    const npvOk=finite(base.NPV)&&n(base.NPV)>=0;
    const capOk=finite(base.cap)&&finite(s.desiredCap)&&n(base.cap)>=n(s.desiredCap);
    const financed=finite(s.mortgage)&&n(s.mortgage)>0;
    const debtOk=!financed||!finite(y1.dcr)||n(y1.dcr)>=1.20;
    const priceOk=finite(offer.maxSupported)&&finite(offer.price)&&n(offer.price)<=n(offer.maxSupported)+1;
    const supportGap=finite(offer.price)&&finite(offer.maxSupported)?n(offer.price)-n(offer.maxSupported):0;
    const rentNeed=Math.max(...[offer.capRent,offer.irrRent].filter(finite).map(n),0);
    const rentGap=finite(offer.rent)&&rentNeed?Math.max(0,rentNeed-n(offer.rent)):0;

    const strengths=[],risks=[];
    if(irrOk)strengths.push(`Projected IRR of ${pct(base.IRR)} meets the ${pct(s.requiredReturn)} required return.`);else risks.push(`Projected IRR of ${pct(base.IRR)} is below the ${pct(s.requiredReturn)} required return.`);
    if(npvOk)strengths.push(`NPV is positive at ${money(base.NPV)}, supporting the selected required-return benchmark.`);else risks.push(`NPV is negative at ${money(base.NPV)} at the selected required return.`);
    if(capOk)strengths.push(`Year 1 cap rate of ${pct(base.cap)} meets the ${pct(s.desiredCap)} target.`);else risks.push(`Year 1 cap rate of ${pct(base.cap)} is below the ${pct(s.desiredCap)} target.`);
    if(financed){if(debtOk)strengths.push(`Year 1 DSCR of ${ratio(y1.dcr)} provides acceptable modeled debt coverage.`);else risks.push(`Year 1 DSCR of ${ratio(y1.dcr)} indicates weak debt-service coverage.`);}
    if(priceOk)strengths.push(`The ${money(offer.price)} acquisition price is within modeled price support.`);else risks.push(`The ${money(offer.price)} acquisition price exceeds modeled maximum support of ${money(offer.maxSupported)} by ${money(Math.max(0,supportGap))}.`);
    if(assumptions?.counts?.Aggressive)risks.push(`${assumptions.counts.Aggressive} underwriting assumption${assumptions.counts.Aggressive===1?' is':'s are'} classified as aggressive.`);
    if(assumptions?.counts?.['Needs Support'])risks.push(`${assumptions.counts['Needs Support']} assumption${assumptions.counts['Needs Support']===1?' still needs':'s still need'} market or property-specific support.`);

    let strategy='Proceed with standard due diligence.';
    let tone='good',label='Supportable Investment Case';
    if(!priceOk){strategy=`Negotiate toward the modeled support range; the current maximum price meeting both selected targets is ${money(offer.maxSupported)}${finite(offer.opening)?`, with a modeled opening offer of ${money(offer.opening)}`:''}.`;tone='warn';label='Negotiation-Dependent Investment Case';}
    if(!irrOk||!npvOk||!capOk||!debtOk){tone='warn';label='Conditional Investment Case';}
    if((!irrOk&&!npvOk&&!capOk)||(!debtOk&&finite(y1.dcr)&&n(y1.dcr)<1)){tone='bad';label='Weak Investment Case at Current Terms';strategy='Rework acquisition price, income, or financing before proceeding under the current underwriting targets.';}
    if(rentGap>0)strategy+=` At the current price, modeled rent would need to increase to approximately ${money(rentNeed)}/month to satisfy the more demanding income/return target.`;

    let narrative;
    if(tone==='good')narrative=`The property presents a supportable investment case under the current underwriting assumptions. Return performance, income yield${financed?' and debt coverage':''} are generally aligned with the investor’s selected benchmarks, and the acquisition price is within modeled support.`;
    else if(!priceOk)narrative=`The investment case is primarily constrained by acquisition pricing. The property may be viable, but the current price is above the level supported by the selected cap-rate and required-return targets. The opportunity becomes more compelling if the basis can be negotiated downward or if sustainable income improves.`;
    else if(!debtOk)narrative=`The property produces a mixed investment case because financing pressure is limiting cash-flow resilience. Long-term economics should be considered alongside weak Year 1 debt coverage, with lower leverage, improved NOI, or better financing terms representing the clearest paths to improvement.`;
    else narrative=`The property produces mixed results under the current underwriting assumptions. One or more selected return or income benchmarks are not met, so the acquisition case depends on improving price, income, financing, or the investor’s target assumptions before proceeding.`;

    return {label,tone,narrative,strengths:strengths.slice(0,4),risks:risks.slice(0,4),strategy,metrics:{price:offer.price,maxSupported:offer.maxSupported,opening:offer.opening,IRR:base.IRR,cap:base.cap,dcr:y1.dcr,NPV:base.NPV,NOI:y1.noi}};
  }

  function styles(){if(document.getElementById('ptInvestmentThesisStyles'))return;const st=document.createElement('style');st.id='ptInvestmentThesisStyles';st.textContent=`
    #ptInvestmentThesis{grid-column:span 12;order:-78!important;border:1px solid #d9e3eb;background:#fff}
    #ptInvestmentThesis .ptit-head{display:flex;justify-content:space-between;gap:16px;padding:16px 18px 13px;border-bottom:1px solid #e6ebf0;background:#fbfcfd}
    #ptInvestmentThesis h2{margin:0 0 4px;font-size:18px;color:#173f66}.ptit-head p{margin:0;font-size:9.5px;color:#667085;line-height:1.45}.ptit-badge{align-self:flex-start;border-radius:999px;padding:6px 9px;font-size:8px;font-weight:900;background:#ecfdf3;color:#067647;white-space:nowrap}.ptit-badge.warn{background:#fffaeb;color:#b54708}.ptit-badge.bad{background:#fff1f3;color:#c01048}
    .ptit-body{padding:15px 18px 17px}.ptit-narrative{font-size:11px;line-height:1.65;color:#344054;margin:0 0 13px}.ptit-cols{display:grid;grid-template-columns:1fr 1fr;gap:11px}.ptit-box{border:1px solid #e3e9ef;border-radius:10px;padding:11px 12px;background:#fafbfd}.ptit-box strong{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#667085;margin-bottom:6px}.ptit-box ul{margin:0;padding-left:17px;font-size:9px;line-height:1.5;color:#475467}.ptit-box li+li{margin-top:4px}.ptit-strategy{margin-top:11px;border-left:3px solid #2b6fa8;background:#f5f9fc;border-radius:8px;padding:10px 12px}.ptit-strategy strong{font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#526274}.ptit-strategy p{margin:4px 0 0;font-size:9.5px;line-height:1.5;color:#344054}
    @media(max-width:760px){.ptit-cols{grid-template-columns:1fr}.ptit-head{display:block}.ptit-badge{display:inline-block;margin-top:8px}}
  `;document.head.appendChild(st);}

  function pin(){const dc=document.getElementById('ptDecisionCenter'),card=document.getElementById('ptInvestmentThesis');if(dc&&card&&card.previousElementSibling!==dc)dc.insertAdjacentElement('afterend',card);return !!(dc&&card);}
  function apply(){styles();const thesis=build();const dc=document.getElementById('ptDecisionCenter');if(!thesis||!dc){document.getElementById('ptInvestmentThesis')?.remove();return false;}let card=document.getElementById('ptInvestmentThesis');if(!card){card=document.createElement('div');card.id='ptInvestmentThesis';card.className='card span-12';dc.insertAdjacentElement('afterend',card);}const list=a=>a.length?`<ul>${a.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:'<div style="font-size:9px;color:#667085">No material items identified.</div>';card.innerHTML=`<div class="ptit-head"><div><h2>Investment Thesis</h2><p>Interpretation of the modeled returns, income performance, pricing, financing and underwriting quality.</p></div><span class="ptit-badge ${thesis.tone}">${esc(thesis.label)}</span></div><div class="ptit-body"><p class="ptit-narrative">${esc(thesis.narrative)}</p><div class="ptit-cols"><div class="ptit-box"><strong>Investment Strengths</strong>${list(thesis.strengths)}</div><div class="ptit-box"><strong>Risks & Constraints</strong>${list(thesis.risks)}</div></div><div class="ptit-strategy"><strong>Acquisition Strategy</strong><p>${esc(thesis.strategy)}</p></div></div>`;pin();return true;}

  function narrative(){const t=build();if(!t)return'';const s=t.strengths[0]?` Key support: ${t.strengths[0]}`:'';const r=t.risks[0]?` Primary risk: ${t.risks[0]}`:'';return `${t.narrative} ${t.strategy}${s}${r}`.replace(/\s+/g,' ').trim();}
  function schedule(){[0,60,160,320].forEach(ms=>setTimeout(()=>{apply();pin();},ms));}
  function start(){schedule();document.addEventListener('click',e=>{if(e.target?.closest?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],#appNavReview,[data-app-review],#gwNext,#gwSave,[data-hub-open],[data-pt-open]'))schedule();},true);}
  window.PropertyThesisInvestmentThesis={version:VERSION,apply,pin,build,narrative};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

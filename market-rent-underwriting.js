'use strict';
(()=>{
  const VERSION=1;
  if((window.__marketRentUnderwritingV||0)>=VERSION)return;
  window.__marketRentUnderwritingV=VERSION;

  const finite=v=>Number.isFinite(Number(v));
  const n=v=>Number(v);
  const money=v=>finite(v)?n(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const pct=v=>finite(v)?(n(v)*100).toFixed(2)+'%':'—';
  const ratio=v=>finite(v)?n(v).toFixed(2)+'x':'—';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  let scenarioBusy=false,lastScenarioKey='';

  function support(){try{return state?.marketRentSupport||null;}catch(_e){return null;}}
  function write(patch,dirty=true){
    try{
      state.marketRentSupport={...(state.marketRentSupport||{}),...patch};
      if(dirty){try{window.UnsavedChangeProtection?.markDirty?.();}catch(_e){}try{window.SaveStateFeedback?.unsaved?.();}catch(_e){}}
      return state.marketRentSupport;
    }catch(_e){return null;}
  }
  function defaults(){
    const s=support()||{};
    let current=finite(s.currentRent)?n(s.currentRent):NaN;
    if(!finite(current)){try{current=finite(state?.rent)?n(state.rent):NaN;}catch(_e){}}
    const expected=finite(s.expectedRent)?n(s.expectedRent):finite(s.concludedRent)?n(s.concludedRent):finite(s.estimate)?n(s.estimate):current;
    const low=finite(s.lowRent)?n(s.lowRent):finite(s.rangeLow)?n(s.rangeLow):finite(expected)?Math.round(expected*.95/25)*25:NaN;
    const high=finite(s.highRent)?n(s.highRent):finite(s.rangeHigh)?n(s.rangeHigh):finite(expected)?Math.round(expected*1.05/25)*25:NaN;
    return {current,low,expected,high};
  }
  function normalizeRange(vals){
    let {current,low,expected,high}=vals;
    if(finite(low)&&finite(expected)&&low>expected)[low,expected]=[expected,low];
    if(finite(expected)&&finite(high)&&expected>high)[expected,high]=[high,expected];
    if(finite(low)&&finite(expected)&&low>expected)low=expected;
    return {current,low,expected,high};
  }

  function styles(){
    if(document.getElementById('ptMarketRentUnderwritingStyles'))return;
    const st=document.createElement('style');st.id='ptMarketRentUnderwritingStyles';st.textContent=`
      .ptr-underwriting{margin:12px 0;background:#fff;border:1px solid #cfdde8;border-radius:11px;padding:12px}.ptr-underwriting-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}.ptr-underwriting-head h4{margin:0;font-size:12px;color:#173f66}.ptr-underwriting-head p{margin:3px 0 0;font-size:8.5px;color:#667085;line-height:1.4}.ptr-range-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ptr-range-grid .field{margin:0}.ptr-impact-wrap{margin-top:11px}.ptr-impact-note{font-size:8px;color:#667085;margin:6px 0 0}.ptr-impact-table{width:100%;border-collapse:collapse;font-size:8.5px}.ptr-impact-table th,.ptr-impact-table td{padding:7px 8px;border-bottom:1px solid #e8edf2;text-align:right}.ptr-impact-table th:first-child,.ptr-impact-table td:first-child{text-align:left}.ptr-impact-table th{font-size:7px;text-transform:uppercase;letter-spacing:.04em;color:#667085}.ptr-impact-table tr.expected{background:#f2f9f5}.ptr-impact-table td b{color:#173f66}
      #ptMarketRentDecision{grid-column:span 12;border:1px solid #d7e2ea;background:#fff}.ptmrd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:15px 17px 12px;border-bottom:1px solid #e5ebf0}.ptmrd-head h2{margin:0 0 3px;font-size:17px;color:#173f66}.ptmrd-head p{margin:0;font-size:9px;color:#667085}.ptmrd-body{padding:14px 17px 16px}.ptmrd-rents{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}.ptmrd-stat{border:1px solid #e1e8ee;border-radius:9px;padding:10px;background:#fafbfd}.ptmrd-stat.expected{background:#f2f9f5;border-color:#bfe2cf}.ptmrd-stat span{display:block;font-size:7px;font-weight:800;color:#667085;text-transform:uppercase}.ptmrd-stat b{display:block;margin-top:3px;font-size:15px;color:#173f66}.ptmrd-copy{font-size:9.5px;line-height:1.55;color:#475467;margin:0 0 11px}.ptmrd-source{font-size:8px;color:#667085;margin-top:8px}
      @media(max-width:760px){.ptr-range-grid,.ptmrd-rents{grid-template-columns:1fr 1fr}.ptr-impact-wrap{overflow:auto}.ptr-impact-table{min-width:620px}}
    `;document.head.appendChild(st);
  }

  function rangeHtml(v){return `<div class="ptr-underwriting"><div class="ptr-underwriting-head"><div><h4>Rent Underwriting Range</h4><p>Separate current/asking rent from the analyst's low, expected and high market-rent conclusions. Expected rent remains the rent used when you apply the conclusion to the analysis.</p></div><button class="btn ghost" type="button" data-ptru-impact>Calculate Rent Impacts</button></div><div class="ptr-range-grid"><div class="field"><label>Current / Asking Rent</label><input type="number" step="25" data-ptru-current value="${finite(v.current)?v.current:''}"></div><div class="field"><label>Low Market Rent</label><input type="number" step="25" data-ptru-low value="${finite(v.low)?v.low:''}"></div><div class="field"><label>Expected Market Rent</label><input type="number" step="25" data-ptru-expected value="${finite(v.expected)?v.expected:''}"></div><div class="field"><label>High Market Rent</label><input type="number" step="25" data-ptru-high value="${finite(v.high)?v.high:''}"></div></div><div class="ptr-impact-wrap" data-ptru-impact-host></div></div>`;}

  function enhanceModal(){
    styles();const host=document.getElementById('ptrResults');if(!host)return false;
    const conclusion=host.querySelector('.ptr-conclusion');if(!conclusion)return false;
    let box=host.querySelector('.ptr-underwriting');
    const v=normalizeRange(defaults());
    if(!box){const wrap=document.createElement('div');wrap.innerHTML=rangeHtml(v);box=wrap.firstElementChild;conclusion.insertAdjacentElement('afterend',box);}
    const bind=(sel,key)=>{const el=box.querySelector(sel);if(!el||el.dataset.ptruBound)return;el.dataset.ptruBound='1';el.addEventListener('input',()=>{const val=Number(el.value);const patch={};if(finite(val)&&val>0)patch[key]=val;write(patch,true);if(key==='expectedRent'){const c=document.querySelector('[data-ptr-conclusion]');if(c)c.value=el.value;write({concludedRent:val},false);}lastScenarioKey='';});};
    bind('[data-ptru-current]','currentRent');bind('[data-ptru-low]','lowRent');bind('[data-ptru-expected]','expectedRent');bind('[data-ptru-high]','highRent');
    const btn=box.querySelector('[data-ptru-impact]');if(btn&&!btn.dataset.ptruBound){btn.dataset.ptruBound='1';btn.addEventListener('click',()=>calculateImpacts(true));}
    const concluded=document.querySelector('[data-ptr-conclusion]');if(concluded&&!concluded.dataset.ptruSync){concluded.dataset.ptruSync='1';concluded.addEventListener('input',()=>{const val=Number(concluded.value);if(finite(val)&&val>0){const exp=box.querySelector('[data-ptru-expected]');if(exp)exp.value=String(val);write({expectedRent:val,concludedRent:val},false);lastScenarioKey='';}});}
    renderImpactTable();return true;
  }

  function scenarioValues(){const d=defaults();return normalizeRange({current:n(document.querySelector('[data-ptru-current]')?.value||d.current),low:n(document.querySelector('[data-ptru-low]')?.value||d.low),expected:n(document.querySelector('[data-ptru-expected]')?.value||d.expected),high:n(document.querySelector('[data-ptru-high]')?.value||d.high)});}
  function scenarioKey(vals){try{return JSON.stringify({base:window.PropertyThesisIncomeEngineBridge?.signature?.(state)||'',...vals});}catch(_e){return JSON.stringify(vals);}}
  async function calculateImpacts(force=false){
    const bridge=window.PropertyThesisIncomeEngineBridge;if(!bridge?.requestServer)return false;
    const vals=scenarioValues();if(![vals.low,vals.expected,vals.high].every(v=>finite(v)&&v>0))return false;
    const key=scenarioKey(vals);if(!force&&key===lastScenarioKey&&support()?.rentScenarioImpacts)return true;
    const host=document.querySelector('[data-ptru-impact-host]');if(host)host.innerHTML='<div class="ptr-impact-note">Calculating protected Low / Expected / High rent scenarios…</div>';
    if(scenarioBusy)return false;scenarioBusy=true;
    try{
      const rows=[];
      for(const [label,rent] of [['Low',vals.low],['Expected',vals.expected],['High',vals.high]]){
        const r=await bridge.requestServer({...state,rent},{refresh:false});
        if(!r?.years?.length)throw new Error('Protected rent scenario could not be calculated.');
        const y1=r.years[0]||{};
        rows.push({label,rent,noi:y1.noi,cap:r.cap,dcr:y1.dcr,capValue:r.capValue,irr:r.IRR,npv:r.NPV});
      }
      write({currentRent:vals.current,lowRent:vals.low,expectedRent:vals.expected,highRent:vals.high,concludedRent:vals.expected,rentScenarioImpacts:{key,calculatedAt:new Date().toISOString(),rows}},true);
      lastScenarioKey=key;renderImpactTable();renderResultsCard();try{window.MarketRentCloudPersistence?.persist?.();}catch(_e){}return true;
    }catch(e){if(host)host.innerHTML=`<div class="ptr-error">Rent impact calculation failed: ${esc(e?.message||e)}</div>`;return false;}finally{scenarioBusy=false;}
  }

  function impactRows(){const s=support();return Array.isArray(s?.rentScenarioImpacts?.rows)?s.rentScenarioImpacts.rows:[];}
  function impactTableHtml(rows){if(!rows.length)return '<div class="ptr-impact-note">Calculate the protected rent scenarios to compare NOI, cap rate, DSCR, income-supported value and IRR.</div>';return `<table class="ptr-impact-table"><thead><tr><th>Scenario</th><th>Rent / Mo.</th><th>Year 1 NOI</th><th>Cap Rate</th><th>DSCR</th><th>Cap-Supported Value</th><th>IRR</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.label==='Expected'?'expected':''}"><td><b>${esc(r.label)}</b></td><td>${money(r.rent)}</td><td>${money(r.noi)}</td><td>${pct(r.cap)}</td><td>${ratio(r.dcr)}</td><td>${money(r.capValue)}</td><td>${pct(r.irr)}</td></tr>`).join('')}</tbody></table><div class="ptr-impact-note">Scenario impacts are calculated by the protected PropertyThesis income engine. Changing rent does not alter the saved analysis until Expected Market Rent is applied.</div>`;}
  function renderImpactTable(){const host=document.querySelector('[data-ptru-impact-host]');if(host)host.innerHTML=impactTableHtml(impactRows());}

  function resultsNarrative(v,rows){
    const s=support()||{},parts=[];
    if(finite(v.current)&&finite(v.expected)){const diff=v.expected-v.current;if(Math.abs(diff)>=25)parts.push(`Expected market rent is ${money(Math.abs(diff))}/month ${diff>0?'above':'below'} the current or asking rent.`);else parts.push('Expected market rent is generally consistent with the current or asking rent.');}
    if(finite(s.estimate)&&finite(v.expected)){const diff=v.expected-n(s.estimate);parts.push(Math.abs(diff)<25?'The analyst expectation is generally consistent with the RentCast estimate.':`The analyst expectation is ${money(Math.abs(diff))}/month ${diff>0?'above':'below'} the RentCast estimate, reflecting analyst judgment and selected comparable evidence.`);}
    if(rows.length){const lo=rows.find(x=>x.label==='Low'),hi=rows.find(x=>x.label==='High');if(lo&&hi)parts.push(`Across the selected rent range, Year 1 NOI moves from ${money(lo.noi)} to ${money(hi.noi)} and modeled IRR from ${pct(lo.irr)} to ${pct(hi.irr)}.`);}
    return parts.join(' ');
  }
  function renderResultsCard(){
    styles();const dashboard=document.getElementById('dashboard'),grid=dashboard?.querySelector('.grid'),thesis=document.getElementById('ptInvestmentThesis');if(!grid||!thesis)return false;
    const s=support();if(!s||(!finite(s.estimate)&&!finite(s.concludedRent)&&!finite(s.expectedRent))){document.getElementById('ptMarketRentDecision')?.remove();return false;}
    const v=normalizeRange(defaults()),rows=impactRows();let card=document.getElementById('ptMarketRentDecision');if(!card){card=document.createElement('div');card.id='ptMarketRentDecision';card.className='card span-12';thesis.insertAdjacentElement('afterend',card);}else if(card.previousElementSibling!==thesis)thesis.insertAdjacentElement('afterend',card);
    const stat=(label,value,cls='')=>`<div class="ptmrd-stat ${cls}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
    card.innerHTML=`<div class="ptmrd-head"><div><h2>Market Rent Underwriting</h2><p>Current rent, third-party market evidence and the analyst's selected Low / Expected / High rent range.</p></div></div><div class="ptmrd-body"><div class="ptmrd-rents">${stat('Current / Asking Rent',money(v.current))}${stat('Low Market Rent',money(v.low))}${stat('Expected Market Rent',money(v.expected),'expected')}${stat('High Market Rent',money(v.high))}</div><p class="ptmrd-copy">${esc(resultsNarrative(v,rows)||'Market rent support is saved with this analysis. Review the selected comparable evidence before relying on the concluded rent.')}</p><div class="ptr-impact-wrap">${impactTableHtml(rows)}</div><div class="ptmrd-source">RentCast estimate: ${money(s.estimate)}${finite(s.rangeLow)&&finite(s.rangeHigh)?` • indicated range ${money(s.rangeLow)}–${money(s.rangeHigh)}`:''}${Array.isArray(s.comparables)?` • ${s.comparables.filter(c=>c.included!==false).length} selected rental comps`:''}</div></div>`;return true;
  }

  function hookHydration(){const api=window.PropertyThesisResultsHydration;if(!api||typeof api.hydrate!=='function'||api.hydrate.__ptMarketRentUnderwriting)return false;const original=api.hydrate;const wrapped=async function(){const out=await original.apply(this,arguments);try{renderResultsCard();}catch(_e){}return out;};wrapped.__ptMarketRentUnderwriting=true;wrapped.__original=original;api.hydrate=wrapped;return true;}
  function schedule(){[0,80,220,500].forEach(ms=>setTimeout(()=>{enhanceModal();hookHydration();renderResultsCard();},ms));}
  function start(){styles();hookHydration();schedule();document.addEventListener('click',e=>{if(e.target?.closest?.('[data-ptr-open],[data-ptr-run],[data-ptr-save-support],[data-ptr-use],[data-s8-tab="dashboard"],[data-tab="dashboard"],[data-hub-open],[data-pt-open]'))schedule();},true);}

  window.PropertyThesisMarketRentUnderwriting={version:VERSION,enhanceModal,calculateImpacts,renderResultsCard,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

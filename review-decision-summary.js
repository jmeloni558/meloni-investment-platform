'use strict';
(() => {
  const VERSION=1;
  if((window.__reviewDecisionSummaryVersion||0)>=VERSION)return;
  window.__reviewDecisionSummaryVersion=VERSION;

  function injectStyles(){
    if(document.getElementById('reviewDecisionSummaryStyles'))return;
    const st=document.createElement('style');
    st.id='reviewDecisionSummaryStyles';
    st.textContent=`
      #dashboard .review-old-kpis-hidden{display:none!important}
      #reviewDecisionSummary{grid-column:span 12}
      #reviewDecisionSummary .decision-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:13px}
      #reviewDecisionSummary .decision-head h2{margin-bottom:3px}
      #reviewDecisionSummary .decision-head p{margin:0;color:#667085;font-size:11px}
      #reviewDecisionSummary .decision-verdict{padding:9px 12px;border-radius:8px;font-size:11px;font-weight:800;white-space:nowrap;background:#f2f4f7;color:#344054;border:1px solid #d8dee8}
      #reviewDecisionSummary .decision-verdict.good{background:#edf8f2;color:#11663f;border-color:#cbe8d8}
      #reviewDecisionSummary .decision-verdict.warn{background:#fff7ed;color:#9a3412;border-color:#fed7aa}
      #reviewDecisionSummary .decision-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      #reviewDecisionSummary .decision-box{border:1px solid #e1e6ed;border-radius:10px;background:#fafbfd;padding:12px;min-width:0}
      #reviewDecisionSummary .decision-box .label{font-size:10px;color:#667085;font-weight:750;line-height:1.3}
      #reviewDecisionSummary .decision-box .value{font-size:19px;font-weight:800;letter-spacing:-.02em;margin-top:4px;color:#172033}
      #reviewDecisionSummary .decision-box .compare{font-size:10px;color:#667085;line-height:1.4;margin-top:5px}
      #reviewDecisionSummary .decision-box.good{background:#f5fbf7;border-color:#cbe8d8}
      #reviewDecisionSummary .decision-box.warn{background:#fffaf3;border-color:#fed7aa}
      #reviewDecisionSummary .decision-conclusion{margin-top:12px;padding:11px 13px;border-radius:9px;border-left:4px solid #90a1b3;background:#f8fafc;color:#475467;font-size:11px;line-height:1.55}
      #reviewDecisionSummary .decision-conclusion.good{border-left-color:#117a4b;background:#f4faf6}
      #reviewDecisionSummary .decision-conclusion.warn{border-left-color:#d97706;background:#fffaf3}
      @media(max-width:1050px){#reviewDecisionSummary .decision-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){#reviewDecisionSummary .decision-grid{grid-template-columns:1fr}#reviewDecisionSummary .decision-head{display:block}#reviewDecisionSummary .decision-verdict{display:inline-block;margin-top:9px}}
    `;
    document.head.appendChild(st);
  }

  function money(v){
    if(typeof fmtC==='function')return fmtC(v);
    return Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A';
  }
  function pct(v){
    if(typeof fmtP==='function')return fmtP(v);
    return Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A';
  }
  function multiple(v){
    if(typeof fmtX==='function')return fmtX(v);
    return Number.isFinite(v)?v.toFixed(2)+'x':'N/A';
  }
  function signedPct(v){
    if(!Number.isFinite(v))return 'N/A';
    const p=v*100;
    return (p>0?'+':'')+p.toFixed(1)+'%';
  }

  function box(label,value,compare='',tone=''){
    return `<div class="decision-box ${tone}"><div class="label">${label}</div><div class="value">${value}</div>${compare?`<div class="compare">${compare}</div>`:''}</div>`;
  }

  function apply(){
    injectStyles();
    const dashboard=document.getElementById('dashboard');
    const grid=dashboard?.querySelector('.grid');
    const setup=document.getElementById('reviewAnalysisSetup');
    if(!dashboard||!grid||!setup||!result||!state||!result.years?.length)return false;

    const oldKpis=document.getElementById('kpis')?.closest('.card');
    if(oldKpis)oldKpis.classList.add('review-old-kpis-hidden');

    let card=document.getElementById('reviewDecisionSummary');
    if(!card){
      card=document.createElement('div');
      card.id='reviewDecisionSummary';
      card.className='card span-12';
      setup.insertAdjacentElement('afterend',card);
    }else if(card.previousElementSibling!==setup){
      setup.insertAdjacentElement('afterend',card);
    }

    const y1=result.years[0];
    const equity=-result.initial;
    const coc=equity?y1.atcf/equity:NaN;
    const supportVals=[result.capValue,result.grmValue].filter(Number.isFinite);
    const supportLow=supportVals.length?Math.min(...supportVals):NaN;
    const supportHigh=supportVals.length?Math.max(...supportVals):NaN;
    const supportMid=supportVals.length?supportVals.reduce((a,b)=>a+b,0)/supportVals.length:NaN;
    const priceDelta=Number.isFinite(supportMid)&&supportMid!==0?(state.price-supportMid)/supportMid:NaN;
    const irrMeets=Number.isFinite(result.IRR)&&Number.isFinite(state.requiredReturn)&&result.IRR>=state.requiredReturn;
    const priceWithin=Number.isFinite(supportLow)&&Number.isFinite(supportHigh)&&state.price>=supportLow&&state.price<=supportHigh;
    const priceBelow=Number.isFinite(supportLow)&&state.price<supportLow;
    const npvMeets=Number.isFinite(result.NPV)&&result.NPV>=0;

    let verdict='Review Investment';
    let verdictTone='';
    if(irrMeets&&npvMeets&&(priceWithin||priceBelow)){verdict='Meets Core Benchmarks';verdictTone='good';}
    else if(!irrMeets||!npvMeets||(Number.isFinite(supportHigh)&&state.price>supportHigh)){verdict='Below One or More Targets';verdictTone='warn';}

    let valuationCompare='Income-supported range unavailable.';
    if(Number.isFinite(supportLow)&&Number.isFinite(supportHigh)){
      valuationCompare=`Direct Cap / GRM support: ${money(supportLow)} – ${money(supportHigh)}.`;
      if(Number.isFinite(priceDelta)) valuationCompare+=` Purchase price is ${Math.abs(priceDelta*100).toFixed(1)}% ${priceDelta>0?'above':'below'} the midpoint.`;
    }

    const capTone=Number.isFinite(result.cap)&&Number.isFinite(state.desiredCap)?(result.cap>=state.desiredCap?'good':'warn'):'';
    const grmTone=Number.isFinite(result.grm)&&Number.isFinite(state.desiredGrm)?(result.grm<=state.desiredGrm?'good':'warn'):'';
    const irrTone=Number.isFinite(result.IRR)&&Number.isFinite(state.requiredReturn)?(irrMeets?'good':'warn'):'';
    const npvTone=Number.isFinite(result.NPV)?(npvMeets?'good':'warn'):'';

    const boxes=[
      box('Acquisition Price',money(state.price),valuationCompare,(priceBelow||priceWithin)?'good':(Number.isFinite(supportHigh)&&state.price>supportHigh?'warn':'')),
      box('Year 1 Capitalization Rate',pct(result.cap),`Desired cap rate: ${pct(state.desiredCap)}. ${Number.isFinite(result.cap)&&Number.isFinite(state.desiredCap)?`Actual is ${signedPct(result.cap-state.desiredCap)} versus target.`:''}`,capTone),
      box('Year 1 Gross Rent Multiplier',multiple(result.grm),`Desired GRM: ${multiple(state.desiredGrm)}. Lower actual GRM indicates a lower price relative to gross rent.`,grmTone),
      box('Internal Rate of Return',pct(result.IRR),`Required return: ${pct(state.requiredReturn)}. ${irrMeets?'Meets or exceeds':'Falls below'} the selected return target.`,irrTone),
      box('Year 1 Net Operating Income',money(y1.noi),'Income after vacancy and operating expenses, before debt service and income taxes.'),
      box('Year 1 Cash-on-Cash Return',pct(coc),`After-tax operating cash flow ÷ initial cash investment (${money(equity)}).`),
      box('Year 1 Debt Service Coverage Ratio',multiple(y1.dcr),Number.isFinite(y1.dcr)?'Year 1 NOI ÷ annual debt service.':'No debt service is modeled for this analysis.'),
      box('Net Present Value',money(result.NPV),`${npvMeets?'Positive':'Negative'} NPV at the ${pct(state.requiredReturn)} required return.`,npvTone)
    ].join('');

    const valuationSentence=Number.isFinite(supportLow)&&Number.isFinite(supportHigh)
      ? `The modeled income approaches indicate a value range of ${money(supportLow)} to ${money(supportHigh)} compared with the ${money(state.price)} acquisition price.`
      : `The income-supported valuation range could not be calculated from the current assumptions.`;
    const returnSentence=Number.isFinite(result.IRR)
      ? `The projected IRR is ${pct(result.IRR)} versus a required return of ${pct(state.requiredReturn)}, and NPV is ${money(result.NPV)}.`
      : `The projected IRR is not available from the current cash-flow pattern.`;
    const conclusion=`${valuationSentence} ${returnSentence}`;

    card.innerHTML=`<div class="decision-head"><div><h2>Investment Decision Summary</h2><p>Actual modeled performance compared directly with the valuation and return benchmarks selected in Analysis Setup.</p></div><div class="decision-verdict ${verdictTone}">${verdict}</div></div><div class="decision-grid">${boxes}</div><div class="decision-conclusion ${verdictTone}"><strong>Overall assessment:</strong> ${conclusion}</div>`;
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewDecisionSummaryWrapped){
    const wrapped=function(...args){const out=originalRender.apply(this,args);setTimeout(apply,0);return out;};
    wrapped.__reviewDecisionSummaryWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReviewDecisionSummary={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

'use strict';
(() => {
  const VERSION=1;
  if((window.__reviewReconciliationVersion||0)>=VERSION)return;
  window.__reviewReconciliationVersion=VERSION;

  const STORE_KEY='meloni-review-reconciliation-v1';
  let userEditedConclusion=false;

  function injectStyles(){
    if(document.getElementById('reviewReconciliationStyles'))return;
    const st=document.createElement('style');
    st.id='reviewReconciliationStyles';
    st.textContent=`
      #reviewReconciliation{grid-column:span 12}
      #reviewReconciliation .recon-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1.35fr);gap:14px}
      #reviewReconciliation .recon-panel{border:1px solid #e1e6ed;border-radius:10px;background:#fafbfd;padding:14px}
      #reviewReconciliation .recon-panel h3{margin:0 0 4px;font-size:13px;color:#172033}
      #reviewReconciliation .recon-panel>p{margin:0 0 12px;color:#667085;font-size:10px;line-height:1.45}
      #reviewReconciliation .recon-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}
      #reviewReconciliation .recon-stat{border:1px solid #e6eaf0;border-radius:8px;background:#fff;padding:9px 10px}
      #reviewReconciliation .recon-stat span{display:block;color:#667085;font-size:9px;font-weight:700;line-height:1.3}
      #reviewReconciliation .recon-stat b{display:block;color:#174f83;font-size:15px;margin-top:3px}
      #reviewReconciliation .recon-input-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
      #reviewReconciliation .recon-input-row label{display:block;color:#344054;font-size:10px;font-weight:750;margin-bottom:5px}
      #reviewReconciliation .recon-input-row input{width:100%;box-sizing:border-box}
      #reviewReconciliation .recon-delta{margin-top:10px;padding:10px;border-radius:8px;background:#f8fafc;border:1px solid #e1e6ed;color:#475467;font-size:10px;line-height:1.5}
      #reviewReconciliation .recon-delta.good{background:#f4faf6;border-color:#cbe8d8;color:#11663f}
      #reviewReconciliation .recon-delta.warn{background:#fffaf3;border-color:#fed7aa;color:#9a3412}
      #reviewReconciliation textarea{width:100%;min-height:128px;box-sizing:border-box;resize:vertical;line-height:1.5}
      #reviewReconciliation .recon-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
      #reviewReconciliation .recon-note{margin-top:9px;color:#667085;font-size:9px;line-height:1.45}
      @media(max-width:850px){#reviewReconciliation .recon-layout{grid-template-columns:1fr}#reviewReconciliation .recon-values{grid-template-columns:1fr}}
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
  function mult(v){
    if(typeof fmtX==='function')return fmtX(v);
    return Number.isFinite(v)?v.toFixed(2)+'x':'N/A';
  }
  function num(v){const x=Number(v);return Number.isFinite(x)?x:NaN;}

  function loadSaved(){
    try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};}catch(e){return {};}
  }
  function saveSaved(obj){
    try{localStorage.setItem(STORE_KEY,JSON.stringify(obj));}catch(e){}
  }
  function analysisKey(){
    const name=(state?.name||'').trim();
    const address=(state?.address||'').trim();
    return address||name||'current-analysis';
  }
  function getSavedForCurrent(){return loadSaved()[analysisKey()]||{};}
  function persistCurrent(reconciled,conclusion){
    const all=loadSaved();
    all[analysisKey()]={reconciled:Number.isFinite(reconciled)?reconciled:null,conclusion:conclusion||''};
    saveSaved(all);
  }

  function generatedConclusion(reconciled){
    const y1=result?.years?.[0];
    if(!result||!state||!y1)return '';
    const support=[result.capValue,result.grmValue].filter(Number.isFinite);
    const low=support.length?Math.min(...support):NaN;
    const high=support.length?Math.max(...support):NaN;
    const parts=[];
    if(Number.isFinite(low)&&Number.isFinite(high)){
      parts.push(`The income approaches indicate a property value range of ${money(low)} to ${money(high)} based on the selected capitalization rate and gross rent multiplier benchmarks.`);
    }
    if(Number.isFinite(reconciled)){
      const delta=reconciled?((state.price-reconciled)/reconciled):NaN;
      let sentence=`The reconciled investment value is ${money(reconciled)} compared with an acquisition price of ${money(state.price)}`;
      if(Number.isFinite(delta))sentence+=`, placing the acquisition price ${Math.abs(delta*100).toFixed(1)}% ${delta>0?'above':'below'} the reconciled value`;
      parts.push(sentence+'.');
    }
    if(Number.isFinite(result.IRR))parts.push(`The projected IRR is ${pct(result.IRR)} versus the required return of ${pct(state.requiredReturn)}.`);
    parts.push(`Year 1 performance includes a ${pct(result.cap)} capitalization rate, ${mult(result.grm)} GRM${Number.isFinite(y1.dcr)?`, ${mult(y1.dcr)} DSCR`:''}, and NPV of ${money(result.NPV)}.`);
    const meets=Number.isFinite(result.IRR)&&result.IRR>=state.requiredReturn&&Number.isFinite(result.NPV)&&result.NPV>=0;
    parts.push(meets?'Based on the modeled assumptions, the investment meets the selected return requirement.':'Based on the modeled assumptions, one or more return benchmarks are not currently met and the acquisition terms should be reviewed in conjunction with the investor’s objectives.');
    return parts.join(' ');
  }

  function updateDelta(){
    const input=document.getElementById('reviewReconciledValue');
    const box=document.getElementById('reviewReconciledDelta');
    if(!input||!box||!state)return;
    const v=num(input.value);
    box.className='recon-delta';
    if(!Number.isFinite(v)||v<=0){
      box.textContent='Enter a reconciled investment value to compare it with the acquisition price.';
      return;
    }
    const diff=state.price-v;
    const rate=diff/v;
    if(diff<=0)box.classList.add('good');else box.classList.add('warn');
    const relation=diff>0?'premium above':diff<0?'discount below':'equal to';
    box.innerHTML=`<strong>Acquisition Price vs. Reconciled Value:</strong> ${money(state.price)} is ${diff===0?'equal to':`${money(Math.abs(diff))} (${Math.abs(rate*100).toFixed(1)}%) ${relation}`} ${diff===0?money(v):money(v)+'.'}`;
  }

  function wire(card){
    const input=card.querySelector('#reviewReconciledValue');
    const textarea=card.querySelector('#reviewInvestmentConclusion');
    const midpointBtn=card.querySelector('#reviewUseMidpoint');
    const regenBtn=card.querySelector('#reviewRegenerateConclusion');
    if(input&&!input.dataset.wired){
      input.dataset.wired='1';
      input.addEventListener('input',()=>{
        updateDelta();
        const v=num(input.value);
        if(!userEditedConclusion&&textarea)textarea.value=generatedConclusion(v);
        persistCurrent(v,textarea?.value||'');
      });
    }
    if(textarea&&!textarea.dataset.wired){
      textarea.dataset.wired='1';
      textarea.addEventListener('input',()=>{
        userEditedConclusion=true;
        persistCurrent(num(input?.value),textarea.value);
      });
    }
    if(midpointBtn&&!midpointBtn.dataset.wired){
      midpointBtn.dataset.wired='1';
      midpointBtn.addEventListener('click',()=>{
        const vals=[result?.capValue,result?.grmValue].filter(Number.isFinite);
        if(!vals.length)return;
        const mid=vals.reduce((a,b)=>a+b,0)/vals.length;
        input.value=Math.round(mid);
        updateDelta();
        if(!userEditedConclusion)textarea.value=generatedConclusion(mid);
        persistCurrent(mid,textarea.value);
      });
    }
    if(regenBtn&&!regenBtn.dataset.wired){
      regenBtn.dataset.wired='1';
      regenBtn.addEventListener('click',()=>{
        userEditedConclusion=false;
        textarea.value=generatedConclusion(num(input.value));
        persistCurrent(num(input.value),textarea.value);
      });
    }
  }

  function apply(){
    injectStyles();
    const decision=document.getElementById('reviewDecisionSummary');
    const grid=document.querySelector('#dashboard .grid');
    if(!decision||!grid||!result||!state)return false;
    let card=document.getElementById('reviewReconciliation');
    if(!card){
      card=document.createElement('div');
      card.id='reviewReconciliation';
      card.className='card span-12';
      decision.insertAdjacentElement('afterend',card);
    }else if(card.previousElementSibling!==decision){
      decision.insertAdjacentElement('afterend',card);
    }

    const vals=[result.capValue,result.grmValue].filter(Number.isFinite);
    const midpoint=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:NaN;
    const saved=getSavedForCurrent();
    const existingInput=card.querySelector('#reviewReconciledValue');
    const existingText=card.querySelector('#reviewInvestmentConclusion');
    const currentRecon=existingInput?num(existingInput.value):(Number.isFinite(saved.reconciled)?saved.reconciled:NaN);
    const savedConclusion=existingText?existingText.value:(saved.conclusion||'');
    if(savedConclusion)userEditedConclusion=true;
    const conclusion=savedConclusion||generatedConclusion(currentRecon);

    card.innerHTML=`
      <div class="sectionhead"><div><h2>Reconciled Investment Value & Recommendation</h2><p>Combine the calculated income approaches with professional judgment and state the investment conclusion.</p></div><span class="badge">Professional Judgment</span></div>
      <div class="recon-layout">
        <div class="recon-panel">
          <h3>Reconciled Investment Value</h3>
          <p>The cap-rate and GRM values are calculated outputs. The reconciled value is the user's concluded investment value after considering both methods and other relevant factors.</p>
          <div class="recon-values">
            <div class="recon-stat"><span>Direct Capitalization Value</span><b>${money(result.capValue)}</b></div>
            <div class="recon-stat"><span>GRM Value</span><b>${money(result.grmValue)}</b></div>
            <div class="recon-stat"><span>Simple Midpoint Reference</span><b>${money(midpoint)}</b></div>
          </div>
          <div class="recon-input-row"><div><label for="reviewReconciledValue">Reconciled Investment Value</label><input id="reviewReconciledValue" type="number" step="1000" value="${Number.isFinite(currentRecon)?Math.round(currentRecon):''}" placeholder="Enter concluded value"></div><button type="button" class="btn secondary" id="reviewUseMidpoint">Use Midpoint</button></div>
          <div id="reviewReconciledDelta" class="recon-delta"></div>
          <div class="recon-note">The midpoint is provided only as a reference. It is not automatically treated as the final value.</div>
        </div>
        <div class="recon-panel">
          <h3>Investment Recommendation / Conclusion</h3>
          <p>A draft conclusion is generated from the current analysis. Edit it as needed to reflect professional judgment, property-specific considerations and the intended investor.</p>
          <textarea id="reviewInvestmentConclusion">${conclusion.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
          <div class="recon-actions"><button type="button" class="btn secondary" id="reviewRegenerateConclusion">Regenerate From Current Results</button></div>
        </div>
      </div>`;
    wire(card);
    updateDelta();
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewReconciliationWrapped){
    const wrapped=function(...args){const out=originalRender.apply(this,args);setTimeout(apply,0);return out;};
    wrapped.__reviewReconciliationWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
  }

  window.ReviewReconciliation={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

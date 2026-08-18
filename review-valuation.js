'use strict';
(() => {
  const VERSION=2;
  if((window.__reviewValuationVersion||0)>=VERSION)return;
  window.__reviewValuationVersion=VERSION;

  function injectStyles(){
    if(document.getElementById('reviewValuationStyles'))return;
    const st=document.createElement('style');
    st.id='reviewValuationStyles';
    st.textContent=`
      #reviewAnalysisSetup .review-implied-value{margin-top:9px;padding:10px 11px;border:1px solid #cfe0ef;border-radius:8px;background:#f7fbff}
      #reviewAnalysisSetup .review-implied-value span{display:block;color:#596579;font-size:9px;font-weight:700;line-height:1.35;text-transform:uppercase;letter-spacing:.03em}
      #reviewAnalysisSetup .review-implied-value b{display:block;margin-top:3px;color:#174f83;font-size:18px;line-height:1.2}
      #reviewAnalysisSetup .review-implied-value small{display:block;margin-top:4px;color:#667085;font-size:9px;line-height:1.35}
      #reviewAnalysisSetup .review-return-result{background:#f8fafc;border-color:#d8dee8}
      #reviewAnalysisSetup .review-return-result b{color:#344054}
      #reviewAnalysisSetup .review-return-result.meets-target{background:#edf8f2;border-color:#cbe8d8}
      #reviewAnalysisSetup .review-return-result.meets-target b{color:#11663f}
      #reviewAnalysisSetup .review-return-result.below-target{background:#fff7ed;border-color:#fed7aa}
      #reviewAnalysisSetup .review-return-result.below-target b{color:#9a3412}
      #dashboard .review-old-valuation-hidden,#dashboard .review-old-return-hidden{display:none!important}
    `;
    document.head.appendChild(st);
  }

  function money(v){
    if(typeof fmtC==='function')return fmtC(v);
    return Number.isFinite(v)?v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'N/A';
  }

  function percent(v){
    if(typeof fmtP==='function')return fmtP(v);
    return Number.isFinite(v)?(v*100).toFixed(2)+'%':'N/A';
  }

  function ensureValueBox(field,id,label,explanation,extraClass=''){
    if(!field)return null;
    let box=field.querySelector('#'+id);
    if(!box){
      box=document.createElement('div');
      box.id=id;
      box.className='review-implied-value'+(extraClass?' '+extraClass:'');
      box.innerHTML='<span>'+label+'</span><b>—</b><small>'+explanation+'</small>';
      field.appendChild(box);
    }
    return box;
  }

  function apply(){
    injectStyles();
    const review=document.getElementById('reviewAnalysisSetup');
    if(!review)return false;

    const requiredInput=document.getElementById('review_f_requiredReturn');
    const capInput=document.getElementById('review_f_desiredCap');
    const grmInput=document.getElementById('review_f_desiredGrm');
    const requiredField=requiredInput?.closest('.field');
    const capField=capInput?.closest('.field');
    const grmField=grmInput?.closest('.field');

    const returnBox=ensureValueBox(
      requiredField,
      'reviewCalculatedReturn',
      'Calculated Internal Rate of Return (IRR)',
      'The modeled annualized return based on the initial investment, projected after-tax operating cash flows and after-tax sale proceeds over the selected holding period.',
      'review-return-result'
    );
    const capBox=ensureValueBox(
      capField,
      'reviewCapValue',
      'Property Value Based on Desired Cap Rate',
      'Year 1 NOI divided by the desired capitalization rate entered above.'
    );
    const grmBox=ensureValueBox(
      grmField,
      'reviewGrmValue',
      'Property Value Based on Desired GRM',
      'Annual potential gross rent multiplied by the desired gross rent multiplier entered above.'
    );

    if(returnBox){
      const irr=result?.IRR;
      returnBox.querySelector('b').textContent=percent(irr);
      returnBox.classList.remove('meets-target','below-target');
      if(Number.isFinite(irr)&&state&&Number.isFinite(state.requiredReturn)){
        returnBox.classList.add(irr>=state.requiredReturn?'meets-target':'below-target');
        const small=returnBox.querySelector('small');
        if(small)small.textContent=(irr>=state.requiredReturn?'Meets or exceeds':'Falls below')+' the '+percent(state.requiredReturn)+' required return. IRR reflects the initial investment, projected after-tax operating cash flows and after-tax sale proceeds over the selected holding period.';
      }
    }
    if(capBox)capBox.querySelector('b').textContent=money(result?.capValue);
    if(grmBox)grmBox.querySelector('b').textContent=money(result?.grmValue);

    const oldValuation=document.getElementById('valuation')?.closest('.card');
    if(oldValuation)oldValuation.classList.add('review-old-valuation-hidden');
    const oldReturn=document.getElementById('returnSummary')?.closest('.card');
    if(oldReturn)oldReturn.classList.add('review-old-return-hidden');
    return true;
  }

  const originalRender=window.render;
  if(typeof originalRender==='function'&&!originalRender.__reviewValuationWrapped){
    const wrapped=function(...args){
      const out=originalRender.apply(this,args);
      setTimeout(apply,0);
      return out;
    };
    wrapped.__reviewValuationWrapped=true;
    window.render=wrapped;
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{if(apply()||++tries>50)clearInterval(timer)},125);
    document.querySelector('[data-s8-tab="dashboard"]')?.addEventListener('click',()=>setTimeout(apply,0));
    window.addEventListener('resize',()=>setTimeout(apply,0),{passive:true});
  }

  window.ReviewValuation={apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
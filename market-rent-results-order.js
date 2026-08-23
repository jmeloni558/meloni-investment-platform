'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptMarketRentResultsOrderV||0)>=VERSION)return;
  window.__ptMarketRentResultsOrderV=VERSION;

  function styles(){
    if(document.getElementById('ptMarketRentResultsOrderStyles'))return;
    const st=document.createElement('style');
    st.id='ptMarketRentResultsOrderStyles';
    st.textContent=`
      #dashboard #ptDecisionCenter{order:-80!important;}
      #dashboard #ptInvestmentThesis{order:-79!important;}
      #dashboard #ptMarketRentDecision{order:-78!important;}
    `;
    document.head.appendChild(st);
  }

  function pin(){
    styles();
    const dc=document.getElementById('ptDecisionCenter');
    const thesis=document.getElementById('ptInvestmentThesis');
    const rent=document.getElementById('ptMarketRentDecision');
    if(dc&&thesis&&thesis.previousElementSibling!==dc)dc.insertAdjacentElement('afterend',thesis);
    if(thesis&&rent&&rent.previousElementSibling!==thesis)thesis.insertAdjacentElement('afterend',rent);
    return !!rent;
  }

  function schedule(){[0,40,120,260].forEach(ms=>setTimeout(pin,ms));}
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],#appNavReview,[data-app-review],[data-hub-open],[data-pt-open],#gwNext,#gwSave'))schedule();
  },true);
  window.addEventListener('pageshow',schedule);

  const h=window.PropertyThesisResultsHydration;
  if(h&&typeof h.hydrate==='function'&&!h.hydrate.__ptMarketRentOrderWrapped){
    const original=h.hydrate;
    const wrapped=async function(){const out=await original.apply(this,arguments);schedule();return out;};
    wrapped.__ptMarketRentOrderWrapped=true;
    wrapped.__original=original;
    h.hydrate=wrapped;
  }

  window.PropertyThesisMarketRentResultsOrder={version:VERSION,pin,schedule};
  schedule();
})();

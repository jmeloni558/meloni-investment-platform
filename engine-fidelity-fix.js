'use strict';
(()=>{
  const VERSION=2;
  if((window.__engineFidelityFixVersion||0)>=VERSION)return;
  window.__engineFidelityFixVersion=VERSION;

  // Income-model fidelity corrections now live exclusively in the protected server engine.
  // This browser module retains only the standard rate-buydown presentation helper.
  function nper(rate,payment,presentValue){
    if(!Number.isFinite(payment)||payment<=0||!Number.isFinite(presentValue))return NaN;
    if(rate===0)return -presentValue/payment;
    const term=1+(presentValue*rate/payment);
    if(term<=0)return NaN;
    return -Math.log(term)/Math.log(1+rate);
  }

  const originalRenderBuydown=window.renderBuydown;
  if(typeof originalRenderBuydown==='function'){
    window.renderBuydown=function(){
      const host=document.getElementById('buydownResults');
      if(!host)return;
      const months=buyState.loan1Years*12;
      const p1=pmt(buyState.loan1Rate/12,months,buyState.loan1Amount);
      const p2=pmt(buyState.loan2Rate/12,months,buyState.loan1Amount);
      const cost=buyState.loan1Amount*.01*buyState.loan2Points;
      const savings=p1-p2;
      const breakEvenMonths=nper(buyState.loan1Rate/12,savings,-cost);
      host.innerHTML=`<div class="box"><span>Monthly Savings</span><b>${fmtC(savings,2)}</b></div><div class="box"><span>Point Cost</span><b>${fmtC(cost)}</b></div><div class="box"><span>Break-Even</span><b>${Number.isFinite(breakEvenMonths)?breakEvenMonths.toFixed(1)+' months':'N/A'}</b></div>`;
    };
  }
  try{if(typeof renderBuydown==='function')renderBuydown();}catch(_e){}
})();
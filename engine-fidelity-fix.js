'use strict';
(() => {
  const VERSION=1;
  if((window.__engineFidelityFixVersion||0)>=VERSION)return;
  window.__engineFidelityFixVersion=VERSION;

  function calcNpv(rate,cashFlows){
    return cashFlows.reduce((sum,value,index)=>sum+value/Math.pow(1+rate,index),0);
  }

  function calcIrr(cashFlows){
    if(!cashFlows.some(x=>x<0)||!cashFlows.some(x=>x>0))return NaN;
    let lo=-.9999,hi=10;
    const f=r=>cashFlows.reduce((sum,value,index)=>sum+value/Math.pow(1+r,index),0);
    let flo=f(lo),fhi=f(hi);
    for(let i=0;i<15&&flo*fhi>0;i++){hi*=2;fhi=f(hi);}
    if(flo*fhi>0)return NaN;
    for(let i=0;i<150;i++){
      const mid=(lo+hi)/2, fm=f(mid);
      if(flo*fm<=0){hi=mid;fhi=fm;}else{lo=mid;flo=fm;}
    }
    return (lo+hi)/2;
  }

  const originalAnalyze=window.analyze;
  if(typeof originalAnalyze==='function'&&!originalAnalyze.__excelFidelityWrapped){
    const patchedAnalyze=function(s){
      const out=originalAnalyze(s);
      if(s&&s.interestOnly&&s.loanYears>0&&Array.isArray(out?.years)){
        for(const yr of out.years){
          yr.endBalance=yr.year<=s.loanYears?s.mortgage:0;
        }
        out.loanPayoff=out.years.length?out.years[out.years.length-1].endBalance:0;
        out.ater=out.netSale-out.loanPayoff-out.saleTax;
        out.cfs=[out.initial,...out.years.map((yr,index)=>yr.atcf+(index===out.years.length-1?out.ater:0))];
        out.IRR=calcIrr(out.cfs);
        out.NPV=calcNpv(s.requiredReturn,out.cfs);
      }
      return out;
    };
    patchedAnalyze.__excelFidelityWrapped=true;
    patchedAnalyze.__originalAnalyze=originalAnalyze;
    window.analyze=patchedAnalyze;
  }

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

  try{if(typeof render==='function')render();}catch(e){}
  try{if(typeof renderBuydown==='function')renderBuydown();}catch(e){}
})();

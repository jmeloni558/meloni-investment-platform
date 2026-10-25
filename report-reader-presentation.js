'use strict';
(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const number=text=>{const s=String(text??'').trim();if(!/[0-9]/.test(s)||/N\/A|not |unknown|unavailable/i.test(s))return null;const n=Number(s.replace(/[$,%x\s()]/g,''));return Number.isFinite(n)?(/^\(/.test(s)?-n:n):null;};
  function stats(section){const map={};for(const el of section?.querySelectorAll('.rb-stat,.rb-row')||[]){const label=el.children[0]?.textContent.trim(),value=el.children[1]?.textContent.trim();if(label)map[label]={text:value,n:number(value),note:el.querySelector('small')?.textContent||''};}return map;}
  function paragraph(section,key,copy){if(!section)return;let p=section.querySelector('[data-reader-copy="'+key+'"]');if(!copy){p?.remove();return;}if(!p){p=document.createElement('p');p.className='rb-analysis-copy pt-reader-copy';p.dataset.readerCopy=key;section.querySelector('.rb-section-head')?.insertAdjacentElement('afterend',p);}if(p.textContent!==copy)p.textContent=copy;}
  let observer,timer;
  function apply(){
    const report=document.querySelector('#clientReport .rb-report');if(!report)return false;
    const section=name=>report.querySelector('[data-rb-section="'+name+'"]');
    const snapshot=stats(section('snapshot')),operating=stats(section('operating')),financing=stats(section('financing')),returns=stats(section('returns')),valuation=stats(section('valuation')),rent=stats(section('marketRentSupport')),assumptions=stats(section('assumptions'));
    const price=snapshot['Acquisition Price']?.n,noi=snapshot['Year 1 NOI']?.n,cap=snapshot['Capitalization Rate']?.n;
    const target=number(snapshot['Capitalization Rate']?.note.replace(/^Target\s*/i,''));
    const parts=[];
    if(price>0&&noi!==null&&noi!==undefined&&cap!==null&&cap!==undefined)parts.push(`At an acquisition price of ${money(price)}, the property is projected to generate ${money(noi)} in first-year net operating income (NOI), before loan payments and income taxes. This is a ${cap.toFixed(2)}% cap rate${target>0?`, ${Math.abs(cap-target)<.005?'in line with':cap<target?'below':'above'} the selected ${target.toFixed(2)}% Desired Cap Rate`:''}.`);
    const income=section('incomeComparables'),sales=section('salesComparables'),rental=section('marketRentSupport');
    const evidence=[income?'income comparable sales':'',sales?'comparable sale prices':'',rental?'rental listings':''].filter(Boolean);
    const incomeBrief=income?.querySelector('.pt-income-comparison')?.textContent.split(/(?<=[.!?]) (?=[A-Z])/)[0];
    parts.push(incomeBrief?incomeBrief+' The detailed comparison below relates this evidence to the subject’s price and target return.':evidence.length?`The report includes ${evidence.join(', ')}. These provide different checks on income and pricing; the comparisons below explain how they relate to this property.`:'No comparable evidence is included in this report. The conclusions reflect the entered rents, expenses and return targets, rather than independently supported market value.');
    const summaryHtml='<div class="rb-section-head"><h2>The investment in plain language</h2></div>'+parts.map(p=>'<p class="pt-reader-copy">'+esc(p)+'</p>').join('');
    let summary=report.querySelector('[data-rb-section="readerSummary"]');if(!summary){summary=document.createElement('section');summary.className='rb-section pt-reader-summary';summary.dataset.rbSection='readerSummary';report.querySelector('.rb-cover')?.insertAdjacentElement('afterend',summary);}if(summary.innerHTML!==summaryHtml)summary.innerHTML=summaryHtml;
    // Keep old components available for other views, but exclude duplicate prose from this report.
    for(const old of report.querySelectorAll(':scope > .rb-conclusion,:scope > .rb-findings'))if(!old.hidden)old.hidden=true;
    const valSection=section('valuation');
    for(const card of valSection?.querySelectorAll('.rb-stat')||[]){const label=card.children[0]?.textContent||'',value=card.children[1]?.textContent||'';if(/Reconciled/.test(label)){const hide=/N\/A|Not entered|Not Reconciled/.test(value);if(card.hidden!==hide)card.hidden=hide;}}
    const valSubtitle=valSection?.querySelector('.rb-section-head p');if(valSubtitle&&valSubtitle.textContent!=='Value indications based on the subject’s income and selected targets.')valSubtitle.textContent='Value indications based on the subject’s income and selected targets.';
    const rentNote=rental?.querySelector('.rb-stat small');if(rentNote&&rentNote.textContent==='Analyst-selected underwriting rent')rentNote.textContent='Separate rental research conclusion';
    const sale=stats(section('disposition')),gross=sale['Projected Gross Sale Price']?.n,cost=sale['Selling Expenses']?.n,payoff=sale['Loan Payoff']?.n,tax=sale['Taxes Due on Sale']?.n,equity=sale['After-Tax Equity Reversion']?.n;
    paragraph(section('disposition'),'disposition',[gross,cost,payoff,tax,equity].every(Number.isFinite)?`The modeled sale price is ${money(gross)}. After ${money(cost)} in selling costs, ${money(payoff)} of loan payoff and ${money(tax)} of modeled sale taxes, ${money(equity)} remains for the investor. This is a projection based on the stated holding period and appreciation assumptions.`:'');
    const capValue=valuation['Direct Capitalization Value']?.n;
    paragraph(section('valuation'),'valuation',capValue>0&&price>0?`The selected cap-rate target supports an income-based value of ${money(capValue)}. The acquisition price is ${money(Math.abs(price-capValue))} ${price>=capValue?'above':'below'} that indication. This value is driven by the subject's income and selected target; it is not a sale-price appraisal.`:'');
    const debt=financing['Year 1 Debt Service']?.n,loan=financing['Loan Amount']?.n;
    paragraph(section('financing'),'financing',loan===0?'This is an all-cash analysis, so no mortgage payments are deducted from operating income. Financing does not change the property’s cap rate.':debt>0&&noi!==null&&noi!==undefined?`Annual loan payments are ${money(debt)}, compared with ${money(noi)} of first-year NOI. ${noi<debt?`Operating income falls short of those payments by ${money(debt-noi)}, before income taxes.`:`Operating income exceeds those payments by ${money(noi-debt)}, before income taxes.`} Debt coverage is ${(noi/debt).toFixed(2)}x; 1.00x means income just covers payments.`:'');
    const pgi=operating['Year 1 Potential Gross Income']?.n,egi=operating['Year 1 Effective Gross Income']?.n,opex=operating['Year 1 Operating Expenses']?.n,cf=operating['Year 1 After-Tax Cash Flow']?.n;
    paragraph(section('operating'),'operating',[pgi,egi,opex,noi,cf].every(Number.isFinite)?`First-year potential income of ${money(pgi)} falls to ${money(egi)} after vacancy and credit loss. Operating expenses of ${money(opex)} leave ${money(noi)} of NOI; after financing and modeled income taxes, cash flow is ${money(cf)}${cf<0?' (a cash shortfall)':''}.`:'');
    const irr=returns['Calculated IRR']?.n,required=returns['Required Rate of Return']?.n,npv=returns['NPV']?.n;
    paragraph(section('returns'),'returns',[irr,required,npv].every(Number.isFinite)?`The projected annualized return (IRR), including the modeled sale, is ${irr.toFixed(2)}%, ${Math.abs(irr-required)<.005?'in line with':irr<required?'below':'above'} the ${required.toFixed(2)}% required return. Net present value is ${money(npv)}: ${npv<0?'the projected cash flows fall short of that return target':npv>0?'the projected cash flows exceed that return target':'the projected cash flows meet that return target'}, after accounting for their timing.`:'');
    const total=assumptions['Total Monthly Rent']?.n,units=assumptions['Units / Apartments']?.n,concluded=rent['Concluded Market Rent']?.n;
    paragraph(rental,'rental-basis',total>=0&&units>0&&concluded>=0?`The analysis uses ${money(total)} total monthly rent across ${units} unit${units===1?'':'s'} (${money(total/units)} per unit on average). The separate rental research concludes ${money(concluded)} per month; it is supporting research, not a replacement for the unit rents shown in this analysis. Compare like-for-like unit size and condition before adopting it.`:'');
    const saleStats=stats(sales),median=saleStats['Median Sale Price']?.n,count=saleStats['Selected Comparables']?.n;
    paragraph(sales,'sales',price>0&&median>0?`The subject's ${money(price)} acquisition price is ${money(Math.abs(price-median))} ${price>=median?'above':'below'} the ${money(median)} median of ${count||'the selected'} comparable sale${count===1?'':'s'}. These sale prices are unadjusted for property differences; the comparison alone does not establish fair value.`:'');
    return true;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{observer?.disconnect();try{apply();}finally{observe();}},40);}
  function observe(){const host=document.getElementById('clientReport');if(host)observer?.observe(host,{childList:true,subtree:true,characterData:true});}
  function start(){if(!document.getElementById('ptReaderStyles')){const s=document.createElement('style');s.id='ptReaderStyles';s.textContent='#clientReport [hidden]{display:none!important}#clientReport .pt-reader-copy{font-size:13px!important;line-height:1.65!important;color:#354a5d!important;margin:10px 0 14px!important}#clientReport .pt-reader-summary{background:#eff7f6!important;border:0!important;border-radius:10px;margin:20px 30px;padding:20px!important}#clientReport .rb-conclusion{border-left-color:#148478!important}';document.head.appendChild(s);}observer=new MutationObserver(schedule);observe();schedule();}
  window.PropertyThesisReportReader={apply,stats,number};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

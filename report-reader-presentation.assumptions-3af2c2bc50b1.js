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
    const assumptionsPanel=section('assumptions');
    for(const row of assumptionsPanel?.querySelectorAll('.rb-row')||[]){const value=row.children[1];if(value){const formatted=value.textContent.replace(/(\d+)\.(\d+)/g,(_,whole,decimal)=>whole+(decimal.replace(/0+$/,'')?'.'+decimal.replace(/0+$/,''):''));if(value.textContent!==formatted)value.textContent=formatted;}}
    const propertyPanel=assumptionsPanel?.querySelector('.rb-panel');
    if(propertyPanel){
      const rows=[...propertyPanel.querySelectorAll('.rb-row')].filter(row=>/^(Units \/ Apartments|Unit \d+ Monthly Rent|Monthly Rent|Total Monthly Rent)$/.test(row.children[0]?.textContent.trim()));
      if(rows.length){let group=propertyPanel.querySelector('.pt-unit-rents');if(!group){group=document.createElement('div');group.className='pt-unit-rents';group.innerHTML='<h4>Units & Monthly Rents</h4>';rows[0].before(group);}for(const row of rows)if(row.parentElement!==group)group.append(row);}
    }
    const snapshot=stats(section('snapshot')),operating=stats(section('operating')),financing=stats(section('financing')),returns=stats(section('returns')),valuation=stats(section('valuation')),rent=stats(section('marketRentSupport')),assumptions=stats(section('assumptions'));
    const price=snapshot['Acquisition Price']?.n,noi=snapshot['Year 1 NOI']?.n,cap=snapshot['Capitalization Rate']?.n;
    const target=number(snapshot['Capitalization Rate']?.note.replace(/^Target\s*/i,''));
    const grm=snapshot['Gross Rent Multiplier']?.n,grmTarget=number(snapshot['Gross Rent Multiplier']?.note.replace(/^Target\s*/i,''));
    const parts=[];
    const thesisDebt=financing['Year 1 Debt Service']?.n,thesisIrr=returns['Calculated IRR']?.n??snapshot['Internal Rate of Return']?.n,thesisRequired=returns['Required Rate of Return']?.n??number(snapshot['Internal Rate of Return']?.note.replace(/^Required\s*/i,''));
    const thesisValue=valuation['Direct Capitalization Value']?.n;
    if(price>0&&Number.isFinite(noi)&&Number.isFinite(cap)){
      const otherShortfall=(Number.isFinite(thesisIrr)&&Number.isFinite(thesisRequired)&&thesisIrr<thesisRequired-.005)||(thesisDebt>0&&noi<thesisDebt)||(grmTarget>0&&Number.isFinite(grm)&&grm>grmTarget+.005);
      const conclusion=target>0?(cap<target-.005?'The data challenge the investment thesis at the current price: it is not supported by the selected income-return target.':otherShortfall?'The data partly support the investment thesis: the income-yield target is met, but pricing, financing or total-return results fall short.':'The modeled results support the investment thesis against the selected targets, subject to verification of the income assumptions.'): 'The investment case depends on whether the projected income can be sustained.';
      let text=`${conclusion} At ${money(price)}, annual net operating income of ${money(noi)} produces a ${cap.toFixed(2)}% cap rate${target>0?`, compared with the desired ${target.toFixed(2)}%`:''}.`;
      if(target>0&&cap<target-.005&&thesisValue>0)text+=` The same income supports about ${money(thesisValue)} at that target, so the case requires a lower price or higher verified operating income.`;
      parts.push(text);
    }else parts.push('There is not enough complete income and pricing information to conclude whether the property meets the investment target.');
    const income=section('incomeComparables'),sales=section('salesComparables'),rental=section('marketRentSupport');
    const evidence=[income?'income comparable sales':'',sales?'comparable sale prices':'',rental?'rental listings':''].filter(Boolean);
    const incomeBrief=income?.querySelector('.pt-income-comparison')?.textContent.split(/(?<=[.!?]) (?=[A-Z])/).slice(0,2).join(' ');
    let support=incomeBrief|| (evidence.length?`The report includes ${evidence.join(' and ')} as market context.`:'No comparable evidence is included, so this conclusion rests on the entered assumptions rather than independent market confirmation.');
    if(Number.isFinite(thesisDebt)&&thesisDebt>0&&Number.isFinite(noi)&&noi<thesisDebt)support+=` The subject's operating income also falls ${money(thesisDebt-noi)} short of annual loan payments before taxes.`;
    if(Number.isFinite(thesisIrr)&&Number.isFinite(thesisRequired))support+=` Its projected ${thesisIrr.toFixed(2)}% annualized total return is ${Math.abs(thesisIrr-thesisRequired)<.005?'approximately equal to':thesisIrr<thesisRequired?'below':'above'} the ${thesisRequired.toFixed(2)}% goal.`;
    if(grmTarget>0&&Number.isFinite(grm))support+=` The price is ${grm.toFixed(2)} times annual gross rent, ${Math.abs(grm-grmTarget)<.005?'in line with':grm>grmTarget?'above':'below'} the ${grmTarget.toFixed(2)}x target.`;
    parts.push(support);
    const idea=[];
    const hold=number(assumptions['Expected Holding Period']?.text.replace(/\s*years?$/i,'')),loanPlan=financing['Loan Amount']?.n;
    let plan=price>0?`The investment idea being tested is to acquire this property for ${money(price)} and turn its rental income into ongoing cash flow and a long-term investment return.`:'The investment idea being tested is to turn this property’s rental income into ongoing cash flow and a long-term investment return.';
    plan+=` The plan depends on achievable rents covering operating costs${loanPlan>0?' and scheduled loan payments':''}, with the eventual sale contributing to the overall result${hold>0?` over the selected ${hold}-year holding period`:''}.`;
    idea.push(plan);
    const goals=[];
    if(target>0)goals.push(`The income target is a ${target.toFixed(2)}% cap rate: annual income after operating expenses, but before loan payments and income taxes, should equal ${target.toFixed(2)}% of the purchase price.`);
    if(Number.isFinite(thesisRequired))goals.push(`The longer-term goal is a ${thesisRequired.toFixed(2)}% annualized total return from cash flow and the eventual sale.`);
    let benchmarks=goals.length?goals.join(' '):'The analysis evaluates income, expenses, cash flow and resale assumptions against the available investment targets.';
    if(grmTarget>0)benchmarks+=` A gross rent multiplier of ${grmTarget.toFixed(2)}x is an additional pricing benchmark: the purchase price would equal ${grmTarget.toFixed(2)} years of gross rent, before expenses.`;
    benchmarks+=' These are the goals to test, not promised results.';
    idea.push(benchmarks);
    idea.push(evidence.length?'The following sections test the thesis using the property’s projected operations and the included comparable evidence.':'This is a standalone property analysis. No comparable evidence is included; the thesis is tested against the property’s own projected income, expenses, financing and investor targets. It evaluates whether the numbers work under those assumptions, rather than establishing a market-supported value.');
    const summaryHtml='<div class="rb-section-head"><h2>Property Thesis</h2></div>'+idea.map(p=>'<p class="pt-reader-copy">'+esc(p)+'</p>').join('');
    let summary=report.querySelector('[data-rb-section="readerSummary"]');if(!summary){summary=document.createElement('section');summary.className='rb-section pt-reader-summary';summary.dataset.rbSection='readerSummary';report.querySelector('.rb-cover')?.insertAdjacentElement('afterend',summary);}if(summary.innerHTML!==summaryHtml)summary.innerHTML=summaryHtml;
    const conclusionHtml='<div class="rb-section-head"><h2>Conclusion</h2></div>'+[...parts].reverse().map(p=>'<p class="pt-reader-copy">'+esc(p)+'</p>').join('');
    let final=report.querySelector('[data-rb-section="readerConclusion"]');if(!final){final=document.createElement('section');final.className='rb-section pt-reader-conclusion';final.dataset.rbSection='readerConclusion';}
    const footer=report.querySelector(':scope > .rb-footer');if(footer){if(final.nextElementSibling!==footer)footer.before(final);}else if(report.lastElementChild!==final)report.append(final);
    if(final.innerHTML!==conclusionHtml)final.innerHTML=conclusionHtml;
    for(const previous of report.querySelectorAll(':scope > .rb-final-conclusion,:scope > [data-rb-section="finalConclusion"]'))if(!previous.hidden)previous.hidden=true;
    // Keep old components available for other views, but exclude duplicate prose from this report.
    for(const old of report.querySelectorAll(':scope > .rb-conclusion,:scope > .rb-findings'))if(!old.hidden)old.hidden=true;
    const valSection=section('valuation');
    for(const card of valSection?.querySelectorAll('.rb-stat')||[]){const label=card.children[0]?.textContent||'',value=card.children[1]?.textContent||'';if(/Reconciled/.test(label)){const hide=/N\/A|Not entered|Not Reconciled/.test(value);if(card.hidden!==hide)card.hidden=hide;}}
    const valSubtitle=valSection?.querySelector('.rb-section-head p');if(valSubtitle&&valSubtitle.textContent!=='Value indications based on the subject’s income and selected targets.')valSubtitle.textContent='Value indications based on the subject’s income and selected targets.';
    const rentNote=rental?.querySelector('.rb-stat small');if(rentNote&&rentNote.textContent==='Analyst-selected underwriting rent')rentNote.textContent='Separate rental research conclusion';
    const sale=stats(section('disposition')),gross=sale['Projected Gross Sale Price']?.n,cost=sale['Selling Expenses']?.n,payoff=sale['Loan Payoff']?.n,tax=sale['Taxes Due on Sale']?.n,equity=sale['After-Tax Equity Reversion']?.n;
    paragraph(section('disposition'),'disposition',[gross,cost,payoff,tax,equity].every(Number.isFinite)?`The modeled sale price is ${money(gross)}. After ${money(cost)} in selling costs, ${money(payoff)} of loan payoff and ${money(tax)} of modeled sale taxes, ${money(equity)} remains for the investor. This is a projection based on the stated holding period and appreciation assumptions.`:'');
    const capValue=valuation['Direct Capitalization Value']?.n;
    paragraph(section('valuation'),'valuation',capValue>0&&price>0?`The selected cap-rate target supports an income-based value of ${money(capValue)}. The acquisition price is ${money(Math.abs(price-capValue))} ${price>=capValue?'above':'below'} that indication. This is the price that would produce the desired income yield if the projected NOI is achieved. It is a return-based indication, not proof that the property would sell for that amount.`:'');
    const debt=financing['Year 1 Debt Service']?.n,loan=financing['Loan Amount']?.n;
    paragraph(section('financing'),'financing',loan===0?'This is an all-cash analysis, so no mortgage payments are deducted from operating income. The cap rate measures the property’s income yield before financing; the investor’s cash return still depends on operating results, taxes and the eventual sale.':debt>0&&noi!==null&&noi!==undefined?`Annual loan payments are ${money(debt)}, compared with ${money(noi)} of first-year NOI. ${noi<debt?`Operating income falls short of those payments by ${money(debt-noi)}, before income taxes.`:`Operating income exceeds those payments by ${money(noi-debt)}, before income taxes.`} Debt coverage is ${(noi/debt).toFixed(2)}x: each dollar of scheduled loan payments has $${(noi/debt).toFixed(2)} of operating income behind it. ${noi<debt?'The difference must be funded from other cash; there is no operating cushion for unexpected costs.':'The remaining cushion can absorb some income loss or expense increases, but is not guaranteed.'}`:'');
    const pgi=operating['Year 1 Potential Gross Income']?.n,egi=operating['Year 1 Effective Gross Income']?.n,opex=operating['Year 1 Operating Expenses']?.n,cf=operating['Year 1 After-Tax Cash Flow']?.n;
    paragraph(section('operating'),'operating',[pgi,egi,opex,noi,cf].every(Number.isFinite)?`First-year potential income of ${money(pgi)} falls to ${money(egi)} after vacancy and credit loss. Operating expenses of ${money(opex)} leave ${money(noi)} of NOI; after financing and modeled income taxes, cash flow is ${money(cf)}${cf<0?' (a cash shortfall)':''}. ${cf<0?'The property is therefore not projected to distribute cash in Year 1.':'This is the modeled cash available to the investor in Year 1.'} Tax assumptions can make this figure differ materially from income left after loan payments; the schedule below shows how it changes over time.`:'');
    const irr=returns['Calculated IRR']?.n,required=returns['Required Rate of Return']?.n,npv=returns['NPV']?.n;
    paragraph(section('returns'),'returns',[irr,required,npv].every(Number.isFinite)?`The projected annualized return (IRR), including the modeled sale, is ${irr.toFixed(2)}%, ${Math.abs(irr-required)<.005?'in line with':irr<required?'below':'above'} the ${required.toFixed(2)}% required return. Net present value is ${money(npv)}: ${npv<0?'the projected cash flows fall short of that return target':npv>0?'the projected cash flows exceed that return target':'the projected cash flows meet that return target'}, after accounting for their timing. IRR includes both operating cash flow and sale proceeds; it should not be read as the annual cash income available to spend.`:'');
    const total=assumptions['Total Monthly Rent']?.n,units=assumptions['Units / Apartments']?.n,concluded=rent['Concluded Market Rent']?.n;
    paragraph(rental,'rental-basis',total>=0&&units>0&&concluded>=0?`The analysis uses ${money(total)} total monthly rent across ${units} unit${units===1?'':'s'} (${money(total/units)} per unit on average). The separate rental research concludes ${money(concluded)} per month; it is supporting research, not a replacement for the unit rents shown in this analysis. ${total/units>concluded+1?'The average rent used is higher than that research conclusion, so the rental evidence does not by itself validate the assumed unit rents.':'The average and research conclusion should be reconciled to the specific units.'} Check leases, unit size and condition before treating the rents as achievable.`:'');
    const saleStats=stats(sales),median=saleStats['Median Sale Price']?.n,count=saleStats['Selected Comparables']?.n;
    paragraph(sales,'sales',price>0&&median>0?`The subject's ${money(price)} acquisition price is ${money(Math.abs(price-median))} ${price>=median?'above':'below'} the ${money(median)} median of ${count||'the selected'} comparable sale${count===1?'':'s'}. These sale prices are unadjusted for property differences; the comparison alone does not establish fair value.`:'');
    return true;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{observer?.disconnect();try{apply();}finally{observe();}},40);}
  function observe(){const host=document.getElementById('clientReport');if(host)observer?.observe(host,{childList:true,subtree:true,characterData:true});}
  function start(){if(!document.getElementById('ptReaderStyles')){const s=document.createElement('style');s.id='ptReaderStyles';s.textContent='#clientReport .pt-unit-rents{margin:12px 0;padding:10px;background:#eef6f5;border-radius:6px}#clientReport .pt-unit-rents h4{margin:0 0 8px;color:#126a60}#clientReport [hidden]{display:none!important}#clientReport .pt-reader-copy{font-size:13px!important;line-height:1.65!important;color:#354a5d!important;margin:10px 0 14px!important}#clientReport .pt-reader-summary{background:#eff7f6!important;border:0!important;border-radius:10px;margin:20px 30px;padding:20px!important}#clientReport .rb-conclusion{border-left-color:#148478!important}';document.head.appendChild(s);}observer=new MutationObserver(schedule);observe();schedule();}
  window.PropertyThesisReportReader={apply,stats,number};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

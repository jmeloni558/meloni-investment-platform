'use strict';
// Independent subject-owned draft: never writes the open subject's state or forms.
(()=>{
 const M=window.PropertyThesisIncomeCompsModel;
 const percent=new Set(['vacancy','rentGrowth','opEx','mortRate','appreciation','sellCost','ordinaryTax','depTax','capGainsTax','requiredReturn','desiredCap']);
 const steps=['Property & sale','Income','Operating expenses','Financing','Investment assumptions','Review & save'];
 const fields=[
  [['address','Comparable property address','text'],['price','Closed sale price ($)'],['land','Land value ($)'],['units','Number of units'],['hold','Holding period (years)'],['initialRepairs','Initial repairs ($)']],
  [['rent','Monthly rent per unit ($)'],['vacancy','Vacancy and credit loss (%)'],['rentGrowth','Annual rent growth (%)']],
  [['opEx','Operating expenses (% of effective gross income)']],
  [['mortgage','Mortgage amount ($)'],['mortRate','Mortgage rate (%)'],['loanYears','Loan term (years)'],['interestOnly','Loan structure','loan'],['points','Mortgage points (%)'],['origFee','Origination fee ($)']],
  [['appreciation','Annual appreciation (%)'],['sellCost','Selling expenses (%)'],['depLife','Depreciable life (years)'],['requiredReturn','Required return (%)'],['desiredCap','Valuation target cap rate (%)'],['desiredGrm','Target GRM'],['ordinaryTax','Ordinary income tax (%)'],['depTax','Depreciation tax (%)'],['capGainsTax','Capital gains tax (%)']]
 ];
 const financingLabels={cash:'Cash',mortgage:'Conventional mortgage',private:'Private financing'};
 const displayValue=(key,value)=>value===undefined?'':key==='ordinaryTax'?Math.round(value*100):percent.has(key)?Number((value*100).toFixed(6)):value;
 const details=['taxes','insurance','management','repairs','utilities','hoa','other'];
 function mount(host,{subjectId,subjectName,comp,onSave,onCancel,getUser}){
  const user=getUser(),a=comp?structuredClone(comp.assumptions):{...(typeof defaults==='object'?defaults:{rentGrowth:.02,vacancy:.05,opEx:.4,depLife:27.5,appreciation:.03,hold:7,sellCost:.05,mortgage:0,interestOnly:false,mortRate:0,loanYears:30,points:0,origFee:0,ordinaryTax:.28,depTax:.25,capGainsTax:.15,requiredReturn:.1,desiredCap:.065,desiredGrm:8.35}),address:'',name:'Income comp',price:'',land:0,units:1,rent:'',initialRepairs:0};
  a.ordinaryTax=Math.round(Number(a.ordinaryTax)*100)/100;
  let financingType=comp?(a.incomeCompFinancingType||(a.mortgage>0?'mortgage':'cash')):'cash',loanDraft=null;
  if(!financingLabels[financingType])financingType=a.mortgage>0?'mortgage':'cash';
  if(financingType==='cash')Object.assign(a,{mortgage:0,mortRate:0,points:0,origFee:0,interestOnly:false,loanYears:30});
  a.incomeCompFinancingType=financingType;
  const evidence=comp?{saleDate:comp.saleDate,incomeBasis:comp.incomeBasis,period:comp.period,source:comp.source,notes:comp.notes}:{saleDate:'',incomeBasis:'mls',period:M.defaultPeriod,source:'',notes:''};
  const id=comp?.id||crypto.randomUUID();let step=0,working=false,dirty=false,calculated=null,addressControl=null;
  let expenseMode=a.incomeCompExpenseBudget?'detailed':'quick',budget={...(a.incomeCompExpenseBudget||{})};
  const assertUser=()=>{if(!user||getUser()!==user)throw Error('Your sign-in changed. Close this form and sign in again.');};
  const input=([key,label,type='number'])=>`<label>${M.esc(label)}${type==='loan'?`<select name="${key}" data-comp-field><option value="false" ${!a[key]?'selected':''}>Amortizing</option><option value="true" ${a[key]?'selected':''}>Interest only</option></select>`:`<input name="${key}" data-comp-field type="${type}" ${type==='number'?(key==='ordinaryTax'?'step="1" min="0" max="100"':'step="any"'):''} value="${M.esc(displayValue(key,a[key]))}">`}</label>`;
  function sync(){
   for(const el of host.querySelectorAll('[data-comp-field]')){a[el.name]=el.name==='address'?el.value.trim():el.name==='interestOnly'?el.value==='true':el.value===''?'':Number(el.value)/(percent.has(el.name)?100:1);}
   for(const el of host.querySelectorAll('[data-comp-evidence]'))evidence[el.name]=el.value;
   for(const el of host.querySelectorAll('[data-comp-expense]'))budget[el.name]=Number(el.value)||0;
   if(expenseMode==='detailed'){
    const egi=Number(a.rent)*Number(a.units)*12*(1-Number(a.vacancy));
    a.opEx=egi>0?details.reduce((s,k)=>s+(Number(budget[k])||0),0)/egi:0;a.incomeCompExpenseBudget={...budget};
   }else delete a.incomeCompExpenseBudget;
  }
  function validate(i){
   if(i===0){if(!a.address||!(a.price>0)||!Number.isInteger(a.units)||a.units<1)throw Error('Enter an address, positive closed sale price and whole number of units.');
    if(!Number.isInteger(a.hold)||a.hold<1||a.hold>40)throw Error('Holding period must be a whole number from 1 to 40.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(evidence.saleDate)||!Number.isFinite(Date.parse(evidence.saleDate))||new Date(evidence.saleDate).toISOString().slice(0,10)!==evidence.saleDate||evidence.saleDate>new Date().toISOString().slice(0,10))throw Error('Enter a valid closed sale date, not in the future.');
    if(a.land<0||a.land>a.price||a.initialRepairs<0)throw Error('Land value must be between zero and sale price; repairs cannot be negative.');
   }
   if(i===1&&!evidence.source.trim()){const el=host.querySelector('[name=source]');el?.setAttribute('aria-invalid','true');el?.focus();throw Error('Enter a source for this comp before continuing, for example Stellar MLS listing #123456.');}
   if(i===1&&(!(a.rent>0)||a.vacancy<0||a.vacancy>=1||!evidence.period.trim()||!evidence.source.trim()))throw Error('Enter positive rent, vacancy below 100%, the income period and evidence source.');
   if(i===2&&(!(a.opEx>=0)||!Number.isFinite(a.opEx)))throw Error('Enter valid operating expenses.');
   if(i===2&&expenseMode==='detailed'&&details.some(k=>budget[k]<0))throw Error('Expense amounts cannot be negative.');
   if(i===3&&(a.mortgage<0||a.mortRate<0||(a.mortgage>0&&(!Number.isInteger(a.loanYears)||a.loanYears<1||a.loanYears>40))))throw Error('Review the mortgage amount, rate and loan term.');
   if(i===4&&(!Number.isInteger(Number((a.ordinaryTax*100).toFixed(8)))||a.ordinaryTax<0||a.ordinaryTax>1))throw Error('Ordinary income tax must be a whole percentage from 0 to 100.');
   if(i===3&&financingType!=='cash'&&(!(a.mortgage>0)||a.mortgage>a.price))throw Error('Enter a mortgage greater than zero and no more than the sale price.');
   if(i===4&&(!(a.depLife>0)||!(a.requiredReturn>=0)||!(a.desiredCap>0)||!(a.desiredGrm>0)))throw Error('Review depreciation, required return and valuation targets.');
   for(const [k,,t] of fields[i]||[])if(!t&&(!Number.isFinite(Number(a[k]))||a[k]===''))throw Error('Complete all numeric fields, using zero where appropriate.');
  }
  function status(text){host.querySelector('[data-comp-status]').textContent=text;}
  function paint(){
   addressControl?.close?.();addressControl=null;
   const metrics=calculated?`<div class="ic-cap-result"><span>Calculated cap rate</span><strong>${M.pct(calculated.operating.noi/calculated.salePrice)}</strong><p>Annual NOI ÷ closed sale price. This is not the valuation target rate.</p></div><div class="ic-fields"><p>Annual NOI <b>${M.money(calculated.operating.noi)}</b></p><p>Closed sale price <b>${M.money(calculated.salePrice)}</b></p><p>Effective gross income <b>${M.money(calculated.operating.egi)}</b></p><p>Operating expenses <b>${M.money(calculated.operating.opex)}</b></p><p>Gross scheduled income <b>${M.money(calculated.operating.pgi)}</b></p><p>Annual after-tax cash flow <b>${M.money(calculated.metrics.annualCashFlow)}</b></p><p>DSCR <b>${calculated.metrics.dscr===null?'—':calculated.metrics.dscr.toFixed(2)+'x'}</b></p><p>IRR <b>${M.pct(calculated.metrics.irr)}</b></p></div>`:'';
   host.innerHTML=`<section class="ic-analysis"><p>Income comp for <b>${M.esc(subjectName)}</b></p><h3>${comp?'Edit':'Analyze a new'} income comparable</h3><p>Step ${step+1} of 6 · ${steps[step]}</p><form data-comp-form>${step===3?`<label>Purchase financing<select data-comp-financing>${Object.entries(financingLabels).map(([v,l])=>`<option value="${v}" ${v===financingType?'selected':''}>${l}</option>`).join('')}</select><small>Select how the comp was purchased, when known. Mortgage defaults are modeling assumptions, not verified loan terms. Change them if the actual terms are available.</small></label>${financingType!=='cash'?`<label>Down payment (%)<input data-comp-down type="number" min="0" max="100" step="any" value="${Number(((1-a.mortgage/a.price)*100).toFixed(4))}"></label>`:''}`:''}<div class="ic-fields">${step<5&&!(step===3&&financingType==='cash')?fields[step].map(input).join(''):''}</div>${step===0?`<label>Closed sale date<input data-comp-evidence name="saleDate" type="date" max="${new Date().toISOString().slice(0,10)}" value="${M.esc(evidence.saleDate)}"></label>`:''}${step===1?`<label>Income Source<select name="incomeBasis" data-comp-evidence>${Object.entries(M.bases).map(([v,l])=>`<option value="${v}" ${v===evidence.incomeBasis?'selected':''}>${l}</option>`).join('')}</select><small>Choose where the income figures came from. MLS data is a quick starting point; check whether the listing uses actual or estimated rents and explain any adjustments in your notes.</small></label><label>Income period<select name="period" data-comp-evidence>${M.periodOptions(evidence.period)}</select><small>Defaults to the past 12 months. Choose the period the source actually covers, or select “Period not specified by source.” This label does not convert amounts: enter monthly rent and annual expenses.</small></label><label>Source details (required)<input name="source" data-comp-evidence aria-required="true" aria-describedby="ic-source-help" maxlength="1000" placeholder="e.g. Stellar MLS listing #123456" value="${M.esc(evidence.source)}"><small id="ic-source-help">Enter where you found the sale price, rents and expenses. For MLS data, enter the MLS name and listing number if available. Note any estimates. This source is saved with the comp and included in the report.</small></label>`:''}${step===2?`<label>Expense method<select data-comp-method><option value="quick" ${expenseMode==='quick'?'selected':''}>Percentage of effective gross income</option><option value="detailed" ${expenseMode==='detailed'?'selected':''}>Detailed annual budget</option></select></label>${expenseMode==='detailed'?`<div class="ic-fields">${details.map(k=>`<label>Annual ${k} ($)<input data-comp-expense name="${k}" type="number" min="0" step="any" value="${M.esc(budget[k]||0)}"></label>`).join('')}</div>`:''}<p>NOI excludes financing, depreciation and income taxes.</p>`:''}${step===3?'<p>Cash has no debt service. Mortgage and private financing start at 20% down, 6.5% interest and a 30-year term, all editable. Financing does not change NOI or the calculated cap rate.</p>':''}${step===4?'<p>These assumptions support the other analysis metrics. The comp cap rate is calculated from NOI and its closed sale price.</p>':''}${step===5?`${metrics}<p><b>${M.esc(a.address)}</b> · ${M.money(a.price)} · ${M.esc(evidence.saleDate)}</p><p>${M.esc(M.bases[evidence.incomeBasis])} · ${M.esc(evidence.period)}</p><div class="ic-review">${fields.map((group,i)=>`<details><summary>${steps[i]}</summary>${i===3?`<p>Purchase financing: <b>${financingLabels[financingType]}</b></p>`:''}${group.map(([k,l])=>`<p>${M.esc(l)}: <b>${M.esc(displayValue(k,a[k]))}</b></p>`).join('')}</details>`).join('')}</div><label>Comparability / normalization notes<textarea name="notes" data-comp-evidence maxlength="2000">${M.esc(evidence.notes)}</textarea></label>`:''}<p role="status" aria-live="polite" data-comp-status></p><div class="ic-actions"><button type="button" class="btn ghost" data-comp-cancel>Cancel</button>${step>0?'<button type="button" class="btn secondary" data-comp-back>Back</button>':''}<button type="submit" class="btn primary">${step===5?(calculated?'Save income comp':'Calculate income comp'):'Continue'}</button></div></form></section>`;
   if(expenseMode==='detailed'&&step===2)host.querySelector('[name="opEx"]').readOnly=true;
   host.querySelector('form').onsubmit=async event=>{event.preventDefault();if(working)return;try{assertUser();sync();if(step<5){validate(step);step++;paint();return;}for(let i=0;i<5;i++)validate(i);working=true;host.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=true);
    if(!calculated){const result=await window.PropertyThesisIncomeEngineBridge.requestServer({...a},{refresh:false});assertUser();calculated=M.ownedSnapshot({subjectId,id,assumptions:a,evidence,result,revision:(comp?.revision||0)+1});working=false;paint();status('Review the calculated cap rate, then save it under the subject.');}
    else {calculated.notes=evidence.notes.trim();await onSave(calculated);dirty=false;}
   }catch(e){status(e.message);}finally{working=false;host.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=false);}};
   host.querySelector('[data-comp-back]')?.addEventListener('click',()=>{sync();step--;calculated=null;paint();});
   host.querySelector('[data-comp-cancel]').onclick=()=>{if(canClose())onCancel();};
   host.querySelector('[data-comp-method]')?.addEventListener('change',event=>{sync();expenseMode=event.target.value;calculated=null;dirty=true;paint();});
   host.querySelector('[data-comp-financing]')?.addEventListener('change',event=>{
    sync();if(financingType!=='cash')loanDraft=Object.fromEntries(fields[3].map(([k])=>[k,a[k]]));
    financingType=event.target.value;a.incomeCompFinancingType=financingType;
    if(financingType==='cash')Object.assign(a,{mortgage:0,mortRate:0,points:0,origFee:0,interestOnly:false,loanYears:30});
    else Object.assign(a,loanDraft||{mortgage:Math.round(a.price*.8*100)/100,mortRate:.065,loanYears:30,interestOnly:false,points:0,origFee:0});
    dirty=true;calculated=null;paint();
   });
   host.querySelector('[data-comp-down]')?.addEventListener('input',event=>{const down=Number(event.target.value);if(event.target.value!==''&&down>=0&&down<=100){a.mortgage=Math.round(a.price*(1-down/100)*100)/100;host.querySelector('[name="mortgage"]').value=a.mortgage;}});
   host.querySelector('[name="mortgage"]')?.addEventListener('input',event=>{host.querySelector('[data-comp-down]').value=Number(((1-Number(event.target.value)/a.price)*100).toFixed(4));});
   host.querySelector('form').addEventListener('input',event=>{dirty=true;if(event.target.name==='source')event.target.removeAttribute('aria-invalid');if(event.target.name!=='notes')calculated=null;});
   const addressInput=host.querySelector('[name="address"]'),cfg=window.PT_GOOGLE_SUGGESTIONS_REVIEW;
   if(addressInput&&cfg&&window.PTAddressAutocomplete&&window.PTWebsiteGoogleSuggestions){
    const suggest=window.PTWebsiteGoogleSuggestions.create({...cfg,getClient:()=>typeof cloudClient==='undefined'?null:cloudClient});
    addressControl=window.PTAddressAutocomplete.attach(addressInput,(_route,_method,body)=>suggest(body.input,addressInput),{onSelect:()=>{dirty=true;calculated=null;}});
   }
   host.querySelector('input,select,textarea')?.focus();
  }
  function canClose(){return !working&&(!dirty||window.confirm('Discard this unsaved income comp draft?'));}
  paint();return {canClose};
 }
 window.PropertyThesisIncomeCompAnalysis={mount};
})();


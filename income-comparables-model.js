(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PropertyThesisIncomeCompsModel=factory();
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>number(v)===null?'—':number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const pct=v=>number(v)===null?'—':(number(v)*100).toFixed(2)+'%';
  const bases={mls:'MLS data',actual:'Actual operating data',normalized:'Normalized operating data',projected:'Projected income'};
  const defaultPeriod='Past 12 months';
  function periodOptions(value=defaultPeriod){
    const options=[defaultPeriod,'Previous calendar year','Current calendar year to date','Projected next 12 months','Period not specified by source'];
    if(value&&!options.includes(value))options.push(value);
    return options.map(v=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(v)}</option>`).join('');
  }
  function sourceIsStale(comp,source){
    if(comp.origin==='subject-owned')return false;
    if(!source)return true;
    const current=number(source.revision),saved=number(comp.sourceRevision);
    // An older tab's source list is not evidence that a freshly saved snapshot is stale.
    if(current!==null&&saved!==null&&current!==saved)return current>saved;
    const currentTime=Date.parse(source.updated_at),savedTime=Date.parse(comp.sourceUpdatedAt);
    return Number.isFinite(currentTime)&&Number.isFinite(savedTime)&&currentTime>savedTime;
  }
  const sentence=value=>{const text=String(value??'').trim();return text?esc(text)+(/[.!?…]["'”’)]?$/.test(text)?'':'.'):'';};
  function snapshot({subjectId,analysis,property,evidence,result,now=new Date().toISOString()}){
    if(!analysis?.id||!property?.id||analysis.property_id!==property.id||property.id===subjectId)throw Error('Choose an analysis of a different saved property.');
    const price=number(evidence.salePrice),y=result?.years?.[0];
    if(!(price>0))throw Error('Enter a positive closed sale price.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(evidence.saleDate||'')||!Number.isFinite(Date.parse(evidence.saleDate))||new Date(evidence.saleDate).toISOString().slice(0,10)!==evidence.saleDate||evidence.saleDate>now.slice(0,10))throw Error('Enter a valid sale date that is not in the future.');
    if(!bases[evidence.incomeBasis])throw Error('Choose the income source.');
    if(!String(evidence.source||'').trim()||!String(evidence.period||'').trim())throw Error('Record the income period and evidence source.');
    if(!y||['pgi','vac','egi','opex','noi'].some(k=>number(y[k])===null)||!result.engineVersion)throw Error('A complete protected income calculation is required.');
    if(Math.abs(y.egi-y.opex-y.noi)>.02||Math.abs(y.pgi-y.vac-y.egi)>.02)throw Error('The income calculation does not reconcile.');
    return {id:property.id,sourceAnalysisId:analysis.id,sourceRevision:analysis.revision,sourceUpdatedAt:analysis.updated_at,
      address:property.address||analysis.assumptions?.address||property.name,analysisName:analysis.name,
      salePrice:price,saleDate:evidence.saleDate,incomeBasis:evidence.incomeBasis,period:String(evidence.period).trim().slice(0,200),
      source:String(evidence.source).trim().slice(0,1000),notes:String(evidence.notes||'').trim().slice(0,2000),included:true,
      assumptions:clone(analysis.assumptions),operating:clone(y),capRate:y.noi/price,engineVersion:result.engineVersion,capturedAt:now};
  }
  function summarize(items){
    const rows=items.filter(c=>c.included&&number(c.operating?.noi)>0&&number(c.salePrice)>0);
    const rates=rows.map(c=>c.operating.noi/c.salePrice).sort((a,b)=>a-b),n=rates.length;
    return {count:n,min:n?rates[0]:null,max:n?rates[n-1]:null,mean:n?rates.reduce((a,b)=>a+b,0)/n:null,
      median:n?(rates[Math.floor((n-1)/2)]+rates[Math.floor(n/2)])/2:null};
  }
  function ownedSnapshot({subjectId,id,assumptions,evidence,result,revision=1}){
    if(!subjectId||!id||id===subjectId)throw Error('A saved subject and distinct comp are required.');
    if(!String(assumptions.address||'').trim())throw Error('Enter the comparable address.');
    const c=snapshot({subjectId,analysis:{id,property_id:id,name:'Income comp analysis',revision,assumptions},property:{id,address:assumptions.address},evidence:{...evidence,salePrice:assumptions.price},result});
    return {...c,origin:'subject-owned',sourceAnalysisId:null,sourceRevision:null,sourceUpdatedAt:null,revision,
      metrics:{irr:number(result.IRR),npv:number(result.NPV),monthlyPayment:number(result.monthlyPayment),dscr:number(result.years[0].dcr),annualCashFlow:number(result.years[0].atcf)}};
  }
  function reconciliation(cap,notes,items){
    const rate=number(cap);
    if(!(rate>0&&rate<=1))throw Error('Enter a market cap rate greater than 0% and no more than 100%.');
    if(!summarize(items).count)throw Error('Include at least one comp with positive NOI.');
    if(!String(notes||'').trim())throw Error('Explain your selected market cap rate.');
    return {rate,notes:String(notes).trim().slice(0,3000)};
  }
  function comparisonSummary(items,subjectNoi,currentCap,subjectPrice){
    const s=summarize(items),noi=number(subjectNoi),cap=number(currentCap),price=number(subjectPrice),parts=[];
    if(!s.count)return 'No included income comparable has a positive NOI and valid sale price. These records do not establish a cap-rate benchmark.';
    parts.push(s.count===1?`The included income comparable has a calculated cap rate of ${pct(s.median)}.`:`The ${s.count} included income comparables have calculated cap rates from ${pct(s.min)} to ${pct(s.max)}, with a median of ${pct(s.median)}.`);
    if(noi!==null&&price>0){const subjectRate=noi/price,gap=(subjectRate-s.median)*100;parts.push(`At the subject's ${money(price)} acquisition price, its ${money(noi)} annual NOI produces a ${pct(subjectRate)} cap rate${Math.abs(gap)<.005?', approximately equal to the comparable benchmark':`, ${Math.abs(gap).toFixed(2)} percentage points ${gap>0?'above':'below'} that benchmark`}.`);}
    if(cap>0){parts.push(`The subject's Desired Cap Rate is ${pct(cap)}${noi>0?`, implying an income-based value of ${money(noi/cap)}`:''}. ${cap>s.max?'This target is above the comparable evidence; a higher target rate supports a lower price for the same income.':cap<s.min?'This target is below the comparable evidence; a lower target rate supports a higher price for the same income.':'This target falls within the comparable evidence.'}`);}
    if(!(noi>0))parts.push('Income-based value: Not indicated with nonpositive or unavailable subject NOI.');
    parts.push(s.count===1?'One sale is limited evidence; differences in location, condition, leases and sale timing still need review.':'These are unadjusted comparisons; differences in location, condition, leases and sale timing still need review.');
    return parts.join(' ');
  }
  function reportHtml(evidence,subjectNoi,currentCap,subjectPrice){
    const items=evidence?.items||[];if(!items.length)return '';
    const s=summarize(items),rec=evidence.reconciliation,rate=number(rec?.rate),noi=number(subjectNoi);
    const valid=rate>0&&s.count>0,changed=valid&&Math.abs((number(currentCap)||0)-rate)>1e-8;
    const rows=items.map(c=>`<tr><td>${esc(c.address)}<br>${esc(c.analysisName)}<br>${c.included?'Included':'Excluded'}</td><td>${esc(c.saleDate)}<br>${money(c.salePrice)}</td><td>${esc(bases[c.incomeBasis]||'Unspecified')}<br>${esc(c.period)}</td><td>${money(c.operating?.pgi)}<br>Less vacancy: ${money(c.operating?.vac)}</td><td>${money(c.operating?.opex)}</td><td>${money(c.operating?.noi)}</td><td>${pct(number(c.salePrice)>0?number(c.operating?.noi)/c.salePrice:null)}</td></tr>`).join('');
    return `<section class="rb-section" data-rb-section="incomeComparables"><div class="rb-section-head"><h2>Income Comparable Sales</h2><p>Saved operating analyses of comparable sold properties.</p></div><p>Cap rate = annual net operating income divided by closed sale price. NOI excludes financing, depreciation and income taxes. Projected or normalized figures are analyst assumptions, not independently verified transaction cap rates.</p><p class="pt-income-comparison">${esc(comparisonSummary(items,subjectNoi,currentCap,subjectPrice))}</p><div class="rb-tablewrap"><table><thead><tr><th>Comparable</th><th>Sale</th><th>Income source / period</th><th>Gross income / vacancy</th><th>Operating expenses</th><th>NOI</th><th>Cap rate</th></tr></thead><tbody>${rows}</tbody></table></div>${rec?.notes?`<p><b>Analyst explanation${changed?' (saved with an earlier cap-rate target)':''}:</b> ${esc(rec.notes)}</p>`:''}${items.map(c=>`<p><b>${esc(c.address)}</b> — Source: ${sentence(c.source)} ${sentence(c.notes)}${Array.isArray(c.assumptions?.unitRents)?' Monthly unit rents: '+c.assumptions.unitRents.map((v,i)=>'Unit '+(i+1)+': '+money(v)).join('; ')+'.':''}</p>`).join('')}</section>`;
  }
  return {comparisonSummary,snapshot,ownedSnapshot,summarize,reconciliation,reportHtml,sourceIsStale,number,esc,money,pct,bases,defaultPeriod,periodOptions};
});

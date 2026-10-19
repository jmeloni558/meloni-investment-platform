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
  const bases={actual:'Actual operating data',normalized:'Normalized operating data',projected:'Projected income'};
  function snapshot({subjectId,analysis,property,evidence,result,now=new Date().toISOString()}){
    if(!analysis?.id||!property?.id||analysis.property_id!==property.id||property.id===subjectId)throw Error('Choose an analysis of a different saved property.');
    const price=number(evidence.salePrice),y=result?.years?.[0];
    if(!(price>0))throw Error('Enter a positive closed sale price.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(evidence.saleDate||'')||!Number.isFinite(Date.parse(evidence.saleDate))||new Date(evidence.saleDate).toISOString().slice(0,10)!==evidence.saleDate||evidence.saleDate>now.slice(0,10))throw Error('Enter a valid sale date that is not in the future.');
    if(!bases[evidence.incomeBasis])throw Error('Choose the income basis.');
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
  function reconciliation(cap,notes,items){
    const rate=number(cap);
    if(!(rate>0&&rate<=1))throw Error('Enter a market cap rate greater than 0% and no more than 100%.');
    if(!summarize(items).count)throw Error('Include at least one comp with positive NOI.');
    if(!String(notes||'').trim())throw Error('Explain your selected market cap rate.');
    return {rate,notes:String(notes).trim().slice(0,3000)};
  }
  function reportHtml(evidence,subjectNoi,currentCap){
    const items=evidence?.items||[];if(!items.length)return '';
    const s=summarize(items),rec=evidence.reconciliation,rate=number(rec?.rate),noi=number(subjectNoi);
    const valid=rate>0&&s.count>0,changed=valid&&Math.abs((number(currentCap)||0)-rate)>1e-8;
    const rows=items.map(c=>`<tr><td>${esc(c.address)}<br>${esc(c.analysisName)}<br>${c.included?'Included':'Excluded'}</td><td>${esc(c.saleDate)}<br>${money(c.salePrice)}</td><td>${esc(bases[c.incomeBasis]||'Unspecified')}<br>${esc(c.period)}</td><td>${money(c.operating?.pgi)}<br>− ${money(c.operating?.vac)}</td><td>${money(c.operating?.opex)}</td><td>${money(c.operating?.noi)}</td><td>${pct(number(c.salePrice)>0?number(c.operating?.noi)/c.salePrice:null)}</td></tr>`).join('');
    return `<section class="rb-section" data-rb-section="incomeComparables"><div class="rb-section-head"><h2>Income Comparables / Market Cap Rate Support</h2><p>Saved operating analyses of comparable sold properties.</p></div><p>Cap rate = annual net operating income ÷ closed sale price. NOI excludes financing, depreciation and income taxes. Projected or normalized figures are analyst assumptions, not independently verified transaction cap rates.</p><div class="rb-tablewrap"><table><thead><tr><th>Comparable</th><th>Sale</th><th>Income basis / period</th><th>Gross income / vacancy</th><th>Operating expenses</th><th>NOI</th><th>Cap rate</th></tr></thead><tbody>${rows}</tbody></table></div><p>${s.count} positive-NOI comps included. Range: ${pct(s.min)}–${pct(s.max)}. Median: ${pct(s.median)}. Equal-weight mean: ${pct(s.mean)}. Nonpositive NOI is shown but excluded from this range.</p>${valid?`<h3>Market cap rate reconciliation</h3><p>Selected market cap rate: <b>${pct(rate)}</b>. Subject annual NOI: ${money(noi)}. Indicated income value: <b>${noi>0?money(noi/rate):'Not indicated with nonpositive or unavailable NOI'}</b>.</p><p>${esc(rec.notes)}</p>${changed?'<p><b>The subject analysis currently uses a different cap rate. This evidence rate has not been applied to its valuation.</b></p>':''}`:'<p>No current market cap rate reconciliation has been adopted.</p>'}${items.map(c=>`<p><b>${esc(c.address)}</b> — Source: ${esc(c.source)}. ${esc(c.notes)} Snapshot: ${esc(c.capturedAt)}; engine ${esc(c.engineVersion)}; source analysis revision ${esc(c.sourceRevision??'unknown')}.</p>`).join('')}<p>Saved snapshots do not change when a source analysis is edited. Refresh a comp to adopt revised assumptions, then reconcile again. Differences in location, condition, tenancy, income period and sale timing require analyst judgment.</p></section>`;
  }
  return {snapshot,summarize,reconciliation,reportHtml,number,esc,money,pct,bases};
});

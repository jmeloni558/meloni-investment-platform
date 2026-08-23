'use strict';
(()=>{
  const VERSION=2;
  if((window.__secondaryServerUiOverrideVersion||0)>=VERSION)return;
  window.__secondaryServerUiOverrideVersion=VERSION;
  const finite=v=>Number.isFinite(Number(v));
  const money=v=>finite(v)?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const pct=(v,d=2)=>finite(v)?(Number(v)*100).toFixed(d)+'%':'—';

  function badge(){
    let b=document.getElementById('ptSecondaryEngineStatus');if(b)return b;
    const host=document.querySelector('.topactions');if(!host)return null;
    b=document.createElement('span');b.id='ptSecondaryEngineStatus';b.className='pill';b.style.fontSize='10px';b.style.fontWeight='800';b.style.letterSpacing='.01em';b.textContent='Secondary Engine…';b.style.background='#eff8ff';b.style.borderColor='#b2ddff';b.style.color='#175cd3';
    const primary=document.getElementById('ptEngineSourceStatus');if(primary?.nextSibling)host.insertBefore(b,primary.nextSibling);else host.appendChild(b);return b;
  }
  function paint(ok,msg=''){
    const b=badge();if(!b)return;
    if(ok){b.textContent='Secondary Protected';b.title='Scenarios, sensitivity analysis and offer solving are supplied by the authenticated PropertyThesis server engine.';b.style.background='#ecfdf3';b.style.borderColor='#a6f4c5';b.style.color='#067647';}
    else{b.textContent='Secondary Fallback';b.title=msg||'Secondary calculations are temporarily using the local fallback.';b.style.background='#fffaeb';b.style.borderColor='#fedf89';b.style.color='#b54708';}
  }
  function recommendation(d){
    if(!d||!finite(d.maxSupported))return 'A supported offer recommendation could not be calculated from the current assumptions.';
    const currentMeets=Number(d.price)<=Number(d.maxSupported)+1,gap=Number(d.gap)||0;
    const gapText=Math.abs(gap)<1?'approximately equal to':`${money(Math.abs(gap))} ${gap>0?'above':'below'}`;
    if(currentMeets)return `The current acquisition price of ${money(d.price)} is ${gapText} the maximum price that satisfies both the selected ${pct(d.desiredCap)} capitalization-rate target and ${pct(d.requiredReturn)} required IRR. Using a ${pct(d.openingDiscount,0)} negotiation discount, a suggested opening offer is approximately ${money(d.opening)} with a maximum supported price of ${money(d.maxSupported)}.`;
    return `The current acquisition price of ${money(d.price)} is ${gapText} the maximum price that satisfies both the selected ${pct(d.desiredCap)} capitalization-rate target and ${pct(d.requiredReturn)} required IRR. A suggested opening offer is approximately ${money(d.opening)}, while ${money(d.maxSupported)} represents the maximum modeled price that meets both benchmarks under the current assumptions.`;
  }
  function patchOffer(){
    const d=window.PropertyThesisSecondaryEngine?.getOffer?.(),card=document.getElementById('investmentOfferAnalysis');
    if(!d||!card)return false;
    const vals={
      'Current Acquisition Price':money(d.price),'Price Supported by Target Cap':money(d.capPrice),'Price Supported by Required IRR':money(d.irrPrice),'Maximum Price Meeting Both':money(d.maxSupported),'Suggested Opening Offer':money(d.opening),'Price Gap to Maximum Support':finite(d.gap)?money(Math.abs(Number(d.gap))):'—','Rent Needed for Target Cap':money(d.capRent),'Rent Needed for Required IRR':money(d.irrRent)
    };
    card.querySelectorAll('.ioa-box').forEach(box=>{const l=box.querySelector('.ioa-label')?.textContent?.trim();if(l&&Object.prototype.hasOwnProperty.call(vals,l)){const v=box.querySelector('.ioa-value');if(v)v.textContent=vals[l];if(l==='Price Gap to Maximum Support'){const s=box.querySelector('.ioa-sub');if(s&&finite(d.gapPct))s.textContent=`${Math.abs(Number(d.gapPct)*100).toFixed(1)}% ${Number(d.gap)>0?'above':'below'} maximum supported price`;}}});
    const ladder=card.querySelectorAll('.ioa-ladder div');(d.ladder||[]).forEach((x,i)=>{const el=ladder[i]?.querySelector('b');if(el)el.textContent=money(x.price);});
    const rows=card.querySelectorAll('.ioa-panel .ioa-row');const rowMap={'Current monthly rent':money(d.rent),'Current Year 1 NOI':money(d.y1?.noi),'Current cap rate':pct(d.cap),'Current modeled IRR':pct(d.IRR),'Required return':pct(d.requiredReturn)};
    rows.forEach(r=>{const l=r.querySelector('span')?.textContent?.trim();if(l&&rowMap[l]){const b=r.querySelector('b');if(b)b.textContent=rowMap[l];}});
    const rec=card.querySelector('.ioa-recommendation');if(rec)rec.innerHTML='<b>PropertyThesis Recommendation:</b> '+recommendation(d);
    card.dataset.engineSource='protected-server';return true;
  }
  function patchSensitivity(){
    const data=window.PropertyThesisSecondaryEngine?.getSensitivity?.(),section=document.querySelector('#clientReport [data-rb-section="sensitivity"]');
    if(!data||!section)return false;
    const blocks=section.querySelectorAll('.rb-sens-block');if(blocks.length<2)return false;
    const cells=data.cells||[];
    const patch=(block,key,formatter)=>{const rows=block.querySelectorAll('tbody tr');rows.forEach((tr,ri)=>{const tds=tr.querySelectorAll('td');for(let ci=1;ci<tds.length;ci++){const pf=data.priceFactors?.[ri],rf=data.rentFactors?.[ci-1],x=cells.find(v=>Number(v.priceFactor)===Number(pf)&&Number(v.rentFactor)===Number(rf));if(x)tds[ci].textContent=formatter(x[key]);}});};
    patch(blocks[0],'irr',v=>typeof fmtP==='function'?fmtP(Number(v)):pct(v));
    patch(blocks[1],'npv',v=>typeof fmtC==='function'?fmtC(Number(v)):money(v));
    section.dataset.engineSource='protected-server';return true;
  }
  function installOfferOverride(){
    const api=window.InvestmentOfferAnalysis;if(!api||api.__serverOverride)return false;
    const oldCalc=api.calculate,oldApply=api.apply;
    api.calculate=function(){return window.PropertyThesisSecondaryEngine?.getOffer?.()||oldCalc?.();};
    api.apply=function(){const out=oldApply?.();setTimeout(patchOffer,0);window.PropertyThesisSecondaryEngine?.request?.().then(()=>setTimeout(apply,0));return out;};
    api.__serverOverride=true;return true;
  }
  function installSensitivityOverride(){
    const api=window.ReportSensitivityAnalysis;if(!api||api.__serverOverride)return false;
    const oldApply=api.apply;
    api.apply=function(){const out=oldApply?.();setTimeout(patchSensitivity,0);window.PropertyThesisSecondaryEngine?.request?.().then(()=>setTimeout(apply,0));return out;};
    api.__serverOverride=true;return true;
  }
  function apply(){
    badge();installOfferOverride();installSensitivityOverride();
    const engine=window.PropertyThesisSecondaryEngine,current=engine?.current?.();
    if(current){paint(true);patchOffer();patchSensitivity();return true;}
    const st=engine?.status?.();if(st?.lastError)paint(false,st.lastError);
    return false;
  }
  function requestAndApply(){
    const p=window.PropertyThesisSecondaryEngine?.request?.();
    if(p&&typeof p.then==='function')p.then(r=>{if(r)paint(true);setTimeout(apply,0);});
    return p;
  }
  function start(){
    badge();let tries=0;
    const t=setInterval(()=>{installOfferOverride();installSensitivityOverride();apply();requestAndApply();if(window.PropertyThesisSecondaryEngine?.current?.()||++tries>40)clearInterval(t)},250);
    document.addEventListener('click',()=>setTimeout(()=>{apply();requestAndApply();},80),true);
  }
  window.PropertyThesisSecondaryServerUI={apply,patchOffer,patchSensitivity};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

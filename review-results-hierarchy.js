'use strict';
(()=>{
  const VERSION=1;
  if((window.__ptReviewResultsHierarchyV||0)>=VERSION)return;
  window.__ptReviewResultsHierarchyV=VERSION;

  function styles(){
    let st=document.getElementById('ptReviewResultsHierarchyStyles');
    if(!st){st=document.createElement('style');st.id='ptReviewResultsHierarchyStyles';document.head.appendChild(st);}
    st.textContent=`
      #dashboard .grid>#ptDecisionCenter{order:-100!important}
      #dashboard .grid>#ptInvestmentThesis{order:-99!important}
      #dashboard .grid>#ptMarketRentDecision{order:-98!important}
      #dashboard .grid>#reviewAnalysisSetup{order:-97!important}

      #dashboard #reviewAnalysisSetup{
        background:#f8fafc!important;
        border:1px solid #dce5ee!important;
        box-shadow:none!important;
        margin-top:2px!important;
        margin-bottom:12px!important;
        padding:18px 20px!important;
      }
      #dashboard #reviewAnalysisSetup .sectionhead{
        padding-bottom:10px!important;
        margin-bottom:8px!important;
        border-bottom:1px solid #e3e9ef!important;
      }
      #dashboard #reviewAnalysisSetup .sectionhead h2{
        font-size:16px!important;
        color:#344054!important;
        margin-bottom:3px!important;
      }
      #dashboard #reviewAnalysisSetup .sectionhead p{
        color:#667085!important;
        font-size:10px!important;
        line-height:1.45!important;
        max-width:820px!important;
      }
      #dashboard #reviewAnalysisSetup .analysis-benchmark-grid{
        gap:9px!important;
        margin-top:9px!important;
      }
      #dashboard #reviewAnalysisSetup .address-setup-field{
        width:min(100%,680px)!important;
      }
      #dashboard #reviewAnalysisSetup .field label{
        color:#596579!important;
        font-size:9px!important;
      }
      #dashboard #reviewAnalysisSetup .valuation-field-note{
        font-size:8.5px!important;
        line-height:1.35!important;
        color:#7a8699!important;
        min-height:34px!important;
      }
      #dashboard #reviewAnalysisSetup input,
      #dashboard #reviewAnalysisSetup select{
        background:#fff!important;
        border-color:#d8e1ea!important;
        min-height:38px!important;
      }
      #dashboard #reviewSaveCloud{
        background:#fff!important;
        color:#175c92!important;
        border:1px solid #bcd1e2!important;
        box-shadow:none!important;
      }
      #dashboard #reviewSaveCloud:hover{
        background:#eef6fb!important;
        border-color:#8fb4d0!important;
      }
      #dashboard #ptDecisionCenter{margin-top:0!important}
      #dashboard #ptInvestmentThesis,#dashboard #ptMarketRentDecision{margin-top:0!important}

      @media(max-width:700px){
        #dashboard #reviewAnalysisSetup{padding:16px!important}
        #dashboard #reviewAnalysisSetup .valuation-field-note{min-height:0!important}
      }
    `;
  }

  function relabel(){
    const card=document.getElementById('reviewAnalysisSetup');
    if(!card)return false;
    card.classList.add('pt-benchmark-reference');
    const h=card.querySelector('.sectionhead h2');
    const p=card.querySelector('.sectionhead p');
    if(h)h.textContent='Benchmarks & Property Reference';
    if(p)p.textContent='Reference assumptions carried forward from Analysis Setup. Adjust these only when you want to test a different return, cap-rate, or GRM benchmark.';
    const save=document.getElementById('reviewSaveCloud');
    if(save)save.textContent='Save Analysis to Cloud';
    return true;
  }

  function apply(){styles();return relabel();}
  function schedule(){[0,60,160,320].forEach(ms=>setTimeout(apply,ms));}

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-s8-tab="dashboard"],[data-tab="dashboard"],#appNavReview,[data-app-review],[data-hub-open],[data-pt-open],#gwNext,#gwSave'))schedule();
  },true);
  window.addEventListener('pageshow',schedule);

  const h=window.PropertyThesisResultsHydration;
  if(h&&typeof h.hydrate==='function'&&!h.hydrate.__ptReviewHierarchyWrapped){
    const original=h.hydrate;
    const wrapped=async function(){const out=await original.apply(this,arguments);schedule();return out;};
    wrapped.__ptReviewHierarchyWrapped=true;
    wrapped.__original=original;
    h.hydrate=wrapped;
  }

  window.PropertyThesisReviewResultsHierarchy={version:VERSION,apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();

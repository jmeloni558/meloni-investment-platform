'use strict';
(()=>{
  const VERSION=1;
  if((window.__incomeStep2RentEmphasisVersion||0)>=VERSION)return;
  window.__incomeStep2RentEmphasisVersion=VERSION;

  function ensureStyles(){
    if(document.getElementById('ptIncomeStep2RentEmphasisStyles'))return;
    const s=document.createElement('style');
    s.id='ptIncomeStep2RentEmphasisStyles';
    s.textContent=`
      #guidedSetup .pt-rent-research-field{background:linear-gradient(145deg,#eef7ff,#f4fbff)!important;border:1px solid #b9d8ef!important;border-radius:10px!important;padding:11px!important;box-shadow:0 4px 12px rgba(23,79,131,.06)}
      #guidedSetup .pt-rent-research-field label{color:#174f83!important;font-weight:800!important}
      #guidedSetup .pt-rent-research-field .pt-rent-research-btn{background:#e7f4ff!important;border-color:#8fc1e3!important;color:#174f83!important;font-weight:800!important}
      #guidedSetup .pt-rent-research-field .pt-rent-research-btn:hover{background:#dcedfa!important}
    `;
    document.head.appendChild(s);
  }

  function apply(){
    ensureStyles();
    document.querySelectorAll('#guidedSetup [data-src="f_rent"]').forEach(input=>{
      const field=input.closest('.gw-field')||input.parentElement;
      if(!field)return;
      field.classList.add('pt-rent-research-field');
      field.querySelectorAll('.gw-expanded-guidance').forEach(x=>x.remove());
    });
    return true;
  }

  function schedule(){[0,80,180].forEach(ms=>setTimeout(apply,ms));}
  document.addEventListener('click',e=>{if(e.target?.closest?.('#guidedSetup,[data-s8-tab="assumptions"],#s10NewAnalysis,[data-ptr-open]'))schedule();},true);
  window.IncomeStep2RentEmphasis={apply,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();

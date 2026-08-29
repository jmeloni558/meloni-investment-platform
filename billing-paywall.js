'use strict';
(()=>{
  if((window.__propertyThesisBillingV||0)>=4)return;window.__propertyThesisBillingV=4;
  let bypass=false,busy=false,propertyId=null,pendingPlan='',planPromptOpened=false;
  const signedIn=()=>{try{return typeof cloudUser!=='undefined'&&!!cloudUser&&!!cloudClient}catch(_e){return false}};
  const status=t=>{const e=document.getElementById('ptBillingStatus');if(e)e.textContent=t||'';try{if(t&&typeof setStatus==='function')setStatus(t)}catch(_e){}};
  function banner(t){const e=document.createElement('div');e.className='pt-billing-banner';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),6500)}
  function modal(){let e=document.getElementById('ptBillingModal');if(e)return e;e=document.createElement('div');e.id='ptBillingModal';e.className='pt-billing-modal';e.hidden=true;e.innerHTML=`<div class="pt-billing-dialog" role="dialog" aria-modal="true"><div class="pt-billing-head"><div><h2>Unlock this property analysis</h2><p>Your first property is free. Choose a permanent unlock or a professional plan for additional properties.</p></div><button class="pt-billing-close" data-close>Close</button></div><div class="pt-billing-grid"><section class="pt-billing-option"><h3>Single Property</h3><div class="pt-billing-price">$15 once</div><p>Permanent access to this property, its revisions, PDF reports and Excel pro formas.</p><button data-plan="single">Unlock property</button></section><section class="pt-billing-option featured"><h3>Professional 50</h3><div class="pt-billing-price">$29/month</div><p>Up to 50 new properties during each billing month.</p><button data-plan="professional_50_monthly">Choose monthly</button><button data-plan="professional_50_yearly">Choose $290/year</button></section><section class="pt-billing-option"><h3>Unlimited</h3><div class="pt-billing-price">$59/month</div><p>Unlimited analyses for one professional under reasonable-use protections.</p><button data-plan="unlimited_monthly">Choose monthly</button><button data-plan="unlimited_yearly">Choose $590/year</button></section></div><div id="ptBillingStatus" class="pt-billing-status"></div></div>`;document.body.appendChild(e);e.onclick=x=>{if(x.target===e||x.target.closest?.('[data-close]'))e.hidden=true;const b=x.target.closest?.('[data-plan]');if(b)checkout(b.dataset.plan)};return e}
  function saveDraft(){try{const values={};document.querySelectorAll('input[id],select[id],textarea[id]').forEach(e=>values[e.id]=e.type==='checkbox'?e.checked:e.value);localStorage.setItem('ptBillingDraftV1',JSON.stringify({values,propertyId,createdAt:Date.now()}))}catch(_e){}}
  async function checkout(plan){if(busy)return;busy=true;status('Opening secure Stripe checkout…');saveDraft();localStorage.setItem('ptBillingResumeV1','1');try{const {data,error}=await cloudClient.functions.invoke('create-checkout',{body:{plan,propertyId}});if(error)throw error;if(!data?.url)throw new Error(data?.error||'Checkout could not be created.');try{window.UnsavedChangeProtection?.markClean?.()}catch(_e){}location.href=data.url}catch(e){localStorage.removeItem('ptBillingResumeV1');busy=false;status('Checkout could not open: '+String(e?.message||e))}}
  async function claim(){const {data,error}=await cloudClient.functions.invoke('billing-access',{body:{propertyId}});if(error)throw error;return data}
  async function ensureAccessForCurrent(){
    try{if(typeof readFields==='function')readFields()}catch(_e){}
    propertyId=await ensurePropertyForCurrent();
    if(!propertyId)throw new Error('The property could not be created.');
    try{selectedPropertyId=propertyId}catch(_e){}
    const access=await claim();
    return access;
  }
  async function requestedPlan(){
    const q=new URLSearchParams(location.search),requested=q.get('plan');
    try{localStorage.removeItem('ptPendingPlan')}catch(_e){}
    if(requested){
      pendingPlan=requested;
      q.delete('plan');
      const clean=q.toString();
      history.replaceState(null,'',location.pathname+(clean?'?'+clean:'')+location.hash);
    }
    const plan=pendingPlan;
    if(!plan)return;
    if(!signedIn()){
      if(planPromptOpened)return;
      planPromptOpened=true;
      setTimeout(()=>{try{window.PropertyThesisAuth?.open?.('signin','Sign in to continue to secure checkout.')}catch(_e){}},700);
      return;
    }
    pendingPlan='';planPromptOpened=false;
    if(plan==='single'){banner('Build or open the property you want to unlock, then calculate its results.');return}
    await checkout(plan);
  }
  function finalGuidedStep(){const active=Number(document.querySelector('#gwSteps .gw-step.active[data-step]')?.dataset.step);return window.GuidedAnalysisSetup?.getStep?.()===6||active===6}
  function calculation(b){return b&&(b.id==='calculateBtn'||b.id==='quickCalc'||((b.id==='gwNext'||b.id==='gwSave')&&(finalGuidedStep()||/calculat/i.test(b.textContent||''))))}
  async function guard(e){if(bypass||busy||!signedIn())return;const b=e.target?.closest?.('#gwNext,#gwSave,#calculateBtn,#quickCalc');if(!calculation(b))return;e.preventDefault();e.stopImmediatePropagation();busy=true;try{status('Checking property access…');const a=await ensureAccessForCurrent();if(a?.allowed){bypass=true;busy=false;b.click();setTimeout(()=>bypass=false,0);return}busy=false;modal().hidden=false;status('Choose how you would like to unlock this property.')}catch(err){busy=false;status('Unable to verify property access: '+String(err?.message||err))}}
  async function resumePaidAnalysis(){if(localStorage.getItem('ptBillingResumeV1')!=='1')return;const d=JSON.parse(localStorage.getItem('ptBillingDraftV1')||'null');if(!d?.propertyId)return;propertyId=d.propertyId;try{selectedPropertyId=d.propertyId}catch(_e){}for(let i=0;i<20;i++){try{if(signedIn()&&window.PropertyThesisGuidedSaveExistingWorkflow?.calculateSaveReview){const a=await claim();if(a?.allowed){window.GuidedAnalysisSetup?.go?.(6);await new Promise(r=>setTimeout(r,250));await window.PropertyThesisGuidedSaveExistingWorkflow.calculateSaveReview();localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');banner('Payment confirmed — your analysis is calculated, saved and ready to review.');return}}}catch(_e){}await new Promise(r=>setTimeout(r,500))}banner('Payment confirmed. Open this property and save the analysis to finish.')}
  function restore(){const q=new URLSearchParams(location.search);const resume=localStorage.getItem('ptBillingResumeV1')==='1';if(q.get('billing')==='success'){banner('Payment received. Restoring and saving your analysis…');history.replaceState({},'',location.pathname);setTimeout(resumePaidAnalysis,1200)}else if(q.get('billing')==='cancelled'){localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');banner('Checkout was cancelled. No charge was made.');history.replaceState({},'',location.pathname);return}if(!resume)return;try{const d=JSON.parse(localStorage.getItem('ptBillingDraftV1')||'null');if(!d?.createdAt||Date.now()-d.createdAt>86400000){localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');return}Object.entries(d.values||{}).forEach(([id,v])=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox')e.checked=!!v;else e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))});if(d.propertyId)try{selectedPropertyId=d.propertyId}catch(_e){}}catch(_e){}}
  function start(){try{localStorage.removeItem('ptPendingPlan')}catch(_e){}modal();window.addEventListener('click',guard,true);setTimeout(restore,900);setTimeout(requestedPlan,100);try{cloudClient?.auth?.onAuthStateChange?.((_e,s)=>{if(s?.user)setTimeout(requestedPlan,500)})}catch(_e){}}
  window.PropertyThesisBilling={checkout,claim,ensureAccessForCurrent};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

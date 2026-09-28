'use strict';
(()=>{
  if((window.__propertyThesisBillingV||0)>=13)return;window.__propertyThesisBillingV=13;
  let bypass=false,busy=false,propertyId=null,pendingPlan='',planPromptOpened=false;
  const development=()=>false;
  const shared=()=>!!window.PropertyThesisProtectedCloudSaveBridge?.isSharedSaving?.();
  let preparedRequest=null;
  async function prepareProperty(){
    if(!shared())return ensurePropertyForCurrent();
    if(selectedPropertyId)return selectedPropertyId;
    const uid=cloudUser.id,name=String(state.name||state.address||'').trim().slice(0,100),address=String(state.address||'').trim();
    if(!name||!address||address.length>500)throw Error('Enter a property address before opening checkout.');
    const fingerprint=JSON.stringify({uid,name,address});
    if(preparedRequest&&preparedRequest.uid!==uid)preparedRequest=null;
    if(preparedRequest&&preparedRequest.fingerprint!==fingerprint)throw Error('Retry the unconfirmed property preparation with the same address first.');
    preparedRequest??={uid,fingerprint,id:crypto.randomUUID()};
    const {data,error}=await cloudClient.rpc('website_prepare_checkout_property',{p_request_id:preparedRequest.id,p_name:name,p_address:address});
    if(cloudUser?.id!==uid)throw Error('Your account changed. Reopen the property.');
    if(error)throw error;if(typeof data!=='string'||!data)throw Error('Property preparation could not be confirmed. Retry before changing the address.');
    selectedPropertyId=data;preparedRequest=null;return data;
  }
  const developmentNotice=()=>status('Purchases are not enabled in development. Use your development plan or an already unlocked property.');
  const signedIn=()=>{try{return typeof cloudUser!=='undefined'&&!!cloudUser&&!!cloudClient}catch(_e){return false}};
  const status=t=>{const e=document.getElementById('ptBillingStatus');if(e)e.textContent=t||'';try{if(t&&typeof setStatus==='function')setStatus(t)}catch(_e){}};
  function banner(t){const e=document.createElement('div');e.className='pt-billing-banner';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),6500)}
  function modal(){let e=document.getElementById('ptBillingModal');if(e)return e;e=document.createElement('div');e.id='ptBillingModal';e.className='pt-billing-modal';e.hidden=true;e.innerHTML=`<div class="pt-billing-dialog" role="dialog" aria-modal="true"><div class="pt-billing-head"><div><h2>Unlock this property analysis</h2><p>Your first property is free. Choose a permanent unlock or a professional plan for additional properties.</p></div><button class="pt-billing-close" data-close>Close</button></div><div class="pt-billing-grid"><section class="pt-billing-option"><h3>Single Property</h3><div class="pt-billing-price">$15 once</div><p>Permanent access to this property, its revisions, PDF reports and Excel pro formas.</p><button data-plan="single">Unlock property</button></section><section class="pt-billing-option featured"><h3>Professional 50</h3><div class="pt-billing-price">$29/month</div><p>Up to 50 new properties during each billing month.</p><button data-plan="professional_50_monthly">Choose monthly</button><button data-plan="professional_50_yearly">Choose $290/year</button></section><section class="pt-billing-option"><h3>Unlimited</h3><div class="pt-billing-price">$59/month</div><p>Unlimited analyses for one professional under reasonable-use protections.</p><button data-plan="unlimited_monthly">Choose monthly</button><button data-plan="unlimited_yearly">Choose $590/year</button></section></div><div id="ptBillingStatus" class="pt-billing-status"></div></div>`;document.body.appendChild(e);e.onclick=x=>{if(x.target===e||x.target.closest?.('[data-close]'))e.hidden=true;const b=x.target.closest?.('[data-plan]');if(b)checkout(b.dataset.plan)};return e}
  function saveDraft(){try{const values={};document.querySelectorAll('input[id],select[id],textarea[id]').forEach(e=>values[e.id]=e.type==='checkbox'?e.checked:e.value);localStorage.setItem('ptBillingDraftV1',JSON.stringify({values,propertyId,createdAt:Date.now()}))}catch(_e){}}
  async function discardProvisionalProperty(id){
    if(development())return false;
    // Keep shared unpaid drafts: a delayed Checkout event may still reference them.
    if(shared())return false;
    if(!id||!signedIn())return true;
    const {error}=await cloudClient.from('properties').delete().eq('id',id).eq('user_id',cloudUser.id);
    if(error){console.warn('Provisional property cleanup failed',error);return false}
    try{if(selectedPropertyId===id)selectedPropertyId=null}catch(_e){}
    if(propertyId===id)propertyId=null;
    try{if(typeof refreshCloud==='function')await refreshCloud()}catch(_e){}
    return true;
  }
  async function ownerAccess(){const {data,error}=await cloudClient.rpc('get_account_access');if(error)throw error;return data?.owner===true;}
  async function openCheckout(body){
    const {data,error}=await cloudClient.functions.invoke('create-checkout',{body});
    if(error){
      // Supabase wraps non-2xx responses; retain the actionable billing message.
      let detail;try{detail=await error.context?.json?.()}catch(_e){}
      throw new Error(typeof detail?.error==='string'?detail.error:String(error.message||'Checkout could not be created.'));
    }
    if(!data?.url)throw new Error(data?.error||'Checkout could not be created.');
    return data.url;
  }
  function clearUpgrade(){for(const key of ['ptBillingUpgradeV1','ptBillingUpgradeOwnerV1','ptBillingConfirmationV1'])localStorage.removeItem(key)}
  let confirming=false;
  async function confirmUpgrade(){
    if(confirming||development())return;
    const plan=localStorage.getItem('ptBillingUpgradeV1'),uid=localStorage.getItem('ptBillingUpgradeOwnerV1');
    if(!plan||localStorage.getItem('ptBillingConfirmationV1')!=='1')return;
    const notice=t=>{status(t);banner(t)};
    if(!uid){notice('This checkout return could not be linked to an account. Open Pricing and Manage Subscription to check its status before purchasing again.');return;}
    if(!signedIn()||cloudUser.id!==uid){notice('Sign in with the account used for checkout, then refresh to check your subscription.');return;}
    confirming=true;
    notice('Checking your subscription. Access will be confirmed after payment processing finishes…');
    try{
      for(let i=0;i<20;i++){
        if(!signedIn()||cloudUser.id!==uid){notice('Your account changed. Sign in with the account used for checkout and refresh.');return;}
        try{
          const {data,error}=await cloudClient.from('billing_subscriptions')
            .select('plan,status,current_period_start,current_period_end').eq('user_id',uid)
            .maybeSingle().abortSignal(AbortSignal.timeout(3000));
          if(!signedIn()||cloudUser.id!==uid){notice('Your account changed. Sign in with the account used for checkout and refresh.');return;}
          // Another tab may have canceled or started a different checkout while this request was in flight.
          if(localStorage.getItem('ptBillingUpgradeV1')!==plan||localStorage.getItem('ptBillingUpgradeOwnerV1')!==uid||localStorage.getItem('ptBillingConfirmationV1')!=='1')return;
          const now=Date.now();
          if(!error&&data?.plan===plan&&['active','trialing'].includes(data.status)&&
            Date.parse(data.current_period_start)<=now&&Date.parse(data.current_period_end)>now){
            clearUpgrade();
            notice('Your professional plan is active. You can now analyze additional properties.');
            window.dispatchEvent(new CustomEvent('pt:billing-updated'));return;
          }
        }catch(_e){/* Keep checkout state so a temporary outage can be retried. */}
        if(i<19)await new Promise(r=>setTimeout(r,500));
      }
      notice('Your subscription is not confirmed yet. Refresh to check again. Please do not purchase again while confirmation is pending.');
    }finally{confirming=false;}
  }
  async function checkout(plan){
    if(development()){developmentNotice();return;}
    if(busy)return;busy=true;status('Opening secure Stripe checkout…');let createdForCheckout=false;
    try{
      if(await ownerAccess()){busy=false;modal().hidden=true;banner('Your owner account already has full access. No purchase is needed.');return;}
      if(plan==='single'&&!propertyId){
        try{if(typeof readFields==='function')readFields()}catch(_e){}
        propertyId=await prepareProperty();createdForCheckout=true;
        try{selectedPropertyId=propertyId}catch(_e){}
        localStorage.setItem('ptBillingProvisionalPropertyV1',propertyId);
      }
      saveDraft();localStorage.setItem('ptBillingResumeV1','1');
      const url=await openCheckout({plan,propertyId});try{window.UnsavedChangeProtection?.markClean?.()}catch(_e){}location.href=url
    }catch(e){
      localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');
      if(createdForCheckout){await discardProvisionalProperty(propertyId);localStorage.removeItem('ptBillingProvisionalPropertyV1')}
      busy=false;status('Checkout could not open: '+String(e?.message||e))
    }
  }
  async function upgrade(plan){
    if(development()){developmentNotice();return;}
    if(busy||!signedIn())return;
    if(!['professional_50_monthly','professional_50_yearly','unlimited_monthly','unlimited_yearly'].includes(plan))return;
    busy=true;status('Opening secure Stripe checkout…');
    localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');clearUpgrade();localStorage.setItem('ptBillingUpgradeV1',plan);localStorage.setItem('ptBillingUpgradeOwnerV1',cloudUser.id);
    try{
      if(await ownerAccess()){clearUpgrade();busy=false;banner('Your owner account already has full access. No purchase is needed.');return;}
      const url=await openCheckout({plan,propertyId:null});
      try{window.UnsavedChangeProtection?.markClean?.()}catch(_e){}
      location.href=url;
    }catch(e){clearUpgrade();busy=false;const message='Checkout could not open: '+String(e?.message||e);status(message);banner(message);}
  }
  async function claim(){if(development()){
    if(!signedIn()||!propertyId)throw Error('Open a saved development property before checking access.');
    const uid=cloudUser.id;
    const {data,error}=await cloudClient.rpc('mobile_dev_claim_property_access',{p_property_id:propertyId});
    if(cloudUser?.id!==uid)throw Error('Your account changed. Reopen the property.');if(error)throw error;return data;
  }if(shared()){const uid=cloudUser.id;const {data,error}=await cloudClient.rpc('claim_property_access',{p_property_id:propertyId});if(cloudUser?.id!==uid)throw Error('Your account changed. Reopen the property.');if(error)throw error;return data;}const {data,error}=await cloudClient.functions.invoke('billing-access',{body:{propertyId}});if(error)throw error;return data}
  async function ensureAccessForCurrent(){
    if(development()){
      propertyId=selectedPropertyId;
      if(!propertyId)throw Error('Save a new analysis through the shared development flow before checking property access.');
      return claim();
    }
    try{if(typeof readFields==='function')readFields()}catch(_e){}
    const createdForCheck=!selectedPropertyId;
    propertyId=await prepareProperty();
    if(!propertyId)throw new Error('The property could not be created.');
    try{selectedPropertyId=propertyId}catch(_e){}
    const access=await claim();
    if(!access?.allowed&&createdForCheck)await discardProvisionalProperty(propertyId);
    return access;
  }
  async function requestedPlan(){
    if(development())return;
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
    await upgrade(plan);
  }
  function finalGuidedStep(){const active=Number(document.querySelector('#gwSteps .gw-step.active[data-step]')?.dataset.step);return window.GuidedAnalysisSetup?.getStep?.()===6||active===6}
  function calculation(b){return b&&(b.id==='calculateBtn'||b.id==='quickCalc'||((b.id==='gwNext'||b.id==='gwSave')&&(finalGuidedStep()||/calculat/i.test(b.textContent||''))))}
  async function guard(e){if(bypass||busy||!signedIn())return;const b=e.target?.closest?.('#gwNext,#gwSave,#calculateBtn,#quickCalc');if(!calculation(b))return;e.preventDefault();e.stopImmediatePropagation();busy=true;try{status('Checking property access…');const a=await ensureAccessForCurrent();if(a?.allowed){bypass=true;busy=false;b.click();setTimeout(()=>bypass=false,0);return}busy=false;if(development()){developmentNotice();return;}modal().hidden=false;status('Choose how you would like to unlock this property.')}catch(err){busy=false;status('Unable to verify property access: '+String(err?.message||err))}}
  async function guardDestination(id){if(!signedIn()||!['dashboard','report'].includes(id))return true;if(bypass)return true;try{status('Checking property access…');const a=await ensureAccessForCurrent();if(a?.allowed)return true;if(development()){developmentNotice();return false;}modal().hidden=false;status('Choose how you would like to unlock this property.');return false}catch(err){status('Unable to verify property access: '+String(err?.message||err));return false}}
  async function resumePaidAnalysis(){if(development())return;if(localStorage.getItem('ptBillingResumeV1')!=='1')return;const d=JSON.parse(localStorage.getItem('ptBillingDraftV1')||'null');if(!d?.propertyId)return;propertyId=d.propertyId;try{selectedPropertyId=d.propertyId}catch(_e){}for(let i=0;i<20;i++){try{if(signedIn()&&window.PropertyThesisGuidedSaveExistingWorkflow?.calculateSaveReview){const a=await claim();if(a?.allowed){applyDraftValues(d);await new Promise(r=>setTimeout(r,100));window.GuidedAnalysisSetup?.go?.(6);await new Promise(r=>setTimeout(r,250));applyDraftValues(d);const saved=await window.PropertyThesisGuidedSaveExistingWorkflow.calculateSaveReview();if(saved===true){localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');localStorage.removeItem('ptBillingProvisionalPropertyV1');banner('Payment confirmed — your analysis is calculated, saved and ready to review.');return}throw new Error('The paid analysis was not saved.')}}}catch(_e){}await new Promise(r=>setTimeout(r,500))}applyDraftValues(d);window.GuidedAnalysisSetup?.go?.(6);try{window.UnsavedChangeProtection?.markDirty?.()}catch(_e){}banner('We could not confirm access and save your analysis yet. Your entries have been restored. Select Calculate, Save & Review Results to retry; please do not purchase again while confirmation is pending.')}
  function applyDraftValues(d){if(!d?.values)return false;Object.entries(d.values).forEach(([id,v])=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox')e.checked=!!v;else e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))});try{if(typeof readFields==='function')readFields()}catch(_e){}return true}
  async function restore(){if(development())return;const q=new URLSearchParams(location.search),resume=localStorage.getItem('ptBillingResumeV1')==='1',upgradePlan=localStorage.getItem('ptBillingUpgradeV1'),provisional=localStorage.getItem('ptBillingProvisionalPropertyV1');if(upgradePlan&&(q.get('billing')==='success'||(q.get('billing')!=='cancelled'&&localStorage.getItem('ptBillingConfirmationV1')==='1'))){localStorage.setItem('ptBillingConfirmationV1','1');history.replaceState({},'',location.pathname);await confirmUpgrade();return}if(q.get('billing')==='success'){banner('Checking property access before restoring and saving your analysis…');history.replaceState({},'',location.pathname);setTimeout(resumePaidAnalysis,1200)}else if(q.get('billing')==='cancelled'){let d=null;try{d=JSON.parse(localStorage.getItem('ptBillingDraftV1')||'null');applyDraftValues(d);window.GuidedAnalysisSetup?.go?.(6);window.PropertyThesisGuidedWorkflowRefinement?.apply?.();window.UnsavedChangeProtection?.markDirty?.()}catch(_e){}localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');clearUpgrade();localStorage.removeItem('ptBillingProvisionalPropertyV1');if(provisional)setTimeout(()=>discardProvisionalProperty(provisional),0);banner('Checkout was cancelled. No charge was made. Your analysis is still here.');history.replaceState({},'',location.pathname);return}if(!resume)return;try{const d=JSON.parse(localStorage.getItem('ptBillingDraftV1')||'null');if(!d?.createdAt||Date.now()-d.createdAt>86400000){localStorage.removeItem('ptBillingResumeV1');localStorage.removeItem('ptBillingDraftV1');if(provisional){localStorage.removeItem('ptBillingProvisionalPropertyV1');setTimeout(()=>discardProvisionalProperty(provisional),0)}return}applyDraftValues(d);if(d.propertyId)try{selectedPropertyId=d.propertyId}catch(_e){}}catch(_e){}}
  function start(){try{localStorage.removeItem('ptPendingPlan')}catch(_e){}modal();window.addEventListener('click',guard,true);setTimeout(restore,900);setTimeout(requestedPlan,100);try{cloudClient?.auth?.onAuthStateChange?.((_e,s)=>{if(s?.user){setTimeout(requestedPlan,500);setTimeout(confirmUpgrade,500)}})}catch(_e){}}
  window.PropertyThesisBilling={checkout,upgrade,claim,ensureAccessForCurrent,guardDestination};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

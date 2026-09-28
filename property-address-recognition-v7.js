'use strict';
(()=>{
  const VERSION=18;
  if((window.__propertyAddressRecognitionV||0)>=VERSION)return;
  window.__propertyAddressRecognitionV=VERSION;


  const dismissedDisplays=new WeakMap();
  let googlePromise=null,lastLookup='',lookupBusy=false,syncingAddress=false,mobileScrollTimer=0,mobileAdjustedInput=null;
  const addressInputs=()=>[...document.querySelectorAll('#f_address,[data-src="f_address"],[data-pt-home-address]')];
  const isVisible=el=>{if(!el)return false;const style=getComputedStyle(el),rect=el.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;};
  const visibleAddressInputs=()=>[...addressInputs(),...document.querySelectorAll('[data-pt-listing-address]')].filter(isVisible);


  function ensureDismissStyle(){
    if(document.getElementById('ptAddressDismissStyle'))return;
    const s=document.createElement('style');s.id='ptAddressDismissStyle';
    s.textContent='body.pt-hide-address-suggestions .pac-container{display:none!important}';
    document.head.appendChild(s);
  }
  function hideSuggestions(input){
    controls.forEach(c=>c.close());
    ensureDismissStyle();
    if(!document.body.classList.contains('pt-hide-address-suggestions'))document.body.classList.add('pt-hide-address-suggestions');
    document.querySelectorAll('.pac-container').forEach(el=>{if(!dismissedDisplays.has(el))dismissedDisplays.set(el,{value:el.style.getPropertyValue('display'),priority:el.style.getPropertyPriority('display')});el.style.setProperty('display','none','important');el.setAttribute('aria-hidden','true');});
  }
  function showSuggestions(){
    if(syncingAddress||!visibleAddressInputs().length)return;
    document.body.classList.remove('pt-hide-address-suggestions');
    document.querySelectorAll('.pac-container').forEach(el=>{const previous=dismissedDisplays.get(el);if(previous){if(el.style.getPropertyPriority('display')==='important'){if(previous.value)el.style.setProperty('display',previous.value,previous.priority);else el.style.removeProperty('display');}dismissedDisplays.delete(el);}el.removeAttribute('aria-hidden');});
  }
  function enforceStepVisibility(){if(!visibleAddressInputs().length)hideSuggestions();}
  function makeMobileSuggestionRoom(input){
    clearTimeout(mobileScrollTimer);
    mobileScrollTimer=setTimeout(()=>{
      if(!isVisible(input)||document.activeElement!==input||innerWidth>700||mobileAdjustedInput===input)return;
      const viewport=window.visualViewport;
      if(!viewport||viewport.height>=innerHeight*.82)return;
      const rect=input.getBoundingClientRect(),targetTop=viewport.offsetTop+18,delta=rect.top-targetTop;
      if(delta>8){mobileAdjustedInput=input;window.scrollBy({top:Math.min(delta,Math.max(120,viewport.height*.4)),behavior:'instant'});}
    },120);
  }
  function focusNextField(){const next=[...document.querySelectorAll('[data-src="f_price"],#f_price')].find(el=>el.offsetParent!==null&&!el.disabled);if(next){try{next.focus({preventScroll:true});}catch(_e){try{next.focus();}catch(__e){}}}}
  function statusHost(input){const parent=input.closest('.gw-field,.field,.pt-home-address-field')||input.parentElement;if(!parent)return null;let el=parent.querySelector(':scope > .pt-address-recognition-status');if(!el){el=document.createElement('div');el.className='pt-address-recognition-status';el.style.cssText='margin-top:6px;font-size:9px;line-height:1.4;color:#667085';parent.appendChild(el);}return el;}
  function setStatus(text,kind=''){addressInputs().forEach(input=>{const el=statusHost(input);if(!el)return;el.textContent=text;el.style.color=kind==='ok'?'#067647':kind==='err'?'#b42318':'#667085';});}
  function syncAddress(value){syncingAddress=true;try{addressInputs().forEach(input=>{if(input.value===value)return;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});try{if(typeof state!=='undefined'&&state)state.address=value;}catch(_e){}}finally{queueMicrotask(()=>{syncingAddress=false;});}}
  function saveProperty(property){try{if(typeof state!=='undefined'&&state)state.subjectProperty={...property,recognizedAt:new Date().toISOString()};}catch(_e){}window.PropertyThesisSubjectProperty=property;}
  function summary(p){const bits=[];if(p.propertyType)bits.push(p.propertyType);if(p.squareFootage)bits.push(Number(p.squareFootage).toLocaleString()+' sf');if(p.yearBuilt)bits.push('Built '+p.yearBuilt);if(p.bedrooms!=null)bits.push(p.bedrooms+' bd');if(p.bathrooms!=null)bits.push(p.bathrooms+' ba');return bits.length?'Recognized property • '+bits.join(' • '):'Property recognized by RentCast.';}

  async function lookup(address){
    address=String(address||'').trim();if(!address||lookupBusy||address===lastLookup)return;
    if(typeof cloudClient==='undefined'||!cloudClient){setStatus('Property lookup is unavailable.','err');return;}
    const {data:{session}}=await cloudClient.auth.getSession();if(!session?.user){setStatus('Sign in to PropertyThesis to enable property recognition.');return;}
    lookupBusy=true;setStatus('Recognizing property…');
    try{
      const {data,error}=await cloudClient.functions.invoke('rentcast-property-lookup',{body:{address}});if(error)throw error;
      if(!data?.matched||!data.property){setStatus('Address selected, but no matching property record was found.','err');return;}
      lastLookup=address;const p=data.property,normalized=p.formattedAddress||address;syncAddress(normalized);saveProperty(p);setStatus(summary(p),'ok');hideSuggestions();
      document.dispatchEvent(new CustomEvent('propertythesis:subject-recognized',{detail:{property:p,candidates:data.candidates||[]}}));
      setTimeout(()=>{hideSuggestions();focusNextField();},0);setTimeout(()=>hideSuggestions(),80);
    }catch(e){setStatus(e?.message||'Property recognition failed.','err');}finally{lookupBusy=false;}
  }
  const controls=new Set();
  const config=window.PT_GOOGLE_SUGGESTIONS_REVIEW||{};
  const getGuestToken=window.PTWebsiteGoogleSuggestions.guestVerifier({siteKey:config.guestSiteKey,loadTurnstile:window.PTWebsiteGoogleSuggestions.loadTurnstile});
  const suggest=window.PTWebsiteGoogleSuggestions.create({enabled:config.enabled===true,projectUrl:config.projectUrl,publicKey:config.publicKey,getClient:()=>typeof cloudClient==='undefined'?null:cloudClient,getGuestToken});
  function loadGoogle(){return Promise.reject(Error('Direct Google requests are disabled in this candidate.'));}
  function attachInput(input){
    if(!input||input.dataset.ptAddressRecognition==='1')return;
    input.dataset.ptAddressRecognition='1';
    const control=window.PTAddressAutocomplete.attach(input,(_route,_method,body)=>suggest(body.input,input),{shouldSearch:()=>!syncingAddress&&isVisible(input),onSelect:row=>{
      input.dataset.placeId=row.id||'';input.dataset.lat='';input.dataset.lng='';
      controls.forEach(c=>c.close());syncAddress(row.address);
      if(input.matches('[data-pt-home-address]')){setStatus('Address recognized. Property details will be researched after you create or sign in to your account.','ok');return;}
      lookup(row.address);
    }});
    if(control)controls.add(control);
    input.addEventListener('change',e=>{if(syncingAddress||!e.isTrusted)return;const value=input.value.trim();if(value)syncAddress(value);});
  }
  function attachAll(){addressInputs().forEach(attachInput);enforceStepVisibility();}
  function start(){
    ensureDismissStyle();attachAll();
    window.visualViewport?.addEventListener('resize',()=>{const input=document.activeElement;if(addressInputs().includes(input))makeMobileSuggestionRoom(input);},{passive:true});
    const observer=new MutationObserver(()=>{attachAll();enforceStepVisibility();});observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('propertythesis:analysis-loaded',()=>setTimeout(attachAll,50));
    document.addEventListener('click',e=>{if(e.target?.closest?.('#gwNext,#gwBack,#gwSteps .gw-step,[data-s8-tab],.nav [data-tab]')){hideSuggestions();setTimeout(enforceStepVisibility,0);setTimeout(enforceStepVisibility,80);}},true);
  }
  window.PropertyThesisAddressRecognition={lookup,attachAll,hideSuggestions,showSuggestions,loadGoogle,makeMobileSuggestionRoom,resetMobileSuggestionRoom:()=>{mobileAdjustedInput=null;clearTimeout(mobileScrollTimer);},getProperty:()=>window.PropertyThesisSubjectProperty||null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

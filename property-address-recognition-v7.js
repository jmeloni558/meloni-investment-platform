'use strict';
(()=>{
  const VERSION=15;
  if((window.__propertyAddressRecognitionV||0)>=VERSION)return;
  window.__propertyAddressRecognitionV=VERSION;

  const GOOGLE_KEY_STORAGE='pt_step1_google_places_key';
  let googlePromise=null,lastLookup='',lookupBusy=false,syncingAddress=false,mobileScrollTimer=0,mobileAdjustedInput=null;
  const addressInputs=()=>[...document.querySelectorAll('#f_address,[data-src="f_address"],[data-pt-home-address]')];
  const isVisible=el=>{if(!el)return false;const style=getComputedStyle(el),rect=el.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;};
  const visibleAddressInputs=()=>addressInputs().filter(isVisible);
  const key=()=>window.PROPERTYTHESIS_CONFIG?.googlePlacesKey||window.PROPERTYTHESIS_GOOGLE_PLACES_KEY||localStorage.getItem(GOOGLE_KEY_STORAGE)||'';

  function ensureDismissStyle(){
    if(document.getElementById('ptAddressDismissStyle'))return;
    const s=document.createElement('style');s.id='ptAddressDismissStyle';
    s.textContent='body.pt-hide-address-suggestions .pac-container{display:none!important}';
    document.head.appendChild(s);
  }
  function hideSuggestions(input){
    ensureDismissStyle();
    document.body.classList.add('pt-hide-address-suggestions');
    document.querySelectorAll('.pac-container').forEach(el=>{el.style.setProperty('display','none','important');el.setAttribute('aria-hidden','true');});
  }
  function showSuggestions(){
    if(syncingAddress||!visibleAddressInputs().length)return;
    document.body.classList.remove('pt-hide-address-suggestions');
    document.querySelectorAll('.pac-container').forEach(el=>{el.style.removeProperty('display');el.removeAttribute('aria-hidden');});
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
  function loadGoogle(){
    const k=key();if(!k)return Promise.reject(new Error('Google Places key not configured'));
    if(window.google?.maps?.places)return Promise.resolve(window.google.maps.places);if(googlePromise)return googlePromise;
    googlePromise=new Promise((resolve,reject)=>{const cb='__ptAddressRecognitionReady';window[cb]=()=>resolve(window.google?.maps?.places);const s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(k)+'&libraries=places&callback='+cb+'&v=weekly&auth_referrer_policy=origin';s.async=true;s.defer=true;s.dataset.ptAddressRecognitionGoogle='1';s.onerror=()=>reject(new Error('Unable to load Google address suggestions'));document.head.appendChild(s);});return googlePromise;
  }
  async function attachInput(input){
    if(!input||input.dataset.ptAddressRecognition==='1')return;input.dataset.ptAddressRecognition='1';input.setAttribute('autocomplete','off');
    if(!key()){setStatus('Manual address entry is available. Address suggestions are not configured on this browser.');return;}
    try{
      await loadGoogle();if(!window.google?.maps?.places?.Autocomplete)throw new Error('Google Places unavailable');
      const ac=new google.maps.places.Autocomplete(input,{componentRestrictions:{country:'us'},types:['address'],fields:['formatted_address','place_id','geometry']});
      if(input.matches('[data-pt-home-address]'))[0,50,250,1000].forEach(ms=>setTimeout(()=>input.removeAttribute('placeholder'),ms));
      ac.addListener('place_changed',()=>{const place=ac.getPlace(),address=place?.formatted_address||input.value.trim();if(!address)return;const lat=place?.geometry?.location?.lat?.(),lng=place?.geometry?.location?.lng?.();input.dataset.placeId=place?.place_id||'';input.dataset.lat=Number.isFinite(lat)?String(lat):'';input.dataset.lng=Number.isFinite(lng)?String(lng):'';hideSuggestions(input);syncAddress(address);setTimeout(()=>hideSuggestions(input),0);if(input.matches('[data-pt-home-address]')){setStatus('Address recognized. Property details will be researched after you create or sign in to your account.','ok');return;}lookup(address);});
      input.addEventListener('input',()=>{if(!syncingAddress&&isVisible(input))showSuggestions();makeMobileSuggestionRoom(input);},{passive:true});
      input.addEventListener('focus',()=>{if(!syncingAddress&&isVisible(input)&&input.value.trim()!==lastLookup)showSuggestions();[120,320].forEach(ms=>setTimeout(()=>makeMobileSuggestionRoom(input),ms));},{passive:true});
      input.addEventListener('blur',()=>{if(mobileAdjustedInput===input)mobileAdjustedInput=null;clearTimeout(mobileScrollTimer);},{passive:true});
      input.addEventListener('change',e=>{if(syncingAddress||!e.isTrusted)return;const v=input.value.trim();if(v&&v!==lastLookup)syncAddress(v);});
      setStatus('Address suggestions ready. Start typing and select the matching property.');
    }catch(e){setStatus('Manual address entry is available. Google suggestions could not load.','err');}
  }
  function attachAll(){addressInputs().forEach(attachInput);enforceStepVisibility();}
  function start(){
    ensureDismissStyle();attachAll();
    window.visualViewport?.addEventListener('resize',()=>{const input=document.activeElement;if(addressInputs().includes(input))makeMobileSuggestionRoom(input);},{passive:true});
    const observer=new MutationObserver(()=>{attachAll();enforceStepVisibility();});observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('propertythesis:analysis-loaded',()=>setTimeout(attachAll,50));
    document.addEventListener('click',e=>{if(e.target?.closest?.('#gwNext,#gwBack,#gwSteps .gw-step,[data-s8-tab],.nav [data-tab]')){hideSuggestions();setTimeout(enforceStepVisibility,0);setTimeout(enforceStepVisibility,80);}},true);
  }
  window.PropertyThesisAddressRecognition={lookup,attachAll,hideSuggestions,getProperty:()=>window.PropertyThesisSubjectProperty||null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

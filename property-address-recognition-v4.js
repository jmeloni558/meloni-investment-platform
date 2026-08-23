'use strict';
(()=>{
  const VERSION=4;
  if((window.__propertyAddressRecognitionV||0)>=VERSION)return;
  window.__propertyAddressRecognitionV=VERSION;

  const GOOGLE_KEY_STORAGE='pt_step1_google_places_key';
  let googlePromise=null;
  let lastLookup='';
  let lookupBusy=false;

  const addressInputs=()=>[...document.querySelectorAll('#f_address,[data-src="f_address"]')];
  const key=()=>localStorage.getItem(GOOGLE_KEY_STORAGE)||'';

  function ensureDismissStyle(){
    if(document.getElementById('ptAddressDismissStyle'))return;
    const s=document.createElement('style');
    s.id='ptAddressDismissStyle';
    s.textContent='body.pt-hide-address-suggestions .pac-container{display:none!important}';
    document.head.appendChild(s);
  }

  function dismissSuggestions(input){
    ensureDismissStyle();
    document.body.classList.add('pt-hide-address-suggestions');
    try{input?.blur();}catch(_e){}
    setTimeout(()=>document.body.classList.remove('pt-hide-address-suggestions'),250);
  }

  function focusNextField(){
    const candidates=[...document.querySelectorAll('[data-src="f_price"],#f_price')];
    const next=candidates.find(el=>el.offsetParent!==null&&!el.disabled);
    if(next){
      try{next.focus({preventScroll:true});}catch(_e){try{next.focus();}catch(__e){}}
    }
  }

  function statusHost(input){
    const parent=input.closest('.gw-field,.field')||input.parentElement;
    if(!parent)return null;
    let el=parent.querySelector(':scope > .pt-address-recognition-status');
    if(!el){
      el=document.createElement('div');
      el.className='pt-address-recognition-status';
      el.style.cssText='margin-top:6px;font-size:9px;line-height:1.4;color:#667085';
      parent.appendChild(el);
    }
    return el;
  }

  function setStatus(text,kind=''){
    addressInputs().forEach(input=>{
      const el=statusHost(input);if(!el)return;
      el.textContent=text;
      el.style.color=kind==='ok'?'#067647':kind==='err'?'#b42318':'#667085';
    });
  }

  function syncAddress(value){
    addressInputs().forEach(input=>{
      if(input.value===value)return;
      input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    try{if(typeof state!=='undefined'&&state)state.address=value;}catch(_e){}
  }

  function saveProperty(property){
    try{
      if(typeof state!=='undefined'&&state){
        state.subjectProperty={...property,recognizedAt:new Date().toISOString()};
      }
    }catch(_e){}
    window.PropertyThesisSubjectProperty=property;
  }

  function summary(p){
    const bits=[];
    if(p.propertyType)bits.push(p.propertyType);
    if(p.squareFootage)bits.push(Number(p.squareFootage).toLocaleString()+' sf');
    if(p.yearBuilt)bits.push('Built '+p.yearBuilt);
    if(p.bedrooms!=null)bits.push(p.bedrooms+' bd');
    if(p.bathrooms!=null)bits.push(p.bathrooms+' ba');
    return bits.length?'Recognized property • '+bits.join(' • '):'Property recognized by RentCast.';
  }

  async function lookup(address){
    address=String(address||'').trim();
    if(!address||lookupBusy||address===lastLookup)return;
    if(typeof cloudClient==='undefined'||!cloudClient){setStatus('Property lookup is unavailable.','err');return;}
    const {data:{session}}=await cloudClient.auth.getSession();
    if(!session?.user){setStatus('Sign in to PropertyThesis to enable property recognition.');return;}
    lookupBusy=true;
    setStatus('Recognizing property…');
    try{
      const {data,error}=await cloudClient.functions.invoke('rentcast-property-lookup',{body:{address}});
      if(error)throw error;
      if(!data?.matched||!data.property){setStatus('Address selected, but no matching property record was found.','err');return;}
      lastLookup=address;
      const p=data.property;
      const normalized=p.formattedAddress||address;
      syncAddress(normalized);
      saveProperty(p);
      setStatus(summary(p),'ok');
      document.dispatchEvent(new CustomEvent('propertythesis:subject-recognized',{detail:{property:p,candidates:data.candidates||[]}}));
      setTimeout(focusNextField,60);
    }catch(e){
      setStatus(e?.message||'Property recognition failed.','err');
    }finally{lookupBusy=false;}
  }

  function loadGoogle(){
    const k=key();
    if(!k)return Promise.reject(new Error('Google Places key not configured'));
    if(window.google?.maps?.places)return Promise.resolve(window.google.maps.places);
    if(googlePromise)return googlePromise;
    googlePromise=new Promise((resolve,reject)=>{
      const cb='__ptAddressRecognitionReady';
      window[cb]=()=>resolve(window.google?.maps?.places);
      const s=document.createElement('script');
      s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(k)+'&libraries=places&callback='+cb+'&v=weekly';
      s.async=true;s.defer=true;s.dataset.ptAddressRecognitionGoogle='1';
      s.onerror=()=>reject(new Error('Unable to load Google address suggestions'));
      document.head.appendChild(s);
    });
    return googlePromise;
  }

  async function attachInput(input){
    if(!input||input.dataset.ptAddressRecognition==='1')return;
    input.dataset.ptAddressRecognition='1';
    input.setAttribute('autocomplete','off');
    if(!key()){
      setStatus('Manual address entry is available. Address suggestions are not configured on this browser.');
      return;
    }
    try{
      await loadGoogle();
      if(!window.google?.maps?.places?.Autocomplete)throw new Error('Google Places unavailable');
      const ac=new google.maps.places.Autocomplete(input,{componentRestrictions:{country:'us'},types:['address'],fields:['formatted_address','place_id','geometry']});
      ac.addListener('place_changed',()=>{
        const place=ac.getPlace();
        const address=place?.formatted_address||input.value.trim();
        if(!address)return;
        syncAddress(address);
        dismissSuggestions(input);
        lookup(address);
      });
      input.addEventListener('change',()=>{const v=input.value.trim();if(v&&v!==lastLookup)syncAddress(v);});
      setStatus('Address suggestions ready. Start typing and select the matching property.');
    }catch(e){
      setStatus('Manual address entry is available. Google suggestions could not load.','err');
    }
  }

  function attachAll(){addressInputs().forEach(attachInput);}

  function start(){
    attachAll();
    const observer=new MutationObserver(()=>attachAll());
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('propertythesis:analysis-loaded',()=>setTimeout(attachAll,50));
  }

  window.PropertyThesisAddressRecognition={lookup,attachAll,getProperty:()=>window.PropertyThesisSubjectProperty||null};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

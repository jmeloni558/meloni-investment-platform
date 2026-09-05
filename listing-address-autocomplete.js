'use strict';
(()=>{
  if(window.PropertyThesisListingAddresses)return;
  const bound=new WeakSet();
  const service=()=>window.PropertyThesisAddressRecognition;
  const unitFrom=value=>String(value).match(/(?:\b(?:apt\.?|unit|suite|ste\.?)\s*|#\s*)([a-z0-9-]+)\b/i)?.[1]||'';
  function preserveUnit(address,typed){
    const unit=unitFrom(typed);
    if(!unit||unitFrom(address))return address;
    const comma=address.indexOf(',');
    return comma<0?`${address} #${unit}`:`${address.slice(0,comma)} #${unit}${address.slice(comma)}`;
  }
  function attach(input){
    if(bound.has(input))return;
    bound.add(input);
    input.autocomplete='off';
    const note=document.createElement('small');
    note.id=input.id+'Suggestions';note.className='pt-listing-address-help';
    note.setAttribute('role','status');
    note.textContent='Start typing for U.S. address suggestions, or enter an address manually.';
    // Outside the flex input/button row to preserve the existing layout.
    const host=input.closest('.pt-specific-row')||input;
    host.insertAdjacentElement('afterend',note);
    input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),note.id].filter(Boolean).join(' '));
    let pending=false,autocomplete=null,typed=input.value;
    const activate=async()=>{
      service()?.showSuggestions();
      document.body.classList.add('pt-listing-address-active');
      if(pending||autocomplete)return;
      pending=true;
      try{
        if(!service()?.loadGoogle)throw new Error('Address service unavailable');
        await service().loadGoogle();
        const placeholder=input.placeholder;
        autocomplete=new google.maps.places.Autocomplete(input,{
          componentRestrictions:{country:'us'},types:['address'],strictBounds:false,
          fields:['formatted_address']
        });
        input.placeholder=placeholder;
        input.dataset.ptListingAutocomplete='ready';
        autocomplete.addListener('place_changed',()=>{
          const place=autocomplete.getPlace();
          if(!place?.formatted_address)return;
          input.value=preserveUnit(place.formatted_address,typed);
          typed=input.value;
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.dispatchEvent(new Event('change',{bubbles:true}));
          service()?.hideSuggestions(input);
          note.textContent=input.dataset.ptListingAddress==='specific'
            ?'Address selected. Check the unit number, then click Find Listing.'
            :'Search center selected. Choose a radius, then click Search Listings.';
        });
        note.textContent='U.S. address suggestions ready. Manual entry is also available.';
        service()?.showSuggestions();
      }catch(_error){
        note.textContent='Suggestions are unavailable. You can still enter the full address manually.';
        input.dataset.ptListingAutocomplete='manual';
      }finally{pending=false;}
    };
    input.addEventListener('focus',activate);
    input.addEventListener('input',()=>{
      typed=input.value;
      service()?.showSuggestions();
      service()?.makeMobileSuggestionRoom(input);
    });
    input.addEventListener('keydown',event=>{
      // Selecting a Google prediction must never submit a listing request.
      // The explicit search buttons remain keyboard accessible via Tab.
      if(event.key==='Enter'&&(autocomplete||pending))event.preventDefault();
    });
    input.addEventListener('blur',()=>{
      service()?.resetMobileSuggestionRoom();
      setTimeout(()=>{
        if(document.activeElement?.matches?.('[data-pt-listing-address]'))return;
        document.body.classList.remove('pt-listing-address-active');
        if(document.activeElement?.matches?.('#f_address,[data-src="f_address"],[data-pt-home-address]'))return;
        service()?.hideSuggestions(input);
      },200);
    });
  }
  function attachAll(){document.querySelectorAll('[data-pt-listing-address]').forEach(attach);}
  function start(){
    const style=document.createElement('style');
    style.textContent='.pt-listing-address-help{display:block;margin-top:8px;color:#425466;font-size:13px;line-height:1.5}body.pt-listing-address-active .pac-container{z-index:2147483000!important;max-width:calc(100vw - 24px)}body.pt-listing-address-active .pac-item{min-height:44px;line-height:1.5;padding:10px 8px;white-space:normal}';
    document.head.appendChild(style);
    attachAll();
    new MutationObserver(attachAll).observe(document.body,{childList:true,subtree:true});
    window.visualViewport?.addEventListener('resize',()=>{
      const input=document.activeElement;
      if(input?.matches?.('[data-pt-listing-address]'))service()?.makeMobileSuggestionRoom(input);
    },{passive:true});
  }
  window.PropertyThesisListingAddresses={attachAll,preserveUnit};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

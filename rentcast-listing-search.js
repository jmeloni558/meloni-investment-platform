'use strict';
(()=>{
  const VERSION=1,IMPORT_KEY='ptPendingListingImportV1';
  if((window.__ptRentCastListingSearchV||0)>=VERSION)return;
  window.__ptRentCastListingSearchV=VERSION;
  let panel=null,results=[],offset=0,activeListing=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const value=v=>v===null||v===undefined||v===''?'—':String(v);
  const signedIn=()=>typeof cloudUser!=='undefined'&&!!cloudUser;

  function ensurePanel(){
    if(panel)return panel;
    const workflow=document.getElementById('stage8Workflow');if(!workflow)return null;
    panel=document.createElement('section');panel.id='ptListingsPanel';panel.className='pt-listings-panel screen-only';
    panel.innerHTML=`<header class="pt-listings-head"><div><div class="pt-listings-eyebrow">NATIONWIDE MULTIFAMILY DISCOVERY</div><h2>Search Investment Listings</h2><p>Active 2–4 unit properties and 5+ unit apartment buildings. Single-family homes, condos, townhouses, manufactured homes and land are excluded.</p></div><button class="pt-listings-close" type="button" aria-label="Close listing search">Close</button></header><form class="pt-listings-search"><div class="pt-listings-field"><label>City</label><input name="city" autocomplete="address-level2" placeholder="Tampa"></div><div class="pt-listings-field"><label>State</label><input name="state" maxlength="2" autocomplete="address-level1" placeholder="FL"></div><div class="pt-listings-field"><label>ZIP code</label><input name="zipCode" inputmode="numeric" autocomplete="postal-code" placeholder="33602"></div><div class="pt-listings-field"><label>Minimum price</label><input name="minPrice" inputmode="numeric" placeholder="$250,000"></div><div class="pt-listings-field"><label>Maximum price</label><input name="maxPrice" inputmode="numeric" placeholder="$2,000,000"></div><button type="submit">Search Listings</button></form><div class="pt-listings-note"><strong>Focused search:</strong> RentCast Multi-Family (2–4 units) and Apartment (5+ units) listings only. Listing availability and fields vary by market.</div><div class="pt-listings-status" role="status">Enter a city and state or a ZIP code to begin.</div><div class="pt-listings-grid"></div>`;
    workflow.insertAdjacentElement('beforebegin',panel);
    panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();search()});
    panel.querySelector('.pt-listings-close').onclick=close;
    return panel;
  }
  function ensureButton(){
    const actions=document.querySelector('#appNavShell .app-nav-actions');if(!actions)return false;
    let btn=document.getElementById('appNavListings');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.id='appNavListings';btn.className='app-nav-action';btn.textContent='Search Listings';btn.onclick=open;document.getElementById('appNavExisting')?.insertAdjacentElement('afterend',btn);}
    btn.hidden=!signedIn();return true;
  }
  function hideApplication(on){document.querySelectorAll('.section').forEach(s=>s.style.display=on?'none':'');const workflow=document.getElementById('stage8Workflow');if(workflow)workflow.style.display=on?'none':'';document.getElementById('appMortgageToolsPanel')?.style.setProperty('display','none');}
  function open(){if(!signedIn()){window.PropertyThesisAuth?.open?.('signin','Sign in to search nationwide multifamily listings.');return;}ensurePanel();hideApplication(true);panel.classList.add('is-open');document.getElementById('appNavListings')?.classList.add('active');window.scrollTo({top:document.getElementById('appNavShell')?.offsetTop||0,behavior:'auto'});}
  function close(){panel?.classList.remove('is-open');hideApplication(false);document.getElementById('appNavListings')?.classList.remove('active');}
  function query(){const form=panel.querySelector('form'),raw=n=>form.elements[n].value.trim().replace(/[$,]/g,'');return{city:raw('city'),state:raw('state').toUpperCase(),zipCode:raw('zipCode'),minPrice:raw('minPrice')||null,maxPrice:raw('maxPrice')||null,limit:18,offset};}
  async function search(){
    offset=0;const q=query();if(!q.zipCode&&!(q.city&&q.state)){setStatus('Enter either a ZIP code or both a city and two-letter state code.');return;}setStatus('Searching active multifamily and apartment listings…');panel.querySelector('.pt-listings-grid').innerHTML='';
    try{const {data,error}=await cloudClient.functions.invoke('rentcast-sale-listings',{body:q});if(error)throw error;results=Array.isArray(data?.listings)?data.listings:[];render();setStatus(results.length?`${results.length} active multifamily and apartment listing${results.length===1?'':'s'} loaded.`:'No matching listings were found. Try a nearby ZIP code or broader price range.');offset=results.length;}catch(err){setStatus(err?.message||'Listing search failed. Please try again.');}
  }
  function setStatus(text){const el=panel?.querySelector('.pt-listings-status');if(el)el.textContent=text;}
  function facts(l){return `<div><b>${esc(value(l.units))}</b>Units reported</div><div><b>${esc(value(l.squareFootage&&Number(l.squareFootage).toLocaleString()))}</b>Square feet</div><div><b>${esc(value(l.yearBuilt))}</b>Year built</div><div><b>${esc(value(l.daysOnMarket))}</b>Days on market</div>`;}
  function render(){const grid=panel.querySelector('.pt-listings-grid');grid.innerHTML=results.map((l,i)=>`<article class="pt-listing-card"><div class="pt-listing-card-top"><span class="pt-listing-type">${esc(l.propertyType)}</span></div><div class="pt-listing-card-body"><div class="pt-listing-price">${money(l.price)}</div><div class="pt-listing-address">${esc(l.formattedAddress||l.addressLine1||'Address unavailable')}</div><div class="pt-listing-facts">${facts(l)}</div><div class="pt-listing-card-actions"><button type="button" data-detail="${i}">Open Listing</button><button type="button" class="primary" data-analyze="${i}">Analyze</button></div></div></article>`).join('');grid.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(results[Number(b.dataset.detail)]));grid.querySelectorAll('[data-analyze]').forEach(b=>b.onclick=()=>importListing(results[Number(b.dataset.analyze)]));}
  function detail(l){
    activeListing=l;let modal=document.getElementById('ptListingDetail');if(!modal){modal=document.createElement('div');modal.id='ptListingDetail';modal.className='pt-listing-detail';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('is-open')});}
    modal.innerHTML=`<article class="pt-listing-dialog" role="dialog" aria-modal="true" aria-labelledby="ptListingTitle"><header class="pt-listing-dialog-head"><div><span class="pt-listing-type">${esc(l.propertyType)}</span><h3 id="ptListingTitle">${esc(l.formattedAddress||'Investment property')}</h3></div><button class="pt-listings-close" type="button">Close</button></header><div class="pt-listing-dialog-body"><div class="pt-listing-detail-price">${money(l.price)}</div><div class="pt-listing-detail-grid">${facts(l)}<div><b>${esc(value(l.bedrooms))}</b>Bedrooms reported</div><div><b>${esc(value(l.bathrooms))}</b>Bathrooms reported</div><div><b>${esc(value(l.lotSize&&Number(l.lotSize).toLocaleString()))}</b>Lot square feet</div><div><b>${esc(value(l.listingType))}</b>Listing type</div><div><b>${esc(value(l.mlsNumber))}</b>Listing number</div></div><button class="pt-listings-action" type="button" data-import>Analyze This Property</button><div class="pt-listing-attribution">Listing information provided by RentCast${l.mlsName?` from ${esc(l.mlsName)}`:''}. Verify all information independently before making an investment decision. Listing data may be incomplete or delayed.</div></div></article>`;
    modal.querySelector('.pt-listings-close').onclick=()=>modal.classList.remove('is-open');modal.querySelector('[data-import]').onclick=()=>importListing(activeListing);modal.classList.add('is-open');
  }
  function importListing(l){
    const minimumUnits=l.propertyType==='Apartment'?5:2;
    const imported={name:l.formattedAddress||l.addressLine1||'Imported Listing',address:l.formattedAddress||l.addressLine1||'',price:Number(l.price)||0,units:Number(l.units)||minimumUnits,propertyType:l.propertyType||'',listing:{...l,source:'RentCast',importedAt:new Date().toISOString()}};
    localStorage.setItem(IMPORT_KEY,JSON.stringify(imported));
    try{state={...defaults,name:imported.name,address:imported.address,price:imported.price,rent:0,units:imported.units,marketRentSupport:{inputs:{propertyType:imported.propertyType,bedrooms:l.bedrooms??'',bathrooms:l.bathrooms??'',squareFootage:l.squareFootage??''}},sourceListing:imported.listing};renderFields();render();}catch(_e){}
    document.getElementById('ptListingDetail')?.classList.remove('is-open');close();
    try{window.AppNavigationToolbar?.go?.('assumptions');window.GuidedAnalysisSetup?.go?.(1);}catch(_e){}
    try{if(typeof setStatus==='function')setStatus(`Listing imported. Enter the expected monthly rent and verify the ${Number(l.units)?'reported':'minimum assumed'} unit count before calculating.`);}catch(_e){}
    window.scrollTo({top:document.getElementById('guidedSetup')?.offsetTop||document.getElementById('appNavShell')?.offsetTop||0,behavior:'smooth'});
  }
  function requested(){
    if(new URLSearchParams(location.search).get('app-action')!=='search-listings')return;
    if(signedIn())open();
    else window.PropertyThesisAuth?.open?.('signin','Sign in to search nationwide multifamily listings.');
  }
  function start(){ensurePanel();let tries=0;const timer=setInterval(()=>{ensureButton();if(++tries>40)clearInterval(timer)},180);document.addEventListener('click',e=>{if(e.target.closest('#appNavShell .app-nav-action:not(#appNavListings)'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('ptListingDetail')?.classList.remove('is-open')});try{cloudClient?.auth?.onAuthStateChange?.(()=>setTimeout(ensureButton,120));}catch(_e){}setTimeout(requested,900);}
  window.PropertyThesisListingSearch={open,close,search,importListing};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

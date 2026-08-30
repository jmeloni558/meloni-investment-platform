'use strict';
(()=>{
  const VERSION=6,IMPORT_KEY='ptPendingListingImportV1';
  if((window.__ptRentCastListingSearchV||0)>=VERSION)return;
  window.__ptRentCastListingSearchV=VERSION;
  let panel=null,results=[],offset=0,activeListing=null;const featureCache=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}):'—';
  const value=v=>v===null||v===undefined||v===''?'—':String(v);
  const signedIn=()=>typeof cloudUser!=='undefined'&&!!cloudUser;
  const streetViewUrl=l=>{const key=window.PROPERTYTHESIS_CONFIG?.googlePlacesKey||'';const location=Number.isFinite(Number(l.latitude))&&Number.isFinite(Number(l.longitude))?`${l.latitude},${l.longitude}`:(l.formattedAddress||'');if(!key||!location)return'';const q=new URLSearchParams({size:'640x360',location,key,source:'outdoor',fov:'80',pitch:'0',return_error_code:'true'});return`https://maps.googleapis.com/maps/api/streetview?${q}`;};
  const streetView=l=>{const src=streetViewUrl(l),address=l.formattedAddress||'the property';return`<div class="pt-listing-streetview${src?'':' is-unavailable'}">${src?`<img data-streetview src="${esc(src)}" loading="lazy" alt="Google Street View of ${esc(address)}">`:''}<span>Street View unavailable</span><em>Google Street View</em></div>`;};
  function bindStreetViews(host){host.querySelectorAll('[data-streetview]').forEach(img=>img.addEventListener('error',()=>img.closest('.pt-listing-streetview')?.classList.add('is-unavailable'),{once:true}));}
  function addRangeFields(host){
    const beforeSquareFeet=host.querySelector('[name="squareFootageMin"]')?.closest('.pt-listings-field');
    beforeSquareFeet?.insertAdjacentHTML('beforebegin','<div class="pt-listings-field"><label>Maximum bedrooms</label><input name="bedroomsMax" type="number" min="0"></div><div class="pt-listings-field"><label>Maximum bathrooms</label><input name="bathroomsMax" type="number" min="0" step=".5"></div>');
    const beforeYear=host.querySelector('[name="yearBuiltMin"]')?.closest('.pt-listings-field');
    beforeYear?.insertAdjacentHTML('beforebegin','<div class="pt-listings-field"><label>Minimum lot size (sq. ft.)</label><input name="lotSizeMin" inputmode="numeric"></div><div class="pt-listings-field"><label>Maximum lot size (sq. ft.)</label><input name="lotSizeMax" inputmode="numeric"></div>');
  }
  function organizePropertyFilters(host){
    const groups=[
      ['Purchase price','Set the acquisition range you want to review.',['minPrice','maxPrice']],
      ['Interior','Narrow results by reported rooms and living area.',['bedroomsMin','bedroomsMax','bathroomsMin','bathroomsMax','squareFootageMin','squareFootageMax']],
      ['Site & building','Refine by lot area and construction year.',['lotSizeMin','lotSizeMax','yearBuiltMin','yearBuiltMax']],
      ['Listing activity','Control recency and how results are ordered.',['daysOld','sort']],
      ['Investment screening','Screen unit economics or request RentCast rent estimates.',['maxPricePerUnit','minEstimatedRent','minNoi','minCapRate','minSupportedValue','expenseRatio','targetCapRate']],
    ];
    host.insertAdjacentHTML('afterbegin','<div class="pt-filter-intro"><strong>Refine the opportunity</strong><span>Leave any field blank to keep the search broad.</span></div>');
    groups.forEach(([title,description,names])=>{
      const section=document.createElement('section');section.className='pt-filter-section';
      section.innerHTML=`<header><h3>${title}</h3><p>${description}</p></header><div class="pt-filter-fields"></div>`;
      const fields=section.querySelector('.pt-filter-fields');
      names.forEach(name=>{const field=host.querySelector(`[name="${name}"]`)?.closest('.pt-listings-field');if(field)fields.appendChild(field);});
      host.appendChild(section);
    });
  }

  function ensurePanel(){
    if(panel)return panel;
    const workflow=document.getElementById('stage8Workflow');if(!workflow)return null;
    panel=document.createElement('section');panel.id='ptListingsPanel';panel.className='pt-listings-panel screen-only';
    panel.innerHTML=`<header class="pt-listings-head"><div><div class="pt-listings-eyebrow">NATIONWIDE INVESTMENT DISCOVERY</div><h2>Search Investment Listings</h2><p>Search active listings nationwide. Multifamily and apartment properties are selected initially, and you can include other property types when they fit your investment strategy.</p></div><button class="pt-listings-close" type="button" aria-label="Close listing search">Close</button></header><form class="pt-listings-search"><fieldset class="pt-listings-location"><legend>Location</legend><div class="pt-listings-field pt-listings-address"><label>Starting address</label><input name="address" autocomplete="street-address" placeholder="Enter an address for a radius search"></div><div class="pt-listings-field"><label>Radius</label><select name="radius"><option value="1">1 mile</option><option value="3">3 miles</option><option value="5">5 miles</option><option value="10" selected>10 miles</option><option value="25">25 miles</option><option value="50">50 miles</option><option value="100">100 miles</option></select></div><div class="pt-listings-location-or" aria-hidden="true">OR SEARCH AN AREA</div><div class="pt-listings-field"><label>City</label><input name="city" autocomplete="address-level2"></div><div class="pt-listings-field"><label>State</label><input name="state" maxlength="2" autocomplete="address-level1"></div><div class="pt-listings-field"><label>ZIP code</label><input name="zipCode" inputmode="numeric" maxlength="5" autocomplete="postal-code"></div></fieldset><fieldset><legend>Property type</legend><div class="pt-listings-type-grid"><label class="pt-listings-check"><input type="checkbox" name="multiFamily" checked> 2–4 unit multifamily</label><label class="pt-listings-check"><input type="checkbox" name="apartment" checked> 5+ unit apartment</label><label class="pt-listings-check"><input type="checkbox" name="singleFamily"> Single family</label><label class="pt-listings-check"><input type="checkbox" name="condo"> Condo</label><label class="pt-listings-check"><input type="checkbox" name="townhouse"> Townhouse</label><label class="pt-listings-check"><input type="checkbox" name="manufactured"> Manufactured</label><label class="pt-listings-check"><input type="checkbox" name="land"> Land</label></div></fieldset><fieldset class="pt-listings-filter-grid"><legend>Property filters</legend><div class="pt-listings-field"><label>Minimum price</label><input name="minPrice" inputmode="numeric"></div><div class="pt-listings-field"><label>Maximum price</label><input name="maxPrice" inputmode="numeric"></div><div class="pt-listings-field"><label>Minimum bedrooms</label><input name="bedroomsMin" type="number" min="0"></div><div class="pt-listings-field"><label>Minimum bathrooms</label><input name="bathroomsMin" type="number" min="0" step=".5"></div><div class="pt-listings-field"><label>Minimum square feet</label><input name="squareFootageMin" inputmode="numeric"></div><div class="pt-listings-field"><label>Maximum square feet</label><input name="squareFootageMax" inputmode="numeric"></div><div class="pt-listings-field"><label>Built no earlier than</label><input name="yearBuiltMin" inputmode="numeric" maxlength="4"></div><div class="pt-listings-field"><label>Built no later than</label><input name="yearBuiltMax" inputmode="numeric" maxlength="4"></div><div class="pt-listings-field"><label>Listed within (days)</label><input name="daysOld" type="number" min="1"></div><div class="pt-listings-field"><label>Sort results</label><select name="sort"><option value="newest">Newest listings</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="units-desc">Most units</option></select></div></fieldset><button class="pt-listings-submit" type="submit">Search Listings</button></form><div class="pt-listings-note"><strong>Investment-first defaults:</strong> Multifamily and Apartment begin selected. Add or remove property types to match the opportunity you want to analyze.</div><div class="pt-listings-status" role="status">Enter a starting address and radius, a city and state, or a ZIP code to begin.</div><div class="pt-listings-grid"></div>`;
    const propertyFilters=panel.querySelector('.pt-listings-filter-grid');
    propertyFilters.insertAdjacentHTML('beforebegin','<fieldset class="pt-listing-types"><legend>Listing type</legend><div class="pt-listings-type-grid"><label class="pt-listings-check"><input type="checkbox" name="listingStandard" checked> Standard</label><label class="pt-listings-check"><input type="checkbox" name="listingNewConstruction" checked> New construction</label><label class="pt-listings-check"><input type="checkbox" name="listingForeclosure" checked> Foreclosure</label><label class="pt-listings-check"><input type="checkbox" name="listingShortSale" checked> Short sale</label></div></fieldset>');
    propertyFilters.insertAdjacentHTML('beforeend','<div class="pt-listings-field"><label>Maximum price per unit</label><input name="maxPricePerUnit" inputmode="numeric"></div><div class="pt-listings-field"><label>Minimum estimated monthly rent</label><input name="minEstimatedRent" inputmode="numeric"></div><div class="pt-listings-field"><label>Minimum annual NOI</label><input name="minNoi" inputmode="numeric"></div><div class="pt-listings-field"><label>Minimum estimated cap rate (%)</label><input name="minCapRate" type="number" min="0" max="100" step=".1"></div><div class="pt-listings-field"><label>Minimum supported value</label><input name="minSupportedValue" inputmode="numeric"></div><div class="pt-listings-field"><label>Operating expense assumption (%)</label><input name="expenseRatio" type="number" min="0" max="95" step="1" value="40"></div><div class="pt-listings-field"><label>Target cap rate (%)</label><input name="targetCapRate" type="number" min=".1" max="100" step=".1" value="6.5"></div>');
    addRangeFields(propertyFilters);organizePropertyFilters(propertyFilters);
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
  function open(){if(!signedIn()){window.PropertyThesisAuth?.open?.('signin','Sign in to search nationwide investment listings.');return;}ensurePanel();hideApplication(true);panel.classList.add('is-open');document.getElementById('appNavListings')?.classList.add('active');window.scrollTo({top:document.getElementById('appNavShell')?.offsetTop||0,behavior:'auto'});}
  function close(){panel?.classList.remove('is-open');hideApplication(false);document.getElementById('appNavListings')?.classList.remove('active');}
  function query(){
    const form=panel.querySelector('form');
    const raw=name=>form.elements[name].value.trim().replace(/[$,]/g,'');
    const types=[['singleFamily','Single Family'],['condo','Condo'],['townhouse','Townhouse'],['manufactured','Manufactured'],['multiFamily','Multi-Family'],['apartment','Apartment'],['land','Land']];
    const propertyTypes=types.filter(([name])=>form.elements[name].checked).map(([,type])=>type);
    const listingTypes=[['listingStandard','Standard'],['listingNewConstruction','New Construction'],['listingForeclosure','Foreclosure'],['listingShortSale','Short Sale']].filter(([name])=>form.elements[name].checked).map(([,type])=>type);
    const optional=['minPrice','maxPrice','bedroomsMin','bedroomsMax','bathroomsMin','bathroomsMax','squareFootageMin','squareFootageMax','lotSizeMin','lotSizeMax','yearBuiltMin','yearBuiltMax','daysOld','maxPricePerUnit','minEstimatedRent','minNoi','minCapRate','minSupportedValue','expenseRatio','targetCapRate'];
    const filters=Object.fromEntries(optional.map(name=>[name,raw(name)||null]));
    return{address:raw('address'),radius:raw('radius'),city:raw('city'),state:raw('state').toUpperCase(),zipCode:raw('zipCode'),...filters,propertyTypes,listingTypes,sort:raw('sort'),limit:18,offset};
  }
  async function search(){
    offset=0;const q=query();if(!q.address&&!q.zipCode&&!(q.city&&q.state)){setStatus('Enter a starting address, a ZIP code, or both a city and two-letter state code.');return;}if(!q.propertyTypes.length){setStatus('Select at least one property type.');return;}if(!q.listingTypes.length){setStatus('Select at least one listing type.');return;}const investmentSearch=['minEstimatedRent','minNoi','minCapRate','minSupportedValue'].some(name=>q[name]);setStatus(investmentSearch?'Searching listings and estimating investment performance…':'Searching active listings…');panel.querySelector('.pt-listings-grid').innerHTML='';
    try{const {sort,...request}=q;const {data,error}=await cloudClient.functions.invoke('rentcast-sale-listings',{body:request});if(error)throw error;results=Array.isArray(data?.listings)?data.listings:[];sortResults(sort);render();const total=Number.isFinite(Number(data?.totalCount))?` of ${Number(data.totalCount).toLocaleString()}`:'';setStatus(results.length?`${results.length}${total} matching active listing${Number(data?.totalCount||results.length)===1?'':'s'} loaded.`:'No matching listings were found. Try a nearby ZIP code or broader filters.');offset=results.length;}catch(err){setStatus(err?.message||'Listing search failed. Please try again.');}
  }
  function sortResults(mode){const n=v=>Number.isFinite(Number(v))?Number(v):0;if(mode==='price-asc')results.sort((a,b)=>n(a.price)-n(b.price));else if(mode==='price-desc')results.sort((a,b)=>n(b.price)-n(a.price));else if(mode==='units-desc')results.sort((a,b)=>n(b.units)-n(a.units));else results.sort((a,b)=>new Date(b.listedDate||0)-new Date(a.listedDate||0));}
  function setStatus(text){const el=panel?.querySelector('.pt-listings-status');if(el)el.textContent=text;}
  function facts(l){const investment=l.investment?`<div><b>${money(l.investment.estimatedRent)}/mo</b>Estimated rent</div><div><b>${Number(l.investment.capRate).toFixed(2)}%</b>Estimated cap rate</div>`:'';return `<div><b>${esc(value(l.units))}</b>Units reported</div><div><b>${esc(value(l.squareFootage&&Number(l.squareFootage).toLocaleString()))}</b>Square feet</div><div><b>${esc(value(l.yearBuilt))}</b>Year built</div><div><b>${esc(value(l.daysOnMarket))}</b>Days on market</div>${investment}`;}
  function render(){const grid=panel.querySelector('.pt-listings-grid');grid.innerHTML=results.map((l,i)=>`<article class="pt-listing-card">${streetView(l)}<div class="pt-listing-card-top"><span class="pt-listing-type">${esc(l.propertyType)}</span></div><div class="pt-listing-card-body"><div class="pt-listing-price">${money(l.price)}</div><div class="pt-listing-address">${esc(l.formattedAddress||l.addressLine1||'Address unavailable')}</div><div class="pt-listing-facts">${facts(l)}</div><div class="pt-listing-card-actions"><button type="button" data-detail="${i}">Open Listing</button><button type="button" class="primary" data-analyze="${i}">Analyze</button></div></div></article>`).join('');bindStreetViews(grid);grid.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(results[Number(b.dataset.detail)]));grid.querySelectorAll('[data-analyze]').forEach(b=>b.onclick=()=>importListing(results[Number(b.dataset.analyze)]));}
  const reportedBoolean=value=>value===true?'Yes':value===false?'No':'Not reported';
  function updateFeatureFacts(modal,features,error){
    const garage=features?.garage===true&&features?.garageSpaces?`Yes · ${features.garageSpaces} space${features.garageSpaces===1?'':'s'}`:reportedBoolean(features?.garage);
    const values={garage,garageType:features?.garageType||'Not reported',pool:reportedBoolean(features?.pool),poolType:features?.poolType||'Not reported'};
    modal.querySelectorAll('[data-property-feature]').forEach(el=>{el.textContent=error?'Unavailable':values[el.dataset.propertyFeature]||'Not reported';});
    const status=modal.querySelector('[data-feature-status]');if(status)status.textContent=error?'Additional public-record features could not be loaded.':'Garage and pool information comes from public property records and may vary by county.';
  }
  async function loadFeatureFacts(listing,modal){
    if(!listing.id){updateFeatureFacts(modal,null,true);return;}
    if(featureCache.has(listing.id)){updateFeatureFacts(modal,featureCache.get(listing.id),false);return;}
    try{const {data,error}=await cloudClient.functions.invoke('rentcast-sale-listings',{body:{action:'property-features',propertyId:listing.id}});if(error)throw error;const features=data?.features||{};featureCache.set(listing.id,features);if(activeListing?.id===listing.id)updateFeatureFacts(modal,features,false);}catch(_error){if(activeListing?.id===listing.id)updateFeatureFacts(modal,null,true);}
  }
  function detail(l){
    activeListing=l;let modal=document.getElementById('ptListingDetail');if(!modal){modal=document.createElement('div');modal.id='ptListingDetail';modal.className='pt-listing-detail';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('is-open')});}
    modal.innerHTML=`<article class="pt-listing-dialog" role="dialog" aria-modal="true" aria-labelledby="ptListingTitle">${streetView(l)}<header class="pt-listing-dialog-head"><div><span class="pt-listing-type">${esc(l.propertyType)}</span><h3 id="ptListingTitle">${esc(l.formattedAddress||'Investment property')}</h3></div><button class="pt-listings-close" type="button">Close</button></header><div class="pt-listing-dialog-body"><div class="pt-listing-detail-price">${money(l.price)}</div><div class="pt-listing-detail-grid">${facts(l)}<div><b>${esc(value(l.bedrooms))}</b>Bedrooms reported</div><div><b>${esc(value(l.bathrooms))}</b>Bathrooms reported</div><div><b>${esc(value(l.lotSize&&Number(l.lotSize).toLocaleString()))}</b>Lot square feet</div><div><b>${esc(value(l.listingType))}</b>Listing type</div><div><b>${esc(value(l.mlsNumber))}</b>Listing number</div></div><section class="pt-listing-features"><header><h4>Property features</h4><span data-feature-status>Loading garage and pool information…</span></header><div class="pt-listing-feature-grid"><div><b data-property-feature="garage">Loading…</b>Garage</div><div><b data-property-feature="garageType">Loading…</b>Garage type</div><div><b data-property-feature="pool">Loading…</b>Pool</div><div><b data-property-feature="poolType">Loading…</b>Pool type</div></div></section><button class="pt-listings-action" type="button" data-import>Analyze This Property</button><div class="pt-listing-attribution">Listing information provided by RentCast${l.mlsName?` from ${esc(l.mlsName)}`:''}. Exterior imagery is supplied separately by Google Street View and is not listing photography. Verify all information independently before making an investment decision.</div></div></article>`;
    bindStreetViews(modal);modal.querySelector('.pt-listings-close').onclick=()=>modal.classList.remove('is-open');modal.querySelector('[data-import]').onclick=()=>importListing(activeListing);modal.classList.add('is-open');loadFeatureFacts(l,modal);
  }
  function importListing(l){
    const minimumUnits=l.propertyType==='Apartment'?5:l.propertyType==='Multi-Family'?2:1;
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
    else window.PropertyThesisAuth?.open?.('signin','Sign in to search nationwide investment listings.');
  }
  function start(){ensurePanel();let tries=0;const timer=setInterval(()=>{ensureButton();if(++tries>40)clearInterval(timer)},180);document.addEventListener('click',e=>{if(e.target.closest('#appNavShell .app-nav-action:not(#appNavListings)'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('ptListingDetail')?.classList.remove('is-open')});try{cloudClient?.auth?.onAuthStateChange?.(()=>setTimeout(ensureButton,120));}catch(_e){}setTimeout(requested,900);}
  window.PropertyThesisListingSearch={open,close,search,importListing};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

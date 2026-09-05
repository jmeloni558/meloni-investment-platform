'use strict';
(() => {
  if(window.PropertyThesisAnalytics || window.top!==window.self)return;
  const ID='G-3Y51BMR6FC',KEY='ptAnalyticsConsentV1',EXCLUDE='ptAnalyticsExcludeV1';
  const HOSTS=new Set(['propertythesis.com','www.propertythesis.com']);
  const PAGES=new Set(['index.html','app-core.html','pricing.html','glossary.html','guides.html','privacy.html','terms.html','sample-property-card.html','sample-report-viewer.html','sample-pro-forma-viewer.html','mortgage-tools.html','how-to-analyze-rental-property.html','cap-rate-guide.html','dscr-guide.html','cash-on-cash-return-guide.html','rental-property-cash-flow-guide.html','irr-vs-cash-on-cash-return.html']);
  const SECTIONS=new Set(['assumptions','dashboard','report','scenarios','cloud','buydown','cashflow','debt','taxes','amort','support']);
  const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const write=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
  const page=()=>{const p=location.pathname.split('/').pop()||'index.html';return PAGES.has(p)?(p==='app-core.html'?'index.html':p):'other';};
  const safeLocation=()=>`https://propertythesis.com/${page()==='index.html'?'':page()}`;
  const referrer=()=>{try{return new URL(document.referrer).origin+'/'}catch{return ''}};
  let consent=read(KEY)==='granted',excluded=read(EXCLUDE)==='1',loaded=false,lastScreen='',timer;
  const permitted=()=>HOSTS.has(location.hostname)&&consent&&!excluded&&navigator.globalPrivacyControl!==true;
  const gtag=function(){window.dataLayer.push(arguments)};
  function event(name,params={}){
    if(!permitted()||!loaded)return;
    gtag('event',name,{...params,page_location:safeLocation(),page_title:`PropertyThesis | ${page()}`,page_referrer:referrer()});
  }
  function screen(){
    const selected=document.querySelector('.section.active')?.id;
    const current=document.body.classList.contains('pt-guest-listings')||document.querySelector('#ptListingsPanel.is-open')?'listings':SECTIONS.has(selected)?selected:'home';
    if(current!==lastScreen){lastScreen=current;event('workspace_view',{workspace:current});}
  }
  function start(){
    if(!permitted())return;
    window['ga-disable-'+ID]=false;
    if(loaded){gtag('consent','update',{analytics_storage:'granted'});lastScreen='';screen();return;}
    loaded=true;window.dataLayer=window.dataLayer||[];
    gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('consent','update',{analytics_storage:'granted'});
    gtag('js',new Date());
    // Never let automatic page titles, raw URLs, forms or search terms reach GA.
    const config={send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:safeLocation(),page_title:`PropertyThesis | ${page()}`,page_referrer:referrer()};
    const q=new URLSearchParams(location.search);
    const sources=new Set(['tiktok','facebook','linkedin','instagram','youtube','google']);
    const media=new Set(['organic_social','social','email','organic']);
    if(sources.has(q.get('utm_source')))config.campaign_source=q.get('utm_source');
    if(media.has(q.get('utm_medium')))config.campaign_medium=q.get('utm_medium');
    if(['launch','launch_week'].includes(q.get('utm_campaign')))config.campaign_name=q.get('utm_campaign');
    gtag('config',ID,config);
    const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ID;script.id='ptGoogleAnalyticsTag';document.head.appendChild(script);
    event('page_view');screen();
  }
  function stop(){
    window['ga-disable-'+ID]=true;
    if(loaded)gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    for(const name of ['_ga','_ga_3Y51BMR6FC'])for(const domain of ['',`; domain=${location.hostname}`,'; domain=.propertythesis.com'])document.cookie=`${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
  }
  function close(){document.getElementById('ptAnalyticsChoices')?.remove();}
  function choose(value){consent=value==='granted';write(KEY,value);close();if(consent)start();else stop();}
  function preferences(){
    if(document.getElementById('ptAnalyticsChoices'))return;
    const box=document.createElement('section');box.id='ptAnalyticsChoices';box.setAttribute('role','region');box.setAttribute('aria-label','Analytics privacy choices');
    box.innerHTML='<strong>Help us improve PropertyThesis</strong><p>With your permission, Google Analytics uses cookies to measure visits and general site activity. We do not send property addresses, financial inputs or chat messages. Optional analytics stays off unless you allow it.</p><a href="privacy.html">Privacy Policy</a><div class="pt-analytics-actions"><button type="button" data-choice="granted">Allow analytics</button><button type="button" data-choice="denied">Decline analytics</button><button type="button" data-exclude>Exclude this browser from testing counts</button><button type="button" data-close>Close</button></div><small></small>';
    box.querySelector('small').textContent=excluded?'This browser is excluded from Analytics.':navigator.globalPrivacyControl===true?'Global Privacy Control is enabled; analytics remains off.':'You can change this choice in the footer at any time.';
    if(excluded)box.querySelector('[data-exclude]').textContent='Remove browser testing exclusion';
    box.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.choice)));
    box.querySelector('[data-exclude]').addEventListener('click',()=>{excluded=!excluded;write(EXCLUDE,excluded?'1':'0');if(excluded)stop();else start();close();preferences();});
    box.querySelector('[data-close]').addEventListener('click',close);
    document.body.appendChild(box);
  }
  function init(){
    const css=document.createElement('link');css.rel='stylesheet';css.href='site-analytics.css?v=1';document.head.appendChild(css);
    const link=document.createElement('button');link.type='button';link.id='ptAnalyticsPreferences';link.textContent='Analytics preferences';link.addEventListener('click',preferences);
    (document.querySelector('.pt-footer-legal')||document.body).appendChild(link);
    document.addEventListener('click',e=>{
      const target=e.target?.closest?.('button,a');if(!target)return;
      if(target.matches('.pt-free-analysis-cta,#s10NewAnalysis'))event('analysis_start_click');
      if(target.matches('#s10ReviewResults,#calculateBtn,#quickCalc'))event('analysis_review_click');
      if(target.matches('#rbDownloadPdf,#rbDownloadProForma'))event('report_export_click',{format:target.id==='rbDownloadPdf'?'pdf':'xlsx'});
    },true);
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(screen,250)}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('storage',e=>{if(e.key===KEY||e.key===EXCLUDE){consent=read(KEY)==='granted';excluded=read(EXCLUDE)==='1';permitted()?start():stop();}});
    if(read(KEY)===null&&!excluded&&navigator.globalPrivacyControl!==true)preferences();
    start();
  }
  window.PropertyThesisAnalytics={preferences,version:1};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

// Run from the work browser, where the dashboard and the private Maps list are signed in.
const syncPage='https://propertythesis.com/inspection-sync.html';
let inspectionRun;
async function onTab(id,func,...args){
  const [result]=await chrome.scripting.executeScript({target:{tabId:id},world:'MAIN',func,args});
  return result?.result;
}
async function dashboardRpc(name,args){
  if(location.origin!=='https://propertythesis.com')return {unavailable:true};
  const db=window.PropertyThesisSession?.getClient();
  if(!db || !(await db.auth.getSession()).data.session)return {unavailable:true};
  const {data,error}=await db.rpc(name,args);
  return error?{error:true}:{data};
}
async function mapsPage(job,step){
  const wait=async fn=>{
    const end=Date.now()+18000;
    do{const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,250));}while(Date.now()<end);
    throw Error('Google Maps did not show the expected '+step+' controls.');
  };
  try{
    if(location.origin!=='https://www.google.com' || !location.pathname.startsWith('/maps'))throw Error('Sign in to Google Maps in Edge.');
    const account=await wait(()=>document.querySelector('[aria-label*="Google Account"]'));
    if(!account.getAttribute('aria-label').toLowerCase().includes('('+job.account.toLowerCase()+')'))throw Error('Check the Google Maps account in Edge.');
    if(['list','remove','confirmRemoval'].includes(step)){
      await wait(()=>Array.from(document.querySelectorAll('h1')).some(e=>e.textContent.trim()===job.listName));
      if(!location.href.includes(new URL(job.listUrl).pathname.split('!2s').pop().split('!')[0]))throw Error('Unexpected Maps list.');
      if(step==='list')return {ok:true};
    }
    const normalize=s=>s.toLowerCase().replace(/(?:\s+#\s*|\s+(?:apt\.?|unit)\s+)[a-z0-9-]+\b/g,' ').replace(/[.,'’]/g,'')
      .replace(/\b(street|avenue|drive|road|lane|court|place|circle|trail|boulevard|terrace|parkway|loop|north|south|east|west)\b/g,
        w=>({street:'st',avenue:'ave',drive:'dr',road:'rd',lane:'ln',court:'ct',place:'pl',circle:'cir',trail:'trl',boulevard:'blvd',terrace:'ter',parkway:'pkwy',loop:'lp',north:'n',south:'s',east:'e',west:'w'})[w])
      .replace(/\s+/g,' ').trim();
    if(step==='remove' || step==='confirmRemoval'){
      const main=document.querySelector('main,[role="main"]');
      const entries=await wait(()=>{
        const countText=Array.from(main.querySelectorAll('h2,[role="heading"]')).map(el=>el.textContent).join(' ');
        const match=countText.match(/(?:^|[^\d,])([\d,]+) places?\b/i);
        if(!match)return false;
        const buttons=Array.from(main.querySelectorAll('button'));
        const rows=buttons.filter(b=>b.parentElement?.parentElement?.querySelector('button[aria-label="Delete"]') &&
          !['Delete','Add note'].includes(b.getAttribute('aria-label')) && b.innerText.split('\n').filter(Boolean).length>=2);
        return rows.length===Number(match[1].replace(/,/g,''))?{rows}:false;
      }).catch(()=>null);
      if(!entries){
        if(step==='remove')return {ok:true,missing:true};
        throw Error('Could not verify the reloaded Inspections list.');
      }
      const matches=entries.rows.filter(b=>normalize(b.innerText)===normalize(job.address));
      if(matches.length>1)throw Error('More than one saved place matches this address.');
      if(!matches.length){
        // A Maps alias can change the city or street spelling. Verify through
        // the place details instead of treating a missing text match as success.
        return {ok:true,missing:true};
      }
      if(step==='confirmRemoval')throw Error('Google Maps has not confirmed the change.');
      const removes=matches[0].parentElement.parentElement.querySelectorAll('button[aria-label="Delete"]');
      if(removes.length!==1)throw Error('Cannot identify the saved place removal button.');
      removes[0].click();
      await wait(()=>!main.contains(matches[0]) || normalize(matches[0].innerText)!==normalize(job.address));
      return {ok:true};
    }
    const address=await wait(()=>document.querySelector('button[data-item-id="address"],button[aria-label^="Address:"],[role="button"][data-tooltip="Copy address"]'));
    const displayed=address.getAttribute('aria-label')?.replace(/^Address:?\s*/i,'') || address.innerText.split("\n").find(line=>/\d{5}/.test(line)) || "";
    if(normalize(displayed)!==normalize(job.address))throw Error('Maps address differs. Verify the full saved order address.');
    const actions=await wait(()=>document.querySelector('[role="region"][aria-label^="Actions for"],[role="group"][aria-label^="Actions for"]'));
    const save=await wait(()=>Array.from(actions.querySelectorAll('button')).find(b=>/^(save|saved)$/i.test(b.getAttribute('aria-label')||b.innerText.trim())));
    save.click();
    const option=await wait(()=>{
      const items=Array.from(document.querySelectorAll('[role="menuitemradio"]')).filter(el=>el.innerText.split('\n').some(line=>line.trim()===job.listName));
      if(items.length>1)throw Error('Multiple Google Maps lists have this name.');
      return items[0];
    });
    const checked=option.getAttribute('aria-checked');
    if(!['true','false'].includes(checked))throw Error('Cannot verify list membership.');
    if((checked==='true')!==job.wanted){
      if(step==='verify')throw Error('Google Maps has not confirmed the change.');
      option.click();
      await wait(()=>!option.isConnected || option.getAttribute('aria-checked')===String(job.wanted));
    }
    return {ok:true};
  }catch(e){return {error:e.message};}
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function loaded(id,expected){
  const end=Date.now()+25000;
  do{const t=await chrome.tabs.get(id);if(t.status==='complete' && t.url?.startsWith(expected))return;await delay(300);}while(Date.now()<end);
  throw Error('Timed out opening sync page.');
}
async function syncInspections(){
  if(!(await chrome.storage.local.get("inspectionSync")).inspectionSync)return;
  const [existing]=await chrome.tabs.query({url:syncPage});
  const bridge=existing || await chrome.tabs.create({url:syncPage,active:false});
  const pt=bridge.id;
  await loaded(pt,syncPage);
  const {data:job}=await onTab(pt,dashboardRpc,'claim_inspection_place',{});
  if(!job)return;
  let tab,error;
  try{
    const list=new URL(job.listUrl);
    if(list.origin!=='https://www.google.com' || !list.pathname.startsWith('/maps/'))throw Error('Invalid Maps list URL.');
    tab=await chrome.tabs.create({url:list.href,active:false});
    await loaded(tab.id,'https://www.google.com/maps/');
    const check=async step=>{
      const res=await onTab(tab.id,mapsPage,job,step);
      if(!res?.ok)throw Error(res?.error||'Could not inspect Maps.');
      return res;
    };
    if(!job.wanted && !(await check('remove')).missing){
      await chrome.tabs.reload(tab.id);
      await loaded(tab.id,'https://www.google.com/maps/');
      await check('confirmRemoval');
    }else{
      await check('list');
      await chrome.tabs.update(tab.id,{url:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(job.address.replace(/(?:\s+#\s*|\s+(?:apt\.?|unit)\s+)[a-z0-9-]+\b/ig,''))+'&hl=en'});
      await loaded(tab.id,'https://www.google.com/maps/');
      await check('sync');
      await delay(1200);
      await chrome.tabs.reload(tab.id);
      await loaded(tab.id,'https://www.google.com/maps/');
      await check('verify');
    }
  }catch(e){error=e.message;}
  finally{if(tab)await chrome.tabs.remove(tab.id).catch(()=>{});}
  const finished=await onTab(pt,dashboardRpc,'finish_inspection_place',{job_lease:job.lease,observed:job.wanted,failure:error||null});
  return finished && 'data' in finished;
}
function startInspectionSync(){
  inspectionRun??=(async()=>{for(let i=0;i<12 && await syncInspections();i++){} })().catch(e=>console.warn('Inspections sync:',e.message)).finally(()=>{inspectionRun=null;});
  return inspectionRun;
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='inspection-sync')startInspectionSync();});
function scheduleInspectionSync(){chrome.alarms.create('inspection-sync',{delayInMinutes:0.2,periodInMinutes:1});}
chrome.runtime.onInstalled.addListener(scheduleInspectionSync);
chrome.runtime.onStartup.addListener(scheduleInspectionSync);

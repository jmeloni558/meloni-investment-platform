'use strict';
const $=id=>document.getElementById(id);
let payload,review,tabId;
$('file').onchange=async()=>{
  review=null;payload=null;$('rows').replaceChildren();$('preview').disabled=$('fill').disabled=true;
  try{
    const file=$('file').files[0];
    if(!file||file.size>200000)throw Error('Choose a BOA JSON transfer file under 200 KB.');
    const p=JSON.parse(await file.text());
    if(p.format!=='propertythesis-boa'||p.version!==1)throw Error('Choose a PropertyThesis Service Link - BOA file.');
    payload=p;$('preview').disabled=false;$('status').textContent='Loaded. Preview the open page.';
  }catch(e){$('status').textContent=e.message;}
};
async function run(fill){
  $('file').disabled=$('preview').disabled=$('fill').disabled=true;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.url?.startsWith('https://www.acisky.com/formlayout/index')||fill&&tab.id!==tabId)throw Error('Open the matching BOA form and preview this page.');
    const target={tabId:tab.id};
    await chrome.scripting.executeScript({target,files:['schema.js','adapter.js']});
    const [response]=await chrome.scripting.executeScript({target,func:async(p,r)=>{try{return await globalThis.inspectBOA(p,r);}catch(e){return {error:e.message};}},args:[payload,fill?review:null]});
    if(!response.result)throw Error(response.error?.message||'Preview failed. Check the page and subject address.');
    const result=response.result;
    if(result.error)throw Error(result.error);
    $('rows').replaceChildren(...result.rows.map(f=>{const li=document.createElement('li');li.textContent=f.group+' '+f.tag+' — '+f.value+' ('+f.status+')';return li;}));
    tabId=tab.id;review=fill?null:result;
    $('status').textContent='Page '+result.page+' · '+result.rows.filter(f=>f.status===(fill?'filled':'ready')).length+(fill?' fields filled. Review in Sky.':' blank fields ready.')+(payload.warnings?.length?' '+payload.warnings.join(' '):'');
  }catch(e){review=null;$('rows').replaceChildren();$('status').textContent=e.message;}
  finally{$('file').disabled=$('preview').disabled=false;$('fill').disabled=!review?.rows.some(f=>f.status==='ready');}
}
$('preview').onclick=()=>run(false);$('fill').onclick=()=>run(true);

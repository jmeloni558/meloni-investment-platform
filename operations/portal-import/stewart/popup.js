'use strict';
const $=id=>document.getElementById(id);
let payload;
$('file').onchange=async()=>{
  payload=null;
  const photoWorkflow=new URL('https://propertythesis.com/photos.html?stewart=1');
  $('photoWorkflow').href=photoWorkflow.href;
  $('rows').replaceChildren();
  $('apply').disabled=$('preview').disabled=true;
  $('subject').textContent='';
  const file=$('file').files[0];
  try{
    if(!file||file.size>200000)throw Error('Choose a Stewart transfer smaller than 200 KB.');
    const next=JSON.parse(await file.text());
    if(file!==$('file').files[0])return;
    validateStewart(next);
    payload=preparedStewart(next);
    const {address,city,state,zip}=next.subject;
    photoWorkflow.searchParams.set('address',[address,city,[state,zip].filter(Boolean).join(' ')].filter(Boolean).join(', '));
    $('photoWorkflow').href=photoWorkflow.href;
    $('subject').textContent='Confirm the open order is for '+Object.values(next.subject).join(', ')+'.';
    $('status').textContent='';
    $('apply').disabled=$('preview').disabled=false;
  }catch(error){$('status').textContent=error.message;}
};
$('preview').onclick=()=>run(false);
$('apply').onclick=()=>run(true);
async function run(apply){
  $('file').disabled=$('apply').disabled=$('preview').disabled=true;
  $('rows').replaceChildren();
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.url?.startsWith('https://'))throw Error('Open the Stewart HomeSteps form.');
    if(apply && !/^https:\/\/www\.protk\.com\/ProTeck\.Fulfillment\.Case\.Forms\/CaseFormPortal\/DataEntry\/\d+\/?(?:[?#].*)?$/i.test(tab.url))throw Error('Open a Stewart HomeSteps order.');
    $('status').textContent=apply?'Looking up comps and waiting for Stewart to populate each slot...':'Reading selected comps...';
    const [response]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:apply?importStewartComps:readStewartGrid,args:apply?[payload]:[]});
    if(!response?.result)throw Error('Open the Selected Comparables grid on the Stewart HomeSteps form.');
    const rows=apply?response.result:reviewStewart(payload,response.result);
    for(const text of rows){
      const row=document.createElement('li');
      row.textContent=text;
      $('rows').append(row);
    }
    $('status').textContent=apply?'Review the import results below.':'Preview complete. Review blank fields and mismatches in Stewart.';
  }catch(error){$('status').textContent=error.message;}
  finally{$('file').disabled=$('apply').disabled=$('preview').disabled=false;}
};

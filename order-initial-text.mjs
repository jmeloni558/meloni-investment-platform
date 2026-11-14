export function templateFor(kind){
  if(/BPO/i.test(kind))return 'bpo';
  if(/PCR|Property Condition/i.test(kind))return 'pcr';
  if(/PDCR|Data Collection/i.test(kind))return 'data';
  return '';
}
export function initialMessage(type, values){
  const v=key=>String(values[key]||'').trim()||'['+key+']';
  const intro=`Hello, this is Jamie Meloni with Meloni Realty. I was hired by ${v('client')} on behalf of ${v('sub-client')} `;
  const end=` My next availability is ${v('availability')}. If that does not work, please let me know your availability please thank you.`;
  if(type==='pcr')return intro+`to take photos of your home at ${v('address')} for your loan application. I need to schedule a time to come by and get a photo or two of each room and around the exterior, and it will take 5-10 minutes.`+end;
  if(type==='bpo')return intro+`to do a BPO (valuation) on your home at ${v('address')} for ${v('reason')}. I need to schedule a time to come by and get a photo or two of each room and around the exterior, and it will take 5-10 minutes.`+end;
  return intro+`to do a data collection report on your home at ${v('address')} for your loan application. In short, this is part of the valuation process and I am hired to take photos of all of the rooms and around the exterior, answer basic questions about the home and then scan the floor plan. I will need access to all rooms, closets, sheds, garage etc. to complete and it will take about 60 minutes to complete, and I will pass through each area of the home twice, once for photos and then the floor plan scan.`+end;
}
export function openInitialText({number,kind,client,address}){
  const dialog=document.createElement('dialog');
  dialog.setAttribute('aria-label','Initial text message');
  dialog.style.cssText='width:min(650px,90vw);max-height:90vh;overflow:auto;border:1px solid #88aaa7;border-radius:14px;padding:24px;color:#183d43';
  dialog.innerHTML=`<form method="dialog"><h2>Initial text message</h2><p class="recipient"></p><div class="text-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"></div><label style="display:block;margin-top:16px">Message<textarea class="message" rows="10" style="display:block;width:100%;box-sizing:border-box;margin:8px 0" required></textarea></label><p class="feedback" role="status"></p><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="open">Open in Phone Link</button><button type="button" class="copy">Copy message</button><button value="cancel">Cancel</button></div><p>You review and send the text in your messaging app.</p></form>`;
  dialog.querySelector('.recipient').textContent='To: '+number;
  const fields=dialog.querySelector('.text-fields'),inputs={};
  const label=document.createElement('label');label.textContent='Template';
  const select=document.createElement('select');select.style.cssText='display:block;width:100%';
  for(const [value,text] of [['','Blank text'],['pcr','Property Condition Report'],['bpo','BPO'],['data','Data Collection Report']])select.add(new Option(text,value));
  select.value=templateFor(kind);label.append(select);fields.append(label);
  for(const [key,title,value] of [['client','Client',client],['address','Property address',address],['sub-client','Sub-client',''],['availability','Availability',''],['reason','Reason','']]){
    const l=document.createElement('label');l.textContent=title;
    const input=document.createElement('input');input.value=value||'';input.setAttribute('aria-label',title);input.autocomplete='off';input.style.cssText='display:block;width:100%;box-sizing:border-box';
    inputs[key]=input;l.append(input);fields.append(l);
  }
  const message=dialog.querySelector('.message'),feedback=dialog.querySelector('.feedback');
  let manual=false;
  function render(){inputs.reason.parentElement.hidden=select.value!=='bpo';message.value=select.value?initialMessage(select.value,Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.value]))):'';manual=false;}
  function regenerate(){if(manual&&!window.confirm('Replace your message edits with the updated template?'))return;render();}
  select.onchange=regenerate;
  for(const input of Object.values(inputs))input.oninput=()=>{if(!manual)render();else feedback.textContent='Your edited message is preserved. Update the message directly to include further field changes.';};
  message.oninput=()=>{manual=true;feedback.textContent='';};
  dialog.querySelector('.copy').onclick=async()=>{try{await navigator.clipboard.writeText(message.value);feedback.textContent='Message copied.';}catch{feedback.textContent='Select the message and copy it manually.';}};
  dialog.querySelector('.open').onclick=()=>{
    if(!message.value.trim()||/\[(address|client|sub-client|availability|reason)\]/i.test(message.value)){feedback.textContent='Fill in the remaining bracketed fields or edit them out of the message first.';return;}
    const link=document.createElement('a');link.href='sms:'+number+'?body='+encodeURIComponent(message.value);link.click();
    feedback.textContent='Opened your default messaging app. If Phone Link omits the message, use Copy message and paste it there.';
  };
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  document.body.append(dialog);render();dialog.showModal();inputs['sub-client'].focus();
}

(()=>{
 if(globalThis.ptStewartPhotoListener)return;
 const wait=async(fn,message,ms=25000)=>{const end=Date.now()+ms;do{const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,250));}while(Date.now()<end);throw Error(message)};
 const visible=e=>e&&e.getClientRects().length;
 const manager=()=>document.querySelector('#divCaseFileManager');
 const panels=()=>Array.from(manager()?.querySelectorAll('.photoPanel')||[]);
 const name=p=>p.querySelector('h3')?.textContent.trim().toLowerCase();
 const card=n=>{const matches=panels().filter(p=>name(p)===n.toLowerCase());if(matches.length>1)throw Error('Duplicate gallery filename: '+n);return matches[0]};
 const select=p=>p?.querySelector('select.photoAndFileLabel'), repair=p=>p?.querySelector('input[type="radio"][value="false"]');
 async function open(){if(!visible(manager())){document.querySelector('#PhotoAndFileLink a, a#PhotoAndFileLink')?.click();}
 return wait(()=>visible(manager())&&manager().querySelector('input[type=file]'),'Open Photos/Files in the Stewart order and retry.');}
 async function handle(m){
 if(location.href!==m.target.url)throw Error('The order changed.');
 if(m.op==='begin'){await open();return panels().filter(name).map(p=>[name(p),select(p)?.selectedOptions[0]?.textContent.trim()||''])}
 if(!visible(manager()))throw Error('The gallery was closed. Reopen and retry.');
 if(m.op==='file'){
 let p=card(m.name);
 if(!p){
 if(!m.data)throw Error('A previously uploaded photo is missing: '+m.name);
 const bytes=Uint8Array.from(atob(m.data),c=>c.charCodeAt(0)),file=new File([bytes],m.name,{type:'image/jpeg'}),dt=new DataTransfer();dt.items.add(file);
 const input=manager().querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 p=await wait(()=>card(m.name),'Stewart did not show '+m.name+'. Check the gallery before retrying.',45000);
 }
 const s=select(p);if(!s)throw Error('Missing label control: '+m.name);
 if(!s.selectedOptions[0]?.textContent.trim()){let opt=[...s.options].find(o=>o.textContent.trim()===m.label&&!o.disabled);
 if(!opt)throw Error('Choose another label for '+m.name+'; '+m.label+' is unavailable.');
 s.value=opt.value;s.dispatchEvent(new Event('change',{bubbles:true}));}
 if(m.no){const r=await wait(()=>repair(card(m.name)),'Missing repair control: '+m.name);if(!r.checked)r.click();if(!repair(card(m.name))?.checked)throw Error('Repair answer was not selected for '+m.name);}
 return true;
 }
 if(m.op==='finish'){
 const link=[...manager().querySelectorAll('a')].find(a=>a.textContent.trim().toLowerCase()==='save and exit'&&visible(a));if(!link)throw Error('Save and Exit is unavailable.');link.click();
 await wait(()=>!visible(manager()),'Stewart did not close the gallery after saving.');await open();
 await wait(()=>card(m.names[0]),'Saved photos could not be verified.');
 for(const [i,n] of m.names.entries()){const p=card(n);if(!p||select(p)?.selectedOptions[0]?.textContent.trim()!==m.labels[i]||(m.no&&!repair(p)?.checked))throw Error('Saved settings could not be verified for '+n);}
 return m.names.length;
 }
 throw Error('Unknown photo action');}
 globalThis.ptStewartPhotoListener=true;chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.kind!=='pt-gallery')return;handle(m).then(value=>reply({ok:true,value}),e=>reply({ok:false,error:e.message}));return true;});
})();
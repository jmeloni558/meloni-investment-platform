'use strict';
(() => {
  const client = window.__ptSharedSupabaseClient;
  if (!client || window.ClientDirectory) return;
  let userId = null, allowed = false, revision = 0, rows = [], dialog, trigger, editor;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function clear() {
    rows = [];
    editor?.close(); editor?.remove(); editor = null;
    if (dialog) { dialog.close(); dialog.remove(); dialog = null; }
  }
  function navigation() {
    const host = document.querySelector('.app-nav-actions');
    let button = document.getElementById('appNavClientDirectory');
    if (!allowed) { button?.remove(); return; }
    if (!host || button) return;
    button = el('button', 'Client Directory', 'app-nav-action');
    button.type = 'button'; button.id = 'appNavClientDirectory';
    button.onclick = () => open(button);
    host.append(button);
  }
  async function access(user) {
    const version = ++revision;
    userId = user?.id || null; allowed = false; clear(); navigation();
    if (!userId) return;
    try {
      const { data, error } = await client.from('client_directory_members').select('user_id').eq('user_id', userId).maybeSingle();
      if (version !== revision) return;
      allowed = !error && !!data;
      navigation();
    } catch (_) { /* Fail closed. */ }
  }
  function detail(parent, label, value) {
    if (!value) return;
    const line = el('p'); line.append(el('strong', label + ': '), document.createTextNode(value)); parent.append(line);
  }
  function draw() {
    if (!dialog) return;
    const term = dialog.querySelector('input').value.trim().toLowerCase();
    const deleted = dialog.querySelector('[data-trash]').checked;
    const visible = rows.filter(r => !!r.deleted_at === deleted);
    const matches = visible.filter(r => [r.name, r.company, r.job_title, r.address, r.keywords, r.notes, ...(r.emails || []), ...(r.phones || []).map(p=>p.value)].join(' ').toLowerCase().includes(term));
    dialog.querySelector('[data-count]').textContent = `${matches.length} of ${visible.length} ${deleted ? 'deleted ' : ''}contacts`;
    const list = dialog.querySelector('[data-results]'); list.replaceChildren();
    if (!matches.length) { list.append(el('p', rows.length ? 'No contacts match your search.' : 'No contacts have been imported yet.')); return; }
    for (const row of matches) {
      const card = el('article', undefined, 'pt-directory-card');
      card.append(el('h3', row.name));
      if (row.company) card.append(el('p', row.company, 'pt-directory-company'));
      if (row.job_title) card.append(el('p', row.job_title));
      const links = el('div', undefined, 'pt-directory-links');
      for (const email of row.emails || []) {
        const link = el('a', email); link.href = 'mailto:' + encodeURIComponent(email); links.append(link);
      }
      for (const phone of row.phones || []) {
        const line = el('span', `${phone.label}: ${phone.value}`); links.append(line);
      }
      card.append(links);
      detail(card, 'Address', row.address);
      card.append(el('p', row.keywords, 'pt-directory-tags'));
      const more = el('details'); more.append(el('summary', 'Contact details & notes'));
      if (row.notes) more.append(el('p', row.notes, 'pt-directory-notes'));
      else more.append(el('p', 'No CRM notes.'));
      if (row.source_text) { const source = el('details'); source.append(el('summary', 'Original CRM record'), el('pre', row.source_text)); more.append(source); }
      const actions = el('div', undefined, 'pt-directory-actions');
      for (const [label, action] of row.deleted_at ? [['Restore',()=>changeDeleted(row,false)]] : [['Edit',()=>edit(row)],['Delete',()=>changeDeleted(row,true)]]) {
        const button = el('button', label); button.type='button'; button.onclick=action; actions.append(button);
      }
      card.append(actions);
      card.append(more); list.append(card);
    }
  }
  async function load() {
    if (!allowed || !dialog) return;
    const version = revision, currentDialog = dialog;
    const status = dialog.querySelector('[data-status]');
    const refresh = dialog.querySelector('[data-refresh]');
    refresh.disabled = true; status.textContent = 'Loading contacts…';
    try {
      const {data,error} = await client.from('client_directory').select('*').order('name').limit(1000);
      if (version !== revision || dialog !== currentDialog) return;
      if (error) throw error;
      rows = data || []; draw();
      status.textContent = rows.length ? 'Private contacts · Changes are shared across your authorized accounts.' : 'Your directory is ready.';
    } catch (_) {
      if (version !== revision || dialog !== currentDialog) return;
      rows = []; dialog.querySelector('[data-results]').replaceChildren();
      dialog.querySelector('[data-count]').textContent = '';
      status.textContent = 'Unable to load the directory. Please refresh or sign in again.';
    } finally { refresh.disabled = false; }
  }
  function formDialog(title) {
    editor?.close(); editor?.remove();
    const modal = el('dialog', undefined, 'pt-directory-editor'); editor = modal;
    const heading = el('h2', title); heading.id='ptDirectoryEditorTitle'; modal.setAttribute('aria-labelledby',heading.id); modal.append(heading);
    document.body.append(modal); return modal;
  }
  async function write(payload, row) {
    if (!allowed) throw new Error('Please sign in again.');
    const query = row
      ? client.from('client_directory').update({...payload,revision:row.revision+1}).eq('source_id',row.source_id).eq('revision',row.revision)
      : client.from('client_directory').insert({...payload,source_id:'manual:'+crypto.randomUUID(),source_text:'',source_fields:{}});
    const {data,error} = await query.select('source_id').maybeSingle();
    if (error) throw new Error('Unable to save this contact. Please check your connection and try again.');
    if (!data) throw new Error('This contact changed in another session. Close this form, refresh the directory, and try again.');
  }
  function edit(row) {
    if (!allowed) return;
    const modal = formDialog(row ? 'Edit contact' : 'Add contact');
    const form = el('form'); const fields = {};
    for (const [key,label,multiline] of [['name','Name',false],['company','Company',false],['job_title','Job title',false],['address','Address',true],['emails','Emails (one per line)',true],['phones','Phones (one per line, e.g. Office: 813-555-0100)',true],['keywords','Keywords',false],['notes','Notes',true]]) {
      const wrapper=el('label',label), input=el(multiline?'textarea':'input'); input.name=key; input.id='ptContact_'+key; wrapper.htmlFor=input.id;
      input.value=key==='emails'?(row?.emails||[]).join('\n'):key==='phones'?(row?.phones||[]).map(p=>p.label+': '+p.value).join('\n'):(row?.[key] || (key==='keywords'?'BPO Contacts':''));
      if(key==='name') {input.required=true; input.maxLength=300;}
      fields[key]=input; wrapper.append(input); form.append(wrapper);
    }
    const status=el('p'); status.setAttribute('role','status');
    const actions=el('div',undefined,'pt-directory-actions'), save=el('button','Save contact'), cancel=el('button','Cancel');
    save.type='submit'; cancel.type='button'; cancel.onclick=()=>modal.close(); actions.append(save,cancel); form.append(status,actions); modal.append(form);
    let busy=false;
    modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    form.onsubmit=async e=>{
      e.preventDefault(); if(busy)return;
      const payload=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()]));
      if(!payload.name){status.textContent='Enter a name.';fields.name.focus();return;}
      payload.emails=payload.emails.split('\n').map(x=>x.trim()).filter(Boolean);
      if(payload.emails.some(x=>!/^\S+@\S+\.\S+$/.test(x))){status.textContent='Enter one valid email address per line.';fields.emails.focus();return;}
      payload.phones=payload.phones.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const split=x.indexOf(':');return split<0?{label:'Phone',value:x}:{label:x.slice(0,split).trim()||'Phone',value:x.slice(split+1).trim()};});
      if(payload.phones.some(p=>!p.value)){status.textContent='Enter a number for each phone.';return;}
      busy=true;save.disabled=cancel.disabled=true;status.textContent='Saving…'; const version=revision;
      try { await write(payload,row); if(version!==revision)return; modal.close(); await load(); }
      catch(error){status.textContent=error.message;}
      finally {busy=false;save.disabled=cancel.disabled=false;}
    };
    modal.addEventListener('close',()=>{modal.remove();if(editor===modal)editor=null;});
    modal.showModal();fields.name.focus();
  }
  function changeDeleted(row, deleted) {
    if(!allowed)return;
    const modal=formDialog(deleted?'Delete contact?':'Restore contact?');
    modal.append(el('p',deleted?`Move ${row.name} to deleted contacts? You can restore it later.`:`Restore ${row.name} to the directory?`));
    const status=el('p');status.setAttribute('role','status');
    const actions=el('div',undefined,'pt-directory-actions'), confirm=el('button',deleted?'Delete contact':'Restore contact'),cancel=el('button','Cancel');
    cancel.onclick=()=>modal.close();actions.append(confirm,cancel);modal.append(status,actions);let busy=false;
    modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    confirm.onclick=async()=>{if(busy)return;busy=true;confirm.disabled=cancel.disabled=true;const version=revision;
      try{await write({deleted_at:deleted?new Date().toISOString():null},row);if(version!==revision)return;modal.close();await load();}
      catch(error){status.textContent=error.message;}
      finally{busy=false;confirm.disabled=cancel.disabled=false;}
    };
    modal.addEventListener('close',()=>{modal.remove();if(editor===modal)editor=null;});modal.showModal();cancel.focus();
  }
  function open(button) {
    if (!allowed) return;
    trigger = button;
    if (dialog) { if (!dialog.open) dialog.showModal(); return; }
    dialog = el('dialog', undefined, 'pt-client-directory');
    dialog.setAttribute('aria-labelledby', 'ptDirectoryTitle');
    dialog.innerHTML = '<header><div><span class="pt-directory-eyebrow">PRIVATE WORKSPACE</span><h2 id="ptDirectoryTitle">Client Directory</h2><p>BPO clients and vendor contacts</p></div><button type="button" data-close aria-label="Close Client Directory">Close</button></header><div class="pt-directory-tools"><label for="ptDirectorySearch">Search contacts</label><input id="ptDirectorySearch" type="search" placeholder="Name, company, email, phone, or notes" autocomplete="off"><div><span data-count aria-live="polite"></span><button type="button" data-refresh>Refresh</button></div><p data-status role="status"></p></div><div data-results class="pt-directory-results"></div>';
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => trigger?.focus());
    dialog.querySelector('input').oninput = draw;
    dialog.querySelector('[data-refresh]').onclick = load;
    const tools=dialog.querySelector('.pt-directory-tools');
    const add=el('button','Add contact');add.type='button';add.onclick=()=>edit();tools.prepend(add);
    const trashLabel=el('label','Show deleted contacts '),trash=el('input');trash.type='checkbox';trash.dataset.trash='';trash.onchange=draw;trashLabel.append(trash);tools.append(trashLabel);
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('input').focus(); load();
  }
  const style = el('style');
  style.textContent = `.pt-client-directory{width:min(1050px,94vw);max-height:88vh;padding:0;border:1px solid #d8e1e9;border-radius:16px;background:#f6f8fb;color:#18334d;box-shadow:0 30px 90px #0f172a55}.pt-client-directory::backdrop{background:#0f172a99}.pt-client-directory header{display:flex;justify-content:space-between;gap:20px;padding:24px;background:white;border-bottom:1px solid #d8e1e9}.pt-client-directory h2{font-size:26px;margin:5px 0}.pt-client-directory p{font-size:13px;line-height:1.6;margin:6px 0}.pt-directory-eyebrow{font-size:10px;letter-spacing:.13em;color:#27689b;font-weight:800}.pt-client-directory button{cursor:pointer;background:#fff;border:1px solid #bacddd;border-radius:8px;padding:9px 14px;color:#174a70;font-weight:700;align-self:start}.pt-directory-tools{padding:18px 24px}.pt-directory-tools label{display:block;font-size:13px;font-weight:700;margin-bottom:7px}.pt-directory-tools input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #bacddd;border-radius:8px;font-size:16px}.pt-directory-tools>div{display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:13px}.pt-directory-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:0 24px 24px}.pt-directory-card{background:#fff;border:1px solid #d8e1e9;border-radius:12px;padding:18px;overflow-wrap:anywhere}.pt-directory-card h3{font-size:17px;margin:0 0 6px}.pt-directory-company{font-weight:700}.pt-directory-links{display:grid;gap:5px;margin:12px 0;font-size:13px}.pt-directory-links a{color:#176498}.pt-directory-tags{color:#586e83}.pt-directory-card details{border-top:1px solid #e4eaf0;padding-top:10px;margin-top:10px;font-size:13px}.pt-directory-card summary{cursor:pointer;font-weight:700}.pt-directory-notes,.pt-directory-card pre{white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.6}.pt-client-directory :focus-visible{outline:3px solid #3a92ce;outline-offset:3px}@media(max-width:650px){.pt-directory-results{grid-template-columns:1fr;padding:0 14px 14px}.pt-client-directory header,.pt-directory-tools{padding:16px}.pt-client-directory h2{font-size:22px}}`;
  style.textContent += `.pt-directory-actions{display:flex;gap:8px;margin:14px 0 4px}.pt-directory-editor{box-sizing:border-box;width:min(620px,94vw);max-height:88vh;border:1px solid #bacddd;border-radius:14px;padding:24px;background:#fff;color:#18334d}.pt-directory-editor::backdrop{background:#0f172a99}.pt-directory-editor h2{margin-top:0}.pt-directory-editor label{display:block;font-size:13px;font-weight:700;margin:12px 0}.pt-directory-editor input,.pt-directory-editor textarea{box-sizing:border-box;display:block;width:100%;font:inherit;font-weight:400;padding:10px;margin-top:5px;border:1px solid #bacddd;border-radius:7px}.pt-directory-editor textarea{min-height:75px;resize:vertical}.pt-directory-editor button{padding:10px 16px;border:1px solid #bacddd;border-radius:8px;cursor:pointer}.pt-directory-editor button[type=submit]{background:#175c92;color:white}.pt-directory-tools input[type=checkbox]{width:auto;display:inline;margin-left:8px}.pt-directory-editor button:disabled{opacity:.6;cursor:wait}`;
  document.head.append(style);
  new MutationObserver(navigation).observe(document.body, {childList:true,subtree:true});
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id === userId && allowed) return;
    // Clear private content synchronously; defer database calls outside auth's lock.
    const ticket = ++revision; allowed = false; clear(); navigation();
    setTimeout(() => { if (ticket === revision) access(session?.user); }, 0);
  });
  const initialRevision = revision;
  client.auth.getSession().then(({data}) => { if (revision === initialRevision) access(data.session?.user); }).catch(()=>{});
  window.ClientDirectory = { open: () => open(document.getElementById('appNavClientDirectory')) };
})();

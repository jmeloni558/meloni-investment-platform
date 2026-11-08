// The two enrolled sign-ins share one order list and the realty account's field photo library.
(() => {
  const kinds = ['Int BPO','Ext BPO','Int PCR','Ext PCR','PDCR','Desktop BPO','Marketing Photos','Inspection Photos'];
  const autoLand = !location.search && !location.hash;
  let db, account, membership, panel, menu, generation=0, request=0, landing=autoLand, completed=false, orders=[], clients=[];
  const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text||''});
  const field=id=>panel.querySelector('#od-'+id);
  const dateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  function hide(){document.body.classList.remove('pt-orders-open');menu?.removeAttribute('aria-current');}
  function open(){
    if(!membership||!panel)return;
    document.body.classList.add('pt-orders-open');menu.setAttribute('aria-current','page');load();
  }
  async function load(){
    const current=++request, version=generation;
    try{
      const rows=[];
      for(let offset=0;;offset+=500){
        const {data,error}=await db.from('field_orders').select('*').eq('complete',completed).order('due').order('id').range(offset,offset+499);
        if(error)throw error;
        rows.push(...data);if(data.length<500)break;
      }
      const result=await db.from('order_clients').select('name').order('name');
      if(result.error)throw result.error;
      if(current!==request||version!==generation)return;
      orders=rows;clients=result.data.map(c=>c.name);
      field('clients').replaceChildren(...clients.map(c=>new Option(c,c)));
      render();field('status').textContent='';
    }catch(e){if(version===generation&&current===request)field('status').textContent=e.message;}
  }
  function render(){
    field('list').replaceChildren();field('open').setAttribute('aria-pressed',String(!completed));field('completed').setAttribute('aria-pressed',String(completed));
    for(const o of orders){
      const row=el('article'), check=el('input'), info=el('div'), title=el('button',o.address), due=el('time','Due '+dateLabel(o.due));
      check.type='checkbox';check.checked=o.complete;check.disabled=completed;check.setAttribute('aria-label','Complete '+o.address);
      check.onchange=async()=>{check.disabled=true;try{await update(o,{complete:true});await load();}catch(e){check.checked=false;check.disabled=false;field('status').textContent=e.message;}};
      title.onclick=()=>edit(o);info.append(title,el('div',o.kind+' · '+o.client),due);
      if(o.appointment)info.append(el('div','Appointment · '+new Date(o.appointment).toLocaleString()));
      if(o.notes){const note=el('p',o.notes);note.className='od-note';info.append(note);}
      if(o.photo_id){const photo=el('a','Photos');photo.href='/photos?set='+encodeURIComponent(o.photo_id);if(account===membership.photo_owner)info.append(photo);else info.append(el('small','Photo set in PT Photos · realty sign-in'));}
      row.append(check,info);field('list').append(row);
    }
    if(!orders.length)field('list').append(el('p',completed?'No completed orders.':'No open orders.'));
  }
  async function update(o,changes){
    const {data,error}=await db.from('field_orders').update(changes).eq('id',o.id).eq('updated_at',o.updated_at).select('id').maybeSingle();
    if(error)throw error;if(!data)throw Error('This order changed on another device. Close the editor and refresh the dashboard.');
  }
  let editing, draftId;
  function edit(o){
    editing=o;draftId=o?.id||crypto.randomUUID();const f=field('form');f.reset();field('error').textContent='';
    field('title').textContent=o?'Order details':'New order';
    for(const k of ['address','kind','client','due','notes'])field(k).value=o?.[k]||'';
    field('photos').checked=!!o?.needs_photos;
    for(const k of ['address','kind','photos'])field(k).disabled=!!o;
    if(o?.appointment){const t=new Date(o.appointment);field('appointment').value=new Date(t-t.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    field('dialog').showModal();field(o?'notes':'address').focus();
  }
  async function submit(event){
    event.preventDefault();const save=field('save');if(save.disabled)return;save.disabled=true;
    const version=generation,original=editing;
    try{
      const name=field('client').value.trim(), address=field('address').value.trim();
      if(!name||!address)throw Error('Enter the address and client.');
      let client=clients.find(c=>c.toLowerCase()===name.toLowerCase());
      if(!client){
        const {error}=await db.from('order_clients').insert({name});
        if(error&&error.code!=='23505')throw error;
        const r=await db.from('order_clients').select('name').order('name');if(r.error)throw r.error;
        client=r.data.find(c=>c.name.toLowerCase()===name.toLowerCase())?.name;if(!client)throw Error('Client could not be saved.');
      }
      if(version!==generation)return;
      const changes={client,due:field('due').value,notes:field('notes').value,appointment:field('appointment').value?new Date(field('appointment').value).toISOString():null};
      if(original)await update(original,changes);
      else {
        const {error}=await db.from('field_orders').insert({...changes,id:draftId,address,kind:field('kind').value,needs_photos:field('photos').checked});
        if(error&&error.code!=='23505')throw error;
        if(error){const r=await db.from('field_orders').select('id').eq('id',draftId).maybeSingle();if(!r.data)throw error;}
      }
      if(version===generation){field('dialog').close();await load();}
    }catch(e){if(version===generation)field('error').textContent=e.message;}finally{save.disabled=false;}
  }
  function mount(){
    const anchor=document.querySelector('#appNavNew');if(!membership||!anchor)return;
    if(!menu){menu=el('button','Dashboard');menu.id='ptOrderNav';menu.className='app-nav-action';menu.onclick=open;}
    if(menu.nextElementSibling!==anchor)anchor.before(menu);
    if(panel)return;
    panel=el('section');panel.id='ptOrders';panel.innerHTML=`
      <header><div><small>ORDER MANAGEMENT</small><h1>Dashboard</h1></div><button id="od-new">New order</button></header>
      <nav><button id="od-open">Open orders</button><button id="od-completed">Completed</button><button id="od-calendar">Outlook calendar</button></nav>
      <div id="od-subscribe" hidden><p>In Outlook Calendar, choose Add calendar → Subscribe from web. Paste this private link and select Import. Outlook refreshes the appointments on its own schedule.</p><label>Private calendar URL<input id="od-url" readonly></label><button id="od-copy">Copy link</button> <a href="https://outlook.office.com/calendar/" target="_blank" rel="noopener">Open Outlook Calendar</a></div>
      <p id="od-status" role="status"></p><div id="od-list"></div>
      <dialog id="od-dialog"><form id="od-form"><h2 id="od-title"></h2>
      <label>Property address<input id="od-address" maxlength="500" required></label>
      <label>Order type<select id="od-kind" required></select></label>
      <label>Client <input id="od-client" list="od-clients" maxlength="160" placeholder="Choose or enter a new client" required></label><datalist id="od-clients"></datalist>
      <label>Due date<input type="date" id="od-due" required></label>
      <label>Appointment (optional, local time)<input type="datetime-local" id="od-appointment"></label>
      <label><input type="checkbox" id="od-photos"> Photos needed</label>
      <label>Notes<textarea id="od-notes" rows="5"></textarea></label><p id="od-error" role="alert"></p>
      <button id="od-save">Save order</button> <button type="button" id="od-cancel">Close</button></form></dialog>`;
    document.querySelector('#appNavShell').after(panel);
    field('kind').append(new Option('Choose order type',''),...kinds.map(k=>new Option(k==='PDCR'?'PDCR (Property Data Collection Report)':k,k)));
    field('new').onclick=()=>edit(null);field('cancel').onclick=()=>field('dialog').close();field('form').onsubmit=submit;
    field('open').onclick=()=>{completed=false;load();};field('completed').onclick=()=>{completed=true;load();};
    field('calendar').onclick=async()=>{
      const version=generation;
      if(!field('subscribe').hidden){field('subscribe').hidden=true;return;}
      const {data,error}=await db.rpc('order_calendar_key');if(version!==generation)return;
      if(error){field('status').textContent=error.message;return;}
      field('url').value='https://lmaiqpkogmmsldkziggy.supabase.co/functions/v1/order-calendar?key='+data;
      field('subscribe').hidden=false;
    };
    field('copy').onclick=async()=>{try{await navigator.clipboard.writeText(field('url').value);field('status').textContent='Calendar link copied.';}catch{field('url').select();}};
    if(landing){landing=false;open();}
  }
  async function auth(session){
    const id=session?.user?.id||null;if(id===account)return;
    const old=account;account=id;const version=++generation;hide();menu?.remove();panel?.remove();panel=menu=membership=null;orders=[];clients=[];completed=false;
    if(!id){if(old)landing=true;return;}
    const {data,error}=await db.from('order_members').select('photo_owner').eq('user_id',id).maybeSingle();
    if(version!==generation||error||!data)return;membership=data;mount();
  }
  function init(){
    db=window.PropertyThesisSession?.getClient();if(!db)return;
    db.auth.onAuthStateChange((_e,s)=>setTimeout(()=>auth(s),0));
    db.auth.getSession().then(({data})=>auth(data.session));
    new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{const target=e.target.closest('#appNavShell button,#appNavShell a,#ptBpoMenu button');if(target&&target!==menu){landing=false;hide();}},true);
    window.addEventListener('focus',()=>{if(document.body.classList.contains('pt-orders-open')&&!field('dialog').open)load();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

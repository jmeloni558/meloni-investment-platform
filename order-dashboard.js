// The two enrolled sign-ins share one order list and the realty account's field photo library.
(() => {
  const kinds = ['Int BPO','Ext BPO','Int PCR','Ext PCR','PDCR','Desktop BPO','Marketing Photos','Inspection Photos'];
  const autoLand = (!location.search && !location.hash) || new URLSearchParams(location.search).get('orders')==='1';
  let db, account, membership, panel, menu, generation=0, request=0, landing=autoLand, currentList='open', orders=[], clients=[];
  const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text||''});
  const field=id=>panel.querySelector('#od-'+id);
  const dateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  const appointmentLabel=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  function hide(){document.body.classList.remove('pt-orders-open');menu?.removeAttribute('aria-current');}
  function open(){
    if(!membership||!panel)return;
    document.body.classList.add('pt-orders-open');menu.setAttribute('aria-current','page');window.AppNavigationToolbar?.refresh();load();
  }
  let openDates=[], midnightTimer;
  function displayCounts(){
    clearTimeout(midnightTimer);
    if(!panel || !membership)return;
    const now=new Date();
    const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    const total=openDates.length;
    field('total').textContent=total+' open '+(total===1?'order':'orders');
    field('today').textContent=openDates.filter(date=>date===today).length+' due today';
    field('overdue').textContent=openDates.filter(date=>date && date<today).length+' overdue';
    const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    midnightTimer=setTimeout(displayCounts,midnight-now+100);
  }
  async function fetchOrders(list,columns){
    const rows=[];
    for(let offset=0;;offset+=500){
      const {data,error}=await db.from('field_orders').select(columns).eq('complete',list==='completed').eq('on_hold',list==='hold').order('due').order('id').range(offset,offset+499);
      if(error)throw error;
      rows.push(...data);
      if(data.length<500)return rows;
    }
  }
  async function load(){
    const current=++request, version=generation;
    try{
      const [rows,openRows,held]=await Promise.all([
        fetchOrders(currentList,'*'),
        currentList==='open'?null:fetchOrders('open','due'),
        currentList==='hold'?null:db.from('field_orders').select('id',{count:'exact',head:true}).eq('complete',false).eq('on_hold',true)
      ]);
      if(held?.error)throw held.error;
      const result=await db.from('order_clients').select('name').order('name');
      if(result.error)throw result.error;
      if(current!==request||version!==generation)return;
      openDates=(openRows || rows).map(order=>order.due);
      field('hold').textContent='On Hold ('+(held?.count ?? rows.length)+')';
      displayCounts();
      orders=rows;clients=result.data.map(c=>c.name);
      if(field('details').hidden) populateClients();
      render();field('status').textContent='';
    }catch(e){if(version===generation&&current===request)field('status').textContent=e.message;}
  }
  function render(){
    field('list').replaceChildren();
    for(const list of ['open','hold','completed']){
      field(list).setAttribute('aria-pressed',String(list===currentList));
    }
    for(const o of orders){
      const row=el('article'), check=el('input'), title=el('button'), due=el('time','Due '+dateLabel(o.due));
      check.type='checkbox';
      check.checked=o.complete;
      check.setAttribute('aria-label','Completed · '+o.address);
      check.onchange=async()=>{
        if(!canLeave()){check.checked=o.complete;return;}
        check.disabled=true;
        try{await update(o,{complete:check.checked,on_hold:false});closeDetails();await load();}
        catch(e){check.checked=o.complete;check.disabled=false;field('status').textContent=e.message;}
      };
      title.dataset.order=o.id;
      title.setAttribute('aria-current',String(!field('details').hidden && editing?.id===o.id));
      title.onclick=()=>edit(o);
      due.dateTime=o.due;
      const summary=el('span');
      summary.className='od-summary';
      const address=el('strong',o.address);
      address.title=o.address;
      summary.append(address,el('small',o.kind+' Â· '+o.client));
      const schedule=el('span');
      schedule.className='od-schedule';
      schedule.append(due);
      if(o.appointment){
        const appointment=el('time','Appt '+appointmentLabel.format(new Date(o.appointment)));
        appointment.dateTime=o.appointment;
        schedule.append(appointment);
      }
      title.append(summary,schedule);
      row.append(check,title);
      field('list').append(row);
    }
    if(!orders.length)field('list').append(el('p',{open:'No open orders.',hold:'No orders on hold.',completed:'No completed orders.'}[currentList]));
  }
  async function update(o,changes){
    const {data,error}=await db.from('field_orders').update(changes).eq('id',o.id).eq('updated_at',o.updated_at).select('id').maybeSingle();
    if(error)throw error;if(!data)throw Error('This order changed on another device. Close the editor and refresh the dashboard.');
  }
  let editing, draftId, photosOverridden;
  let dirty=false;
  function canLeave(){
    return !field('save').disabled && (field('details').hidden || !dirty || window.confirm('Discard your unsaved order changes?'));
  }
  function closeDetails(){
    field('details').hidden=true;
    editing=null;
    dirty=false;
    render();
  }
  function populateClients(){
    field('client').replaceChildren(new Option('Choose client',''),...clients.map(c=>new Option(c,c)),new Option('Add new client…','__add__'));
  }
  function clientName(){
    return (field('client').value==='__add__'?field('new-client').value:field('client').value).trim();
  }
  function showNoteLinks(){
    const preview=field('preview'), notes=field('notes').value;
    preview.replaceChildren();
    for(const match of notes.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi)){
      let url=match[0].replace(/[.,;:!?]+$/,'');
      while(url.endsWith(')') && url.split(')').length>url.split('(').length)url=url.slice(0,-1);
      const link=el('a',url);
      link.href=/^www\./i.test(url)?'https://'+url:url;
      link.target='_blank';link.rel='noopener noreferrer';
      preview.append(link);
    }
    preview.hidden=!preview.childElementCount;
  }
  function updatePhotoDefault(){
    if(editing || photosOverridden)return;
    const kind=field('kind').value;
    const nvmsInterior=kind==='Int PCR' && clientName().toLowerCase()==='nvms';
    field('photos').checked=Boolean(kind) && kind!=='PDCR' && kind!=='Desktop BPO' && !nvmsInterior;
  }
  function edit(o){
    if(!canLeave())return;
    dirty=false;
    populateClients();
    field('new-client-label').hidden=true;
    field('new-client').required=false;
    editing=o;photosOverridden=false;draftId=o?.id||crypto.randomUUID();const f=field('form');f.reset();field('error').textContent='';
    field('title').textContent=o?'Order details':'New order';
    for(const k of ['address','kind','client','due','notes'])field(k).value=o?.[k]||'';
    field('photos').checked=!!o?.needs_photos;
    field('state-label').hidden=!o;
    field('state').value=o?.on_hold?'hold':o?.complete?'completed':'open';
    const photos=field('photo-link');
    photos.replaceChildren();
    if(o?.photo_id){
      if(account===membership.photo_owner){
        const link=el('a','Open PT Photos');
        link.href='/photos?set='+encodeURIComponent(o.photo_id);
        link.target='_blank';link.rel='noopener';
        photos.append(link);
      }else photos.textContent='Photo set in PT Photos · realty sign-in';
    }
    showNoteLinks();
    if(o?.appointment){const t=new Date(o.appointment);field('appointment').value=new Date(t-t.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    field('details').hidden=false;render();field(o?'title':'address').focus();
  }
  async function submit(event){
    event.preventDefault();const save=field('save');if(save.disabled)return;save.disabled=true;
    const version=generation,original=editing;
    try{
      const name=clientName(), address=field('address').value.trim();
      if(!name||!address)throw Error('Enter the address and client.');
      let client=clients.find(c=>c.toLowerCase()===name.toLowerCase());
      if(!client){
        const {error}=await db.from('order_clients').insert({name});
        if(error&&error.code!=='23505')throw error;
        const r=await db.from('order_clients').select('name').order('name');if(r.error)throw r.error;
        client=r.data.find(c=>c.name.toLowerCase()===name.toLowerCase())?.name;if(!client)throw Error('Client could not be saved.');
      }
      if(version!==generation)return;
      const changes={address,kind:field('kind').value,client,due:field('due').value,notes:field('notes').value,appointment:field('appointment').value?new Date(field('appointment').value).toISOString():null};
      if(original)await update(original,{...changes,complete:field('state').value==='completed',on_hold:field('state').value==='hold',needs_photos:field('photos').checked});
      else {
        const {error}=await db.from('field_orders').insert({...changes,id:draftId,needs_photos:field('photos').checked});
        if(error&&error.code!=='23505')throw error;
        if(error){const r=await db.from('field_orders').select('id').eq('id',draftId).maybeSingle();if(!r.data)throw error;}
      }
      if(version===generation){closeDetails();await load();}
    }catch(e){if(version===generation)field('error').textContent=e.message;}finally{save.disabled=false;}
  }
  function mount(){
    const anchor=document.querySelector('#appNavNew');if(!membership||!anchor)return;
    if(!menu){menu=el('button','Dashboard');menu.id='ptOrderNav';menu.className='app-nav-action';menu.onclick=open;}
    if(menu.nextElementSibling!==anchor)anchor.before(menu);
    if(panel)return;
    panel=el('section');panel.id='ptOrders';panel.innerHTML=`
      <header><div><small>ORDER MANAGEMENT</small><h1>Dashboard</h1><p id="od-count" aria-live="polite"><span id="od-total"></span><span id="od-today"></span><span id="od-overdue"></span></p></div></header>
      <nav><button id="od-new">New order</button><button id="od-open">Open orders</button><button id="od-hold">On Hold</button><button id="od-completed">Completed</button><button id="od-calendar">Outlook calendar</button></nav>
      <div id="od-subscribe" hidden><p>In Outlook Calendar, choose Add calendar â†’ Subscribe from web. Paste this private link and select Import. Outlook refreshes the appointments on its own schedule.</p><label>Private calendar URL<input id="od-url" readonly></label><button id="od-copy">Copy link</button> <a href="https://outlook.office.com/calendar/" target="_blank" rel="noopener">Open Outlook Calendar</a></div>
      <p id="od-status" role="status"></p><div class="od-columns"><div id="od-list"></div>
      <aside id="od-details" aria-labelledby="od-title" hidden><form id="od-form"><header><h2 id="od-title" tabindex="-1"></h2><button type="button" id="od-cancel">Close</button></header>
      <label>Property address<input id="od-address" maxlength="500" required></label>
      <label>Order type<select id="od-kind" required></select></label>
      <label>Client<select id="od-client" required></select></label>
      <label id="od-new-client-label" hidden>New client name<input id="od-new-client" maxlength="160"></label>
      <label>Due date<input type="date" id="od-due" required></label>
      <label>Appointment (optional, local time)<input type="datetime-local" id="od-appointment"></label>
      <label><input type="checkbox" id="od-photos"> Photos needed</label>
      <div id="od-photo-link"></div><label id="od-state-label">Order status<select id="od-state"><option value="open">Open orders</option><option value="hold">On Hold</option><option value="completed">Completed</option></select></label>
      <label>Notes<textarea id="od-notes" rows="5"></textarea></label>
      <div id="od-preview" aria-label="Links in notes" hidden></div><p id="od-error" role="alert"></p>
      <button id="od-save">Save order</button></form></aside></div>`;
    document.querySelector('#appNavShell').after(panel);
    field('kind').onchange=updatePhotoDefault;
    field('client').onchange=()=>{
      const adding=field('client').value==='__add__';
      field('new-client-label').hidden=!adding;
      field('new-client').required=adding;
      if(adding)field('new-client').focus();
      updatePhotoDefault();
    };
    field('new-client').oninput=updatePhotoDefault;
    field('form').oninput=()=>{dirty=true;};
    field('notes').oninput=showNoteLinks;
    field('photos').onchange=()=>{photosOverridden=true;};
    field('kind').append(new Option('Choose order type',''),...kinds.map(k=>new Option(k==='PDCR'?'PDCR (Property Data Collection Report)':k,k)));
    field('new').onclick=()=>edit(null);field('cancel').onclick=()=>{if(canLeave())closeDetails();};field('form').onsubmit=submit;
    for(const list of ['open','hold','completed']){
      field(list).onclick=()=>{
        if(!canLeave())return;
        closeDetails();
        currentList=list;
        load();
      };
    }
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
    clearTimeout(midnightTimer);openDates=[];
    const old=account;account=id;const version=++generation;hide();menu?.remove();panel?.remove();panel=menu=membership=null;orders=[];clients=[];currentList='open';
    if(!id){if(old)landing=true;return;}
    const {data,error}=await db.from('order_members').select('photo_owner').eq('user_id',id).maybeSingle();
    if(version!==generation||error||!data)return;membership=data;mount();
  }
  function init(){
    db=window.PropertyThesisSession?.getClient();if(!db)return;
    db.auth.onAuthStateChange((_e,s)=>setTimeout(()=>auth(s),0));
    db.auth.getSession().then(({data})=>auth(data.session));
    new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{const target=e.target.closest('#appNavShell button,#appNavShell a,#ptBpoMenu button');if(target && target!==menu && target.target!=='_blank'){landing=false;hide();}},true);
    window.addEventListener('focus',()=>{if(document.body.classList.contains('pt-orders-open')&&field('details').hidden)load();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

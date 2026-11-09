// The two enrolled sign-ins share one order list and the realty account's field photo library.
(() => {
  const kinds = ['Int BPO','Ext BPO','Int PCR','Ext PCR','PDCR','Desktop BPO','Marketing Photos','Inspection Photos'];
  const kindLabels = new Map([['Int BPO','Interior BPO'],['Ext BPO','Exterior BPO'],['PDCR','Data Collection Report']]);
  const kindLabel = kind => kindLabels.get(kind) ?? kind;
  const fieldApp=window.PropertyThesisFieldApp;
  const autoLand = fieldApp ? fieldApp.startOnDashboard : ((!location.search && !location.hash) || new URLSearchParams(location.search).get('orders')==='1');
  let db, account, membership, panel, menu, generation=0, request=0, landing=autoLand, currentList='open', orders=[], clients=[];
  let selectedList='', namedLists=[];
  const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text||''});
  const field=id=>panel.querySelector('#od-'+id);
  const dateLabel=value=>fieldApp ? value.slice(5,7)+'/'+value.slice(8,10)+'/'+value.slice(2,4) : new Date(value+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  const appointmentLabel=fieldApp ? new Intl.DateTimeFormat('en-US',{month:'2-digit',day:'2-digit',year:'2-digit',hour:'numeric',minute:'2-digit',hour12:true}) : new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  const endTimeLabel=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
  function appointmentEnd(order){
    return new Date(new Date(order.appointment).getTime()+order.appointment_minutes*60000);
  }
  function syncEndTimeField(){
    const hasStart=Boolean(field('appointment').value);
    field('appointment-end-label').hidden=!hasStart;
    if(!hasStart)field('appointment-end').value='';
  }
  function appointmentChanges(original){
    const startValue=field('appointment').value;
    const endValue=field('appointment-end').value;
    const start=startValue ? new Date(startValue) : null;
    let minutes=original?.appointment && !original.appointment_window && start ? original.appointment_minutes : 60;
    if(start && endValue){
      const end=new Date(startValue.slice(0,10)+'T'+endValue);
      minutes=(end-start)/60000;
      if(!Number.isInteger(minutes) || minutes<=0)throw Error('Choose an end time later than the start time on the same day.');
    }
    return {appointment:start?.toISOString() || null,appointment_minutes:minutes,appointment_window:Boolean(start && endValue)};
  }
  function hide(){stopInvoiceWatch();document.body.classList.remove('pt-orders-open');menu?.removeAttribute('aria-current');if(fieldApp){menu?.setAttribute('aria-pressed','false');document.getElementById('fieldPhotos').setAttribute('aria-pressed','true');}}
  function open(){
    if(!membership||!panel || (fieldApp && !fieldApp.canShowDashboard()))return;
    if(fieldApp){menu.setAttribute('aria-pressed','true');document.getElementById('fieldPhotos').setAttribute('aria-pressed','false');}
    document.body.classList.add('pt-orders-open');menu.setAttribute('aria-current','page');window.AppNavigationToolbar?.refresh();load();
    if(editing && !field('details').hidden)showOrderInvoice(editing.id);
    fieldApp?.recordView();
  }
  let openDates=[], midnightTimer;
  function localDateKey(now){
    return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  }
  function displayCounts(){
    clearTimeout(midnightTimer);
    if(!panel || !membership)return;
    const now=new Date();
    const today=localDateKey(now);
    const total=openDates.length;
    field('total').textContent=total+' open '+(total===1?'order':'orders');
    field('today').textContent=openDates.filter(date=>date===today).length+' due today';
    field('overdue').textContent=openDates.filter(date=>date && date<today).length+' overdue';
    const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    midnightTimer=setTimeout(()=>{displayCounts();if(panel && membership)render();},midnight-now+100);
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
  const pageSize=100;
  let page=0, searchTimer;
  function searchText(){return field('search').value.trim();}
  async function orderPage(term){
    let query=term ? db.rpc('search_field_orders',{search_text:term}) :
      db.from('field_orders').select('*').eq('complete',currentList==='completed').eq('on_hold',currentList==='hold');
    if(!term && currentList==='open')query=selectedList?query.eq('list_name',selectedList):query.is('list_name',null);
    const offset=page*pageSize;
    const {data,error}=await query.order('due',{ascending:!term && currentList!=='completed',nullsFirst:false}).order('id').range(offset,offset+pageSize);
    if(error)throw error;
    return data;
  }
  async function fieldPhotoSets(batch){
    const ids=batch.map(order=>order.photo_id).filter(Boolean);
    if(!fieldApp || account!==membership?.photo_owner || !ids.length)return new Map();
    const {data,error}=await db.from('photo_properties').select('id,completed_at,archived_at,deleting_at').in('id',ids);
    if(error)throw error;
    return new Map(data.map(set=>[set.id,set]));
  }
  async function load(){
    const current=++request, version=generation;
    try{
      const term=searchText();
      const [batch,openRows,held,completed]=await Promise.all([
        orderPage(term),fetchOrders('open','due'),
        db.from('field_orders').select('id',{count:'exact',head:true}).eq('complete',false).eq('on_hold',true),
        db.from('field_orders').select('id',{count:'exact',head:true}).eq('complete',true)
      ]);
      if(held?.error)throw held.error;
      if(completed.error)throw completed.error;
      const [result,lists,photoSets]=await Promise.all([
        db.from('order_clients').select('name,listed,monthly_bpo').order('name'),
        db.from('order_lists').select('name').order('name'),
        fieldPhotoSets(batch)
      ]);
      if(lists.error)throw lists.error;
      if(result.error)throw result.error;
      if(current!==request||version!==generation)return;
      namedLists=lists.data.map(list=>list.name);
      if(selectedList && !namedLists.includes(selectedList)){
        selectedList='';page=0;await load();return;
      }
      const managing=currentList==='open' && Boolean(selectedList) && !term;
      field('rename-list').hidden=!managing;
      field('delete-list').hidden=!managing;
      field('main-open').hidden=namedLists.length>0;
      field('picker').hidden=namedLists.length===0;
      const picker=field('open');
      const placeholder=new Option('Open orders','');
      placeholder.disabled=true;placeholder.hidden=true;
      picker.replaceChildren(placeholder,new Option('Open orders',''),...namedLists.map(name=>new Option(name,name)));
      picker.selectedIndex=currentList==='open' && !term?namedLists.indexOf(selectedList)+2:0;
      field('new').textContent=currentList==='open' && selectedList?'New task':'New order';
      openDates=openRows.map(order=>order.due);
      field('hold').textContent='On Hold ('+held.count+')';
      field('completed').textContent='Completed ('+completed.count.toLocaleString()+')';
      displayCounts();
      field('prev').hidden=page===0;
      field('next').hidden=batch.length<=pageSize;
      orders=batch.slice(0,pageSize);
      for(const order of orders){
        const set=photoSets.get(order.photo_id);
        order.photosFinished=Boolean(set?.completed_at || set?.archived_at);
        order.hasActivePhotoSet=Boolean(set && !order.photosFinished && !set.deleting_at);
      }
      clients=result.data;
      if(field('details').hidden) populateClients();
      render();field('status').textContent='';
    }catch(e){if(version===generation&&current===request)field('status').textContent=e.message;}
  }
  function fieldPhotoButton(order,label){
    const button=el('button',label);
    button.type='button';
    button.setAttribute('aria-label',label+' for '+order.address);
    button.onclick=()=>{hide();fieldApp.openSet(order.photo_id);};
    return button;
  }
  function render(){
    field('list').replaceChildren();
    field('main-open').setAttribute('aria-pressed',String(currentList==='open' && !searchText()));
    field('open').dataset.active=String(currentList==='open' && !searchText());
    for(const list of ['hold','completed']){
      field(list).setAttribute('aria-pressed',String(!searchText() && list===currentList));
    }
    const today=localDateKey(new Date());
    for(const o of orders){
      const row=el('article'), check=el('input'), title=el('button'), due=el('time',o.due?'Due '+dateLabel(o.due):'No due date');
      if(!o.complete && o.due && o.due<=today)row.dataset.dueStatus=o.due===today?'today':'overdue';
      check.type='checkbox';
      check.checked=o.complete;
      check.setAttribute('aria-label','Completed � '+o.address);
      check.onchange=async()=>{
        if(!canLeave()){check.checked=o.complete;return;}
        check.disabled=true;
        try{await update(o,{complete:check.checked,on_hold:false});closeDetails();await load();}
        catch(e){check.checked=o.complete;check.disabled=false;field('status').textContent=e.message;}
      };
      title.dataset.order=o.id;
      title.setAttribute('aria-current',String(!field('details').hidden && editing?.id===o.id));
      title.onclick=()=>edit(o);
      if(o.due)due.dateTime=o.due;
      const summary=el('span');
      summary.className='od-summary';
      const address=el('strong',o.address);
      address.title=o.address;
      summary.append(address,el('small',[kindLabel(o.kind),o.client].filter(Boolean).join(' · ')));
      const schedule=el('span');
      schedule.className='od-schedule';
      schedule.append(due);
      const fieldOrder=fieldApp && o.address?.trim() && !o.list_name && !o.former_list_task;
      const actions=fieldOrder && !o.photosFinished?el('span'):null;
      if(actions){
        actions.className='od-field-actions';
        const dueActions=el('span');dueActions.className='od-due-actions';
        dueActions.append(due,actions);schedule.append(dueActions);
        const directions=el('a','Directions'),url=new URL('https://www.google.com/maps/dir/');
        url.search=new URLSearchParams({api:'1',destination:o.address.trim(),travelmode:'driving'}).toString();
        directions.href=url.href;directions.target='_blank';directions.rel='noopener noreferrer';
        directions.className='od-directions';directions.setAttribute('aria-label','Driving directions to '+o.address);
        actions.append(directions);
      }
      const desktopFolder=!fieldApp && hasOrderFolder(o);
      if(desktopFolder)schedule.append(rowFolderButton(o));
      if(o.appointment){
        const appointment=el('time','Appt '+appointmentLabel.format(new Date(o.appointment))+(o.appointment_window?' \u2013 '+endTimeLabel.format(appointmentEnd(o)):''));
        if(fieldApp)appointment.className='od-field-appointment';
        appointment.dateTime=o.appointment;
        schedule.append(appointment);
      }
      if(searchText())schedule.append(el('small',o.complete?'Completed':o.on_hold?'On Hold':'Open'));
      title.append(summary);
      if(fieldOrder)row.className='od-field-order';
      else if(!desktopFolder)title.append(schedule);
      if(o.appointment_needed && !o.appointment){
        if(!fieldOrder)title.classList.add('od-needs-appointment');
        const reminder=el('span','Appointment Needed');
        reminder.className='od-appointment-warning';
        (fieldOrder?schedule:title).append(reminder);
      }
      if(desktopFolder){
        const info=el('div');
        info.className='od-desktop-order-info';
        info.append(title,schedule);
        row.append(check,info);
      }else row.append(check,title);
      if(fieldApp && o.needs_photos && o.hasActivePhotoSet){
        const button=fieldPhotoButton(o,'Photos');
        button.className='od-row-photos';
        (actions || row).append(button);
      }
      if(fieldOrder)row.append(schedule);
      field('list').append(row);
    }
    if(!orders.length)field('list').append(el('p',searchText()?'No matching orders.':{open:'No open orders.',hold:'No orders on hold.',completed:'No completed orders.'}[currentList]));
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
  async function qbo(action,values={}){
    const {data,error}=await db.functions.invoke('qbo',{body:{action,...values}});
    if(error){
      const details=await error.context?.json?.().catch(()=>null);
      throw Error(details?.error || 'QuickBooks could not complete the request. Please try again.');
    }
    return data;
  }
  function existingInvoicePicker(box,orderId,version){
    const client=editing?.client;
    if(!client)return;
    const button=el('button','Link existing invoice');
    button.type='button';box.append(' ',button);
    button.onclick=async()=>{
      const status=el('span','Loading invoices...');
      const select=el('select');select.setAttribute('aria-label','Existing QuickBooks invoice');
      select.add(new Option('Choose invoice',''));
      select.oninput=event=>event.stopPropagation();
      const more=el('button','Load older invoices'),save=el('button','Link invoice');
      more.type=save.type='button';more.hidden=true;save.disabled=true;
      const controls=el('div');controls.append(select,more,save);
      controls.hidden=true;button.replaceWith(status,controls);
      let next=1;
      async function list(){
        more.disabled=true;
        try{
          const page=await qbo('listOrderInvoices',{orderId,client,start:next});
          if(version!==invoiceVersion)return;
          for(const i of page.invoices){
            const label=[i.number?'#'+i.number:'Invoice ID '+i.id,i.date,'$'+Number(i.total).toFixed(2),i.description].filter(Boolean).join(' | ');
            select.add(new Option(label,i.id));
          }
          next=page.next;more.hidden=!next;controls.hidden=select.options.length===1 && !next;
          status.textContent=controls.hidden?'No QuickBooks invoices found for '+page.customer+'.':'Invoices for '+page.customer;
        }catch(err){status.textContent=err.message;more.hidden=false;controls.hidden=false;more.textContent='Retry invoice list';}
        finally{more.disabled=false;}
      }
      more.onclick=list;
      select.onchange=()=>{save.disabled=!select.value;};
      save.onclick=async()=>{
        if(!select.value || save.disabled)return;
        if(field('client').value!==client){status.textContent='Save the client change and reopen the order first.';return;}
        select.disabled=save.disabled=more.disabled=true;
        try{
          await qbo('linkOrderInvoice',{orderId,client,invoiceId:select.value});
          if(version===invoiceVersion)showOrderInvoice(orderId);
        }catch(err){status.textContent=err.message;select.disabled=save.disabled=more.disabled=false;}
      };
      await list();
    };
  }
  let invoiceTimer,invoiceVersion=0;
  function stopInvoiceWatch(){
    clearTimeout(invoiceTimer);
    ++invoiceVersion;
  }
  function showOrderInvoice(orderId){
    stopInvoiceWatch();
    const version=invoiceVersion,box=field('invoice');
    box.replaceChildren();
    box.hidden=!orderId;
    if(!orderId)return;
    async function refresh(){
      const {data,error}=await db.rpc('dashboard_order_invoice',{target_order:orderId}).maybeSingle();
      if(version!==invoiceVersion)return;
      box.replaceChildren('QuickBooks invoice: ');
      if(data?.invoice_id){
        const link=el('a',data.invoice_number?'#'+data.invoice_number:'Open invoice');
        link.href='https://qbo.intuit.com/app/invoice?txnId='+encodeURIComponent(data.invoice_id);
        link.target='_blank';link.rel='noopener';box.append(link);
      }else{
        box.append(error?'Unable to check invoice status':data?.pending?'Pending':'No linked invoice');
        if(!error && !data?.pending)existingInvoicePicker(box,orderId,version);
        if(error || data?.pending)invoiceTimer=setTimeout(refresh,error?30000:10000);
      }
    }
    refresh();
  }
  function closeDetails(){
    stopInvoiceWatch();
    field('details').hidden=true;
    editing=null;
    dirty=false;
    render();fieldApp?.recordView();
  }
  function populateClients(savedName){
    field('client').replaceChildren(new Option('Choose client',''),...clients.filter(c=>c.listed!==false).map(c=>new Option(c.name,c.name)));
    if(savedName && !Array.from(field('client').options).some(option=>option.value===savedName)){
      const savedOption=new Option(savedName,savedName);
      savedOption.hidden=true;
      field('client').append(savedOption);
    }
  }
  const contactMethods=[['phone1','Phone 1','tel'],['phone2','Phone 2','tel'],['email','Email','email']];
  function phoneTarget(value){
    const parts=value.trim().match(/^(\+?[\d\s().-]+?)(?:\s*(?:ext\.?|x|#)\s*(\d+))?$/i);
    if(!parts)return null;
    const number=parts[1].replace(/[^\d+]/g,'');
    if(!/^\+?\d{3,15}$/.test(number))return null;
    return {dial:number+(parts[2]?';ext='+parts[2]:''),sms:number};
  }
  function phoneAttempt(check,description,index,savedType){
    const slot=el('span'),kind=el('button');
    slot.className='od-attempt-slot';kind.type='button';
    function display(type){
      check.dataset.method=type==='Call'||type==='Text'?type:'';
      kind.textContent=check.checked?(check.dataset.method || 'Set type'):String(index+1);
      kind.setAttribute('aria-label',description+': '+(check.dataset.method || 'choose call or text'));
      kind.title=kind.getAttribute('aria-label');
    }
    function choose(){
      const dialog=field('attempt-dialog');
      field('attempt-context').textContent=description;
      for(const type of ['Call','Text']){
        field('attempt-'+type.toLowerCase()).onclick=()=>{
          check.checked=true;display(type);dirty=true;dialog.close();
        };
      }
      dialog.showModal();
    }
    kind.onclick=choose;
    check.onchange=()=>{
      if(check.checked){check.checked=false;choose();}
      else display('');
    };
    display(savedType);slot.append(kind,check);
    return slot;
  }
  function renderContacts(contacts=[]){
    const root=field('contacts');
    root.replaceChildren();
    for(let index=0;index<2;index++){
      const saved=contacts?.[index] || {},poc='POC '+(index+1);
      const group=el('fieldset'),name=el('input'),label=el('label',poc+' name');
      group.append(el('legend',poc));name.type='text';name.className='od-poc-name';
      name.value=saved.name || '';label.append(name);group.append(label);
      for(const [key,title,type] of contactMethods){
        const method=saved[key] || {},row=el('div'),entry=el('div'),input=el('input');
        row.className='od-contact-row';input.type=type;input.id='od-contact-'+index+'-'+key;
        input.value=method.value || '';input.setAttribute('aria-label',poc+' '+title);
        const caption=el('label',title);caption.htmlFor=input.id;
        const action=el(type==='tel'?'button':'a'),editValue=el('button','Edit');
        editValue.type='button';editValue.setAttribute('aria-label','Edit '+poc+' '+title);
        if(type==='tel')action.type='button';
        function showValue(){
          const value=input.value.trim(),target=type==='tel'?phoneTarget(value):null;
          const usable=!!value && (type==='tel'?!!target:input.validity.valid);
          input.hidden=usable;action.hidden=editValue.hidden=!usable;action.textContent=value;
          if(type==='email' && usable)action.href='mailto:'+encodeURIComponent(value).replace('%40','@');
          if(type==='tel' && usable)action.onclick=()=>{
            field('phone-number').textContent=value;
            field('call-number').href='tel:'+target.dial;
            field('text-number').href='sms:'+target.sms;
            field('phone-dialog').showModal();
          };
        }
        editValue.onclick=()=>{action.hidden=editValue.hidden=true;input.hidden=false;input.focus();};
        input.onchange=showValue;
        entry.append(caption,input,action,editValue);showValue();
        const attempts=el('fieldset');attempts.className='od-contact-attempts';attempts.append(el('legend','Attempts'));
        for(let n=0;n<3;n++){
          const check=el('input'),attempt=el('label',String(n+1));check.type='checkbox';
          check.checked=method.attempts?.[n]===true;
          const description=poc+' '+title+' attempt '+(n+1);
          check.setAttribute('aria-label',description);
          if(type==='tel')attempts.append(phoneAttempt(check,description,n,method.attemptTypes?.[n]));
          else{attempt.append(check);attempts.append(attempt);}
        }
        row.append(entry,attempts);group.append(row);
      }
      root.append(group);
    }
  }
  function readContacts(){
    return Array.from(field('contacts').children,group=>{
      const contact={name:group.querySelector('.od-poc-name').value.trim()};
      group.querySelectorAll('.od-contact-row').forEach((row,i)=>{
        const checks=Array.from(row.querySelectorAll('input[type=checkbox]'));
        const method={value:row.querySelector('input').value.trim(),attempts:checks.map(check=>check.checked)};
        if(contactMethods[i][2]==='tel')method.attemptTypes=checks.map(check=>check.checked && check.dataset.method || null);
        contact[contactMethods[i][0]]=method;
      });
      return contact;
    });
  }
  function updateOrderLink(){
    const input=field('order-link'),link=field('open-order-link'),value=input.value.trim();
    let href='';
    if(value && !/\s/.test(value)){
      try{
        const url=new URL(/^[a-z][a-z0-9+.-]*:/i.test(value)?value:'https://'+value);
        if(['http:','https:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password)href=url.href;
      }catch{}
    }
    input.setCustomValidity(value && !href?'Enter a valid website address.':'');
    link.hidden=!href;
    if(href)link.href=href;else link.removeAttribute('href');
    return href || null;
  }
  function updatePhotoDefault(){
    if(editing || photosOverridden)return;
    const kind=field('kind').value;
    const nvmsInterior=kind==='Int PCR' && ['nvms','national vendor management services'].includes(field('client').value.toLowerCase());
    field('photos').checked=Boolean(kind) && kind!=='PDCR' && kind!=='Desktop BPO' && !nvmsInterior;
  }
  function monthlyBpo(){return clients.some(c=>c.name===field('client').value && c.monthly_bpo) && field('kind').value.endsWith('BPO');}
  function addInvoiceLine(){
    const row=el('fieldset');
    row.innerHTML='<legend>Additional invoice line</legend><label>Service<select required></select></label><label>Address or description<input required maxlength="500"></label><label>Fee ($)<input required type="number" min="0.01" step="0.01" max="9999999999.99"></label><label>Service date<input required type="date"></label><button type="button">Remove line</button>';
    const service=row.querySelector('select'), inputs=row.querySelectorAll('input');
    for(const name of kinds.filter(k=>!k.endsWith('Photos')))service.add(new Option(kindLabel(name),name));
    service.value=field('kind').value;
    inputs[2].value=monthlyBpo()?new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()):field('due').value;
    row.querySelector('button').onclick=()=>{row.remove();dirty=true;};
    field('invoice-lines').append(row);dirty=true;inputs[0].focus();
  }
  function updateRequirements(){
    const task=Boolean(field('destination').value || editing?.former_list_task);
    field('fee').required=!editing && !task && !['Marketing Photos','Inspection Photos'].includes(field('kind').value);
    field('billing').disabled=field('billing').hidden=!field('fee').required;
    field('monthly').hidden=!monthlyBpo();
    field('address-label').textContent=task?'Task or property address':'Property address';
    for(const id of ['kind','client','due'])field(id).required=!task && !editing?.todo_title;
  }
  let folderTimer;
  function hasOrderFolder(order){
    return order?.id && !order.list_name && !order.former_list_task &&
      ['Int BPO','Ext BPO','Desktop BPO','Int PCR','Ext PCR','PDCR'].includes(order.kind);
  }
  async function launchOrderFolder(orderId){
    const {data:ticket,error}=await db.rpc('issue_desktop_folder_ticket',{job_id:orderId});
    if(error || !ticket)throw Error('Unable to open folder.');
    window.location.assign('http://127.0.0.1:45273/open/'+encodeURIComponent(ticket));
  }
  function rowFolderButton(order){
    const button=el('button','Folder');
    button.type='button';
    button.className='od-folder-button';
    button.setAttribute('aria-label','Open folder for '+order.address);
    button.onclick=async()=>{
      button.disabled=true;
      const status=field('status');
      try{
        const {data,error}=await db.rpc('desktop_order_folder',{job_id:order.id});
        if(error)throw error;
        if(!data?.url){
          status.textContent=data?.pending?'OneDrive folder pending. Try again shortly.':'OneDrive folder not found.';
          return;
        }
        await launchOrderFolder(order.id);
        status.textContent='';
      }catch{status.textContent='Unable to open the OneDrive folder. Try again.';}
      finally{button.disabled=false;}
    };
    return button;
  }
  async function showFolder(order){
    clearTimeout(folderTimer);
    const container=field('folder-link');
    if(!container)return;
    container.replaceChildren();
    if(!hasOrderFolder(order))return;
    const {data,error}=await db.rpc('desktop_order_folder',{job_id:order.id});
    if(editing?.id!==order.id || !container.isConnected || field('details').hidden)return;
    if(error){container.textContent='OneDrive folder unavailable.';return;}
    if(!data)return;
    if(data.url){
      const url=new URL(data.url);
      if(url.protocol!=='https:' || !url.hostname.endsWith('.sharepoint.com'))return;
      const link=el('a','Open OneDrive property folder');
      link.href='#';
      let opening=false;
      link.onclick=async event=>{
        event.preventDefault();
        if(opening)return;
        opening=true;
        const message=el('span',' Opening in File Explorer...');
        message.setAttribute('role','status');
        container.replaceChildren(link,message);
        try{
          await launchOrderFolder(order.id);
          setTimeout(()=>message.remove(),4000);
        }catch{
          message.textContent=' Unable to open folder. Try again.';
        }finally{opening=false;}
      };
      container.append(link);
    }else{
      container.textContent=data.pending?'OneDrive folder pending':'OneDrive folder not found';
      if(data.pending)folderTimer=setTimeout(()=>{if(editing?.id===order.id && !field('details').hidden)showFolder(order);},10000);
    }
  }
  function edit(o){
    if(!canLeave())return;
    dirty=false;
    populateClients(o?.client);
    editing=o;photosOverridden=false;draftId=o?.id||crypto.randomUUID();const f=field('form');f.reset();field('error').textContent='';
    const destination=o?o.list_name:(currentList==='open'?selectedList:'');
    field('destination').replaceChildren(new Option('Main dashboard',''),...namedLists.map(name=>new Option(name,name)));
    field('destination').value=destination || '';
    field('title').textContent=o?'Details':destination?'New task':'New order';
    field('kind').querySelector('[data-historical]')?.remove();
    if(o?.kind && !kinds.includes(o.kind)){
      const legacy=new Option(o.kind,o.kind);
      legacy.dataset.historical='true';
      field('kind').append(legacy);
    }
    updateRequirements();
    field('source').hidden=!o?.todo_title;
    if(o?.todo_title)field('source').textContent='Microsoft To Do: '+o.todo_title+' · Completed '+new Date(o.todo_completed_at).toLocaleDateString();
    for(const k of ['address','kind','client','purpose','due','notes'])field(k).value=o?.[k]||'';
    renderContacts(o?.points_of_contact);
    field('fee').value=o?.fee ?? '';
    field('invoice-lines').replaceChildren();updateRequirements();
    field('photos').checked=!!o?.needs_photos;
    field('appointment-needed').checked=!!o?.appointment_needed;
    field('state-label').hidden=!o;
    field('state').value=o?.on_hold?'hold':o?.complete?'completed':'open';
    const photos=field('photo-link');
    photos.replaceChildren();
    if(o?.photo_id){
      if(account===membership.photo_owner){
        if(fieldApp){
          photos.append(fieldPhotoButton(o,'Open photos'));
        }else{
          const link=el('a','Open PT Photos');
          link.href='/photos?set='+encodeURIComponent(o.photo_id);
          link.target='_blank';link.rel='noopener';
          photos.append(link);
        }
      }else photos.textContent='Photo set in PT Photos � realty sign-in';
    }
    field('order-link').value=o?.order_link || '';
    field('lockbox-code').value=o?.lockbox_code || '';
    field('gate-code').value=o?.gate_code || '';
    updateOrderLink();
    if(o?.appointment){const t=new Date(o.appointment);field('appointment').value=new Date(t-t.getTimezoneOffset()*60000).toISOString().slice(0,16);}
    if(o?.appointment && o.appointment_window){
      const end=appointmentEnd(o);
      field('appointment-end').value=String(end.getHours()).padStart(2,'0')+':'+String(end.getMinutes()).padStart(2,'0');
    }
    syncEndTimeField();
    field('details').hidden=false;showOrderInvoice(o?.id);if(!fieldApp)showFolder(o);render();field(o?'title':'address').focus();fieldApp?.recordView();
  }
  async function submit(event){
    event.preventDefault();const save=field('save');if(save.disabled)return;save.disabled=true;
    const version=generation,original=editing;
    try{
      const client=field('client').value, address=field('address').value.trim();
      if((!client && field('client').required)||!address)throw Error('Enter the address and client.');
      const changes={address,points_of_contact:readContacts(),purpose:field('purpose').value.trim()||null,order_link:updateOrderLink(),lockbox_code:field('lockbox-code').value.trim()||null,gate_code:field('gate-code').value.trim()||null,fee:field('fee').value || null,appointment_needed:field('appointment-needed').checked,list_name:field('destination').value||null,kind:field('kind').value||null,client:client||null,due:field('due').value||null,notes:field('notes').value,...appointmentChanges(original)};
      if(original)await update(original,{...changes,complete:field('state').value==='completed',on_hold:field('state').value==='hold',needs_photos:field('photos').checked});
      else {
        if(!field('billing').disabled){
          changes.invoice_target=field('invoice-target').value.trim()||null;
          changes.invoice_extra_lines=Array.from(field('invoice-lines').children,row=>{
            const [description,amount,date]=row.querySelectorAll('input');
            if(!description.value.trim())throw Error('Enter a description for each invoice line.');
            return {kind:row.querySelector('select').value,description:description.value.trim(),amount:Number(amount.value),date:date.value};
          });
        }
        const {error}=await db.from('field_orders').insert({...changes,id:draftId,needs_photos:field('photos').checked});
        if(error&&error.code!=='23505')throw error;
        if(error){const r=await db.from('field_orders').select('id').eq('id',draftId).maybeSingle();if(!r.data)throw error;}
      }
      if(version===generation){closeDetails();await load();}
    }catch(e){if(version===generation)field('error').textContent=e.message;}finally{save.disabled=false;}
  }
  function mount(){
    const anchor=document.querySelector(fieldApp?'#fieldPhotos':'#appNavNew');if(!membership||!anchor)return;
    if(!menu){menu=el('button','Dashboard');menu.id='ptOrderNav';menu.className='app-nav-action';menu.onclick=open;}
    if(menu.nextElementSibling!==anchor)anchor.before(menu);
    if(panel)return;
    panel=el('section');panel.id='ptOrders';panel.innerHTML=`
      <header><div><small>ORDER MANAGEMENT</small><h1>Dashboard</h1><p id="od-count" aria-live="polite"><span id="od-total"></span><span id="od-today"></span><span id="od-overdue"></span></p></div></header>
      <nav><button id="od-new">New order</button><button id="od-new-list">New List</button><button type="button" id="od-main-open">Open orders</button><span class="od-open-picker" id="od-picker" hidden><select id="od-open" aria-label="Open orders lists"><option value="">Open orders</option></select></span><button id="od-rename-list" hidden>Rename list</button><button id="od-delete-list" hidden>Delete list</button><button id="od-hold">On Hold</button><button id="od-completed">Completed</button><button type="button" id="od-manage-clients">Manage clients</button><a id="od-calendar" href="https://outlook.cloud.microsoft/calendar/" target="_blank" rel="noopener">Outlook calendar</a></nav>
      <dialog closedby="any" id="od-clients-dialog" aria-labelledby="od-clients-title">
      <h2 id="od-clients-title">Manage clients</h2>
      <form id="od-add-client-form"><label>New client name<input id="od-new-client" maxlength="160" required></label>
      <button id="od-add-client">Add client</button></form>
      <label>Existing client<select id="od-client-choice"></select></label>
      <label>Linked QuickBooks customer<select id="od-match-choice" disabled></select></label>
      <button type="button" id="od-save-match" disabled>Save match</button>
      <button type="button" id="od-remove-client" disabled>Remove from dropdown</button>
      <button type="button" id="od-close-clients">Close</button><p id="od-client-message" role="status"></p></dialog>
      <form id="od-list-form" hidden><label>List name<input id="od-name" maxlength="80" required></label>
      <button id="od-create-list">Create list</button> <button type="button" id="od-cancel-list">Cancel</button></form>
      <label>Search all orders<input id="od-search" type="search" placeholder="Address, client, order type, or notes"></label>
      <p id="od-status" role="status"></p><div class="od-columns"><div><div id="od-list"></div><button id="od-prev" hidden>Previous page</button> <button id="od-next" hidden>Next page</button></div>
      <aside id="od-details" aria-labelledby="od-title" hidden><form id="od-form"><header><h2 id="od-title" tabindex="-1"></h2><button type="button" id="od-cancel">Close</button></header>
      <div id="od-invoice" role="status" hidden></div><p id="od-source" hidden></p><label>List<select id="od-destination"></select></label><label><span id="od-address-label">Property address</span><input id="od-address" maxlength="500" required></label>
      <label>Order type<select id="od-kind" required></select></label>
      <label>Client<select id="od-client" required></select></label>
      <label>Purpose of Order<input id="od-purpose" type="text"></label>
      <div id="od-contacts"></div>
      <label>Order fee ($)<input type="number" id="od-fee" inputmode="decimal" min="0" max="9999999999.99" step="0.01"></label>
      <fieldset id="od-billing"><legend>QuickBooks invoice</legend><p id="od-monthly" hidden>This BPO uses the date entered as its service date on the client's monthly invoice.</p>
      <label>Existing open invoice number (optional)<input id="od-invoice-target" maxlength="21"></label><div id="od-invoice-lines"></div><button type="button" id="od-add-line">Add invoice line</button></fieldset>
      <label>Due date<input type="date" id="od-due" required></label>
      <label>Appointment date and start time (optional)<input type="datetime-local" id="od-appointment"></label>
      <label hidden id="od-appointment-end-label">End time (optional)<input type="time" id="od-appointment-end"></label>
      <label><input type="checkbox" id="od-photos"> Photos needed</label>
      <label><input type="checkbox" id="od-appointment-needed"> Appointment Needed</label>
      <div id="od-photo-link"></div>${fieldApp?'':'<div id="od-folder-link"></div>'}<label id="od-state-label">Order status<select id="od-state"><option value="open">Open orders</option><option value="hold">On Hold</option><option value="completed">Completed</option></select></label>
      <label>Order Link<input id="od-order-link" type="text" inputmode="url" autocapitalize="none" spellcheck="false" placeholder="https://"></label>
      <a id="od-open-order-link" target="_blank" rel="noopener noreferrer" hidden>Open order link</a>
      <div class="od-entry-codes"><label>Lockbox Code<input id="od-lockbox-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false"></label>
      <label>Gate Code<input id="od-gate-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false"></label></div>
      <label>Notes<textarea id="od-notes" rows="5"></textarea></label>
      <p id="od-error" role="alert"></p>
      <button id="od-save">Save order</button></form></aside></div>
      <dialog id="od-attempt-dialog" aria-labelledby="od-attempt-title" closedby="any"><h2 id="od-attempt-title">Record contact attempt</h2><p id="od-attempt-context"></p>
      <button type="button" id="od-attempt-call">Call</button> <button type="button" id="od-attempt-text">Text</button> <button type="button" id="od-attempt-cancel">Cancel</button></dialog>
      <dialog id="od-phone-dialog" aria-labelledby="od-phone-number" closedby="any">
      <h2 id="od-phone-number"></h2><a id="od-call-number">Call</a> <a id="od-text-number">Text</a>
      <button id="od-phone-cancel" type="button">Cancel</button></dialog>`;
    field('attempt-cancel').onclick=()=>field('attempt-dialog').close();
    for(const id of ['call-number','text-number','phone-cancel'])field(id).onclick=()=>field('phone-dialog').close();
    if(fieldApp){
      document.getElementById('fieldDashboardHost').append(panel);
      const photosTab=document.getElementById('fieldPhotos');
      photosTab.parentElement.hidden=false;
      menu.setAttribute('aria-pressed','false');
      photosTab.onclick=()=>{if(document.body.classList.contains('pt-orders-open')){hide();fieldApp.resumePhotos();fieldApp.recordView();}};
    }else document.querySelector('#appNavShell').after(panel);
    field('search').oninput=()=>{
      ++request;
      clearTimeout(searchTimer);
      page=0;
      searchTimer=setTimeout(load,200);
    };
    for(const [id,direction] of [['prev',-1],['next',1]]){
      field(id).onclick=()=>{if(!canLeave())return;closeDetails();page+=direction;field('prev').hidden=field('next').hidden=true;load();};
    }
    field('kind').onchange=()=>{updatePhotoDefault();updateRequirements();};
    field('client').onchange=()=>{updatePhotoDefault();updateRequirements();};
    field('add-line').onclick=addInvoiceLine;
    field('appointment').oninput=syncEndTimeField;
    field('form').oninput=()=>{dirty=true;};
    field('order-link').oninput=updateOrderLink;
    field('photos').onchange=()=>{photosOverridden=true;};
    field('kind').append(new Option('Choose order type',''),...kinds.map(k=>new Option(kindLabel(k),k)));
    field('new').onclick=()=>edit(null);field('cancel').onclick=()=>{if(canLeave())closeDetails();};field('form').onsubmit=submit;
    function switchList(status,name=''){
      if(!canLeave())return false;
      closeDetails();
      field('search').value='';page=0;clearTimeout(searchTimer);
      field('list-form').hidden=true;
      currentList=status;selectedList=name;
      load();
      return true;
    }
    field('destination').onchange=updateRequirements;
    field('main-open').onclick=()=>switchList('open');
    field('open').onchange=()=>{
      if(!switchList('open',field('open').value)){
        field('open').selectedIndex=currentList==='open' && !searchText()?namedLists.indexOf(selectedList)+2:0;
      }
    };
    for(const status of ['hold','completed'])field(status).onclick=()=>switchList(status);
    let renameFrom=null;
    function openListForm(originalName){
      if(!canLeave())return;
      closeDetails();
      renameFrom=originalName;
      field('create-list').textContent=originalName?'Save name':'Create list';
      field('name').value=originalName || '';
      field('list-form').hidden=false;
      field('name').focus();
      field('name').select();
    }
    field('new-list').onclick=()=>openListForm(null);
    field('rename-list').onclick=()=>openListForm(selectedList);
    field('delete-list').onclick=async()=>{
      const name=selectedList,button=field('delete-list'),version=generation;
      if(!name || button.disabled || !canLeave())return;
      if(!window.confirm('Delete “'+name+'”? Its open tasks will move to Open orders. Held and completed tasks will keep their status.'))return;
      closeDetails();
      button.disabled=true;
      try{
        const {error}=await db.from('order_lists').delete().eq('name',name);
        if(error)throw error;
        if(version===generation)switchList('open');
      }catch(e){if(version===generation)field('status').textContent=e.message;}
      finally{button.disabled=false;}
    };
    field('cancel-list').onclick=()=>{field('list-form').hidden=true;};
    field('list-form').onsubmit=async event=>{
      event.preventDefault();
      const name=field('name').value.trim(),button=field('create-list'),version=generation;
      if(button.disabled)return;
      if(!name || name.toLowerCase()==='open orders'){
        field('status').textContent='Choose a different list name.';return;
      }
      button.disabled=true;
      try{
        const table=db.from('order_lists');
        const {error}=renameFrom
          ? await table.update({name}).eq('name',renameFrom).select('name').single()
          : await table.insert({name});
        if(error)throw Error(error.code==='23505'?'A list with that name already exists.':error.message);
        if(version!==generation)return;
        field('list-form').reset();field('list-form').hidden=true;
        switchList('open',name);
      }catch(e){if(version===generation)field('status').textContent=e.message;}
      finally{button.disabled=false;}
    };
    const clientChoice=field('client-choice'),removeClient=field('remove-client');
    let linked=new Map(),customers=[],matchesLoaded=false,matchBusy=false;
    const matchChoice=field('match-choice');

    function showMatch(){
      const match=linked.get(clientChoice.value);
      const select=customers.find(c=>match?.customer_id?c.id===match.customer_id:c.name===match?.customer_name);
      const emptyLabel=!clientChoice.value || !matchesLoaded ? 'Choose an existing client' : match ? 'Unmatched' : 'No QuickBooks customer linked';
      matchChoice.replaceChildren(new Option(emptyLabel,''),...customers.map(c=>new Option(c.name,c.id)));
      if(match && !select)matchChoice.add(new Option(match.customer_name+' (unavailable)','current'));
      matchChoice.value=select?.id || (match?'current':'');
      matchChoice.disabled=matchBusy || !matchesLoaded || !clientChoice.value;
      field('save-match').disabled=true;
      removeClient.disabled=matchBusy || !clientChoice.value;
    }
    function showClientChoices(){
      clientChoice.replaceChildren(new Option('Choose client',''),
        ...clients.filter(c=>c.listed!==false).map(c=>new Option(c.name,c.name)));
      showMatch();
    }
    function refreshClientDropdowns(){
      const selected=field('client').value;
      populateClients(editing?.client);
      field('client').value=selected;
      showClientChoices();
    }
    field('add-client-form').onsubmit=async event=>{
      event.preventDefault();
      const name=field('new-client').value.trim(),button=field('add-client'),version=generation;
      if(button.disabled)return;
      if(!name){field('client-message').textContent='Enter a client name.';return;}
      button.disabled=true;
      try{
        const added=await qbo('saveCustomerMatch',{add:true,client:name,autoMatch:true});
        if(version!==generation)return;
        const data=added.client;
        if(added.match){
          linked.set(data,added.match);
          if(added.match.customer_id && !customers.some(c=>c.id===added.match.customer_id)){
            customers.push({id:added.match.customer_id,name:added.match.customer_name});
            customers.sort((a,b)=>a.name.localeCompare(b.name));
          }
        }else linked.delete(data);
        ++request;
        const existing=clients.find(c=>c.name===data);
        if(existing)existing.listed=true;
        else{
          clients.push({name:data,listed:true,monthly_bpo:added.monthly_bpo});
          clients.sort((a,b)=>a.name.localeCompare(b.name));
        }
        refreshClientDropdowns();
        clientChoice.value=data;
        showMatch();
        field('add-client-form').reset();
        field('client-message').textContent=added.match?'Client saved and linked to QuickBooks.':'Client saved. Choose a QuickBooks customer below to link it.';
      }catch(e){if(version===generation)field('client-message').textContent=e.message;}
      finally{button.disabled=false;}
    };
    let directoryRequest=0;
    field('manage-clients').onclick=async()=>{
      const ticket=++directoryRequest,version=generation;
      matchesLoaded=false;linked=new Map();customers=[];
      showClientChoices();
      field('add-client').disabled=true;
      field('client-message').textContent='Loading QuickBooks customer matches...';
      field('clients-dialog').showModal();
      try{
        const data=await qbo('customerDirectory');
        if(version!==generation || ticket!==directoryRequest)return;
        linked=new Map(data.matches.map(m=>[m.client,m]));customers=data.customers;
        matchesLoaded=true;showClientChoices();
        field('add-client').disabled=false;
        field('client-message').textContent=data.unavailable?'QuickBooks customers could not be loaded. Saved matches are shown.':'';
      }catch(e){if(version===generation && ticket===directoryRequest)field('client-message').textContent=e.message;}
    };
    matchChoice.onchange=()=>{field('save-match').disabled=matchChoice.disabled || matchChoice.value==='current';};
    field('save-match').onclick=async()=>{
      if(matchBusy || !matchesLoaded || !clientChoice.value)return;
      const version=generation,client=clientChoice.value,previous=linked.get(client);
      matchBusy=true;clientChoice.disabled=matchChoice.disabled=removeClient.disabled=field('save-match').disabled=true;
      try{
        const data=await qbo('saveCustomerMatch',{client,customerId:matchChoice.value,previous:previous?.customer_id ?? previous?.customer_name ?? ''});
        if(version!==generation)return;
        if(data.match)linked.set(client,data.match);else linked.delete(client);
        showClientChoices();clientChoice.value=client;
        field('client-message').textContent=data.match?'Match saved for '+client+'.':client+' is now unmatched.';
      }catch(e){if(version===generation)field('client-message').textContent=e.message;}
      finally{matchBusy=false;clientChoice.disabled=false;if(version===generation)showMatch();}
    };
    field('close-clients').onclick=()=>field('clients-dialog').close();
    clientChoice.onchange=showMatch;
    removeClient.onclick=async()=>{
      const name=clientChoice.value,version=generation;
      if(!name || removeClient.disabled)return;
      removeClient.disabled=clientChoice.disabled=true;
      try{
        const {error}=await db.from('order_clients').update({listed:false}).eq('name',name).select('name').single();
        if(version!==generation)return;
        if(error)throw error;
        ++request;
        const client=clients.find(c=>c.name===name);
        if(client)client.listed=false;
        refreshClientDropdowns();
        field('client-message').textContent=name+' removed from the dropdown.';
      }catch(e){if(version===generation)field('client-message').textContent=e.message;}
      finally{
        clientChoice.disabled=false;
        removeClient.disabled=!clientChoice.value;
      }
    };
    field('calendar').onclick=event=>{
      if(event.defaultPrevented || !/Edg\//.test(navigator.userAgent))return;
      event.preventDefault();
      field('status').textContent='To open your existing Outlook tab, reload PropertyThesis Importers in Edge, then refresh this dashboard.';
    };
    if(fieldApp){
      fieldApp.dashboard={
        view:()=>({screen:'dashboard',list:currentList,name:selectedList,page,search:searchText(),
          detail:field('details').hidden?null:editing?.id || 'new'}),
        hide,
        restore:async view=>{
          const sameDetail=!field('details').hidden && (editing?.id || 'new')===view.detail;
          if(!sameDetail && !canLeave())return false;
          if(!sameDetail)closeDetails();
          currentList=view.list;selectedList=view.name;page=view.page;field('search').value=view.search;
          open();
          if(view.detail && !sameDetail){
            if(view.detail==='new')edit(null);
            else{
              const {data,error}=await db.from('field_orders').select('*').eq('id',view.detail).maybeSingle();
              if(error)throw error;
              if(data)edit(data);
            }
          }
          return true;
        }
      };
    }
    if(landing){landing=false;open();}
  }
  async function auth(session){
    const id=session?.user?.id||null;if(id===account)return;
    clearTimeout(midnightTimer);clearTimeout(searchTimer);page=0;openDates=[];
    const old=account;account=id;const version=++generation;hide();menu?.remove();panel?.remove();panel=menu=membership=null;orders=[];clients=[];currentList='open';selectedList='';namedLists=[];
    if(fieldApp)document.getElementById('fieldViews').hidden=true;
    if(!id){if(old)landing=fieldApp ? fieldApp.startOnDashboard : true;return;}
    const {data,error}=await db.from('order_members').select('photo_owner').eq('user_id',id).maybeSingle();
    if(version!==generation||error||!data)return;membership=data;mount();
  }
  function init(){
    db=window.PropertyThesisSession?.getClient();if(!db)return;
    db.auth.onAuthStateChange((_e,s)=>setTimeout(()=>auth(s),0));
    db.auth.getSession().then(({data})=>auth(data.session));
    new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{const target=e.target.closest('#appNavShell button,#appNavShell a,#ptBpoMenu button');if(target && target!==menu && target.target!=='_blank'){landing=false;hide();}},true);
    function refreshVisibleOrders(){
      if(!document.hidden && document.body.classList.contains('pt-orders-open') && field('details').hidden &&
         field('list-form').hidden && !field('open').matches(':focus'))load();
    }
    window.addEventListener('focus',refreshVisibleOrders);
    setInterval(refreshVisibleOrders,60000);

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

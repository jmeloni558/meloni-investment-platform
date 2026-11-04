'use strict';
function inspectBOA(payload, approved){
  const norm=x=>String(x??'').toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
  const orderId=new URL(location.href).searchParams.get('id');
  if(location.origin!=='https://www.acisky.com'||location.pathname.toLowerCase()!=='/formlayout/index'||!orderId)throw Error('Open the Service Link - BOA order in ACI Sky.');
  const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
  const footers=[...document.querySelectorAll('.formLabel span')].filter(visible).map(e=>e.textContent.trim()).filter(t=>/^Page \d+ of \d+$/.test(t));
  const page=footers.length===1?['','Page 1 of 3','Page 2 of 3'].indexOf(footers[0]):-1;
  if(page<1)throw Error('Open page 1 or page 2 of the BOA drive-by form.');
  if(payload?.format!=='propertythesis-boa'||payload.version!==1||!Array.isArray(payload.fields)||payload.fields.length>350)throw Error('Invalid Service Link - BOA transfer file.');
  const controls=[...document.querySelectorAll('.reportField[data-tag]')].filter(visible);
  const find=(group,tag)=>controls.filter(e=>e.dataset.tag===['SLBOABPODB_23',group,tag+'.1'].join('\\'));
  const get=(g,t)=>{const list=find(g,t);return list.length===1?list[0]:null;};
  const addressTags=page===1?['SUBJ_PROPERTY_ADDRESS','CITY','STATE','ZIP_CODE']:['GS_ADDRESS','GS_CITY','GS_STATE','GS_ZIP_CODE'];
  for(const [i,k] of ['address','city','state','zip'].entries()){
    const identity=norm(payload.subject?.[k]);
    if(!identity||identity!==norm(get('SUBJECT',addressTags[i])?.value))throw Error('The subject does not match the open BOA order.');
  }
  const seen=new Set();
  for(const f of payload.fields){
    const key=[f.page,f.group,f.tag].join('/');
    if(!globalThis.PTBOASchema.allowed(f.page,f.group,f.tag)||typeof f.value!=='string'||!f.value.trim()||seen.has(key)||f.tag.endsWith('_X')&&f.value!=='X')throw Error('Unexpected or duplicate field in transfer file.');
    seen.add(key);
  }
  const rows=payload.fields.filter(f=>f.page===page);
  function status(f,el){
    if(!el||el.readOnly||el.disabled)return 'locked or unavailable';
    if(f.group!=='SUBJECT'){
      const key=f.tag.slice(0,3)+'ADDRESS';
      const address=rows.find(x=>x.group===f.group&&x.tag===key);
      const existing=get(f.group,key);
      if(!address||!existing||existing.value.trim()&&norm(existing.value)!==norm(address.value))return 'different or missing comparable';
    }
    if(el.value.trim())return el.value.trim()===f.value?'already entered':'existing entry preserved';
    if(el.maxLength>=0&&f.value.length>el.maxLength)return 'too long';
    if(el.dataset.group&&controls.some(other=>other!==el&&other.dataset.group===el.dataset.group&&other.value.trim()))return 'existing selection preserved';
    return 'ready';
  }
  const result=rows.map(f=>({...f,status:status(f,get(f.group,f.tag))}));
  if(approved){
    if(approved.orderId!==orderId||approved.page!==page)throw Error('The BOA order or page changed. Preview this page again.');
    const keys=['page','group','tag','value','status'];
    if(!Array.isArray(approved.rows)||approved.rows.length!==result.length)throw Error('The list of fields changed. Preview this page again.');
    for(const [i,row] of result.entries()){
      if(keys.some(key=>approved.rows[i]?.[key]!==row[key]))throw Error(row.group+' '+row.tag+' changed. Preview this page again.');
    }
    for(const f of result.filter(row=>row.status==='ready')){
      const el=get(f.group,f.tag);
      if(status(f,el)!=='ready'){f.status='changed during fill';continue;}
      el.focus();
      if(el.dataset.checkboxType)el.click();
      else{el.value=f.value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
      el.blur();
      f.status=el.value.trim()===f.value?'filled':'check manually';
    }
  }
  return {orderId,page,rows:result};
}
globalThis.inspectBOA=inspectBOA;

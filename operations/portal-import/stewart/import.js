'use strict';
// Injected in the extension's isolated world. Keep the lock on the order tab if the popup closes.
async function importStewartComps(payload) {
  const stop = message => { throw new Error(message); };
  if (location.origin !== 'https://www.protk.com' || !/^\/ProTeck\.Fulfillment\.Case\.Forms\/CaseFormPortal\/DataEntry\/\d+\/?$/i.test(location.pathname))
    return ['Open a Stewart HomeSteps order in Edge.'];
  if (globalThis.stewartImportBusy) return ['An import is already running on this order.'];
  globalThis.stewartImportBusy = true;
  const rows = [];
  const norm = value => String(value || '').toLowerCase().replace(/[.,]/g,' ').replace(/\b(street|road|avenue|drive|lane|court|boulevard|terrace|circle|apartment|suite)\b/g,
    word => ({street:'st',road:'rd',avenue:'ave',drive:'dr',lane:'ln',court:'ct',boulevard:'blvd',terrace:'ter',circle:'cir',apartment:'unit',suite:'unit'})[word])
    .replace(/#\s*|\bapt\s+/g,'unit ').replace(/\s+/g,' ').trim();
  const visible = el => !!el?.getClientRects().length;
  const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
  const modal = () => document.getElementById('manual-comparable-select-modal');
  const subject = payload.subject;
  function checkOrder() {
    const heading = [...document.querySelectorAll('h1')].map(el=>norm(el.textContent.split(/\(\s*case\s*#/i)[0]));
    if (!heading.some(h=>h.startsWith(norm(subject.address)+' ') && h.endsWith(norm(subject.state+' '+subject.zip))))
      stop('The open order does not match the transfer subject street, state and ZIP.');
  }
  function control(kind,slot,key) {
    const prefix = kind==='sold'?'CompSale':'CompListing';
    const id = (key.startsWith('Adjustment:')?prefix+'Adjustments':prefix)+'_'+key.replace(/^Adjustment:/,'')+'_'+slot+'_field';
    const nodes = document.querySelectorAll('#'+id+', [name="'+id+'"]');
    return nodes.length===1 && visible(nodes[0]) && /^(INPUT|TEXTAREA|SELECT)$/.test(nodes[0].tagName)?nodes[0]:null;
  }
  function slotData(comp,i) {
    const get=key=>control(comp.kind,i,key)?.value?.trim()||'';
    return {i,address:get('Address'),second:get('Address2'),unit:get('UnitNumber'),mls:get('MlsNumber'),zip:get('Zip'),
      facts:['SalePrice','CurrentListPrice','LivingArea','BedroomCount','YearBuilt','DaysOnMarket'].map(get)};
  }
  const zipcode = c => c.zip || c.locality.match(/\b\d{5}(?:-\d{4})?$/)?.[0] || '';
  function vacant(c,s) {
    return ![s.address,s.second,s.unit,s.mls,s.zip,...s.facts].some(Boolean) &&
      Object.keys(c.fields).every(key=>{
        const node=control(c.kind,s.i,key);
        return !String(node?.tagName==='SELECT'?node.selectedOptions[0]?.textContent||'':node?.value||'').trim();
      });
  }
  function matches(c,s) {
    const extras=[s.second,s.unit].filter(Boolean);
    const address=norm(c.address),street=norm(s.address);
    const unit=norm(s.unit).replace(/^unit\s*/,'');
    const unitOK=!unit||address.endsWith('unit '+unit);
    const addressOK=address===street||extras.some(extra=>norm(s.address+' '+extra)===address)||unit&&address===norm(s.address+' unit '+unit);
    const secondOK=!s.second||norm(s.second)===norm(c.locality)||address.endsWith(norm(s.second))||norm(s.second)===unit;
    return addressOK && secondOK && unitOK && (!s.mls||!c.mls||norm(s.mls)===norm(c.mls)) && (!s.zip||!zipcode(c)||zipcode(c).slice(0,5)===s.zip.slice(0,5));
  }
  function set(el,value) {
    if (!visible(el)||el.disabled||el.readOnly) stop('A Stewart input is unavailable.');
    el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function fill(node,value,label) {
    if(!node||node.disabled||node.readOnly){rows.push(label+' · unavailable');return false;}
    const option=node.tagName==='SELECT';
    const current=option?(node.selectedOptions[0]?.textContent||'').trim():node.value.trim();
    if(current){
      if(current!==value.trim())rows.push(label+' · kept: '+current+' (transfer: '+value+')');
      return false;
    }
    const target=option?[...node.options].find(o=>norm(o.textContent)===norm(value))?.value:value;
    if(target==null){rows.push(label+' · no matching Stewart option for '+value);return false;}
    set(node,target);
    node.dispatchEvent(new Event('blur'));
    return true;
  }
  async function settled(c,i) {
    let last='',since=0;
    for(let n=0;n<80;n++){
      await sleep(250);
      const s=slotData(c,i), signature=JSON.stringify(s);
      if(signature!==last){last=signature;since=Date.now();}
      if(!visible(modal())&&matches(c,s)&&s.address&&s.facts.some(Boolean)&&Date.now()-since>=1500)return;
    }
    stop(c.address+' needs review in Stewart. The lookup did not yield a stable matching listing.');
  }
  async function add(c,i) {
    const zip=zipcode(c);
    if(!zip)stop('Add the comp ZIP in Property Thesis for '+c.address+' and export again.');
    const section=document.getElementById(c.kind==='sold'?'saleCompsSection':'listingCompsSection');
    const link=[...(section?.querySelectorAll('a')||[])].filter(a=>visible(a)&&a.textContent.trim()==='Add Address');
    if(link.length!==1||visible(modal()))stop('Close the open lookup or review the Add Address control.');
    link[0].click();
    for(let n=0;n<20&&!visible(modal());n++)await sleep(100);
    const dialog=modal();
    if(!visible(dialog))stop('Stewart did not open Add Address.');
    const select=dialog.querySelector('#ComparableSlot');
    const label=new RegExp('^'+(c.kind==='sold'?'Sales?':'Listings?')+'\\s+'+i+'$','i');
    const option=[...(select?.options||[])].find(o=>label.test(o.text.trim()));
    if(!option)stop('The requested slot is unavailable.');
    set(select,option.value);
    set(dialog.querySelector('#ComparableZipCode'),zip);
    set(dialog.querySelector('#ComparableMlsNumber'),c.mls||'');
    set(dialog.querySelector('#ComparableAddress'),c.mls?'':c.address);
    const addButton=dialog.querySelector('#addComparableBtn');
    if(!visible(addButton))stop('Stewart did not show Add Comparable.');
    if(!vacant(c,slotData(c,i)))stop('The slot was populated during lookup. Run again to match it.');
    addButton.click();
  }
  try {
    checkOrder();
    for(const c of payload.comps){
      checkOrder();
      const slots=[1,2,3].filter(i=>control(c.kind,i,'Address')).map(i=>slotData(c,i));
      const nearby=slots.filter(s=>s.address&&(matches(c,s)||norm(c.address)===norm(s.address)||c.mls&&norm(c.mls)===norm(s.mls)));
      if(nearby.length>1||nearby.length===1&&!matches(c,nearby[0]))stop('Review the existing Stewart slot for '+c.address+'. Its identity is ambiguous.');
      const selected=nearby[0]||slots.find(s=>vacant(c,s));
      if(!selected)stop('No empty '+c.kind+' slot for '+c.address+'.');
      if(!nearby.length)await add(c,selected.i);
      await settled(c,selected.i);
      let filled=0;
      const adjustments=Object.entries(c.adjustments||{}).map(([k,v])=>['Adjustment:'+k,v]);
      for(const [key,value] of [...Object.entries(c.fields),...adjustments]){
        checkOrder();
        if(!matches(c,slotData(c,selected.i)))stop('Slot identity changed. Review '+c.address+'.');
        if(fill(control(c.kind,selected.i,key),value,c.address+' · '+key))filled++;
      }
      const note=control(c.kind,selected.i,'Comments');
      if(c.legacyComment && note && !note.disabled && !note.readOnly && note.value===c.legacyComment && matches(c,slotData(c,selected.i))){
        set(note,c.fields.Comments||'');
        rows.push(c.address+' · removed previously imported adjustment text from comments.');
      }
      for(const item of c.manualAdjustments||[])rows.push(c.address+' · review unmapped adjustment: '+item);
      rows.push(c.address+' · '+(nearby.length?'Matched':'Added')+' in '+c.kind+' '+selected.i+' · '+filled+' blank fields filled.');
    }
    for(const [key,value] of Object.entries(payload.orderFields||{})){
      checkOrder();
      const node=document.getElementById(key+'_field');
      if(fill(visible(node)?node:null,value,key))rows.push(key+' · filled');
    }
  } catch(error) { rows.push('Stopped: '+error.message); }
  finally { globalThis.stewartImportBusy=false; }
  return rows;
}
if(typeof module!=='undefined')module.exports={importStewartComps};

(function(root){
 'use strict';
 let nextId=0;
 const bound=new WeakSet();
 function preserveUnit(address,typed){
  const pattern=/(?:\b(?:apt\.?|unit|suite|ste\.?)\s*|#\s*)([a-z0-9-]+)\b/i;
  const unit=String(typed).match(pattern)?.[1];
  if(!unit||pattern.test(address))return address;
  const comma=address.indexOf(',');return comma<0?address+' #'+unit:address.slice(0,comma)+' #'+unit+address.slice(comma);
 }
 function attach(input,api,{onSelect,shouldSearch=()=>true}={}){
  if(!input||bound.has(input))return;bound.add(input);
  const doc=input.ownerDocument,id='address-options-'+(++nextId);
  const panel=doc.createElement('div'),list=doc.createElement('div'),note=doc.createElement('small'),credit=doc.createElement('div');
  panel.className='address-suggestions';panel.hidden=true;list.id=id;list.setAttribute('role','listbox');list.setAttribute('aria-label','Suggested addresses');
  credit.className='maps-attribution';credit.setAttribute('translate','no');credit.textContent='Google Maps';panel.append(list,credit);
  note.className='address-help';note.id=id+'-help';note.setAttribute('role','status');note.textContent='Type at least 3 characters for U.S. address suggestions. Manual entry is available.';
  // Keep interactive suggestions outside the input's label.
  (input.closest('.pt-specific-row')||input.closest('label')||input).after(note,panel);
  input.setAttribute('autocomplete','off');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-describedby',note.id);
  let timer,version=0,active=-1,rows=[],composing=false;
  function close(){clearTimeout(timer);version++;rows=[];active=-1;panel.hidden=true;if(list.childNodes.length)list.replaceChildren();input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
  function select(index){if(input.disabled||!rows[index])return;const selected=rows[index];const value=preserveUnit(rows[index].address,input.value);close();input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));close();input.dispatchEvent(new Event('change',{bubbles:true}));note.textContent='Address selected. Check the unit number before continuing.';input.focus();if(onSelect)onSelect({...selected,address:value});}
  function highlight(index){active=index;[...list.children].forEach((el,i)=>el.setAttribute('aria-selected',String(i===active)));if(active>=0)input.setAttribute('aria-activedescendant',id+'-'+active);}
  async function search(query,requestVersion){
   if(version!==requestVersion||!input.isConnected||input.disabled)return;
   note.textContent='Finding addresses…';
   try{
    const data=await api('/api/address-suggestions','POST',{input:query});
    if(version!==requestVersion||!input.isConnected||input.disabled)return;
    rows=Array.isArray(data.suggestions)?data.suggestions.filter(r=>typeof r.address==='string'&&r.address.length<=250).slice(0,5):[];
    list.replaceChildren();active=-1;
    rows.forEach((row,i)=>{const option=doc.createElement('button');option.type='button';option.tabIndex=-1;option.className='address-option';option.id=id+'-'+i;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.textContent=row.address;option.onmousedown=e=>e.preventDefault();option.onclick=()=>select(i);list.append(option);});
    panel.hidden=!rows.length;input.setAttribute('aria-expanded',String(!!rows.length));note.textContent=rows.length?rows.length+' suggestions. Choose an address or keep typing.':'No suggestions found. You can enter the complete address manually.';
   }catch(error){if(version===requestVersion&&input.isConnected){close();note.textContent=error?.status===429?'Address suggestion limit reached. You can still enter the complete address manually.':'Suggestions are unavailable. Enter the full address manually, or keep typing to retry.';}}
  }
  input.addEventListener('input',()=>{close();if(composing||!shouldSearch())return;const query=input.value.trim();if(query.length<3){note.textContent='Type at least 3 characters for address suggestions.';return;}const v=version;timer=setTimeout(()=>search(query,v),350);});
  input.addEventListener('compositionstart',()=>{composing=true;close();});input.addEventListener('compositionend',()=>{composing=false;input.dispatchEvent(new Event('input',{bubbles:true}));});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return;}if(!rows.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();highlight(active<0?(e.key==='ArrowDown'?0:rows.length-1):(active+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length);}if(e.key==='Enter'){e.preventDefault();select(active>=0?active:0);}if(e.key==='Tab')close();});
  input.addEventListener('blur',()=>setTimeout(()=>{if(!panel.contains(doc.activeElement))close();},180));
  return {close};
 }
 const exports={attach,preserveUnit};if(typeof module!=='undefined')module.exports=exports;else root.PTAddressAutocomplete=exports;
})(typeof window!=='undefined'?window:globalThis);

'use strict';
// Injected in the extension's isolated world. Keep the lock on the order tab if the popup closes.
async function importStewartComps(payload) {
  const stop = message => { throw new Error(message); };
  if (location.origin !== 'https://www.protk.com' || !/^\/ProTeck\.Fulfillment\.Case\.Forms\/CaseFormPortal\/DataEntry\/\d+\/?$/i.test(location.pathname))
    return ['Open a Stewart HomeSteps order in Edge.'];
  if (globalThis.stewartImportBusy) return ['An import is already running on this order.'];
  globalThis.stewartImportBusy = true;
  const rows = [];
  const norm = value => String(value || '').toLowerCase().replace(/[.,]/g,' ').replace(/\b(trail|street|road|avenue|drive|lane|court|boulevard|terrace|circle|apartment|suite)\b/g,
    word => ({trail:'trl',street:'st',road:'rd',avenue:'ave',drive:'dr',lane:'ln',court:'ct',boulevard:'blvd',terrace:'ter',circle:'cir',apartment:'unit',suite:'unit'})[word])
    .replace(/#\s*|\bapt\s+/g,'unit ').replace(/\s+/g,' ').trim();
  const visible = el => !!el?.getClientRects().length;
  const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
  const modal = () => document.getElementById('manual-comparable-select-modal');
  const subject = payload.subject;
  const fannie=payload.format==='propertythesis-stewart-fannie';
  function checkOrder() {
    const isFannie=[...document.querySelectorAll('h1,h2,h3')].some(el=>el.textContent.trim()==='FM MIT Interior BPO');
    if(fannie!==isFannie)stop('The open Stewart form does not match the selected importer.');
    const heading = [...document.querySelectorAll('h1')].map(el=>norm(el.textContent.split(/\(\s*case\s*#/i)[0]));
    if(fannie){
      const canonicalStreet = street => street.replace(/\btrail\b/g,'trl');
      const locality = norm([subject.city, subject.state, subject.zip].join(' '));
      const address = norm(subject.address);
      // Some exports already include the complete locality in the street field.
      const street = address.endsWith(' '+locality) ? address.slice(0,-(locality.length+1)) : address;
      const full = canonicalStreet(street)+' '+locality;
      const canonicalUnit=s=>s.replace(/\bunit\s+(?=[a-z0-9]+\b)/g,'');
      if(!heading.some(h=>h.endsWith(' '+locality) && canonicalUnit(canonicalStreet(h.slice(0,-locality.length-1))+' '+locality)===canonicalUnit(full)))stop('Check the subject address, unit, city, state and ZIP on the open Fannie Mae order.');
      return;
    }
    if (!heading.some(h=>h.startsWith(norm(subject.address)+' ') && h.endsWith(norm(subject.state+' '+subject.zip))))
      stop('The open order does not match the transfer subject street, state and ZIP.');
  }
  function control(kind,slot,key) {
    const prefix = kind==='sold'?'CompSale':'CompListing';
    const room=fannie&&/^(Unit(?:Room|Bedroom|Bath|HalfBath)Count)_1$/.exec(key);
    const id = room?prefix+'_'+room[1]+'_'+slot+'_1_field':(key.startsWith('Adjustment:')?prefix+'Adjustments':prefix)+'_'+key.replace(/^Adjustment:/,'')+'_'+slot+'_field';
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
    const unitOK=!unit||address.endsWith('unit '+unit)||(fannie&&address.endsWith(' '+unit));
    const addressOK=address===street||extras.some(extra=>norm(s.address+' '+extra)===address)||unit&&address===norm(s.address+' unit '+unit);
    const secondOK=!s.second||norm(s.second)===norm(c.locality)||address.endsWith(norm(s.second))||norm(s.second)===unit;
    // Feed addresses can omit the directional or append a unit absent from the export.
    // Require exact MLS, ZIP, house number, street and any unit explicitly supplied.
    const explicit=address.match(/\bunit\s+(\S+)$/);
    if(fannie&&c.mls&&norm(c.mls)===norm(s.mls)&&zipcode(c)&&zipcode(c).slice(0,5)===s.zip.slice(0,5)&&secondOK){
      const base=address.replace(/\s+unit\s+\S+$/,'');
      const direction=/^(\d+[a-z]?) (?:n|s|e|w|ne|nw|se|sw) (.+)$/;
      const streetOK=base===street||(!direction.test(street)&&base.replace(direction,'$1 $2')===street)||(!direction.test(base)&&street.replace(direction,'$1 $2')===base);
      if(streetOK&&(!explicit||explicit[1]===unit))return true;
    }
    return addressOK && secondOK && unitOK && (!s.mls||!c.mls||norm(s.mls)===norm(c.mls)) && (!s.zip||!zipcode(c)||zipcode(c).slice(0,5)===s.zip.slice(0,5));
  }
  function set(el,value) {
    if (!visible(el)||el.disabled||el.readOnly) stop('A Stewart input is unavailable.');
    el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function fill(node,value,label) {
    if(!visible(node)||node.disabled||node.readOnly){rows.push(label+' · unavailable');return false;}
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
  const defaults={SellerType:'Owner',TransactionType:'Fair Market',OwnershipType:'Fee Simple (Owner)',UnitsInProperty:'1',TotalBasementArea:'0',FinishedBasementArea:'0',HeatingType:'Heat Pump',FuelType:'Electric'};
  const fanniePropertyDefaults={LocationType:'Average',FoundationType:'None',HeatingType:'Heat Pump',FuelType:'Electric'};
  const valueOf=node=>node?.tagName==='SELECT'?(node.selectedOptions[0]?.textContent||'').trim():(node?.value||'').trim();
  function subjectDefaults(){
    const keys={UnitsInProperty:'Subject_UnitCountType',TransactionType:'MLSTransactionHistory_SubjectTransactionType'};
    for(const [key,value] of Object.entries(defaults)){
      const id=(keys[key]||'Subject_'+key)+'_field';
      const nodes=[...document.querySelectorAll('[id="'+id+'"]')].filter(visible);
      // Stewart repeats the subject in both grids. Never let a blank copy override a populated copy.
      if(nodes.some(n=>valueOf(n)&&norm(valueOf(n))!==norm(value)))continue;
      for(const node of nodes)fill(node,value,id);
    }
  }
  const money=v=>{
    const plain=v.replace(/[$,]/g,'').replace(/^\((.+)\)$/,'-$1');
    return /^[+-]?\d+(?:\.\d+)?$/.test(plain)?Number(plain):null;
  };
  function concessionDefaults(c,i){
    if(c.kind!=='sold')return;
    const old=control(c.kind,i,'Adjustment:SalesConcessions'),dest=control(c.kind,i,'Adjustment:FinancingConcessions');
    const entered=c.adjustments?.FinancingConcessions;
    const signed=Number(entered)>0?'+'+Number(entered):entered;
    const oldValue=money(valueOf(old)),destValue=money(valueOf(dest));
    if(oldValue!==null&&oldValue!==0&&signed!=null){
      // Version 1.0.1 wrote the signed adjustment in the sales column. Move only an exact match.
      if(oldValue!==Number(signed)||!old||old.readOnly||old.disabled||!dest||dest.disabled||dest.readOnly||
        (valueOf(dest)&&destValue!==Number(signed))){
        rows.push(c.address+' · review sales and financing adjustments; existing entries preserved.');return;
      }
      if(!valueOf(dest))set(dest,signed);
      if(money(valueOf(dest))!==Number(signed)){rows.push(c.address+' · financing amount not accepted; sales adjustment preserved.');return;}
      set(old,'0');
    }else if(signed!=null)fill(dest,signed,c.address+' financing adjustment');
    fill(control(c.kind,i,'SalesConcessions'),'0',c.address+' sales concessions');
    fill(old,'0',c.address+' sales concessions adjustment');
  }
  function radio(target){
    if(!visible(target)||target.disabled)return false;
    if(target.checked)return true;
    if([...document.getElementsByName(target.name)].some(n=>n.checked))return false;
    target.click();return target.checked;
  }
  function conditionDefaults(){
    for(const key of ['Subject_IsReportCompletedUsingValidityInspection','Subject_MixedUseOrCommercial'])
      radio(document.getElementById(key+'_field_No'));
    for(const [key,v] of [['Subject_HasIllegalUnits','No'],['Property_Zoning','Residential'],['Subject_RealEstateTaxPaymentSchedule','Annually']])
      fill(document.getElementById(key+'_field'),v,key);
    const by=key=>document.getElementById('SubjectCondition_'+key+'_field');
    for(const [key,answer] of Object.entries({InFinanceableCondition:'Yes',TitleLegalIssues:'No',HealthSafetyIssues:'No',EnvironmentalIssues:'No',ImmediateAttentionRequired:'No',InspectionRecommended:'No'})){
      radio(document.getElementById('SubjectCondition_'+key+'_field_'+answer));
    }
    for(const key of ['AppearStructurallySound','OnPermanentFoundation','KitchenAndBathFunctional','ElectricalSystemFunctioning','PlumbingSepticWaterSystemsWorking','RoofFreeOfLeaks','RoofFreeOfTemporaryRepairs','HvacSystemFunctional','PropertyFreeOfEnvironmentalHazards','PropertyFreeOfLeadBasedPaint','PropertyFreeOfWoodInsects','WoodInsectInspectionPerformed']){
      fill(by(key),key==='PropertyFreeOfWoodInsects'?'Unknown':key==='WoodInsectInspectionPerformed'?'No':'Yes',key);
    }
    for(const key of ['InitialTrashOutAmount','InitialCleaningAmount','InitialYardCleaningAmount','HealthAndSafetyAmount','OtherMaintenanceAmount','InitialPoolCleaningAmount','PoolPreservationAmount']){
      fill(by(key),key==='InitialCleaningAmount'?'250':'0',key);
    }
  }
  async function repairs(){
    const by=id=>document.getElementById(id);
    radio(by('SubjectRepairData_ExteriorRepairs_field_No'));
    fill(by('Subject_RecommendedListing_field'),'As Repaired','Recommended listing');
    if(!radio(by('SubjectRepairData_InteriorRepairs_field_Yes')))return;
    const reason=document.querySelector('#interiorRepairGrid textarea.notRecommendedRepairComments');
    if(visible(reason)&&!reason.disabled&&!reason.readOnly&&reason.value.trim()==='dddd')set(reason,'');
    const items=()=>[...document.querySelectorAll('#interiorRepairGrid select[id^="repair_item_"]')].filter(visible);
    for(let n=0;n<20&&!items().length;n++)await sleep(100);
    const persisted=item=>/^repair_item_\d+$/.test(item?.id||'');
    const suffixOf=item=>item.id.slice('repair_item_'.length);
    const exact=item=>{
      if(!persisted(item)||valueOf(item)!=='Other')return false;
      const id=suffixOf(item),get=p=>by(p+id);
      return money(valueOf(get('repair_cost_')))===50 && valueOf(get('repair_recommendation_'))==='Repair' &&
        ['','Other'].includes(valueOf(get('repair_subcategory_'))) && valueOf(get('repair_reason_'))==='Normal Wear & Tear' &&
        valueOf(get('repair_comment_'))==='no repairs required' && get('radio_yes_recommended')?.checked && get('radio_yes_lenderReq')?.checked;
    };
    const subcategory=item=>{
      if(item===items()[0]&&exact(item))fill(by('repair_subcategory_'+suffixOf(item)),'Other','Interior repair subcategory');
    };
    // Retain the first saved template; never touch a changed or unrelated repair.
    const copies=items().filter(exact);
    if(copies.length){
      const keep=copies[0].id;
      for(const copy of copies.slice(1)){
        checkOrder();
        const current=by(copy.id);
        if(!exact(by(keep))||!exact(current))break;
        const button=current.closest('tr')?.querySelector('a[alt="Delete row"] img.remove-row');
        if(!visible(button)){rows.push('Review duplicate Other repair: delete control unavailable.');return;}
        button.click();
        for(let n=0;n<50&&items().some(i=>i.id===copy.id);n++)await sleep(100);
        if(items().some(i=>i.id===copy.id)){rows.push('Stewart has not removed the duplicate. Review its delete prompt before rerunning.');return;}
      }
      subcategory(by(keep));
      return;
    }
    const list=items();
    const used=item=>[...item.closest('tr').querySelectorAll('input,select,textarea')].some(n=>visible(n)&&(n.type==='radio'||n.type==='checkbox'?n.checked:!!valueOf(n)));
    const existing=list.filter(used);
    if(existing.length&&(existing.length!==1||valueOf(existing[0])!=='Other')){
      rows.push('Interior repair rows already contain data; preserved for review.');return;
    }
    let item=existing[0]||list[0];if(!item){rows.push('Interior repair row unavailable; review in Stewart.');return;}
    let suffix=suffixOf(item);
    // Resume a partial default row, but never reinterpret an actual repair as this template.
    if(existing.length){
      const compatible=[['repair_cost_',v=>money(v)===50],['repair_recommendation_',v=>v==='Repair'],['repair_reason_',v=>v==='Normal Wear & Tear'],['repair_comment_',v=>v==='no repairs required'],['repair_subcategory_',v=>v==='Other']]
        .every(([prefix,ok])=>{const v=valueOf(by(prefix+suffix));return !v||ok(v);});
      if(!compatible||by('radio_no_recommended'+suffix)?.checked||by('radio_no_lenderReq'+suffix)?.checked){rows.push('Existing interior repair preserved for review.');return;}
    }
    fill(item,'Other','Interior damage');
    // A new row has a client-only ID. Multiple edits before Stewart assigns its
    // saved numeric ID can create multiple records. Never send a second edit to it.
    if(!persisted(item)){
      for(let n=0;n<100;n++){
        const saved=items().filter(i=>persisted(i)&&valueOf(i)==='Other');
        if(saved.length===1){item=saved[0];break;}
        if(saved.length>1)break;
        await sleep(100);
      }
    }
    if(!persisted(item)||valueOf(item)!=='Other'){rows.push('Waiting for Stewart to save the Other repair. Rerun after it is saved.');return;}
    suffix=suffixOf(item);
    for(const [prefix,v] of [['repair_cost_','50'],['repair_recommendation_','Repair'],['repair_reason_','Normal Wear & Tear'],['repair_comment_','no repairs required']])
      fill(by(prefix+suffix),v,'Interior '+prefix);
    for(const prefix of ['radio_yes_recommended','radio_yes_lenderReq'])if(!radio(by(prefix+suffix)))rows.push('Review interior repair recommendation: '+prefix);
    subcategory(by('repair_item_'+suffix));
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
  function fillOrder(){
    const orderFields={...payload.orderFields};
    if(fannie){
      const fallback={Subject_UnitCountType:'1',Subject_ZoningCompliance:'Legal',Subject_ZoningClassificationType:'Residential'};
      for(const [key,value] of Object.entries(fanniePropertyDefaults))fallback['Subject_'+key]=value;
      for(const key of ['Subject_MixedUseOrCommercial','SubjectCondition_ImmediateAttentionRequired','SubjectCondition_HealthSafetyIssues']){
        const selected=radio(document.getElementById(key+'_field_No'));
        if(key==='SubjectCondition_HealthSafetyIssues' && selected)
          fallback.SubjectCondition_HealthSafetyIssuesComments='There are no health or safety concerns in the home';
      }
      for(const [key,value] of Object.entries(fallback))orderFields[key]??=value;
    }
    if(fannie&&orderFields.Subject_FnmaConditionType)orderFields.SubjectCondition_ConditionType=orderFields.Subject_FnmaConditionType;
    for(const [key,value] of Object.entries(orderFields)){
      checkOrder();
      const nodes=[...document.querySelectorAll('[id="'+key+'_field"]')].filter(visible);
      if(!nodes.length){rows.push(key+' · unavailable');continue;}
      if(nodes.some(n=>valueOf(n)&&norm(valueOf(n))!==norm(value))){rows.push(key+' · kept existing entry');continue;}
      for(const node of nodes)if(fill(node,value,key))rows.push(key+' · filled');
    }
  }
  try {
    checkOrder();
    // These subject fields are independent of whether Stewart can resolve every comparable.
    if(fannie)fillOrder();else{subjectDefaults();conditionDefaults();}
    for(const c of payload.comps){
      checkOrder();
      const slots=[1,2,3].filter(i=>control(c.kind,i,'Address')).map(i=>slotData(c,i));
      const exact=slots.filter(s=>s.address&&matches(c,s));
      const nearby=fannie&&exact.length?exact:slots.filter(s=>s.address&&(matches(c,s)||norm(c.address)===norm(s.address)||c.mls&&norm(c.mls)===norm(s.mls)));
      if(nearby.length>1||nearby.length===1&&!matches(c,nearby[0]))stop('Review the existing Stewart slot for '+c.address+'. Its identity is ambiguous.');
      const selected=nearby[0]||slots.find(s=>vacant(c,s));
      if(!selected)stop('No empty '+c.kind+' slot for '+c.address+'.');
      if(!nearby.length)await add(c,selected.i);
      await settled(c,selected.i);
      let filled=0;
      const adjustments=fannie?[]:Object.entries(c.adjustments||{}).filter(([k])=>k!=='FinancingConcessions'&&k!=='SalesConcessions').map(([k,v])=>['Adjustment:'+k,v]);
      for(const [key,value] of [...Object.entries(c.fields),...adjustments]){
        checkOrder();
        if(!matches(c,slotData(c,selected.i)))stop('Slot identity changed. Review '+c.address+'.');
        if(fill(control(c.kind,selected.i,key),value,c.address+' · '+key))filled++;
      }
      checkOrder();
      if(!matches(c,slotData(c,selected.i)))stop('Slot identity changed. Review '+c.address+'.');
      if(!fannie)concessionDefaults(c,selected.i);
      if(fannie&&c.mls&&norm(slotData(c,selected.i).mls)===norm(c.mls)){
        const source=control(c.kind,selected.i,'InformationSourceType');
        if(source&&!valueOf(source)&&fill(source,'Multiple Listing Service',c.address+' data source'))filled++;
      }
      for(const [key,value] of Object.entries(fannie?{...fanniePropertyDefaults,UnitsInProperty:'1',OwnershipType:'Fee Simple (Owner)',...(c.kind==='sold'?{SaleType:'Retail Sale'}:{})}:defaults)){
        if(c.fields[key]===undefined && fill(control(c.kind,selected.i,key),value,c.address+' '+key))filled++;
      }
      const note=control(c.kind,selected.i,'Comments');
      if(c.legacyComment && note && !note.disabled && !note.readOnly && note.value===c.legacyComment && matches(c,slotData(c,selected.i))){
        set(note,c.fields.Comments||'');
        rows.push(c.address+' · removed previously imported adjustment text from comments.');
      }
      for(const item of c.manualAdjustments||[])rows.push(c.address+' · review unmapped adjustment: '+item);
      rows.push(c.address+' · '+(nearby.length?'Matched':'Added')+' in '+c.kind+' '+selected.i+' · '+filled+' blank fields filled.');
    }
    checkOrder();
    if(!fannie)await repairs();
    if(!fannie)fillOrder();
  } catch(error) { rows.push('Stopped: '+error.message); }
  finally { globalThis.stewartImportBusy=false; }
  return rows;
}
if(typeof module!=='undefined')module.exports={importStewartComps};

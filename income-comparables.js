'use strict';
(()=>{
  const M=window.PropertyThesisIncomeCompsModel;if(!M)return;
  const cache=new Map(),pending=new Map(),reportSignatures=new WeakMap();let account=null,busy=false,modalProperty=null,lastPrefetch='';let editor=null;
  const uid=()=>typeof cloudUser!=='undefined'?cloudUser?.id:null;
  const pid=()=>typeof selectedPropertyId!=='undefined'?selectedPropertyId:null;
  const properties=()=>typeof cloudProperties!=='undefined'?cloudProperties||[]:[];
  const analyses=()=>typeof cloudAnalyses!=='undefined'?cloudAnalyses||[]:[];
  const clone=v=>JSON.parse(JSON.stringify(v));
  function resetAccount(){if(account!==uid()){cache.clear();pending.clear();lastPrefetch='';account=uid();document.querySelector('#ptIncomeCompsDialog')?.close();modalProperty=null;}}
  function guard(user){if(!user||user!==uid())throw Error('Your sign-in changed. Reopen the property.');}
  async function load(id,force=false){
    resetAccount();const user=uid();guard(user);if(!id)throw Error('Save the subject property first.');
    if(!force&&cache.has(id))return cache.get(id);
    if(pending.has(id))return pending.get(id);
    const task=(async()=>{const {data,error}=await cloudClient.from('property_income_comparables').select('property_id,revision,evidence').eq('property_id',id).maybeSingle();guard(user);if(error)throw Error('Income comps could not be loaded. '+error.message);const record=data||{property_id:id,revision:0,evidence:{version:1,items:[],reconciliation:null}};cache.set(id,record);return record;})();
    pending.set(id,task);try{return await task;}finally{if(pending.get(id)===task)pending.delete(id);}
  }
  async function save(id,evidence){
    const user=uid();guard(user);const old=cache.get(id);if(!old)throw Error('Reload comps before saving.');
    const payload={property_id:id,user_id:user,revision:old.revision+1,evidence};
    const q=old.revision?cloudClient.from('property_income_comparables').update({revision:payload.revision,evidence}).eq('property_id',id).eq('revision',old.revision):cloudClient.from('property_income_comparables').insert(payload);
    const {data,error}=await q.select('property_id,revision,evidence').maybeSingle();guard(user);
    if(error||!data){cache.delete(id);throw Error('The save could not be confirmed or another session changed these comps. Reload before retrying. '+(error?.message||''));}
    cache.set(id,data);applyReport();return data;
  }
  function subjectCap(id){
    const saved=analyses().filter(a=>a.property_id===id).sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))||String(a.id).localeCompare(String(b.id)));
    const selected=typeof selectedAnalysisId==='undefined'?null:selectedAnalysisId;
    const active=selected?saved.find(a=>a.id===selected):null;
    if(pid()===id&&typeof state==='object'&&(!selected||active))return {rate:Number(state.desiredCap),source:'Desired Cap Rate in the currently open subject analysis'+(active?.name?' — '+active.name:'')+'. This includes any unsaved edits.'};
    const latest=saved[0];
    return {rate:latest?Number(latest.assumptions?.desiredCap):null,source:latest?'Desired Cap Rate from the most recently saved subject analysis — '+(latest.name||'Unnamed analysis')+'.':'No saved subject analysis is available.'};
  }
  function contents(id){
    const record=cache.get(id),e=record?.evidence;if(!e)return '<p>Loading saved income comps…</p>';
    const options=analyses().filter(a=>a.property_id!==id&&properties().some(p=>p.id===a.property_id&&!p.archived)).map(a=>{const p=properties().find(p=>p.id===a.property_id);return `<option value="${M.esc(a.id)}">${M.esc(p.address||p.name)} — ${M.esc(a.name)}</option>`;}).join('');
    const rows=e.items.map(c=>{const source=analyses().find(a=>a.id===c.sourceAnalysisId),stale=M.sourceIsStale(c,source);return `<tr><td><strong class="ic-cap-primary">${M.pct(c.operating.noi/c.salePrice)}</strong></td><td>${M.esc(c.address)}<br>${M.esc(M.bases[c.incomeBasis])}${stale?'<br><strong>Source changed or unavailable; saved snapshot retained.</strong>':''}</td><td>${M.money(c.salePrice)}<br>${M.esc(c.saleDate)}</td><td>${M.money(c.operating.noi)}</td><td><button type="button" class="btn ghost" data-ic-toggle="${M.esc(c.id)}">${c.included?'Exclude':'Include'}</button><button type="button" class="btn ghost" data-ic-edit="${M.esc(c.id)}">${c.origin==='subject-owned'?'Edit analysis':'Refresh / edit'}</button><button type="button" class="btn ghost" data-ic-remove="${M.esc(c.id)}">${c.origin==='subject-owned'?'Remove comp':'Unlink'}</button></td></tr>`;}).join('');
    const s=M.summarize(e.items),cap=subjectCap(id),subjectRate=cap.rate,hasSubjectRate=subjectRate>0&&subjectRate<=1;
    return `<p>Analyze a comparable sale here and save it under this subject. Compare calculated cap rates first, then review the income and expense assumptions supporting each rate.</p><button class="btn primary" type="button" data-ic-new>Analyze a new income comp</button><div class="ic-scroll"><table><thead><tr><th>Calculated cap rate</th><th>Comparable / income source</th><th>Closed sale</th><th>Annual NOI</th><th>Actions</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No income comps saved yet.</td></tr>'}</tbody></table></div><p>${s.count} included positive-NOI comps · Median ${M.pct(s.median)} · Range ${M.pct(s.min)}–${M.pct(s.max)}</p><details data-ic-legacy ${e.items.some(c=>c.origin!=='subject-owned')?'':'hidden'}><summary>Update previously linked comps</summary><form data-ic-add><h3>Link or refresh existing evidence</h3><label>Saved comparable analysis<select name="analysis" required><option value="">Select analysis</option>${options}</select></label><div class="ic-fields"><label>Closed sale price ($)<input name="salePrice" type="number" min="0.01" step="0.01" required></label><label>Sale date<input name="saleDate" type="date" required></label><label>Income Source<select name="incomeBasis">${Object.entries(M.bases).map(([v,l])=>`<option value="${v}">${M.esc(l)}</option>`).join('')}</select><small>Choose where the income figures came from. Check whether MLS rents are actual or estimated; explain adjustments in your notes.</small></label><label>Income period<select name="period" required>${M.periodOptions()}</select><small>Choose the period the source covers. This does not convert amounts: rent is monthly and expenses are annual.</small></label></div><label>Source of sale and operating data<input name="source" maxlength="1000" placeholder="e.g. closing record and seller operating statement" required></label><label>Comparability / normalization notes<textarea name="notes" maxlength="2000"></textarea></label><button class="btn primary" type="submit">Calculate & save comp</button></form></details><p><strong>Your comps are saved.</strong> You can close this window or add another comp. Adding a supporting explanation below is optional.</p><details data-ic-valuation ${e.reconciliation?'open':''}><summary>How these comps support the subject’s Desired Cap Rate (optional)</summary><p>${M.esc(cap.source)} You do not need to enter or apply it again here. To change this assumption, edit the subject analysis.</p><p><strong>Subject Desired Cap Rate: ${hasSubjectRate?M.pct(subjectRate):'Not set in the subject analysis'}</strong></p><p>Income-based value = subject annual NOI ÷ Desired Cap Rate. Compare the rates above to decide whether your subject’s rate is supported, considering location, condition, leases and data quality. The median is a reference, not an automatic recommendation; one comp provides limited evidence.</p>${e.reconciliation&&hasSubjectRate&&Math.abs(e.reconciliation.rate-subjectRate)>0.0000001?'<p><strong>The subject rate has changed since these notes were saved. Review the explanation and save it again.</strong></p>':''}<form data-ic-reconcile><label>Why the subject’s Desired Cap Rate fits these comps<textarea name="rationale" maxlength="3000" placeholder="e.g. Similar location and condition; the subject’s higher rate reflects older units." required>${M.esc(e.reconciliation?.notes||'')}</textarea></label><p>Optional: save this explanation for the report, together with the subject’s current rate. This does not change the subject analysis. Save any changes to the subject analysis separately.</p><button class="btn primary" type="submit" ${hasSubjectRate?'':'disabled'}>Save supporting explanation</button></form></details><p role="status" data-ic-status></p>`;
  }
  function paintDialog(id){const d=document.getElementById('ptIncomeCompsDialog');if(modalProperty!==id||!d?.open)return;if(!editor)d.querySelector('[data-ic-body]').innerHTML=contents(id);}
  async function open(id){
    resetAccount();if(!uid())throw Error('Sign in to manage income comps.');if(editor&&!editor.canClose())return;editor=null;modalProperty=id;
    let d=document.getElementById('ptIncomeCompsDialog');if(!d){d=document.createElement('dialog');d.id='ptIncomeCompsDialog';d.setAttribute('aria-labelledby','ic-title');d.innerHTML='<h2 id="ic-title">Income Comparables</h2><button class="btn ghost" data-ic-close type="button">Close</button><div data-ic-body></div>';document.body.appendChild(d);d.addEventListener('close',()=>{modalProperty=null;editor=null;});d.addEventListener('cancel',event=>{if(busy||(editor&&!editor.canClose()))event.preventDefault();});}
    d.querySelector('[data-ic-body]').innerHTML='<p role="status">Loading saved income comps…</p>';if(!d.open)d.showModal();
    try{await load(id,true);paintDialog(id);if(!cache.get(id).evidence.items.length)startEditor(id);}catch(e){d.querySelector('[data-ic-body]').textContent=e.message;}
  }
  function startEditor(id,comp){
    const body=document.querySelector('#ptIncomeCompsDialog [data-ic-body]'),user=uid();
    if(!body||!window.PropertyThesisIncomeCompAnalysis){message('The income comp form is loading. Refresh and try again.');return;}
    editor=window.PropertyThesisIncomeCompAnalysis.mount(body,{subjectId:id,subjectName:properties().find(p=>p.id===id)?.address||properties().find(p=>p.id===id)?.name||'Saved subject',comp,getUser:uid,
      onCancel:()=>{editor=null;paintDialog(id);},
      onSave:async c=>{guard(user);if(modalProperty!==id)throw Error('The subject changed. Reopen income comps.');const old=cache.get(id);if(!old)throw Error('The save could not be confirmed. Close and reload before retrying.');const e=clone(old.evidence),at=e.items.findIndex(x=>x.id===c.id);if(at<0&&e.items.length>=20)throw Error('Limit this subject to 20 income comps.');if(at>=0){c.included=e.items[at].included;e.items[at]=c;}else e.items.push(c);e.reconciliation=null;await save(id,e);editor=null;paintDialog(id);message('Saved '+c.address+' as an income comp. All saved comps and their individual cap rates are listed above.');}
    });
  }
  function message(text){const el=document.querySelector('#ptIncomeCompsDialog [data-ic-status]');if(el)el.textContent=text;else if(typeof setStatus==='function')setStatus(text);}
  async function action(fn){if(busy)return;busy=true;const d=document.getElementById('ptIncomeCompsDialog');d?.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=true);try{await fn();}catch(e){message(e.message);}finally{busy=false;d?.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=false);const saveNotes=d?.querySelector('[data-ic-reconcile] button[type=submit]');if(saveNotes)saveNotes.disabled=!(subjectCap(modalProperty).rate>0&&subjectCap(modalProperty).rate<=1);}}
  document.addEventListener('submit',event=>{
    const f=event.target;if(!f.matches?.('[data-ic-add],[data-ic-reconcile]'))return;event.preventDefault();
    const values=Object.fromEntries(new FormData(f)),id=modalProperty,user=uid();
    action(async()=>{const old=cache.get(id);if(!old)throw Error('Reopen income comps before saving.');const e=clone(old.evidence);
      if(f.matches('[data-ic-add]')){
        const {data:a,error}=await cloudClient.from('analyses').select('id,property_id,name,assumptions,revision,updated_at').eq('id',values.analysis).single();guard(user);if(error)throw error;
        const p=properties().find(p=>p.id===a.property_id);if(!p||p.id===id)throw Error('Select a comparable belonging to another property.');
        const r=await window.PropertyThesisIncomeEngineBridge.requestServer(a.assumptions,{refresh:false});guard(user);
        const c=M.snapshot({subjectId:id,analysis:a,property:p,evidence:values,result:r});
        const at=e.items.findIndex(x=>x.id===c.id);if(at<0&&e.items.length>=20)throw Error('Limit this evidence set to 20 comparable properties.');if(at>=0){c.included=e.items[at].included;e.items[at]=c;}else e.items.push(c);
        e.reconciliation=null;
      }else {const cap=subjectCap(id);if(!(cap.rate>0&&cap.rate<=1))throw Error('The subject analysis needs a valid Desired Cap Rate before saving supporting notes.');e.reconciliation=M.reconciliation(cap.rate,values.rationale,e.items);}
      await save(id,e);paintDialog(id);message('Saved to this property.');
    });
  });
  document.addEventListener('click',event=>{
    const b=event.target.closest?.('button');if(!b)return;
    if(b.dataset.icOpen){open(b.dataset.icOpen).catch(e=>message(e.message));return;}
    if(b.hasAttribute('data-ic-close')){if(!busy&&(!editor||editor.canClose()))document.getElementById('ptIncomeCompsDialog').close();return;}
    const id=modalProperty;if(!id)return;
    if(b.hasAttribute('data-ic-new')){startEditor(id);return;}
    if(b.dataset.icEdit){const c=cache.get(id)?.evidence.items.find(x=>x.id===b.dataset.icEdit),f=document.querySelector('[data-ic-add]');if(!c)return;if(c.origin==='subject-owned'){startEditor(id,c);return;}if(!f)return;f.closest('details').open=true;f.elements.analysis.value=c.sourceAnalysisId;f.elements.period.innerHTML=M.periodOptions(c.period);for(const k of ['salePrice','saleDate','incomeBasis','period','source','notes'])f.elements[k].value=c[k]||'';f.elements.analysis.focus();message('Review the source analysis and evidence, then Calculate & save comp to replace the snapshot.');return;}
    if(b.dataset.icToggle||b.dataset.icRemove){action(async()=>{const e=clone(cache.get(id).evidence);if(b.dataset.icRemove)e.items=e.items.filter(c=>c.id!==b.dataset.icRemove);else e.items=e.items.map(c=>c.id===b.dataset.icToggle?{...c,included:!c.included}:c);e.reconciliation=null;await save(id,e);paintDialog(id);message('Comps saved. Review and save the supporting explanation again if needed because the comps changed.');});return;}

  });
  function applyReport(){
    resetAccount();const host=document.querySelector('#clientReport .rb-report');if(!host)return;
    const record=cache.get(pid()),r=window.PropertyThesisIncomeEngineBridge?.current?.();
    const html=record?M.reportHtml(record.evidence,r?.years?.[0]?.noi,typeof state==='object'?state.desiredCap:null):'';
    let old=host.querySelector('[data-rb-section="incomeComparables"]');if(old&&reportSignatures.get(old)===html)return;old?.remove();if(!html)return;
    const t=document.createElement('template');t.innerHTML=html;reportSignatures.set(t.content.firstElementChild,html);const anchor=host.querySelector('[data-rb-section="salesComparables"],[data-rb-section="valuation"]');if(anchor)anchor.after(t.content);else if(host.querySelector('.rb-footer'))host.querySelector('.rb-footer').before(t.content);else host.append(t.content);
  }
  async function prepareReport(){const id=pid(),user=uid();if(!id)return;await load(id,true);guard(user);if(id!==pid())throw Error('The open property changed. Generate the report again.');applyReport();}
  function decorate(){
    resetAccount();for(const card of document.querySelectorAll('#propertyhub .hub-card')){const opener=card.querySelector('[data-stage7-file],[data-hub-open]'),id=opener?.dataset.stage7File||opener?.dataset.hubOpen,actions=card.querySelector('.pt-hub-primary-flow')||card.querySelector('.hub-actions');if(id&&actions&&!actions.querySelector('[data-ic-open]')){const b=document.createElement('button');b.type='button';b.className='btn secondary';b.dataset.icOpen=id;b.textContent='Income Comps';actions.appendChild(b);}}
    const grid=document.querySelector('#dashboard .grid');let panel=document.getElementById('ptIncomeCompsPanel');
    if(grid&&!panel){panel=document.createElement('section');panel.id='ptIncomeCompsPanel';panel.className='card span-12';grid.appendChild(panel);}
    if(panel){const id=pid();const html=`<h2>Income Comparables</h2><p>Analyze comparable sold properties to support this property's market cap rate.</p>${id?`<button class="btn secondary" type="button" data-ic-open="${M.esc(id)}">Manage Income Comps</button>`:'<p>Save this property to attach income comps.</p>'}`;if(panel.innerHTML!==html)panel.innerHTML=html;}
    const key=uid()+':'+pid();if(uid()&&pid()&&lastPrefetch!==key){lastPrefetch=key;load(pid()).then(applyReport).catch(()=>{});}
    applyReport();
  }
  let timer;const schedule=()=>{clearTimeout(timer);timer=setTimeout(decorate,120);};
  document.addEventListener('propertythesis:analysis-loaded',()=>{schedule();const id=pid();if(id)load(id,true).then(applyReport).catch(()=>{});});
  document.addEventListener('click',schedule);
  const style=document.createElement('style');style.textContent='#ptIncomeCompsDialog{width:min(1050px,94vw);max-height:90vh;overflow:auto;border:1px solid #cad8e2;border-radius:14px;padding:24px;color:#18364a}#ptIncomeCompsDialog::backdrop{background:#1239}#ptIncomeCompsDialog label{display:block;margin:12px 0}#ptIncomeCompsDialog input,#ptIncomeCompsDialog select,#ptIncomeCompsDialog textarea{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #9badba;border-radius:6px;min-height:44px}#ptIncomeCompsDialog .ic-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ic-scroll{overflow:auto}.ic-cap-primary{font-size:22px;color:#087d69}.ic-cap-result{background:#eaf6f2;padding:18px;border-radius:12px}.ic-cap-result strong{display:block;font-size:40px;color:#087d69}.ic-actions{display:flex;gap:10px;flex-wrap:wrap}.ic-review details{padding:10px;border-bottom:1px solid #ddd}#ptIncomeCompsDialog td,#ptIncomeCompsDialog th{padding:10px;text-align:left;border-bottom:1px solid #ddd}#ptIncomeCompsDialog form{border-top:1px solid #ddd;margin-top:20px}#ptIncomeCompsDialog [data-ic-valuation]{margin-top:18px;padding:14px;background:#f0f7f5;border-radius:8px}#ptIncomeCompsDialog summary{cursor:pointer;font-weight:600}#ptIncomeCompsDialog [aria-invalid="true"]{border:2px solid #b42318}#ptIncomeCompsDialog [data-comp-status]{color:#b42318;font-weight:600}#ptIncomeCompsDialog [data-ic-status]{color:#17516d;font-weight:bold}@media(max-width:650px){#ptIncomeCompsDialog .ic-fields{grid-template-columns:1fr}}';document.head.appendChild(style);
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});schedule();
  window.PropertyThesisIncomeComps={open,prepareReport,applyReport};
})();

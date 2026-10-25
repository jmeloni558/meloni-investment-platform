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
  function contents(id){
    const record=cache.get(id),e=record?.evidence;if(!e)return '<p>Loading saved income comps…</p>';
    const options=analyses().filter(a=>a.property_id!==id&&properties().some(p=>p.id===a.property_id&&!p.archived)).map(a=>{const p=properties().find(p=>p.id===a.property_id);return `<option value="${M.esc(a.id)}">${M.esc(p.address||p.name)} — ${M.esc(a.name)}</option>`;}).join('');
    const rows=e.items.map(c=>{const source=analyses().find(a=>a.id===c.sourceAnalysisId),stale=M.sourceIsStale(c,source);return `<tr><td><strong class="ic-cap-primary">${M.pct(c.operating.noi/c.salePrice)}</strong></td><td>${M.esc(c.address)}<br>${M.esc(M.bases[c.incomeBasis])}${stale?'<br><strong>Source changed or unavailable; saved snapshot retained.</strong>':''}</td><td>${M.money(c.salePrice)}<br>${M.esc(c.saleDate)}</td><td>${M.money(c.operating.noi)}</td><td><button type="button" class="btn ghost" data-ic-toggle="${M.esc(c.id)}">${c.included?'Exclude':'Include'}</button><button type="button" class="btn ghost" data-ic-edit="${M.esc(c.id)}">${c.origin==='subject-owned'?'Edit analysis':'Refresh / edit'}</button><button type="button" class="btn ghost" data-ic-remove="${M.esc(c.id)}">${c.origin==='subject-owned'?'Remove comp':'Unlink'}</button></td></tr>`;}).join('');
    const s=M.summarize(e.items);
    return `<p>Analyze a comparable sale here and save it under this subject. Compare calculated cap rates first, then review the income and expense assumptions supporting each rate.</p><button class="btn primary" type="button" data-ic-new>Analyze a new income comp</button><div class="ic-scroll"><table><thead><tr><th>Calculated cap rate</th><th>Comparable / income source</th><th>Closed sale</th><th>Annual NOI</th><th>Actions</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No income comps saved yet.</td></tr>'}</tbody></table></div><p>${s.count} included positive-NOI comps · Median ${M.pct(s.median)} · Range ${M.pct(s.min)}–${M.pct(s.max)}</p><details data-ic-legacy ${e.items.some(c=>c.origin!=='subject-owned')?'':'hidden'}><summary>Update previously linked comps</summary><form data-ic-add><h3>Link or refresh existing evidence</h3><label>Saved comparable analysis<select name="analysis" required><option value="">Select analysis</option>${options}</select></label><div class="ic-fields"><label>Closed sale price ($)<input name="salePrice" type="number" min="0.01" step="0.01" required></label><label>Sale date<input name="saleDate" type="date" required></label><label>Income Source<select name="incomeBasis">${Object.entries(M.bases).map(([v,l])=>`<option value="${v}">${M.esc(l)}</option>`).join('')}</select><small>Choose where the income figures came from. Check whether MLS rents are actual or estimated; explain adjustments in your notes.</small></label><label>Income period<select name="period" required>${M.periodOptions()}</select><small>Choose the period the source covers. This does not convert amounts: rent is monthly and expenses are annual.</small></label></div><label>Source of sale and operating data<input name="source" maxlength="1000" placeholder="e.g. closing record and seller operating statement" required></label><label>Comparability / normalization notes<textarea name="notes" maxlength="2000"></textarea></label><button class="btn primary" type="submit">Calculate & save comp</button></form></details><p><strong>Your comps are saved.</strong> You can close this window or add another comp. Choosing a subject cap rate below is optional.</p><details data-ic-valuation ${e.reconciliation?'open':''}><summary>Choose a cap rate for the subject (optional)</summary><p>Use the comparable cap rates above to support the value of your subject property. The selected rate gives an income-based value: <strong>subject annual NOI ÷ selected cap rate</strong>. For example, $60,000 NOI ÷ 6% = $1,000,000.</p><p>The median is a starting point, not an automatic recommendation. Consider location, condition, leases and the reliability of each comp. A single comp gives limited market evidence.</p><form data-ic-reconcile><label>Cap rate to use for the subject (%)<input name="rate" type="number" min="0.0001" max="100" step="0.0001" value="${e.reconciliation?Number((e.reconciliation.rate*100).toFixed(4)):''}" required></label><button type="button" class="btn ghost" data-ic-median ${s.count?'':'disabled'}>Use median${s.count?' ('+M.pct(s.median)+')':''}</button><label>Why this rate fits the subject (required to save this conclusion)<textarea name="rationale" maxlength="3000" placeholder="e.g. Similar location and condition; selected a slightly higher rate to reflect older units." required>${M.esc(e.reconciliation?.notes||'')}</textarea></label><p>Save the rate and explanation with these comps for the report. This does not change the subject analysis.</p><button class="btn primary" type="submit">Save cap rate for report</button><p>To also change the subject’s valuation, open its analysis and apply the saved rate below, then save that analysis.</p><button type="button" class="btn secondary" data-ic-adopt ${e.reconciliation?'':'disabled'}>Apply saved rate to subject analysis</button></form></details><p role="status" data-ic-status></p>`;
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
      onSave:async c=>{guard(user);if(modalProperty!==id)throw Error('The subject changed. Reopen income comps.');const old=cache.get(id);if(!old)throw Error('The save could not be confirmed. Close and reload before retrying.');const e=clone(old.evidence),at=e.items.findIndex(x=>x.id===c.id);if(at<0&&e.items.length>=20)throw Error('Limit this subject to 20 income comps.');if(at>=0){c.included=e.items[at].included;e.items[at]=c;}else e.items.push(c);e.reconciliation=null;await save(id,e);editor=null;paintDialog(id);message('Income comp saved under this subject. Calculated cap rate: '+M.pct(c.capRate));}
    });
  }
  function message(text){const el=document.querySelector('#ptIncomeCompsDialog [data-ic-status]');if(el)el.textContent=text;else if(typeof setStatus==='function')setStatus(text);}
  async function action(fn){if(busy)return;busy=true;const d=document.getElementById('ptIncomeCompsDialog');d?.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=true);try{await fn();}catch(e){message(e.message);}finally{busy=false;d?.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=false);const adopt=d?.querySelector('[data-ic-adopt]');if(adopt)adopt.disabled=!cache.get(modalProperty)?.evidence.reconciliation;const median=d?.querySelector('[data-ic-median]');if(median)median.disabled=!M.summarize(cache.get(modalProperty)?.evidence.items||[]).count;}}
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
      }else e.reconciliation=M.reconciliation(Number(values.rate)/100,values.rationale,e.items);
      await save(id,e);paintDialog(id);message('Saved to this property.');
    });
  });
  document.addEventListener('click',event=>{
    const b=event.target.closest?.('button');if(!b)return;
    if(b.dataset.icOpen){open(b.dataset.icOpen).catch(e=>message(e.message));return;}
    if(b.hasAttribute('data-ic-close')){if(!busy&&(!editor||editor.canClose()))document.getElementById('ptIncomeCompsDialog').close();return;}
    const id=modalProperty;if(!id)return;
    if(b.hasAttribute('data-ic-median')){const stats=M.summarize(cache.get(id)?.evidence.items||[]);if(stats.count){const input=document.querySelector('[data-ic-reconcile] [name=rate]');input.value=Number((stats.median*100).toFixed(4));input.focus();message('Median entered as a starting point. Review the rate and explain why it fits the subject before saving.');}return;}
    if(b.hasAttribute('data-ic-new')){startEditor(id);return;}
    if(b.dataset.icEdit){const c=cache.get(id)?.evidence.items.find(x=>x.id===b.dataset.icEdit),f=document.querySelector('[data-ic-add]');if(!c)return;if(c.origin==='subject-owned'){startEditor(id,c);return;}if(!f)return;f.closest('details').open=true;f.elements.analysis.value=c.sourceAnalysisId;f.elements.period.innerHTML=M.periodOptions(c.period);for(const k of ['salePrice','saleDate','incomeBasis','period','source','notes'])f.elements[k].value=c[k]||'';f.elements.analysis.focus();message('Review the source analysis and evidence, then Calculate & save comp to replace the snapshot.');return;}
    if(b.dataset.icToggle||b.dataset.icRemove){action(async()=>{const e=clone(cache.get(id).evidence);if(b.dataset.icRemove)e.items=e.items.filter(c=>c.id!==b.dataset.icRemove);else e.items=e.items.map(c=>c.id===b.dataset.icToggle?{...c,included:!c.included}:c);e.reconciliation=null;await save(id,e);paintDialog(id);message('Comps saved. If you want a subject cap-rate conclusion, select and save it again because the supporting comps changed.');});return;}
    if(b.hasAttribute('data-ic-adopt')){
      if(pid()!==id){message('Open an analysis of this subject property before applying its market cap rate.');return;}
      const rec=cache.get(id)?.evidence.reconciliation;if(!rec)return;
      state.desiredCap=rec.rate;const input=document.getElementById('f_desiredCap');if(input){input.value=rec.rate*100;input.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelectorAll('[data-src="f_desiredCap"]').forEach(x=>x.value=rec.rate*100);
      window.UnsavedChangeProtection?.markDirty?.();window.PropertyThesisSecondaryEngine?.clearCache?.();window.PropertyThesisIncomeEngineBridge?.refreshCurrent?.();message('Rate applied to the open analysis. Save the analysis to retain this valuation change.');applyReport();
    }
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

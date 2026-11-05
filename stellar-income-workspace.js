'use strict';
(() => {
  const user = () => typeof cloudUser === 'undefined' ? null : cloudUser?.id;
  const client = () => typeof cloudClient === 'undefined' ? null : cloudClient;
  let account, allowed = false, checking, timer, active, editor;
  function close() {
    if (editor && !editor.canClose()) return false;
    active = null; editor = null; document.getElementById('ptStellarIncomeDialog')?.close(); return true;
  }
  async function decorate() {
    const id = user();
    if (account !== id) {
      account = id; allowed = false; checking = null; active = null; editor = null;
      document.getElementById('ptStellarIncomeDialog')?.close();
      document.querySelectorAll('[data-stellar-income]').forEach(n => n.remove());
    }
    if (!id || !client()) return;
    if (!checking) checking = client().rpc('stellar_bpo_enabled').then(r => { if(account === id) allowed = !r.error && r.data === true; }).catch(() => {});
    await checking;
    if (account !== id || !allowed) return;
    for (const card of document.querySelectorAll('#propertyhub .hub-card')) {
      const open = card.querySelector('[data-stage7-file],[data-hub-open]');
      const propertyId = open?.dataset.stage7File || open?.dataset.hubOpen;
      const actions = card.querySelector('.pt-hub-primary-flow') || card.querySelector('.hub-actions');
      if (!propertyId || !actions || actions.querySelector('[data-stellar-income]')) continue;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn secondary';
      button.dataset.stellarIncome = propertyId; button.textContent = 'Stellar Feed (demo)'; actions.append(button);
    }
  }
  async function open(propertyId) {
    if (!close()) return;
    const id = user(), connection = client(); if(!id || !connection) return;
    let dialog = document.getElementById('ptStellarIncomeDialog');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'ptStellarIncomeDialog';
      dialog.setAttribute('aria-label', 'Stellar listings for saved income property');
      dialog.innerHTML = '<button type="button" class="btn ghost" data-stellar-close>Close</button><div data-stellar-income-host></div>';
      document.body.append(dialog); dialog.querySelector('button').onclick = close;
      dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    }
    const token = {}; active = token;
    const current = () => active === token && user() === id && dialog.open;
    const host = dialog.querySelector('[data-stellar-income-host]'); host.textContent = 'Loading private Stellar demo…'; dialog.showModal();
    try {
      const access = await connection.rpc('stellar_bpo_enabled'); if(!current()) return;
      if(access.error || access.data !== true) throw Error('Stellar access is not enabled for this account.');
      const property = await connection.from('properties').select('id,address,name').eq('id',propertyId).single();
      if(!current()) return;
      if(property.error || !property.data) throw Error('This saved property is unavailable.');
      const {mount} = await import('./stellar-income-picker.mjs'); if(!current()) return;
      const showPicker = () => {
        editor = null;
        mount({host, client:connection, isCurrent:current, subjectName:property.data.address || property.data.name,
          previewIncome: draft => {
            if(!current()) return;
            if(!window.PropertyThesisIncomeCompAnalysis) throw Error('Refresh the page to load the income analysis form.');
            editor = window.PropertyThesisIncomeCompAnalysis.mount(host, {subjectId:propertyId,
              subjectName:property.data.address || property.data.name, getUser:user, initialDraft:draft, previewOnly:true,
              onCancel:showPicker, onSave:async()=>{throw Error('Demo records cannot be saved to customer analyses.');}});
          }});
      };
      showPicker();
    } catch(e) { if(current()) host.textContent = e.message; }
  }
  const style = document.createElement('style'); style.textContent = '#ptStellarIncomeDialog{width:min(1000px,94vw);max-height:90vh;overflow:auto;border:1px solid #cad8e2;border-radius:14px;padding:24px;color:#18364a}#ptStellarIncomeDialog::backdrop{background:#1239}#ptStellarIncomeDialog label{display:block;margin:12px 0}#ptStellarIncomeDialog input,#ptStellarIncomeDialog select{display:block;max-width:100%;min-height:40px}#ptStellarIncomeDialog article{padding:16px;border-bottom:1px solid #cad8e2}'; document.head.append(style);
  const schedule = () => { clearTimeout(timer); timer = setTimeout(decorate,150); };
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-stellar-income]');if(b){e.preventDefault();open(b.dataset.stellarIncome);}schedule();});
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true}); schedule();
})();

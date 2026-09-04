'use strict';
(() => {
  const $ = id => document.getElementById(id), form = $('loiForm');
  const client = window.__ptSharedSupabaseClient || (window.__ptSharedSupabaseClient = window.supabase.createClient('https://lmaiqpkogmmsldkziggy.supabase.co','sb_publishable_Lo83N3JsBNhwhRDDAt8mBA_1QTFymf7'));
  let context = null, preview = null, busy = false, alive = true, currentUser = null;
  const status = text => { $('loiStatus').textContent = text; };
  async function api(body) {
    const { data, error } = await client.functions.invoke('letter-of-intent', { body });
    if (error) { let detail; try { detail = await error.context.json(); } catch (_) {} throw new Error(detail?.error || detail?.message || 'The request failed. Check your connection and sign-in, then try again.'); }
    if (data?.error) throw new Error(data.error);
    return data;
  }
  function invalidate() { preview = null; $('loiApproval').hidden = true; $('loiConfirm').checked = false; $('loiSend').disabled = true; $('loiPreview').textContent = 'Terms changed. Save a new preview before sending.'; $('loiEnvelope').textContent = 'No current preview.'; }
  function display(letter) {
    preview = letter;
    $('loiPreview').textContent = letter.letter_text;
    $('loiEnvelope').textContent = `To: ${letter.recipient_email} | From: ${letter.sender_from || context.from} | Reply-to: ${letter.sender_email || context.senderEmail} | Subject: ${letter.subject}`;
    $('loiConfirm').checked = false; $('loiSend').disabled = true;
    $('loiApproval').hidden = letter.status !== 'prepared';
  }
  async function history() {
    const { letters } = await api({ action:'history' }); if (!alive) return;
    const host = $('loiHistory'); host.replaceChildren();
    if (!letters.length) { host.textContent = 'No saved letters yet.'; return; }
    for (const letter of letters) {
      const row = document.createElement('article'), title = document.createElement('strong'), info = document.createElement('p'), button = document.createElement('button');
      title.textContent = letter.address; info.textContent = `${new Date(letter.created_at).toLocaleString()} · ${letter.recipient_email} · ${letter.status.toUpperCase()}`;
      button.textContent = 'View Saved Letter'; button.onclick = () => { display(letter); $('loiPreview').focus(); };
      row.append(title, info, button);
      if (letter.last_error) { const warning = document.createElement('p'); warning.textContent = letter.last_error; row.append(warning); }
      host.append(row);
    }
  }
  function selectAnalysis() {
    invalidate();
    const a = context.analyses.find(x => x.id === $('loiAnalysis').value);
    form.elements.price.value = a?.price || '';
    $('loiSource').textContent = a ? `Property: ${a.address || 'Save a property address first.'}${a.listingAgent?.name ? ` · Listing contact: ${a.listingAgent.name}` : ''}${a.listingStatus ? ` · Last recorded status: ${a.listingStatus}` : ''}. Verify current listing status and contact details before outreach.` : '';
    if (context.externalEnabled) { form.elements.recipientName.value = a?.listingAgent?.name || ''; form.elements.recipientEmail.value = a?.listingAgent?.email || ''; }
  }
  function lock(value) { busy = value; form.querySelectorAll('input,select,button').forEach(e => e.disabled = value); $('loiAnalysis').disabled = value; $('loiRefresh').disabled = value; $('loiConfirm').disabled = value; $('loiSend').disabled = value || !$('loiConfirm').checked; if (!value && !context.externalEnabled) {form.elements.test.disabled = true;form.elements.recipientEmail.readOnly = true;} }
  form.addEventListener('input', invalidate);
  form.addEventListener('change', invalidate);
  $('loiAnalysis').onchange = selectAnalysis;
  form.onsubmit = async event => {
    event.preventDefault(); if (busy || !context || !form.reportValidity()) return;
    const fields = new FormData(form), terms = Object.fromEntries(fields);
    for (const key of ['price','deposit','diligenceDays','closingDays']) terms[key] = Number(fields.get(key));
    terms.test = form.elements.test.checked;
    const analysisId = $('loiAnalysis').value;
    lock(true); status('Preparing and saving the exact email preview…');
    try { const data = await api({ action:'prepare', analysisId, terms }); if (!alive) return; display(data.letter); await history(); status(data.letter.status === 'prepared' ? 'Preview saved. Read the full letter and confirm before sending.' : `An identical letter already exists with status ${data.letter.status}. It will not be sent again.`); }
    catch (e) { if (alive) status(e.message); }
    finally { if (alive) lock(false); }
  };
  $('loiConfirm').onchange = () => { $('loiSend').disabled = busy || !$('loiConfirm').checked || preview?.status !== 'prepared'; };
  $('loiSend').onclick = async () => {
    if (busy || !preview || preview.status !== 'prepared' || !$('loiConfirm').checked) return;
    lock(true); status('Sending your reviewed letter. Please do not click again…');
    const id = preview.id, hash = preview.document_hash;
    // Lock locally even if the response is lost. History is the recovery path.
    preview.status = 'sending'; $('loiApproval').hidden = true;
    try { const data = await api({action:'send',id,documentHash:hash,confirmed:true}); if (alive) status(data.message); }
    catch(e) { if (alive) status(`${e.message} Refresh history before taking any further action.`); }
    finally { if (alive) { lock(false); $('loiSend').disabled = true; history().catch(e=>status(e.message)); } }
  };
  $('loiRefresh').onclick = () => history().catch(e => status(e.message));
  client.auth.onAuthStateChange((_event, session) => { if (currentUser && session?.user?.id !== currentUser) { alive = false; preview = null; context = null; form.reset(); $('loiWorkspace').hidden = true; $('loiPreview').textContent = ''; $('loiHistory').replaceChildren(); status('Account changed. Reload this page after signing in.'); } });
  (async () => {
    try {
      const { data } = await client.auth.getSession(); if (!data.session) { status('Sign in with your owner account to use the Letter of Intent pilot.'); return; }
      currentUser = data.session.user.id;
      context = await api({action:'context'}); if (!alive) return;
      $('loiWorkspace').hidden = false;
      $('loiPilot').textContent = context.externalEnabled ? 'Owner-only pilot. Confirm the listing contact and obtain legal review before real-world use.' : `Test mode: emails can go only to ${context.senderEmail}. No agents or sellers can be contacted yet.`;
      form.elements.recipientEmail.value = context.senderEmail; form.elements.recipientName.value = 'Owner pilot test';
      if (!context.externalEnabled) {form.elements.recipientEmail.readOnly = true;form.elements.test.disabled = true;}
      for (const a of context.analyses) { const option = document.createElement('option'); option.value = a.id; option.textContent = `${a.address || 'Address missing'} — ${a.name}`; $('loiAnalysis').append(option); }
      const requested = new URLSearchParams(location.search).get('analysis');
      if (context.analyses.some(a=>a.id===requested)) { $('loiAnalysis').value = requested; selectAnalysis(); }
      status(context.analyses.length ? (context.emailReady ? 'Owner pilot ready. Choose an analysis and enter your proposed terms.' : 'Preview is available. Email sending needs configuration.') : 'No completed saved analyses found. Complete and save an analysis, then return here.');
      await history();
    } catch(e) { status(e.message); }
  })();
})();

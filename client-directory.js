'use strict';
(() => {
  const client = window.__ptSharedSupabaseClient;
  if (!client || window.ClientDirectory) return;
  let userId = null, allowed = false, revision = 0, rows = [], dialog, trigger;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function clear() {
    rows = [];
    if (dialog) { dialog.close(); dialog.remove(); dialog = null; }
  }
  function navigation() {
    const host = document.querySelector('.app-nav-actions');
    let button = document.getElementById('appNavClientDirectory');
    if (!allowed) { button?.remove(); return; }
    if (!host || button) return;
    button = el('button', 'Client Directory', 'app-nav-action');
    button.type = 'button'; button.id = 'appNavClientDirectory';
    button.onclick = () => open(button);
    host.append(button);
  }
  async function access(user) {
    const version = ++revision;
    userId = user?.id || null; allowed = false; clear(); navigation();
    if (!userId) return;
    try {
      const { data, error } = await client.from('client_directory_members').select('user_id').eq('user_id', userId).maybeSingle();
      if (version !== revision) return;
      allowed = !error && !!data;
      navigation();
    } catch (_) { /* Fail closed. */ }
  }
  function detail(parent, label, value) {
    if (!value) return;
    const line = el('p'); line.append(el('strong', label + ': '), document.createTextNode(value)); parent.append(line);
  }
  function draw() {
    if (!dialog) return;
    const term = dialog.querySelector('input').value.trim().toLowerCase();
    const matches = rows.filter(r => [r.name, r.company, r.job_title, r.address, r.keywords, r.notes, ...(r.emails || []), ...(r.phones || []).map(p=>p.value)].join(' ').toLowerCase().includes(term));
    dialog.querySelector('[data-count]').textContent = `${matches.length} of ${rows.length} contacts`;
    const list = dialog.querySelector('[data-results]'); list.replaceChildren();
    if (!matches.length) { list.append(el('p', rows.length ? 'No contacts match your search.' : 'No contacts have been imported yet.')); return; }
    for (const row of matches) {
      const card = el('article', undefined, 'pt-directory-card');
      card.append(el('h3', row.name));
      if (row.company) card.append(el('p', row.company, 'pt-directory-company'));
      if (row.job_title) card.append(el('p', row.job_title));
      const links = el('div', undefined, 'pt-directory-links');
      for (const email of row.emails || []) {
        const link = el('a', email); link.href = 'mailto:' + encodeURIComponent(email); links.append(link);
      }
      for (const phone of row.phones || []) {
        const line = el('span', `${phone.label}: ${phone.value}`); links.append(line);
      }
      card.append(links);
      detail(card, 'Address', row.address);
      card.append(el('p', row.keywords, 'pt-directory-tags'));
      const more = el('details'); more.append(el('summary', 'Contact details & notes'));
      if (row.notes) more.append(el('p', row.notes, 'pt-directory-notes'));
      else more.append(el('p', 'No CRM notes.'));
      const source = el('details'); source.append(el('summary', 'Original CRM record'), el('pre', row.source_text)); more.append(source);
      card.append(more); list.append(card);
    }
  }
  async function load() {
    if (!allowed || !dialog) return;
    const version = revision, currentDialog = dialog;
    const status = dialog.querySelector('[data-status]');
    const refresh = dialog.querySelector('[data-refresh]');
    refresh.disabled = true; status.textContent = 'Loading contacts…';
    try {
      const {data,error} = await client.from('client_directory').select('*').order('name').limit(1000);
      if (version !== revision || dialog !== currentDialog) return;
      if (error) throw error;
      rows = data || []; draw();
      status.textContent = rows.length ? 'Imported from Prospects CRM · BPO Contacts' : 'Your directory is ready.';
    } catch (_) {
      if (version !== revision || dialog !== currentDialog) return;
      rows = []; dialog.querySelector('[data-results]').replaceChildren();
      dialog.querySelector('[data-count]').textContent = '';
      status.textContent = 'Unable to load the directory. Please refresh or sign in again.';
    } finally { refresh.disabled = false; }
  }
  function open(button) {
    if (!allowed) return;
    trigger = button;
    if (dialog) { if (!dialog.open) dialog.showModal(); return; }
    dialog = el('dialog', undefined, 'pt-client-directory');
    dialog.setAttribute('aria-labelledby', 'ptDirectoryTitle');
    dialog.innerHTML = '<header><div><span class="pt-directory-eyebrow">PRIVATE WORKSPACE</span><h2 id="ptDirectoryTitle">Client Directory</h2><p>BPO clients and vendor contacts</p></div><button type="button" data-close aria-label="Close Client Directory">Close</button></header><div class="pt-directory-tools"><label for="ptDirectorySearch">Search contacts</label><input id="ptDirectorySearch" type="search" placeholder="Name, company, email, phone, or notes" autocomplete="off"><div><span data-count aria-live="polite"></span><button type="button" data-refresh>Refresh</button></div><p data-status role="status"></p></div><div data-results class="pt-directory-results"></div>';
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => trigger?.focus());
    dialog.querySelector('input').oninput = draw;
    dialog.querySelector('[data-refresh]').onclick = load;
    document.body.append(dialog); dialog.showModal(); dialog.querySelector('input').focus(); load();
  }
  const style = el('style');
  style.textContent = `.pt-client-directory{width:min(1050px,94vw);max-height:88vh;padding:0;border:1px solid #d8e1e9;border-radius:16px;background:#f6f8fb;color:#18334d;box-shadow:0 30px 90px #0f172a55}.pt-client-directory::backdrop{background:#0f172a99}.pt-client-directory header{display:flex;justify-content:space-between;gap:20px;padding:24px;background:white;border-bottom:1px solid #d8e1e9}.pt-client-directory h2{font-size:26px;margin:5px 0}.pt-client-directory p{font-size:13px;line-height:1.6;margin:6px 0}.pt-directory-eyebrow{font-size:10px;letter-spacing:.13em;color:#27689b;font-weight:800}.pt-client-directory button{cursor:pointer;background:#fff;border:1px solid #bacddd;border-radius:8px;padding:9px 14px;color:#174a70;font-weight:700;align-self:start}.pt-directory-tools{padding:18px 24px}.pt-directory-tools label{display:block;font-size:13px;font-weight:700;margin-bottom:7px}.pt-directory-tools input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #bacddd;border-radius:8px;font-size:16px}.pt-directory-tools>div{display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:13px}.pt-directory-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:0 24px 24px}.pt-directory-card{background:#fff;border:1px solid #d8e1e9;border-radius:12px;padding:18px;overflow-wrap:anywhere}.pt-directory-card h3{font-size:17px;margin:0 0 6px}.pt-directory-company{font-weight:700}.pt-directory-links{display:grid;gap:5px;margin:12px 0;font-size:13px}.pt-directory-links a{color:#176498}.pt-directory-tags{color:#586e83}.pt-directory-card details{border-top:1px solid #e4eaf0;padding-top:10px;margin-top:10px;font-size:13px}.pt-directory-card summary{cursor:pointer;font-weight:700}.pt-directory-notes,.pt-directory-card pre{white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.6}.pt-client-directory :focus-visible{outline:3px solid #3a92ce;outline-offset:3px}@media(max-width:650px){.pt-directory-results{grid-template-columns:1fr;padding:0 14px 14px}.pt-client-directory header,.pt-directory-tools{padding:16px}.pt-client-directory h2{font-size:22px}}`;
  document.head.append(style);
  new MutationObserver(navigation).observe(document.body, {childList:true,subtree:true});
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id === userId && allowed) return;
    // Clear private content synchronously; defer database calls outside auth's lock.
    const ticket = ++revision; allowed = false; clear(); navigation();
    setTimeout(() => { if (ticket === revision) access(session?.user); }, 0);
  });
  const initialRevision = revision;
  client.auth.getSession().then(({data}) => { if (revision === initialRevision) access(data.session?.user); }).catch(()=>{});
  window.ClientDirectory = { open: () => open(document.getElementById('appNavClientDirectory')) };
})();

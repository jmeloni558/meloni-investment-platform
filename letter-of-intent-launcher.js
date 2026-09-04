'use strict';
(() => {
  let owner = false, checkedUser = null, checking = false, watching = false;
  function apply() {
    let button = document.getElementById('ptLoiLaunch');
    let help = document.getElementById('ptLoiHelp');
    // The LOI is a final deliverable action, not a Review Results card.
    if (button && button.tagName !== 'BUTTON') { button.remove(); button = null; }
    if (!owner) { button?.remove(); help?.remove(); return; }
    const panel = document.querySelector('#rbControls .rb-export-panel');
    const actions = panel?.querySelector('.rb-actions');
    if (!actions) return;
    if (!help) {
      help = document.createElement('p'); help.id = 'ptLoiHelp'; help.setAttribute('role', 'status');
      help.style.cssText = 'font-size:12px;line-height:1.5;color:#526879;margin:12px 0 0';
      help.textContent = 'Letter of Intent · Owner pilot: prepare a discussion-only proposal from your saved analysis. Test emails go only to your verified address; private underwriting is not included.';
    }
    if (help.parentElement !== panel) panel.append(help);
    if (!button) {
      button = document.createElement('button'); button.id = 'ptLoiLaunch'; button.type = 'button'; button.className = 'btn secondary';
      button.textContent = 'Prepare Letter of Intent'; button.setAttribute('aria-describedby', 'ptLoiHelp');
      button.onclick = () => {
        if (window.UnsavedChangeProtection?.isDirty?.()) { document.getElementById('ptLoiHelp').textContent = 'Save your analysis changes first so the LOI uses your current saved property.'; return; }
        let id; try { id = selectedAnalysisId; } catch (_) {}
        location.href = 'letter-of-intent.html' + (id ? '?analysis=' + encodeURIComponent(id) : '');
      };
    }
    if (button.parentElement !== actions) actions.append(button);
  }
  async function refresh() {
    const client = typeof cloudClient !== 'undefined' ? cloudClient : window.__ptSharedSupabaseClient;
    if (!client || checking) return;
    if (!watching) { watching = true; client.auth.onAuthStateChange(() => { owner = false; checkedUser = null; apply(); setTimeout(refresh, 0); }); }
    checking = true;
    try {
      const {data} = await client.auth.getSession(), id = data.session?.user?.id || null;
      if (id !== checkedUser || (id && !owner)) {
        checkedUser = id; owner = false;
        if (id) { const {data:access,error} = await client.rpc('get_account_access'); owner = !error && access?.owner === true; }
      }
      apply();
    } catch (_) { owner = false; apply(); } finally { checking = false; }
  }
  document.addEventListener('click', () => setTimeout(refresh, 200));
  addEventListener('pt:billing-updated', () => {checkedUser=null;refresh();});
  new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
  refresh(); setTimeout(refresh,1500);
})();

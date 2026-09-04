'use strict';
(() => {
  let owner = false, checkedUser = null, checking = false, watching = false;
  function apply() {
    const dashboard = document.querySelector('#dashboard .grid');
    if (!dashboard) return;
    let card = document.getElementById('ptLoiLaunch');
    if (!owner) { card?.remove(); return; }
    if (!card) {
      card = document.createElement('section'); card.id = 'ptLoiLaunch'; card.className = 'card span-12';
      card.innerHTML = '<h2>Make the Offer · Letter of Intent</h2><p>Prepare a preliminary LOI from a completed, saved analysis. Owner-only pilot: test emails go to your own verified address. Your private underwriting is not included.</p><button type="button" class="btn primary">Prepare Letter of Intent</button><p data-loi-help role="status"></p>';
      card.querySelector('button').onclick = () => {
        if (window.UnsavedChangeProtection?.isDirty?.()) { card.querySelector('[data-loi-help]').textContent = 'Save your analysis changes first so the LOI uses your current saved property.'; return; }
        let id; try { id = selectedAnalysisId; } catch (_) {}
        location.href = 'letter-of-intent.html' + (id ? '?analysis=' + encodeURIComponent(id) : '');
      };
      dashboard.append(card);
    }
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

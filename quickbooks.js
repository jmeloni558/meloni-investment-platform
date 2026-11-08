'use strict';
(async () => {
  const status = document.getElementById('status');
  const button = document.getElementById('action');
  const client = window.PropertyThesisSession.getClient();
  const call = async action => {
    const { data, error } = await client.functions.invoke('qbo', { body: { action } });
    if (error) throw error;
    return data;
  };
  async function show() {
    const { data } = await client.auth.getSession();
    if (data.session?.user.email?.toLowerCase() !== 'jamie@melonirealty.com') {
      status.textContent = 'Sign in to the dashboard with your Meloni Realty owner account, then return here.';
      return;
    }
    const state = await call('status');
    status.textContent = state.connected ? 'Connected to Meloni Realty. New billable orders with confirmed customer matches are eligible for invoicing.' :
      state.ready ? 'Connect your Meloni Realty QuickBooks company to create invoices for new billable orders.' : 'QuickBooks production setup is in progress.';
    if (['invalid','failed'].includes(new URLSearchParams(location.search).get('result'))) status.textContent += ' The last connection attempt failed.';
    button.hidden = !(state.connected || state.ready);
    button.textContent = state.connected ? 'Disconnect QuickBooks' : 'Connect to QuickBooks';
    button.onclick = async () => {
      if (state.connected && !window.confirm('Disconnect QuickBooks and stop automatic invoice creation?')) return;
      button.disabled = true;
      try {
        if (state.connected) { await call('disconnect'); await show(); }
        else { const result = await call('connect'); location.assign(result.url); }
      } catch { status.textContent = 'QuickBooks could not complete the request. Try again.'; }
      finally { button.disabled = false; }
    };
  }
  try { await show(); } catch { status.textContent = 'Unable to check the QuickBooks connection. Reload to try again.'; }
})();

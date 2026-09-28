'use strict';
(() => {
  const names = { professional_50_monthly: 'Professional 50 — monthly', professional_50_yearly: 'Professional 50 — annual', unlimited_monthly: 'Unlimited — monthly', unlimited_yearly: 'Unlimited — annual' };
  const stage = 'https://lmaiqpkogmmsldkziggy.supabase.co';
  function mount({ client, userId, getUserId, container }) {
    // Temporary launch gate: intentionally unavailable to production and phone development.
    if (false /* Production candidate; project and authenticated-user checks remain */ || client?.supabaseUrl !== stage || !userId) return null;
    const panel = document.createElement('section'); panel.className = 'pt-plan-change';
    panel.setAttribute('aria-label', 'Change subscription plan');
    panel.innerHTML = '<h2>Change your subscription</h2><label>New plan <select data-plan></select></label> <button type="button" data-preview>Preview change</button><p data-summary></p><p data-status role="status" aria-live="polite"></p><button type="button" data-confirm hidden>Confirm change</button> <button type="button" data-check>Check change status</button> <button type="button" data-cancel hidden>Cancel scheduled change</button> <a data-pay hidden rel="noopener noreferrer">Complete payment securely</a>';
    const find = selector => panel.querySelector(selector);
    const select = find('[data-plan]'), preview = find('[data-preview]'), confirm = find('[data-confirm]');
    const check = find('[data-check]'), cancel = find('[data-cancel]'), pay = find('[data-pay]');
    const summary = find('[data-summary]'), status = find('[data-status]');
    status.setAttribute('tabindex', '-1');
    status.setAttribute('aria-atomic', 'true');
    for (const [value, label] of Object.entries(names)) { const option = document.createElement('option'); option.value = value; option.textContent = label; select.appendChild(option); }
    let disposed = false, busy = false, operationId = null, state = 'none', expiresAt = 0, cancelReady = false;
    const current = () => !disposed && getUserId() === userId;
    const unresolved = () => ['executing', 'payment_pending', 'scheduled', 'canceling', 'needs_review'].includes(state);
    function controls() {
      preview.disabled = busy || unresolved(); select.disabled = busy || unresolved(); check.disabled = busy;
      confirm.disabled = busy; cancel.disabled = busy;
    }
    function hideActions() { confirm.hidden = true; cancel.hidden = true; pay.hidden = true; pay.removeAttribute('href'); cancelReady = false; }
    async function invoke(name, body) {
      if (!current()) throw Error('Your account changed. Reopen billing.');
      const { data, error } = await client.functions.invoke(name, { body });
      if (!current()) throw Error('Your account changed. Reopen billing.');
      if (error) {
        let detail; try { detail = await error.context?.json?.(); } catch {}
        if (!current()) throw Error('Your account changed. Reopen billing.');
        // Preserve a server review hold even though it uses HTTP 409.
        if (detail?.state === 'needs_review') return detail;
        const failure = Error(detail?.error || 'The outcome could not be confirmed. Check the same change before trying again.');
        // Only explicit preflight rejections allow replacing a quote. Timeouts and
        // generic failures may follow a charge and must retain the saved identity.
        if (name === 'confirm-plan-change' && error.context?.status === 409 &&
            ['quote_changed', 'quote_expired'].includes(detail?.code)) failure.refreshPreview = true;
        throw failure;
      }
      if (!data) throw Error('No billing response was received. Check status before trying again.');
      return data;
    }
    async function run(work) {
      if (busy || !current()) return;
      busy = true; controls(); status.textContent = 'Checking billing…';
      try { await work(); } catch (error) {
        if (current()) {
          if (error.refreshPreview) {
            state = 'quoted'; expiresAt = 0; hideActions(); summary.textContent = '';
          }
          status.textContent = error.message;
        }
      }
      finally { busy = false; if (current()) { controls(); status.focus(); } }
    }
    function outcome(data) {
      // A status response must never leave an old quote looking actionable.
      summary.textContent = '';
      operationId = data.operationId || operationId;
      state = ['none','quoted','executing','payment_pending','scheduled','canceling','applied','canceled','needs_review'].includes(data.state) ? data.state : 'needs_review'; hideActions();
      const messages = {
        none: 'No pending plan change was found.', quoted: 'A preview is saved. Preview the plan again to review its amount before confirming.',
        executing: 'This change is still being confirmed. Retry the same confirmation.',
        payment_pending: 'Payment is still required. Your current plan remains in place.',
        scheduled: 'Your change is scheduled for renewal. Your current plan remains in place until then.',
        canceling: 'Cancellation is not yet confirmed. Retry this cancellation.',
        applied: 'Stripe confirmed the change. App access may take a moment to update.',
        canceled: 'The plan change was canceled.', needs_review: 'This change needs a billing review. Contact support before requesting another change.',
      };
      status.textContent = messages[state] || 'Check billing again before making another change.';
      if (names[data.target]) {
        const date = new Date(data.effectiveAt * 1000);
        summary.textContent = names[data.target] + (state === 'scheduled' && Number.isFinite(date.getTime())
          ? ` — scheduled for ${date.toLocaleDateString()}.` : '.');
      }
      if (data.renewalPaymentPending) status.textContent = 'Renewal payment is still pending. Open Manage Subscription to resolve the invoice, then check this change again.';
      if (['executing', 'payment_pending'].includes(state)) { confirm.hidden = false; confirm.textContent = 'Retry confirmation'; }
      if (['scheduled', 'canceling'].includes(state)) { cancel.hidden = false; cancel.textContent = state === 'canceling' ? 'Retry cancellation' : 'Cancel scheduled change'; }
      if (data.renewalPaymentPending) cancel.hidden = true;
      if (state === 'payment_pending' && data.paymentUrl) {
        try { const url = new URL(data.paymentUrl); if (url.protocol === 'https:' && url.hostname === 'invoice.stripe.com' && !url.username && !url.password) { pay.href = url.href; pay.hidden = false; } } catch {}
      }
    }
    preview.onclick = () => run(async () => {
      hideActions(); summary.textContent = '';
      const data = await invoke('preview-plan-change', { plan: select.value });
      const expiry = Date.parse(data.expiresAt);
      if (!data.operationId || !Number.isFinite(expiry) || expiry <= Date.now() || !names[data.target] ||
          !['immediate', 'renewal'].includes(data.timing) || !Number.isSafeInteger(data.amountDueNow) ||
          (data.timing === 'renewal' && !Number.isSafeInteger(data.recurringBaseAmount))) throw Error('The preview is incomplete. Request a new preview.');
      const money = amount => new Intl.NumberFormat(undefined, { style: 'currency', currency: data.currency }).format(amount / 100);
      const when = new Date(data.effectiveAt * 1000);
      if (!Number.isFinite(when.getTime())) throw Error('The preview date is invalid. Request a new preview.');
      summary.textContent = data.timing === 'immediate'
        ? `${names[data.target]}. Due now: ${money(data.amountDueNow)}. Includes applicable unused-time credit. Takes effect after any required payment succeeds.`
        : `${names[data.target]}, starting ${when.toLocaleDateString()}. Nothing due now. Base renewal price: ${money(data.recurringBaseAmount)}; the final bill may include taxes or adjustments.`;
      operationId = data.operationId; expiresAt = expiry; state = 'quoted';
      confirm.textContent = 'Confirm change'; confirm.hidden = false;
      status.textContent = 'Review the amount and timing, then confirm. No change has been submitted.';
    });
    confirm.onclick = () => run(async () => {
      if (!operationId) throw Error('Preview the change first.');
      if (state === 'quoted' && Date.now() >= expiresAt) { hideActions(); throw Error('This preview expired. Request a new preview before confirming.'); }
      // Keep this identity after a timeout; never silently create a replacement purchase.
      state = 'executing'; confirm.textContent = 'Retry confirmation';
      outcome(await invoke('confirm-plan-change', { operationId }));
    });
    check.onclick = () => run(async () => {
      outcome(await invoke(['executing', 'payment_pending'].includes(state) && operationId ? 'confirm-plan-change' : 'manage-plan-change',
        ['executing', 'payment_pending'].includes(state) && operationId ? { operationId } : { action: 'status' }));
    });
    cancel.onclick = () => {
      if (busy || !current()) return;
      if (!cancelReady && state !== 'canceling') {
        cancelReady = true; cancel.textContent = 'Confirm cancellation';
        status.textContent = 'Cancel only the scheduled plan change? Your current subscription will continue.';
        status.focus(); return;
      }
      return run(async () => { state = 'canceling'; outcome(await invoke('manage-plan-change', { action: 'cancel', operationId })); });
    };
    select.onchange = () => { if (!busy && !unresolved()) { hideActions(); summary.textContent = ''; state = 'none'; operationId = null; } };
    container.appendChild(panel); controls();
    return { destroy() { disposed = true; panel.remove(); } };
  }
  window.PropertyThesisPlanChanges = { mount };
})();

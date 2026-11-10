(() => {
  // A reload can inject a fresh launcher into a dashboard that is already open.
  const replaceEvent = 'pt-replace-calendar-launcher';
  document.dispatchEvent(new Event(replaceEvent));
  let button;
  const observer = new MutationObserver(attachLauncher);

  function detach() {
    observer.disconnect();
    button?.removeEventListener('click', launchCalendar, true);
    button = null;
  }

  function runtimeAvailable() {
    try {
      return Boolean(chrome.runtime?.id);
    } catch {
      return false;
    }
  }

  function launchCalendar(event) {
    if (event.defaultPrevented || !event.isTrusted || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!runtimeAvailable()) {
      detach();
      return;
    }
    let response;
    try {
      response = chrome.runtime.sendMessage('open-outlook-calendar');
    } catch {
      detach();
      return;
    }
    event.preventDefault();
    response.then(ok => {
      if (!ok) showStatus('Edge could not open Outlook Calendar. Please try again.');
    }).catch(() => showStatus('Refresh the dashboard to reconnect Outlook Calendar.'));
  }

  function showStatus(message) {
    const status = document.querySelector('#ptOrders #od-status');
    if (status) status.textContent = message;
  }

  function attachLauncher() {
    if (!runtimeAvailable()) {
      detach();
      return;
    }
    const current = document.querySelector('#ptOrders #od-calendar');
    if (current === button) return;
    button?.removeEventListener('click', launchCalendar, true);
    button = current;
    button?.addEventListener('click', launchCalendar, true);
  }

  document.addEventListener(replaceEvent, detach, {once: true});
  observer.observe(document, {childList: true, subtree: true});
  attachLauncher();
})();

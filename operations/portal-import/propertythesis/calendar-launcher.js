document.addEventListener('click', event => {
  if (!event.isTrusted || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!event.target.closest?.('#ptOrders #od-calendar') || !chrome.runtime.id) return;
  event.preventDefault();
  chrome.runtime.sendMessage('open-outlook-calendar').then(ok => {
    if (!ok) window.alert('Edge could not open Outlook Calendar. Please try again.');
  }).catch(() => window.alert('Refresh the dashboard to reconnect the Edge extension.'));
}, true);

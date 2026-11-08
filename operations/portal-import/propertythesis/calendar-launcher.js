function launchCalendar(event) {
  if (!event.isTrusted || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!chrome.runtime.id) return;
  event.preventDefault();
  chrome.runtime.sendMessage('open-outlook-calendar').then(ok => {
    if (!ok) window.alert('Edge could not open Outlook Calendar. Please try again.');
  }).catch(() => window.alert('Refresh the dashboard to reconnect the Edge extension.'));
}
// The dashboard replaces the initial document and mounts its toolbar after sign-in.
function attachLauncher() {
  const button=document.querySelector('#ptOrders #od-calendar');
  if (button) button.addEventListener('click',launchCalendar,true);
}
new MutationObserver(attachLauncher).observe(document,{childList:true,subtree:true});
attachLauncher();

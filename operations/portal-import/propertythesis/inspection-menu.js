const checkbox=document.getElementById('inspection-sync');
chrome.storage.local.get('inspectionSync').then(state=>{checkbox.checked=!!state.inspectionSync;});
checkbox.onchange=async()=>{
  await chrome.storage.local.set({inspectionSync:checkbox.checked});
  if(checkbox.checked)chrome.alarms.create('inspection-sync',{delayInMinutes:0.05,periodInMinutes:1});
};

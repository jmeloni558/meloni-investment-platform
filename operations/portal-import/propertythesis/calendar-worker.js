const calendarUrl = 'https://outlook.cloud.microsoft/calendar/';
const hosts = ['outlook.cloud.microsoft', 'outlook.office.com', 'outlook.office365.com'];
const patterns = hosts.flatMap(host => ['calendar', 'calendar/*'].map(path => 'https://' + host + '/' + path));
let opening;
async function openCalendar(windowId) {
  const tabs = (await chrome.tabs.query({url: patterns})).filter(tab => {
    if (!tab.url) return false;
    const url = new URL(tab.url);
    return url.protocol === 'https:' && hosts.includes(url.hostname) && /^\/calendar(?:\/|$)/i.test(url.pathname);
  });
  tabs.sort((a,b) => Number(b.windowId === windowId) - Number(a.windowId === windowId) || b.lastAccessed - a.lastAccessed);
  const calendar = tabs[0];
  if (calendar) {
    await chrome.tabs.update(calendar.id, {active: true});
    await chrome.windows.update(calendar.windowId, {focused: true});
  } else {
    await chrome.tabs.create({url: calendarUrl, windowId, active: true});
  }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message !== 'open-outlook-calendar' || !sender.tab || sender.frameId !== 0 ||
      new URL(sender.url).origin !== 'https://propertythesis.com') return;
  opening ??= openCalendar(sender.tab.windowId).finally(() => { opening = undefined; });
  opening.then(() => reply(true), () => reply(false));
  return true;
});

importScripts('inspection-worker.js','photo-worker.js');

chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({url: 'https://propertythesis.com/*'});
  await Promise.allSettled(tabs.map(tab => chrome.scripting.executeScript({
    target: {tabId: tab.id}, files: ['calendar-launcher.js']
  })));
});

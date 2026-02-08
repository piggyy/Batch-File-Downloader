// Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }
  if (request.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || window.location.href
    });
    return true;
  }
});

// DHIMS2 Extension - Content Script
// Injected into DHIMS2 pages
console.log('🔌 DHIMS2 Extension: Content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'Content script alive' });
      break;

    case 'CHECK_PAGE':
      // Check if we're on the correct DHIMS2 page
      const isDHIMS2 = window.location.hostname.includes('chimgh.org');
      sendResponse({ success: true, isDHIMS2 });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

// Notify background that content script is ready
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  url: window.location.href
});

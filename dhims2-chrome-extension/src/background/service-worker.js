// DHIMS2 Extension - Background Service Worker
import apiInterceptor from './api-interceptor.js';
import StorageManager from '../utils/storage-manager.js';

console.log('🚀 DHIMS2 Extension: Service Worker Started');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    console.log('First time installation - Welcome!');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🎯 Extension icon clicked - Opening side panel');
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from sidepanel or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received:', message.type);

  switch (message.type) {
    case 'START_API_DISCOVERY':
      handleStartDiscovery(sendResponse);
      break;

    case 'STOP_API_DISCOVERY':
      handleStopDiscovery(sendResponse);
      break;

    case 'GET_API_CONFIG':
      handleGetConfig(sendResponse);
      break;

    case 'GET_DISCOVERY_STATUS':
      handleGetStatus(sendResponse);
      break;

    case 'CLEAR_API_CONFIG':
      handleClearConfig(sendResponse);
      break;

    case 'PING':
      sendResponse({ success: true, message: 'pong' });
      break;

    case 'CONTENT_SCRIPT_READY':
      console.log('Content script ready on:', message.url);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  // Return true to indicate async response
  return true;
});

/**
 * Handle start discovery request
 */
function handleStartDiscovery(sendResponse) {
  try {
    console.log('🔍 Starting API discovery...');
    apiInterceptor.startListening();

    sendResponse({
      success: true,
      message: 'Discovery started. Please submit a test record in DHIMS2.'
    });
  } catch (error) {
    console.error('Error starting discovery:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle stop discovery request
 */
function handleStopDiscovery(sendResponse) {
  try {
    console.log('🛑 Stopping API discovery...');
    apiInterceptor.stopListening();

    sendResponse({ success: true, message: 'Discovery stopped' });
  } catch (error) {
    console.error('Error stopping discovery:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get config request
 */
async function handleGetConfig(sendResponse) {
  try {
    const config = await StorageManager.get('apiConfig');
    sendResponse({ success: true, config });
  } catch (error) {
    console.error('Error getting config:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get status request
 */
function handleGetStatus(sendResponse) {
  try {
    const status = apiInterceptor.getStatus();
    sendResponse({ success: true, status });
  } catch (error) {
    console.error('Error getting status:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle clear config request
 */
async function handleClearConfig(sendResponse) {
  try {
    await StorageManager.remove('apiConfig');
    await StorageManager.remove('lastDiscovery');
    apiInterceptor.clear();

    console.log('🧹 Configuration cleared');
    sendResponse({ success: true, message: 'Configuration cleared' });
  } catch (error) {
    console.error('Error clearing config:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Log when service worker is activated
console.log('✅ Service Worker: Ready and listening');

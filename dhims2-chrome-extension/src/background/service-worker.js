// DHIMS2 Extension - Background Service Worker
import apiInterceptor from './api-interceptor.js';
import StorageManager from '../utils/storage-manager.js';

console.log('🚀 DHIMS2 Extension: Service Worker Started');

// Keepalive mechanism - prevents service worker from going idle
let keepaliveInterval = null;

function startKeepalive() {
  if (keepaliveInterval) return;

  keepaliveInterval = setInterval(() => {
    // Empty function just to keep service worker alive
    console.log('💓 Keepalive ping');
  }, 20000); // Every 20 seconds

  console.log('✅ Keepalive started');
}

function stopKeepalive() {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
    console.log('🛑 Keepalive stopped');
  }
}

// Start keepalive when service worker starts
startKeepalive();

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    console.log('First time installation - Welcome!');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Restore debug mode state on service worker startup
(async () => {
  const debugMode = await StorageManager.getDebugMode();
  if (debugMode) {
    console.log('🔄 Restoring debug mode from previous session');
    apiInterceptor.startListening(true);
  }
})();

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

    case 'GET_SYSTEM_CONFIG':
      handleGetSystemConfig(message.system, sendResponse);
      break;

    case 'GET_DISCOVERY_STATUS':
      handleGetStatus(sendResponse);
      break;

    case 'CLEAR_API_CONFIG':
      handleClearConfig(sendResponse);
      break;

    case 'GET_DEBUG_DATA':
      handleGetDebugData(message.system, sendResponse);
      break;

    case 'CLEAR_DEBUG_PAYLOADS':
      handleClearDebugPayloads(message.system, sendResponse);
      break;

    case 'PING':
      sendResponse({ success: true, message: 'pong' });
      break;

    case 'CONTENT_SCRIPT_READY':
      console.log('Content script ready on:', message.url);
      sendResponse({ success: true });
      break;

    case 'TOGGLE_DEBUG_MODE':
      handleToggleDebugMode(message.enabled, message.system, sendResponse);
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

/**
 * Handle toggle debug mode request (multi-system)
 */
async function handleToggleDebugMode(enabled, system = 'dhims2', sendResponse) {
  try {
    const storageKey = `${system}_debug_mode`;
    await StorageManager.set(storageKey, enabled);

    if (enabled) {
      console.log(`🐛 Debug mode enabled for ${system} - Will capture API payloads`);
      apiInterceptor.startListening(true, system); // true = debug mode
    } else {
      console.log(`🐛 Debug mode disabled for ${system}`);
      apiInterceptor.stopListening(system);
    }

    sendResponse({ success: true, enabled, system });
  } catch (error) {
    console.error('Error toggling debug mode:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get system config request (multi-system)
 */
async function handleGetSystemConfig(system = 'dhims2', sendResponse) {
  try {
    const configKey = `${system}_config`;
    const config = await StorageManager.get(configKey);
    sendResponse({ success: true, config, system });
  } catch (error) {
    console.error('Error getting system config:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get debug data request (multi-system)
 */
async function handleGetDebugData(system = 'dhims2', sendResponse) {
  try {
    const payloadsKey = `${system}_captured_payloads`;
    const configKey = `${system}_config`;

    const [payloads, config] = await Promise.all([
      StorageManager.get(payloadsKey),
      StorageManager.get(configKey)
    ]);

    sendResponse({
      success: true,
      payloads: payloads || [],
      config: config || null,
      system
    });
  } catch (error) {
    console.error('Error getting debug data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle clear debug payloads request (multi-system)
 */
async function handleClearDebugPayloads(system = 'dhims2', sendResponse) {
  try {
    const payloadsKey = `${system}_captured_payloads`;
    await StorageManager.remove(payloadsKey);

    console.log(`🧹 Cleared debug payloads for ${system}`);
    sendResponse({ success: true, message: `Cleared ${system} payloads`, system });
  } catch (error) {
    console.error('Error clearing debug payloads:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Log when service worker is activated
console.log('✅ Service Worker: Ready and listening (Multi-System Support)');

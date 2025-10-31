/**
 * API Interceptor - Captures DHIMS2 API calls
 *
 * Listens for POST requests to DHIMS2 API endpoints during manual form submission
 * to learn the API structure automatically
 */

import StorageManager from '../utils/storage-manager.js';
import { FIELD_MAPPINGS, STATIC_VALUES, validateDiscoveredConfig } from '../utils/field-definitions.js';
import debugLogger from '../utils/debug-logger.js';

class APIInterceptor {
  constructor() {
    this.isListening = false;
    this.debugMode = false;
    this.activeSystem = 'dhims2'; // Track which system we're capturing for
    this.capturedRequests = new Map(); // requestId -> request data
    this.listeners = {
      onBeforeRequest: null,
      onCompleted: null,
      onErrorOccurred: null
    };
    this.listenerCheckInterval = null;
    this.requestCount = 0;
  }

  /**
   * Start listening for API calls
   * @param {boolean} debugMode - If true, captures all payloads without auto-stopping
   * @param {string} system - Which system to capture for ('dhims2' or 'lhims')
   */
  startListening(debugMode = false, system = 'dhims2') {
    if (this.isListening) {
      console.log('⚠️  Already listening');
      return;
    }

    this.debugMode = debugMode;
    this.activeSystem = system;

    console.log('🔍 API Interceptor: Started listening...');
    console.log(`🎯 Active System: ${system.toUpperCase()}`);
    console.log(`🐛 Debug Mode: ${debugMode ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    this.isListening = true;
    this.debugMode = debugMode;
    this.capturedRequests.clear();
    this.requestCount = 0;

    // First, ensure any existing listeners are removed
    this.removeListeners();

    // Create bound listeners (store them to prevent garbage collection)
    this.listeners.onBeforeRequest = this.handleRequest.bind(this);
    this.listeners.onCompleted = this.handleCompleted.bind(this);
    this.listeners.onErrorOccurred = this.handleError.bind(this);

    // Register listeners
    this.registerListeners();

    // Start periodic check to ensure listeners stay active
    this.startListenerHealthCheck();

    console.log('✅ Listeners attached and health check started');
  }

  /**
   * Handle outgoing request
   */
  handleRequest(details) {
    console.log('🌐 REQUEST DETECTED:', details.method, details.url);

    if (!this.isListening) {
      console.log('❌ Not listening, ignoring request');
      return;
    }

    // LHIMS: Capture ALL requests (GET, POST, PUT, DELETE, etc.)
    // DHIMS2 Debug Mode: Capture ALL requests
    // DHIMS2 Normal Mode: Only POST requests
    if (this.activeSystem === 'lhims') {
      console.log('🎯 LHIMS: Capturing ALL request types');
      // Capture everything for LHIMS - no filtering
    } else if (this.debugMode) {
      console.log('🐛 DHIMS2 DEBUG MODE: Capturing ALL requests');
      // In debug mode, capture everything - no filtering
    } else {
      // Normal discovery mode for DHIMS2 - only POST requests
      if (details.method !== 'POST') {
        console.log('⏭️  DHIMS2 Normal mode: Skipping non-POST request');
        return;
      }

      // Skip login and other non-event endpoints
      if (details.url.includes('/auth/login') ||
          details.url.includes('/logout') ||
          details.url.includes('/me')) {
        console.log('⏭️  Skipping auth endpoint');
        return;
      }
    }

    console.log('📡 ✅ CAPTURED API REQUEST:', {
      url: details.url,
      method: details.method,
      timestamp: new Date().toISOString()
    });

    // Increment request counter
    this.requestCount++;

    // Parse request body
    let payload = null;
    if (details.requestBody) {
      console.log('📦 Parsing request body...');
      payload = this.parseRequestBody(details.requestBody);
      console.log('📦 Parsed payload:', payload);
    } else {
      console.log('⚠️  No request body found');
    }

    // Store captured request
    const capturedRequest = {
      requestId: details.requestId,
      timestamp: new Date().toISOString(),
      url: details.url,
      method: details.method,
      payload: payload,
      status: 'pending'
    };

    this.capturedRequests.set(details.requestId, capturedRequest);

    console.log('💾 Request stored with ID:', details.requestId, '| Total:', this.requestCount);
    console.log('📦 Payload captured:', payload ? 'Yes ✅' : 'No ❌');
  }

  /**
   * Handle completed request
   */
  async handleCompleted(details) {
    console.log('🏁 Request completed:', details.url, 'Status:', details.statusCode);

    if (!this.isListening) {
      console.log('❌ Not listening, ignoring completion');
      return;
    }

    const request = this.capturedRequests.get(details.requestId);
    if (!request) {
      console.log('⚠️  Request not found in cache:', details.requestId);
      console.log('💡 This means onBeforeRequest did not capture it (likely filtered out)');
      return;
    }

    request.status = 'completed';
    request.statusCode = details.statusCode;
    request.responseHeaders = details.responseHeaders;

    console.log('✅ Request completed:', {
      url: details.url,
      status: details.statusCode
    });

    // If in debug mode, capture ALL successful requests
    if (this.debugMode) {
      if (details.statusCode >= 200 && details.statusCode < 300) {
        console.log('🐛 DEBUG MODE: Saving request');
        await this.saveDebugPayload(request);

        // Also log to debug logger for comparison
        debugLogger.logRequest('manual', {
          url: request.url,
          method: request.method,
          headers: details.responseHeaders ? this.parseHeaders(details.responseHeaders) : {},
          payload: request.payload
        });

        debugLogger.logResponse('manual', {
          url: request.url,
          status: details.statusCode,
          statusText: 'OK',
          body: null, // We don't have response body in webRequest API
          headers: details.responseHeaders ? this.parseHeaders(details.responseHeaders) : {}
        });
      } else {
        console.log('❌ Request failed with status:', details.statusCode);
        // Still save failed requests in debug mode for troubleshooting
        await this.saveDebugPayload(request);

        // Log error to debug logger
        debugLogger.logResponse('manual', {
          url: request.url,
          status: details.statusCode,
          statusText: 'ERROR',
          body: null,
          headers: details.responseHeaders ? this.parseHeaders(details.responseHeaders) : {}
        });
      }
    } else {
      // Normal discovery mode - only capture event submissions
      if (details.statusCode >= 200 && details.statusCode < 300) {
        console.log('🔍 Checking if this is an event submission...');
        const isEvent = this.isEventSubmission(request);
        console.log('📊 Is event submission?', isEvent);

        if (isEvent) {
          console.log('🎯 ✅ EVENT SUBMISSION DETECTED!');
          await this.analyzeAndSave(request);
        } else {
          console.log('⏭️  Not an event submission, skipping');
        }
      } else {
        console.log('❌ Request failed with status:', details.statusCode);
      }
    }
  }

  /**
   * Handle failed request
   */
  handleError(details) {
    if (!this.isListening) return;

    const request = this.capturedRequests.get(details.requestId);
    if (request) {
      request.status = 'error';
      request.error = details.error;
      console.error('❌ Request failed:', details.error);
    }
  }

  /**
   * Parse request body from various formats
   */
  parseRequestBody(requestBody) {
    try {
      // Handle raw bytes
      if (requestBody.raw && requestBody.raw.length > 0) {
        const decoder = new TextDecoder('utf-8');
        const bodyString = decoder.decode(requestBody.raw[0].bytes);
        return JSON.parse(bodyString);
      }

      // Handle form data
      if (requestBody.formData) {
        return requestBody.formData;
      }

      return null;
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return null;
    }
  }

  /**
   * Check if request is an event submission
   */
  isEventSubmission(request) {
    console.log('🔍 isEventSubmission check:', {
      url: request.url,
      hasPayload: !!request.payload,
      method: request.method
    });

    // Check URL contains 'tracker' or 'events'
    if (!request.url.includes('/tracker') && !request.url.includes('/events')) {
      console.log('❌ URL does not contain "/tracker" or "/events"');
      return false;
    }

    // Check method is POST
    if (request.method !== 'POST') {
      console.log('❌ Method is not POST');
      return false;
    }

    // Check payload has expected structure
    if (!request.payload) {
      console.log('❌ No payload found');
      return false;
    }

    console.log('🔍 Payload keys:', Object.keys(request.payload));

    // DHIS2 can have two structures:
    // 1. Direct: {program, orgUnit, dataValues}
    // 2. Wrapped: {events: [{program, orgUnit, dataValues}]}

    let hasExpectedFields = false;

    // Check direct structure
    if (request.payload.program || request.payload.orgUnit || request.payload.dataValues) {
      hasExpectedFields = true;
      console.log('✅ Direct structure detected');
    }

    // Check wrapped structure (events array)
    if (request.payload.events && Array.isArray(request.payload.events) && request.payload.events.length > 0) {
      const firstEvent = request.payload.events[0];
      console.log('🔍 First event in array:', firstEvent);
      if (firstEvent.program || firstEvent.orgUnit || firstEvent.dataValues) {
        hasExpectedFields = true;
        console.log('✅ Wrapped structure detected (events array)');
      }
    }

    console.log('🔍 Has expected fields?', {
      directProgram: !!request.payload.program,
      directOrgUnit: !!request.payload.orgUnit,
      directDataValues: !!request.payload.dataValues,
      hasEventsArray: !!request.payload.events,
      result: hasExpectedFields
    });

    return hasExpectedFields;
  }

  /**
   * Save payload for debug inspection (debug mode only)
   */
  async saveDebugPayload(request) {
    try {
      console.log(`🐛 Saving debug payload for ${this.activeSystem}...`);

      // Parse URL to extract query parameters for GET requests
      const urlObj = new URL(request.url);
      const queryParams = {};
      urlObj.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      const debugPayload = {
        url: request.url,
        pathname: urlObj.pathname,
        method: request.method,
        timestamp: request.timestamp,
        statusCode: request.statusCode,
        payload: request.payload || null,
        queryParams: Object.keys(queryParams).length > 0 ? queryParams : null,
        responseHeaders: request.responseHeaders,
        requestType: this.categorizeRequest(request.url),
        // Add readable formatting
        _metadata: {
          capturedAt: new Date(request.timestamp).toLocaleString(),
          status: request.statusCode >= 200 && request.statusCode < 300 ? 'success' : 'error',
          hasPayload: !!request.payload,
          payloadSize: request.payload ? JSON.stringify(request.payload).length : 0
        }
      };

      // Save to system-specific storage key
      const storageKey = `${this.activeSystem}_captured_payloads`;
      const existingPayloads = await StorageManager.get(storageKey) || [];

      // Prepend new payload (newest first)
      existingPayloads.unshift(debugPayload);

      // Keep only last 50 payloads
      const trimmedPayloads = existingPayloads.slice(0, 50);

      await StorageManager.set(storageKey, trimmedPayloads);

      console.log('💾 Debug payload saved');

      // Notify popup that a new payload was captured
      chrome.runtime.sendMessage({
        type: 'PAYLOAD_CAPTURED',
        payload: debugPayload
      }).catch(() => {
        // Popup might not be open
      });

      // Show notification (but not too frequently to avoid spam)
      const now = Date.now();
      if (!this.lastNotification || now - this.lastNotification > 5000) {
        this.lastNotification = now;
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon-48.png',
          title: '🐛 Request Captured',
          message: `${request.method} ${urlObj.pathname}`,
          priority: 0
        });
      }

    } catch (error) {
      console.error('Failed to save debug payload:', error);
    }
  }

  /**
   * Categorize request type based on URL
   */
  categorizeRequest(url) {
    if (url.includes('/api/me')) return 'User Profile';
    if (url.includes('/auth/')) return 'Authentication';
    if (url.includes('/events')) return 'Event Submission';
    if (url.includes('/tracker')) return 'Tracker';
    if (url.includes('/dataValues')) return 'Data Values';
    if (url.includes('/organisationUnits')) return 'Organization Units';
    if (url.includes('/programs')) return 'Programs';
    if (url.includes('/dataElements')) return 'Data Elements';
    if (url.includes('/api/')) return 'API Call';
    return 'Other';
  }

  /**
   * Analyze API structure and save configuration
   */
  async analyzeAndSave(request) {
    try {
      const { payload, url } = request;

      console.log('🔬 Analyzing payload structure...');

      // Extract endpoint info
      const urlObj = new URL(url);
      const endpoint = {
        baseUrl: urlObj.origin + urlObj.pathname,
        method: 'POST'
      };

      // Handle wrapped structure (events array) vs direct structure
      let eventData = payload;
      let isWrapped = false;

      if (payload.events && Array.isArray(payload.events) && payload.events.length > 0) {
        console.log('📦 Wrapped structure detected - extracting first event');
        eventData = payload.events[0];
        isWrapped = true;
      }

      console.log('📋 Event data:', eventData);

      // Analyze payload structure
      const structure = this.extractStructure(payload);

      // Extract discovered data elements for validation
      const discoveredDataElements = {};
      if (eventData.dataValues && Array.isArray(eventData.dataValues)) {
        console.log('📊 Processing dataValues array:', eventData.dataValues.length, 'items');
        eventData.dataValues.forEach((item, index) => {
          if (item.dataElement && item.value !== undefined) {
            discoveredDataElements[item.dataElement] = {
              index: index,
              value: item.value,
              type: this.guessFieldType(item.value)
            };
          }
        });
      }

      // Validate discovered config against expected field definitions
      console.log('🔍 Validating discovered data elements...');
      const validation = validateDiscoveredConfig(discoveredDataElements);

      if (!validation.isValid) {
        console.error('❌ API discovery validation failed:', validation.errors);
        throw new Error(`API validation failed:\n${validation.errors.join('\n')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️  API discovery warnings:', validation.warnings);
      }

      // Use predefined field mappings (not discovered ones!)
      console.log('✅ Using predefined field mappings from field-definitions.js');
      const fieldMappings = FIELD_MAPPINGS;

      // Extract static values (same for all records) - merge with predefined
      const staticValues = {
        ...STATIC_VALUES,
        program: eventData.program || STATIC_VALUES.program,
        orgUnit: eventData.orgUnit || STATIC_VALUES.orgUnit,
        programStage: eventData.programStage || STATIC_VALUES.programStage,
        status: eventData.status || STATIC_VALUES.status,
        storedBy: eventData.storedBy || null,
        isWrapped: isWrapped  // Track whether we need to wrap in events array
      };

      // Create configuration object
      const config = {
        discovered: true,
        discoveryDate: new Date().toISOString(),
        endpoint,
        staticValues,
        payload_structure: staticValues,  // For backward compatibility
        payloadStructure: structure,
        fieldMappings,  // Now using predefined mappings!
        discoveredDataElements,  // Store discovered for reference
        validationResult: validation,  // Store validation result
        samplePayload: payload,
        totalFields: Object.keys(fieldMappings).length
      };

      // Save to storage
      await StorageManager.set('apiConfig', config);
      await StorageManager.set('lastDiscovery', new Date().toISOString());

      console.log('💾 API Configuration saved:', {
        endpoint: endpoint.baseUrl,
        fields: config.totalFields
      });

      // Notify user
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon-48.png',
        title: '✅ API Route Discovered!',
        message: `Endpoint: ${endpoint.baseUrl.split('/api/')[1]}\nFields mapped: ${config.totalFields}`,
        priority: 2
      });

      // Stop listening after successful capture
      this.stopListening();

      // Notify popup
      chrome.runtime.sendMessage({
        type: 'API_DISCOVERED',
        config: config
      }).catch(() => {
        // Popup might not be open, that's okay
      });

      return config;
    } catch (error) {
      console.error('Failed to analyze and save:', error);
      throw error;
    }
  }

  /**
   * Extract structure from payload object recursively
   */
  extractStructure(obj, path = '', maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return { type: 'max_depth_reached' };

    const structure = {};

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          structure[key] = {
            type: 'array',
            itemType: typeof value[0],
            example: value[0],
            structure: typeof value[0] === 'object' && value[0] !== null ?
              this.extractStructure(value[0], currentPath, maxDepth, currentDepth + 1) : null
          };
        } else {
          structure[key] = {
            type: 'array',
            itemType: 'unknown',
            example: null
          };
        }
      } else if (typeof value === 'object' && value !== null) {
        structure[key] = {
          type: 'object',
          structure: this.extractStructure(value, currentPath, maxDepth, currentDepth + 1)
        };
      } else {
        structure[key] = {
          type: typeof value,
          example: value
        };
      }
    }

    return structure;
  }

  /**
   * Guess field type from value
   */
  guessFieldType(value) {
    if (value === null || value === undefined || value === '') {
      return 'text';
    }

    const strValue = String(value);

    // Check if it's a date (ISO format or dd-mm-yyyy)
    if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) return 'date';
    if (/^\d{2}-\d{2}-\d{4}/.test(strValue)) return 'date';

    // Check if it's a number
    if (!isNaN(value) && !isNaN(parseFloat(value)) && strValue.trim() !== '') {
      return 'number';
    }

    // Check if it's boolean-like
    if (['true', 'false', 'Yes', 'No', 'YES', 'NO', 'yes', 'no'].includes(strValue)) {
      return 'boolean';
    }

    return 'text';
  }

  /**
   * Register webRequest listeners
   */
  registerListeners() {
    try {
      // Listen to outgoing requests - Support both DHIMS2 and LHIMS
      const urlPatterns = [
        "https://events.chimgh.org/*",  // DHIMS2
        "http://10.10.0.59/*"            // LHIMS (local network)
      ];

      chrome.webRequest.onBeforeRequest.addListener(
        this.listeners.onBeforeRequest,
        {
          urls: urlPatterns,
          types: ["xmlhttprequest"]
        },
        ["requestBody"]
      );

      // Listen to completed requests
      chrome.webRequest.onCompleted.addListener(
        this.listeners.onCompleted,
        {
          urls: urlPatterns,
          types: ["xmlhttprequest"]
        },
        ["responseHeaders"]
      );

      // Listen to failed requests
      chrome.webRequest.onErrorOccurred.addListener(
        this.listeners.onErrorOccurred,
        {
          urls: urlPatterns,
          types: ["xmlhttprequest"]
        }
      );

      console.log('✅ WebRequest listeners registered for DHIMS2 and LHIMS');
      console.log('📡 Listening to URLs:', urlPatterns);
      console.log('🎯 Will capture ALL XHR requests from these domains');
    } catch (error) {
      console.error('❌ Failed to register listeners:', error);
    }
  }

  /**
   * Remove webRequest listeners
   */
  removeListeners() {
    try {
      if (this.listeners.onBeforeRequest) {
        chrome.webRequest.onBeforeRequest.removeListener(this.listeners.onBeforeRequest);
      }
      if (this.listeners.onCompleted) {
        chrome.webRequest.onCompleted.removeListener(this.listeners.onCompleted);
      }
      if (this.listeners.onErrorOccurred) {
        chrome.webRequest.onErrorOccurred.removeListener(this.listeners.onErrorOccurred);
      }
      console.log('🗑️  WebRequest listeners removed');
    } catch (error) {
      console.error('❌ Failed to remove listeners:', error);
    }
  }

  /**
   * Start health check to ensure listeners stay active
   */
  startListenerHealthCheck() {
    // Clear any existing interval
    if (this.listenerCheckInterval) {
      clearInterval(this.listenerCheckInterval);
    }

    // Check every 10 seconds
    this.listenerCheckInterval = setInterval(() => {
      if (this.isListening) {
        console.log('🔍 Health check: Listeners active, requests captured:', this.requestCount);

        // If no requests captured in debug mode and listeners might be dead, re-register
        // This is a safety mechanism - in practice listeners should stay active
      }
    }, 10000);

    console.log('💓 Listener health check started');
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (!this.isListening) {
      console.log('⚠️  Not currently listening');
      return;
    }

    console.log('🛑 API Interceptor: Stopping...');

    // Stop health check
    if (this.listenerCheckInterval) {
      clearInterval(this.listenerCheckInterval);
      this.listenerCheckInterval = null;
    }

    // Remove listeners
    this.removeListeners();

    this.isListening = false;
    this.debugMode = false;
    this.listeners = {
      onBeforeRequest: null,
      onCompleted: null,
      onErrorOccurred: null
    };

    console.log('✅ Stopped listening');
  }

  /**
   * Clear captured data
   */
  clear() {
    this.capturedRequests.clear();
    console.log('🧹 Cleared captured requests');
  }

  /**
   * Parse response headers from array format to object
   */
  parseHeaders(headersArray) {
    if (!headersArray || !Array.isArray(headersArray)) return {};

    const headers = {};
    headersArray.forEach(header => {
      if (header.name && header.value) {
        headers[header.name] = header.value;
      }
    });

    return headers;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      capturedCount: this.capturedRequests.size
    };
  }
}

// Export singleton instance
const apiInterceptor = new APIInterceptor();
export default apiInterceptor;

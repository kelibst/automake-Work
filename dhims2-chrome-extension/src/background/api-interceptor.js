/**
 * API Interceptor - Captures DHIMS2 API calls
 *
 * Listens for POST requests to DHIMS2 API endpoints during manual form submission
 * to learn the API structure automatically
 */

import StorageManager from '../utils/storage-manager.js';

class APIInterceptor {
  constructor() {
    this.isListening = false;
    this.capturedRequests = new Map(); // requestId -> request data
    this.listeners = {
      onBeforeRequest: null,
      onCompleted: null,
      onErrorOccurred: null
    };
  }

  /**
   * Start listening for API calls
   */
  startListening() {
    if (this.isListening) {
      console.log('⚠️  Already listening');
      return;
    }

    console.log('🔍 API Interceptor: Started listening...');
    this.isListening = true;
    this.capturedRequests.clear();

    // Create listeners
    this.listeners.onBeforeRequest = this.handleRequest.bind(this);
    this.listeners.onCompleted = this.handleCompleted.bind(this);
    this.listeners.onErrorOccurred = this.handleError.bind(this);

    // Listen to outgoing requests - BROAD pattern to catch everything
    chrome.webRequest.onBeforeRequest.addListener(
      this.listeners.onBeforeRequest,
      {
        urls: ["https://events.chimgh.org/*"],
        types: ["xmlhttprequest"]
      },
      ["requestBody"]
    );

    // Listen to completed requests
    chrome.webRequest.onCompleted.addListener(
      this.listeners.onCompleted,
      {
        urls: ["https://events.chimgh.org/*"],
        types: ["xmlhttprequest"]
      },
      ["responseHeaders"]
    );

    // Listen to failed requests
    chrome.webRequest.onErrorOccurred.addListener(
      this.listeners.onErrorOccurred,
      {
        urls: ["https://events.chimgh.org/*"],
        types: ["xmlhttprequest"]
      }
    );

    console.log('✅ Listeners attached');
  }

  /**
   * Handle outgoing request
   */
  handleRequest(details) {
    console.log('🌐 ALL REQUEST DETECTED:', details.method, details.url);

    if (!this.isListening) {
      console.log('❌ Not listening, ignoring request');
      return;
    }

    // Log ALL requests to debug
    console.log('🔍 CHECKING REQUEST:', {
      method: details.method,
      url: details.url,
      hasBody: !!details.requestBody
    });

    // Only capture POST requests (form submissions)
    if (details.method !== 'POST') {
      console.log('⏭️  Skipping non-POST request');
      return;
    }

    // Skip login and other non-event endpoints
    if (details.url.includes('/auth/login') ||
        details.url.includes('/logout') ||
        details.url.includes('/me')) {
      console.log('⏭️  Skipping auth endpoint');
      return;
    }

    console.log('📡 ✅ CAPTURED API REQUEST:', {
      url: details.url,
      method: details.method,
      timestamp: new Date().toISOString()
    });

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

    console.log('💾 Request stored with ID:', details.requestId);
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
      return;
    }

    request.status = 'completed';
    request.statusCode = details.statusCode;
    request.responseHeaders = details.responseHeaders;

    console.log('✅ Request completed:', {
      url: details.url,
      status: details.statusCode
    });

    // If successful and looks like an event submission, analyze and save
    if (details.statusCode >= 200 && details.statusCode < 300) {
      console.log('🔍 Checking if this is an event submission...');
      const isEvent = this.isEventSubmission(request);
      console.log('📊 Is event submission?', isEvent);

      if (isEvent) {
        console.log('🎯 ✅ EVENT SUBMISSION DETECTED! Analyzing...');
        await this.analyzeAndSave(request);
      } else {
        console.log('⏭️  Not an event submission, skipping');
      }
    } else {
      console.log('❌ Request failed with status:', details.statusCode);
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

      // Extract field mappings from dataValues
      const fieldMappings = {};
      if (eventData.dataValues && Array.isArray(eventData.dataValues)) {
        console.log('📊 Processing dataValues array:', eventData.dataValues.length, 'items');
        eventData.dataValues.forEach((item, index) => {
          if (item.dataElement && item.value !== undefined) {
            fieldMappings[item.dataElement] = {
              index: index,
              value: item.value,
              type: this.guessFieldType(item.value)
            };
          }
        });
      }

      // Extract static values (same for all records)
      const staticValues = {
        program: eventData.program || null,
        orgUnit: eventData.orgUnit || null,
        programStage: eventData.programStage || null,
        status: eventData.status || 'COMPLETED',
        storedBy: eventData.storedBy || null,
        isWrapped: isWrapped  // Track whether we need to wrap in events array
      };

      // Create configuration object
      const config = {
        discovered: true,
        discoveryDate: new Date().toISOString(),
        endpoint,
        staticValues,
        payloadStructure: structure,
        fieldMappings,
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
   * Stop listening
   */
  stopListening() {
    if (!this.isListening) {
      console.log('⚠️  Not currently listening');
      return;
    }

    console.log('🛑 API Interceptor: Stopping...');

    // Remove listeners
    if (this.listeners.onBeforeRequest) {
      chrome.webRequest.onBeforeRequest.removeListener(this.listeners.onBeforeRequest);
    }
    if (this.listeners.onCompleted) {
      chrome.webRequest.onCompleted.removeListener(this.listeners.onCompleted);
    }
    if (this.listeners.onErrorOccurred) {
      chrome.webRequest.onErrorOccurred.removeListener(this.listeners.onErrorOccurred);
    }

    this.isListening = false;
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

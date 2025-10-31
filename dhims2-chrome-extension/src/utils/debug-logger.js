/**
 * Debug Logger Utility
 *
 * Provides enhanced logging for debugging API requests and responses
 * with payload comparison and detailed analysis
 */

class DebugLogger {
  constructor() {
    this.capturedRequests = [];
    this.bulkUploadLogs = [];
  }

  /**
   * Log a detailed API request
   */
  logRequest(context, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context, // 'manual' or 'bulk'
      type: 'request',
      ...details
    };

    if (context === 'manual') {
      this.capturedRequests.push(logEntry);
    } else if (context === 'bulk') {
      this.bulkUploadLogs.push(logEntry);
    }

    console.group(`📤 ${context.toUpperCase()} REQUEST - ${new Date().toLocaleTimeString()}`);
    console.log('🔗 Endpoint:', details.url);
    console.log('🔧 Method:', details.method);
    console.log('📋 Headers:', this.formatHeaders(details.headers));
    console.log('📦 Payload:', details.payload);
    console.log('📊 Payload Stats:', this.analyzePayload(details.payload));
    console.log('⏱️  Timestamp:', logEntry.timestamp);
    console.groupEnd();

    return logEntry;
  }

  /**
   * Log a detailed API response
   */
  logResponse(context, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context,
      type: 'response',
      ...details
    };

    if (context === 'manual') {
      this.capturedRequests.push(logEntry);
    } else if (context === 'bulk') {
      this.bulkUploadLogs.push(logEntry);
    }

    const isSuccess = details.status >= 200 && details.status < 300;
    const emoji = isSuccess ? '✅' : '❌';

    console.group(`${emoji} ${context.toUpperCase()} RESPONSE - ${details.status} ${details.statusText}`);
    console.log('🔗 URL:', details.url);
    console.log('📊 Status:', details.status, details.statusText);
    console.log('📥 Response Body:', details.body);

    if (details.body) {
      console.log('📋 Response Analysis:', this.analyzeResponse(details.body));
    }

    if (details.headers) {
      console.log('📑 Response Headers:', details.headers);
    }

    console.log('⏱️  Timestamp:', logEntry.timestamp);
    console.log('⏱️  Duration:', details.duration ? `${details.duration}ms` : 'N/A');
    console.groupEnd();

    return logEntry;
  }

  /**
   * Analyze payload structure
   */
  analyzePayload(payload) {
    if (!payload) return { empty: true };

    const analysis = {
      size: JSON.stringify(payload).length,
      hasEventsArray: !!payload.events,
      isWrapped: !!payload.events && Array.isArray(payload.events),
    };

    // Check if wrapped or direct structure
    const eventData = payload.events?.[0] || payload;

    analysis.structure = {
      program: eventData.program || 'missing',
      orgUnit: eventData.orgUnit || 'missing',
      programStage: eventData.programStage || 'missing',
      eventDate: eventData.eventDate || 'missing',
      status: eventData.status || 'missing',
      dataValuesCount: eventData.dataValues?.length || 0
    };

    // Extract data elements
    if (eventData.dataValues && Array.isArray(eventData.dataValues)) {
      analysis.dataElements = eventData.dataValues.map(dv => ({
        id: dv.dataElement,
        value: dv.value,
        valueType: typeof dv.value,
        valueLength: String(dv.value || '').length
      }));
    }

    return analysis;
  }

  /**
   * Analyze response structure
   */
  analyzeResponse(response) {
    if (!response) return { empty: true };

    const analysis = {
      status: response.status || response.httpStatus,
      message: response.message,
      hasImportSummaries: !!response.response?.importSummaries,
      hasJobInfo: !!response.response?.id || !!response.id,
    };

    // Check for event ID
    if (response.response?.importSummaries?.[0]) {
      const summary = response.response.importSummaries[0];
      analysis.eventId = summary.reference;
      analysis.summaryStatus = summary.status;
      analysis.importCount = summary.importCount;
    }

    // Check for job ID (tracker endpoints)
    if (response.response?.id || response.id) {
      analysis.jobId = response.response?.id || response.id;
      analysis.jobLocation = response.response?.location || response.location;
    }

    // Check for errors
    if (response.status === 'ERROR' || response.httpStatusCode >= 400) {
      analysis.error = true;
      analysis.errorMessage = response.message;
      analysis.validationErrors = response.response?.importSummaries?.[0]?.conflicts;
    }

    return analysis;
  }

  /**
   * Format headers for readable output
   */
  formatHeaders(headers) {
    if (!headers) return {};

    const formatted = {};
    Object.entries(headers).forEach(([key, value]) => {
      // Mask sensitive headers
      if (key.toLowerCase().includes('authorization') ||
          key.toLowerCase().includes('cookie')) {
        formatted[key] = '[REDACTED]';
      } else {
        formatted[key] = value;
      }
    });

    return formatted;
  }

  /**
   * Compare manual submission with bulk upload
   */
  comparePayloads(manualPayload, bulkPayload) {
    console.group('🔍 PAYLOAD COMPARISON - Manual vs Bulk');

    const manualEvent = manualPayload.events?.[0] || manualPayload;
    const bulkEvent = bulkPayload.events?.[0] || bulkPayload;

    // Compare structure
    console.log('📋 Structure Comparison:');
    console.table({
      'Wrapped in events[]': {
        Manual: !!manualPayload.events,
        Bulk: !!bulkPayload.events,
        Match: (!!manualPayload.events) === (!!bulkPayload.events) ? '✅' : '❌'
      },
      'Program': {
        Manual: manualEvent.program,
        Bulk: bulkEvent.program,
        Match: manualEvent.program === bulkEvent.program ? '✅' : '❌'
      },
      'OrgUnit': {
        Manual: manualEvent.orgUnit,
        Bulk: bulkEvent.orgUnit,
        Match: manualEvent.orgUnit === bulkEvent.orgUnit ? '✅' : '❌'
      },
      'ProgramStage': {
        Manual: manualEvent.programStage,
        Bulk: bulkEvent.programStage,
        Match: manualEvent.programStage === bulkEvent.programStage ? '✅' : '❌'
      },
      'Status': {
        Manual: manualEvent.status,
        Bulk: bulkEvent.status,
        Match: manualEvent.status === bulkEvent.status ? '✅' : '❌'
      },
      'DataValues Count': {
        Manual: manualEvent.dataValues?.length || 0,
        Bulk: bulkEvent.dataValues?.length || 0,
        Match: (manualEvent.dataValues?.length || 0) === (bulkEvent.dataValues?.length || 0) ? '✅' : '❌'
      }
    });

    // Compare data elements
    this.compareDataValues(manualEvent.dataValues, bulkEvent.dataValues);

    // Find missing fields
    this.findMissingFields(manualPayload, bulkPayload);

    console.groupEnd();
  }

  /**
   * Compare dataValues arrays
   */
  compareDataValues(manualDataValues, bulkDataValues) {
    console.log('\n📊 DataValues Comparison:');

    if (!manualDataValues || !bulkDataValues) {
      console.warn('⚠️  One or both dataValues arrays are missing!');
      return;
    }

    // Create maps for easy comparison
    const manualMap = new Map(
      manualDataValues.map(dv => [dv.dataElement, dv.value])
    );
    const bulkMap = new Map(
      bulkDataValues.map(dv => [dv.dataElement, dv.value])
    );

    // Find all unique data elements
    const allDataElements = new Set([
      ...manualMap.keys(),
      ...bulkMap.keys()
    ]);

    const comparison = [];
    allDataElements.forEach(dataElement => {
      const manualValue = manualMap.get(dataElement);
      const bulkValue = bulkMap.get(dataElement);
      const match = manualValue === bulkValue;

      comparison.push({
        DataElement: dataElement,
        'Manual Value': manualValue !== undefined ? manualValue : '[MISSING]',
        'Bulk Value': bulkValue !== undefined ? bulkValue : '[MISSING]',
        Match: match ? '✅' : '❌'
      });
    });

    console.table(comparison);

    // Summary
    const matches = comparison.filter(c => c.Match === '✅').length;
    const mismatches = comparison.filter(c => c.Match === '❌').length;

    console.log(`\n📈 Summary: ${matches} matches, ${mismatches} mismatches`);
  }

  /**
   * Find missing or extra fields
   */
  findMissingFields(manual, bulk) {
    console.log('\n🔍 Field Differences:');

    const manualKeys = this.getAllKeys(manual);
    const bulkKeys = this.getAllKeys(bulk);

    const onlyInManual = manualKeys.filter(k => !bulkKeys.includes(k));
    const onlyInBulk = bulkKeys.filter(k => !manualKeys.includes(k));

    if (onlyInManual.length > 0) {
      console.warn('⚠️  Fields only in MANUAL submission:', onlyInManual);
    }

    if (onlyInBulk.length > 0) {
      console.warn('⚠️  Fields only in BULK upload:', onlyInBulk);
    }

    if (onlyInManual.length === 0 && onlyInBulk.length === 0) {
      console.log('✅ Both payloads have the same fields');
    }
  }

  /**
   * Get all keys recursively from an object
   */
  getAllKeys(obj, prefix = '') {
    let keys = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys = keys.concat(this.getAllKeys(value, fullKey));
      }
    }

    return keys;
  }

  /**
   * Generate a detailed comparison report
   */
  generateComparisonReport() {
    if (this.capturedRequests.length === 0) {
      console.warn('⚠️  No manual requests captured yet. Enable debug mode and submit a manual entry.');
      return;
    }

    if (this.bulkUploadLogs.length === 0) {
      console.warn('⚠️  No bulk uploads logged yet. Start a bulk upload to compare.');
      return;
    }

    // Get the most recent manual request
    const manualRequests = this.capturedRequests.filter(r => r.type === 'request');
    const manualRequest = manualRequests[manualRequests.length - 1];

    // Get the first bulk request
    const bulkRequests = this.bulkUploadLogs.filter(r => r.type === 'request');
    const bulkRequest = bulkRequests[0];

    if (!manualRequest || !bulkRequest) {
      console.warn('⚠️  Missing request data for comparison');
      return;
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 COMPREHENSIVE COMPARISON REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Compare endpoints
    console.log('🔗 Endpoint Comparison:');
    console.log('  Manual:', manualRequest.url);
    console.log('  Bulk:  ', bulkRequest.url);
    console.log('  Match: ', manualRequest.url === bulkRequest.url ? '✅ YES' : '❌ NO');

    // Compare methods
    console.log('\n🔧 Method Comparison:');
    console.log('  Manual:', manualRequest.method);
    console.log('  Bulk:  ', bulkRequest.method);
    console.log('  Match: ', manualRequest.method === bulkRequest.method ? '✅ YES' : '❌ NO');

    // Compare headers
    console.log('\n📋 Headers Comparison:');
    this.compareHeaders(manualRequest.headers, bulkRequest.headers);

    // Compare payloads
    this.comparePayloads(manualRequest.payload, bulkRequest.payload);

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Compare headers
   */
  compareHeaders(manualHeaders, bulkHeaders) {
    const allHeaders = new Set([
      ...Object.keys(manualHeaders || {}),
      ...Object.keys(bulkHeaders || {})
    ]);

    const comparison = {};
    allHeaders.forEach(header => {
      const manualValue = manualHeaders?.[header];
      const bulkValue = bulkHeaders?.[header];

      comparison[header] = {
        Manual: manualValue || '[MISSING]',
        Bulk: bulkValue || '[MISSING]',
        Match: manualValue === bulkValue ? '✅' : '❌'
      };
    });

    console.table(comparison);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.capturedRequests = [];
    this.bulkUploadLogs = [];
    console.log('🧹 All logs cleared');
  }

  /**
   * Get all captured data
   */
  getAllLogs() {
    return {
      manual: this.capturedRequests,
      bulk: this.bulkUploadLogs
    };
  }

  /**
   * Export logs as JSON for analysis
   */
  exportLogs() {
    const logs = this.getAllLogs();
    const json = JSON.stringify(logs, null, 2);

    console.log('📁 Exported Logs (copy this):');
    console.log(json);

    return json;
  }
}

// Export singleton instance
const debugLogger = new DebugLogger();

// Make it globally accessible for debugging
if (typeof window !== 'undefined') {
  window.debugLogger = debugLogger;
}

export default debugLogger;

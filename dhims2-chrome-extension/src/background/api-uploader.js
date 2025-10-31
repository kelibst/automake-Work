/**
 * Batch Upload Engine
 * Handles sequential uploading of records to DHIS2
 * with rate limiting, retry logic, and progress tracking
 */

import debugLogger from '../utils/debug-logger.js';

class BatchUploader {
  constructor(apiConfig, records) {
    this.apiConfig = apiConfig;
    this.records = records;
    this.currentIndex = 0;
    this.isPaused = false;
    this.isCancelled = false;
    this.retryAttempts = 3;
    this.rateLimit = 500; // 500ms between requests = 2 req/sec

    this.results = {
      total: records.length,
      success: 0,
      failed: 0,
      pending: records.length,
      currentRecord: null,
      errors: [],
      successRecords: [],
      failedRecords: []
    };
  }

  /**
   * Start the upload process
   */
  async start() {
    const endpointUrl = this.apiConfig.endpoint?.url || this.apiConfig.endpoint?.baseUrl;
    console.log('🚀 Starting batch upload:', {
      total: this.records.length,
      endpoint: endpointUrl
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 BULK UPLOAD SESSION STARTED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Total Records:', this.records.length);
    console.log('🔗 Endpoint:', endpointUrl);
    console.log('📋 API Config:', {
      program: this.apiConfig.payload_structure?.program,
      orgUnit: this.apiConfig.payload_structure?.orgUnit,
      programStage: this.apiConfig.payload_structure?.programStage
    });
    console.log('═══════════════════════════════════════════════════════════\n');

    for (let i = 0; i < this.records.length; i++) {
      // Check if cancelled
      if (this.isCancelled) {
        console.log('❌ Upload cancelled');
        break;
      }

      // Wait while paused
      while (this.isPaused && !this.isCancelled) {
        await this.sleep(100);
      }

      this.currentIndex = i;
      const record = this.records[i];

      // Update current record
      this.results.currentRecord = {
        index: i + 1,
        rowNumber: record._rowNumber || i + 2,
        total: this.records.length,
        patientName: record.patientName || record.name || null,
        patientNumber: record.patientNumber || record.patientNo || null
      };

      // Upload record with retry logic
      await this.uploadRecordWithRetry(record, i);

      // Update progress
      this.results.pending = this.records.length - (i + 1);
      this.sendProgress();

      // Rate limiting
      if (i < this.records.length - 1) {
        await this.sleep(this.rateLimit);
      }
    }

    // Upload complete
    this.results.currentRecord = null;
    this.sendProgress();
    this.sendComplete();

    console.log('✅ Upload complete:', {
      success: this.results.success,
      failed: this.results.failed
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🏁 BULK UPLOAD SESSION COMPLETED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Final Stats:');
    console.log('  ✅ Successful:', this.results.success);
    console.log('  ❌ Failed:', this.results.failed);
    console.log('  📈 Success Rate:', `${((this.results.success / this.results.total) * 100).toFixed(1)}%`);
    console.log('\n💡 To compare with manual submissions, run:');
    console.log('   debugLogger.generateComparisonReport()');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Upload single record with retry logic
   */
  async uploadRecordWithRetry(record, index) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.uploadRecord(record);

        // Extract event ID or job ID from response
        const eventId = result.response?.importSummaries?.[0]?.reference ||
                       result.response?.uid ||
                       result.uid ||
                       null;

        // Check if this is an async tracker job
        const jobId = result.response?.id || null;
        const jobLocation = result.response?.location || null;

        if (jobId && jobLocation) {
          console.log('⏳ Tracker job created:', {
            jobId,
            location: jobLocation,
            message: result.message
          });

          // For first record, check job status
          if (index === 0) {
            console.log('🔍 Checking job status for first record...');
            try {
              await this.checkJobStatus(jobId, jobLocation);
            } catch (jobError) {
              console.warn('⚠️  Could not check job status:', jobError.message);
              // Don't fail the upload
            }
          }
        } else if (eventId) {
          // Direct event creation (non-tracker endpoint)
          if (index === 0) {
            console.log('🔍 Performing spot verification for first record...');
            try {
              await this.verifyUpload(eventId);
              console.log('✅ Spot verification passed! Upload is working correctly.');
            } catch (verifyError) {
              console.warn('⚠️  Verification failed but upload may still be successful:', verifyError.message);
            }
          }
        }

        // Success
        this.results.success++;
        this.results.successRecords.push({
          index,
          rowNumber: record._rowNumber || index + 2,
          record,
          eventId: eventId
        });

        return;
      } catch (error) {
        lastError = error;

        console.warn(`⚠️  Upload failed (attempt ${attempt}/${this.retryAttempts}):`, {
          row: record._rowNumber || index + 2,
          error: error.message
        });

        // Exponential backoff before retry
        if (attempt < this.retryAttempts) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    // All retries failed
    this.results.failed++;
    this.results.failedRecords.push({
      index,
      rowNumber: record._rowNumber || index + 2,
      record,
      error: lastError.message
    });

    this.results.errors.push({
      rowNumber: record._rowNumber || index + 2,
      message: lastError.message
    });
  }

  /**
   * Upload single record to DHIS2
   */
  async uploadRecord(record) {
    const startTime = performance.now();
    const payload = this.buildPayload(record);
    const endpointUrl = this.apiConfig.endpoint?.url || this.apiConfig.endpoint?.baseUrl;

    // Extract dataValues count depending on payload structure
    let dataValueCount = 0;
    if (payload.events && payload.events[0]) {
      dataValueCount = payload.events[0].dataValues?.length || 0;
    } else if (payload.dataValues) {
      dataValueCount = payload.dataValues.length;
    }

    const headers = {
      'Content-Type': 'application/json',
      ...this.apiConfig.endpoint.headers
    };

    console.log('📤 Uploading record:', {
      rowNumber: record._rowNumber,
      endpoint: endpointUrl,
      payloadSize: JSON.stringify(payload).length,
      dataValueCount: dataValueCount,
      payload: payload // Full payload for debugging
    });

    // Log detailed request info using debug logger
    debugLogger.logRequest('bulk', {
      url: endpointUrl,
      method: 'POST',
      headers: headers,
      payload: payload,
      rowNumber: record._rowNumber,
      recordData: record
    });

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const duration = performance.now() - startTime;

    console.log('📥 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration: `${duration.toFixed(2)}ms`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', {
        status: response.status,
        error: errorText
      });

      // Log failed response
      debugLogger.logResponse('bulk', {
        url: endpointUrl,
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries()),
        duration: duration
      });

      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ Upload response:', {
      rowNumber: record._rowNumber,
      result: result,
      eventId: result.response?.importSummaries?.[0]?.reference || result.id || null
    });

    // Log successful response
    debugLogger.logResponse('bulk', {
      url: endpointUrl,
      status: response.status,
      statusText: response.statusText,
      body: result,
      headers: Object.fromEntries(response.headers.entries()),
      duration: duration
    });

    // Check if DHIS2 reported any errors in response
    if (result.status === 'ERROR' || result.httpStatusCode >= 400) {
      console.error('❌ DHIS2 reported error:', result);
      throw new Error(result.message || 'DHIS2 reported an error');
    }

    // Check for import summaries with errors
    if (result.response?.importSummaries) {
      const summary = result.response.importSummaries[0];
      if (summary?.status === 'ERROR') {
        console.error('❌ Import summary error:', summary);
        throw new Error(summary.description || 'Import failed');
      }
    }

    return result;
  }

  /**
   * Build DHIS2 event payload from record
   */
  buildPayload(record) {
    const dataValues = [];

    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│ 🔨 BUILDING PAYLOAD FOR RECORD                          │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('📋 Record Fields:', Object.keys(record).filter(k => !k.startsWith('_')));
    console.log('📋 Available Field Mappings:', Object.keys(this.apiConfig.fieldMappings || {}));
    console.log('📊 Sample Record Data:', {
      patientNumber: record.patientNumber,
      age: record.age,
      gender: record.gender,
      dateOfAdmission: record.dateOfAdmission
    });

    // Map each field to DHIS2 data element
    Object.entries(this.apiConfig.fieldMappings || {}).forEach(([fieldName, config]) => {
      // Records are already transformed to use field names (e.g., "patientNumber")
      // So access the record by fieldName, not excelColumn
      const value = record[fieldName];

      console.log(`  📋 Mapping field: ${fieldName}`, {
        hasValue: value !== null && value !== undefined && value !== '',
        value: value,
        dataElement: config.dataElement
      });

      if (value !== null && value !== undefined && value !== '') {
        dataValues.push({
          dataElement: config.dataElement,
          value: String(value)
        });
      }
    });

    console.log('\n📊 Field Mapping Results:');
    console.log('  Total dataValues created:', dataValues.length);
    console.log('  Expected fields from config:', Object.keys(this.apiConfig.fieldMappings || {}).length);

    // Show which fields were mapped
    const mappedFields = dataValues.map(dv => {
      const fieldName = Object.entries(this.apiConfig.fieldMappings || {})
        .find(([, config]) => config.dataElement === dv.dataElement)?.[0];
      return {
        field: fieldName || 'unknown',
        dataElement: dv.dataElement,
        value: dv.value,
        valueLength: String(dv.value).length
      };
    });

    console.table(mappedFields);

    // Use diagnosis codes if cleaned
    if (record.principalDiagnosis) {
      const principalDiagConfig = this.apiConfig.fieldMappings?.principalDiagnosis;
      if (principalDiagConfig) {
        dataValues.push({
          dataElement: principalDiagConfig.dataElement,
          value: record.principalDiagnosis
        });
      }
    }

    if (record.additionalDiagnosis) {
      const additionalDiagConfig = this.apiConfig.fieldMappings?.additionalDiagnosis;
      if (additionalDiagConfig) {
        dataValues.push({
          dataElement: additionalDiagConfig.dataElement,
          value: record.additionalDiagnosis
        });
      }
    }

    // Build event
    // occurredAt is automatically set to current date (day of entry)
    const currentDate = new Date().toISOString().split('T')[0];

    const event = {
      program: this.apiConfig.payload_structure?.program,
      orgUnit: this.apiConfig.payload_structure?.orgUnit,
      programStage: this.apiConfig.payload_structure?.programStage,
      occurredAt: currentDate,  // Automatically filled with current date
      status: 'COMPLETED',
      dataValues
    };

    console.log('\n🏗️  Event Structure:');
    console.log('  program:', event.program);
    console.log('  orgUnit:', event.orgUnit);
    console.log('  programStage:', event.programStage);
    console.log('  occurredAt:', event.occurredAt);  // Fixed: was eventDate
    console.log('  status:', event.status);
    console.log('  dataValues count:', event.dataValues.length);

    // Check if we need to wrap in events array or tracker structure
    const endpointUrl = this.apiConfig.endpoint?.url || this.apiConfig.endpoint?.baseUrl || '';
    const isTrackerEndpoint = endpointUrl.includes('/tracker');

    console.log('\n📦 Payload Wrapping:');
    console.log('  Endpoint:', endpointUrl);
    console.log('  Is Tracker Endpoint:', isTrackerEndpoint);
    console.log('  Will wrap in events[]:', isTrackerEndpoint);

    let finalPayload;
    if (isTrackerEndpoint) {
      finalPayload = {
        events: [event]
      };
    } else {
      finalPayload = event;
    }

    console.log('\n✅ Final Payload Structure:');
    console.log('  Keys:', Object.keys(finalPayload));
    console.log('  Payload Size:', JSON.stringify(finalPayload).length, 'bytes');
    console.log('  Full Payload:', finalPayload);
    console.log('└─────────────────────────────────────────────────────────┘\n');

    return finalPayload;
  }

  /**
   * Pause upload
   */
  pause() {
    console.log('⏸️  Upload paused');
    this.isPaused = true;
    this.sendProgress();
  }

  /**
   * Resume upload
   */
  resume() {
    console.log('▶️  Upload resumed');
    this.isPaused = false;
    this.sendProgress();
  }

  /**
   * Cancel upload
   */
  cancel() {
    console.log('🛑 Upload cancelled');
    this.isCancelled = true;
    this.sendProgress();
  }

  /**
   * Send progress update to UI
   */
  sendProgress() {
    chrome.runtime.sendMessage({
      type: 'UPLOAD_PROGRESS',
      data: {
        ...this.results,
        isPaused: this.isPaused,
        isCancelled: this.isCancelled,
        percentage: Math.round((this.results.success + this.results.failed) / this.results.total * 100)
      }
    });
  }

  /**
   * Send completion message
   */
  sendComplete() {
    chrome.runtime.sendMessage({
      type: 'UPLOAD_COMPLETE',
      data: {
        ...this.results,
        completed: true
      }
    });
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      ...this.results,
      isPaused: this.isPaused,
      isCancelled: this.isCancelled,
      currentIndex: this.currentIndex
    };
  }

  /**
   * Check the status of an async tracker job
   * @param {String} jobId - The job ID
   * @param {String} jobLocation - The job status URL
   * @returns {Promise<Object>} The job status
   */
  async checkJobStatus(jobId, jobLocation) {
    console.log('🔍 Polling job status...', jobLocation);

    // Poll up to 10 times with 1 second delay
    for (let i = 0; i < 10; i++) {
      await this.sleep(1000);

      try {
        const response = await fetch(jobLocation, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...this.apiConfig.endpoint.headers
          }
        });

        if (response.ok) {
          const jobStatus = await response.json();

          console.log(`📊 Job status (attempt ${i + 1}/10):`, {
            id: jobStatus.id || jobId,
            status: jobStatus.status,
            completed: jobStatus.completed || false,
            message: jobStatus.message
          });

          // Check if job is complete
          if (jobStatus.completed || jobStatus.status === 'COMPLETED' || jobStatus.status === 'SUCCESS') {
            // Check if job array format
            if (Array.isArray(jobStatus)) {
              const errorEntry = jobStatus.find(entry => entry.level === 'ERROR');
              if (errorEntry) {
                console.error('❌ Job completed with errors:', errorEntry);

                // Try to get detailed error report
                const reportUrl = `${jobLocation}/report?reportMode=ERRORS`;
                console.log('📋 Fetching detailed error report from:', reportUrl);

                try {
                  const reportResponse = await fetch(reportUrl, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      ...this.apiConfig.endpoint.headers
                    }
                  });

                  if (reportResponse.ok) {
                    const errorReport = await reportResponse.json();
                    console.error('📋 Detailed validation errors:', errorReport);

                    // Extract specific validation messages
                    if (errorReport.validationReport) {
                      console.error('⚠️  VALIDATION ERRORS:', errorReport.validationReport);
                    }
                    if (errorReport.bundleReport) {
                      console.error('⚠️  BUNDLE ERRORS:', errorReport.bundleReport);
                    }
                  }
                } catch (reportErr) {
                  console.warn('Could not fetch error report:', reportErr.message);
                }

                throw new Error(`Job completed with errors: ${errorEntry.message}`);
              }

              const successEntry = jobStatus.find(entry => entry.message?.includes('created'));
              if (successEntry) {
                console.log('✅ Job completed successfully!', successEntry);
                return jobStatus;
              }
            }

            console.log('✅ Job completed successfully!', {
              summary: jobStatus.summary || jobStatus,
              eventsCreated: jobStatus.summary?.importCount?.created || 'unknown'
            });

            // Check for errors in job result
            if (jobStatus.summary?.importCount?.ignored > 0 || jobStatus.summary?.importCount?.deleted > 0) {
              console.warn('⚠️  Some events were ignored or deleted:', jobStatus.summary);
            }

            return jobStatus;
          }

          // If still running, continue polling
          if (jobStatus.status === 'RUNNING' || jobStatus.status === 'SCHEDULED') {
            console.log('⏳ Job still processing...');
            continue;
          }

          // If failed
          if (jobStatus.status === 'ERROR' || jobStatus.status === 'FAILED') {
            console.error('❌ Job failed:', jobStatus);
            throw new Error(`Job failed: ${jobStatus.message || 'Unknown error'}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️  Error checking job status (attempt ${i + 1}):`, err.message);
      }
    }

    // Timeout after 10 attempts
    console.warn('⏱️  Job status check timed out after 10 seconds. Job may still be processing.');
    console.log('💡 You can check job status manually at:', jobLocation);
    return null;
  }

  /**
   * Verify uploaded record by fetching it back from DHIS2
   * @param {String} eventId - The event ID returned from upload
   * @returns {Promise<Object>} The fetched event data
   */
  async verifyUpload(eventId) {
    if (!eventId) {
      throw new Error('No event ID provided for verification');
    }

    try {
      const endpointUrl = this.apiConfig.endpoint?.url || this.apiConfig.endpoint?.baseUrl || '';

      // Try different possible endpoint patterns
      const possibleEndpoints = [
        `${endpointUrl}/${eventId}`,
        `${endpointUrl.replace('/events', '')}/events/${eventId}`,
        endpointUrl.includes('/api/')
          ? `${endpointUrl.split('/api/')[0]}/api/events/${eventId}`
          : null
      ].filter(Boolean);

      console.log('🔍 Attempting to verify upload with endpoints:', possibleEndpoints);

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...this.apiConfig.endpoint.headers
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Verification successful! Event found:', {
              eventId,
              endpoint,
              data
            });
            return data;
          }
        } catch (err) {
          console.warn(`⚠️  Failed to verify at ${endpoint}:`, err.message);
        }
      }

      throw new Error('Could not verify upload - event not found at any endpoint');
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }
}

export default BatchUploader;

/**
 * Batch Upload Engine
 * Handles sequential uploading of records to DHIS2
 * with rate limiting, retry logic, and progress tracking
 */

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
    console.log('🚀 Starting batch upload:', {
      total: this.records.length,
      endpoint: this.apiConfig.endpoint?.url
    });

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
  }

  /**
   * Upload single record with retry logic
   */
  async uploadRecordWithRetry(record, index) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.uploadRecord(record);

        // Success
        this.results.success++;
        this.results.successRecords.push({
          index,
          rowNumber: record._rowNumber || index + 2,
          record
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
    const payload = this.buildPayload(record);

    const response = await fetch(this.apiConfig.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.apiConfig.endpoint.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Check if DHIS2 reported any errors in response
    if (result.status === 'ERROR' || result.httpStatusCode >= 400) {
      throw new Error(result.message || 'DHIS2 reported an error');
    }

    return result;
  }

  /**
   * Build DHIS2 event payload from record
   */
  buildPayload(record) {
    const dataValues = [];

    // Map each field to DHIS2 data element
    Object.entries(this.apiConfig.fieldMappings || {}).forEach(([fieldName, config]) => {
      const value = record[fieldName];

      if (value !== null && value !== undefined && value !== '') {
        dataValues.push({
          dataElement: config.dataElement,
          value: String(value)
        });
      }
    });

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
    const event = {
      program: this.apiConfig.payload_structure?.program,
      orgUnit: this.apiConfig.payload_structure?.orgUnit,
      programStage: this.apiConfig.payload_structure?.programStage,
      eventDate: record.dateOfAdmission || new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      dataValues
    };

    // Check if we need to wrap in events array or tracker structure
    if (this.apiConfig.endpoint.url.includes('/tracker')) {
      return {
        events: [event]
      };
    } else {
      return event;
    }
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
}

export default BatchUploader;

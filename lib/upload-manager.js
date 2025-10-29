const axios = require('axios');

/**
 * Upload Manager Module
 * Handles batch uploading to DHIS2 with retry logic and progress tracking
 */
class UploadManager {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'https://events.chimgh.org/events';
    this.endpoint = config.endpoint || '/api/41/tracker?async=false';
    this.batchSize = config.batchSize || 10;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
    this.batchDelay = config.batchDelay || 2000; // 2 seconds between batches
    this.sessionId = config.sessionId || null;

    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      batches: [],
      errors: []
    };

    this.progressCallback = null;
  }

  /**
   * Set session ID for authentication
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Set progress callback function
   * @param {Function} callback - Called with progress updates
   */
  onProgress(callback) {
    this.progressCallback = callback;
  }

  /**
   * Report progress
   */
  reportProgress(update) {
    if (this.progressCallback) {
      this.progressCallback(update);
    }
  }

  /**
   * Create batches from records
   * @param {Array} records - Array of cleaned records
   * @returns {Array} Array of batches
   */
  createBatches(records) {
    const batches = [];
    for (let i = 0; i < records.length; i += this.batchSize) {
      batches.push(records.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * Upload single batch with retry logic
   * @param {Array} batch - Batch of events
   * @param {number} batchNumber - Batch number for tracking
   * @returns {Object} Batch result
   */
  async uploadBatch(batch, batchNumber) {
    const payload = { events: batch };
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.reportProgress({
          type: 'batch_attempt',
          batchNumber,
          attempt,
          maxRetries: this.maxRetries,
          recordCount: batch.length
        });

        const response = await axios.post(
          `${this.baseUrl}${this.endpoint}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Cookie': this.sessionId ? `JSESSIONID=${this.sessionId}` : ''
            },
            timeout: 30000 // 30 second timeout
          }
        );

        // Success
        this.reportProgress({
          type: 'batch_success',
          batchNumber,
          attempt,
          recordCount: batch.length,
          response: response.data
        });

        return {
          success: true,
          batchNumber,
          attempts: attempt,
          recordCount: batch.length,
          response: response.data
        };

      } catch (error) {
        lastError = error;

        this.reportProgress({
          type: 'batch_error',
          batchNumber,
          attempt,
          error: error.message,
          willRetry: attempt < this.maxRetries
        });

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    return {
      success: false,
      batchNumber,
      attempts: this.maxRetries,
      recordCount: batch.length,
      error: lastError?.message || 'Unknown error',
      errorDetails: this.extractErrorDetails(lastError)
    };
  }

  /**
   * Extract error details from axios error
   */
  extractErrorDetails(error) {
    if (!error) return null;

    return {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    };
  }

  /**
   * Upload all records in batches
   * @param {Array} events - Array of DHIS2 event objects
   * @returns {Object} Upload results
   */
  async uploadAll(events) {
    this.results = {
      total: events.length,
      successful: 0,
      failed: 0,
      batches: [],
      errors: [],
      startTime: new Date().toISOString()
    };

    const batches = this.createBatches(events);

    this.reportProgress({
      type: 'upload_start',
      totalRecords: events.length,
      totalBatches: batches.length,
      batchSize: this.batchSize
    });

    for (let i = 0; i < batches.length; i++) {
      const batchNumber = i + 1;
      const batch = batches[i];

      this.reportProgress({
        type: 'batch_start',
        batchNumber,
        totalBatches: batches.length,
        recordCount: batch.length
      });

      const result = await this.uploadBatch(batch, batchNumber);

      // Update results
      if (result.success) {
        this.results.successful += result.recordCount;
      } else {
        this.results.failed += result.recordCount;
        this.results.errors.push({
          batchNumber,
          records: batch,
          error: result.error,
          errorDetails: result.errorDetails
        });
      }

      this.results.batches.push(result);

      // Delay between batches (except for last batch)
      if (i < batches.length - 1) {
        this.reportProgress({
          type: 'batch_delay',
          delayMs: this.batchDelay
        });
        await this.delay(this.batchDelay);
      }
    }

    this.results.endTime = new Date().toISOString();
    this.results.duration = this.calculateDuration(this.results.startTime, this.results.endTime);

    this.reportProgress({
      type: 'upload_complete',
      results: this.results
    });

    return this.results;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate duration in seconds
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return ((end - start) / 1000).toFixed(2) + 's';
  }

  /**
   * Generate upload report
   * @returns {string} Formatted report
   */
  generateReport() {
    const { total, successful, failed, batches, errors, startTime, endTime, duration } = this.results;

    let report = '='.repeat(60) + '\n';
    report += 'DHIS2 UPLOAD - RESULTS REPORT\n';
    report += '='.repeat(60) + '\n\n';

    // Summary
    report += 'SUMMARY:\n';
    report += `  Total Records: ${total}\n`;
    report += `  ✅ Successful: ${successful}\n`;
    report += `  ❌ Failed: ${failed}\n`;
    report += `  Success Rate: ${((successful / total) * 100).toFixed(1)}%\n`;
    report += `  Duration: ${duration}\n`;
    report += `  Started: ${new Date(startTime).toLocaleString()}\n`;
    report += `  Finished: ${new Date(endTime).toLocaleString()}\n\n`;

    // Batch details
    report += 'BATCH DETAILS:\n';
    report += '-'.repeat(60) + '\n';
    batches.forEach(batch => {
      const status = batch.success ? '✅' : '❌';
      report += `  ${status} Batch ${batch.batchNumber}: ${batch.recordCount} records`;
      report += ` (${batch.attempts} attempt${batch.attempts > 1 ? 's' : ''})\n`;
    });
    report += '\n';

    // Errors
    if (errors.length > 0) {
      report += '❌ ERRORS:\n';
      report += '-'.repeat(60) + '\n';
      errors.forEach(error => {
        report += `\nBatch ${error.batchNumber} (${error.records.length} records):\n`;
        report += `  Error: ${error.error}\n`;
        if (error.errorDetails) {
          report += `  Status: ${error.errorDetails.status} ${error.errorDetails.statusText}\n`;
          if (error.errorDetails.data) {
            report += `  Details: ${JSON.stringify(error.errorDetails.data, null, 2)}\n`;
          }
        }
        report += '\n  Failed Records:\n';
        error.records.forEach(record => {
          const patientNumber = record.dataValues.find(dv => dv.dataElement === 'h0Ef6ykTpNB')?.value || 'Unknown';
          report += `    • Patient: ${patientNumber}\n`;
        });
      });
      report += '\n';
    }

    // Conclusion
    report += '='.repeat(60) + '\n';
    if (failed === 0) {
      report += '✅ ALL RECORDS UPLOADED SUCCESSFULLY!\n';
    } else {
      report += `⚠️  ${failed} RECORDS FAILED TO UPLOAD\n`;
      report += 'Please review errors above and try re-uploading failed records.\n';
    }
    report += '='.repeat(60) + '\n';

    return report;
  }

  /**
   * Export failed records for re-upload
   * @param {string} outputPath - Path to save failed records
   */
  exportFailedRecords(outputPath) {
    const fs = require('fs');

    const failedRecords = {
      total: this.results.failed,
      errors: this.results.errors,
      exportedAt: new Date().toISOString()
    };

    fs.writeFileSync(outputPath, JSON.stringify(failedRecords, null, 2));

    return {
      success: true,
      outputPath,
      recordCount: this.results.failed
    };
  }

  /**
   * Get results summary
   */
  getResults() {
    return this.results;
  }

  /**
   * Reset results
   */
  reset() {
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      batches: [],
      errors: []
    };
  }
}

module.exports = UploadManager;

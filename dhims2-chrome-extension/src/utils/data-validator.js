/**
 * Data Validator - Validates records before upload
 * Checks for required fields, data types, and format issues
 * Integrated with fuzzy diagnosis matching
 */

import DataCleaner from './data-cleaner.js';
import { RecommendationEngine } from './recommendations.js';

class DataValidator {
  /**
   * Validate a single record
   * @param {Object} record - Excel record
   * @param {Object} mapping - Column mapping configuration
   * @param {Number} rowNumber - Row number in Excel
   * @returns {Object} Validation result
   */
  static validateRecord(record, mapping, rowNumber) {
    const errors = [];
    const warnings = [];

    // Check if record has any data
    const hasData = Object.values(record).some(val =>
      val !== null && val !== undefined && val !== ''
    );

    if (!hasData) {
      errors.push({
        field: 'record',
        excelColumn: '',
        value: '',
        message: 'Record is completely empty',
        recommendation: {
          note: 'This row has no data. Please fill in at least the required fields or remove the empty row.'
        }
      });
      return { valid: false, errors, warnings };
    }

    // Validate each mapped field
    Object.entries(mapping.mapping).forEach(([excelColumn, dhimsFieldName]) => {
      const value = record[excelColumn];
      const fieldConfig = mapping.mapping[excelColumn];

      // Check required fields
      if (fieldConfig?.required && (value === null || value === undefined || value === '')) {
        const errorMsg = `Missing required field "${excelColumn}"`;
        const recommendation = RecommendationEngine.getRecommendation(dhimsFieldName, value, errorMsg);

        errors.push({
          field: dhimsFieldName,
          excelColumn,
          value,
          message: errorMsg,
          recommendation
        });
      }

      // Special validation for patient number (exists + min 6 chars)
      if (dhimsFieldName === 'patientNumber' && value !== null && value !== undefined && value !== '') {
        const strValue = String(value).trim();
        if (strValue.length < 6) {
          const errorMsg = `Patient number must be at least 6 characters, got: "${strValue}" (${strValue.length} chars)`;
          const recommendation = {
            note: 'Patient numbers come from the system and should be at least 6 characters long',
            pattern: 'At least 6 characters',
            examples: ['VR-A01-AAG1234', 'PAT-123456', 'ABCDEF']
          };

          errors.push({
            field: dhimsFieldName,
            excelColumn,
            value: strValue,
            message: errorMsg,
            recommendation
          });
        }
      }

      // Validate field type
      if (value !== null && value !== undefined && value !== '') {
        const typeValidation = this.validateFieldType(value, fieldConfig?.type || 'text', dhimsFieldName, excelColumn, rowNumber);
        errors.push(...typeValidation.errors);
        warnings.push(...typeValidation.warnings);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate field type
   * @param {*} value - Field value
   * @param {String} type - Expected type
   * @param {String} dhimsFieldName - DHIMS field name
   * @param {String} excelColumn - Excel column name
   * @param {Number} rowNumber - Row number
   * @returns {Object} Validation result
   */
  static validateFieldType(value, type, dhimsFieldName, excelColumn, rowNumber) {
    const errors = [];
    const warnings = [];
    const strValue = String(value).trim();

    switch (type) {
      case 'date':
        if (!this.isValidDate(strValue)) {
          const errorMsg = `Invalid date format: "${strValue}"`;
          const recommendation = RecommendationEngine.getRecommendation(dhimsFieldName, value, errorMsg);

          errors.push({
            field: dhimsFieldName,
            excelColumn,
            value: strValue,
            message: errorMsg,
            recommendation
          });
        }
        break;

      case 'number':
        if (isNaN(parseFloat(strValue))) {
          const errorMsg = `Should be a number, got: "${strValue}"`;
          const recommendation = RecommendationEngine.getRecommendation(dhimsFieldName, value, errorMsg);

          errors.push({
            field: dhimsFieldName,
            excelColumn,
            value: strValue,
            message: errorMsg,
            recommendation
          });
        }
        break;

      case 'boolean':
        const validBooleans = ['yes', 'no', 'true', 'false', '1', '0'];
        if (!validBooleans.includes(strValue.toLowerCase())) {
          warnings.push(`Row ${rowNumber}: "${excelColumn}" should be yes/no, got: "${strValue}"`);
        }
        break;

      case 'text':
        if (strValue.length > 1000) {
          warnings.push(`Row ${rowNumber}: "${excelColumn}" is very long (${strValue.length} characters)`);
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Check if string is a valid date
   * @param {String} dateString - Date string to validate
   * @returns {Boolean} True if valid date
   */
  static isValidDate(dateString) {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) && dateString.length >= 8;
    } catch (e) {
      return false;
    }
  }

  /**
   * Validate entire dataset
   * @param {Array} records - All records to validate
   * @param {Object} mapping - Column mapping
   * @returns {Object} Validation summary
   */
  static validateDataset(records, mapping) {
    const allErrors = [];
    const allWarnings = [];
    const validRecords = [];
    const invalidRecords = [];

    records.forEach((record, index) => {
      const rowNumber = record._rowNumber || index + 2; // Excel row number
      const validation = this.validateRecord(record, mapping, rowNumber);

      if (validation.valid) {
        validRecords.push({
          record,
          rowNumber,
          warnings: validation.warnings
        });
      } else {
        invalidRecords.push({
          record,
          rowNumber,
          errors: validation.errors
        });
      }

      allErrors.push(...validation.errors);
      allWarnings.push(...validation.warnings);
    });

    return {
      totalRecords: records.length,
      validRecords: validRecords.length,
      invalidRecords: invalidRecords.length,
      errors: allErrors,
      warnings: allWarnings,
      validRecordsList: validRecords,
      invalidRecordsList: invalidRecords,
      canProceed: invalidRecords.length === 0
    };
  }

  /**
   * Validate dataset with fuzzy diagnosis matching
   * @param {Array} records - All records to validate
   * @param {Object} mapping - Column mapping
   * @param {Object} fieldMapper - Field mapper instance
   * @returns {Promise<Object>} Validation summary with suggestions
   */
  static async validateWithFuzzyMatching(records, mapping, fieldMapper) {
    // First run standard validation
    const standardValidation = this.validateDataset(records, mapping);

    // Then apply fuzzy matching for diagnosis codes
    const cleaner = new DataCleaner();
    const cleanResults = await cleaner.cleanAll(records, fieldMapper);

    // Merge results
    const validRecords = [];
    const invalidRecords = [];
    const allErrors = [];
    const allWarnings = [];
    const suggestions = cleanResults.suggestions || [];

    // Process each record
    records.forEach((record, index) => {
      const rowNumber = record._rowNumber || index + 2;

      // Check if record passed standard validation
      const standardValid = standardValidation.validRecordsList.find(
        v => v.rowNumber === rowNumber
      );

      // Check if record passed fuzzy matching (diagnosis validation)
      const cleanRecord = cleanResults.success.find(
        r => r._rowNumber === rowNumber
      );

      const failedRecord = cleanResults.failed.find(
        r => r.rowNumber === rowNumber
      );

      if (standardValid && cleanRecord) {
        // Record is fully valid
        validRecords.push({
          record: { ...record, ...cleanRecord },
          rowNumber,
          warnings: standardValid.warnings
        });
      } else {
        // Record has errors
        const errors = [];

        if (!standardValid) {
          const stdInvalid = standardValidation.invalidRecordsList.find(
            r => r.rowNumber === rowNumber
          );
          if (stdInvalid) {
            errors.push(...stdInvalid.errors);
          }
        }

        if (failedRecord) {
          failedRecord.errors.forEach(err => {
            // Keep structured error format
            errors.push({
              field: err.field || 'Unknown Field',
              excelColumn: err.excelColumn || '',
              value: err.value || '',
              message: err.message || 'Unknown error',
              recommendation: err.recommendation || null
            });
          });
        }

        invalidRecords.push({
          record,
          rowNumber,
          errors
        });

        allErrors.push(...errors);
      }
    });

    return {
      totalRecords: records.length,
      validRecords: validRecords.length,
      invalidRecords: invalidRecords.length,
      errors: allErrors,
      warnings: allWarnings,
      validRecordsList: validRecords,
      invalidRecordsList: invalidRecords,
      suggestions,
      canProceed: invalidRecords.length === 0,
      fuzzyMatchingEnabled: true
    };
  }

  /**
   * Check for duplicate records
   * @param {Array} records - All records
   * @param {String} uniqueField - Field to check for uniqueness
   * @returns {Object} Duplicate check result
   */
  static checkDuplicates(records, uniqueField = 'patient_no') {
    const seen = new Map();
    const duplicates = [];

    records.forEach((record, index) => {
      const value = record[uniqueField];

      if (value && value !== '') {
        if (seen.has(value)) {
          duplicates.push({
            value,
            rows: [seen.get(value), record._rowNumber || index + 2]
          });
        } else {
          seen.set(value, record._rowNumber || index + 2);
        }
      }
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
      uniqueCount: seen.size
    };
  }

  /**
   * Generate validation summary report
   * @param {Object} validation - Validation result
   * @returns {String} Human-readable summary
   */
  static generateSummary(validation) {
    const lines = [];

    lines.push(`📊 Validation Summary`);
    lines.push(`Total Records: ${validation.totalRecords}`);
    lines.push(`✅ Valid: ${validation.validRecords}`);
    lines.push(`❌ Invalid: ${validation.invalidRecords}`);

    if (validation.errors.length > 0) {
      lines.push(``);
      lines.push(`❌ Errors (${validation.errors.length}):`);
      validation.errors.slice(0, 10).forEach(err => lines.push(`  • ${err}`));
      if (validation.errors.length > 10) {
        lines.push(`  ... and ${validation.errors.length - 10} more errors`);
      }
    }

    if (validation.warnings.length > 0) {
      lines.push(``);
      lines.push(`⚠️  Warnings (${validation.warnings.length}):`);
      validation.warnings.slice(0, 10).forEach(warn => lines.push(`  • ${warn}`));
      if (validation.warnings.length > 10) {
        lines.push(`  ... and ${validation.warnings.length - 10} more warnings`);
      }
    }

    if (validation.canProceed) {
      lines.push(``);
      lines.push(`✅ All records are valid. Ready to upload!`);
    } else {
      lines.push(``);
      lines.push(`❌ Please fix errors before uploading.`);
    }

    return lines.join('\n');
  }
}

export default DataValidator;

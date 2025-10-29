/**
 * Validator Module
 * Validates cleaned data before DHIS2 upload
 */

class Validator {
  constructor(fieldMapper) {
    this.fieldMapper = fieldMapper;
    this.validationRules = this.initializeRules();
  }

  /**
   * Initialize validation rules
   */
  initializeRules() {
    return {
      // Cross-field validations
      dateRange: {
        name: 'Discharge date must be after admission date',
        validate: (data) => {
          const admission = new Date(data.dateOfAdmission);
          const discharge = new Date(data.dateOfDischarge);
          return discharge >= admission;
        },
        message: (data) => `Discharge date (${data.dateOfDischarge}) cannot be before admission date (${data.dateOfAdmission})`
      },

      // Age validations
      ageRealistic: {
        name: 'Age must be realistic',
        validate: (data) => {
          const ageNum = parseInt(data.ageNumber);
          if (data.ageUnit === 'years') {
            return ageNum >= 0 && ageNum <= 150;
          }
          if (data.ageUnit === 'months') {
            return ageNum >= 0 && ageNum <= 1800; // 150 years
          }
          if (data.ageUnit === 'days') {
            return ageNum >= 0 && ageNum <= 54750; // 150 years
          }
          return true;
        },
        message: (data) => `Age ${data.ageNumber} ${data.ageUnit} is not realistic`
      },

      // Cost validation
      costValid: {
        name: 'Cost must be non-negative if provided',
        validate: (data) => {
          if (!data.cost) return true; // Optional field
          const cost = parseFloat(data.cost);
          return !isNaN(cost) && cost >= 0;
        },
        message: (data) => `Cost ${data.cost} is invalid`
      }
    };
  }

  /**
   * Validate a single record
   * @param {Object} cleanedData - Cleaned data object
   * @returns {Object} Validation result
   */
  validateRecord(cleanedData) {
    const errors = [];
    const warnings = [];

    // 1. Check required fields
    const requiredCheck = this.fieldMapper.validateRequiredFields(cleanedData);
    if (!requiredCheck.valid) {
      requiredCheck.missingFields.forEach(field => {
        errors.push({
          type: 'missing_required',
          field: field.fieldName,
          excelColumn: field.excelColumn,
          message: `Required field missing: ${field.excelColumn}`
        });
      });
    }

    // 2. Run cross-field validations
    Object.keys(this.validationRules).forEach(ruleName => {
      const rule = this.validationRules[ruleName];
      try {
        if (!rule.validate(cleanedData)) {
          warnings.push({
            type: 'validation_rule',
            rule: ruleName,
            message: rule.message(cleanedData)
          });
        }
      } catch (error) {
        // Skip validation if data is incomplete
      }
    });

    // 3. Validate data types
    const typeErrors = this.validateDataTypes(cleanedData);
    errors.push(...typeErrors);

    return {
      valid: errors.length === 0,
      hasWarnings: warnings.length > 0,
      errors,
      warnings,
      rowNumber: cleanedData._rowNumber
    };
  }

  /**
   * Validate data types match expected types
   */
  validateDataTypes(cleanedData) {
    const errors = [];

    // Age number must be numeric
    if (cleanedData.ageNumber && isNaN(cleanedData.ageNumber)) {
      errors.push({
        type: 'invalid_type',
        field: 'ageNumber',
        message: `Age number must be numeric: ${cleanedData.ageNumber}`
      });
    }

    // Cost must be numeric if present
    if (cleanedData.cost && cleanedData.cost !== null && isNaN(parseFloat(cleanedData.cost))) {
      errors.push({
        type: 'invalid_type',
        field: 'cost',
        message: `Cost must be numeric: ${cleanedData.cost}`
      });
    }

    // Dates must be valid ISO format
    ['dateOfAdmission', 'dateOfDischarge'].forEach(field => {
      if (cleanedData[field]) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(cleanedData[field])) {
          errors.push({
            type: 'invalid_format',
            field,
            message: `Invalid date format: ${cleanedData[field]}. Expected YYYY-MM-DD`
          });
        }
      }
    });

    // Booleans must be "true" or "false" strings
    ['surgicalProcedure', 'nhisStatus'].forEach(field => {
      if (cleanedData[field] && cleanedData[field] !== 'true' && cleanedData[field] !== 'false') {
        errors.push({
          type: 'invalid_type',
          field,
          message: `Boolean field must be "true" or "false": ${cleanedData[field]}`
        });
      }
    });

    return errors;
  }

  /**
   * Validate multiple records
   * @param {Array} cleanedRecords - Array of cleaned data objects
   * @returns {Object} Validation summary
   */
  validateAll(cleanedRecords) {
    const results = {
      valid: [],
      invalid: [],
      warnings: [],
      duplicates: []
    };

    // Validate each record
    cleanedRecords.forEach((record, index) => {
      const validation = this.validateRecord(record);

      if (validation.valid) {
        results.valid.push({
          index,
          rowNumber: record._rowNumber,
          record
        });
      } else {
        results.invalid.push({
          index,
          rowNumber: record._rowNumber,
          record,
          errors: validation.errors
        });
      }

      if (validation.hasWarnings) {
        results.warnings.push({
          index,
          rowNumber: record._rowNumber,
          warnings: validation.warnings
        });
      }
    });

    // Check for duplicates
    results.duplicates = this.findDuplicates(cleanedRecords);

    return {
      summary: {
        total: cleanedRecords.length,
        valid: results.valid.length,
        invalid: results.invalid.length,
        warnings: results.warnings.length,
        duplicates: results.duplicates.length
      },
      results
    };
  }

  /**
   * Find duplicate patient numbers
   * @param {Array} records - Array of cleaned data objects
   * @returns {Array} Array of duplicate groups
   */
  findDuplicates(records) {
    const patientNumbers = {};
    const duplicates = [];

    records.forEach((record, index) => {
      const patientNumber = record.patientNumber;
      if (!patientNumber) return;

      if (!patientNumbers[patientNumber]) {
        patientNumbers[patientNumber] = [];
      }

      patientNumbers[patientNumber].push({
        index,
        rowNumber: record._rowNumber,
        record
      });
    });

    // Find groups with more than one record
    Object.keys(patientNumbers).forEach(patientNumber => {
      const group = patientNumbers[patientNumber];
      if (group.length > 1) {
        duplicates.push({
          patientNumber,
          count: group.length,
          records: group
        });
      }
    });

    return duplicates;
  }

  /**
   * Generate validation report
   * @param {Object} validationResults - Results from validateAll()
   * @returns {string} Formatted report
   */
  generateReport(validationResults) {
    const { summary, results } = validationResults;

    let report = '='.repeat(60) + '\n';
    report += 'DHIS2 UPLOAD - VALIDATION REPORT\n';
    report += '='.repeat(60) + '\n\n';

    // Summary
    report += 'SUMMARY:\n';
    report += `  Total Records: ${summary.total}\n`;
    report += `  ✅ Valid: ${summary.valid}\n`;
    report += `  ❌ Invalid: ${summary.invalid}\n`;
    report += `  ⚠️  Warnings: ${summary.warnings}\n`;
    report += `  🔄 Duplicates: ${summary.duplicates}\n\n`;

    // Invalid records
    if (results.invalid.length > 0) {
      report += '❌ INVALID RECORDS:\n';
      report += '-'.repeat(60) + '\n';
      results.invalid.forEach(item => {
        report += `\nRow ${item.rowNumber}: Patient ${item.record.patientNumber || 'Unknown'}\n`;
        item.errors.forEach(error => {
          report += `  • ${error.message}\n`;
        });
      });
      report += '\n';
    }

    // Warnings
    if (results.warnings.length > 0) {
      report += '⚠️  WARNINGS:\n';
      report += '-'.repeat(60) + '\n';
      results.warnings.forEach(item => {
        report += `\nRow ${item.rowNumber}: Patient ${item.record?.patientNumber || 'Unknown'}\n`;
        item.warnings.forEach(warning => {
          report += `  • ${warning.message}\n`;
        });
      });
      report += '\n';
    }

    // Info messages
    if (results.info && results.info.length > 0) {
      report += 'ℹ️  INFORMATION:\n';
      report += '-'.repeat(60) + '\n';
      results.info.forEach(item => {
        report += `\nRow ${item.rowNumber}: Patient ${item.record?.patientNumber || 'Unknown'}\n`;
        item.messages.forEach(msg => {
          report += `  • ${msg.message}\n`;
        });
      });
      report += '\n';
    }

    // Suggestions (Auto-fixed codes)
    if (results.suggestions && results.suggestions.length > 0) {
      report += '✅ AUTO-FIXED DIAGNOSIS CODES:\n';
      report += '-'.repeat(60) + '\n';
      report += 'The following diagnosis codes were automatically matched to similar codes in DHIS2.\n';
      report += 'Please review these changes to ensure they are correct.\n\n';
      results.suggestions.forEach(item => {
        const confidencePercent = Math.round(item.confidence * 100);
        report += `Row ${item.rowNumber}: ${item.field}\n`;
        report += `  Original:  ${item.original}\n`;
        report += `  Using:     ${item.suggested} (${confidencePercent}% match)\n`;
        if (item.alternatives && item.alternatives.length > 0) {
          report += `  Other options:\n`;
          item.alternatives.forEach(alt => {
            report += `    - ${alt.code}: ${alt.name} (${Math.round(alt.similarity * 100)}% match)\n`;
          });
        }
        report += '\n';
      });
    }

    // Duplicates
    if (results.duplicates.length > 0) {
      report += '🔄 DUPLICATE PATIENT NUMBERS:\n';
      report += '-'.repeat(60) + '\n';
      results.duplicates.forEach(dup => {
        report += `\nPatient No: ${dup.patientNumber} (appears ${dup.count} times)\n`;
        dup.records.forEach(rec => {
          report += `  • Row ${rec.rowNumber}\n`;
        });
      });
      report += '\n';
    }

    // Conclusion
    report += '='.repeat(60) + '\n';
    if (summary.invalid === 0) {
      report += '✅ ALL RECORDS ARE VALID - READY TO UPLOAD\n';
    } else {
      report += `❌ ${summary.invalid} INVALID RECORDS - FIX ERRORS BEFORE UPLOAD\n`;
    }
    report += '='.repeat(60) + '\n';

    return report;
  }

  /**
   * Get records ready for upload (valid only)
   * @param {Object} validationResults - Results from validateAll()
   * @returns {Array} Array of valid records ready for upload
   */
  getValidRecords(validationResults) {
    return validationResults.results.valid.map(item => item.record);
  }

  /**
   * Export validation results to JSON
   * @param {Object} validationResults - Results from validateAll()
   * @param {string} outputPath - Path to save JSON file
   */
  exportResults(validationResults, outputPath) {
    const fs = require('fs');
    fs.writeFileSync(outputPath, JSON.stringify(validationResults, null, 2));
    return {
      success: true,
      outputPath,
      summary: validationResults.summary
    };
  }
}

module.exports = Validator;

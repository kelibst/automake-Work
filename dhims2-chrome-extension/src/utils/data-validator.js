/**
 * Data Validator - Validates records before upload
 * Checks for required fields, data types, and format issues
 */

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
      errors.push(`Row ${rowNumber}: Record is completely empty`);
      return { valid: false, errors, warnings };
    }

    // Validate each mapped field
    Object.entries(mapping.mapping).forEach(([excelColumn, config]) => {
      const value = record[excelColumn];

      // Check required fields
      if (config.required && (value === null || value === undefined || value === '')) {
        errors.push(`Row ${rowNumber}: Missing required field "${excelColumn}"`);
      }

      // Validate field type
      if (value !== null && value !== undefined && value !== '') {
        const typeValidation = this.validateFieldType(value, config.type, excelColumn, rowNumber);
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
   * @param {String} fieldName - Field name for error messages
   * @param {Number} rowNumber - Row number
   * @returns {Object} Validation result
   */
  static validateFieldType(value, type, fieldName, rowNumber) {
    const errors = [];
    const warnings = [];
    const strValue = String(value).trim();

    switch (type) {
      case 'date':
        if (!this.isValidDate(strValue)) {
          errors.push(`Row ${rowNumber}: "${fieldName}" has invalid date format: "${strValue}"`);
        }
        break;

      case 'number':
        if (isNaN(parseFloat(strValue))) {
          errors.push(`Row ${rowNumber}: "${fieldName}" should be a number, got: "${strValue}"`);
        }
        break;

      case 'boolean':
        const validBooleans = ['yes', 'no', 'true', 'false', '1', '0'];
        if (!validBooleans.includes(strValue.toLowerCase())) {
          warnings.push(`Row ${rowNumber}: "${fieldName}" should be yes/no, got: "${strValue}"`);
        }
        break;

      case 'text':
        if (strValue.length > 1000) {
          warnings.push(`Row ${rowNumber}: "${fieldName}" is very long (${strValue.length} characters)`);
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

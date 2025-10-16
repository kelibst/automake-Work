/**
 * Excel Parser - Reads and parses patient data from Excel files
 * Uses SheetJS (xlsx) library to parse .xlsx files
 */

import * as XLSX from 'xlsx';

class ExcelParser {
  /**
   * Parse Excel file and return structured data
   * @param {File} file - Excel file from input
   * @returns {Promise<Object>} Parsed data with headers and rows
   */
  static async parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Return as array of arrays
            defval: '', // Default value for empty cells
            blankrows: false // Skip blank rows
          });

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // First row is headers
          const headers = jsonData[0];
          const rows = jsonData.slice(1);

          // Convert to array of objects
          const records = rows.map((row, index) => {
            const record = { _rowNumber: index + 2 }; // Excel row number (1-based + header)
            headers.forEach((header, colIndex) => {
              record[header] = row[colIndex] || '';
            });
            return record;
          });

          resolve({
            fileName: file.name,
            sheetName: firstSheetName,
            headers,
            records,
            totalRecords: records.length
          });
        } catch (error) {
          reject(new Error(`Failed to parse Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Validate Excel file format
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  static validateFile(file) {
    const errors = [];
    const warnings = [];

    // Check file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      errors.push(`Invalid file type. Expected .xlsx or .xls, got ${fileExtension}`);
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push(`File too large. Maximum size is 10MB, file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check file size (warn if too small)
    if (file.size < 100) {
      warnings.push('File seems too small. Make sure it contains data.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get sample data from first N records
   * @param {Array} records - All records
   * @param {Number} count - Number of samples
   * @returns {Array} Sample records
   */
  static getSampleRecords(records, count = 3) {
    return records.slice(0, Math.min(count, records.length));
  }

  /**
   * Detect column types from sample data
   * @param {Array} records - Sample records
   * @param {Array} headers - Column headers
   * @returns {Object} Column type map
   */
  static detectColumnTypes(records, headers) {
    const types = {};

    headers.forEach(header => {
      const values = records.map(r => r[header]).filter(v => v !== '');

      if (values.length === 0) {
        types[header] = 'empty';
        return;
      }

      // Check if all values are numbers
      const allNumbers = values.every(v => !isNaN(v) && !isNaN(parseFloat(v)));
      if (allNumbers) {
        types[header] = 'number';
        return;
      }

      // Check if values look like dates
      const datePattern = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$|^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
      const allDates = values.every(v => datePattern.test(String(v)));
      if (allDates) {
        types[header] = 'date';
        return;
      }

      // Check if values are boolean-like
      const booleanValues = ['yes', 'no', 'true', 'false', '1', '0'];
      const allBoolean = values.every(v =>
        booleanValues.includes(String(v).toLowerCase())
      );
      if (allBoolean) {
        types[header] = 'boolean';
        return;
      }

      types[header] = 'text';
    });

    return types;
  }

  /**
   * Clean and normalize cell values
   * @param {String} value - Cell value
   * @param {String} type - Expected type
   * @returns {String} Cleaned value
   */
  static cleanValue(value, type = 'text') {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const strValue = String(value).trim();

    switch (type) {
      case 'date':
        // Try to parse and format date
        try {
          const date = new Date(strValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          // Return as-is if can't parse
        }
        return strValue;

      case 'number':
        const num = parseFloat(strValue);
        return isNaN(num) ? strValue : String(num);

      case 'boolean':
        const lower = strValue.toLowerCase();
        if (['yes', 'true', '1'].includes(lower)) return 'true';
        if (['no', 'false', '0'].includes(lower)) return 'false';
        return strValue;

      default:
        return strValue;
    }
  }
}

export default ExcelParser;

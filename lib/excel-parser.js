const XLSX = require('xlsx');

/**
 * Excel Parser Module
 * Handles reading and parsing Excel files for DHIS2 upload
 */
class ExcelParser {
  constructor() {
    this.workbook = null;
    this.currentSheet = null;
  }

  /**
   * Read Excel file from path
   * @param {string} filePath - Path to .xlsx file
   * @returns {Object} Workbook info with sheet names
   */
  readFile(filePath) {
    try {
      this.workbook = XLSX.readFile(filePath);

      return {
        success: true,
        sheetNames: this.workbook.SheetNames,
        totalSheets: this.workbook.SheetNames.length,
        defaultSheet: this.workbook.SheetNames[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Parse specific sheet to JSON
   * @param {string} sheetName - Name of sheet to parse (optional, uses first sheet if not provided)
   * @returns {Array} Array of record objects
   */
  parseSheet(sheetName = null) {
    if (!this.workbook) {
      throw new Error('No workbook loaded. Call readFile() first.');
    }

    const targetSheet = sheetName || this.workbook.SheetNames[0];

    if (!this.workbook.Sheets[targetSheet]) {
      throw new Error(`Sheet "${targetSheet}" not found in workbook`);
    }

    this.currentSheet = targetSheet;
    const worksheet = this.workbook.Sheets[targetSheet];

    // Convert sheet to JSON with header row as keys
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Convert dates to strings
      defval: '', // Default value for empty cells
    });

    return data;
  }

  /**
   * Parse all sheets in workbook
   * @returns {Object} Object with sheet names as keys and data arrays as values
   */
  parseAllSheets() {
    if (!this.workbook) {
      throw new Error('No workbook loaded. Call readFile() first.');
    }

    const allData = {};

    this.workbook.SheetNames.forEach(sheetName => {
      allData[sheetName] = this.parseSheet(sheetName);
    });

    return allData;
  }

  /**
   * Get column headers from current sheet
   * @returns {Array} Array of column names
   */
  getHeaders() {
    if (!this.workbook || !this.currentSheet) {
      throw new Error('No sheet loaded. Call parseSheet() first.');
    }

    const worksheet = this.workbook.Sheets[this.currentSheet];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    return data[0] || [];
  }

  /**
   * Get statistics about current sheet
   * @returns {Object} Statistics object
   */
  getSheetStats() {
    if (!this.workbook || !this.currentSheet) {
      throw new Error('No sheet loaded. Call parseSheet() first.');
    }

    const data = this.parseSheet(this.currentSheet);
    const headers = this.getHeaders();

    // Count non-empty values per column
    const columnStats = {};
    headers.forEach(header => {
      columnStats[header] = {
        total: data.length,
        filled: data.filter(row => row[header] && row[header].toString().trim() !== '').length,
        empty: data.filter(row => !row[header] || row[header].toString().trim() === '').length
      };
    });

    return {
      sheetName: this.currentSheet,
      totalRows: data.length,
      totalColumns: headers.length,
      headers,
      columnStats
    };
  }

  /**
   * Preview first N rows of data
   * @param {number} count - Number of rows to preview (default: 5)
   * @returns {Array} First N rows
   */
  preview(count = 5) {
    if (!this.workbook || !this.currentSheet) {
      throw new Error('No sheet loaded. Call parseSheet() first.');
    }

    const data = this.parseSheet(this.currentSheet);
    return data.slice(0, count);
  }

  /**
   * Validate Excel structure matches expected DHIS2 format
   * @returns {Object} Validation result
   */
  validateStructure() {
    const expectedColumns = [
      'Patient No.',
      'Locality/Address/Residence',
      'Age',
      'Gender',
      'Occupation',
      'Educational Status',
      'Date of Admission',
      'Date of Discharge',
      'Speciality',
      'Outcome of Discharge',
      'Principal Diagnosis',
      'Additional Diagnosis',
      'Surgical Procedure',
      'Cost of Treatment',
      'NHIS Status'
    ];

    const headers = this.getHeaders();
    const missingColumns = expectedColumns.filter(col => !headers.includes(col));
    const extraColumns = headers.filter(col => !expectedColumns.includes(col));

    return {
      valid: missingColumns.length === 0,
      missingColumns,
      extraColumns,
      totalExpected: expectedColumns.length,
      totalFound: headers.length,
      headers
    };
  }

  /**
   * Find rows with missing required fields
   * @returns {Array} Array of rows with issues
   */
  findIncompleteRows() {
    const requiredFields = [
      'Patient No.',
      'Locality/Address/Residence',
      'Age',
      'Gender',
      'Occupation',
      'Educational Status',
      'Date of Admission',
      'Date of Discharge',
      'Speciality',
      'Outcome of Discharge',
      'Principal Diagnosis',
      'Surgical Procedure',
      'NHIS Status'
    ];

    const data = this.parseSheet(this.currentSheet);
    const incomplete = [];

    data.forEach((row, index) => {
      const missingFields = requiredFields.filter(field => {
        const value = row[field];
        return !value || value.toString().trim() === '';
      });

      if (missingFields.length > 0) {
        incomplete.push({
          rowNumber: index + 2, // +2 because: 1-indexed + 1 for header row
          patientNumber: row['Patient No.'] || 'N/A',
          missingFields
        });
      }
    });

    return incomplete;
  }

  /**
   * Export data to JSON file
   * @param {string} outputPath - Path to save JSON file
   * @param {Array} data - Data to export (optional, uses current sheet if not provided)
   */
  exportToJSON(outputPath, data = null) {
    const fs = require('fs');
    const dataToExport = data || this.parseSheet(this.currentSheet);

    fs.writeFileSync(outputPath, JSON.stringify(dataToExport, null, 2));

    return {
      success: true,
      outputPath,
      recordCount: dataToExport.length
    };
  }

  /**
   * Get summary of Excel file
   * @param {string} filePath - Path to Excel file
   * @returns {Object} Summary object
   */
  static getSummary(filePath) {
    const parser = new ExcelParser();
    const fileInfo = parser.readFile(filePath);

    if (!fileInfo.success) {
      return fileInfo;
    }

    const data = parser.parseSheet();
    const headers = parser.getHeaders();
    const validation = parser.validateStructure();
    const incomplete = parser.findIncompleteRows();

    return {
      success: true,
      file: filePath,
      sheets: fileInfo.sheetNames,
      currentSheet: fileInfo.defaultSheet,
      totalRecords: data.length,
      totalColumns: headers.length,
      headers,
      validation,
      incompleteRows: incomplete,
      preview: data.slice(0, 3)
    };
  }
}

module.exports = ExcelParser;

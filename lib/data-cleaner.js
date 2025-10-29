/**
 * Data Cleaner Module
 * Transforms raw Excel data into DHIS2-compatible format
 */

class DataCleaner {
  constructor(optionSets = {}) {
    this.optionSets = optionSets; // Diagnosis codes, etc.
    this.errors = [];
  }

  /**
   * Clean a single Excel row
   * @param {Object} excelRow - Raw Excel row object
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object} Cleaned data object
   */
  cleanRow(excelRow, rowNumber = 0) {
    this.errors = [];

    try {
      const cleaned = {
        _rowNumber: rowNumber,
        _originalData: excelRow,

        // Personal Information
        patientNumber: this.cleanPatientNumber(excelRow['Patient No.'], rowNumber),
        address: this.cleanAddress(excelRow['Locality/Address/Residence'], rowNumber),
        ...this.cleanAge(excelRow['Age'], rowNumber),
        gender: this.cleanGender(excelRow['Gender'], rowNumber),
        occupation: this.cleanOccupation(excelRow['Occupation'], rowNumber),
        education: this.cleanEducation(excelRow['Educational Status'], rowNumber),

        // Admission Details
        dateOfAdmission: this.cleanDate(excelRow['Date of Admission'], 'Date of Admission', rowNumber),
        dateOfDischarge: this.cleanDate(excelRow['Date of Discharge'], 'Date of Discharge', rowNumber),
        speciality: this.cleanSpeciality(excelRow['Speciality'], rowNumber),

        // Medical Information
        outcome: this.cleanOutcome(excelRow['Outcome of Discharge'], rowNumber),
        principalDiagnosis: this.cleanDiagnosis(excelRow['Principal Diagnosis'], 'Principal', rowNumber),
        additionalDiagnosis: this.cleanDiagnosis(excelRow['Additional Diagnosis'], 'Additional', rowNumber),
        surgicalProcedure: this.cleanBoolean(excelRow['Surgical Procedure'], 'Surgical Procedure', rowNumber),

        // Financial & Insurance
        cost: this.cleanCost(excelRow['Cost of Treatment'], rowNumber),
        nhisStatus: this.cleanBoolean(excelRow['NHIS Status'], 'NHIS Status', rowNumber)
      };

      return {
        success: this.errors.length === 0,
        data: cleaned,
        errors: this.errors
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [{
          field: 'general',
          message: error.message,
          rowNumber
        }]
      };
    }
  }

  /**
   * Clean patient number
   */
  cleanPatientNumber(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('patientNumber', 'Patient number is required', rowNumber);
      return null;
    }

    const cleaned = value.toString().trim().toUpperCase();

    // Validate format: VR-A##-AAA####
    const pattern = /^VR-A\d{2}-[A-Z]{3}\d{4}$/;
    if (!pattern.test(cleaned)) {
      this.addError('patientNumber', `Invalid format: "${cleaned}". Expected: VR-A##-AAA####`, rowNumber);
    }

    return cleaned;
  }

  /**
   * Clean address/locality
   */
  cleanAddress(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('address', 'Address is required', rowNumber);
      return null;
    }

    return value.toString().trim().toUpperCase();
  }

  /**
   * Clean age field - splits into number and unit
   * Input: "20 Year(s)" or "6 Month(s)" or "15 Day(s)"
   * Output: { ageNumber: "20", ageUnit: "years" }
   */
  cleanAge(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('age', 'Age is required', rowNumber);
      return { ageNumber: null, ageUnit: null };
    }

    const ageString = value.toString().trim();

    // Extract number and unit using regex
    const match = ageString.match(/(\d+)\s*(Year|Month|Day)/i);

    if (!match) {
      this.addError('age', `Invalid age format: "${ageString}". Expected format: "20 Year(s)"`, rowNumber);
      return { ageNumber: null, ageUnit: null };
    }

    const number = match[1];
    const unit = match[2].toLowerCase();

    // Normalize unit to plural lowercase
    const normalizedUnit = unit.endsWith('s') ? unit : unit + 's';

    // Validate age is reasonable
    const ageNum = parseInt(number);
    if (normalizedUnit === 'years' && (ageNum < 0 || ageNum > 150)) {
      this.addError('age', `Age ${ageNum} years seems unrealistic`, rowNumber, 'warning');
    }
    if (normalizedUnit === 'months' && ageNum > 120) {
      this.addError('age', `Age ${ageNum} months seems unrealistic`, rowNumber, 'warning');
    }

    return {
      ageNumber: number,
      ageUnit: normalizedUnit
    };
  }

  /**
   * Clean gender
   */
  cleanGender(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('gender', 'Gender is required', rowNumber);
      return null;
    }

    const cleaned = value.toString().trim();
    const normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();

    // Validate against allowed values
    const allowedValues = ['Male', 'Female'];
    if (!allowedValues.includes(normalized)) {
      this.addError('gender', `Invalid gender: "${cleaned}". Must be Male or Female`, rowNumber);
      return null;
    }

    return normalized;
  }

  /**
   * Clean occupation
   */
  cleanOccupation(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('occupation', 'Occupation is required', rowNumber);
      return null;
    }

    // Clean up common variations
    let cleaned = value.toString().trim();

    // Common mappings
    const mappings = {
      'PENSIONIER': 'Pensioner',
      'TRADER': 'Trader / Shop Assistant',
      'TEACHER': 'Teacher',
      'STUDENT': 'Student'
    };

    const upperValue = cleaned.toUpperCase();
    if (mappings[upperValue]) {
      cleaned = mappings[upperValue];
    }

    return cleaned;
  }

  /**
   * Clean educational status
   */
  cleanEducation(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('education', 'Educational status is required', rowNumber);
      return null;
    }

    const cleaned = value.toString().trim().toUpperCase();

    // Map to DHIS2 values
    const mapping = {
      'SHS': 'SHS/Secondary',
      'JHS': 'JHS/Middle School',
      'TERTIARY': 'Tertiary',
      'SHS/SECONDARY': 'SHS/Secondary',
      'JHS/MIDDLE SCHOOL': 'JHS/Middle School'
    };

    const mapped = mapping[cleaned];
    if (!mapped) {
      this.addError('education', `Unknown education level: "${value}". Expected: SHS, JHS, or Tertiary`, rowNumber);
      return null;
    }

    return mapped;
  }

  /**
   * Clean date field
   * Converts DD-MM-YYYY to YYYY-MM-DD (ISO format)
   */
  cleanDate(value, fieldName, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError(fieldName, `${fieldName} is required`, rowNumber);
      return null;
    }

    const dateString = value.toString().trim();

    // Try to parse DD-MM-YYYY format
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      this.addError(fieldName, `Invalid date format: "${dateString}". Expected: DD-MM-YYYY`, rowNumber);
      return null;
    }

    const [day, month, year] = parts;

    // Validate parts are numbers
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      this.addError(fieldName, `Invalid date: "${dateString}". Day, month, year must be numbers`, rowNumber);
      return null;
    }

    // Pad with zeros if needed
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');

    // Create ISO format
    const isoDate = `${year}-${paddedMonth}-${paddedDay}`;

    // Validate date is real
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      this.addError(fieldName, `Invalid date: "${dateString}" (${isoDate})`, rowNumber);
      return null;
    }

    // Check if date is in reasonable range
    const currentYear = new Date().getFullYear();
    const dateYear = parseInt(year);
    if (dateYear < 1900 || dateYear > currentYear + 1) {
      this.addError(fieldName, `Date year ${dateYear} seems unrealistic`, rowNumber, 'warning');
    }

    return isoDate;
  }

  /**
   * Clean speciality field
   */
  cleanSpeciality(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('speciality', 'Speciality is required', rowNumber);
      return null;
    }

    const cleaned = value.toString().trim();

    // Map common variations
    const mapping = {
      'Accident Emergency': 'Casualty',
      'ACCIDENT EMERGENCY': 'Casualty',
      'Casualty': 'Casualty',
      'CASUALTY': 'Casualty',
      'A&E': 'Casualty',
      'Emergency': 'Casualty'
    };

    const mapped = mapping[cleaned];
    if (!mapped) {
      this.addError('speciality', `Unknown speciality: "${cleaned}". Will use as-is`, rowNumber, 'warning');
      return cleaned;
    }

    return mapped;
  }

  /**
   * Clean outcome field
   */
  cleanOutcome(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('outcome', 'Outcome is required', rowNumber);
      return null;
    }

    const cleaned = value.toString().trim();

    // Map to DHIS2 values
    const mapping = {
      'Referred': 'Transferred',
      'REFERRED': 'Transferred',
      'Discharge': 'Discharged',
      'DISCHARGE': 'Discharged',
      'Discharged': 'Discharged',
      'DISCHARGED': 'Discharged',
      'Transferred': 'Transferred',
      'TRANSFERRED': 'Transferred',
      'Died': 'Died',
      'DIED': 'Died',
      'Absconded': 'Absconded',
      'ABSCONDED': 'Absconded'
    };

    const mapped = mapping[cleaned];
    if (!mapped) {
      this.addError('outcome', `Unknown outcome: "${cleaned}". Valid options: Discharged, Transferred, Died, Absconded`, rowNumber);
      return null;
    }

    return mapped;
  }

  /**
   * Clean diagnosis field
   * Extracts ICD code and attempts to match with DHIS2 codes
   * Input: "Other tetanus(A35.00)" or "Stroke(I64)"
   * Output: "A35 - Tetanus" or "I64 - Stroke"
   */
  cleanDiagnosis(value, type, rowNumber) {
    // Additional diagnosis is optional
    if (type === 'Additional' && (!value || value.toString().trim() === '' || value.toString().trim().toUpperCase() === 'NA')) {
      return null;
    }

    // Principal diagnosis is required
    if (type === 'Principal' && (!value || value.toString().trim() === '')) {
      this.addError('principalDiagnosis', 'Principal diagnosis is required', rowNumber);
      return null;
    }

    const diagString = value.toString().trim();

    // Extract ICD code from parentheses
    const codeMatch = diagString.match(/\(([A-Z]\d{2,3}\.?\d*)\)/i);

    if (!codeMatch) {
      this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                   `Could not extract ICD code from: "${diagString}". Expected format: "Description(Code)"`,
                   rowNumber);
      return null;
    }

    const rawCode = codeMatch[1].toUpperCase();

    // Try exact match first
    let matchedCode = this.findDiagnosisMatch(rawCode);

    // If no match, try without decimal
    if (!matchedCode) {
      const codeWithoutDecimal = rawCode.replace(/\.\d+$/, '');
      matchedCode = this.findDiagnosisMatch(codeWithoutDecimal);
    }

    // If still no match and we have option sets, try fuzzy matching
    if (!matchedCode && this.optionSets.diagnosis && this.optionSets.diagnosis.length > 0) {
      matchedCode = this.fuzzyMatchDiagnosis(rawCode, diagString);
    }

    if (!matchedCode) {
      this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                   `Could not match diagnosis code "${rawCode}" to DHIS2 codes. Please verify.`,
                   rowNumber,
                   'warning');
      // Return the cleaned code anyway
      return rawCode.replace(/\.\d+$/, '');
    }

    return matchedCode;
  }

  /**
   * Find exact diagnosis match in option set
   */
  findDiagnosisMatch(code) {
    if (!this.optionSets.diagnosis) {
      return null;
    }

    const match = this.optionSets.diagnosis.find(d => {
      const diagCode = d.code || d.name.split(' - ')[0];
      return diagCode.toUpperCase() === code.toUpperCase();
    });

    return match ? match.code || match.name : null;
  }

  /**
   * Fuzzy match diagnosis by text and code
   */
  fuzzyMatchDiagnosis(code, fullText) {
    if (!this.optionSets.diagnosis) {
      return null;
    }

    // Extract description text
    const descMatch = fullText.match(/^([^(]+)\(/);
    const description = descMatch ? descMatch[1].trim().toLowerCase() : '';

    // Try prefix matching on code
    const prefixMatches = this.optionSets.diagnosis.filter(d => {
      const diagCode = d.code || d.name.split(' - ')[0];
      return diagCode.toUpperCase().startsWith(code.substring(0, 3));
    });

    if (prefixMatches.length === 1) {
      return prefixMatches[0].code || prefixMatches[0].name;
    }

    // Try text matching
    if (description) {
      const textMatch = this.optionSets.diagnosis.find(d => {
        const diagName = (d.name || '').toLowerCase();
        return diagName.includes(description) || description.includes(diagName.split(' - ')[1] || '');
      });

      if (textMatch) {
        return textMatch.code || textMatch.name;
      }
    }

    return null;
  }

  /**
   * Clean boolean field (Yes/No to true/false)
   */
  cleanBoolean(value, fieldName, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError(fieldName, `${fieldName} is required`, rowNumber);
      return null;
    }

    const cleaned = value.toString().trim().toLowerCase();

    const mapping = {
      'yes': 'true',
      'no': 'false',
      'true': 'true',
      'false': 'false',
      '1': 'true',
      '0': 'false'
    };

    const mapped = mapping[cleaned];
    if (!mapped) {
      this.addError(fieldName, `Invalid value: "${value}". Expected: Yes/No or true/false`, rowNumber);
      return null;
    }

    return mapped;
  }

  /**
   * Clean cost field
   */
  cleanCost(value, rowNumber) {
    // Cost is optional
    if (!value || value.toString().trim() === '' || value.toString().trim().toUpperCase() === 'NA') {
      return null;
    }

    const cleaned = value.toString().trim();

    // Remove any currency symbols or commas
    const numericValue = cleaned.replace(/[^\d.]/g, '');

    const cost = parseFloat(numericValue);

    if (isNaN(cost)) {
      this.addError('cost', `Invalid cost: "${value}". Must be a number`, rowNumber);
      return null;
    }

    if (cost < 0) {
      this.addError('cost', `Cost cannot be negative: ${cost}`, rowNumber);
      return null;
    }

    // Return as string (DHIS2 expects string values)
    return cost.toString();
  }

  /**
   * Add error to error list
   */
  addError(field, message, rowNumber, severity = 'error') {
    this.errors.push({
      field,
      message,
      rowNumber,
      severity
    });
  }

  /**
   * Clean multiple rows
   * @param {Array} excelRows - Array of Excel row objects
   * @returns {Object} Result with cleaned data and errors
   */
  cleanAll(excelRows) {
    const results = {
      success: [],
      failed: [],
      warnings: []
    };

    excelRows.forEach((row, index) => {
      const result = this.cleanRow(row, index + 2); // +2 for 1-indexed + header

      if (result.success) {
        results.success.push(result.data);
      } else {
        results.failed.push({
          rowNumber: index + 2,
          data: result.data,
          errors: result.errors
        });
      }

      // Collect warnings
      const warnings = result.errors.filter(e => e.severity === 'warning');
      if (warnings.length > 0) {
        results.warnings.push({
          rowNumber: index + 2,
          warnings
        });
      }
    });

    return results;
  }

  /**
   * Set option sets for validation (diagnosis codes, etc.)
   */
  setOptionSets(optionSets) {
    this.optionSets = optionSets;
  }
}

module.exports = DataCleaner;

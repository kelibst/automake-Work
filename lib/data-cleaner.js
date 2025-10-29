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

      // Only count actual errors and warnings as failures, not info messages
      const actualErrors = this.errors.filter(e => e.severity === 'error');

      return {
        success: actualErrors.length === 0,
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
   * Note: Patient numbers come directly from the system, so we only check existence
   */
  cleanPatientNumber(value, rowNumber) {
    if (!value || value.toString().trim() === '') {
      this.addError('patientNumber', 'Patient number is required', rowNumber);
      return null;
    }

    const cleaned = value.toString().trim().toUpperCase();

    // No format validation - patient numbers come directly from the system
    // and are always correct
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
      'JHS/MIDDLE SCHOOL': 'JHS/Middle School',
      // New mappings
      'NA': 'None',
      'N/A': 'None',
      'NONE': 'None',
      'BASIC': 'Primary School',
      'PRIMARY': 'Primary School',
      'PRIMARY SCHOOL': 'Primary School',
      'CHILD': 'Primary School'  // Children are typically in primary school
    };

    const mapped = mapping[cleaned];
    if (!mapped) {
      this.addError('education', `Unknown education level: "${value}". Expected: SHS, JHS, Tertiary, Primary, or None`, rowNumber);
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
      'Emergency': 'Casualty',
      'General': 'Casualty',
      'GENERAL': 'Casualty',
      'general': 'Casualty'
    };

    const mapped = mapping[cleaned];

    // Special alert for General → Casualty mapping
    if (cleaned.toLowerCase() === 'general') {
      this.addError('speciality',
                   `ℹ️ INFO: "General" has been automatically mapped to "Casualty". If this is incorrect, please update your Excel file to use the correct speciality.`,
                   rowNumber, 'info');
    }

    if (!mapped) {
      this.addError('speciality', `⚠️ Unknown speciality: "${cleaned}". Will use as-is, but verify it exists in DHIS2.`, rowNumber, 'warning');
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
   * Handles complex cases with multiple ICD codes
   * Input: "Other tetanus(A35.00)" or "Stroke(I64)" or "Diabetes(E11.65, I10.00)"
   * Output: Single matched code or object with principal and additional
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

    // Check for multiple ICD codes in parentheses (e.g., "Description(A35.00, I10.00)")
    const multipleCodesMatch = diagString.match(/\(([A-Z]\d{2,3}\.?\d*(?:\s*,\s*[A-Z]\d{2,3}\.?\d*)+)\)/i);

    if (multipleCodesMatch) {
      // Multiple codes found - split them
      const codes = multipleCodesMatch[1].split(/\s*,\s*/).map(c => c.trim().toUpperCase());

      if (type === 'Principal') {
        // For principal diagnosis with multiple codes, use first as principal
        const principalCode = this.matchSingleDiagnosisCode(codes[0], rowNumber, 'Principal');

        if (principalCode && codes.length > 1) {
          // Add info message about splitting
          this.addError('principalDiagnosis',
                       `ℹ️ INFO: Found ${codes.length} diagnosis codes. Using "${codes[0]}" as principal. Additional code(s) "${codes.slice(1).join(', ')}" should be in Additional Diagnosis field.`,
                       rowNumber, 'info');
        }

        return principalCode;
      } else {
        // For additional diagnosis, use first code found
        return this.matchSingleDiagnosisCode(codes[0], rowNumber, 'Additional');
      }
    }

    // Single code - extract and match
    const codeMatch = diagString.match(/\(([A-Z]\d{2,3}\.?\d*)\)/i);

    if (!codeMatch) {
      this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                   `Could not extract ICD code from: "${diagString}". Expected format: "Description(Code)"`,
                   rowNumber);
      return null;
    }

    const rawCode = codeMatch[1].toUpperCase();
    return this.matchSingleDiagnosisCode(rawCode, rowNumber, type);
  }

  /**
   * Match a single diagnosis code to DHIS2
   * @param {string} rawCode - The ICD code to match
   * @param {number} rowNumber - Row number for errors
   * @param {string} type - 'Principal' or 'Additional'
   * @returns {string|null} - Matched code or null
   */
  matchSingleDiagnosisCode(rawCode, rowNumber, type) {
    // Try exact match first
    let matchedCode = this.findDiagnosisMatch(rawCode);

    // If no match, try without decimal
    if (!matchedCode) {
      const codeWithoutDecimal = rawCode.replace(/\.\d+$/, '');
      matchedCode = this.findDiagnosisMatch(codeWithoutDecimal);

      if (matchedCode) {
        // Found by removing decimal - alert user
        this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                     `ℹ️ INFO: Using "${matchedCode}" (matched from "${rawCode}" by removing decimal suffix)`,
                     rowNumber, 'info');
        return matchedCode;
      }
    }

    // If still no match, find closest suggestions
    if (!matchedCode && this.optionSets.diagnosis && this.optionSets.diagnosis.length > 0) {
      const suggestions = this.findClosestDiagnosisCodes(rawCode, 3); // Get top 3 suggestions

      if (suggestions.length > 0) {
        const bestMatch = suggestions[0];

        // If best match has high confidence (> 70%), suggest auto-fix
        if (bestMatch.similarity >= 0.7) {
          this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                       `✅ SUGGESTED: Code "${rawCode}" not found. Auto-using closest match "${bestMatch.code}" - ${bestMatch.name} (${Math.round(bestMatch.similarity * 100)}% match)`,
                       rowNumber, 'suggestion');

          // Store suggestion for user review
          if (!this.suggestions) this.suggestions = [];
          this.suggestions.push({
            rowNumber,
            field: type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
            original: rawCode,
            suggested: bestMatch.code,
            confidence: bestMatch.similarity,
            alternatives: suggestions.slice(1)
          });

          return bestMatch.code; // Auto-use the suggestion
        } else {
          // Low confidence - show suggestions but don't auto-fix
          const suggestionText = suggestions
            .map(s => `  - ${s.code}: ${s.name} (${Math.round(s.similarity * 100)}% match)`)
            .join('\n');

          this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                       `❌ INVALID DIAGNOSIS: Code "${rawCode}" not found in DHIS2.\n\nDid you mean one of these?\n${suggestionText}\n\nPlease update your Excel file with the correct code.`,
                       rowNumber);
          return null;
        }
      }
    }

    if (!matchedCode) {
      // Invalid diagnosis code - no suggestions found
      this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                   `❌ INVALID DIAGNOSIS: Code "${rawCode}" not found in DHIS2. No similar codes found. Please verify the diagnosis code with your DHIS2 administrator.`,
                   rowNumber);
      return null;
    }

    return matchedCode;
  }

  /**
   * Find closest diagnosis codes using similarity scoring
   * @param {string} rawCode - The invalid code
   * @param {number} limit - Max number of suggestions
   * @returns {Array} - Array of suggestions with similarity scores
   */
  findClosestDiagnosisCodes(rawCode, limit = 3) {
    if (!this.optionSets.diagnosis) return [];

    const baseCode = rawCode.substring(0, 3); // First 3 characters (e.g., "I64" from "I64.00")
    const suggestions = [];

    this.optionSets.diagnosis.forEach(d => {
      const diagCode = d.code || d.name.split(' - ')[0];
      const diagBase = diagCode.substring(0, 3);

      // Calculate similarity score
      let similarity = 0;

      // Same base code (e.g., I64 vs I64.00) - very high match
      if (diagBase === baseCode) {
        similarity = 0.9;
      }
      // Same category (first letter matches) and close number
      else if (rawCode[0] === diagCode[0]) {
        const rawNum = parseInt(rawCode.substring(1, 3)) || 0;
        const diagNum = parseInt(diagCode.substring(1, 3)) || 0;
        const numDiff = Math.abs(rawNum - diagNum);

        if (numDiff === 0) {
          similarity = 0.85;
        } else if (numDiff <= 2) {
          similarity = 0.7 - (numDiff * 0.1);
        } else if (numDiff <= 5) {
          similarity = 0.5;
        } else {
          similarity = 0.3;
        }
      }
      // Same letter category but different numbers
      else if (rawCode[0] === diagCode[0]) {
        similarity = 0.2;
      }

      if (similarity > 0) {
        suggestions.push({
          code: diagCode,
          name: d.name,
          similarity
        });
      }
    });

    // Sort by similarity (highest first) and return top matches
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
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
   * @param {string} severity - 'error', 'warning', 'info', or 'suggestion'
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
      warnings: [],
      info: [],
      suggestions: []  // Track auto-fixed suggestions
    };

    excelRows.forEach((row, index) => {
      const result = this.cleanRow(row, index + 2); // +2 for 1-indexed + header

      if (result.success) {
        results.success.push(result.data);

        // Collect suggestions from successful records
        const suggestionMsgs = result.errors.filter(e => e.severity === 'suggestion');
        if (suggestionMsgs.length > 0 && this.suggestions && this.suggestions.length > 0) {
          // Add suggestions from this row
          const rowSuggestions = this.suggestions.filter(s => s.rowNumber === index + 2);
          results.suggestions.push(...rowSuggestions);
        }
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

      // Collect info messages
      const infoMessages = result.errors.filter(e => e.severity === 'info');
      if (infoMessages.length > 0) {
        results.info.push({
          rowNumber: index + 2,
          messages: infoMessages
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

/**
 * Data Cleaner Module - Browser Compatible
 * Transforms raw Excel data into DHIS2-compatible format with fuzzy diagnosis matching
 */

class DataCleaner {
  constructor(optionSets = {}) {
    this.optionSets = optionSets;
    this.errors = [];
    this.suggestions = [];
  }

  /**
   * Lazy load diagnosis codes from bundled JSON
   */
  static async loadDiagnosisCodes() {
    if (DataCleaner._diagnosisCodes) {
      return DataCleaner._diagnosisCodes;
    }

    try {
      const response = await fetch(chrome.runtime.getURL('option-codes.json'));
      const data = await response.json();
      DataCleaner._diagnosisCodes = data.Diagnosis || [];
      return DataCleaner._diagnosisCodes;
    } catch (error) {
      console.error('Failed to load diagnosis codes:', error);
      return [];
    }
  }

  /**
   * Clean diagnosis field with fuzzy matching
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

    // Check for multiple ICD codes in parentheses
    const multipleCodesMatch = diagString.match(/\(([A-Z]\d{2,3}\.?\d*(?:\s*,\s*[A-Z]\d{2,3}\.?\d*)+)\)/i);

    if (multipleCodesMatch) {
      const codes = multipleCodesMatch[1].split(/\s*,\s*/).map(c => c.trim().toUpperCase());

      if (type === 'Principal') {
        const principalCode = this.matchSingleDiagnosisCode(codes[0], rowNumber, 'Principal');

        if (principalCode && codes.length > 1) {
          this.addError('principalDiagnosis',
                       `ℹ️ INFO: Found ${codes.length} diagnosis codes. Using "${codes[0]}" as principal. Additional code(s) "${codes.slice(1).join(', ')}" should be in Additional Diagnosis field.`,
                       rowNumber, 'info');
        }

        return principalCode;
      } else {
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
   * Match single diagnosis code with fuzzy logic
   * Implements ICD-10 hierarchy matching: specific → parent codes
   */
  matchSingleDiagnosisCode(rawCode, rowNumber, type) {
    // Try exact match first
    let matchedCode = this.findDiagnosisMatch(rawCode);

    if (matchedCode) {
      return matchedCode;
    }

    // Step 1: Try removing decimal (I64.0 → I64)
    if (!matchedCode && rawCode.includes('.')) {
      const codeWithoutDecimal = rawCode.replace(/\.\d+$/, '');
      matchedCode = this.findDiagnosisMatch(codeWithoutDecimal);

      if (matchedCode) {
        this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                     `✅ AUTO-MATCHED: "${rawCode}" → "${matchedCode}" (using parent ICD-10 code)`,
                     rowNumber, 'info');
        return matchedCode;
      }
    }

    // Step 2: Try parent code hierarchy (I64.00 → I64.0 → I64)
    if (!matchedCode && rawCode.includes('.')) {
      const parts = rawCode.split('.');
      const baseCode = parts[0];
      const subCode = parts[1];

      // Try progressively shorter subcodes: I64.123 → I64.12 → I64.1
      if (subCode && subCode.length > 1) {
        for (let len = subCode.length - 1; len > 0; len--) {
          const parentCode = `${baseCode}.${subCode.substring(0, len)}`;
          matchedCode = this.findDiagnosisMatch(parentCode);

          if (matchedCode) {
            this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                         `✅ AUTO-MATCHED: "${rawCode}" → "${matchedCode}" (using parent ICD-10 category)`,
                         rowNumber, 'info');
            return matchedCode;
          }
        }
      }

      // Finally try base code without any decimal
      matchedCode = this.findDiagnosisMatch(baseCode);
      if (matchedCode) {
        this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                     `✅ AUTO-MATCHED: "${rawCode}" → "${matchedCode}" (using parent ICD-10 category)`,
                     rowNumber, 'info');
        return matchedCode;
      }
    }

    // If still no match, find closest suggestions
    if (!matchedCode && this.optionSets.diagnosis && this.optionSets.diagnosis.length > 0) {
      const suggestions = this.findClosestDiagnosisCodes(rawCode, 3);

      if (suggestions.length > 0) {
        const bestMatch = suggestions[0];

        // Auto-fix if confidence >= 70%
        if (bestMatch.similarity >= 0.7) {
          this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                       `✅ SUGGESTED: Code "${rawCode}" not found. Auto-using closest match "${bestMatch.code}" - ${bestMatch.name} (${Math.round(bestMatch.similarity * 100)}% match)`,
                       rowNumber, 'suggestion');

          // Store suggestion for user review
          this.suggestions.push({
            rowNumber,
            field: type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
            original: rawCode,
            suggested: bestMatch.code,
            suggestedName: bestMatch.name,
            confidence: bestMatch.similarity,
            alternatives: suggestions.slice(1)
          });

          return bestMatch.code;
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
      this.addError(type === 'Principal' ? 'principalDiagnosis' : 'additionalDiagnosis',
                   `❌ INVALID DIAGNOSIS: Code "${rawCode}" not found in DHIS2. No similar codes found. Please verify the diagnosis code with your DHIS2 administrator.`,
                   rowNumber);
      return null;
    }

    return matchedCode;
  }

  /**
   * Find closest diagnosis codes using similarity scoring
   */
  findClosestDiagnosisCodes(rawCode, limit = 3) {
    if (!this.optionSets.diagnosis) return [];

    const baseCode = rawCode.substring(0, 3);
    const suggestions = [];

    this.optionSets.diagnosis.forEach(d => {
      const diagCode = d.code || d.name.split(' - ')[0];
      const diagBase = diagCode.substring(0, 3);

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

    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Find exact diagnosis match
   */
  findDiagnosisMatch(code) {
    if (!this.optionSets.diagnosis) return null;

    const match = this.optionSets.diagnosis.find(d => {
      const diagCode = d.code || d.name.split(' - ')[0];
      return diagCode.toUpperCase() === code.toUpperCase();
    });

    return match ? match.code || match.name : null;
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
   * Clean age field - split into number and unit
   */
  cleanAge(value) {
    if (!value) return { age: null, ageUnit: null };

    const str = String(value).trim();
    const match = str.match(/(\d+)\s*(year|month|day|week)?s?/i);

    if (match) {
      return {
        age: parseInt(match[1]),
        ageUnit: (match[2] || 'years').toLowerCase()
      };
    }

    // If just a number, assume years
    const num = parseInt(str);
    if (!isNaN(num)) {
      return { age: num, ageUnit: 'years' };
    }

    return { age: null, ageUnit: null };
  }

  /**
   * Clean education level
   */
  cleanEducation(value) {
    if (!value) return null;

    const mapping = {
      'BASIC': 'JHS',
      'ELEMENTARY': 'PRIMARY',
      'JUNIOR HIGH': 'JHS',
      'JUNIOR SECONDARY': 'JHS',
      'SENIOR HIGH': 'SHS',
      'SENIOR SECONDARY': 'SHS',
      'SECONDARY': 'SHS',
      'UNIVERSITY': 'TERTIARY',
      'COLLEGE': 'TERTIARY',
      'DIPLOMA': 'TERTIARY'
    };

    const str = String(value).trim().toUpperCase();
    return mapping[str] || value;
  }

  /**
   * Clean gender field
   */
  cleanGender(value) {
    if (!value) return null;

    const str = String(value).trim().toUpperCase();
    const mapping = {
      'M': 'Male',
      'MALE': 'Male',
      'F': 'Female',
      'FEMALE': 'Female'
    };

    return mapping[str] || value;
  }

  /**
   * Clean occupation field
   */
  cleanOccupation(value) {
    if (!value) return null;

    const mapping = {
      'FARMING': 'FARMER',
      'TRADING': 'TRADER',
      'TEACHING': 'TEACHER',
      'DRIVING': 'DRIVER',
      'NURSING': 'NURSE',
      'STUDENT': 'STUDENT',
      'UNEMPLOYED': 'UNEMPLOYED'
    };

    const str = String(value).trim().toUpperCase();
    return mapping[str] || value;
  }

  /**
   * Clean speciality field
   */
  cleanSpeciality(value) {
    if (!value) return null;

    const mapping = {
      'MEDICINE': 'MEDICAL',
      'SURGERY': 'SURGICAL',
      'OBS': 'OBSTETRICS',
      'GYNAE': 'GYNAECOLOGY',
      'GYNAECOLOGY': 'GYNAECOLOGY',
      'PAEDS': 'PAEDIATRICS',
      'PAEDIATRICS': 'PAEDIATRICS',
      'PEDIATRICS': 'PAEDIATRICS'
    };

    const str = String(value).trim().toUpperCase();
    return mapping[str] || value;
  }

  /**
   * Clean outcome field
   */
  cleanOutcome(value) {
    if (!value) return null;

    const mapping = {
      'DISCHARGED': 'RECOVERED',
      'CURED': 'RECOVERED',
      'RECOVERED': 'RECOVERED',
      'TRANSFERRED': 'REFERRED',
      'REFERRED': 'REFERRED',
      'DEATH': 'DIED',
      'DEAD': 'DIED',
      'DIED': 'DIED',
      'ESCAPED': 'ABSCONDED',
      'ABSCONDED': 'ABSCONDED'
    };

    const str = String(value).trim().toUpperCase();
    return mapping[str] || value;
  }

  /**
   * Clean date field
   */
  cleanDate(value) {
    if (!value) return null;

    const str = String(value).trim();

    // Try to parse date in various formats
    const formats = [
      /^(\d{2})-(\d{2})-(\d{4})$/,  // DD-MM-YYYY
      /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/   // YYYY-MM-DD (already correct)
    ];

    for (const format of formats) {
      const match = str.match(format);
      if (match) {
        if (format === formats[2]) {
          // Already in correct format
          return str;
        } else if (format === formats[0] || format === formats[1]) {
          // Convert DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

    // If no match, try Date object
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Invalid date
    }

    return null;
  }

  /**
   * Clean cost field
   */
  cleanCost(value) {
    if (!value) return null;

    const str = String(value).trim();

    // Remove currency symbols and text
    const cleaned = str.replace(/[GH¢$₵\s,cedis]/gi, '').trim();

    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      return num.toFixed(2);
    }

    return null;
  }

  /**
   * Clean boolean field
   */
  cleanBoolean(value) {
    if (value === null || value === undefined) return null;

    const str = String(value).trim().toUpperCase();
    const truthy = ['YES', 'Y', 'TRUE', '1', 'T'];
    const falsy = ['NO', 'N', 'FALSE', '0', 'F'];

    if (truthy.includes(str)) return true;
    if (falsy.includes(str)) return false;

    return null;
  }

  /**
   * Split diagnosis codes (multiple codes in one field)
   */
  splitDiagnosisCodes(value) {
    if (!value) return [];

    const str = String(value).trim();

    // Split by comma
    const codes = str.split(/\s*,\s*/).map(c => c.trim().toUpperCase());

    return codes.filter(c => c.length > 0);
  }

  /**
   * Clean all fields in a record
   */
  cleanRow(record, fieldMappings) {
    const cleaned = { ...record };
    const transformations = [];

    // Clean each field based on its type
    Object.entries(fieldMappings).forEach(([dhimsField, config]) => {
      const excelColumn = config.excelColumn;
      const value = record[excelColumn];

      if (value === null || value === undefined || value === '') return;

      let cleanedValue = value;
      let wasTransformed = false;

      // Apply appropriate cleaning based on field type
      switch (dhimsField) {
        case 'age':
        case 'patientAge': {
          const ageResult = this.cleanAge(value);
          if (ageResult.age !== null && ageResult.age !== value) {
            cleanedValue = ageResult.age;
            wasTransformed = true;
          }
          break;
        }

        case 'education': {
          const eduResult = this.cleanEducation(value);
          if (eduResult && eduResult !== value) {
            cleanedValue = eduResult;
            wasTransformed = true;
          }
          break;
        }

        case 'gender': {
          const genderResult = this.cleanGender(value);
          if (genderResult && genderResult !== value) {
            cleanedValue = genderResult;
            wasTransformed = true;
          }
          break;
        }

        case 'occupation': {
          const occupationResult = this.cleanOccupation(value);
          if (occupationResult && occupationResult !== value) {
            cleanedValue = occupationResult;
            wasTransformed = true;
          }
          break;
        }

        case 'speciality': {
          const specialityResult = this.cleanSpeciality(value);
          if (specialityResult && specialityResult !== value) {
            cleanedValue = specialityResult;
            wasTransformed = true;
          }
          break;
        }

        case 'outcome': {
          const outcomeResult = this.cleanOutcome(value);
          if (outcomeResult && outcomeResult !== value) {
            cleanedValue = outcomeResult;
            wasTransformed = true;
          }
          break;
        }

        case 'dateOfAdmission':
        case 'dateOfDischarge': {
          const dateResult = this.cleanDate(value);
          if (dateResult && dateResult !== value) {
            cleanedValue = dateResult;
            wasTransformed = true;
          }
          break;
        }

        case 'cost': {
          const costResult = this.cleanCost(value);
          if (costResult && costResult !== value) {
            cleanedValue = costResult;
            wasTransformed = true;
          }
          break;
        }

        case 'insured': {
          const boolResult = this.cleanBoolean(value);
          if (boolResult !== null && boolResult !== value) {
            cleanedValue = boolResult;
            wasTransformed = true;
          }
          break;
        }
      }

      if (wasTransformed) {
        cleaned[excelColumn] = cleanedValue;
        transformations.push({
          field: dhimsField,
          excelColumn,
          original: value,
          cleaned: cleanedValue
        });
      }
    });

    return {
      record: cleaned,
      transformations
    };
  }

  /**
   * Clean all records
   */
  async cleanAll(excelRows, fieldMapper) {
    const results = {
      success: [],
      failed: [],
      warnings: [],
      info: [],
      suggestions: []
    };

    // Ensure diagnosis codes are loaded
    if (!this.optionSets.diagnosis) {
      this.optionSets.diagnosis = await DataCleaner.loadDiagnosisCodes();
    }

    for (let i = 0; i < excelRows.length; i++) {
      const row = excelRows[i];
      const rowNumber = i + 2; // +2 for 1-indexed + header

      this.errors = [];
      this.suggestions = [];

      try {
        // Get Excel column names for diagnosis fields
        const principalDiagColumn = fieldMapper.fieldMappings.principalDiagnosis?.excelColumn || 'Principal Diagnosis';
        const additionalDiagColumn = fieldMapper.fieldMappings.additionalDiagnosis?.excelColumn || 'Additional Diagnosis';

        // Clean diagnosis fields using fuzzy matching
        const principalDiag = this.cleanDiagnosis(
          row[principalDiagColumn],
          'Principal',
          rowNumber
        );

        const additionalDiag = this.cleanDiagnosis(
          row[additionalDiagColumn],
          'Additional',
          rowNumber
        );

        // Build cleaned record
        const cleaned = {
          _rowNumber: rowNumber,
          _originalData: row,
          principalDiagnosis: principalDiag,
          additionalDiagnosis: additionalDiag
          // Other fields will be cleaned by existing field-mapper
        };

        // Only count actual errors as failures
        const actualErrors = this.errors.filter(e => e.severity === 'error');

        if (actualErrors.length === 0) {
          results.success.push(cleaned);

          // Collect suggestions from successful records
          if (this.suggestions.length > 0) {
            results.suggestions.push(...this.suggestions);
          }
        } else {
          results.failed.push({
            rowNumber,
            data: cleaned,
            errors: this.errors
          });
        }

        // Collect warnings and info
        const warnings = this.errors.filter(e => e.severity === 'warning');
        if (warnings.length > 0) {
          results.warnings.push({ rowNumber, warnings });
        }

        const infoMessages = this.errors.filter(e => e.severity === 'info');
        if (infoMessages.length > 0) {
          results.info.push({ rowNumber, messages: infoMessages });
        }
      } catch (error) {
        results.failed.push({
          rowNumber,
          data: null,
          errors: [{
            field: 'general',
            message: error.message,
            rowNumber,
            severity: 'error'
          }]
        });
      }
    }

    return results;
  }
}

// Static property to cache diagnosis codes
DataCleaner._diagnosisCodes = null;

export default DataCleaner;

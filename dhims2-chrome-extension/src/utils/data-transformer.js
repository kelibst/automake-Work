/**
 * Data Transformer - Chrome Extension Version
 * Cleans and transforms Excel data for DHIS2 form filling
 * Based on lib/data-cleaner.js logic
 */

class DataTransformer {
  constructor() {
    this.errors = [];
  }

  /**
   * Transform a single Excel row
   * @param {Object} excelRow - Raw Excel row object
   * @param {number} rowIndex - Row index for error reporting
   * @returns {Object} Transformed data with _NUMBER and _UNIT suffixes for age
   */
  transformRow(excelRow, rowIndex = 0) {
    this.errors = [];

    try {
      const transformed = { ...excelRow };

      // 1. Transform Education (SHS → SHS/Secondary)
      if (excelRow['Educational Status']) {
        transformed['Educational Status'] = this.transformEducation(excelRow['Educational Status']);
      }

      // 2. Transform Speciality (Accident Emergency → Casualty)
      if (excelRow['Speciality']) {
        transformed['Speciality'] = this.transformSpeciality(excelRow['Speciality']);
      }

      // 3. Transform Outcome (Referred → Transferred)
      if (excelRow['Outcome of Discharge']) {
        transformed['Outcome of Discharge'] = this.transformOutcome(excelRow['Outcome of Discharge']);
      }

      // 4. Transform Age - split into _NUMBER and _UNIT
      if (excelRow['Age']) {
        const ageResult = this.transformAge(excelRow['Age']);
        transformed['Age_NUMBER'] = ageResult.number;
        transformed['Age_UNIT'] = ageResult.unit;
      }

      // 5. Transform Gender (capitalize)
      if (excelRow['Gender']) {
        transformed['Gender'] = this.transformGender(excelRow['Gender']);
      }

      // 6. Transform Boolean fields
      if (excelRow['Surgical Procedure']) {
        transformed['Surgical Procedure'] = this.transformBoolean(excelRow['Surgical Procedure']);
      }

      if (excelRow['NHIS Status']) {
        transformed['NHIS Status'] = this.transformBoolean(excelRow['NHIS Status']);
      }

      // 7. Transform Occupation
      if (excelRow['Occupation']) {
        transformed['Occupation'] = this.transformOccupation(excelRow['Occupation']);
      }

      return {
        success: true,
        data: transformed,
        errors: this.errors
      };

    } catch (error) {
      return {
        success: false,
        data: excelRow,
        errors: [{
          field: 'general',
          message: error.message,
          rowIndex
        }]
      };
    }
  }

  /**
   * Transform education field
   * SHS → SHS/Secondary, JHS → JHS/Middle School
   */
  transformEducation(value) {
    if (!value) return value;

    const cleaned = value.toString().trim().toUpperCase();

    const mapping = {
      'SHS': 'SHS/Secondary',
      'JHS': 'JHS/Middle School',
      'TERTIARY': 'Tertiary',
      'SHS/SECONDARY': 'SHS/Secondary',
      'JHS/MIDDLE SCHOOL': 'JHS/Middle School',
      'NA': 'None',
      'N/A': 'None',
      'NONE': 'None',
      'BASIC': 'Primary School',
      'PRIMARY': 'Primary School',
      'PRIMARY SCHOOL': 'Primary School',
      'CHILD': 'Primary School'
    };

    const mapped = mapping[cleaned];
    if (mapped) {
      console.log(`📚 Education: "${value}" → "${mapped}"`);
      return mapped;
    }

    // Return as-is if no mapping found
    return value;
  }

  /**
   * Transform speciality field
   * Accident Emergency → Casualty, General → Casualty
   */
  transformSpeciality(value) {
    if (!value) return value;

    const cleaned = value.toString().trim();

    const mapping = {
      'Accident Emergency': 'Casualty',
      'ACCIDENT EMERGENCY': 'Casualty',
      'Casualty': 'Casualty',
      'CASUALTY': 'Casualty',
      'A&E': 'Casualty',
      'Emergency': 'Casualty',
      'EMERGENCY': 'Casualty',
      'General': 'Casualty',
      'GENERAL': 'Casualty',
      'general': 'Casualty'
    };

    const mapped = mapping[cleaned];
    if (mapped) {
      console.log(`🏥 Speciality: "${value}" → "${mapped}"`);
      return mapped;
    }

    // Return as-is if no mapping found
    return value;
  }

  /**
   * Transform outcome field
   * Referred → Transferred, Discharge → Discharged
   */
  transformOutcome(value) {
    if (!value) return value;

    const cleaned = value.toString().trim();

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
      'ABSCONDED': 'Absconded',
      'Unspecified': 'Unspecified',
      'UNSPECIFIED': 'Unspecified'
    };

    const mapped = mapping[cleaned];
    if (mapped) {
      console.log(`📋 Outcome: "${value}" → "${mapped}"`);
      return mapped;
    }

    // Return as-is if no mapping found
    return value;
  }

  /**
   * Transform age field
   * "20 Year(s)" → { number: "20", unit: "Years" }
   */
  transformAge(value) {
    if (!value) return { number: '', unit: '' };

    const ageString = value.toString().trim();

    // Extract number and unit using regex
    const match = ageString.match(/(\d+)\s*(Year|Month|Day)/i);

    if (!match) {
      console.warn(`⚠️ Invalid age format: "${ageString}"`);
      return { number: '', unit: '' };
    }

    const number = match[1];
    const unit = match[2].toLowerCase();

    // Normalize unit to capitalize first letter and add 's'
    const normalizedUnit = unit.charAt(0).toUpperCase() + unit.slice(1);
    const pluralUnit = normalizedUnit.endsWith('s') ? normalizedUnit : normalizedUnit + 's';

    console.log(`🎂 Age: "${ageString}" → number: "${number}", unit: "${pluralUnit}"`);

    return {
      number: number,
      unit: pluralUnit
    };
  }

  /**
   * Transform gender field
   * Capitalize first letter: male → Male, female → Female
   */
  transformGender(value) {
    if (!value) return value;

    const cleaned = value.toString().trim();
    const normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();

    if (normalized !== cleaned) {
      console.log(`👤 Gender: "${value}" → "${normalized}"`);
    }

    return normalized;
  }

  /**
   * Transform boolean field
   * Yes/No → true/false or Yes/No (keeps as string for form filling)
   */
  transformBoolean(value) {
    if (!value) return value;

    const cleaned = value.toString().trim().toLowerCase();

    const mapping = {
      'yes': 'Yes',
      'y': 'Yes',
      'true': 'Yes',
      '1': 'Yes',
      'no': 'No',
      'n': 'No',
      'false': 'No',
      '0': 'No'
    };

    const mapped = mapping[cleaned];
    if (mapped) {
      if (mapped !== value) {
        console.log(`✓ Boolean: "${value}" → "${mapped}"`);
      }
      return mapped;
    }

    // Return as-is if no mapping found
    return value;
  }

  /**
   * Transform occupation field
   * Clean up common variations
   */
  transformOccupation(value) {
    if (!value) return value;

    let cleaned = value.toString().trim();

    // Common mappings
    const mappings = {
      'PENSIONIER': 'Pensioner',
      'PENSIONER': 'Pensioner',
      'TRADER': 'Trader / Shop Assistant',
      'TEACHER': 'Teacher',
      'STUDENT': 'Student',
      'FARMER': 'Farmer'
    };

    const upperValue = cleaned.toUpperCase();
    if (mappings[upperValue]) {
      const mapped = mappings[upperValue];
      console.log(`💼 Occupation: "${value}" → "${mapped}"`);
      return mapped;
    }

    return cleaned;
  }

  /**
   * Transform all rows in a dataset
   * @param {Array} rows - Array of Excel row objects
   * @returns {Array} Array of transformed rows
   */
  transformAll(rows) {
    console.log(`🔄 Transforming ${rows.length} rows...`);

    const results = rows.map((row, index) => {
      const result = this.transformRow(row, index);
      return result.data;
    });

    console.log(`✅ Transformation complete!`);
    return results;
  }
}

// Export for use in other modules
export default DataTransformer;

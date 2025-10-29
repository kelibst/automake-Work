/**
 * Recommendation Engine
 * Provides helpful suggestions for fixing validation errors
 */

export class RecommendationEngine {
  /**
   * Get recommendation for a validation error
   * @param {String} fieldName - Field that failed validation
   * @param {*} value - The invalid value
   * @param {String} errorMessage - The error message
   * @returns {Object|null} Recommendation object or null
   */
  static getRecommendation(fieldName, value, errorMessage) {
    const recommendations = {
      patientNumber: {
        pattern: 'At least 6 characters',
        examples: ['VR-A01-AAG1234', 'PAT-123456', 'ABCDEF'],
        note: 'Patient numbers come from the system and should be at least 6 characters long. The format varies by facility.'
      },

      education: {
        validValues: ['NONE', 'PRIMARY', 'JHS', 'SHS', 'TERTIARY'],
        commonMappings: {
          'BASIC': 'PRIMARY or JHS',
          'ELEMENTARY': 'PRIMARY',
          'JUNIOR HIGH': 'JHS',
          'JUNIOR SECONDARY': 'JHS',
          'SENIOR HIGH': 'SHS',
          'SENIOR SECONDARY': 'SHS',
          'SECONDARY': 'SHS',
          'UNIVERSITY': 'TERTIARY',
          'COLLEGE': 'TERTIARY',
          'DIPLOMA': 'TERTIARY'
        },
        suggestedFix: this.fixEducation(value),
        note: 'If unsure, use PRIMARY for basic education or SHS for secondary'
      },

      age: {
        pattern: 'Must be a number between 0 and 150',
        note: 'Check if age was entered in wrong format (e.g., "45 years" instead of "45")',
        suggestedFix: this.extractAge(value)
      },

      gender: {
        validValues: ['MALE', 'FEMALE'],
        commonMappings: {
          'M': 'MALE',
          'F': 'FEMALE',
          'MAN': 'MALE',
          'WOMAN': 'FEMALE',
          'BOY': 'MALE',
          'GIRL': 'FEMALE'
        },
        suggestedFix: this.fixGender(value)
      },

      dateOfAdmission: {
        pattern: 'Must be valid date in format DD/MM/YYYY or YYYY-MM-DD',
        examples: ['29/10/2025', '2025-10-29'],
        note: 'Date must be in the past and after 1900',
        suggestedFix: this.fixDate(value)
      },

      dateOfDischarge: {
        pattern: 'Must be valid date after admission date',
        examples: ['29/10/2025', '2025-10-29'],
        note: 'Discharge date must be same day or after admission date',
        suggestedFix: this.fixDate(value)
      },

      principalDiagnosis: {
        pattern: 'Must be valid ICD-10 code',
        note: 'Check auto-fixed suggestions above for closest matches',
        examples: ['I64', 'J18.9', 'A09', 'E11.9'],
        tip: 'If code not found, check if it needs to be shortened (e.g., I64.00 → I64)'
      },

      additionalDiagnosis: {
        pattern: 'Must be valid ICD-10 code or empty',
        note: 'This field is optional. Leave blank if no additional diagnosis',
        examples: ['I64', 'J18.9', 'A09', 'E11.9']
      },

      occupation: {
        validValues: ['FARMER', 'TRADER', 'STUDENT', 'TEACHER', 'DRIVER', 'NURSE', 'DOCTOR', 'OTHER', 'UNEMPLOYED'],
        note: 'Select the occupation category that best matches',
        suggestedFix: this.fixOccupation(value)
      },

      speciality: {
        validValues: ['MEDICAL', 'SURGICAL', 'OBSTETRICS', 'GYNAECOLOGY', 'PAEDIATRICS', 'OTHER'],
        note: 'Select the medical department',
        commonMappings: {
          'MEDICINE': 'MEDICAL',
          'SURGERY': 'SURGICAL',
          'OBS': 'OBSTETRICS',
          'GYNAE': 'GYNAECOLOGY',
          'PAEDS': 'PAEDIATRICS',
          'PEDIATRICS': 'PAEDIATRICS'
        },
        suggestedFix: this.fixSpeciality(value)
      },

      outcome: {
        validValues: ['RECOVERED', 'IMPROVED', 'DIED', 'REFERRED', 'ABSCONDED'],
        commonMappings: {
          'DISCHARGED': 'RECOVERED',
          'CURED': 'RECOVERED',
          'BETTER': 'IMPROVED',
          'DEATH': 'DIED',
          'DEAD': 'DIED',
          'TRANSFERRED': 'REFERRED',
          'ESCAPED': 'ABSCONDED',
          'LEFT': 'ABSCONDED'
        },
        suggestedFix: this.fixOutcome(value)
      },

      nhisStatus: {
        validValues: ['YES', 'NO'],
        commonMappings: {
          'INSURED': 'YES',
          'UNINSURED': 'NO',
          'TRUE': 'YES',
          'FALSE': 'NO',
          '1': 'YES',
          '0': 'NO'
        },
        suggestedFix: this.fixNhisStatus(value)
      },

      surgicalProcedure: {
        validValues: ['YES', 'NO'],
        commonMappings: {
          'TRUE': 'YES',
          'FALSE': 'NO',
          '1': 'YES',
          '0': 'NO',
          'DONE': 'YES',
          'NONE': 'NO'
        },
        suggestedFix: this.fixYesNo(value)
      }
    };

    return recommendations[fieldName] || {
      note: 'Please check the value and ensure it matches the expected format',
      tip: 'Refer to the sample Excel template for correct format'
    };
  }

  // Helper methods for auto-fix suggestions

  static fixPatientNumber(value) {
    if (!value) return null;
    const str = String(value).toUpperCase().trim();

    // If starts with wrong prefix, try to fix
    if (str.match(/^[A-Z]{2}-/)) {
      return str.replace(/^[A-Z]{2}-/, 'VR-A');
    }

    return null;
  }

  static fixEducation(value) {
    if (!value) return null;
    const str = String(value).toUpperCase().trim();

    const mappings = {
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

    return mappings[str] || null;
  }

  static extractAge(value) {
    if (!value) return null;
    const str = String(value);
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  static fixGender(value) {
    if (!value) return null;
    const str = String(value).toUpperCase().trim();

    const mappings = {
      'M': 'MALE',
      'F': 'FEMALE',
      'MAN': 'MALE',
      'WOMAN': 'FEMALE',
      'BOY': 'MALE',
      'GIRL': 'FEMALE'
    };

    return mappings[str] || null;
  }

  static fixDate(value) {
    if (!value) return null;
    // This is just a suggestion - actual date parsing should be done by validator
    return 'Check date format: DD/MM/YYYY or YYYY-MM-DD';
  }

  static fixOccupation(value) {
    if (!value) return null;
    const str = String(value).toUpperCase().trim();

    // If contains certain keywords, map to category
    if (str.includes('FARM')) return 'FARMER';
    if (str.includes('TRADE') || str.includes('BUSINESS')) return 'TRADER';
    if (str.includes('STUDENT') || str.includes('SCHOOL')) return 'STUDENT';
    if (str.includes('TEACH')) return 'TEACHER';
    if (str.includes('DRIV')) return 'DRIVER';
    if (str.includes('NURS')) return 'NURSE';
    if (str.includes('DOCTOR') || str.includes('PHYSICIAN')) return 'DOCTOR';
    if (str.includes('UNEMPLOY') || str.includes('JOBLESS')) return 'UNEMPLOYED';

    return 'OTHER';
  }

  static fixSpeciality(value) {
    if (!value) return null;
    const str = String(value).toUpperCase().trim();

    const mappings = {
      'MEDICINE': 'MEDICAL',
      'SURGERY': 'SURGICAL',
      'OBS': 'OBSTETRICS',
      'GYNAE': 'GYNAECOLOGY',
      'GYNAECOLOGY': 'GYNAECOLOGY',
      'PAEDS': 'PAEDIATRICS',
      'PEDIATRICS': 'PAEDIATRICS'
    };

    return mappings[str] || null;
  }

  static fixOutcome(value) {
    if (!value) return null;
    const str = String(value).toUpperCase().trim();

    const mappings = {
      'DISCHARGED': 'RECOVERED',
      'CURED': 'RECOVERED',
      'BETTER': 'IMPROVED',
      'DEATH': 'DIED',
      'DEAD': 'DIED',
      'TRANSFERRED': 'REFERRED',
      'ESCAPED': 'ABSCONDED',
      'LEFT': 'ABSCONDED'
    };

    return mappings[str] || null;
  }

  static fixNhisStatus(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).toUpperCase().trim();

    const mappings = {
      'INSURED': 'YES',
      'UNINSURED': 'NO',
      'TRUE': 'YES',
      'FALSE': 'NO',
      '1': 'YES',
      '0': 'NO',
      'Y': 'YES',
      'N': 'NO'
    };

    return mappings[str] || null;
  }

  static fixYesNo(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).toUpperCase().trim();

    const mappings = {
      'TRUE': 'YES',
      'FALSE': 'NO',
      '1': 'YES',
      '0': 'NO',
      'DONE': 'YES',
      'NONE': 'NO',
      'Y': 'YES',
      'N': 'NO'
    };

    return mappings[str] || null;
  }
}

export default RecommendationEngine;

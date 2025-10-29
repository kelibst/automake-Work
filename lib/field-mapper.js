/**
 * Field Mapper Module
 * Maps Excel columns to DHIS2 data elements
 */

// Complete field mapping configuration
const FIELD_MAPPINGS = {
  patientNumber: {
    excelColumn: 'Patient No.',
    dataElement: 'h0Ef6ykTpNB',
    type: 'text',
    required: true
  },
  address: {
    excelColumn: 'Locality/Address/Residence',
    dataElement: 'nk15h7fzCLz',
    type: 'text',
    required: true
  },
  ageNumber: {
    excelColumn: 'Age',
    dataElement: 'upqhIcii1iC',
    type: 'number',
    required: true,
    extractFrom: 'age'
  },
  ageUnit: {
    excelColumn: 'Age',
    dataElement: 'WZ5rS7QuECT',
    type: 'dropdown',
    required: true,
    extractFrom: 'age',
    options: ['years', 'months', 'days']
  },
  gender: {
    excelColumn: 'Gender',
    dataElement: 'fg8sMCaTOrK',
    type: 'dropdown',
    required: true,
    options: ['Male', 'Female']
  },
  occupation: {
    excelColumn: 'Occupation',
    dataElement: 'qAWldjTeMIs',
    type: 'dropdown',
    required: true
  },
  education: {
    excelColumn: 'Educational Status',
    dataElement: 'Hi8Cp84CnZQ',
    type: 'dropdown',
    required: true,
    mapping: {
      'SHS': 'SHS/Secondary',
      'JHS': 'JHS/Middle School',
      'Tertiary': 'Tertiary'
    }
  },
  dateOfAdmission: {
    excelColumn: 'Date of Admission',
    dataElement: 'HsMaBh3wKed',
    type: 'date',
    required: true
  },
  dateOfDischarge: {
    excelColumn: 'Date of Discharge',
    dataElement: 'sIPe9r0NBbq',
    type: 'date',
    required: true
  },
  speciality: {
    excelColumn: 'Speciality',
    dataElement: 'xpzJAQC4DGe',
    type: 'dropdown',
    required: true,
    mapping: {
      'Accident Emergency': 'Casualty',
      'Casualty': 'Casualty'
    }
  },
  outcome: {
    excelColumn: 'Outcome of Discharge',
    dataElement: 'OMN7CVW4IaY',
    type: 'dropdown',
    required: true,
    options: ['Absconded', 'Discharged', 'Transferred', 'Unspecified', 'Died'],
    mapping: {
      'Referred': 'Transferred',
      'Discharge': 'Discharged',
      'Discharged': 'Discharged',
      'Transferred': 'Transferred',
      'Died': 'Died'
    }
  },
  principalDiagnosis: {
    excelColumn: 'Principal Diagnosis',
    dataElement: 'yPXPzceTIvq',
    type: 'searchable',
    required: true
  },
  additionalDiagnosis: {
    excelColumn: 'Additional Diagnosis',
    dataElement: 'O15UNfCqavW',
    type: 'searchable',
    required: false
  },
  surgicalProcedure: {
    excelColumn: 'Surgical Procedure',
    dataElement: 'dsVClbnOnm6',
    type: 'boolean',
    required: true,
    mapping: {
      'Yes': 'true',
      'No': 'false',
      'true': 'true',
      'false': 'false'
    }
  },
  cost: {
    excelColumn: 'Cost of Treatment',
    dataElement: 'fRkwcThGCTM',
    type: 'number',
    required: false
  },
  nhisStatus: {
    excelColumn: 'NHIS Status',
    dataElement: 'ETSl9Q3SUOG',
    type: 'boolean',
    required: true,
    mapping: {
      'Yes': 'true',
      'No': 'false',
      'true': 'true',
      'false': 'false'
    }
  }
};

// Fixed fields that are the same for all records
const FIXED_FIELDS = {
  orgUnit: 'duCDqCRlWG1',
  program: 'fFYTJRzD2qq',
  programStage: 'LR7JT7ZNg8E',
  status: 'COMPLETED',
  notes: []
};

class FieldMapper {
  constructor() {
    this.mappings = FIELD_MAPPINGS;
    this.fixedFields = FIXED_FIELDS;
  }

  /**
   * Get data element ID for a field name
   * @param {string} fieldName - Internal field name (e.g., 'patientNumber')
   * @returns {string} Data element ID
   */
  getDataElementId(fieldName) {
    const mapping = this.mappings[fieldName];
    if (!mapping) {
      throw new Error(`Unknown field: ${fieldName}`);
    }
    return mapping.dataElement;
  }

  /**
   * Get Excel column name for a field
   * @param {string} fieldName - Internal field name
   * @returns {string} Excel column name
   */
  getExcelColumn(fieldName) {
    const mapping = this.mappings[fieldName];
    if (!mapping) {
      throw new Error(`Unknown field: ${fieldName}`);
    }
    return mapping.excelColumn;
  }

  /**
   * Get field mapping by Excel column name
   * @param {string} columnName - Excel column name
   * @returns {Object} Field mapping object
   */
  getFieldByExcelColumn(columnName) {
    const fieldName = Object.keys(this.mappings).find(
      key => this.mappings[key].excelColumn === columnName
    );

    if (!fieldName) {
      return null;
    }

    return {
      fieldName,
      ...this.mappings[fieldName]
    };
  }

  /**
   * Get all required fields
   * @returns {Array} Array of required field names
   */
  getRequiredFields() {
    return Object.keys(this.mappings).filter(
      key => this.mappings[key].required
    );
  }

  /**
   * Get all optional fields
   * @returns {Array} Array of optional field names
   */
  getOptionalFields() {
    return Object.keys(this.mappings).filter(
      key => !this.mappings[key].required
    );
  }

  /**
   * Get all expected Excel columns
   * @returns {Array} Array of Excel column names
   */
  getExpectedExcelColumns() {
    // Get unique column names (some fields share the same column like Age)
    const columns = Object.values(this.mappings).map(m => m.excelColumn);
    return [...new Set(columns)];
  }

  /**
   * Map Excel row to DHIS2 dataValues array
   * @param {Object} excelRow - Single row from Excel
   * @param {Object} cleanedData - Cleaned data from DataCleaner
   * @returns {Array} Array of dataValue objects
   */
  mapToDataValues(cleanedData) {
    const dataValues = [];

    // Add all fields
    Object.keys(this.mappings).forEach(fieldName => {
      const mapping = this.mappings[fieldName];
      const value = cleanedData[fieldName];

      // Skip optional fields if not provided
      if (!mapping.required && (value === null || value === undefined || value === '')) {
        return;
      }

      // Add to dataValues
      dataValues.push({
        dataElement: mapping.dataElement,
        value: value !== null && value !== undefined ? value.toString() : ''
      });
    });

    return dataValues;
  }

  /**
   * Create complete DHIS2 event object
   * @param {Object} cleanedData - Cleaned data from DataCleaner
   * @returns {Object} Complete event object
   */
  createEvent(cleanedData) {
    return {
      orgUnit: this.fixedFields.orgUnit,
      occurredAt: cleanedData.dateOfAdmission, // Use admission date as event date
      status: this.fixedFields.status,
      notes: this.fixedFields.notes,
      program: this.fixedFields.program,
      programStage: this.fixedFields.programStage,
      dataValues: this.mapToDataValues(cleanedData)
    };
  }

  /**
   * Create DHIS2 payload for batch upload
   * @param {Array} cleanedRecords - Array of cleaned data objects
   * @returns {Object} Complete payload for DHIS2 API
   */
  createBatchPayload(cleanedRecords) {
    return {
      events: cleanedRecords.map(record => this.createEvent(record))
    };
  }

  /**
   * Get field mapping by data element ID
   * @param {string} dataElementId - DHIS2 data element ID
   * @returns {Object} Field mapping object
   */
  getFieldByDataElement(dataElementId) {
    const fieldName = Object.keys(this.mappings).find(
      key => this.mappings[key].dataElement === dataElementId
    );

    if (!fieldName) {
      return null;
    }

    return {
      fieldName,
      ...this.mappings[fieldName]
    };
  }

  /**
   * Validate that all required fields are present in cleaned data
   * @param {Object} cleanedData - Cleaned data object
   * @returns {Object} Validation result
   */
  validateRequiredFields(cleanedData) {
    const requiredFields = this.getRequiredFields();
    const missingFields = [];

    requiredFields.forEach(fieldName => {
      const value = cleanedData[fieldName];
      if (value === null || value === undefined || value === '') {
        const mapping = this.mappings[fieldName];
        missingFields.push({
          fieldName,
          excelColumn: mapping.excelColumn,
          dataElement: mapping.dataElement
        });
      }
    });

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Get mapping configuration as JSON
   * @returns {Object} Complete mapping configuration
   */
  getConfiguration() {
    return {
      fieldMappings: this.mappings,
      fixedFields: this.fixedFields,
      totalFields: Object.keys(this.mappings).length,
      requiredFields: this.getRequiredFields().length,
      optionalFields: this.getOptionalFields().length,
      expectedExcelColumns: this.getExpectedExcelColumns()
    };
  }

  /**
   * Get human-readable field description
   * @param {string} fieldName - Internal field name
   * @returns {string} Description
   */
  getFieldDescription(fieldName) {
    const descriptions = {
      patientNumber: 'Patient identification number (e.g., VR-A01-AAG3356)',
      address: 'Patient residential address or locality',
      ageNumber: 'Patient age as a number',
      ageUnit: 'Age unit: years, months, or days',
      gender: 'Patient gender: Male or Female',
      occupation: 'Patient occupation or profession',
      education: 'Highest educational level attained',
      dateOfAdmission: 'Date patient was admitted (ISO format: YYYY-MM-DD)',
      dateOfDischarge: 'Date patient was discharged (ISO format: YYYY-MM-DD)',
      speciality: 'Hospital department or speciality',
      outcome: 'Discharge outcome: Discharged, Transferred, Died, etc.',
      principalDiagnosis: 'Primary diagnosis with ICD code',
      additionalDiagnosis: 'Secondary diagnosis with ICD code (optional)',
      surgicalProcedure: 'Whether patient underwent surgery: true/false',
      cost: 'Total cost of treatment (optional)',
      nhisStatus: 'National Health Insurance status: true/false'
    };

    return descriptions[fieldName] || 'No description available';
  }
}

module.exports = FieldMapper;
module.exports.FIELD_MAPPINGS = FIELD_MAPPINGS;
module.exports.FIXED_FIELDS = FIXED_FIELDS;

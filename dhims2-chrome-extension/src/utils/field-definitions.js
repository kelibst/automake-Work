/**
 * Field Definitions - Predefined Excel to DHIS2 Field Mappings
 * This defines the expected Excel structure and how it maps to DHIS2
 *
 * Source: Discovered from DHIS2 API and validated against Excel template
 * Last Updated: 2025-10-29
 */

export const FIELD_MAPPINGS = {
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
    extractFrom: 'age'  // Needs special handling - split from "45 years"
  },
  ageUnit: {
    excelColumn: 'Age',
    dataElement: 'WZ5rS7QuECT',
    type: 'dropdown',
    required: true,
    extractFrom: 'age',  // Needs special handling - split from "45 years"
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
    options: ['None', 'PRIMARY', 'JHS', 'SHS', 'Tertiary']
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
    options: ['Casualty', 'Medical', 'Surgical', 'Obstetrics', 'Gynaecology', 'Paediatrics']
  },
  outcome: {
    excelColumn: 'Outcome of Discharge',
    dataElement: 'OMN7CVW4IaY',
    type: 'dropdown',
    required: true,
    options: ['Absconded', 'Discharged', 'Transferred', 'Unspecified', 'Died']
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
    type: 'radio',
    required: true,
    options: ['true', 'false']
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
    type: 'radio',
    required: true,
    options: ['true', 'false']
  }
};

export const STATIC_VALUES = {
  program: 'fFYTJRzD2qq',
  orgUnit: 'duCDqCRlWG1',
  programStage: 'LR7JT7ZNg8E',
  status: 'COMPLETED'
};

/**
 * Get field definition by Excel column name
 */
export function getFieldByExcelColumn(excelColumn) {
  return Object.entries(FIELD_MAPPINGS).find(
    ([_, config]) => config.excelColumn === excelColumn
  )?.[0];
}

/**
 * Get field definition by data element ID
 */
export function getFieldByDataElement(dataElementId) {
  return Object.entries(FIELD_MAPPINGS).find(
    ([_, config]) => config.dataElement === dataElementId
  )?.[0];
}

/**
 * Get all Excel column names in expected order
 */
export function getAllExcelColumns() {
  return Object.values(FIELD_MAPPINGS).map(config => config.excelColumn);
}

/**
 * Get all required Excel columns
 */
export function getRequiredExcelColumns() {
  return Object.values(FIELD_MAPPINGS)
    .filter(config => config.required)
    .map(config => config.excelColumn);
}

/**
 * Validate API discovery against expected configuration
 */
export function validateDiscoveredConfig(discoveredFieldMappings) {
  const warnings = [];
  const errors = [];

  // Check if discovered data elements match expected
  Object.entries(FIELD_MAPPINGS).forEach(([fieldName, expected]) => {
    const discoveredField = Object.entries(discoveredFieldMappings).find(
      ([dataElementId, _]) => dataElementId === expected.dataElement
    );

    if (!discoveredField) {
      if (expected.required) {
        errors.push(`Missing required field: ${fieldName} (${expected.dataElement})`);
      } else {
        warnings.push(`Missing optional field: ${fieldName} (${expected.dataElement})`);
      }
    }
  });

  // Check for unexpected fields
  Object.keys(discoveredFieldMappings).forEach(dataElementId => {
    const isExpected = Object.values(FIELD_MAPPINGS).some(
      config => config.dataElement === dataElementId
    );

    if (!isExpected) {
      warnings.push(`Unexpected field discovered: ${dataElementId}`);
    }
  });

  return { warnings, errors, isValid: errors.length === 0 };
}

export default { FIELD_MAPPINGS, STATIC_VALUES, getFieldByExcelColumn, getFieldByDataElement, getAllExcelColumns, getRequiredExcelColumns, validateDiscoveredConfig };

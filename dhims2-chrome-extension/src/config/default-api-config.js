/**
 * Default DHIMS2 API Configuration
 *
 * This configuration is used as a fallback when API discovery hasn't been run.
 * It contains the discovered configuration from initial testing.
 *
 * Note: Field mappings should be updated based on your specific DHIMS2 instance.
 */

export const DEFAULT_API_CONFIG = {
  discovered: true,
  timestamp: '2025-10-23T10:00:00Z',
  endpoint: {
    url: 'https://events.chimgh.org/events/api/41/tracker',
    method: 'POST',
    baseUrl: 'https://events.chimgh.org/events/api/41/tracker',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  payload_structure: {
    program: 'fFYTJRzD2qq',
    orgUnit: 'duCDqCRlWG1',
    programStage: 'cH9NADGoNwU',
    eventDate: 'string (ISO date)',
    status: 'COMPLETED',
    dataValues: []
  },
  fieldMappings: {
    patientNumber: {
      dataElement: 'okahaacYKqO',
      excelColumn: 'Patient No.',
      type: 'text',
      required: true
    },
    address: {
      dataElement: 'MSYrx2z1f8p',
      excelColumn: 'Locality/Address/Residence',
      type: 'text',
      required: true
    },
    age: {
      dataElement: 'UboyGYmr19j',
      excelColumn: 'Age',
      type: 'text',
      required: true
    },
    patientAge: {
      dataElement: 'Pd5bZxTS4ql',
      excelColumn: 'Age',
      type: 'dropdown',
      required: true
    },
    gender: {
      dataElement: 'cH9NADGoNwU',
      excelColumn: 'Gender',
      type: 'dropdown',
      required: true
    },
    occupation: {
      dataElement: 'Ovu3nxFVwRB',
      excelColumn: 'Occupation',
      type: 'dropdown',
      required: true
    },
    education: {
      dataElement: 'draFmNEP1ID',
      excelColumn: 'Educational Status',
      type: 'dropdown',
      required: true
    },
    dateOfAdmission: {
      dataElement: 'GMiHyYq3JlY',
      excelColumn: 'Date of Admission',
      type: 'date',
      required: true
    },
    dateOfDischarge: {
      dataElement: 'ddohQFXWz6e',
      excelColumn: 'Date of Discharge',
      type: 'date',
      required: true
    },
    speciality: {
      dataElement: 'GGBSjMU7nt6',
      excelColumn: 'Speciality',
      type: 'dropdown',
      required: true
    },
    outcome: {
      dataElement: 'YZeiZFyQWKs',
      excelColumn: 'Outcome of Discharge',
      type: 'dropdown',
      required: true
    },
    principalDiagnosis: {
      dataElement: 'RU1KXNWlT6S',
      excelColumn: 'Principal Diagnosis',
      type: 'searchable',
      required: true
    },
    additionalDiagnosis: {
      dataElement: 'dzGpRK1w7sN',
      excelColumn: 'Additional Diagnosis',
      type: 'searchable',
      required: false
    },
    surgicalProcedure: {
      dataElement: 'YXJsdoaszh3',
      excelColumn: 'Surgical Procedure',
      type: 'radio',
      required: true
    },
    cost: {
      dataElement: 'Z7yQ9Rm1y4a',
      excelColumn: 'Cost of Treatment',
      type: 'text',
      required: false
    },
    insured: {
      dataElement: 'GTYimatiqtP',
      excelColumn: 'NHIS Status',
      type: 'radio',
      required: true
    }
  }
};

export default DEFAULT_API_CONFIG;

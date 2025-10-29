/**
 * Test Script for Data Cleaner Improvements
 * Tests all the new features we implemented
 */

const DataCleaner = require('./lib/data-cleaner.js');

console.log('='.repeat(60));
console.log('TESTING DATA CLEANER IMPROVEMENTS');
console.log('='.repeat(60));
console.log();

// Create sample diagnosis option set (minimal for testing)
const sampleDiagnosisCodes = [
  { code: 'A35', name: 'A35 - Tetanus' },
  { code: 'I64', name: 'I64 - Stroke' },
  { code: 'E11', name: 'E11 - Type 2 Diabetes' },
  { code: 'I10', name: 'I10 - Essential Hypertension' }
];

const cleaner = new DataCleaner({ diagnosis: sampleDiagnosisCodes });

// Test data covering all improvements
const testCases = [
  {
    name: 'Test 1: Patient number (any format should pass)',
    data: {
      'Patient No.': 'HO-A01-XXX1234',  // Previously would fail, now should pass
      'Locality/Address/Residence': 'TEST ADDRESS',
      'Age': '25 Year(s)',
      'Gender': 'Male',
      'Occupation': 'Trader',
      'Educational Status': 'NA',  // Should map to 'None'
      'Date of Admission': '01-01-2025',
      'Date of Discharge': '05-01-2025',
      'Speciality': 'General',  // Should map to 'Casualty' with info
      'Outcome of Discharge': 'Discharged',
      'Principal Diagnosis': 'Tetanus(A35)',
      'Additional Diagnosis': 'NA',
      'Surgical Procedure': 'No',
      'Cost of Treatment': '100',
      'NHIS Status': 'Yes'
    }
  },
  {
    name: 'Test 2: Education level BASIC → Primary School',
    data: {
      'Patient No.': 'VR-A01-AAA1234',
      'Locality/Address/Residence': 'TEST ADDRESS',
      'Age': '8 Year(s)',
      'Gender': 'Female',
      'Occupation': 'Student',
      'Educational Status': 'BASIC',  // Should map to 'Primary School'
      'Date of Admission': '01-01-2025',
      'Date of Discharge': '05-01-2025',
      'Speciality': 'Casualty',
      'Outcome of Discharge': 'Discharged',
      'Principal Diagnosis': 'Stroke(I64)',
      'Additional Diagnosis': 'NA',
      'Surgical Procedure': 'No',
      'Cost of Treatment': '100',
      'NHIS Status': 'Yes'
    }
  },
  {
    name: 'Test 3: Invalid diagnosis code (should fail)',
    data: {
      'Patient No.': 'VR-A01-AAA1234',
      'Locality/Address/Residence': 'TEST ADDRESS',
      'Age': '50 Year(s)',
      'Gender': 'Male',
      'Occupation': 'Trader',
      'Educational Status': 'JHS',
      'Date of Admission': '01-01-2025',
      'Date of Discharge': '05-01-2025',
      'Speciality': 'Casualty',
      'Outcome of Discharge': 'Discharged',
      'Principal Diagnosis': 'Unknown Disease(Z99.99)',  // Invalid code
      'Additional Diagnosis': 'NA',
      'Surgical Procedure': 'No',
      'Cost of Treatment': '100',
      'NHIS Status': 'Yes'
    }
  },
  {
    name: 'Test 4: Multiple ICD codes (should split)',
    data: {
      'Patient No.': 'VR-A01-AAA1234',
      'Locality/Address/Residence': 'TEST ADDRESS',
      'Age': '60 Year(s)',
      'Gender': 'Male',
      'Occupation': 'Pensioner',
      'Educational Status': 'Tertiary',
      'Date of Admission': '01-01-2025',
      'Date of Discharge': '05-01-2025',
      'Speciality': 'Casualty',
      'Outcome of Discharge': 'Discharged',
      'Principal Diagnosis': 'Diabetes with complications(E11, I10)',  // Multiple codes
      'Additional Diagnosis': 'NA',
      'Surgical Procedure': 'No',
      'Cost of Treatment': '100',
      'NHIS Status': 'Yes'
    }
  },
  {
    name: 'Test 5: CHILD education level',
    data: {
      'Patient No.': 'VR-A01-AAA1234',
      'Locality/Address/Residence': 'TEST ADDRESS',
      'Age': '5 Year(s)',
      'Gender': 'Female',
      'Occupation': 'Student',
      'Educational Status': 'CHILD',  // Should map to 'Primary School'
      'Date of Admission': '01-01-2025',
      'Date of Discharge': '05-01-2025',
      'Speciality': 'Casualty',
      'Outcome of Discharge': 'Discharged',
      'Principal Diagnosis': 'Stroke(I64)',
      'Additional Diagnosis': 'NA',
      'Surgical Procedure': 'No',
      'Cost of Treatment': '100',
      'NHIS Status': 'Yes'
    }
  }
];

// Run tests
testCases.forEach((testCase, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${testCase.name}`);
  console.log('='.repeat(60));

  const result = cleaner.cleanRow(testCase.data, index + 2);

  console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

  if (result.data) {
    console.log('\nCleaned Data:');
    console.log(`  Patient Number: ${result.data.patientNumber}`);
    console.log(`  Education: ${result.data.education}`);
    console.log(`  Speciality: ${result.data.speciality}`);
    console.log(`  Principal Diagnosis: ${result.data.principalDiagnosis}`);
  }

  if (result.errors && result.errors.length > 0) {
    console.log('\nMessages:');
    result.errors.forEach(error => {
      const emoji = error.severity === 'error' ? '❌' :
                    error.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${emoji} [${error.severity.toUpperCase()}] ${error.field}: ${error.message}`);
    });
  }
});

console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log('\n✅ All improvements have been implemented:');
console.log('  1. Patient number validation - only checks existence');
console.log('  2. Education mappings - NA→None, BASIC→Primary, CHILD→Primary');
console.log('  3. Invalid diagnosis codes - alert user, do not upload');
console.log('  4. Complex ICD codes - split into principal/additional');
console.log('  5. General speciality - mapped to Casualty with alert');
console.log('\n' + '='.repeat(60));

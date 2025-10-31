/**
 * Test: Automatic Date Field (occurredAt)
 *
 * This script verifies that the occurredAt field is automatically
 * filled with the current date instead of using the admission date.
 */

const FieldMapper = require('./lib/field-mapper.js');

// Sample cleaned data (simulating a record from Excel)
const sampleRecord = {
  patientNumber: 'VR-A01-AAG3356',
  address: 'NEW BAIKA',
  ageNumber: '20',
  ageUnit: 'years',
  gender: 'Male',
  occupation: 'Student',
  education: 'SHS/Secondary',
  dateOfAdmission: '2025-06-26',  // June 26, 2025 (admission date)
  dateOfDischarge: '2025-06-27',  // June 27, 2025 (discharge date)
  speciality: 'Casualty',
  outcome: 'Transferred',
  principalDiagnosis: 'A35 - Tetanus',
  additionalDiagnosis: null,
  surgicalProcedure: 'false',
  cost: null,
  nhisStatus: 'false'
};

console.log('🧪 Testing Automatic Date Field\n');
console.log('═'.repeat(60));

// Get today's date for comparison
const today = new Date().toISOString().split('T')[0];
console.log(`\n📅 Today's Date: ${today}`);
console.log(`📅 Admission Date (from Excel): ${sampleRecord.dateOfAdmission}`);

// Create field mapper instance
const mapper = new FieldMapper();

// Create event using the field mapper
const event = mapper.createEvent(sampleRecord);

console.log('\n' + '─'.repeat(60));
console.log('📦 Generated Event Object:');
console.log('─'.repeat(60));
console.log(JSON.stringify(event, null, 2));

console.log('\n' + '═'.repeat(60));
console.log('🔍 Verification:');
console.log('═'.repeat(60));

// Verify occurredAt is set to today's date
console.log(`\n✓ Event occurredAt: ${event.occurredAt}`);
console.log(`✓ Today's date:     ${today}`);

if (event.occurredAt === today) {
  console.log('\n✅ SUCCESS: occurredAt is correctly set to current date!');
} else {
  console.log('\n❌ FAILED: occurredAt does not match current date');
  console.log(`   Expected: ${today}`);
  console.log(`   Got:      ${event.occurredAt}`);
}

// Verify admission date is still in dataValues
const admissionDateValue = event.dataValues.find(
  dv => dv.dataElement === 'HsMaBh3wKed'
);

console.log(`\n✓ Date of Admission data element: ${admissionDateValue?.value || 'NOT FOUND'}`);

if (admissionDateValue && admissionDateValue.value === sampleRecord.dateOfAdmission) {
  console.log('✅ SUCCESS: Date of Admission is correctly preserved in dataValues!');
} else {
  console.log('❌ FAILED: Date of Admission is missing or incorrect');
}

console.log('\n' + '═'.repeat(60));
console.log('📊 Summary:');
console.log('═'.repeat(60));
console.log(`
Field Separation Test:
  occurredAt (event date)     = ${event.occurredAt} (automatic - current date)
  Date of Admission (data)    = ${admissionDateValue?.value} (from Excel)
  Date of Discharge (data)    = ${event.dataValues.find(dv => dv.dataElement === 'sIPe9r0NBbq')?.value}

Expected Behavior:
  ✓ occurredAt should be TODAY (${today})
  ✓ Date of Admission should be from Excel (${sampleRecord.dateOfAdmission})
  ✓ These should be DIFFERENT values (unless uploaded on admission day)

Actual Behavior:
  ${event.occurredAt === today ? '✅' : '❌'} occurredAt matches today
  ${admissionDateValue?.value === sampleRecord.dateOfAdmission ? '✅' : '❌'} Admission date preserved
  ${event.occurredAt !== sampleRecord.dateOfAdmission ? '✅' : '⚠️'} Values are different (as expected)
`);

console.log('═'.repeat(60));
console.log('\n✨ Test Complete!\n');

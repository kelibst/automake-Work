/**
 * Complete DHIS2 Upload Pipeline
 * Reads Excel, cleans data, validates, and uploads to DHIS2
 */

const ExcelParser = require('./lib/excel-parser');
const DataCleaner = require('./lib/data-cleaner');
const FieldMapper = require('./lib/field-mapper');
const Validator = require('./lib/validator');
const UploadManager = require('./lib/upload-manager');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  excelFile: './JuneEmergency.xlsx',
  outputDir: './output',
  dhis2: {
    baseUrl: 'https://events.chimgh.org/events',
    endpoint: '/api/41/tracker?async=false',
    sessionId: null // Will be extracted from browser cookies
  },
  upload: {
    batchSize: 10,
    maxRetries: 3,
    enabled: false // Set to true to actually upload
  }
};

async function main() {
  console.log('='.repeat(70));
  console.log('DHIS2 BULK UPLOAD PIPELINE');
  console.log('='.repeat(70));
  console.log();

  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir);
  }

  // ===================================================================
  // STEP 1: PARSE EXCEL FILE
  // ===================================================================
  console.log('📄 STEP 1: Parsing Excel File...');
  console.log('-'.repeat(70));

  const parser = new ExcelParser();
  const fileInfo = parser.readFile(CONFIG.excelFile);

  if (!fileInfo.success) {
    console.error('❌ Error reading Excel file:', fileInfo.error);
    process.exit(1);
  }

  console.log(`✅ File loaded: ${CONFIG.excelFile}`);
  console.log(`   Sheets: ${fileInfo.sheetNames.join(', ')}`);
  console.log(`   Using: ${fileInfo.defaultSheet}`);

  const excelData = parser.parseSheet();
  console.log(`   Total records: ${excelData.length}`);
  console.log();

  // Validate Excel structure
  const structureValidation = parser.validateStructure();
  if (!structureValidation.valid) {
    console.warn('⚠️  Warning: Excel structure has issues:');
    if (structureValidation.missingColumns.length > 0) {
      console.warn('   Missing columns:', structureValidation.missingColumns.join(', '));
    }
    if (structureValidation.extraColumns.length > 0) {
      console.warn('   Extra columns:', structureValidation.extraColumns.join(', '));
    }
    console.log();
  }

  // ===================================================================
  // STEP 2: LOAD OPTION SETS (if available)
  // ===================================================================
  console.log('📋 STEP 2: Loading Option Sets...');
  console.log('-'.repeat(70));

  let optionSets = {};
  const optionCodesPath = './option-codes.json';

  if (fs.existsSync(optionCodesPath)) {
    const optionCodesData = JSON.parse(fs.readFileSync(optionCodesPath, 'utf8'));
    optionSets = {
      diagnosis: optionCodesData.Diagnosis || [],
      education: optionCodesData.Education || [],
      outcome: optionCodesData.Outcome || []
    };
    console.log(`✅ Loaded option sets:`);
    console.log(`   Diagnosis codes: ${optionSets.diagnosis.length}`);
    console.log(`   Education options: ${optionSets.education.length}`);
    console.log(`   Outcome options: ${optionSets.outcome.length}`);
  } else {
    console.log('⚠️  No option-codes.json found. Diagnosis matching will be limited.');
  }
  console.log();

  // ===================================================================
  // STEP 3: CLEAN DATA
  // ===================================================================
  console.log('🧹 STEP 3: Cleaning Data...');
  console.log('-'.repeat(70));

  const cleaner = new DataCleaner(optionSets);
  const cleanResults = cleaner.cleanAll(excelData);

  console.log(`✅ Cleaned ${cleanResults.success.length} records successfully`);
  if (cleanResults.failed.length > 0) {
    console.log(`❌ Failed to clean ${cleanResults.failed.length} records`);
  }
  if (cleanResults.warnings.length > 0) {
    console.log(`⚠️  ${cleanResults.warnings.length} records have warnings`);
  }
  console.log();

  // Save cleaning results
  const cleanedDataPath = path.join(CONFIG.outputDir, 'cleaned-data.json');
  fs.writeFileSync(cleanedDataPath, JSON.stringify(cleanResults, null, 2));
  console.log(`💾 Cleaned data saved to: ${cleanedDataPath}`);
  console.log();

  // Show failed records if any
  if (cleanResults.failed.length > 0) {
    console.log('❌ CLEANING ERRORS:');
    console.log('-'.repeat(70));
    cleanResults.failed.forEach(failure => {
      console.log(`\n   Row ${failure.rowNumber}:`);
      failure.errors.forEach(error => {
        console.log(`     • ${error.field}: ${error.message}`);
      });
    });
    console.log();
  }

  // ===================================================================
  // STEP 4: VALIDATE DATA
  // ===================================================================
  console.log('✔️  STEP 4: Validating Data...');
  console.log('-'.repeat(70));

  const fieldMapper = new FieldMapper();
  const validator = new Validator(fieldMapper);
  const validationResults = validator.validateAll(cleanResults.success);

  console.log(`   Total: ${validationResults.summary.total}`);
  console.log(`   ✅ Valid: ${validationResults.summary.valid}`);
  console.log(`   ❌ Invalid: ${validationResults.summary.invalid}`);
  console.log(`   ⚠️  Warnings: ${validationResults.summary.warnings}`);
  console.log(`   🔄 Duplicates: ${validationResults.summary.duplicates}`);
  console.log();

  // Generate validation report
  const validationReport = validator.generateReport(validationResults);
  const validationReportPath = path.join(CONFIG.outputDir, 'validation-report.txt');
  fs.writeFileSync(validationReportPath, validationReport);
  console.log(`📄 Validation report saved to: ${validationReportPath}`);
  console.log();

  // Save validation results
  const validationResultsPath = path.join(CONFIG.outputDir, 'validation-results.json');
  validator.exportResults(validationResults, validationResultsPath);
  console.log(`💾 Validation results saved to: ${validationResultsPath}`);
  console.log();

  // ===================================================================
  // STEP 5: PREPARE DHIS2 PAYLOADS
  // ===================================================================
  console.log('📦 STEP 5: Preparing DHIS2 Payloads...');
  console.log('-'.repeat(70));

  const validRecords = validator.getValidRecords(validationResults);
  const payload = fieldMapper.createBatchPayload(validRecords);

  console.log(`✅ Created payload with ${payload.events.length} events`);
  console.log();

  // Save payload
  const payloadPath = path.join(CONFIG.outputDir, 'dhis2-payload.json');
  fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
  console.log(`💾 Payload saved to: ${payloadPath}`);
  console.log();

  // Show sample event
  if (payload.events.length > 0) {
    console.log('📋 Sample Event:');
    console.log('-'.repeat(70));
    const sampleEvent = payload.events[0];
    console.log(`   orgUnit: ${sampleEvent.orgUnit}`);
    console.log(`   occurredAt: ${sampleEvent.occurredAt}`);
    console.log(`   status: ${sampleEvent.status}`);
    console.log(`   dataValues: ${sampleEvent.dataValues.length} fields`);
    console.log();
  }

  // ===================================================================
  // STEP 6: UPLOAD TO DHIS2 (if enabled)
  // ===================================================================
  if (CONFIG.upload.enabled) {
    console.log('🚀 STEP 6: Uploading to DHIS2...');
    console.log('-'.repeat(70));

    if (!CONFIG.dhis2.sessionId) {
      console.log('⚠️  No session ID configured. Skipping upload.');
      console.log('   To upload, set CONFIG.dhis2.sessionId in this script.');
      console.log();
    } else {
      const uploadManager = new UploadManager({
        baseUrl: CONFIG.dhis2.baseUrl,
        endpoint: CONFIG.dhis2.endpoint,
        batchSize: CONFIG.upload.batchSize,
        maxRetries: CONFIG.upload.maxRetries,
        sessionId: CONFIG.dhis2.sessionId
      });

      // Set up progress tracking
      uploadManager.onProgress((update) => {
        if (update.type === 'upload_start') {
          console.log(`   Uploading ${update.totalRecords} records in ${update.totalBatches} batches...`);
        } else if (update.type === 'batch_start') {
          process.stdout.write(`   Batch ${update.batchNumber}/${update.totalBatches}... `);
        } else if (update.type === 'batch_success') {
          console.log(`✅ (${update.recordCount} records)`);
        } else if (update.type === 'batch_error') {
          console.log(`❌ ${update.error}`);
        } else if (update.type === 'upload_complete') {
          console.log(`\n   ✅ Upload complete!`);
        }
      });

      // Upload
      const uploadResults = await uploadManager.uploadAll(payload.events);

      console.log();
      console.log('📊 Upload Results:');
      console.log('-'.repeat(70));
      console.log(`   Total: ${uploadResults.total}`);
      console.log(`   ✅ Successful: ${uploadResults.successful}`);
      console.log(`   ❌ Failed: ${uploadResults.failed}`);
      console.log(`   Duration: ${uploadResults.duration}`);
      console.log();

      // Save upload report
      const uploadReport = uploadManager.generateReport();
      const uploadReportPath = path.join(CONFIG.outputDir, 'upload-report.txt');
      fs.writeFileSync(uploadReportPath, uploadReport);
      console.log(`📄 Upload report saved to: ${uploadReportPath}`);
      console.log();

      // Export failed records if any
      if (uploadResults.failed > 0) {
        const failedRecordsPath = path.join(CONFIG.outputDir, 'failed-records.json');
        uploadManager.exportFailedRecords(failedRecordsPath);
        console.log(`❌ Failed records saved to: ${failedRecordsPath}`);
        console.log();
      }
    }
  } else {
    console.log('🚀 STEP 6: Upload (DISABLED)');
    console.log('-'.repeat(70));
    console.log('   Upload is disabled. To enable:');
    console.log('   1. Set CONFIG.upload.enabled = true');
    console.log('   2. Set CONFIG.dhis2.sessionId to your JSESSIONID cookie value');
    console.log();
  }

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log('='.repeat(70));
  console.log('✅ PIPELINE COMPLETE!');
  console.log('='.repeat(70));
  console.log();
  console.log('Summary:');
  console.log(`  📄 Excel records: ${excelData.length}`);
  console.log(`  🧹 Cleaned: ${cleanResults.success.length}`);
  console.log(`  ✔️  Valid: ${validationResults.summary.valid}`);
  console.log(`  ❌ Invalid: ${validationResults.summary.invalid}`);
  if (CONFIG.upload.enabled && CONFIG.dhis2.sessionId) {
    const uploadResults = await uploadManager.getResults();
    console.log(`  🚀 Uploaded: ${uploadResults.successful}/${uploadResults.total}`);
  } else {
    console.log(`  🚀 Upload: Disabled (ready when you enable it)`);
  }
  console.log();
  console.log('Output files:');
  console.log(`  • ${cleanedDataPath}`);
  console.log(`  • ${validationReportPath}`);
  console.log(`  • ${validationResultsPath}`);
  console.log(`  • ${payloadPath}`);
  console.log();
  console.log('='.repeat(70));
}

// Run the pipeline
main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});

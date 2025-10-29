const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function discoverMissingFields() {
  console.log('🔍 Discovering Missing Field IDs (Additional Diagnosis & Cost)...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  const capturedRequests = [];

  // Listen for POST requests to tracker endpoint
  await page.route('**/*', async (route) => {
    const request = route.request();
    await route.continue();

    if (request.method() === 'POST' && request.url().includes('/tracker')) {
      const postData = request.postData();

      console.log('\n🎯 TRACKER POST REQUEST CAPTURED!');
      console.log('═════════════════════════════════════════════════════════');
      console.log(`🔗 URL: ${request.url()}`);
      console.log(`⏰ Time: ${new Date().toISOString()}`);

      if (postData) {
        try {
          const jsonData = JSON.parse(postData);
          capturedRequests.push({
            timestamp: new Date().toISOString(),
            url: request.url(),
            data: jsonData
          });

          console.log('\n📦 DATA ELEMENTS IN THIS REQUEST:');
          console.log('─────────────────────────────────────────────────────────');

          if (jsonData.events && jsonData.events[0] && jsonData.events[0].dataValues) {
            jsonData.events[0].dataValues.forEach((dv, index) => {
              console.log(`  ${index + 1}. ${dv.dataElement}: "${dv.value}"`);
            });
          }

          console.log('═════════════════════════════════════════════════════════\n');
        } catch (e) {
          console.log('⚠️  Could not parse POST data as JSON');
        }
      }
    }
  });

  console.log('📖 Instructions:');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('1. Log in to DHIS2 (https://events.chimgh.org/events/)');
  console.log('2. Navigate to the In-Patient Morbidity form');
  console.log('3. Fill in a test record and MAKE SURE to include:');
  console.log('   ✓ Additional Diagnosis field (enter any value)');
  console.log('   ✓ Cost of Treatment field (enter any number, e.g., 500)');
  console.log('4. Submit the form');
  console.log('5. Check the console output above for captured data elements');
  console.log('6. Press Ctrl+C when done to save the results');
  console.log('══════════════════════════════════════════════════════════════\n');

  await page.goto('https://events.chimgh.org/events/');

  console.log('⏳ Waiting for form submission (30 min timeout)...\n');
  console.log('💡 TIP: After you submit, you\'ll see the data elements immediately');
  console.log('    Look for fields with values matching what you entered!\n');

  // Wait for user action
  await page.waitForTimeout(30 * 60 * 1000);

  // Save captured data
  if (capturedRequests.length > 0) {
    const outputDir = path.join(__dirname, 'network-logs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(outputDir, `missing-fields-discovery-${timestamp}.json`);

    fs.writeFileSync(logFile, JSON.stringify(capturedRequests, null, 2));
    console.log(`\n✅ Captured requests saved to: ${logFile}\n`);

    // Analyze and highlight potential new fields
    console.log('🔍 ANALYSIS - Looking for new data elements:\n');

    const knownDataElements = [
      'h0Ef6ykTpNB', // Patient Number
      'nk15h7fzCLz', // Address
      'upqhIcii1iC', // Age (number)
      'WZ5rS7QuECT', // Age (unit)
      'fg8sMCaTOrK', // Gender
      'qAWldjTeMIs', // Occupation
      'Hi8Cp84CnZQ', // Education
      'HsMaBh3wKed', // Date of Admission
      'sIPe9r0NBbq', // Date of Discharge
      'xpzJAQC4DGe', // Speciality
      'OMN7CVW4IaY', // Outcome
      'yPXPzceTIvq', // Principal Diagnosis
      'dsVClbnOnm6', // Surgical Procedure
      'ETSl9Q3SUOG'  // NHIS Status
    ];

    const latestRequest = capturedRequests[capturedRequests.length - 1];
    if (latestRequest.data.events && latestRequest.data.events[0]) {
      const dataValues = latestRequest.data.events[0].dataValues;

      const newFields = dataValues.filter(dv => !knownDataElements.includes(dv.dataElement));

      if (newFields.length > 0) {
        console.log('🆕 NEW DATA ELEMENTS FOUND:');
        console.log('─────────────────────────────────────────────────────────');
        newFields.forEach(field => {
          console.log(`  📌 ${field.dataElement}: "${field.value}"`);
        });
        console.log('\n💡 These are likely:');
        console.log('   - Additional Diagnosis');
        console.log('   - Cost of Treatment');
        console.log('   - Or other fields you filled in\n');
      } else {
        console.log('ℹ️  No new data elements found. Make sure you filled in');
        console.log('   Additional Diagnosis and Cost fields before submitting.\n');
      }
    }
  } else {
    console.log('\n⚠️  No requests captured. Make sure you submitted the form.\n');
  }

  await browser.close();
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Stopping discovery...');
  process.exit(0);
});

discoverMissingFields().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

const { chromium } = require('playwright');

async function testAPIRequest() {
  console.log('🚀 Starting API Request Test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  console.log('📖 Step 1: Navigate to DHIMS2 and log in...');
  console.log('Please log in manually when the browser opens.\n');

  await page.goto('https://events.chimgh.org/events/');

  // Wait for user to log in manually
  console.log('⏳ Waiting for you to log in...');
  console.log('Once logged in, press Enter in this terminal to continue...\n');

  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  console.log('\n✅ Login confirmed. Extracting session cookies...\n');

  // Get cookies (for authentication)
  const cookies = await context.cookies();
  const jsessionCookie = cookies.find(c => c.name === 'JSESSIONID');

  if (!jsessionCookie) {
    console.error('❌ Error: Could not find JSESSIONID cookie. Make sure you are logged in.');
    await browser.close();
    return;
  }

  console.log('🍪 Session Cookie Found:', jsessionCookie.value.substring(0, 20) + '...\n');

  // Prepare the test data (last row from your Excel file)
  const testData = {
    "events": [
      {
        "orgUnit": "duCDqCRlWG1",  // This should match your organization
        "occurredAt": "2025-06-24",  // Date of Admission: 24-06-2025
        "status": "COMPLETED",
        "notes": [],
        "program": "fFYTJRzD2qq",  // In-Patient Morbidity Program
        "programStage": "LR7JT7ZNg8E",  // Program Stage
        "dataValues": [
          {
            "dataElement": "h0Ef6ykTpNB",  // Patient Number
            "value": "TEST-26295"  // Using CC Code as patient number
          },
          {
            "dataElement": "nk15h7fzCLz",  // Address
            "value": "GBI ATABU @ WAKE WILLIAM"
          },
          {
            "dataElement": "upqhIcii1iC",  // Age (number)
            "value": "65"  // Estimated age for PENSIONER
          },
          {
            "dataElement": "WZ5rS7QuECT",  // Age (unit)
            "value": "years"
          },
          {
            "dataElement": "fg8sMCaTOrK",  // Gender
            "value": "Male"  // Not specified, using Male as default
          },
          {
            "dataElement": "qAWldjTeMIs",  // Occupation
            "value": "Pensioner"  // PENSIONIER → Pensioner
          },
          {
            "dataElement": "Hi8Cp84CnZQ",  // Education
            "value": "Tertiary"
          },
          {
            "dataElement": "HsMaBh3wKed",  // Date of Admission
            "value": "2025-06-24"
          },
          {
            "dataElement": "sIPe9r0NBbq",  // Date of Discharge
            "value": "2025-06-26"
          },
          {
            "dataElement": "xpzJAQC4DGe",  // Speciality
            "value": "Casualty"  // Accident Emergency → Casualty
          },
          {
            "dataElement": "OMN7CVW4IaY",  // Outcome
            "value": "Discharge"
          },
          {
            "dataElement": "yPXPzceTIvq",  // Principal Diagnosis
            "value": "I10.00 - Essential (primary) hypertension"
          },
          {
            "dataElement": "dsVClbnOnm6",  // Surgical Procedure
            "value": "false"  // No
          },
          {
            "dataElement": "ETSl9Q3SUOG",  // NHIS Status
            "value": "true"  // Yes
          }
        ]
      }
    ]
  };

  console.log('📦 Prepared Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');

  console.log('🚀 Step 2: Sending POST request to DHIS2 API...\n');

  try {
    // Make the API request using the page's context (which has authentication)
    const response = await page.evaluate(async (data) => {
      const response = await fetch('https://events.chimgh.org/events/api/41/tracker?async=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });

      return {
        status: response.status,
        statusText: response.statusText,
        body: await response.text()
      };
    }, testData);

    console.log('✅ Response received!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📥 Response Body:');
    try {
      const jsonResponse = JSON.parse(response.body);
      console.log(JSON.stringify(jsonResponse, null, 2));

      // Check if successful
      if (jsonResponse.status === 'OK' && jsonResponse.stats.created > 0) {
        console.log('\n\n🎉 SUCCESS! Record created successfully!');
        console.log(`✅ ${jsonResponse.stats.created} record(s) created`);

        if (jsonResponse.bundleReport?.typeReportMap?.EVENT?.objectReports?.[0]) {
          const eventUid = jsonResponse.bundleReport.typeReportMap.EVENT.objectReports[0].uid;
          console.log(`🆔 Event UID: ${eventUid}`);
        }
      } else if (jsonResponse.status === 'ERROR') {
        console.log('\n\n❌ ERROR! Request failed:');
        if (jsonResponse.validationReport?.errorReports) {
          jsonResponse.validationReport.errorReports.forEach(error => {
            console.log(`  - ${error.message}`);
          });
        }
      }
    } catch (e) {
      console.log(response.body);
    }

  } catch (error) {
    console.error('\n❌ Error making request:', error);
  }

  console.log('\n\n⏳ Keeping browser open for 10 seconds so you can verify...');
  await page.waitForTimeout(10000);

  await browser.close();
  console.log('\n✅ Test complete!');
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user.');
  process.exit(0);
});

testAPIRequest().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});

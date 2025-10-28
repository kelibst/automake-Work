const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureFormSubmission() {
  console.log('🎯 Capturing Form Submission Calls ONLY\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  const formSubmissions = [];

  // Listen for route events to intercept requests
  await page.route('**/*', async (route) => {
    const request = route.request();

    // Continue the request
    await route.continue();

    // Log POST requests (typical form submissions)
    if (request.method() === 'POST') {
      const isAjax = request.resourceType() === 'xhr' || request.resourceType() === 'fetch';

      const submissionData = {
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
        isAjax: isAjax,
        headers: request.headers(),
        postData: request.postData()
      };

      formSubmissions.push(submissionData);

      console.log('\n🚨 POST REQUEST DETECTED (Possible Form Submission):');
      console.log('═════════════════════════════════════════════════════════');
      console.log(`🔗 URL: ${request.url()}`);
      console.log(`📡 Type: ${request.resourceType()} ${isAjax ? '(AJAX)' : ''}`);
      console.log(`⏰ Time: ${submissionData.timestamp}`);

      console.log('\n📋 REQUEST HEADERS:');
      Object.entries(request.headers()).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });

      if (request.postData()) {
        console.log('\n📦 POST DATA:');
        try {
          const jsonData = JSON.parse(request.postData());
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log(request.postData());
        }
      } else {
        console.log('\n⚠️  No POST data captured');
      }

      console.log('═════════════════════════════════════════════════════════\n');
    }
  });

  // Also listen for responses to POST requests
  page.on('response', async (response) => {
    const request = response.request();

    if (request.method() === 'POST') {
      try {
        const responseBody = await response.text();

        console.log('\n✅ POST RESPONSE RECEIVED:');
        console.log('─────────────────────────────────────────────────────────');
        console.log(`🔗 URL: ${response.url()}`);
        console.log(`📊 Status: ${response.status()} ${response.statusText()}`);

        console.log('\n📥 RESPONSE BODY:');
        try {
          const jsonData = JSON.parse(responseBody);
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          const truncated = responseBody.length > 1000 ?
            responseBody.substring(0, 1000) + '\n... (truncated)' :
            responseBody;
          console.log(truncated);
        }

        console.log('─────────────────────────────────────────────────────────\n');

        // Add response to the corresponding request
        const lastSubmission = formSubmissions[formSubmissions.length - 1];
        if (lastSubmission && lastSubmission.url === response.url()) {
          lastSubmission.response = {
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            body: responseBody
          };
        }
      } catch (e) {
        console.log(`⚠️  Could not read response body: ${e.message}`);
      }
    }
  });

  console.log('📖 Instructions:');
  console.log('──────────────────────────────────────────────────────────');
  console.log('1. Log in to DHIMS2');
  console.log('2. Navigate to the In-Patient Morbidity form');
  console.log('3. Fill out the form with test data');
  console.log('4. SUBMIT the form');
  console.log('5. Watch this console for the POST request details');
  console.log('6. Press Ctrl+C when done to save the logs');
  console.log('──────────────────────────────────────────────────────────\n');

  await page.goto('https://events.chimgh.org/events/');

  console.log('⏳ Waiting for form submission (30 min timeout)...\n');

  // Wait for user action
  await page.waitForTimeout(30 * 60 * 1000);

  // Save logs
  const outputDir = path.join(__dirname, 'network-logs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(outputDir, `form-submissions-${timestamp}.json`);

  fs.writeFileSync(logFile, JSON.stringify(formSubmissions, null, 2));
  console.log(`\n✅ Form submissions saved to: ${logFile}`);
  console.log(`📊 Total POST requests captured: ${formSubmissions.length}\n`);

  await browser.close();
}

process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Stopping capture...');
  process.exit(0);
});

captureFormSubmission().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'network-logs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

async function captureNetworkCalls() {
  console.log('🚀 Starting Network Call Capture...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // Store all network requests
  const networkLogs = [];
  let requestCounter = 0;

  // Intercept ALL requests (including AJAX/XHR)
  page.on('request', request => {
    const requestData = {
      id: ++requestCounter,
      timestamp: new Date().toISOString(),
      type: 'REQUEST',
      resourceType: request.resourceType(), // xhr, fetch, document, etc.
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      postData: request.postData(),
      isAjax: request.resourceType() === 'xhr' || request.resourceType() === 'fetch'
    };

    networkLogs.push(requestData);

    // Log AJAX/XHR requests to console immediately
    if (requestData.isAjax) {
      console.log('\n🔵 AJAX/XHR REQUEST DETECTED:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID: ${requestData.id}`);
      console.log(`Method: ${requestData.method}`);
      console.log(`URL: ${requestData.url}`);
      console.log(`Time: ${requestData.timestamp}`);

      if (requestData.postData) {
        console.log('\n📤 POST DATA:');
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(requestData.postData);
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (e) {
          // If not JSON, show raw data
          console.log(requestData.postData);
        }
      }

      console.log('\n📋 HEADERS:');
      Object.entries(requestData.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  });

  // Intercept ALL responses
  page.on('response', async response => {
    const request = response.request();
    const isAjax = request.resourceType() === 'xhr' || request.resourceType() === 'fetch';

    let responseBody = null;
    try {
      responseBody = await response.text();
    } catch (e) {
      responseBody = '<Unable to read response body>';
    }

    const responseData = {
      timestamp: new Date().toISOString(),
      type: 'RESPONSE',
      resourceType: request.resourceType(),
      method: request.method(),
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      body: responseBody,
      isAjax: isAjax
    };

    networkLogs.push(responseData);

    // Log AJAX/XHR responses to console immediately
    if (isAjax) {
      console.log('\n🟢 AJAX/XHR RESPONSE RECEIVED:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Method: ${responseData.method}`);
      console.log(`URL: ${responseData.url}`);
      console.log(`Status: ${responseData.status} ${responseData.statusText}`);
      console.log(`Time: ${responseData.timestamp}`);

      console.log('\n📥 RESPONSE BODY:');
      try {
        // Try to parse as JSON
        const jsonData = JSON.parse(responseBody);
        console.log(JSON.stringify(jsonData, null, 2));
      } catch (e) {
        // If not JSON, show raw data (truncate if too long)
        const truncated = responseBody.length > 500 ?
          responseBody.substring(0, 500) + '... (truncated)' :
          responseBody;
        console.log(truncated);
      }

      console.log('\n📋 RESPONSE HEADERS:');
      Object.entries(responseData.headers).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  });

  // Log failed requests
  page.on('requestfailed', request => {
    console.log('\n❌ REQUEST FAILED:');
    console.log(`  URL: ${request.url()}`);
    console.log(`  Failure: ${request.failure().errorText}`);
  });

  console.log('📖 Please log in and perform the actions...\n');
  console.log('Instructions:');
  console.log('1. Log in to DHIMS2');
  console.log('2. Navigate to the form');
  console.log('3. Fill out and SUBMIT the form');
  console.log('4. Watch the console for AJAX/XHR requests');
  console.log('5. When done, press Ctrl+C to stop and save logs\n');

  // Navigate to DHIMS2
  await page.goto('https://events.chimgh.org/events/');

  // Wait for user to complete actions (or timeout after 30 minutes)
  console.log('⏳ Waiting for you to complete the form submission...\n');
  console.log('💡 All AJAX/XHR calls will be logged above in real-time\n');

  // Keep the browser open and wait
  await page.waitForTimeout(30 * 60 * 1000); // 30 minutes

  // Save all logs to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(outputDir, `network-log-${timestamp}.json`);

  fs.writeFileSync(logFile, JSON.stringify(networkLogs, null, 2));
  console.log(`\n✅ Network logs saved to: ${logFile}`);

  // Create a separate file with ONLY AJAX/XHR calls
  const ajaxCalls = networkLogs.filter(log => log.isAjax);
  const ajaxFile = path.join(outputDir, `ajax-calls-${timestamp}.json`);
  fs.writeFileSync(ajaxFile, JSON.stringify(ajaxCalls, null, 2));
  console.log(`✅ AJAX calls saved to: ${ajaxFile}`);

  // Create a summary file
  const summary = {
    totalRequests: networkLogs.filter(l => l.type === 'REQUEST').length,
    totalResponses: networkLogs.filter(l => l.type === 'RESPONSE').length,
    ajaxRequests: ajaxCalls.filter(l => l.type === 'REQUEST').length,
    ajaxResponses: ajaxCalls.filter(l => l.type === 'RESPONSE').length,
    postRequests: networkLogs.filter(l => l.method === 'POST').length,
    uniqueUrls: [...new Set(networkLogs.map(l => l.url))],
    ajaxUrls: [...new Set(ajaxCalls.map(l => l.url))]
  };

  const summaryFile = path.join(outputDir, `summary-${timestamp}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary saved to: ${summaryFile}\n`);

  await browser.close();
  console.log('🏁 Browser closed. Analysis complete!');
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted by user. Saving logs...');
  process.exit(0);
});

captureNetworkCalls().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

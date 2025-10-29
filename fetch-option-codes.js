const { chromium } = require('playwright');

async function fetchOptionCodes() {
  console.log('🚀 Fetching DHIS2 Option Codes...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  console.log('📖 Step 1: Navigate to DHIS2 and log in...');
  await page.goto('https://events.chimgh.org/events/');

  console.log('⏳ Waiting for you to log in...');
  console.log('Once logged in, press Enter in this terminal to continue...\n');

  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  console.log('\n✅ Login confirmed.\n');

  // Option sets we need to fetch
  const optionSets = [
    { id: 'qINXizfcpoY', name: 'Education' },
    { id: 'fBs4UMMVHIg', name: 'Outcome' },
    { id: 'hAdQhH0A5jt', name: 'Diagnosis' }
  ];

  const results = {};

  for (const optionSet of optionSets) {
    console.log(`📥 Fetching ${optionSet.name} options (${optionSet.id})...`);

    try {
      const response = await page.evaluate(async (id) => {
        const response = await fetch(`https://events.chimgh.org/events/api/optionSets/${id}.json?fields=options[code,name]`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        return await response.json();
      }, optionSet.id);

      results[optionSet.name] = response.options;

      console.log(`✅ Found ${response.options.length} options for ${optionSet.name}`);
      console.log('Options:');
      response.options.forEach(opt => {
        console.log(`  - Code: "${opt.code}" | Name: "${opt.name}"`);
      });
      console.log('');

    } catch (error) {
      console.error(`❌ Error fetching ${optionSet.name}:`, error.message);
    }
  }

  // Save to file
  const fs = require('fs');
  const outputFile = 'option-codes.json';
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved all option codes to ${outputFile}`);

  // Create a mapping guide
  console.log('\n\n📋 MAPPING GUIDE:\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('EDUCATION MAPPING:');
  if (results.Education) {
    results.Education.forEach(opt => {
      if (opt.name.includes('SHS') || opt.name.includes('Secondary') || opt.name.includes('High')) {
        console.log(`  ✓ "SHS" → use code: "${opt.code}" (${opt.name})`);
      }
      if (opt.name.includes('JHS') || opt.name.includes('Junior')) {
        console.log(`  ✓ "jhs" → use code: "${opt.code}" (${opt.name})`);
      }
      if (opt.name.includes('Tertiary') || opt.name.includes('University')) {
        console.log(`  ✓ "Tertiary" → use code: "${opt.code}" (${opt.name})`);
      }
    });
  }
  console.log('');

  console.log('OUTCOME MAPPING:');
  if (results.Outcome) {
    results.Outcome.forEach(opt => {
      if (opt.name.includes('Refer')) {
        console.log(`  ✓ "Referred" → use code: "${opt.code}" (${opt.name})`);
      }
      if (opt.name.includes('Discharge')) {
        console.log(`  ✓ "Discharge" → use code: "${opt.code}" (${opt.name})`);
      }
      if (opt.name.includes('Transfer')) {
        console.log(`  ✓ "Transferred" → use code: "${opt.code}" (${opt.name})`);
      }
      if (opt.name.includes('Died') || opt.name.includes('Death')) {
        console.log(`  ✓ "Died" → use code: "${opt.code}" (${opt.name})`);
      }
    });
  }
  console.log('');

  console.log('DIAGNOSIS INFO:');
  if (results.Diagnosis) {
    console.log(`  Total diagnosis codes available: ${results.Diagnosis.length}`);
    console.log('  First 5 examples:');
    results.Diagnosis.slice(0, 5).forEach(opt => {
      console.log(`    - Code: "${opt.code}" | Name: "${opt.name}"`);
    });
    console.log('  (Full list saved to option-codes.json)');
  }
  console.log('\n═══════════════════════════════════════════════════════════════\n');

  await browser.close();
  console.log('✅ Done!');
}

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user.');
  process.exit(0);
});

fetchOptionCodes().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});

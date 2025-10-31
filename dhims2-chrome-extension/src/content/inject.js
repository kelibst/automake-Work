// DHIMS2 Extension - Content Script
// Injected into DHIMS2 pages
console.log('🔌 DHIMS2 Extension: Content script loaded');

// Import form filler utility (inline for content script)
// We'll include the form-filler logic directly here since content scripts can't import ES6 modules easily

// ========== Form Filling Utilities ==========

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function triggerChangeEvents(element) {
  const events = [
    new Event('input', { bubbles: true }),
    new Event('change', { bubbles: true }),
    new Event('blur', { bubbles: true })
  ];

  events.forEach(event => element.dispatchEvent(event));

  // For React, trigger native setters
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  if (element.tagName === 'INPUT' && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, element.value);
  } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(element, element.value);
  }
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

async function fillTextField(selector, value) {
  const input = document.querySelector(selector);
  if (!input) throw new Error(`Field not found: ${selector}`);

  // Actually fill text fields - they work!
  input.focus();
  await sleep(100);
  input.value = value;
  triggerChangeEvents(input);
  await sleep(100);

  console.log(`✅ Text filled: "${value}"`);
  return { success: true, selector, value };
}

async function fillDropdown(selector, value, fuzzyMatch = true) {
  console.log(`🔽 Filling dropdown: ${selector} = "${value}"`);

  const input = document.querySelector(selector);
  if (!input) {
    console.warn(`⚠️  Dropdown input not found: ${selector}`);
    return { success: false, error: 'Input not found', selector };
  }

  try {
    // Focus and click the input to open dropdown
    input.focus();
    await sleep(200);
    input.click();
    await sleep(300);

    // Type the value to filter options
    input.value = value;
    triggerChangeEvents(input);
    await sleep(500); // Give React time to filter options

    // Wait for dropdown menu to appear
    const dropdown = await waitForDropdown(3000);

    if (!dropdown) {
      console.warn(`⚠️  Dropdown menu did not appear for: ${selector}`);
      return { success: false, error: 'Dropdown menu not found', selector, requiresUserAction: true };
    }

    // Find matching option
    const matchingOption = findMatchingOption(dropdown, value);

    if (!matchingOption) {
      console.warn(`⚠️  No matching option found for: "${value}"`);
      return { success: false, error: 'No matching option', selector, value, requiresUserAction: true };
    }

    // Click the matching option
    matchingOption.click();
    await sleep(300);

    console.log(`✅ Dropdown filled: "${value}"`);
    return { success: true, selector, value };

  } catch (error) {
    console.error(`❌ Error filling dropdown ${selector}:`, error);
    return { success: false, error: error.message, selector, requiresUserAction: true };
  }
}

async function fillDateField(selector, value) {
  const input = document.querySelector(selector);
  if (!input) throw new Error(`Date field not found: ${selector}`);

  console.log(`📅 Filling date field: ${selector}`, { value });

  input.focus();
  await sleep(100);

  // Format date if needed
  let formattedDate = value;

  // If already in YYYY-MM-DD format, use as-is
  if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    formattedDate = value;
  }
  // Try parsing various date formats
  else if (value) {
    // Handle Excel serial date numbers (days since 1900-01-01)
    if (typeof value === 'number' || (typeof value === 'string' && /^\d{5}$/.test(value))) {
      const excelEpoch = new Date(1900, 0, 1);
      const days = parseInt(value);
      const date = new Date(excelEpoch.getTime() + (days - 2) * 86400000); // -2 for Excel bug
      if (!isNaN(date.getTime())) {
        formattedDate = date.toISOString().split('T')[0];
      }
    }
    // Handle DD-MM-YYYY or DD/MM/YYYY formats
    else if (value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)) {
      const [, day, month, year] = value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toISOString().split('T')[0];
      }
    }
    // Try standard JS Date parsing as fallback
    else {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toISOString().split('T')[0];
      } else {
        console.warn(`⚠️  Could not parse date: "${value}"`);
        formattedDate = value; // Use original value as fallback
      }
    }
  }

  console.log(`📅 Formatted date (YYYY-MM-DD): "${formattedDate}"`);

  // Convert to DD-MM-YYYY format (DHIMS2 expects this)
  let dhimsFormat = formattedDate;
  if (formattedDate && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = formattedDate.split('-');
    dhimsFormat = `${day}-${month}-${year}`;
  }

  console.log(`📅 DHIMS2 format (DD-MM-YYYY): "${dhimsFormat}"`);

  // Actually fill date fields - they work!
  input.value = dhimsFormat;
  triggerChangeEvents(input);
  await sleep(100);

  console.log(`✅ Date filled: "${dhimsFormat}"`);
  return { success: true, selector, value: dhimsFormat };
}

// ========== Dropdown Helper Functions ==========

/**
 * Wait for dropdown menu to appear with dynamic polling
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds
 * @returns {Promise<Element|null>} - Dropdown element or null if not found
 */
async function waitForDropdown(maxWaitMs = 3000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Try multiple selectors for different React-Select versions and virtualized-select
    const selectors = [
      // Standard React-Select
      '[role="listbox"]',
      '[id*="listbox"]',
      '[id*="-menu"]',
      '[class*="menu"][class*="MenuList"]',
      // Virtualized Select (DHIS2 specific)
      '.Select-menu-outer',
      '.Select-menu',
      '.VirtualizedSelectMenu',
      'div[class*="Select-menu"]',
      // Generic patterns
      'div[class*="menu"] ul',
      'div[class*="-menu"]',
      '[class*="options"]',
      '.Select.is-open .Select-menu-outer'
    ];

    for (const selector of selectors) {
      const dropdown = document.querySelector(selector);
      if (dropdown) {
        // Verify dropdown has visible options
        const optionSelectors = [
          '[role="option"]',
          'li',
          'div[class*="option"]',
          'div[class*="Option"]',
          '.VirtualizedSelectOption',
          '.Select-option'
        ];

        let options = [];
        for (const optSelector of optionSelectors) {
          const found = dropdown.querySelectorAll(optSelector);
          if (found.length > 0) {
            options = found;
            break;
          }
        }

        if (options.length > 0) {
          // Check if at least one option is visible
          const visibleOptions = Array.from(options).filter(opt => {
            const rect = opt.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });

          if (visibleOptions.length > 0) {
            console.log(`✅ Dropdown found with ${visibleOptions.length} visible options using selector: ${selector}`);
            return dropdown;
          }
        }
      }
    }

    await sleep(100);
  }

  console.warn('⚠️  Dropdown not found after', maxWaitMs, 'ms');
  return null;
}

/**
 * Find matching option in dropdown based on typed value
 * @param {Element} dropdown - Dropdown menu element
 * @param {string} value - Value to match
 * @returns {Element|null} - Matching option element or null
 */
function findMatchingOption(dropdown, value) {
  if (!dropdown || !value) return null;

  // Try multiple selectors to find options
  const optionSelectors = [
    '[role="option"]',
    'li',
    'div[class*="option"]',
    'div[class*="Option"]',
    '.VirtualizedSelectOption',
    '.Select-option'
  ];

  let options = [];
  for (const selector of optionSelectors) {
    const found = dropdown.querySelectorAll(selector);
    if (found.length > 0) {
      options = found;
      break;
    }
  }

  if (options.length === 0) {
    console.warn('⚠️  No options found in dropdown');
    return null;
  }

  const lowerValue = String(value).toLowerCase().trim();

  console.log(`🔍 Searching for "${lowerValue}" in ${options.length} options`);

  // Try exact match first
  for (const option of options) {
    const text = option.textContent.toLowerCase().trim();
    if (text === lowerValue) {
      console.log(`✅ Exact match found: "${option.textContent.trim()}"`);
      return option;
    }
  }

  // Try case-insensitive starts with
  for (const option of options) {
    const text = option.textContent.toLowerCase().trim();
    if (text.startsWith(lowerValue)) {
      console.log(`✅ Starts-with match found: "${option.textContent.trim()}"`);
      return option;
    }
  }

  // Try partial match (option contains value OR value contains option)
  for (const option of options) {
    const text = option.textContent.toLowerCase().trim();
    if (text.includes(lowerValue) || lowerValue.includes(text)) {
      console.log(`✅ Partial match found: "${option.textContent.trim()}"`);
      return option;
    }
  }

  // Try word match (for multi-word values)
  const valueWords = lowerValue.split(/\s+/);
  for (const option of options) {
    const text = option.textContent.toLowerCase().trim();
    const textWords = text.split(/\s+/);

    // Check if any value word matches any text word
    const hasMatch = valueWords.some(vw => textWords.some(tw => tw.includes(vw) || vw.includes(tw)));
    if (hasMatch) {
      console.log(`✅ Word match found: "${option.textContent.trim()}"`);
      return option;
    }
  }

  console.warn(`⚠️  No matching option found for "${value}"`);
  console.log('Available options:', Array.from(options).slice(0, 10).map(o => o.textContent.trim()).join(', '));

  // Return first option as fallback if value is very short (like "M" for "Male")
  if (lowerValue.length <= 2 && options.length > 0) {
    console.log(`ℹ️  Using first option as fallback for short value "${value}"`);
    return options[0];
  }

  return null;
}

async function fillSearchableField(selector, value, pauseForSelection = false) {
  console.log(`🔍 Filling searchable field: ${selector} = "${value}"`);

  // If pauseForSelection is true (e.g., for diagnosis fields), just show message
  if (pauseForSelection) {
    console.log(`ℹ️  Searchable field requires manual selection: ${selector}`);
    return { success: true, selector, value, manualSelection: true, pauseForSelection: true };
  }

  // For other searchable fields (Gender, Occupation, Education, etc.), auto-fill like dropdowns
  return await fillDropdown(selector, value, true);
}

async function fillRadioButton(selector, value) {
  let radio = document.querySelector(`${selector}[value="${value}"]`);

  if (!radio) {
    const labels = document.querySelectorAll(`${selector} label`);
    for (const label of labels) {
      if (label.textContent.trim().toLowerCase() === value.toLowerCase()) {
        radio = label.querySelector('input[type="radio"]') || label.previousElementSibling;
        break;
      }
    }
  }

  if (!radio) {
    // Radio button not found - user will select manually
    console.warn(`⚠️  Radio button not found: ${selector} = "${value}"`);
    return { success: true, selector, value, manualSelection: true };
  }

  // Actually click radio - it works!
  radio.click();
  await sleep(100);
  triggerChangeEvents(radio);

  console.log(`✅ Radio clicked: "${value}"`);
  return { success: true, selector, value };
}

async function fillCheckbox(selector, value) {
  // Just show visual hint - don't click
  const displayValue = (typeof value === 'boolean') ? (value ? 'Yes' : 'No') : value;
  const success = addVisualHint(selector, displayValue, 'Checkbox');
  await sleep(100);
  return { success: true, selector, value, visualHint: true };
}

async function fillField(selector, value, fieldType, fuzzyMatch = true, pauseForSelection = false) {
  // Handle auto-fill values
  if (value === '__TODAY__' || value === 'today') {
    const today = new Date().toISOString().split('T')[0];
    value = today;
  }

  if (value === null || value === undefined || value === '') {
    return { success: true, skipped: true, reason: 'Empty value', selector };
  }

  switch (fieldType.toLowerCase()) {
    case 'text':
    case 'input':
    case 'textarea':
      return await fillTextField(selector, value);

    case 'dropdown':
    case 'select':
      return await fillDropdown(selector, value, fuzzyMatch);

    case 'date':
    case 'datepicker':
      return await fillDateField(selector, value);

    case 'searchable':
    case 'autocomplete':
      return await fillSearchableField(selector, value, pauseForSelection);

    case 'radio':
      return await fillRadioButton(selector, value);

    case 'checkbox':
      return await fillCheckbox(selector, value);

    default:
      throw new Error(`Unknown field type: ${fieldType}`);
  }
}

// ========== Message Handler ==========

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'Content script alive' });
      break;

    case 'CHECK_PAGE':
      // Check if we're on the correct DHIMS2 page
      const isDHIMS2 = window.location.hostname.includes('chimgh.org');
      sendResponse({ success: true, isDHIMS2 });
      break;

    case 'FILL_FORM':
      // Handle form filling asynchronously
      handleFormFill(message, sendResponse);
      return true; // Keep channel open for async response

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

async function handleFormFill(message, sendResponse) {
  try {
    const { mapping, rowData, rowNumber } = message;

    console.log('Starting form fill for row:', rowNumber);
    console.log('Mapping:', mapping);
    console.log('Row data:', rowData);

    const results = [];
    const errors = [];
    let pausedForSearchable = false;
    let pausedField = null;

    // Fill each field sequentially
    for (let i = 0; i < mapping.length; i++) {
      const field = mapping[i];

      // Check for transformed values first
      let value;
      if (field.transform === 'age_number') {
        value = rowData[field.excelColumn + '_NUMBER'];
      } else if (field.transform === 'age_unit') {
        value = rowData[field.excelColumn + '_UNIT'];
      } else if (field.excelColumn === '__TODAY__' || field.autoFill === 'today') {
        // Automatically fill with current date
        value = '__TODAY__';
      } else {
        value = rowData[field.excelColumn];
      }

      try {
        console.log(`Filling field ${i + 1}/${mapping.length}: ${field.formField}`, { value, transform: field.transform });

        const result = await fillField(
          field.selector,
          value,
          field.type,
          field.fuzzyMatch !== false,
          field.pauseForSelection || false
        );

        results.push({
          field: field.formField,
          ...result
        });

        // Track fields that need user action (dropdowns) but continue filling
        if (result.requiresUserAction) {
          console.log(`ℹ️  Field requires manual selection: ${field.formField}`);
          // Don't break - continue to next field
        }

        // Send progress update
        chrome.runtime.sendMessage({
          type: 'FILL_PROGRESS',
          current: i + 1,
          total: mapping.length,
          currentField: field.formField
        });

      } catch (error) {
        console.error(`Error filling field ${field.formField}:`, error);
        errors.push({
          field: field.formField,
          selector: field.selector,
          error: error.message
        });
      }
    }

    // Count fields that need manual action
    const manualFields = results.filter(r => r.requiresUserAction);

    // Send response
    sendResponse({
      success: true,
      completed: true,
      results,
      errors,
      filledCount: results.filter(r => r.success && !r.skipped).length,
      manualCount: manualFields.length,
      errorCount: errors.length,
      message: manualFields.length > 0
        ? `Filled ${results.length} fields. ${manualFields.length} dropdown(s) need manual selection.`
        : `All ${results.length} fields filled successfully!`
    });

  } catch (error) {
    console.error('Form fill error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Notify background that content script is ready
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  url: window.location.href
});

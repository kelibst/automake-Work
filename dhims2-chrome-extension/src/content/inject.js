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

  input.focus();
  await sleep(100);
  input.value = value;
  triggerChangeEvents(input);
  await sleep(100);

  return { success: true, selector, value };
}

async function fillDropdown(selector, value, fuzzyMatch = true) {
  const select = document.querySelector(selector);
  if (!select) throw new Error(`Dropdown not found: ${selector}`);

  select.focus();
  await sleep(100);

  let matchedOption = null;
  const options = Array.from(select.options);

  // Try exact match
  matchedOption = options.find(opt => opt.text === value || opt.value === value);

  // Try case-insensitive
  if (!matchedOption && fuzzyMatch) {
    const lowerValue = value.toLowerCase();
    matchedOption = options.find(
      opt => opt.text.toLowerCase() === lowerValue || opt.value.toLowerCase() === lowerValue
    );
  }

  // Try partial match
  if (!matchedOption && fuzzyMatch) {
    const lowerValue = value.toLowerCase();
    matchedOption = options.find(
      opt => opt.text.toLowerCase().includes(lowerValue) || lowerValue.includes(opt.text.toLowerCase())
    );
  }

  // Try Levenshtein distance
  if (!matchedOption && fuzzyMatch) {
    const distances = options.map(opt => ({
      option: opt,
      distance: levenshteinDistance(value.toLowerCase(), opt.text.toLowerCase())
    }));
    distances.sort((a, b) => a.distance - b.distance);

    if (distances.length > 0 && distances[0].distance < value.length * 0.3) {
      matchedOption = distances[0].option;
    }
  }

  if (!matchedOption) {
    throw new Error(`No matching option for: ${value}`);
  }

  select.value = matchedOption.value;
  triggerChangeEvents(select);
  await sleep(100);

  return {
    success: true,
    selector,
    value,
    matchedValue: matchedOption.text,
    fuzzyMatched: matchedOption.text !== value
  };
}

async function fillDateField(selector, value) {
  const input = document.querySelector(selector);
  if (!input) throw new Error(`Date field not found: ${selector}`);

  input.focus();
  await sleep(100);

  // Format date if needed
  let formattedDate = value;
  if (value && !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      formattedDate = date.toISOString().split('T')[0];
    }
  }

  input.value = formattedDate;
  triggerChangeEvents(input);
  await sleep(100);

  return { success: true, selector, value: formattedDate };
}

async function fillSearchableField(selector, value, pauseForSelection = false) {
  const input = document.querySelector(selector);
  if (!input) throw new Error(`Searchable field not found: ${selector}`);

  input.focus();
  input.click();
  await sleep(200);

  input.value = '';
  triggerChangeEvents(input);
  await sleep(100);

  // Type character by character
  for (let i = 0; i < value.length; i++) {
    input.value += value[i];
    triggerChangeEvents(input);
    await sleep(50);
  }

  await sleep(800); // Wait for dropdown to appear

  // For React-Select dropdowns (not diagnosis), try to auto-select first option
  if (!pauseForSelection) {
    // Try to find and click first dropdown option
    await sleep(200);

    // Look for dropdown menu (React-Select pattern)
    const dropdown = document.querySelector('.Select-menu-outer, [class*="menu"], [class*="listbox"]');
    if (dropdown) {
      const firstOption = dropdown.querySelector('[class*="option"]:first-child, [role="option"]:first-child, li:first-child');
      if (firstOption) {
        firstOption.click();
        await sleep(200);
        return {
          success: true,
          selector,
          value,
          autoSelected: true
        };
      }
    }

    // If no dropdown found, might need manual selection
    return {
      success: true,
      selector,
      value,
      requiresUserAction: true,
      message: 'Typed value, please select from dropdown'
    };
  }

  // For diagnosis fields, always pause
  return {
    success: true,
    selector,
    value,
    requiresUserAction: true,
    message: 'Please select from dropdown'
  };
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

  if (!radio) throw new Error(`Radio button not found for: ${value}`);

  radio.click();
  await sleep(100);
  triggerChangeEvents(radio);

  return { success: true, selector, value };
}

async function fillCheckbox(selector, value) {
  const checkbox = document.querySelector(selector);
  if (!checkbox) throw new Error(`Checkbox not found: ${selector}`);

  let shouldCheck = false;
  if (typeof value === 'boolean') {
    shouldCheck = value;
  } else if (typeof value === 'string') {
    shouldCheck = ['yes', 'true', '1', 'checked'].includes(value.toLowerCase());
  }

  if (checkbox.checked !== shouldCheck) {
    checkbox.click();
    await sleep(100);
  }

  triggerChangeEvents(checkbox);
  return { success: true, selector, value: shouldCheck };
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
      const value = rowData[field.excelColumn];

      try {
        console.log(`Filling field ${i + 1}/${mapping.length}: ${field.formField}`);

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

        // Check if we need to pause for user action
        if (result.requiresUserAction) {
          pausedForSearchable = true;
          pausedField = field.formField;
          console.log('Pausing for searchable field:', field.formField);
          break; // Stop filling, wait for user to select
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

    // Send response
    if (pausedForSearchable) {
      sendResponse({
        success: true,
        paused: true,
        pausedField,
        message: `Paused at searchable field: ${pausedField}. Please select from dropdown and continue.`,
        results,
        errors
      });
    } else {
      sendResponse({
        success: true,
        completed: true,
        results,
        errors,
        filledCount: results.filter(r => r.success && !r.skipped).length,
        errorCount: errors.length
      });
    }

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

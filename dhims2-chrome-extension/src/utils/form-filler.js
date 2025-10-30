/**
 * Form Filler Utility
 * Handles filling different types of form fields with data
 */

class FormFiller {
  /**
   * Sleep/delay utility
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Trigger change events for React/Angular forms
   * @param {HTMLElement} element - The input element
   */
  static triggerChangeEvents(element) {
    // Create and dispatch various events that frameworks listen to
    const events = [
      new Event('input', { bubbles: true }),
      new Event('change', { bubbles: true }),
      new Event('blur', { bubbles: true })
    ];

    events.forEach(event => element.dispatchEvent(event));

    // For React specifically, we need to trigger the native setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;

    if (element.tagName === 'INPUT' && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, element.value);
    } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, element.value);
    }
  }

  /**
   * Fill a text input field
   * @param {string} selector - CSS selector for the input
   * @param {string} value - Value to fill
   * @returns {Promise<Object>} Result object with success status
   */
  static async fillTextInput(selector, value) {
    try {
      const input = document.querySelector(selector);

      if (!input) {
        return {
          success: false,
          error: `Input field not found: ${selector}`
        };
      }

      // Focus the input
      input.focus();
      await this.sleep(100);

      // Set value
      input.value = value;

      // Trigger change events
      this.triggerChangeEvents(input);

      await this.sleep(100);

      return {
        success: true,
        selector,
        value
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        selector
      };
    }
  }

  /**
   * Fill a dropdown/select field with fuzzy matching
   * @param {string} selector - CSS selector for the select
   * @param {string} value - Value to select
   * @param {boolean} fuzzyMatch - Enable fuzzy matching
   * @returns {Promise<Object>} Result object with success status
   */
  static async fillDropdown(selector, value, fuzzyMatch = true) {
    try {
      const select = document.querySelector(selector);

      if (!select) {
        return {
          success: false,
          error: `Dropdown not found: ${selector}`
        };
      }

      // Focus the select
      select.focus();
      await this.sleep(100);

      // Try to find matching option
      let matchedOption = null;
      const options = Array.from(select.options);

      // 1. Try exact match (case-sensitive)
      matchedOption = options.find(opt => opt.text === value || opt.value === value);

      // 2. Try exact match (case-insensitive)
      if (!matchedOption && fuzzyMatch) {
        const lowerValue = value.toLowerCase();
        matchedOption = options.find(
          opt => opt.text.toLowerCase() === lowerValue || opt.value.toLowerCase() === lowerValue
        );
      }

      // 3. Try partial match (contains)
      if (!matchedOption && fuzzyMatch) {
        const lowerValue = value.toLowerCase();
        matchedOption = options.find(
          opt => opt.text.toLowerCase().includes(lowerValue) || lowerValue.includes(opt.text.toLowerCase())
        );
      }

      // 4. Try Levenshtein distance (closest match)
      if (!matchedOption && fuzzyMatch) {
        const distances = options.map(opt => ({
          option: opt,
          distance: this.levenshteinDistance(value.toLowerCase(), opt.text.toLowerCase())
        }));
        distances.sort((a, b) => a.distance - b.distance);

        // If closest match is reasonably close (less than 30% different)
        if (distances.length > 0 && distances[0].distance < value.length * 0.3) {
          matchedOption = distances[0].option;
        }
      }

      if (!matchedOption) {
        return {
          success: false,
          error: `No matching option found for value: ${value}`,
          selector,
          fuzzyMatched: false
        };
      }

      // Set the value
      select.value = matchedOption.value;

      // Trigger change events
      this.triggerChangeEvents(select);

      await this.sleep(100);

      return {
        success: true,
        selector,
        value,
        matchedValue: matchedOption.text,
        fuzzyMatched: matchedOption.text !== value && matchedOption.value !== value
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        selector
      };
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  static levenshteinDistance(str1, str2) {
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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Fill a date field
   * @param {string} selector - CSS selector for the date input
   * @param {string} value - Date value (YYYY-MM-DD format)
   * @returns {Promise<Object>} Result object with success status
   */
  static async fillDateField(selector, value) {
    try {
      const input = document.querySelector(selector);

      if (!input) {
        return {
          success: false,
          error: `Date field not found: ${selector}`
        };
      }

      // Focus the input
      input.focus();
      await this.sleep(100);

      // Format date if needed
      let formattedDate = value;
      if (value && !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Try to parse and format
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().split('T')[0];
        }
      }

      // Set value
      input.value = formattedDate;

      // Trigger change events
      this.triggerChangeEvents(input);

      await this.sleep(100);

      return {
        success: true,
        selector,
        value: formattedDate
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        selector
      };
    }
  }

  /**
   * Fill a searchable/autocomplete field (like DHIS2 searchables)
   * This will type the value and pause for user to select from results
   * @param {string} selector - CSS selector for the searchable input
   * @param {string} value - Search value to type
   * @returns {Promise<Object>} Result object with pause signal
   */
  static async fillSearchableField(selector, value) {
    try {
      const input = document.querySelector(selector);

      if (!input) {
        return {
          success: false,
          error: `Searchable field not found: ${selector}`
        };
      }

      // Focus and click the input
      input.focus();
      input.click();
      await this.sleep(200);

      // Clear any existing value
      input.value = '';
      this.triggerChangeEvents(input);
      await this.sleep(100);

      // Type the search value character by character for better autocomplete trigger
      for (let i = 0; i < value.length; i++) {
        input.value += value[i];
        this.triggerChangeEvents(input);
        await this.sleep(50);
      }

      // Wait a bit for dropdown to appear
      await this.sleep(500);

      return {
        success: true,
        selector,
        value,
        requiresUserAction: true,
        message: 'Searchable field filled. Please select from dropdown and click Continue.'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        selector
      };
    }
  }

  /**
   * Fill a radio button
   * @param {string} selector - CSS selector for the radio input or parent container
   * @param {string} value - Value to select
   * @returns {Promise<Object>} Result object with success status
   */
  static async fillRadioButton(selector, value) {
    try {
      // Try to find radio button by value
      let radio = document.querySelector(`${selector}[value="${value}"]`);

      // If not found, try to find by label text
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
        return {
          success: false,
          error: `Radio button not found for value: ${value}`,
          selector
        };
      }

      // Click the radio button
      radio.click();
      await this.sleep(100);

      // Trigger change events
      this.triggerChangeEvents(radio);

      return {
        success: true,
        selector,
        value
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        selector
      };
    }
  }

  /**
   * Fill a checkbox
   * @param {string} selector - CSS selector for the checkbox
   * @param {boolean|string} value - true/false or 'yes'/'no'
   * @returns {Promise<Object>} Result object with success status
   */
  static async fillCheckbox(selector, value) {
    try {
      const checkbox = document.querySelector(selector);

      if (!checkbox) {
        return {
          success: false,
          error: `Checkbox not found: ${selector}`
        };
      }

      // Convert value to boolean
      let shouldCheck = false;
      if (typeof value === 'boolean') {
        shouldCheck = value;
      } else if (typeof value === 'string') {
        shouldCheck = ['yes', 'true', '1', 'checked'].includes(value.toLowerCase());
      }

      // Set checked state
      if (checkbox.checked !== shouldCheck) {
        checkbox.click();
        await this.sleep(100);
      }

      // Trigger change events
      this.triggerChangeEvents(checkbox);

      return {
        success: true,
        selector,
        value: shouldCheck
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        selector
      };
    }
  }

  /**
   * Fill a textarea
   * @param {string} selector - CSS selector for the textarea
   * @param {string} value - Value to fill
   * @returns {Promise<Object>} Result object with success status
   */
  static async fillTextarea(selector, value) {
    try {
      const textarea = document.querySelector(selector);

      if (!textarea) {
        return {
          success: false,
          error: `Textarea not found: ${selector}`
        };
      }

      // Focus the textarea
      textarea.focus();
      await this.sleep(100);

      // Set value
      textarea.value = value;

      // Trigger change events
      this.triggerChangeEvents(textarea);

      await this.sleep(100);

      return {
        success: true,
        selector,
        value
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        selector
      };
    }
  }

  /**
   * Fill a form field based on its type
   * @param {string} selector - CSS selector for the field
   * @param {string} value - Value to fill
   * @param {string} fieldType - Type of field (text, dropdown, date, searchable, radio, checkbox, textarea)
   * @param {boolean} fuzzyMatch - Enable fuzzy matching for dropdowns
   * @returns {Promise<Object>} Result object with success status
   */
  static async fillField(selector, value, fieldType, fuzzyMatch = true) {
    // Skip if value is empty or null
    if (value === null || value === undefined || value === '') {
      return {
        success: true,
        skipped: true,
        reason: 'Empty value',
        selector
      };
    }

    switch (fieldType.toLowerCase()) {
      case 'text':
      case 'input':
        return await this.fillTextInput(selector, value);

      case 'dropdown':
      case 'select':
        return await this.fillDropdown(selector, value, fuzzyMatch);

      case 'date':
      case 'datepicker':
        return await this.fillDateField(selector, value);

      case 'searchable':
      case 'autocomplete':
        return await this.fillSearchableField(selector, value);

      case 'radio':
        return await this.fillRadioButton(selector, value);

      case 'checkbox':
        return await this.fillCheckbox(selector, value);

      case 'textarea':
        return await this.fillTextarea(selector, value);

      default:
        return {
          success: false,
          error: `Unknown field type: ${fieldType}`,
          selector
        };
    }
  }

  /**
   * Wait for element to exist in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<HTMLElement|null>}
   */
  static async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await this.sleep(100);
    }

    return null;
  }

  /**
   * Check if form exists on page
   * @param {Array} fieldMappings - Array of field mapping objects
   * @returns {Object} Validation result
   */
  static validateFormExists(fieldMappings) {
    const missing = [];
    const found = [];

    for (const field of fieldMappings) {
      const element = document.querySelector(field.selector);
      if (element) {
        found.push(field.formField);
      } else {
        missing.push({
          formField: field.formField,
          selector: field.selector
        });
      }
    }

    return {
      valid: missing.length === 0,
      foundCount: found.length,
      missingCount: missing.length,
      missing,
      found
    };
  }
}

export default FormFiller;

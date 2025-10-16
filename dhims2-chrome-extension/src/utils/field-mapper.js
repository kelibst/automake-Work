/**
 * Field Mapper - Maps Excel columns to DHIMS2 data elements
 * Uses the discovered API configuration to build correct payloads
 */

class FieldMapper {
  constructor(apiConfig) {
    this.apiConfig = apiConfig;
    this.fieldMappings = apiConfig?.fieldMappings || {};
    this.staticValues = apiConfig?.staticValues || {};
  }

  /**
   * Create mapping between Excel columns and DHIMS2 data elements
   * @param {Array} excelHeaders - Column headers from Excel
   * @returns {Object} Mapping configuration
   */
  createMapping(excelHeaders) {
    const mapping = {};
    const unmapped = [];
    const suggestions = {};

    // Get list of DHIMS2 data elements from discovered config
    const dataElements = Object.keys(this.fieldMappings);

    excelHeaders.forEach(header => {
      // Try to find best match
      const match = this.findBestMatch(header, dataElements);

      if (match) {
        mapping[header] = {
          dataElement: match,
          excelColumn: header,
          type: this.fieldMappings[match]?.type || 'text',
          required: true
        };
      } else {
        unmapped.push(header);
        // Provide suggestions based on similarity
        suggestions[header] = this.getSuggestions(header, dataElements);
      }
    });

    return {
      mapping,
      unmapped,
      suggestions,
      totalMapped: Object.keys(mapping).length,
      totalUnmapped: unmapped.length
    };
  }

  /**
   * Find best matching data element for Excel column
   * @param {String} excelHeader - Excel column name
   * @param {Array} dataElements - Available DHIMS2 data elements
   * @returns {String|null} Best matching data element ID
   */
  findBestMatch(excelHeader, dataElements) {
    const normalized = this.normalizeString(excelHeader);

    // Common field name mappings
    const commonMappings = {
      'patient_name': ['name', 'patient', 'fullname'],
      'patient_no': ['number', 'patient_number', 'id', 'patient_id'],
      'age': ['age', 'patient_age'],
      'gender': ['sex', 'gender', 'male_female'],
      'address': ['location', 'residence', 'address'],
      'admission_date': ['admission', 'date_admitted', 'admit_date'],
      'discharge_date': ['discharge', 'date_discharged'],
      'diagnosis': ['diagnosis', 'principal_diagnosis', 'condition'],
      'outcome': ['result', 'outcome', 'status'],
      'nhis': ['insurance', 'nhis', 'health_insurance']
    };

    // Try exact match first
    for (const [key, aliases] of Object.entries(commonMappings)) {
      if (aliases.some(alias => normalized.includes(alias))) {
        // Find data element that matches this key
        const matchingElement = dataElements.find(de => {
          const elementInfo = this.fieldMappings[de];
          const sampleValue = elementInfo?.value?.toString().toLowerCase() || '';
          return aliases.some(alias => sampleValue.includes(alias));
        });
        if (matchingElement) return matchingElement;
      }
    }

    return null;
  }

  /**
   * Get suggestions for unmapped column
   * @param {String} excelHeader - Excel column name
   * @param {Array} dataElements - Available DHIMS2 data elements
   * @returns {Array} Suggested data elements
   */
  getSuggestions(excelHeader, dataElements) {
    const normalized = this.normalizeString(excelHeader);
    const suggestions = [];

    dataElements.forEach(de => {
      const elementInfo = this.fieldMappings[de];
      const score = this.calculateSimilarity(normalized, de);

      if (score > 0.3) {
        suggestions.push({
          dataElement: de,
          score,
          type: elementInfo?.type,
          sampleValue: elementInfo?.value
        });
      }
    });

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /**
   * Transform Excel record to DHIMS2 event payload
   * @param {Object} excelRecord - Single row from Excel
   * @param {Object} columnMapping - Mapping configuration
   * @returns {Object} DHIMS2 event payload
   */
  transformRecord(excelRecord, columnMapping) {
    const dataValues = [];

    // Map each Excel column to DHIMS2 dataValue
    Object.entries(columnMapping.mapping).forEach(([excelColumn, config]) => {
      const value = excelRecord[excelColumn];

      if (value !== null && value !== undefined && value !== '') {
        dataValues.push({
          dataElement: config.dataElement,
          value: this.formatValue(value, config.type)
        });
      }
    });

    // Build event object
    const event = {
      program: this.staticValues.program,
      orgUnit: this.staticValues.orgUnit,
      programStage: this.staticValues.programStage,
      status: this.staticValues.status || 'COMPLETED',
      occurredAt: this.extractDate(excelRecord) || new Date().toISOString().split('T')[0],
      dataValues
    };

    // Wrap in events array if needed
    if (this.staticValues.isWrapped) {
      return { events: [event] };
    }

    return event;
  }

  /**
   * Format value based on field type
   * @param {*} value - Raw value from Excel
   * @param {String} type - Field type (text, date, number, boolean)
   * @returns {String} Formatted value
   */
  formatValue(value, type) {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const strValue = String(value).trim();

    switch (type) {
      case 'date':
        try {
          const date = new Date(strValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          // Return as-is
        }
        return strValue;

      case 'number':
        const num = parseFloat(strValue);
        return isNaN(num) ? strValue : String(num);

      case 'boolean':
        const lower = strValue.toLowerCase();
        if (['yes', 'true', '1'].includes(lower)) return 'true';
        if (['no', 'false', '0'].includes(lower)) return 'false';
        return strValue;

      default:
        return strValue;
    }
  }

  /**
   * Extract date from record (tries common date fields)
   * @param {Object} record - Excel record
   * @returns {String|null} Date in YYYY-MM-DD format
   */
  extractDate(record) {
    const dateFields = ['admission_date', 'date', 'occurred_at', 'event_date'];

    for (const field of dateFields) {
      const value = record[field];
      if (value) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Normalize string for comparison
   * @param {String} str - String to normalize
   * @returns {String} Normalized string
   */
  normalizeString(str) {
    return String(str)
      .toLowerCase()
      .replace(/[_\s-]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Calculate similarity between two strings
   * @param {String} str1 - First string
   * @param {String} str2 - Second string
   * @returns {Number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Levenshtein distance
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const costs = [];
    for (let i = 0; i <= longer.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[shorter.length] = lastValue;
    }

    return 1 - costs[shorter.length] / longer.length;
  }

  /**
   * Validate that all required fields are mapped
   * @param {Object} mapping - Current mapping
   * @returns {Object} Validation result
   */
  validateMapping(mapping) {
    const errors = [];
    const warnings = [];

    // Check if we have at least some mappings
    if (Object.keys(mapping.mapping).length === 0) {
      errors.push('No fields are mapped. Please map at least one field.');
    }

    // Warn about unmapped columns
    if (mapping.unmapped.length > 0) {
      warnings.push(`${mapping.unmapped.length} columns are not mapped: ${mapping.unmapped.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default FieldMapper;

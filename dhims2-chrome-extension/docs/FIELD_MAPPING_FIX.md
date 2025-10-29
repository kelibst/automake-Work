# Field Mapping Integration Fix

**Date:** 2025-10-29
**Issue:** Empty payloads during upload - records have no data fields
**Status:** 🔧 FIX IDENTIFIED - Ready to implement

---

## Root Cause Analysis

### The Problem

When uploading records, the console shows:
```javascript
recordFields: ['_rowNumber'],  // Only has _rowNumber!
fieldMappingsAvailable: Array(14),  // Has 14 data element IDs
dataValues: [],  // EMPTY!
payload: { events: [{...}] }  // No data!
```

### Why This Happens

There's a **structural mismatch** between two parts of the system:

#### 1. API Discovery Output (`src/background/api-interceptor.js`)

Saves field mappings with **data element IDs as keys**:
```javascript
fieldMappings: {
  "h0Ef6ykTpNB": {
    index: 0,
    value: "VR-A01-AAG1234",
    type: "text"
  },
  "nk15h7fzCLz": {
    index: 1,
    value: "NEW BAIKA",
    type: "text"
  }
  // ... more data element IDs
}
```

**Problem:** No Excel column names! The uploader can't match Excel data to DHIS2 fields.

#### 2. Expected Structure (Used by data-cleaner and uploader)

Field mappings should have **field names as keys** with `excelColumn` property:
```javascript
fieldMappings: {
  "patientNumber": {
    dataElement: "h0Ef6ykTpNB",
    excelColumn: "Patient No.",
    type: "text",
    required: true
  },
  "address": {
    dataElement: "nk15h7fzCLz",
    excelColumn: "Locality/Address/Residence",
    type: "text",
    required: true
  }
  // ... more field names
}
```

**Result:** When transforming Excel records, the uploader looks for field names like `patientNumber`, but only finds data element IDs like `h0Ef6ykTpNB`, so no fields match and the record ends up empty.

---

## The Solution

### Use the Predefined Field Mapping Configuration

The file `lib/field-mapper.js` contains the **complete, correct field mapping structure** that matches the Excel format. We need to integrate this into the extension.

### Architecture Decision

**Option 1: Import lib/field-mapper.js into Extension** ✅ RECOMMENDED
- Copy the field mappings from `lib/field-mapper.js` into the extension
- Create `src/utils/field-definitions.js` with the predefined mappings
- Use API discovery to **verify** data element IDs match (not to discover structure)
- If API discovery finds different IDs, warn the user but use predefined structure

**Option 2: Reverse-engineer field mappings from API discovery** ❌ NOT RECOMMENDED
- Try to guess Excel column names from sample values
- Too error-prone and fragile
- Doesn't work for empty optional fields

**Option 3: Require manual mapping UI** ❌ TOO COMPLEX
- User manually maps each Excel column to each DHIS2 field
- Too much work for user
- Defeats the purpose of "smart" automation

---

## Implementation Plan

### Step 1: Create Field Definitions File

**File:** `src/utils/field-definitions.js`

```javascript
/**
 * Field Definitions - Predefined Excel to DHIS2 Field Mappings
 * This defines the expected Excel structure and how it maps to DHIS2
 */

export const FIELD_MAPPINGS = {
  patientNumber: {
    excelColumn: 'Patient No.',
    dataElement: 'h0Ef6ykTpNB',
    type: 'text',
    required: true
  },
  address: {
    excelColumn: 'Locality/Address/Residence',
    dataElement: 'nk15h7fzCLz',
    type: 'text',
    required: true
  },
  ageNumber: {
    excelColumn: 'Age',
    dataElement: 'upqhIcii1iC',
    type: 'number',
    required: true,
    extractFrom: 'age'  // Needs special handling
  },
  ageUnit: {
    excelColumn: 'Age',
    dataElement: 'WZ5rS7QuECT',
    type: 'dropdown',
    required: true,
    extractFrom: 'age',  // Needs special handling
    options: ['years', 'months', 'days']
  },
  gender: {
    excelColumn: 'Gender',
    dataElement: 'fg8sMCaTOrK',
    type: 'dropdown',
    required: true,
    options: ['Male', 'Female']
  },
  occupation: {
    excelColumn: 'Occupation',
    dataElement: 'qAWldjTeMIs',
    type: 'dropdown',
    required: true
  },
  education: {
    excelColumn: 'Educational Status',
    dataElement: 'Hi8Cp84CnZQ',
    type: 'dropdown',
    required: true
  },
  dateOfAdmission: {
    excelColumn: 'Date of Admission',
    dataElement: 'HsMaBh3wKed',
    type: 'date',
    required: true
  },
  dateOfDischarge: {
    excelColumn: 'Date of Discharge',
    dataElement: 'sIPe9r0NBbq',
    type: 'date',
    required: true
  },
  speciality: {
    excelColumn: 'Speciality',
    dataElement: 'xpzJAQC4DGe',
    type: 'dropdown',
    required: true
  },
  outcome: {
    excelColumn: 'Outcome of Discharge',
    dataElement: 'OMN7CVW4IaY',
    type: 'dropdown',
    required: true,
    options: ['Absconded', 'Discharged', 'Transferred', 'Unspecified', 'Died']
  },
  principalDiagnosis: {
    excelColumn: 'Principal Diagnosis',
    dataElement: 'yPXPzceTIvq',
    type: 'searchable',
    required: true
  },
  additionalDiagnosis: {
    excelColumn: 'Additional Diagnosis',
    dataElement: 'O15UNfCqavW',
    type: 'searchable',
    required: false
  },
  surgicalProcedure: {
    excelColumn: 'Surgical Procedure',
    dataElement: 'dsVClbnOnm6',
    type: 'radio',
    required: true
  },
  cost: {
    excelColumn: 'Cost of Treatment',
    dataElement: 'fRkwcThGCTM',
    type: 'number',
    required: false
  },
  nhisStatus: {
    excelColumn: 'NHIS Status',
    dataElement: 'ETSl9Q3SUOG',
    type: 'radio',
    required: true
  }
};

export const STATIC_VALUES = {
  program: 'fFYTJRzD2qq',
  orgUnit: 'duCDqCRlWG1',
  programStage: 'LR7JT7ZNg8E',
  status: 'COMPLETED'
};

/**
 * Get field definition by Excel column name
 */
export function getFieldByExcelColumn(excelColumn) {
  return Object.entries(FIELD_MAPPINGS).find(
    ([_, config]) => config.excelColumn === excelColumn
  )?.[0];
}

/**
 * Get field definition by data element ID
 */
export function getFieldByDataElement(dataElementId) {
  return Object.entries(FIELD_MAPPINGS).find(
    ([_, config]) => config.dataElement === dataElementId
  )?.[0];
}

/**
 * Get all Excel column names
 */
export function getAllExcelColumns() {
  return Object.values(FIELD_MAPPINGS).map(config => config.excelColumn);
}

/**
 * Validate API discovery against expected configuration
 */
export function validateDiscoveredConfig(discoveredFieldMappings) {
  const warnings = [];
  const errors = [];

  // Check if discovered data elements match expected
  Object.entries(FIELD_MAPPINGS).forEach(([fieldName, expected]) => {
    const discoveredField = Object.entries(discoveredFieldMappings).find(
      ([dataElementId, _]) => dataElementId === expected.dataElement
    );

    if (!discoveredField) {
      if (expected.required) {
        errors.push(`Missing required field: ${fieldName} (${expected.dataElement})`);
      } else {
        warnings.push(`Missing optional field: ${fieldName} (${expected.dataElement})`);
      }
    }
  });

  // Check for unexpected fields
  Object.keys(discoveredFieldMappings).forEach(dataElementId => {
    const isExpected = Object.values(FIELD_MAPPINGS).some(
      config => config.dataElement === dataElementId
    );

    if (!isExpected) {
      warnings.push(`Unexpected field discovered: ${dataElementId}`);
    }
  });

  return { warnings, errors, isValid: errors.length === 0 };
}
```

### Step 2: Update API Interceptor

**File:** `src/background/api-interceptor.js`

**Change:** After discovering the API, merge with predefined field mappings:

```javascript
async analyzeAndSave(request) {
  // ... existing code to extract discovered data elements ...

  // IMPORT at top of file:
  import { FIELD_MAPPINGS, STATIC_VALUES, validateDiscoveredConfig } from '../utils/field-definitions.js';

  // REPLACE the fieldMappings extraction with:

  // Extract discovered data elements for validation
  const discoveredDataElements = {};
  if (eventData.dataValues && Array.isArray(eventData.dataValues)) {
    eventData.dataValues.forEach((item, index) => {
      if (item.dataElement && item.value !== undefined) {
        discoveredDataElements[item.dataElement] = {
          index: index,
          value: item.value,
          type: this.guessFieldType(item.value)
        };
      }
    });
  }

  // Validate discovered config against expected
  const validation = validateDiscoveredConfig(discoveredDataElements);

  if (!validation.isValid) {
    console.error('❌ API discovery validation failed:', validation.errors);
    throw new Error(`API validation failed:\n${validation.errors.join('\n')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  API discovery warnings:', validation.warnings);
  }

  // Use predefined field mappings (not discovered ones!)
  const fieldMappings = FIELD_MAPPINGS;

  // Use predefined static values (but merge discovered values for verification)
  const staticValues = {
    ...STATIC_VALUES,
    program: eventData.program || STATIC_VALUES.program,
    orgUnit: eventData.orgUnit || STATIC_VALUES.orgUnit,
    programStage: eventData.programStage || STATIC_VALUES.programStage,
    status: eventData.status || STATIC_VALUES.status,
    storedBy: eventData.storedBy || null,
    isWrapped: isWrapped
  };

  // Create configuration object
  const config = {
    discovered: true,
    discoveryDate: new Date().toISOString(),
    endpoint,
    staticValues,
    fieldMappings,  // Now using predefined mappings!
    payload_structure: staticValues,  // For backward compatibility
    discoveredDataElements,  // Store for reference
    validationResult: validation,
    totalFields: Object.keys(fieldMappings).length
  };

  // ... rest of function remains the same ...
}
```

### Step 3: Update Data Transformation in Upload.jsx

**File:** `src/sidepanel/pages/Upload.jsx`

**Change:** Use field mappings correctly when transforming records:

```javascript
// When transforming Excel records to DHIS2 events:

// BEFORE (doesn't work):
Object.entries(apiConfig.fieldMappings || {}).forEach(([fieldName, config]) => {
  const value = record[fieldName];  // ❌ fieldName is data element ID!
  // ...
});

// AFTER (correct):
Object.entries(apiConfig.fieldMappings || {}).forEach(([fieldName, config]) => {
  const excelColumn = config.excelColumn;  // ✅ Get Excel column name
  const value = record[excelColumn];  // ✅ Access record by Excel column

  if (value !== null && value !== undefined && value !== '') {
    dataValues.push({
      dataElement: config.dataElement,
      value: String(value)
    });
  }
});
```

### Step 4: Update Batch Uploader

**File:** `src/background/api-uploader.js`

The batch uploader's `buildPayload()` method already has the correct logic at lines 267-282:

```javascript
// Map each field to DHIS2 data element
Object.entries(this.apiConfig.fieldMappings || {}).forEach(([fieldName, config]) => {
  const value = record[fieldName];  // This needs to use excelColumn!
```

**Change to:**

```javascript
Object.entries(this.apiConfig.fieldMappings || {}).forEach(([fieldName, config]) => {
  const excelColumn = config.excelColumn;
  const value = record[excelColumn];  // ✅ Use Excel column name

  console.log(`  📋 Mapping field: ${fieldName}`, {
    excelColumn: excelColumn,
    hasValue: value !== null && value !== undefined && value !== '',
    value: value,
    dataElement: config.dataElement
  });

  if (value !== null && value !== undefined && value !== '') {
    dataValues.push({
      dataElement: config.dataElement,
      value: String(value)
    });
  }
});
```

---

## Testing Plan

### 1. Verify Field Definitions

```bash
# Check that all data element IDs match DHIS2
node -e "
  const { FIELD_MAPPINGS } = require('./src/utils/field-definitions.js');
  console.log(JSON.stringify(FIELD_MAPPINGS, null, 2));
"
```

### 2. Test API Discovery with Validation

1. Clear existing API config
2. Run API discovery
3. Check console for validation warnings/errors
4. Verify predefined mappings are used (not discovered ones)

### 3. Test Upload with Sample Data

1. Load sample Excel file
2. Check console logs:
   - `🔨 Building payload` should show all field names
   - `recordFields` should list all Excel columns (not just _rowNumber)
   - `dataValuesCount` should be 14-16 (depending on optional fields)
3. Verify payload structure is correct

### 4. Test End-to-End Upload

1. Upload 2-3 test records
2. Verify payload has all data values
3. Check DHIS2 for uploaded records
4. Verify all fields populated correctly

---

## Benefits of This Approach

✅ **Predictable**: Always uses known field structure
✅ **Robust**: Doesn't rely on guessing from sample values
✅ **Validated**: API discovery validates against expected structure
✅ **Maintainable**: Single source of truth for field definitions
✅ **User-Friendly**: No manual mapping required
✅ **Flexible**: Can still detect new/changed fields and warn user

---

## Migration Path

### Phase 1: Add Field Definitions (Immediate)
- Create `src/utils/field-definitions.js`
- No breaking changes

### Phase 2: Update API Interceptor (Next)
- Modify `analyzeAndSave()` to use predefined mappings
- Add validation logic
- Existing configs still work

### Phase 3: Fix Batch Uploader (Critical)
- Update `buildPayload()` to use `excelColumn`
- **This fixes the empty payload bug**

### Phase 4: Update UI (Enhancement)
- Show validation warnings in Discovery tab
- Display field mapping preview before upload

---

## Expected Results After Fix

### Console Logs - Before Fix:
```javascript
🔨 Building payload for record: {
  recordFields: ['_rowNumber'],  // ❌ Only _rowNumber
  fieldMappingsAvailable: ['h0Ef6ykTpNB', ...],  // Data element IDs
  sampleRecordData: {
    patientNumber: undefined,  // ❌ All undefined!
    age: undefined,
    gender: undefined
  }
}

📤 Uploading record: {
  dataValueCount: 0,  // ❌ EMPTY!
  payload: { events: [{ dataValues: [] }] }
}
```

### Console Logs - After Fix:
```javascript
🔨 Building payload for record: {
  recordFields: ['Patient No.', 'Locality/Address/Residence', 'Age', ...],  // ✅ All Excel columns!
  fieldMappingsAvailable: {
    patientNumber: { excelColumn: 'Patient No.', dataElement: 'h0Ef6ykTpNB' },
    ...
  },
  sampleRecordData: {
    patientNumber: "VR-A01-AAG1234",  // ✅ Has values!
    age: "45",
    gender: "Male"
  }
}

📋 Mapping field: patientNumber {
  excelColumn: 'Patient No.',
  hasValue: true,
  value: "VR-A01-AAG1234",
  dataElement: "h0Ef6ykTpNB"
}

📤 Uploading record: {
  dataValueCount: 14,  // ✅ Has data!
  payload: {
    events: [{
      dataValues: [
        { dataElement: 'h0Ef6ykTpNB', value: 'VR-A01-AAG1234' },
        { dataElement: 'nk15h7fzCLz', value: 'NEW BAIKA' },
        ...14 fields total
      ]
    }]
  }
}
```

---

**Status:** Ready for implementation
**Priority:** CRITICAL - Blocks all uploads
**Estimated Time:** 1-2 hours
**Risk:** Low - Only fixes structure, doesn't change logic

---

**End of Document**

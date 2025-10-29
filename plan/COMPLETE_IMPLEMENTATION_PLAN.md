# DHIS2 In-Patient Morbidity - Complete Implementation Plan

**Project:** Chrome Extension for Bulk Excel Upload to DHIS2
**Target Program:** In-Patient Morbidity and Mortality
**Status:** Planning Phase Complete - Ready for Implementation

---

## Executive Summary

Building a Chrome Extension that allows users to:
1. Upload Excel files with patient morbidity data
2. Automatically clean and validate data
3. Preview and fix any issues before upload
4. Bulk upload records to DHIS2 (10 records per batch)
5. Track progress and handle errors gracefully

---

## Part 1: Data Discovery & Configuration

### 1.1 Discover Missing Data Element IDs

**Goal:** Find data element IDs for Additional Diagnosis and Cost fields

**Steps:**
1. Create a new test script: `discover-missing-fields.js`
2. User manually fills a form in DHIS2 with:
   - Additional Diagnosis: Enter a value
   - Cost: Enter a value
3. Capture the API request
4. Extract data element IDs
5. Update configuration file

**Expected Output:**
```json
{
  "additionalDiagnosis": "???",
  "cost": "???"
}
```

### 1.2 Fetch All Required Option Sets

**Goal:** Get all dropdown options from DHIS2

**Option Sets to Fetch:**
- ✅ Education (qINXizfcpoY) - DONE
- ✅ Outcome (fBs4UMMVHIg) - DONE
- ✅ Diagnosis (hAdQhH0A5jt) - DONE
- ⏳ Occupation - Need to discover option set ID
- ⏳ Speciality - Need to discover option set ID
- ⏳ Gender - Need to discover option set ID

**Implementation:**
1. Update `fetch-option-codes.js` to fetch all option sets
2. Save to `config/dhis2-option-sets.json`
3. Create mapping tables for data cleaning

---

## Part 2: Data Cleaning System

### 2.1 Excel Parser Module

**File:** `lib/excel-parser.js`

**Features:**
- Read .xlsx and .xls files
- Detect header row automatically
- Convert to JavaScript objects
- Handle merged cells and empty rows
- Validate required columns exist

**Expected Columns:**
```
- Patient No. (required)
- Age (required)
- Gender (required)
- Locality/Address/Residence (required)
- Occupation (required)
- Educational Status (required)
- Date of Admission (required)
- Date of Discharge (required)
- Speciality (required)
- Outcome of Discharge (required)
- Principal Diagnosis (required)
- Additional Diagnosis (optional)
- Surgical Procedure (required)
- Cost of Treatment (optional)
- NHIS Status (required)
```

**Sample Usage:**
```javascript
const parser = new ExcelParser();
const data = await parser.parseFile(file);
// Returns: Array of row objects
```

### 2.2 Data Cleaner Module

**File:** `lib/data-cleaner.js`

#### 2.2.1 Age Cleaner
**Input:** `"20 Year(s)"`, `"6 Month(s)"`, `"2 Day(s)"`
**Output:** `{ number: "20", unit: "years" }`

**Algorithm:**
```javascript
cleanAge(ageString) {
  // Extract number and unit
  const match = ageString.match(/(\d+)\s*(Year|Month|Day)/i);
  if (!match) {
    throw new ValidationError(`Invalid age format: "${ageString}"`);
  }

  // Normalize unit to lowercase plural
  const unit = match[2].toLowerCase();
  const normalizedUnit = unit.endsWith('s') ? unit : unit + 's';

  return {
    number: match[1],
    unit: normalizedUnit
  };
}
```

**Edge Cases:**
- Missing unit: Flag as error
- Zero or negative age: Flag as error
- Very high age (>150 years): Flag as warning

#### 2.2.2 Date Cleaner
**Input:** `"26-06-2025"` (DD-MM-YYYY)
**Output:** `"2025-06-26"` (ISO format YYYY-MM-DD)

**Algorithm:**
```javascript
cleanDate(dateString) {
  // Handle DD-MM-YYYY format
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Validate date
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) {
        throw new ValidationError(`Invalid date: "${dateString}"`);
      }

      return isoDate;
    }
  }

  // Handle Excel serial dates
  if (typeof dateString === 'number') {
    const date = this.excelDateToJSDate(dateString);
    return date.toISOString().split('T')[0];
  }

  throw new ValidationError(`Unknown date format: "${dateString}"`);
}
```

**Validations:**
- Discharge date must be >= Admission date
- Dates should be within reasonable range (not 100 years ago or 10 years in future)

#### 2.2.3 Education Mapper
**Mapping Table:**
```javascript
const educationMapping = {
  // Case-insensitive mappings
  'SHS': 'SHS/Secondary',
  'shs': 'SHS/Secondary',
  'Secondary': 'SHS/Secondary',
  'Senior High': 'SHS/Secondary',

  'JHS': 'JHS/Middle School',
  'jhs': 'JHS/Middle School',
  'Junior Secondary': 'JHS/Middle School',
  'Middle School': 'JHS/Middle School',

  'Tertiary': 'Tertiary',
  'tertiary': 'Tertiary',
  'University': 'Tertiary',
  'College': 'Tertiary',
  'Polytechnic': 'Tertiary',

  'Primary': 'Primary',
  'primary': 'Primary',

  'None': 'None',
  'none': 'None',
  'Illiterate': 'None',
  'No education': 'None'
};

mapEducation(value) {
  const trimmed = value.trim();
  const mapped = educationMapping[trimmed];

  if (!mapped) {
    throw new ValidationError(`Unknown education value: "${value}". Valid options: SHS, JHS, Tertiary, Primary, None`);
  }

  return mapped;
}
```

#### 2.2.4 Outcome Mapper
**Fixed Mapping (per user requirement):**
```javascript
const outcomeMapping = {
  'Referred': 'Transferred',  // Auto-map as confirmed
  'Discharge': 'Discharged',
  'Discharged': 'Discharged',
  'Transferred': 'Transferred',
  'Transfer': 'Transferred',
  'Died': 'Died',
  'Death': 'Died',
  'Dead': 'Died',
  'Absconded': 'Absconded',
  'DAMA': 'Absconded'  // Discharged Against Medical Advice
};

mapOutcome(value) {
  const trimmed = value.trim();
  const mapped = outcomeMapping[trimmed] || outcomeMapping[trimmed.toLowerCase()];

  if (!mapped) {
    throw new ValidationError(`Unknown outcome: "${value}". Valid options: Discharged, Transferred, Died, Absconded`);
  }

  // Log auto-mapping for user awareness
  if (trimmed === 'Referred') {
    this.addWarning('Auto-mapped "Referred" to "Transferred"');
  }

  return mapped;
}
```

#### 2.2.5 Speciality Mapper
**Fixed Mapping (per user requirement):**
```javascript
const specialityMapping = {
  'Accident Emergency': 'Casualty',  // Auto-map as confirmed
  'Accident & Emergency': 'Casualty',
  'A&E': 'Casualty',
  'Emergency': 'Casualty',
  'Casualty': 'Casualty'
};

mapSpeciality(value) {
  const trimmed = value.trim();
  const mapped = specialityMapping[trimmed];

  if (!mapped) {
    // If not in mapping, fetch from DHIS2 option set
    const validOption = this.findInOptionSet('Speciality', value);
    if (validOption) return validOption;

    throw new ValidationError(`Unknown speciality: "${value}"`);
  }

  return mapped;
}
```

#### 2.2.6 Diagnosis Matcher (Smart Matching)
**Strategy:** Multi-level matching for robustness

**Algorithm:**
```javascript
matchDiagnosis(diagnosisString) {
  // Step 1: Extract ICD code from parentheses
  const codeMatch = diagnosisString.match(/\(([A-Z]\d{2,3}\.?\d*)\)/);

  if (codeMatch) {
    const rawCode = codeMatch[1];

    // Step 2: Try exact code match
    let match = this.findExactCode(rawCode);
    if (match) return match;

    // Step 3: Try without decimal (A35.00 → A35)
    const codeWithoutDecimal = rawCode.replace(/\.\d+$/, '');
    match = this.findExactCode(codeWithoutDecimal);
    if (match) return match;

    // Step 4: Try prefix match (A35 matches "A35 - Tetanus")
    match = this.findPrefixMatch(codeWithoutDecimal);
    if (match) return match;
  }

  // Step 5: Try fuzzy text matching on diagnosis name
  const textMatches = this.fuzzyMatchText(diagnosisString);

  if (textMatches.length === 0) {
    // No match found - will require user selection
    return {
      matched: false,
      originalValue: diagnosisString,
      suggestedMatches: this.getSimilarDiagnoses(diagnosisString)
    };
  } else if (textMatches.length === 1) {
    // Single match found
    return {
      matched: true,
      code: textMatches[0].code,
      confidence: 'high'
    };
  } else {
    // Multiple matches - require user selection
    return {
      matched: false,
      originalValue: diagnosisString,
      suggestedMatches: textMatches.slice(0, 5)  // Top 5 matches
    };
  }
}

findExactCode(code) {
  return this.diagnosisOptions.find(opt => opt.code === code);
}

findPrefixMatch(code) {
  return this.diagnosisOptions.find(opt => opt.code.startsWith(code + ' '));
}

fuzzyMatchText(text, threshold = 0.7) {
  const searchText = text.toLowerCase();
  const matches = [];

  for (const option of this.diagnosisOptions) {
    const optionText = option.name.toLowerCase();
    const similarity = this.calculateSimilarity(searchText, optionText);

    if (similarity >= threshold) {
      matches.push({
        ...option,
        similarity: similarity
      });
    }
  }

  // Sort by similarity (highest first)
  return matches.sort((a, b) => b.similarity - a.similarity);
}

calculateSimilarity(str1, str2) {
  // Use Levenshtein distance or similar algorithm
  // For simplicity, using word overlap here
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);

  let commonWords = 0;
  for (const word of words1) {
    if (words2.includes(word)) commonWords++;
  }

  return commonWords / Math.max(words1.length, words2.length);
}
```

#### 2.2.7 Boolean Cleaner
**Input:** `"Yes"`, `"No"`, `"Y"`, `"N"`, etc.
**Output:** `"true"` or `"false"` (as strings)

```javascript
cleanBoolean(value) {
  const normalized = value.toString().trim().toLowerCase();

  const trueValues = ['yes', 'y', 'true', '1'];
  const falseValues = ['no', 'n', 'false', '0'];

  if (trueValues.includes(normalized)) return 'true';
  if (falseValues.includes(normalized)) return 'false';

  throw new ValidationError(`Invalid boolean value: "${value}". Expected Yes/No`);
}
```

#### 2.2.8 Occupation Mapper
**Strategy:** Fetch from DHIS2 and create flexible mapping

```javascript
mapOccupation(value) {
  const trimmed = value.trim();

  // Normalize common variations
  const normalized = this.normalizeOccupation(trimmed);

  // Check against DHIS2 option set
  const validOption = this.findInOptionSet('Occupation', normalized);

  if (!validOption) {
    throw new ValidationError(`Unknown occupation: "${value}"`);
  }

  return validOption;
}

normalizeOccupation(value) {
  const corrections = {
    'PENSIONIER': 'Pensioner',
    'Teacher': 'Teacher',
    'Student': 'Student',
    'Trader': 'Trader',
    'Farmer': 'Farmer',
    'Driver': 'Driver',
    // ... add more as discovered
  };

  return corrections[value] || value;
}
```

#### 2.2.9 Gender Validator
**Strategy:** Validate against DHIS2 option set

```javascript
validateGender(value) {
  const normalized = value.trim();

  // Expected values: Male, Female (to be confirmed with DHIS2)
  const validGenders = this.optionSets.Gender || ['Male', 'Female'];

  const match = validGenders.find(g =>
    g.toLowerCase() === normalized.toLowerCase()
  );

  if (!match) {
    throw new ValidationError(`Invalid gender: "${value}". Valid options: ${validGenders.join(', ')}`);
  }

  return match;
}
```

### 2.3 Complete Data Cleaning Pipeline

**File:** `lib/data-cleaner.js`

```javascript
class DataCleaner {
  constructor(optionSets) {
    this.optionSets = optionSets;
    this.warnings = [];
    this.errors = [];
  }

  async cleanRow(row, rowIndex) {
    this.currentRow = rowIndex;
    this.warnings = [];
    this.errors = [];

    try {
      const cleaned = {
        // Required fields
        patientNumber: this.cleanPatientNumber(row['Patient No.']),
        age: this.cleanAge(row['Age']),
        gender: this.validateGender(row['Gender']),
        address: this.cleanText(row['Locality/Address/Residence']),
        occupation: this.mapOccupation(row['Occupation']),
        education: this.mapEducation(row['Educational Status']),
        dateOfAdmission: this.cleanDate(row['Date of Admission']),
        dateOfDischarge: this.cleanDate(row['Date of Discharge']),
        speciality: this.mapSpeciality(row['Speciality']),
        outcome: this.mapOutcome(row['Outcome of Discharge']),
        diagnosis: this.matchDiagnosis(row['Principal Diagnosis']),
        surgicalProcedure: this.cleanBoolean(row['Surgical Procedure']),
        nhisStatus: this.cleanBoolean(row['NHIS Status']),

        // Optional fields
        additionalDiagnosis: row['Additional Diagnosis'] !== 'NA'
          ? this.matchDiagnosis(row['Additional Diagnosis'])
          : null,
        cost: row['Cost of Treatment'] ? parseFloat(row['Cost of Treatment']) : null,

        // Metadata
        rowIndex: rowIndex,
        originalData: row
      };

      // Cross-field validations
      this.validateDates(cleaned);
      this.validateRequiredFields(cleaned);

      return {
        success: true,
        data: cleaned,
        warnings: this.warnings,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        data: null,
        warnings: this.warnings,
        errors: [error.message]
      };
    }
  }

  validateDates(data) {
    if (data.dateOfDischarge < data.dateOfAdmission) {
      this.addError('Discharge date cannot be before admission date');
    }

    const daysDiff = Math.floor(
      (new Date(data.dateOfDischarge) - new Date(data.dateOfAdmission))
      / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 365) {
      this.addWarning('Patient stayed more than 1 year - please verify');
    }
  }

  addWarning(message) {
    this.warnings.push({
      row: this.currentRow,
      type: 'warning',
      message: message
    });
  }

  addError(message) {
    this.errors.push({
      row: this.currentRow,
      type: 'error',
      message: message
    });
    throw new ValidationError(message);
  }
}
```

---

## Part 3: Validation & Preview System

### 3.1 Validation Engine

**File:** `lib/validator.js`

**Responsibilities:**
1. Validate all cleaned data
2. Detect duplicates (within batch and against DHIS2)
3. Categorize rows: Valid, Warning, Error
4. Generate validation report

```javascript
class ValidationEngine {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async validate(cleanedRows) {
    const report = {
      total: cleanedRows.length,
      valid: [],
      warnings: [],
      errors: [],
      duplicates: []
    };

    // Check for duplicates within batch
    const patientNumbers = new Set();
    const duplicatesInBatch = new Set();

    for (const row of cleanedRows) {
      if (patientNumbers.has(row.data.patientNumber)) {
        duplicatesInBatch.add(row.data.patientNumber);
      }
      patientNumbers.add(row.data.patientNumber);
    }

    // Check for duplicates in DHIS2
    const existingPatients = await this.checkExistingPatients(
      Array.from(patientNumbers)
    );

    // Categorize each row
    for (const row of cleanedRows) {
      const validation = this.validateRow(row, {
        duplicateInBatch: duplicatesInBatch.has(row.data.patientNumber),
        existsInDHIS2: existingPatients.includes(row.data.patientNumber)
      });

      if (validation.status === 'error') {
        report.errors.push(validation);
      } else if (validation.status === 'warning' || validation.status === 'duplicate') {
        report.warnings.push(validation);
      } else {
        report.valid.push(validation);
      }
    }

    return report;
  }

  validateRow(row, duplicateInfo) {
    const issues = [];

    // Check if cleaning was successful
    if (!row.success) {
      return {
        status: 'error',
        row: row,
        issues: row.errors
      };
    }

    // Check for diagnosis matching issues
    if (row.data.diagnosis && !row.data.diagnosis.matched) {
      issues.push({
        field: 'diagnosis',
        type: 'manual_selection_required',
        message: 'Diagnosis could not be automatically matched',
        suggestions: row.data.diagnosis.suggestedMatches
      });
    }

    // Check for duplicates
    if (duplicateInfo.duplicateInBatch) {
      issues.push({
        type: 'duplicate_in_batch',
        message: `Duplicate patient number in this upload batch`
      });
    }

    if (duplicateInfo.existsInDHIS2) {
      issues.push({
        type: 'duplicate_in_dhis2',
        message: `Patient number already exists in DHIS2`,
        action: 'skip_or_update'
      });
    }

    // Add any warnings from cleaning process
    if (row.warnings.length > 0) {
      issues.push(...row.warnings);
    }

    // Determine overall status
    let status = 'valid';
    if (issues.some(i => i.type === 'manual_selection_required')) {
      status = 'error';
    } else if (issues.some(i => i.type.includes('duplicate'))) {
      status = 'duplicate';
    } else if (issues.length > 0) {
      status = 'warning';
    }

    return {
      status: status,
      row: row,
      issues: issues
    };
  }

  async checkExistingPatients(patientNumbers) {
    // Query DHIS2 to check if patient numbers already exist
    // This would use the DHIS2 API to search for existing events
    try {
      const response = await this.apiClient.get('/api/tracker/events', {
        params: {
          program: 'fFYTJRzD2qq',
          orgUnit: 'duCDqCRlWG1',
          fields: 'dataValues[dataElement,value]',
          filter: `dataElement:eq:h0Ef6ykTpNB:in:[${patientNumbers.join(',')}]`
        }
      });

      // Extract existing patient numbers from response
      const existing = response.events
        .map(e => e.dataValues.find(dv => dv.dataElement === 'h0Ef6ykTpNB'))
        .filter(dv => dv)
        .map(dv => dv.value);

      return existing;
    } catch (error) {
      console.error('Error checking existing patients:', error);
      return [];  // If check fails, proceed anyway
    }
  }
}
```

### 3.2 Preview UI Component

**Component Structure:**

```
Preview Screen
├── Summary Statistics
│   ├── Total Records: 31
│   ├── Valid: 25 (green)
│   ├── Warnings: 4 (yellow)
│   ├── Errors: 2 (red)
│   └── Duplicates: 0
│
├── Filter Buttons
│   ├── [All] [Valid] [Warnings] [Errors] [Duplicates]
│
├── Data Table
│   ├── Row (with color coding)
│   ├── Patient Number
│   ├── Patient Name
│   ├── Date
│   ├── Status Badge
│   └── Issues (click to expand)
│
└── Actions
    ├── [Fix All Issues]
    ├── [Exclude Problem Rows]
    └── [Upload Valid Records Only]
```

**Issue Resolution UI:**

For records with errors:
1. **Manual Diagnosis Selection**
   - Show original value from Excel
   - Display dropdown with suggested matches
   - Allow searching all 1,706 codes
   - Pre-select closest match

2. **Duplicate Handling**
   - Show existing record details
   - Options:
     - [ ] Skip this record
     - [ ] Update existing record
     - [ ] Upload as new (if allowed)
   - Bulk actions:
     - [Skip All Duplicates]
     - [Update All Duplicates]

**Mock-up:**
```
┌─────────────────────────────────────────────────────────────┐
│  Upload Summary                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  📊 Total: 31  ✅ Valid: 25  ⚠️  Warnings: 4  ❌ Errors: 2 │
│                                                              │
│  [All] [Valid] [Warnings] [Errors]                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ❌ Row 5: VR-A01-AAG3360                             │  │
│  │    ⚠️  Diagnosis not matched automatically           │  │
│  │                                                       │  │
│  │    Excel value: "Other tetanus(A35.00)"             │  │
│  │                                                       │  │
│  │    Select correct diagnosis:                         │  │
│  │    ┌────────────────────────────────────────┐       │  │
│  │    │ 🔍 Search diagnosis...                 │       │  │
│  │    │                                         │       │  │
│  │    │ Suggested matches:                     │       │  │
│  │    │ ○ A35 - Tetanus                        │       │  │
│  │    │ ○ A35.0 - Obstetrical tetanus          │       │  │
│  │    │ ○ A35.9 - Tetanus, unspecified         │       │  │
│  │    └────────────────────────────────────────┘       │  │
│  │                                                       │  │
│  │    [Apply] [Skip This Record]                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [❌ Exclude Problem Rows (2)]  [✅ Upload 29 Valid Records]│
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Bulk Upload System

### 4.1 Upload Manager

**File:** `lib/upload-manager.js`

**Features:**
- Batch processing (10 records per batch)
- Progress tracking
- Error handling and retries
- Rate limiting
- Pause/Resume capability

```javascript
class UploadManager {
  constructor(apiClient, options = {}) {
    this.apiClient = apiClient;
    this.batchSize = options.batchSize || 10;
    this.delayBetweenBatches = options.delay || 2000;
    this.maxRetries = options.maxRetries || 3;
    this.onProgress = options.onProgress || (() => {});
    this.onBatchComplete = options.onBatchComplete || (() => {});
    this.paused = false;
  }

  async upload(records) {
    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      startTime: Date.now(),
      endTime: null,
      batches: [],
      failedRecords: []
    };

    // Split into batches
    const batches = this.createBatches(records);

    for (let i = 0; i < batches.length; i++) {
      // Check if paused
      while (this.paused) {
        await this.delay(1000);
      }

      const batchNumber = i + 1;
      const batch = batches[i];

      // Update progress before batch
      this.onProgress({
        status: 'uploading',
        currentBatch: batchNumber,
        totalBatches: batches.length,
        processed: i * this.batchSize,
        total: records.length,
        successful: results.successful,
        failed: results.failed,
        currentRecord: batch[0]
      });

      // Upload batch with retry logic
      const batchResult = await this.uploadBatchWithRetry(batch, batchNumber);

      // Update results
      results.successful += batchResult.successful;
      results.failed += batchResult.failed;
      results.batches.push(batchResult);
      results.failedRecords.push(...batchResult.failedRecords);

      // Notify batch completion
      this.onBatchComplete(batchResult);

      // Delay before next batch (except for last batch)
      if (i < batches.length - 1) {
        await this.delay(this.delayBetweenBatches);
      }
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    return results;
  }

  async uploadBatchWithRetry(batch, batchNumber) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.uploadBatch(batch, batchNumber, attempt);
      } catch (error) {
        lastError = error;
        console.error(`Batch ${batchNumber} attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          // Exponential backoff
          await this.delay(1000 * Math.pow(2, attempt));
        }
      }
    }

    // All retries failed
    return {
      batchNumber: batchNumber,
      successful: 0,
      failed: batch.length,
      error: lastError.message,
      failedRecords: batch.map(r => ({
        ...r,
        error: lastError.message,
        errorType: 'network'
      }))
    };
  }

  async uploadBatch(batch, batchNumber, attempt) {
    // Format records for DHIS2 API
    const events = batch.map(record => this.formatEvent(record));

    // Send to DHIS2
    const response = await this.apiClient.post('/api/41/tracker?async=false', {
      events: events
    });

    // Parse response
    if (response.status === 'OK') {
      const created = response.stats.created;
      const ignored = response.stats.ignored;
      const errors = response.validationReport?.errorReports || [];

      // Match errors to specific records
      const failedRecords = this.matchErrorsToRecords(batch, errors);

      return {
        batchNumber: batchNumber,
        attempt: attempt,
        successful: created,
        failed: ignored,
        errors: errors,
        failedRecords: failedRecords
      };
    } else {
      throw new Error(`API returned status: ${response.status}`);
    }
  }

  matchErrorsToRecords(batch, errors) {
    // DHIS2 errors include UID which we can match to our records
    // For now, if there are errors, we'll mark records as potentially failed
    const failedRecords = [];

    for (const error of errors) {
      // Try to find which record caused this error
      // This is tricky because DHIS2 doesn't always provide clear mapping
      const record = batch.find(r => {
        // Try to match based on error message content
        return error.message.includes(r.data.patientNumber);
      });

      if (record) {
        failedRecords.push({
          ...record,
          error: error.message,
          errorCode: error.errorCode,
          errorType: 'validation'
        });
      }
    }

    // If we couldn't match specific records, mark all as potential failures
    if (failedRecords.length === 0 && errors.length > 0) {
      return batch.map(r => ({
        ...r,
        error: errors[0].message,
        errorCode: errors[0].errorCode,
        errorType: 'validation_unknown'
      }));
    }

    return failedRecords;
  }

  formatEvent(record) {
    const dataValues = [
      { dataElement: 'h0Ef6ykTpNB', value: record.data.patientNumber },
      { dataElement: 'nk15h7fzCLz', value: record.data.address },
      { dataElement: 'upqhIcii1iC', value: record.data.age.number },
      { dataElement: 'WZ5rS7QuECT', value: record.data.age.unit },
      { dataElement: 'fg8sMCaTOrK', value: record.data.gender },
      { dataElement: 'qAWldjTeMIs', value: record.data.occupation },
      { dataElement: 'Hi8Cp84CnZQ', value: record.data.education },
      { dataElement: 'HsMaBh3wKed', value: record.data.dateOfAdmission },
      { dataElement: 'sIPe9r0NBbq', value: record.data.dateOfDischarge },
      { dataElement: 'xpzJAQC4DGe', value: record.data.speciality },
      { dataElement: 'OMN7CVW4IaY', value: record.data.outcome },
      { dataElement: 'yPXPzceTIvq', value: record.data.diagnosis },
      { dataElement: 'dsVClbnOnm6', value: record.data.surgicalProcedure },
      { dataElement: 'ETSl9Q3SUOG', value: record.data.nhisStatus }
    ];

    // Add optional fields if present
    if (record.data.additionalDiagnosis) {
      dataValues.push({
        dataElement: 'ADDITIONAL_DIAGNOSIS_ID',  // To be discovered
        value: record.data.additionalDiagnosis
      });
    }

    if (record.data.cost) {
      dataValues.push({
        dataElement: 'COST_ID',  // To be discovered
        value: record.data.cost.toString()
      });
    }

    return {
      orgUnit: 'duCDqCRlWG1',
      occurredAt: record.data.dateOfAdmission,
      status: 'COMPLETED',
      notes: [],
      program: 'fFYTJRzD2qq',
      programStage: 'LR7JT7ZNg8E',
      dataValues: dataValues
    };
  }

  createBatches(records) {
    const batches = [];
    for (let i = 0; i < records.length; i += this.batchSize) {
      batches.push(records.slice(i, i + this.batchSize));
    }
    return batches;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.2 Progress Tracking UI

**Upload Progress Screen:**

```
┌─────────────────────────────────────────────────────────────┐
│  Uploading Records                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  Batch 2 of 4                                                │
│  ████████████████░░░░░░░░░░░░  15 of 31 records (48%)      │
│                                                              │
│  ✅ Successful: 14                                           │
│  ❌ Failed: 1                                                │
│  ⏱️  Remaining: ~45 seconds                                  │
│                                                              │
│  Currently uploading:                                        │
│  📄 VR-A01-AAG3365 - John Doe                               │
│                                                              │
│  [⏸️  Pause Upload]                                          │
│                                                              │
│  Recent Activity:                                            │
│  ✅ Batch 1 completed (10/10 successful)                    │
│  ⚠️  Record VR-A01-AAG3361 failed - Invalid date            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Failed Records Report

**Per user requirement:** List failed records with error details

**UI Component:**

```
┌─────────────────────────────────────────────────────────────┐
│  Upload Complete                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  📊 Summary                                                  │
│  ✅ Successful: 28 records                                   │
│  ❌ Failed: 3 records                                        │
│  ⏱️  Duration: 2 minutes 15 seconds                          │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  ❌ Failed Records:                                          │
│                                                              │
│  1. VR-A01-AAG3361 - Jane Smith                             │
│     Row: 12                                                  │
│     Error: Invalid date format                               │
│     Reason: Discharge date (2025-05-30) is before           │
│             admission date (2025-06-01)                      │
│     [View Details] [Fix & Retry]                            │
│                                                              │
│  2. VR-A01-AAG3365 - John Doe                               │
│     Row: 18                                                  │
│     Error: Validation failed                                 │
│     Reason: Value `Pneumonia` is not a valid diagnosis code │
│     Suggestion: Select from diagnosis dropdown               │
│     [View Details] [Fix & Retry]                            │
│                                                              │
│  3. VR-A01-AAG3370 - Mary Jones                             │
│     Row: 25                                                  │
│     Error: Network timeout                                   │
│     Reason: Request timed out after 3 retries               │
│     [Retry Upload]                                           │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  [📥 Download Failed Records (Excel)]                        │
│  [🔄 Retry All Failed Records]                               │
│  [✅ Done]                                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Failed Records Excel Export:**

Columns:
- Row Number
- Patient Number
- Patient Name
- Error Type
- Error Message
- Suggested Fix
- Original Data (all columns)

This allows user to:
1. Fix issues in Excel
2. Re-upload only the failed records
3. Keep original data for reference

---

## Part 5: Chrome Extension Implementation

### 5.1 Project Structure

```
dhis2-uploader-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   └── components/
│       ├── upload-screen.js
│       ├── preview-screen.js
│       ├── progress-screen.js
│       └── results-screen.js
├── background/
│   ├── service-worker.js
│   └── api-client.js
├── lib/
│   ├── excel-parser.js
│   ├── data-cleaner.js
│   ├── validator.js
│   └── upload-manager.js
├── config/
│   ├── field-mappings.json
│   └── dhis2-option-sets.json
├── assets/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── styles/
│       └── common.css
└── vendor/
    └── xlsx.js
```

### 5.2 Manifest.json

```json
{
  "manifest_version": 3,
  "name": "DHIS2 In-Patient Morbidity Uploader",
  "version": "1.0.0",
  "description": "Bulk upload patient morbidity data from Excel to DHIS2",

  "permissions": [
    "storage",
    "activeTab",
    "https://events.chimgh.org/*"
  ],

  "host_permissions": [
    "https://events.chimgh.org/*"
  ],

  "background": {
    "service_worker": "background/service-worker.js"
  },

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    },
    "default_title": "DHIS2 Uploader"
  },

  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },

  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

### 5.3 Popup UI Flow

**Screen 1: Upload Excel**
```html
┌─────────────────────────────────────┐
│  DHIS2 Uploader                     │
│  ───────────────────────────────────│
│                                     │
│  📊 In-Patient Morbidity Upload     │
│                                     │
│  [📁 Select Excel File]             │
│                                     │
│  Or drag and drop Excel file here   │
│                                     │
│  Supported formats: .xlsx, .xls     │
│                                     │
│  ───────────────────────────────────│
│  ⚙️  Settings                        │
│  • Batch size: 10 records           │
│  • Skip duplicates: ✓               │
│                                     │
└─────────────────────────────────────┘
```

**Screen 2: Preview & Validate**
- (See Section 3.2 for detailed UI)

**Screen 3: Upload Progress**
- (See Section 4.2 for detailed UI)

**Screen 4: Results & Failed Records**
- (See Section 4.3 for detailed UI)

### 5.4 API Client

**File:** `background/api-client.js`

```javascript
class DHIS2ApiClient {
  constructor() {
    this.baseUrl = 'https://events.chimgh.org/events';
  }

  async get(endpoint, options = {}) {
    const url = new URL(endpoint, this.baseUrl);

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      credentials: 'include'  // Use session cookies
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async post(endpoint, data, options = {}) {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
      },
      credentials: 'include',  // Use session cookies
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed: ${response.statusText} - ${text}`);
    }

    return await response.json();
  }

  async checkAuthentication() {
    try {
      const response = await this.get('/api/me');
      return { authenticated: true, user: response };
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }
}
```

### 5.5 Background Service Worker

**File:** `background/service-worker.js`

**Responsibilities:**
- Maintain API client
- Store upload history
- Handle messages from popup
- Manage background tasks

```javascript
// Initialize API client
const apiClient = new DHIS2ApiClient();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CHECK_AUTH':
      checkAuth().then(sendResponse);
      return true;

    case 'UPLOAD_BATCH':
      uploadBatch(message.data).then(sendResponse);
      return true;

    case 'FETCH_OPTION_SETS':
      fetchOptionSets().then(sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

async function checkAuth() {
  return await apiClient.checkAuthentication();
}

async function uploadBatch(data) {
  try {
    const response = await apiClient.post('/api/41/tracker?async=false', data);
    return { success: true, response: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fetchOptionSets() {
  // Fetch all required option sets from DHIS2
  const optionSetIds = {
    education: 'qINXizfcpoY',
    outcome: 'fBs4UMMVHIg',
    diagnosis: 'hAdQhH0A5jt',
    // ... add others as discovered
  };

  const optionSets = {};

  for (const [key, id] of Object.entries(optionSetIds)) {
    try {
      const data = await apiClient.get(`/api/optionSets/${id}.json`, {
        params: { fields: 'options[code,name]' }
      });
      optionSets[key] = data.options;
    } catch (error) {
      console.error(`Failed to fetch ${key} option set:`, error);
    }
  }

  // Cache in storage
  await chrome.storage.local.set({ optionSets: optionSets });

  return optionSets;
}
```

---

## Part 6: Error Handling & Edge Cases

### 6.1 Authentication Errors

**Detection:**
- API returns 401 Unauthorized
- Session cookie expired

**Handling:**
1. Detect error
2. Pause upload
3. Show message: "Session expired. Please log in to DHIS2 in another tab, then click Resume"
4. Provide "Resume" button
5. Continue from where it stopped

### 6.2 Network Errors

**Types:**
- Timeout
- Connection refused
- DNS errors

**Handling:**
1. Retry 3 times with exponential backoff
2. If all retries fail:
   - Mark batch as failed
   - Show error message
   - Provide "Retry" button
   - Allow downloading failed records

### 6.3 Validation Errors

**Types:**
- Invalid option code
- Missing required field
- Invalid date format

**Handling:**
1. Catch during cleaning phase
2. Show in preview screen
3. Require user to fix before upload
4. Do not allow uploading invalid records

### 6.4 Partial Batch Failures

**Scenario:** Batch of 10 has 7 successful, 3 failed

**Handling:**
1. Parse DHIS2 response to identify which failed
2. Map errors back to specific records
3. Mark successful ones as complete
4. Add failed ones to failed records list
5. Continue with next batch

### 6.5 Duplicate Patient Numbers

**Within Batch:**
1. Detect during validation
2. Show warning
3. User chooses:
   - Keep first occurrence
   - Keep last occurrence
   - Mark all as errors

**In DHIS2:**
1. Query DHIS2 before upload
2. Show in preview with "Duplicate" badge
3. User chooses for each:
   - Skip (don't upload)
   - Update existing
   - Upload anyway (if allowed)
4. Bulk actions available

### 6.6 Excel Format Issues

**Issues:**
- Missing required columns
- Extra columns
- Different column order
- Merged cells
- Empty rows

**Handling:**
1. Validate structure during parsing
2. Show clear error message
3. Suggest downloading template
4. Show which columns are missing/extra

### 6.7 Large File Handling

**Scenario:** Excel with 500+ rows

**Handling:**
1. Show warning about estimated time
2. Process in chunks for preview
3. Stream processing to avoid memory issues
4. Show progress during parsing
5. Option to upload in background

---

## Part 7: Testing Strategy

### 7.1 Unit Tests

**Test Files:**
- `tests/data-cleaner.test.js`
- `tests/excel-parser.test.js`
- `tests/validator.test.js`
- `tests/upload-manager.test.js`

**Test Cases:**

#### Age Cleaning Tests
```javascript
describe('Age Cleaner', () => {
  test('parses "20 Year(s)" correctly', () => {
    expect(cleanAge('20 Year(s)')).toEqual({
      number: '20',
      unit: 'years'
    });
  });

  test('parses "6 Month(s)" correctly', () => {
    expect(cleanAge('6 Month(s)')).toEqual({
      number: '6',
      unit: 'months'
    });
  });

  test('throws error on invalid format', () => {
    expect(() => cleanAge('invalid')).toThrow(ValidationError);
  });
});
```

#### Date Cleaning Tests
```javascript
describe('Date Cleaner', () => {
  test('converts DD-MM-YYYY to ISO format', () => {
    expect(cleanDate('26-06-2025')).toBe('2025-06-26');
  });

  test('handles Excel serial dates', () => {
    expect(cleanDate(44732)).toBe('2022-06-01');
  });

  test('throws error on invalid date', () => {
    expect(() => cleanDate('32-13-2025')).toThrow(ValidationError);
  });
});
```

#### Diagnosis Matching Tests
```javascript
describe('Diagnosis Matcher', () => {
  test('matches exact ICD code', () => {
    const result = matchDiagnosis('Tetanus(A35)');
    expect(result.code).toBe('A35 - Tetanus');
  });

  test('matches with decimal code', () => {
    const result = matchDiagnosis('Other tetanus(A35.00)');
    expect(result.code).toBe('A35 - Tetanus');
  });

  test('returns suggestions when no exact match', () => {
    const result = matchDiagnosis('Unknown disease');
    expect(result.matched).toBe(false);
    expect(result.suggestedMatches.length).toBeGreaterThan(0);
  });
});
```

### 7.2 Integration Tests

**Test Scenarios:**

1. **End-to-End Cleaning:**
   - Input: Raw Excel row
   - Expected: Cleaned data object
   - Verify all transformations

2. **Validation Pipeline:**
   - Input: Array of cleaned rows
   - Expected: Categorized validation report
   - Verify duplicate detection

3. **API Upload:**
   - Mock DHIS2 API
   - Upload batch
   - Verify request format
   - Verify response parsing

### 7.3 Manual Testing Checklist

**Pre-upload Testing:**
- [ ] Upload valid Excel file
- [ ] Upload Excel with errors
- [ ] Upload Excel with duplicates
- [ ] Upload Excel with missing columns
- [ ] Upload empty Excel
- [ ] Upload non-Excel file

**Upload Testing:**
- [ ] Upload small batch (5 records)
- [ ] Upload medium batch (31 records)
- [ ] Upload large batch (100 records)
- [ ] Test with all valid records
- [ ] Test with some invalid records
- [ ] Test with network interruption
- [ ] Test with session expiry

**Error Handling:**
- [ ] Verify failed records are listed
- [ ] Verify error messages are clear
- [ ] Verify retry functionality
- [ ] Verify export of failed records

**UI/UX Testing:**
- [ ] Test on different screen sizes
- [ ] Test navigation between screens
- [ ] Test progress updates
- [ ] Test pause/resume
- [ ] Test bulk actions

---

## Part 8: Implementation Timeline

### Phase 1: Foundation (Week 1)
**Days 1-2: Data Discovery**
- Discover missing data element IDs (Additional Diagnosis, Cost)
- Fetch all option sets (Occupation, Speciality, Gender)
- Update configuration files

**Days 3-4: Excel Parser**
- Implement excel-parser.js
- Handle various Excel formats
- Unit tests

**Days 5-7: Data Cleaners**
- Implement all cleaner functions
- Create mapping tables
- Unit tests for each cleaner

### Phase 2: Validation System (Week 2)
**Days 8-10: Diagnosis Matcher**
- Implement fuzzy matching algorithm
- Test with sample data
- Optimize performance

**Days 11-12: Validation Engine**
- Implement validation logic
- Duplicate detection
- Cross-field validations
- Unit tests

**Days 13-14: Testing & Refinement**
- Integration tests
- Test with JuneEmergency.xlsx
- Fix bugs

### Phase 3: Chrome Extension UI (Week 3)
**Days 15-17: Extension Structure**
- Create manifest.json
- Set up project structure
- Implement service worker
- Implement API client

**Days 18-19: Upload & Preview Screens**
- Build file upload UI
- Build preview table
- Implement filtering
- Implement issue resolution UI

**Days 20-21: Progress & Results Screens**
- Build progress tracking UI
- Build results summary
- Implement failed records display
- Implement export functionality

### Phase 4: Upload System (Week 4)
**Days 22-24: Upload Manager**
- Implement batch processing
- Implement retry logic
- Implement progress tracking
- Implement pause/resume

**Days 25-26: Error Handling**
- Handle all error types
- Implement recovery mechanisms
- Test failure scenarios

**Days 27-28: Integration**
- Connect all components
- End-to-end testing
- Fix integration issues

### Phase 5: Testing & Launch (Week 5)
**Days 29-30: Testing**
- Comprehensive manual testing
- Test with real data
- Performance testing
- Edge case testing

**Days 31-32: User Testing**
- Get user feedback
- Fix critical issues
- Refine UI/UX

**Days 33-35: Documentation & Launch**
- Write user guide
- Create video tutorial
- Package extension
- Deploy for testing

---

## Part 9: Future Enhancements

### Phase 2 Features (Post-Launch)

**1. Template Generator**
- Generate Excel template with:
  - Correct column names
  - Data validation rules
  - Dropdown lists for valid options
  - Example data

**2. Smart Diagnosis Search**
- As-you-type search
- Show ICD-10 code tree
- Recent diagnoses
- Frequently used codes

**3. Offline Mode**
- Cache data cleaning functionality
- Queue uploads for when online
- Sync when connection restored

**4. Upload History**
- Track all uploads
- Show success rates
- Export reports
- Search previous uploads

**5. Multi-Program Support**
- Support other DHIS2 programs
- Dynamic field mapping
- Program-specific validation

**6. Advanced Duplicate Detection**
- Fuzzy matching on patient name + DOB
- Show similar records
- Merge functionality

**7. Data Quality Dashboard**
- Show common errors
- Suggest improvements
- Track data entry patterns

**8. Bulk Edit**
- Edit multiple records at once
- Find and replace
- Apply transformations

**9. Custom Mapping Profiles**
- Save column mappings
- Multiple hospital formats
- Import/export mappings

**10. Machine Learning**
- Learn from corrections
- Improve diagnosis matching
- Predict data entry errors

---

## Part 10: Configuration Files

### 10.1 Field Mappings Configuration

**File:** `config/field-mappings.json`

```json
{
  "version": "1.0.0",
  "program": {
    "id": "fFYTJRzD2qq",
    "name": "In-Patient Morbidity and Mortality",
    "programStage": "LR7JT7ZNg8E"
  },
  "orgUnit": "duCDqCRlWG1",
  "fields": {
    "patientNumber": {
      "excelColumn": "Patient No.",
      "dataElement": "h0Ef6ykTpNB",
      "required": true,
      "type": "text"
    },
    "address": {
      "excelColumn": "Locality/Address/Residence",
      "dataElement": "nk15h7fzCLz",
      "required": true,
      "type": "text"
    },
    "ageNumber": {
      "excelColumn": "Age",
      "dataElement": "upqhIcii1iC",
      "required": true,
      "type": "number",
      "parser": "extractAgeNumber"
    },
    "ageUnit": {
      "excelColumn": "Age",
      "dataElement": "WZ5rS7QuECT",
      "required": true,
      "type": "optionSet",
      "optionSetId": "AGE_UNIT_OPTION_SET",
      "parser": "extractAgeUnit"
    },
    "gender": {
      "excelColumn": "Gender",
      "dataElement": "fg8sMCaTOrK",
      "required": true,
      "type": "optionSet",
      "optionSetId": "GENDER_OPTION_SET"
    },
    "occupation": {
      "excelColumn": "Occupation",
      "dataElement": "qAWldjTeMIs",
      "required": true,
      "type": "optionSet",
      "optionSetId": "OCCUPATION_OPTION_SET"
    },
    "education": {
      "excelColumn": "Educational Status",
      "dataElement": "Hi8Cp84CnZQ",
      "required": true,
      "type": "optionSet",
      "optionSetId": "qINXizfcpoY",
      "mapping": {
        "SHS": "SHS/Secondary",
        "shs": "SHS/Secondary",
        "JHS": "JHS/Middle School",
        "jhs": "JHS/Middle School",
        "Tertiary": "Tertiary"
      }
    },
    "dateOfAdmission": {
      "excelColumn": "Date of Admission",
      "dataElement": "HsMaBh3wKed",
      "required": true,
      "type": "date",
      "parser": "convertToISODate"
    },
    "dateOfDischarge": {
      "excelColumn": "Date of Discharge",
      "dataElement": "sIPe9r0NBbq",
      "required": true,
      "type": "date",
      "parser": "convertToISODate"
    },
    "speciality": {
      "excelColumn": "Speciality",
      "dataElement": "xpzJAQC4DGe",
      "required": true,
      "type": "optionSet",
      "optionSetId": "SPECIALITY_OPTION_SET",
      "mapping": {
        "Accident Emergency": "Casualty",
        "Accident & Emergency": "Casualty",
        "A&E": "Casualty"
      }
    },
    "outcome": {
      "excelColumn": "Outcome of Discharge",
      "dataElement": "OMN7CVW4IaY",
      "required": true,
      "type": "optionSet",
      "optionSetId": "fBs4UMMVHIg",
      "mapping": {
        "Referred": "Transferred",
        "Discharge": "Discharged",
        "Discharged": "Discharged",
        "Transferred": "Transferred",
        "Died": "Died"
      }
    },
    "diagnosis": {
      "excelColumn": "Principal Diagnosis",
      "dataElement": "yPXPzceTIvq",
      "required": true,
      "type": "optionSet",
      "optionSetId": "hAdQhH0A5jt",
      "parser": "matchDiagnosisCode"
    },
    "additionalDiagnosis": {
      "excelColumn": "Additional Diagnosis",
      "dataElement": "TO_BE_DISCOVERED",
      "required": false,
      "type": "optionSet",
      "optionSetId": "hAdQhH0A5jt",
      "parser": "matchDiagnosisCode"
    },
    "surgicalProcedure": {
      "excelColumn": "Surgical Procedure",
      "dataElement": "dsVClbnOnm6",
      "required": true,
      "type": "boolean",
      "parser": "convertToBoolean"
    },
    "cost": {
      "excelColumn": "Cost of Treatment",
      "dataElement": "TO_BE_DISCOVERED",
      "required": false,
      "type": "number"
    },
    "nhisStatus": {
      "excelColumn": "NHIS Status",
      "dataElement": "ETSl9Q3SUOG",
      "required": true,
      "type": "boolean",
      "parser": "convertToBoolean"
    }
  }
}
```

### 10.2 Validation Rules Configuration

**File:** `config/validation-rules.json`

```json
{
  "rules": {
    "age": {
      "min": 0,
      "max": 150,
      "warningThreshold": 120
    },
    "dateRange": {
      "minYearsInPast": 5,
      "maxYearsInFuture": 1
    },
    "stayDuration": {
      "warningDays": 365,
      "maxDays": 1825
    },
    "requiredFields": [
      "patientNumber",
      "age",
      "gender",
      "address",
      "occupation",
      "education",
      "dateOfAdmission",
      "dateOfDischarge",
      "speciality",
      "outcome",
      "diagnosis",
      "surgicalProcedure",
      "nhisStatus"
    ],
    "crossFieldValidations": [
      {
        "name": "discharge_after_admission",
        "fields": ["dateOfDischarge", "dateOfAdmission"],
        "rule": "dateOfDischarge >= dateOfAdmission",
        "errorMessage": "Discharge date must be after admission date"
      }
    ]
  }
}
```

---

## Summary & Next Steps

### What We've Accomplished So Far ✅

1. ✅ Successfully sent test API request to DHIS2
2. ✅ Discovered correct option codes for Education, Outcome, Diagnosis
3. ✅ Confirmed API endpoint and payload structure
4. ✅ Tested with real data from Excel file
5. ✅ Identified all data cleaning requirements

### Immediate Next Steps 🎯

**Step 1: Discover Missing Fields** (30 minutes)
- Run script to capture Additional Diagnosis and Cost data element IDs
- Update configuration

**Step 2: Fetch Remaining Option Sets** (30 minutes)
- Fetch Occupation, Speciality, Gender option sets
- Update option-codes.json

**Step 3: Build Data Cleaner** (2-3 days)
- Implement all cleaning functions
- Test with JuneEmergency.xlsx
- Verify all 31 records can be cleaned successfully

**Step 4: Build Chrome Extension** (1-2 weeks)
- Implement UI
- Integrate data cleaner
- Test end-to-end

### Key Decisions Confirmed ✅

1. ✅ "Referred" → "Transferred" (always auto-map)
2. ✅ "Accident Emergency" → "Casualty" (always auto-map)
3. ✅ Diagnosis matching: Show dropdown if no exact match
4. ✅ Duplicates: Show preview before upload with options
5. ✅ Failed records: List with detailed errors and allow re-upload
6. ✅ Batch size: 10 records
7. ✅ Chrome Extension with session-based auth
8. ✅ Fetch option sets for Occupation, Speciality, Gender

### Questions Answered ✅

1. ✅ Patient name not required - will ignore
2. ✅ Gender validation - fetch from DHIS2 option set
3. ✅ Occupation validation - fetch from DHIS2 option set
4. ✅ Upload failure handling - list failed with reasons
5. ✅ Additional Diagnosis & Cost - need to discover data element IDs

---

## Ready to Implement! 🚀

This plan provides:
- ✅ Complete data cleaning strategy
- ✅ Validation approach
- ✅ Upload system design
- ✅ Chrome Extension architecture
- ✅ Error handling strategy
- ✅ Testing plan
- ✅ Implementation timeline

**Total Estimated Time:** 5 weeks (can be compressed with focused work)

**Next Command to Run:**
```bash
# Discover missing fields
node discover-missing-fields.js
```

After that, we can start building the data cleaner and test it with your 31 records before building the full extension!

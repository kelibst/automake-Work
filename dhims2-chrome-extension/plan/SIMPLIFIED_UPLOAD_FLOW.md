# Simplified Upload Flow - Chrome Extension

**Date:** 2025-10-29
**Goal:** Match the Node.js pipeline experience in the Chrome Extension UI

---

## Overview

The Chrome Extension should replicate the **exact same flow** as the Node.js pipeline from Oct 29, 2025 (see `plan/ACTIVITIES.md`), but with a user-friendly UI instead of console output.

---

## Current vs Target Flow

### ❌ Current Flow (Over-complicated)
```
1. Upload Excel
2. Select sheet (if multiple)
3. MAP FIELDS MANUALLY ← Remove this!
4. Preview data
5. Validate
6. Upload
```

### ✅ Target Flow (Simple - Like Node.js Pipeline)
```
1. Upload Excel
2. Auto-detect & clean data
3. Show validation results
4. User approves
5. Batch upload with progress
```

---

## Implementation Plan

### Phase 1: Remove Manual Mapping (Highest Priority)

**Current Problem:**
- User has to manually map Excel columns to DHIS fields
- FieldMappingEditor component forces this step
- Unnecessary friction - the default config already has mappings!

**Solution:**
1. Remove the `mapping` step from Upload.jsx
2. Auto-match columns using `fieldMappings` in default config
3. Match by Excel column name (e.g., "Patient No." → `patientNumber`)

**Files to Modify:**
- `src/sidepanel/pages/Upload.jsx` - Remove mapping step
- Auto-matching logic already exists in `field-mapper.js`

---

### Phase 2: Enhanced Validation Results UI

**Current Problem:**
- Validation results are shown but not detailed enough
- No clear breakdown of what's wrong with each invalid record
- Auto-fixed codes shown but recommendations not clear

**Solution:**
Create a comprehensive validation results screen that shows:

1. **Summary Card:**
   ```
   ✅ 15 Valid Records (12 with auto-fixes)
   ❌ 12 Invalid Records
   ⚠️  8 Warnings
   ```

2. **Valid Records Section:**
   - Show auto-fixed diagnosis codes with confidence
   - Collapsible list of all valid records
   - Highlight what was auto-corrected

3. **Invalid Records Section:**
   - List each invalid record with:
     - Row number
     - Patient info (if available)
     - All errors for that record
     - **Recommendations on how to fix**

   Example:
   ```
   ❌ Row 5: Patient VR-A01-AAG1234

   Errors:
   • Patient number format invalid: "HO-A01-AAG1234"
     Recommendation: Must start with "VR-A"

   • Education "BASIC" not recognized
     Recommendation: Use "PRIMARY" or "JHS"

   • Diagnosis "I64.00" → Auto-fixed to "I64" (90% match)
   ```

4. **Warnings Section:**
   - Show non-blocking issues
   - Age discrepancies, missing optional fields, etc.

5. **Action Buttons:**
   ```
   [Download Invalid Records CSV]  [Upload Valid Records Only]  [Cancel]
   ```

**New Component to Create:**
- `src/sidepanel/components/ValidationResults.jsx` (comprehensive results display)

---

### Phase 3: Simplified Upload.jsx State Machine

**New Flow:**

```javascript
const [step, setStep] = useState('upload');
// States: 'upload' → 'processing' → 'results' → 'uploading' → 'completed'
```

**Step Details:**

1. **upload** - File selection
2. **processing** - Show spinner while cleaning & validating
3. **results** - Show ValidationResults component
4. **uploading** - Show ProgressTracker
5. **completed** - Show CompletionScreen

**Remove These Steps:**
- ❌ `sheet` - Handle automatically or inline
- ❌ `mapping` - Auto-detect
- ❌ `preview` - Combine with results
- ❌ `ready` - Skip, go straight to uploading

---

## Detailed Implementation Steps

### Step 1: Update handleFileSelect

```javascript
const handleFileSelect = async (event) => {
  const selectedFile = event.target.files[0];
  if (!selectedFile) return;

  setError(null);
  setStep('processing');

  try {
    // 1. Parse Excel
    const data = await ExcelParser.parseFile(selectedFile);
    setParsedData(data);

    // 2. Auto-detect field mapping
    const mapper = new FieldMapper(apiConfig);
    const autoMapping = mapper.autoDetectMapping(data.headers);
    setMapping(autoMapping);

    // 3. Clean data (fuzzy matching)
    const cleaner = new DataCleaner();
    const cleanResults = await cleaner.cleanAll(data.records, mapper);

    // 4. Validate cleaned data
    const validation = await DataValidator.validateWithFuzzyMatching(
      data.records,
      autoMapping,
      mapper
    );

    setValidation(validation);
    setStep('results');

  } catch (err) {
    setError(err.message);
    setStep('upload');
  }
};
```

### Step 2: Create ValidationResults Component

**File:** `src/sidepanel/components/ValidationResults.jsx`

```javascript
export default function ValidationResults({
  validation,
  onUploadValid,
  onDownloadInvalid,
  onCancel
}) {
  return (
    <div className="p-6 space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-bold mb-4">Validation Results</h2>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={CheckCircle}
            label="Valid"
            count={validation.validRecords}
            color="green"
          />
          <StatCard
            icon={XCircle}
            label="Invalid"
            count={validation.invalidRecords}
            color="red"
          />
          <StatCard
            icon={AlertTriangle}
            label="Warnings"
            count={validation.warnings.length}
            color="yellow"
          />
        </div>
      </div>

      {/* Auto-Fixed Diagnosis Codes */}
      {validation.suggestions?.length > 0 && (
        <AutoFixedSection suggestions={validation.suggestions} />
      )}

      {/* Invalid Records with Recommendations */}
      {validation.invalidRecordsList?.length > 0 && (
        <InvalidRecordsSection
          invalidRecords={validation.invalidRecordsList}
          onDownload={onDownloadInvalid}
        />
      )}

      {/* Valid Records Preview */}
      {validation.validRecordsList?.length > 0 && (
        <ValidRecordsSection
          validRecords={validation.validRecordsList}
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        {validation.invalidRecords > 0 && (
          <button onClick={onDownloadInvalid} className="btn-outline">
            Download Invalid Records
          </button>
        )}
        {validation.validRecords > 0 && (
          <button onClick={onUploadValid} className="btn-primary">
            Upload {validation.validRecords} Valid Records
          </button>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Add Recommendations Logic

**File:** `src/utils/recommendations.js` (NEW)

```javascript
export class RecommendationEngine {
  static getRecommendation(fieldName, value, error) {
    const recommendations = {
      patientNumber: {
        pattern: 'Must start with "VR-A" followed by facility code and 4 digits',
        examples: ['VR-A01-AAG1234', 'VR-A02-BBH5678'],
        fix: (val) => val.replace(/^[A-Z]{2}-/, 'VR-A')
      },

      education: {
        validValues: ['NONE', 'PRIMARY', 'JHS', 'SHS', 'TERTIARY'],
        suggestions: {
          'BASIC': 'PRIMARY or JHS',
          'SECONDARY': 'SHS',
          'UNIVERSITY': 'TERTIARY'
        }
      },

      age: {
        pattern: 'Must be between 0-150',
        fix: (val) => Math.max(0, Math.min(150, parseInt(val)))
      },

      diagnosis: {
        pattern: 'Must be valid ICD-10 code',
        note: 'Check auto-suggestions above for closest matches'
      }
    };

    return recommendations[fieldName] || null;
  }
}
```

### Step 4: Update Validator to Include Recommendations

**File:** `src/utils/data-validator.js`

Add recommendations to error objects:

```javascript
if (!isValid) {
  const recommendation = RecommendationEngine.getRecommendation(
    fieldName,
    value,
    errorMessage
  );

  errors.push({
    field: fieldName,
    value,
    message: errorMessage,
    recommendation // ← Add this
  });
}
```

---

## UI Components Structure

```
Upload.jsx (Main Container)
├── step === 'upload'
│   └── FileUploadArea
│
├── step === 'processing'
│   └── LoadingSpinner (with "Cleaning & validating data...")
│
├── step === 'results'
│   └── ValidationResults
│       ├── SummaryCard
│       ├── AutoFixedSection
│       ├── InvalidRecordsSection
│       │   └── InvalidRecordCard (with recommendations)
│       ├── ValidRecordsSection
│       └── ActionButtons
│
├── step === 'uploading'
│   └── ProgressTracker (already built)
│
└── step === 'completed'
    └── CompletionScreen (already built)
```

---

## Key Data Structures

### Validation Result with Recommendations

```javascript
{
  totalRecords: 27,
  validRecords: 15,
  invalidRecords: 12,

  validRecordsList: [
    {
      record: { patientNumber: "...", diagnosis: "I64" }, // cleaned
      rowNumber: 2,
      warnings: ["Age missing from excel"]
    }
  ],

  invalidRecordsList: [
    {
      record: { patientNumber: "HO-A01-AAG1234", ... },
      rowNumber: 5,
      errors: [
        {
          field: "patientNumber",
          value: "HO-A01-AAG1234",
          message: "Patient number must start with VR-A",
          recommendation: {
            pattern: "VR-A##-XXX####",
            examples: ["VR-A01-AAG1234"],
            suggestedFix: "VR-A01-AAG1234"
          }
        },
        {
          field: "education",
          value: "BASIC",
          message: "Education level not recognized",
          recommendation: {
            validValues: ["PRIMARY", "JHS", "SHS", "TERTIARY"],
            suggestedFix: "JHS",
            note: "BASIC education typically maps to JHS"
          }
        }
      ]
    }
  ],

  suggestions: [
    {
      rowNumber: 3,
      field: "principalDiagnosis",
      original: "I64.00",
      suggested: "I64",
      confidence: 0.95,
      alternatives: [...]
    }
  ],

  warnings: ["Row 10: Age missing"],
  canProceed: true
}
```

---

## Files to Create/Modify

### Create New:
1. ✅ `src/sidepanel/components/ValidationResults.jsx` - Main results display
2. ✅ `src/sidepanel/components/InvalidRecordCard.jsx` - Single invalid record display
3. ✅ `src/utils/recommendations.js` - Recommendation engine

### Modify Existing:
1. ✅ `src/sidepanel/pages/Upload.jsx` - Simplify flow
2. ✅ `src/utils/data-validator.js` - Add recommendations to errors
3. ✅ `src/utils/field-mapper.js` - Add autoDetectMapping method

### Remove:
1. ❌ `src/sidepanel/components/FieldMappingEditor.jsx` - No longer needed
2. ❌ `src/sidepanel/components/MappingTemplateManager.jsx` - No longer needed
3. ❌ Remove `mapping` step from Upload.jsx

---

## Success Criteria

✅ User uploads Excel → Sees results in <5 seconds
✅ Invalid records show clear reasons + recommendations
✅ Auto-fixed codes shown with confidence scores
✅ One-click "Upload Valid Records Only" button
✅ Download invalid records CSV for fixing
✅ Progress tracker shows real-time upload status
✅ Completion screen shows detailed results

---

## Testing Checklist

- [ ] Upload Excel with 27 records
- [ ] See validation results instantly
- [ ] Invalid records show recommendations
- [ ] Auto-fixed diagnosis codes displayed
- [ ] Click "Upload Valid Records"
- [ ] Progress tracker updates in real-time
- [ ] Completion screen shows success/failed
- [ ] Download failed records CSV

---

## Future Enhancements

1. **Inline Editing:** Let user fix invalid records in the UI
2. **Bulk Fix:** Apply recommendation to all similar errors
3. **Template Library:** Save common Excel formats
4. **Duplicate Detection:** Warn about duplicate patient numbers
5. **Historical Comparison:** Compare with previous uploads

---

## References

- **Node.js Implementation:** `plan/ACTIVITIES.md` (Oct 29, 2025)
- **Data Cleaner:** `lib/data-cleaner.js` (470 lines)
- **Validator:** `lib/validator.js` (280 lines)
- **Current Extension:** `src/sidepanel/pages/Upload.jsx`

---

**Status:** Ready for Implementation
**Priority:** High
**Estimated Time:** 4-6 hours
**Complexity:** Medium

---

## Quick Start for Next Session

```bash
cd dhims2-chrome-extension

# 1. Create ValidationResults component
touch src/sidepanel/components/ValidationResults.jsx

# 2. Create recommendations engine
touch src/utils/recommendations.js

# 3. Simplify Upload.jsx
# Remove: mapping step, FieldMappingEditor
# Add: Auto-detection, ValidationResults

# 4. Test
deno task build
# Load in Chrome and test with sample Excel
```

# Add Data Cleaning Transformations to Extension

**Date:** 2025-10-29
**Priority:** High
**Status:** Planned

---

## Problem

The extension's `data-cleaner.js` only does fuzzy diagnosis matching. It's missing all the other transformations from the Node.js pipeline:

- ✅ Fuzzy diagnosis matching (already implemented)
- ❌ Age splitting ("45 years" → {age: 45, ageUnit: "years"})
- ❌ Education mapping ("BASIC" → "JHS")
- ❌ Gender normalization
- ❌ Occupation mapping
- ❌ Speciality mapping
- ❌ Outcome mapping
- ❌ Date cleaning
- ❌ Cost cleaning
- ❌ Boolean cleaning
- ❌ ICD code splitting (multiple diagnosis codes)

---

## Transformations from Node.js Pipeline

### 1. Age Splitting
```javascript
cleanAge("45 years") → { age: 45, ageUnit: "years" }
cleanAge("2 months") → { age: 2, ageUnit: "months" }
cleanAge("45") → { age: 45, ageUnit: "years" }
```

### 2. Education Mapping
```javascript
"BASIC" → "JHS"
"ELEMENTARY" → "PRIMARY"
"JUNIOR HIGH" → "JHS"
"SENIOR HIGH" → "SHS"
"SECONDARY" → "SHS"
"UNIVERSITY" → "TERTIARY"
"COLLEGE" → "TERTIARY"
```

### 3. Gender Normalization
```javascript
"male" → "Male"
"FEMALE" → "Female"
"M" → "Male"
"F" → "Female"
```

### 4. Occupation Mapping
```javascript
"FARMING" → "FARMER"
"TRADING" → "TRADER"
"TEACHING" → "TEACHER"
// etc.
```

### 5. Speciality Mapping
```javascript
"MEDICINE" → "MEDICAL"
"SURGERY" → "SURGICAL"
"OBS" → "OBSTETRICS"
"GYNAE" → "GYNAECOLOGY"
"PAEDS" → "PAEDIATRICS"
```

### 6. Outcome Mapping
```javascript
"DISCHARGED" → "RECOVERED"
"CURED" → "RECOVERED"
"TRANSFERRED" → "REFERRED"
"DEATH" → "DIED"
"DEAD" → "DIED"
"ESCAPED" → "ABSCONDED"
```

### 7. Date Cleaning
```javascript
"29-10-2025" → "2025-10-29"
"10/29/2025" → "2025-10-29"
// Handles multiple date formats
```

### 8. Cost Cleaning
```javascript
"GH¢ 150.00" → "150.00"
"$150" → "150"
"150 cedis" → "150"
```

### 9. Boolean Cleaning
```javascript
"YES" → true
"NO" → false
"1" → true
"0" → false
```

### 10. ICD Code Splitting
```javascript
"I64, J18.9" → ["I64", "J18.9"] // Use first as principal, second as additional
```

---

## Implementation Plan

### Option 1: Port Cleaning Methods (Recommended)

Port the cleaning methods from `lib/data-cleaner.js` to the extension's `src/utils/data-cleaner.js`.

**Pros:**
- Same logic as Node.js pipeline
- Already tested and working
- Consistent behavior

**Cons:**
- More code to port (~300 lines)

### Option 2: Use RecommendationEngine Auto-Fix

The `RecommendationEngine` already has `suggestedFix` methods for most fields. We could apply these automatically during cleaning.

**Pros:**
- Reuses existing code
- Less duplication

**Cons:**
- May need adjustment for automatic application
- Not as comprehensive as dedicated cleaning

---

## Recommended Approach: Hybrid

1. **Keep fuzzy diagnosis matching** in data-cleaner.js
2. **Add transformation methods** for each field type
3. **Call transformations** before validation in Upload.jsx
4. **Show transformations** in ValidationResults as "Auto-cleaned"

---

## Files to Modify

1. **src/utils/data-cleaner.js**
   - Add `cleanAge()`
   - Add `cleanEducation()`
   - Add `cleanGender()`
   - Add `cleanOccupation()`
   - Add `cleanSpeciality()`
   - Add `cleanOutcome()`
   - Add `cleanDate()`
   - Add `cleanCost()`
   - Add `cleanBoolean()`
   - Add `splitDiagnosisCodes()`

2. **src/sidepanel/pages/Upload.jsx**
   - Call data cleaner before validation
   - Track transformations for display

3. **src/sidepanel/components/ValidationResults.jsx**
   - Add "Auto-Cleaned Fields" section
   - Show original → cleaned for each transformation

---

## Implementation Steps

### Step 1: Add Cleaning Methods to data-cleaner.js

```javascript
class DataCleaner {
  // ... existing fuzzy matching code ...

  /**
   * Clean age field - split into number and unit
   */
  cleanAge(value) {
    if (!value) return { age: null, ageUnit: null };

    const str = String(value).trim();
    const match = str.match(/(\d+)\s*(year|month|day|week)?s?/i);

    if (match) {
      return {
        age: parseInt(match[1]),
        ageUnit: (match[2] || 'years').toLowerCase()
      };
    }

    // If just a number, assume years
    const num = parseInt(str);
    if (!isNaN(num)) {
      return { age: num, ageUnit: 'years' };
    }

    return { age: null, ageUnit: null };
  }

  /**
   * Clean education level
   */
  cleanEducation(value) {
    if (!value) return null;

    const mapping = {
      'BASIC': 'JHS',
      'ELEMENTARY': 'PRIMARY',
      'JUNIOR HIGH': 'JHS',
      'JUNIOR SECONDARY': 'JHS',
      'SENIOR HIGH': 'SHS',
      'SENIOR SECONDARY': 'SHS',
      'SECONDARY': 'SHS',
      'UNIVERSITY': 'TERTIARY',
      'COLLEGE': 'TERTIARY',
      'DIPLOMA': 'TERTIARY'
    };

    const str = String(value).trim().toUpperCase();
    return mapping[str] || value;
  }

  // ... add other cleaning methods ...
}
```

### Step 2: Create cleanRow() Method

```javascript
/**
 * Clean all fields in a record
 */
cleanRow(record, fieldMappings) {
  const cleaned = { ...record };
  const transformations = [];

  // Clean each field based on its type
  Object.entries(fieldMappings).forEach(([dhimsField, config]) => {
    const excelColumn = config.excelColumn;
    const value = record[excelColumn];

    if (value === null || value === undefined) return;

    let cleanedValue = value;
    let wasTransformed = false;

    // Apply appropriate cleaning based on field type
    switch (dhimsField) {
      case 'age':
      case 'patientAge':
        const ageResult = this.cleanAge(value);
        if (ageResult.age !== null) {
          cleanedValue = ageResult.age;
          wasTransformed = value !== cleanedValue;
        }
        break;

      case 'education':
        const eduResult = this.cleanEducation(value);
        if (eduResult !== value) {
          cleanedValue = eduResult;
          wasTransformed = true;
        }
        break;

      case 'gender':
        const genderResult = this.cleanGender(value);
        if (genderResult !== value) {
          cleanedValue = genderResult;
          wasTransformed = true;
        }
        break;

      // ... other fields ...
    }

    if (wasTransformed) {
      cleaned[excelColumn] = cleanedValue;
      transformations.push({
        field: dhimsField,
        excelColumn,
        original: value,
        cleaned: cleanedValue
      });
    }
  });

  return {
    record: cleaned,
    transformations
  };
}
```

### Step 3: Integrate into Upload.jsx

```javascript
// After parsing Excel
const data = await ExcelParser.parseFile(selectedFile);

// Auto-detect mapping
const mapper = new FieldMapper(apiConfig);
const autoMapping = mapper.autoDetectMapping(data.headers);

// Clean data with transformations
const cleaner = new DataCleaner();
const cleanResults = data.records.map(record =>
  cleaner.cleanRow(record, apiConfig.fieldMappings)
);

// Extract cleaned records and track transformations
const cleanedRecords = cleanResults.map(r => r.record);
const allTransformations = cleanResults
  .map((r, i) => r.transformations.map(t => ({...t, rowNumber: i + 2})))
  .flat();

// Validate cleaned data
const validation = await DataValidator.validateWithFuzzyMatching(
  cleanedRecords,
  autoMapping,
  mapper
);

// Add transformations to validation result
validation.transformations = allTransformations;
```

### Step 4: Display in ValidationResults.jsx

Add a new section to show auto-cleaned fields:

```jsx
{/* Auto-Cleaned Fields Section */}
{validation.transformations && validation.transformations.length > 0 && (
  <div className="bg-white rounded-lg border shadow-sm">
    <button onClick={() => toggleSection('cleaned')} className="...">
      <div className="flex items-center gap-3">
        <Wand2 className="w-5 h-5 text-purple-600" />
        <div className="text-left">
          <h3 className="font-semibold">
            Auto-Cleaned Fields ({validation.transformations.length})
          </h3>
          <p className="text-sm text-gray-600">
            These values were automatically cleaned and standardized
          </p>
        </div>
      </div>
    </button>

    {expandedSections.cleaned && (
      <div className="px-6 pb-4 space-y-2">
        {validation.transformations.map((t, i) => (
          <div key={i} className="p-3 bg-purple-50 border border-purple-200 rounded">
            <div className="text-sm">
              <span className="font-medium text-gray-700">
                Row {t.rowNumber} - {t.field}:
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-red-600 line-through">{t.original}</span>
                <span className="text-gray-400">→</span>
                <span className="font-mono text-green-600">{t.cleaned}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

---

## Testing Checklist

- [ ] Age "45 years" cleaned to 45
- [ ] Education "BASIC" cleaned to "JHS"
- [ ] Gender "male" cleaned to "Male"
- [ ] Occupation variations mapped correctly
- [ ] Speciality "MEDICINE" cleaned to "MEDICAL"
- [ ] Outcome "DISCHARGED" cleaned to "RECOVERED"
- [ ] Dates normalized to YYYY-MM-DD
- [ ] Cost "GH¢ 150" cleaned to "150"
- [ ] Boolean "YES" cleaned to true
- [ ] Multiple diagnosis codes split correctly
- [ ] Transformations displayed in UI

---

## Benefits

✅ **Automatic data standardization**
✅ **Fewer validation errors**
✅ **Better data quality**
✅ **Less manual correction needed**
✅ **Matches Node.js pipeline exactly**
✅ **Transparent - user sees what was cleaned**

---

## Next Session Quick Start

```bash
cd dhims2-chrome-extension

# 1. Add cleaning methods to data-cleaner.js
# Port from lib/data-cleaner.js lines 72-650

# 2. Update Upload.jsx to call cleaning
# Before validation, run: cleaner.cleanRow()

# 3. Display transformations in ValidationResults
# Add new collapsible section

# 4. Test
deno task build
# Load in Chrome and test with sample Excel
```

---

**Status:** Ready for Implementation
**Estimated Time:** 2-3 hours
**Priority:** High - Missing key transformations

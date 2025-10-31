# ✨ Automatic Field Update - `occurredAt`

**Date:** October 31, 2025
**Status:** ✅ Implemented
**Affected Files:** 3 files updated

---

## Summary

Added automatic date filling for the `occurredAt` field. This field now **automatically gets filled with the current date** (the day of entry/upload) and **does not require any Excel column mapping**.

---

## What Changed

### Before
- `occurredAt` was set to the **Date of Admission** from the Excel file
- If no admission date was found, it would fall back to the current date

### After
- `occurredAt` is **always set to the current date** (today's date)
- This happens automatically when creating events
- No Excel column mapping needed for this field

---

## Why This Matters

The `occurredAt` field represents **when the event was recorded in the DHIS2 system**, not when the patient was admitted to the hospital. Therefore:

- **Date of Admission** (`HsMaBh3wKed`) = When the patient was admitted (comes from Excel)
- **occurredAt** = When the data was entered into DHIS2 (automatic - today's date)

---

## Files Updated

### 1. `lib/field-mapper.js`
**Location:** Line 264-276

```javascript
createEvent(cleanedData) {
  // Get current date in ISO format (YYYY-MM-DD)
  const currentDate = new Date().toISOString().split('T')[0];

  return {
    orgUnit: this.fixedFields.orgUnit,
    occurredAt: currentDate, // Automatically set to current date (day of entry)
    status: this.fixedFields.status,
    notes: this.fixedFields.notes,
    program: this.fixedFields.program,
    programStage: this.fixedFields.programStage,
    dataValues: this.mapToDataValues(cleanedData)
  };
}
```

### 2. `dhims2-chrome-extension/src/utils/field-mapper.js`
**Location:** Line 167-178

```javascript
// Build event object
// occurredAt is automatically set to current date (day of entry)
const currentDate = new Date().toISOString().split('T')[0];

const event = {
  program: this.staticValues.program,
  orgUnit: this.staticValues.orgUnit,
  programStage: this.staticValues.programStage,
  status: this.staticValues.status || 'COMPLETED',
  occurredAt: currentDate, // Automatically filled with current date
  dataValues
};
```

### 3. `dhims2-chrome-extension/src/background/api-uploader.js`
**Location:** Line 389-400

```javascript
// Build event
// occurredAt is automatically set to current date (day of entry)
const currentDate = new Date().toISOString().split('T')[0];

const event = {
  program: this.apiConfig.payload_structure?.program,
  orgUnit: this.apiConfig.payload_structure?.orgUnit,
  programStage: this.apiConfig.payload_structure?.programStage,
  occurredAt: currentDate,  // Automatically filled with current date
  status: 'COMPLETED',
  dataValues
};
```

---

## Documentation Updated

### 1. `FIELD_CONFIGURATION.json`
Updated the Date of Admission mapping to clarify that `occurredAt` is automatic:

```json
{
  "special": "occurredAt",
  "transformation": "AUTOMATIC - uses current date (day of entry/upload)",
  "note": "This field is automatically filled and does not require Excel mapping"
}
```

### 2. `DISCOVERY_COMPLETE.md`
Added new section for automatic fields:

```markdown
### Automatic Fields (1 field - No Excel Mapping Required)

| # | Field Name | Type | Value | Notes |
|---|------------|------|-------|-------|
| 0 | occurredAt | date | Current Date | ✨ **Automatically filled** with today's date (day of entry/upload). No Excel column needed. |
```

---

## How It Works

### Example Upload Scenario

**Upload Date:** October 31, 2025

**Excel Data:**
- Patient No: VR-A01-AAG3356
- Date of Admission: 26-06-2025 (June 26, 2025)
- Date of Discharge: 27-06-2025 (June 27, 2025)

**Generated API Payload:**
```json
{
  "events": [{
    "orgUnit": "duCDqCRlWG1",
    "program": "fFYTJRzD2qq",
    "programStage": "LR7JT7ZNg8E",
    "occurredAt": "2025-10-31",  // ← Automatically set to today (upload date)
    "status": "COMPLETED",
    "dataValues": [
      {
        "dataElement": "HsMaBh3wKed",
        "value": "2025-06-26"  // ← Date of Admission from Excel
      },
      {
        "dataElement": "sIPe9r0NBbq",
        "value": "2025-06-27"  // ← Date of Discharge from Excel
      },
      // ... other fields
    ]
  }]
}
```

**Result:**
- `occurredAt` = **2025-10-31** (today - when data was uploaded)
- Date of Admission = **2025-06-26** (from Excel - when patient was admitted)
- Date of Discharge = **2025-06-27** (from Excel - when patient was discharged)

---

## Testing

To verify this change is working:

1. **Upload a record** using the batch uploader
2. **Check the API payload** in the browser console or network tab
3. **Verify** that `occurredAt` matches today's date (not the admission date)

---

## Benefits

✅ **Accurate Timestamps** - Records show when they were entered into the system
✅ **No Manual Input** - Users don't need to add an extra column in Excel
✅ **Consistent Data** - All records uploaded on the same day have the same `occurredAt` date
✅ **Audit Trail** - Easy to track when data was entered vs when events happened

---

## Backward Compatibility

This change is **fully backward compatible**:

- ✅ Old Excel files work without modification
- ✅ No new columns required in Excel
- ✅ No changes needed to existing field mappings
- ✅ All 16 data elements remain the same

---

## Summary

| Aspect | Details |
|--------|---------|
| **Field Name** | `occurredAt` |
| **Previous Value** | Date of Admission (from Excel) |
| **New Value** | Current Date (automatic) |
| **Excel Column** | None (automatic field) |
| **Format** | YYYY-MM-DD (ISO 8601) |
| **Timezone** | UTC (from JavaScript `Date` object) |
| **User Action** | None required - completely automatic |

---

**Status:** ✅ Ready to use! The automatic date field is now active in all upload scenarios.

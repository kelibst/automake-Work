# DHIS2 API Field Mapping

## API Endpoint
```
POST https://events.chimgh.org/events/api/41/tracker?async=false
```

## Fixed Fields (Same for all records)
| Field | Value | Notes |
|-------|-------|-------|
| orgUnit | duCDqCRlWG1 | Organization Unit ID |
| program | fFYTJRzD2qq | In-Patient Morbidity Program |
| programStage | LR7JT7ZNg8E | Program Stage |
| status | COMPLETED | Event status |
| notes | [] | Empty array |

## Data Element Mappings

### From Captured API Call:

| Excel Column | Data Element ID | Example Value | Type | Notes |
|--------------|-----------------|---------------|------|-------|
| Patient No. | h0Ef6ykTpNB | VR-A01-AAG3356 | text | Required |
| Locality/Address/Residence | nk15h7fzCLz | NEW BAIKA | text | Required |
| Age (number) | upqhIcii1iC | 20 | number | Required |
| Age (unit) | WZ5rS7QuECT | years | dropdown | Required (years/months/days) |
| Gender | fg8sMCaTOrK | Male | dropdown | Required (Male/Female) |
| Occupation | qAWldjTeMIs | Student | dropdown | Required |
| Educational Status | Hi8Cp84CnZQ | Tertiary | dropdown | Required (SHS/jhs/Tertiary) |
| Date of Admission | HsMaBh3wKed | 2025-06-26 | date | Required (YYYY-MM-DD) |
| Date of Discharge | sIPe9r0NBbq | 2025-06-27 | date | Required (YYYY-MM-DD) |
| Speciality | xpzJAQC4DGe | Casualty | dropdown | Required (mapped from "Accident Emergency") |
| Outcome of Discharge | OMN7CVW4IaY | Transferred | dropdown | Required (Discharge/Transferred/Referred/Died) |
| Principal Diagnosis | yPXPzceTIvq | A35 - Tetanus | text | Required (with ICD code) |
| Additional Diagnosis | ??? | NA | text | Optional - Need to find data element ID |
| Surgical Procedure | dsVClbnOnm6 | false | boolean | Required (true/false or Yes/No) |
| Cost of Treatment | ??? | 679 | number | Optional - Need to find data element ID |
| NHIS Status | ETSl9Q3SUOG | false | boolean | Required (true/false or Yes/No) |
| Provisional Diagnosis | ??? | NA | text | Optional - Need to find data element ID |
| Main Department | ??? | ACCIDENT AND EMERGENCY | text | Optional - Need to find data element ID |
| CC Code | ??? | NA | text | Optional - Need to find data element ID |

## Value Mappings Needed

### Speciality Mapping:
- "Accident Emergency" → "Casualty" (or find exact value from DHIS2)

### Outcome Mapping:
- "Discharge" → "Discharge"
- "Referred" → "Referred"
- "Transferred" → "Transferred"
- "Died" → "Died"

### Education Mapping:
- "SHS" → "SHS" (or "Secondary"?)
- "jhs" → "JHS" (or "Junior Secondary"?)
- "Tertiary" → "Tertiary"

### Occupation Mapping:
- "Student" → "Student"
- "Trader" → "Trader"
- "Teacher" → "Teacher"
- "PENSIONIER" → "Pensioner"

### NHIS Status:
- "Yes" → "true"
- "No" → "false"

### Surgical Procedure:
- "Yes" → "true"
- "No" → "false"

## Date Format
Excel dates like "26-06-2025" must be converted to "2025-06-26" (ISO format)

## Missing Data Elements

The following fields from your Excel don't have data element IDs yet:
1. Additional Diagnosis
2. Cost of Treatment
3. Provisional Diagnosis
4. Main Department
5. CC Code

**Action Required:** We need to either:
- Capture another form submission with these fields filled in
- Look them up in DHIS2 metadata
- Ask the DHIS2 admin for the data dictionary

## Notes

1. The `occurredAt` field should match the Date of Admission
2. All dates must be in ISO format (YYYY-MM-DD)
3. Boolean fields use "true"/"false" strings, not Yes/No
4. The API returns a unique UID for each created event

# DHIMS2 Form Field Selectors Reference

**Page:** In-Patient Morbidity and Mortality
**URL:** https://events.chimgh.org/events/dhis-web-capture/

---

## Field Selectors for Template Creation

Use these selectors when creating your form filling template:

### Basic Info Section

| Field Name | Excel Column | CSS Selector | Field Type |
|------------|--------------|--------------|------------|
| Report date | (auto-filled) | `div[data-test="dataentry-field-occurredAt"] input` | date |
| Organisation unit | (auto-filled) | `div[data-test="dataentry-field-orgUnit"]` | (locked) |

### Patient Details Section

| Field Name | Excel Column Example | CSS Selector | Field Type |
|------------|---------------------|--------------|------------|
| Patient number | Patient No. | `div[data-test="form-field-h0Ef6ykTpNB"] input` | text |
| Address | Locality/Address/Residence | `div[data-test="form-field-nk15h7fzCLz"] input` | text |
| Age | Age | `div[data-test="form-field-upqhIcii1iC"] input` | text |
| Patient Age | Age | `input#WZ5rS7QuECT` | dropdown |
| Gender (morbidity/mortality) | Gender | `input#fg8sMCaTOrK` | dropdown |
| Occupation | Occupation | `input#qAWldjTeMIs` | dropdown |
| Education | Educational Status | `input#Hi8Cp84CnZQ` | dropdown |

### Admission/Discharge Section

| Field Name | Excel Column Example | CSS Selector | Field Type |
|------------|---------------------|--------------|------------|
| Date of admission | Date of Admission | `div[data-test="form-field-HsMaBh3wKed"] input` | date |
| Date of discharge | Date of Discharge | `div[data-test="form-field-sIPe9r0NBbq"] input` | date |
| Speciality | Speciality | `input#xpzJAQC4DGe` | dropdown |
| Outcome | Outcome of Discharge | `input#OMN7CVW4IaY` | dropdown |

### Diagnosis Section

| Field Name | Excel Column Example | CSS Selector | Field Type |
|------------|---------------------|--------------|------------|
| Principal diagnosis | Principal Diagnosis | `input#yPXPzceTIvq` | searchable |
| Additional diagnosis | Additional Diagnosis | `input#O15UNfCqavW` | searchable |

### Treatment Section

| Field Name | Excel Column Example | CSS Selector | Field Type |
|------------|---------------------|--------------|------------|
| Surgical procedure | Surgical Procedure | `input#dsVClbnOnm6Yes` | radio |
| Cost | Cost of Treatment | `div[data-test="form-field-fRkwcThGCTM"] input` | text |
| Insured | NHIS Status | `input#ETSl9Q3SUOGYes` | radio |

### Status Section

| Field Name | Excel Column Example | CSS Selector | Field Type |
|------------|---------------------|--------------|------------|
| Complete event | (manual selection) | `input#completeYes` | radio |

---

## Template Example JSON

Here's a complete template example you can use:

```json
{
  "name": "DHIMS2 Patient Entry Form",
  "system": "dhims2",
  "fields": [
    {
      "formField": "Patient number",
      "selector": "div[data-test=\"form-field-h0Ef6ykTpNB\"] input",
      "type": "text",
      "excelColumn": "Patient No.",
      "required": true,
      "fuzzyMatch": false
    },
    {
      "formField": "Address",
      "selector": "div[data-test=\"form-field-nk15h7fzCLz\"] input",
      "type": "text",
      "excelColumn": "Locality/Address/Residence",
      "required": true,
      "fuzzyMatch": false
    },
    {
      "formField": "Age",
      "selector": "div[data-test=\"form-field-upqhIcii1iC\"] input",
      "type": "text",
      "excelColumn": "Age",
      "required": true,
      "fuzzyMatch": false
    },
    {
      "formField": "Patient Age",
      "selector": "input#WZ5rS7QuECT",
      "type": "dropdown",
      "excelColumn": "Age",
      "required": true,
      "fuzzyMatch": true
    },
    {
      "formField": "Gender",
      "selector": "input#fg8sMCaTOrK",
      "type": "dropdown",
      "excelColumn": "Gender",
      "required": true,
      "fuzzyMatch": true
    },
    {
      "formField": "Occupation",
      "selector": "input#qAWldjTeMIs",
      "type": "dropdown",
      "excelColumn": "Occupation",
      "required": true,
      "fuzzyMatch": true
    },
    {
      "formField": "Education",
      "selector": "input#Hi8Cp84CnZQ",
      "type": "dropdown",
      "excelColumn": "Educational Status",
      "required": true,
      "fuzzyMatch": true
    },
    {
      "formField": "Date of admission",
      "selector": "div[data-test=\"form-field-HsMaBh3wKed\"] input",
      "type": "date",
      "excelColumn": "Date of Admission",
      "required": true,
      "fuzzyMatch": false
    },
    {
      "formField": "Date of discharge",
      "selector": "div[data-test=\"form-field-sIPe9r0NBbq\"] input",
      "type": "date",
      "excelColumn": "Date of Discharge",
      "required": true,
      "fuzzyMatch": false
    },
    {
      "formField": "Speciality",
      "selector": "input#xpzJAQC4DGe",
      "type": "dropdown",
      "excelColumn": "Speciality",
      "required": true,
      "fuzzyMatch": true
    },
    {
      "formField": "Outcome",
      "selector": "input#OMN7CVW4IaY",
      "type": "dropdown",
      "excelColumn": "Outcome of Discharge",
      "required": true,
      "fuzzyMatch": true
    },
    {
      "formField": "Principal diagnosis",
      "selector": "input#yPXPzceTIvq",
      "type": "searchable",
      "excelColumn": "Principal Diagnosis",
      "required": true,
      "fuzzyMatch": true
    },
    {
      "formField": "Additional diagnosis",
      "selector": "input#O15UNfCqavW",
      "type": "searchable",
      "excelColumn": "Additional Diagnosis",
      "required": false,
      "fuzzyMatch": true
    },
    {
      "formField": "Cost",
      "selector": "div[data-test=\"form-field-fRkwcThGCTM\"] input",
      "type": "text",
      "excelColumn": "Cost of Treatment",
      "required": false,
      "fuzzyMatch": false
    }
  ]
}
```

---

## Quick Start Guide

### Method 1: Use the Template Creator UI

1. **Load Extension** - Open DHIMS2 form and extension sidepanel
2. **Go to Form Fill tab**
3. **Upload Excel file**
4. **Click "Create New Template"**
5. **Add fields one by one**:
   - Form Field Name: "Patient number"
   - CSS Selector: `div[data-test="form-field-h0Ef6ykTpNB"] input`
   - Field Type: Text Input
   - Excel Column: Select from dropdown
6. **Save template**

### Method 2: Import Template JSON

1. Copy the template JSON above
2. Save as `dhims2-patient-form.json`
3. In template creator, click "Import Template"
4. Select the JSON file
5. Click "Save Template"

---

## Tips for Finding Selectors

### Using Browser DevTools

1. **Open DHIMS2 form**
2. **Right-click** on the field → "Inspect"
3. Look for unique attributes:
   - `data-test="form-field-XXXXX"` (most reliable)
   - `id="XXXXX"` (for dropdown inputs)
   - `name="XXXXX"` (for radio buttons)

### Selector Patterns

**Text inputs:**
```css
div[data-test="form-field-XXXXX"] input
```

**Dropdowns (DHIS2 React Select):**
```css
input#XXXXX
```

**Date pickers:**
```css
div[data-test="form-field-XXXXX"] input
```

**Radio buttons (Yes/No):**
```css
input#XXXXXYes    /* For "Yes" option */
input#XXXXXNo     /* For "No" option */
```

**Searchable fields:**
```css
input#XXXXX
```

---

## Special Notes

### Dropdown Fields
DHIMS2 uses React-Select components. The `input#XXXXX` selector works because it targets the hidden input that React-Select uses. When you type, it triggers the dropdown.

### Searchable Fields (Diagnosis)
These fields require user interaction:
1. Extension fills the search term
2. Dropdown appears with results
3. Extension **pauses**
4. User selects from dropdown
5. User clicks "Continue" (when implemented)

### Radio Buttons
For Yes/No fields like "Surgical procedure" and "Insured":
- Use `input#fieldIdYes` for "Yes"
- Use `input#fieldIdNo` for "No"
- Excel values: "Yes", "No", "true", "false", "1", "0"

### Date Fields
- Format: YYYY-MM-DD (2025-01-15)
- Extension auto-converts common date formats
- If Excel has dates, they'll be formatted automatically

---

## Testing Your Template

1. **Create template** with 2-3 fields first
2. **Upload test Excel** with 1 row
3. **Fill form** and verify fields are filled correctly
4. **Add more fields** incrementally
5. **Test fuzzy matching** with dropdown values

---

**Last Updated:** 2025-10-29
**Verified On:** DHIMS2 Capture App v41

# Quick Start Testing Guide
## Form Auto-Fill Feature

**Last Updated:** 2025-10-29
**Status:** Ready for Testing 🚀

---

## ✅ What's Complete

1. **Form Filler Page** - Complete 3-step workflow
2. **Template Creator UI** - Visual field mapping interface
3. **Excel Upload & Parsing** - Sheet selection and data preview
4. **Form Filling Engine** - All field types supported with fuzzy matching
5. **Storage System** - Template save/load/delete
6. **Content Script** - Form filling with pause for searchables

---

## 🚀 Step-by-Step Testing

### Step 1: Load the Extension

The dev server is running at **http://127.0.0.1:5173/**

**In Chrome:**

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Navigate to:
   ```
   C:\Users\Kelib\Desktop\projects\automake-Work\dhims2-chrome-extension
   ```
5. Select the folder
6. Extension should appear in your extensions list

**Verify it's loaded:**
- Click the extension icon in Chrome toolbar
- You should see the sidepanel open with tabs: Discovery, Upload, **Form Fill**, Settings, Debug

---

### Step 2: Open DHIMS2 Form

1. Go to: **https://events.chimgh.org/events/**
2. Login with your credentials
3. Navigate to: **In-Patient Morbidity and Mortality** entry form
4. The form should be visible on the page

---

### Step 3: Prepare Test Data

Create a simple Excel file with patient data. Here's a minimal example:

| Patient No. | Locality/Address/Residence | Age | Gender | Occupation | Educational Status | Date of Admission | Date of Discharge | Speciality | Outcome of Discharge | Principal Diagnosis | Cost of Treatment |
|-------------|----------------------------|-----|--------|------------|-------------------|-------------------|-------------------|------------|---------------------|---------------------|-------------------|
| VR-A01-001 | Hohoe | 25 | Male | Farmer | Primary | 2025-01-15 | 2025-01-20 | Internal Medicine | Improved | Malaria | 150 |
| VR-A01-002 | Ho | 34 | Female | Teacher | Tertiary | 2025-01-16 | 2025-01-22 | Surgery | Improved | Appendicitis | 500 |

Save as `test-patients.xlsx`

---

### Step 4: Create Your First Template

**Method A: Using the UI (Recommended)**

1. **Open Extension Sidepanel**
   - Click extension icon or open from sidebar

2. **Go to "Form Fill" Tab**

3. **Upload Excel File**
   - Click "Choose File"
   - Select `test-patients.xlsx`
   - Select the sheet (if multiple)
   - Click "Next: Map Fields"

4. **Create New Template**
   - Click "Create New Template" button
   - **Template creator modal opens**

5. **Configure Template**
   - **Template Name:** "DHIMS2 Patient Form"

6. **Add Fields** (Start with just 3 fields for testing):

   **Field 1:**
   - Click "Add Field"
   - Form Field Name: `Patient number`
   - CSS Selector: `div[data-test="form-field-h0Ef6ykTpNB"] input`
   - Field Type: `Text Input`
   - Excel Column: `Patient No.`
   - Check "Required"

   **Field 2:**
   - Click "Add Field"
   - Form Field Name: `Address`
   - CSS Selector: `div[data-test="form-field-nk15h7fzCLz"] input`
   - Field Type: `Text Input`
   - Excel Column: `Locality/Address/Residence`
   - Check "Required"

   **Field 3:**
   - Click "Add Field"
   - Form Field Name: `Age`
   - CSS Selector: `div[data-test="form-field-upqhIcii1iC"] input`
   - Field Type: `Text Input`
   - Excel Column: `Age`
   - Check "Required"

7. **Save Template**
   - Click "Save Template"
   - You'll be taken to Step 3 (Fill Forms)

**Method B: Import Template JSON (Faster)**

1. Copy the template JSON from `docs/DHIMS2_FIELD_SELECTORS.md`
2. Save as `dhims2-template.json`
3. In template creator, click "Import Template"
4. Select the JSON file
5. Click "Save Template"

---

### Step 5: Fill Your First Form

1. **You should be on Step 3** (Form Fill mode)

2. **Verify Data**
   - Current Row: 1 of 2
   - See preview of row 1 data

3. **Make Sure DHIMS2 Form is Open** in another tab

4. **Click "Fill Form"**

5. **Watch the Magic! ✨**
   - Extension will fill each field
   - You'll see progress updates
   - Fields should populate one by one

6. **Check the Form**
   - Switch to DHIMS2 tab
   - Verify fields are filled correctly:
     - Patient number: VR-A01-001
     - Address: Hohoe
     - Age: 25

7. **Submit Manually**
   - Review the form
   - Click "Save and exit" in DHIMS2
   - Extension auto-advances to Row 2

8. **Repeat for Row 2**

---

## 🐛 Troubleshooting

### Extension Not Loading
```bash
# Rebuild the extension
cd dhims2-chrome-extension
deno task build

# Then reload extension in chrome://extensions/
```

### Template Not Saving
- Check browser console (F12) for errors
- Verify Excel file was uploaded first
- Check that template name is not empty

### Fields Not Filling
**Common Issues:**

1. **Wrong Selector**
   - Open DHIMS2 form
   - Right-click field → Inspect
   - Verify selector matches

2. **Form Not Loaded**
   - Make sure you're on the new event page
   - URL should be: `.../dhis-web-capture/index.html#/new?...`

3. **Content Script Not Injected**
   - Open console on DHIMS2 page
   - Look for: `🔌 DHIMS2 Extension: Content script loaded`
   - If missing, reload the page

4. **Chrome Permissions**
   - Extension needs permission for `events.chimgh.org`
   - Check chrome://extensions/ for warnings

### Dropdown Fields Not Working
- Selectors for DHIMS2 dropdowns: `input#fieldId`
- Make sure fuzzy matching is enabled
- Try exact value from dropdown first

### Date Fields Not Filling
- Format should be: YYYY-MM-DD
- Excel dates auto-convert
- If manual, use: 2025-01-15

---

## 📝 Testing Checklist

- [ ] Extension loads in Chrome
- [ ] Form Fill tab appears
- [ ] Excel file uploads successfully
- [ ] Sheet selection works
- [ ] Data preview shows correctly
- [ ] Template creator opens
- [ ] Can add fields to template
- [ ] Can save template
- [ ] Template appears in list
- [ ] Can select template
- [ ] Row navigation works (Next/Previous/Jump)
- [ ] Fill Form button works
- [ ] Text fields fill correctly
- [ ] At least 2-3 fields fill successfully
- [ ] Auto-advance to next row works

---

## 🎯 Next Steps After Basic Testing

### 1. Add More Fields
Once 3 fields work, add more:
- Dropdowns (Gender, Occupation, etc.)
- Date fields (Admission, Discharge)
- Searchable fields (Diagnosis)

### 2. Test Fuzzy Matching
Try values that don't exactly match:
- Excel: "MALE" → Dropdown: "Male" ✅
- Excel: "Primary" → Dropdown: "Primary School" ✅

### 3. Test Searchable Fields
- Add Principal Diagnosis field
- Fill form
- Extension will pause after typing
- You select from dropdown manually
- (Continue button coming soon)

### 4. Export/Import Templates
- Export your template as JSON
- Share with team members
- Import on different machines

---

## 💡 Pro Tips

### Finding Selectors Quickly
```javascript
// Run in DHIMS2 page console
document.querySelectorAll('[data-test^="form-field"]').forEach(el => {
  const label = el.querySelector('span')?.textContent;
  const input = el.querySelector('input');
  if (input) {
    console.log(`${label}: ${el.getAttribute('data-test')}`);
  }
});
```

### Test with Small Batches
- Start with 1-2 rows
- Verify fields fill correctly
- Then scale to 10-20 rows
- Finally test with full dataset

### Save Time with Templates
- Create once, use forever
- Export and backup templates
- Share with colleagues
- Version control template JSONs

---

## 📊 Expected Behavior

### ✅ Success Indicators
- Fields populate automatically
- Values match Excel data
- Fuzzy matching works for dropdowns
- Extension advances to next row
- No JavaScript errors in console

### ⚠️ Known Limitations (Current)
- Searchable fields pause (by design)
- No auto-submit (manual review required)
- One row at a time (auto-fill mode coming soon)
- Radio buttons need exact selector per option

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Console Errors**
   - Extension console: Right-click extension → Inspect
   - Page console: F12 on DHIMS2 page

2. **Verify Selectors**
   - Use `docs/DHIMS2_FIELD_SELECTORS.md`
   - Test selector in console: `document.querySelector('selector')`

3. **Check Implementation Docs**
   - `docs/FORM_FILLER_IMPLEMENTATION.md`
   - Architecture and troubleshooting guide

---

## 🎉 Success!

If fields are filling correctly, congratulations! You now have a working form auto-fill system.

**Next Enhancements:**
1. Add all remaining fields to template
2. Test with full patient dataset
3. Measure time savings
4. Share templates with team
5. Provide feedback for improvements

---

**Testing Start Time:** _____________
**Testing End Time:** _____________
**Fields Tested:** _____ / 16
**Success Rate:** _____%

**Notes:**
-
-
-

**Issues Found:**
-
-
-

---

**Happy Testing! 🚀**

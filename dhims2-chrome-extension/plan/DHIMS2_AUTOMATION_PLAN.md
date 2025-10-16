# DHIMS2 In-Patient Morbidity & Mortality Data Upload Automation Plan

**Date:** October 16, 2025
**Project:** Automated DHIMS2 Data Entry System
**Author:** Claude (AI Assistant)

---

## Executive Summary

Based on the analysis of your DHIMS2 system and Excel data, I've identified **THREE viable automation approaches**. The recommended solution is a **Python + Playwright automation script** that can directly interact with the DHIMS2 web interface to submit data from your Excel file.

---

## Current Situation Analysis

### Data Source: Excel File
Your Excel file contains patient records with these fields:
- Patient Name, Patient No., Age, Gender
- Locality/Address/Residence, Occupation, Educational Status
- Date of Admission, Date of Discharge
- Speciality, Outcome of Discharge
- Principal Diagnosis (with ICD codes)
- Additional Diagnosis, Surgical Procedure
- Cost of Treatment, NHIS Status
- Main Department

### Target: DHIMS2 Web Form
The DHIMS2 form at `https://events.chimgh.org/events/dhis-web-capture/` has these fields:
- Report date* (date picker)
- Organisation unit* (Volta Regional Hospital - pre-filled)
- Patient number* (text)
- Address* (text)
- Age* (text)
- Patient Age* (dropdown)
- Gender (morbidity/mortality)* (dropdown)
- Occupation* (dropdown)
- Education* (dropdown)
- Date of admission (morbidity/mortality)* (date picker)
- Date of discharge (morbidity/mortality)* (date picker)
- Speciality* (dropdown)
- Outcome* (dropdown)
- Principal diagnosis* (dropdown - searchable)
- Additional diagnosis (dropdown - searchable)
- Surgical procedure* (Yes/No radio)
- Cost (text)
- Insured* (Yes/No radio)

**Key observations:**
- Fields marked with `*` are required
- Multiple dropdown fields need exact value matching
- Diagnosis fields are searchable dropdowns (likely with ICD codes)
- DHIMS2 uses a React-based SPA (Single Page Application)

---

## API Analysis Findings

From network inspection, DHIMS2 uses standard DHIS2 APIs:

### Key API Endpoints Discovered:
1. **Program metadata:** `/api/41/programs?fields=...`
2. **Data elements:** `/api/41/dataElements?fields=...`
3. **Option sets:** `/api/41/optionSets?fields=...` (for dropdowns)
4. **Event submission:** (Need to capture - likely `/api/41/events` or `/api/tracker/events`)

### Authentication:
- Session-based (cookies after login)
- Initial login: `POST /api/41/auth/login`

---

## Recommended Solutions (Ranked by Feasibility)

### ⭐ **Option 1: Python + Playwright Automation (RECOMMENDED)**

**Why this is best:**
- ✅ No need to reverse-engineer complex API payload
- ✅ Works with your existing login session
- ✅ Handles all UI interactions (dropdowns, date pickers, etc.)
- ✅ Can be debugged visually (headless or headed mode)
- ✅ Easier to maintain when DHIMS2 updates

**How it works:**
1. Read Excel file with pandas
2. Use Playwright to launch browser
3. Login to DHIMS2 (or use existing session)
4. For each row in Excel:
   - Navigate to new event page
   - Fill all form fields
   - Submit form
   - Verify success
   - Log results
5. Generate success/failure report

**Tech Stack:**
- Python 3.10+
- Playwright (browser automation)
- pandas (Excel reading)
- openpyxl (Excel manipulation)

**Estimated Development Time:** 2-3 days

**Sample Code Structure:**
```python
# main.py
import pandas as pd
from playwright.sync_api import sync_playwright

def upload_patient_records(excel_file):
    df = pd.read_excel(excel_file)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Login
        page.goto('https://events.chimgh.org/events/dhis-web-capture/')
        # ... login logic

        for index, row in df.iterrows():
            try:
                # Fill form
                fill_patient_form(page, row)
                # Submit
                submit_form(page)
                # Log success
                print(f"✅ Row {index+1}: {row['Patient Name']} uploaded")
            except Exception as e:
                print(f"❌ Row {index+1}: Failed - {e}")

        browser.close()

def fill_patient_form(page, row):
    # Navigate to new event
    page.goto('https://events.chimgh.org/events/dhis-web-capture/index.html#/new?orgUnitId=duCDqCRlWG1&programId=fFYTJRzD2qq')

    # Fill Report date
    page.fill('[data-test="dataentry-field-occurredAt"] input', format_date(row['Report Date']))

    # Fill Patient number
    page.fill('input[placeholder*="Patient number"]', str(row['Patient No.']))

    # Fill Address
    page.fill('input[placeholder*="Adress"]', row['Locality/Address/Residence'])

    # ... (continue for all fields)

def submit_form(page):
    page.click('button:has-text("Save and exit")')
    page.wait_for_selector('text=successfully', timeout=10000)
```

**Advantages:**
- Robust against minor UI changes
- Visual debugging possible
- Handles JavaScript-heavy UIs
- Can retry on failures
- Session management handled automatically

**Disadvantages:**
- Slower than direct API calls (but acceptable for your use case)
- Requires browser installation

---

### Option 2: Direct API Integration (Advanced)

**Why this could work:**
- ✅ Fastest execution
- ✅ No browser needed
- ✅ Scalable for thousands of records

**Challenges:**
- ❌ Need to capture exact API payload structure
- ❌ Must handle authentication tokens
- ❌ Complex dropdown value mapping (need dataElement IDs)
- ❌ Harder to debug when API changes

**How it works:**
1. Manually capture one successful form submission
2. Extract API endpoint and payload structure
3. Map Excel columns to DHIS2 dataElement IDs
4. Build Python script to POST directly to API

**Required information (you would need to capture):**
```json
// Example API call (need to capture actual structure)
POST https://events.chimgh.org/events/api/41/events
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  "program": "fFYTJRzD2qq",
  "orgUnit": "duCDqCRlWG1",
  "eventDate": "2025-09-30",
  "dataValues": [
    {"dataElement": "okahaacYKqO", "value": "VR-A01-AAG7566"}, // Patient number
    {"dataElement": "MSYrx2z1f8p", "value": "HOHOE"}, // Address
    // ... more fields
  ]
}
```

**To implement this, you would need to:**
1. Open browser DevTools → Network tab
2. Submit ONE test record manually
3. Find the POST request to `/api/41/events` (or similar)
4. Share the request payload with me
5. I'll create the mapping and script

**Estimated Development Time:** 3-4 days (including mapping)

---

### Option 3: Chrome Extension with React UI

**Why this might be useful:**
- ✅ Beautiful UI for data review before upload
- ✅ Works within existing browser session
- ✅ One-click upload experience

**How it works:**
1. Build React app as Chrome extension popup
2. User pastes Excel data or uploads file
3. Extension shows preview table
4. User clicks "Upload to DHIMS2"
5. Extension injects script into DHIMS2 page
6. Script fills and submits forms automatically

**Estimated Development Time:** 4-5 days

---

## Detailed Implementation Plan (Option 1 - Recommended)

### Phase 1: Setup & Data Mapping (Day 1)

**1.1 Create Project Structure**
```
dhims2-automation/
├── src/
│   ├── main.py               # Entry point
│   ├── excel_reader.py       # Read and parse Excel
│   ├── form_filler.py        # Playwright automation
│   ├── field_mapper.py       # Excel → DHIMS2 mapping
│   └── logger.py             # Logging and reporting
├── config/
│   ├── field_mapping.json    # Field mappings
│   └── credentials.json      # Login credentials (gitignored)
├── data/
│   └── input/                # Place Excel files here
├── logs/
│   └── upload_results.csv    # Success/failure log
├── requirements.txt
└── README.md
```

**1.2 Field Mapping Configuration**
Create `config/field_mapping.json`:
```json
{
  "fields": {
    "reportDate": {
      "excelColumn": "Date of Admission",
      "dhimsSelector": "[data-test='dataentry-field-occurredAt'] input",
      "type": "date",
      "format": "dd-mm-yyyy",
      "required": true
    },
    "patientNumber": {
      "excelColumn": "Patient No.",
      "dhimsSelector": "textbox for Patient number",
      "type": "text",
      "required": true
    },
    "address": {
      "excelColumn": "Locality/Address/Residence",
      "dhimsSelector": "textbox for Address",
      "type": "text",
      "required": true
    },
    "age": {
      "excelColumn": "Age",
      "dhimsSelector": "textbox for Age",
      "type": "text",
      "required": true,
      "transform": "extractNumber"
    },
    "patientAge": {
      "excelColumn": "Age",
      "dhimsSelector": "combobox for Patient Age",
      "type": "dropdown",
      "required": true,
      "transform": "ageToCategory",
      "mapping": {
        "0-4 years": ["Year(s)"],
        "5-17 years": ["Year(s)"],
        "18-59 years": ["Year(s)"],
        "60+ years": ["Year(s)"]
      }
    },
    "gender": {
      "excelColumn": "Gender",
      "dhimsSelector": "combobox for Gender",
      "type": "dropdown",
      "required": true,
      "mapping": {
        "Male": "Male",
        "Female": "Female"
      }
    },
    "occupation": {
      "excelColumn": "Occupation",
      "dhimsSelector": "combobox for Occupation",
      "type": "dropdown",
      "required": true,
      "fuzzyMatch": true
    },
    "education": {
      "excelColumn": "Educational Status",
      "dhimsSelector": "combobox for Education",
      "type": "dropdown",
      "required": true,
      "mapping": {
        "primary": "Primary",
        "jhs": "JHS",
        "shs": "SHS",
        "tertiary": "Tertiary",
        "basic": "Basic",
        "none": "None"
      }
    },
    "dateOfAdmission": {
      "excelColumn": "Date of Admission",
      "dhimsSelector": "textbox for Date of admission",
      "type": "date",
      "format": "dd-mm-yyyy",
      "required": true
    },
    "dateOfDischarge": {
      "excelColumn": "Date of Discharge",
      "dhimsSelector": "textbox for Date of discharge",
      "type": "date",
      "format": "dd-mm-yyyy",
      "required": true
    },
    "speciality": {
      "excelColumn": "Speciality",
      "dhimsSelector": "combobox for Speciality",
      "type": "dropdown",
      "required": true,
      "mapping": {
        "General": "General",
        "Accident Emergency": "Accident Emergency"
      }
    },
    "outcome": {
      "excelColumn": "Outcome of Discharge",
      "dhimsSelector": "combobox for Outcome",
      "type": "dropdown",
      "required": true,
      "mapping": {
        "Died": "Died",
        "Discharge": "Discharge",
        "Referred": "Referred",
        "Absconded": "Absconded",
        "Other": "Other"
      }
    },
    "principalDiagnosis": {
      "excelColumn": "Principal Diagnosis",
      "dhimsSelector": "combobox for Principal diagnosis",
      "type": "searchable-dropdown",
      "required": true,
      "searchBy": "icdCode"
    },
    "additionalDiagnosis": {
      "excelColumn": "Additional Diagnosis",
      "dhimsSelector": "combobox for Additional diagnosis",
      "type": "searchable-dropdown",
      "required": false,
      "searchBy": "icdCode"
    },
    "surgicalProcedure": {
      "excelColumn": "Surgical Procedure",
      "dhimsSelector": "radio for Surgical procedure",
      "type": "radio",
      "required": true,
      "mapping": {
        "Yes": "Yes",
        "No": "No"
      }
    },
    "cost": {
      "excelColumn": "Cost of Treatment",
      "dhimsSelector": "textbox for Cost",
      "type": "text",
      "required": false
    },
    "insured": {
      "excelColumn": "NHIS Status",
      "dhimsSelector": "radio for Insured",
      "type": "radio",
      "required": true,
      "mapping": {
        "Yes": "Yes",
        "No": "No"
      }
    }
  }
}
```

### Phase 2: Core Development (Day 2)

**2.1 Excel Reader Module**
```python
# src/excel_reader.py
import pandas as pd
import json

class ExcelReader:
    def __init__(self, file_path, mapping_config):
        self.file_path = file_path
        self.mapping_config = mapping_config

    def read_data(self):
        """Read Excel and return list of patient records"""
        df = pd.read_excel(self.file_path)

        # Clean and validate data
        df = self.clean_data(df)

        # Convert to list of dictionaries
        records = df.to_dict('records')

        return records

    def clean_data(self, df):
        """Clean and normalize Excel data"""
        # Handle empty cells
        df = df.fillna('')

        # Normalize column names (remove extra spaces)
        df.columns = df.columns.str.strip()

        # Convert dates to proper format
        date_columns = ['Date of Admission', 'Date of Discharge']
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')

        return df
```

**2.2 Form Filler Module**
```python
# src/form_filler.py
from playwright.sync_api import sync_playwright
import time
import json

class DHIMS2FormFiller:
    def __init__(self, config):
        self.config = config
        self.base_url = "https://events.chimgh.org/events/dhis-web-capture/"

    def login(self, page, username, password):
        """Login to DHIMS2"""
        page.goto(self.base_url)
        page.fill('input[name="username"]', username)
        page.fill('input[type="password"]', password)
        page.click('button[type="submit"]')
        page.wait_for_url('**/dhis-web-capture/**', timeout=10000)

    def fill_patient_record(self, page, record):
        """Fill one patient record"""
        # Navigate to new event page
        page.goto(f"{self.base_url}index.html#/new?orgUnitId=duCDqCRlWG1&programId=fFYTJRzD2qq")

        # Wait for form to load
        page.wait_for_selector('text=Patient number', timeout=10000)

        # Fill each field based on mapping
        for field_name, field_config in self.config['fields'].items():
            try:
                self.fill_field(page, field_name, field_config, record)
            except Exception as e:
                print(f"⚠️  Warning: Failed to fill {field_name}: {e}")
                if field_config.get('required'):
                    raise Exception(f"Required field {field_name} failed: {e}")

        # Submit form
        self.submit_form(page)

    def fill_field(self, page, field_name, config, record):
        """Fill a single field based on its type"""
        excel_column = config['excelColumn']
        value = record.get(excel_column, '')

        if not value and config.get('required'):
            raise Exception(f"Missing required value for {excel_column}")

        field_type = config['type']

        if field_type == 'text':
            self.fill_text_field(page, config['dhimsSelector'], value)
        elif field_type == 'date':
            self.fill_date_field(page, config['dhimsSelector'], value, config.get('format'))
        elif field_type == 'dropdown':
            self.fill_dropdown(page, config['dhimsSelector'], value, config.get('mapping', {}))
        elif field_type == 'searchable-dropdown':
            self.fill_searchable_dropdown(page, config['dhimsSelector'], value)
        elif field_type == 'radio':
            self.fill_radio(page, config['dhimsSelector'], value, config.get('mapping', {}))

    def fill_text_field(self, page, selector, value):
        """Fill text input"""
        page.fill(selector, str(value))

    def fill_date_field(self, page, selector, value, format_str):
        """Fill date picker"""
        if isinstance(value, pd.Timestamp):
            formatted_date = value.strftime('%d-%m-%Y')
        else:
            formatted_date = value
        page.fill(selector, formatted_date)

    def fill_dropdown(self, page, selector, value, mapping):
        """Fill dropdown/combobox"""
        mapped_value = mapping.get(value.lower(), value)
        page.click(selector)
        page.click(f'text={mapped_value}')

    def fill_searchable_dropdown(self, page, selector, value):
        """Fill searchable dropdown (for diagnosis with ICD codes)"""
        # Extract ICD code from value like "Diagnosis name(I50.31)"
        import re
        icd_match = re.search(r'\(([A-Z0-9.]+)\)', value)
        if icd_match:
            search_term = icd_match.group(1)
        else:
            search_term = value

        page.click(selector)
        page.fill(f'{selector} input', search_term)
        page.wait_for_timeout(500)  # Wait for search results
        page.click(f'text={search_term}', timeout=5000)

    def fill_radio(self, page, selector_base, value, mapping):
        """Fill radio button"""
        mapped_value = mapping.get(value, value)
        page.click(f'radio "{mapped_value}"')

    def submit_form(self, page):
        """Submit the form and verify success"""
        page.click('button:has-text("Save and exit")')

        # Wait for success indicator or error
        try:
            page.wait_for_selector('text=successfully', timeout=10000)
            return True
        except:
            # Check for errors
            error_msg = page.text_content('[role="alert"]')
            raise Exception(f"Submission failed: {error_msg}")
```

**2.3 Main Script**
```python
# src/main.py
import sys
from excel_reader import ExcelReader
from form_filler import DHIMS2FormFiller
from playwright.sync_api import sync_playwright
import json
import csv
from datetime import datetime

def main(excel_file, credentials_file, config_file):
    # Load configuration
    with open(config_file, 'r') as f:
        config = json.load(f)

    with open(credentials_file, 'r') as f:
        credentials = json.load(f)

    # Read Excel data
    print("📖 Reading Excel file...")
    reader = ExcelReader(excel_file, config)
    records = reader.read_data()
    print(f"✅ Found {len(records)} records to upload")

    # Initialize Playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Set True for headless
        page = browser.new_page()

        # Initialize form filler
        filler = DHIMS2FormFiller(config)

        # Login
        print("🔐 Logging in to DHIMS2...")
        filler.login(page, credentials['username'], credentials['password'])
        print("✅ Login successful")

        # Process each record
        results = []
        for index, record in enumerate(records, start=1):
            patient_name = record.get('Patient Name', 'Unknown')
            patient_no = record.get('Patient No.', 'Unknown')

            try:
                print(f"\n[{index}/{len(records)}] Uploading: {patient_name} ({patient_no})")
                filler.fill_patient_record(page, record)

                results.append({
                    'row': index,
                    'patient_name': patient_name,
                    'patient_no': patient_no,
                    'status': 'SUCCESS',
                    'error': ''
                })
                print(f"✅ Success")

            except Exception as e:
                print(f"❌ Failed: {e}")
                results.append({
                    'row': index,
                    'patient_name': patient_name,
                    'patient_no': patient_no,
                    'status': 'FAILED',
                    'error': str(e)
                })

        browser.close()

    # Generate report
    generate_report(results)

def generate_report(results):
    """Generate upload results CSV"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f'logs/upload_results_{timestamp}.csv'

    with open(report_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['row', 'patient_name', 'patient_no', 'status', 'error'])
        writer.writeheader()
        writer.writerows(results)

    # Summary
    success_count = sum(1 for r in results if r['status'] == 'SUCCESS')
    failed_count = len(results) - success_count

    print(f"\n{'='*50}")
    print(f"📊 UPLOAD SUMMARY")
    print(f"{'='*50}")
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"📄 Report saved: {report_file}")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <excel_file>")
        sys.exit(1)

    excel_file = sys.argv[1]
    credentials_file = 'config/credentials.json'
    config_file = 'config/field_mapping.json'

    main(excel_file, credentials_file, config_file)
```

### Phase 3: Testing & Refinement (Day 3)

**3.1 Test with Small Dataset**
- Use first 5 records from Excel
- Run in headed mode (headless=False)
- Verify each field fills correctly
- Check for errors

**3.2 Handle Edge Cases**
- Missing values in optional fields
- Date format variations
- Dropdown value mismatches
- ICD code extraction errors

**3.3 Add Retry Logic**
```python
def upload_with_retry(filler, page, record, max_retries=3):
    for attempt in range(max_retries):
        try:
            filler.fill_patient_record(page, record)
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Retry {attempt + 1}/{max_retries}...")
                time.sleep(2)
            else:
                raise e
```

---

## Excel Preparation Checklist

Before running the automation, ensure your Excel file has:

1. ✅ **Consistent column names** matching the mapping config
2. ✅ **Proper date format** (Excel dates or dd-mm-yyyy)
3. ✅ **Gender values** exactly: "Male" or "Female"
4. ✅ **Outcome values** exactly: "Died", "Discharge", "Referred", "Absconded", or "Other"
5. ✅ **Education values** normalized: "Primary", "JHS", "SHS", "Tertiary", "Basic", "None"
6. ✅ **NHIS Status**: "Yes" or "No"
7. ✅ **Surgical Procedure**: "Yes" or "No"
8. ✅ **ICD codes in parentheses** for diagnoses: e.g., "Heart failure(I50.31)"

**You can use this Excel formula to standardize values:**
```excel
=PROPER(TRIM(A2))  // Capitalizes first letter and removes extra spaces
```

---

## Deployment Steps

### Step 1: Install Dependencies
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Linux/Mac
# venv\Scripts\activate  # On Windows

# Install packages
pip install playwright pandas openpyxl
playwright install chromium
```

### Step 2: Setup Configuration
```bash
# Create credentials file
echo '{
  "username": "your_username",
  "password": "your_password"
}' > config/credentials.json

# Add to .gitignore
echo "config/credentials.json" >> .gitignore
```

### Step 3: Run Automation
```bash
python src/main.py "data/input/patient_records.xlsx"
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| DHIMS2 UI changes | High | Use flexible selectors, easy to update mapping config |
| Network timeout | Medium | Add retry logic with exponential backoff |
| Invalid data | Medium | Pre-validate Excel before upload |
| Session expiry | Low | Implement session refresh logic |
| Duplicate submissions | Medium | Check for existing records before upload |

---

## Future Enhancements

1. **Web Dashboard** - Build a simple web UI for non-technical users
2. **Duplicate Detection** - Query DHIMS2 to check if record already exists
3. **Partial Resume** - Save progress and resume from last successful upload
4. **Email Notifications** - Send summary report via email
5. **Multi-user Support** - Queue system for multiple users

---

## Cost & Time Estimates

| Approach | Dev Time | Maintenance | Reliability |
|----------|----------|-------------|-------------|
| **Playwright Automation** | 2-3 days | Low | High (95%) |
| **Direct API** | 3-4 days | Medium | Very High (99%) |
| **Chrome Extension** | 4-5 days | Medium | High (95%) |

---

## Next Steps

1. **Review this plan** and confirm approach (I recommend Option 1: Playwright)
2. **Share sample Excel file** (1-5 records) for field mapping validation
3. **Provide DHIMS2 test credentials** (if available) or I can guide you to run locally
4. **I'll build the automation** following this plan
5. **Test with small dataset** (5-10 records)
6. **Deploy for full dataset**

---

## Questions to Clarify

1. **Volume**: How many records do you typically need to upload? (weekly/monthly)
2. **Urgency**: Timeline for this automation?
3. **Technical level**: Will you run this yourself or need someone else to operate it?
4. **Dropdown values**: Are all dropdown values in Excel exactly matching DHIMS2? If not, I can build fuzzy matching.
5. **Testing**: Do you have a test/staging DHIMS2 environment, or should we test on production carefully?

---

**Status:** ✅ Ready for implementation pending your approval and clarifications.

**Recommendation:** Start with Option 1 (Playwright) for fastest, most reliable results.

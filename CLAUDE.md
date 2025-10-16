# CLAUDE.md - Project Context & Memory

**Last Updated:** 2025-10-16
**Project:** DHIMS2 Chrome Extension - Automated Data Upload
**Status:** Planning & Initial Development

---

## Project Overview

Building a Chrome Extension to automate batch uploading of In-Patient Morbidity and Mortality data from Excel files to DHIMS2 web system.

### Key Innovation
The extension uses **intelligent API discovery** - it learns the API structure by watching one manual form submission, then uses that knowledge to batch upload remaining records.

---

## What We're Building

### Phase 1: API Discovery (Smart Learning)
1. User submits ONE test record manually in DHIMS2
2. Extension intercepts and captures the API request
3. Extension analyzes the payload structure
4. Extension saves configuration automatically
5. User gets notification: "✅ API Route Discovered!"

### Phase 2: Batch Upload (Automated Processing)
1. User uploads Excel file or pastes data
2. Extension validates data against discovered API
3. User clicks "Upload"
4. Extension shows real-time progress with live updates
5. Generates success/failure report

---

## Technical Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool (fast, modern)
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hook Form** - Form handling
- **Zod** - Data validation

### Extension APIs
- **Chrome Web Request API** - Intercept network requests
- **Chrome Storage API** - Save configuration
- **Chrome Notifications API** - User alerts
- **Chrome Tabs API** - Communication with DHIMS2 page

### Data Processing
- **SheetJS (xlsx)** - Excel file parsing
- **PapaParse** - CSV parsing (optional)
- **date-fns** - Date formatting

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Chrome Extension                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Popup    │  │  Background  │  │  Content   │ │
│  │  (React)   │◄─┤   Service    │◄─┤   Script   │ │
│  │            │  │   Worker     │  │            │ │
│  └────────────┘  └──────────────┘  └────────────┘ │
│        ▲               ▲                  ▲         │
│        │               │                  │         │
└────────┼───────────────┼──────────────────┼─────────┘
         │               │                  │
         │               │                  │
    User Input    API Intercept      DHIMS2 Page
                   & Upload
```

---

## Data Flow

### Discovery Phase
```
User submits form manually
    ↓
DHIMS2 makes API call (POST /api/41/events)
    ↓
Background script intercepts request
    ↓
Extracts: URL, method, headers, payload structure
    ↓
Saves to chrome.storage.local
    ↓
Notifies user: "API Discovered!"
```

### Upload Phase
```
User uploads Excel file in popup
    ↓
Parse Excel → Array of records
    ↓
Validate each record against API structure
    ↓
For each record:
    ↓
    Format data to match API payload
    ↓
    Send POST request to discovered endpoint
    ↓
    Update progress UI
    ↓
    Log result (success/error)
    ↓
Generate final report
```

---

## File Structure

```
dhims2-chrome-extension/
├── plan/
│   ├── CLAUDE.md                    # This file - project context
│   ├── IMPLEMENTATION_PLAN.md       # Detailed step-by-step plan
│   ├── API_DISCOVERY_SPEC.md        # API discovery technical spec
│   └── UI_DESIGN.md                 # UI wireframes and design
│
├── docs/
│   ├── USER_GUIDE.md                # End-user documentation
│   ├── DEVELOPER_GUIDE.md           # Development setup
│   └── API_MAPPING.md               # Excel ↔ API field mapping
│
├── src/
│   ├── popup/                       # React UI for extension popup
│   │   ├── App.jsx                  # Main app component
│   │   ├── pages/
│   │   │   ├── Discovery.jsx        # API discovery page
│   │   │   ├── Upload.jsx           # Batch upload page
│   │   │   └── Settings.jsx         # Configuration page
│   │   ├── components/
│   │   │   ├── ProgressTracker.jsx  # Real-time progress
│   │   │   ├── FileUploader.jsx     # Excel file upload
│   │   │   ├── DataPreview.jsx      # Preview data before upload
│   │   │   └── ErrorList.jsx        # Show errors
│   │   └── index.jsx                # Entry point
│   │
│   ├── background/
│   │   ├── service-worker.js        # Main background script
│   │   ├── api-interceptor.js       # Intercepts API calls
│   │   ├── api-uploader.js          # Handles batch uploads
│   │   └── storage-manager.js       # Manages chrome.storage
│   │
│   ├── content/
│   │   └── inject.js                # Injected into DHIMS2 page
│   │
│   ├── utils/
│   │   ├── excel-parser.js          # Parse Excel files
│   │   ├── data-validator.js        # Validate data
│   │   ├── field-mapper.js          # Map Excel ↔ API fields
│   │   └── date-formatter.js        # Format dates
│   │
│   └── config/
│       ├── field-definitions.js     # Field type definitions
│       └── constants.js             # App constants
│
├── public/
│   ├── manifest.json                # Extension manifest
│   ├── icons/                       # Extension icons
│   └── popup.html                   # Popup HTML template
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## Key Components Explained

### 1. API Interceptor (`background/api-interceptor.js`)
**Purpose:** Captures DHIMS2 API calls during manual form submission

**How it works:**
- Listens to all network requests from DHIMS2 domain
- Filters for POST requests to `/api/` endpoints
- Extracts request payload, headers, and response
- Analyzes structure to create field mapping
- Saves configuration

**Key Code:**
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  captureAPIRequest,
  {
    urls: ["https://events.chimgh.org/events/api/*"],
    types: ["xmlhttprequest"]
  },
  ["requestBody"]
);
```

### 2. Batch Uploader (`background/api-uploader.js`)
**Purpose:** Sends multiple records to DHIMS2 API

**Features:**
- Queue management
- Retry logic (3 attempts per record)
- Rate limiting (2 requests/second to avoid overload)
- Progress tracking
- Error handling

### 3. React Popup (`popup/App.jsx`)
**Purpose:** User interface for all interactions

**Pages:**
- **Discovery**: Guide user through API discovery
- **Upload**: Batch upload interface with progress
- **Settings**: View/edit field mappings

---

## Data Structures

### API Configuration (Saved after discovery)
```javascript
{
  "discovered": true,
  "timestamp": "2025-10-16T14:30:00Z",
  "endpoint": {
    "url": "https://events.chimgh.org/events/api/41/events",
    "method": "POST"
  },
  "headers": {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  "payload_structure": {
    "program": "fFYTJRzD2qq",
    "orgUnit": "duCDqCRlWG1",
    "eventDate": "string (ISO date)",
    "dataValues": [
      {
        "dataElement": "string (ID)",
        "value": "string"
      }
    ]
  },
  "field_mappings": {
    "patientNumber": {
      "dataElement": "okahaacYKqO",
      "excelColumn": "Patient No.",
      "type": "text"
    },
    "address": {
      "dataElement": "MSYrx2z1f8p",
      "excelColumn": "Locality/Address/Residence",
      "type": "text"
    }
    // ... more fields
  }
}
```

### Upload Progress State
```javascript
{
  "status": "uploading", // idle | uploading | paused | completed
  "total": 50,
  "current": 23,
  "successful": 22,
  "failed": 1,
  "currentRecord": {
    "row": 23,
    "patientName": "John Doe",
    "patientNumber": "VR-A01-AAG1234"
  },
  "errors": [
    {
      "row": 15,
      "patientName": "Jane Smith",
      "error": "Invalid date format",
      "field": "dateOfAdmission"
    }
  ],
  "startTime": "2025-10-16T15:00:00Z",
  "estimatedCompletion": "2025-10-16T15:05:00Z"
}
```

---

## Excel Field Mapping

| Excel Column | DHIMS2 Field | Data Element ID | Type | Required |
|-------------|--------------|-----------------|------|----------|
| Patient No. | Patient number | okahaacYKqO | text | Yes |
| Locality/Address/Residence | Address | MSYrx2z1f8p | text | Yes |
| Age | Age | UboyGYmr19j | text | Yes |
| Age | Patient Age | Pd5bZxTS4ql | dropdown | Yes |
| Gender | Gender (morbidity/mortality) | cH9NADGoNwU | dropdown | Yes |
| Occupation | Occupation | Ovu3nxFVwRB | dropdown | Yes |
| Educational Status | Education | draFmNEP1ID | dropdown | Yes |
| Date of Admission | Date of admission | GMiHyYq3JlY | date | Yes |
| Date of Discharge | Date of discharge | ddohQFXWz6e | date | Yes |
| Speciality | Speciality | GGBSjMU7nt6 | dropdown | Yes |
| Outcome of Discharge | Outcome | YZeiZFyQWKs | dropdown | Yes |
| Principal Diagnosis | Principal diagnosis | RU1KXNWlT6S | searchable | Yes |
| Additional Diagnosis | Additional diagnosis | dzGpRK1w7sN | searchable | No |
| Surgical Procedure | Surgical procedure | YXJsdoaszh3 | radio | Yes |
| Cost of Treatment | Cost | Z7yQ9Rm1y4a | text | No |
| NHIS Status | Insured | GTYimatiqtP | radio | Yes |

*Note: Data Element IDs will be discovered automatically by the extension*

---

## Development Phases

### Phase 1: Setup & Foundation (Day 1)
- ✅ Create project structure
- ✅ Create plan documents (CLAUDE.md, etc.)
- Setup React + Vite
- Configure Tailwind CSS
- Create basic manifest.json

### Phase 2: API Discovery (Days 2-3)
- Build API interceptor
- Create discovery UI
- Test with manual submission
- Implement storage of configuration

### Phase 3: Data Processing (Day 3-4)
- Excel parser
- Data validator
- Field mapper
- Date formatter

### Phase 4: Batch Upload (Days 4-5)
- Uploader logic with queue
- Progress tracking
- Error handling
- Retry mechanism

### Phase 5: UI Polish (Day 5-6)
- Progress animations
- Error display
- Settings page
- Export reports

### Phase 6: Testing & Refinement (Day 6-7)
- Test with real data
- Fix edge cases
- Performance optimization
- User documentation

---

## Current Status

### Completed
- ✅ DHIMS2 analysis using Playwright
- ✅ Initial planning
- ✅ Project structure created
- ✅ CLAUDE.md context document

### In Progress
- 🔄 Writing detailed implementation plan
- 🔄 Designing UI wireframes

### Next Steps
1. Create IMPLEMENTATION_PLAN.md with step-by-step guide
2. Create API_DISCOVERY_SPEC.md with technical details
3. Create UI_DESIGN.md with component specs
4. Begin development (setup React + Vite)

---

## Important Notes for Future Claude Sessions

### Context to Remember
1. **User wants Chrome Extension approach** (not Playwright)
2. **Key feature: Automatic API discovery** - extension learns by watching
3. **User confirmed no LLM needed** - standalone extension
4. **Real-time progress tracking** is essential
5. **User-friendly UI** is priority

### Technical Decisions Made
- ✅ React 18 for UI
- ✅ Vite for build (not CRA or Webpack)
- ✅ Manifest V3 (not V2)
- ✅ Chrome Web Request API for interception
- ✅ SheetJS for Excel parsing

### Files to Reference
- `plan/DHIMS2_AUTOMATION_PLAN.md` - Original analysis
- `plan/ACTIVITIES.md` - Activity log
- This file (`plan/CLAUDE.md`) - Project context

### Commands to Run (Later)
```bash
cd dhims2-chrome-extension
npm install
npm run dev         # Development mode
npm run build       # Production build
npm run test        # Run tests
```

---

## Questions & Decisions Log

**Q:** Will Playwright need LLM?
**A:** No - it's just traditional automation script

**Q:** Can extension discover API automatically?
**A:** Yes - that's the key innovation! User's idea.

**Q:** Which approach to use?
**A:** Chrome Extension with API Discovery (user's preference)

---

## References

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Request API](https://developer.chrome.com/docs/extensions/reference/webRequest/)
- [DHIS2 API Documentation](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/introduction.html)
- [SheetJS Documentation](https://docs.sheetjs.com/)

---

**For Next Session:** Start with reading this file, then proceed to IMPLEMENTATION_PLAN.md for step-by-step development guide.

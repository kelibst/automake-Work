# CLAUDE.md - Project Context & Memory

**Last Updated:** 2025-10-23
**Project:** Health Data Automation - DHIMS2 & LHIMS Chrome Extension
**Status:** Development In Progress - Expanding to Multi-System Support
**Workspace:** automake-Work (Multi-Project Repository)

---

## IMPORTANT: Workspace Structure

This is a **multi-project workspace**. The repository root is `automake-Work/` and contains multiple automation projects:

```
automake-Work/                    # ROOT FOLDER (workspace)
├── CLAUDE.md                     # This file - workspace context
├── .git/                         # Git repository root
├── .gitignore                    # Global gitignore
│
├── dhims2-chrome-extension/      # ⭐ CURRENT PROJECT (active development)
│   ├── src/                      # Source code
│   ├── public/                   # Extension assets
│   ├── package.json              # npm dependencies
│   ├── deno.json                 # Deno configuration
│   ├── deno.lock                 # Deno lock file
│   ├── vite.config.js            # Build configuration
│   └── ... (other project files)
│
└── [future-projects]/            # Future automation projects will go here
```

### Key Points for Future Sessions:
1. **Working Directory**: Always navigate to `dhims2-chrome-extension/` for current work
2. **Multiple Projects**: This workspace may contain other automation projects in the future
3. **Root CLAUDE.md**: This file documents the entire workspace and all projects
4. **Project-Specific Docs**: Each project has its own documentation in its folder

---

## Project Overview

Building a Chrome Extension to automate batch uploading of In-Patient Morbidity and Mortality data from Excel files to **two health information systems**:
1. **DHIMS2** - National/Regional health data system (https://events.chimgh.org)
2. **LHIMS** - Local Health Information Management System (http://10.10.0.59/lhims_182/)

### Key Innovation
The extension uses **intelligent API discovery** - it learns the API structure by watching one manual form submission, then uses that knowledge to batch upload remaining records. This same mechanism works for both DHIMS2 and LHIMS systems.

### Multi-System Architecture
The extension supports **multiple health information systems** simultaneously:
- Users can configure and switch between DHIMS2 and LHIMS
- Each system maintains its own API configuration and field mappings
- Unified UI with system selector dropdown
- Independent API discovery for each system

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
- **Chrome Storage API** - Save configuration (separate configs for DHIMS2 and LHIMS)
- **Chrome Notifications API** - User alerts
- **Chrome Tabs API** - Communication with DHIMS2/LHIMS pages

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

## LHIMS Integration

### System Information
- **URL**: http://10.10.0.59/lhims_182/
- **Type**: Local Health Information Management System
- **Access**: Local network only (requires VPN/network connection)
- **Login Credentials**:
  - Username: `sno-411`
  - Password: `monamourd11`

### LHIMS-Specific Features
- Same intelligent API discovery mechanism as DHIMS2
- Separate configuration storage (chrome.storage.local with "lhims_" prefix)
- System selector in UI to switch between DHIMS2 and LHIMS
- Field mappings discovered independently for LHIMS

### Multi-System Data Structure
```javascript
// Storage structure for multi-system support
{
  "activeSystem": "dhims2", // or "lhims"
  "systems": {
    "dhims2": {
      "discovered": true,
      "timestamp": "2025-10-23T10:00:00Z",
      "endpoint": { /* DHIMS2 config */ },
      "field_mappings": { /* DHIMS2 mappings */ }
    },
    "lhims": {
      "discovered": true,
      "timestamp": "2025-10-23T11:00:00Z",
      "endpoint": { /* LHIMS config */ },
      "field_mappings": { /* LHIMS mappings */ }
    }
  }
}
```

### LHIMS Discovery Plan
1. User connects to local network (http://10.10.0.59)
2. Extension detects LHIMS domain in active tab
3. User switches to "LHIMS" mode in extension popup
4. User submits one test record manually in LHIMS
5. Extension intercepts and analyzes LHIMS API structure
6. Configuration saved separately from DHIMS2
7. User can now batch upload to LHIMS

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
- ✅ **Deno instead of npm** (2025-10-23) - Better security, built-in TypeScript

### Package Manager: Deno (Migration Complete)
**Why Deno?**
- Built-in TypeScript support
- Enhanced security with explicit permissions
- Modern JavaScript runtime
- Excellent npm compatibility via `npm:` specifier

**Configuration:**
- `deno.json` - Main configuration file
- `deno.lock` - Dependency lock file
- `nodeModulesDir: "auto"` - Keeps npm packages compatible
- All npm dependencies work via Deno's npm compatibility layer

### Files to Reference
- `CLAUDE.md` (root) - Workspace context & project overview
- `plan/DHIMS2_AUTOMATION_PLAN.md` - Original analysis
- `plan/ACTIVITIES.md` - Activity log
- `dhims2-chrome-extension/deno.json` - Deno configuration
- `dhims2-chrome-extension/package.json` - Dependencies list

### Commands to Run
```bash
# Navigate to project folder first
cd dhims2-chrome-extension

# Deno commands (CURRENT)
deno install        # Install dependencies
deno task dev       # Development mode
deno task build     # Production build
deno task preview   # Preview production build

# Legacy npm commands (still work but not recommended)
npm install
npm run dev
npm run build
```

---

## Questions & Decisions Log

**Q:** Will Playwright need LLM?
**A:** No - it's just traditional automation script

**Q:** Can extension discover API automatically?
**A:** Yes - that's the key innovation! User's idea.

**Q:** Which approach to use?
**A:** Chrome Extension with API Discovery (user's preference)

**Q:** Should we use Deno or npm? (2025-10-23)
**A:** Deno - User prefers Deno for better security and modern features. Migration completed successfully.

---

## References

- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Request API](https://developer.chrome.com/docs/extensions/reference/webRequest/)
- [DHIS2 API Documentation](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/introduction.html)
- [SheetJS Documentation](https://docs.sheetjs.com/)
- [Deno Documentation](https://docs.deno.com/)
- [Deno npm Compatibility](https://docs.deno.com/runtime/manual/node/npm_specifiers/)

---

## Session History

### 2025-10-23 (Evening): LHIMS Integration Expansion
- **MAJOR SCOPE UPDATE**: Extended project to support LHIMS (Local Health Information Management System)
- Updated CLAUDE.md to reflect multi-system architecture
- Added LHIMS system information and credentials
- Documented multi-system data storage structure
- Prepared for LHIMS API discovery implementation
- Next: Create LHIMS-specific configuration files and update extension architecture

### 2025-10-23: Deno Migration
- Created `deno.json` configuration file
- Updated CLAUDE.md with workspace structure
- Documented multi-project repository setup
- Completed Deno migration from npm
- Added Deno commands and configuration details

### 2025-10-16: Initial Setup
- Created project structure
- Wrote initial CLAUDE.md
- Set up planning documents
- Configured npm dependencies

---

**For Next Session:**
1. **READ THIS FILE FIRST** - Understand workspace structure
2. Navigate to `dhims2-chrome-extension/` folder for work
3. Use `deno task dev` to start development server
4. Reference project-specific docs in `dhims2-chrome-extension/plan/`

---

## Remember
1. update ACTIVITIES.md with a small summary of each session.

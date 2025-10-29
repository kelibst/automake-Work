# Bulk Upload Implementation Guide

**Date:** 2025-10-29
**Goal:** Add fuzzy matching and batch upload to DHIS2 Chrome Extension
**Status:** Ready to implement

---

## Implementation Decisions

✅ **Bundle diagnosis codes** in extension
✅ **Keep 70% confidence** threshold
✅ **DHIMS2 only** for now
✅ **Export failed records as CSV**

---

## Phase 1: Port Core Libraries

### Step 1.1: Copy option-codes.json

```bash
# From repository root
cp option-codes.json dhims2-chrome-extension/public/option-codes.json
```

This bundles the diagnosis codes (~200KB) with the extension for offline use.

### Step 1.2: Create data-cleaner.js for Browser

**File:** `dhims2-chrome-extension/src/utils/data-cleaner.js`

**Key Changes from Node.js version:**
- Remove `module.exports`, use ES6 `export default`
- Remove Node.js `require()`, use ES6 `import`
- Lazy load option codes from bundled JSON
- Keep all fuzzy matching logic intact

**Features to include:**
- `cleanRow()` - Clean single record
- `matchSingleDiagnosisCode()` - Match with fuzzy logic
- `findClosestDiagnosisCodes()` - Similarity algorithm
- `cleanAll()` - Process multiple records
- Track suggestions array for auto-fixes

---

## Phase 2: Update Validation

### Step 2.1: Enhance data-validator.js

**File:** `dhims2-chrome-extension/src/utils/data-validator.js`

**Changes needed:**
- Import data-cleaner
- Support suggestion severity level
- Track auto-fixed codes
- Generate report with suggestions section

### Step 2.2: Add Auto-Fix Preview to Upload.jsx

**File:** `dhims2-chrome-extension/src/sidepanel/pages/Upload.jsx`

**Add to preview step:**
```jsx
{validationResults.suggestions && validationResults.suggestions.length > 0 && (
  <div className="auto-fixes-section">
    <h3>Auto-Fixed Diagnosis Codes</h3>
    {validationResults.suggestions.map(sug => (
      <div key={`${sug.rowNumber}-${sug.field}`}>
        Row {sug.rowNumber}: {sug.original} → {sug.suggested}
        ({Math.round(sug.confidence * 100)}% match)
      </div>
    ))}
  </div>
)}
```

---

## Phase 3: Build Upload Engine

### Step 3.1: Create api-uploader.js

**File:** `dhims2-chrome-extension/src/background/api-uploader.js`

**Core Functions:**

```javascript
class BatchUploader {
  constructor(apiConfig) {
    this.apiConfig = apiConfig;
    this.queue = [];
    this.currentIndex = 0;
    this.results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };
    this.isPaused = false;
    this.isCancelled = false;
  }

  async start(records) {
    this.queue = records;
    this.results.total = records.length;

    for (let i = 0; i < records.length; i++) {
      if (this.isCancelled) break;

      while (this.isPaused) {
        await sleep(100);
      }

      await this.uploadRecord(records[i], i);
      await this.rateLimit(); // 2 req/sec
    }
  }

  async uploadRecord(record, index) {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(this.apiConfig.url, {
          method: 'POST',
          headers: this.apiConfig.headers,
          body: JSON.stringify(this.buildPayload(record))
        });

        if (response.ok) {
          this.results.success++;
          this.sendProgress();
          return;
        }
      } catch (error) {
        if (attempt === maxRetries) {
          this.results.failed++;
          this.results.errors.push({ index, record, error });
          this.sendProgress();
        } else {
          await sleep(1000 * attempt); // Exponential backoff
        }
      }
    }
  }

  buildPayload(record) {
    // Transform record using field mappings
    // Return DHIS2 event payload
  }

  sendProgress() {
    chrome.runtime.sendMessage({
      type: 'UPLOAD_PROGRESS',
      data: this.results
    });
  }
}

export default BatchUploader;
```

### Step 3.2: Add Message Handlers

**File:** `dhims2-chrome-extension/src/background/service-worker.js`

**Add handlers:**

```javascript
import BatchUploader from './api-uploader.js';

let currentUploader = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_BATCH_UPLOAD':
      currentUploader = new BatchUploader(message.apiConfig);
      currentUploader.start(message.records)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error }));
      return true; // Async

    case 'PAUSE_UPLOAD':
      if (currentUploader) currentUploader.pause();
      sendResponse({ success: true });
      break;

    case 'RESUME_UPLOAD':
      if (currentUploader) currentUploader.resume();
      sendResponse({ success: true });
      break;

    case 'CANCEL_UPLOAD':
      if (currentUploader) currentUploader.cancel();
      sendResponse({ success: true });
      break;
  }
});
```

---

## Phase 4: Build Upload UI

### Step 4.1: Create ProgressTracker Component

**File:** `dhims2-chrome-extension/src/sidepanel/components/ProgressTracker.jsx`

```jsx
import React from 'react';

export default function ProgressTracker({
  total,
  success,
  failed,
  isPaused,
  onPause,
  onResume,
  onCancel
}) {
  const progress = ((success + failed) / total) * 100;
  const pending = total - success - failed;

  return (
    <div className="progress-tracker">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="stats">
        <div className="stat">
          <span className="label">Total:</span>
          <span className="value">{total}</span>
        </div>
        <div className="stat success">
          <span className="label">Success:</span>
          <span className="value">{success}</span>
        </div>
        <div className="stat failed">
          <span className="label">Failed:</span>
          <span className="value">{failed}</span>
        </div>
        <div className="stat pending">
          <span className="label">Pending:</span>
          <span className="value">{pending}</span>
        </div>
      </div>

      <div className="controls">
        {!isPaused ? (
          <button onClick={onPause}>Pause</button>
        ) : (
          <button onClick={onResume}>Resume</button>
        )}
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
```

### Step 4.2: Update Upload.jsx

**File:** `dhims2-chrome-extension/src/sidepanel/pages/Upload.jsx`

**Add state:**

```javascript
const [uploadState, setUploadState] = useState('idle'); // idle|uploading|completed
const [uploadProgress, setUploadProgress] = useState({
  total: 0,
  success: 0,
  failed: 0,
  errors: []
});
```

**Add handlers:**

```javascript
const handleStartUpload = async () => {
  setUploadState('uploading');

  // Get API config
  const config = await chrome.storage.local.get('dhims2_config');

  // Send to background script
  chrome.runtime.sendMessage({
    type: 'START_BATCH_UPLOAD',
    apiConfig: config.dhims2_config,
    records: validatedRecords
  });
};

// Listen for progress updates
useEffect(() => {
  const listener = (message) => {
    if (message.type === 'UPLOAD_PROGRESS') {
      setUploadProgress(message.data);
    }
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}, []);
```

**Replace "Coming Soon" screen:**

```jsx
{step === 'ready' && uploadState === 'idle' && (
  <div>
    <h3>Ready to Upload</h3>
    <p>{validatedRecords.length} records ready</p>
    <button onClick={handleStartUpload}>
      Start Upload
    </button>
  </div>
)}

{uploadState === 'uploading' && (
  <ProgressTracker
    {...uploadProgress}
    onPause={() => chrome.runtime.sendMessage({ type: 'PAUSE_UPLOAD' })}
    onResume={() => chrome.runtime.sendMessage({ type: 'RESUME_UPLOAD' })}
    onCancel={() => chrome.runtime.sendMessage({ type: 'CANCEL_UPLOAD' })}
  />
)}

{uploadState === 'completed' && (
  <CompletionScreen
    results={uploadProgress}
    autoFixes={validationResults.suggestions}
  />
)}
```

---

## Phase 5: Testing

### Test Cases

1. **Happy Path**
   - Upload 31-record Excel file
   - Verify 15+ records upload successfully
   - Check auto-fixed codes in report

2. **Fuzzy Matching**
   - Verify "I64.00" → "I64 - Stroke"
   - Verify "N18.4" → "N18.9 - Renal failure"
   - Check 70% confidence threshold works

3. **Error Handling**
   - Disconnect network mid-upload
   - Verify retry logic (3 attempts)
   - Check failed records are logged

4. **Pause/Resume**
   - Pause during upload
   - Verify no requests sent while paused
   - Resume and verify continues from same point

5. **Failed Records Export**
   - Export failed records as CSV
   - Verify CSV has correct format
   - Reimport and retry

---

## File Structure After Implementation

```
dhims2-chrome-extension/
├── public/
│   ├── option-codes.json         ← NEW (copied from root)
│   └── manifest.json
│
├── src/
│   ├── background/
│   │   ├── service-worker.js     ← MODIFIED (add upload handlers)
│   │   ├── api-interceptor.js
│   │   └── api-uploader.js       ← NEW (batch upload engine)
│   │
│   ├── sidepanel/
│   │   ├── pages/
│   │   │   └── Upload.jsx        ← MODIFIED (add upload logic)
│   │   ├── components/
│   │   │   ├── ProgressTracker.jsx    ← NEW
│   │   │   └── CompletionScreen.jsx   ← NEW
│   │   └── ...
│   │
│   └── utils/
│       ├── data-cleaner.js       ← NEW (ported from lib/)
│       ├── data-validator.js     ← MODIFIED (add fuzzy support)
│       └── ...
│
└── docs/
    └── BULK_UPLOAD_IMPLEMENTATION.md  ← This file
```

---

## Build & Test Commands

```bash
# Navigate to extension folder
cd dhims2-chrome-extension

# Install dependencies (if needed)
deno install

# Build extension
deno task build

# Load in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select dhims2-chrome-extension/dist/ folder

# Test upload
1. Click extension icon
2. Open side panel
3. Discover API (if not already)
4. Go to Upload tab
5. Upload JuneEmergency.xlsx
6. Review auto-fixes
7. Click "Start Upload"
8. Monitor progress
9. Check completion report
```

---

## Expected Results

### Success Metrics
- ✅ **15+ records upload** from 31-record test file (48% baseline)
- ✅ **23 codes auto-fixed** with fuzzy matching
- ✅ **Real-time progress** displayed during upload
- ✅ **Failed records** exported as CSV
- ✅ **Retry logic** handles network failures
- ✅ **Upload completes** in < 1 minute for 31 records

### Known Limitations
- ⚠️ DHIMS2 only (LHIMS support TBD)
- ⚠️ No batch size configuration (uploads sequentially)
- ⚠️ Rate limit fixed at 2 req/sec (not configurable yet)

---

## Next Steps After Basic Implementation

### Future Enhancements
1. **LHIMS Support** - Add LHIMS upload capability
2. **Configurable Settings** - Confidence threshold, rate limit, batch size
3. **Upload Queue** - Save failed records for later retry
4. **Analytics** - Track success rates, common errors
5. **Offline Mode** - Queue uploads when offline, process when online

---

## Getting Started

**Recommended order:**
1. Copy option-codes.json
2. Create data-cleaner.js (most important)
3. Create api-uploader.js (core engine)
4. Update service-worker.js (message handlers)
5. Create ProgressTracker.jsx (UI)
6. Update Upload.jsx (integrate everything)
7. Test with real data

**Estimated time:** 9-14 hours (~2 days)

---

**Document Version:** 1.0
**Status:** Ready to implement
**Priority:** High - Core feature for extension

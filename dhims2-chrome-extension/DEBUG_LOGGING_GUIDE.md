# Enhanced Debug Logging Guide

## Overview

This guide explains how to use the enhanced logging system to track and compare API requests between manual submissions and bulk uploads. This will help identify why bulk uploads succeed but don't reflect in the system.

---

## Quick Start

### Step 1: Enable Debug Mode

1. Open the DHIMS2 Chrome Extension
2. Navigate to the **Discovery** tab
3. Toggle **Debug Mode** ON
4. You should see: "🐛 Debug mode enabled - Will capture API payloads"

### Step 2: Submit Manual Records

1. Go to your DHIMS2 web application
2. Submit **2-3 test records** using the "Save and Add Another" feature
3. Each submission will be captured automatically
4. Check the console - you should see detailed logs for each submission

### Step 3: Run Bulk Upload

1. Go back to the extension
2. Navigate to the **Upload** tab
3. Upload your Excel file with records
4. Click "Start Upload"
5. Watch the detailed console logs as each record is uploaded

### Step 4: Compare Payloads

1. Open Chrome DevTools Console (F12)
2. Navigate to the service worker console:
   - Go to: `chrome://extensions/`
   - Find "DHIMS2 Chrome Extension"
   - Click "service worker" link
3. In the console, run:
   ```javascript
   debugLogger.generateComparisonReport()
   ```
4. Review the comprehensive comparison report

---

## What Gets Logged

### For Manual Submissions (Debug Mode)

When you submit a record manually in DHIMS2:

```
📤 MANUAL REQUEST - [timestamp]
  🔗 Endpoint: https://events.chimgh.org/api/41/tracker
  🔧 Method: POST
  📋 Headers: { Content-Type, Authorization, ... }
  📦 Payload: { events: [...] }
  📊 Payload Stats:
    - size: 2456 bytes
    - hasEventsArray: true
    - isWrapped: true
    - dataValuesCount: 18

✅ MANUAL RESPONSE - 200 OK
  🔗 URL: https://events.chimgh.org/api/41/tracker
  📊 Status: 200 OK
  📥 Response Body: { ... }
  📋 Response Analysis:
    - eventId: xyz123
    - jobId: abc456
    - status: SUCCESS
```

### For Bulk Uploads

When the extension uploads a record:

```
═══════════════════════════════════════════════════════════
🎯 BULK UPLOAD SESSION STARTED
═══════════════════════════════════════════════════════════
📊 Total Records: 25
🔗 Endpoint: https://events.chimgh.org/api/41/tracker
📋 API Config:
  program: fFYTJRzD2qq
  orgUnit: duCDqCRlWG1
  programStage: BPQAsjvLRwI
═══════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│ 🔨 BUILDING PAYLOAD FOR RECORD                          │
└─────────────────────────────────────────────────────────┘
📋 Record Fields: [patientNumber, age, gender, ...]
📋 Available Field Mappings: [patientNumber, age, gender, ...]
📊 Sample Record Data: { ... }

📊 Field Mapping Results:
  Total dataValues created: 18
  Expected fields from config: 18

[Table showing all mapped fields]

🏗️  Event Structure:
  program: fFYTJRzD2qq
  orgUnit: duCDqCRlWG1
  programStage: BPQAsjvLRwI
  eventDate: 2024-01-15
  status: COMPLETED
  dataValues count: 18

📦 Payload Wrapping:
  Endpoint: https://events.chimgh.org/api/41/tracker
  Is Tracker Endpoint: true
  Will wrap in events[]: true

✅ Final Payload Structure:
  Keys: [events]
  Payload Size: 2456 bytes
  Full Payload: { events: [...] }
└─────────────────────────────────────────────────────────┘

📤 BULK REQUEST - [timestamp]
  [Same detailed logging as manual]

✅ BULK RESPONSE - 200 OK
  [Same detailed logging as manual]
```

---

## Comparison Report

The `debugLogger.generateComparisonReport()` command generates a comprehensive side-by-side comparison:

```
═══════════════════════════════════════════════════════════
📊 COMPREHENSIVE COMPARISON REPORT
═══════════════════════════════════════════════════════════

🔗 Endpoint Comparison:
  Manual: https://events.chimgh.org/api/41/tracker
  Bulk:   https://events.chimgh.org/api/41/tracker
  Match: ✅ YES

🔧 Method Comparison:
  Manual: POST
  Bulk:   POST
  Match: ✅ YES

📋 Headers Comparison:
┌──────────────────┬─────────────────┬─────────────────┬───────┐
│ Header           │ Manual          │ Bulk            │ Match │
├──────────────────┼─────────────────┼─────────────────┼───────┤
│ Content-Type     │ application/json│ application/json│ ✅    │
│ Authorization    │ [REDACTED]      │ [REDACTED]      │ ✅    │
└──────────────────┴─────────────────┴─────────────────┴───────┘

🔍 PAYLOAD COMPARISON - Manual vs Bulk

📋 Structure Comparison:
┌────────────────────┬─────────────┬─────────┬───────┐
│ Field              │ Manual      │ Bulk    │ Match │
├────────────────────┼─────────────┼─────────┼───────┤
│ Wrapped in events[]│ true        │ true    │ ✅    │
│ Program            │ fFYTJRzD2qq │ fFYTJRzD2qq │ ✅    │
│ OrgUnit            │ duCDqCRlWG1 │ duCDqCRlWG1 │ ✅    │
│ ProgramStage       │ BPQAsjvLRwI │ BPQAsjvLRwI │ ✅    │
│ Status             │ COMPLETED   │ COMPLETED │ ✅    │
│ DataValues Count   │ 18          │ 18      │ ✅    │
└────────────────────┴─────────────┴─────────┴───────┘

📊 DataValues Comparison:
┌──────────────┬──────────────┬──────────────┬───────┐
│ DataElement  │ Manual Value │ Bulk Value   │ Match │
├──────────────┼──────────────┼──────────────┼───────┤
│ okahaacYKqO  │ VR-123       │ VR-123       │ ✅    │
│ MSYrx2z1f8p  │ Accra        │ Accra        │ ✅    │
│ UboyGYmr19j  │ 45           │ 45           │ ✅    │
│ ...          │ ...          │ ...          │ ...   │
└──────────────┴──────────────┴──────────────┴───────┘

📈 Summary: 18 matches, 0 mismatches

🔍 Field Differences:
✅ Both payloads have the same fields

═══════════════════════════════════════════════════════════
```

---

## Common Issues to Look For

### 1. Endpoint Mismatch
**Symptom:** Endpoints are different
**Example:**
```
Manual: https://events.chimgh.org/api/41/tracker
Bulk:   https://events.chimgh.org/api/41/events
Match: ❌ NO
```
**Fix:** Check endpoint configuration in API config

### 2. Missing Headers
**Symptom:** Bulk request missing authentication headers
**Example:**
```
┌──────────────────┬─────────────────┬─────────────────┬───────┐
│ Authorization    │ Bearer xyz123   │ [MISSING]       │ ❌    │
└──────────────────┴─────────────────┴─────────────────┴───────┘
```
**Fix:** Check if headers are being copied correctly from discovered config

### 3. Payload Structure Differences
**Symptom:** Manual uses wrapped format, bulk doesn't (or vice versa)
**Example:**
```
┌────────────────────┬─────────┬─────────┬───────┐
│ Wrapped in events[]│ true    │ false   │ ❌    │
└────────────────────┴─────────┴─────────┴───────┘
```
**Fix:** Check endpoint detection logic in `buildPayload()`

### 4. Missing DataValues
**Symptom:** Bulk upload has fewer dataValues
**Example:**
```
┌──────────────┬──────────────┬──────────────┬───────┐
│ RU1KXNWlT6S  │ A01.0        │ [MISSING]    │ ❌    │
└──────────────┴──────────────┴──────────────┴───────┘
```
**Fix:** Check field mapping in Upload.jsx or field-mapper.js

### 5. Data Type Mismatches
**Symptom:** Same field, different value format
**Example:**
```
┌──────────────┬──────────────┬──────────────┬───────┐
│ GMiHyYq3JlY  │ 2024-01-15   │ 15-01-2024   │ ❌    │
└──────────────┴──────────────┴──────────────┴───────┘
```
**Fix:** Check date formatting in data-cleaner.js or field-mapper.js

---

## Advanced Debugging

### Export Logs for Analysis

```javascript
// Export all logs as JSON
const logs = debugLogger.exportLogs();

// Copy the output and save to a file for later analysis
```

### Clear Logs

```javascript
// Clear all captured logs to start fresh
debugLogger.clearLogs();
```

### View All Logs

```javascript
// Get all logs programmatically
const allLogs = debugLogger.getAllLogs();
console.log('Manual submissions:', allLogs.manual);
console.log('Bulk uploads:', allLogs.bulk);
```

### Manual Payload Comparison

```javascript
// Compare two specific payloads
const manualPayload = { /* ... */ };
const bulkPayload = { /* ... */ };
debugLogger.comparePayloads(manualPayload, bulkPayload);
```

---

## Troubleshooting

### Console Not Showing Logs

1. Make sure you're in the **Service Worker** console, not the extension popup console
2. Go to `chrome://extensions/`
3. Find "DHIMS2 Chrome Extension"
4. Click the blue "service worker" link

### Debug Mode Not Capturing

1. Ensure debug mode is enabled in the Discovery tab
2. Check that you're on the correct DHIMS2 domain
3. Refresh the DHIMS2 page after enabling debug mode
4. Check console for "🐛 Debug mode enabled" message

### No Comparison Data

1. Make sure you've submitted at least one manual record with debug mode ON
2. Make sure you've run at least one bulk upload
3. Check that logs aren't cleared: `debugLogger.getAllLogs()`

---

## Tips for Effective Debugging

1. **Start Fresh**: Clear logs before starting a new debugging session
   ```javascript
   debugLogger.clearLogs();
   ```

2. **Test with Simple Data**: Start with 1-2 records to minimize noise

3. **Compare First Record**: The most detailed comparison happens on the first record

4. **Take Screenshots**: Capture comparison tables for documentation

5. **Note Timestamps**: Pay attention to when manual vs bulk requests happen

6. **Check Response Bodies**: Look for error messages in DHIS2 responses even if status is 200

---

## Example Workflow

```bash
# 1. Clear previous logs
debugLogger.clearLogs()

# 2. Enable debug mode in extension UI

# 3. Submit 2 manual records in DHIMS2
#    (Watch console for capture confirmations)

# 4. Start bulk upload in extension
#    (Watch console for detailed logs)

# 5. Generate comparison
debugLogger.generateComparisonReport()

# 6. Analyze differences
#    - Check endpoint URLs
#    - Check headers
#    - Check payload structure
#    - Check dataValues

# 7. Fix identified issues

# 8. Clear logs and test again
debugLogger.clearLogs()
```

---

## Need Help?

If you find discrepancies but aren't sure how to fix them:

1. Run `debugLogger.exportLogs()`
2. Copy the JSON output
3. Share it with your team for analysis
4. Look for patterns in the comparison report

The comparison report will highlight exactly what's different between manual and bulk submissions, making it easy to identify and fix the issue.

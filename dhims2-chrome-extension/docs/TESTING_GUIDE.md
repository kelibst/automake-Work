# Batch Upload Testing Guide

**Quick guide to test the new batch upload feature**

---

## Prerequisites

1. **Build the Extension:**
   ```bash
   cd dhims2-chrome-extension
   deno task build
   ```

2. **Load in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `dhims2-chrome-extension/dist` folder

3. **Verify Installation:**
   - Extension icon should appear
   - Click to open side panel
   - All tabs should be visible

---

## Test 1: API Discovery (Required First)

1. Navigate to DHIS2: https://events.chimgh.org
2. Login with your credentials
3. Open extension side panel
4. Go to **Discovery** tab
5. Click "Start Discovery"
6. Submit ONE test record manually in DHIS2
7. Wait for "API Route Discovered!" notification
8. Verify configuration saved

**Expected Result:** ✅ API config discovered and saved

---

## Test 2: Upload Excel File

1. Go to **Upload** tab
2. Click "Upload Excel File"
3. Select your Excel file (e.g., test-records.xlsx)
4. If multiple sheets, select the correct one
5. Click "Continue"

**Expected Result:** ✅ File parsed successfully

---

## Test 3: Field Mapping

1. Review auto-detected field mappings
2. Adjust any incorrect mappings
3. Ensure all required fields are mapped:
   - Patient Number
   - Age
   - Gender
   - Date of Admission
   - Date of Discharge
   - Principal Diagnosis
   - etc.
4. Click "Preview & Validate"

**Expected Result:** ✅ All fields correctly mapped

---

## Test 4: Review Auto-Fixed Codes

1. Check validation summary
2. Look for **"Auto-Fixed Diagnosis Codes"** section
3. Review each auto-fixed code:
   - Original code
   - Replacement code
   - Confidence percentage
   - Alternatives (click to expand)
4. Verify replacements are correct
5. If wrong, note the row number

**Expected Result:**
- ✅ Auto-fixes are accurate (70%+ confidence)
- ✅ Alternatives are relevant

---

## Test 5: Preview Data

1. Review sample records table
2. Check field mapping summary
3. Look for validation errors
4. Verify record counts
5. Click "Continue to Upload"

**Expected Result:**
- ✅ All records valid (or known invalid records identified)
- ✅ Field mapping looks correct

---

## Test 6: Start Upload

1. Review upload summary
2. Read the warning message
3. Click "Start Upload"
4. Watch for transition to uploading screen

**Expected Result:** ✅ Upload starts immediately

---

## Test 7: Monitor Progress

1. Watch **progress bar** update
2. Check **statistics** (Success/Failed/Pending)
3. Observe **current record** details
4. Verify progress percentage increases

**Expected Result:**
- ✅ Progress updates in real-time
- ✅ Current record shows patient info
- ✅ Statistics update correctly

---

## Test 8: Pause/Resume

1. Click **"Pause"** button
2. Verify upload stops
3. Check "Upload paused" message
4. Click **"Resume"** button
5. Verify upload continues

**Expected Result:**
- ✅ Upload pauses successfully
- ✅ Resume works correctly
- ✅ No records lost

---

## Test 9: Cancel Upload

1. Start a new upload
2. Let it run for ~5 records
3. Click **"Cancel"** button
4. Verify return to "Ready to Upload" screen

**Expected Result:**
- ✅ Upload cancelled
- ✅ State reset correctly

---

## Test 10: Completion Screen

1. Start upload and let it complete
2. Review **completion summary**:
   - Success rate percentage
   - Total/Success/Failed counts
3. Check **failed records list** (if any)
4. Review **success summary**

**Expected Result:**
- ✅ Summary accurate
- ✅ All records accounted for
- ✅ Success rate calculated correctly

---

## Test 11: Download Failed Records

1. If any records failed, click **"Download Failed Records"**
2. Check Downloads folder for CSV file
3. Open CSV and verify:
   - Row numbers correct
   - Patient data present
   - Error messages clear

**Expected Result:**
- ✅ CSV downloaded
- ✅ Contains all failed records
- ✅ Error messages helpful

---

## Test 12: Verify in DHIS2

1. Go to DHIS2
2. Navigate to the events list
3. Search for uploaded records by:
   - Patient number
   - Date range
   - Organization unit
4. Verify data accuracy:
   - Patient details correct
   - Diagnosis codes correct (especially auto-fixed ones)
   - All fields populated

**Expected Result:**
- ✅ All successful records appear in DHIS2
- ✅ Data is accurate
- ✅ Auto-fixed codes are correct

---

## Test 13: Error Handling

**Test with invalid data:**

1. Create Excel with intentionally bad data:
   - Invalid dates (e.g., "not-a-date")
   - Missing required fields
   - Invalid diagnosis codes (no alternatives)
2. Upload and proceed to validation
3. Verify errors are caught
4. Try to upload anyway

**Expected Result:**
- ✅ Validation catches errors
- ✅ Cannot proceed with invalid records
- ✅ Clear error messages

---

## Test 14: Network Failure Simulation

1. Start upload
2. During upload, disconnect internet
3. Observe retry behavior
4. Reconnect after ~10 seconds
5. Check if upload continues

**Expected Result:**
- ✅ Retries 3 times
- ✅ Records fail after retries
- ✅ Upload continues with next record

---

## Test 15: Large Dataset

1. Upload file with 50+ records
2. Verify upload doesn't freeze UI
3. Check memory usage in Task Manager
4. Verify all records processed

**Expected Result:**
- ✅ UI remains responsive
- ✅ Memory usage reasonable (<100MB)
- ✅ All records processed

---

## Test 16: Start Over

1. After completion, click **"Upload Another File"**
2. Verify return to upload screen
3. Check state is completely reset
4. Upload a different file

**Expected Result:**
- ✅ State reset completely
- ✅ No leftover data
- ✅ New upload works correctly

---

## Bug Reporting Template

If you find bugs, report with this format:

```
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[If applicable]

**Environment:**
- Chrome Version:
- Extension Version:
- Operating System:

**Console Errors:**
[Check service worker console and browser console]

**Additional Notes:**
[Any other relevant information]
```

---

## Performance Benchmarks

Track these metrics during testing:

| Metric | Expected | Actual |
|--------|----------|--------|
| File parse time (30 records) | <2 seconds | |
| Validation time | <3 seconds | |
| Upload start time | <1 second | |
| Upload speed | 2 records/sec | |
| UI response time | <100ms | |
| Memory usage | <50MB | |

---

## Common Issues & Solutions

### Issue: Upload button disabled
**Solution:** Verify all records are valid in preview step

### Issue: Progress not updating
**Solution:** Check service worker console for errors

### Issue: All records failing
**Solution:** Verify API config, check DHIS2 connectivity

### Issue: Auto-fix confidence too low
**Solution:** Codes may need manual correction in Excel

### Issue: Extension not loading
**Solution:** Rebuild with `deno task build`, reload extension

### Issue: Service worker inactive
**Solution:** Go to chrome://extensions, click "service worker" link

---

## Success Criteria

**✅ All tests passed if:**
- File upload and parsing works
- Field mapping auto-detects correctly
- Auto-fixed codes are accurate (>90%)
- Upload starts and completes successfully
- Progress updates in real-time
- Pause/Resume/Cancel work correctly
- Completion screen shows accurate results
- Failed records CSV exports correctly
- All successful records appear in DHIS2
- No console errors
- UI remains responsive

---

## Next Steps After Testing

1. **Document findings** in test results
2. **Report bugs** with template above
3. **Gather feedback** from real users
4. **Plan improvements** based on issues
5. **Update documentation** as needed

---

**Happy Testing! 🚀**

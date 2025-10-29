# DHIS2 Bulk Upload - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Process Your Excel File
```bash
node process-and-upload.js
```

This will:
- ✅ Read JuneEmergency.xlsx
- ✅ Transform all data
- ✅ Validate everything
- ✅ Generate reports in `output/` folder
- ⏸️  **NOT upload** (safe mode)

### Step 2: Review the Results
```bash
cat output/validation-report.txt
```

Look for:
- ✅ **Valid records** - ready to upload
- ❌ **Invalid records** - need fixing
- ⚠️  **Warnings** - review before upload

### Step 3: Upload (When Ready)
1. **Edit `process-and-upload.js`:**
   ```javascript
   const CONFIG = {
     upload: {
       enabled: true,  // Change this!
     },
     dhis2: {
       sessionId: 'YOUR-JSESSIONID'  // Add your cookie!
     }
   };
   ```

2. **Get your JSESSIONID:**
   - Open DHIS2 in browser
   - Press F12 (DevTools)
   - Go to: Application → Cookies
   - Copy JSESSIONID value

3. **Run upload:**
   ```bash
   node process-and-upload.js
   ```

---

## 📁 Output Files Explained

| File | What It Contains |
|------|------------------|
| `cleaned-data.json` | All transformed records + errors |
| `validation-report.txt` | Human-readable summary |
| `dhis2-payload.json` | Ready-to-upload data |
| `upload-report.txt` | Upload results (when enabled) |

---

## 🔧 Common Issues & Fixes

### Issue: "Patient number invalid format"
**Fix:** Ensure format is: `VR-A##-AAA####`
```
❌ HO-A01-AAQ4118
✅ VR-A01-AAQ4118
```

### Issue: "Unknown education level: BASIC"
**Fix:** Map it in `lib/data-cleaner.js`:
```javascript
const mapping = {
  'BASIC': 'JHS/Middle School',  // Add this line
  'SHS': 'SHS/Secondary',
  ...
};
```

### Issue: "Diagnosis code not found"
**Fix:** Check if code exists in DHIS2. If not, ask admin to add it.

---

## 📊 What Success Looks Like

```
======================================================================
✅ PIPELINE COMPLETE!
======================================================================

Summary:
  📄 Excel records: 31
  🧹 Cleaned: 31         ← Should be high!
  ✔️  Valid: 31          ← Should match cleaned
  ❌ Invalid: 0          ← Should be 0
  🚀 Uploaded: 31/31     ← 100% success!
```

---

## 🆘 Need Help?

1. **Check the logs** - Look at validation-report.txt
2. **Review ACTIVITIES.md** - See full implementation details
3. **Check IMPLEMENTATION_COMPLETE.md** - Complete documentation

---

## ⚡ Pro Tips

1. **Test small first:** Process 5 records before doing all 31
2. **Backup your data:** Keep original Excel safe
3. **Check DHIS2 first:** Verify you can log in and see the form
4. **Start with validation:** Always run validation-only mode first
5. **Fix data quality:** Better source data = higher success rate

---

## 🎯 Quick Commands

```bash
# Install dependencies (first time only)
npm install

# Process Excel (validation only - safe)
node process-and-upload.js

# View results
cat output/validation-report.txt
cat output/dhis2-payload.json

# Check what failed
grep "❌" output/validation-report.txt

# Count valid records
grep "✅ Valid:" output/validation-report.txt
```

---

**Ready to go? Run:** `node process-and-upload.js`

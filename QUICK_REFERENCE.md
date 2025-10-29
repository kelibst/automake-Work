# Quick Reference Guide - Data Validation Improvements

**Last Updated:** 2025-10-29

---

## What Changed?

Five major improvements to make data validation smarter and more user-friendly:

---

## 1. Patient Numbers ✅
**Now accepts ANY format** - no more validation errors for patient numbers

**Before:** ❌ "HO-A01-XXX1234" rejected (wrong format)
**After:**  ✅ "HO-A01-XXX1234" accepted (any format OK)

**Why:** Patient numbers come from the system and are always correct.

---

## 2. Education Levels ✅
**New mappings for common values:**

| Excel Value | Maps To |
|-------------|---------|
| NA / N/A | None |
| BASIC | Primary School |
| CHILD | Primary School |
| PRIMARY | Primary School |
| JHS | JHS/Middle School |
| SHS | SHS/Secondary |
| TERTIARY | Tertiary |

**Before:** ❌ "BASIC" rejected
**After:**  ✅ "BASIC" → "Primary School"

---

## 3. Invalid Diagnosis Codes ❌
**Records with invalid diagnosis codes will NOT upload**

**Example:**
```
Diagnosis: "Unknown Disease(Z99.99)"
Result: ❌ INVALID DIAGNOSIS: Code "Z99.99" not found in DHIS2.
        This record will NOT be uploaded.
        Action Required: Fix diagnosis code in Excel file.
```

**What to do:**
1. Check error message for invalid code
2. Contact DHIS2 admin for correct code
3. Update Excel file
4. Re-run validation

---

## 4. Multiple Diagnosis Codes ✅
**Automatically handles multiple ICD codes in one field**

**Example:**
```
Input:  "Diabetes with complications(E11, I10)"
Output: Principal Diagnosis = "E11"
Info:   Using first code. Put "I10" in Additional Diagnosis field.
```

**Note:** Record will upload successfully with first code.

---

## 5. General Speciality ✅
**"General" automatically mapped to "Casualty"**

**Example:**
```
Input:  "General"
Output: "Casualty"
Info:   ℹ️ "General" mapped to "Casualty"
        Update Excel if incorrect
```

**What to do:** If mapping is wrong, update Excel file before upload.

---

## Message Types

### ❌ Error (Red)
- **Record will NOT upload**
- **Action Required:** Fix the issue in Excel file
- Example: Invalid diagnosis code

### ⚠️ Warning (Yellow)
- **Record will upload** but review recommended
- Example: Unrealistic age value

### ℹ️ Info (Blue)
- **Record will upload** successfully
- Just informing you of automatic changes
- Example: "General" → "Casualty" mapping

---

## Common Workflow

### Step 1: Run Validation
```bash
node process-and-upload.js
```

### Step 2: Check Report
```bash
cat output/validation-report.txt
```

### Step 3: Fix Errors
- Look for ❌ **INVALID RECORDS**
- Most common: Invalid diagnosis codes
- Update Excel file with corrections

### Step 4: Review Info
- Look for ℹ️ **INFORMATION**
- Verify automatic mappings are correct
- Update Excel if needed

### Step 5: Re-validate
- Run validation again after fixes
- Confirm higher success rate

### Step 6: Upload
- Enable upload in config
- Run upload for valid records

---

## Expected Success Rate

### Your 31-Record Dataset

**Before Improvements:**
- ✅ Valid: 4 (13%)
- ❌ Invalid: 27 (87%)

**After Improvements:**
- ✅ Valid: ~19 (61%)
- ❌ Invalid: ~12 (39% - all have invalid diagnosis codes)

**Note:** The 39% failure rate is CORRECT behavior - those records have real issues that need fixing.

---

## FAQ

**Q: Why are some records still failing?**
A: Invalid diagnosis codes. This is correct - we should NOT upload bad data to DHIS2.

**Q: How do I fix invalid diagnosis codes?**
A: Contact your DHIS2 administrator for the list of valid ICD codes, then update your Excel file.

**Q: Can I ignore info messages?**
A: Info messages are just FYI. Records will upload successfully, but verify the automatic mappings are correct for your needs.

**Q: What if "General" shouldn't map to "Casualty"?**
A: Update your Excel file with the correct speciality before upload.

**Q: Do I need to fix warnings?**
A: Not required. Warnings are for your review, but records will upload.

---

## Quick Commands

```bash
# Test improvements
node test-improvements.js

# Run validation (safe - no upload)
node process-and-upload.js

# View validation report
cat output/validation-report.txt

# View cleaned data
cat output/cleaned-data.json

# View validation results (JSON)
cat output/validation-results.json
```

---

## Get Help

**Issues with improvements?**
- Check [IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md) for full details
- Review test results in [test-improvements.js](test-improvements.js)
- Check [CLAUDE.md](CLAUDE.md) for complete project context

**Need to modify mappings?**
- Edit [lib/data-cleaner.js](lib/data-cleaner.js)
- Search for the specific mapping you want to change
- Re-run tests to verify changes

---

**Version:** 1.0
**Status:** Production Ready
**All improvements tested and working ✅**

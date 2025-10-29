# LHIMS Debug Troubleshooting Guide

**Date:** 2025-10-23
**Issue:** LHIMS requests not being captured in Debug tab

---

## ✅ Changes Made

### 1. UI Simplification
**LHIMS now shows ONLY the Debug tab** (no Discovery, Upload, or Settings)
- When you select LHIMS, the extension auto-switches to Debug tab
- Only Debug functionality is available for LHIMS
- All other tabs remain available for DHIMS2

### 2. Enhanced Logging
Added console logging to help diagnose issues with request interception.

---

## 🔍 Diagnostic Steps

### Step 1: Reload the Extension
**CRITICAL:** You must reload the extension after building!

1. Go to `chrome://extensions/`
2. Find "Health Data Uploader - DHIMS2 & LHIMS"
3. Click the **🔄 Reload button**
4. If prompted, accept permissions for `http://10.10.0.59/*`

### Step 2: Open Chrome DevTools for Extension
We need to see console logs from the extension's background service worker.

1. Go to `chrome://extensions/`
2. Find "Health Data Uploader - DHIMS2 & LHIMS"
3. Click **"service worker"** or **"Inspect views: service worker"**
4. A new DevTools window opens - this shows the background script logs

**What to look for:**
```
✅ WebRequest listeners registered for DHIMS2 and LHIMS
📡 Listening to URLs: ["https://events.chimgh.org/*", "http://10.10.0.59/*"]
🎯 Will capture ALL XHR requests from these domains
```

If you DON'T see these messages:
- The extension isn't loaded correctly
- Try reloading the extension again

### Step 3: Check if Extension is Listening
1. In the extension popup, switch to **LHIMS**
2. Open **Debug tab** (should auto-open)
3. Verify the button says **"Listening"** (green)
4. In the service worker DevTools, you should see:
```
🐛 Debug mode auto-enabled for lhims
🔍 API Interceptor: Started listening...
✅ WebRequest listeners registered for DHIMS2 and LHIMS
```

### Step 4: Navigate to LHIMS
1. Open a NEW tab
2. Navigate to `http://10.10.0.59/lhims_182/`
3. **Keep the service worker DevTools open** to watch for logs
4. You should see messages like:
```
🌐 ALL REQUEST DETECTED: GET http://10.10.0.59/lhims_182/...
🔍 CHECKING REQUEST: { method: 'GET', url: '...', hasBody: false }
```

**If you DON'T see these messages:**
- The extension doesn't have permission for that URL
- OR the extension isn't intercepting requests properly

### Step 5: Submit a Form in LHIMS
1. Log in to LHIMS (sno-411 / monamourd11)
2. Navigate to a form (patient registration, etc.)
3. **Fill out ALL fields completely**
4. Click **Submit**
5. Watch the service worker DevTools console

**What you should see:**
```
🌐 ALL REQUEST DETECTED: POST http://10.10.0.59/lhims_182/api/...
🔍 CHECKING REQUEST: { method: 'POST', url: '...', hasBody: true }
📦 Parsing request body...
📦 Parsed payload: { ... }
💾 Request stored with ID: ...
🏁 Request completed: ... Status: 200
🐛 DEBUG MODE: Saving request
💾 Debug payload saved
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "No payloads captured yet"
**Possible causes:**
- Extension not reloaded after build
- Not actually submitting forms (just viewing)
- LHIMS uses a different request method (not XHR)
- LHIMS uses iframes or different domain

**Solution:**
1. Check service worker console for ANY requests
2. Try submitting different forms in LHIMS
3. Check if LHIMS makes requests to a different domain

### Issue 2: No console logs in service worker
**Possible causes:**
- Extension not loaded
- Service worker not started

**Solution:**
1. Go to `chrome://extensions/`
2. Toggle extension OFF then ON
3. Click "service worker" link to start it
4. Reload extension page

### Issue 3: "Failed to register listeners" error
**Possible causes:**
- Manifest permissions missing
- Chrome extension API issue

**Solution:**
1. Check `dist/manifest.json` has:
```json
"host_permissions": [
  "https://events.chimgh.org/*",
  "http://10.10.0.59/*"
]
```
2. Reload extension completely

### Issue 4: Requests detected but not saved
**Possible causes:**
- Storage API error
- Payload parsing error

**Solution:**
Check service worker console for errors like:
- "Failed to save debug payload"
- "Failed to parse request body"

---

## 🧪 Test Scenarios

### Test 1: Verify Listener is Active
**Action:** Just navigate to http://10.10.0.59/lhims_182/

**Expected in service worker console:**
```
🌐 ALL REQUEST DETECTED: GET http://10.10.0.59/lhims_182/...
```

**If nothing:** Extension isn't listening to this URL at all.

### Test 2: Verify XHR Detection
**Action:** Login to LHIMS

**Expected in service worker console:**
```
🌐 ALL REQUEST DETECTED: POST http://10.10.0.59/lhims_182/login
```

**If nothing:** LHIMS might not be using XHR (could be using fetch or form post).

### Test 3: Verify Form Submission
**Action:** Submit a patient form

**Expected in service worker console:**
```
🌐 ALL REQUEST DETECTED: POST http://10.10.0.59/lhims_182/api/patients
📦 Parsed payload: { patient_id: "...", ... }
💾 Debug payload saved
```

**Expected in extension Debug tab:**
- New payload appears in list
- Click to view details

---

## 🔬 Advanced Debugging

### Check Request Type
LHIMS might be using different request types:

1. **XHR (XMLHttpRequest)** - What we're listening to ✅
2. **Fetch API** - Chrome extension can't intercept easily ❌
3. **Regular Form POST** - Not XHR, won't be captured ❌
4. **WebSocket** - Different protocol ❌

**To check:**
1. Open LHIMS in regular Chrome DevTools (F12)
2. Go to **Network tab**
3. Submit a form
4. Look at the request
5. Check the **"Type"** column

If it says:
- `xhr` → ✅ Should be captured
- `fetch` → ❌ Won't be captured (need different approach)
- `document` → ❌ Regular form submission (need different approach)

### Alternative: Use Network Tab Directly
If our extension isn't capturing:

1. Open LHIMS
2. Press F12 (DevTools)
3. Go to **Network** tab
4. Filter to **XHR** or **Fetch/XHR**
5. Submit form
6. Click the request
7. Go to **"Payload"** or **"Request"** tab
8. Manually copy the JSON

---

## 📋 Quick Checklist

Before reporting "nothing is captured":

- [ ] Extension reloaded after building
- [ ] Service worker DevTools open and showing logs
- [ ] Extension showing "Listening" (green button)
- [ ] LHIMS page is actually loaded (http://10.10.0.59/lhims_182/)
- [ ] Actually submitted a form (not just viewing)
- [ ] Form submission completed (not error)
- [ ] Service worker shows "ALL REQUEST DETECTED" messages
- [ ] Checked Chrome DevTools Network tab for XHR requests

---

## 🎯 What to Tell Me

If still not working, share:

1. **Service worker console output** (screenshot or text)
2. **Chrome DevTools Network tab** - what type of requests do you see?
3. **LHIMS URL** - exact URL where you're submitting the form
4. **Request details** from Network tab:
   - Type (xhr, fetch, document?)
   - URL
   - Method (POST, GET?)
   - Status code

This will help me identify the exact issue!

---

## 💡 Quick Fixes

### Fix 1: Force Service Worker Restart
```
1. chrome://extensions/
2. Find extension
3. Click "Remove" (yes, remove it!)
4. Click "Load unpacked"
5. Select dist/ folder again
6. Try again
```

### Fix 2: Check Manifest Permissions
```bash
cd dhims2-chrome-extension
cat dist/manifest.json | grep -A 3 "host_permissions"
```

Should show:
```json
"host_permissions": [
  "https://events.chimgh.org/*",
  "http://10.10.0.59/*"
]
```

### Fix 3: Test with Simple Request
Try this in Chrome console while on LHIMS page:
```javascript
fetch('http://10.10.0.59/lhims_182/test', {method: 'POST', body: '{}'})
```

Check if service worker detects it.

---

**Status:** Ready to debug! Follow steps above and report back what you find.

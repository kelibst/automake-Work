# Content Script Error Fix

## Error Message
```
Failed to fill form: Could not establish connection. Receiving end does not exist.
```

## What This Means
The content script (`inject.js`) is not loaded on the DHIMS2 page. This happens when:
1. Extension was loaded AFTER the page was already open
2. Content script failed to inject
3. Wrong URL pattern in manifest

## Quick Fix (Do This First!)

### Step 1: Reload Extension
1. Go to `chrome://extensions/`
2. Find "Health Data Uploader - DHIMS2 & LHIMS"
3. Click the **Reload** button (circular arrow icon)

### Step 2: Reload DHIMS2 Page
1. Go to your DHIMS2 tab
2. Press `Ctrl+R` or `F5` to reload the page
3. Wait for page to fully load

### Step 3: Verify Content Script Loaded
1. On DHIMS2 page, press `F12` to open DevTools
2. Go to "Console" tab
3. Look for: `🔌 DHIMS2 Extension: Content script loaded`
4. If you see this message ✅ = Content script is working!

### Step 4: Try Again
1. Open extension sidepanel
2. Go to Form Fill tab
3. Click "Fill Form"
4. Should work now! ✅

---

## If Still Not Working

### Check 1: Verify You're on the Right URL

Content script only loads on:
- `https://events.chimgh.org/*`
- `http://10.10.0.59/*` (LHIMS)

**Current URL must match one of these patterns.**

Check your URL:
```
✅ https://events.chimgh.org/events/dhis-web-capture/...
✅ http://10.10.0.59/lhims_182/...
❌ https://other-dhims-site.com/... (won't work)
```

### Check 2: Extension Permissions

1. Go to `chrome://extensions/`
2. Click "Details" on your extension
3. Scroll to "Site access"
4. Should say: "On specific sites"
5. Should list:
   - `events.chimgh.org`
   - `10.10.0.59`

If not listed:
1. Click "Add"
2. Enter: `https://events.chimgh.org/*`
3. Click "Add"

### Check 3: Build the Extension

The extension needs to be built for production:

```bash
cd dhims2-chrome-extension
deno task build
```

Then reload extension from `dist/` folder instead of root folder.

### Check 4: Console Errors

**In DHIMS2 Page Console (F12):**
Look for red error messages related to:
- Content script
- Extension
- inject.js

**In Extension Console:**
1. Right-click extension icon
2. Click "Inspect popup" or "Inspect"
3. Check for errors

---

## Manual Content Script Injection (Advanced)

If content script still won't load automatically, you can inject it manually:

### Method 1: Via Background Service Worker

1. Go to `chrome://extensions/`
2. Click "Service worker" link under your extension
3. In the console, run:

```javascript
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.scripting.executeScript({
    target: {tabId: tabs[0].id},
    files: ['content.js']
  });
});
```

### Method 2: Add to Manifest Permissions

Edit `manifest.json` to add `scripting` permission:

```json
"permissions": [
  "storage",
  "notifications",
  "webRequest",
  "sidePanel",
  "scripting",
  "activeTab"
],
```

---

## Verification Checklist

Run through this checklist:

- [ ] Extension loaded in Chrome (`chrome://extensions/`)
- [ ] Extension has "On" toggle enabled
- [ ] Extension reloaded after any code changes
- [ ] DHIMS2 page reloaded after extension loaded
- [ ] URL matches: `https://events.chimgh.org/*`
- [ ] Console shows: `🔌 DHIMS2 Extension: Content script loaded`
- [ ] No errors in page console (F12)
- [ ] No errors in extension console (Inspect)
- [ ] Build completed successfully (`deno task build`)
- [ ] Using built version from `dist/` folder

---

## Common Mistakes

### Mistake 1: Extension Not Reloaded
**Problem:** Made code changes but didn't reload extension

**Fix:** Always click "Reload" button in `chrome://extensions/` after changes

### Mistake 2: Page Not Reloaded
**Problem:** Loaded extension but page was already open

**Fix:** Reload the DHIMS2 page with `Ctrl+R`

### Mistake 3: Wrong Folder
**Problem:** Loading unpacked from wrong folder

**Fix:** Load from `dhims2-chrome-extension/` root folder or `dist/` folder after build

### Mistake 4: Dev vs Production
**Problem:** Running dev server but extension needs build

**Fix:**
- For development: Use `deno task dev` and load from root
- For testing: Use `deno task build` and load from `dist/`

---

## Alternative: Test Without Content Script

If content script keeps failing, you can test the template by using browser console directly:

1. Open DHIMS2 form page
2. Press F12 → Console
3. Copy-paste the form filling code from `src/content/inject.js`
4. Manually call `fillForm(mapping, rowData)`

This lets you test the form filling logic independently.

---

## Still Having Issues?

### Debug Steps:

1. **Check if content.js file exists:**
   ```bash
   cd dhims2-chrome-extension
   ls src/content/
   # Should see: inject.js

   ls dist/content/
   # After build, should see: inject.js
   ```

2. **Check vite.config.js includes content script:**
   - Look for build configuration
   - Ensure content script is copied to dist/

3. **Test with minimal extension:**
   - Create test extension with just content script
   - Verify it loads
   - Then debug why main extension doesn't

4. **Check Chrome version:**
   - Manifest v3 requires Chrome 88+
   - Check: `chrome://version/`

---

## Working? Great!

Once you see `🔌 DHIMS2 Extension: Content script loaded` in console:

1. Extension is working ✅
2. Content script is injected ✅
3. Form filling should work ✅
4. You can now use the Form Fill feature ✅

**Next:** Import the template and start filling forms!

---

**Last Updated:** 2025-10-30

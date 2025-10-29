# How to Properly Reload the Extension After Build

When you rebuild the extension, Chrome doesn't always pick up the changes automatically. Follow these steps:

## Method 1: Hard Reload (Recommended)

1. **Go to Extensions Page:**
   ```
   chrome://extensions/
   ```

2. **Find your extension** (DHIMS2 Chrome Extension)

3. **Click the circular reload icon** ↻ next to the extension

4. **Close all extension windows:**
   - Close the side panel if open
   - Close any popup windows
   - Close service worker console if open

5. **Open a new tab** and click the extension icon again

6. **Check if changes applied:**
   - Open Upload tab
   - Look for green "API Configuration Ready" badge at the top

## Method 2: Remove and Re-add (If Method 1 doesn't work)

1. **Go to Extensions Page:**
   ```
   chrome://extensions/
   ```

2. **Click "Remove"** on the extension

3. **Click "Load unpacked"**

4. **Select the dist folder:**
   ```
   C:\Users\Kelib\Desktop\projects\automake-Work\dhims2-chrome-extension\dist
   ```

5. **Open the extension** and test

## Method 3: Clear Extension Storage (Nuclear option)

If the extension is still using old data:

1. **Open Service Worker Console:**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "service worker" link
   - In console, run:
     ```javascript
     chrome.storage.local.clear(() => console.log('Storage cleared'));
     ```

2. **Reload the extension** (Method 1)

3. **Test again**

## Verification Checklist

After reloading, verify these changes are active:

### ✅ Upload Tab Should Show:
```
┌─────────────────────────────────────────┐
│ Upload Excel File                        │
├─────────────────────────────────────────┤
│ ✅ API Configuration Ready     Default  │
│    Endpoint: 41/tracker                 │
└─────────────────────────────────────────┘
```

### ✅ Console Should Log:
```
ℹ️ Using default API config (no discovery needed)
```
**OR**
```
✅ Using discovered API config
```

### ✅ Upload Should Work:
- Click "Upload Excel File"
- Select file
- Proceed through mapping
- Should NOT be blocked

## Common Issues

### Issue: Still shows "Discovery required"
**Solution:**
- You're looking at the wrong tab (Discovery tab instead of Upload tab)
- OR old version still loaded → Try Method 2 (Remove and Re-add)

### Issue: "API Configuration Ready" doesn't show
**Solution:**
- Check browser console for errors (F12)
- Check if default-api-config.js was built correctly
- Verify import statement in Upload.jsx

### Issue: Upload button still disabled
**Solution:**
- This is normal if no file uploaded yet
- First upload a file, then check if it proceeds

### Issue: Console shows errors about DEFAULT_API_CONFIG
**Solution:**
- Rebuild extension: `deno task build`
- Make sure build succeeded without errors
- Check if src/config/default-api-config.js exists

## Quick Test Commands

Run these in the service worker console to debug:

```javascript
// Check if default config is loaded
chrome.runtime.sendMessage({type: 'GET_API_CONFIG'}, (r) => console.log('Config:', r));

// Check extension version
chrome.runtime.getManifest().version

// Check if storage has old data
chrome.storage.local.get(null, (data) => console.log('All storage:', data));
```

## After Successful Reload

You should be able to:
1. Open Upload tab directly (no discovery needed)
2. See "API Configuration Ready (Default)" badge
3. Upload Excel file
4. Complete entire upload flow

---

**If still not working after all methods, please share:**
1. Screenshot of Upload tab
2. Browser console errors (F12)
3. Service worker console logs

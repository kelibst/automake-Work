# Default API Configuration Setup

**Date:** 2025-10-29
**Change:** Added default API configuration to bypass discovery requirement

---

## What Changed

### Problem
- Upload feature was blocked waiting for API discovery
- Users had to run discovery every time or for testing
- Discovery flow added unnecessary friction

### Solution
- Added hardcoded default API configuration
- Upload now works immediately without discovery
- Discovery still works if user wants to update config

---

## Implementation

### New File Created

**[src/config/default-api-config.js](../src/config/default-api-config.js)**

Contains the pre-discovered DHIMS2 API configuration:
```javascript
export const DEFAULT_API_CONFIG = {
  discovered: true,
  endpoint: {
    url: 'https://events.chimgh.org/events/api/41/tracker',
    method: 'POST',
    headers: { ... }
  },
  payload_structure: {
    program: 'fFYTJRzD2qq',
    orgUnit: 'duCDqCRlWG1',
    programStage: 'cH9NADGoNwU',
    ...
  },
  fieldMappings: {
    patientNumber: { dataElement: 'okahaacYKqO', ... },
    address: { dataElement: 'MSYrx2z1f8p', ... },
    // ... all 16 field mappings
  }
};
```

### Modified File

**[src/sidepanel/pages/Upload.jsx](../src/sidepanel/pages/Upload.jsx)**

**Changes:**
1. Import default config:
   ```javascript
   import DEFAULT_API_CONFIG from '../../config/default-api-config';
   ```

2. Initialize state with default:
   ```javascript
   const [apiConfig, setApiConfig] = useState(DEFAULT_API_CONFIG);
   ```

3. Updated `loadApiConfig()` to merge discovered config:
   ```javascript
   const loadApiConfig = async () => {
     try {
       const response = await chrome.runtime.sendMessage({ type: 'GET_API_CONFIG' });
       if (response.success && response.config) {
         console.log('✅ Using discovered API config');
         setApiConfig(response.config);
       } else {
         console.log('ℹ️ Using default API config (no discovery needed)');
       }
     } catch (err) {
       console.log('ℹ️ Falling back to default API config');
       // Keep using default config
     }
   };
   ```

4. Added visual indicator in upload step:
   ```javascript
   {apiConfig && (
     <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
       <div className="flex items-center justify-between text-sm">
         <div className="flex items-center">
           <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
           <span className="text-green-900 font-medium">
             API Configuration Ready
           </span>
         </div>
         <span className="text-xs text-green-700">
           {apiConfig.discovered && apiConfig.timestamp ? 'Discovered' : 'Default'}
         </span>
       </div>
       <p className="text-xs text-green-700 mt-1 ml-6">
         Endpoint: {apiConfig.endpoint?.url?.split('/').slice(-2).join('/')}
       </p>
     </div>
   )}
   ```

---

## Behavior

### Before Changes
```
1. User opens Upload tab
2. Upload checks for discovered API config
3. If not found → Shows error, blocks upload
4. User must run Discovery first
5. Then can upload
```

### After Changes
```
1. User opens Upload tab
2. Upload loads default API config immediately
3. Shows "API Configuration Ready (Default)"
4. User can upload right away
5. (Optional) Run Discovery to update config
```

---

## Configuration Priority

The system uses this priority order:

1. **Discovered Config** (if available)
   - Loaded from chrome.storage.local
   - User ran Discovery successfully
   - Shows "Discovered" badge

2. **Default Config** (fallback)
   - Hardcoded in default-api-config.js
   - Always available
   - Shows "Default" badge

---

## UI Indicators

### Upload Step

**When using Default config:**
```
┌─────────────────────────────────────────┐
│ ✅ API Configuration Ready     Default  │
│    Endpoint: 41/tracker                 │
└─────────────────────────────────────────┘
```

**When using Discovered config:**
```
┌─────────────────────────────────────────┐
│ ✅ API Configuration Ready  Discovered  │
│    Endpoint: 41/tracker                 │
└─────────────────────────────────────────┘
```

---

## Console Messages

### Using Default Config
```javascript
ℹ️ Using default API config (no discovery needed)
```

### Using Discovered Config
```javascript
✅ Using discovered API config
```

### Error Fallback
```javascript
Error loading API config: [error message]
ℹ️ Falling back to default API config
```

---

## Testing

### Test 1: Upload Without Discovery
1. Build and load extension
2. Go directly to Upload tab (skip Discovery)
3. Should see "API Configuration Ready (Default)"
4. Upload should work normally

**Expected:** ✅ Upload works immediately

### Test 2: Upload After Discovery
1. Run Discovery first
2. Go to Upload tab
3. Should see "API Configuration Ready (Discovered)"
4. Upload should use discovered config

**Expected:** ✅ Uses discovered config, upload works

### Test 3: Config Priority
1. Use default config (don't run Discovery)
2. Upload 1 record → Check console for "Using default"
3. Run Discovery
4. Upload another record → Check console for "Using discovered"

**Expected:** ✅ Config switches correctly

---

## Updating Default Config

If DHIMS2 structure changes, update:

**File:** `src/config/default-api-config.js`

**What to update:**
1. **Endpoint URL**: If API path changes
2. **Program/OrgUnit IDs**: If different instance
3. **Data Element IDs**: If field mappings change
4. **Field Mappings**: If new fields added

**How to get current config:**
1. Run Discovery in extension
2. Open service worker console
3. Copy logged API config
4. Paste into default-api-config.js
5. Rebuild extension

---

## Benefits

✅ **No Discovery Required**: Upload works out of the box
✅ **Faster Testing**: Skip discovery during development
✅ **Better UX**: Less friction for users
✅ **Failsafe**: Always has working config
✅ **Flexible**: Discovery still works for updates
✅ **Visible**: Shows which config is active

---

## Limitations

⚠️ **Hardcoded for DHIMS2**: Default config specific to events.chimgh.org
⚠️ **May Become Outdated**: If DHIMS2 structure changes
⚠️ **Not for LHIMS**: Separate default config needed
⚠️ **Manual Updates**: Must rebuild extension to update default

---

## Future Enhancements

1. **Multiple Default Configs**: Support DHIMS2 and LHIMS
2. **Config Validation**: Check if default is still valid
3. **Auto-Update**: Fetch latest config on startup
4. **Config Editor**: Let users edit default in UI
5. **Import/Export**: Share configs between users

---

## Rollback Instructions

If you need to revert to discovery-required behavior:

1. **Revert Upload.jsx:**
   ```javascript
   // Change this:
   const [apiConfig, setApiConfig] = useState(DEFAULT_API_CONFIG);

   // Back to this:
   const [apiConfig, setApiConfig] = useState(null);
   ```

2. **Remove default config import:**
   ```javascript
   // Remove this line:
   import DEFAULT_API_CONFIG from '../../config/default-api-config';
   ```

3. **Rebuild:**
   ```bash
   deno task build
   ```

---

## Related Files

- [src/config/default-api-config.js](../src/config/default-api-config.js) - Default config
- [src/sidepanel/pages/Upload.jsx](../src/sidepanel/pages/Upload.jsx) - Updated upload component
- [src/background/service-worker.js](../src/background/service-worker.js) - Handles GET_API_CONFIG
- [BATCH_UPLOAD_IMPLEMENTATION.md](BATCH_UPLOAD_IMPLEMENTATION.md) - Full upload docs

---

**Status:** ✅ Implemented and Built
**Version:** 1.0
**Last Updated:** 2025-10-29

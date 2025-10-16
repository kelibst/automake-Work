# Quick Start Guide - DHIMS2 Chrome Extension

## 🚀 Load Extension in Chrome (Development)

### Step 1: Build the Extension

```bash
cd dhims2-chrome-extension
npm run build
```

You should see output like:
```
✓ built in 3.00s
Copied public/manifest.json → dist/manifest.json
Moved dist/src/popup/index.html → dist/popup.html
```

### Step 2: Load in Chrome

1. Open Google Chrome

2. Go to: `chrome://extensions/`

3. **Enable "Developer mode"** (toggle switch in top-right corner)

4. Click **"Load unpacked"** button (top-left)

5. Navigate to and select the **`dist`** folder inside your project:
   ```
   /home/kelib/Desktop/projects/automake-Work/dhims2-chrome-extension/dist
   ```

6. The extension should now appear in your extensions list!

### Step 3: Test the Extension

1. Click the **puzzle piece icon** in Chrome toolbar (extensions menu)

2. Find **"DHIMS2 Batch Uploader"** and click it

3. You should see the popup with 3 tabs:
   - **Discovery** - API discovery interface
   - **Upload** - Batch upload (disabled until API is discovered)
   - **Settings** - Configuration

### Step 4: Pin the Extension (Optional)

1. Click the puzzle piece icon again

2. Click the **pin icon** next to "DHIMS2 Batch Uploader"

3. Extension icon will now appear in your toolbar permanently

## 🔍 Verify Installation

### Check Background Service Worker

1. Go to `chrome://extensions/`

2. Find "DHIMS2 Batch Uploader"

3. Click **"service worker"** link under "Inspect views"

4. Console should show:
   ```
   🚀 DHIMS2 Extension: Service Worker Started
   Extension installed: install
   First time installation - Welcome!
   ```

### Check Content Script

1. Navigate to: `https://events.chimgh.org/events/dhis-web-capture/`

2. Open Chrome DevTools (F12)

3. Check Console for:
   ```
   🔌 DHIMS2 Extension: Content script loaded
   ```

## 🐛 Troubleshooting

### Extension won't load
- **Check:** Make sure you selected the `dist` folder, not the root project folder
- **Fix:** Run `npm run build` first

### "Manifest file is missing or unreadable"
- **Check:** dist/manifest.json exists
- **Fix:** Run `npm run build` again

### Popup is blank
- **Check:** Open DevTools on popup (right-click extension icon → Inspect)
- **Look for:** Console errors
- **Common fix:** Rebuild with `npm run build`

### No icons showing
- **Check:** dist/icons/ folder has PNG files
- **Fix:** Run `node create-icons.js` then rebuild

## 📝 Development Workflow

### Making Changes

1. **Edit files** in `src/`

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click the **reload icon** (circular arrow) on the extension card
   - Or press `Ctrl+R` (Windows/Linux) / `Cmd+R` (Mac) while on extensions page

4. **Test changes**

### Hot Reload (Advanced)

For faster development, you can use:
```bash
npm run dev
```

But note: You'll still need to reload the extension in Chrome manually.

## 🧪 Testing API Discovery (When Implemented)

1. Open extension popup

2. Click **"Discovery"** tab

3. Click **"Start Discovery"** button

4. Go to DHIMS2: `https://events.chimgh.org/events/dhis-web-capture/`

5. Manually fill and submit ONE test record

6. Extension should show: "✅ API Discovered!"

## 📦 Building for Production

When ready to distribute:

```bash
npm run build
```

Then zip the `dist` folder:

```bash
cd dist
zip -r ../dhims2-uploader-v1.0.0.zip *
```

Share the .zip file with users who can install it via "Load unpacked".

## 🔗 Useful Chrome URLs

- `chrome://extensions/` - Manage extensions
- `chrome://inspect/#service-workers` - Inspect service workers
- `chrome://extensions/?id=YOUR_EXTENSION_ID` - Direct link to your extension

## 📚 Next Steps

Once extension is loaded:
1. Check **[plan/IMPLEMENTATION_PLAN.md](plan/IMPLEMENTATION_PLAN.md)** for development roadmap
2. Proceed to **Phase 2: API Discovery** implementation
3. Test each phase as you build

## 💡 Tips

- **Keep DevTools open** on the extension popup for debugging
- **Check service worker console** for background script logs
- **Use React DevTools** extension for inspecting React components
- **Test on actual DHIMS2** to verify content script injection

---

**Happy developing!** 🎉

If you encounter issues, check:
- [README.md](README.md) - Full project documentation
- [plan/CLAUDE.md](plan/CLAUDE.md) - Project context and architecture

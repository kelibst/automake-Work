# DHIMS2 Batch Uploader - Chrome Extension

Intelligent Chrome Extension for automated batch upload of patient records to DHIMS2 with automatic API discovery.

## 🚀 Features

- **🔍 Automatic API Discovery** - Learns DHIMS2 API structure by watching one manual submission
- **📤 Batch Upload** - Upload multiple patient records from Excel with one click
- **📊 Real-time Progress** - Beautiful UI showing upload status, errors, and completion
- **🔄 Error Recovery** - Retry logic, pause/resume capability
- **🎯 Zero Configuration** - No manual API mapping needed

## 📋 Project Status

**Current Phase:** Phase 1 Complete ✅
**Progress:** Setup & Foundation (100%)

### Completed
- ✅ Project initialization with npm
- ✅ React 18 + Vite setup
- ✅ Tailwind CSS configuration
- ✅ Chrome Extension Manifest V3
- ✅ Basic popup UI with tabs
- ✅ Background service worker skeleton
- ✅ Content script skeleton
- ✅ Build system working

### Next Steps
- 🔄 Phase 2: API Discovery Implementation
- ⏳ Phase 3: Data Processing (Excel parser, validator)
- ⏳ Phase 4: Batch Upload Engine
- ⏳ Phase 5: Full React UI
- ⏳ Phase 6: Testing & Polish

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Chrome browser

### Setup

```bash
# Install dependencies
npm install

# Create placeholder icons
node create-icons.js

# Build extension
npm run build

# Development mode (with hot reload)
npm run dev
```

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder

## 📁 Project Structure

```
dhims2-chrome-extension/
├── src/
│   ├── popup/              # React UI
│   │   ├── index.html
│   │   ├── index.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── background/         # Service worker
│   │   └── service-worker.js
│   ├── content/            # Content scripts
│   │   └── inject.js
│   ├── utils/              # Utilities (coming soon)
│   └── config/             # Configuration (coming soon)
├── public/
│   ├── manifest.json
│   └── icons/
├── plan/                   # Planning documents
│   ├── CLAUDE.md          # Project context
│   ├── IMPLEMENTATION_PLAN.md
│   └── API_DISCOVERY_SPEC.md
└── dist/                   # Build output
```

## 🎯 How It Works

### Phase 1: API Discovery
1. User clicks "Start Discovery" in extension
2. User manually submits ONE test record in DHIMS2
3. Extension intercepts the API call
4. Extension automatically maps Excel columns to DHIS2 dataElement IDs
5. Configuration saved for batch upload

### Phase 2: Batch Upload
1. User uploads Excel file
2. Extension validates data
3. User clicks "Upload"
4. Extension uploads records using discovered API structure
5. Real-time progress updates
6. Success/failure report generated

## 📚 Documentation

- **[plan/CLAUDE.md](plan/CLAUDE.md)** - Complete project context and architecture
- **[plan/IMPLEMENTATION_PLAN.md](plan/IMPLEMENTATION_PLAN.md)** - Step-by-step development guide
- **[plan/API_DISCOVERY_SPEC.md](plan/API_DISCOVERY_SPEC.md)** - API discovery technical specification

## 🔧 Tech Stack

- **Frontend:** React 18, Tailwind CSS
- **Build:** Vite
- **Extension:** Chrome Manifest V3
- **Data:** SheetJS (xlsx), date-fns
- **Icons:** Lucide React

## 📝 Scripts

```bash
npm run dev      # Development mode
npm run build    # Production build
npm run preview  # Preview build
```

## 🐛 Known Issues

- Icons are placeholders (need proper design)
- API discovery not yet implemented
- Upload functionality not yet implemented

## 📄 License

MIT

## 👥 Contributing

This is an internal project for DHIMS2 automation. Contact the development team for access.

---

**Version:** 1.0.0
**Status:** In Development
**Last Updated:** 2025-10-16

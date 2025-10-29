# UI Preview - Multi-System Interface

**Date:** 2025-10-23
**Version:** 2.0.0

## New Multi-System UI Features

### 1. System Selector (Top Right Header)

The header now includes a beautiful system selector dropdown that allows users to switch between DHIMS2 and LHIMS:

```
┌─────────────────────────────────────────────────────────┐
│ 🔄 Health Data Uploader          [🖥️ DHIMS2 ▼]        │
│    Multi-System Batch Upload      events.chimgh.org     │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Color-coded**: Blue gradient for DHIMS2, Green gradient for LHIMS
- **Dropdown menu** showing both systems with their status
- **Visual indicators**:
  - ✅ Green "Ready" badge for configured systems
  - ⚠️ Orange "Setup" badge for unconfigured systems
  - Checkmark for currently active system

**Dropdown Menu View:**
```
┌─────────────────────────────────────────────────────┐
│  Select System                                       │
│  Choose which health system to work with            │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │ 🖥️  DHIMS2                         ✅ Ready ✓│   │
│  │     District Health Information...            │   │
│  │     events.chimgh.org                         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ 🖥️  LHIMS                          ⚠️ Setup  │   │
│  │     Local Health Information...               │   │
│  │     10.10.0.59/lhims_182                      │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Each system maintains separate configurations      │
└─────────────────────────────────────────────────────┘
```

### 2. System Status Banner

Below the header, a status banner shows the current system's configuration status:

**When Configured (DHIMS2):**
```
┌─────────────────────────────────────────────────────┐
│ ✅ DHIMS2 Status                    [Configured]    │
│    events.chimgh.org                                │
│    ────────────────────────────────────────────     │
│    🕐 Last sync: Oct 23, 2025 10:30 AM              │
└─────────────────────────────────────────────────────┘
```

**When Not Configured (LHIMS):**
```
┌─────────────────────────────────────────────────────┐
│ ⚠️ LHIMS Status                     [Not Configured]│
│    10.10.0.59/lhims_182                             │
│    ────────────────────────────────────────────     │
│    Complete API discovery to start using this system│
└─────────────────────────────────────────────────────┘
```

### 3. Color Theme Changes

The extension dynamically changes its color theme based on the active system:

- **DHIMS2**: Blue theme (blue-600 to blue-700 gradient)
- **LHIMS**: Green theme (green-600 to green-700 gradient)

This provides immediate visual feedback about which system you're working with.

### 4. Updated Footer

```
┌─────────────────────────────────────────────────────┐
│  v2.0.0 | Multi-System Support: DHIMS2 & LHIMS     │
└─────────────────────────────────────────────────────┘
```

## Full UI Layout

```
┌──────────────────────────────────────────────────────────┐
│ Header (Dynamic Color)                                   │
│ 🔄 Health Data Uploader          [🖥️ SYSTEM ▼]          │
│────────────────────────────────────────────────────────│
│ System Status Banner                                     │
│ ✅/⚠️ [System] Status              [Status Badge]      │
│────────────────────────────────────────────────────────│
│ Tab Navigation                                           │
│ [🔄 Discovery] [📤 Upload] [⚙️ Settings] [🐛 Debug]    │
│────────────────────────────────────────────────────────│
│                                                          │
│                  Content Area                            │
│              (Discovery/Upload/Settings/Debug)           │
│                                                          │
│                                                          │
│────────────────────────────────────────────────────────│
│ Footer                                                   │
│ v2.0.0 | Multi-System Support: DHIMS2 & LHIMS          │
└──────────────────────────────────────────────────────────┘
```

## User Experience Flow

### Scenario 1: New User
1. Opens extension → Sees DHIMS2 selected by default (blue theme)
2. Sees orange "Not Configured" status banner
3. Completes API discovery for DHIMS2
4. Status changes to green "Configured"
5. Can now upload to DHIMS2

### Scenario 2: Switching to LHIMS
1. Clicks system selector dropdown in header
2. Sees both systems listed with their status
3. Clicks LHIMS
4. UI changes to green theme
5. Sees LHIMS status banner (not configured)
6. Completes API discovery for LHIMS
7. Can now upload to LHIMS
8. Can switch back to DHIMS2 anytime (maintains separate configs)

### Scenario 3: Configured Both Systems
1. Both systems show "Ready" badge in dropdown
2. Can switch between them seamlessly
3. Each maintains its own:
   - API endpoint configuration
   - Field mappings
   - Upload history
   - Settings

## Component Architecture

```
App.jsx (Main Container)
├── SystemSelector (Dropdown)
│   ├── System list with status badges
│   ├── Active system indicator
│   └── Configuration status per system
│
├── SystemStatus (Banner)
│   ├── Current system info
│   ├── Configuration status
│   └── Last sync timestamp
│
└── Page Components (System-aware)
    ├── Discovery (receives activeSystem prop)
    ├── Upload (receives activeSystem prop)
    ├── Settings (receives activeSystem prop)
    └── Debug (receives activeSystem prop)
```

## Props Flow

```javascript
// App.jsx state
activeSystem: 'dhims2' | 'lhims'
systemConfig: { discovered, timestamp, endpoint, ... }
apiDiscovered: boolean

// Passed to children
<Discovery activeSystem={activeSystem} />
<Upload activeSystem={activeSystem} />
<Settings activeSystem={activeSystem} />
<Debug activeSystem={activeSystem} />
```

## Key Features

✅ **Intuitive System Switching** - Click dropdown, select system, done!
✅ **Visual Status Indicators** - Know at a glance which systems are configured
✅ **Color-coded Themes** - Blue for DHIMS2, Green for LHIMS
✅ **Independent Configurations** - Each system stores its own settings
✅ **Responsive Design** - Compact and clean interface
✅ **Accessibility** - Clear visual hierarchy and status messages

## Next Steps

To make the pages fully functional with multi-system support:
1. Update Discovery page to use activeSystem prop
2. Update Upload page to use activeSystem prop
3. Update Settings page to show system-specific configs
4. Update background service worker to handle multi-system requests
5. Test system switching with real data

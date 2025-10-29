# Fix: Oh My Posh Works in One PowerShell But Not the Other

## The Problem

You have **two versions** of PowerShell installed:

1. **Windows PowerShell 5.1** (Blue icon, "Windows PowerShell" in Start menu)
   - Profile location: `C:\Users\Kelib\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
   - Oh My Posh: ✅ Works

2. **PowerShell 7+** (Black icon, "PowerShell" in Start menu, default in VS Code)
   - Profile location: `C:\Users\Kelib\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`
   - Oh My Posh: ❌ Not configured

These are **separate programs** with **separate profiles**!

---

## Quick Fix (Recommended)

### Step 1: Run the Sync Script

Open **Windows PowerShell** (the one that works) and run:

```powershell
cd C:\Users\Kelib\Desktop\projects\automake-Work
.\sync-powershell-profiles.ps1
```

This will:
- Copy your Oh My Posh configuration to both PowerShell versions
- Create matching profiles for both
- Backup your existing profiles

### Step 2: Restart VS Code

1. Close VS Code completely
2. Reopen VS Code
3. Open a new terminal (`Ctrl + ~` or `` Ctrl + ` ``)
4. Oh My Posh should now work!

---

## Manual Fix (If Script Doesn't Work)

### Option A: Copy the Profile Manually

1. Open **Windows PowerShell** (the working one)

2. Copy the working profile to PowerShell 7:

```powershell
# Create directory if needed
New-Item -Path "$env:USERPROFILE\Documents\PowerShell" -ItemType Directory -Force

# Copy the profile
Copy-Item -Path "$env:USERPROFILE\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1" `
          -Destination "$env:USERPROFILE\Documents\PowerShell\Microsoft.PowerShell_profile.ps1"
```

3. Close and reopen VS Code

---

### Option B: Create Profile from Scratch

1. Open PowerShell 7 (in VS Code terminal or from Start menu)

2. Create the profile:

```powershell
# Create directory
New-Item -Path (Split-Path $PROFILE) -ItemType Directory -Force

# Edit profile
notepad $PROFILE
```

3. Add this to the file:

```powershell
# Initialize Oh My Posh
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\atomic.omp.json" | Invoke-Expression
```

4. Save and close Notepad

5. Reload the profile:

```powershell
. $PROFILE
```

---

## Configure VS Code to Use Your Preferred PowerShell

### Check Which PowerShell VS Code Uses

In VS Code terminal, run:
```powershell
$PSVersionTable
```

You'll see either:
- `PSVersion: 5.1.x` (Windows PowerShell)
- `PSVersion: 7.x.x` (PowerShell 7+)

### Change Default PowerShell in VS Code

1. Press `Ctrl + Shift + P`
2. Type: `Preferences: Open User Settings (JSON)`
3. Add this configuration:

**To use PowerShell 7+ (recommended):**
```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.fontFamily": "CaskaydiaCove Nerd Font"
}
```

**To use Windows PowerShell 5.1:**
```json
{
  "terminal.integrated.defaultProfile.windows": "Windows PowerShell",
  "terminal.integrated.fontFamily": "CaskaydiaCove Nerd Font"
}
```

4. Save and restart VS Code

---

## Verify Both Work

### Test Windows PowerShell 5.1:
1. Open Start Menu
2. Type "Windows PowerShell"
3. Open it
4. You should see Oh My Posh prompt

### Test PowerShell 7+:
1. Open Start Menu
2. Type "PowerShell" (black icon)
3. Open it
4. You should see Oh My Posh prompt

### Test VS Code Terminal:
1. Open VS Code
2. Open terminal (`Ctrl + ~`)
3. You should see Oh My Posh prompt

---

## Understanding the Difference

| Feature | Windows PowerShell 5.1 | PowerShell 7+ |
|---------|------------------------|---------------|
| Release | 2016 (built into Windows) | 2018+ (modern, cross-platform) |
| Icon | Blue | Black/Dark blue |
| Profile Path | `WindowsPowerShell\` | `PowerShell\` |
| Default in VS Code | No | Yes (if installed) |
| Performance | Slower | Faster |
| Features | Older | Modern (better tab completion, etc.) |

**Recommendation:** Use PowerShell 7+ for development work, but keep both configured.

---

## Troubleshooting

### Problem: "oh-my-posh: command not found" in PowerShell 7

**Cause:** Oh My Posh is installed but not in PowerShell 7's PATH

**Solution:**
```powershell
# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Test
oh-my-posh --version
```

If still not found, reinstall Oh My Posh:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://ohmyposh.dev/install.ps1'))
```

---

### Problem: VS Code terminal still shows old PowerShell

**Solution:** Clear the terminal and create a new one
1. Click the trash icon in terminal panel (Kill Terminal)
2. Click the `+` icon (New Terminal)
3. Or restart VS Code

---

### Problem: Fonts look weird in VS Code but not in PowerShell

**Solution:** Configure VS Code font

1. `Ctrl + ,` to open Settings
2. Search for: `terminal.integrated.fontFamily`
3. Set to: `CaskaydiaCove Nerd Font, CascadiaCode NF`
4. Restart VS Code

---

## Quick Reference

### Profile Locations
```powershell
# Windows PowerShell 5.1
C:\Users\Kelib\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1

# PowerShell 7+
C:\Users\Kelib\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

### Useful Commands
```powershell
# Check PowerShell version
$PSVersionTable

# Edit current profile
notepad $PROFILE

# Reload profile
. $PROFILE

# Check Oh My Posh version
oh-my-posh --version

# View all themes
Get-PoshThemes
```

---

## Files Created to Help You

1. **[sync-powershell-profiles.ps1](sync-powershell-profiles.ps1)** ⭐ Run this to sync both profiles
2. **[vscode-powershell-settings.json](vscode-powershell-settings.json)** - VS Code settings reference
3. **[SIMPLE_SETUP_STEPS.md](SIMPLE_SETUP_STEPS.md)** - Original setup guide

---

**That's it! Both PowerShell versions should now have Oh My Posh working! 🎉**

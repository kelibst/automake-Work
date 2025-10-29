# Oh My Posh Setup Guide for Windows

This guide will help you set up Oh My Posh with Windows Terminal and PowerShell.

## Prerequisites

- Windows 10/11
- PowerShell 5.1 or PowerShell 7+
- Windows Terminal (recommended)
- Administrator access

---

## Method 1: Automated Setup (Recommended)

Run the provided PowerShell script:

```powershell
# Open PowerShell as Administrator
# Navigate to the project folder
cd C:\Users\Kelib\Desktop\projects\automake-Work

# Run the setup script
.\setup-ohmyposh.ps1
```

Then skip to **Step 5: Configure Windows Terminal Font**.

---

## Method 2: Manual Setup

### Step 1: Install Oh My Posh

**Option A: Using winget (recommended if available)**
```powershell
winget install JanDeDobbeleer.OhMyPosh -s winget
```

**Option B: Using PowerShell (manual installation)**
```powershell
# Download installer
Invoke-WebRequest -Uri "https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/install-amd64.exe" -OutFile "$env:TEMP\install-ohmyposh.exe"

# Run installer
Start-Process -FilePath "$env:TEMP\install-ohmyposh.exe" -Wait

# Clean up
Remove-Item "$env:TEMP\install-ohmyposh.exe"
```

**Option C: Using Scoop**
```powershell
scoop install https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/oh-my-posh.json
```

### Step 2: Install a Nerd Font

Oh My Posh requires a Nerd Font for proper icon display.

**Option A: Using Oh My Posh (easiest)**
```powershell
oh-my-posh font install CascadiaCode
```

**Option B: Manual Download**
1. Visit https://www.nerdfonts.com/font-downloads
2. Download "CaskaydiaCove Nerd Font" (Cascadia Code variant)
3. Extract the ZIP file
4. Right-click on the font files and select "Install for all users"

**Recommended fonts:**
- CascadiaCode Nerd Font (clean, Microsoft's font)
- FiraCode Nerd Font (popular with developers)
- JetBrainsMono Nerd Font (excellent readability)

### Step 3: Create PowerShell Profile

```powershell
# Check if profile exists
Test-Path $PROFILE

# If False, create the profile directory
New-Item -Path (Split-Path -Parent $PROFILE) -ItemType Directory -Force

# Create/Edit profile
notepad $PROFILE
```

Add this to your profile file:
```powershell
# Initialize Oh My Posh with default theme
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\jandedobbeleer.omp.json" | Invoke-Expression

# Optional: Enhanced command history (recommended)
Import-Module PSReadLine
Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -PredictionViewStyle ListView
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward

# Optional: Useful aliases
Set-Alias ll Get-ChildItem
Set-Alias grep Select-String

# Optional: Quick navigation
function dev { Set-Location C:\Users\Kelib\Desktop\projects }
function work { Set-Location C:\Users\Kelib\Desktop\projects\automake-Work }
```

Save and close the file.

### Step 4: Reload Profile

```powershell
# Reload your profile
. $PROFILE

# Or restart PowerShell
```

### Step 5: Configure Windows Terminal Font

1. Open Windows Terminal
2. Press `Ctrl + ,` to open Settings
3. Click on your **PowerShell** profile in the left sidebar
4. Scroll down to **Appearance**
5. Under **Font face**, select `CascadiaCode Nerd Font` (or your chosen Nerd Font)
6. Click **Save**
7. Close and reopen Windows Terminal

### Step 6: Verify Installation

```powershell
# Check Oh My Posh version
oh-my-posh --version

# View all available themes
Get-PoshThemes

# Test a specific theme
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH/atomic.omp.json" | Invoke-Expression
```

---

## Changing Themes

### Preview All Themes
```powershell
Get-PoshThemes
```

### Change Your Theme

1. Open your profile:
```powershell
notepad $PROFILE
```

2. Replace the theme path in the init line:
```powershell
# Example: Change to 'atomic' theme
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\atomic.omp.json" | Invoke-Expression
```

3. Reload your profile:
```powershell
. $PROFILE
```

### Popular Themes

- `jandedobbeleer.omp.json` - Default, feature-rich
- `atomic.omp.json` - Minimal and clean
- `powerlevel10k_rainbow.omp.json` - Colorful, git-focused
- `paradox.omp.json` - Clean with git integration
- `dracula.omp.json` - Dracula color scheme
- `night-owl.omp.json` - Dark theme
- `bubbles.omp.json` - Rounded segments

### Custom Theme Location

You can also use a custom theme file:
```powershell
oh-my-posh init pwsh --config "C:\path\to\your\theme.omp.json" | Invoke-Expression
```

---

## Troubleshooting

### Issue: "Command not found: oh-my-posh"

**Solution:** Refresh your PATH or restart PowerShell
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Issue: Icons not displaying properly

**Solutions:**
1. Ensure you installed a Nerd Font
2. Verify Windows Terminal is using the Nerd Font (Settings → Appearance → Font face)
3. Try a different Nerd Font

### Issue: Profile script errors

**Solution:** Check your profile syntax
```powershell
# Test your profile
powershell -NoProfile -File $PROFILE

# Edit and fix errors
notepad $PROFILE
```

### Issue: Slow prompt loading

**Solutions:**
1. Choose a simpler theme (e.g., `atomic.omp.json`)
2. Disable git status if not needed
3. Create a custom minimal theme

### Issue: PowerShell execution policy error

**Solution:** Allow script execution
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Advanced Configuration

### Create a Custom Theme

1. Export an existing theme:
```powershell
Copy-Item "$env:POSH_THEMES_PATH\atomic.omp.json" "$HOME\my-theme.omp.json"
```

2. Edit the theme:
```powershell
notepad "$HOME\my-theme.omp.json"
```

3. Use your custom theme:
```powershell
oh-my-posh init pwsh --config "$HOME\my-theme.omp.json" | Invoke-Expression
```

### Add Custom Segments

Edit your theme JSON to add segments like:
- Time
- Battery status
- Node.js version
- Python version
- Custom text

See: https://ohmyposh.dev/docs/configuration/segment

### Profile for Multiple Shells

Oh My Posh works with:
- PowerShell
- Windows PowerShell
- Bash (WSL)
- Zsh (WSL)
- Fish (WSL)

Each shell needs its own configuration.

---

## Useful Commands

```powershell
# Show Oh My Posh version
oh-my-posh --version

# Update Oh My Posh
winget upgrade JanDeDobbeleer.OhMyPosh

# List all themes
Get-PoshThemes

# Debug your configuration
oh-my-posh debug

# Export current config
oh-my-posh config export

# Validate theme file
oh-my-posh config validate --config path/to/theme.omp.json
```

---

## Resources

- **Official Documentation:** https://ohmyposh.dev
- **Themes Gallery:** https://ohmyposh.dev/docs/themes
- **Configuration Guide:** https://ohmyposh.dev/docs/configuration/overview
- **Nerd Fonts:** https://www.nerdfonts.com
- **Windows Terminal:** https://aka.ms/terminal

---

## Your Profile Location

```
C:\Users\Kelib\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

## Quick Reference Card

| Action | Command |
|--------|---------|
| Edit profile | `notepad $PROFILE` |
| Reload profile | `. $PROFILE` |
| View themes | `Get-PoshThemes` |
| Check version | `oh-my-posh --version` |
| Install font | `oh-my-posh font install` |
| Update Oh My Posh | `winget upgrade JanDeDobbeleer.OhMyPosh` |

---

**Enjoy your beautiful terminal! 🚀**

# Simple Oh My Posh Setup - Step by Step

Follow these steps exactly. Copy and paste each command.

---

## Step 1: Install Oh My Posh (Choose ONE method)

### Method A: Using winget (Easiest - Try this first)

```powershell
winget install JanDeDobbeleer.OhMyPosh -s winget
```

If that works, skip to **Step 2**.

---

### Method B: Using PowerShell Script (If winget doesn't work)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://ohmyposh.dev/install.ps1'))
```

---

### Method C: Manual Download (If both above fail)

1. Go to: https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest
2. Download: `install-amd64.exe`
3. Run the downloaded file
4. Follow the installer prompts

---

## Step 2: Restart PowerShell

Close PowerShell completely and open a new window as Administrator.

---

## Step 3: Verify Installation

```powershell
oh-my-posh --version
```

You should see a version number. If you get "command not found", restart PowerShell again.

---

## Step 4: Install a Nerd Font

```powershell
oh-my-posh font install
```

When prompted, choose: **CascadiaCode** (option 1 or 2)

**Or manually download:**
1. Visit: https://github.com/ryanoasis/nerd-fonts/releases/latest
2. Download: `CascadiaCode.zip`
3. Extract and install all `.ttf` files (right-click → Install)

---

## Step 5: Create PowerShell Profile

```powershell
# Check if profile exists
Test-Path $PROFILE
```

If it says **False**, create it:

```powershell
New-Item -Path $PROFILE -Type File -Force
```

---

## Step 6: Edit Profile

```powershell
notepad $PROFILE
```

Add this single line and save:

```powershell
oh-my-posh init pwsh | Invoke-Expression
```

Save the file and close Notepad.

---

## Step 7: Reload Profile

```powershell
. $PROFILE
```

You should now see a colorful prompt! But icons might not show yet...

---

## Step 8: Configure Windows Terminal Font

1. Open **Windows Terminal**
2. Press **Ctrl + ,** (comma) - this opens Settings
3. On the left, click **PowerShell** (under Profiles)
4. Scroll down to **Appearance**
5. Under **Font face**, select: **CaskaydiaCove Nerd Font** or **CascadiaCode NF**
6. Click **Save** at the bottom
7. **Close Windows Terminal completely** and reopen it

---

## Step 9: Test It!

You should now see:
- A colorful prompt
- Git branch info (if you're in a git repo)
- Icons displaying correctly

Try:
```powershell
cd C:\Users\Kelib\Desktop\projects\automake-Work
```

You should see git branch information!

---

## Troubleshooting

### Problem: "oh-my-posh: command not found"

**Solution:**
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

Or restart PowerShell.

---

### Problem: Icons show as boxes or weird characters

**Solutions:**
1. Make sure you installed a Nerd Font (Step 4)
2. Make sure Windows Terminal is using the Nerd Font (Step 8)
3. Try a different Nerd Font: `oh-my-posh font install`

---

### Problem: Profile errors when starting PowerShell

**Solution:**
```powershell
# Edit profile and fix any typos
notepad $PROFILE

# Test profile manually
& $PROFILE
```

---

### Problem: Execution policy error

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Change Theme (Optional)

### See all themes:
```powershell
Get-PoshThemes
```

### To use a different theme:

1. Edit your profile:
```powershell
notepad $PROFILE
```

2. Replace the line with one of these:

```powershell
# Minimal theme
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\atomic.omp.json" | Invoke-Expression

# Colorful theme
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\powerlevel10k_rainbow.omp.json" | Invoke-Expression

# Clean theme
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\paradox.omp.json" | Invoke-Expression
```

3. Save and reload:
```powershell
. $PROFILE
```

---

## Popular Themes to Try

| Theme Name | Style |
|------------|-------|
| `atomic` | Minimal, clean |
| `paradox` | Clean with git |
| `jandedobbeleer` | Feature-rich (default) |
| `powerlevel10k_rainbow` | Colorful |
| `dracula` | Dark purple theme |
| `night-owl` | Dark blue theme |
| `bubbles` | Rounded segments |

---

## Your Profile Location

```
C:\Users\Kelib\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
```

Or for Windows PowerShell 5.1:
```
C:\Users\Kelib\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1
```

---

## Quick Commands Reference

```powershell
# Edit profile
notepad $PROFILE

# Reload profile
. $PROFILE

# Check version
oh-my-posh --version

# View all themes
Get-PoshThemes

# Install font
oh-my-posh font install

# Debug
oh-my-posh debug
```

---

## That's it! Enjoy your beautiful terminal! 🎨✨

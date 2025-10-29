# Sync Oh My Posh Configuration Between PowerShell Versions
# This fixes the issue where Oh My Posh works in one PowerShell but not the other

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PowerShell Profile Sync Tool" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Detect PowerShell version
$psVersion = $PSVersionTable.PSVersion.Major
Write-Host "Current PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
Write-Host "Edition: $($PSVersionTable.PSEdition)" -ForegroundColor Yellow
Write-Host ""

# Define profile paths for both versions
$pwsh5Profile = "$env:USERPROFILE\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
$pwsh7Profile = "$env:USERPROFILE\Documents\PowerShell\Microsoft.PowerShell_profile.ps1"

Write-Host "Profile Locations:" -ForegroundColor Yellow
Write-Host "  Windows PowerShell 5.1: $pwsh5Profile" -ForegroundColor Gray
Write-Host "  PowerShell 7+:          $pwsh7Profile" -ForegroundColor Gray
Write-Host ""

# Check which profiles exist
Write-Host "Checking existing profiles..." -ForegroundColor Yellow
$pwsh5Exists = Test-Path $pwsh5Profile
$pwsh7Exists = Test-Path $pwsh7Profile

Write-Host "  Windows PowerShell 5.1: $(if($pwsh5Exists){'EXISTS ✓'}else{'NOT FOUND ✗'})" -ForegroundColor $(if($pwsh5Exists){'Green'}else{'Red'})
Write-Host "  PowerShell 7+:          $(if($pwsh7Exists){'EXISTS ✓'}else{'NOT FOUND ✗'})" -ForegroundColor $(if($pwsh7Exists){'Green'}else{'Red'})
Write-Host ""

# Show contents of existing profiles
if ($pwsh5Exists) {
    Write-Host "Windows PowerShell 5.1 Profile Contents:" -ForegroundColor Cyan
    Write-Host "---" -ForegroundColor Gray
    Get-Content $pwsh5Profile | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}

if ($pwsh7Exists) {
    Write-Host "PowerShell 7+ Profile Contents:" -ForegroundColor Cyan
    Write-Host "---" -ForegroundColor Gray
    Get-Content $pwsh7Profile | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}

# Test Oh My Posh availability
Write-Host "Testing Oh My Posh..." -ForegroundColor Yellow
$ohMyPoshAvailable = Get-Command oh-my-posh -ErrorAction SilentlyContinue

if ($ohMyPoshAvailable) {
    Write-Host "  Oh My Posh: FOUND ✓" -ForegroundColor Green
    $ohMyPoshPath = $ohMyPoshAvailable.Source
    Write-Host "  Location: $ohMyPoshPath" -ForegroundColor Gray

    try {
        $version = & oh-my-posh --version
        Write-Host "  Version: $version" -ForegroundColor Gray
    } catch {
        Write-Host "  Version: Unable to determine" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Oh My Posh: NOT FOUND ✗" -ForegroundColor Red
    Write-Host ""
    Write-Host "ERROR: Oh My Posh is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Oh My Posh first:" -ForegroundColor Yellow
    Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://ohmyposh.dev/install.ps1'))" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Create a universal profile that works for both versions
$universalProfile = @'
# Oh My Posh Configuration
# This profile works for both Windows PowerShell 5.1 and PowerShell 7+

# Initialize Oh My Posh
if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
    try {
        # Use atomic theme (fast and clean) or change to your preferred theme
        oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\atomic.omp.json" | Invoke-Expression
    } catch {
        Write-Host "Error loading Oh My Posh: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Oh My Posh not found. Install from: https://ohmyposh.dev" -ForegroundColor Yellow
}

# Enhanced PSReadLine (if available)
if (Get-Module -ListAvailable -Name PSReadLine) {
    Import-Module PSReadLine -ErrorAction SilentlyContinue
    Set-PSReadLineOption -PredictionSource History -ErrorAction SilentlyContinue
    Set-PSReadLineOption -PredictionViewStyle ListView -ErrorAction SilentlyContinue
}

# Useful aliases
Set-Alias -Name ll -Value Get-ChildItem -ErrorAction SilentlyContinue
Set-Alias -Name which -Value Get-Command -ErrorAction SilentlyContinue

# Quick navigation functions
function dev { Set-Location C:\Users\Kelib\Desktop\projects }
function work { Set-Location C:\Users\Kelib\Desktop\projects\automake-Work }
function dhims { Set-Location C:\Users\Kelib\Desktop\projects\automake-Work\dhims2-chrome-extension }
'@

Write-Host "Creating/Updating profiles..." -ForegroundColor Yellow

# Ensure directories exist
$pwsh5Dir = Split-Path -Parent $pwsh5Profile
$pwsh7Dir = Split-Path -Parent $pwsh7Profile

if (!(Test-Path $pwsh5Dir)) {
    New-Item -Path $pwsh5Dir -ItemType Directory -Force | Out-Null
    Write-Host "  Created directory: $pwsh5Dir" -ForegroundColor Gray
}

if (!(Test-Path $pwsh7Dir)) {
    New-Item -Path $pwsh7Dir -ItemType Directory -Force | Out-Null
    Write-Host "  Created directory: $pwsh7Dir" -ForegroundColor Gray
}

# Backup existing profiles
if ($pwsh5Exists) {
    $backup5 = "$pwsh5Profile.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path $pwsh5Profile -Destination $backup5
    Write-Host "  Backed up PowerShell 5.1 profile to: $backup5" -ForegroundColor Gray
}

if ($pwsh7Exists) {
    $backup7 = "$pwsh7Profile.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path $pwsh7Profile -Destination $backup7
    Write-Host "  Backed up PowerShell 7+ profile to: $backup7" -ForegroundColor Gray
}

# Write the universal profile to both locations
Set-Content -Path $pwsh5Profile -Value $universalProfile -Encoding UTF8
Write-Host "  ✓ Updated Windows PowerShell 5.1 profile" -ForegroundColor Green

Set-Content -Path $pwsh7Profile -Value $universalProfile -Encoding UTF8
Write-Host "  ✓ Updated PowerShell 7+ profile" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Sync Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Close ALL PowerShell windows (including VS Code terminal)" -ForegroundColor White
Write-Host "2. Reopen VS Code" -ForegroundColor White
Write-Host "3. Open a new terminal in VS Code" -ForegroundColor White
Write-Host "4. Oh My Posh should now work in both versions!" -ForegroundColor White
Write-Host ""

Write-Host "To change themes, edit either profile file:" -ForegroundColor Yellow
Write-Host "  notepad `$PROFILE" -ForegroundColor Gray
Write-Host ""

Write-Host "Popular themes to try:" -ForegroundColor Yellow
Write-Host "  - atomic.omp.json (current - minimal)" -ForegroundColor Gray
Write-Host "  - jandedobbeleer.omp.json (feature-rich)" -ForegroundColor Gray
Write-Host "  - paradox.omp.json (clean)" -ForegroundColor Gray
Write-Host "  - powerlevel10k_rainbow.omp.json (colorful)" -ForegroundColor Gray
Write-Host ""

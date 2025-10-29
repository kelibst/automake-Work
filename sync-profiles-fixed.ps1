# Sync Oh My Posh Between PowerShell Versions - Fixed Version

Write-Host "PowerShell Profile Sync Tool" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Profile paths
$pwsh5Profile = "$env:USERPROFILE\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
$pwsh7Profile = "$env:USERPROFILE\Documents\PowerShell\Microsoft.PowerShell_profile.ps1"

Write-Host "Profile Locations:" -ForegroundColor Yellow
Write-Host "  Windows PowerShell 5.1: $pwsh5Profile" -ForegroundColor Gray
Write-Host "  PowerShell 7+:          $pwsh7Profile" -ForegroundColor Gray
Write-Host ""

# Check which profiles exist
$pwsh5Exists = Test-Path $pwsh5Profile
$pwsh7Exists = Test-Path $pwsh7Profile

if ($pwsh5Exists) {
    Write-Host "Windows PowerShell 5.1 profile: EXISTS" -ForegroundColor Green
} else {
    Write-Host "Windows PowerShell 5.1 profile: NOT FOUND" -ForegroundColor Red
}

if ($pwsh7Exists) {
    Write-Host "PowerShell 7+ profile: EXISTS" -ForegroundColor Green
} else {
    Write-Host "PowerShell 7+ profile: NOT FOUND" -ForegroundColor Yellow
}

Write-Host ""

# Test Oh My Posh
Write-Host "Testing Oh My Posh..." -ForegroundColor Yellow
$ohMyPoshCmd = Get-Command oh-my-posh -ErrorAction SilentlyContinue

if ($ohMyPoshCmd) {
    Write-Host "Oh My Posh: FOUND" -ForegroundColor Green
    Write-Host "Location: $($ohMyPoshCmd.Source)" -ForegroundColor Gray
} else {
    Write-Host "ERROR: Oh My Posh not found!" -ForegroundColor Red
    Write-Host "Install it first with:" -ForegroundColor Yellow
    Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://ohmyposh.dev/install.ps1'))" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Create universal profile content
$profileContent = @'
# Oh My Posh Configuration

if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
    try {
        oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\atomic.omp.json" | Invoke-Expression
    } catch {
        Write-Host "Error loading Oh My Posh: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Oh My Posh not found" -ForegroundColor Yellow
}

# Enhanced PSReadLine
if (Get-Module -ListAvailable -Name PSReadLine) {
    Import-Module PSReadLine -ErrorAction SilentlyContinue
    Set-PSReadLineOption -PredictionSource History -ErrorAction SilentlyContinue
    Set-PSReadLineOption -PredictionViewStyle ListView -ErrorAction SilentlyContinue
}

# Aliases
Set-Alias -Name ll -Value Get-ChildItem -ErrorAction SilentlyContinue

# Functions
function dev { Set-Location C:\Users\Kelib\Desktop\projects }
function work { Set-Location C:\Users\Kelib\Desktop\projects\automake-Work }
function dhims { Set-Location C:\Users\Kelib\Desktop\projects\automake-Work\dhims2-chrome-extension }
'@

Write-Host "Creating profiles..." -ForegroundColor Yellow

# Create directories if needed
$pwsh5Dir = Split-Path -Parent $pwsh5Profile
$pwsh7Dir = Split-Path -Parent $pwsh7Profile

if (!(Test-Path $pwsh5Dir)) {
    New-Item -Path $pwsh5Dir -ItemType Directory -Force | Out-Null
}

if (!(Test-Path $pwsh7Dir)) {
    New-Item -Path $pwsh7Dir -ItemType Directory -Force | Out-Null
}

# Backup existing profiles
if ($pwsh5Exists) {
    $backup = "$pwsh5Profile.backup"
    Copy-Item -Path $pwsh5Profile -Destination $backup -Force
    Write-Host "Backed up PowerShell 5.1 profile" -ForegroundColor Gray
}

if ($pwsh7Exists) {
    $backup = "$pwsh7Profile.backup"
    Copy-Item -Path $pwsh7Profile -Destination $backup -Force
    Write-Host "Backed up PowerShell 7+ profile" -ForegroundColor Gray
}

# Write profiles
Set-Content -Path $pwsh5Profile -Value $profileContent -Encoding UTF8
Write-Host "Created PowerShell 5.1 profile" -ForegroundColor Green

Set-Content -Path $pwsh7Profile -Value $profileContent -Encoding UTF8
Write-Host "Created PowerShell 7+ profile" -ForegroundColor Green

Write-Host ""
Write-Host "============================" -ForegroundColor Cyan
Write-Host "Sync Complete!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Close ALL PowerShell windows" -ForegroundColor White
Write-Host "2. Close VS Code" -ForegroundColor White
Write-Host "3. Reopen VS Code" -ForegroundColor White
Write-Host "4. Open terminal - Oh My Posh should work!" -ForegroundColor White
Write-Host ""

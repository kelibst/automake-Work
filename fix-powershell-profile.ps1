# PowerShell Profile Fix Script
# This will fix the exit code -1 error

Write-Host "PowerShell Profile Fix Tool" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Get profile path
$profilePath = $PROFILE
Write-Host "Profile location: $profilePath" -ForegroundColor Yellow
Write-Host ""

# Check if profile exists and show contents
if (Test-Path $profilePath) {
    Write-Host "Current profile contents:" -ForegroundColor Yellow
    Write-Host "---" -ForegroundColor Gray
    Get-Content $profilePath
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""

    # Backup the profile
    $backupPath = "$profilePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path $profilePath -Destination $backupPath
    Write-Host "Backed up to: $backupPath" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "No profile found." -ForegroundColor Yellow
    Write-Host ""
}

# Test if oh-my-posh is accessible
Write-Host "Testing Oh My Posh installation..." -ForegroundColor Yellow
try {
    $ohMyPoshPath = Get-Command oh-my-posh -ErrorAction Stop
    Write-Host "Oh My Posh found at: $($ohMyPoshPath.Source)" -ForegroundColor Green

    $version = & oh-my-posh --version 2>&1
    Write-Host "Version: $version" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Oh My Posh NOT found in PATH!" -ForegroundColor Red
    Write-Host "This is likely causing the error." -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution: Oh My Posh needs to be installed first." -ForegroundColor Yellow
    Write-Host ""

    # Offer to remove the profile
    Write-Host "Would you like to:" -ForegroundColor Yellow
    Write-Host "1. Remove the profile (stop the error)" -ForegroundColor White
    Write-Host "2. Keep the profile (for after installing Oh My Posh)" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Enter 1 or 2"

    if ($choice -eq "1") {
        Remove-Item $profilePath -Force
        Write-Host "Profile removed. PowerShell should start normally now." -ForegroundColor Green
        Write-Host ""
        Write-Host "After installing Oh My Posh, run this script again to recreate the profile." -ForegroundColor Yellow
    } else {
        Write-Host "Profile kept. Please install Oh My Posh first." -ForegroundColor Yellow
    }
    exit
}

# Create a safe profile
Write-Host "Creating a safe profile configuration..." -ForegroundColor Yellow

$safeProfile = @'
# Oh My Posh Profile Configuration
# Safe version with error handling

# Check if Oh My Posh is installed before trying to use it
if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
    try {
        # Initialize Oh My Posh with a simple theme
        oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\atomic.omp.json" | Invoke-Expression
    } catch {
        Write-Host "Error loading Oh My Posh: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Oh My Posh not found. Install it first." -ForegroundColor Yellow
}

# Optional: Enhanced command history
if (Get-Module -ListAvailable -Name PSReadLine) {
    Import-Module PSReadLine -ErrorAction SilentlyContinue
    Set-PSReadLineOption -PredictionSource History -ErrorAction SilentlyContinue
    Set-PSReadLineOption -PredictionViewStyle ListView -ErrorAction SilentlyContinue
}
'@

# Ensure profile directory exists
$profileDir = Split-Path -Parent $profilePath
if (!(Test-Path $profileDir)) {
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
}

# Write the safe profile
Set-Content -Path $profilePath -Value $safeProfile -Encoding UTF8
Write-Host "Safe profile created!" -ForegroundColor Green
Write-Host ""

Write-Host "Testing the new profile..." -ForegroundColor Yellow
try {
    # Test the profile in a new process
    $testResult = powershell -NoExit -Command "& { . '$profilePath'; Write-Host 'Profile loaded successfully'; exit }" 2>&1
    Write-Host "Profile test result: $testResult" -ForegroundColor Green
} catch {
    Write-Host "Profile test failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================" -ForegroundColor Cyan
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close ALL PowerShell windows" -ForegroundColor White
Write-Host "2. Open a new PowerShell window" -ForegroundColor White
Write-Host "3. It should start without errors now" -ForegroundColor White
Write-Host ""

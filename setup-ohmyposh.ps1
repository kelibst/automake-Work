# Oh My Posh Setup Script for Windows PowerShell
# Run this script in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Oh My Posh Setup for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Oh My Posh
Write-Host "Step 1: Installing Oh My Posh..." -ForegroundColor Yellow

try {
    # Try using winget first
    Write-Host "Attempting to install via winget..." -ForegroundColor Gray
    winget install JanDeDobbeleer.OhMyPosh -s winget
} catch {
    # Fallback to manual installation
    Write-Host "Winget not available. Installing manually..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/install-amd64.exe" -OutFile "$env:TEMP\install-ohmyposh.exe"
    Start-Process -FilePath "$env:TEMP\install-ohmyposh.exe" -Wait
    Remove-Item "$env:TEMP\install-ohmyposh.exe"
}

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Oh My Posh installed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Install a Nerd Font
Write-Host "Step 2: Installing Nerd Font (Cascadia Code)..." -ForegroundColor Yellow
Write-Host "This font is required for proper icon display." -ForegroundColor Gray

try {
    oh-my-posh font install CascadiaCode
    Write-Host "Font installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Please install manually: https://www.nerdfonts.com/font-downloads" -ForegroundColor Red
}

Write-Host ""

# Step 3: Create PowerShell Profile
Write-Host "Step 3: Configuring PowerShell Profile..." -ForegroundColor Yellow

$profilePath = $PROFILE
$profileDir = Split-Path -Parent $profilePath

# Create profile directory if it doesn't exist
if (!(Test-Path $profileDir)) {
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
    Write-Host "Created profile directory: $profileDir" -ForegroundColor Gray
}

# Backup existing profile if it exists
if (Test-Path $profilePath) {
    $backupPath = "$profilePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path $profilePath -Destination $backupPath
    Write-Host "Backed up existing profile to: $backupPath" -ForegroundColor Gray
}

# Create new profile with Oh My Posh initialization
$profileContent = @'
# Oh My Posh Configuration
# Initialize Oh My Posh with a theme
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\jandedobbeleer.omp.json" | Invoke-Expression

# Optional: Add custom aliases and functions below
# Example:
# Set-Alias ll Get-ChildItem
# function dev { cd C:\Users\Kelib\Desktop\projects }

# Optional: Import useful modules
# Import-Module PSReadLine
# Set-PSReadLineOption -PredictionSource History
# Set-PSReadLineOption -PredictionViewStyle ListView
'@

Set-Content -Path $profilePath -Value $profileContent -Encoding UTF8
Write-Host "PowerShell profile created: $profilePath" -ForegroundColor Green
Write-Host ""

# Step 4: Show available themes
Write-Host "Step 4: Available Themes" -ForegroundColor Yellow
Write-Host "You can preview themes with: Get-PoshThemes" -ForegroundColor Gray
Write-Host "Popular themes:" -ForegroundColor Gray
Write-Host "  - jandedobbeleer.omp.json (default, feature-rich)" -ForegroundColor Gray
Write-Host "  - powerlevel10k_rainbow.omp.json (colorful)" -ForegroundColor Gray
Write-Host "  - atomic.omp.json (minimal)" -ForegroundColor Gray
Write-Host "  - paradox.omp.json (clean)" -ForegroundColor Gray
Write-Host ""

# Step 5: Windows Terminal Configuration
Write-Host "Step 5: Windows Terminal Configuration" -ForegroundColor Yellow
$wtSettingsPath = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"

if (Test-Path $wtSettingsPath) {
    Write-Host "Windows Terminal detected!" -ForegroundColor Green
    Write-Host "To complete setup:" -ForegroundColor Yellow
    Write-Host "1. Open Windows Terminal Settings (Ctrl+,)" -ForegroundColor Gray
    Write-Host "2. Click on your PowerShell profile" -ForegroundColor Gray
    Write-Host "3. Under 'Appearance' -> 'Font face', select 'CascadiaCode Nerd Font'" -ForegroundColor Gray
    Write-Host "4. Save and restart Windows Terminal" -ForegroundColor Gray
} else {
    Write-Host "Windows Terminal not found. Install from Microsoft Store." -ForegroundColor Red
    Write-Host "https://aka.ms/terminal" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell/Windows Terminal" -ForegroundColor White
Write-Host "2. Run 'Get-PoshThemes' to see all available themes" -ForegroundColor White
Write-Host "3. Edit your profile to change theme:" -ForegroundColor White
Write-Host "   notepad `$PROFILE" -ForegroundColor Gray
Write-Host ""
Write-Host "Enjoy your new prompt! 🎉" -ForegroundColor Green

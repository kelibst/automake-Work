# Quick Start Script for Oh My Posh
# This is a simpler version - just run this in PowerShell (as Administrator)

Write-Host "Starting Oh My Posh Quick Setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Oh My Posh using the installer
Write-Host "[1/4] Installing Oh My Posh..." -ForegroundColor Yellow
try {
    # Download and run installer
    $installerPath = "$env:TEMP\install-ohmyposh.exe"
    Write-Host "Downloading installer..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/install-amd64.exe" -OutFile $installerPath

    Write-Host "Running installer..." -ForegroundColor Gray
    Start-Process -FilePath $installerPath -Wait -NoNewWindow

    Remove-Item $installerPath -ErrorAction SilentlyContinue
    Write-Host "Oh My Posh installed!" -ForegroundColor Green
} catch {
    Write-Host "Error installing Oh My Posh: $_" -ForegroundColor Red
    Write-Host "Please install manually from: https://ohmyposh.dev/docs/installation/windows" -ForegroundColor Yellow
    exit
}

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host ""

# Step 2: Install Nerd Font
Write-Host "[2/4] Installing Nerd Font..." -ForegroundColor Yellow
try {
    & oh-my-posh font install CascadiaCode
    Write-Host "Font installed!" -ForegroundColor Green
} catch {
    Write-Host "Could not install font automatically." -ForegroundColor Yellow
    Write-Host "Please download manually: https://www.nerdfonts.com/font-downloads" -ForegroundColor Gray
}

Write-Host ""

# Step 3: Create PowerShell Profile
Write-Host "[3/4] Creating PowerShell Profile..." -ForegroundColor Yellow

$profilePath = $PROFILE
$profileDir = Split-Path -Parent $profilePath

# Create directory if needed
if (!(Test-Path $profileDir)) {
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
}

# Backup existing profile
if (Test-Path $profilePath) {
    $backupPath = "$profilePath.backup"
    Copy-Item -Path $profilePath -Destination $backupPath -Force
    Write-Host "Existing profile backed up to: $backupPath" -ForegroundColor Gray
}

# Create profile content
$profileContent = @'
# Oh My Posh initialization
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\jandedobbeleer.omp.json" | Invoke-Expression

# Optional: Enhanced PSReadLine for better command history
if ($host.Name -eq 'ConsoleHost') {
    Import-Module PSReadLine
    Set-PSReadLineOption -PredictionSource History
    Set-PSReadLineOption -PredictionViewStyle ListView
}
'@

Set-Content -Path $profilePath -Value $profileContent -Encoding UTF8
Write-Host "Profile created at: $profilePath" -ForegroundColor Green

Write-Host ""

# Step 4: Instructions
Write-Host "[4/4] Final Steps" -ForegroundColor Yellow
Write-Host "To complete setup:" -ForegroundColor White
Write-Host ""
Write-Host "1. CONFIGURE FONT IN WINDOWS TERMINAL:" -ForegroundColor Cyan
Write-Host "   - Open Windows Terminal" -ForegroundColor Gray
Write-Host "   - Press Ctrl + , (to open Settings)" -ForegroundColor Gray
Write-Host "   - Click on 'PowerShell' profile" -ForegroundColor Gray
Write-Host "   - Scroll to 'Appearance' section" -ForegroundColor Gray
Write-Host "   - Change 'Font face' to: CascadiaCode Nerd Font" -ForegroundColor Gray
Write-Host "   - Click 'Save'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. RESTART WINDOWS TERMINAL" -ForegroundColor Cyan
Write-Host "   Close and reopen Windows Terminal completely" -ForegroundColor Gray
Write-Host ""
Write-Host "3. VERIFY IT'S WORKING:" -ForegroundColor Cyan
Write-Host "   Run: oh-my-posh --version" -ForegroundColor Gray
Write-Host ""
Write-Host "4. EXPLORE THEMES (optional):" -ForegroundColor Cyan
Write-Host "   Run: Get-PoshThemes" -ForegroundColor Gray
Write-Host ""

Write-Host "Setup complete! 🎉" -ForegroundColor Green
Write-Host ""
Write-Host "For detailed guide, see: OHMYPOSH_SETUP_GUIDE.md" -ForegroundColor Yellow

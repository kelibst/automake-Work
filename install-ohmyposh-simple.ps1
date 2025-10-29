# Simple Oh My Posh Installer for Windows
# Run as Administrator

Write-Host "Oh My Posh Installation Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Method 1: Try winget first
Write-Host "Checking for winget..." -ForegroundColor Yellow
$wingetPath = Get-Command winget -ErrorAction SilentlyContinue

if ($wingetPath) {
    Write-Host "Found winget! Installing Oh My Posh..." -ForegroundColor Green
    try {
        winget install JanDeDobbeleer.OhMyPosh -s winget --accept-package-agreements --accept-source-agreements
        Write-Host "Oh My Posh installed successfully via winget!" -ForegroundColor Green
        $installed = $true
    } catch {
        Write-Host "Winget installation failed, trying alternative method..." -ForegroundColor Yellow
        $installed = $false
    }
} else {
    Write-Host "Winget not found, trying alternative method..." -ForegroundColor Yellow
    $installed = $false
}

# Method 2: Manual installation using PowerShell
if (-not $installed) {
    Write-Host ""
    Write-Host "Installing Oh My Posh manually..." -ForegroundColor Yellow

    try {
        # Set up installation directory
        $installDir = "$env:LOCALAPPDATA\Programs\oh-my-posh\bin"
        if (!(Test-Path $installDir)) {
            New-Item -Path $installDir -ItemType Directory -Force | Out-Null
        }

        # Download the executable directly
        $ohMyPoshExe = "$installDir\oh-my-posh.exe"
        Write-Host "Downloading Oh My Posh executable..." -ForegroundColor Gray

        # Use the direct download URL for the latest version
        $downloadUrl = "https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/posh-windows-amd64.exe"

        Invoke-WebRequest -Uri $downloadUrl -OutFile $ohMyPoshExe -UseBasicParsing

        Write-Host "Downloaded successfully!" -ForegroundColor Green

        # Download themes
        Write-Host "Downloading themes..." -ForegroundColor Gray
        $themesDir = "$installDir\themes"
        if (!(Test-Path $themesDir)) {
            New-Item -Path $themesDir -ItemType Directory -Force | Out-Null
        }

        $themesUrl = "https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/themes.zip"
        $themesZip = "$env:TEMP\ohmyposh-themes.zip"

        Invoke-WebRequest -Uri $themesUrl -OutFile $themesZip -UseBasicParsing
        Expand-Archive -Path $themesZip -DestinationPath $themesDir -Force
        Remove-Item $themesZip -Force

        Write-Host "Themes downloaded!" -ForegroundColor Green

        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notlike "*$installDir*") {
            Write-Host "Adding Oh My Posh to PATH..." -ForegroundColor Gray
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installDir", "User")
            $env:Path += ";$installDir"
        }

        # Set POSH_THEMES_PATH environment variable
        [Environment]::SetEnvironmentVariable("POSH_THEMES_PATH", $themesDir, "User")
        $env:POSH_THEMES_PATH = $themesDir

        Write-Host "Oh My Posh installed successfully!" -ForegroundColor Green
        $installed = $true

    } catch {
        Write-Host "Error during manual installation: $_" -ForegroundColor Red
        $installed = $false
    }
}

if (-not $installed) {
    Write-Host ""
    Write-Host "Automatic installation failed. Please install manually:" -ForegroundColor Red
    Write-Host "1. Visit: https://ohmyposh.dev/docs/installation/windows" -ForegroundColor Yellow
    Write-Host "2. Or use Scoop: scoop install https://github.com/JanDeDobbeleer/oh-my-posh/releases/latest/download/oh-my-posh.json" -ForegroundColor Yellow
    exit 1
}

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $version = & oh-my-posh --version
    Write-Host "Oh My Posh version: $version" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not verify installation. Please restart your terminal." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen PowerShell" -ForegroundColor White
Write-Host "2. Run: oh-my-posh font install CascadiaCode" -ForegroundColor White
Write-Host "3. Run: notepad `$PROFILE" -ForegroundColor White
Write-Host "4. Add this line to your profile:" -ForegroundColor White
Write-Host "   oh-my-posh init pwsh | Invoke-Expression" -ForegroundColor Gray
Write-Host ""

@echo off
REM Emergency PowerShell Profile Fix
REM This removes the problematic profile so PowerShell can start

echo ========================================
echo PowerShell Emergency Fix
echo ========================================
echo.

echo This will remove your PowerShell profile to fix the startup error.
echo Your profile will be backed up first.
echo.
pause

REM Backup and remove PowerShell 7/Core profile
if exist "%USERPROFILE%\Documents\PowerShell\Microsoft.PowerShell_profile.ps1" (
    echo Backing up PowerShell Core profile...
    copy "%USERPROFILE%\Documents\PowerShell\Microsoft.PowerShell_profile.ps1" "%USERPROFILE%\Documents\PowerShell\Microsoft.PowerShell_profile.ps1.backup"
    del "%USERPROFILE%\Documents\PowerShell\Microsoft.PowerShell_profile.ps1"
    echo PowerShell Core profile removed.
)

REM Backup and remove Windows PowerShell 5.1 profile
if exist "%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1" (
    echo Backing up Windows PowerShell profile...
    copy "%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1" "%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1.backup"
    del "%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
    echo Windows PowerShell profile removed.
)

echo.
echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo Your PowerShell profile has been backed up and removed.
echo PowerShell should now start without errors.
echo.
echo Backups are in:
echo   %USERPROFILE%\Documents\PowerShell\ (with .backup extension)
echo   %USERPROFILE%\Documents\WindowsPowerShell\ (with .backup extension)
echo.
echo Try opening PowerShell now!
echo.
pause

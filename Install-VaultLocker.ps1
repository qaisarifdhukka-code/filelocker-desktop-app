# VaultLocker Installer Script
# Run as Administrator

$AppName     = "VaultLocker"
$AppVersion  = "1.0.0"
$Publisher   = "VaultLocker"
$InstallDir  = "$env:ProgramFiles\$AppName"
$ExePath     = "$InstallDir\VaultLocker.exe"
$UninstPath  = "$InstallDir\Uninstall-VaultLocker.ps1"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  VaultLocker $AppVersion Installer" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check Admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceDir = Join-Path $ScriptDir "dist\win-unpacked"

if (-not (Test-Path $SourceDir)) {
    Write-Host "ERROR: Could not find app files at: $SourceDir" -ForegroundColor Red
    Write-Host "Please run 'npm run dist' first." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Remove old installation if exists
if (Test-Path $InstallDir) {
    Write-Host "Removing previous installation..." -ForegroundColor Yellow
    Remove-Item -Path $InstallDir -Recurse -Force
}

# Copy files
Write-Host "Installing to $InstallDir ..." -ForegroundColor Green
Copy-Item -Path $SourceDir -Destination $InstallDir -Recurse -Force
Write-Host "Files copied successfully." -ForegroundColor Green

# Create uninstaller script
$UninstallScript = @"
# VaultLocker Uninstaller
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red; Read-Host; exit 1
}
Write-Host "Uninstalling VaultLocker..." -ForegroundColor Yellow
# Remove shortcuts
`$Desktop = [Environment]::GetFolderPath('Desktop')
`$StartMenu = [Environment]::GetFolderPath('CommonPrograms')
Remove-Item "`$Desktop\VaultLocker.lnk" -Force -ErrorAction SilentlyContinue
Remove-Item "`$StartMenu\VaultLocker\VaultLocker.lnk" -Force -ErrorAction SilentlyContinue
Remove-Item "`$StartMenu\VaultLocker" -Force -Recurse -ErrorAction SilentlyContinue
# Remove registry entry
Remove-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\VaultLocker" -Name * -ErrorAction SilentlyContinue
Remove-Item -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\VaultLocker" -Force -ErrorAction SilentlyContinue
# Remove files
Remove-Item -Path "$InstallDir" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "VaultLocker has been uninstalled successfully." -ForegroundColor Green
Read-Host "Press Enter to close"
"@
Set-Content -Path $UninstPath -Value $UninstallScript -Encoding UTF8

# Create Desktop shortcut
Write-Host "Creating Desktop shortcut..." -ForegroundColor Green
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\$AppName.lnk")
$Shortcut.TargetPath = $ExePath
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "VaultLocker - USB Encryption Tool"
$Shortcut.Save()

# Create Start Menu shortcut
Write-Host "Creating Start Menu shortcut..." -ForegroundColor Green
$StartMenu = [Environment]::GetFolderPath('CommonPrograms')
$StartMenuFolder = "$StartMenu\$AppName"
if (-not (Test-Path $StartMenuFolder)) { New-Item -ItemType Directory -Path $StartMenuFolder | Out-Null }
$SMShortcut = $WshShell.CreateShortcut("$StartMenuFolder\$AppName.lnk")
$SMShortcut.TargetPath = $ExePath
$SMShortcut.WorkingDirectory = $InstallDir
$SMShortcut.Description = "VaultLocker - USB Encryption Tool"
$SMShortcut.Save()

# Register in Add/Remove Programs
Write-Host "Registering in Installed Apps..." -ForegroundColor Green
$RegPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppName"
New-Item -Path $RegPath -Force | Out-Null
Set-ItemProperty -Path $RegPath -Name "DisplayName"          -Value $AppName
Set-ItemProperty -Path $RegPath -Name "DisplayVersion"       -Value $AppVersion
Set-ItemProperty -Path $RegPath -Name "Publisher"            -Value $Publisher
Set-ItemProperty -Path $RegPath -Name "InstallLocation"      -Value $InstallDir
Set-ItemProperty -Path $RegPath -Name "DisplayIcon"          -Value $ExePath
Set-ItemProperty -Path $RegPath -Name "UninstallString"      -Value "powershell.exe -ExecutionPolicy Bypass -File `"$UninstPath`""
Set-ItemProperty -Path $RegPath -Name "NoModify"             -Value 1 -Type DWord
Set-ItemProperty -Path $RegPath -Name "NoRepair"             -Value 1 -Type DWord

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  VaultLocker installed successfully!" -ForegroundColor Green
Write-Host "  Shortcut created on your Desktop." -ForegroundColor Green
Write-Host "  You can uninstall from Settings > Apps." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"

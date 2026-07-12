; VaultLocker Inno Setup Script
; Creates a professional Windows installer for VaultLocker
; Compile this with Inno Setup: https://jrsoftware.org/isdl.php

#define MyAppName "VaultLocker"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "VaultLocker"
#define MyAppURL "https://vaultlocker.app"
#define MyAppExeName "VaultLocker.exe"
#define MyAppDescription "USB Vault Encryption Tool"

[Setup]
; Unique app ID - do not change once published
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
AppComments={#MyAppDescription}

; Install to Program Files
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}

; Allow user to choose install directory
DisableProgramGroupPage=yes
AllowNoIcons=no

; Output installer file settings
OutputDir=.\installer-output
OutputBaseFilename=VaultLocker-Setup-1.0.0

; Compression - lzma2 is efficient and 64-bit (no mmap crash!)
Compression=lzma2/ultra64
SolidCompression=yes

; Require admin privileges for Program Files installation
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Show install wizard pages
WizardStyle=modern
WizardSmallImageFile=

; License file (optional - comment out if you don't have one)
; LicenseFile=LICENSE.txt

; Minimum Windows version: Windows 10
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &Desktop shortcut"; GroupDescription: "Additional icons:"
Name: "startmenuicon"; Description: "Create a &Start Menu shortcut"; GroupDescription: "Additional icons:"

[Files]
; Copy all files from the win-unpacked folder into the installer
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu shortcut
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

; Desktop shortcut (only if user selected it)
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Optionally launch the app after installation
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Clean up any files created by the app in its install folder on uninstall
Type: filesandordirs; Name: "{app}"

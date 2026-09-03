const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectDestFolder: () => ipcRenderer.invoke('select-dest-folder'),
  getDrives: () => ipcRenderer.invoke('get-drives'),
  getHardwareId: () => ipcRenderer.invoke('get-hardware-id'),
  checkStoreLicense: () => ipcRenderer.invoke('check-store-license'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openEmailDraft: (options) => ipcRenderer.invoke('open-email-draft', options),
  provisionDrive: (destination, sourcePath, password, isFolder, autoDelete, hideFileName, hint, branding, secureLinkParams, viewerConfig) =>
    ipcRenderer.invoke('provision-drive', destination, sourcePath, password, isFolder, autoDelete, hideFileName, hint, branding, secureLinkParams, viewerConfig),
  saveOfflineHtml: (vaultPath, originalName, hideFileName, defaultSaveLocation) =>
    ipcRenderer.invoke('save-offline-html', vaultPath, originalName, hideFileName, defaultSaveLocation),
  cleanupTempVault: () => ipcRenderer.invoke('cleanup-temp-vault'),
  onProvisionProgress: (callback) =>
    ipcRenderer.on('provision-progress', (_event, data) => callback(data)),
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    onUpdaterEvent: (callback) => ipcRenderer.on('updater-event', (_event, data) => callback(data))
  }
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectDestFolder: () => ipcRenderer.invoke('select-dest-folder'),
  getDrives: () => ipcRenderer.invoke('get-drives'),
  getHardwareId: () => ipcRenderer.invoke('get-hardware-id'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  provisionDrive: (destination, sourcePath, password, isFolder, autoDelete, hideFileName, hint, branding) =>
    ipcRenderer.invoke('provision-drive', destination, sourcePath, password, isFolder, autoDelete, hideFileName, hint, branding),
  onProvisionProgress: (callback) =>
    ipcRenderer.on('provision-progress', (_event, data) => callback(data)),
});

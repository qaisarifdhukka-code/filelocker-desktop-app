const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDrives: () => ipcRenderer.invoke('get-drives'),
  getHardwareId: () => ipcRenderer.invoke('get-hardware-id'),
  provisionDrive: (drive, sourcePath, password, isFolder, autoDelete, hint, branding) =>
    ipcRenderer.invoke('provision-drive', drive, sourcePath, password, isFolder, autoDelete, hint, branding),
  onProvisionProgress: (callback) =>
    ipcRenderer.on('provision-progress', (_event, data) => callback(data)),
});

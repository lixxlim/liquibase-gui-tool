const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('liquibaseAPI', {
  runCommand: (options) => ipcRenderer.invoke('run-liquibase-command', options),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  // 저장 및 불러오기
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  loadSettings: () => ipcRenderer.invoke('load-settings')
});

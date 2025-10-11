const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('liquibaseAPI', {
  runCommand: (options) => ipcRenderer.invoke('run-liquibase-command', options),
  onLog: (callback) => ipcRenderer.on('liquibase-log', (e, data) => callback(data)),
});

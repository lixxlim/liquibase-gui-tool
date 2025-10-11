const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('liquibaseAPI', {
  // Liquibase 실행
  runCommand: (options) => ipcRenderer.invoke('run-liquibase-command', options),
  // 파일 선택
  openFile: () => ipcRenderer.invoke('dialog:openFile')
});

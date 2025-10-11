const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  win.loadFile(path.join(__dirname, '../static/index.html'));
  return win;
}

app.whenReady().then(createWindow);

// 파일 선택 다이얼로그
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'YAML Files', extensions: ['yaml', 'yml'] }]
  });
  return result;
});

// Liquibase 명령 실행
ipcMain.handle('run-liquibase-command', async (event, { command, rollbackCount, dbUrl, dbUser, dbPassword, changelogFile }) => {
  return new Promise((resolve, reject) => {
    const liquibaseDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'liquibase');
    const cliPath = path.join(liquibaseDir, 'liquibase');

    if (!fs.existsSync(cliPath)) {
      return reject(new Error(`Liquibase CLI가 존재하지 않습니다: ${cliPath}`));
    }

    if (command !== 'history' && (!changelogFile || !fs.existsSync(changelogFile))) {
      return reject(new Error('Changelog 파일이 선택되지 않았거나 존재하지 않습니다.'));
    }

    // changelogFile의 디렉토리를 cwd로
    const cwdDir = changelogFile ? path.dirname(changelogFile) : liquibaseDir;
    const changelogArg = command !== 'history' ? path.basename(changelogFile) : '';

    const args = [
      `--url=${dbUrl}`,
      `--username=${dbUser}`,
      `--password=${dbPassword}`
    ];

    if (command !== 'history') {
      args.unshift(`--changeLogFile=${path.basename(changelogFile)}`);
    }

    if (command === 'rollback') {
      // rollbackCount 자체가 명령어이므로 'rollback'은 넣지 않는다
      args.push('rollbackCount', rollbackCount.toString());
    } else {
      args.push(command); // update, status, history 등
    }
    const lb = spawn(cliPath, args, {
      cwd: cwdDir,  // <- changelogFile이 있는 폴더를 cwd로
      env: process.env,
    });

    let output = '';
    lb.stdout.on('data', (data) => output += data.toString());
    lb.stderr.on('data', (data) => output += data.toString());

    lb.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output || `Liquibase exited with code ${code}`));
    });

    lb.on('error', (err) => reject(err));
  });
});

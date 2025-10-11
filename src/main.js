const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, '../static/index.html'));
  return win;
}

app.whenReady().then(createWindow);

ipcMain.handle('run-liquibase-command', async (event, { command, rollbackCount, dbUrl, dbUser, dbPassword }) => {
  return new Promise((resolve, reject) => {

    const liquibaseDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'liquibase');
    const cliPath = path.join(liquibaseDir, 'liquibase');

    const args = [
      '--changeLogFile=db.changelog-master.yaml',
      `--url=${dbUrl}`,
      `--username=${dbUser}`,
      `--password=${dbPassword}`
    ];

    if (command === 'rollback') {
      args.push('rollbackCount');
      args.push(rollbackCount.toString());
    } else {
      args.push(command);
    }

    const lb = spawn(cliPath, args, {
      cwd: liquibaseDir,
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

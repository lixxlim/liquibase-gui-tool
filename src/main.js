const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store').default || require('electron-store');
const store = new Store();
const isWin = os.platform() === 'win32';

/* =============================
    設定保存及び読み込み関連
============================= */

// 設定保存
ipcMain.handle('save-settings', (event, data) => {
  store.set('settings', data);
  return true;
});

// 設定読み込み
ipcMain.handle('load-settings', () => {
  return store.get('settings', {});
});


/* =============================
    メインウィンドウ関連
============================= */

// メインウィンドウ作成
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


/* =============================
    ファイル選択ダイアログ関連
============================= */

// ファイル選択ダイアログ
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'YAML Files', extensions: ['yaml', 'yml'] }]
  });
  return result;
});


/* =============================
    Liquibaseコマンド実行関連
============================= */

// Liquibaseコマンド実行
ipcMain.handle('run-liquibase-command', async (event, { command, rollbackCount, dbUrl, dbUser, dbPassword, changelogFile }) => {
  return new Promise((resolve, reject) => {
    try {
      const isWin = os.platform() === 'win32';
      const javaHome = path.join(process.resourcesPath, 'app.asar.unpacked', isWin ? 'liquibase/jdk21_win32' : 'liquibase/jre_darwin');
      const liquibaseDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'liquibase');
      const cliPath = path.join(liquibaseDir, isWin ? 'liquibase.bat' : 'liquibase');

      // Liquibase CLIパス確認
      if (!fs.existsSync(cliPath)) {
        return reject(new Error(`Liquibase CLIが存在しません: ${cliPath}`));
      }

      // Changelogファイル確認
      if (command !== 'history' && (!changelogFile || !fs.existsSync(changelogFile))) {
        return reject(new Error('Changelogファイルが選択されていないか、存在しません。'));
      }

      // changelogFileのディレクトリをcwdに設定
      const cwdDir = changelogFile ? path.dirname(changelogFile) : liquibaseDir;

      // コマンド引数構築
      const args = [
        `--url=${dbUrl}`,
        `--username=${dbUser}`,
        `--password=${dbPassword}`
      ];

      // コマンド==Historyではない場合にchangelogFileを追加
      if (command !== 'history') {
        args.unshift(`--changeLogFile=${path.basename(changelogFile)}`);
      }

      // コマンド==Rollbackの場合にrollbackCountを追加
      if (command === 'rollback') {
        args.push('rollbackCount', rollbackCount.toString());
      } else {
        args.push(command);
      }

      // Liquibaseコマンド分岐
      let lb;
      if (isWin) {
        // 🪟 Windows
        lb = spawn('cmd.exe', ['/c', cliPath, ...args], {
          cwd: cwdDir,
          env: { ...process.env, JAVA_HOME: javaHome },
          windowsHide: true,
        });
      } else {
        // 🍎 Linux / macOS
        lb = spawn(cliPath, args, {
          cwd: cwdDir,
          env: { ...process.env, JAVA_HOME: javaHome },
        });
      }

      // コマンド出力収集
      let output = '';
      lb.stdout.on('data', (data) => output += data.toString());
      lb.stderr.on('data', (data) => output += data.toString());

      // コマンド終了処理
      lb.on('close', (code) => {
        if (code === 0) resolve(output);
        else reject(new Error(output || `Liquibase exited with code ${code}`));
      });

      // エラー処理
      lb.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
});

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function getIconPath() {
  const iconName = 'POTATO GAME ICON.ico';
  let iconPath;
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'public', iconName);
  } else {
    iconPath = path.join(__dirname, '..', 'public', iconName);
  }
  if (fs.existsSync(iconPath)) {
    return iconPath;
  } else {
    // Log a warning if icon is missing, but don't crash
    try {
      fs.appendFileSync(
        path.join(app.getPath('userData'), 'main-process-error.log'),
        `[WARN] Icon not found: ${iconPath}\n`
      );
    } catch {}
    return undefined;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f7f6e7',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: getIconPath()
  });

  // Debug: log the path being loaded
  const indexPath = app.isPackaged
    ? path.resolve(__dirname, '../dist/index.html')
    : 'http://localhost:5173';

  if (app.isPackaged) {
    fs.appendFileSync(
      path.join(app.getPath('userData'), 'main-process-debug.log'),
      `[INFO] Loading: ${indexPath}\n`
    );
    win.loadFile(indexPath);
  } else {
    win.loadURL(indexPath);
  }

  win.webContents.openDevTools(); // Always open DevTools for debugging
}

// Log uncaught errors to a file for debugging packaged app issues
const logPath = path.join(app.getPath('userData'), 'main-process-error.log');
process.on('uncaughtException', (err) => {
  fs.appendFileSync(logPath, `[UncaughtException] ${new Date().toISOString()}\n${err.stack || err}\n\n`);
});
process.on('unhandledRejection', (reason) => {
  fs.appendFileSync(logPath, `[UnhandledRejection] ${new Date().toISOString()}\n${reason}\n\n`);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

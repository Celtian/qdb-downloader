import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'node:path';
import { updateElectronApp } from 'update-electron-app';
import { SnapshotDatabase } from './database.js';
import { SnapshotExporter } from './exporter.js';
import { registerIpcHandlers } from './ipc.js';
import { TransfermarktScraper } from './scraper.js';

let database: SnapshotDatabase | undefined;

app.disableHardwareAcceleration();

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f8fc',
    icon: join(app.getAppPath(), 'resources', 'icons', 'qdb-downloader.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.once('ready-to-show', () => window.show());

  if (app.isPackaged) {
    await window.loadFile(join(__dirname, '..', '..', 'dist', 'electron', 'browser', 'index.html'));
  } else {
    await window.loadURL(process.env['QDB_RENDERER_URL'] ?? 'http://127.0.0.1:4200');
  }
};

app
  .whenReady()
  .then(async () => {
    Menu.setApplicationMenu(null);
    const databasePath =
      process.env['QDB_DATABASE_PATH'] ?? join(app.getPath('userData'), 'qdb-downloader.sqlite');
    database = new SnapshotDatabase(databasePath);
    const scraper = new TransfermarktScraper();
    const exporter = new SnapshotExporter(database);
    registerIpcHandlers({ database, scraper, exporter, shell });
    if (app.isPackaged && process.platform === 'win32') updateElectronApp();
    await createWindow();
    app.on('activate', () => {
      if (!BrowserWindow.getAllWindows().length) void createWindow();
    });
  })
  .catch((error: unknown) => {
    console.error('QDB Downloader failed to start.', error);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => database?.close());

const path = require('path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const database = require('./database');

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f6f8fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(path.join(__dirname, '..', '..', 'pages', 'inicio.html'));

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dashboard:get', () => database.dashboard());
ipcMain.handle('stats:get', () => database.stats());
ipcMain.handle('anuncios:list', (_event, filters) => database.anunciosList(filters));
ipcMain.handle('promocoes:list', (_event, filters) => database.promocoesList(filters));
ipcMain.handle('vendas:list', (_event, filters) => database.vendasList(filters));
ipcMain.handle('anuncios:update', (_event, payload) => database.updateAnuncio(payload));
ipcMain.handle('promocoes:update', (_event, payload) => database.updatePromocao(payload));
ipcMain.handle('vendas:create', (_event, payload) => database.createVenda(payload));

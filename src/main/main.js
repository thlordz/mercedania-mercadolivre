const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const database = require('./database');
const rootDir = path.resolve(__dirname, '..', '..');

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 720,
    minHeight: 560,
    resizable: true,
    maximizable: true,
    backgroundColor: '#f6f8fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(path.join(__dirname, '..', '..', 'pages', 'inicio.html'));
  window.maximize();

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
ipcMain.handle('anuncios:create', (_event, payload) => database.createAnuncio(payload));
ipcMain.handle('promocoes:list', (_event, filters) => database.promocoesList(filters));
ipcMain.handle('vendas:list', (_event, filters) => database.vendasList(filters));
ipcMain.handle('anuncios:update', (_event, payload) => database.updateAnuncio(payload));
ipcMain.handle('promocoes:update', (_event, payload) => database.updatePromocao(payload));
ipcMain.handle('vendas:create', (_event, payload) => database.createVenda(payload));
ipcMain.handle('vendas:update', (_event, payload) => database.updateVenda(payload));
ipcMain.handle('vendas:delete', (_event, id) => database.deleteVenda(id));
ipcMain.handle('clipboard:writeText', (_event, text) => {
  clipboard.writeText(String(text || ''));
  return true;
});

ipcMain.handle('notas-fiscais:save', (_event, payload) => {
  const vendaId = Number(payload?.vendaId);
  const originalName = String(payload?.nome || 'nota-fiscal.pdf');
  const safeName = originalName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').trim() || 'nota-fiscal.pdf';
  if (!Number.isInteger(vendaId) || vendaId <= 0) throw new Error('Venda inválida.');
  if (!safeName.toLowerCase().endsWith('.pdf')) throw new Error('Selecione um arquivo PDF.');

  const dir = path.join(rootDir, 'Banco de Dados', 'notas-fiscais');
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${vendaId}-${Date.now()}-${safeName}`);
  fs.writeFileSync(filePath, Buffer.from(payload.bytes));
  return { path: filePath, nome: safeName };
});

ipcMain.handle('imagens-anuncios:save', (_event, payload) => {
  const anuncioId = Number(payload?.anuncioId || 0);
  const originalName = String(payload?.nome || 'produto.png');
  const safeName = originalName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').trim() || 'produto.png';
  if (!/^image\//.test(String(payload?.type || ''))) throw new Error('Selecione uma imagem.');

  const dir = path.join(rootDir, 'assets', 'uploads', 'anuncios');
  fs.mkdirSync(dir, { recursive: true });

  const prefix = anuncioId > 0 ? anuncioId : 'novo';
  const filePath = path.join(dir, `${prefix}-${Date.now()}-${safeName}`);
  fs.writeFileSync(filePath, Buffer.from(payload.bytes));
  return { path: filePath, url: pathToFileURL(filePath).href, nome: safeName };
});

ipcMain.handle('arquivo:open', async (_event, filePath) => {
  const target = String(filePath || '');
  if (!target) throw new Error('Arquivo não informado.');
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
  return { success: true };
});

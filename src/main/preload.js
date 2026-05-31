const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mercadoApp', {
  dashboard: () => ipcRenderer.invoke('dashboard:get'),
  stats: () => ipcRenderer.invoke('stats:get'),
  anuncios: (filters) => ipcRenderer.invoke('anuncios:list', filters),
  criarAnuncio: (payload) => ipcRenderer.invoke('anuncios:create', payload),
  promocoes: (filters) => ipcRenderer.invoke('promocoes:list', filters),
  vendas: (filters) => ipcRenderer.invoke('vendas:list', filters),
  atualizarAnuncio: (payload) => ipcRenderer.invoke('anuncios:update', payload),
  atualizarPromocao: (payload) => ipcRenderer.invoke('promocoes:update', payload),
  criarVenda: (payload) => ipcRenderer.invoke('vendas:create', payload),
  atualizarVenda: (payload) => ipcRenderer.invoke('vendas:update', payload),
  excluirVenda: (id) => ipcRenderer.invoke('vendas:delete', id),
  copiarTexto: (text) => ipcRenderer.invoke('clipboard:writeText', text),
  salvarNotaFiscalArquivo: (payload) => ipcRenderer.invoke('notas-fiscais:save', payload),
  salvarImagemAnuncioArquivo: (payload) => ipcRenderer.invoke('imagens-anuncios:save', payload),
  abrirArquivo: (filePath) => ipcRenderer.invoke('arquivo:open', filePath),
});
